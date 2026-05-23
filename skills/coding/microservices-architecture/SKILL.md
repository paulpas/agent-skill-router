---
name: microservices-architecture
description: Implements microservices architecture patterns (bounded contexts, API
  gateway, event-driven communication, saga orchestration) for decomposing monolithic
  applications into scalable, independent services.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: microservices architecture, service decomposition, bounded context, how
    do i split a monolith, inter-service communication, event-driven messaging, API
    gateway, saga pattern
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
  related-skills: coding-monolith-refactoring, coding-domain-driven-design, cncf-kubernetes-deployment,
    coding-event-driven-architecture
------

# Microservices Architecture Implementation

Senior software architect decomposing monolithic applications into independently deployable microservices using domain-driven design, bounded context mapping, and event-driven communication patterns. Applies SOLID and DRY principles to ensure each service owns a single business capability with clear contractual boundaries.

## TL;DR Checklist

- [ ] Map bounded contexts using event storming or domain story workshops before writing code
- [ ] Define strict API contracts (OpenAPI/schemas) between services — no shared database models
- [ ] Choose sync REST for request-response queries and async events for domain changes
- [ ] Implement circuit breakers and retry policies on every inter-service call
- [ ] Use saga orchestration or choreography for cross-service transactions, never distributed locks

