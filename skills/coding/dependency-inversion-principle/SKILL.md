---
name: dependency-inversion-principle
description: Refactors tightly coupled modules depending on concrete classes into
  decoupled designs using dependency injection, Python Protocols, factory registration,
  and inversion containers for testable architecture.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: dependency inversion principle, DIP, dependency injection, inversion of
    control, IoC, loose coupling, high level low level abstraction, constructor injection,
    factory pattern, testable architecture
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
  related-skills: single-responsibility, open-closed-principle, liskov-substitution-principle,
    interface-segregation-principle, hexagonal-architecture
------

# Dependency Inversion Principle (DIP)

Refactors tightly coupled systems where high-level business modules import and instantiate low-level concrete classes into decoupled architectures using dependency injection, Protocol-based abstractions, and factory registration. Ensures high-level policy code depends only on interfaces/protocols, while low-level details (databases, HTTP clients, file systems) implement those contracts — making the direction of dependencies invert from "outward" to "inward."

## TL;DR Checklist

- [ ] Trace all `import` statements in high-level modules — no concrete class references allowed
- [ ] Define a Protocol or ABC for every external dependency the business logic needs
- [ ] Move every `ConcreteClass()` instantiation out of business logic into the composition root
- [ ] Inject dependencies through constructor parameters (never globals, never function defaults)
- [ ] Build a single bootstrap module that wires all concrete implementations together
- [ ] Verify tests can substitute any dependency with a mock without touching business logic

