---
name: pagerduty-api
description: Implements PagerDuty API integration (incident management, on-call schedules,
  escalation policies, alerts, events API v2) using pdpyras Python SDK with event
  ingestion, incident querying, on-call retrieval, and maintenance windows.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: pagerduty, incidents, on-call schedules, escalation policies, events api
    v2, pagerduty alerts, how do i trigger pagerduty alerts, incident management
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
  related-skills: coding-datadog-api, coding-sentry-api, coding-grafana-prometheus
------

# PagerDuty API Integration

Implements production-grade PagerDuty API integration using the `pdpyras` Python SDK and direct HTTP API calls. When loaded, this skill makes the model implement Event API v2 ingestion (trigger/acknowledge/resolve), incident querying and management, on-call schedule lookup, escalation policy management, alert grouping, and maintenance window creation. All implementations follow PagerDuty best practices: use Events API for alert ingestion (not REST API), always include `dedup_key` for deduplication, implement exponential backoff for rate limits, and validate API connectivity on startup.

## TL;DR Checklist

- [ ] Use `pdpyras` SDK or direct HTTP calls with `PAGERDUTY_API_KEY` from env var
- [ ] Use Events API v2 (`https://events.pagerduty.com/v2/enqueue`) for alert ingestion
- [ ] Use REST API (`https://api.pagerduty.com`) for management operations
- [ ] Always include `dedup_key` in Events API calls for deduplication
- [ ] Use `routing_key` (integration key) for Events API, `api_key` for REST API
- [ ] Include required headers: `Authorization: Token token=<key>`, `Accept: application/vnd.pagerduty+json;version=2`
- [ ] Add explicit `From` email header for user context operations
- [ ] Implement exponential backoff for 429 rate limit responses
- [ ] Use `event_action: trigger`, `event_action: acknowledge`, `event_action: resolve` consistently
- [ ] Always include `payload.summary`, `payload.source`, `payload.severity` in trigger events

