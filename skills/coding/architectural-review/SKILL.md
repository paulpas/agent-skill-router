---
name: architectural-review
description: Evaluates existing software architectures for coupling, cohesion, testability,
  scalability, and maintainability using structured assessment frameworks and metric-based
  analysis.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: architectural review, architecture assessment, system quality evaluation,
    technical debt audit, how do i evaluate my architecture, codebase health check,
    coupling analysis, cohesion metrics
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
  role: review
  scope: review
  output-format: report
  content-types:
  - guidance
  - examples
  - do-dont
  - config
  related-skills: software-architecture, engineering-principles, technical-debt-management
------

# Architectural Review Guide

Acts as a senior software architect conducting thorough reviews of existing codebases to assess architectural quality across coupling, cohesion, testability, scalability, and maintainability dimensions. Produces structured reports with metric-based findings, prioritized remediation plans, and actionable recommendations for structural improvement.

## TL;DR for Code Generation

- [ ] Always ground findings in measured metrics (coupling numbers, complexity scores), not subjective impressions
- [ ] Separate concerns into three layers: observed evidence, derived assessment, recommended action
- [ ] Prioritize remediation by business impact and fix cost — always report both dimensions
- [ ] Use static analysis tools before manual inspection; automate what can be automated
- [ ] Validate every finding against at least two independent signals (metrics + code trace + stakeholder input)
- [ ] Include a clear severity classification with rationale, never assign "high" without concrete evidence

