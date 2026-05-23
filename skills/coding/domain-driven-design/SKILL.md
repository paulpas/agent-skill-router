---
name: domain-driven-design
description: Implements Domain-Driven Design patterns (aggregates, value objects,
  entities, bounded contexts, domain events) to model complex business logic and align
  software architecture with domain expertise.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: domain driven design, ddd, bounded context, aggregate root, entity, value
    object, strategic design, tactical patterns
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
  related-skills: design-patterns-architecture, software-design-principles, event-driven-architecture
------

# Domain-Driven Design Patterns

Implements tactical and strategic DDD patterns to model complex business domains where software structure must reflect domain expertise. Produces value objects, entities, aggregates, domain events, and bounded context boundaries that enforce invariants at the domain layer.

## TL;DR Checklist

- [ ] Identify bounded contexts by separating ubiquitous language from shared infrastructure concerns
- [ ] Model value objects as immutable types with value-based equality (no identity field)
- [ ] Model entities with stable identity, protected through constructor validation and invariant checks
- [ ] Enforce all business invariants inside aggregate root constructors — never allow invalid state
- [ ] Publish domain events as immutable records after state transitions, not before
- [ ] Keep aggregates small (one primary key per transaction) to avoid distributed consistency problems
- [ ] Separate domain layer from infrastructure — no ORM annotations, no SQL strings in domain models

