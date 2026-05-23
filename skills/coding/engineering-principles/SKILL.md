---
name: engineering-principles
description: Enforces core software engineering principles (SOLID, DRY, KISS, separation
  of concerns) to produce clean, maintainable, and scalable code architecture.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: engineering principles, SOLID, DRY, KISS, separation of concerns, code
    architecture, defensive programming, clean code
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
  related-skills: code-review, refactoring, test-driven-development
------

# Software Engineering Principles

This skill makes the model evaluate and produce code that adheres to foundational engineering principles. When active, it enforces Single Responsibility, DRY, KISS, Separation of Concerns, and Composition Over Inheritance across every implementation, review, or refactor — ensuring architecture decisions are intentional, modules have clear boundaries, and code reads like a well-organized system rather than an accident of convenience.

## TL;DR Checklist

- [ ] Every class has exactly one reason to change — verify by asking "what else could break this?"
- [ ] No duplicated logic exists in more than two places — extract shared behavior into a single function or module
- [ ] The simplest correct solution was chosen before reaching for abstractions, generics, or design patterns
- [ ] Each module owns one concern — data access doesn't contain business rules, UI code doesn't contain validation logic
- [ ] Interfaces use composition over deep inheritance hierarchies — favor `has-a` relationships over `is-a` chains longer than two levels
- [ ] All functions have typed signatures and docstrings describing inputs, outputs, and side effects
- [ ] Guard clauses handle edge cases at function entry before any positive logic begins

