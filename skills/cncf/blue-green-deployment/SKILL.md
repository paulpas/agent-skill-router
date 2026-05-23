---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Implements blue-green deployment strategies with traffic switching, state
  management, and rollback capabilities to achieve zero-downtime releases.
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
  related-skills: deployment-philosophy,canary-deployment,state-management,rollback-strategy
  role: implementation
  scope: infrastructure
  triggers: blue green deployment, zero downtime, traffic switching, parallel environments,
    deployment switch, green environment, parallel deployment
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
name: blue-green-deployment
------
# Blue-Green Deployment

Orchestrates parallel environment deployments with traffic switching, state management, and instant rollback to achieve zero-downtime releases. Maintains two identical environments and switches traffic between them.

## TL;DR Checklist

- [ ] Ensure both environments have identical configuration and schema
- [ ] Deploy new version to inactive (green) environment first
- [ ] Run health checks and smoke tests against green before switching traffic
- [ ] Switch traffic atomically via load balancer or router configuration
- [ ] Keep old (blue) environment warm for instant rollback

