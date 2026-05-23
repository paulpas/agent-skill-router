---
name: vault-api
description: Implements HashiCorp Vault API integration (KV Secrets Engine, PKI, Transit,
  Auth Methods, Leasing & Renewal) using hvac Python SDK v2.4+ with proper authentication,
  secret leasing, TTL management, and encryption as a service patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: hashicorp vault, hvac python, vault kv secrets, vault pki, vault transit,
    how do i use vault, vault leasing, secret management
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
  related-skills: coding-aws-iam, coding-onepassword-api, coding-entra-id-api
------

# HashiCorp Vault Integration (Secrets Management)

Implements production-grade HashiCorp Vault integration using the `hvac` Python SDK v2.4+. When loaded, this skill makes the model implement KV (Key/Value) secrets engine v1/v2 operations, Transit (encryption as a service), PKI (certificate generation), AppRole authentication, Token auth, LDAP/Kubernetes auth methods, secret leasing and renewal, TTL management, and response wrapping. All implementations follow Vault best practices: use environment variables for auth, proper token lifecycle management (lease renewal, revoke on exit), short-lived dynamic secrets instead of long-lived credentials, encryption/decryption via Transit (never roll your own crypto), and wrapping tokens for secure one-time delivery.

## TL;DR Checklist

- [ ] Use `hvac.Client(url=..., token=...)` or auth method for initializing
- [ ] Read `VAULT_ADDR` and `VAULT_TOKEN` from environment (never hardcode)
- [ ] KV v2: `client.secrets.kv.v2.read_secret_version()`, `create_or_update_secret()`
- [ ] KV v1: `client.secrets.kv.v1.read_secret()`, `create_or_update_secret()`
- [ ] Transit: `client.secrets.transit.encrypt_data()`, `decrypt_data()`
- [ ] PKI: `client.secrets.pki.generate_certificate()`, `sign_intermediate()`
- [ ] Auth methods: `client.auth.approle.login()`, `token.create()`, `ldap.login()`, `kubernetes.login()`
- [ ] Leasing: `client.sys.renew_secret()`, `sys.renew_token()`, `sys.revoke_secret()`
- [ ] Wrapping: `client.secrets.kv.v2.create_or_update_secret(..., wrap_ttl='60s')` then `client.sys.unwrap()`
- [ ] Always revoke leased secrets when done (try/finally pattern)
- [ ] Never log or print secrets or tokens
- [ ] Use short TTLs and rotate/renew periodically

