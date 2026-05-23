---
name: design-patterns-and-principles
description: Implements and explains GoF design patterns (Factory, Observer, Strategy,
  Decorator, Singleton), SOLID principles, and DRY/YAGNI guidelines to produce maintainable,
  extensible software architecture.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: design patterns, GoF, SOLID, DRY, factory pattern, software architecture,
    refactoring, SOLID principles
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
  related-skills: test-driven-development, code-review, refactoring, modular-design
------

# Design Patterns & Software Architecture Principles

Senior software architect designing maintainable, extensible systems using proven design patterns and principles. Applies GoF patterns, SOLID principles, and DRY/YAGNI guidelines to produce code that is easy to understand, test, and evolve. Evaluates architectural tradeoffs, prevents over-engineering, and selects the simplest pattern that solves the identified problem.

## TL;DR Checklist

- [ ] Identify the core problem and change point before reaching for a pattern
- [ ] Prefer composition over inheritance (SOLID - Open/Closed Principle)
- [ ] Apply Single Responsibility: each class has one reason to change
- [ ] Verify Dependence Inversion: high-level modules depend on abstractions, not concretions
- [ ] Avoid over-engineering — YAGNI means don't add abstractions prematurely
- [ ] Eliminate duplication: DRY means abstract shared behavior, not repeat it
- [ ] Choose the simplest pattern that solves the problem
- [ ] Ensure every pattern has a concrete problem it addresses — no pattern for pattern's sake

