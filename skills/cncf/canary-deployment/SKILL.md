---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Orchestrates canary deployment strategies with gradual traffic promotion,
  automated health monitoring, and rollback triggers for progressive risk management.
license: MIT
maturity: stable
metadata:
  completeness: 95
  content-types:
  - code
  - guidance
  - config
  - do-dont
  domain: cncf
  exampleCount: 3
  maturity: stable
  output-format: code
  related-skills: deployment-philosophy,blue-green-deployment,deployment-orchestration
  role: implementation
  scope: infrastructure
  triggers: canary deployment, gradual rollout, progressive delivery, traffic splitting,
    automated rollback, metrics-driven deployment, progressive rollout
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
name: canary-deployment
------
# Canary Deployment

Orchestrates gradual traffic promotion through a series of health-gated stages, automatically rolling back if any stage's metrics breach defined thresholds. Enables progressive risk management with minimal manual intervention.

## TL;DR Checklist

- [ ] Define canary stages with increasing traffic percentages
- [ ] Set health thresholds for each stage (error rate, latency, business metrics)
- [ ] Enable automated rollback on any threshold breach
- [ ] Run comparison tests between canary and baseline during each stage
- [ ] Monitor for the full observation period before advancing

