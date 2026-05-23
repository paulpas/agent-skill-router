---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Orchestrates complex multi-stage deployments with dependency management,
  sequencing rules, and failure handling across interconnected services.
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
  related-skills: deployment-philosophy,canary-deployment,blue-green-deployment,state-management
  role: implementation
  scope: infrastructure
  triggers: deployment orchestration, multi-stage deployment, deployment pipeline,
    service dependency, deployment sequencing, coordinated deployment
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
name: deployment-orchestration
------
# Deployment Orchestration

Orchestrates coordinated multi-service deployments with dependency-aware sequencing, failure containment, and automatic rollback across service boundaries. Ensures that when multiple services deploy together, their compatibility constraints are respected.

## TL;DR Checklist

- [ ] Map service dependencies before defining deployment order
- [ ] Define deployment batches — groups of services that can deploy together
- [ ] Set health gates at each batch boundary
- [ ] Ensure rollback handles cross-service compatibility
- [ ] Validate API contract compatibility before deploying consumers

