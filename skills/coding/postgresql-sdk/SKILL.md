---




name: postgresql-sdk
description: Integrates PostgreSQL databases using psycopg2 2.9.x and asyncpg 0.31.x
  with patterns for connection pooling, replication, COPY, and query parameterization.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: postgresql, psycopg2, asyncpg, postgres connection pool, sql parameterization,
    how do i query postgres from python, database replication, libpq
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
  related-skills: coding-database-design-modeling, coding-database-migrations, coding-asyncio-patterns




---




# PostgreSQL Python SDK Integration

Integrates PostgreSQL databases using `psycopg2` 2.9.x (synchronous, DB-API 2.0) and `asyncpg` 0.31.x (asyncio-native) with patterns for connection management, parameterized queries, COPY bulk operations, connection pooling, logical replication, and transaction handling.

## TL;DR Checklist

- [ ] Use `psycopg2.connect()` for synchronous workloads and `asyncpg.connect()` for asyncio
- [ ] Always parameterize queries with `%s` (psycopg2) or `$1` (asyncpg) — never use string formatting
- [ ] Use `psycopg2.pool.ThreadedConnectionPool` or `asyncpg.pool.create_pool()` for connection pooling
- [ ] Use `copy_from()` / `copy_to()` for bulk data operations, not row-by-row INSERT
- [ ] Use `conn.set_session(autocommit=True)` for DDL statements that cannot run in a transaction
- [ ] Always use context managers (`with conn:`) for automatic transaction management
- [ ] Enable `logical replication` via asyncpg's `replication()` for change data capture

---

## When to Use

Use this skill when:

- Building Python applications that read/write to PostgreSQL databases
- Implementing connection pooling for web services with concurrent database access
- Performing bulk data loading or unloading with PostgreSQL COPY protocol
- Setting up logical replication or listening to LISTEN/NOTIFY channels
- Writing database migration scripts or ETL pipelines targeting PostgreSQL
- Building async web frameworks (FastAPI, aiohttp) that need non-blocking database access

---

## When NOT to Use

- For simple key-value workloads (use Redis or DynamoDB instead)
- When you need a document store with flexible schemas (use MongoDB instead)
- For in-memory data caching (use Redis instead)
- When interacting with other SQL databases (MySQL, SQLite) — use their respective drivers

---

## Core Workflow

### 1. Connect to PostgreSQL

Choose the driver based on your concurrency model:

```python
# Synchronous — psycopg2 (widely compatible, DB-API 2.0)
import psycopg2
from psycopg2 import sql, OperationalError

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="mydb",
    user="app_user",
    password=os.environ["PGPASSWORD"],
    connect_timeout=10,
    sslmode="require",
)
```

```python
# Asynchronous — asyncpg (fastest, asyncio-native)
import asyncpg
import os

conn = await asyncpg.connect(
    host="localhost",
    port=5432,
    database="mydb",
    user="app_user",
    password=os.environ["PGPASSWORD"],
    timeout=10,
    ssl="require",
)
```

**Checkpoint:** Verify connectivity with `SELECT 1` before running application queries. Handle `OperationalError` (psycopg2) or `asyncpg.InvalidPasswordError` (asyncpg) at connection time — do not defer to query execution.

### 2. Execute Queries with Parameterization

Never interpolate values into SQL strings. Use driver-native placeholders.

```python
# psycopg2 — %s placeholders (positional)
def get_users_by_age(conn, min_age: int, max_age: int) -> list[tuple]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, name, email FROM users WHERE age BETWEEN %s AND %s",
            (min_age, max_age),
        )
        return cur.fetchall()

# asyncpg — $1, $2 placeholders (positional, 1-indexed)
async def get_users_by_age_async(conn, min_age: int, max_age: int) -> list[asyncpg.Record]:
    return await conn.fetch(
        "SELECT id, name, email FROM users WHERE age BETWEEN $1 AND $2",
        min_age, max_age,
    )
```

**Checkpoint:** Verify all external input is passed as query parameters, not interpolated. Use `sql.Identifier()` for dynamic table/column names in psycopg2.

### 3. Manage Transactions with Context Managers

Use `with conn:` to automatically commit or rollback on exception.

```python
def transfer_funds(
    conn,
    from_account: str,
    to_account: str,
    amount: Decimal,
) -> None:
    """Execute a funds transfer atomically."""
    with conn:  # Begins transaction; commits on success, rolls back on exception
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE accounts SET balance = balance - %s WHERE id = %s",
                (amount, from_account),
            )
            if cur.rowcount != 1:
                raise ValueError(f"Account {from_account} not found")
            cur.execute(
                "UPDATE accounts SET balance = balance + %s WHERE id = %s",
                (amount, to_account),
            )
```

**Checkpoint:** Never nest `with conn:` blocks. Use savepoints (`SAVEPOINT sp; ROLLBACK TO SAVEPOINT sp;`) for sub-transactions within a single connection context.

### 4. Use Connection Pooling for Concurrency

```python
# psycopg2 ThreadedConnectionPool
from psycopg2.pool import ThreadedConnectionPool

pool = ThreadedConnectionPool(
    minconn=2,
    maxconn=10,
    host="localhost",
    dbname="mydb",
    user="app_user",
    password=os.environ["PGPASSWORD"],
)

def query_with_pool(query: str, params: tuple) -> list[tuple]:
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()
    finally:
        pool.putconn(conn)
```

```python
# asyncpg connection pool
pool = await asyncpg.create_pool(
    host="localhost",
    database="mydb",
    user="app_user",
    password=os.environ["PGPASSWORD"],
    min_size=5,
    max_size=20,
)

async def query_with_pool_async(query: str, *args) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(query, *args)
```

**Checkpoint:** Validate pool sizing against your database `max_connections` setting. Never let pool `max_size` exceed the server's connection limit.

---

## Implementation Patterns

### Pattern 1: COPY for Bulk Data Loading

```python
import io
import csv

def bulk_insert_users(conn, users: list[dict]) -> int:
    """Insert users using COPY for maximum throughput."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    for user in users:
        writer.writerow([user["name"], user["email"], user["age"]])
    buffer.seek(0)

    with conn.cursor() as cur:
        cur.copy_from(
            buffer,
            "users",
            columns=("name", "email", "age"),
            sep=",",
        )
        return cur.rowcount
```

### Pattern 2: LISTEN/NOTIFY for Real-Time Events

```python
import select

def listen_for_events(conn, channel: str, callback) -> None:
    """Listen for PostgreSQL NOTIFY events and invoke a callback."""
    conn.set_session(autocommit=True)
    with conn.cursor() as cur:
        cur.execute(f"LISTEN {channel}")

    while True:
        if select.select([conn], [], [], 5) == ([], [], []):
            continue  # Timeout — poll for other work
        conn.poll()
        for notify in conn.notifies:
            callback(notify.channel, notify.payload)
        conn.notifies.clear()
```

### Pattern 3: Logical Replication Consumer (asyncpg)

```python
async def consume_replication_slot(pool):
    """Read changes from a logical replication slot."""
    async with pool.acquire() as conn:
        await conn.execute("CREATE_REPLICATION_SLOT test_slot LOGICAL pgoutput")
        async for change in conn.replication():
            # Each change is a ReplicationMessage with lsn, data, xid
            process_change(change.lsn, change.data)
```

### BAD vs GOOD: Query Building

```python
# ❌ BAD — String interpolation vulnerable to SQL injection
def get_user_bad(conn, user_id: str):
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM users WHERE id = '{user_id}'")
    return cur.fetchone()

# ✅ GOOD — Parameterized query with %s placeholder
def get_user_good(conn, user_id: str):
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        return cur.fetchone()
```

### BAD vs GOOD: Dynamic Table Names

```python
# ❌ BAD — String formatting for table names (SQL injection risk)
def count_rows_bad(conn, table_name: str):
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) FROM {table_name}")

# ✅ GOOD — Use psycopg2.sql.Identifier for identifiers
from psycopg2 import sql

def count_rows_good(conn, table_name: str):
    with conn.cursor() as cur:
        query = sql.SQL("SELECT COUNT(*) FROM {}").format(
            sql.Identifier(table_name)
        )
        cur.execute(query)
        return cur.fetchone()[0]
```

---

## Constraints

### MUST DO
- Always parameterize query values with `%s` (psycopg2) or `$N` (asyncpg) — never use f-strings or `str.format()`
- Use `with conn:` for transaction management — auto-commits on success, rolls back on exception
- Use connection pools in web applications to avoid connection exhaustion
- Validate pool `max_size` against PostgreSQL `max_connections` setting
- Call `conn.close()` or return connections to pool in `finally` blocks
- Use `copy_from()` / `copy_to()` for bulk operations (10x+ faster than row-by-row INSERT)
- Use `sslmode="require"` (psycopg2) or `ssl="require"` (asyncpg) in production

### MUST NOT DO
- Never concatenate user input into SQL strings — always use parameterized queries
- Do not create a new connection per request in web apps — use connection pools
- Never set `autocommit=True` unless you fully understand the transaction implications
- Avoid `SELECT *` in production code — always specify columns explicitly
- Do not use `asyncpg` with `psycopg2` connection strings (different parameter styles)
- Never ignore `OperationalError` — it indicates connection or configuration problems

---

## Output Template

When writing PostgreSQL integration code, structure your output as:

1. **Connection Setup** — Driver import, connection parameters, SSL config
2. **Pool Initialization** — Pool creation with min/max sizing for concurrent access
3. **Query Execution** — Parameterized SQL with `with` context managers for transactions
4. **Error Handling** — Specific exception types (`OperationalError`, `UniqueViolation`, `ForeignKeyViolation`)
5. **Resource Cleanup** — Return connections to pool or close them in `finally` / async context managers

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-database-design-modeling` | Schema design, normalization, indexing strategies |
| `coding-database-migrations` | Alembic and migration workflow patterns |
| `coding-asyncio-patterns` | Asyncio patterns used with asyncpg connections |

---

## Live References

- [psycopg2 Documentation](https://www.psycopg.org/docs/) — Official psycopg2 (2.9.x) documentation
- [asyncpg Documentation](https://magicstack.github.io/asyncpg/current/) — Official asyncpg (0.31.x) documentation
- [psycopg2 Pool Guide](https://www.psycopg.org/docs/pool.html) — Connection pooling with ThreadedConnectionPool
- [asyncpg pool API](https://magicstack.github.io/asyncpg/current/api/index.html#connection-pools) — asyncpg connection pool reference
- [PostgreSQL COPY Documentation](https://www.postgresql.org/docs/current/sql-copy.html) — COPY protocol for bulk operations
- [PostgreSQL LISTEN/NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html) — Async notification channels
- [psycopg2 sql Module](https://www.psycopg.org/docs/sql.html) — Safe SQL composition for dynamic identifiers
