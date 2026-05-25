---
name: bigquery-sdk
description: Integrates Google BigQuery using google-cloud-bigquery 3.x with patterns
  for SQL queries, dataset/table management, streaming inserts, BI Engine, and load
  jobs from GCS.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: bigquery, google cloud bigquery, bigquery sql, how do i query bigquery
    from python, bigquery streaming, google-cloud-bigquery, bi engine, bigquery load
    job
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
  related-skills: coding-snowflake-sdk, coding-databricks-sdk, coding-google-cloud-sdk
------
# Google BigQuery Python SDK Integration

Integrates Google BigQuery using `google-cloud-bigquery` 3.x with patterns for SQL query execution (sync and async), dataset and table management, streaming inserts, load jobs from Cloud Storage, BI Engine reservations, and query job lifecycle management.

## TL;DR Checklist

- [ ] Use `bigquery.Client()` with ADC (Application Default Credentials) or explicit service account
- [ ] Use `client.query()` for synchronous queries and `client.query_and_wait()` for automatic waiting
- [ ] Use `client.load_table_from_uri()` for loading data from GCS into BigQuery tables
- [ ] Use `client.insert_rows_json()` for streaming inserts (real-time data)
- [ ] Use `client.create_dataset()` and `client.create_table()` with explicit schema definitions
- [ ] Use `bq` CLI or `client.query()` with DDL for schema changes to existing tables
- [ ] Use `SELECT * EXCEPT()` and `ROW_NUMBER()` for deduplication patterns

---

## When to Use

Use this skill when:

- Running analytical SQL queries on large datasets using BigQuery's serverless engine
- Building ELT pipelines where transformations run in BigQuery (not in Python)
- Streaming real-time data into BigQuery tables for immediate queryability
- Loading batch data from Google Cloud Storage into partitioned BigQuery tables
- Managing datasets, tables, views, and routines programmatically
- Optimizing query performance with BI Engine, clustering, and partitioning
- Building reporting dashboards that source data from BigQuery

---

## When NOT to Use

- For transactional OLTP workloads (use Cloud SQL or Spanner instead)
- For real-time sub-second queries on streaming data (use Bigtable instead)
- For small datasets that fit in memory (use a local SQLite or pandas)
- When you need strongly consistent row-level operations (use Firestore or Spanner)

---

## Core Workflow

### 1. Authenticate and Create Client

```python
from google.cloud import bigquery
from google.cloud.bigquery import (
    Client, QueryJob, LoadJob, ExtractJob,
    Dataset, Table, SchemaField,
)
from google.cloud.exceptions import NotFound, Forbidden, BadRequest
from google.auth.exceptions import DefaultCredentialsError

# Option A: Application Default Credentials (ADC)
client: Client = bigquery.Client(project="my-gcp-project")

# Option B: Explicit service account key file
client: Client = bigquery.Client.from_service_account_json(
    "path/to/service-account-key.json",
    project="my-gcp-project",
)
```

**Checkpoint:** Verify connectivity with `client.query("SELECT 1 AS test").result()`. Catch `DefaultCredentialsError` at startup — don't proceed without valid credentials.

### 2. Execute SQL Queries

```python
def query_orders(
    client: Client,
    min_date: str,
    max_date: str,
    limit: int = 1000,
) -> list[dict]:
    """Execute a parameterized query and return results as dicts."""
    query = """
        SELECT order_id, customer_id, order_date, total_amount, status
        FROM `my-project.my_dataset.orders`
        WHERE order_date BETWEEN @min_date AND @max_date
          AND status IN ('shipped', 'delivered')
        ORDER BY order_date DESC
        LIMIT @limit
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("min_date", "STRING", min_date),
            bigquery.ScalarQueryParameter("max_date", "STRING", max_date),
            bigquery.ScalarQueryParameter("limit", "INT64", limit),
        ],
        use_query_cache=True,
    )
    query_job: QueryJob = client.query(query, job_config=job_config)
    results = query_job.result()  # Waits for job to complete
    return [dict(row.items()) for row in results]
```

**Checkpoint:** Always use `QueryJobConfig` with `query_parameters` for parameterized queries — never f-string interpolation. Use `use_query_cache=True` for repeated analytical queries to reduce cost.

### 3. Streaming Inserts (Real-Time Data)

```python
def insert_orders_streaming(client: Client, rows: list[dict]) -> list[dict]:
    """Stream rows into a BigQuery table with error reporting."""
    table_ref = "my-project.my_dataset.orders_streaming"

    errors = client.insert_rows_json(table_ref, rows)
    if errors:
        # Each error is a dict with 'index' and 'errors' keys
        failed = []
        for error in errors:
            failed.append({
                "row_index": error.get("index"),
                "errors": error.get("errors"),
            })
        raise RuntimeError(f"Streaming insert failed for {len(failed)} rows: {failed}")

    return rows
```

**Checkpoint:** Streaming inserts have best-effort durability. Use `insert_rows_json()` for dict-based rows. Inspect the errors list — a non-empty list means some rows failed. Use a separate staging table + scheduled merge for exactly-once semantics.

### 4. Load Data from GCS

```python
def load_from_gcs(
    client: Client,
    gcs_uri: str,
    table_id: str,
    schema: list[SchemaField],
    partition_field: str | None = "order_date",
) -> LoadJob:
    """Load CSV/Parquet/JSON data from GCS into a partitioned BigQuery table."""
    job_config = bigquery.LoadJobConfig(
        source_format=bigquery.SourceFormat.PARQUET,
        schema=schema,
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
        create_disposition=bigquery.CreateDisposition.CREATE_IF_NEEDED,
        time_partitioning=bigquery.TimePartitioning(
            type_=bigquery.TimePartitioningType.DAY,
            field=partition_field,
        ),
        clustering_fields=["customer_id"],
    )
    load_job: LoadJob = client.load_table_from_uri(
        gcs_uri,
        table_id,
        job_config=job_config,
    )
    load_job.result()  # Wait for completion
    dest_table = client.get_table(table_id)
    return load_job  # Contains load_job.output_rows, errors
```

**Checkpoint:** Parquet format is fastest for loading into BigQuery. Use `WRITE_TRUNCATE` for full refreshes, `WRITE_APPEND` for incremental loads. Always check `load_job.errors` after completion.

---

## Implementation Patterns

### Pattern 1: Query Job Lifecycle with Manual Polling

```python
def run_async_query(client: Client, query: str, job_config: bigquery.QueryJobConfig | None = None) -> dict:
    """Submit an async query and poll for completion with progress."""
    job: QueryJob = client.query(query, job_config=job_config)
    job_id = job.job_id
    print(f"Submitted job {job_id}")

    while not job.done():
        print(f"Job {job_id}: {job.state} ({job.bytes_processed / 1e9:.2f} GB processed)")
        job.reload()
        import time
        time.sleep(5)

    if job.error_result:
        raise RuntimeError(f"Query failed: {job.error_result}")

    total_bytes = job.total_bytes_processed
    return {
        "job_id": job_id,
        "rows": [dict(row.items()) for row in job.result()],
        "bytes_processed": total_bytes,
        "slot_ms": job.slot_millis or 0,
        "cache_hit": job.cache_hit or False,
    }
```

### Pattern 2: Dataset and Table Management

```python
def ensure_dataset_and_table(client: Client, dataset_id: str, table_id: str) -> None:
    """Create a dataset and partitioned table if they don't exist."""
    # Create dataset
    try:
        client.get_dataset(dataset_id)
    except NotFound:
        dataset = Dataset(f"{client.project}.{dataset_id}")
        dataset.location = "US"
        client.create_dataset(dataset, timeout=30)

    # Create partitioned table
    table_ref = f"{client.project}.{dataset_id}.{table_id}"
    try:
        client.get_table(table_ref)
    except NotFound:
        schema = [
            SchemaField("event_id", "STRING", mode="REQUIRED"),
            SchemaField("event_type", "STRING", mode="REQUIRED"),
            SchemaField("user_id", "STRING", mode="REQUIRED"),
            SchemaField("event_data", "JSON", mode="NULLABLE"),
            SchemaField("created_at", "TIMESTAMP", mode="REQUIRED"),
        ]
        table = Table(table_ref, schema=schema)
        table.time_partitioning = bigquery.TimePartitioning(
            type_=bigquery.TimePartitioningType.DAY,
            field="created_at",
        )
        table.clustering_fields = ["event_type", "user_id"]
        client.create_table(table)
```

### Pattern 3: BI Engine Reservations

```python
def create_bi_engine_reservation(client: Client, project: str, region: str, size_gb: int) -> dict:
    """Create a BI Engine reservation for accelerated queries."""
    from google.cloud.bigquery.bi_engine import BiEngineReservation

    reservation = BiEngineReservation(
        project=project,
        location=region,
        size_gb=size_gb,
    )
    # Note: BI Engine API is in preview — check latest docs
    result = client.create_bi_engine_reservation(reservation)
    return {"name": result.name, "size_gb": result.size_gb, "state": result.state}
```

### BAD vs GOOD: Query Construction

```python
# ❌ BAD — f-string interpolation (SQL injection, no caching)
def query_bad(client, table, min_date):
    return client.query(f"SELECT * FROM `{table}` WHERE date >= '{min_date}'").result()

# ✅ GOOD — Parameterized query with QueryJobConfig
def query_good(client: Client, table: str, min_date: str):
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("min_date", "STRING", min_date),
        ]
    )
    return client.query(f"SELECT * FROM `{table}` WHERE date >= @min_date", job_config=job_config).result()
```

### BAD vs GOOD: Streaming vs Batch Loading

```python
# ❌ BAD — Streaming inserts for large historical backfill (expensive, slow)
def backfill_bad(client, rows):
    return client.insert_rows_json("my_dataset.my_table", rows)  # 10k+ rows is costly

# ✅ GOOD — Load job from GCS for bulk data
def backfill_good(client: Client, gcs_pattern: str, table_id: str):
    job_config = bigquery.LoadJobConfig(
        source_format=bigquery.SourceFormat.PARQUET,
        write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
    )
    load_job = client.load_table_from_uri(gcs_pattern, table_id, job_config=job_config)
    load_job.result()
    print(f"Loaded {load_job.output_rows} rows")
```

---

## Constraints

### MUST DO
- Use parameterized queries (`@param`) for all user-supplied values — never f-string interpolation
- Use `client.query()` with `job_config` for production queries — allows caching, parameterization, and cost control
- Partition tables by date for query cost reduction (BigQuery scans partitions)
- Cluster tables on frequently filtered columns for performance
- Use Parquet format for GCS load jobs — fastest import performance
- Set `use_query_cache=True` for repeated queries — reduces cost and latency
- Use `SELECT * EXCEPT()` to avoid requesting unnecessary columns

### MUST NOT DO
- Never use `SELECT *` in production queries — specify columns explicitly to control costs
- Do not use streaming inserts for backfill or batch workloads — use GCS load jobs
- Avoid querying tables without partitioning filters — you pay for full table scans
- Never run `DELETE` or `UPDATE` on large tables without partitioning filters
- Do not ignore query job errors — check `job.error_result` on every job
- Never hardcode project/dataset names — read from environment or configuration

---

## Output Template

When writing BigQuery integration code, structure your output as:

1. **Client Initialization** — bigquery.Client with project and auth method
2. **Query or Job Config** — QueryJobConfig with parameters, cache settings, and destination
3. **Execution** — client.query() or client.load_table_from_uri() + .result()
4. **Error Handling** — Check job.error_result, handle NotFound, Forbidden, BadRequest
5. **Result Processing** — Iterate over results with dict(row.items()) for dict access

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-snowflake-sdk` | Snowflake data warehouse SDK (alternative platform) |
| `coding-databricks-sdk` | Databricks lakehouse SDK patterns |
| `coding-google-cloud-sdk` | Broader GCP SDK patterns (GCS, IAM, etc.) |

---

## Live References

- [google-cloud-bigquery Documentation](https://googleapis.dev/python/bigquery/latest/) — Official Python client docs
- [BigQuery SQL Reference](https://cloud.google.com/bigquery/docs/reference/standard-sql) — Standard SQL syntax for BigQuery
- [BigQuery Query Jobs](https://cloud.google.com/bigquery/docs/running-queries) — Sync and async query execution
- [BigQuery Streaming Inserts](https://cloud.google.com/bigquery/docs/streaming-data-into-bigquery) — Real-time data ingestion
- [BigQuery Load Jobs](https://cloud.google.com/bigquery/docs/loading-data) — Loading data from GCS
- [BigQuery Table Partitioning](https://cloud.google.com/bigquery/docs/partitioned-tables) — Partition and cluster table design
- [BigQuery BI Engine](https://cloud.google.com/bi-engine/docs) — In-memory query acceleration
