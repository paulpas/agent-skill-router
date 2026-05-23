---
name: mixpanel-api
description: Implements Mixpanel analytics integration (event tracking, user profiles,
  JQL queries, funnel analysis, cohort export) using mixpanel Python SDK with event
  batching, distinct_id management, engage updates, export API, and ingestion API
  patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: mixpanel, event tracking, user profiles, jql queries, mixpanel funnels,
    cohort analysis, how do i track events in mixpanel, product analytics
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
  related-skills: coding-amplitude-api, coding-segment-api, coding-hubspot-api
------

# Mixpanel Analytics Integration

Implements production-grade Mixpanel analytics integration using the `mixpanel` Python SDK and HTTP APIs. When loaded, this skill makes the model implement event tracking with `distinct_id`, user profile management via Engage API, JQL (JavaScript Query Language) for complex analysis, funnel and retention queries, export API for raw data, and cohort management. All implementations follow Mixpanel best practices: use `MIXPANEL_TOKEN` from environment, batch events for efficiency, always use `distinct_id` for user identification, avoid high-cardinality property values, implement `$ignore_time` for historical imports, and validate API connectivity on startup.

## TL;DR Checklist

- [ ] Use `mixpanel` SDK with `MIXPANEL_TOKEN` from environment variable
- [ ] Always include `distinct_id` in every event and profile update
- [ ] Batch events using `track_batch()` or automatic flush with `Consumer`
- [ ] Use `time` property (Unix seconds) for event timestamping
- [ ] Use Engage API for user profiles: `people_set()`, `people_set_once()`, `people_increment()`
- [ ] Use `$insert_id` for deduplication of retried events
- [ ] Set `$ignore_time: true` when importing historical data
- [ ] Use JQL for complex queries, Export API for raw event export
- [ ] Include `token` in every event payload
- [ ] Never send PII without user consent (Mixpanel has GDPR/CCPA features)

