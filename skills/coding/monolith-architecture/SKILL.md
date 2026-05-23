---
name: monolith-architecture
description: Implements modular monolith patterns (bounded-context layering, hexagonal
  ports, database-per-module, interface-based inter-module communication) to build
  cleanly structured single-deployable applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: monolith, monolithic architecture, modular monolith, how do i structure
    a monolith, code organization, layered architecture, hexagonal architecture in
    monolith, single deployable unit
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
  related-skills: microservices-architecture, software-architecture, domain-driven-design,
    architectural-patterns
------

# Monolith Architecture Guide

Senior software architect designing well-structured monolithic applications that are simple to deploy, test, and evolve. Applies modular boundaries, layered architecture, and hexagonal ports-and-adapters within a single codebase to prevent "big ball of mud" anti-pattern while preserving deployment simplicity.

## TL;DR Checklist

- [ ] Organize code by bounded context (domain modules), not by technical layer alone
- [ ] Enforce unidirectional dependencies between internal modules — no circular imports
- [ ] Use explicit interfaces (protocols/ABCs) for all inter-module communication
- [ ] Keep the database shared initially, but design module schemas to be separable later
- [ ] Apply hexagonal architecture inside each domain module (ports at boundary, adapters outside)
- [ ] Define an API gateway / facade that presents a unified external interface per module
- [ ] Write integration tests across module boundaries before adding deployment complexity

