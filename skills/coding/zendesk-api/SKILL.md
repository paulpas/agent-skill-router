---
name: zendesk-api
description: Implements Zendesk API integration (Support API, Tickets, Users, Organizations, using zenpy Python SDK with OAuth 2.0, API token auth, ticket CRUD, user management, search, macros, triggers, and Zendesk REST API patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: zendesk, zendesk api, zenpy, zendesk support, zendesk tickets, zendesk users, zendesk organizations, how do i integrate with zendesk, support ticketing
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-salesforce-api, coding-hubspot-api, coding-marketo-api
---

# Zendesk API Integration

Implements production-grade Zendesk integration using the `zenpy` Python SDK and Zendesk REST API. When loaded, this skill makes the model implement operations on Zendesk Support (Tickets, Users, Organizations, Groups), Ticket comments and attachments, User and Organization management, Search across all objects, Macros and Triggers, Views and Reports, and Zendesk's Incremental Export API for data sync. All implementations follow Zendesk best practices: use `ZENDESK_SUBDOMAIN`, `ZENDESK_EMAIL`, `ZENDESK_TOKEN` for API token auth, implement OAuth 2.0 for user-facing apps, use cursor-based pagination for list endpoints, handle rate limits with exponential backoff, use incremental export for large data syncs, and respect Zendesk's rate limits (700 requests per minute per Zendesk instance).

## TL;DR Checklist

- [ ] Use `zenpy` SDK with API token authentication (recommended)
- [ ] Use `ZENDESK_SUBDOMAIN`, `ZENDESK_EMAIL` (with `/token` suffix), `ZENDESK_TOKEN` env vars
- [ ] OAuth 2.0: Use authorization code flow for user-specific access
- [ ] Tickets: `zenpy_client.tickets()` for list, `.show()`, `.create()`, `.update()`, `.delete()`
- [ ] Users: `zenpy_client.users()` for list, `.show()`, `.create_or_update()`
- [ ] Organizations: `zenpy_client.organizations()` for list and CRUD
- [ ] Search: `zenpy_client.search(type='ticket', query='status:open')`
- [ ] Comments: Add via `TicketComment` object on ticket updates
- [ ] Pagination: Use `cursor` from response or `next()` generator
- [ ] Rate limits: 700 req/min, 429 response with `Retry-After` header
- [ ] Incremental Export: Use for syncing > 1000 records
- [ ] Never log or expose API tokens or OAuth access tokens

---

## When to Use

Use this skill when:

- Managing Zendesk support tickets (create, read, update, solve, close)
- Syncing tickets between your app and Zendesk
- Managing Zendesk users and organizations
- Searching tickets, users, or organizations with complex queries
- Automating ticket assignments and routing
- Creating/updating Zendesk macros, triggers, and views
- Processing Zendesk webhook events
- Exporting ticket data for analytics or reporting
- Building customer support integrations
- Handling ticket comments and attachments
- Managing Zendesk groups and agent permissions
- Using incremental export for large-scale data sync

---

## When NOT to Use

- For Salesforce CRM — use `coding-salesforce-api` instead
- For HubSpot marketing — use `coding-hubspot-api` instead
- For Marketo automation — use `coding-marketo-api` instead
- For simple HTTP-only use cases when zenpy is overkill
- When you need real-time chat only (use Zendesk Chat API separately)
- For knowledge base only (use Zendesk Help Center API separately)

---

## Core Workflow

1. **Initialize Client** — Create Zenpy client:
   - API Token: `Zenpy(subdomain, email+'/token', token)`
   - OAuth: `Zenpy(subdomain, oauth_token=access_token)`
   
   **Checkpoint:** Validate connection with `zenpy_client.users.me()`.

2. **Ticket Operations** — Manage support tickets:
   - List: `zenpy_client.tickets()` with optional filters
   - Get: `zenpy_client.tickets.show(ticket_id)`
   - Create: `zenpy_client.tickets.create(Ticket(subject=..., requester=...))`
   - Update: `zenpy_client.tickets.update(ticket)` with status/assignee changes
   
   **Checkpoint:** All ticket operations include audit tracking where needed.

3. **User & Organization Management** — Manage customers and companies:
   - Users: `zenpy_client.users()` — create, update, list, show
   - Organizations: `zenpy_client.organizations()` — group users by company
   - Create/Update: `users.create_or_update(User(email=..., name=...))`
   
   **Checkpoint:** User operations use `external_id` for external system sync.

4. **Search** — Query across Zendesk objects:
   - `zenpy_client.search(query='status:open type:ticket')`
   - Supports type filtering: `type='ticket'`, `type='user'`, `type='organization'`
   - Advanced: `created>2026-01-01 tags:"vip"`
   
   **Checkpoint:** Search queries handle cursor pagination properly.

5. **Comments & Attachments** — Add communication to tickets:
   - Comment: `TicketComment(body='...', public=True)`
   - Attachment: Upload first with `zenpy_client.attachments.upload()`
   - Add to ticket: Include comment in ticket update
   
   **Checkpoint:** Comments are marked public/private appropriately.

6. **Handle Limits & Rate Limiting** — Respect Zendesk's limits:
   - 700 requests per minute (varies by plan)
   - 429 response with `Retry-After` header
   - Use exponential backoff with jitter
   
   **Checkpoint:** Rate limit handling implemented and tested.

---

## Implementation Patterns

### Pattern 1: Zendesk Client Initialization (BAD vs GOOD)

```python
"""Zendesk client initialization patterns.

Key concepts:
- zenpy: Official Zendesk Python SDK (maintained by Zendesk)
- Subdomain: Your Zendesk instance (e.g., 'mycompany' for mycompany.zendesk.com)
- API Token auth: email + '/token' suffix + API token (server-to-server)
- OAuth 2.0: Authorization code flow for user-facing apps
- Rate limits: 700 requests/minute for most plans (varies)
- Pagination: Cursor-based for most list endpoints

Environment variables:
    ZENDESK_SUBDOMAIN: Your Zendesk subdomain (e.g., 'acme')
    ZENDESK_EMAIL: Agent/admin email (e.g., 'support@acme.com')
    ZENDESK_TOKEN: API token from Admin → Channels → API
    ZENDESK_OAUTH_TOKEN: OAuth access token (alternative to token auth)
"""

from __future__ import annotations

import os
import json
import time
import logging
from typing import Any, Optional, List, Dict, TypeVar, Callable, Generator
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from functools import wraps
from io import BytesIO

logger = logging.getLogger(__name__)

# Try to import zenpy
try:
    import zenpy
    from zenpy import Zenpy
    from zenpy.lib import exception as zenpy_exc
    from zenpy.lib.api_objects import (
        Ticket, User, Organization, Group,
        TicketComment, Attachment, Upload,
        Macro, Trigger, View,
    )
    ZENPY_AVAILABLE = True
except ImportError:
    ZENPY_AVAILABLE = False
    logger.warning("zenpy not installed. Run: pip install zenpy")


# ===================================================================
# ❌ BAD — hardcoded credentials, no error handling, no retry logic
# ===================================================================

def bad_zendesk_init() -> Any:
    """❌ BAD: Don't do any of these things."""
    if not ZENPY_AVAILABLE:
        raise ImportError("zenpy library required")
    
    # ❌ Hardcoded credentials! Never commit these!
    credentials = {
        "subdomain": "mycompany",
        "email": "admin@example.com",
        "token": "abc123def456ghi789",  # ❌ HARDCODED!
    }
    
    # ❌ Using email without '/token' suffix for token auth
    # ❌ Will fail silently or with confusing auth error
    
    client = Zenpy(**credentials)
    
    # ❌ No validation
    # ❌ No error handling
    # ❌ No rate limit handling
    # ❌ Using deprecated password auth (not shown, but common mistake)
    
    return client


# ===================================================================
# ✅ GOOD — env-based config, validation, OAuth refresh, retries
# ===================================================================


class ZendeskError(Exception):
    """Base exception for Zendesk integration errors."""
    
    def __init__(self, message: str, error_code: Optional[int] = None):
        super().__init__(message)
        self.error_code = error_code


class ZendeskAuthError(ZendeskError):
    """Authentication failed or token invalid/expired."""
    pass


class ZendeskRateLimitError(ZendeskError):
    """Rate limit exceeded."""
    
    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


class ZendeskNotFoundError(ZendeskError):
    """Resource not found (404)."""
    pass


# Map Zenpy exceptions to our exceptions
ZENPY_ERROR_MAP = {
    "APIException": ZendeskError,
    "AuthenticationException": ZendeskAuthError,
    "RateLimitException": ZendeskRateLimitError,
    "NotFoundException": ZendeskNotFoundError,
}


@dataclass
class ZendeskOAuthStore:
    """Stores and manages Zendesk OAuth tokens.
    
    Zendesk OAuth tokens:
    - Access tokens expire after 8 hours (28800 seconds)
    - Refresh tokens can be used to get new access tokens
    - Store refresh tokens securely (database, key vault)
    """
    
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    
    def is_access_token_valid(self) -> bool:
        """Check if access token is still valid (has > 300 seconds left)."""
        if not self.access_token or not self.expires_at:
            return False
        
        now = datetime.now(timezone.utc)
        buffer = timedelta(seconds=300)  # 5-minute buffer
        
        return self.expires_at > (now + buffer)
    
    def set_tokens(
        self,
        access_token: str,
        refresh_token: Optional[str] = None,
        expires_in_seconds: int = 28800,
    ) -> None:
        """Set tokens from OAuth response.
        
        Args:
            access_token: New access token
            refresh_token: New refresh token (if provided)
            expires_in_seconds: TTL in seconds (default 8 hours = 28800)
        """
        self.access_token = access_token
        if refresh_token:
            self.refresh_token = refresh_token
        
        self.expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in_seconds)


@dataclass
class ZendeskConfig:
    """Zendesk configuration from environment variables.
    
    Authentication methods (choose one):
    
    1. API Token (recommended for server-to-server):
       - ZENDESK_SUBDOMAIN
       - ZENDESK_EMAIL (agent email)
       - ZENDESK_TOKEN (API token from Admin)
       
       Note: Zenpy automatically adds '/token' suffix to email when using token auth.
    
    2. OAuth 2.0 (for user-facing apps):
       - ZENDESK_SUBDOMAIN
       - ZENDESK_OAUTH_TOKEN (access token)
       - ZENDESK_CLIENT_ID, ZENDESK_CLIENT_SECRET (for token refresh)
       - ZENDESK_REFRESH_TOKEN
    """
    
    # Required for all auth types
    subdomain: Optional[str] = None
    
    # API Token auth
    email: Optional[str] = None
    token: Optional[str] = None
    
    # OAuth 2.0 auth
    oauth_token: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    refresh_token: Optional[str] = None
    redirect_uri: Optional[str] = None
    
    # Request config
    timeout: float = 60.0
    max_retries: int = 5
    initial_retry_delay: float = 1.0
    max_retry_delay: float = 60.0
    
    @classmethod
    def from_env(cls) -> "ZendeskConfig":
        """Load configuration from environment variables."""
        
        def parse_float(env_var: str, default: float) -> float:
            val = os.environ.get(env_var)
            if val is None:
                return default
            try:
                return float(val)
            except ValueError:
                return default
        
        def parse_int(env_var: str, default: int) -> int:
            val = os.environ.get(env_var)
            if val is None:
                return default
            try:
                return int(val)
            except ValueError:
                return default
        
        return cls(
            # Connection
            subdomain=os.environ.get("ZENDESK_SUBDOMAIN"),
            
            # API Token auth
            email=os.environ.get("ZENDESK_EMAIL"),
            token=os.environ.get("ZENDESK_TOKEN"),
            
            # OAuth
            oauth_token=os.environ.get("ZENDESK_OAUTH_TOKEN"),
            client_id=os.environ.get("ZENDESK_CLIENT_ID"),
            client_secret=os.environ.get("ZENDESK_CLIENT_SECRET"),
            refresh_token=os.environ.get("ZENDESK_REFRESH_TOKEN"),
            redirect_uri=os.environ.get("ZENDESK_REDIRECT_URI"),
            
            # Config
            timeout=parse_float("ZENDESK_TIMEOUT", 60.0),
            max_retries=parse_int("ZENDESK_MAX_RETRIES", 5),
        )
    
    def is_enabled(self) -> bool:
        """Check if Zendesk is configured."""
        # Need subdomain regardless
        if not self.subdomain:
            return False
        
        # API Token auth
        if self.email and self.token:
            return True
        
        # OAuth token auth
        if self.oauth_token:
            return True
        
        # OAuth with refresh token (can be refreshed)
        if self.client_id and self.client_secret and self.refresh_token:
            return True
        
        return False
    
    def validate(self) -> bool:
        """Validate configuration.
        
        Returns:
            True if valid
            
        Raises:
            ValueError: If invalid when enabled
        """
        if not self.is_enabled():
            logger.info("Zendesk not configured")
            return True
        
        if not self.subdomain:
            raise ValueError("ZENDESK_SUBDOMAIN is required")
        
        # Validate auth method
        has_token_auth = bool(self.email and self.token)
        has_oauth_auth = bool(self.oauth_token)
        has_oauth_refresh = bool(self.client_id and self.client_secret and self.refresh_token)
        
        if not (has_token_auth or has_oauth_auth or has_oauth_refresh):
            raise ValueError(
                "Zendesk auth not configured. "
                "Provide either (email+token) or (oauth_token) or (client_id+client_secret+refresh_token)"
            )
        
        return True
    
    def get_zenpy_credentials(self) -> Dict[str, Any]:
        """Get credentials dict for Zenpy client initialization.
        
        Returns:
            Dict suitable for Zenpy(**credentials)
        """
        credentials: Dict[str, Any] = {
            "subdomain": self.subdomain,
        }
        
        # API Token auth
        if self.email and self.token:
            credentials["email"] = self.email
            credentials["token"] = self.token
        
        # OAuth auth
        elif self.oauth_token:
            credentials["oauth_token"] = self.oauth_token
        
        return credentials


class ZendeskClient:
    """Production-grade Zendesk client with OAuth refresh and retry handling.
    
    Features:
    - Config from environment
    - Automatic OAuth token refresh
    - Exponential backoff for rate limits
    - Pagination helpers
    - Unified error handling
    """
    
    # Ticket status values
    STATUS_NEW = "new"
    STATUS_OPEN = "open"
    STATUS_PENDING = "pending"
    STATUS_HOLD = "hold"
    STATUS_SOLVED = "solved"
    STATUS_CLOSED = "closed"
    
    # Ticket priority values
    PRIORITY_LOW = "low"
    PRIORITY_NORMAL = "normal"
    PRIORITY_HIGH = "high"
    PRIORITY_URGENT = "urgent"
    
    # User roles
    ROLE_END_USER = "end-user"
    ROLE_AGENT = "agent"
    ROLE_ADMIN = "admin"
    
    def __init__(self, config: ZendeskConfig) -> None:
        self._config = config
        self._oauth_store = ZendeskOAuthStore()
        self._client: Optional[Zenpy] = None
        self._client_credentials: Optional[Dict[str, Any]] = None
        
        # Initialize OAuth store if using OAuth with refresh
        if config.refresh_token:
            self._oauth_store.refresh_token = config.refresh_token
    
    def _refresh_oauth_token(self) -> str:
        """Refresh OAuth access token using refresh token.
        
        Returns:
            New access token
            
        Raises:
            ZendeskAuthError: If refresh fails
        """
        import requests
        
        if not self._config.client_id or not self._config.client_secret:
            raise ZendeskAuthError("OAuth client ID/secret not configured")
        
        if not self._oauth_store.refresh_token:
            raise ZendeskAuthError("No refresh token available")
        
        token_url = f"https://{self._config.subdomain}.zendesk.com/oauth/tokens"
        
        data = {
            "grant_type": "refresh_token",
            "client_id": self._config.client_id,
            "client_secret": self._config.client_secret,
            "refresh_token": self._oauth_store.refresh_token,
            "redirect_uri": self._config.redirect_uri,
        }
        
        try:
            response = requests.post(
                token_url,
                json=data,
                timeout=self._config.timeout,
            )
            response.raise_for_status()
            
            token_data = response.json()
            
            access_token = token_data.get("access_token")
            if not access_token:
                raise ZendeskAuthError("Token response missing access_token")
            
            refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in", 28800)
            
            # Update token store
            self._oauth_store.set_tokens(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in_seconds=expires_in,
            )
            
            # Also update config
            self._config.oauth_token = access_token
            if refresh_token:
                self._config.refresh_token = refresh_token
            
            logger.info(
                "Zendesk OAuth token refreshed, expires in %d seconds",
                expires_in
            )
            
            # Persist new refresh token if needed
            # self._persist_refresh_token(self._oauth_store.refresh_token)
            
            return access_token
            
        except requests.exceptions.RequestException as e:
            raise ZendeskAuthError(f"Failed to refresh Zendesk OAuth token: {e}") from e
    
    def _get_client(self) -> Zenpy:
        """Get or create the Zenpy client with fresh credentials.
        
        Lazy-loaded and handles OAuth refresh.
        """
        if not ZENPY_AVAILABLE:
            raise ImportError(
                "zenpy not installed. Run: pip install zenpy"
            )
        
        self._config.validate()
        
        # Check if we need OAuth refresh
        using_oauth = bool(
            self._config.oauth_token
            or (self._config.client_id and self._config.client_secret and self._config.refresh_token)
        )
        
        if using_oauth:
            # Check if token needs refresh
            if not self._oauth_store.is_access_token_valid():
                if self._oauth_store.refresh_token:
                    logger.info("Zendesk OAuth token expired or missing, refreshing...")
                    self._refresh_oauth_token()
                elif self._config.oauth_token:
                    # Use config token directly (no refresh available)
                    self._oauth_store.access_token = self._config.oauth_token
                else:
                    raise ZendeskAuthError("No valid Zendesk OAuth credentials available")
            
            # Build credentials with current access token
            credentials = {
                "subdomain": self._config.subdomain,
                "oauth_token": self._oauth_store.access_token,
            }
        else:
            # API Token auth
            credentials = self._config.get_zenpy_credentials()
        
        # Create new client if first time or credentials changed
        if self._client is None or self._client_credentials != credentials:
            self._client = Zenpy(**credentials)
            self._client_credentials = dict(credentials)
            logger.info("Zendesk client (re)initialized")
        
        return self._client
    
    @property
    def zenpy(self) -> Zenpy:
        """Access the underlying Zenpy client."""
        return self._get_client()
    
    # ===================================================================
    # Retry Wrapper for Rate Limits
    # ===================================================================
    
    def _execute_with_retry(
        self,
        operation: Callable[[], Any],
        operation_name: str = "operation",
    ) -> Any:
        """Execute a Zendesk API operation with retry for rate limits.
        
        Zenpy RateLimitException has a 'response' attribute with headers.
        Look for Retry-After header.
        
        Args:
            operation: Callable that makes the API call via Zenpy
            operation_name: Name for logging
            
        Returns:
            API response
            
        Raises:
            ZendeskError: Various error types
        """
        import random
        
        delay = self._config.initial_retry_delay
        last_exception: Optional[Exception] = None
        
        for attempt in range(self._config.max_retries):
            try:
                return operation()
                
            except zenpy_exc.RateLimitException as e:
                last_exception = e
                
                # Try to get Retry-After header
                retry_after = None
                if hasattr(e, 'response') and e.response is not None:
                    retry_after_str = e.response.headers.get('Retry-After')
                    if retry_after_str:
                        try:
                            retry_after = int(retry_after_str)
                        except ValueError:
                            pass
                
                if retry_after:
                    wait_time = float(retry_after)
                    logger.warning(
                        "Zendesk rate limited on %s (attempt %d/%d). Retry-After: %ds",
                        operation_name, attempt + 1, self._config.max_retries, retry_after
                    )
                else:
                    wait_time = min(
                        delay * (2 ** attempt) + random.uniform(0, 1),
                        self._config.max_retry_delay
                    )
                    logger.warning(
                        "Zendesk rate limited on %s (attempt %d/%d). Waiting %.1fs",
                        operation_name, attempt + 1, self._config.max_retries, wait_time
                    )
                
                time.sleep(wait_time)
                continue
            
            except zenpy_exc.AuthenticationException as e:
                # If OAuth with refresh, try refreshing once on first attempt
                using_oauth_refresh = bool(
                    self._config.client_id and self._config.client_secret and self._oauth_store.refresh_token
                )
                
                if using_oauth_refresh and attempt == 0:
                    logger.warning("Zendesk auth error, attempting token refresh...")
                    try:
                        self._refresh_oauth_token()
                        self._client = None  # Force re-init
                        continue
                    except Exception as refresh_e:
                        logger.error("Token refresh failed: %s", refresh_e)
                
                raise ZendeskAuthError(f"Zendesk authentication failed: {e}") from e
            
            except zenpy_exc.NotFoundException as e:
                raise ZendeskNotFoundError(f"Zendesk resource not found: {e}") from e
            
            except zenpy_exc.APIException as e:
                # Check error type
                error_msg = str(e)
                
                # Some 4xx errors are retry-worthy
                if "timeout" in error_msg.lower() or "503" in error_msg:
                    last_exception = e
                    wait_time = min(
                        delay * (2 ** attempt) + random.uniform(0, 1),
                        self._config.max_retry_delay
                    )
                    logger.warning(
                        "Zendesk transient error on %s: %s. Retrying in %.1fs",
                        operation_name, error_msg, wait_time
                    )
                    time.sleep(wait_time)
                    continue
                
                # Other API errors
                raise ZendeskError(f"Zendesk API error: {e}") from e
            
            except Exception as e:
                # Non-Zenpy exceptions
                last_exception = e
                
                if attempt < self._config.max_retries - 1:
                    wait_time = min(
                        delay * (2 ** attempt) + random.uniform(0, 1),
                        self._config.max_retry_delay
                    )
                    logger.warning(
                        "Request error on %s (attempt %d/%d): %s. Retrying in %.1fs",
                        operation_name, attempt + 1, self._config.max_retries, e, wait_time
                    )
                    time.sleep(wait_time)
                    continue
                
                raise ZendeskError(f"Zendesk operation failed: {e}") from e
        
        # All retries exhausted
        raise ZendeskRateLimitError(
            f"Rate limit retries exhausted after {self._config.max_retries} attempts"
        ) from last_exception
    
    # ===================================================================
    # Direct API Access Properties
    # ===================================================================
    
    @property
    def tickets(self) -> Any:
        """Tickets API."""
        return self.zenpy.tickets
    
    @property
    def users(self) -> Any:
        """Users API."""
        return self.zenpy.users
    
    @property
    def organizations(self) -> Any:
        """Organizations API."""
        return self.zenpy.organizations
    
    @property
    def groups(self) -> Any:
        """Groups API."""
        return self.zenpy.groups
    
    @property
    def search(self) -> Any:
        """Search API."""
        return self.zenpy.search
    
    @property
    def macros(self) -> Any:
        """Macros API."""
        return self.zenpy.macros
    
    @property
    def triggers(self) -> Any:
        """Triggers API."""
        return self.zenpy.triggers
    
    @property
    def attachments(self) -> Any:
        """Attachments API."""
        return self.zenpy.attachments
    
    @property
    def incremental(self) -> Any:
        """Incremental Export API (for large syncs)."""
        return self.zenpy.incremental
    
    # ===================================================================
    # Ticket Operations
    # ===================================================================
    
    def get_ticket(
        self,
        ticket_id: int,
        include: Optional[List[str]] = None,
    ) -> Optional[Ticket]:
        """Get a single Ticket by ID.
        
        Args:
            ticket_id: Zendesk ticket ID
            include: Optional includes: 'users', 'organizations', 'groups',
                     'comment_count', 'last_audits', etc.
            
        Returns:
            Ticket object or None if not found
        """
        include_list = include or []
        
        def _op():
            return self.tickets.show(ticket_id, include=include_list)
        
        try:
            return self._execute_with_retry(_op, f"get_ticket({ticket_id})")
        except ZendeskNotFoundError:
            return None
    
    def create_ticket(
        self,
        subject: str,
        requester_email: Optional[str] = None,
        requester_name: Optional[str] = None,
        requester_id: Optional[int] = None,
        comment_body: Optional[str] = None,
        comment_public: bool = True,
        priority: str = "normal",
        status: str = "new",
        assignee_id: Optional[int] = None,
        group_id: Optional[int] = None,
        organization_id: Optional[int] = None,
        tags: Optional[List[str]] = None,
        custom_fields: Optional[List[Dict[str, Any]]] = None,
        external_id: Optional[str] = None,
    ) -> Ticket:
        """Create a new Ticket.
        
        Args:
            subject: Ticket subject (required)
            requester_email: Requester email (either this or requester_id required)
            requester_name: Requester name (for email-based requester)
            requester_id: Existing Zendesk user ID
            comment_body: Initial comment/description
            comment_public: Whether comment is visible to end-user
            priority: low, normal, high, urgent
            status: new, open, pending, hold, solved, closed
            assignee_id: Agent ID to assign to
            group_id: Group ID to assign to
            organization_id: Organization ID
            tags: List of tags
            custom_fields: List of {'id': field_id, 'value': value}
            external_id: External system ID for sync
            
        Returns:
            Created Ticket object
        """
        # Build ticket
        ticket_kwargs: Dict[str, Any] = {
            "subject": subject,
            "status": status,
            "priority": priority,
        }
        
        # Requester
        if requester_id:
            ticket_kwargs["requester_id"] = requester_id
        elif requester_email:
            requester_dict: Dict[str, str] = {"email": requester_email}
            if requester_name:
                requester_dict["name"] = requester_name
            ticket_kwargs["requester"] = requester_dict
        else:
            raise ValueError("Either requester_email or requester_id is required")
        
        # Assignment
        if assignee_id:
            ticket_kwargs["assignee_id"] = assignee_id
        if group_id:
            ticket_kwargs["group_id"] = group_id
        if organization_id:
            ticket_kwargs["organization_id"] = organization_id
        
        # Tags
        if tags:
            ticket_kwargs["tags"] = tags
        
        # Custom fields
        if custom_fields:
            ticket_kwargs["custom_fields"] = custom_fields
        
        # External ID
        if external_id:
            ticket_kwargs["external_id"] = external_id
        
        ticket = Ticket(**ticket_kwargs)
        
        # Initial comment
        if comment_body:
            ticket.comment = TicketComment(
                body=comment_body,
                public=comment_public,
            )
        
        def _op():
            return self.tickets.create(ticket)
        
        created = self._execute_with_retry(_op, "create_ticket")
        
        logger.info(
            "Created ticket #%d: %s (requester: %s)",
            created.id, created.subject[:50],
            requester_email or f"user {requester_id}"
        )
        
        return created
    
    def update_ticket(
        self,
        ticket_id: int,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        assignee_id: Optional[int] = None,
        group_id: Optional[int] = None,
        comment_body: Optional[str] = None,
        comment_public: bool = True,
        comment_author_id: Optional[int] = None,
        tags: Optional[List[str]] = None,
        additional_tags: Optional[List[str]] = None,
        remove_tags: Optional[List[str]] = None,
        custom_fields: Optional[List[Dict[str, Any]]] = None,
        external_id: Optional[str] = None,
        macro_id: Optional[int] = None,
    ) -> Ticket:
        """Update an existing Ticket.
        
        Args:
            ticket_id: Ticket ID to update
            status: New status (or None for no change)
            priority: New priority
            assignee_id: New assignee
            group_id: New group
            comment_body: Comment to add
            comment_public: Whether comment is visible to end-user
            comment_author_id: Author of the comment (agent ID)
            tags: Replace tags with this list
            additional_tags: Add these tags (don't replace)
            remove_tags: Remove these tags
            custom_fields: Custom field updates
            external_id: External ID
            macro_id: Apply a macro instead of manual updates
            
        Returns:
            Updated Ticket object
        """
        # Get existing ticket first
        existing = self.get_ticket(ticket_id)
        if existing is None:
            raise ZendeskNotFoundError(f"Ticket not found: {ticket_id}")
        
        # Build updates
        update_kwargs: Dict[str, Any] = {}
        
        if status:
            update_kwargs["status"] = status
        if priority:
            update_kwargs["priority"] = priority
        if assignee_id is not None:
            update_kwargs["assignee_id"] = assignee_id
        if group_id is not None:
            update_kwargs["group_id"] = group_id
        if external_id:
            update_kwargs["external_id"] = external_id
        
        # Tags handling
        if tags:
            update_kwargs["tags"] = tags
        elif additional_tags or remove_tags:
            current_tags = set(existing.tags or [])
            if additional_tags:
                current_tags.update(additional_tags)
            if remove_tags:
                current_tags.difference_update(remove_tags)
            update_kwargs["tags"] = list(current_tags)
        
        # Custom fields
        if custom_fields:
            update_kwargs["custom_fields"] = custom_fields
        
        # Create update object
        for key, value in update_kwargs.items():
            setattr(existing, key, value)
        
        # Add comment
        if comment_body:
            comment_kwargs: Dict[str, Any] = {
                "body": comment_body,
                "public": comment_public,
            }
            if comment_author_id:
                comment_kwargs["author_id"] = comment_author_id
            
            existing.comment = TicketComment(**comment_kwargs)
        
        # Apply macro if specified
        if macro_id:
            # Get macro
            macro = self.macros.show(macro_id)
            if macro:
                # Apply macro to ticket
                existing = self.tickets.apply_macro(existing, macro)
        
        def _op():
            return self.tickets.update(existing)
        
        updated = self._execute_with_retry(_op, f"update_ticket({ticket_id})")
        
        if comment_body:
            logger.info(
                "Updated ticket #%d with %s comment",
                ticket_id, "public" if comment_public else "private"
            )
        else:
            logger.info("Updated ticket #%d", ticket_id)
        
        return updated
    
    def list_tickets(
        self,
        status: Optional[str] = None,
        assignee_id: Optional[int] = None,
        requester_id: Optional[int] = None,
        organization_id: Optional[int] = None,
        group_id: Optional[int] = None,
        tags: Optional[List[str]] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        limit: Optional[int] = None,
    ) -> Generator[Ticket, None, None]:
        """List Tickets with optional filters (generator for pagination).
        
        Args:
            status: Filter by status
            assignee_id: Filter by assignee
            requester_id: Filter by requester
            organization_id: Filter by organization
            group_id: Filter by group
            tags: Filter by tags (comma-separated or list)
            sort_by: created_at, updated_at, priority, status
            sort_order: asc, desc
            limit: Optional max tickets to yield
            
        Yields:
            Ticket objects
        """
        # Build query for search-based filtering (more flexible)
        use_search = (
            status is not None
            or assignee_id is not None
            or requester_id is not None
            or organization_id is not None
            or group_id is not None
            or tags is not None
        )
        
        if use_search:
            # Use Search API for filtered listing
            query_parts: List[str] = ["type:ticket"]
            
            if status:
                query_parts.append(f"status:{status}")
            if assignee_id:
                query_parts.append(f"assignee:{assignee_id}")
            if requester_id:
                query_parts.append(f"requester:{requester_id}")
            if organization_id:
                query_parts.append(f"organization:{organization_id}")
            if group_id:
                query_parts.append(f"group:{group_id}")
            if tags:
                tag_str = " ".join(f"tags:{tag}" for tag in tags)
                query_parts.append(tag_str)
            
            query = " ".join(query_parts)
            
            # Use search
            for ticket in self.search_tickets(
                query=query,
                sort_by=sort_by,
                sort_order=sort_order,
                limit=limit,
            ):
                yield ticket
        
        else:
            # Simple list without filters
            count = 0
            
            def _op():
                return self.tickets.list(sort_by=sort_by, sort_order=sort_order)
            
            ticket_generator = self._execute_with_retry(_op, "list_tickets")
            
            for ticket in ticket_generator:
                if limit and count >= limit:
                    break
                yield ticket
                count += 1
    
    def search_tickets(
        self,
        query: str,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        limit: Optional[int] = None,
    ) -> Generator[Ticket, None, None]:
        """Search for Tickets using Zendesk search query syntax.
        
        Search query examples:
        - "status:open priority:high"
        - "created>2026-01-01 tags:vip"
        - "subject:password reset"
        - "assignee:john@example.com"
        
        Args:
            query: Zendesk search query string
            sort_by: created_at, updated_at, priority, status
            sort_order: asc, desc
            limit: Optional max to yield
            
        Yields:
            Ticket objects
        """
        count = 0
        
        def _op():
            return self.search(
                query=query,
                type="ticket",
                sort_by=sort_by,
                sort_order=sort_order,
            )
        
        results = self._execute_with_retry(_op, f"search_tickets({query[:50]})")
        
        for ticket in results:
            if limit and count >= limit:
                break
            yield ticket
            count += 1
    
    # ===================================================================
    # User Operations
    # ===================================================================
    
    def get_user(
        self,
        user_id: int,
    ) -> Optional[User]:
        """Get a User by ID.
        
        Args:
            user_id: Zendesk user ID
            
        Returns:
            User object or None
        """
        def _op():
            return self.users.show(user_id)
        
        try:
            return self._execute_with_retry(_op, f"get_user({user_id})")
        except ZendeskNotFoundError:
            return None
    
    def get_user_by_email(
        self,
        email: str,
    ) -> Optional[User]:
        """Get a User by email address.
        
        Args:
            email: Email address
            
        Returns:
            User object or None
        """
        def _op():
            return self.users.list(email=email.lower().strip())
        
        results = self._execute_with_retry(_op, f"get_user_by_email({email})")
        
        # Results is a generator, convert to list
        user_list = list(results)
        
        if not user_list:
            return None
        
        return user_list[0]
    
    def find_or_create_user(
        self,
        email: str,
        name: Optional[str] = None,
        role: str = "end-user",
        organization_id: Optional[int] = None,
        external_id: Optional[str] = None,
        phone: Optional[str] = None,
        details: Optional[str] = None,
        notes: Optional[str] = None,
        tags: Optional[List[str]] = None,
        user_fields: Optional[Dict[str, Any]] = None,
    ) -> tuple[User, bool]:
        """Find an existing User by email, or create if not found.
        
        Args:
            email: User email (required)
            name: User name
            role: end-user, agent, admin
            organization_id: Organization ID
            external_id: External system ID
            phone: Phone number
            details: Details text
            notes: Internal notes
            tags: Tags
            user_fields: Custom user fields dict
            
        Returns:
            Tuple of (User, was_created)
        """
        email_lower = email.lower().strip()
        
        # Search by email first
        existing = self.get_user_by_email(email_lower)
        
        if existing:
            logger.debug("Found existing user: %s (%s)", email_lower, existing.id)
            return existing, False
        
        # Create new user
        user_kwargs: Dict[str, Any] = {
            "email": email_lower,
            "role": role,
        }
        
        if name:
            user_kwargs["name"] = name
        else:
            # Default name from email
            user_kwargs["name"] = email_lower.split("@")[0]
        
        if organization_id:
            user_kwargs["organization_id"] = organization_id
        if external_id:
            user_kwargs["external_id"] = external_id
        if phone:
            user_kwargs["phone"] = phone
        if details:
            user_kwargs["details"] = details
        if notes:
            user_kwargs["notes"] = notes
        if tags:
            user_kwargs["tags"] = tags
        if user_fields:
            user_kwargs["user_fields"] = user_fields
        
        user = User(**user_kwargs)
        
        def _op():
            return self.users.create_or_update(user)
        
        created = self._execute_with_retry(_op, f"find_or_create_user({email_lower})")
        
        logger.info("Created new user: %s (%s)", email_lower, created.id)
        
        return created, True
    
    def update_user(
        self,
        user_id: int,
        name: Optional[str] = None,
        phone: Optional[str] = None,
        organization_id: Optional[int] = None,
        external_id: Optional[str] = None,
        details: Optional[str] = None,
        notes: Optional[str] = None,
        tags: Optional[List[str]] = None,
        additional_tags: Optional[List[str]] = None,
        remove_tags: Optional[List[str]] = None,
        user_fields: Optional[Dict[str, Any]] = None,
    ) -> User:
        """Update an existing User.
        
        Args:
            user_id: User ID
            name: New name
            phone: New phone
            organization_id: New organization
            external_id: External ID
            details: Details
            notes: Notes
            tags: Replace all tags
            additional_tags: Add tags
            remove_tags: Remove tags
            user_fields: Custom fields
            
        Returns:
            Updated User
        """
        existing = self.get_user(user_id)
        if existing is None:
            raise ZendeskNotFoundError(f"User not found: {user_id}")
        
        # Apply updates
        if name:
            existing.name = name
        if phone:
            existing.phone = phone
        if organization_id is not None:
            existing.organization_id = organization_id
        if external_id:
            existing.external_id = external_id
        if details:
            existing.details = details
        if notes:
            existing.notes = notes
        
        # Tags
        if tags is not None:
            existing.tags = tags
        elif additional_tags or remove_tags:
            current_tags = set(existing.tags or [])
            if additional_tags:
                current_tags.update(additional_tags)
            if remove_tags:
                current_tags.difference_update(remove_tags)
            existing.tags = list(current_tags)
        
        # Custom fields
        if user_fields:
            if existing.user_fields:
                existing.user_fields.update(user_fields)
            else:
                existing.user_fields = dict(user_fields)
        
        def _op():
            return self.users.update(existing)
        
        updated = self._execute_with_retry(_op, f"update_user({user_id})")
        
        logger.info("Updated user: %d", user_id)
        
        return updated
    
    def list_users(
        self,
        role: Optional[str] = None,
        organization_id: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> Generator[User, None, None]:
        """List Users with optional filters.
        
        Args:
            role: Filter by role (end-user, agent, admin)
            organization_id: Filter by organization
            limit: Optional max to yield
            
        Yields:
            User objects
        """
        list_kwargs: Dict[str, Any] = {}
        if role:
            list_kwargs["role"] = role
        if organization_id:
            list_kwargs["organization_id"] = organization_id
        
        count = 0
        
        def _op():
            return self.users.list(**list_kwargs)
        
        results = self._execute_with_retry(_op, "list_users")
        
        for user in results:
            if limit and count >= limit:
                break
            yield user
            count += 1
    
    # ===================================================================
    # Organization Operations
    # ===================================================================
    
    def get_organization(
        self,
        org_id: int,
    ) -> Optional[Organization]:
        """Get an Organization by ID.
        
        Args:
            org_id: Organization ID
            
        Returns:
            Organization or None
        """
        def _op():
            return self.organizations.show(org_id)
        
        try:
            return self._execute_with_retry(_op, f"get_organization({org_id})")
        except ZendeskNotFoundError:
            return None
    
    def get_organization_by_external_id(
        self,
        external_id: str,
    ) -> Optional[Organization]:
        """Get Organization by external_id.
        
        Args:
            external_id: External system ID
            
        Returns:
            Organization or None
        """
        def _op():
            # Use search for external_id lookup
            return self.search(
                query=f"type:organization external_id:{external_id}",
                type="organization",
            )
        
        try:
            results = list(self._execute_with_retry(_op, f"get_org_by_external_id({external_id})"))
            return results[0] if results else None
        except Exception:
            return None
    
    def create_or_update_organization(
        self,
        name: str,
        external_id: Optional[str] = None,
        domain_names: Optional[List[str]] = None,
        details: Optional[str] = None,
        notes: Optional[str] = None,
        tags: Optional[List[str]] = None,
        organization_fields: Optional[Dict[str, Any]] = None,
    ) -> Organization:
        """Create or update an Organization (by name + external_id).
        
        If external_id is provided, looks up by that first.
        Otherwise, looks up by name.
        
        Args:
            name: Organization name (required)
            external_id: External system ID
            domain_names: Email domains for auto-association
            details: Details text
            notes: Internal notes
            tags: Tags
            organization_fields: Custom fields
            
        Returns:
            Organization object (created or updated)
        """
        # Try to find existing
        existing = None
        
        if external_id:
            existing = self.get_organization_by_external_id(external_id)
        
        if not existing:
            # Search by name
            def _search_op():
                return self.search(
                    query=f'type:organization name:"{name}"',
                    type="organization",
                )
            
            try:
                org_results = list(self._execute_with_retry(_search_op, f"search_org({name})"))
                if org_results:
                    existing = org_results[0]
            except Exception:
                pass
        
        # Build org object
        org_kwargs: Dict[str, Any] = {
            "name": name,
        }
        
        if external_id:
            org_kwargs["external_id"] = external_id
        if domain_names:
            org_kwargs["domain_names"] = domain_names
        if details:
            org_kwargs["details"] = details
        if notes:
            org_kwargs["notes"] = notes
        if tags:
            org_kwargs["tags"] = tags
        if organization_fields:
            org_kwargs["organization_fields"] = organization_fields
        
        if existing:
            # Update existing
            for key, value in org_kwargs.items():
                setattr(existing, key, value)
            
            def _update_op():
                return self.organizations.update(existing)
            
            result = self._execute_with_retry(_update_op, f"update_organization({existing.id})")
            logger.info("Updated organization: %s (%d)", name, result.id)
            return result
        
        else:
            # Create new
            org = Organization(**org_kwargs)
            
            def _create_op():
                return self.organizations.create(org)
            
            result = self._execute_with_retry(_create_op, f"create_organization({name})")
            logger.info("Created organization: %s (%d)", name, result.id)
            return result
    
    # ===================================================================
    # Comments & Attachments
    # ===================================================================
    
    def add_comment(
        self,
        ticket_id: int,
        body: str,
        public: bool = True,
        author_id: Optional[int] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Ticket:
        """Add a comment to an existing Ticket.
        
        Args:
            ticket_id: Ticket ID
            body: Comment text/markdown
            public: Whether visible to end-user
            author_id: Author user ID (agent)
            attachments: List of upload tokens from upload_attachment()
            
        Returns:
            Updated Ticket
        """
        return self.update_ticket(
            ticket_id=ticket_id,
            comment_body=body,
            comment_public=public,
            comment_author_id=author_id,
            # TODO: attachments via upload tokens
        )
    
    def upload_attachment(
        self,
        file_data: bytes,
        filename: str,
        content_type: Optional[str] = None,
    ) -> Upload:
        """Upload a file for attachment to a ticket comment.
        
        Upload first, then use the token in a TicketComment.uploads list.
        
        Args:
            file_data: Raw file bytes
            filename: Filename for the attachment
            content_type: MIME type (optional, auto-detected)
            
        Returns:
            Upload object with token
        """
        import io
        
        file_io = io.BytesIO(file_data)
        
        def _op():
            return self.attachments.upload(
                file_io,
                filename=filename,
                content_type=content_type,
            )
        
        upload = self._execute_with_retry(_op, f"upload_attachment({filename})")
        
        logger.info("Uploaded attachment: %s (token: %s...)", filename, upload.token[:20])
        
        return upload
    
    def upload_attachment_from_path(
        self,
        file_path: str,
        filename: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> Upload:
        """Upload a file from local filesystem.
        
        Args:
            file_path: Path to file
            filename: Override filename (defaults to basename)
            content_type: MIME type
            
        Returns:
            Upload object
        """
        import os
        
        if filename is None:
            filename = os.path.basename(file_path)
        
        with open(file_path, "rb") as f:
            file_data = f.read()
        
        return self.upload_attachment(
            file_data=file_data,
            filename=filename,
            content_type=content_type,
        )
    
    # ===================================================================
    # Incremental Export (for large data syncs)
    # ===================================================================
    
    def incremental_tickets(
        self,
        start_time: datetime,
    ) -> Generator[Ticket, None, None]:
        """Incremental ticket export for syncing large datasets.
        
        Use this instead of list_tickets() when:
        - You need to sync all tickets to another system
        - You have more than 1000 tickets
        - You need to track what changed since last sync
        
        Args:
            start_time: Get tickets updated since this time
            
        Yields:
            Ticket objects
        """
        start_unix = int(start_time.timestamp())
        
        def _op():
            return self.incremental.tickets(start_time=start_unix)
        
        results = self._execute_with_retry(_op, f"incremental_tickets({start_time})")
        
        for ticket in results:
            yield ticket
    
    def incremental_users(
        self,
        start_time: datetime,
    ) -> Generator[User, None, None]:
        """Incremental user export.
        
        Args:
            start_time: Get users updated since this time
            
        Yields:
            User objects
        """
        start_unix = int(start_time.timestamp())
        
        def _op():
            return self.incremental.users(start_time=start_unix)
        
        results = self._execute_with_retry(_op, f"incremental_users({start_time})")
        
        for user in results:
            yield user
    
    def incremental_organizations(
        self,
        start_time: datetime,
    ) -> Generator[Organization, None, None]:
        """Incremental organization export.
        
        Args:
            start_time: Get orgs updated since this time
            
        Yields:
            Organization objects
        """
        start_unix = int(start_time.timestamp())
        
        def _op():
            return self.incremental.organizations(start_time=start_unix)
        
        results = self._execute_with_retry(_op, f"incremental_orgs({start_time})")
        
        for org in results:
            yield org


# ===================================================================
# Webhook Handler
# ===================================================================

class ZendeskWebhookHandler:
    """Handler for Zendesk webhook events (HTTP POST to your endpoint).
    
    Zendesk Webhook Setup:
    1. Admin → Extensions → Webhooks → Add Webhook
    2. Enter your endpoint URL
    3. Choose authentication (Basic Auth, Bearer Token, or None)
    4. Create a Trigger or Automation that calls this webhook
    
    Common Event Payloads (JSON):
    
    Ticket Created:
    {
        "ticket": { "id": 123, "subject": "...", "status": "new", ... },
        "current_user": { "id": 456, "name": "System", ... },
        "comment": { "id": 789, "body": "...", "public": true, ... }
    }
    
    Ticket Updated:
    {
        "ticket": { "id": 123, ... },
        "current_user": { ... },
        "comment": { ... },  # If comment added
        "ticket_event": {
            "type": "Update",
            "previous_attributes": { "status": "new" },
            "current_attributes": { "status": "open" }
        }
    }
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        basic_auth_username: Optional[str] = None,
        basic_auth_password: Optional[str] = None,
    ):
        """
        Args:
            api_key: API key for header validation
            basic_auth_username: For Basic Auth webhooks
            basic_auth_password: For Basic Auth webhooks
        """
        self._api_key = api_key
        self._basic_auth_username = basic_auth_username
        self._basic_auth_password = basic_auth_password
    
    def validate_request(
        self,
        headers: Dict[str, str],
        authorization_header: Optional[str] = None,
        api_key_param: Optional[str] = None,
    ) -> tuple[bool, Optional[str]]:
        """Validate incoming webhook request.
        
        Args:
            headers: Request headers dict
            authorization_header: 'Authorization' header value
            api_key_param: API key from query or header
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Basic Auth validation
        if self._basic_auth_username and self._basic_auth_password:
            import base64
            
            expected_auth = "Basic " + base64.b64encode(
                f"{self._basic_auth_username}:{self._basic_auth_password}".encode()
            ).decode()
            
            if authorization_header != expected_auth:
                return False, "Invalid Basic Auth credentials"
        
        # API key validation
        if self._api_key:
            key_candidates = [
                api_key_param,
                headers.get("X-API-Key", ""),
                headers.get("x-api-key", ""),
            ]
            
            if not any(key == self._api_key for key in key_candidates if key):
                return False, "Invalid or missing API key"
        
        return True, None
    
    def parse_ticket_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Parse webhook payload into normalized ticket event.
        
        Args:
            payload: Raw JSON payload from Zendesk
            
        Returns:
            Normalized dict with:
            - event_type: 'ticket_created', 'ticket_updated', 'comment_added'
            - ticket_id: Ticket ID
            - ticket: Full ticket dict
            - comment: Comment dict (if present)
            - changes: Dict of field changes (if updated)
            - current_user_id: User who triggered event
        """
        ticket = payload.get("ticket", {})
        ticket_id = ticket.get("id")
        
        # Determine event type
        event_type = "ticket_event"
        changes: Dict[str, Dict[str, Any]] = {}
        
        ticket_event = payload.get("ticket_event", {})
        if ticket_event:
            prev_attrs = ticket_event.get("previous_attributes", {})
            curr_attrs = ticket_event.get("current_attributes", {})
            
            if prev_attrs is None:
                # First save = create
                event_type = "ticket_created"
            else:
                event_type = "ticket_updated"
                
                # Build changes dict
                for key in set(list(prev_attrs.keys()) + list(curr_attrs.keys())):
                    old_val = prev_attrs.get(key)
                    new_val = curr_attrs.get(key)
                    if old_val != new_val:
                        changes[key] = {"old": old_val, "new": new_val}
        
        comment = payload.get("comment", {})
        if comment and "body" in comment:
            event_type = "comment_added"
        
        current_user = payload.get("current_user", {})
        
        return {
            "event_type": event_type,
            "ticket_id": ticket_id,
            "ticket": ticket,
            "comment": comment,
            "changes": changes,
            "current_user_id": current_user.get("id"),
            "current_user_name": current_user.get("name"),
            "raw": payload,
        }
    
    def is_status_change(self, parsed: Dict[str, Any]) -> tuple[bool, Optional[str], Optional[str]]:
        """Check if this event is a ticket status change.
        
        Args:
            parsed: Result from parse_ticket_payload()
            
        Returns:
            Tuple of (is_status_change, old_status, new_status)
        """
        changes = parsed.get("changes", {})
        
        if "status" in changes:
            status_change = changes["status"]
            return True, status_change.get("old"), status_change.get("new")
        
        return False, None, None
    
    def is_assignee_change(self, parsed: Dict[str, Any]) -> tuple[bool, Optional[int], Optional[int]]:
        """Check if this event is an assignee change.
        
        Returns:
            Tuple of (is_change, old_assignee_id, new_assignee_id)
        """
        changes = parsed.get("changes", {})
        
        if "assignee_id" in changes:
            change = changes["assignee_id"]
            return True, change.get("old"), change.get("new")
        
        return False, None, None
    
    def build_response(
        self,
        success: bool = True,
        message: Optional[str] = None,
        ticket_updates: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Build a response for Zendesk (if webhook expects response).
        
        Note: Most Zendesk webhooks are fire-and-forget.
        Some (like target responses) can modify the ticket.
        
        Args:
            success: Whether processing succeeded
            message: Optional message
            ticket_updates: Optional ticket field updates
            
        Returns:
            Response dict
        """
        response: Dict[str, Any] = {
            "success": success,
        }
        
        if message:
            response["message"] = message
        
        if ticket_updates:
            response["ticket"] = ticket_updates
        
        return response


# Global client (lazy-loaded)
_global_client: Optional[ZendeskClient] = None


def get_zendesk_client() -> ZendeskClient:
    """Get or create global Zendesk client."""
    global _global_client
    if _global_client is None:
        config = ZendeskConfig.from_env()
        _global_client = ZendeskClient(config)
    return _global_client
```

### Pattern 2: Ticket Sync & Automation Patterns

```python
"""Common Zendesk ticket sync and automation patterns.

Ticket Sync Best Practices:
- Use external_id to link Zendesk tickets to external system IDs
- Use incremental export for initial full sync
- Use webhooks + polling combo for near-real-time sync
- Track sync state with cursors/timestamps
- Handle rate limits gracefully

Automation Best Practices:
- Use macros for repeated responses
- Use triggers for automatic actions
- Use webhooks for external system integration
- Use tags for categorization and routing
"""

from __future__ import annotations

import logging
from typing import Any, Optional, List, Dict, Generator
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class TicketSyncResult:
    """Result of a ticket sync operation."""
    
    ticket_id: Optional[int] = None
    external_id: Optional[str] = None
    action: Optional[str] = None  # created, updated, skipped, failed
    error_message: Optional[str] = None


class TicketSyncer:
    """Helper for syncing tickets between external systems and Zendesk.
    
    Uses external_id to correlate tickets.
    """
    
    def __init__(self, client: Any):
        self._client = client
    
    def create_ticket_from_external(
        self,
        external_id: str,
        subject: str,
        requester_email: str,
        requester_name: Optional[str] = None,
        description: Optional[str] = None,
        priority: str = "normal",
        tags: Optional[List[str]] = None,
        external_url: Optional[str] = None,
    ) -> TicketSyncResult:
        """Create a Zendesk ticket from an external system record.
        
        Args:
            external_id: External system record ID
            subject: Ticket subject
            requester_email: Requester email
            requester_name: Requester name
            description: Initial description/comment
            priority: Ticket priority
            tags: Tags
            external_url: URL back to external system
            
        Returns:
            Sync result
        """
        # Check if already synced
        existing = self._find_ticket_by_external_id(external_id)
        
        if existing:
            logger.debug("Ticket already exists for external_id: %s (zendesk_id: %s)", external_id, existing.id)
            return TicketSyncResult(
                ticket_id=existing.id,
                external_id=external_id,
                action="skipped",
                error_message="Already exists",
            )
        
        # Build body with external reference
        body_parts = []
        
        if description:
            body_parts.append(description)
        
        if external_url:
            body_parts.append(f"\n---\nExternal reference: {external_url}")
        
        comment_body = "\n".join(body_parts) if body_parts else subject
        
        # Add sync tag
        sync_tags = list(tags or [])
        sync_tags.append("synced-from-external")
        
        try:
            created = self._client.create_ticket(
                subject=subject,
                requester_email=requester_email,
                requester_name=requester_name,
                comment_body=comment_body,
                priority=priority,
                status="new",
                tags=sync_tags,
                external_id=external_id,
            )
            
            logger.info(
                "Created Zendesk ticket #%d for external_id: %s",
                created.id, external_id
            )
            
            return TicketSyncResult(
                ticket_id=created.id,
                external_id=external_id,
                action="created",
            )
            
        except Exception as e:
            logger.error("Failed to create ticket for external_id %s: %s", external_id, e)
            return TicketSyncResult(
                external_id=external_id,
                action="failed",
                error_message=str(e),
            )
    
    def _find_ticket_by_external_id(
        self,
        external_id: str,
    ) -> Optional[Any]:
        """Find a ticket by external_id using search.
        
        Args:
            external_id: External system ID
            
        Returns:
            Ticket object or None
        """
        # Search for ticket with this external_id
        query = f"type:ticket external_id:{external_id}"
        
        try:
            results = list(self._client.search_tickets(query=query, limit=1))
            if results:
                return results[0]
        except Exception as e:
            logger.warning("Search for external_id %s failed: %s", external_id, e)
        
        return None
    
    def sync_external_status_to_zendesk(
        self,
        external_id: str,
        external_status: str,
        status_mapping: Optional[Dict[str, str]] = None,
        comment: Optional[str] = None,
        comment_author_id: Optional[int] = None,
    ) -> TicketSyncResult:
        """Update Zendesk ticket status based on external system status.
        
        Example mapping:
        {
            "open": "new",
            "in_progress": "open",
            "on_hold": "hold",
            "resolved": "solved",
            "closed": "closed",
        }
        
        Args:
            external_id: External system ID
            external_status: Status from external system
            status_mapping: Dict of external_status -> zendesk_status
            comment: Optional comment to add
            comment_author_id: Author of comment
            
        Returns:
            Sync result
        """
        default_mapping = {
            "open": "new",
            "active": "open",
            "in_progress": "open",
            "pending": "pending",
            "on_hold": "hold",
            "resolved": "solved",
            "completed": "solved",
            "closed": "closed",
            "cancelled": "closed",
        }
        
        mapping = status_mapping or default_mapping
        
        # Normalize status
        external_status_lower = external_status.lower().replace(" ", "_")
        
        # Map to Zendesk status
        zendesk_status = mapping.get(external_status_lower)
        
        if not zendesk_status:
            # Try exact match
            zendesk_status = mapping.get(external_status)
        
        if not zendesk_status:
            logger.debug(
                "No status mapping for external status: %s, skipping",
                external_status
            )
            return TicketSyncResult(
                external_id=external_id,
                action="skipped",
                error_message=f"No mapping for status: {external_status}",
            )
        
        # Find ticket
        ticket = self._find_ticket_by_external_id(external_id)
        
        if not ticket:
            return TicketSyncResult(
                external_id=external_id,
                action="failed",
                error_message="Ticket not found in Zendesk",
            )
        
        # Check if status actually changed
        if ticket.status == zendesk_status and not comment:
            return TicketSyncResult(
                ticket_id=ticket.id,
                external_id=external_id,
                action="skipped",
                error_message="No change needed",
            )
        
        try:
            update_kwargs: Dict[str, Any] = {
                "ticket_id": ticket.id,
                "status": zendesk_status,
            }
            
            if comment:
                update_kwargs["comment_body"] = comment
                update_kwargs["comment_public"] = True
                if comment_author_id:
                    update_kwargs["comment_author_id"] = comment_author_id
            
            updated = self._client.update_ticket(**update_kwargs)
            
            logger.info(
                "Updated ticket #%d status: %s -> %s",
                ticket.id, ticket.status, zendesk_status
            )
            
            return TicketSyncResult(
                ticket_id=updated.id,
                external_id=external_id,
                action="updated",
            )
            
        except Exception as e:
            logger.error("Failed to update ticket %s: %s", ticket.id, e)
            return TicketSyncResult(
                ticket_id=ticket.id,
                external_id=external_id,
                action="failed",
                error_message=str(e),
            )


class TicketAutoAssigner:
    """Helper for automatic ticket assignment based on rules.
    
    Common routing strategies:
    - Round-robin among group members
    - Load-based (assign to agent with fewest open tickets)
    - Skill-based (tags → specific agents)
    - Region-based (geo → specific groups)
    - VIP handling (high-priority → senior agents)
    """
    
    def __init__(self, client: Any):
        self._client = client
    
    def get_group_members(
        self,
        group_id: int,
    ) -> List[Dict[str, Any]]:
        """Get active agents in a group.
        
        Args:
            group_id: Group ID
            
        Returns:
            List of user dicts with id, name, email, open_ticket_count
        """
        # List users in group
        users = list(self._client.users.list(group_id=group_id))
        
        # Filter to agents only
        agents = [u for u in users if u.role in ("agent", "admin")]
        
        # Count open tickets per agent (for load balancing)
        for agent in agents:
            try:
                open_count = len(list(self._client.search_tickets(
                    query=f"status<solved assignee:{agent.id}",
                    limit=100,
                )))
                setattr(agent, "open_ticket_count", open_count)
            except Exception:
                setattr(agent, "open_ticket_count", 0)
        
        return [
            {
                "id": a.id,
                "name": a.name,
                "email": a.email,
                "open_ticket_count": getattr(a, "open_ticket_count", 0),
            }
            for a in agents
        ]
    
    def assign_round_robin(
        self,
        ticket_id: int,
        group_id: int,
        agent_ids: Optional[List[int]] = None,
        last_assigned_agent_id: Optional[int] = None,
    ) -> Optional[int]:
        """Assign ticket using round-robin strategy.
        
        Args:
            ticket_id: Ticket ID
            group_id: Group ID
            agent_ids: Optional specific agent pool
            last_assigned_agent_id: Previously assigned agent
            
        Returns:
            Newly assigned agent ID
        """
        # Get available agents
        if agent_ids:
            # Use provided pool
            members = []
            for aid in agent_ids:
                user = self._client.get_user(aid)
                if user:
                    members.append({
                        "id": user.id,
                        "name": user.name,
                        "email": user.email,
                    })
        else:
            members = self.get_group_members(group_id)
        
        if not members:
            logger.warning("No agents available for assignment in group %d", group_id)
            return None
        
        # Sort by ID for consistent ordering
        members.sort(key=lambda m: m["id"])
        agent_ids_ordered = [m["id"] for m in members]
        
        # Find next in round-robin
        if last_assigned_agent_id and last_assigned_agent_id in agent_ids_ordered:
            idx = agent_ids_ordered.index(last_assigned_agent_id)
            next_idx = (idx + 1) % len(agent_ids_ordered)
        else:
            next_idx = 0
        
        next_agent_id = agent_ids_ordered[next_idx]
        
        # Assign
        try:
            self._client.update_ticket(
                ticket_id=ticket_id,
                assignee_id=next_agent_id,
                comment_body=f"Auto-assigned to {members[next_idx]['name']} via round-robin.",
                comment_public=False,
            )
            
            logger.info(
                "Round-robin assigned ticket #%d to agent %d (%s)",
                ticket_id, next_agent_id, members[next_idx]['name']
            )
            
            return next_agent_id
            
        except Exception as e:
            logger.error("Failed to assign ticket %d: %s", ticket_id, e)
            return None
    
    def assign_load_balanced(
        self,
        ticket_id: int,
        group_id: int,
    ) -> Optional[int]:
        """Assign ticket to agent with fewest open tickets.
        
        Args:
            ticket_id: Ticket ID
            group_id: Group ID
            
        Returns:
            Assigned agent ID
        """
        members = self.get_group_members(group_id)
        
        if not members:
            logger.warning("No agents available in group %d", group_id)
            return None
        
        # Sort by open ticket count (ascending)
        members.sort(key=lambda m: m["open_ticket_count"])
        
        chosen = members[0]
        
        try:
            self._client.update_ticket(
                ticket_id=ticket_id,
                assignee_id=chosen["id"],
                comment_body=(
                    f"Auto-assigned to {chosen['name']} (load-balanced). "
                    f"Currently has {chosen['open_ticket_count']} open tickets."
                ),
                comment_public=False,
            )
            
            logger.info(
                "Load-balanced assigned ticket #%d to agent %d (%s) with %d open tickets",
                ticket_id, chosen["id"], chosen["name"], chosen["open_ticket_count"]
            )
            
            return chosen["id"]
            
        except Exception as e:
            logger.error("Failed to assign ticket %d: %s", ticket_id, e)
            return None
    
    def assign_by_skill_tags(
        self,
        ticket_id: int,
        ticket_tags: List[str],
        skill_mapping: Dict[str, int],  # tag -> agent_id
        default_group_id: Optional[int] = None,
    ) -> Optional[int]:
        """Assign based on ticket tags matching agent skills.
        
        Args:
            ticket_id: Ticket ID
            ticket_tags: Current ticket tags
            skill_mapping: Dict of tag -> agent_id
            default_group_id: Fallback group if no match
            
        Returns:
            Assigned agent ID
        """
        # Find matching tags
        matched_agent_ids: List[int] = []
        
        for tag in ticket_tags:
            if tag in skill_mapping:
                matched_agent_ids.append(skill_mapping[tag])
        
        if matched_agent_ids:
            # Use first match
            agent_id = matched_agent_ids[0]
            
            try:
                self._client.update_ticket(
                    ticket_id=ticket_id,
                    assignee_id=agent_id,
                    comment_body=f"Auto-assigned based on skill tag match.",
                    comment_public=False,
                )
                
                logger.info(
                    "Skill-based assigned ticket #%d to agent %d",
                    ticket_id, agent_id
                )
                
                return agent_id
                
            except Exception as e:
                logger.error("Failed skill-based assignment: %s", e)
        
        # Fallback to load-balanced in default group
        if default_group_id:
            logger.info("No skill match for ticket #%d, using default group", ticket_id)
            return self.assign_load_balanced(ticket_id, default_group_id)
        
        return None


# ===================================================================
# Sync State Tracker
# ===================================================================

class SyncStateTracker:
    """Tracks incremental sync state for Zendesk data sync.
    
    Use this to remember:
    - Last successful sync timestamp
    - Cursor positions
    - Sync status per object type
    
    In production, persist this to a database or key-value store.
    """
    
    def __init__(self, state_file_path: Optional[str] = None):
        """
        Args:
            state_file_path: Optional path to JSON file for persistence
        """
        self._state_file = state_file_path
        self._state: Dict[str, Any] = self._load_state()
    
    def _load_state(self) -> Dict[str, Any]:
        """Load state from file or initialize empty."""
        if self._state_file:
            try:
                with open(self._state_file, "r") as f:
                    return json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                pass
        
        # Default state
        return {
            "tickets": {
                "last_sync_at": None,
                "cursor": None,
            },
            "users": {
                "last_sync_at": None,
            },
            "organizations": {
                "last_sync_at": None,
            },
        }
    
    def _save_state(self) -> None:
        """Save state to file if configured."""
        if self._state_file:
            try:
                with open(self._state_file, "w") as f:
                    json.dump(self._state, f, indent=2, default=str)
            except Exception as e:
                logger.warning("Failed to save sync state: %s", e)
    
    def get_last_ticket_sync_time(self) -> datetime:
        """Get the timestamp to use for incremental ticket sync.
        
        Returns:
            DateTime (defaults to 7 days ago if never synced)
        """
        ts = self._state.get("tickets", {}).get("last_sync_at")
        
        if ts:
            try:
                if isinstance(ts, str):
                    # Parse ISO string
                    from datetime import datetime as dt
                    # Handle multiple formats
                    for fmt in ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"]:
                        try:
                            return dt.strptime(ts.replace("+00:00", "").rstrip("Z"), fmt).replace(tzinfo=timezone.utc)
                        except ValueError:
                            continue
                # If parsing fails, try timestamp
                return dt.fromtimestamp(float(ts), tz=timezone.utc)
            except Exception:
                pass
        
        # Default: 7 days ago
        return datetime.now(timezone.utc) - timedelta(days=7)
    
    def update_ticket_sync_time(self, sync_time: Optional[datetime] = None) -> None:
        """Update last ticket sync timestamp.
        
        Args:
            sync_time: Time to record (defaults to now)
        """
        if sync_time is None:
            sync_time = datetime.now(timezone.utc)
        
        self._state.setdefault("tickets", {})
        self._state["tickets"]["last_sync_at"] = sync_time.isoformat()
        self._state["tickets"]["last_sync_unix"] = int(sync_time.timestamp())
        
        self._save_state()
        
        logger.info("Updated ticket sync time: %s", sync_time.isoformat())
    
    def get_last_user_sync_time(self) -> datetime:
        """Get last user sync time."""
        ts = self._state.get("users", {}).get("last_sync_at")
        
        if ts:
            try:
                return datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except Exception:
                pass
        
        return datetime.now(timezone.utc) - timedelta(days=7)
    
    def update_user_sync_time(self, sync_time: Optional[datetime] = None) -> None:
        """Update user sync time."""
        if sync_time is None:
            sync_time = datetime.now(timezone.utc)
        
        self._state.setdefault("users", {})
        self._state["users"]["last_sync_at"] = sync_time.isoformat()
        self._save_state()
    
    def get_last_org_sync_time(self) -> datetime:
        """Get last organization sync time."""
        ts = self._state.get("organizations", {}).get("last_sync_at")
        
        if ts:
            try:
                return datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except Exception:
                pass
        
        return datetime.now(timezone.utc) - timedelta(days=30)
    
    def update_org_sync_time(self, sync_time: Optional[datetime] = None) -> None:
        """Update organization sync time."""
        if sync_time is None:
            sync_time = datetime.now(timezone.utc)
        
        self._state.setdefault("organizations", {})
        self._state["organizations"]["last_sync_at"] = sync_time.isoformat()
        self._save_state()
    
    def get_full_state(self) -> Dict[str, Any]:
        """Get complete state dict (for debugging)."""
        return dict(self._state)
```
