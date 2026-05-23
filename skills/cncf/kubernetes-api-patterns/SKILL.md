---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Kubernetes API patterns including CRD development, webhook implementation,
  API groups, client library usage, and debugging techniques for custom API extensions
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: cncf-kubernetes-debugging, cncf-tekton, coding-grpc-patterns
  role: implementation
  scope: implementation
  triggers: kubernetes api, k8s api, crd development, api groups, subresources, watch
    api, admission webhooks, client libraries
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
name: kubernetes-api-patterns
------
# Kubernetes API Patterns

Implement Kubernetes API patterns including Custom Resource Definition (CRD) development, webhook implementation, API groups, client library usage, and debugging techniques for custom API extensions.

## TL;DR Checklist

- [ ] Define CRD API groups, versions, and resources following Kubernetes naming conventions
- [ ] Implement validation and conversion webhooks with proper admission review handling
- [ ] Choose correct client library (Go, Python, Java) based on deployment environment
- [ ] Use watch API with resource versions for efficient event streaming
- [ ] Debug API issues with kubectl explain, kubectl get --raw, and api-resources
- [ ] Migrate resources between API versions using conversion webhooks or sidecars
- [ ] Configure API server settings for custom resource scalability
- [ ] Implement subresources (status, scale) following Kubernetes patterns

