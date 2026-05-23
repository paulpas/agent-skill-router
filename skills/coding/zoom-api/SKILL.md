---
name: zoom-api
description: Integrates Zoom API v2 (Meetings, Webinars, Recordings, Phone, Users)
  using the zoom-python-client SDK v0.2+ with Server-to-Server OAuth, proper pagination,
  and rate-limit handling.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: zoom, zoom api, zoom meetings, create zoom meeting, zoom sdk, zoom webinars,
    zoom recording, zoom-python
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
  related-skills: coding-twilio-api, coding-slack-api, coding-sendgrid-api
------

# Zoom API Integration (Meetings, Webinars, Recordings, Users)

Integrates the Zoom API v2 — Meetings, Webinars, Recordings, Phone, and Users management — using the `zoom-python-client` SDK v0.2+ with Server-to-Server OAuth authentication. When loaded, this skill makes the model implement Zoom API operations with proper token management, pagination for list endpoints, rate-limit handling, and webhook event processing.

## TL;DR for Code Generation

- [ ] Initialize `ZoomApiClient` from environment variables using `ZoomApiClient.init_from_env()` — never hardcode credentials
- [ ] Use Server-to-Server OAuth (account_id, client_id, client_secret) — JWT tokens are deprecated by Zoom
- [ ] Handle pagination explicitly: use `next_page_token` in list endpoint responses to iterate all pages
- [ ] Wrap API calls in try/except for `requests.exceptions.HTTPError` with status code inspection
- [ ] Respect rate limits — Zoom returns `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers
- [ ] Validate required parameters: `topic`, `start_time`, `duration` for meetings; `topic` for webinars
- [ ] Use ISO 8601 format (`2026-05-23T15:00:00Z`) for all datetime parameters

