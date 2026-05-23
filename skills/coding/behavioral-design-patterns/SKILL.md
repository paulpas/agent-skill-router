---
name: behavioral-design-patterns
description: Implements behavioral design patterns (Observer, State, Command, Strategy,
  Template Method, Mediator, Chain of Responsibility, Iterator) to manage object communication,
  control flow, and algorithmic variation in Python applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: behavioral patterns, observer pattern, state pattern, command pattern,
    strategy pattern, template method, mediator pattern, chain of responsibility,
    iterator pattern, object communication
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
  related-skills: design-patterns-and-principles, event-driven-architecture, refactoring,
    modular-design
------

# Behavioral Design Patterns

Implements behavioral design patterns to manage object communication, control flow, and algorithmic variation. These patterns focus on responsibilities between objects — how they interact, delegate, and cooperate — rather than on object creation or structural composition. Each pattern provides a proven solution for common behavioral problems in software systems.

## TL;DR Checklist

- [ ] Identify the behavioral concern: communication, state transitions, algorithm selection, request handling, or iteration
- [ ] Select the single best-fitting pattern from the guide below — patterns solve specific problems
- [ ] Use Python's built-in abstractions (ABC, protocols, dataclasses) for clean interfaces
- [ ] Prefer composition over inheritance for behavioral variation (Strategy over subclassing)
- [ ] Ensure each pattern is used where it actually solves a problem — not added because it "sounds right"

