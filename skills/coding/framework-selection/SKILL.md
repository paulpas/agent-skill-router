---
name: framework-selection
description: Evaluates and scores competing frameworks using weighted criteria matrices,
  AHP decision-making, risk assessment, and migration planning to select the optimal
  technology stack for project requirements.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: framework selection, tech stack evaluation, weighted scoring matrix, AHP
    decision, framework comparison, technology assessment, framework criteria, evaluate
    frameworks, choose framework, select technology, tech stack decision, framework
    trade-offs
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
  related-skills: framework-requirements, software-architecture, hexagonal-architecture
------

# Framework Selection Engine

Evaluates and scores competing frameworks using weighted criteria matrices, AHP (Analytic Hierarchy Process) decision-making, risk assessment, and migration planning. This skill turns subjective framework debates into data-driven selection decisions backed by quantitative scoring and documented trade-offs.

## TL;DR Checklist

- [ ] Define weighted evaluation criteria based on project requirements (not opinions)
- [ ] Build a scoring matrix with numeric scores for each framework against each criterion
- [ ] Calculate weighted totals and identify the leading candidate
- [ ] Run risk assessment: maturity, community support, lock-in potential, performance bottlenecks
- [ ] Document trade-offs in an Architecture Decision Record (ADR)
- [ ] Plan integration path: dependency injection, abstraction layers, migration strategy

