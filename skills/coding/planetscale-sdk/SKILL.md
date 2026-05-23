---
name: planetscale-sdk
description: Integrates PlanetScale using mysql-connector-python with patterns for
  database branching, deploy requests, schema management, connection pooling, and
  insights for serverless MySQL.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
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
------

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

