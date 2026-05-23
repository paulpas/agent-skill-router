---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Designs and implements rollback strategies with data-aware rollback procedures,
  partial rollback capabilities, and automated rollback triggers for safe deployment
  recovery.
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
  related-skills: deployment-philosophy,blue-green-deployment,canary-deployment,state-management
  role: implementation
  scope: infrastructure
  triggers: rollback strategy, deployment rollback, release rollback, rollback automation,
    data rollback, partial rollback, rollback trigger, rollback procedure
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
name: rollback-strategy
------
# Rollback Strategy

Designs and implements safe, data-aware rollback procedures for deployment recovery. Handles partial rollbacks, data consistency during rollback, and automated rollback triggers based on health signals.

## TL;DR Checklist

- [ ] Define rollback triggers for each deployment health signal
- [ ] Ensure rollback is tested at least once per quarter
- [ ] Plan data rollback before deployment — can you reverse the migration?
- [ ] Implement partial rollback for multi-service deployments
- [ ] Document rollback RTO (recovery time objective) and test against it

