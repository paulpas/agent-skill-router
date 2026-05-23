---
name: twilio-api
description: Integrates Twilio API (SMS, Voice, WhatsApp, Verify, Conversations, Video)
  using the twilio-python SDK v9.x with proper client initialization, TwiML generation,
  and webhook validation.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: twilio, sms api, send sms, whatsapp api, twilio verify, phone verification,
    twilio voice, twilio webhooks
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
  related-skills: coding-sendgrid-api, coding-slack-api, coding-mailgun-api
------

# Twilio API Integration (SMS, Voice, WhatsApp, Verify)

Integrates the Twilio Communications API — SMS, Voice, WhatsApp, Verify (2FA), Conversations, and Video — using the `twilio` Python SDK v9.x. When loaded, this skill makes the model implement Twilio operations with proper client initialization, TwiML generation, webhook signature validation, error handling, and async patterns.

## TL;DR for Code Generation

- [ ] Initialize `Client()` from environment with `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` — never hardcode credentials
- [ ] Use `twilio.rest.Client` for REST API calls and `twilio.twiml` for TwiML response generation
- [ ] Validate incoming webhooks with `RequestValidator` to prevent request forgery
- [ ] Wrap API calls in try/except catching `TwilioRestException` with status codes
- [ ] Use message `status_callback` for delivery confirmation instead of polling
- [ ] Implement exponential backoff for transient 429 rate-limit responses
- [ ] For WhatsApp, use `messaging_service_sid` with a pre-configured Messaging Service for content templates

