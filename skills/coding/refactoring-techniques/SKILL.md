---
name: refactoring-techniques
description: Applies systematic refactoring techniques (extract method, introduce
  parameter object, replace conditional with polymorphism) to improve code readability
  and reduce complexity.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: refactoring, clean up code, reduce complexity, extract method, rename
    variable, improve readability, how do i refactor legacy code, technical debt,
    code smell
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
  related-skills: test-driven-development, software-testing-strategy, dry-principles
------

# Refactoring Techniques

Applies systematic refactoring transformations to improve code readability and reduce complexity without changing external behavior. Models this skill as a senior engineer who identifies code smells using concrete detection criteria, then applies small incremental transformations — each verified by tests — to guide legacy code toward clean architecture following SOLID and DRY principles.

## TL;DR Checklist

- [ ] Identify the specific code smell before choosing any refactoring technique
- [ ] Verify green tests exist before making any structural change — no safety net means no refactor
- [ ] Apply only one refactoring at a time, then commit after each verified change
- [ ] Never mix refactoring with feature work in the same commit or pull request
- [ ] Prefer Extract Method for long functions over inline parameter gymnastics
- [ ] Replace magic numbers and strings with named constants before extracting methods
- [ ] Verify behavior is unchanged by running the full test suite after each transformation

