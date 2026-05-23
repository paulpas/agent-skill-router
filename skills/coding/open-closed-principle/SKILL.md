---
name: open-closed-principle
description: Refactors conditional branching and if/else chains into extensible polymorphic
  designs using strategy injection, factory registration, and protocol-based interfaces
  so new behavior extends without modifying existing source.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: open closed principle, OCP, extensible design, polymorphism, strategy
    pattern, factory pattern, extension point, conditional refactoring
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
  related-skills: single-responsibility, liskov-substitution-principle, interface-segregation-principle,
    dependency-inversion-principle, design-patterns-architecture
------

# Open/Closed Principle (OCP)

Applies the Open/Closed Principle to refactor code that requires modification for new features into designs that allow extension without source-level changes. Detects violation patterns — sprawling if/else chains, hard-coded type checks, and magic-number configuration — then replaces them with polymorphic strategies, factory registration, or protocol-based interfaces. This skill makes the model identify every place a new feature forces an edit to existing code, then restructure that code so adding features requires only new files, never changes to existing ones.

## TL;DR for Code Generation

- [ ] Locate the class or function that breaks when a new variant is added — this is the modification point
- [ ] Extract a Protocol or ABC representing the invariant contract across all variants
- [ ] Move each conditional branch's logic into its own class implementing the abstraction
- [ ] Replace the if/elif/else chain with a factory registry (dict mapping discriminator values to strategy classes)
- [ ] Verify: adding a new variant requires creating one file and registering it — zero edits to existing source

