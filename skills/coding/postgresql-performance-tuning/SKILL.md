---
name: postgresql-performance-tuning
description: Diagnoses and optimizes PostgreSQL performance through execution plan
  analysis, index strategies, configuration tuning, autovacuum management, partitioning,
  and monitoring with pg_stat_statements.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: postgresql performance tuning, psql query optimization, index strategy,
    slow queries, pgbouncer, autovacuum tuning, pg_stat_statements, how do i make
    postgresql faster
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
  - config
  - do-dont
  - examples
  related-skills: coding-database-design-modeling, coding-caching-strategies, coding-performance-optimization
------

# PostgreSQL Performance Tuning

Diagnoses and optimizes PostgreSQL performance across execution plans, indexes, server configuration, connection pooling, vacuum strategy, query patterns, partitioning, and production monitoring. This skill turns raw EXPLAIN ANALYZE output, pg_stat_statements data, and table statistics into actionable optimization decisions for production databases running PostgreSQL 12 through 17.

## TL;DR Checklist

- [ ] Run `EXPLAIN (ANALYZE, BUFFERS)` on every slow query before proposing changes
- [ ] Check buffer cache hit ratio — target >0.99 for OLTP, >0.95 for analytics
- [ ] Verify autovacuum is keeping up: dead_tuple / live_tuple < 20%
- [ ] Ensure `shared_buffers` is 15–25% of total RAM, `effective_cache_size` at 50–75%
- [ ] Deploy PgBouncer in transaction pooling mode for any app with >50 concurrent connections
- [ ] Validate index type matches query pattern: B-tree (default), GIN (JSONB/full-text), GiST (range/spatial), BRIN (time-series)
- [ ] Review composite index column order: equality columns before range columns

