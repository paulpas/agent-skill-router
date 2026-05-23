---
name: domain-architecture-project-structure
description: Defines project directory layouts and module organization for domain-driven
  systems — vertical slice architecture, modular monolith structure, layer separation
  within modules, and build configuration for maintainable DDD codebases.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: project structure, module organization, vertical slice, modular monolith,
    DDD layout, how do i organize a ddd project, domain driven architecture, clean
    directory structure, layer separation
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
  related-skills: domain-driven-design, hexagonal-architecture, ports-patterns, monolith-architecture
------

# Domain Architecture and Project Structure

Acts as a senior software architect designing directory layouts, module boundaries, and project organization for domain-driven systems. When loaded, the model selects an appropriate project structure pattern (vertical slice, modular monolith with horizontal layers, or feature-oriented), defines bounded-context module boundaries, configures build-system dependency validation, and produces concrete directory trees and composition root code that enforce inward dependency flow.

## TL;DR Checklist

- [ ] Choose vertical slice architecture for small-to-medium teams (≤8 developers); choose modular monolith with horizontal layers for larger organizations or established DDD teams
- [ ] Define each bounded context as a top-level directory under `contexts/` (vertical slice) or `domain/` (modular monolith) — never mix contexts within a single module
- [ ] Within each module, separate domain, application, and infrastructure concerns using consistent subdirectories (`domain/`, `application/`, `infrastructure/`) or inline them if the module is small
- [ ] Create a single composition root at project root that wires all modules together without circular imports
- [ ] Configure import linting (`.isort.cfg` or `pyproject.toml` dependency rules) to enforce architectural boundaries — domain code must never import application or infrastructure
- [ ] Place shared value objects and base entities in `shared/domain/` when they are genuinely reusable across bounded contexts; avoid premature sharing

