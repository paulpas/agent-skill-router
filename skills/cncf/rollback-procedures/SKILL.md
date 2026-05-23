---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Implements comprehensive rollback procedures including deployment rollback,
  version rollback, database rollback, and rollback testing for Kubernetes and cloud-native
  applications
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: cncf-argocd, cncf-deployment-patterns, cncf-kubernetes-debugging
  role: implementation
  scope: implementation
  triggers: rollback strategies, deployment rollback, version rollback, rollback procedures,
    rollback testing, rollback automation, rollback validation, rollback procedures
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
name: rollback-procedures
------
# Rollback Procedures

Implements comprehensive rollback procedures for Kubernetes deployments, Helm releases, ArgoCD applications, database migrations, and application versions. Provides step-by-step workflows, validated commands, and automation patterns to restore services to known good states.

## TL;DR Checklist

- [ ] **Identify the failure** — Determine root cause and affected component (deployment, Helm release, database, config)
- [ ] **Verify rollback readiness** — Check if rollback is possible and safe to execute
- [ ] **Capture current state** — Save deployment manifests, configmaps, and current versions for audit
- [ ] **Execute rollback** — Run appropriate rollback command for the component type
- [ ] **Validate rollback success** — Verify service health, logs, and metrics post-rollback
- [ ] **Update monitoring** — Add alerts for the failure pattern to prevent recurrence
- [ ] **Document incident** — Record rollback actions, timestamps, and outcomes
- [ ] **Test rollback automation** — Verify rollback script works in staging before production use

