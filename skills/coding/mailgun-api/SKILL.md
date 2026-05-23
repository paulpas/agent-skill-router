---
name: mailgun-api
description: Integrates Mailgun API (Messages, Routes, Email Validation, Suppression
  List, Analytics) using the official mailgun-python SDK v1.7+ with proper REST patterns,
  MIME handling, and deliverability optimization.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: mailgun, mailgun api, send email, email validation, email routing, transactional
    email, inbound email, mailgun python
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
  related-skills: coding-sendgrid-api, coding-twilio-api, coding-slack-api
------

# Mailgun Email API Integration

Integrates the Mailgun API (Messages, Routes, Email Validation, Suppression List, Events/Analytics) using the official `mailgun` Python SDK v1.7+ and direct requests for legacy endpoints. When loaded, this skill makes the model implement email operations with proper REST API patterns, MIME construction, attachment handling, webhook signature validation, batch sending, and deliverability optimization.

## TL;DR for Code Generation

- [ ] Initialize `Client` with `auth=("api", os.environ["MAILGUN_API_KEY"])` — never hardcode the key
- [ ] Use `client.messages.create()` for sending — always include at least `text`, `html`, or `template` parameter
- [ ] Set `o:tag` for analytics categorization and `o:tracking` for open/click tracking
- [ ] Validate email addresses with the Email Validation API before sending to new recipients
- [ ] Handle suppression (bounces, complaints, unsubscribes) before every batch send
- [ ] Catch `requests.exceptions.RequestException` for network errors; inspect JSON response for API errors
- [ ] Use Mailgun webhook signatures (HMAC SHA-256) to validate incoming event callbacks

