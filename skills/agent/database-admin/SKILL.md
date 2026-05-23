---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements database administration best practices (PostgreSQL tuning,
  MySQL replication, MongoDB sharding, Redis optimization) with real operational commands
  and query analysis patterns.
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: code
  related-skills: cncf-azure-managed-database, cncf-postgresql
  role: implementation
  scope: infrastructure
  triggers: database administration, postgresql tuning, connection pooling, query
    optimization, vacuuming, mysql replication, mongodb sharding, redis memory
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
name: database-admin
------
# Database Administration

Implements comprehensive database administration practices across PostgreSQL, MySQL, MongoDB, and Redis with real operational commands, performance optimization patterns, and emergency procedures.

## TL;DR Checklist

- [ ] Run EXPLAIN ANALYZE before executing production queries
- [ ] Check connection pool usage before scaling
- [ ] Verify vacuum progress on large tables
- [ ] Confirm replication lag before failover
- [ ] Monitor Redis memory fragmentation ratio
- [ ] Validate shard balance before adding new shards

