---
name: splunk-api
description: Implements Splunk integration (log ingestion, search queries, REST API)
  using splunk-sdk Python SDK with HEC (HTTP Event Collector) for log ingestion, Splunk
  search queries, saved searches, alert management, and REST API patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: splunk, splunk search, hec, http event collector, splunk sdk, splunk alerts,
    how do i send logs to splunk, log management
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
  related-skills: coding-datadog-api, coding-grafana-prometheus, coding-newrelic-api
------

# Splunk API & SDK Integration

Implements production-grade Splunk integration using the `splunk-sdk` Python SDK and HTTP Event Collector (HEC). When loaded, this skill makes the model implement log/event ingestion via HEC, search queries using Splunk SDK, saved searches, alert management, dashboard management, and REST API operations. All implementations follow Splunk best practices: use `SPLUNK_HEC_TOKEN` from environment, batch events for HEC, use time bounds in all searches, implement exponential backoff, validate connectivity on startup, and never send PII without consent.

## TL;DR Checklist

- [ ] Use `splunk-sdk` with `SPLUNK_HOST`, `SPLUNK_PORT`, `SPLUNK_USERNAME`, `SPLUNK_PASSWORD` for management API
- [ ] Use HTTP Event Collector (HEC) with `SPLUNK_HEC_TOKEN` for log/event ingestion
- [ ] Always include `time` field in HEC events (Unix seconds or ISO 8601)
- [ ] Use `index`, `source`, `sourcetype`, `host` fields for proper categorization
- [ ] Batch HEC events (50-100 per batch) for efficiency
- [ ] Use `earliest_time` and `latest_time` in all searches
- [ ] Use `oneshot` searches for ad-hoc queries, `export` for large result sets
- [ ] Implement exponential backoff for 429 rate limit responses
- [ ] Use `host` field to identify the source machine/service
- [ ] Never send PII, credentials, or sensitive data without consent

