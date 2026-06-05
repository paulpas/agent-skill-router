---




name: databricks-sdk
description: Integrates Databricks using databricks-sdk with patterns for job orchestration,
  cluster management, SQL warehouses, Unity Catalog, MLflow, and Delta Lake operations.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: databricks, databricks sdk, unity catalog, databricks jobs, databricks
    sql warehouse, how do i use databricks from python, mlflow, delta lake
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
  related-skills: coding-snowflake-sdk, coding-bigquery-sdk, coding-mlflow-integration




---




# Databricks Python SDK Integration

Integrates Databricks using `databricks-sdk` (v0.105+) with patterns for job orchestration, cluster and SQL warehouse management, Unity Catalog metadata operations, MLflow experiment tracking, Delta Lake table operations, and secret scopes.

## TL;DR Checklist

- [ ] Use `WorkspaceClient` for workspace-level APIs and `AccountClient` for account-level APIs
- [ ] Configure authentication via `.databrickscfg` file, `DATABRICKS_HOST`/`DATABRICKS_TOKEN` env vars, or OAuth
- [ ] Use `jobs.submit()` for one-off job runs and `jobs.create()` for recurring jobs
- [ ] Use `WarehouseClient.execute_statement()` for SQL warehouse queries
- [ ] Use `catalogs`, `schemas`, `tables` APIs for Unity Catalog metadata management
- [ ] Use `dbutils.secrets` from notebooks or SDK `secrets` API for credential management
- [ ] Use `statements` API for running SQL on SQL warehouses with `wait_for_completion()`

---

## When to Use

Use this skill when:

- Automating Databricks job creation, scheduling, and monitoring
- Managing Databricks clusters or SQL warehouses programmatically
- Building data pipelines that interact with the Unity Catalog lineage
- Implementing CI/CD for Databricks notebooks and workflows
- Managing MLflow experiments, runs, and model registry from Python
- Interacting with Delta Lake tables through the Databricks SDK
- Managing secrets, scopes, and permissions across workspaces

---

## When NOT to Use

- For one-off Databricks CLI operations (use `databricks` CLI directly)
- For Spark DataFrame transformations (use PySpark directly within notebooks/clusters)
- When Terraform/Pulumi is better for infrastructure-as-code for workspace resources
- For non-Databricks Spark clusters (use the Spark or PySpark SDK instead)

---

## Core Workflow

### 1. Authenticate and Create Clients

```python
from databricks.sdk import WorkspaceClient, AccountClient
from databricks.sdk.errors import (
    PermissionDenied,
    InvalidParameterValue,
    ResourceConflict,
    NotFound,
)
import os

# Option A: Environment variables (recommended for CI/CD)
workspace_client = WorkspaceClient(
    host=os.environ["DATABRICKS_HOST"],
    token=os.environ["DATABRICKS_TOKEN"],
)

# Option B: Auto-detection (~/.databrickscfg profile)
workspace_client = WorkspaceClient(profile="DEFAULT")

# Option C: Azure service principal
workspace_client = WorkspaceClient(
    host=os.environ["DATABRICKS_HOST"],
    azure_client_id=os.environ["AZURE_CLIENT_ID"],
    azure_client_secret=os.environ["AZURE_CLIENT_SECRET"],
    azure_tenant_id=os.environ["AZURE_TENANT_ID"],
)
```

**Checkpoint:** Verify connectivity with `workspace_client.current_user.me()`. Catch `PermissionDenied` early — it indicates invalid credentials or insufficient permissions.

### 2. Create and Run a Job

```python
from databricks.sdk.service import jobs
from datetime import timedelta

def submit_notebook_job(
    workspace_client: WorkspaceClient,
    notebook_path: str,
    cluster_id: str,
    parameters: dict[str, str] | None = None,
) -> int:
    """Submit a one-off notebook job and return the run ID."""
    task = jobs.SubmitTask(
        task_key="my_task",
        existing_cluster_id=cluster_id,
        notebook_task=jobs.NotebookTask(
            notebook_path=notebook_path,
            base_parameters=parameters or {},
        ),
    )
    submitted = workspace_client.jobs.submit(
        tasks=[task],
        timeout=timedelta(hours=1).seconds,
    )
    run_id = submitted.run_id

    # Wait for completion (non-blocking alternative: poll manually)
    result = workspace_client.jobs.wait_get_run(run_id, timeout=timedelta(hours=2))
    state = result.state
    if state.result_state != jobs.RunResultState.SUCCESS:
        raise RuntimeError(
            f"Job run {run_id} failed: {state.state_message}"
        )
    return run_id
```

**Checkpoint:** Use `wait_get_run()` for blocking waits in scripts. For web services, poll asynchronously with `jobs.get_run()`. Always check `result_state` after completion.

### 3. Execute SQL on a SQL Warehouse

```python
from databricks.sdk.service.sql import StatementStatus

def execute_sql_query(
    workspace_client: WorkspaceClient,
    warehouse_id: str,
    sql: str,
    catalog: str = "main",
    schema: str = "default",
    timeout_seconds: int = 120,
) -> list[dict]:
    """Execute a SQL query on a Databricks SQL warehouse and fetch results."""
    response = workspace_client.statement_execution.execute_statement(
        statement=sql,
        warehouse_id=warehouse_id,
        catalog=catalog,
        schema=schema,
        wait_timeout=f"{timeout_seconds}s",
    )

    # Poll if execution exceeds wait timeout
    statement_id = response.statement_id
    while response.status.state not in (
        StatementStatus.SUCCEEDED,
        StatementStatus.FAILED,
        StatementStatus.CANCELED,
    ):
        import time
        time.sleep(1)
        response = workspace_client.statement_execution.get_statement(statement_id)

    if response.status.state == StatementStatus.FAILED:
        raise RuntimeError(f"Query failed: {response.status.error}")

    # Parse results
    if not response.manifest or not response.result:
        return []

    columns = [col.name for col in response.manifest.schema.columns]
    rows = []
    for row in response.result.data_array or []:
        rows.append(dict(zip(columns, [c.value if hasattr(c, 'value') else c for c in row])))
    return rows
```

**Checkpoint:** SQL warehouses must be in RUNNING state before executing queries. Use `warehouses.get()` to verify state. Handle `StatementStatus.FAILED` with the error message.

### 4. Unity Catalog Metadata Operations

```python
def list_tables_in_schema(
    workspace_client: WorkspaceClient,
    catalog_name: str = "main",
    schema_name: str = "default",
) -> list[dict]:
    """List all tables in a Unity Catalog schema with metadata."""
    tables = []
    for table in workspace_client.tables.list(
        catalog_name=catalog_name,
        schema_name=schema_name,
        max_results=100,
    ):
        tables.append({
            "name": table.name,
            "full_name": table.full_name,
            "table_type": table.table_type,  # MANAGED, EXTERNAL, VIEW
            "data_source_format": table.data_source_format,
            "owner": table.owner,
            "created_at": table.created_at,
        })
    return tables
```

**Checkpoint:** Unity Catalog permissions control what tables are visible. Handle `PermissionDenied` gracefully — the user may not have access to all catalogs/schemas.

---

## Implementation Patterns

### Pattern 1: Cluster Management

```python
def find_or_create_cluster(
    workspace_client: WorkspaceClient,
    cluster_name: str,
    spark_version: str = "15.4.x-scala2.12",
    node_type_id: str = "i3.xlarge",
    autoscale_min: int = 2,
    autoscale_max: int = 8,
) -> str:
    """Find a cluster by name or create a new one. Returns cluster ID."""
    for cluster in workspace_client.clusters.list():
        if cluster.cluster_name == cluster_name and cluster.state != "TERMINATED":
            return cluster.cluster_id

    created = workspace_client.clusters.create(
        cluster_name=cluster_name,
        spark_version=spark_version,
        node_type_id=node_type_id,
        autoscale=jobs.AutoScale(min_workers=autoscale_min, max_workers=autoscale_max),
    )
    return created.cluster_id
```

### Pattern 2: Secrets Management

```python
def set_and_get_secret(
    workspace_client: WorkspaceClient,
    scope: str,
    key: str,
    value: str | None = None,
) -> str | None:
    """Create or update a secret, then retrieve its value."""
    # Create scope if it doesn't exist
    try:
        workspace_client.secrets.create_scope(scope)
    except ResourceConflict:
        pass  # Scope already exists

    if value is not None:
        workspace_client.secrets.put_secret(scope=scope, key=key, string_value=value)

    # Retrieve secret value
    secret = workspace_client.secrets.get_secret(scope=scope, key=key)
    return secret.value if secret else None
```

### Pattern 3: Delta Table Operations via SQL

```python
def optimize_and_vacuum(
    workspace_client: WorkspaceClient,
    warehouse_id: str,
    table_name: str,
    retention_hours: int = 168,
) -> dict:
    """Run OPTIMIZE and VACUUM on a Delta table via SQL warehouse."""
    results = {}
    for cmd in [
        f"OPTIMIZE {table_name}",
        f"VACUUM {table_name} RETAIN {retention_hours} HOURS",
    ]:
        results[cmd] = execute_sql_query(workspace_client, warehouse_id, cmd)
    return results
```

### BAD vs GOOD: Authentication Pattern

```python
# ❌ BAD — Hardcoded credentials in source code
client_bad = WorkspaceClient(host="https://dbc-abc123.cloud.databricks.com", token="dapi123...")

# ✅ GOOD — Environment variables or .databrickscfg
client_good = WorkspaceClient(
    host=os.environ["DATABRICKS_HOST"],
    token=os.environ["DATABRICKS_TOKEN"],
)
```

### BAD vs GOOD: Job Submission

```python
# ❌ BAD — Fire-and-forget without monitoring
def submit_bad(client, path):
    client.jobs.submit(tasks=[jobs.SubmitTask(
        task_key="t1",
        existing_cluster_id="c1",
        notebook_task=jobs.NotebookTask(notebook_path=path),
    )])

# ✅ GOOD — Wait for completion and check result state
def submit_good(client: WorkspaceClient, path: str, cluster_id: str) -> int:
    run = client.jobs.submit(tasks=[jobs.SubmitTask(
        task_key="t1",
        existing_cluster_id=cluster_id,
        notebook_task=jobs.NotebookTask(notebook_path=path),
    )])
    result = client.jobs.wait_get_run(run.run_id, timeout=timedelta(hours=1))
    if result.state.result_state != jobs.RunResultState.SUCCESS:
        raise RuntimeError(f"Job failed: {result.state.state_message}")
    return run.run_id
```

---

## Constraints

### MUST DO
- Use environment variables or `.databrickscfg` for authentication — never hardcode tokens
- Always wait for and verify job completion state — fire-and-forget loses failure visibility
- Use `AutoScale` for clusters to optimize cost/performance
- Handle `PermissionDenied`, `NotFound`, and `ResourceConflict` exceptions explicitly
- Use SQL warehouses for SQL queries and clusters for Spark workloads
- Pin `databricks-sdk` version in requirements (beta SDK has breaking changes)

### MUST NOT DO
- Never hardcode Databricks tokens, host URLs, or connection strings
- Do not poll for job completion with sleep loops — use `wait_get_run()` with timeout
- Avoid creating clusters for every job — use job clusters or existing all-purpose clusters
- Never use `AccountClient` when `WorkspaceClient` suffices (extra permissions needed)
- Do not ignore `PermissionDenied` errors — they indicate real misconfiguration

---

## Output Template

When writing Databricks SDK integration code, structure your output as:

1. **Client Initialization** — WorkspaceClient with auth method (token, OAuth, Azure SP)
2. **Resource Selection** — Cluster ID, SQL warehouse ID, or job ID
3. **Operation** — Specific API call (submit job, execute SQL, list tables)
4. **Polling/Waiting** — wait_get_run() or get_statement() for async operations
5. **Result Processing** — Parse response, handle errors, extract data

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-snowflake-sdk` | Snowflake data warehouse SDK (alternative platform) |
| `coding-bigquery-sdk` | BigQuery serverless warehouse patterns |
| `coding-postgresql-sdk` | Traditional RDBMS patterns for comparison |

---

## Live References

- [Databricks SDK for Python Docs](https://databricks-sdk-py.readthedocs.io/en/latest/) — Official SDK documentation
- [Databricks Python SDK GitHub](https://github.com/databricks/databricks-sdk-py) — Source code, issues, and examples
- [Databricks Jobs API](https://docs.databricks.com/api/workspace/jobs) — Jobs and run management API
- [Databricks SQL Warehouse API](https://docs.databricks.com/api/workspace/statementexecution) — Statement execution on warehouses
- [Unity Catalog API](https://docs.databricks.com/api/workspace/catalogs) — Catalog, schema, and table management
- [Databricks Authentication Guide](https://docs.databricks.com/en/dev-tools/auth.html) — OAuth, PAT, and Azure SP auth
- [Databricks Secrets API](https://docs.databricks.com/api/workspace/secrets) — Secret scope and secret management
