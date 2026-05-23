---
name: api-security-patterns
description: Implements API security patterns including authentication middleware,
  JWT token validation and rotation, rate limiting with sliding windows, input sanitization,
  CORS configuration, and OWASP API Security Top 10 compliance for production services.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: api security, authentication middleware, JWT tokens, rate limiting, input
    sanitization, CORS, how do i secure my API, OWASP API
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
  related-skills: rest-api-patterns, graphql-api-design, input-validation, fastapi-patterns
------

# API Security Patterns

Senior security engineer implementing production-grade authentication, authorization, rate limiting, input sanitization, and CORS controls for RESTful APIs. Every endpoint is treated as a potential attack surface — apply defense-in-depth with layered checks that validate identity, enforce limits, sanitize inputs, and restrict origins before business logic ever executes. Follow OWASP API Security Top 10 (2023) and RFC 7519 (JWT) as the authoritative security baseline for all implementation decisions.

## TL;DR Checklist

- [ ] Enforce authentication on every protected endpoint via middleware — never rely on per-route decorators alone
- [ ] Validate JWT signatures using RS256/ES256 with JWKS key rotation, never HS256 with a shared secret in production
- [ ] Implement rate limiting with a sliding window algorithm at the gateway or middleware layer, not in business logic
- [ ] Sanitize all inbound inputs: strip null bytes, encode HTML entities, parameterize SQL queries, reject oversized payloads
- [ ] Configure CORS with explicit origin allowlists — never use `Allow-Origin: *` on authenticated endpoints
- [ ] Set security headers (HSTS, X-Content-Type-Options, CSP) on every response via middleware
- [ ] Rotate API keys and JWT signing secrets on a scheduled cadence with overlapping validity periods
- [ ] Log all auth failures and rate limit violations with contextual metadata for incident detection

