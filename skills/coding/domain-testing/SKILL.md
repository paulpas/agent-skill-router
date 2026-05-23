---
name: domain-testing
description: Verifies DDD domain model correctness through invariant testing of aggregates
  and value objects, specification candidate tests, test double strategies, and domain
  event publishing assertions.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: domain testing, aggregate testing, value object tests, specification patterns,
    ddd unit tests, invariant verification, how do i test domain models, domain layer
    testing
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
  related-skills: domain-driven-design, ddd-tactical-patterns, domain-events
------

# Domain Testing Strategies

Tests DDD domain models to verify invariants hold at construction time, aggregates enforce consistency boundaries, specifications correctly classify candidates, and domain events fire predictably after state transitions. Produces unit tests for value objects, entities, aggregate roots, and domain services with concrete assertion strategies for each pattern.

## TL;DR Checklist

- [ ] Test every value object constructor — valid inputs pass, invalid inputs raise
- [ ] Test aggregate root as a single unit — never test internal entities in isolation
- [ ] For each specification: write one passing candidate test and one failing candidate test
- [ ] Verify domain events are published after mutation, not before, with correct payload data
- [ ] Use stubs for read-only dependencies (repositories returning fixed aggregates), mocks only for side-effect producers (publishers, notification senders)
- [ ] Test invariants at construction time — never test objects that violate invariants because they cannot exist

