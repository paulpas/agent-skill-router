---
name: marketo-api
description: Implements Marketo API integration (REST, SOAP, Lead Database, Activities,
  Campaigns, using requests with OAuth 2.0 authentication, lead CRUD, bulk import/export,
  trigger campaigns, and Marketo REST API patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: marketo, marketo api, marketo rest, adobe marketo, marketo leads, marketo
    activities, marketo campaigns, how do i integrate with marketo, marketing automation
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
  related-skills: coding-salesforce-api, coding-hubspot-api, coding-hubspot-api
------

# Marketo API Integration

Implements production-grade Marketo integration using the Marketo REST API with OAuth 2.0 authentication. When loaded, this skill makes the model implement operations on the Marketo Lead Database (Leads, Companies, Opportunities), Activities tracking, Campaigns triggers, Bulk API for import/export, Custom Objects, and the Marketo SOAP API for legacy integrations. All implementations follow Marketo best practices: use `MARKETO_CLIENT_ID`, `MARKETO_CLIENT_SECRET`, `MARKETO_BASE_URL` from environment, implement access token caching with auto-refresh, handle rate limits with exponential backoff, use Bulk API for > 300 records, and properly paginate list results using the `nextPageToken`.

## TL;DR Checklist

- [ ] Use Marketo REST API with OAuth 2.0 (client_credentials grant)
- [ ] Use `MARKETO_CLIENT_ID`, `MARKETO_CLIENT_SECRET`, `MARKETO_BASE_URL` env vars
- [ ] Base URL format: `https://<MUNCHKIN_ID>.mktorest.com`
- [ ] Cache access tokens (expire in 3600 seconds = 1 hour)
- [ ] Leads API: Use `/rest/v1/leads.json` for CRUD operations
- [ ] Describe API: Use `/rest/v1/leads/describe.json` for field metadata
- [ ] Bulk API: Use for importing/exporting > 300 records
- [ ] Activities: Use `/rest/v1/activities.json` with activity type IDs
- [ ] Campaigns: Use `/rest/v1/campaigns/{id}/trigger.json` to trigger
- [ ] Pagination: Use `nextPageToken` from response for subsequent calls
- [ ] Rate limits: 100 calls per 20 seconds per user, varies by tier
- [ ] Never log or expose client secret or access tokens

