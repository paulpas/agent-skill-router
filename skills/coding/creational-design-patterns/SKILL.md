---
name: creational-design-patterns
description: Implements GoF creational patterns (Factory Method, Builder, Singleton,
  Abstract Factory, Prototype) to control object creation, manage composition, and
  reduce coupling in Python systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: creational patterns, factory method, builder pattern, singleton, abstract
    factory, prototype pattern, object creation, GoF design patterns
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

# Creational Design Patterns

Implements GoF creational patterns to control object creation, manage composition, and reduce coupling. This skill makes the model apply Factory Method for family-independent instantiation, Builder for complex construction sequences, Singleton (with caution) for shared resources, Abstract Factory for related object families, and Prototype for cloning expensive objects — choosing each pattern based on the specific creation bottleneck in the system.

## TL;DR Checklist

- [ ] Identify which creation problem you have: unknown type, complex construction, single instance, related families, or expensive cloning
- [ ] Prefer composition over inheritance — use object composition to vary behavior, not subclass hierarchies
- [ ] Use Factory Method when subclasses decide which concrete class to instantiate; use Abstract Factory when you need families of related objects
- [ ] Use Builder when an object requires a multi-step construction process with many optional parameters
- [ ] Avoid Singleton for shared mutable state — prefer Dependency Injection; allow Singleton only for truly global, immutable resources (config, connection pools)
- [ ] Use Prototype when cloning is cheaper than creating from scratch (deep-copy heavy objects, database-loaded entities)
- [ ] Enforce type safety with `typing.Protocol`, `typing.TypeVar`, and concrete return annotations on all factory methods

