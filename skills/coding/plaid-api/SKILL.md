---
name: plaid-api
description: Implements Plaid API integration (Auth, Transactions, Identity, Investments,
  Income) using plaid-python SDK with Link token flow, webhook verification, access
  token storage security, and financial data synchronization patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: plaid, plaid link, plaid auth, plaid transactions, plaid identity, plaid
    investments, plaid income verification, how do i integrate plaid, bank account
    linking
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
  related-skills: coding-stripe-api, coding-shopify-api, coding-paypal-api
------

# Plaid API Integration

Implements production-grade Plaid API integration for bank account linking, transaction data retrieval, identity verification, investment holdings, and income confirmation. When loaded, this skill makes the model implement the `plaid-python` SDK including: Link token creation and frontend Link flow, access token exchange and secure storage, Auth API for account/routing numbers, Transactions API for syncing bank transactions, Identity API for owner verification, Investments API for portfolio data, Income API for employment/income verification, and webhook verification using HMAC-SHA256.

## TL;DR Checklist

- [ ] Use `plaid-python` SDK (not raw HTTP requests)
- [ ] Create `link_token` first; exchange `public_token` → `access_token`
- [ ] Store `access_token` securely (encrypted at rest, NEVER log)
- [ ] Use `client_id`, `secret`, `environment` from environment variables
- [ ] Verify webhooks via `plaid_client.validate_webhook(verification_key, body, headers)`
- [ ] Cursor-based pagination for Transactions sync (`cursor`, `has_more`)
- [ ] Link flow: server creates token → frontend Link → server exchanges public_token
- [ ] Environment: `Sandbox` → `Development` → `Production`

