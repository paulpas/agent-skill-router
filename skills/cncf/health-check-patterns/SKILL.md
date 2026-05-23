---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Implements comprehensive health check patterns for cloud-native applications
  including Kubernetes probes, HTTP health endpoints, database checks, and circuit
  breaker patterns
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: agent-docker-debugging, cncf-kubernetes-debugging, coding-fastapi-patterns
  role: implementation
  scope: implementation
  triggers: health checks, liveness probes, readiness probes, health monitoring, health
    endpoint, service health, health check implementation, health check testing
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
name: health-check-patterns
------
# Health Check Patterns

Comprehensive health check patterns for cloud-native applications, implementing Kubernetes probes (liveness, readiness, startup), HTTP health endpoints, database connectivity checks, external service monitoring, and circuit breaker patterns to ensure application reliability and service availability.

## TL;DR Checklist

- [ ] Implement separate liveness and readiness probes with distinct purposes
- [ ] Configure appropriate probe timeouts and thresholds for slow-starting applications
- [ ] Add database connection health checks with connection pool metrics
- [ ] Implement HTTP health endpoint with structured JSON response
- [ ] Monitor external service dependencies with timeout and retry logic
- [ ] Add circuit breaker patterns for failing external dependencies
- [ ] Test health checks in isolation before deployment
- [ ] Set up alerting based on health check failures with appropriate thresholds

