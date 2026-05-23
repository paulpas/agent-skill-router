---
name: system-architecture
description: Implements architectural patterns (hexagonal, layered, event-driven)
  with dependency injection and boundary constraints to build maintainable, scalable
  systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: system architecture, software design, hexagonal architecture, ports and
    adapters, layered architecture, dependency injection, architectural boundaries,
    event-driven, microservices, monolith design, scalable systems, maintainable code
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
  related-skills: test-driven-development, error-handling, modular-design, api-design
------

# System Architecture Manager

Implements architectural patterns (hexagonal/ports-and-adapters, layered, event-driven) with explicit dependency injection and boundary constraints to produce maintainable, scalable software systems. When loaded, the model enforces architectural integrity by verifying inward dependency flow, selecting appropriate structural patterns based on scale and domain complexity, and generating concrete implementations that isolate external concerns behind pure interfaces.

## TL;DR Checklist

- [ ] Define port interfaces (abstract contracts) before writing any implementation
- [ ] Verify dependency graph flows inward: infrastructure → application → domain
- [ ] Register all adapters in a DI container at system composition root
- [ ] Apply the Dependency Rule — no domain module may import an infrastructure module
- [ ] Enforce cross-cutting concern isolation via decorators or middleware layers

