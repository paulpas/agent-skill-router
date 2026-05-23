---
name: grafana-prometheus
description: Implements Grafana and Prometheus integration (metrics collection, querying,
  alerting rules, Grafana dashboards as code, PromQL patterns, and Grafana HTTP API
  for dashboard management, using prometheus-api-client and grafana-api Python SDKs.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: prometheus, promql queries, grafana dashboards, alerting rules, prometheus
    metrics, grafana api, how do i query prometheus metrics, monitoring as code
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
  related-skills: coding-datadog-api, coding-newrelic-api, coding-sentry-api
------

# Grafana & Prometheus Integration

Implements production-grade Prometheus metrics querying, PromQL patterns, Grafana dashboard management via HTTP API, and alerting rules as code. When loaded, this skill makes the model implement PromQL queries for time-series analysis, Grafana dashboard JSON templating, alerting rules with YAML, Prometheus HTTP API calls, and Grafana datasource management. All implementations follow Prometheus and Grafana best practices: use label-based filtering, avoid high-cardinality labels, use range vectors for aggregations, implement dashboard version control, and validate PromQL syntax before deployment.

## TL;DR Checklist

- [ ] Use `prometheus-api-client` for Prometheus HTTP API or direct HTTP calls to `/api/v1/query`
- [ ] Use `grafana-api` Python SDK or direct HTTP calls to Grafana HTTP API
- [ ] Read connection details from `PROMETHEUS_URL`, `GRAFANA_URL`, `GRAFANA_API_KEY` env vars
- [ ] Avoid high-cardinality labels (unique IDs, high-cardinality strings)
- [ ] Use `rate()` for counters, `irate()` for short-lived spikes
- [ ] Use `sum by (label)` instead of `sum without (label)` for clarity
- [ ] Always set time bounds (`start`, `end`, `step`) in range queries
- [ ] Use `offset` for comparison queries (week-over-week)
- [ ] Validate PromQL syntax before deployment
- [ ] Store Grafana dashboard JSON in version control (as code)
- [ ] Include `__name__` and job/instance labels for metric identification

