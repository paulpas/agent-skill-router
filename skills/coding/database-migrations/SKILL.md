---
name: database-migrations
description: Implements zero-downtime database migration strategies including expand/contract, dual-write, and backfill patterns for safe schema evolution across production environments.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: database migrations, schema evolution, zero downtime migrations, database deployment, expand contract pattern, dual write migration, database rollback, migration strategy, how do i change my database schema safely
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: database-design-modeling, software-delivery-pipelines, secure-release-pipeline
---

# Database Migration Patterns

Implements safe, zero-downtime database migration strategies for evolving production schemas without service interruption or data loss.

## TL;DR Checklist

- [ ] Classify change as additive (safe) or breaking (requires migration strategy)
- [ ] Choose expand/contract pattern for column/table additions with existing data
- [ ] Use dual-write for cross-column or cross-table data synchronization
- [ ] Implement backward-compatible deployments during the overlap period
- [ ] Write idempotent migration scripts that can run multiple times safely
- [ ] Verify rollback path before deploying to production

---

## When to Use

Use this skill when:

- Deploying schema changes to a live production database with zero downtime requirements
- Adding new columns or tables that require backfilling data from existing sources
- Migrating data between column formats (e.g., JSON to normalized tables)
- Renaming columns, tables, or indexes without breaking in-flight requests
- Splitting a monolithic table into partitioned or sharded tables
- Coordinating database schema changes with application code deployments

---

## When NOT to Use

Avoid this skill for:

- One-time data fixes or ad-hoc SQL scripts on staging — use direct ALTER TABLE
- Initial database setup (seed migrations are simple and can be destructive)
- Schema changes during development where you control the full stack lifecycle
- Changes that require manual user intervention to apply (automate everything)

---

## Core Workflow

1. **Classify the Change** — Determine whether the change is additive (always safe), modifying (risky), or destructive (breaking). Additive: new nullable columns, new tables with defaults. Modifying: changing column types, adding NOT NULL constraints, renaming. Destructive: dropping columns, removing tables, changing data formats.
   **Checkpoint:** If the change is breaking, you MUST use a multi-phase migration strategy — never deploy it in a single step.

2. **Phase 1 — Expand (Deploy Code + Schema)** — Add new columns, tables, or indexes without removing anything old. Ensure all code paths handle both old and new schema simultaneously. New writes go to the new structure; reads continue on the old until switch-over.
   **Checkpoint:** Deploy this change with feature flags or dual-write logic so that old code paths remain functional even if a deployment fails mid-way.

3. **Phase 2 — Backfill (Background Process)** — Run a data synchronization process to populate new columns/tables from existing data. Use batched writes with configurable chunk sizes (e.g., 1000 rows per transaction) to avoid locking or overwhelming the database. Monitor replication lag if using read replicas.
   **Checkpoint:** Verify that the backfill completes without errors and that row counts match between source and target structures.

4. **Phase 3 — Switch Reads** — Deploy the application code path that reads from the new structure. Use a feature flag so you can instantly roll back reads by flipping the flag without redeploying.
   **Checkpoint:** Monitor error rates and query latency for 15–30 minutes after switching. If metrics degrade, flip the flag immediately.

5. **Phase 4 — Trim (Remove Old Schema)** — Deploy code that stops writing to the old structure. Once confirmed stable (24+ hours), drop the old columns or tables in a final migration.
   **Checkpoint:** Verify no application errors reference the old schema name before dropping it.

---

## Implementation Patterns

### Pattern 1: Expand/Contract for Column Addition

When adding a new column that needs default data, use the expand/contract pattern over three deployments.

```python
"""
Database migration patterns for zero-downtime schema evolution.
Implements expand/contract, dual-write, and backfill strategies.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class MigrationPlan:
    """Defines a multi-phase migration strategy for schema changes."""
    change_type: str  # "add_column", "rename_column", "split_table"
    old_field: str | None = None
    new_field: str | None = None
    backfill_batch_size: int = 1000
    feature_flag_key: str | None = None

    def is_breaking_change(self) -> bool:
        """Check if this change requires a multi-phase migration."""
        return self.old_field is not None and self.new_field is not None


def deploy_expand_phase(
    connection: Any,
    migration: MigrationPlan,
) -> dict[str, Any]:
    """Phase 1: Expand schema by adding new column or table.

    This deployment adds the new structure while keeping the old one intact.
    All application code continues to work with both old and new fields.

    Args:
        connection: Database connection object supporting execute() method.
        migration: The migration plan defining what to add.

    Returns:
        Dict with execution status and timestamp.
    """
    if not migration.is_breaking_change():
        # Simple additive change — single deployment is safe
        query = f"ALTER TABLE {migration.old_field} ADD COLUMN {migration.new_field} TEXT DEFAULT NULL"
        connection.execute(query)
        logger.info(f"Added column {migration.new_field} to {migration.old_field}")
        return {"status": "completed", "phase": "expand", "type": "additive"}

    query = f"""
        ALTER TABLE {migration.old_field}
        ADD COLUMN IF NOT EXISTS {migration.new_field} TEXT DEFAULT NULL
    """
    connection.execute(query)
    logger.info(
        f"Phase 1 (Expand): Added {migration.new_field} to "
        f"{migration.old_field}. Old field remains active."
    )
    return {"status": "completed", "phase": "expand"}
```

### Pattern 2: Dual-Write Backfill (BAD vs. GOOD)

```python
# ❌ BAD — Backfill in a single transaction blocks the database
def bad_backfill(connection, table_name: str, source_col: str, target_col: str):
    """Single huge UPDATE — locks the entire table during backfill."""
    query = f"""
        UPDATE {table_name}
        SET {target_col} = UPPER({source_col})
        WHERE {target_col} IS NULL
    """
    # This runs as ONE transaction — could lock millions of rows
    connection.execute(query)


# ✅ GOOD — Batched backfill with progress tracking and pause between batches
def good_backfill(
    connection: Any,
    table_name: str,
    source_col: str,
    target_col: str,
    batch_size: int = 1000,
    pause_ms: float = 50.0,
) -> dict[str, int]:
    """Batched backfill that avoids table locks and respects replication lag.

    Processes rows in configurable chunks, pausing between batches to allow
    read replicas to catch up and preventing transaction log bloat.

    Args:
        connection: Database connection (supports execute and rowcount).
        table_name: Source table name.
        source_col: Column to read from.
        target_col: Column to write to.
        batch_size: Number of rows per transaction.
        pause_ms: Milliseconds to wait between batches for replication catch-up.

    Returns:
        Dict with total_rows_updated and batches_processed counts.
    """
    total_updated = 0
    batch_num = 0

    while True:
        # Find the next batch of rows that haven't been backfilled yet
        query = f"""
            UPDATE {table_name}
            SET {target_col} = UPPER({source_col})
            WHERE {target_col} IS NULL
            LIMIT %s
        """
        cursor = connection.execute(query, (batch_size,))
        rows_updated = cursor.rowcount if hasattr(cursor, 'rowcount') else 0

        batch_num += 1
        total_updated += rows_updated

        logger.info(
            f"Backfill batch {batch_num}: updated {rows_updated} rows "
            f"(total: {total_updated})"
        )

        if rows_updated < batch_size:
            # Last batch — all rows processed
            break

        # Pause between batches to avoid overwhelming the database
        time.sleep(pause_ms / 1000.0)

    logger.info(f"Backfill complete: {total_updated} rows in {batch_num} batches")
    return {"total_rows_updated": total_updated, "batches_processed": batch_num}
```

### Pattern 3: Idempotent Migration Script

Every migration must be idempotent — running it twice should produce the same result as running it once.

```python
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class IdempotentMigration:
    """Applies a database migration safely with idempotency guarantees.

    Tracks which migrations have been applied via a schema_migrations table,
    preventing duplicate execution and enabling safe rollbacks.
    """

    MIGRATIONS_TABLE = "schema_migrations"

    def __init__(self, connection: Any):
        self.connection = connection

    def ensure_metadata_table(self) -> None:
        """Create the migrations tracking table if it does not exist."""
        self.connection.execute(f"""
            CREATE TABLE IF NOT EXISTS {self.MIGRATIONS_TABLE} (
                version VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                checksum TEXT
            )
        """)

    def is_applied(self, version: str) -> bool:
        """Check if a migration version has already been applied."""
        result = self.connection.execute(
            f"SELECT COUNT(*) FROM {self.MIGRATIONS_TABLE} WHERE version = %s",
            (version,),
        )
        count = result.fetchone()[0] if hasattr(result, 'fetchone') else 0
        return count > 0

    def apply(self, version: str, sql_statements: list[str]) -> None:
        """Apply a migration only if not already applied.

        Args:
            version: Unique identifier for this migration (e.g., '20260115_add_users_email_index').
            sql_statements: List of SQL statements to execute atomically.
        """
        self.ensure_metadata_table()

        if self.is_applied(version):
            logger.info(f"Migration {version} already applied — skipping")
            return

        logger.info(f"Applying migration {version}")

        # Execute all statements in a single transaction
        self.connection.execute("BEGIN")
        try:
            for stmt in sql_statements:
                self.connection.execute(stmt)

            # Record successful application
            import hashlib
            content = "\n".join(sql_statements)
            checksum = hashlib.sha256(content.encode()).hexdigest()[:16]

            self.connection.execute(
                f"INSERT INTO {self.MIGRATIONS_TABLE} (version, checksum) VALUES (%s, %s)",
                (version, checksum),
            )
            self.connection.execute("COMMIT")
            logger.info(f"Migration {version} applied successfully")
        except Exception:
            self.connection.execute("ROLLBACK")
            raise

    def rollback(self, version: str) -> None:
        """Mark a migration as un-applied without executing reverse SQL.

        Use this for migrations that should be reverted at the tracking level.
        Always pair with actual data/schema rollback queries first.
        """
        self.connection.execute(
            f"DELETE FROM {self.MIGRATIONS_TABLE} WHERE version = %s", (version,)
        )
        logger.info(f"Migration {version} removed from applied list")


# Usage example in a deployment script:
# migration = IdempotentMigration(db_connection)
# migration.apply(
#     "20260115_add_users_email_index",
#     [
#         "CREATE INDEX CONCURRENTLY idx_users_email ON users (email)",
#     ]
# )
```

---

## Constraints

### MUST DO
- Always deploy schema changes in phases — never drop or modify columns that active code still reads
- Make every migration script idempotent so it can be re-run safely after a failed deployment
- Use `CONCURRENTLY` for index creation in PostgreSQL to avoid blocking table writes
- Batch large data backfills to avoid long transactions and replication lag
- Test migrations against a production-like copy of the database before running on live data

### MUST NOT DO
- Drop columns, tables, or indexes in the same deployment that adds code depending on them
- Run ALTER TABLE with schema locks during peak traffic hours without maintenance window planning
- Execute backfills as a single unbounded UPDATE — always use LIMIT/offset batching
- Skip rollback testing — if you can't undo a migration safely, don't deploy it
- Mix data migrations and structural changes in the same deployment window

---

## Output Template

When implementing or reviewing database migrations, produce:

1. **Change Classification** — Whether the schema change is additive, modifying, or destructive
2. **Migration Plan** — The phased approach (expand → backfill → switch → trim) with timestamps
3. **SQL Migration Scripts** — Idempotent migration files with version stamps
4. **Backfill Strategy** — Batch size, pause interval, and monitoring approach
5. **Rollback Procedure** — Exact steps to reverse the migration if something goes wrong

---

## Related Skills

| Skill                        | Purpose                                                    |
| ---------------------------- | ---------------------------------------------------------- |
| `database-design-modeling`   | Design schemas before you need to migrate them             |
| `software-delivery-pipelines` | Orchestrate deployment timing across phases               |
| `secure-release-pipeline`    | Gate migrations behind approval workflows in CI/CD         |

---

## Live References

> Authoritative documentation links for database migration practices.

- [PostgreSQL ALTER TABLE Documentation](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Flyway Migration Documentation](https://documentation.red-gate.com/fd/introduction-184130972.html)
- [Alembic (SQLAlchemy Migrations) Guide](https://alembic.sqlalchemy.org/en/latest/tutorial.html)
- [Prisma Migrate Schema Reference](https://www.prisma.io/docs/concepts/components/prisma-migrate/schema-reference)
- [Liquibase Migration Best Practices](https://docs.liquibase.com/workflows/liquibase-community/using-liquibase.html)
