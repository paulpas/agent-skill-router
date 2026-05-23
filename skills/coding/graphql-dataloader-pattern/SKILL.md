---
name: graphql-dataloader-pattern
description: Implements the DataLoader batching and caching pattern to solve GraphQL
  N+1 query problems with per-request loader instances, batch functions, and memoization
  for efficient data access.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: dataloader, graphql n-plus-one, batch loading, aiodataloader, graphql
    performance, load per request, graphql batching
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
  related-skills: graphql-schema-design, graphql-error-handling-validation
------

# DataLoader Batching Pattern

Implements the DataLoader pattern to solve GraphQL N+1 query problems by batching and caching data fetches per request. Creates request-scoped loader instances with typed batch functions, memoization across resolver calls, and explicit cache invalidation via `.prime()` and `.clear()` after mutations.

## TL;DR Checklist

- [ ] Every DataLoader is instantiated fresh at the start of each HTTP request — never shared as a global singleton
- [ ] Batch functions accept a list of keys and return results in the exact same order (index-aligned list)
- [ ] Missing keys resolve to `None` (cached) to prevent repeated cache misses from causing repeated failures
- [ ] Use `.prime(key, value)` after mutations to update the loader cache within the same request lifecycle
- [ ] Use `.clear(key)` after mutations to evict stale cached values when mutation effects may affect downstream queries
- [ ] Wrap batch function execution in try/catch and return `None` for individual missing keys without crashing the entire batch
- [ ] Profile with `EXPLAIN ANALYZE` to verify batched queries reduce database round-trips, not just client-side latency

