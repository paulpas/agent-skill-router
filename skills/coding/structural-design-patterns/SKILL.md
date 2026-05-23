---
name: structural-design-patterns
description: Implements GoF structural patterns (Adapter, Bridge, Composite, Decorator,
  Facade, Proxy, Flyweight) to compose classes and objects into larger structures
  while keeping them flexible and efficient.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: structural patterns, adapter pattern, bridge pattern, composite pattern,
    decorator pattern, facade pattern, proxy pattern, flyweight, GoF design patterns
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
  related-skills: behavioral-design-patterns, design-patterns-architecture, refactoring-techniques,
    modular-design
------

# Structural Design Patterns

Implements GoF structural patterns to compose classes and objects into larger structures while maintaining flexibility. This skill makes the model apply Adapter for incompatible interfaces, Bridge for separating abstraction from implementation, Composite for tree-like part-whole hierarchies, Decorator for dynamic behavior augmentation, Facade for simplifying complex subsystems, Proxy for controlling access and lazy initialization, and Flyweight for memory-efficient shared object sharing — choosing each based on the structural problem at hand.

## TL;DR Checklist

- [ ] Determine if the problem is interface incompatibility (Adapter), implementation separation (Bridge), part-whole hierarchy (Composite), dynamic behavior addition (Decorator), subsystem simplification (Facade), access control/lazy loading (Proxy), or memory optimization (Flyweight)
- [ ] Prefer composition over inheritance for all structural patterns — wrap objects, never subclass for behavioral extension
- [ ] Use Decorator with `typing.Protocol` or ABC interfaces to ensure transparent substitution of wrapped and wrapping objects
- [ ] Use Proxy only when there is a real cost to creating or accessing the subject (expensive object, remote call, lazy initialization)
- [ ] Use Composite recursively — every node in the tree must implement the same interface as leaf nodes
- [ ] Use Flyweight only when you have many objects sharing extrinsic state; intrinsic state must be immutable and shareable
- [ ] Ensure Facade does not become a god object — delegate to domain services, do not contain business logic

