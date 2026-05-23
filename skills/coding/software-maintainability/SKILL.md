---
name: software-maintainability
description: Implements long-term codebase maintainability strategies including refactoring
  cadences, complexity budgets, dependency freshness monitoring, and sustainable development
  velocity to prevent architectural decay.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: software maintainability, codebase health, technical debt strategy, refactoring
    cadence, cyclomatic complexity budget, dependency freshness, how do i keep my
    codebase clean over time, sustainable development velocity
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
  related-skills: technical-debt-management, refactoring-techniques, code-quality-metrics,
    performance-optimization
------

# Software Maintainability Framework

Implements strategies for keeping codebases healthy and navigable as they grow over years of development. When loaded, this skill makes the model act as a senior software architect focused on long-term sustainability — designing refactoring cadences, setting complexity budgets, monitoring dependency health, and preventing the gradual architectural decay that turns maintainable systems into unmaintainable ones.

## TL;DR Checklist

- [ ] Define a refactoring cadence: small continuous improvements + periodic dedicated refactor sprints
- [ ] Set complexity budgets per module (cyclomatic complexity ≤ 10, function length ≤ 40 lines)
- [ ] Monitor dependency freshness weekly and flag packages unused for ≥ 6 months
- [ ] Enforce the Boy Scout Rule: leave every file slightly better than you found it
- [ ] Track code churn — modules touched by >3 different teams are candidates for splitting
- [ ] Run complexity analysis in CI and gate PRs that increase cyclomatic complexity without justification

