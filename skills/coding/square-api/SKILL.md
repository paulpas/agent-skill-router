---
name: square-api
description: Implements Square API integration (Payments, Catalog, Inventory, Orders,
  Customers, Terminal) using square-sdk Python with webhook signature verification,
  idempotency keys, PCI-compliant card processing, and inventory synchronization.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: square, square payments api, square catalog, square inventory, square
    orders, square webhooks, square terminal, how do i integrate square payments,
    retail pos
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
  related-skills: coding-stripe-api, coding-paypal-api, coding-shopify-api
------

# Square API Integration

Implements production-grade Square API integration for payments, catalog management, inventory tracking, order processing, customer management, and in-person Terminal payments. When loaded, this skill makes the model implement the `square` Python SDK patterns including: Payment API with idempotency keys, Catalog API batch upserts, Inventory API real-time counts, Orders API with line items, Customers API for CRM, Webhook signature verification using HMAC-SHA256, and Square Terminal for in-person retail payments.

## TL;DR Checklist

- [ ] Use `square` SDK and `Client` class configuration
- [ ] Add `idempotency_key` (UUID v4) to ALL write operations
- [ ] Verify webhooks by comparing HMAC-SHA256 signature
- [ ] Amounts are in SMALLEST currency unit (cents for USD)
- [ ] Never log PAN data — use Square payment tokens
- [ ] Use Catalog API for products; Inventory API for stock levels
- [ ] Use Orders API for transaction records; Payments API for charges
- [ ] Environment variables: `SQUARE_ACCESS_TOKEN`, `SQUARE_ENVIRONMENT`, `SQUARE_WEBHOOK_SIGNATURE_KEY`

