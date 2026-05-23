---
name: design-pattern-selection
description: Evaluates software problems against the GoF pattern catalog to select
  optimal design patterns based on structural requirements, complexity constraints,
  and runtime performance characteristics.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: design pattern, GoF pattern, factory method, strategy pattern, decorator
    pattern, observer pattern, how do i choose a pattern, structural pattern
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
  - examples
  - do-dont
  related-skills: modular-design, refactoring-techniques, dependency-inversion-principle
------

# Design Pattern Selection Guide

Selects optimal design patterns for code-level problems by analyzing structural requirements, evaluating trade-offs between complexity and flexibility, and implementing solutions with idiomatic Go. This skill makes the model classify problems against the Gang of Four (GoF) pattern catalog — Creational, Structural, or Behavioral — then produce concrete implementations that respect SOLID principles, avoid premature abstraction, and align with Go effective_go conventions.

## TL;DR Checklist

- [ ] Classify problem into exactly one GoF family: Creational (object creation), Structural (object composition), Behavioral (object interaction)
- [ ] Identify what changes independently in your system — that is the seam where a pattern belongs
- [ ] Evaluate trade-offs: complexity gain vs. runtime overhead for each candidate pattern
- [ ] Prefer composition and interfaces over inheritance; use struct embedding only for augmentation
- [ ] Verify selection does not violate SOLID principles, especially LSP and Open/Closed
- [ ] Implement with real Go idioms: interface{} contracts, explicit error handling, context propagation

