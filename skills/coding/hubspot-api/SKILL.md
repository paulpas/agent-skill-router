---
name: hubspot-api
description: Implements HubSpot API integration (CRM, Contacts, Companies, Deals,
  Tickets, using hubspot-api-client Python SDK with OAuth 2.0, private apps, CRM objects,
  associations, search, and HubSpot REST API patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: hubspot, hubspot api, hubspot crm, hubspot-api-client, hubspot contacts,
    hubspot companies, hubspot deals, how do i integrate with hubspot, crm integration
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
  related-skills: coding-salesforce-api, coding-marketo-api, coding-zendesk-api
------

# HubSpot API Integration

Implements production-grade HubSpot integration using the `hubspot-api-client` Python SDK and HubSpot REST API. When loaded, this skill makes the model implement CRUD operations on HubSpot CRM objects (Contacts, Companies, Deals, Tickets, Products, Line Items, Custom Objects), associations between objects, CRM search, HubSpot Forms, Engagements, and HubSpot's Batch API. All implementations follow HubSpot best practices: use `HUBSPOT_ACCESS_TOKEN` from environment for Private Apps, implement OAuth 2.0 refresh token flow for user-facing apps, use v4 API for CRM objects, handle rate limits with exponential backoff, and properly paginate through list results.

## TL;DR Checklist

- [ ] Use `hubspot-api-client` SDK v8+ with Private App access token
- [ ] Use `HUBSPOT_ACCESS_TOKEN` environment variable for auth
- [ ] OAuth 2.0: Store refresh tokens securely, implement auto-refresh
- [ ] Use `crm.contacts.basic_api` for Contact CRUD operations
- [ ] Use `crm.companies.basic_api` for Company CRUD operations
- [ ] Use `crm.deals.basic_api` for Deal CRUD operations
- [ ] Use `crm.associations.v4` API for object associations
- [ ] Use `crm.objects.search` for CRM search with filters
- [ ] Use Batch API (`crm.contacts.batch_api`) for bulk operations
- [ ] Implement pagination with `after` cursor for list endpoints
- [ ] Handle 429 rate limit errors with exponential backoff
- [ ] Never log or expose access tokens or refresh tokens

