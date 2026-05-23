---
name: graphql-schema-design
description: Implements GraphQL schema design with SDL-first types, input objects,
  interfaces, unions, custom scalars, and deprecation directives for type-safe API
  contracts in Python and Strawberry.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: graphql schema design, SDL, type system, strawberry-graphql, interface,
    union type, graphql-input-object, graphql-deprecation
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
  related-skills: graphql-dataloader-pattern, graphql-error-handling-validation
------

# GraphQL Schema Design

Implements production-grade GraphQL schema design patterns using the Strawberry Python framework. Models domain entities as SDL-first type systems with proper input objects, interfaces, unions, custom scalars, and deprecation directives to create type-safe, maintainable API contracts.

## TL;DR Checklist

- [ ] Define every entity as a `@strawberry.type` or `@strawberry.input` dataclass with explicit field types (no bare `Any`)
- [ ] Use `@strawberry.interface` for shared field contracts across concrete types, not unions
- [ ] Group mutation arguments into dedicated `@strawberry.input` objects — never spread scalar args on the root mutation
- [ ] Implement opaque global IDs via base64-encoded `"ModelType:123"` format instead of exposing raw database keys
- [ ] Create custom scalar classes for domain concepts (Email, URL, CurrencyAmount, DateTime) rather than using `str` or `float`
- [ ] Add docstrings to every type and field — they feed into schema introspection and auto-generated API docs
- [ ] Apply `@deprecated(reason="...")` before removing any public field; never remove without a deprecation period

