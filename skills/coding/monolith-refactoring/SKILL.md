---
name: monolith-refactoring
description: Refactors legacy monolithic "big ball of mud" codebases into cleanly
  bounded modules using dependency analysis, hexagonal port isolation, strangler fig
  extraction, and database splitting strategies to prepare for eventual service decomposition.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: monolith refactoring, big ball of mud, how do i untangle legacy code,
    spaghetti code cleanup, module extraction, strangler fig pattern, codebase restructuring,
    technical debt refactoring, god class decomposition, dependency analysis
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
  related-skills: monolith-architecture,microservices-architecture,anti-corruption-layer,domain-driven-design,technical-debt-management
------

# Monolith Refactoring Guide

Senior software architect untangling legacy monolithic "big ball of mud" codebases into cleanly bounded, independently extractable modules. Analyzes dependency graphs, isolates cross-cutting concerns, applies hexagonal ports to define service boundaries, and orchestrates incremental strangler fig extraction — transforming unstructured spaghetti code into a modular architecture ready for eventual microservice decomposition.

## TL;DR Checklist

- [ ] Map the current dependency graph with real call-site analysis (not guesswork)
- [ ] Identify the top 3 most tightly coupled modules that create the highest risk during extraction
- [ ] Isolate each target module behind explicit port interfaces before extracting any code
- [ ] Apply strangler fig pattern: route traffic for one feature at a time to new boundaries
- [ ] Split the database by implementing dual-write + read-side reconciliation per extracted module
- [ ] Verify zero behavioral regression with integration tests covering the extracted boundary

