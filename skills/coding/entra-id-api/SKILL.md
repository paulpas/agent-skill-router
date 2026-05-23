---
name: entra-id-api
description: Implements Microsoft Entra ID (Azure AD) API integration (Users, Groups,
  Applications, Service Principals, Conditional Access, B2C) using msgraph-sdk Python
  + azure.identity with MSAL authentication patterns, Graph API batches, delta queries,
  and RBAC.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: microsoft entra id, azure active directory, ms graph api, azure ad users,
    azure ad groups, microsoft graph, how do i integrate azure ad, conditional access
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
  related-skills: coding-okta-api, coding-auth0-api, coding-aws-iam
------

# Microsoft Entra ID (Azure AD) Integration

Implements production-grade Microsoft Entra ID (Azure Active Directory) integration using the `msgraph-sdk` Python SDK with `azure.identity` for authentication, plus `msal` library patterns when needed. When loaded, this skill makes the model implement user and group lifecycle management (CRUD, membership), application and service principal operations, Conditional Access policies, B2C user flows, OAuth2 permission grants, role assignments, delta query synchronization, batch requests with $batch, and RBAC (role-based access control) at tenant and resource levels. All implementations follow Microsoft Graph best practices: use `ClientSecretCredential` or `DefaultAzureCredential` for auth, proper scopes like `https://graph.microsoft.com/.default`, paging with `@odata.nextLink`, batch requests via `BatchRequestContent`, delta queries for sync scenarios, and throttling/retry handling with `Retry-After` header awareness.

## TL;DR Checklist

- [ ] Use `msgraph` SDK: `from msgraph import GraphServiceClient`
- [ ] Use `azure.identity` credentials: `ClientSecretCredential`, `DefaultAzureCredential`, `DeviceCodeCredential`
- [ ] Scopes format: `["https://graph.microsoft.com/.default"]` for app-only permissions
- [ ] Graph API uses async/await pattern: `await client.users.get()`
- [ ] Pagination: check for `odata_next_link` and use `.with_url()` to get next pages
- [ ] Use `$select` to limit response fields (reduces payload size, faster)
- [ ] Use `$batch` via `BatchRequestContent` for multiple requests in one call
- [ ] Delta queries: `delta()` function on collections for sync scenarios
- [ ] B2C: Use Microsoft Graph with B2C tenant; flows available via `identity/userFlows`
- [ ] App roles: Define in app manifest, assign via `appRoleAssignments`
- [ ] Throttling: Catch 429, read `Retry-After` header, implement exponential backoff

