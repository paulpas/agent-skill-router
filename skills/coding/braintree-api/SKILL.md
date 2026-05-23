---
name: braintree-api
description: Implements Braintree API integration (Transactions, Vault, Subscriptions,
  Marketplace) using braintree Python SDK with 3D Secure verification, webhook signature
  validation, payment method tokenization, and PayPal/Venmo payment processing patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: braintree, braintree transactions, braintree vault, braintree subscriptions,
    braintree marketplace, 3d secure, braintree webhooks, how do i integrate braintree
    payments, paypal venmo integration
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
  related-skills: coding-stripe-api, coding-paypal-api, coding-adyen-api
------

# Braintree API Integration

Implements production-grade Braintree API integration for Transactions, Vault (payment method storage), Subscriptions, and Marketplace (Braintree Commerce Platform). When loaded, this skill makes the model implement the `braintree` Python SDK patterns including: Client token generation for Drop-in UI, Payment method nonce tokenization, Transaction sale with 3D Secure (3DS), Vault storage of cards/PayPal accounts, Subscription billing with plans and add-ons, Marketplace split payments with sub-merchants, and webhook signature validation using the Braintree SDK's built-in verifier.

## TL;DR Checklist

- [ ] Use `braintree` Python SDK (`pip install braintree`)
- [ ] Environment: `braintree.Environment.Sandbox` or `Production`
- [ ] Flow: Generate `client_token` → frontend Drop-in/Hosted Fields → `payment_method_nonce` → backend `transaction.sale()`
- [ ] 3D Secure: `options.three_d_secure.pass_thru=True` or challenge requested
- [ ] Webhook verification: `braintree.WebhookNotification.parse()` using public key
- [ ] Vault: Store cards with `payment_method.create()` → `token` for future charges
- [ ] Marketplace: `merchant_account_id` for sub-merchant, `service_fee_amount` for platform cut
- [ ] Environment vars: `BRAINTREE_MERCHANT_ID`, `BRAINTREE_PUBLIC_KEY`, `BRAINTREE_PRIVATE_KEY`, `BRAINTREE_ENVIRONMENT`

