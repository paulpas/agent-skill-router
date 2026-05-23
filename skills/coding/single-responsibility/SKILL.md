---
name: single-responsibility
description: Detects and refactors classes that violate the Single Responsibility
  Principle by splitting multi-purpose modules into focused components with clear
  responsibility boundaries.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: single responsibility principle, SRP, god class, split class, cohesion,
    high coupling, module boundary, one reason to change, separation of concerns
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
  related-skills: open-closed-principle, liskov-substitution-principle, interface-segregation-principle,
    dependency-inversion-principle, refactoring-techniques
------

# Single Responsibility Principle (SRP)

Acts as a senior software architect applying the Single Responsibility Principle to decompose bloated classes and modules into focused, cohesive units. Detects violations through concrete code smells — God classes, mixed concerns, high cyclomatic complexity — then refactors each into separate components with explicit responsibility boundaries.

## TL;DR Checklist

- [ ] Measure class size (> 200 lines is a strong SRP violation signal)
- [ ] Count public methods and verify none share a different business reason to change
- [ ] Identify every distinct concern in the class (data access, validation, formatting, external calls)
- [ ] Extract each concern into its own class with a descriptive name
- [ ] Wire dependencies through constructor injection — never module-level globals
- [ ] Verify cross-responsibility coupling is eliminated after extraction
- [ ] Run all existing tests to confirm behavior preservation

