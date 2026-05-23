---
name: entra-id-api
description: Implements Microsoft Entra ID (Azure AD) API integration (Users, Groups, Applications, Service Principals, Conditional Access, B2C) using msgraph-sdk Python + azure.identity with MSAL authentication patterns, Graph API batches, delta queries, and RBAC.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: microsoft entra id, azure active directory, ms graph api, azure ad users, azure ad groups, microsoft graph, how do i integrate azure ad, conditional access
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-okta-api, coding-auth0-api, coding-aws-iam
---

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

---

## When to Use

Use this skill when:

- Integrating Microsoft 365 / Azure identity with your application
- Building SCIM-style user provisioning to/from Entra ID
- Managing users, groups, and their memberships in Azure AD
- Creating and managing enterprise applications and service principals
- Implementing Conditional Access policies for tenant security
- Building B2C (Business-to-Consumer) identity flows with Azure AD B2C
- Managing OAuth2 permission grants and admin consent
- Synchronizing identity data using delta queries (`delta()`)
- Batch operations against Microsoft Graph (multiple requests in one)
- Role assignments for Azure resources and RBAC
- Inviting guest users (B2B collaboration)
- Managing devices registered in Entra ID

---

## When NOT to Use

- For Auth0-style CIAM with social providers (Auth0 has broader social support)
- For Okta workforce identity — use `coding-okta-api`
- For AWS IAM — use `coding-aws-iam`
- For on-premises Active Directory (AD DS) — different protocol (LDAP/Kerberos)
- When you need to work with Exchange Online (use Outlook/Exchange endpoints in Graph)
- SharePoint Online sites — use SharePoint-specific endpoints (also in Graph, but different focus)
- Teams messaging — use Teams-specific Graph endpoints (this skill focuses on identity)

---

## Core Workflow

1. **Choose Authentication Flow** — Select the appropriate `TokenCredential` from `azure.identity`:
   - App-only / daemon: `ClientSecretCredential` (tenant_id, client_id, client_secret)
   - Dev machine: `DefaultAzureCredential` (tries VS Code, Az CLI, PowerShell, env vars)
   - User interactive (device code): `DeviceCodeCredential` (for apps with no browser)
   - User delegated: `InteractiveBrowserCredential`, `AuthorizationCodeCredential`
   **Checkpoint:** Validate credential by calling `client.me.get()` or `client.users.get(Top=1)`.

2. **Create GraphServiceClient** — Initialize `GraphServiceClient(credentials=cred, scopes=scopes)`. App-only scopes use `["https://graph.microsoft.com/.default"]` (permissions defined on app registration). Delegated scopes list specific permissions like `["User.ReadWrite.All", "Group.ReadWrite.All"]`. **Checkpoint:** SDK uses async/await — all operations need `await`.

3. **User CRUD & List** — Use `client.users.get()` with `$select`, `$filter`, `$top` parameters. Get specific user with `client.users.by_user_id(id).get()`. Create with `client.users.post(user)`. Update with `client.users.by_user_id(id).patch(user_update)`. Delete with `client.users.by_user_id(id).delete()`. **Checkpoint:** Always use `$select` to only fetch fields you need.

4. **Groups & Membership** — Create groups with `client.groups.post(group)`. List members: `client.groups.by_group_id(id).members.get()`. Add member: `client.groups.by_group_id(id).members.ref.post(additional_data={"@odata.id": f"https://graph.microsoft.com/v1.0/users/{user_id}"})`. Remove: `client.groups.by_group_id(id).members.by_directory_object_id(user_id).ref.delete()`. **Checkpoint:** Groups can be Security or Microsoft 365 (Unified); only Security groups can be used for RBAC.

5. **Batch & Delta Operations** — For bulk operations, create `BatchRequestContent`, add steps with IDs, POST to `$batch`. For sync scenarios, use `delta()`: `client.users.delta.get()`, track `@odata.deltaLink` for subsequent sync. **Checkpoint:** Each batch can have up to 20 individual requests.

6. **Applications & Service Principals** — Register apps via `client.applications.post()`. Get corresponding service principal: look up by appId. Grant app roles or assign users/groups via `appRoleAssignments`. **Checkpoint:** Every Application has a corresponding Service Principal (enterprise app) in the tenant.

7. **Throttling & Error Handling** — Graph API returns 429 when throttled. Catch exceptions, read `Retry-After` header from response, wait that many seconds plus jitter, then retry. Implement exponential backoff with jitter. For other errors: 401 = check auth, 403 = check permissions/consent, 404 = resource doesn't exist. **Checkpoint:** Use `azure.core` exceptions or inspect response status codes.

---

## Implementation Patterns

### Pattern 1: Authentication & Client Initialization (BAD vs GOOD)

```python
"""Microsoft Graph SDK authentication patterns.

Microsoft Graph Python SDK uses azure.identity for authentication.
Available TokenCredential classes:

APP-ONLY (Service / Daemon):
- ClientSecretCredential — most common for app-only (client_id + client_secret + tenant_id)
- ClientCertificateCredential — more secure, uses certificate instead of secret

USER-DELEGATED:
- DeviceCodeCredential — for apps without browser (shows code for user to auth in browser)
- InteractiveBrowserCredential — opens system browser for auth
- AuthorizationCodeCredential — web apps, auth code flow
- UsernamePasswordCredential — ROPC (NOT RECOMMENDED, legacy)

DEVELOPMENT / LOCAL:
- DefaultAzureCredential — tries multiple sources in order:
  1. Environment variables (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)
  2. Azure CLI (az login)
  3. Azure PowerShell
  4. VS Code Azure Account extension
  5. Managed Identity (when deployed to Azure)

Version notes:
- msgraph-sdk: >= 1.0.0 (stable)
- azure.identity: >= 1.15.0
- Python >= 3.8
"""

from __future__ import annotations

import asyncio
import os
import logging
import time
from typing import Any, Sequence, List, Dict

logger = logging.getLogger(__name__)

# ===================================================================
# ❌ BAD — direct HTTP requests, hardcoded secrets, no error context
# ===================================================================

"""
❌ BAD Example (DON'T DO THIS):

import requests

# ❌ Hardcoded credentials!
TENANT_ID = "abc123-def456"
CLIENT_ID = "app-id-here"
CLIENT_SECRET = "secret-value-here"  # ❌ NEVER commit this!

# ❌ Manual token fetching (error-prone)
token_url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"
response = requests.post(token_url, data={
    "grant_type": "client_credentials",
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "scope": "https://graph.microsoft.com/.default"
})
token = response.json()["access_token"]

# ❌ Manual HTTP call, no retry, no paging
users_response = requests.get(
    "https://graph.microsoft.com/v1.0/users",
    headers={"Authorization": f"Bearer {token}"}
)
users = users_response.json()["value"]

# ❌ Missing:
# - No token caching/refresh
# - No throttling handling
# - No pagination for large result sets
# - No type safety
"""

# ===================================================================
# ✅ GOOD — azure.identity + GraphServiceClient, env-based, typed
# ===================================================================

from azure.identity import (
    ClientSecretCredential,
    DefaultAzureCredential,
    DeviceCodeCredential,
    ClientCertificateCredential,
)
from azure.core.exceptions import HttpResponseError, ClientAuthenticationError
from msgraph import GraphServiceClient
from msgraph.generated.users.users_request_builder import UsersRequestBuilder


def get_graph_client_for_app_only() -> GraphServiceClient:
    """Create GraphServiceClient for app-only (service/dameon) authentication.

    Reads from environment:
        AZURE_TENANT_ID - Entra ID tenant ID/domain
        AZURE_CLIENT_ID - Application (client) ID
        AZURE_CLIENT_SECRET - Client secret (for app-only auth)

    Scopes for app-only: always "https://graph.microsoft.com/.default"
    The actual permissions are configured in App Registration → API permissions.

    Returns:
        Configured GraphServiceClient ready for async calls.
    """
    tenant_id = os.environ.get("AZURE_TENANT_ID")
    client_id = os.environ.get("AZURE_CLIENT_ID")
    client_secret = os.environ.get("AZURE_CLIENT_SECRET")

    if not tenant_id:
        raise ValueError("AZURE_TENANT_ID environment variable required")
    if not client_id:
        raise ValueError("AZURE_CLIENT_ID environment variable required")

    credential: Any

    if client_secret:
        # Use client secret auth
        credential = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret,
        )
    else:
        # Fall back to DefaultAzureCredential (dev scenario)
        logger.info("No AZURE_CLIENT_SECRET, using DefaultAzureCredential")
        credential = DefaultAzureCredential()

    # App-only scope is always .default for the resource
    scopes = ["https://graph.microsoft.com/.default"]

    client = GraphServiceClient(credentials=credential, scopes=scopes)

    logger.info("Created GraphServiceClient (app-only), tenant=%s", tenant_id)
    return client


def get_graph_client_for_delegated_device_code() -> GraphServiceClient:
    """Create GraphServiceClient using Device Code flow (user-delegated).

    Good for: console apps, scripts, CLI tools where user can authenticate interactively.
    Shows a code and URL; user opens browser, enters code, authenticates.

    Reads from environment:
        AZURE_TENANT_ID - Tenant ID
        AZURE_CLIENT_ID - Public client app registration (no secret needed)

    Returns:
        Configured GraphServiceClient.
    """
    tenant_id = os.environ.get("AZURE_TENANT_ID", "common")
    client_id = os.environ.get("AZURE_CLIENT_ID")

    if not client_id:
        raise ValueError("AZURE_CLIENT_ID required for device code flow")

    # DeviceCodeCredential for user-delegated auth without browser
    credential = DeviceCodeCredential(
        client_id=client_id,
        tenant_id=tenant_id,
    )

    # Delegated scopes: specify what permissions you need
    scopes = [
        "User.Read",
        "Mail.Read",
        "Files.Read",
        "offline_access",  # For refresh tokens
    ]

    client = GraphServiceClient(credentials=credential, scopes=scopes)

    return client


def get_graph_client_dev_mode() -> GraphServiceClient:
    """Create GraphServiceClient using DefaultAzureCredential for local dev.

    Tries:
    1. Environment variables (AZURE_*)
    2. Azure CLI (az login)
    3. VS Code Azure Account
    4. Azure PowerShell
    5. Managed Identity (when in Azure)

    Returns:
        Configured GraphServiceClient.
    """
    credential = DefaultAzureCredential()
    scopes = ["https://graph.microsoft.com/.default"]

    client = GraphServiceClient(credentials=credential, scopes=scopes)
    return client


def format_graph_error(exc: HttpResponseError) -> str:
    """Extract context from HttpResponseError.

    Microsoft Graph returns detailed errors in JSON.
    This extracts the error code, message, and request-id.

    Args:
        exc: HttpResponseError from Graph API call.

    Returns:
        Formatted error string.
    """
    status_code = exc.status_code if hasattr(exc, 'status_code') else None
    message = exc.message if hasattr(exc, 'message') else str(exc)

    # Extract error details if available
    error_details = ""
    if exc.response:
        request_id = exc.response.headers.get("request-id")
        client_request_id = exc.response.headers.get("client-request-id")
        retry_after = exc.response.headers.get("Retry-After")

        if request_id:
            error_details += f" (request-id: {request_id})"
        if retry_after:
            error_details += f" (retry-after: {retry_after}s)"

        # Throttling check
        if status_code == 429:
            error_details += " [THROTTLED]"
        elif status_code == 401:
            error_details += " [UNAUTHORIZED — check credentials/scopes]"
        elif status_code == 403:
            error_details += " [FORBIDDEN — check permissions/consent]"
        elif status_code == 404:
            error_details += " [NOT FOUND]"

    return f"Graph API error {status_code}: {message}{error_details}"


def should_retry_after(exc: HttpResponseError) -> int | None:
    """Get Retry-After seconds from response headers.

    Call this when catching 429 to know how long to wait.

    Returns:
        Number of seconds to wait, or None if not found.
    """
    if exc.response and hasattr(exc.response, 'headers'):
        retry_after = exc.response.headers.get("Retry-After")
        if retry_after:
            try:
                return int(retry_after)
            except ValueError:
                pass
    return None
```

### Pattern 2: User Management (CRUD, Query, Delta)

```python
"""User management operations with Microsoft Graph API.

Key user endpoints:
- GET /users — list users
- GET /users/{id} — get specific user
- POST /users — create user
- PATCH /users/{id} — update user
- DELETE /users/{id} — delete user
- GET /users/delta — delta query for sync

Common query parameters:
- $select=displayName,mail,userPrincipalName,id — limit fields
- $filter=startsWith(displayName,'John') and accountEnabled eq true — filter
- $orderby=displayName — sort
- $top=100 — page size (max 999)
- $expand=memberOf — get memberships inline

Important user properties:
- id (GUID) — immutable
- userPrincipalName (UPN) — usually email-like, can change
- displayName, givenName, surname, mail
- accountEnabled (boolean)
- userType: Member vs Guest
- creationType: null (regular) or 'Invitation' (guest)
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, AsyncIterator, Dict, List, Optional

from azure.core.exceptions import HttpResponseError
from msgraph import GraphServiceClient
from msgraph.generated.models.user import User
from msgraph.generated.models.password_profile import PasswordProfile

logger = logging.getLogger(__name__)


async def list_users_paginated(
    client: GraphServiceClient,
    select: list[str] | None = None,
    filter: str | None = None,
    top: int = 100,
) -> AsyncIterator[User]:
    """List all users with automatic pagination.

    Args:
        client: GraphServiceClient instance.
        select: List of fields to fetch (e.g., ["id", "displayName", "mail"]).
        filter: OData filter string.
        top: Page size (max 999).

    Yields:
        User objects from all pages.
    """
    query_params: dict[str, Any] = {}

    if select:
        query_params["select"] = select
    if filter:
        query_params["filter"] = filter
    if top:
        query_params["top"] = top

    request_config: Any = None
    if query_params:
        from msgraph.generated.users.users_request_builder import UsersRequestBuilder
        request_config = UsersRequestBuilder.UsersRequestBuilderGetRequestConfiguration(
            query_parameters=UsersRequestBuilder.UsersRequestBuilderGetQueryParameters(**query_params)
        )

    # Get first page
    if request_config:
        result = await client.users.get(request_configuration=request_config)
    else:
        result = await client.users.get()

    if result and result.value:
        for user in result.value:
            yield user

    # Handle pagination via @odata.nextLink
    while result and result.odata_next_link:
        # Use with_url() to fetch next page
        result = await client.users.with_url(result.odata_next_link).get()
        if result and result.value:
            for user in result.value:
                yield user


async def get_user_by_id_or_upn(
    client: GraphServiceClient,
    user_id_or_upn: str,
    select: list[str] | None = None,
) -> User:
    """Get a user by ID or User Principal Name (UPN).

    Args:
        client: GraphServiceClient.
        user_id_or_upn: Either GUID id or userPrincipalName (email).
        select: Optional fields to select.

    Returns:
        User object.

    Raises:
        ValueError: If user not found.
        RuntimeError: For other API errors.
    """
    try:
        if select:
            from msgraph.generated.users.item.user_item_request_builder import UserItemRequestBuilder
            params = UserItemRequestBuilder.UserItemRequestBuilderGetQueryParameters(
                select=select
            )
            config = UserItemRequestBuilder.UserItemRequestBuilderGetRequestConfiguration(
                query_parameters=params
            )
            return await client.users.by_user_id(user_id_or_upn).get(request_configuration=config)
        else:
            return await client.users.by_user_id(user_id_or_upn).get()

    except HttpResponseError as e:
        if e.status_code == 404:
            raise ValueError(f"User not found: {user_id_or_upn}") from e
        raise RuntimeError(format_graph_error(e)) from e


async def create_user(
    client: GraphServiceClient,
    display_name: str,
    user_principal_name: str,
    password: str,
    mail_nickname: str | None = None,
    given_name: str | None = None,
    surname: str | None = None,
    mail: str | None = None,
    account_enabled: bool = True,
    force_change_password_next_signin: bool = True,
) -> User:
    """Create a new user in Entra ID.

    Args:
        client: GraphServiceClient.
        display_name: Display name.
        user_principal_name: UPN (must be unique in tenant, usually email@domain.com).
        password: Initial password.
        mail_nickname: Mail alias (defaults to prefix of UPN).
        given_name: First name.
        surname: Last name.
        mail: Email address.
        account_enabled: Whether account is enabled.
        force_change_password_next_signin: Force password reset on first login.

    Returns:
        Created User object.
    """
    if not mail_nickname:
        # Default to part before @ in UPN
        mail_nickname = user_principal_name.split("@")[0]

    password_profile = PasswordProfile(
        password=password,
        force_change_password_next_sign_in=force_change_password_next_signin,
    )

    user = User(
        account_enabled=account_enabled,
        display_name=display_name,
        user_principal_name=user_principal_name,
        mail_nickname=mail_nickname,
        password_profile=password_profile,
    )

    if given_name:
        user.given_name = given_name
    if surname:
        user.surname = surname
    if mail:
        user.mail = mail

    try:
        created_user = await client.users.post(user)
        logger.info(
            "Created user: %s (%s)",
            created_user.display_name,
            created_user.user_principal_name,
        )
        return created_user

    except HttpResponseError as e:
        raise RuntimeError(format_graph_error(e)) from e


async def update_user(
    client: GraphServiceClient,
    user_id: str,
    updates: dict[str, Any],
) -> None:
    """Update user properties.

    Args:
        client: GraphServiceClient.
        user_id: User ID.
        updates: Dict of property names to new values.

    Examples:
        update_user(client, user_id, {"accountEnabled": False})  # disable
        update_user(client, user_id, {"displayName": "New Name"})
    """
    # Build User object with only the fields to update
    user = User()

    # Map common field names
    property_map: dict[str, str] = {
        "accountEnabled": "account_enabled",
        "displayName": "display_name",
        "givenName": "given_name",
        "surname": "surname",
        "mail": "mail",
        "userPrincipalName": "user_principal_name",
        "mailNickname": "mail_nickname",
        "companyName": "company_name",
        "department": "department",
        "jobTitle": "job_title",
        "mobilePhone": "mobile_phone",
        "officeLocation": "office_location",
        "preferredLanguage": "preferred_language",
        "businessPhones": "business_phones",
    }

    for key, value in updates.items():
        prop_name = property_map.get(key, key)
        setattr(user, prop_name, value)

    try:
        await client.users.by_user_id(user_id).patch(user)
        logger.info("Updated user: %s, fields: %s", user_id, list(updates.keys()))
    except HttpResponseError as e:
        raise RuntimeError(format_graph_error(e)) from e


async def delete_user(client: GraphServiceClient, user_id: str) -> None:
    """Delete a user.

    Warning: Deleted users go to recycle bin (30-day retention by default).
    Use `deletedItems` to restore or permanently delete.

    Args:
        client: GraphServiceClient.
        user_id: User ID to delete.
    """
    try:
        await client.users.by_user_id(user_id).delete()
        logger.info("Deleted user: %s", user_id)
    except HttpResponseError as e:
        raise RuntimeError(format_graph_error(e)) from e


async def get_user_delta(
    client: GraphServiceClient,
    delta_link: str | None = None,
) -> tuple[list[User], str | None]:
    """Get delta changes (for sync scenarios).

    Delta queries return only changes since last sync.

    Args:
        client: GraphServiceClient.
        delta_link: Optional deltaLink from previous sync.

    Returns:
        Tuple of (changed_users_list, next_delta_link)
        - changed_users_list: Users that were created/updated/deleted
        - next_delta_link: Store this for next sync call
    """
    try:
        if delta_link:
            # Continue from previous sync
            result = await client.users.delta.with_url(delta_link).get()
        else:
            # First sync
            result = await client.users.delta.get()

        users: list[User] = []
        if result and result.value:
            users = list(result.value)

        # Get the deltaLink for next sync
        next_delta = None
        if result:
            # Check for @odata.deltaLink in response annotations
            next_delta = result.odata_delta_link

        logger.info(
            "Delta query returned %d users, delta_link available: %s",
            len(users),
            next_delta is not None,
        )

        return users, next_delta

    except HttpResponseError as e:
        raise RuntimeError(format_graph_error(e)) from e
```

### Pattern 3: Groups, Membership, and Batch Operations

```python
"""Groups, membership management, and batch operations.

Groups in Entra ID:
- Security groups — used for RBAC, access control
- Microsoft 365 groups (Unified) — used for collaboration, Teams, SharePoint
- Mail-enabled security groups
- Distribution groups (mail-only, NOT for RBAC)

Key operations:
- Create, read, update, delete groups
- List members, owners
- Add/remove members
- Check memberOf (transitive) for user
- $batch for multiple operations

Batch operations ($batch):
- Combine up to 20 requests in one HTTP call
- Each request has an ID, method, URL, optional body
- Responses come back with matching IDs
- Reduces round trips, better performance
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, AsyncIterator, Dict, List, Optional

from azure.core.exceptions import HttpResponseError
from msgraph import GraphServiceClient
from msgraph.generated.models.group import Group
from msgraph.core import BatchRequestContent, BatchResponseContent

logger = logging.getLogger(__name__)


async def list_groups_paginated(
    client: GraphServiceClient,
    select: list[str] | None = None,
    filter: str | None = None,
    top: int = 100,
) -> AsyncIterator[Group]:
    """List groups with automatic pagination.

    Args:
        client: GraphServiceClient.
        select: Fields to select.
        filter: OData filter. Common filters:
            - "securityEnabled eq true" — only security groups
            - "mailEnabled eq true" — only mail-enabled groups
            - "groupTypes/any(c:c eq 'Unified')" — Microsoft 365 groups
        top: Page size.

    Yields:
        Group objects.
    """
    query_params: dict[str, Any] = {}
    if select:
        query_params["select"] = select
    if filter:
        query_params["filter"] = filter
    if top:
        query_params["top"] = top

    request_config = None
    if query_params:
        from msgraph.generated.groups.groups_request_builder import GroupsRequestBuilder
        params = GroupsRequestBuilder.GroupsRequestBuilderGetQueryParameters(**query_params)
        request_config = GroupsRequestBuilder.GroupsRequestBuilderGetRequestConfiguration(
            query_parameters=params
        )

    result = await client.groups.get(request_configuration=request_config)

    if result and result.value:
        for group in result.value:
            yield group

    while result and result.odata_next_link:
        result = await client.groups.with_url(result.odata_next_link).get()
        if result and result.value:
            for group in result.value:
                yield group


async def create_group(
    client: GraphServiceClient,
    display_name: str,
    mail_nickname: str,
    security_enabled: bool = True,
    mail_enabled: bool = False,
    description: str | None = None,
    is_unified: bool = False,  # Microsoft 365 group
) -> Group:
    """Create a new group.

    Args:
        client: GraphServiceClient.
        display_name: Group display name.
        mail_nickname: Mail alias (required even if mailEnabled=false).
        security_enabled: True for RBAC/access control usage.
        mail_enabled: True for mail/distribution capability.
        description: Optional description.
        is_unified: True for Microsoft 365 (Unified) group.

    Returns:
        Created Group object.
    """
    group = Group(
        display_name=display_name,
        mail_nickname=mail_nickname,
        security_enabled=security_enabled,
        mail_enabled=mail_enabled,
    )

    if description:
        group.description = description

    if is_unified:
        # Microsoft 365 groups have "Unified" in groupTypes
        group.group_types = ["Unified"]

    try:
        created = await client.groups.post(group)
        logger.info(
            "Created group: %s (id=%s, security=%s, unified=%s)",
            created.display_name,
            created.id,
            created.security_enabled,
            is_unified,
        )
        return created
    except HttpResponseError as e:
        raise RuntimeError(format_graph_error(e)) from e


async def get_group(
    client: GraphServiceClient,
    group_id: str,
    select: list[str] | None = None,
) -> Group:
    """Get a group by ID.

    Args:
        client: GraphServiceClient.
        group_id: Group ID.
        select: Fields to select.

    Returns:
        Group object.
    """
    try:
        if select:
            from msgraph.generated.groups.item.group_item_request_builder import GroupItemRequestBuilder
            params = GroupItemRequestBuilder.GroupItemRequestBuilderGetQueryParameters(select=select)
            config = GroupItemRequestBuilder.GroupItemRequestBuilderGetRequestConfiguration(
                query_parameters=params
            )
            return await client.groups.by_group_id(group_id).get(request_configuration=config)
        else:
            return await client.groups.by_group_id(group_id).get()
    except HttpResponseError as e:
        if e.status_code == 404:
            raise ValueError(f"Group not found: {group_id}") from e
        raise RuntimeError(format_graph_error(e)) from e


async def list_group_members(
    client: GraphServiceClient,
    group_id: str,
) -> AsyncIterator[Any]:
    """List direct members of a group.

    Note: Returns directoryObjects — can be users, groups, service principals, devices.
    Use @odata.type to determine actual type: #microsoft.graph.user, etc.

    Args:
        client: GraphServiceClient.
        group_id: Group ID.

    Yields:
        Member objects (User, Group, etc.).
    """
    try:
        result = await client.groups.by_group_id(group_id).members.get()

        if result and result.value:
            for member in result.value:
                yield member

        while result and result.odata_next_link:
            result = await client.groups.by_group_id(group_id).members.with_url(
                result.odata_next_link
            ).get()
            if result and result.value:
                for member in result.value:
                    yield member

    except HttpResponseError as e:
        raise RuntimeError(format_graph_error(e)) from e


async def add_user_to_group(
    client: GraphServiceClient,
    group_id: str,
    user_id: str,
) -> None:
    """Add a user to a group.

    Args:
        client: GraphServiceClient.
        group_id: Group ID.
        user_id: User ID to add.
    """
    # Build the request body: reference by URL
    request_body = {
        "@odata.id": f"https://graph.microsoft.com/v1.0/directoryObjects/{user_id}"
    }

    try:
        await client.groups.by_group_id(group_id).members.ref.post(request_body)
        logger.info("Added user %s to group %s", user_id, group_id)
    except HttpResponseError as e:
        # "One or more added object references already exist" = already member
        msg = str(e).lower()
        if "already exist" in msg or "one or more added" in msg:
            logger.debug("User %s already in group %s", user_id, group_id)
            return
        raise RuntimeError(format_graph_error(e)) from e


async def remove_user_from_group(
    client: GraphServiceClient,
    group_id: str,
    user_id: str,
) -> None:
    """Remove a user from a group.

    Args:
        client: GraphServiceClient.
        group_id: Group ID.
        user_id: User ID to remove.
    """
    try:
        await client.groups.by_group_id(group_id).members.by_directory_object_id(
            user_id
        ).ref.delete()
        logger.info("Removed user %s from group %s", user_id, group_id)
    except HttpResponseError as e:
        if e.status_code == 404:
            logger.debug("User %s not found in group %s", user_id, group_id)
            return
        raise RuntimeError(format_graph_error(e)) from e


async def list_groups_for_user(
    client: GraphServiceClient,
    user_id: str,
    transitive: bool = True,
) -> list[Any]:
    """Get groups that a user is a member of.

    Args:
        client: GraphServiceClient.
        user_id: User ID.
        transitive: If True, get nested groups too (user -> group A -> group B).
                    If False, only direct memberships.

    Returns:
        List of groups.
    """
    try:
        if transitive:
            # transitiveMemberOf includes nested membership
            result = await client.users.by_user_id(user_id).transitive_member_of.get()
        else:
            # memberOf is direct membership only
            result = await client.users.by_user_id(user_id).member_of.get()

        if result and result.value:
            return list(result.value)
        return []

    except HttpResponseError as e:
        raise RuntimeError(format_graph_error(e)) from e


async def batch_multiple_requests(
    client: GraphServiceClient,
    requests: list[tuple[str, str, dict | None]],  # list of (id, method, url, [body])
) -> dict[str, Any]:
    """Execute multiple requests in a single $batch call.

    Batch operations can reduce round-trips for multiple independent operations.

    Args:
        client: GraphServiceClient.
        requests: List of tuples: (request_id, method, url, optional_body_dict)
                  Methods: GET, POST, PATCH, DELETE
                  URLs: relative from /v1.0/, e.g., "users/abc123"

    Returns:
        Dict mapping request_id to response (status, body, headers).

    Example:
        requests = [
            ("get-user-1", "GET", "users/user-id-1", None),
            ("get-user-2", "GET", "users/user-id-2", None),
        ]
        responses = await batch_multiple_requests(client, requests)
    """
    batch_content = BatchRequestContent()

    for req in requests:
        req_id = req[0]
        method = req[1]
        url = req[2]
        body = req[3] if len(req) > 3 else None

        # Add request to batch
        if body:
            batch_content.add_request(
                id=req_id,
                method=method,
                url=f"/users",
                headers={"Content-Type": "application/json"},
                content=json.dumps(body),
            )
        else:
            batch_content.add_request(
                id=req_id,
                method=method,
                url=url,
            )

    try:
        batch_response = await client.batch.post(batch_content)
        batch_response_content = BatchResponseContent(batch_response)

        responses: dict[str, Any] = {}

        for req_id, *_ in requests:
            try:
                response = await batch_response_content.get_response_by_id(req_id)
                responses[req_id] = {
                    "status": response.status,
                    "body": response.content.decode() if response.content else None,
                    "headers": dict(response.headers) if response.headers else {},
                }
            except Exception as e:
                responses[req_id] = {"error": str(e)}

        return responses

    except HttpResponseError as e:
        raise RuntimeError(format_graph_error(e)) from e
```

---

## Constraints

### MUST DO

- Use `azure.identity` credentials: `ClientSecretCredential`, `DefaultAzureCredential`, `DeviceCodeCredential`
- Initialize `GraphServiceClient(credentials=cred, scopes=scopes)` with proper scopes
- App-only: use `["https://graph.microsoft.com/.default"]` scope (permissions defined in app reg)
- Delegated: list specific scopes like `["User.ReadWrite.All", "Group.ReadWrite.All"]`
- Always use `$select` to limit response fields (reduces payload, faster, less throttling)
- Handle pagination with `odata_next_link` via `.with_url()` method
- Implement exponential backoff with jitter for 429 throttling responses
- Read `Retry-After` header when throttled and wait that duration
- Use `delta()` queries for synchronization scenarios (efficient change tracking)
- Use `$batch` for up to 20 independent requests to reduce round trips
- Store immutable `id` (GUID) as reference — `userPrincipalName` can change

### MUST NOT DO

- NEVER hardcode `client_secret`, credentials, or tokens in source code
- NEVER skip `$select` (unbounded responses cause throttling and performance issues)
- NEVER use `UsernamePasswordCredential` (ROPC flow — deprecated, security risk)
- NEVER ignore pagination — list operations return max 999 items, often fewer
- NEVER assume `userPrincipalName` is immutable — users can change UPN
- NEVER use application permissions when delegated would suffice (least privilege)
- NEVER call Graph without proper error handling (throttling happens in production)
- NEVER use direct HTTP requests to Graph when SDK is available (SDK handles token refresh, retries)
- NEVER treat `User` object `id` as anything other than case-insensitive GUID

---

## Output Template

When implementing Entra ID / Graph API integrations, produce:

1. **Credential Factory** — Function returning appropriate `TokenCredential` based on environment
2. **Client Initialization** — `GraphServiceClient` with correct scopes
3. **Error Handler** — `format_graph_error()` extracting status, message, request-id, retry-after
4. **User Operations** — list, get, create, update, delete with `$select` and pagination
5. **Group Operations** — group CRUD, add/remove member, list members, check membership
6. **Delta Sync Pattern** — `delta()` query with stored `deltaLink` for incremental sync
7. **Batch Pattern** — `BatchRequestContent` for multi-request scenarios
8. **Throttling Strategy** — Exponential backoff with jitter, reading `Retry-After`

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-okta-api` | Okta for workforce identity — alternative to Entra ID |
| `coding-auth0-api` | Auth0 for customer CIAM — alternative B2C option |
| `coding-aws-iam` | AWS IAM for AWS service identities and roles |
| `coding-vault-api` | HashiCorp Vault for secrets and app-role auth |
| `coding-azure-sdk` | Azure SDK patterns for broader Azure resource management |

---

## Live References

| Resource | URL |
|----------|-----|
| Microsoft Graph Python SDK (msgraph) | https://pypi.org/project/msgraph-sdk/ |
| Azure Identity (azure.identity) | https://pypi.org/project/azure-identity/ |
| Microsoft Graph Python SDK GitHub | https://github.com/microsoftgraph/msgraph-sdk-python |
| Microsoft Graph API Reference | https://learn.microsoft.com/en-us/graph/api/overview |
| Graph Users API | https://learn.microsoft.com/en-us/graph/api/resources/user |
| Graph Groups API | https://learn.microsoft.com/en-us/graph/api/resources/group |
| Delta Queries | https://learn.microsoft.com/en-us/graph/delta-query-overview |
| Batching ($batch) | https://learn.microsoft.com/en-us/graph/json-batching |
| Throttling Guidance | https://learn.microsoft.com/en-us/graph/throttling |
| Authentication Contexts (Conditional Access) | https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccesspolicy |
| Microsoft Entra B2C | https://learn.microsoft.com/en-us/azure/active-directory-b2c/overview |
| MSAL Python | https://pypi.org/project/msal/ |

---

## Common Permission Scopes

| Operation | App-Only Permission (Application) | Delegated Permission (User) |
|-----------|-------------------------------------|------------------------------|
| Read all users | `User.Read.All` | `User.ReadBasic.All`, `User.Read.All` |
| Read/write all users | `User.ReadWrite.All` | `User.ReadWrite.All` |
| Read all groups | `Group.Read.All` | `Group.Read.All` |
| Read/write all groups | `Group.ReadWrite.All` | `Group.ReadWrite.All` |
| Read directory data | `Directory.Read.All` | `Directory.Read.All` |
| Read/write directory data | `Directory.ReadWrite.All` | `Directory.ReadWrite.All` |
| Read all applications | `Application.Read.All` | `Application.Read.All` |
| Manage apps + service principals | `Application.ReadWrite.All` | `Application.ReadWrite.All` |
| Read Conditional Access | `Policy.Read.All` | `Policy.Read.All` |
| Manage Conditional Access | `Policy.ReadWrite.ConditionalAccess` | `Policy.ReadWrite.ConditionalAccess` |

**Important:** Application permissions require admin consent. Delegated permissions may require admin consent or allow user consent depending on the permission.
