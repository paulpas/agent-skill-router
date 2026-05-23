---
name: design-patterns-architecture
description: Implements GoF design patterns and SOLID/DRY/YAGNI principles to architect
  scalable, maintainable, and testable software systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: design patterns, GoF, SOLID, DRY, YAGNI, architecture, creational patterns,
    structural patterns
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
  related-skills: coding/refactoring, coding/code-review, coding/test-driven-development
------

# Architecture & Design Patterns

Senior software architect designing scalable, maintainable systems using GoF design patterns and SOLID/DRY/YAGNI principles. Evaluates architectural tradeoffs, applies the right pattern to the right problem, and enforces composition over inheritance to produce code that is easy to test, extend, and evolve without premature abstraction.

## TL;DR Checklist

- [ ] Identify the specific change point before selecting any pattern — no pattern for pattern's sake
- [ ] Enforce Single Responsibility: each class has exactly one reason to change
- [ ] Apply Open/Closed Principle through interfaces/protocols, not conditional logic
- [ ] Prefer composition (inject dependencies) over inheritance hierarchies
- [ ] Validate against YAGNI: does this abstraction solve a real problem, or is it speculative?

