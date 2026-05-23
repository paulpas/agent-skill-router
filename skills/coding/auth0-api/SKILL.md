---
name: auth0-api
description: Implements Auth0 API integration (Authentication, Management API, Actions, Organizations, Universal Login) using auth0-python SDK v5.4+ with ManagementClient, async support, automatic token management, pagination, and CIAM workflows.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: auth0 api, auth0 management, auth0 authentication, auth0 universal login, auth0 actions, auth0 organizations, how do i integrate auth0, ciam
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-okta-api, coding-entra-id-api, coding-aws-iam
---

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

---

## When to Use

Use this skill when:

- Building customer identity access management (CIAM) for consumer-facing applications
- Implementing OAuth 2.0 / OIDC authentication flows for web, mobile, or SPA apps
- Managing users, roles, and permissions via Auth0 Management API
- Creating and deploying Auth0 Actions for custom login/post-login logic
- Setting up multi-tenant SaaS with Auth0 Organizations
- Configuring social identity providers (Google, Facebook, Apple, GitHub, etc.)
- Implementing passwordless login via email or SMS
- Building device authorization flows for TV/limited-input devices
- Using Auth0 as an authorization server for custom APIs with RBAC
- Migrating user databases to Auth0 with bulk user import/export

---

## When NOT to Use

- For workforce/employee identity (Okta, Entra ID are better) — use `coding-okta-api` or `coding-entra-id-api`
- For AWS IAM identities — use `coding-aws-iam`
- For Microsoft Entra ID (Azure AD) — use `coding-entra-id-api`
- When you need on-prem only deployment (Auth0 is cloud-only)
- For simple password storage (use bcrypt/argon2 directly for trivial apps)
- For sending email/SMS only (use `coding-sendgrid-api`, `coding-twilio-api`)

---

## Core Workflow

1. **Initialize ManagementClient** — Create `ManagementClient(domain, client_id=..., client_secret=...)` with client credentials for automatic token management, or pass existing `token`. Use `AsyncManagementClient` for async apps. **Checkpoint:** Validate with `client.users.list(per_page=1)` call.

2. **Authentication Flow Selection** — Choose the OAuth flow based on app type:
   - Regular Web App: Authorization Code flow
   - SPA / Mobile: Authorization Code + PKCE
   - M2M / Backend: Client Credentials
   - TV / IoT: Device Authorization
   - Legacy: Password Realm (NOT RECOMMENDED — use only if no other option)
   **Checkpoint:** Validate flow security requirements: PKCE REQUIRED for public clients.

3. **User Management** — CRUD operations via `client.users.create()`, `get()`, `update()`, `delete()`. Search with `q` parameter using Lucene syntax. **Checkpoint:** User IDs are `auth0|...` for database users, `google-oauth2|...` for social, etc. — treat as immutable.

4. **Role-Based Access Control (RBAC)** — Create roles via `client.roles.create()`, assign to users via `client.users.add_roles()`, check permissions in tokens with rules/actions. **Checkpoint:** Enable RBAC in API settings and Add Permissions in Access Token setting.

5. **Organizations for B2B Multi-Tenant** — Use `client.organizations.create()`, add members via `organizations.add_members()`, assign org roles, enable organization login flow. **Checkpoint:** When authenticating organization members, pass `organization` parameter to `/authorize`.

6. **Actions & Custom Logic** — Deploy Auth0 Actions for extensibility points: post-login, pre-user-registration, post-change-password, send-phone-message, etc. Use `client.actions.create()`, `deploy_version()`. **Checkpoint:** Actions replace Rules/Hooks (deprecated but still supported).

7. **Rate Limit & Error Handling** — Catch `ApiError` from `auth0.management.core.api_error`. Access headers via `.headers` on responses. Implement exponential backoff on 429, 5xx. **Checkpoint:** Management API default: 2 requests/second, 50 requests/minute.

---

## Implementation Patterns

### Pattern 1: Auth0 Client Initialization (BAD vs GOOD)

```python
"""Auth0 Python SDK v5.x initialization patterns.

SDK v5 is a complete Fern-generated rewrite with significant changes:
- Pydantic models for all request/response bodies
- Hierarchical sub-client organization
- Built-in async support with AsyncManagementClient
- Automatic token refresh when using client_id/client_secret
- SyncPager/AsyncPager for list pagination
- ApiError exceptions (replaces Auth0Error)

Migration note from v4.x:
- Old: from auth0.management import Auth0; Auth0(base_url, token)
- New: from auth0.management import ManagementClient; ManagementClient(domain, token) or ManagementClient(domain, client_id, client_secret)

Version: auth0-python >= 5.4.0
Python >= 3.9.2 (since 5.2.0; v5.0-v5.1 required >= 3.8)
"""

from __future__ import annotations

import asyncio
import os
import logging
import time
from typing import Any, Iterator, Sequence

logger = logging.getLogger(__name__)

# ===================================================================
# ❌ BAD — v4.x pattern (deprecated), hardcoded credentials, no error context
# ===================================================================

"""
❌ BAD Example (DON'T DO THIS):

from auth0.management import Auth0

# ❌ v4.x legacy — use ManagementClient in v5.x
client = Auth0(
    base_url="https://dev-abc123.us.auth0.com/api/v2",  # ❌ Full URL in v4
    token="eyJhbGc...",  # ❌ Hardcoded! Never commit tokens!
)

# ❌ v4.x flat method names
users = client.users_all()  # ❌ Changed to list() in v5

# ❌ No error handling — v5 uses exceptions
for user in users:
    print(user["email"])  # ❌ v4 returned dicts, v5 returns Pydantic models
"""

# ===================================================================
# ✅ GOOD — v5.x ManagementClient, env-based auth, auto token management
# ===================================================================

from auth0.management import ManagementClient, AsyncManagementClient
from auth0.management.core.api_error import ApiError
from auth0.authentication import GetToken


def get_auth0_config() -> dict[str, Any]:
    """Get Auth0 configuration from environment variables.

    Reads:
        AUTH0_DOMAIN: Your Auth0 tenant domain (e.g., "dev-abc123.us.auth0.com")
        AUTH0_CLIENT_ID: M2M app client ID for Management API
        AUTH0_CLIENT_SECRET: M2M app client secret
        AUTH0_AUDIENCE: Management API audience (default: "https://{domain}/api/v2/")

    Returns:
        Configuration dict with domain and optional credentials.

    Raises:
        ValueError: If AUTH0_DOMAIN is missing.
    """
    domain = os.environ.get("AUTH0_DOMAIN")
    client_id = os.environ.get("AUTH0_CLIENT_ID")
    client_secret = os.environ.get("AUTH0_CLIENT_SECRET")

    if not domain:
        raise ValueError("AUTH0_DOMAIN environment variable required")

    config: dict[str, Any] = {
        "domain": domain,
    }

    # Option 1: Auto token management using client credentials
    if client_id and client_secret:
        config["client_id"] = client_id
        config["client_secret"] = client_secret

    # Option 2: Existing token (shorter lived, no auto-refresh)
    elif os.environ.get("AUTH0_MANAGEMENT_TOKEN"):
        config["token"] = os.environ["AUTH0_MANAGEMENT_TOKEN"]

    return config


def create_management_client() -> ManagementClient:
    """Create synchronous Auth0 ManagementClient with automatic token refresh.

    Uses client credentials flow to fetch and automatically refresh Management
    API access tokens when using client_id/client_secret.

    Returns:
        Configured ManagementClient instance.
    """
    config = get_auth0_config()

    domain = config.pop("domain")

    # ManagementClient accepts:
    # - domain + token (existing token, no refresh)
    # - domain + client_id + client_secret (auto token fetch + refresh)
    client = ManagementClient(domain=domain, **config)

    return client


async def create_async_management_client() -> AsyncManagementClient:
    """Create async Auth0 ManagementClient.

    Returns:
        Configured AsyncManagementClient instance.
    """
    config = get_auth0_config()
    domain = config.pop("domain")
    client = AsyncManagementClient(domain=domain, **config)
    return client


def handle_auth0_error(e: ApiError) -> None:
    """Handle Auth0 ApiError with context extraction.

    Args:
        e: ApiError exception from ManagementClient.

    Raises:
        Appropriate application exception based on error code.
    """
    status_code = e.status_code
    error_code = e.error_code
    message = e.message

    # Rate limit headers available when present
    rate_limit_remaining = e.headers.get("x-ratelimit-remaining") if e.headers else None
    rate_limit_reset = e.headers.get("x-ratelimit-reset") if e.headers else None
    rate_limit_limit = e.headers.get("x-ratelimit-limit") if e.headers else None

    logger.error(
        "Auth0 API error: status=%d code=%s message=%s",
        status_code,
        error_code,
        message,
    )

    if rate_limit_remaining is not None:
        logger.warning(
            "Rate limit: remaining=%s, limit=%s, reset=%s",
            rate_limit_remaining,
            rate_limit_limit,
            rate_limit_reset,
        )

    # Classify by status code
    if status_code == 401:
        raise RuntimeError("Auth0 authentication failed — check credentials") from e
    elif status_code == 403:
        raise RuntimeError("Auth0 permission denied — check API scopes") from e
    elif status_code == 404:
        raise ValueError(f"Auth0 resource not found: {message}") from e
    elif status_code == 429:
        reset_time = int(rate_limit_reset) if rate_limit_reset else int(time.time()) + 60
        wait_seconds = max(1, reset_time - int(time.time()))
        raise RuntimeError(f"Auth0 rate limited — retry after {wait_seconds}s") from e
    elif status_code >= 500:
        raise RuntimeError(f"Auth0 server error: {message}") from e
    else:
        raise RuntimeError(f"Auth0 error ({status_code}): {message}") from e
```

### Pattern 2: User Management Operations

```python
"""User CRUD, search, and lifecycle operations in Auth0.

User identities in Auth0:
- User ID format: {provider}|{unique_id}
  - auth0|abc123 — Database connection user
  - google-oauth2|123456789 — Google social login
  - github|123456 — GitHub social login
  - waad|abc123 — Azure AD/Entra ID connection
  - samlp|abc123 — SAML enterprise connection

User profile attributes:
- user_id (immutable)
- email, email_verified
- name, nickname, given_name, family_name, picture
- app_metadata (app-specific, writable via Management API)
- user_metadata (user-editable preferences)
- identities (array of linked identities)
- last_login, last_password_reset, created_at, updated_at
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, AsyncIterator, Iterator

from auth0.management import ManagementClient, AsyncManagementClient
from auth0.management.core.api_error import ApiError

logger = logging.getLogger(__name__)


def get_user_by_id(
    client: ManagementClient,
    user_id: str,
    fields: list[str] | None = None,
    include_fields: bool = True,
) -> Any:
    """Get a user by Auth0 user ID.

    Args:
        client: ManagementClient instance.
        user_id: Auth0 user ID (e.g., "auth0|abc123", "google-oauth2|123").
        fields: Optional list of fields to fetch (reduces payload size).
        include_fields: Whether to include (True) or exclude (False) the fields.

    Returns:
        User Pydantic model. Use .model_dump() for dict access.

    Raises:
        ValueError: If user not found (404).
        RuntimeError: For other API errors.
    """
    try:
        params: dict[str, Any] = {}
        if fields:
            params["fields"] = ",".join(fields)
            params["include_fields"] = include_fields

        user = client.users.get(user_id, **params)
        return user

    except ApiError as e:
        handle_auth0_error(e)


async def aget_user_by_id(
    client: AsyncManagementClient,
    user_id: str,
) -> Any:
    """Async version of get_user_by_id."""
    try:
        return await client.users.get(user_id)
    except ApiError as e:
        handle_auth0_error(e)


def search_users(
    client: ManagementClient,
    query: str,
    fields: list[str] | None = None,
    per_page: int = 50,
    page: int = 0,
) -> list[Any]:
    """Search users using Lucene query syntax.

    Query examples:
        - email:"user@example.com"
        - email.domain:"example.com"
        - name:John*
        - last_login:[2025-01-01 TO *]
        - logins_count:>10
        - app_metadata.plan:"premium"
        - user_id:"auth0|abc123"

    Args:
        client: ManagementClient instance.
        query: Lucene query string.
        fields: Fields to return.
        per_page: Results per page (max 100).
        page: Page number (0-indexed).

    Returns:
        List of user Pydantic models.
    """
    try:
        params: dict[str, Any] = {
            "q": query,
            "per_page": per_page,
            "page": page,
        }
        if fields:
            params["fields"] = ",".join(fields)

        # v5.x: client.users.list() takes q for search
        users = client.users.list(q=query, per_page=per_page, page=page)
        return list(users)

    except ApiError as e:
        handle_auth0_error(e)


def iter_all_users(
    client: ManagementClient,
    query: str | None = None,
    per_page: int = 100,
) -> Iterator[Any]:
    """Iterator over all users with automatic pagination.

    Args:
        client: ManagementClient instance.
        query: Optional search query filter.
        per_page: Results per page.

    Yields:
        User Pydantic models.
    """
    page = 0
    while True:
        try:
            params: dict[str, Any] = {"per_page": per_page, "page": page}
            if query:
                params["q"] = query

            users = client.users.list(**params)
            user_list = list(users)

            if not user_list:
                break

            for user in user_list:
                yield user

            # Check if we got a full page
            if len(user_list) < per_page:
                break

            page += 1

        except ApiError as e:
            handle_auth0_error(e)


def create_user(
    client: ManagementClient,
    email: str,
    password: str,
    connection: str = "Username-Password-Authentication",
    email_verified: bool = False,
    user_metadata: dict[str, Any] | None = None,
    app_metadata: dict[str, Any] | None = None,
    given_name: str | None = None,
    family_name: str | None = None,
    name: str | None = None,
) -> Any:
    """Create a new database connection user.

    Args:
        client: ManagementClient instance.
        email: User email address.
        password: User password (min 8 chars by default).
        connection: Database connection name.
        email_verified: Whether email is pre-verified.
        user_metadata: User-editable metadata.
        app_metadata: Application-controlled metadata (e.g., plan, roles).
        given_name: First name.
        family_name: Last name.
        name: Full display name.

    Returns:
        Created user Pydantic model.
    """
    try:
        body: dict[str, Any] = {
            "email": email,
            "password": password,
            "connection": connection,
            "email_verified": email_verified,
        }

        if user_metadata:
            body["user_metadata"] = user_metadata
        if app_metadata:
            body["app_metadata"] = app_metadata
        if given_name:
            body["given_name"] = given_name
        if family_name:
            body["family_name"] = family_name
        if name:
            body["name"] = name
        elif given_name or family_name:
            parts = [p for p in [given_name, family_name] if p]
            body["name"] = " ".join(parts)

        user = client.users.create(body)

        logger.info("Created user: %s (%s)", email, user.user_id)
        return user

    except ApiError as e:
        handle_auth0_error(e)


def update_user(
    client: ManagementClient,
    user_id: str,
    updates: dict[str, Any],
) -> Any:
    """Update user attributes.

    Common update scenarios:
        - {"email_verified": True} — mark email verified
        - {"password": "newpassword"} — set new password
        - {"user_metadata": {"theme": "dark"}} — update user preferences
        - {"app_metadata": {"plan": "enterprise"}} — update app metadata
        - {"blocked": True} — block/ban a user
        - {"picture": "https://..."} — update profile picture

    Args:
        client: ManagementClient instance.
        user_id: Auth0 user ID.
        updates: Dict of fields to update.

    Returns:
        Updated user Pydantic model.
    """
    try:
        user = client.users.update(user_id, updates)
        logger.info("Updated user: %s", user_id)
        return user
    except ApiError as e:
        handle_auth0_error(e)


def delete_user(client: ManagementClient, user_id: str) -> None:
    """Delete a user.

    WARNING: This is irreversible. Consider blocking first.

    Args:
        client: ManagementClient instance.
        user_id: Auth0 user ID.
    """
    try:
        client.users.delete(user_id)
        logger.info("Deleted user: %s", user_id)
    except ApiError as e:
        handle_auth0_error(e)


def block_user(client: ManagementClient, user_id: str, blocked: bool = True) -> Any:
    """Block or unblock a user.

    Blocked users cannot authenticate.

    Args:
        client: ManagementClient instance.
        user_id: Auth0 user ID.
        blocked: True to block, False to unblock.

    Returns:
        Updated user Pydantic model.
    """
    return update_user(client, user_id, {"blocked": blocked})
```

### Pattern 3: Authentication API — OAuth Flows

```python
"""Authentication API implementations for various OAuth/OIDC flows.

The Authentication API handles all login/token operations. Use the GetToken
class from auth0.authentication for token acquisition.

Common flows:
1. Authorization Code Flow (Regular Web Apps) — server-side, most secure
2. Authorization Code + PKCE (SPA, Mobile) — no client_secret needed
3. Client Credentials (M2M / Backend) — service-to-service
4. Device Authorization (TV / Input-constrained)
5. Refresh Token Exchange — get new access_token from refresh_token
6. Password Realm (LEGACY, NOT RECOMMENDED) — direct username/password
"""

from __future__ import annotations

import os
import logging
from typing import Any

from auth0.authentication import GetToken, Database, OAuth, RevokeToken
from auth0.authentication.token_verifier import (
    TokenVerifier,
    AsymmetricSignatureVerifier,
)

logger = logging.getLogger(__name__)


def get_management_api_token(
    domain: str | None = None,
    client_id: str | None = None,
    client_secret: str | None = None,
) -> str:
    """Get a Management API access token using Client Credentials flow.

    This is what ManagementClient does internally when you provide
    client_id and client_secret.

    Args:
        domain: Auth0 domain (reads AUTH0_DOMAIN env if None).
        client_id: M2M client ID (reads AUTH0_CLIENT_ID if None).
        client_secret: M2M client secret (reads AUTH0_CLIENT_SECRET if None).

    Returns:
        Access token string.
    """
    domain = domain or os.environ.get("AUTH0_DOMAIN")
    client_id = client_id or os.environ.get("AUTH0_CLIENT_ID")
    client_secret = client_secret or os.environ.get("AUTH0_CLIENT_SECRET")

    if not domain or not client_id or not client_secret:
        raise ValueError("Missing Auth0 credentials for Management API token")

    get_token = GetToken(domain)

    # Management API audience is always: https://{domain}/api/v2/
    audience = f"https://{domain}/api/v2/"

    token = get_token.client_credentials(
        client_id=client_id,
        client_secret=client_secret,
        audience=audience,
    )

    access_token = token.get("access_token")
    expires_in = token.get("expires_in")

    logger.info(
        "Obtained Management API token, expires in %d seconds",
        expires_in or 86400,
    )

    return access_token


def exchange_code_for_token(
    domain: str,
    code: str,
    redirect_uri: str,
    client_id: str,
    client_secret: str | None = None,
    code_verifier: str | None = None,
) -> dict[str, Any]:
    """Exchange authorization code for tokens (Authorization Code flow).

    Use for:
    - Regular Web Apps: provide client_secret
    - SPA / Mobile (PKCE): provide code_verifier instead of client_secret

    Args:
        domain: Auth0 domain.
        code: Authorization code from /authorize callback.
        redirect_uri: Must match the redirect_uri used to request the code.
        client_id: Application client ID.
        client_secret: Application client secret (confidential clients only).
        code_verifier: PKCE code verifier (public clients with PKCE).

    Returns:
        Dict with access_token, id_token, refresh_token (if enabled), expires_in, token_type.
    """
    get_token = GetToken(domain)

    kwargs: dict[str, Any] = {
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": client_id,
    }

    if client_secret:
        kwargs["client_secret"] = client_secret
    if code_verifier:
        kwargs["code_verifier"] = code_verifier

    token = get_token.authorization_code(**kwargs)

    return token


def exchange_refresh_token(
    domain: str,
    refresh_token: str,
    client_id: str,
    client_secret: str | None = None,
    scope: str | None = None,
) -> dict[str, Any]:
    """Exchange a refresh token for new tokens.

    Refresh tokens must be enabled in Auth0 API settings.

    Args:
        domain: Auth0 domain.
        refresh_token: The refresh token.
        client_id: Application client ID.
        client_secret: Optional client secret for confidential clients.
        scope: Optional reduced scope for the new access token.

    Returns:
        Dict with new access_token, id_token, optionally new refresh_token.
    """
    get_token = GetToken(domain)

    kwargs: dict[str, Any] = {
        "refresh_token": refresh_token,
        "client_id": client_id,
    }
    if client_secret:
        kwargs["client_secret"] = client_secret
    if scope:
        kwargs["scope"] = scope

    token = get_token.refresh_token(**kwargs)

    return token


def get_device_authorization_code(
    domain: str,
    client_id: str,
    audience: str | None = None,
    scope: str | None = None,
) -> dict[str, Any]:
    """Start Device Authorization flow (for TV / input-constrained devices).

    Flow:
    1. Call this to get device_code, user_code, verification_uri_complete
    2. Show user_code + verification_uri to user
    3. Poll with exchange_device_code() until user authorizes or expires

    Args:
        domain: Auth0 domain.
        client_id: Application client ID.
        audience: Optional API audience.
        scope: Optional scope.

    Returns:
        Dict with device_code, user_code, verification_uri, verification_uri_complete,
        expires_in, interval (polling interval in seconds).
    """
    oauth = OAuth(domain)

    kwargs: dict[str, Any] = {"client_id": client_id}
    if audience:
        kwargs["audience"] = audience
    if scope:
        kwargs["scope"] = scope

    result = oauth.device_authorization(**kwargs)

    return result


def exchange_device_code(
    domain: str,
    client_id: str,
    device_code: str,
) -> dict[str, Any] | None:
    """Poll to exchange device_code for tokens.

    Call this repeatedly at interval seconds until success or error.

    Returns:
        Token dict when user authorizes, None if still pending.

    Raises:
        RuntimeError: When access_denied, expired_token, or other terminal error.
    """
    get_token = GetToken(domain)

    try:
        token = get_token.device_code(
            client_id=client_id,
            device_code=device_code,
        )
        return token
    except Exception as e:
        error_msg = str(e).lower()

        # These are expected during polling
        if "authorization_pending" in error_msg or "slow_down" in error_msg:
            return None

        # Terminal errors
        if "access_denied" in error_msg:
            raise RuntimeError("User denied device authorization")
        if "expired_token" in error_msg:
            raise RuntimeError("Device code expired")

        raise


def verify_id_token(
    id_token: str,
    domain: str,
    client_id: str,
    issuer: str | None = None,
) -> dict[str, Any]:
    """Verify an ID token signature and claims.

    Always verify ID tokens before trusting their contents.

    Args:
        id_token: The JWT ID token.
        domain: Auth0 domain.
        client_id: Application client ID (audience check).
        issuer: Expected issuer (defaults to https://{domain}/).

    Returns:
        Decoded and verified payload dict.

    Raises:
        ValueError: If token verification fails.
    """
    issuer = issuer or f"https://{domain}/"
    jwks_url = f"https://{domain}/.well-known/jwks.json"

    # Auth0 uses asymmetric signing (RS256)
    signature_verifier = AsymmetricSignatureVerifier(jwks_url)

    token_verifier = TokenVerifier(
        signature_verifier=signature_verifier,
        issuer=issuer,
        audience=client_id,
    )

    try:
        payload = token_verifier.verify(id_token)
        return payload
    except Exception as e:
        raise ValueError(f"ID token verification failed: {e}") from e
```

---

## Constraints

### MUST DO

- Use `ManagementClient` (v5.x) instead of legacy `Auth0` class (v4.x)
- Store `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` in environment variables
- Use PKCE (`code_verifier` + `code_challenge`) for ALL public clients (SPA, mobile, desktop)
- Verify ID tokens using `TokenVerifier` with JWKS asymmetric signature check
- Validate `state` parameter in OAuth callbacks to prevent CSRF
- Use `nonce` in OIDC flows to prevent replay attacks
- Set short access token lifetimes; use refresh tokens for longer sessions
- Monitor `x-ratelimit-remaining` (Management API: default 2 req/s, 50 req/min)
- Treat `user_id` as immutable identifier (not email — emails can change)
- Use `app_metadata` for app-controlled data, `user_metadata` for user preferences

### MUST NOT DO

- NEVER hardcode client secrets or tokens in source code
- NEVER use Password Realm flow for new applications (deprecated, less secure)
- NEVER expose `client_secret` in frontend code (SPA/native apps are public clients)
- NEVER skip ID token verification (JWTs can be forged without signature check)
- NEVER store refresh tokens in localStorage (use httpOnly secure cookies for web apps)
- NEVER use Management API from frontend — always proxy through your backend
- NEVER disable email verification for user-initiated signups
- NEVER use Auth0 Management API tokens with broad scopes in frontend code
- NEVER rely on `client.users.list()` without pagination (can return many users)

---

## Output Template

When implementing Auth0 integrations, produce:

1. **ManagementClient Initialization** — Factory reading AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET
2. **Error Handler** — `handle_auth0_error()` with status code classification
3. **User Operations** — get_user_by_id, search_users, create_user, update_user with app_metadata/user_metadata
4. **Authentication Flow** — Appropriate OAuth flow for the client type (PKCE for public clients)
5. **Token Verification** — ID token verification with `TokenVerifier` and `AsymmetricSignatureVerifier`
6. **RBAC Helpers** — Role listing/assignment, permission checking
7. **Organization Support** — If multi-tenant B2B: org-aware login and token handling

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-okta-api` | Okta for workforce/SaaS identity — alternative CIAM platform |
| `coding-entra-id-api` | Microsoft Entra ID for Azure/M365 ecosystem identities |
| `coding-aws-iam` | AWS IAM for AWS service identities and roles |
| `coding-vault-api` | HashiCorp Vault for secrets management and encryption keys |
| `coding-jwt-auth` | Generic JWT authentication patterns and token handling |

---

## Live References

| Resource | URL |
|----------|-----|
| Auth0 Python SDK (PyPI) | https://pypi.org/project/auth0-python/ |
| Auth0 SDK GitHub | https://github.com/auth0/auth0-python |
| Auth0 Management API v2 Docs | https://auth0.com/docs/api/management/v2 |
| Auth0 Authentication API Docs | https://auth0.com/docs/api/authentication |
| Auth0 v5 Migration Guide | https://github.com/auth0/auth0-python/blob/master/V5_MIGRATION_GUIDE.md |
| Auth0 Actions Docs | https://auth0.com/docs/customize/actions |
| Auth0 Organizations Docs | https://auth0.com/docs/manage-users/organizations |
| Auth0 OAuth Flow Guide | https://auth0.com/docs/get-started/authentication-and-authorization-flow |
| Auth0 PKCE Flow | https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-proof-key-for-code-exchange-pkce |
| Auth0 Rate Limits | https://auth0.com/docs/troubleshoot/customer-support/operational-policies/rate-limit-policy/management-api-endpoint-rate-limits |

---

## v5.x Quick Reference (Key Changes from v4.x)

| v4.x (Legacy) | v5.x (Current) | Notes |
|----------------|----------------|-------|
| `Auth0(base_url, token)` | `ManagementClient(domain, token)` | Pass just domain, not full URL |
| `client.users_all()` | `client.users.list()` | Flat → hierarchical |
| `client.create_user(body)` | `client.users.create(body)` | All methods under sub-clients |
| Returns `dict` | Returns Pydantic model | Use `.model_dump()` for dict |
| `Auth0Error` | `ApiError` | New exception in different module |
| No built-in async | `AsyncManagementClient` | First-class async support |
| Manual token management | Auto token refresh via `client_id+client_secret` | Pass both for automatic token handling |
| Manual pagination | Built-in paging via `SyncPager`/`AsyncPager` | `list()` returns iterable pager |
