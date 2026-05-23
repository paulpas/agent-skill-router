---
name: anti-corruption-layer
description: Implements Anti-Corruption Layer patterns to isolate domain models from
  foreign systems, translating external APIs and legacy data structures into clean
  internal models while rejecting incompatible types at boundaries.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: anti corruption layer, acl, foreign model translation, boundary adapter,
    external system isolation, how do i protect my domain from bad apis, legacy system
    integration, domain contamination
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
  related-skills: domain-driven-design, domain-modeling, monolith-architecture, microservices-architecture,
    software-architecture
------

# Anti-Corruption Layer

Senior software architect building isolation boundaries between clean domain models and foreign systems — external APIs, legacy codebases, third-party services, or other bounded contexts with incompatible terminology. Implements translation layers that convert external vocabulary into internal model structures while actively rejecting types and concepts that would corrupt the domain.

## TL;DR Checklist

- [ ] Define explicit boundary modules that sit between infrastructure and domain
- [ ] Create adapter classes that translate foreign data structures into internal models
- [ ] Reject unknown/extra fields from external sources — fail fast, never silently absorb
- [ ] Use wrapper adapters for third-party APIs to enable test doubles and future swapping
- [ ] Map external terminology to internal ubiquitous language explicitly (document the mapping)
- [ ] Never pass raw DTOs, API responses, or ORM objects into domain logic
- [ ] Keep the ACL thin — translation belongs here; business rules belong in the domain

