---
name: modular-design
description: Designs modular Go applications with clean architecture, dependency injection,
  package boundaries, and interface-based design for maintainable codebases.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: go
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  triggers: go modular, go dependency injection, go clean architecture, go interface,
    go package boundaries, go hexagonal
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: best-practices, cloud-development, database-patterns, advanced-patterns
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Modular Go Design

Senior architect designing clean, modular Go applications using dependency injection, interface boundaries, and clean architecture principles. This skill covers package organization, inversion of control, and scalable codebase structure.

## TL;DR Checklist

- [ ] Business logic is in `domain/` or `internal/` packages — independent of infrastructure
- [ ] Dependencies flow inward — outer layers depend on inner layers via interfaces
- [ ] Dependency injection at the composition root (`main`) — never use `new()` in business logic
- [ ] Each package has a single responsibility and exports only what's needed
- [ ] Interfaces are defined where they are consumed, not where they are implemented
- [ ] No circular imports — if two packages import each other, extract the shared types

