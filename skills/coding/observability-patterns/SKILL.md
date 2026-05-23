---
name: observability-patterns
description: Implements structured logging, Prometheus metrics collection, and distributed
  tracing with OpenTelemetry for production systems to enable debugging, performance
  monitoring, and incident response.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: observability, structured logging, metrics, distributed tracing, open
    telemetry, prometheus, health checks, debug production
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
  - do-dont
  - examples
  related-skills: code-review, security-review, software-design-principles
------

# Observability Patterns for Production Systems

Implements structured logging, metrics collection, and distributed tracing to make production systems debuggable, performant, and incident-resilient. When this skill is loaded, the model produces concrete observability code — not generic monitoring advice.

## TL;DR Checklist

- [ ] All log output uses structured JSON with `trace_id` and `span_id` correlation fields
- [ ] Metrics follow Prometheus naming: `{namespace}_{subsystem}_{name}_{unit}` convention
- [ ] Every public HTTP/gRPC endpoint exposes request latency histogram and request counter
- [ ] Health checks expose `/healthz` (liveness) and `/readyz` (readiness) as separate endpoints
- [ ] Distributed tracing is initialized at service entry with context propagation through async boundaries
- [ ] Alert rules reference specific metric thresholds, not vague "high error rate"

