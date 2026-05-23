---
name: ports-patterns
description: Defines and manages port interfaces (driving/driven) in hexagonal architecture
  using Python Protocols, abc.ABC classes, and explicit contract patterns for framework-agnostic
  boundaries.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: port interface, driving port, driven port, port contract, Protocol vs
    ABC, hexagonal ports, how do i define clean boundaries, dependency inversion,
    framework-agnostic interfaces
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
  related-skills: hexagonal-architecture, composition-root, test-driven-development,
    anti-corruption-layer
------

# Hexagonal Port Interface Patterns

Acts as a senior software architect designing clean port interfaces for hexagonal architecture. When loaded, the model creates driving and driven ports using Python's `Protocol` or `abc.ABC`, writes explicit port contracts with preconditions and postconditions, and produces adapter stubs that enforce boundary integrity between domain logic and external systems.

## TL;DR Checklist

- [ ] Classify each interface as driving (secondary) or driven (primary) before writing code
- [ ] Use `Protocol` for structural subtyping when duck-typing is sufficient; use `ABC` only when nominal inheritance or abstract method enforcement is required
- [ ] Add preconditions and postconditions to every port method docstring
- [ ] Ensure the core domain imports only the Protocol/ABC, never any concrete adapter
- [ ] Create at least one in-memory stub implementation for testing each driven port
- [ ] Version port interfaces by appending `v2` suffix when breaking changes are needed — never mutate an existing Protocol's method signatures
- [ ] Run `mypy --strict` to verify that all adapters actually conform to the declared ports

