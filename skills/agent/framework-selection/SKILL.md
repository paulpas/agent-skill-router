---
name: framework-selection
description: Applies structured decision-making frameworks (weighted scoring, RICE,
  MoSCoW, decision matrices) to evaluate options against requirements and select optimal
  solutions.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: framework selection, weighted scoring, decision matrix, option evaluation,
    criteria-based selection, RICE prioritization, MoSCoW, how do i choose between
    options
  archetypes:
  - orchestration
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
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
  related-skills: goal-to-milestones, task-decomposition-engine, dynamic-replanner,
    self-critique-engine
------

# Framework-Based Decision Maker

Systematically evaluates options against established requirements using structured decision frameworks to produce defensible, reproducible selections. This skill makes the model apply quantitative and qualitative evaluation methods instead of relying on intuition or ad-hoc reasoning when faced with multiple viable approaches.

## TL;DR Checklist

- [ ] Extract and list all explicit and implicit requirements from context
- [ ] Select the appropriate framework for the decision type (weighted scoring, RICE, MoSCoW, decision matrix)
- [ ] Score each option against every requirement with a defined scale
- [ ] Calculate weighted totals and identify the highest-scoring option
- [ ] Document assumptions, trade-offs, and rationale for the selection
- [ ] Flag any requirements that cannot be objectively scored and handle them separately

