---
name: sentry-api
description: Implements Sentry API integration (error tracking, performance monitoring,
  issue management, release tracking, event ingestion) using sentry-sdk Python SDK
  with error capture, performance tracing, breadcrumbs, issue querying, and release
  management via Sentry REST API.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: sentry, error tracking, performance monitoring, sentry issues, sentry
    sdk, exception capture, how do i integrate sentry error tracking, application
    monitoring
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
  related-skills: coding-datadog-api, coding-grafana-prometheus, coding-pagerduty-api
------

# Sentry API & SDK Integration

Implements production-grade Sentry integration using the `sentry-sdk` Python SDK and Sentry REST API. When loaded, this skill makes the model implement error/exception capture with context, performance tracing for transactions, breadcrumb tracking, issue management via API, release tracking, deploy notifications, and custom event ingestion. All implementations follow Sentry best practices: initialize SDK early, set environment/release/service, use tags consistently, filter sensitive data, configure sampling rates, and validate DSN connectivity on startup.

## TL;DR Checklist

- [ ] Use `sentry-sdk` Python SDK with `SENTRY_DSN` from environment variable
- [ ] Initialize SDK as early as possible in application lifecycle
- [ ] Set mandatory options: `environment`, `release`, `server_name`, `traces_sample_rate`
- [ ] Use `sentry_sdk.init()` with `integrations` for framework auto-instrumentation
- [ ] Add context: `set_user()`, `set_tag()`, `set_context()`, `add_breadcrumb()`
- [ ] Capture exceptions with `capture_exception()`, messages with `capture_message()`
- [ ] Configure `before_send` callback to filter/remove PII and sensitive data
- [ ] Use sampling: `traces_sample_rate` for performance, `sample_rate` for errors
- [ ] REST API uses auth token from `SENTRY_AUTH_TOKEN` env var
- [ ] Never log or expose DSN in error messages or logs

