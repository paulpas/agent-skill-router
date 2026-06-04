---
name: database-design-modeling
description: Designs relational database schemas with proper normalization, indexing
  strategies, versioned migrations, and constraint enforcement for scalable application
  backends.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: database design, schema design, data modeling, sql migrations, indexing
    strategy, database normalization, foreign keys, entity relationship
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: backend-dev-guidelines, api-design-principles, domain-driven-design
---
# Database Design & Modeling for Production Systems

Designs relational database schemas with proper normalization, indexing strategies, versioned migrations, and constraint enforcement. When this skill is loaded, the model produces concrete SQL DDL, migration files, and Python data access patterns — not generic "normalize your tables" advice.

## TL;DR Checklist

- [ ] All tables use `BIGINT UNSIGNED` auto-increment primary keys or UUIDs with a natural key
- [ ] Every foreign key has an explicit `ON DELETE` action (CASCADE, SET NULL, RESTRICT) — never left implicit
- [ ] Tables are normalized to at least 3NF — no repeating groups, no transitive dependencies
- [ ] Composite indexes match query filter order: most selective column first
- [ ] Migration files follow versioned naming with `up` and `down` operations defined for every change
- [ ] Every table has `created_at` and `updated_at` timestamp columns with defaults

---

## When to Use

- Designing a new database schema from application requirements
- Refactoring an existing schema that has normalization issues (repeating groups, update anomalies)
- Adding new tables or columns to a production database via migration files
- Optimizing slow queries by designing appropriate composite indexes
- Defining table relationships (one-to-many, many-to-many) with proper foreign key constraints

## When NOT to Use

- For document-oriented data with unpredictable schemas — use a NoSQL database instead
- For high-write-throughput time-series data at massive scale — consider time-series databases
- As a substitute for application-level validation — the database is the last line of defense, not the first
- When you cannot afford migration downtime — plan blue-green or zero-downtime migration strategies separately

---

## Core Workflow

1. **Analyze Requirements** — Extract entities (nouns), attributes (properties), and relationships (verbs) from requirements. Identify which queries are read-mostly vs write-heavy, and what the cardinality constraints are (one-to-one, one-to-many, many-to-many). **Checkpoint:** Draft a list of core entities before writing any SQL — this prevents premature schema design.

2. **Create Entity Relationship Diagram** — Map entities to tables, attributes to columns, and relationships to foreign keys. Resolve many-to-many relationships into junction tables with their own primary keys. Identify optional vs mandatory relationships (nullable vs NOT NULL). **Checkpoint:** Every many-to-many relationship must have its own junction table — never encode it as a comma-separated column.

3. **Normalize to 3NF** — Verify each table satisfies: 1NF (atomic values, no repeating groups), 2NF (no partial key dependencies), 3NF (no transitive dependencies). Move derived or computed columns out of tables unless they are actively indexed and cached for performance. **Checkpoint:** If a column depends on another non-key column, it violates 3NF — move it to its own table.

4. **Design Index Strategy** — Identify the most frequent query patterns (WHERE clauses, JOIN conditions, ORDER BY). Create composite indexes matching the leftmost prefix of each query's filter columns. Add partial indexes for filtered subsets (e.g., only active records). **Checkpoint:** No index should be created on a column used exclusively for `SELECT *` without WHERE — it adds write overhead with zero read benefit.

5. **Create Migration Files** — Write versioned migration files with explicit UP and DOWN operations. Each migration represents one atomic schema change. Down migrations must be reversible and idempotent. **Checkpoint:** Every UP statement must have a corresponding DOWN that reverses it exactly — test the down migration by applying and reverting in a staging environment.

6. **Enforce Constraints** — Add CHECK constraints for business rules (positive amounts, valid status enums), UNIQUE constraints for business keys, and foreign key constraints for referential integrity. Validate all constraints with sample data before deploying to production. **Checkpoint:** Foreign key constraints prevent orphaned records — never disable them "for performance" without a documented reason and compensating application logic.

---

## Implementation Patterns

### Pattern 1: Entity Relationship Design with Foreign Key Constraints

Proper entity relationships use explicit foreign keys with defined cascade rules. Junction tables for many-to-many relationships include their own primary key and timestamp columns.

```sql
-- ❌ BAD: No foreign keys, no constraints — data integrity is impossible to enforce
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    items TEXT,  -- comma-separated product IDs: "1,5,9"
    total DECIMAL(10,2),
    status VARCHAR(20)
);

-- Problems: repeating customer data per order, no referential integrity,
-- items stored as comma-separated string (violates 1NF), no cascade on delete
```

```sql
-- ✅ GOOD: Normalized schema with explicit foreign keys, proper cascade rules, and junction tables
CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_users_email (email),
    INDEX idx_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE products (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_cents INT NOT NULL CHECK (price_cents >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_products_sku (sku),
    INDEX idx_products_name (name(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
    total_cents INT NOT NULL CHECK (total_cents >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    shipping_address_id BIGINT UNSIGNED DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign key: cascade delete so orders are removed when user is deleted
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- Foreign key for optional shipping address (SET NULL on delete)
    CONSTRAINT fk_orders_shipping_address
        FOREIGN KEY (shipping_address_id)
        REFERENCES addresses(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    INDEX idx_orders_user_id (user_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Junction table for many-to-many: orders and products
CREATE TABLE order_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price_cents INT NOT NULL CHECK (unit_price_cents >= 0),

    -- Composite unique constraint: same product can't appear twice in an order
    CONSTRAINT uk_order_product UNIQUE (order_id, product_id),

    -- Foreign keys with restrictive delete for data integrity
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_order_items_order_id (order_id),
    INDEX idx_order_items_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Supporting table for shipping addresses (one-to-many from users)
CREATE TABLE addresses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    street_line1 VARCHAR(255) NOT NULL,
    street_line2 VARCHAR(255) DEFAULT NULL,
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country_code CHAR(2) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_addresses_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    INDEX idx_addresses_user_id (user_id),
    UNIQUE INDEX uk_user_default_address (user_id, is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### Pattern 2: Versioned Migration Files with Up/Down Operations

Migrations are versioned files that apply schema changes incrementally. Each file contains an `up()` migration (forward change) and a `down()` migration (reversal). A metadata table tracks which migrations have been applied.

```python
# ❌ BAD: No migration system — developers run manual SQL scripts directly on production
# "Just ALTER TABLE directly" with no versioning, no rollback capability,
# no record of what changed and when.

import psycopg2
conn = psycopg2.connect("postgres://localhost/mydb")
conn.execute("ALTER TABLE orders ADD COLUMN discount_code VARCHAR(50);")  # Oops, wrong syntax
conn.commit()
```

```python
# ✅ GOOD: Versioned migration system with up/down operations and tracking
from __future__ import annotations

import os
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Protocol


class DatabaseConnection(Protocol):
    """Minimal protocol for database connection objects."""

    def execute(self, sql: str, *params: Any) -> None: ...
    def fetchall(self) -> list[tuple]: ...
    def begin(self) -> None: ...
    def commit(self) -> None: ...
    def rollback(self) -> None: ...


@dataclass(frozen=True)
class MigrationFile:
    """Represents a single migration file with its operations.

    Attributes:
        version: Zero-padded version string (e.g., '001', '042').
        description: Human-readable description of what this migration does.
        up_sql: SQL statements to apply the migration.
        down_sql: SQL statements to reverse the migration.
    """

    version: str
    description: str
    up_sql: str
    down_sql: str


class BaseMigration(ABC):
    """Base class for migration definitions."""

    @property
    @abstractmethod
    def version(self) -> str:
        """Zero-padded version string, e.g., '001', '042'."""
        ...

    @property
    @abstractmethod
    def description(self) -> str:
        """Human-readable migration description."""
        ...

    @abstractmethod
    def up(self, conn: DatabaseConnection) -> None:
        """Apply the migration. Override in subclasses."""
        ...

    @abstractmethod
    def down(self, conn: DatabaseConnection) -> None:
        """Reverse the migration. Override in subclasses."""
        ...


class MigrationRunner:
    """Manages schema migrations with version tracking and rollback support.

    Tracks applied migrations in a `schema_migrations` table and ensures
    each migration is applied exactly once. Supports sequential forward
    migrations and targeted rollbacks.
    """

    MIGRATIONS_DIR = "migrations"
    SCHEMA_MIGRATIONS_TABLE = "schema_migrations"

    def __init__(self, connection: DatabaseConnection, migrations_dir: str | None = None) -> None:
        self._conn = connection
        self._migrations_dir = Path(migrations_dir or self.MIGRATIONS_DIR)
        self._applied: set[str] = set()

    def ensure_migrations_table(self) -> None:
        """Create the schema_migrations tracking table if it does not exist."""
        self._conn.execute(f"""
            CREATE TABLE IF NOT EXISTS {self.SCHEMA_MIGRATIONS_TABLE} (
                version VARCHAR(10) PRIMARY KEY,
                applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                description VARCHAR(255)
            )
        """)

    def get_applied_versions(self) -> set[str]:
        """Query the migration tracking table for already-applied versions.

        Returns:
            Set of version strings that have been applied to this database.
        """
        self.ensure_migrations_table()
        rows = self._conn.fetchall(
            f"SELECT version FROM {self.SCHEMA_MIGRATIONS_TABLE} ORDER BY version"
        )
        return {row[0] for row in rows}

    def discover_migrations(self) -> list[MigrationFile]:
        """Find all migration files in the migrations directory.

        Expects files named: <version>_<description>.sql
        Each file must contain -- UP: and -- DOWN: markers to separate sections.

        Returns:
            List of MigrationFile objects sorted by version.

        Raises:
            FileNotFoundError: If no migration files exist in the directory.
        """
        migrations: list[MigrationFile] = []

        for filepath in sorted(self._migrations_dir.glob("*.sql")):
            content = filepath.read_text()

            # Split UP and DOWN sections by markers
            up_sql, down_sql = self._split_migration_sections(content)

            version = filepath.stem.split("_")[0].lstrip("0") or "0"
            description = filepath.stem[len(version) + 1:].replace("_", " ").title()

            if not up_sql.strip():
                raise ValueError(f"Migration {filepath.name} has no UP section")

            migrations.append(MigrationFile(
                version=version,
                description=description,
                up_sql=up_sql,
                down_sql=down_sql or f"-- No DOWN migration defined for {version}",
            ))

        if not migrations:
            raise FileNotFoundError(f"No migration files found in {self._migrations_dir}")

        return migrations

    @staticmethod
    def _split_migration_sections(content: str) -> tuple[str, str]:
        """Split a migration file into UP and DOWN sections by markers."""
        up_match = re.search(r"-- UP:.*?(?=\n-- DOWN:|$)", content, re.DOTALL)
        down_match = re.search(r"-- DOWN:.*$", content, re.DOTALL | re.IGNORECASE)

        up_sql = up_match.group(0) if up_match else ""
        down_sql = down_match.group(0) if down_match else ""

        # Remove the marker lines themselves
        up_sql = re.sub(r"^-- UP:.*\n", "", up_sql, flags=re.MULTILINE).strip()
        down_sql = re.sub(r"^-- DOWN:.*\n", "", down_sql, flags=re.MULTILINE).strip()

        return up_sql, down_sql

    def migrate(self, target_version: str | None = None) -> list[str]:
        """Apply all pending migrations in version order.

        Args:
            target_version: Optional specific version to migrate to.
                          If None, applies all pending migrations.

        Returns:
            List of applied migration versions.

        Raises:
            RuntimeError: If a migration fails partway through (transaction rolled back).
        """
        self.ensure_migrations_table()
        self._applied = self.get_applied_versions()
        all_migrations = self.discover_migrations()

        # Filter to pending migrations only
        pending = [m for m in all_migrations if m.version not in self._applied]

        # If target specified, stop at that version
        if target_version:
            pending = [m for m in pending if m.version <= target_version]

        if not pending:
            print("No migrations to apply.")
            return []

        applied: list[str] = []

        self._conn.begin()
        try:
            for migration in pending:
                print(f"Applying migration {migration.version}: {migration.description}")
                self._conn.execute(migration.up_sql)
                self._conn.execute(
                    f"INSERT INTO {self.SCHEMA_MIGRATIONS_TABLE} (version, description) VALUES (%s, %s)",
                    (migration.version, migration.description),
                )
                applied.append(migration.version)

            self._conn.commit()
            print(f"Successfully applied {len(applied)} migrations: {', '.join(applied)}")
        except Exception as exc:
            self._conn.rollback()
            raise RuntimeError(f"Migration failed at version {migration.version}: {exc}") from exc

        return applied

    def rollback(self, target_version: str) -> list[str]:
        """Roll back migrations down to (but not including) the target version.

        Migrations are reverted in reverse version order. Only migrations that
        have already been applied will be rolled back.

        Args:
            target_version: Roll back all migrations with version > this value.

        Returns:
            List of rolled-back migration versions (in reverse order).

        Raises:
            RuntimeError: If a DOWN migration fails.
        """
        self.ensure_migrations_table()
        self._applied = self.get_applied_versions()

        all_migrations = self.discover_migrations()
        applied_in_reverse = sorted(
            [m for m in all_migrations if m.version not in target_version and m.version > target_version],
            key=lambda m: m.version,
            reverse=True,
        )

        if not applied_in_reverse:
            print(f"No migrations to roll back (target: {target_version})")
            return []

        rolled_back: list[str] = []

        self._conn.begin()
        try:
            for migration in applied_in_reverse:
                print(f"Rolling back migration {migration.version}: {migration.description}")
                self._conn.execute(migration.down_sql)
                self._conn.execute(
                    f"DELETE FROM {self.SCHEMA_MIGRATIONS_TABLE} WHERE version = %s",
                    (migration.version,),
                )
                rolled_back.append(migration.version)

            self._conn.commit()
            print(f"Successfully rolled back {len(rolled_back)} migrations")
        except Exception as exc:
            self._conn.rollback()
            raise RuntimeError(f"Rollback failed at version {migration.version}: {exc}") from exc

        return rolled_back


# --- Example Migration Files ---

# File: migrations/001_create_users.sql
#
# -- UP:
# CREATE TABLE users (
#     id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
#     email VARCHAR(255) NOT NULL UNIQUE,
#     username VARCHAR(50) NOT NULL UNIQUE,
#     password_hash VARCHAR(255) NOT NULL,
#     is_active BOOLEAN NOT NULL DEFAULT TRUE,
#     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
#     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
#     INDEX idx_users_email (email)
# ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
#
# -- DOWN:
# DROP TABLE IF EXISTS users;

# File: migrations/002_create_products.sql
#
# -- UP:
# CREATE TABLE products (
#     id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
#     sku VARCHAR(50) NOT NULL UNIQUE,
#     name VARCHAR(255) NOT NULL,
#     description TEXT,
#     price_cents INT NOT NULL CHECK (price_cents >= 0),
#     is_active BOOLEAN NOT NULL DEFAULT TRUE,
#     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
#     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
#     INDEX idx_products_sku (sku)
# ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
#
# -- DOWN:
# DROP TABLE IF EXISTS products;

# File: migrations/003_create_orders.sql
#
# -- UP:
# CREATE TABLE orders (
#     id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
#     user_id BIGINT UNSIGNED NOT NULL,
#     status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
#     total_cents INT NOT NULL CHECK (total_cents >= 0),
#     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
#     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
#     CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
# ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
#
# -- DOWN:
# DROP TABLE IF EXISTS orders;
```

---

### Pattern 3: Indexing Strategy — Composite, Partial, and Covering Indexes

Index design directly impacts query performance. Use composite indexes that match the leftmost prefix of WHERE/ORDER BY clauses. Use partial indexes to reduce size for filtered subsets. Use covering indexes to satisfy queries entirely from the index without touching the table.

```sql
-- ❌ BAD: Single-column indexes on every column — wasted space, slow writes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_total ON orders(total_cents);
-- Problems: separate indexes don't help combined queries like
-- "SELECT * FROM orders WHERE user_id = ? AND status = ? ORDER BY created_at DESC"

-- ❌ BAD: Index on the wrong column order — leftmost prefix rule violated
CREATE INDEX idx_status_user ON orders(status, user_id);
-- This index is useless for queries filtering by user_id first.
-- The optimizer can only use the LEFTMOST prefix of a composite index.
```

```sql
-- ✅ GOOD: Strategic indexing based on actual query patterns

-- Query: "Show my recent pending orders"
-- WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC
CREATE INDEX idx_orders_user_status_created ON orders(user_id, status, created_at DESC);
-- Composite index matches the exact query filter order. The DESC on created_at
-- avoids a filesort for descending sort queries.

-- Query: "Find all active products by SKU" (most frequent lookup)
CREATE UNIQUE INDEX idx_products_sku_active ON products(sku) WHERE is_active = TRUE;
-- Partial index — only indexes active products, saving ~20% storage if 20% are archived.

-- Query: "Show order details with product info in a single query"
-- This covering index includes all SELECT columns so the DB never touches the table
CREATE INDEX idx_order_items_covering ON order_items(order_id, product_id, quantity, unit_price_cents);
-- Covers the common query:
-- SELECT oi.product_id, oi.quantity, oi.unit_price_cents
-- FROM order_items oi WHERE oi.order_id = ?

-- Query: "Count orders per status for dashboard"
CREATE INDEX idx_orders_status_count ON orders(status) INCLUDE (id);
-- Partial composite with included columns for count queries.

-- Query: "Find delivered orders in date range for shipping reports"
CREATE INDEX idx_orders_delivered_date ON orders(created_at DESC) WHERE status = 'delivered';
-- Another partial index — targets the most common reporting query pattern.

-- NEVER create an index on frequently-updated columns used only for sorting
-- Example: Don't index a `last_login` column that updates every session just because
-- someone occasionally runs "ORDER BY last_login DESC"
```

```python
# ✅ GOOD: Python helper to verify index alignment with actual queries
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class QueryPattern:
    """Describes a query pattern that needs an index.

    Attributes:
        table: Target table name.
        columns: Columns used in WHERE/JOIN/ORDER BY, in the order they appear.
        select_columns: Columns selected — needed for covering index analysis.
        frequency_per_hour: Estimated queries per hour for priority ranking.
    """

    table: str
    columns: tuple[str, ...]
    select_columns: tuple[str, ...]
    frequency_per_hour: int


class IndexAnalyzer:
    """Analyzes query patterns and recommends optimal composite indexes.

    Follows the leftmost prefix rule: a composite index (a, b, c) can serve
    queries filtering on (a), (a, b), or (a, b, c) — but NOT (b) alone or
    (a, c) without b.
    """

    def __init__(self, query_patterns: list[QueryPattern]) -> None:
        self._patterns = sorted(query_patterns, key=lambda p: p.frequency_per_hour, reverse=True)

    def recommend_indexes(self) -> list[IndexRecommendation]:
        """Generate index recommendations based on the leftmost prefix rule.

        Groups query patterns by table and finds optimal column prefixes
        that maximize query coverage per index.

        Returns:
            List of IndexRecommendation objects sorted by priority.
        """
        tables: dict[str, list[QueryPattern]] = {}
        for pattern in self._patterns:
            tables.setdefault(pattern.table, []).append(pattern)

        recommendations: list[IndexRecommendation] = []

        for table, patterns in tables.items():
            # Sort by frequency to prioritize high-traffic queries
            sorted_patterns = sorted(patterns, key=lambda p: p.frequency_per_hour, reverse=True)

            # Build the optimal column order from the most selective filter first
            columns = tuple(p.columns[0] for p in sorted_patterns[:1])  # Primary filter

            # Add additional columns that appear frequently as secondary filters
            added_cols = {columns[0]}
            for pattern in sorted_patterns:
                for col in pattern.columns[1:]:
                    if col not in added_cols:
                        columns += (col,)
                        added_cols.add(col)

            total_queries = sum(p.frequency_per_hour for p in patterns)
            recommendations.append(IndexRecommendation(
                table=table,
                column_order=columns,
                estimated_queries_served=total_queries,
                is_partial=False,
                include_columns=tuple(set(
                    col for p in patterns for col in p.select_columns
                    if col not in columns
                )),
            ))

        return recommendations


@dataclass(frozen=True)
class IndexRecommendation:
    """A recommended index definition.

    Attributes:
        table: Table to create the index on.
        column_order: Columns in the index, leftmost prefix first.
        estimated_queries_served: Total queries this index would serve per hour.
        is_partial: Whether this should be a partial (filtered) index.
        include_columns: Columns to INCLUDE in the index for covering query support.
    """

    table: str
    column_order: tuple[str, ...]
    estimated_queries_served: int
    is_partial: bool = False
    include_columns: tuple[str, ...] = ()

    def to_sql(self, database_dialect: str = "mysql") -> str:
        """Generate the CREATE INDEX SQL statement.

        Args:
            database_dialect: Either 'mysql' or 'postgresql'.

        Returns:
            Complete CREATE INDEX statement string.
        """
        columns_str = ", ".join(self.column_order)
        include_str = ""
        if self.include_columns and database_dialect == "postgresql":
            include_str = f" INCLUDE ({', '.join(self.include_columns)})"

        partial_where = ""
        if self.is_partial:
            # Default partial condition — active records only
            partial_where = " WHERE is_active = TRUE"

        index_name = f"idx_{self.table}_{'_'.join(self.column_order)}"
        return (
            f"CREATE INDEX {index_name} ON {self.table} ({columns_str}){include_str}{partial_where}"
        )


# --- Example Usage ---

def analyze_and_recommend() -> list[IndexRecommendation]:
    """Example: analyze query patterns and recommend indexes."""
    patterns = [
        QueryPattern(
            table="orders",
            columns=("user_id", "status", "created_at"),
            select_columns=("id", "total_cents", "status", "created_at"),
            frequency_per_hour=500,
        ),
        QueryPattern(
            table="products",
            columns=("sku",),
            select_columns=("id", "name", "price_cents"),
            frequency_per_hour=1200,
        ),
        QueryPattern(
            table="order_items",
            columns=("order_id", "product_id"),
            select_columns=("quantity", "unit_price_cents"),
            frequency_per_hour=800,
        ),
    ]

    analyzer = IndexAnalyzer(patterns)
    return analyzer.recommend_indexes()
```

---

## Constraints

### MUST DO
- Use `BIGINT UNSIGNED AUTO_INCREMENT` for all primary keys — never expose internal IDs in APIs without a separate natural key layer
- Define every foreign key with explicit `ON DELETE` and `ON UPDATE` actions — never rely on implicit defaults
- Normalize tables to at least 3NF before adding denormalized columns for performance (document the reason)
- Name indexes predictably: `idx_{table}_{column1}_{column2}` format
- Composite indexes must follow leftmost prefix order matching the most selective WHERE column first
- Partial indexes are preferred over full-table indexes when filtering on a common subset (e.g., `WHERE is_active = TRUE`)
- Every migration UP operation must have a corresponding DOWN that reverses it exactly
- Include `created_at` and `updated_at` timestamp columns on every table with appropriate defaults
- Use explicit transactions for multi-statement migrations
- Test all migrations against realistic data volumes before deploying to production

### MUST NOT DO
- Store comma-separated values or JSON arrays in a column when a junction table would be proper (violates 1NF)
- Use `VARCHAR` without specifying a maximum length — always define the size explicitly
- Create indexes on columns used only for `SELECT *` without WHERE/JOIN/ORDER BY conditions
- Drop foreign key constraints "for performance" — optimize queries or add indexes instead
- Write migration DOWN operations that don't fully reverse the UP operation (causes version drift)
- Use `DATETIME` when `TIMESTAMP` would work — prefer `TIMESTAMP` for timezone-aware storage (converts automatically)
- Index columns with high update frequency solely for sorting queries — it creates write amplification
- Perform schema changes on large tables during peak hours without a migration plan

---

## Output Template

When designing or reviewing database schemas, produce:

1. **Entity List** — Core entities identified from requirements with their key attributes
2. **Relationship Map** — One-to-one, one-to-many, many-to-many relationships with cardinality notation
3. **SQL DDL** — Complete CREATE TABLE statements with all constraints, indexes, and foreign keys
4. **Migration Files** — Versioned SQL files with up/down operations for each schema change
5. **Index Analysis** — Query patterns mapped to recommended composite/partial/covering indexes with rationale

---

## Related Skills

| Skill                   | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `backend-dev-guidelines`  | Ensure database access patterns follow backend conventions     |
| `api-design-principles`   | Design API layers that abstract the schema from clients        |
| `domain-driven-design`    | Align table structure with domain boundaries and bounded contexts |

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Wikipedia: Database Design](https://en.wikipedia.org/wiki/Database_design)
- [IBM: Relational Database Design & Modeling](https://www.ibm.com/docs/en/informix-servers/12.10?topic=files-relational-database-design-modeling)
- [MySQL Reference Manual: CREATE TABLE Syntax](https://dev.mysql.com/doc/refman/8.0/en/create-table.html)
- [PostgreSQL Documentation: Data Types](https://www.postgresql.org/docs/current/datatype.html)
- [Database Normalization Rules (1NF through 5NF)](https://en.wikipedia.org/wiki/Database_normalization)
