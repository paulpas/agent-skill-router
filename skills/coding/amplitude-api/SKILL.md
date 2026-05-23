---
name: amplitude-api
description: Implements Amplitude analytics integration (event tracking, user profiles,
  identify API, cohort analysis, dashboard export) using amplitude-analytics Python
  SDK with event batching, user properties, group identify, revenue tracking, and
  Amplitude HTTP API v2 patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: amplitude, event tracking, user analytics, amplitude events, identify
    api, cohort analysis, how do i track user events in amplitude, product analytics
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
  related-skills: coding-mixpanel-api, coding-segment-api, coding-salesforce-api
------

# Amplitude Analytics Integration

Implements production-grade Amplitude analytics integration using the `amplitude-analytics` Python SDK and HTTP API v2. When loaded, this skill makes the model implement event tracking with rich properties, user profile management via Identify API, group analytics, revenue tracking, event batching for efficiency, user property operations (set, set_once, add, unset), and cohort export. All implementations follow Amplitude best practices: use `AMPLITUDE_API_KEY` from environment, batch events with configurable flush interval, always include `user_id` or `device_id`, avoid high-cardinality property values, validate API connectivity on startup, and never send PII without user consent.

## TL;DR Checklist

- [ ] Use `amplitude-analytics` SDK with `AMPLITUDE_API_KEY` from environment variable
- [ ] Always include either `user_id` OR `device_id` in every event
- [ ] Batch events (10-100 per batch) and use flush interval (5-30 seconds)
- [ ] Use Identify API for user properties: `set()`, `set_once()`, `add()`, `append()`, `unset()`
- [ ] Include `event_type` (required, descriptive), `time` (millis timestamp), `event_properties` dict
- [ ] Use `$insert_id` for deduplication of retried events
- [ ] Set `session_id` for grouping events into user sessions
- [ ] Use Revenue API for purchase tracking: `price`, `quantity`, `productId`, `revenueType`
- [ ] Use Group Identify API for account-level properties (B2B analytics)
- [ ] Never send PII (names, emails, phone) unless explicitly allowed by privacy policy

