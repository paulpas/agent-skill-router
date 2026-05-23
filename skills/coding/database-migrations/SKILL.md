---
name: database-migrations
description: Implements zero-downtime database migration strategies including expand/contract,
  dual-write, and backfill patterns for safe schema evolution across production environments.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: database migrations, schema evolution, zero downtime migrations, database
    deployment, expand contract pattern, dual write migration, database rollback,
    migration strategy, how do i change my database schema safely
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
  related-skills: database-design-modeling, software-delivery-pipelines, secure-release-pipeline
------

# Database Migration Patterns

Implements safe, zero-downtime database migration strategies for evolving production schemas without service interruption or data loss.

## TL;DR Checklist

- [ ] Classify change as additive (safe) or breaking (requires migration strategy)
- [ ] Choose expand/contract pattern for column/table additions with existing data
- [ ] Use dual-write for cross-column or cross-table data synchronization
- [ ] Implement backward-compatible deployments during the overlap period
- [ ] Write idempotent migration scripts that can run multiple times safely
- [ ] Verify rollback path before deploying to production

