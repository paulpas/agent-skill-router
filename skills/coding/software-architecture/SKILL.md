---
name: software-architecture
description: Evaluates and designs software architecture using layered, hexagonal,
  and clean patterns to ensure scalability, maintainability, and separation of concerns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: software architecture, system design, layered architecture, hexagonal
    architecture, clean architecture, separation of concerns, scalable design, architectural
    patterns
  archetypes:
  - diagnostic
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  role: reference
  scope: infrastructure
  output-format: analysis
  content-types:
  - guidance
  - examples
  - do-dont
  - diagrams
  related-skills: code-review, test-driven-development, modular-design
------

# Software Architecture Guide

Evaluates and designs software architecture from a senior architect's perspective — auditing existing systems for coupling violations, recommending proven structural patterns (layered, hexagonal/clean, event-driven), enforcing separation of concerns across modules, and producing actionable design decisions that balance long-term maintainability with delivery velocity.

## TL;DR Checklist

- [ ] Verify dependencies point inward toward the core domain, never outward to frameworks or infrastructure
- [ ] Ensure presentation layer contains no business logic — controllers only parse, invoke, and format
- [ ] Declare all ports (abstract interfaces) in the domain or application layer before writing adapters
- [ ] Separate bounded contexts with explicit contracts; each context must be independently testable
- [ ] Document every major structural decision as an Architecture Decision Record (ADR) with rationale and trade-offs

