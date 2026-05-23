---
name: segment-api
description: Implements Segment (CDP) integration (track, identify, group, page, screen,
  alias) using analytics-python SDK with event batching, user traits, group traits,
  page properties, Segment Spec compliance, and HTTP API fallback patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: segment, cdp, customer data platform, segment track identify, segment
    spec, how do i integrate segment tracking, rudderstack, customer data infrastructure
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
  related-skills: coding-amplitude-api, coding-mixpanel-api, coding-hubspot-api
------

# Segment CDP Integration

Implements production-grade Segment (Customer Data Platform) integration using the `analytics-python` SDK. When loaded, this skill makes the model implement Segment Spec-compliant tracking: `track()` for events, `identify()` for user traits, `group()` for account-level properties, `page()`/`screen()` for views, `alias()` for identity linking. All implementations follow Segment best practices: use `WRITE_KEY` from environment, batch events with configurable flush, use anonymousId for logged-out users, userId for authenticated users, implement context fields for device/channel info, and always include required fields from the Segment Spec.

## TL;DR Checklist

- [ ] Use `analytics-python` SDK with `SEGMENT_WRITE_KEY` from environment variable
- [ ] Initialize `analytics.write_key = WRITE_KEY` and configure `analytics.debug`
- [ ] Use `anonymousId` for logged-out users (UUID), `userId` for authenticated users
- [ ] Always include either `anonymousId` OR `userId` in every call
- [ ] Follow Segment Spec: `track()`, `identify()`, `group()`, `page()`, `alias()`
- [ ] Use `properties` dict for `track()` and `page()`, `traits` dict for `identify()` and `group()`
- [ ] Include `context` dict for device, channel, app, location info when available
- [ ] Use `timestamp` (ISO 8601 or datetime object) for historical backfill
- [ ] Set `flush_at` (batch size) and `flush_interval` (seconds) appropriately
- [ ] Call `analytics.flush()` explicitly before application shutdown

