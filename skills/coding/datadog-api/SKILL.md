---
name: datadog-api
description: Implements Datadog API integration (metrics, traces, logs, dashboards,
  monitors, synthetic tests) using datadog-api-client Python SDK v2+ with API key
  auth, async metrics submission, monitor creation, and Datadog APM tracing patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: datadog, metrics submission, datadog monitors, APM tracing, custom metrics,
    datadog dashboards, how do i send metrics to datadog, monitoring alerts
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
  related-skills: coding-newrelic-api, coding-grafana-prometheus, coding-sentry-api,
    coding-pagerduty-api
------

# Datadog API Integration

Implements production-grade Datadog API integration using the `datadog-api-client` Python SDK v2+. When loaded, this skill makes the model implement custom metrics submission, APM distributed tracing, log forwarding, monitor creation with alert conditions, dashboard management, and synthetic test configuration. All implementations follow Datadog best practices: use DD_API_KEY environment variable, batch metrics for efficiency, use tags consistently, implement exponential backoff for rate limits, and always validate API connectivity on startup.

## TL;DR Checklist

- [ ] Use `datadog-api-client` v2+ with configuration from `DD_API_KEY` and `DD_SITE` env vars
- [ ] Read API keys from environment variables, never hardcode
- [ ] Batch metrics in 50-100 point batches for efficient submission
- [ ] Use consistent tag naming: `env:production`, `service:checkout`, `version:v1.2.3`
- [ ] Validate API connectivity on startup with a simple ping or validate call
- [ ] Implement exponential backoff with jitter for rate limit (429) errors
- [ ] Use async submission for high-volume metrics to avoid blocking main thread
- [ ] Never send PII or sensitive data in tags or metric payloads
- [ ] Set appropriate monitor thresholds with notification channels (Slack, PagerDuty)
- [ ] Include `team:` tag in all resources for ownership attribution

