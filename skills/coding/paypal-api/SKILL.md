---
name: paypal-api
description: Implements PayPal API integration (Orders, Payments, Subscriptions, Payouts,
  Disputes) using paypal-checkout-serversdk or paypalrestsdk with webhook verification,
  payment capture, and subscription lifecycle management.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: paypal, paypal orders api, paypal subscriptions, paypal payouts, paypal
    webhook verification, capture payment, how do i integrate paypal payments, paypal
    checkout
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
  related-skills: coding-stripe-api, coding-braintree-api, coding-square-api
------

# PayPal API Integration

Implements production-grade PayPal API integration using the official PayPal Python SDKs. When loaded, this skill makes the model implement Orders v2 API for one-time payments, Subscriptions API for recurring billing, Payouts API for mass payments, and webhook handling with signature verification. All implementations follow PayPal security best practices: verify webhook signatures, capture authorized payments before fulfillment, handle payment status transitions, and never expose client secrets to frontend code.

## TL;DR Checklist

- [ ] Use Orders v2 API (NOT v1 deprecated)
- [ ] Create order with `intent: "CAPTURE"` or `intent: "AUTHORIZE"`
- [ ] Capture authorized payments BEFORE fulfilling orders
- [ ] Verify webhooks using `verify_webhook_signature`
- [ ] Use `PayPalHttpClient` from checkout SDK (not requests directly)
- [ ] Store `order_id` (`...`) and `capture_id` for tracking
- [ ] Handle `APPROVED` → `COMPLETED` status transitions
- [ ] NEVER hardcode client_id and client_secret in source

