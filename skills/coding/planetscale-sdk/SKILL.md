---
name: planetscale-sdk
description: Integrates PlanetScale using mysql-connector-python with patterns for
  database branching, deploy requests, schema management, connection pooling, and
  insights for serverless MySQL.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: planetscale, mysql connector, database branching, planetscale api, how
    do i connect to planetscale from python, serverless mysql, deploy request, vitess
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
  related-skills: coding-postgresql-sdk, coding-supabase-sdk, coding-database-migrations
---
# PlanetScale Python SDK Integration

Integrates PlanetScale serverless MySQL using `mysql-connector-python` (and the PlanetScale API via HTTP) with patterns for database branching, deploy requests, schema management, connection with SSL, connection pooling for serverless environments, and querying with Python.

## TL;DR Checklist

- [ ] Use `mysql.connector.connect()` with SSL for database connections — never without SSL
- [ ] Use `mysql.connector.pooling.MySQLConnectionPool` for connection pooling in web apps
- [ ] Use the PlanetScale HTTP API (`/v1/databases`, `/v1/branches`) for branch and deploy request management
- [ ] Use `ALTER TABLE ... ONLINE` for schema changes (PlanetScale's non-blocking DDL)
- [ ] Use GitHub integration for schema change deploy requests
- [ ] Use `sqlparse` or `sqlglot` for linting migrations before deploy requests
- [ ] Use `SELECT /*+ SET_VAR(session_timeout=60) */` for long-running queries in production

---

## When to Use

Use this skill when:

- Building Python applications that connect to PlanetScale serverless MySQL databases
- Implementing database branching workflows (development branches, production branches)
- Managing deploy requests to merge schema changes into production branches
- Writing connection code for serverless environments (AWS Lambda, Vercel, etc.)
- Performing database migrations with PlanetScale's non-blocking schema changes
- Querying MySQL-compatible databases through the PlanetScale proxy
- Integrating PlanetScale with SQLAlchemy or Django ORM

---

## When NOT to Use

- For non-MySQL databases (use the appropriate SDK — PostgreSQL, MongoDB, etc.)
- For workloads that require FOREIGN KEY constraints (PlanetScale doesn't support them)
- For applications that need LOCK TABLES or similar MySQL features not supported by Vitess
- For high-volume OLTP that needs sub-millisecond latency (consider dedicated MySQL)
- When you need full-text search indexes (PlanetScale uses Vitess which has limits)

---

## Core Workflow

### 1. Connect to PlanetScale with SSL

```python
import mysql.connector
from mysql.connector import Error as MySQLError
from mysql.connector.pooling import MySQLConnectionPool
import os

# PlanetScale requires SSL — always use ssl_ca or ssl_mode
config = {
    "host": os.environ["PLANETSCALE_HOST"],        # e.g. us-east.connect.psdb.cloud
    "port": 3306,
    "database": os.environ["PLANETSCALE_DATABASE"],
    "user": os.environ["PLANETSCALE_USERNAME"],
    "password": os.environ["PLANETSCALE_PASSWORD"],
    "ssl_ca": "/etc/ssl/cert.pem",                 # Path to CA certificate
    "ssl_mode": "VERIFY_IDENTITY",                 # or "REQUIRED" if CA path fails
    "connection_timeout": 10,
    "pool_name": "planetscale_pool",
    "pool_size": 5,
}

# Single connection
conn = mysql.connector.connect(**config)
```

**Checkpoint:** Verify the connection with `conn.is_connected()`. PlanetScale requires SSL — never set `ssl_mode` to `DISABLED`. Use `VERIFY_IDENTITY` for production (prevents MITM) and `REQUIRED` if you can't configure the CA path.

### 2. Execute Queries

```python
def query_orders(
    conn,
    customer_id: str,
    limit: int = 50,
) -> list[dict]:
    """Query orders with parameterized SQL."""
    query = """
        SELECT id, order_date, total, status, currency
        FROM orders
        WHERE customer_id = %s
        ORDER BY order_date DESC
        LIMIT %s
    """
    with conn.cursor(dictionary=True) as cursor:
        cursor.execute(query, (customer_id, limit))
        return cursor.fetchall()

def create_order(conn, order_data: dict) -> int:
    """Insert a new order and return its ID."""
    query = """
        INSERT INTO orders (customer_id, total, status, currency)
        VALUES (%(customer_id)s, %(total)s, %(status)s, %(currency)s)
    """
    with conn.cursor() as cursor:
        cursor.execute(query, order_data)
        conn.commit()
        return cursor.lastrowid
```

**Checkpoint:** PlanetScale runs MySQL 8.0+ via Vitess. Use `cursor(dictionary=True)` for dict results. Always call `conn.commit()` for write operations. PlanetScale autocommits DDL but explicit commit is needed for DML.

### 3. Connection Pooling for Serverless

```python
class PlanetScalePool:
    """Thread-safe connection pool for PlanetScale."""

    def __init__(self, pool_size: int = 10):
        self._pool = MySQLConnectionPool(
            pool_name="pscale_pool",
            pool_size=pool_size,
            pool_reset_session=True,
            **get_connection_config(),
        )

    def execute(self, query: str, params: tuple | dict | None = None) -> list[dict]:
        """Acquire a connection, execute, return results."""
        conn = self._pool.get_connection()
        try:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(query, params or ())
                if cursor.description:  # SELECT-like query
                    return cursor.fetchall()
                conn.commit()
                return []
        except MySQLError as exc:
            conn.rollback()
            raise RuntimeError(f"Query failed: {exc}") from exc
        finally:
            conn.close()  # Returns to pool

pool = PlanetScalePool()

def get_user_orders(user_id: str) -> list[dict]:
    return pool.execute(
        "SELECT * FROM orders WHERE customer_id = %s ORDER BY created_at DESC LIMIT 50",
        (user_id,),
    )
```

**Checkpoint:** PlanetScale's connection proxy handles serverless connection surges. Pool size of 5-10 is typically sufficient. Close connections with `conn.close()` to return them to the pool — never leave connections open in serverless environments.

### 4. PlanetScale API — Database Branches

```python
import httpx

class PlanetScaleAPI:
    """HTTP client for PlanetScale management API."""

    BASE_URL = "https://api.planetscale.com/v1"

    def __init__(self, service_token: str):
        self._client = httpx.Client(
            base_url=self.BASE_URL,
            headers={
                "Authorization": f"Bearer {service_token}",
                "Content-Type": "application/json",
            },
        )

    def list_branches(self, org: str, db: str) -> list[dict]:
        """List all branches for a database."""
        resp = self._client.get(f"/organizations/{org}/databases/{db}/branches")
        resp.raise_for_status()
        return resp.json()["data"]

    def create_branch(self, org: str, db: str, name: str, parent: str = "main") -> dict:
        """Create a new database branch from a parent branch."""
        resp = self._client.post(
            f"/organizations/{org}/databases/{db}/branches",
            json={"name": name, "parent": parent},
        )
        resp.raise_for_status()
        return resp.json()["data"]

    def create_deploy_request(
        self,
        org: str,
        db: str,
        into_branch: str,
        from_branch: str,
        notes: str = "",
    ) -> dict:
        """Create a deploy request to merge schema changes."""
        resp = self._client.post(
            f"/organizations/{org}/databases/{db}/deploy-requests",
            json={
                "into_branch": into_branch,
                "from_branch": from_branch,
                "notes": notes,
            },
        )
        resp.raise_for_status()
        return resp.json()["data"]

    def deploy_request_status(self, org: str, db: str, dr_id: int) -> dict:
        """Check deploy request status (pending, ready, deploying, complete)."""
        resp = self._client.get(
            f"/organizations/{org}/databases/{db}/deploy-requests/{dr_id}",
        )
        resp.raise_for_status()
        return resp.json()["data"]
```

**Checkpoint:** The PlanetScale API requires a service token (not the database password). Create tokens in the PlanetScale dashboard under Settings > Service Tokens. Deploy requests have states: `pending` → `ready` → `deploying` → `complete` (or `closed` on conflict).

---

## Implementation Patterns

### Pattern 1: Migration Workflow with Deploy Requests

```python
def run_migration(
    api: PlanetScaleAPI,
    org: str,
    db: str,
    branch_name: str,
    migration_sql: str,
) -> dict:
    """Run a schema migration through PlanetScale's branching workflow."""
    # 1. Create a branch for the migration
    branch = api.create_branch(org, db, branch_name)

    # 2. Connect to the branch and run migration
    branch_config = get_connection_config(branch_name=branch_name)
    conn = mysql.connector.connect(**branch_config)
    try:
        with conn.cursor() as cursor:
            for statement in migration_sql.split(";"):
                statement = statement.strip()
                if statement:
                    cursor.execute(statement)
    finally:
        conn.close()

    # 3. Create a deploy request
    dr = api.create_deploy_request(org, db, "main", branch_name, notes=f"Migration: {branch_name}")
    return {"branch": branch["name"], "deploy_request_id": dr["id"]}
```

### Pattern 2: SQLAlchemy Integration

```python
from sqlalchemy import create_engine, text

def create_planetscale_engine() -> Engine:
    """Create a SQLAlchemy engine for PlanetScale."""
    connection_string = (
        f"mysql+mysqlconnector://{os.environ['PLANETSCALE_USERNAME']}:"
        f"{os.environ['PLANETSCALE_PASSWORD']}@"
        f"{os.environ['PLANETSCALE_HOST']}:3306/"
        f"{os.environ['PLANETSCALE_DATABASE']}"
        "?ssl_ca=/etc/ssl/cert.pem&ssl_mode=VERIFY_IDENTITY"
    )
    return create_engine(connection_string, pool_size=5, max_overflow=10)

def query_with_sqlalchemy(engine: Engine, user_id: str) -> list[dict]:
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM orders WHERE customer_id = :uid ORDER BY created_at DESC"),
            {"uid": user_id},
        )
        return [row._asdict() for row in result]
```

### BAD vs GOOD: Connection Pattern

```python
# ❌ BAD — Connecting without SSL
def connect_bad():
    return mysql.connector.connect(
        host="us-east.connect.psdb.cloud",
        user="user",
        password="pass",
        database="mydb",
        # No SSL config — will fail on PlanetScale!
    )

# ✅ GOOD — SSL connection with VERIFY_IDENTITY
def connect_good():
    return mysql.connector.connect(
        host=os.environ["PLANETSCALE_HOST"],
        user=os.environ["PLANETSCALE_USERNAME"],
        password=os.environ["PLANETSCALE_PASSWORD"],
        database=os.environ["PLANETSCALE_DATABASE"],
        ssl_ca="/etc/ssl/cert.pem",
        ssl_mode="VERIFY_IDENTITY",
    )
```

### BAD vs GOOD: Schema Changes

```python
# ❌ BAD — Blocking DDL (might lock table on MySQL, unsupported on Vitess)
# ALTER TABLE orders MODIFY COLUMN status VARCHAR(50) NOT NULL;

# ✅ GOOD — Online DDL using PlanetScale branching + deploy request
# 1. Create a branch: pscale branch create myapp-add-status-index
# 2. Make schema change on the branch
# 3. Create a deploy request
# 4. Deploy (zero-downtime)
```

---

## Constraints

### MUST DO
- Always connect with SSL (`ssl_ca` + `ssl_mode=VERIFY_IDENTITY`) — PlanetScale rejects non-SSL connections
- Use connection pooling for production — PlanetScale proxy connections have overhead
- Use database branching for all schema changes — never run DDL directly on production branches
- Use deploy requests to merge schema changes — enables review and rollback
- Always call `conn.commit()` explicitly for write operations
- Use parameterized queries with `%s` placeholders
- Use `cursor(dictionary=True)` for readable results

### MUST NOT DO
- Never connect without SSL — PlanetScale enforces SSL and will drop non-SSL connections
- Do not create connections per request in serverless functions — use a pool or connection proxy
- Avoid FOREIGN KEY constraints — PlanetScale (Vitess) does not support them
- Never run ALTER TABLE directly on production branches — use branching + deploy requests
- Do not use MyISAM tables — PlanetScale only supports InnoDB
- Avoid subqueries in FROM clauses that are not correlated — Vitess may not optimize them well
- Never hardcode database credentials — use environment variables

---

## Output Template

When writing PlanetScale integration code, structure your output as:

1. **Connection Setup** — mysql.connector.connect() with SSL config, host, credentials
2. **Query Execution** — Parameterized SQL with cursor(dictionary=True) for dict results
3. **Pool Management** — MySQLConnectionPool or SQLAlchemy engine for connection reuse
4. **Branching / Deploy Request** — PlanetScale API calls for branch management
5. **Error Handling** — Catch MySQLError, handle connection drops, rollback on write failures

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-postgresql-sdk` | PostgreSQL SDK patterns (alternative relational database) |
| `coding-supabase-sdk` | Supabase BaaS patterns for PostgreSQL |
| `coding-database-migrations` | Migration workflow patterns compatible with PlanetScale branching |

---

## Live References

- [PlanetScale Python Connection Guide](https://planetscale.com/docs/tutorials/connect-python) — Official Python connection examples
- [PlanetScale API Reference](https://api-docs.planetscale.com/v1/) — REST API for branch and deploy request management
- [mysql-connector-python Docs](https://dev.mysql.com/doc/connector-python/en/) — Official MySQL Connector/Python documentation
- [PlanetScale Branching Docs](https://planetscale.com/docs/concepts/branching) — Database branching workflow
- [PlanetScale Deploy Requests](https://planetscale.com/docs/concepts/deploy-requests) — Schema change deploy workflow
- [PlanetScale with SQLAlchemy](https://planetscale.com/docs/tutorials/connect-python) — SQLAlchemy engine configuration
- [Vitess MySQL Compatibility](https://planetscale.com/docs/reference/vitess-compatibility) — MySQL features supported by PlanetScale
