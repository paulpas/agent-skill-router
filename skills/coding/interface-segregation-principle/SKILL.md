---
name: interface-segregation-principle
description: Detects fat interfaces that force implementors to provide unused methods
  and refactors them into narrow, client-specific contracts using Python Protocols
  and targeted ABCs.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: interface segregation principle, ISP, fat interface, thin interface, client
    specific, Protocol, ABC, unused methods, stub implementation, NotImplementedError,
    duck typing
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
  related-skills: single-responsibility, open-closed-principle, liskov-substitution-principle,
    dependency-inversion-principle
------

# Interface Segregation Principle (ISP)

Identifies fat interfaces that force clients to depend on methods they do not use and refactors them into narrow, client-specific contracts. Applies Python Protocols for structural duck typing, targeted ABCs for nominal typing, and composition patterns to eliminate stub implementations, `NotImplementedError` stubs, and LSP-violating fallback methods.

## TL;DR Checklist

- [ ] Inventory every method on each interface and list which client classes actually call it
- [ ] Group clients by their real usage pattern — no client should implement a method it never invokes
- [ ] Split fat interfaces into one narrow contract per distinct client need (e.g., `StorageReader`, `StorageWriter`)
- [ ] Verify every method on a split interface is called by at least one implementation and used by at least one caller
- [ ] Replace the fat interface reference in each caller with the specific narrow interface(s) they need
- [ ] Remove all stub methods that raise `NotImplementedError` or return `None` as a no-op

