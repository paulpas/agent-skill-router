---
name: snowflake-sdk
description: Integrates Snowflake using snowflake-connector-python 4.x with patterns for SQL execution, Snowpark DataFrames, Cortex AI, streams, tasks, stages, and warehouse management.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: snowflake, snowflake connector, snowpark, snowflake sql, snowflake cortex, how do i query snowflake from python, data warehouse, snowpipe
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-databricks-sdk, coding-bigquery-sdk, coding-postgresql-sdk
---

# Snowflake Python SDK Integration

Integrates Snowflake using `snowflake-connector-python` 4.x (Snowflake Connector) and `snowpark` for Python with patterns for SQL execution, Snowpark DataFrames, Cortex AI functions, streams and tasks, stage file operations, Snowpipe, warehouse management, and virtual warehouse sizing.

## TL;DR Checklist

- [ ] Use `snowflake.connector.connect()` for SQL-based access and `Session.builder.configs()` for Snowpark
- [ ] Use `snowflake.connector.pandas_tools.write_pandas()` for bulk DataFrame inserts
- [ ] Use parameterized queries with `%(name)s` bind variables — never string formatting
- [ ] Use `Snowpark DataFrame` API for type-safe, lazy query construction
- [ ] Use `Cortex` functions (`Complete()`, `EmbedText()`, `Summarize()`) for AI features
- [ ] Use `CREATE STREAM` + `CREATE TASK` for change data capture pipelines
- [ ] Use `PUT` / `GET` commands with stage locations for file-based data loading

---

## When to Use

Use this skill when:

- Building data pipelines that read from or write to Snowflake
- Implementing ELT workflows where transformations run in Snowflake (not in Python)
- Leveraging Snowpark for lazy, DataFrame-based query construction
- Using Snowflake Cortex AI functions for LLM inference, embeddings, or classification
- Managing Snowflake streams and tasks for change data capture
- Loading data from cloud storage stages (S3, GCS, Azure Blob) into Snowflake tables
- Building applications that need Snowflake's virtual warehouse compute model

---

## When NOT to Use

- For transactional OLTP workloads (use PostgreSQL instead)
- For in-memory caching (use Redis instead)
- For real-time streaming at sub-second latency (use Kafka + stream processing)
- When your data volume is small and a local database is simpler

---

## Core Workflow

### 1. Connect to Snowflake

```python
import snowflake.connector
from snowflake.connector.errors import (
    DatabaseError,
    ProgrammingError,
    OperationalError,
)

conn = snowflake.connector.connect(
    user=os.environ["SNOWFLAKE_USER"],
    password=os.environ["SNOWFLAKE_PASSWORD"],
    account=os.environ["SNOWFLAKE_ACCOUNT"],  # e.g. xyz12345.us-east-1
    warehouse=os.environ["SNOWFLAKE_WAREHOUSE"],
    database="MY_DB",
    schema="PUBLIC",
    role="ANALYST",
    client_session_keep_alive=True,
    login_timeout=30,
    network_timeout=60,
)
```

**Checkpoint:** Verify connectivity by querying `SELECT CURRENT_VERSION(), CURRENT_WAREHOUSE()`. Catch `OperationalError` for network issues, `ProgrammingError` for invalid credentials or role permissions.

### 2. Execute SQL with Bind Variables

```python
def get_orders_by_customer(conn, customer_id: str, status: str | None = None) -> list[dict]:
    """Query orders with parameterized bind variables."""
    query = """
        SELECT order_id, order_date, total_amount, status
        FROM orders
        WHERE customer_id = %(customer_id)s
          AND (%(status)s IS NULL OR status = %(status)s)
        ORDER BY order_date DESC
        LIMIT 100
    """
    with conn.cursor() as cur:
        cur.execute(query, {"customer_id": customer_id, "status": status})
        columns = [col[0] for col in cur.description]
        return [dict(zip(columns, row)) for row in cur.fetchall()]
```

**Checkpoint:** Always use bind variables (`%(name)s` or `%s`) — never concatenate values. Validate that the cursor description maps correctly to column names.

### 3. Bulk Insert with write_pandas

```python
import pandas as pd
from snowflake.connector.pandas_tools import write_pandas

def bulk_upload_orders(conn, df: pd.DataFrame, table: str = "ORDERS") -> int:
    """Efficiently write a pandas DataFrame to a Snowflake table."""
    success, num_chunks, num_rows, output = write_pandas(
        conn=conn,
        df=df,
        table_name=table,
        database="MY_DB",
        schema="PUBLIC",
        chunk_size=50000,
        quote_identifiers=True,
        overwrite=False,
    )
    if not success:
        raise RuntimeError(f"write_pandas failed: {output}")
    return num_rows
```

**Checkpoint:** Ensure DataFrame column names match Snowflake column names (case-insensitive by default). Use `chunk_size` to control memory usage. Set `overwrite=True` only for full table replacements.

### 4. Snowpark DataFrame API

```python
from snowflake.snowpark import Session
from snowflake.snowpark.functions import col, sum_, count, when, lit, month

def create_snowpark_session() -> Session:
    """Create a Snowpark session from environment variables."""
    connection_params = {
        "account": os.environ["SNOWFLAKE_ACCOUNT"],
        "user": os.environ["SNOWFLAKE_USER"],
        "password": os.environ["SNOWFLAKE_PASSWORD"],
        "warehouse": os.environ["SNOWFLAKE_WAREHOUSE"],
        "database": "MY_DB",
        "schema": "PUBLIC",
        "role": "ANALYST",
    }
    return Session.builder.configs(connection_params).create()

def monthly_sales_summary(session: Session, year: int) -> list[dict]:
    """Aggregate monthly sales using Snowpark DataFrame API."""
    df = session.table("ORDERS").filter(col("ORDER_DATE").between(f"{year}-01-01", f"{year}-12-31"))
    summary = (
        df.groupBy(month(col("ORDER_DATE")).alias("MONTH"))
        .agg(
            count("ORDER_ID").alias("ORDER_COUNT"),
            sum_("TOTAL_AMOUNT").alias("REVENUE"),
        )
        .sort(col("MONTH").asc())
    )
    return summary.collect()
```

**Checkpoint:** Snowpark DataFrames are lazy — they compile to SQL only on terminal operations (`collect()`, `show()`, `count()`). Use `explain()` to inspect the generated SQL before execution.

---

## Implementation Patterns

### Pattern 1: Snowflake Cortex AI Integration

```python
def generate_customer_summary(conn, customer_id: str) -> str:
    """Use Cortex Complete() to generate a customer summary."""
    query = """
        SELECT SNOWFLAKE.CORTEX.COMPLETE(
            'llama3-70b',
            CONCAT(
                'Summarize this customer\\'s purchase history:\\n',
                'Customer ID: ', customer_id, '\\n',
                'Total spent: $', total_spent, '\\n',
                'Order count: ', order_count, '\\n',
                'Preferred category: ', top_category
            )
        ) AS summary
        FROM (
            SELECT %(customer_id)s AS customer_id,
                   SUM(total_amount) AS total_spent,
                   COUNT(*) AS order_count,
                   MODE(category) AS top_category
            FROM orders
            WHERE customer_id = %(customer_id)s
        )
    """
    with conn.cursor() as cur:
        cur.execute(query, {"customer_id": customer_id})
        return cur.fetchone()[0]
```

### Pattern 2: Stream + Task for CDC Pipeline

```python
def setup_cdc_pipeline(conn, source_table: str, target_table: str) -> None:
    """Create a stream and task for change data capture."""
    with conn.cursor() as cur:
        # Create stream to track changes
        cur.execute(f"""
            CREATE OR REPLACE STREAM {source_table}_stream
            ON TABLE {source_table}
            SHOW_INITIAL_ROWS = TRUE
        """)
        # Create task to merge changes into target
        cur.execute(f"""
            CREATE OR REPLACE TASK {source_table}_cdc_task
                WAREHOUSE = ANALYTICS_WH
                SCHEDULE = '5 MINUTE'
            WHEN
                SYSTEM$STREAM_HAS_DATA('{source_table}_stream')
            AS
                MERGE INTO {target_table} t
                USING {source_table}_stream s ON t.id = s.id
                WHEN MATCHED AND s.METADATA$ACTION = 'DELETE' THEN DELETE
                WHEN MATCHED THEN UPDATE SET t.amount = s.amount
                WHEN NOT MATCHED THEN INSERT (id, amount) VALUES (s.id, s.amount)
        """)
        cur.execute(f"ALTER TASK {source_table}_cdc_task RESUME")
```

### Pattern 3: Stage File Operations

```python
def load_from_stage(conn, stage_name: str, file_pattern: str, table: str) -> int:
    """Load files from a Snowflake stage into a table."""
    with conn.cursor() as cur:
        result = cur.execute(f"""
            COPY INTO {table}
            FROM @{stage_name}
            FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1)
            PATTERN = '{file_pattern}'
            ON_ERROR = 'CONTINUE'
            PURGE = FALSE
        """)
        return result.rowcount
```

### BAD vs GOOD: Query Parameterization

```python
# ❌ BAD — String concatenation (SQL injection risk)
def get_user_bad(conn, user_id: str):
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM users WHERE id = '{user_id}'")

# ✅ GOOD — Bind variables with named parameters
def get_user_good(conn, user_id: str):
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE id = %(id)s", {"id": user_id})
        return cur.fetchall()
```

### BAD vs GOOD: Warehouse Management

```python
# ❌ BAD — Using XL warehouse for a small query (cost waste)
def small_query_bad(conn):
    conn.cursor().execute("ALTER WAREHOUSE ANALYTICS_WH SET WAREHOUSE_SIZE = 'XLARGE'")
    conn.cursor().execute("SELECT COUNT(*) FROM orders")

# ✅ GOOD — Use smallest warehouse that meets performance needs
def small_query_good(conn):
    conn.cursor().execute("ALTER WAREHOUSE ANALYTICS_WH SET WAREHOUSE_SIZE = 'XSMALL'")
    conn.cursor().execute("SELECT COUNT(*) FROM orders")
```

---

## Constraints

### MUST DO
- Use bind variables (`%(name)s`) for all user-supplied values in SQL queries
- Use `write_pandas()` for bulk DataFrame inserts — 10x faster than row-by-row
- Suspend warehouses when not in use to control costs (`ALTER WAREHOUSE ... SUSPEND`)
- Use `client_session_keep_alive=True` for long-running connections
- Set explicit `warehouse`, `database`, `schema`, and `role` in connection parameters
- Use `ON_ERROR = 'CONTINUE'` for COPY INTO operations to handle partial failures

### MUST NOT DO
- Never concatenate strings to build SQL queries — always use bind variables
- Do not keep warehouses running 24/7 for batch workloads — auto-suspend after idle period
- Avoid querying large tables without filters or partitions — Snowflake charges per byte scanned
- Never use ACCOUNTADMIN role for application connections — use dedicated roles with minimal permissions
- Do not ignore `ProgrammingError` for SQL compilation errors — fix the SQL, don't suppress

---

## Output Template

When writing Snowflake integration code, structure your output as:

1. **Connection Setup** — snowflake.connector.connect() with account, credentials, warehouse, role
2. **SQL Execution** — Parameterized query with bind variables and cursor management
3. **Data Loading** — write_pandas() or COPY INTO for bulk operations
4. **Snowpark** — Session creation and lazy DataFrame API
5. **Cleanup** — Close connection in finally block, suspend warehouse after batch jobs

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-databricks-sdk` | Databricks lakehouse SDK patterns (alternative data platform) |
| `coding-bigquery-sdk` | BigQuery serverless data warehouse patterns |
| `coding-postgresql-sdk` | Traditional RDBMS patterns for comparison |

---

## Live References

- [Snowflake Connector for Python Docs](https://docs.snowflake.com/en/developer-guide/python-connector/python-connector) — Official connector documentation
- [Snowpark Python API](https://docs.snowflake.com/en/developer-guide/snowpark/python/index) — Snowpark DataFrame API reference
- [Snowflake Cortex AI Docs](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-ai) — Cortex AI functions (Complete, EmbedText, etc.)
- [Snowflake Streams & Tasks](https://docs.snowflake.com/en/user-guide/streams-tasks) — CDC pipeline patterns
- [Snowflake COPY INTO](https://docs.snowflake.com/en/sql-reference/sql/copy-into-table) — Stage-to-table loading reference
- [write_pandas Documentation](https://docs.snowflake.com/en/developer-guide/python-connector/python-connector-api#write_pandas) — Bulk DataFrame write API
- [Snowflake Virtual Warehouses](https://docs.snowflake.com/en/user-guide/warehouses) — Warehouse sizing and cost management
