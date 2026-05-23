---
name: hexagonal-architecture
description: Implements hexagonal (ports and adapters) architecture to isolate core
  business logic from external frameworks, databases, and UI for testable, framework-agnostic
  systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: hexagonal architecture, ports and adapters, clean architecture, dependency
    inversion, core business logic, how do i decouple my code, separate business logic
    from framework
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
  related-skills: test-driven-development, event-driven-architecture
------

# Hexagonal Architecture Implementation Guide

Acts as a senior software architect designing framework-agnostic core domains using ports and adapters. Ensures business rules remain independent of external concerns like databases, UIs, or cloud APIs by strictly enforcing the Dependency Inversion Principle (DIP).

## TL;DR Checklist

- [ ] Define primary (driven) and secondary (driving) ports as pure interfaces/abstract classes
- [ ] Implement core domain logic using only port interfaces, never concrete adapters
- [ ] Build adapter implementations that translate external data into core domain models
- [ ] Wire adapters to ports at the composition root (main/bootstrap entry point)
- [ ] Verify zero direct dependencies from core → infrastructure/framework packages in `pyproject.toml` or import paths

