---
name: adyen-api
description: Implements Adyen API integration (Payments, Checkout, Marketplaces, Risk,
  Reporting) using adyen Python SDK with 3D Secure 2 authentication flow, webhook
  signature verification, idempotency keys, and global enterprise payment processing
  patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: adyen, adyen checkout api, adyen payments, 3d secure 2, adyen webhook
    verification, adyen marketplaces, adyen risk management, how do i integrate adyen
    payments, global payment processing
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
  related-skills: coding-stripe-api, coding-paypal-api, coding-braintree-api
------

# Adyen API Integration

Implements production-grade Adyen API integration for global enterprise payments including Checkout API, Payments API, Marketplaces (Adyen for Platforms), Risk Management, and Financial Reporting. When loaded, this skill makes the model implement the `adyen` Python SDK patterns including: `/sessions` for hosted checkout drop-in, `/payments` for direct API integration, 3D Secure 2 handling flow, `/payments/details` for handling authentication results, webhook HMAC signature verification, idempotency keys for safe retries, and Marketplace API for split payments and onboarding.

## TL;DR Checklist

- [ ] Use `adyen` Python SDK (`pip install adyen`)
- [ ] Environment variables: `ADYEN_API_KEY`, `ADYEN_MERCHANT_ACCOUNT`, `ADYEN_CLIENT_KEY`, `ADYEN_ENVIRONMENT`, `ADYEN_HMAC_KEY`
- [ ] Modern flow: `/sessions` → Drop-in/Components → `notification` webhook
- [ ] Classic flow: `/payments` → handle `action` → `/payments/details` → webhook
- [ ] Webhook verification: compute HMAC-SHA256 of `pspReference + eventCode + success + ...`
- [ ] Add `idempotency-key` header to write operations
- [ ] Store `pspReference` for tracking, refunds, and reconciliation
- [ ] Always use `merchantAccount` parameter in every payment request

