---
name: domain-events
description: Implements domain events for decoupled communication between aggregates
  and bounded contexts — event definition, publishing, handling, idempotency, and
  lifecycle management with typed Python implementations.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: domain events, domain event, event publishing, event handler, event dispatcher,
    in-process event bus, how do i decouple aggregates, idempotent event handling
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
  related-skills: domain-driven-design, event-sourcing-pattern, event-driven-architecture
------

# Domain Events

Implements domain events as a tactical DDD pattern for decoupled communication between aggregates, bounded contexts, and application services. Produces immutable past-tense event definitions, typed event registries, in-process dispatchers with error handling strategies, and idempotent handlers that safely process duplicate deliveries without side effects.

## TL;DR Checklist

- [ ] Define events as frozen dataclasses with NounVerbPastTense naming (e.g., `OrderCreated`, not `OrderCreate`)
- [ ] Include required metadata on every event: `occurred_at`, `aggregate_id`, and optionally `correlation_id` / `causation_id`
- [ ] Publish events AFTER mutating state — never before, never in a separate pre-flight check
- [ ] Ensure the publisher has zero knowledge of who subscribes to its events (Open/Closed Principle)
- [ ] Make every event handler idempotent: processing the same event twice must yield the same observable result
- [ ] Decide error strategy upfront — fail-fast (rollback everything) or continue (log and compensate later)
- [ ] Use the Outbox pattern for cross-context events to guarantee delivery

