---
name: production-readiness
description: Evaluates service readiness against Google SRE PRR framework covering
  reliability, observability, scalability, security, data management, deployment engineering,
  cost governance, and documentation for safe production deployment.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: production readiness, SRE review, deployment criteria, observability setup,
    canary deployment, on-call coverage, SLO SLI, error budget, golden signals, how
    do i know my service is production ready, operational excellence, hypercare period
  archetypes:
  - diagnostic
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  role: reference
  scope: infrastructure
  output-format: analysis
  content-types:
  - guidance
  - examples
  - do-dont
  - config
  related-skills: observability-patterns, technical-debt-management, architecture-decision-records
------

# Production Readiness Review

Evaluates and validates that services meet operational criteria before deploying to production. Applies the Google SRE PRR framework across eight categories — reliability, observability, scalability, security, data management, deployment engineering, cost governance, and documentation — ensuring teams ship with confidence rather than hope. This skill guides systematic pre-launch validation so that production deployments are deliberate, traceable, and reversible.

## TL;DR Checklist

- [ ] Service has at least 3 defined SLIs with corresponding SLO targets and an error budget policy
- [ ] Golden Signals dashboards (rate, latency p95/p99, error rate, saturation) are live and accessible
- [ ] Distributed tracing via OpenTelemetry is enabled with context propagation across all service boundaries
- [ ] Structured JSON logging with enforced levels and PII filtering is in place
- [ ] Circuit breakers and retry-with-jitter are implemented for all 7+ external dependencies
- [ ] Canary deployment path exists with automated rollback criteria defined
- [ ] Runbooks cover the top 5 failure modes with trigger conditions, diagnosis steps, and remediation
- [ ] Security scan shows zero critical CVEs; TLS 1.2+ enforced end-to-end; RBAC model documented
- [ ] Auto-scaling policies tested under load; connection pools sized for peak traffic
- [ ] Database backups verified with successful restore drill in the last 30 days

