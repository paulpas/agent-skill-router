---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Architects multi-stage deployment strategies that balance speed, safety,
  and reliability through systematic risk assessment and controlled change delivery.
license: MIT
maturity: stable
metadata:
  completeness: 95
  content-types:
  - guidance
  - examples
  - do-dont
  domain: cncf
  exampleCount: 3
  maturity: stable
  output-format: code
  related-skills: blue-green-deployment,canary-deployment,deployment-orchestration,state-management,rollback-strategy,environment-parity
  role: reference
  scope: infrastructure
  triggers: deployment philosophy, release strategy, change management, deployment
    planning, cloud deployment, production release, blast radius, progressive delivery
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  version: 1.0.0
name: deployment-philosophy
------
# Cloud Deployment Philosophy

Mental model for designing safe, reliable, and fast deployment systems. Treats every deployment as a risk management exercise: minimize blast radius, maximize feedback velocity, and maintain irreversible safety nets at every stage.

## TL;DR Checklist

- [ ] Define acceptable blast radius before choosing a deployment strategy
- [ ] Ensure every deployment stage has a verified rollback path
- [ ] Instrument health checks before, during, and after deployment
- [ ] Validate environment parity between staging and production
- [ ] Measure deployment frequency vs. incident rate to calibrate risk tolerance

