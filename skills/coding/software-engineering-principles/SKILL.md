---
name: software-engineering-principles
description: Applies core software engineering principles (modularity, separation
  of concerns, defensive programming, YAGNI) to produce maintainable, robust, and
  scalable code.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: software engineering, modular design, separation of concerns, defensive
    programming, KISS principle, YAGNI, clean architecture
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
  related-skills: coding-code-review, coding-testing, coding-error-handling, coding-refactoring
------

# Software Engineering Principles

Applies foundational engineering principles to guide daily development decisions, ensuring code is modular, maintainable, and resilient. This skill turns abstract best practices into concrete implementation choices.

## TL;DR Checklist

- [ ] Verify each module has a single, well-defined responsibility
- [ ] Confirm separation between data access, business logic, and presentation layers
- [ ] Apply defensive programming: validate all inputs at system boundaries
- [ ] Resist feature creep — ask "do we need this now?" (YAGNI) before adding complexity
- [ ] Prefer simple, readable solutions over clever, compact ones (KISS)
- [ ] Write tests that verify contracts, not implementation details
- [ ] Document the *why*, not the *what*

