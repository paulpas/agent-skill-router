---
name: multi-stage-deployment
description: Designs multi-stage deployment pipelines that reduce risk through progressive
  disclosure, environment parity, and quality-gated stage transitions from development
  to production.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  triggers: multi-stage deployment, deployment stages, environment parity, deployment
    pipeline, stage gates, dev staging pre-prod, deployment readiness, progressive
    delivery
  archetypes:
  - educational
  - diagnostic
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  role: reference
  scope: infrastructure
  output-format: analysis
  content-types:
  - guidance
  - examples
  - do-dont
  related-skills: deployment-philosophy,blue-green-deployment,canary-deployment,state-management,rollback-strategy,deployment-orchestration
------

# Multi-Stage Deployment Pipeline

Architects deployment pipelines as a series of quality-gated stages, each with a distinct purpose and validation focus. Treats every stage boundary as a decision point that must earn the right to expose more users to the change.

## TL;DR Checklist

- [ ] Define the quality dimension each stage validates (correctness, integration, performance, production fit)
- [ ] Ensure environment parity exists where it matters most: staging must mirror production config and topology
- [ ] Write explicit gate criteria per stage — not "tests pass" but "what quality dimension is satisfied"
- [ ] Identify team handoff points at each stage boundary — who approves, who operates, who owns
- [ ] Calculate cost vs. safety tradeoff for each stage: is the gate worth the delay?
- [ ] Treat canary and blue-green as stage transitions (staging → pre-prod → prod), not standalone deployment patterns

