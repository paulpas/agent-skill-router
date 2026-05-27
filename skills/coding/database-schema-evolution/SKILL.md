---
name: database-schema-evolution
description: Designs safe schema changes for production databases — zero-downtime migrations, backward-compatible schema evolution, dual-write patterns, feature-flagged deployments, and data migration strategies for live systems.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - diagnostic
anti_triggers:
  - initial database design
  - performance tuning
  - query optimization
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: database schema, migration strategy, zero downtime migration, schema change, backward compatible schema, dual write, feature flag migration, how do i change my database schema safely, schema versioning, safe deploy
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: performance-optimization-strategies, postgresql-sdk, ci-cd-pipeline-design
---

# Database Schema Evolution

Designs and implements safe schema changes for production databases through zero-downtime migration patterns, backward-compatible evolutions, dual-write strategies, and feature-flagged deployments. When loaded, the model produces migration plans that keep systems available during schema changes, handles data backfill for large tables without locking, and ensures API compatibility across deployment windows.

## TL;DR Checklist

- [ ] All schema changes follow a three-phase rollout: expand → migrate → contract
- [ ] Database migrations are backward-compatible with the previous application version
- [ ] Long-running migrations use batch processing to avoid lock contention
- [ ] Feature flags gate new schema-dependent code paths during deployment overlap
- [ ] Rollback plan includes data restoration procedures, not just migration reversal

---

## When to Use

Use this skill when:

- Adding columns, tables, or indexes to a production database serving live traffic
- Renaming columns/tables without downtime in a deployed microservice architecture
- Migrating data between formats (e.g., JSON → structured columns) on large tables
- Changing column types (e.g., VARCHAR → ENUM, INT → BIGINT) in production
- Implementing multi-tenant schema changes across all tenants simultaneously

---

## When NOT to Use

Avoid this skill for:

- Designing the initial database schema for a new project — use `software-architecture-design` instead
- Optimizing slow queries or tuning PostgreSQL server parameters — use `postgresql-performance-tuning` instead
- Setting up CI/CD pipelines that run migrations — covered by `ci-cd-pipeline-design`

---

## Core Workflow

1. **Classify the Schema Change** — Categorize as: additive (new columns/tables), subtractive (dropping columns/tables), transformational (changing column types or structures), or structural (partitioning, sharding). **Checkpoint:** Additive changes are safe with zero-downtime if backward-compatible; subtractive and transformational changes require a phased migration strategy.

2. **Design the Three-Phase Rollout** — Phase 1: Expand (add new schema elements alongside old ones). Phase 2: Migrate (populate new columns with data from old ones using batched backfills). Phase 3: Contract (remove old schema elements after all code has switched). **Checkpoint:** At every phase, the application must work correctly whether old or new schema elements are present.

3. **Implement Backward Compatibility** — Ensure the previous application version can run alongside the new one during the migration window. New columns must have NULL defaults. New tables start empty. No dropping of existing schema until Phase 3 completes. **Checkpoint:** You can roll back to the previous application version at any point after Phase 1 without data loss.

4. **Execute Data Migration Safely** — For large tables (>1M rows), use batched updates with sleep intervals to avoid lock contention and replication lag. Process in chunks of 5000-10000 rows with pauses between batches. Monitor replication lag during backfills on read-replica topologies. **Checkpoint:** Migration completes without blocking reads or causing application timeouts.

5. **Implement Rollback Procedures** — Document the exact steps to reverse each phase. For additive changes, rollback is typically just removing the feature flag and redeploying old code. For transformational changes with data loss risk, include backup/restore procedures. **Checkpoint:** Rollback plan tested in staging with production-scale data before executing in production.

---

## Implementation Patterns

### Pattern 1: Additive Column Migration (Zero-Downtime)

```python
# ❌ BAD — Breaking change: drops old column and renames new one in single migration
"""Add email_verified column."""
def upgrade():
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.drop_column('users', 'email_is_valid')  # BREAKS: old version still references this

# ✅ GOOD — Three-phase additive migration with backward compatibility
"""Phase 1: Add new column alongside existing ones."""
def upgrade():
    # NEW column with nullable default — old code ignores it, new code uses it
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=True))

    """Phase 2: Backfill data from email_is_valid (separate migration)"""
    def backfill_email_verified():
        """Batched backfill to avoid locking large tables."""
        batch_size = 5000
        offset = 0
        while True:
            rows = session.execute(
                text("SELECT id, email_is_valid FROM users WHERE email_verified IS NULL LIMIT :limit")
            ).fetchall(limit=batch_size)
            if not rows:
                break
            for user_id, is_valid in rows:
                session.execute(
                    text("UPDATE users SET email_verified = :verified WHERE id = :id"),
                    {"verified": bool(is_valid), "id": user_id}
                )
            session.commit()
            offset += batch_size

    """Phase 3: Make column NOT NULL after backfill completes"""
    def make_not_null():
        op.alter_column('users', 'email_verified', existing_type=sa.Boolean(), nullable=False)

    """Phase 4 (later): Drop old column once all code switched"""
    # drop_column is in a SEPARATE migration deployed weeks later

# ✅ GOOD — Feature-gated new code path during rollout window
from contextlib import contextmanager
import os

@contextmanager
def use_email_verified_strategy():
    """Context manager to route between old and new email verification logic."""
    feature_enabled = os.environ.get('ENABLE_EMAIL_VERIFIED_COLUMN', 'false').lower() == 'true'

    if feature_enabled:
        # New code path uses the new column
        def check_verification(user):
            return user.email_verified is True
    else:
        # Old code path uses the old column (still exists in DB)
        def check_verification(user):
            return user.email_is_valid is True

    yield check_verification

# Usage in application code:
def update_user_verification(user_id, verified):
    with use_email_verified_strategy() as strategy:
        # Both old and new code paths work during rollout window
        user = get_user(user_id)
        strategy(user)  # Reads from correct column based on feature flag
```

### Pattern 2: Dual-Write Pattern for Schema Changes

```python
# ❌ BAD — Atomic switch with no overlap period
# Application stops using old format and immediately uses new one
def save_user_data(data):
    # Old version writes to 'legacy_json_data' column
    # New version writes to 'structured_name', 'structured_email' columns
    # If deployed simultaneously: race condition, data inconsistency

# ✅ GOOD — Dual-write ensures no data loss during transition
class UserDataRepository:
    """Writes to both old and new schema simultaneously during migration window."""

    def __init__(self, session, dual_write_mode=True):
        self.session = session
        self.dual_write_mode = dual_write_mode  # Set via feature flag

    def save_user(self, user_id: int, name: str, email: str) -> None:
        """Atomically writes to both old (JSON) and new (structured) columns."""
        # Always write to the NEW structured columns first
        self.session.execute(
            text("""
                INSERT INTO users (id, structured_name, structured_email, updated_at)
                VALUES (:id, :name, :email, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    structured_name = EXCLUDED.structured_name,
                    structured_email = EXCLUDED.structured_email,
                    updated_at = EXCLUDED.updated_at
            """),
            {"id": user_id, "name": name, "email": email}
        )

        # Dual-write: also maintain the legacy JSON column
        if self.dual_write_mode:
            json_data = json.dumps({"name": name, "email": email, "migrated_at": None})
            self.session.execute(
                text("""
                    UPDATE users SET
                        legacy_json_data = :json_data,
                        updated_at = NOW()
                    WHERE id = :id
                """),
                {"json_data": json_data, "id": user_id}
            )

        self.session.commit()

    def read_user(self, user_id: int) -> dict:
        """Reads from the canonical source based on migration phase."""
        row = self.session.execute(
            text("SELECT structured_name, structured_email, legacy_json_data FROM users WHERE id = :id"),
            {"id": user_id}
        ).fetchone()

        # Phase 1-2: Read from new structured columns (they're populated)
        # Phase 3: Only read from new columns (legacy has been dropped)
        if row.structured_name is not None:
            return {
                "name": row.structured_name,
                "email": row.structured_email,
            }
        elif row.legacy_json_data:
            # Fallback during transition — read from legacy JSON
            data = json.loads(row.legacy_json_data)
            return {"name": data["name"], "email": data["email"]}
        raise ValueError(f"User {user_id} not found")
```

### Pattern 3: Batched Data Migration with Progress Tracking

```python
# ❌ BAD — Single massive transaction that locks the table
def backfill_legacy_to_new():
    """Executes in one transaction — blocks all writes during migration."""
    all_rows = session.execute(text("SELECT * FROM large_table")).fetchall()
    for row in all_rows:
        # Transform and upsert...
    session.commit()  # Only commits after ALL rows processed

# ✅ GOOD — Batched migration with progress tracking and pause between batches
from dataclasses import dataclass, field
import time

@dataclass
class MigrationProgress:
    """Track migration progress for monitoring and recovery."""
    table_name: str
    last_processed_id: int = 0
    total_rows_migrated: int = 0
    started_at: str = ""
    batches_completed: int = 0

    def to_metadata_row(self) -> dict:
        return {
            "table": self.table_name,
            "last_id": self.last_processed_id,
            "migrated_count": self.total_rows_migrated,
            "batches": self.batches_completed,
        }

def batched_migration(
    session,
    source_table: str,
    target_table: str,
    batch_size: int = 5000,
    pause_ms: int = 100,
) -> MigrationProgress:
    """Execute a batched data migration safe for production databases.

    Args:
        session: Database session
        source_table: Source table name
        target_table: Target table name
        batch_size: Number of rows per transaction (default 5000)
        pause_ms: Milliseconds to sleep between batches to avoid replication lag

    Returns:
        MigrationProgress with final state for monitoring
    """
    progress = MigrationProgress(
        table_name=source_table,
        started_at=time.isoformat(),
    )

    # Get total count for progress tracking
    total_count = session.execute(text(f"SELECT COUNT(*) FROM {source_table}")).scalar()
    print(f"Starting migration: {total_count} rows in {source_table}")

    while True:
        # Fetch batch by ID range (assumes sequential integer IDs)
        rows = session.execute(
            text(f"""
                SELECT id, legacy_field_1, legacy_field_2
                FROM {source_table}
                WHERE id > :last_id
                ORDER BY id ASC
                LIMIT :limit
            """),
            {"last_id": progress.last_processed_id, "limit": batch_size},
        ).fetchall()

        if not rows:
            break

        for row in rows:
            # Transform legacy data to new format
            new_field_1 = transform_legacy_field_1(row.legacy_field_1)
            new_field_2 = transform_legacy_field_2(row.legacy_field_2)

            session.execute(
                text(f"""
                    INSERT INTO {target_table} (id, new_field_1, new_field_2)
                    VALUES (:id, :f1, :f2)
                    ON CONFLICT (id) DO UPDATE SET
                        new_field_1 = EXCLUDED.new_field_1,
                        new_field_2 = EXCLUDED.new_field_2
                """),
                {"id": row.id, "f1": new_field_1, "f2": new_field_2},
            )

        session.commit()
        progress.last_processed_id = rows[-1].id
        progress.total_rows_migrated += len(rows)
        progress.batches_completed += 1

        if pause_ms > 0:
            time.sleep(pause_ms / 1000.0)

        print(f"Batch {progress.batches_completed}: migrated up to ID {row.id} "
              f"({progress.total_rows_migrated}/{total_count})")

    return progress

def transform_legacy_field_1(value: str) -> dict:
    """Convert legacy concatenated string to structured format."""
    if not value:
        return {"first": None, "last": None}
    parts = value.split(" ", 1)
    return {"first": parts[0], "last": parts[1] if len(parts) > 1 else None}

def transform_legacy_field_2(value: str) -> str:
    """Convert legacy enum string to new normalized format."""
    mapping = {
        "active": "ACTIVE",
        "inactive": "INACTIVE",
        "pending": "PENDING",
    }
    return mapping.get(value, "UNKNOWN")
```

---

## Constraints

### MUST DO
- Always design schema changes with backward compatibility: old application version must work alongside new one during deployment overlap
- Use feature flags to gate new code paths that depend on new schema elements
- Batch data migrations in chunks of 5000-10000 rows for tables over 100K rows
- Never drop or rename columns/tables without a separate contract phase migration
- Test rollback procedures with production-scale data in staging before executing in production

### MUST NOT DO
- Execute large data migrations in a single transaction — this locks the table and causes application outages
- Deploy new code that reads only the new schema before old code has been removed from production
- Use `ALTER TABLE` with table rebuilds on tables over 1M rows during peak traffic hours
- Assume foreign key constraints will prevent migration issues — they can block ALTER operations entirely
- Combine multiple unrelated schema changes in a single migration file

---

## Output Template

When designing a schema evolution plan, the output must contain:

1. **Change Classification** — Whether additive, subtractive, transformational, or structural with risk assessment
2. **Three-Phase Migration Plan** — Detailed steps for expand → migrate → contract with approximate duration
3. **Migration Scripts** — Complete SQL/alembic migrations with backward-compatible DDL statements
4. **Application Code Changes** — Feature-flagged code paths that work during the rollout window
5. **Rollback Procedure** — Step-by-step instructions to reverse each phase, including data restoration

---

## Live References

- [Stripe's MySQL Schema Migrations](https://stripe.com/blog/mysql-schema-migrations)
- [GitHub's Database Migration Strategies](https://github.blog/engineering/infrastructure/migrating-github-databases-to-a-modern-infrastructure/)
- [Airflow Schema Migration Patterns](https://docs.getdbt.com/docs/collaborate/govern/data-dialect)
- [PgHero Zero-Downtime Migrations](https://pghero.com/)
- [Liquibase ChangeLog Best Practices](https://docs.liquibase.com/concepts/changelogs/changeset.html)
