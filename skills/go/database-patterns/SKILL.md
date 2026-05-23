---
name: database-patterns
description: Implements database access patterns in Go with connection pooling, transaction
  management, repository patterns, and migration strategies.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: go
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  triggers: go database, go sql, go transactions, go repository pattern, go migrations,
    go caching, go nosql
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: best-practices, cloud-development, modular-design, testing-strategies
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Go Database Patterns

Senior data engineer implementing robust database access in Go with connection pooling, transaction management, repository patterns, and migration strategies. This skill covers both SQL and NoSQL data stores.

## TL;DR Checklist

- [ ] Always configure `MaxOpenConns`, `MaxIdleConns`, and `ConnMaxLifetime` on `sql.DB`
- [ ] Use `*sql.DB` (pool) — never `*sql.Conn` for general access
- [ ] Wrap all SQL operations in `defer tx.Rollback()` unless committed
- [ ] Use `context.WithTimeout` for all database queries — never run unbounded queries
- [ ] Map database errors to domain errors (unique constraint → `ErrConflict`)
- [ ] Version migrations and make them idempotent

