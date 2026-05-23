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

