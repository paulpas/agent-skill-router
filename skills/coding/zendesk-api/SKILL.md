---
name: zendesk-api
description: Implements Zendesk API integration (Support API, Tickets, Users, Organizations,
  using zenpy Python SDK with OAuth 2.0, API token auth, ticket CRUD, user management,
  search, macros, triggers, and Zendesk REST API patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: zendesk, zendesk api, zenpy, zendesk support, zendesk tickets, zendesk
    users, zendesk organizations, how do i integrate with zendesk, support ticketing
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
  related-skills: coding-salesforce-api, coding-hubspot-api, coding-marketo-api
------

# Zendesk API Integration

Implements production-grade Zendesk integration using the `zenpy` Python SDK and Zendesk REST API. When loaded, this skill makes the model implement operations on Zendesk Support (Tickets, Users, Organizations, Groups), Ticket comments and attachments, User and Organization management, Search across all objects, Macros and Triggers, Views and Reports, and Zendesk's Incremental Export API for data sync. All implementations follow Zendesk best practices: use `ZENDESK_SUBDOMAIN`, `ZENDESK_EMAIL`, `ZENDESK_TOKEN` for API token auth, implement OAuth 2.0 for user-facing apps, use cursor-based pagination for list endpoints, handle rate limits with exponential backoff, use incremental export for large data syncs, and respect Zendesk's rate limits (700 requests per minute per Zendesk instance).

## TL;DR Checklist

- [ ] Use `zenpy` SDK with API token authentication (recommended)
- [ ] Use `ZENDESK_SUBDOMAIN`, `ZENDESK_EMAIL` (with `/token` suffix), `ZENDESK_TOKEN` env vars
- [ ] OAuth 2.0: Use authorization code flow for user-specific access
- [ ] Tickets: `zenpy_client.tickets()` for list, `.show()`, `.create()`, `.update()`, `.delete()`
- [ ] Users: `zenpy_client.users()` for list, `.show()`, `.create_or_update()`
- [ ] Organizations: `zenpy_client.organizations()` for list and CRUD
- [ ] Search: `zenpy_client.search(type='ticket', query='status:open')`
- [ ] Comments: Add via `TicketComment` object on ticket updates
- [ ] Pagination: Use `cursor` from response or `next()` generator
- [ ] Rate limits: 700 req/min, 429 response with `Retry-After` header
- [ ] Incremental Export: Use for syncing > 1000 records
- [ ] Never log or expose API tokens or OAuth access tokens

