---
name: microprofile
description: MicroProfile specification reference covering Config, OpenAPI, Fault
  Tolerance, Metrics, Health, JWT Security, Open Telemetry, and Server Sent Events
  for cloud-native Java microservices.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  triggers: microprofile, fault tolerance, service mesh, openapi spec, health checks,
    metrics endpoint, config source, jwt security, open telemetry, server sent events,
    cloud native java, smallrye, quarkus integration
  archetypes:
  - educational
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  role: reference
  scope: infrastructure
  output-format: manifests
  content-types:
  - guidance
  - examples
  - do-dont
  - config
  related-skills: jakarta-ee, jakarta-migration
------

# MicroProfile for Cloud-Native Java

Implements and configures MicroProfile specifications to add cloud-native operational capabilities — externalized configuration, service mesh compatibility, observability (metrics, tracing, health), fault tolerance patterns, and JWT-based security — on top of Jakarta EE application servers or as part of native compilation with Quarkus.

## TL;DR Checklist

- [ ] Select only the MicroProfile features needed — avoid loading unnecessary specification overhead
- [ ] Configure MicroProfile Config sources in priority order (env vars > system properties > config.properties > defaults)
- [ ] Implement both liveness and readiness health checks for proper Kubernetes pod lifecycle management
- [ ] Use @CircuitBreaker with appropriate thresholds to prevent cascading failures across services
- [ ] Verify OpenAPI docs are generated and accessible at /openapi before exposing the service

