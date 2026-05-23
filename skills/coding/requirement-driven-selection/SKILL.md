---
name: requirement-driven-selection
description: Evaluates technology candidates against measurable project requirements
  using weighted decision matrices, evidence-based validation, and ADR documentation
  to select the optimal framework or tool for a given context.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: requirement driven selection, ADR, weighted scoring matrix, how do i choose
    a framework, technology decision record, criteria based selection, tech stack
    choice
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
  related-skills: dependency-inversion-principle, modular-design, test-driven-development,
    hexagonal-architecture
------

# Requirement-Driven Framework Selection

Evaluates technology candidates against measurable project requirements using weighted decision matrices, evidence-based validation, and structured documentation to select the optimal framework or tool. This skill prevents hype-driven decisions by grounding every selection in quantifiable criteria tied directly to the project's needs.

## TL;DR Checklist

- [ ] Extract 5-8 concrete, measurable requirements from project context (each with a numeric threshold)
- [ ] Classify each requirement as MUST (hard constraint) or NICE (weighted preference)
- [ ] Build candidate shortlist: at least 3 options including one wild card unconventional choice
- [ ] Apply weighted scoring matrix across 4-6 criteria categories with evidence-backed scores
- [ ] Execute a focused spike/POC for the top 2 candidates exercising the core use case
- [ ] Document the decision in an Architecture Decision Record (ADR) with full rationale and reversibility plan

