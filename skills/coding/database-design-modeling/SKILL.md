---
name: database-design-modeling
description: Designs relational database schemas with proper normalization, indexing
  strategies, versioned migrations, and constraint enforcement for scalable application
  backends.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: database design, schema design, data modeling, sql migrations, indexing
    strategy, database normalization, foreign keys, entity relationship
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
  related-skills: backend-dev-guidelines, api-design-principles, domain-driven-design
------

# Database Design & Modeling for Production Systems

Designs relational database schemas with proper normalization, indexing strategies, versioned migrations, and constraint enforcement. When this skill is loaded, the model produces concrete SQL DDL, migration files, and Python data access patterns — not generic "normalize your tables" advice.

## TL;DR Checklist

- [ ] All tables use `BIGINT UNSIGNED` auto-increment primary keys or UUIDs with a natural key
- [ ] Every foreign key has an explicit `ON DELETE` action (CASCADE, SET NULL, RESTRICT) — never left implicit
- [ ] Tables are normalized to at least 3NF — no repeating groups, no transitive dependencies
- [ ] Composite indexes match query filter order: most selective column first
- [ ] Migration files follow versioned naming with `up` and `down` operations defined for every change
- [ ] Every table has `created_at` and `updated_at` timestamp columns with defaults

