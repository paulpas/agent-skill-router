---
name: newrelic-api
description: Implements New Relic API integration (metrics, traces, logs, NRDB queries,
  dashboards, alert policies) using newrelic Python SDK v8+ with NerdGraph GraphQL
  API, NRQL queries, custom events, and distributed tracing patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: new relic, nrql queries, nerdgraph, custom events, new relic alerts, apm
    tracing, how do i send data to new relic, observability platform
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
  related-skills: coding-datadog-api, coding-grafana-prometheus, coding-sentry-api
------

# New Relic API Integration

Implements production-grade New Relic API integration using the `newrelic` Python SDK v8+ and NerdGraph GraphQL API. When loaded, this skill makes the model implement custom metrics submission, NRDB queries with NRQL, custom events via Event API, distributed tracing with New Relic APM, alert policy creation, and dashboard management via GraphQL. All implementations follow New Relic best practices: use `NEW_RELIC_LICENSE_KEY` environment variable, batch events/metrics for efficiency, use consistent attribute naming, implement exponential backoff for rate limits, and validate API connectivity on startup.

## TL;DR Checklist

- [ ] Use `newrelic` SDK v8+ or NerdGraph GraphQL API with `NEW_RELIC_LICENSE_KEY` from env var
- [ ] Read license key from `NEW_RELIC_LICENSE_KEY`, never hardcode
- [ ] Use region-specific endpoints: US (`newrelic.com`) vs EU (`eu.newrelic.com`)
- [ ] Batch custom events in 100-1000 event batches (max 1MB per payload)
- [ ] Use consistent attribute naming: camelCase (New Relic convention), mandatory `appName`, `environment`
- [ ] Validate API connectivity on startup with a lightweight NRQL query
- [ ] Implement exponential backoff for 429 rate limit responses
- [ ] Use NerdGraph for resource management (dashboards, alerts) and Event API for telemetry
- [ ] Never send PII or sensitive data as custom event attributes
- [ ] Include `team.name` attribute in all telemetry for ownership

