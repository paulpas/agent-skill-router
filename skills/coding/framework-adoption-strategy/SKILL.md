---
name: framework-adoption-strategy
description: Orchestrates structured framework adoption through phased rollout planning,
  migration strategies, acceptance criteria definition, rollback procedures, and success
  metrics to ensure teams transition smoothly from selection to production utilization.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: framework adoption strategy, phased rollout, framework migration plan,
    how do i adopt a new framework in production, framework transition planning, rollback
    strategy, acceptance criteria, framework success metrics
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
  related-skills: framework-selection, framework-utilization, framework-requirements,
    version-migration
------

# Framework Adoption Strategy

Orchestrates structured framework adoption through phased rollout planning, migration strategies, acceptance criteria definition, rollback procedures, and success metrics. This skill ensures teams transition smoothly from the point of selecting a framework to successfully utilizing it in production — covering the critical gap where most adoptions fail.

## TL;DR Checklist

- [ ] Define explicit acceptance criteria for each phase (canary → limited rollout → full adoption) with measurable thresholds
- [ ] Build a phased migration plan: parallel run → strangler pattern → decommission old framework
- [ ] Create rollback procedures with specific trigger conditions and estimated recovery time per phase
- [ ] Assess team readiness using the utilization depth model before committing to each phase
- [ ] Establish success metrics: developer velocity, bug rates, performance indicators, and operational overhead
- [ ] Schedule review gates at each phase boundary — no automatic progression without explicit sign-off

