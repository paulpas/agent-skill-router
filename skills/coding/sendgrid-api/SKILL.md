---
name: sendgrid-api
description: Integrates Twilio SendGrid API (Mail Send, Dynamic Templates, Marketing
  Campaigns, Inbound Parse, Event Webhooks) using the sendgrid Python SDK v6.x with
  proper mail construction and deliverability patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: sendgrid, send email, transactional email, sendgrid api, email templates,
    dynamic templates, email delivery, marketing campaigns
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
  related-skills: coding-twilio-api, coding-mailgun-api, coding-slack-api
------

# SendGrid Email API Integration

Integrates Twilio SendGrids Mail Send API, Dynamic Templates, Marketing Campaigns, and Inbound Parse using the `sendgrid` Python SDK v6.x. When loaded, this skill makes the model implement email delivery with proper Mail helper construction, dynamic template personalization, attachment handling, async sending, event webhook processing, and deliverability optimization.

## TL;DR for Code Generation

- [ ] Initialize `SendGridAPIClient` from `SENDGRID_API_KEY` environment variable — never hardcode the key
- [ ] Use `Mail` helper from `sendgrid.helpers.mail` to construct messages, not raw dicts
- [ ] Use Dynamic Templates via `template_id` + `personalization.dynamic_template_data` for production emails
- [ ] Validate email addresses with `Email` helper — set a `from` name and email that is verified in SendGrid
- [ ] Set `tracking_settings` explicitly — enable click tracking, open tracking, and Google Analytics per-message
- [ ] Catch `sgrest.exceptions.BadRequestsError` for API errors and inspect the response body
- [ ] Use `mail_settings` to enable sandbox mode for testing (bypasses sending, validates the request)

