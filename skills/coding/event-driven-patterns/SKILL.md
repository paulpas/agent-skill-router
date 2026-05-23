---
name: event-driven-patterns
description: Implements event-driven architecture patterns (pub/sub, event sourcing,
  CQRS, saga orchestration, outbox pattern) for building decoupled, scalable systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: event-driven, event driven architecture, pub/sub, event sourcing, CQRS,
    saga pattern, outbox pattern, message queue, eventual consistency
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
  related-skills: microservices-patterns, architecture-decision-records, domain-driven-design,
    test-driven-development
------

# Event-Driven Architecture Patterns

Implements event-driven design patterns to build decoupled, resilient, and scalable systems. Covers the core EDA patterns — pub/sub, event sourcing, CQRS, saga orchestration, outbox pattern, and event versioning — with practical implementations and anti-patterns to avoid.

## TL;DR Checklist

- [ ] Choose the right EDA pattern for the coupling and consistency requirements
- [ ] Define typed event schemas before implementing any handlers
- [ ] Use an EventBus or message broker for inter-component communication (never direct calls between domain components)
- [ ] Make events immutable after creation — frozen dataclasses or equivalent
- [ ] Implement dead letter queues for failed event processing
- [ ] Version all event schemas and support backward-compatible evolution

