---
name: hubspot-api
description: Implements HubSpot API integration (CRM, Contacts, Companies, Deals,
  Tickets, using hubspot-api-client Python SDK with OAuth 2.0, private apps, CRM objects,
  associations, search, and HubSpot REST API patterns.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: hubspot, hubspot api, hubspot crm, hubspot-api-client, hubspot contacts,
    hubspot companies, hubspot deals, how do i integrate with hubspot, crm integration
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
  related-skills: coding-salesforce-api, coding-marketo-api, coding-zendesk-api
---
# HubSpot API Integration

Implements production-grade HubSpot integration using the `hubspot-api-client` Python SDK and HubSpot REST API. When loaded, this skill makes the model implement CRUD operations on HubSpot CRM objects (Contacts, Companies, Deals, Tickets, Products, Line Items, Custom Objects), associations between objects, CRM search, HubSpot Forms, Engagements, and HubSpot's Batch API. All implementations follow HubSpot best practices: use `HUBSPOT_ACCESS_TOKEN` from environment for Private Apps, implement OAuth 2.0 refresh token flow for user-facing apps, use v4 API for CRM objects, handle rate limits with exponential backoff, and properly paginate through list results.

---

## Constraints

### MUST DO
- Implement structured error responses with consistent format: {error_code, message, details, request_id}
- Add rate limiting per client/API key with configurable burst and sustained limits using a token bucket algorithm
- Validate all incoming requests against a schema before processing — reject malformed input with clear error messages
- Include correlation/request IDs in all log entries for end-to-end request tracing across service boundaries

### MUST NOT DO
- Do not expose internal implementation details, stack traces, or database queries in error responses
- Avoid accepting unbounded request bodies — set maximum payload sizes and timeout limits
- Never trust client-supplied authentication tokens without validation (signature verification, expiration check)
- Do not log request/response bodies containing PII, API keys, or other sensitive data


## TL;DR Checklist

- [ ] Use `hubspot-api-client` SDK v8+ with Private App access token
- [ ] Use `HUBSPOT_ACCESS_TOKEN` environment variable for auth
- [ ] OAuth 2.0: Store refresh tokens securely, implement auto-refresh
- [ ] Use `crm.contacts.basic_api` for Contact CRUD operations
- [ ] Use `crm.companies.basic_api` for Company CRUD operations
- [ ] Use `crm.deals.basic_api` for Deal CRUD operations
- [ ] Use `crm.associations.v4` API for object associations
- [ ] Use `crm.objects.search` for CRM search with filters
- [ ] Use Batch API (`crm.contacts.batch_api`) for bulk operations
- [ ] Implement pagination with `after` cursor for list endpoints
- [ ] Handle 429 rate limit errors with exponential backoff
- [ ] Never log or expose access tokens or refresh tokens

---

## When to Use

Use this skill when:

- Managing HubSpot Contacts, Companies, Deals, or Tickets
- Creating associations between CRM objects
- Searching CRM data with complex filters
- Syncing data between your app and HubSpot CRM
- Building integrations with HubSpot marketing automation
- Importing/exporting data to/from HubSpot
- Automating business processes in HubSpot
- Working with custom objects and properties
- Managing HubSpot Forms and submissions
- Tracking Engagements (calls, emails, meetings, notes)
- Processing HubSpot webhooks
- Using HubSpot's Batch API for bulk operations

---

## When NOT to Use

- For Salesforce-specific CRM — use `coding-salesforce-api` instead
- For Marketo marketing automation — use `coding-marketo-api` instead
- For Zendesk support tickets — use `coding-zendesk-api` instead
- For simple HTTP-only use cases when hubspot-api-client is overkill
- When you need real-time events only (consider HubSpot Webhooks + Pub/Sub)
- For read-only reporting (use HubSpot Analytics API directly)

---

## Core Workflow

1. **Initialize Client** — Create HubSpot client using `hubspot-api-client`:
   - Private App: `HubSpot(access_token=os.getenv("HUBSPOT_ACCESS_TOKEN"))`
   - OAuth: `HubSpot(access_token=access_token)` with token refresh logic
   
   **Checkpoint:** Validate connection with `crm.contacts.basic_api.get_page(limit=1)`.

2. **CRM Object Operations** — Perform CRUD on standard objects:
   - Contacts: `crm.contacts.basic_api.create()`, `read()`, `update()`, `archive()`
   - Companies: `crm.companies.basic_api.create()`, etc.
   - Deals: `crm.deals.basic_api.create()`, etc.
   - Tickets: `crm.tickets.basic_api.create()`, etc.
   
   **Checkpoint:** All operations include `properties` parameter to return needed fields.

3. **Associations** — Link objects together using v4 Associations API:
   - `crm.associations.v4.basic_api.create(contact_to_company, contact_id, company_id, association_type)`
   - Use predefined association type IDs (e.g., "279" for Contact-to-Company primary)
   
   **Checkpoint:** Association operations use correct type IDs and object types.

4. **CRM Search** — Query objects with filters using Search API:
   - `crm.objects.contacts.search_api.do_search(filter_groups=..., properties=...)`
   - Support for EQ, NEQ, LT, GT, BETWEEN, CONTAINS_TOKEN, etc.
   
   **Checkpoint:** Search queries include `limit` and handle `after` for pagination.

5. **Batch Operations** — Use Batch API for bulk CRUD:
   - `crm.contacts.batch_api.create(inputs=[...])`
   - `crm.contacts.batch_api.read(inputs=[...], properties=["email", "firstname"])`
   - `crm.contacts.batch_api.update(inputs=[...])`
   - `crm.contacts.batch_api.archive(inputs=[...])`
   
   **Checkpoint:** Batch operations respect HubSpot's batch size limits (max 100 per batch).

6. **Handle Limits & Rate Limiting** — Implement exponential backoff:
   - 429 status code = rate limit exceeded
   - Check `Retry-After` header for wait time
   - Use tenacity or backoff library for retries
   
   **Checkpoint:** Rate limit handling implemented with jittered exponential backoff.

---

## Implementation Patterns

### Pattern 1: HubSpot Client Initialization (BAD vs GOOD)

```python
"""HubSpot client initialization patterns.

Key concepts:
- hubspot-api-client: Official HubSpot Python SDK (v8+)
- Private Apps: Access token from HubSpot App Marketplace
- OAuth 2.0: User-specific access with refresh tokens
- API versions: v3 for most operations, v4 for associations
- Rate limits: 100 requests/10 seconds (private apps), varies by tier

Environment variables:
    HUBSPOT_ACCESS_TOKEN: Private App access token (recommended)
    HUBSPOT_CLIENT_ID: OAuth client ID
    HUBSPOT_CLIENT_SECRET: OAuth client secret
    HUBSPOT_REFRESH_TOKEN: OAuth refresh token (for server-to-server)
"""

from __future__ import annotations

import os
import json
import time
import logging
from typing import Any, Optional, List, Dict, TypeVar, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from functools import wraps

logger = logging.getLogger(__name__)

# Try to import hubspot-api-client
try:
    import hubspot
    from hubspot.crm.contacts import (
        BasicApi as ContactsBasicApi,
        BatchApi as ContactsBatchApi,
        SearchApi as ContactsSearchApi,
        SimplePublicObjectInput,
        BatchReadInputSimplePublicObjectId,
        BatchInputSimplePublicObjectBatchInput,
    )
    from hubspot.crm.companies import (
        BasicApi as CompaniesBasicApi,
        BatchApi as CompaniesBatchApi,
        SearchApi as CompaniesSearchApi,
    )
    from hubspot.crm.deals import (
        BasicApi as DealsBasicApi,
        BatchApi as DealsBatchApi,
        SearchApi as DealsSearchApi,
    )
    from hubspot.crm.tickets import (
        BasicApi as TicketsBasicApi,
    )
    from hubspot.crm.associations.v4 import (
        BasicApi as AssociationsBasicApi,
        BatchApi as AssociationsBatchApi,
    )
    from hubspot.exceptions import ApiException, NotFoundException, ForbiddenException
    HUBSPOT_AVAILABLE = True
except ImportError:
    HUBSPOT_AVAILABLE = False
    logger.warning("hubspot-api-client not installed. Run: pip install hubspot-api-client")


# ===================================================================
# ❌ BAD — hardcoded token, no error handling, no retry logic
# ===================================================================

def bad_hubspot_init() -> Any:
    """❌ BAD: Don't do any of these things."""
    if not HUBSPOT_AVAILABLE:
        raise ImportError("hubspot-api-client required")
    
    # ❌ Hardcoded access token! Never commit this!
    client = hubspot.HubSpot(access_token="pat-na1-abc123-def456-ghi789")
    
    # ❌ No validation
    # ❌ No error handling
    # ❌ No rate limit handling
    # ❌ No token refresh for OAuth
    # ❌ Using deprecated v1/v2 API patterns
    return client


# ===================================================================
# ✅ GOOD — env-based config, validation, OAuth refresh, retries
# ===================================================================


class HubSpotError(Exception):
    """Base exception for HubSpot integration errors."""
    pass


class HubSpotAuthError(HubSpotError):
    """Authentication failed or token invalid/expired."""
    pass


class HubSpotRateLimitError(HubSpotError):
    """Rate limit exceeded."""
    
    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


class HubSpotNotFoundError(HubSpotError):
    """Resource not found (404)."""
    pass


@dataclass
class HubSpotTokenStore:
    """Stores and manages HubSpot OAuth tokens.
    
    For production, use a secure database or key vault.
    This is an in-memory implementation for reference.
    """
    
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None  # When access_token expires
    
    def is_access_token_valid(self) -> bool:
        """Check if access token is still valid (has > 60 seconds left)."""
        if not self.access_token or not self.expires_at:
            return False
        
        now = datetime.now(timezone.utc)
        buffer = timedelta(seconds=60)  # Refresh 60 seconds before expiry
        
        return self.expires_at > (now + buffer)
    
    def set_tokens(
        self,
        access_token: str,
        refresh_token: Optional[str] = None,
        expires_in_seconds: int = 1800,
    ) -> None:
        """Set tokens from OAuth response.
        
        Args:
            access_token: New access token
            refresh_token: New refresh token (if provided)
            expires_in_seconds: TTL in seconds (default 30 min = 1800s)
        """
        self.access_token = access_token
        if refresh_token:
            self.refresh_token = refresh_token
        
        self.expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in_seconds)


@dataclass
class HubSpotConfig:
    """HubSpot configuration from environment variables.
    
    Environment variables:
        HUBSPOT_ACCESS_TOKEN: Private App access token (simpler, recommended)
        HUBSPOT_CLIENT_ID: OAuth client ID
        HUBSPOT_CLIENT_SECRET: OAuth client secret
        HUBSPOT_REFRESH_TOKEN: OAuth refresh token
        HUBSPOT_REDIRECT_URI: OAuth redirect URI
    """
    
    # Private App auth (simpler, server-to-server)
    access_token: Optional[str] = None
    
    # OAuth 2.0 auth (user-facing apps)
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    refresh_token: Optional[str] = None
    redirect_uri: Optional[str] = None
    
    # Request config
    timeout: float = 30.0
    max_retries: int = 5
    initial_retry_delay: float = 1.0
    max_retry_delay: float = 60.0
    
    @classmethod
    def from_env(cls) -> "HubSpotConfig":
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
            # Private App
            access_token=os.environ.get("HUBSPOT_ACCESS_TOKEN"),
            
            # OAuth
            client_id=os.environ.get("HUBSPOT_CLIENT_ID"),
            client_secret=os.environ.get("HUBSPOT_CLIENT_SECRET"),
            refresh_token=os.environ.get("HUBSPOT_REFRESH_TOKEN"),
            redirect_uri=os.environ.get("HUBSPOT_REDIRECT_URI"),
            
            # Config
            timeout=parse_float("HUBSPOT_TIMEOUT", 30.0),
            max_retries=parse_int("HUBSPOT_MAX_RETRIES", 5),
        )
    
    def is_enabled(self) -> bool:
        """Check if HubSpot is configured."""
        # Private App token
        if self.access_token:
            return True
        
        # OAuth with refresh token
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
            logger.info("HubSpot not configured")
            return True
        
        # Private App is valid if token present
        if self.access_token:
            return True
        
        # OAuth needs client_id, client_secret, and refresh_token
        if not self.client_id:
            raise ValueError("HUBSPOT_CLIENT_ID required for OAuth")
        if not self.client_secret:
            raise ValueError("HUBSPOT_CLIENT_SECRET required for OAuth")
        if not self.refresh_token:
            raise ValueError("HUBSPOT_REFRESH_TOKEN required for OAuth (or use HUBSPOT_ACCESS_TOKEN)")
        
        return True


class HubSpotClient:
    """Production-grade HubSpot client with OAuth refresh and retry handling.
    
    Features:
    - Config from environment
    - Automatic OAuth token refresh
    - Exponential backoff for rate limits
    - Helper methods for common operations
    - Unified error handling
    """
    
    def __init__(self, config: HubSpotConfig) -> None:
        self._config = config
        self._token_store = HubSpotTokenStore()
        self._client: Any = None  # Lazy-loaded HubSpot client
        self._api_client: Any = None  # Underlying API client
        
        # If using OAuth with refresh token, initialize store
        if config.refresh_token:
            self._token_store.refresh_token = config.refresh_token
    
    def _refresh_oauth_token(self) -> str:
        """Refresh OAuth access token using refresh token.
        
        Returns:
            New access token
            
        Raises:
            HubSpotAuthError: If refresh fails
        """
        import requests
        
        if not self._config.client_id or not self._config.client_secret:
            raise HubSpotAuthError("OAuth client ID/secret not configured")
        
        if not self._token_store.refresh_token:
            raise HubSpotAuthError("No refresh token available")
        
        url = "https://api.hubapi.com/oauth/v1/token"
        
        data = {
            "grant_type": "refresh_token",
            "client_id": self._config.client_id,
            "client_secret": self._config.client_secret,
            "refresh_token": self._token_store.refresh_token,
        }
        
        try:
            response = requests.post(url, data=data, timeout=self._config.timeout)
            response.raise_for_status()
            
            token_data = response.json()
            
            access_token = token_data["access_token"]
            refresh_token = token_data.get("refresh_token")  # May be rotated
            expires_in = token_data.get("expires_in", 1800)
            
            # Update token store
            self._token_store.set_tokens(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in_seconds=expires_in,
            )
            
            logger.info("OAuth token refreshed successfully")
            
            # If refresh token was rotated, you may want to persist it here
            # self._persist_refresh_token(self._token_store.refresh_token)
            
            return access_token
            
        except requests.exceptions.RequestException as e:
            raise HubSpotAuthError(f"Failed to refresh OAuth token: {e}") from e
    
    def _get_valid_access_token(self) -> str:
        """Get a valid access token, refreshing OAuth if needed.
        
        Returns:
            Valid access token
        """
        # Private App token (simple, no refresh needed)
        if self._config.access_token:
            return self._config.access_token
        
        # OAuth token - check if valid, refresh if needed
        if self._token_store.is_access_token_valid():
            return self._token_store.access_token
        
        # Need to refresh
        logger.info("OAuth token expired or missing, refreshing...")
        return self._refresh_oauth_token()
    
    def _get_client(self) -> Any:
        """Get or create the HubSpot client with fresh token.
        
        Lazy-loaded and token-refreshing.
        """
        if not HUBSPOT_AVAILABLE:
            raise ImportError(
                "hubspot-api-client not installed. "
                "Run: pip install hubspot-api-client"
            )
        
        # Always get fresh token (handles OAuth refresh automatically)
        access_token = self._get_valid_access_token()
        
        # Create new client if first time or token changed
        if self._client is None or self._current_token != access_token:
            self._client = hubspot.HubSpot(access_token=access_token)
            self._current_token = access_token
            logger.info("HubSpot client (re)initialized with fresh token")
        
        return self._client
    
    @property
    def _current_token(self) -> str:
        """Get the token the current client was created with."""
        return getattr(self, '_client_token', None)
    
    @_current_token.setter
    def _current_token(self, value: str) -> None:
        self._client_token = value
    
    # ===================================================================
    # Retry Decorator for Rate Limits
    # ===================================================================
    
    def _execute_with_retry(
        self,
        operation: Callable[[], Any],
        operation_name: str = "operation",
    ) -> Any:
        """Execute a HubSpot API operation with retry for rate limits.
        
        Implements exponential backoff with jitter.
        
        Args:
            operation: Callable that makes the API call
            operation_name: Name for logging
            
        Returns:
            API response
            
        Raises:
            HubSpotError: Wrapped API exception
            HubSpotRateLimitError: If retries exhausted
        """
        import random
        
        delay = self._config.initial_retry_delay
        last_exception: Optional[Exception] = None
        
        for attempt in range(self._config.max_retries):
            try:
                return operation()
                
            except ApiException as e:
                status = e.status if hasattr(e, 'status') else getattr(e, 'code', None)
                
                # 429 = rate limit exceeded
                if status == 429:
                    last_exception = e
                    
                    # Try to get Retry-After header
                    retry_after = None
                    if hasattr(e, 'headers'):
                        headers = e.headers or {}
                        retry_after_str = headers.get('Retry-After')
                        if retry_after_str:
                            try:
                                retry_after = int(retry_after_str)
                            except ValueError:
                                pass
                    
                    if retry_after:
                        wait_time = float(retry_after)
                        logger.warning(
                            "Rate limited on %s (attempt %d/%d). Retry-After: %ds",
                            operation_name, attempt + 1, self._config.max_retries, retry_after
                        )
                    else:
                        # Exponential backoff with jitter
                        wait_time = min(
                            delay * (2 ** attempt) + random.uniform(0, 1),
                            self._config.max_retry_delay
                        )
                        logger.warning(
                            "Rate limited on %s (attempt %d/%d). Waiting %.1fs",
                            operation_name, attempt + 1, self._config.max_retries, wait_time
                        )
                    
                    time.sleep(wait_time)
                    continue
                
                # 401 = unauthorized - token may be expired
                elif status == 401:
                    # If OAuth, try refreshing token once
                    if self._config.refresh_token and attempt == 0:
                        logger.warning("401 received, attempting token refresh...")
                        self._refresh_oauth_token()
                        self._client = None  # Force re-init with new token
                        continue
                    
                    raise HubSpotAuthError(f"Authentication failed: {e}") from e
                
                # 404 = not found
                elif status == 404:
                    raise HubSpotNotFoundError(f"Resource not found: {e}") from e
                
                # 403 = forbidden
                elif status == 403:
                    raise HubSpotAuthError(f"Forbidden (check scopes): {e}") from e
                
                # Other errors
                else:
                    raise HubSpotError(f"HubSpot API error ({status}): {e}") from e
            
            except Exception as e:
                # Non-API exceptions
                raise HubSpotError(f"HubSpot operation failed: {e}") from e
        
        # All retries exhausted
        raise HubSpotRateLimitError(
            f"Rate limit retries exhausted after {self._config.max_retries} attempts: {last_exception}"
        ) from last_exception
    
    # ===================================================================
    # API Access Properties
    # ===================================================================
    
    @property
    def contacts(self) -> Any:
        """Contacts API (basic, batch, search)."""
        client = self._get_client()
        return client.crm.contacts
    
    @property
    def companies(self) -> Any:
        """Companies API (basic, batch, search)."""
        client = self._get_client()
        return client.crm.companies
    
    @property
    def deals(self) -> Any:
        """Deals API (basic, batch, search)."""
        client = self._get_client()
        return client.crm.deals
    
    @property
    def tickets(self) -> Any:
        """Tickets API (basic, batch, search)."""
        client = self._get_client()
        return client.crm.tickets
    
    @property
    def associations(self) -> Any:
        """Associations v4 API."""
        client = self._get_client()
        return client.crm.associations.v4
    
    # ===================================================================
    # Common Operations
    # ===================================================================
    
    def get_contact_by_id(
        self,
        contact_id: str,
        properties: Optional[List[str]] = None,
        properties_with_history: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Get a Contact by ID.
        
        Args:
            contact_id: HubSpot contact ID (numeric string)
            properties: List of property names to return
            properties_with_history: Properties with change history
            
        Returns:
            Contact dict with properties
        """
        default_props = ["email", "firstname", "lastname", "phone", "company", "createdate", "lastmodifieddate"]
        props = properties if properties else default_props
        
        def _op():
            return self.contacts.basic_api.get_by_id(
                contact_id=contact_id,
                properties=props,
                properties_with_history=properties_with_history,
            )
        
        result = self._execute_with_retry(_op, f"get_contact({contact_id})")
        
        # Convert to dict
        return self._simple_object_to_dict(result)
    
    def get_contact_by_email(
        self,
        email: str,
        properties: Optional[List[str]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Get a Contact by email address (using Search API).
        
        Args:
            email: Email address to look up
            properties: Properties to return
            
        Returns:
            Contact dict or None if not found
        """
        default_props = ["email", "firstname", "lastname", "phone", "company"]
        props = properties if properties else default_props
        
        # Search by email
        filter_group = {
            "filters": [
                {
                    "propertyName": "email",
                    "operator": "EQ",
                    "value": email.lower(),
                }
            ]
        }
        
        def _op():
            return self.contacts.search_api.do_search(
                filter_groups=[filter_group],
                properties=props,
                limit=1,
            )
        
        result = self._execute_with_retry(_op, f"search_contact(email={email})")
        
        results = getattr(result, 'results', []) or []
        if not results:
            return None
        
        return self._simple_object_to_dict(results[0])
    
    def create_contact(
        self,
        properties: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Create a new Contact.
        
        Args:
            properties: Contact properties (email, firstname, lastname, etc.)
            
        Returns:
            Created contact dict
        """
        simple_input = SimplePublicObjectInput(properties=properties)
        
        def _op():
            return self.contacts.basic_api.create(simple_public_object_input=simple_input)
        
        result = self._execute_with_retry(_op, "create_contact")
        return self._simple_object_to_dict(result)
    
    def update_contact(
        self,
        contact_id: str,
        properties: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Update an existing Contact.
        
        Args:
            contact_id: HubSpot contact ID
            properties: Properties to update
            
        Returns:
            Updated contact dict
        """
        simple_input = SimplePublicObjectInput(properties=properties)
        
        def _op():
            return self.contacts.basic_api.update(
                contact_id=contact_id,
                simple_public_object_input=simple_input,
            )
        
        result = self._execute_with_retry(_op, f"update_contact({contact_id})")
        return self._simple_object_to_dict(result)
    
    def delete_contact(self, contact_id: str) -> None:
        """Delete (archive) a Contact.
        
        Args:
            contact_id: HubSpot contact ID
        """
        def _op():
            return self.contacts.basic_api.archive(contact_id=contact_id)
        
        self._execute_with_retry(_op, f"delete_contact({contact_id})")
        logger.info("Deleted contact: %s", contact_id)
    
    def list_contacts(
        self,
        limit: int = 100,
        after: Optional[str] = None,
        properties: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """List Contacts with pagination.
        
        Args:
            limit: Max per page (max 100)
            after: Pagination cursor
            properties: Properties to return
            
        Returns:
            Dict with 'results', 'paging'
        """
        default_props = ["email", "firstname", "lastname", "phone", "company"]
        props = properties if properties else default_props
        
        def _op():
            return self.contacts.basic_api.get_page(
                limit=min(limit, 100),
                after=after,
                properties=props,
            )
        
        result = self._execute_with_retry(_op, f"list_contacts(after={after})")
        
        return {
            "results": [self._simple_object_to_dict(r) for r in (getattr(result, 'results', []) or [])],
            "paging": getattr(result, 'paging', None),
        }
    
    def search_contacts(
        self,
        filter_groups: List[Dict[str, Any]],
        properties: Optional[List[str]] = None,
        limit: int = 100,
        after: Optional[str] = None,
        sorts: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Search Contacts using CRM Search API.
        
        Filter operators:
        - EQ, NEQ: Equals / Not equals
        - LT, LTE, GT, GTE: Less than / Greater than
        - BETWEEN: Range (requires highValue)
        - IN, NOT_IN: Value in list
        - HAS_PROPERTY, NOT_HAS_PROPERTY: Property exists
        - CONTAINS_TOKEN, NOT_CONTAINS_TOKEN: String contains
        
        Args:
            filter_groups: List of filter groups (OR between groups, AND within)
            properties: Properties to return
            limit: Max per page
            after: Pagination cursor
            sorts: Sort properties (e.g., ["-createdate"] for descending)
            
        Returns:
            Dict with 'results', 'total', 'paging'
        """
        default_props = ["email", "firstname", "lastname", "phone", "company", "createdate"]
        props = properties if properties else default_props
        
        def _op():
            return self.contacts.search_api.do_search(
                filter_groups=filter_groups,
                properties=props,
                limit=min(limit, 100),
                after=after,
                sorts=sorts,
            )
        
        result = self._execute_with_retry(_op, "search_contacts")
        
        return {
            "total": getattr(result, 'total', 0),
            "results": [self._simple_object_to_dict(r) for r in (getattr(result, 'results', []) or [])],
            "paging": getattr(result, 'paging', None),
        }
    
    def batch_create_contacts(
        self,
        contacts_list: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Create multiple Contacts in batch.
        
        Args:
            contacts_list: List of property dicts
            
        Returns:
            List of created contact dicts
        """
        if not contacts_list:
            return []
        
        # HubSpot batch limit is 100
        batch_size = 100
        all_results = []
        
        for i in range(0, len(contacts_list), batch_size):
            batch = contacts_list[i:i + batch_size]
            
            inputs = [{"properties": props} for props in batch]
            
            def _op(batch_inputs=inputs):
                return self.contacts.batch_api.create(
                    batch_input_simple_public_object_input_for_create={"inputs": batch_inputs}
                )
            
            result = self._execute_with_retry(_op, f"batch_create_contacts[{i}:{i+batch_size}]")
            
            results = getattr(result, 'results', []) or []
            all_results.extend(self._simple_object_to_dict(r) for r in results)
            
            logger.info("Batch created %d contacts", len(results))
        
        return all_results
    
    # ===================================================================
    # Associations
    # ===================================================================
    
    def associate_contact_to_company(
        self,
        contact_id: str,
        company_id: str,
        association_type: str = "279",  # Primary Contact-to-Company
    ) -> None:
        """Associate a Contact to a Company.
        
        Common association type IDs:
        - Contact to Company: "279" (primary), "280" (secondary)
        - Company to Contact: "281" (primary), "282" (secondary)
        - Deal to Company: "341"
        - Deal to Contact: "4"
        - Ticket to Contact: "15"
        - Ticket to Company: "339"
        
        Args:
            contact_id: Contact ID
            company_id: Company ID
            association_type: Association type ID
        """
        def _op():
            return self.associations.basic_api.create(
                from_object_type="contact",
                from_object_id=contact_id,
                to_object_type="company",
                to_object_id=company_id,
                association_spec=[{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": int(association_type)}],
            )
        
        self._execute_with_retry(_op, f"associate_contact_to_company({contact_id}->{company_id})")
        logger.info("Associated contact %s to company %s", contact_id, company_id)
    
    # ===================================================================
    # Helpers
    # ===================================================================
    
    @staticmethod
    def _simple_object_to_dict(obj: Any) -> Dict[str, Any]:
        """Convert a SimplePublicObject to a usable dict.
        
        HubSpot SDK returns objects with properties as attributes.
        This flattens them into a single dict.
        """
        if obj is None:
            return {}
        
        result: Dict[str, Any] = {}
        
        # Get ID
        if hasattr(obj, 'id'):
            result['id'] = obj.id
        
        # Get properties
        properties = getattr(obj, 'properties', None) or {}
        if isinstance(properties, dict):
            result.update(properties)
        
        # Get createdAt, updatedAt, archived
        for attr in ['created_at', 'updated_at', 'archived']:
            if hasattr(obj, attr):
                result[attr] = getattr(obj, attr)
        
        return result


# Global client (lazy-loaded)
_global_client: Optional[HubSpotClient] = None


def get_hubspot_client() -> HubSpotClient:
    """Get or create global HubSpot client."""
    global _global_client
    if _global_client is None:
        config = HubSpotConfig.from_env()
        _global_client = HubSpotClient(config)
    return _global_client
```

### Pattern 2: Common CRM Operations & Search Queries

```python
"""Common HubSpot CRM operations and search query patterns.

HubSpot CRM Search API:
- Filter groups: OR between groups, AND within a group
- Operators: EQ, NEQ, LT, GT, LTE, GTE, BETWEEN, IN, NOT_IN
- String operators: CONTAINS_TOKEN, NOT_CONTAINS_TOKEN, HAS_PROPERTY
- Sorting: Property name, prefix with "-" for descending
- Pagination: Use 'after' cursor from paging.next.after

Property names are lowercase with underscores:
- Contacts: email, firstname, lastname, phone, company, createdate
- Companies: name, domain, industry, phone, city, state
- Deals: dealname, amount, dealstage, closedate, pipeline
- Tickets: subject, content, status, priority, createdate
"""

from __future__ import annotations

import logging
from typing import Any, Optional, List, Dict
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ContactFilters:
    """Pre-built contact filter templates."""
    
    @staticmethod
    def by_email(email: str) -> Dict[str, Any]:
        """Filter by exact email match."""
        return {
            "filters": [
                {"propertyName": "email", "operator": "EQ", "value": email.lower()}
            ]
        }
    
    @staticmethod
    def by_email_domain(domain: str) -> Dict[str, Any]:
        """Filter by email domain (contains token)."""
        return {
            "filters": [
                {"propertyName": "email", "operator": "CONTAINS_TOKEN", "value": f"@{domain}"}
            ]
        }
    
    @staticmethod
    def created_in_last_days(days: int) -> Dict[str, Any]:
        """Filter by creation date within last N days."""
        start_ms = int((datetime.now(timezone.utc) - timedelta(days=days)).timestamp() * 1000)
        return {
            "filters": [
                {"propertyName": "createdate", "operator": "GTE", "value": start_ms}
            ]
        }
    
    @staticmethod
    def modified_in_last_hours(hours: int) -> Dict[str, Any]:
        """Filter by last modified within N hours."""
        start_ms = int((datetime.now(timezone.utc) - timedelta(hours=hours)).timestamp() * 1000)
        return {
            "filters": [
                {"propertyName": "lastmodifieddate", "operator": "GTE", "value": start_ms}
            ]
        }
    
    @staticmethod
    def has_phone() -> Dict[str, Any]:
        """Filter contacts that have a phone number."""
        return {
            "filters": [
                {"propertyName": "phone", "operator": "HAS_PROPERTY"}
            ]
        }
    
    @staticmethod
    def by_lead_status(status: str) -> Dict[str, Any]:
        """Filter by hs_lead_status."""
        return {
            "filters": [
                {"propertyName": "hs_lead_status", "operator": "EQ", "value": status}
            ]
        }
    
    @staticmethod
    def by_lifecycle_stage(stage: str) -> Dict[str, Any]:
        """Filter by lifecyclestage.
        
        Common values: subscriber, lead, marketingqualifiedlead,
        salesqualifiedlead, opportunity, customer, evangelist, other
        """
        return {
            "filters": [
                {"propertyName": "lifecyclestage", "operator": "EQ", "value": stage}
            ]
        }


class HubSpotCRMMixin:
    """Mixin with common CRM operations for HubSpotClient."""
    
    # ===================================================================
    # Contact Operations
    # ===================================================================
    
    def find_or_create_contact(
        self,
        email: str,
        create_properties: Optional[Dict[str, Any]] = None,
    ) -> tuple[Dict[str, Any], bool]:
        """Find a contact by email, or create if not found.
        
        Args:
            email: Email address
            create_properties: Properties for creation if not found
            
        Returns:
            Tuple of (contact_dict, was_created)
        """
        existing = self.get_contact_by_email(email)
        
        if existing:
            return existing, False
        
        # Create new
        props = dict(create_properties or {})
        props["email"] = email
        
        # Auto-set firstname/lastname from email if not provided
        if "firstname" not in props and "@" in email:
            local = email.split("@")[0]
            if "." in local:
                first, last = local.split(".", 1)
                props["firstname"] = first.capitalize()
                props["lastname"] = last.capitalize()
            else:
                props["firstname"] = local.capitalize()
        
        created = self.create_contact(props)
        return created, True
    
    def update_contact_if_changed(
        self,
        contact_id: str,
        new_properties: Dict[str, Any],
        current_contact: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Update contact only if properties have changed.
        
        Reduces unnecessary API calls.
        
        Args:
            contact_id: Contact ID
            new_properties: Properties to potentially update
            current_contact: Current contact data (if already fetched)
            
        Returns:
            Updated contact dict if changed, None if no change
        """
        # Fetch current if not provided
        if current_contact is None:
            current_contact = self.get_contact_by_id(
                contact_id,
                properties=list(new_properties.keys())
            )
        
        # Find what actually changed
        changes: Dict[str, Any] = {}
        
        for prop, new_value in new_properties.items():
            current_value = current_contact.get(prop)
            
            # Normalize for comparison
            if isinstance(new_value, str):
                new_value = new_value.strip()
            if isinstance(current_value, str):
                current_value = current_value.strip()
            
            # Handle None vs empty string
            if new_value is None or new_value == "":
                if current_value is not None and current_value != "":
                    changes[prop] = new_value
            elif current_value != new_value:
                changes[prop] = new_value
        
        if not changes:
            logger.debug("No changes for contact %s, skipping update", contact_id)
            return None
        
        logger.info("Updating contact %s with changes: %s", contact_id, list(changes.keys()))
        return self.update_contact(contact_id, changes)
    
    def get_all_contacts(
        self,
        properties: Optional[List[str]] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Get ALL contacts (handles pagination automatically).
        
        WARNING: This can be slow for large HubSpot portals.
        Consider using search with filters instead.
        
        Args:
            properties: Properties to fetch
            limit: Optional max total to fetch
            
        Returns:
            List of all contact dicts
        """
        all_contacts: List[Dict[str, Any]] = []
        after: Optional[str] = None
        page_size = 100
        
        while True:
            if limit and len(all_contacts) >= limit:
                break
            
            page = self.list_contacts(
                limit=page_size,
                after=after,
                properties=properties
            )
            
            results = page.get("results", [])
            if not results:
                break
            
            if limit:
                remaining = limit - len(all_contacts)
                results = results[:remaining]
            
            all_contacts.extend(results)
            
            # Get next cursor
            paging = page.get("paging")
            if paging and hasattr(paging, 'next'):
                next_page = paging.next
                after = getattr(next_page, 'after', None) if next_page else None
            else:
                after = None
            
            if after is None:
                break
        
        return all_contacts
    
    # ===================================================================
    # Company Operations
    # ===================================================================
    
    def find_company_by_domain(
        self,
        domain: str,
        properties: Optional[List[str]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Find a Company by domain.
        
        Args:
            domain: Company domain (e.g., "example.com")
            properties: Properties to return
            
        Returns:
            Company dict or None
        """
        default_props = ["name", "domain", "industry", "phone", "city", "state"]
        props = properties if properties else default_props
        
        filter_group = {
            "filters": [
                {"propertyName": "domain", "operator": "EQ", "value": domain.lower()}
            ]
        }
        
        def _op():
            return self.companies.search_api.do_search(
                filter_groups=[filter_group],
                properties=props,
                limit=1,
            )
        
        result = self._execute_with_retry(_op, f"search_company(domain={domain})")
        
        results = getattr(result, 'results', []) or []
        if not results:
            return None
        
        return self._simple_object_to_dict(results[0])
    
    def create_company(
        self,
        name: str,
        domain: Optional[str] = None,
        **additional_properties: Any,
    ) -> Dict[str, Any]:
        """Create a Company.
        
        Args:
            name: Company name (required)
            domain: Company domain
            **additional_properties: Additional properties
            
        Returns:
            Created company dict
        """
        props: Dict[str, Any] = {"name": name}
        if domain:
            props["domain"] = domain.lower()
        props.update(additional_properties)
        
        from hubspot.crm.companies import SimplePublicObjectInput as CompanyInput
        
        simple_input = CompanyInput(properties=props)
        
        def _op():
            return self.companies.basic_api.create(simple_public_object_input=simple_input)
        
        result = self._execute_with_retry(_op, "create_company")
        return self._simple_object_to_dict(result)
    
    # ===================================================================
    # Deal Operations
    # ===================================================================
    
    def create_deal(
        self,
        deal_name: str,
        amount: Optional[float] = None,
        stage: str = "appointmentscheduled",
        pipeline: str = "default",
        **additional_properties: Any,
    ) -> Dict[str, Any]:
        """Create a Deal.
        
        Common deal stages (default pipeline):
        - appointmentscheduled
        - qualifiedtobuy
        - presentationscheduled
        - decisionmakerboughtin
        - contractsent
        - closedwon
        - closedlost
        
        Args:
            deal_name: Deal name
            amount: Deal amount
            stage: Deal stage
            pipeline: Pipeline ID
            **additional_properties: Additional properties
            
        Returns:
            Created deal dict
        """
        props: Dict[str, Any] = {
            "dealname": deal_name,
            "dealstage": stage,
            "pipeline": pipeline,
        }
        
        if amount is not None:
            props["amount"] = str(amount)
        
        props.update(additional_properties)
        
        from hubspot.crm.deals import SimplePublicObjectInput as DealInput
        
        simple_input = DealInput(properties=props)
        
        def _op():
            return self.deals.basic_api.create(simple_public_object_input=simple_input)
        
        result = self._execute_with_retry(_op, "create_deal")
        return self._simple_object_to_dict(result)
    
    def get_deals_by_stage(
        self,
        stage: str,
        properties: Optional[List[str]] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get Deals in a specific stage.
        
        Args:
            stage: Deal stage ID
            properties: Properties to return
            limit: Max records
            
        Returns:
            List of deal dicts
        """
        default_props = ["dealname", "amount", "dealstage", "closedate", "pipeline", "createdate"]
        props = properties if properties else default_props
        
        filter_group = {
            "filters": [
                {"propertyName": "dealstage", "operator": "EQ", "value": stage}
            ]
        }
        
        def _op():
            return self.deals.search_api.do_search(
                filter_groups=[filter_group],
                properties=props,
                limit=min(limit, 100),
                sorts=["-amount"],
            )
        
        result = self._execute_with_retry(_op, f"get_deals_by_stage({stage})")
        
        results = getattr(result, 'results', []) or []
        return [self._simple_object_to_dict(r) for r in results]
    
    # ===================================================================
    # Complex Search Examples
    # ===================================================================
    
    def search_contacts_created_today_with_phone(
        self,
        properties: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Search for contacts created TODAY that have a phone number.
        
        Example of multiple filters (AND logic within a group).
        """
        # Start of today in milliseconds
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        today_start_ms = int(today_start.timestamp() * 1000)
        
        filter_group = {
            "filters": [
                {"propertyName": "createdate", "operator": "GTE", "value": today_start_ms},
                {"propertyName": "phone", "operator": "HAS_PROPERTY"},
            ]
        }
        
        result = self.search_contacts(
            filter_groups=[filter_group],
            properties=properties,
            sorts=["-createdate"],
        )
        
        return result.get("results", [])
    
    def search_contacts_in_industry_or_status(
        self,
        industries: List[str],
        lead_statuses: List[str],
        properties: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Search contacts: (industry in X) OR (lead_status in Y).
        
        Example of multiple filter groups (OR between groups).
        """
        filter_groups = []
        
        if industries:
            filter_groups.append({
                "filters": [
                    {"propertyName": "industry", "operator": "IN", "values": industries}
                ]
            })
        
        if lead_statuses:
            filter_groups.append({
                "filters": [
                    {"propertyName": "hs_lead_status", "operator": "IN", "values": lead_statuses}
                ]
            })
        
        if not filter_groups:
            return []
        
        result = self.search_contacts(
            filter_groups=filter_groups,
            properties=properties,
            limit=100,
        )
        
        return result.get("results", [])


# ===================================================================
# Webhook Handling (if your app receives HubSpot webhooks)
# ===================================================================

class HubSpotWebhookHandler:
    """Handler for HubSpot webhook events.
    
    HubSpot webhook types:
    - contact.creation, contact.deletion, contact.propertyChange
    - company.creation, company.deletion, company.propertyChange
    - deal.creation, deal.deletion, deal.propertyChange
    - conversation.creation, conversation.deletion
    
    Setup:
    1. In HubSpot App → Webhooks → Add subscription
    2. Enter your endpoint URL
    3. Select object types and events to subscribe to
    
    Security:
    - Validate HubSpot signature to prevent spoofing
    - Use HTTPS for your endpoint
    """
    
    def __init__(self, client_secret: Optional[str] = None):
        """
        Args:
            client_secret: HubSpot app client secret (for signature validation)
        """
        self._client_secret = client_secret or os.environ.get("HUBSPOT_CLIENT_SECRET")
    
    def validate_signature(
        self,
        request_body: str,
        hubspot_signature: str,
        hubspot_timestamp: str,
    ) -> bool:
        """Validate HubSpot webhook request signature.
        
        HubSpot signature algorithm:
        1. Combine client_secret + timestamp + request_body
        2. Hash with SHA-256
        3. Compare with X-HubSpot-Signature header
        
        Args:
            request_body: Raw request body string
            hubspot_signature: X-HubSpot-Signature header value
            hubspot_timestamp: X-HubSpot-Timestamp header value
            
        Returns:
            True if valid
        """
        import hashlib
        import hmac
        
        if not self._client_secret:
            logger.warning("No client secret configured, skipping signature validation")
            return True
        
        # Optional: Check timestamp is within 5 minutes to prevent replay
        try:
            ts = int(hubspot_timestamp)
            now = int(time.time())
            if abs(now - ts) > 300:  # 5 minutes
                logger.warning("Webhook timestamp too old, possible replay attack")
                return False
        except ValueError:
            pass
        
        # Compute HMAC SHA-256
        source_string = self._client_secret + hubspot_timestamp + request_body
        
        computed_hash = hmac.new(
            self._client_secret.encode('utf-8'),
            source_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Compare with constant-time comparison
        return hmac.compare_digest(computed_hash, hubspot_signature)
    
    def parse_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single webhook event into a structured format.
        
        Example event:
        {
            "objectId": 12345,
            "propertyName": "email",
            "propertyValue": "new@example.com",
            "changeSource": "CRM",
            "eventId": 123,
            "subscriptionId": 456,
            "portalId": 789,
            "appId": 101112,
            "occurredAt": 1672531200000,
            "subscriptionType": "contact.propertyChange",
            "attemptNumber": 0
        }
        """
        event_type = event_data.get("subscriptionType", "")
        
        # Parse object type from subscriptionType (e.g., "contact.creation" -> "contact")
        parts = event_type.split(".") if event_type else []
        object_type = parts[0] if parts else "unknown"
        event_action = parts[1] if len(parts) > 1 else "unknown"
        
        return {
            "event_id": event_data.get("eventId"),
            "portal_id": event_data.get("portalId"),
            "app_id": event_data.get("appId"),
            "object_type": object_type,
            "object_id": str(event_data.get("objectId")) if event_data.get("objectId") else None,
            "event_type": event_type,
            "action": event_action,
            "property_name": event_data.get("propertyName"),
            "property_value": event_data.get("propertyValue"),
            "change_source": event_data.get("changeSource"),
            "occurred_at_ms": event_data.get("occurredAt"),
            "occurred_at": (
                datetime.fromtimestamp(event_data["occurredAt"] / 1000, tz=timezone.utc)
                if event_data.get("occurredAt") else None
            ),
            "attempt_number": event_data.get("attemptNumber"),
            "raw": event_data,
        }
    
    def handle_contact_creation(self, parsed: Dict[str, Any]) -> None:
        """Handle a contact.creation event.
        
        Override this in your implementation.
        """
        contact_id = parsed.get("object_id")
        logger.info("New contact created: %s", contact_id)
        # Example: Fetch full contact details and sync to your database
    
    def handle_contact_deletion(self, parsed: Dict[str, Any]) -> None:
        """Handle a contact.deletion event."""
        contact_id = parsed.get("object_id")
        logger.info("Contact deleted: %s", contact_id)
        # Example: Mark as deleted in your database
    
    def handle_contact_property_change(self, parsed: Dict[str, Any]) -> None:
        """Handle a contact.propertyChange event."""
        contact_id = parsed.get("object_id")
        prop = parsed.get("property_name")
        value = parsed.get("property_value")
        logger.info("Contact %s property %s changed to: %s", contact_id, prop, value)
    
    def process_event(self, event_data: Dict[str, Any]) -> None:
        """Process a single webhook event.
        
        Routes to appropriate handler based on event type.
        """
        parsed = self.parse_event(event_data)
        event_type = parsed.get("event_type", "")
        
        handlers = {
            "contact.creation": self.handle_contact_creation,
            "contact.deletion": self.handle_contact_deletion,
            "contact.propertyChange": self.handle_contact_property_change,
            # Add more handlers as needed
            # "company.creation": self.handle_company_creation,
            # "deal.creation": self.handle_deal_creation,
        }
        
        handler = handlers.get(event_type)
        
        if handler:
            try:
                handler(parsed)
            except Exception as e:
                logger.error("Error handling webhook event %s: %s", event_type, e, exc_info=True)
                # Re-raise if you want HubSpot to retry
                raise
        else:
            logger.debug("No handler for webhook event type: %s", event_type)
    
    def process_batch(self, events: List[Dict[str, Any]]) -> None:
        """Process a batch of webhook events.
        
        HubSpot may send multiple events in one request.
        """
        for event in events:
            try:
                self.process_event(event)
            except Exception as e:
                logger.error("Failed to process event: %s", e, exc_info=True)
                # Continue with other events even if one fails
                # Or raise to let HubSpot retry the whole batch
```
