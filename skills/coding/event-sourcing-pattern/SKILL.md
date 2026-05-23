---
name: event-sourcing-pattern
description: Implements event sourcing pattern (event store, aggregate roots, projections,
  snapshots, event replay) to maintain complete audit trail and reconstruct state
  from immutable event history.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: event sourcing, event store, aggregate root, event replay, projections,
    snapshots, how do i track all changes, immutable audit trail, state reconstruction
    from events
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
  related-skills: event-driven-architecture,cqrs-pattern,microservice-resilience-patterns
------

# Event Sourcing Pattern

Implements the event sourcing pattern to maintain a complete, immutable audit trail of all state changes. When loaded, this skill makes the model design aggregate roots that derive state from ordered event streams, implement an event store for persistent storage and replay, build projections for read-optimized views, add snapshots for performance optimization, and construct safe event replay mechanisms for debugging and migration.

## TL;DR Checklist

- [ ] Design aggregates as pure objects with `apply_event` methods — no direct state mutation
- [ ] Store every business-relevant change as an immutable domain event in the event store
- [ ] Reconstruct aggregate state by replaying events from the event store on load
- [ ] Build projections (read models) that derive denormalized views from event streams
- [ ] Add snapshots to skip early events during aggregate reconstruction for performance
- [ ] Implement event replay with version tracking to safely rebuild projections or fix bugs

