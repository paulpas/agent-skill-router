---
name: ddd-refactoring
description: Refactors monolithic codebases toward DDD — extracts bounded contexts,
  splits god objects into aggregates, replaces primitive obsession with value objects,
  and creates anticorruption layers.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: ddd refactoring, extract bounded context, split aggregate, god object
    refactor, primitive obsession, anticorruption layer, how do i move to ddd, legacy
    code to ddd
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
  related-skills: domain-driven-design, ddd-context-mapping, ddd-tactical-patterns
------

# DDD Refactoring Patterns

Refactors existing non-DDD codebases toward proper Domain-Driven Design by extracting bounded contexts from monoliths, splitting god objects into focused aggregates, introducing value objects to replace primitive obsession, and creating anticorruption layers around legacy integrations. Provides step-by-step migration patterns for controller/service layers into domain models with working before/after code examples.

## TL;DR Checklist

- [ ] Identify bounded context boundaries by analyzing existing module responsibilities, not class names
- [ ] Extract one bounded context at a time — do not refactor everything simultaneously
- [ ] Split god objects by grouping methods that operate on the same data into separate aggregates
- [ ] Replace string/integer type parameters with typed value objects (Email, Money, OrderId)
- [ ] Create an Anticorruption Layer for every external or legacy system dependency
- [ ] Write domain tests for extracted aggregates before refactoring the next context

