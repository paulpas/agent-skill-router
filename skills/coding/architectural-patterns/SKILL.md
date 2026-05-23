---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Software architecture patterns including MVC, MVVM, microservices,
  event-driven, CQRS, DDD, hexagonal architecture, layered architecture, and pattern"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: code-quality-policies
  role: reference
  scope: implementation
  triggers: architectural patterns, system design, architecture, microservices, design
    patterns, CQRS, DDD, hexagonal architecture
  archetypes:
  - educational
  - diagnostic
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  version: 1.0.0
name: patterns
------
# Software Architecture Patterns

Reference guide for foundational architectural patterns used in software system design, including MVC, MVVM, microservices, event-driven, CQRS, Domain-Driven Design, hexagonal architecture, and layered patterns, with decision criteria for pattern selection.

## TL;DR Checklist

- [ ] Understand monolithic vs. distributed architecture tradeoffs
- [ ] Know when to apply MVC/MVVM vs. event-driven vs. microservices patterns
- [ ] Recognize bounded contexts in Domain-Driven Design for system decomposition
- [ ] Apply CQRS for read-heavy systems with complex queries
- [ ] Design hexagonal architecture to isolate business logic from frameworks
- [ ] Evaluate organizational structure and deployment constraints before choosing pattern

