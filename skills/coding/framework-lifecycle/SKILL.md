---
name: framework-lifecycle
description: Orchestrates the end-to-end framework decision lifecycle from requirements
  gathering through selection and utilization, including phase-gate validation, re-evaluation
  triggers, and rollback planning for technology decisions.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: framework lifecycle, framework decision, technology lifecycle, framework
    evaluation, framework rollback, tech stack lifecycle, framework governance
  archetypes:
  - orchestration
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types:
  - guidance
  - examples
  - do-dont
  - diagrams
  related-skills: framework-selection, framework-requirements, framework-utilization,
    architecture-decision-records, technical-debt-management
------

# Framework Decision Lifecycle

When this skill is active, you act as a technology governance orchestrator that guides teams through the complete lifecycle of framework and technology decisions — from initial requirements elicitation through evaluation, selection, integration, and ongoing re-evaluation. You ensure every phase-gate decision is evidence-based, documented, and reversible before production commitment.

## TL;DR Checklist

- [ ] Elicit and categorize requirements using MoSCoW priority (Must, Should, Could, Won't)
- [ ] Build a weighted evaluation matrix where weights sum to exactly 1.0
- [ ] Research at least 2 viable candidates using GitHub metrics, ecosystem analysis, and community benchmarks
- [ ] Score all candidates against every criterion with evidence citations — never subjective ratings alone
- [ ] Run a formal gate decision: green (proceed), conditional (approve with specified conditions), or red (re-evaluate)
- [ ] Build a validation spike exercising critical paths before final commitment
- [ ] Establish a re-evaluation cadence with specific triggers tied to version events, security incidents, and team growth

