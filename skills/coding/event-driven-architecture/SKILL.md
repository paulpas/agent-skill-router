---
name: event-driven-architecture
description: Implements event-driven architecture patterns (pub/sub messaging, message
  queues, saga coordination, dead letter queues, outbox pattern, async processing)
  for building decoupled, scalable distributed systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: event-driven architecture, pub/sub messaging, saga pattern, dead letter
    queue, outbox pattern, how do i decouple services, async message processing, distributed
    messaging
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
  related-skills: microservice-resilience-patterns,event-sourcing-pattern,observability-patterns
------

# Event-Driven Architecture Patterns

Implements production-grade event-driven patterns to build decoupled, scalable distributed systems. When loaded, this skill makes the model design and implement pub/sub messaging, message queue consumers, saga coordination for distributed transactions, dead letter queue handling, the outbox pattern for reliable event delivery, and asynchronous processing pipelines with proper error handling and idempotency guarantees.

## TL;DR Checklist

- [ ] Define event schema using a shared interface with type-safe fields and metadata
- [ ] Implement an event bus that decouples publishers from subscribers
- [ ] Add saga orchestration for multi-step distributed transactions with compensating actions
- [ ] Configure dead letter queues for failed message processing with retry policies
- [ ] Use the outbox pattern to guarantee event delivery alongside database writes
- [ ] Ensure all event handlers are idempotent using idempotency keys
- [ ] Implement async processing with bounded concurrency and backpressure

