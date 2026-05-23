---
name: salesforce-api
description: Implements Salesforce API integration (REST, SOQL, Bulk API, Apex, using
  simple-salesforce Python SDK with record CRUD operations, SOQL queries, Bulk API
  for large datasets, Apex calls, and Salesforce REST API patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: salesforce, soql, salesforce api, simple salesforce, salesforce objects,
    salesforce bulk api, how do i integrate with salesforce, crm integration
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
  related-skills: coding-hubspot-api, coding-marketo-api, coding-zendesk-api
------

# Salesforce API Integration

Implements production-grade Salesforce integration using the `simple-salesforce` Python SDK and Salesforce REST API. When loaded, this skill makes the model implement CRUD operations on Salesforce objects (Accounts, Contacts, Opportunities, Leads, Cases, Custom Objects), SOQL queries, Bulk API for large datasets, Apex REST calls, and Salesforce Streaming API. All implementations follow Salesforce best practices: use `SF_INSTANCE_URL`, `SF_USERNAME`, `SF_PASSWORD`, `SF_SECURITY_TOKEN` from environment, query with `query_all()` for deleted/archived records, use Bulk API for >10,000 records, implement exponential backoff for rate limits, and handle Salesforce IDs (15-char vs 18-char IDs).

## TL;DR Checklist

- [ ] Use `simple-salesforce` SDK with credentials from environment variables
- [ ] Use `SF_INSTANCE_URL`, `SF_USERNAME`, `SF_PASSWORD`, `SF_SECURITY_TOKEN` for auth
- [ ] Use `Salesforce()` constructor with `domain='test'` for sandboxes
- [ ] Use `sf.query()` for SOQL queries, `sf.query_all()` to include deleted/archived
- [ ] Use `sf.<Object>.create()`, `.update()`, `.delete()`, `.get()` for CRUD
- [ ] Use `sf.bulk.<Object>.query()`, `.insert()`, `.update()`, `.delete()`, `.upsert()` for Bulk API
- [ ] Handle both 15-char (case-sensitive) and 18-char (case-insensitive) Salesforce IDs
- [ ] Implement exponential backoff for REQUEST_LIMIT_EXCEEDED errors
- [ ] Use `ALL ROWS` scope in SOQL for deleted/archived records
- [ ] Never store credentials or session IDs in code or logs

