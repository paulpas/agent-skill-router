---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Implements comprehensive debugging workflows for Istio and Linkerd service
  meshes including mTLS validation, sidecar injection issues, traffic routing problems,
  and mesh observability for microservices.
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: agent-network-troubleshooting, cncf-istio, cncf-kubernetes-debugging
  role: implementation
  scope: implementation
  triggers: istio debugging, linkerd troubleshooting, service mesh issues, envoy errors,
    mTLS problems, traffic routing, sidecar injection, mesh monitoring
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
name: service-mesh-debugging
------
# Service Mesh Debugging

Implements comprehensive debugging and troubleshooting workflows for Istio and Linkerd service meshes including mTLS validation, sidecar injection issues, traffic routing problems, and mesh observability for microservices.

## TL;DR Checklist

- [ ] Verify service mesh control plane is healthy (istiod/destiny pods running)
- [ ] Check sidecar injection status on workload pods
- [ ] Validate mTLS configuration between services
- [ ] Review Envoy proxy logs for connection errors
- [ ] Examine traffic routing rules and virtual services
- [ ] Check network policies and firewall rules
- [ ] Validate service account tokens and RBAC permissions
- [ ] Use mesh observability tools (Kiali, Jaeger, Prometheus) for tracing

