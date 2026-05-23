---
name: integration-patterns
description: Implements service-to-service integration patterns (adapter, API gateway,
  saga, circuit breaker, event-driven) for connecting distributed systems and legacy
  services with resilience.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: integration patterns, service integration, adapter pattern, saga pattern,
    circuit breaker, API gateway, messaging, event-driven, system communication, how
    do i connect systems
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
  - examples
  - config
  - do-dont
  related-skills: anti-corruption-layer, event-driven-patterns, rest-api-patterns,
    microservice-resilience-patterns
------

# Integration Patterns

Implements proven integration patterns to connect distributed services, legacy systems, and external APIs reliably. Covers synchronous (REST, gRPC), asynchronous (messaging, events), and orchestration (saga, choreography) styles with built-in resilience through circuit breakers, retries, and idempotency.

## TL;DR Checklist

- [ ] Choose integration style matching system requirements (sync vs async, fire-and-forget vs guaranteed delivery)
- [ ] Apply adapter pattern when wrapping incompatible interfaces or legacy systems
- [ ] Implement saga for distributed transactions spanning multiple services
- [ ] Add circuit breaker to all external service calls with configurable thresholds
- [ ] Ensure idempotency keys on all operations that may be retried
- [ ] Configure dead-letter queues for failed message processing

