---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Manages application state across deployment stages including database
  migrations, cache invalidation, and data consistency during rolling updates.
license: MIT
maturity: stable
metadata:
  completeness: 95
  content-types:
  - code
  - guidance
  - config
  - do-dont
  domain: cncf
  exampleCount: 3
  maturity: stable
  output-format: code
  related-skills: deployment-philosophy,blue-green-deployment,rollback-strategy,deployment-orchestration
  role: implementation
  scope: infrastructure
  triggers: state management, database migration, deployment state, data migration,
    cache invalidation, schema migration, data consistency, backward compatible migration
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
name: state-management
------
# State Management

Manages application state — database schemas, cached data, and persisted state — across deployment stages. Ensures data consistency when old and new versions of a service coexist during deployment transitions.

## TL;DR Checklist

- [ ] Design all schema changes to be backward-compatible with both old and new versions
- [ ] Run read migrations before deploying new code (backfill old readers)
- [ ] Deploy new code that reads and writes new format
- [ ] Run write migrations to convert remaining old-format data
- [ ] Remove old code references only after all data is migrated
- [ ] Invalidate caches at the right transition points

