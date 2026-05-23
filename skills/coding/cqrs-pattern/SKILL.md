---
name: cqrs-pattern
description: Separates command (write) model from query (read) model using mediator
  pipelines, outbox pattern for reliable event publishing, and idempotent command
  handlers for systems with asymmetric read/write workloads.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: cqrs, command query responsibility segregation, mediator pattern, outbox
    pattern, idempotent commands, saga pattern, read write separation, event bus
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
  related-skills: event-sourcing, saga-pattern, idempotency-patterns
------

# Command Query Responsibility Segregation (CQRS)

Implements CQRS to separate command (write) model from query (read) model, enabling independent scaling, different consistency models, and clean domain boundaries. Uses mediator pipelines for cross-cutting concerns, the outbox pattern for reliable event publishing, and idempotent command handling for at-least-once delivery guarantees.

## TL;DR Checklist

- [ ] Separate command handlers (write) from query handlers (read) into distinct modules
- [ ] Route commands through a mediator pipeline with logging, tracing, and idempotency interceptors
- [ ] Use the outbox pattern to atomically persist events in the same DB transaction as aggregate state changes
- [ ] Implement idempotent command handlers using UUID-based idempotency keys (Redis-backed with Lua atomicity)
- [ ] Document consistency guarantees explicitly for each read model (strong, eventual, highly eventual)
- [ ] Set up saga orchestration for multi-step business processes spanning multiple aggregates

