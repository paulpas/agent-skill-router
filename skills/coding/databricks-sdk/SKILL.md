---
name: databricks-sdk
description: Integrates Databricks using databricks-sdk with patterns for job orchestration,
  cluster management, SQL warehouses, Unity Catalog, MLflow, and Delta Lake operations.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
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
------

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

