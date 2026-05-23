---
name: abstraction-design-patterns
description: Designs clean, maintainable abstractions using Protocols, ABCs, interfaces,
  and composition to reduce coupling while avoiding over-engineering and leaky abstractions.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: abstraction design, interface design, Protocol pattern, over-abstraction,
    leaky abstraction, composition over inheritance, Rule of Three
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
  related-skills: dry-principles,dependency-inversion-principle,design-patterns-architecture,solid-principles
------

# Abstraction Design Patterns

Designs clean, maintainable abstractions using Python Protocols, ABCs, composition, and interface segregation to reduce coupling between modules while actively preventing over-engineering, leaky abstractions, and thin wrapper proliferation. Ensures every abstraction earns its existence by serving at least two real use cases or enabling verifiable test isolation.

## TL;DR Checklist

- [ ] Apply the Rule of Three: wait until a pattern repeats three times before abstracting
- [ ] Prefer structural typing (`typing.Protocol`) over nominal inheritance for new interfaces
- [ ] Name protocols from the consumer's perspective, not the provider's capability list
- [ ] Keep abstractions narrow — declare only the methods callers actually invoke
- [ ] Verify every abstraction has at least one test using a substitute implementation
- [ ] Audit existing abstractions quarterly: remove any with zero real usages
- [ ] Prefer composition over inheritance when combining behaviors (Strategy, Adapter, Decorator)
- [ ] Ask "what concrete details leak through this boundary?" before declaring an interface complete

