---
name: architecture-decision-records
description: Documents architectural decisions as Architecture Decision Records (ADRs)
  with structured context, decision rationale, consequences, and status tracking for
  engineering teams.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: architecture decision records, ADR, architectural decisions, how do i
    document architectural choices, design rationale, technology selection, system
    trade-offs, decision log
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  role: reference
  scope: infrastructure
  output-format: manifests
  content-types:
  - guidance
  - examples
  - config
  related-skills: software-architecture, engineering-principles, technical-debt-management
------

# Architecture Decision Records (ADRs)

Produces and maintains Architecture Decision Records — lightweight, structured documents that capture important architectural decisions, the context behind them, their consequences, and current status. ADRs create a searchable, version-controlled history of why a system is built the way it is, reducing tribal knowledge loss and enabling future teams to understand trade-offs without guessing intent.

## TL;DR Checklist

- [ ] Every ADR captures context (why we were deciding), the chosen decision, and explicit consequences
- [ ] Each ADR has a human-readable title and a numeric ID (ADR-001, ADR-002, etc.)
- [ ] Status field reflects reality: `proposed` → `accepted` → `deprecated` / `superseded` / `active`
- [ ] Consequences include both benefits and drawbacks — no sugar-coating
- [ ] ADRs live in version control alongside source code (`docs/adr/` or `architecture/decisions/`)
- [ ] The root index README links every ADR for quick navigation
- [ ] Decisions with irreversible consequences (data migration, compliance) get explicit risk flags

