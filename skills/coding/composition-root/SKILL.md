---
name: composition-root
description: Assembles dependency graphs at a single entry point using constructor
  injection, DI containers, and factory patterns to wire adapters to ports in hexagonal
  and layered architectures.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: composition root, dependency injection wiring, DI container, adapter registration,
    how do i wire my dependencies, service locator anti-pattern, object graph assembly,
    factory pattern, IoC container
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
  related-skills: hexagonal-architecture, ports-patterns, dependency-inversion-principle,
    test-driven-development, error-handling
------

# Composition Root & Dependency Injection Patterns

Acts as a senior software architect designing dependency injection composition roots. When loaded, the model assembles complete object graphs at a single entry point, selects appropriate DI strategies (manual wiring, factory functions, or container libraries), manages object lifecycles (singleton, per-request, transient), and produces concrete bootstrap code that enforces explicit dependency flow without service locator anti-patterns.

## TL;DR Checklist

- [ ] Identify every concrete class that must be instantiated and the interfaces it implements
- [ ] Build a single bootstrap function or module that creates all instances — never instantiate concretions inside business logic
- [ ] Prefer manual factory wiring for small-to-medium apps; reach for DI containers only when wiring complexity becomes unmanageable
- [ ] Use constructor injection exclusively — no property injection, no method injection, no defaults in constructors that hide dependencies
- [ ] Manage object lifecycles explicitly: singleton (shared state), per-request (HTTP scope), transient (new instance each use)
- [ ] Verify the composition root by calling it and exercising a complete use case with real infrastructure
- [ ] Ensure every test has its own bootstrap path that swaps production concretions for fakes

