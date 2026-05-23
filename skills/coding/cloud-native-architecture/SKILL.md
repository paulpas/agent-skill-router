---
name: cloud-native-architecture
description: Implements cloud-native architecture patterns including Kubernetes-native
  design, service mesh integration, GitOps workflows, serverless compute, immutable
  infrastructure, and platform engineering for resilient distributed systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: cloud native architecture, kubernetes design, container orchestration,
    service mesh, GitOps, serverless architecture, immutable infrastructure, platform
    engineering, internal developer platform, how do i design cloud-native systems,
    declarative configuration, ephemerality
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - do-dont
  related-skills: microservices-architecture, distributed-systems-architecture, event-driven-architecture,
    observability-patterns
------

# Cloud-Native Architecture Patterns

Designs and implements cloud-native architectures that treat ephemerality, declarative configuration, and self-healing as first-class concerns. When loaded, the model creates system designs leveraging Kubernetes-native patterns, service mesh communication, GitOps delivery workflows, serverless compute integration, and platform engineering principles to build resilient distributed systems that recover from failures without human intervention.

## TL;DR Checklist

- [ ] Design all workloads as ephemeral — no persistent state on container filesystems
- [ ] Declare desired state in manifests (Deployments, Services, ConfigMaps), never mutate live resources imperatively
- [ ] Implement readiness probes before liveness probes; configure both with appropriate thresholds
- [ ] Separate build-time concerns (Dockerfile) from deployment-time concerns (Kubernetes manifests)
- [ ] Use service mesh for cross-cutting concerns (mTLS, retries, timeouts) instead of application-level code
- [ ] Store all configuration in ConfigMaps and Secrets; never bake config into container images

