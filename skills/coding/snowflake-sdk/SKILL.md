---
name: snowflake-sdk
description: Integrates Snowflake using snowflake-connector-python 4.x with patterns
  for SQL execution, Snowpark DataFrames, Cortex AI, streams, tasks, stages, and warehouse
  management.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: snowflake, snowflake connector, snowpark, snowflake sql, snowflake cortex,
    how do i query snowflake from python, data warehouse, snowpipe
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
  related-skills: coding-databricks-sdk, coding-bigquery-sdk, coding-postgresql-sdk
------

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

