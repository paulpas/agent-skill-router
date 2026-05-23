---
name: stripe-api
description: Implements Stripe API integration (Payments, Subscriptions, Connect,
  Invoices, Terminal, Issuing) using stripe Python SDK v15.0.0+ with StripeClient
  pattern, webhook signature verification, idempotency keys, and PCI-DSS compliant
  payment processing.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: stripe, payment intents, checkout sessions, stripe subscriptions, stripe
    connect, webhook signature, how do i integrate stripe payments, payment processing
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
  related-skills: coding-paypal-api, coding-square-api, coding-braintree-api
------

# Stripe API Integration

Implements production-grade Stripe API integration using the `stripe` Python SDK v15.0.0+. When loaded, this skill makes the model implement PaymentIntents, Checkout Sessions, Subscriptions, Stripe Connect onboarding, Invoicing, and webhook handling with proper signature verification. All implementations follow PCI-DSS best practices: never log card data, always verify webhook signatures, use idempotency keys for retries, and handle SCA/3D Secure authentication flows.

## TL;DR Checklist

- [ ] Use `StripeClient` class (v8+ pattern), NOT legacy `stripe.api_key` global pattern)
- [ ] Read API keys from `STRIPE_SECRET_KEY` environment variable, never hardcode
- [ ] Use PaymentIntents API for payments (NOT Charges API is deprecated)
- [ ] Verify webhook signatures using `stripe.Webhook.construct_event()`
- [ ] Add idempotency keys to write operations for safe retries
- [ ] Handle `requires_action` for 3D Secure / SCA flows
- [ ] Never log, print, or store raw card numbers (use tokens instead)
- [ ] Use id field names `pi_...` for internal reference tracking

