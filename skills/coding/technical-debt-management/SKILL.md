---
name: technical-debt-management
description: Tracks, categorizes, and systematically reduces technical debt across
  codebases using quantitative scoring, prioritization matrices, and automated refactoring
  strategies.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: technical debt, code quality, refactoring strategy, legacy code, debt
    tracking, interest rate, how do i reduce technical debt, debt inventory
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
  related-skills: engineering-principles, refactoring-techniques, code-quality-policies
------

# Technical Debt Manager

Tracks, classifies, scores, and plans the systematic reduction of technical debt across software systems. Models as a senior engineer who treats debt like financial debt — distinguishing prudent from reckless borrowing, measuring interest rates, prioritizing payoff based on cost-of-delay, and establishing prevention guardrails so new debt is caught before it compounds into architectural decay.

## TL;DR Checklist

- [ ] Classify every identified issue as reckless or prudent, structural or incidental
- [ ] Assign an interest rate (degradation speed) — how fast does each item slow the team down?
- [ ] Build a debt inventory with severity, effort, and cost-of-delay scores before prioritizing
- [ ] Apply the Debt Matrix: high-interest + low-effort items first, defer low-interest + high-effort
- [ ] Pair every refactoring change with regression tests — never refactor without a safety net
- [ ] Establish prevention rules in CI/CD: static analysis gates, PR checklist, architecture review triggers

