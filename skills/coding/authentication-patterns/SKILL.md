---
name: authentication-patterns
description: Implements production-grade authentication systems including password
  hashing (bcrypt/argon2), JWT token lifecycle, OAuth 2.0 PKCE flows, secure session
  management, and MFA/TOTP for multi-factor verification.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: authentication, password hashing, JWT token, OAuth PKCE, session management,
    MFA, TOTP, two-factor, passkeys, login system, how do i implement auth, secure
    login, user authentication, token validation, webauthn
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
  - config
  - do-dont
  - examples
  related-skills: coding-security-review, coding-input-validation, coding-security-architecture
------

# Authentication Implementation Patterns

Implements production-grade authentication systems that handle identity verification securely. When loaded, the model acts as a senior backend engineer — writing concrete authentication code covering password hashing, JWT token lifecycles, OAuth 2.0/PKCE flows, secure session management, MFA/TOTP, and modern passwordless auth patterns using current best practices (OWASP Authentication Cheat Sheet 2025, NIST SP 800-63B).

## TL;DR Checklist

- [ ] Hash passwords with argon2id (or bcrypt with cost >= 12) — never store plaintext or use MD5/SHA
- [ ] Validate all JWT claims: `iss`, `aud`, `exp`, `nbf`, and algorithm whitelist — reject `alg:none`
- [ ] Use PKCE for all OAuth 2.0 flows, even public clients — generate code_verifier with cryptographically secure random bytes
- [ ] Store tokens in httpOnly, Secure, SameSite=Strict cookies for web apps — never localStorage for sensitive tokens
- [ ] Implement MFA fallback codes and rate-limit verification attempts (max 5 tries, exponential backoff)
- [ ] Set session timeout (idle 15 min, absolute 8 hours) and support explicit logout invalidation

