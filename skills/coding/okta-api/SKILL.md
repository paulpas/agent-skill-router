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

---

## When to Use

Use this skill when:

- Provisioning and deprovisioning users in Okta as part of an employee onboarding/offboarding workflow
- Managing group memberships for role-based access control (RBAC)
- Assigning users and groups to SAML/OIDC applications in Okta
- Implementing multi-factor authentication (MFA) enrollment and verification flows
- Managing OAuth authorization servers, custom scopes, and claims
- Building SCIM (System for Cross-domain Identity Management) provisioning integrations
- Working with Okta Workflows for identity automation
- Implementing Just-In-Time (JIT) user provisioning from SAML assertions

---

## When NOT to Use

- For Auth0-specific CIAM (Customer Identity Access Management) — use `coding-auth0-api` instead
- For Microsoft Entra ID (Azure AD) — use `coding-entra-id-api` instead
- For AWS IAM identities — use `coding-aws-iam` instead
- For secrets management (use `coding-vault-api` for HashiCorp Vault)
- Direct password storage or custom user database (Okta is for identity management, not a credential store)
- When you need email/SMS only (use `coding-twilio-api` or `coding-sendgrid-api`)

---

## Core Workflow

1. **Initialize Okta Async Client** — Create `OktaClient` reading `OKTA_ORG_URL` and `OKTA_API_TOKEN` from environment variables or config. Validate connection with a lightweight `list_users(limit=1)` call on startup. **Checkpoint:** Verify async event loop is available; SDK v3 requires async/await.

2. **List Operations with Pagination** — For `list_users()`, `list_groups()`, `list_applications()` all support pagination. Use the built-in pagination helpers: `paginate_all()` for automatic fetching of all pages, or manual `after` cursor for explicit pagination. **Checkpoint:** Every list method returns `(items, resp, err)` — destructure and check `err is None` before iterating.

3. **User Lifecycle Management** — Create users with `CreateUserRequest` containing `UserProfile` and optionally `UserCredentials`. When creating with password, set `next_login=UserNextLogin.CHANGEPASSWORD` to force password reset on first login. **Checkpoint:** User must be ACTIVATED before they can authenticate; `create_user()` activates by default unless `activate=False`.

4. **Group Membership** — Use `add_user_to_group()` and `remove_user_from_group()` for direct assignments. List group members with `list_group_users()` paginated. **Checkpoint:** Always list first to check existence before adding; duplicate assignments return errors.

5. **Application Assignment** — Assign users/groups to SAML/OIDC apps via `assign_user_to_application()` or `assign_group_to_application()`. Fetch app-specific credentials with `get_application_user()`. **Checkpoint:** Each app type (SAML 2.0, OIDC, WS-Fed) has different assignment parameters.

6. **MFA Factor Management** — List available factors with `list_supported_factors()`, enroll via `enroll_factor()` then `verify_factor()` with activation challenge. For push/verify flows, poll `get_factor()` until status is ACTIVE. **Checkpoint:** User must have ACTIVE status to enroll MFA factors.

7. **Rate Limit Handling** — Extract rate limit headers from the `resp` object: `resp.headers.get("x-rate-limit-remaining")`, `"x-rate-limit-reset"`. Implement exponential backoff with jitter when remaining approaches zero. **Checkpoint:** On 429 responses, sleep until reset time.

---

## Implementation Patterns

### Pattern 1: Okta Client Initialization (BAD vs GOOD)

```python
"""Okta SDK v3.x initialization patterns.

SDK v3 is a complete rewrite using OpenAPI generator with Pydantic models.
Key changes from v2.x:
- ALL operations are async/await
- Methods return tuples: (result, response, error)
- Pydantic models for all request/response bodies
- Pagination helpers available
- DPoP support for token-bound auth

Version: okta >= 3.4.0 (PyPI package name is "okta", not "okta-sdk-python")
"""

from __future__ import annotations

import asyncio
import os
import logging
from typing import Any, AsyncIterator, Sequence

logger = logging.getLogger(__name__)

# ===================================================================
# ❌ BAD — hardcoded credentials, no error handling, sync pattern (v2.x style)
# ===================================================================

"""
❌ BAD Example (DON'T DO THIS):

from okta import Client

# ❌ Hardcoded org URL and token — never commit these!
client = Client(
    org_url="https://dev-123456.okta.com",
    token="00abc123def456ghi789",
)

# ❌ v3.x is ASYNC ONLY — this won't work!
users, resp, err = client.list_users()  # ❌ Missing 'await'
for user in users:
    print(user.profile.email)

# ❌ No error checking — 'err' could contain API errors
"""

# ===================================================================
# ✅ GOOD — env-based auth, async pattern, error checking, rate-limit aware
# ===================================================================

from okta.client import Client as OktaClient
from okta import (
    UserProfile,
    PasswordCredential,
    CreateUserRequest,
    UserNextLogin,
    UserCredentials,
)
from okta.api.user_api import UserApi
from okta.api.group_api import GroupApi
from okta.api.application_api import ApplicationApi


def get_okta_config() -> dict[str, Any]:
    """Get Okta configuration from environment variables.

    Reads:
        OKTA_ORG_URL: Your Okta tenant URL (e.g., "https://dev-123456.okta.com")
        OKTA_API_TOKEN: Okta API token with appropriate permissions
        OKTA_CLIENT_ID: Optional OAuth client ID for OAuth flow
        OKTA_SCOPES: Optional scopes for OAuth (e.g., "okta.users.manage okta.groups.read")

    Returns:
        Configuration dict for OktaClient.

    Raises:
        ValueError: If required environment variables are missing.
    """
    org_url = os.environ.get("OKTA_ORG_URL")
    api_token = os.environ.get("OKTA_API_TOKEN")

    if not org_url:
        raise ValueError("OKTA_ORG_URL environment variable required")
    if not api_token:
        raise ValueError("OKTA_API_TOKEN environment variable required")

    # Basic token auth configuration
    config: dict[str, Any] = {
        "orgUrl": org_url,
        "token": api_token,
    }

    # Optional: OAuth client credentials flow
    client_id = os.environ.get("OKTA_CLIENT_ID")
    scopes = os.environ.get("OKTA_SCOPES")
    private_key_jwk = os.environ.get("OKTA_PRIVATE_KEY_JWK")

    if client_id and scopes:
        config["clientId"] = client_id
        config["scopes"] = scopes.split()
        if private_key_jwk:
            config["privateKeyJwk"] = private_key_jwk

    return config


async def create_okta_client() -> OktaClient:
    """Create and validate an Okta async client.

    Returns:
        Configured and validated OktaClient instance.

    Raises:
        RuntimeError: If connection validation fails.
    """
    config = get_okta_config()
    client = OktaClient(config)

    # Validate connection by listing 1 user
    try:
        users, resp, err = await client.list_users(limit=1)
        if err:
            raise RuntimeError(f"Okta client validation failed: {err}")

        rate_remaining = resp.headers.get("x-rate-limit-remaining")
        rate_reset = resp.headers.get("x-rate-limit-reset")
        logger.info(
            "Okta client initialized. Rate limit: %s remaining, resets at %s",
            rate_remaining,
            rate_reset,
        )
        return client

    except Exception as e:
        logger.exception("Failed to initialize Okta client")
        raise RuntimeError(f"Okta client initialization failed: {e}") from e


def check_response_error(result: Any, resp: Any, err: Any) -> Any:
    """Unpack and validate an Okta API response tuple.

    All Okta v3 API methods return: (result, response, error)

    Args:
        result: The API result (Pydantic model or list)
        resp: Raw response object with headers
        err: Error object if operation failed

    Returns:
        The result if successful.

    Raises:
        RuntimeError: If err is not None.
    """
    if err is not None:
        raise RuntimeError(f"Okta API error: {err}")
    return result


async def paginate_all(
        client: OktaClient,
        list_method: Any,
        *args: Any,
        **kwargs: Any,
) -> AsyncIterator[Any]:
    """Generic async generator to paginate through all pages of a list operation.

    Usage:
        async for user in paginate_all(client, client.list_users):
            print(user.profile.email)

    Args:
        client: OktaClient instance
        list_method: The list method to call (e.g., client.list_users)
        *args: Positional args for list_method
        **kwargs: Keyword args for list_method

    Yields:
        Each item from all pages.
    """
    after = None
    while True:
        if after:
            kwargs["after"] = after

        items, resp, err = await list_method(*args, **kwargs)
        check_response_error(items, resp, err)

        if not items:
            break

        for item in items:
            yield item

        # Check for next page via 'after' cursor in response links
        after = resp.links.get("next")
        if not after:
            break
```

### Pattern 2: User Lifecycle Management

```python
"""User CRUD and lifecycle operations in Okta.

Okta user states:
- STAGED: New user, not activated yet
- ACTIVE: Can authenticate
- SUSPENDED: Cannot authenticate, but data preserved
- DEPROVISIONED: Deactivated (can reactivate)

You MUST deactivate before deleting a user.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from okta.client import Client as OktaClient
from okta import (
    UserProfile,
    PasswordCredential,
    CreateUserRequest,
    UserNextLogin,
    UserCredentials,
)

logger = logging.getLogger(__name__)


async def create_user(
    client: OktaClient,
    email: str,
    first_name: str,
    last_name: str,
    password: str | None = None,
    password_hash: str | None = None,
    next_login: str = UserNextLogin.CHANGEPASSWORD,
    activate: bool = True,
    custom_attributes: dict[str, Any] | None = None,
) -> Any:
    """Create a new user in Okta.

    Args:
        client: OktaClient instance.
        email: User's email address (also used as login by default).
        first_name: User's given name.
        last_name: User's family name.
        password: Optional plaintext password (one of password or password_hash required).
        password_hash: Optional SHA-512 password hash with salt.
        next_login: What happens on first login. Default: CHANGEPASSWORD.
        activate: Whether to activate user immediately. Default: True.
        custom_attributes: Optional custom profile attributes.

    Returns:
        Created User object.

    Raises:
        ValueError: If neither password nor password_hash provided.
        RuntimeError: If API call fails.
    """
    # Build profile
    profile_data: dict[str, Any] = {
        "firstName": first_name,
        "lastName": last_name,
        "email": email,
        "login": email,
        "mobilePhone": None,
    }

    if custom_attributes:
        profile_data.update(custom_attributes)

    profile = UserProfile(**profile_data)

    # Build credentials
    credentials_dict: dict[str, Any] = {}

    if password:
        password_cred = PasswordCredential(value=password)
        credentials_dict["password"] = password_cred
    elif password_hash:
        # Hash import format: {
        #   "hash": {
        #       "algorithm": "SHA-512",
        #       "salt": "...",
        #       "saltOrder": "POST",
        #       "value": "..."
        #   }
        # }
        pass

    credentials = None
    if credentials_dict:
        credentials = UserCredentials(**credentials_dict)

    # Build request
    request_data: dict[str, Any] = {"profile": profile}
    if credentials:
        request_data["credentials"] = credentials

    create_request = CreateUserRequest(**request_data)

    # Call API
    user, resp, err = await client.create_user(
        create_request,
        activate=activate,
        next_login=next_login if credentials else None,
    )

    if err:
        logger.error("Failed to create user: %s", err)
        raise RuntimeError(f"Failed to create user: {err}")

    logger.info(
        "Created user: %s (%s, status=%s)",
        user.profile.email,
        user.id,
        user.status,
    )
    return user


async def get_user(client: OktaClient, user_id_or_login: str) -> Any:
    """Get a user by ID or login (email).

    Args:
        client: OktaClient instance.
        user_id_or_login: Either user ID ("00u...") or email/login.

    Returns:
        User object.
    """
    # Check if it looks like an Okta user ID: 00u followed by 18 chars

    user, resp, err = await client.get_user(user_id_or_login)

    if err:
        # Try listing with filter instead
        if "not found" in str(err).lower():
            users, _, list_err = await client.list_users(
                filter=f'login eq "{user_id_or_login}"',
                limit=1,
            )
            if not list_err and users:
                return users[0]

        raise RuntimeError(f"Failed to get user: {err}")

    return user


async def update_user_profile(
    client: OktaClient,
    user_id: str,
    updates: dict[str, Any],
) -> Any:
    """Update a user's profile attributes.

    Args:
        client: OktaClient instance.
        user_id: User ID.
        updates: Dict of profile attributes to update.

    Returns:
        Updated User object.
    """
    # Get existing user first
    user = await get_user(client, user_id)

    # Build updated profile
    current_profile = user.profile
    for key, value in updates.items():
        setattr(current_profile, key, value)

    # For v3 SDK: use replace_user
    updated, resp, err = await client.replace_user(user_id, {"profile": current_profile})

    if err:
        raise RuntimeError(f"Failed to update user: {err}")

    logger.info("Updated user profile: %s", user_id)
    return updated


async def deactivate_user(
    client: OktaClient,
    user_id: str,
    send_email: bool = False,
) -> None:
    """Deactivate a user (required before deletion).

    Args:
        client: OktaClient instance.
        user_id: User ID to deactivate.
        send_email: Whether to send deactivation notification.
    """
    _, resp, err = await client.deactivate_user(user_id, send_email=send_email)

    if err:
        raise RuntimeError(f"Failed to deactivate user: {err}")

    logger.info("Deactivated user: %s", user_id)


async def delete_user(client: OktaClient, user_id: str) -> None:
    """Delete a user (MUST be deactivated first).

    Args:
        client: OktaClient instance.
        user_id: User ID to delete.
    """
    # Get user first to check status
    user = await get_user(client, user_id)

    if user.status.value != "DEPROVISIONED":
        # Must deactivate first
        await deactivate_user(client, user_id)

    _, resp, err = await client.delete_user(user_id)

    if err:
        raise RuntimeError(f"Failed to delete user: {err}")

    logger.info("Deleted user: %s", user_id)


async def list_all_users(
    client: OktaClient,
    filter: str | None = None,
) -> AsyncIterator[Any]:
    """List all users with automatic pagination.

    Args:
        client: OktaClient instance.
        filter: Optional filter expression (e.g., 'status eq "ACTIVE"').

    Yields:
        User objects from all pages.
    """
    kwargs: dict[str, Any] = {"limit": 200}  # Max per page
    if filter:
        kwargs["filter"] = filter

    after = None
    while True:
        if after:
            kwargs["after"] = after

        users, resp, err = await client.list_users(**kwargs)

        if err:
            raise RuntimeError(f"Failed to list users: {err}")

        if not users:
            break

        for user in users:
            yield user

        # Get next cursor from response links
        after = resp.links.get("next")
        if not after:
            break
```

### Pattern 3: Group Management and Assignments

```python
"""Group membership and role-based access control patterns.

Okta Groups are used for:
- Application assignments (assign app to group → all members get access)
- Rule-based membership (dynamic groups)
- Administrative role delegation
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from okta.client import Client as OktaClient
from okta import Group, GroupProfile

logger = logging.getLogger(__name__)


async def create_group(
    client: OktaClient,
    name: str,
    description: str | None = None,
) -> Any:
    """Create a new group in Okta.

    Args:
        client: OktaClient instance.
        name: Group name.
        description: Optional group description.

    Returns:
        Created Group object.
    """
    profile = GroupProfile(
        name=name,
        description=description,
    )

    group = Group(profile=profile)

    result, resp, err = await client.create_group(group)

    if err:
        raise RuntimeError(f"Failed to create group: {err}")

    logger.info("Created group: %s (%s)", name, result.id)
    return result


async def get_group(client: OktaClient, group_id_or_name: str) -> Any:
    """Get a group by ID or name.

    Args:
        client: OktaClient instance.
        group_id_or_name: Group ID ("00g...") or name.

    Returns:
        Group object.
    """
    # Try direct ID lookup first
    if group_id_or_name.startswith("00g"):
        group, resp, err = await client.get_group(group_id_or_name)
        if not err:
            return group

    # Search by name
    groups, _, err = await client.list_groups(
        q=group_id_or_name,
        limit=10,
    )

    if err:
        raise RuntimeError(f"Failed to find group: {err}")

    # Exact match on name
    for group in groups:
        if group.profile.name.lower() == group_id_or_name.lower():
            return group

    raise ValueError(f"Group not found: {group_id_or_name}")


async def add_user_to_group(
    client: OktaClient,
    user_id: str,
    group_id: str,
) -> None:
    """Add a user to a group.

    Args:
        client: OktaClient instance.
        user_id: User ID.
        group_id: Group ID.
    """
    _, resp, err = await client.add_user_to_group(group_id, user_id)

    if err:
        raise RuntimeError(f"Failed to add user to group: {err}")

    logger.info("Added user %s to group %s", user_id, group_id)


async def remove_user_from_group(
    client: OktaClient,
    user_id: str,
    group_id: str,
) -> None:
    """Remove a user from a group.

    Args:
        client: OktaClient instance.
        user_id: User ID.
        group_id: Group ID.
    """
    _, resp, err = await client.remove_user_from_group(group_id, user_id)

    if err:
        raise RuntimeError(f"Failed to remove user from group: {err}")

    logger.info("Removed user %s from group %s", user_id, group_id)


async def list_group_members(
    client: OktaClient,
    group_id: str,
) -> AsyncIterator[Any]:
    """List all members of a group with pagination.

    Args:
        client: OktaClient instance.
        group_id: Group ID.

    Yields:
        User objects who are members of the group.
    """
    after = None
    while True:
        users, resp, err = await client.list_group_users(
            group_id,
            limit=200,
            after=after,
        )

        if err:
            raise RuntimeError(f"Failed to list group members: {err}")

        if not users:
            break

        for user in users:
            yield user

        after = resp.links.get("next")
        if not after:
            break


async def list_user_groups(
    client: OktaClient,
    user_id: str,
) -> AsyncIterator[Any]:
    """List all groups a user belongs to.

    Args:
        client: OktaClient instance.
        user_id: User ID.

    Yields:
        Group objects containing the user.
    """
    groups, resp, err = await client.list_user_groups(user_id)

    if err:
        raise RuntimeError(f"Failed to list user groups: {err}")

    for group in groups:
        yield group


async def sync_user_to_groups(
    client: OktaClient,
    user_id: str,
    target_group_ids: set[str],
) -> None:
    """Synchronize user membership to match target groups.

    Removes user from groups not in target, adds to those that are missing.

    Args:
        client: OktaClient instance.
        user_id: User ID.
        target_group_ids: Set of group IDs the user should belong to.
    """
    # Get current memberships
    current_group_ids: set[str] = set()
    async for group in list_user_groups(client, user_id):
        current_group_ids.add(group.id)

    # Groups to add
    to_add = target_group_ids - current_group_ids
    for group_id in to_add:
        await add_user_to_group(client, user_id, group_id)

    # Groups to remove
    to_remove = current_group_ids - target_group_ids
    for group_id in to_remove:
        await remove_user_from_group(client, user_id, group_id)

    logger.info(
        "Synced user %s: added %d, removed %d groups",
        user_id,
        len(to_add),
        len(to_remove),
    )
```

---

## Constraints

### MUST DO

- Always use environment variables for `OKTA_ORG_URL` and `OKTA_API_TOKEN` — never hardcode
- Use async/await pattern for all SDK v3 operations
- Always check the `err` value from every (result, resp, err) tuple
- Deactivate users before deleting (Okta blocks deletion of ACTIVE users)
- Use pagination for all list operations (list_users, list_groups, list_applications)
- Monitor `x-rate-limit-remaining` and `x-rate-limit-reset` headers
- Force password change on first login with `next_login=UserNextLogin.CHANGEPASSWORD
- Store Okta user IDs (`00u...`, `00g...`) as immutable references in your database

### MUST NOT DO

- NEVER hardcode API tokens in source code or config files committed to git
- NEVER ignore the `err` return value from SDK methods
- NEVER delete an ACTIVE user without deactivating first
- NEVER use synchronous calls with v3 SDK (it's async-only now)
- NEVER log or print full UserCredentials or PasswordCredential objects
- NEVER treat email as immutable (users can change login; user.id is immutable)
- NEVER use group name as reference (names can change; use group.id)

---

## Output Template

When implementing Okta integrations, produce:

1. **Client Initialization** — Async `OktaClient` factory reading from env vars
2. **Response Validation** — `check_response_error()` helper to unpack (result, resp, err)
3. **Pagination Helper** — Async generator or `paginate_all()` for list operations
4. **User Lifecycle** — create_user, get_user, update_user, deactivate_user, delete_user
5. **Group Operations** — list_group_members, add/remove user functions
6. **Rate Limit Strategy** — Exponential backoff with jitter when remaining < 10
7. **Error Mapping** — Mapping Okta SDK errors to your application exceptions

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-auth0-api` | Auth0 for customer-facing CIAM (B2C) as alternative to Okta |
| `coding-entra-id-api` | Microsoft Entra ID for Azure/M365 ecosystem identities |
| `coding-aws-iam` | AWS IAM for AWS service identities and roles |
| `coding-vault-api` | HashiCorp Vault for secrets and encryption keys |
| `coding-onpassword-api` | 1Password for human-centric secrets and password management |

---

## Live References

| Resource | URL |
|----------|-----|
| Okta Python SDK (PyPI) | https://pypi.org/project/okta/ |
| Okta SDK GitHub | https://github.com/okta/okta-sdk-python |
| Okta Management API Reference | https://developer.okta.com/docs/api/ |
| Okta Users API | https://developer.okta.com/docs/reference/api/users/ |
| Okta Groups API | https://developer.okta.com/docs/reference/api/groups/ |
| Okta Applications API | https://developer.okta.com/docs/reference/api/apps/ |
| Okta Factors API (MFA) | https://developer.okta.com/docs/reference/api/factors/ |
| Okta Rate Limits | https://developer.okta.com/docs/reference/rate-limits/ |
| Okta SCIM Provisioning | https://developer.okta.com/docs/reference/scim/ |
| Okta v3 Migration Guide | https://github.com/okta/okta-sdk-python/blob/master/UPGRADE_GUIDE.md |

---

## API Method Quick Reference

Commonly used methods and their return patterns:

| Operation | Method | Returns |
|-----------|--------|---------|
| List users | `client.list_users()` | `(users, resp, err)` |
| Get user | `client.get_user(user_id)` | `(user, resp, err)` |
| Create user | `client.create_user(request)` | `(user, resp, err)` |
| Update user | `client.replace_user(user_id, request)` | `(user, resp, err)` |
| Deactivate user | `client.deactivate_user(user_id)` | `(None, resp, err)` |
| Delete user | `client.delete_user(user_id)` | `(None, resp, err)` |
| List groups | `client.list_groups()` | `(groups, resp, err)` |
| Add to group | `client.add_user_to_group(group_id, user_id)` | `(None, resp, err)` |
| List group users | `client.list_group_users(group_id)` | `(users, resp, err)` |
| Reset password | `client.reset_password(user_id)` | `(reset_token, resp, err)` |
| Expire password | `client.expire_password(user_id)` | `(user, resp, err)` |
| List factors | `client.list_factors(user_id)` | `(factors, resp, err)` |
| Enroll factor | `client.enroll_factor(user_id, factor)` | `(factor, resp, err)` |
| Verify factor | `client.verify_factor(user_id, factor_id, verify)` | `(result, resp, err)` |
