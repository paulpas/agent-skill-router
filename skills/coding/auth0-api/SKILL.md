---
name: auth0-api
description: Implements Auth0 API integration (Authentication, Management API, Actions,
  Organizations, Universal Login) using auth0-python SDK v5.4+ with ManagementClient,
  async support, automatic token management, pagination, and CIAM workflows.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: auth0 api, auth0 management, auth0 authentication, auth0 universal login,
    auth0 actions, auth0 organizations, how do i integrate auth0, ciam
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
  related-skills: coding-okta-api, coding-entra-id-api, coding-aws-iam
------

# Auth0 API Integration (Authentication & Management)

Implements production-grade Auth0 API integration using the `auth0-python` SDK v5.4+. When loaded, this skill makes the model implement Authentication API flows (OAuth 2.0, OIDC, Authorization Code PKCE, Client Credentials, Device Authorization, Password Realm, Refresh Tokens) and Management API operations (Users, Roles, Permissions, Connections, Organizations, Actions, Hooks, Rules). All implementations follow Auth0 best practices: ManagementClient with automatic token management, async support via AsyncManagementClient, pagination for list operations, proper error handling with ApiError exceptions, rate limit header awareness, and security best practices (PKCE for native apps, state/nonce validation, short-lived access tokens).

## TL;DR Checklist

- [ ] Use `ManagementClient` from `auth0.management` with automatic token management
- [ ] v5.x uses hierarchical sub-clients (e.g., `client.users.list()`, NOT `client.users_all()`)
- [ ] Provide either `token` OR `client_id + client_secret` for auto token refresh
- [ ] Async: use `AsyncManagementClient` instead of `ManagementClient`
- [ ] Responses are Pydantic models — use `.model_dump()` to convert to dict
- [ ] List operations: `list()` returns paginated results via `SyncPager`/`AsyncPager`
- [ ] Authentication API: `GetToken` from `auth0.authentication` for all OAuth flows
- [ ] Organizations: pass `organization` parameter where applicable for multi-tenant
- [ ] Actions/Hooks/Rules: use `client.actions`, `client.hooks`, `client.rules` sub-clients
- [ ] Rate limits: Monitor `x-ratelimit-remaining`, `x-ratelimit-reset` headers

