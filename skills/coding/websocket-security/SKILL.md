---
name: websocket-security
description: Hardens WebSocket connections against cross-site hijacking, DoS attacks,
  and message flooding through origin validation, authentication, rate limiting, connection
  limits, and secure transport enforcement.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: websocket security, origin validation, cross-site WebSocket hijacking,
    CCoS, wss://, WebSocket authentication, rate limiting, message flooding, slowloris,
    connection limits, WebSocket auth, Sec-WebSocket-Origin
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
  related-skills: websocket-manager, websocket-protocol
------

# WebSocket Security Hardening Guide

Hardens WebSocket connections against cross-site hijacking (CCoS), denial-of-service attacks, message flooding, and authentication bypasses. Covers origin validation, token-based auth over WebSocket, per-connection and per-client rate limiting, connection limits by IP and user, secure transport enforcement (wss:// only), protection against slowloris-style attacks, and message size constraints to prevent memory exhaustion.

## TL;DR Checklist

- [ ] Validate Origin header against an allowlist — reject mismatches at the HTTP upgrade stage
- [ ] Require authentication tokens in the handshake query string or first message before accepting the connection
- [ ] Enforce per-client message rate limits (e.g., 100 messages/sec) with burst allowance
- [ ] Set maximum connections per IP and per authenticated user to prevent resource exhaustion
- [ ] Limit message sizes to a configurable ceiling — reject oversized payloads immediately
- [ ] Enforce wss:// for all production connections; block plaintext ws:// in non-dev environments

