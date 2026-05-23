---
name: postgresql-sdk
description: Integrates PostgreSQL databases using psycopg2 2.9.x and asyncpg 0.31.x
  with patterns for connection pooling, replication, COPY, and query parameterization.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
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
------

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

