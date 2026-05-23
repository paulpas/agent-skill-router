---
name: shopify-api
description: Implements Shopify API integration (Products, Orders, Customers, Storefront
  GraphQL, Admin REST) using shopifyapi Python SDK with OAuth 2.0 flow, webhook HMAC
  verification, cursor pagination, and ecommerce platform data synchronization patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: shopify, shopify admin api, shopify storefront graphql, shopify products,
    shopify orders, shopify webhooks, shopify oauth, how do i integrate shopify api,
    ecommerce platform
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
  related-skills: coding-stripe-api, coding-square-api, coding-paypal-api
------

# Shopify API Integration

Implements production-grade Shopify API integration for Admin REST API, Admin GraphQL API, and Storefront API. When loaded, this skill makes the model implement the `shopifyapi` Python SDK patterns including: OAuth 2.0 app installation flow (authorization_code grant), Admin REST API with cursor-based pagination (`page_info`, `limit`), Admin GraphQL API with rate limit handling, Storefront API for customer-facing experiences, webhook HMAC-SHA256 signature verification, API versioning (`2024-01`, etc.), and private app vs custom app authentication patterns.

## TL;DR Checklist

- [ ] Use `shopifyapi` Python SDK (`pip install ShopifyAPI`)
- [ ] OAuth flow: `redirect to /admin/oauth/authorize` → `POST /admin/oauth/access_token`
- [ ] API versioning: use YYYY-MM format in `api_version` (e.g., `"2024-01"`)
- [ ] Webhook verification: HMAC-SHA256 of request body with API_SECRET_KEY
- [ ] Cursor pagination: `page_info` param; use `Link` header for prev/next
- [ ] Private apps: use `API_KEY` + `PASSWORD` (deprecated; prefer custom apps)
- [ ] Custom apps: use access token from OAuth flow
- [ ] Storefront API: uses separate `StorefrontAccessToken`, not Admin token
- [ ] Environment variables: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_API_VERSION`, `SHOPIFY_SCOPES`

