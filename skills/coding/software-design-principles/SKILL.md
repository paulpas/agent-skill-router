---
name: software-design-principles
description: Implements core software design principles (SOLID, DRY, KISS, dependency
  injection) to create maintainable, scalable, and modular codebases.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: software design principles, SOLID, DRY, KISS, dependency injection, clean
    architecture, modular design
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
  related-skills: refactoring, test-driven-development, code-review
------

# Software Design Principles

Applies foundational software design principles to guide architecture decisions, enforce maintainable structure, and prevent technical debt. This skill makes the model evaluate existing code and design new systems against established engineering standards, ensuring every module, class, and function follows SOLID, DRY, and KISS rules with practical dependency injection patterns.

## TL;DR for Code Generation

- [ ] Every class or module must have exactly one reason to change — if two unrelated features require edits in the same file, split it
- [ ] Depend on abstractions (Protocols, ABCs, traits) not concrete classes — inject interfaces via constructors
- [ ] Eliminate duplication by extracting shared logic into a single source of truth with explicit, typed function signatures
- [ ] Prefer composition over inheritance — keep inheritance depth at 2 levels or less, use strategy injection for behavior variation
- [ ] Resist premature abstraction — only introduce factories, decorators, or generic wrappers when a second concrete implementation actually exists

