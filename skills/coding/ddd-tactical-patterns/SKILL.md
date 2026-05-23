---
name: ddd-tactical-patterns
description: Implements DDD tactical supporting patterns — composable Specification
  objects for business rules, Domain Services for cross-aggregate coordination, Aggregate
  Factories for complex construction, and Unit of Work for transaction management.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: specification pattern, ddd tactical patterns, domain service, aggregate
    factory, unit of work, repository implementation, how do i implement specifications,
    cross-aggregate operations
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
  related-skills: domain-driven-design, ddd-context-mapping, cqrs-pattern, event-sourcing-pattern
------

# DDD Tactical Supporting Patterns

Implements the supporting structural patterns that make DDD domain models practical and testable. Produces Specification objects for composable business rules, Domain Services for cross-aggregate coordination, Aggregate Factories for complex construction scenarios, and Unit of Work implementations for transaction management — all focused on keeping domain logic cohesive while maintaining clean separation from infrastructure concerns.

This skill covers tactical patterns that support the core DDD building blocks (entities, value objects, aggregates, bounded contexts) documented in `domain-driven-design`. Use this skill when you need composable rule validation, cross-aggregate operations, or transaction coordination.

## TL;DR Checklist

- [ ] Define Specifications as frozen dataclasses with `is_satisfied_by()` methods supporting AND/OR/NOT composition via magic methods
- [ ] Place repository interfaces in the domain layer using Protocol or ABC — never import ORM types into domain code
- [ ] Implement Domain Services only for operations spanning two or more aggregate roots — single-aggregate rules belong in the aggregate itself
- [ ] Create Aggregate Factories when construction requires external lookups, conditional validation, or multi-step setup that exceeds constructor capabilities
- [ ] Use Unit of Work as a context manager to coordinate transactions across multiple repositories within a single use case
- [ ] Separate command handlers (write model) from query handlers (read model) — never let queries mutate state

