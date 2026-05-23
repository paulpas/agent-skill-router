---
name: ddd-context-mapping
description: Implements practical context mapping patterns including anticorruption
  layers, shared kernels, published language contracts, and customer-supplier relationships
  for multi-bounded-context systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: context mapping, anticorruption layer, acl implementation, shared kernel,
    published language, customer supplier relationship, bounded context integration,
    ddd strategic patterns, conformist pattern, pipeline pattern, open host service
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
  related-skills: domain-driven-design, domain-modeling, ddd-tactical-patterns
------

# Context Mapping Implementation

Implements practical patterns for integrating bounded contexts in multi-context systems. Provides translation layers (anticorruption), coordination protocols (shared kernel), contract definitions (published language), and relationship management (customer-supplier, conformist, pipeline, open host service) so that context boundaries enforce invariant isolation while enabling cross-context business flows.

## TL;DR Checklist

- [ ] Classify each inter-context relationship before writing code: Customer/Supplier, Conformist, ACL, Shared Kernel, Published Language, Open Host Service, or Pipeline
- [ ] Implement the anticorruption layer as a thin translation module at every context boundary that touches foreign models — never let foreign types cross into your domain package
- [ ] Define published language contracts (JSON schemas, gRPC proto files, event schemas) with versioning and backward-compatibility rules before any integration code is written
- [ ] Set up shared kernel coordination with a change-registry protocol that notifies dependent contexts of model updates
- [ ] Enforce contract stability: Customer/Supplier relationships require backward-compatible contracts; breaking changes require a new published-language version
- [ ] Document every context relationship in the context map and keep it synchronized with code — an undocumented boundary is an untested one

