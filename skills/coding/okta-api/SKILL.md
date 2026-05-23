---
name: okta-api
description: Implements Okta API integration (Users, Groups, Applications, MFA, OAuth,
  Workflows) using okta Python SDK v3.4+ with async client patterns, pagination support,
  DPoP authentication, and SCIM provisioning workflows.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: okta api, okta users, okta groups, okta mfa, okta sso, how do i integrate
    okta, okta scim, user provisioning
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
  related-skills: coding-auth0-api, coding-entra-id-api, coding-aws-iam
------

# Okta API Integration (Users, Groups, Apps, MFA)

Implements production-grade Okta Management API integration using the `okta` Python SDK v3.4+. When loaded, this skill makes the model implement user lifecycle management (create, read, update, deactivate), group membership, application assignments, MFA factor enrollment and verification, OAuth authorization server management, and SCIM provisioning flows. All implementations follow Okta best practices: async client initialization, pagination for list operations, proper error handling with Okta API exceptions, rate limit headers monitoring, and DPoP (Demonstrating Proof of Possession) for token-bound authentication.

## TL;DR Checklist

- [ ] Use `okta.client.Client as OktaClient` from environment variables (`OKTA_ORG_URL`, `OKTA_API_TOKEN`)
- [ ] SDK v3.x uses async/await pattern (NOT v2.x synchronous methods)
- [ ] Handle `list_users()`, `list_applications()` with pagination via `paginate_all()` helper
- [ ] User operations return `(result, response, error)` tuple — always check `error` first
- [ ] Use `UserProfile`, `CreateUserRequest`, `PasswordCredential` Pydantic models for typed requests
- [ ] Monitor `x-rate-limit-remaining`, `x-rate-limit-reset` headers from responses
- [ ] Deactivate before deleting users (cannot delete active users directly)
- [ ] Use `next_login=CHANGEPASSWORD` when creating users with temporary passwords
- [ ] For MFA, enroll factors via `list_factors()`, then `enroll_factor()`, then `verify_factor()`

