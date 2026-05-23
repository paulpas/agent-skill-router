---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Diagnoses and resolves GitOps synchronization failures, drift detection
  issues, and reconciliation problems for ArgoCD and Flux deployments with actionable
  debugging commands.
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: code
  related-skills: cncf-argocd, cncf-flux, cncf-tekton
  role: implementation
  scope: implementation
  triggers: gitops troubleshooting, sync failure, drift detection, reconciliation,
    kustomize, argocd, flux, how do i debug gitops
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
name: gitops-troubleshooting
------
# GitOps Troubleshooting

Implements comprehensive GitOps debugging workflows for ArgoCD and Flux deployments. Provides actionable diagnostic commands, synchronization failure analysis, drift detection procedures, and reconciliation troubleshooting with real command examples. Follows the 5 Laws of Elegant Defense to guide data naturally through the debugging pipeline.

## TL;DR Checklist

- [ ] Check application health status before diving deep into logs
- [ ] Verify Git repository connectivity and credentials first (Early Exit)
- [ ] Compare Git state vs. cluster state for drift analysis (Parse Don't Validate)
- [ ] Fail fast with descriptive errors when reconciliation is stuck (Fail Fast)
- [ ] Return atomic debugging results with clear next steps (Atomic Predictability)
- [ ] Use intentional naming for debugging commands (Intentional Naming)
- [ ] Implement minimum 3-step fallback chain for debugging

