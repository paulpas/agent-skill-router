---
name: marketo-api
description: Implements Marketo API integration (REST, SOAP, Lead Database, Activities,
  Campaigns, using requests with OAuth 2.0 authentication, lead CRUD, bulk import/export,
  trigger campaigns, and Marketo REST API patterns.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: marketo, marketo api, marketo rest, adobe marketo, marketo leads, marketo
    activities, marketo campaigns, how do i integrate with marketo, marketing automation
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
  related-skills: coding-salesforce-api, coding-hubspot-api, coding-hubspot-api
---
# Marketo API Integration

Implements production-grade Marketo integration using the Marketo REST API with OAuth 2.0 authentication. When loaded, this skill makes the model implement operations on the Marketo Lead Database (Leads, Companies, Opportunities), Activities tracking, Campaigns triggers, Bulk API for import/export, Custom Objects, and the Marketo SOAP API for legacy integrations. All implementations follow Marketo best practices: use `MARKETO_CLIENT_ID`, `MARKETO_CLIENT_SECRET`, `MARKETO_BASE_URL` from environment, implement access token caching with auto-refresh, handle rate limits with exponential backoff, use Bulk API for > 300 records, and properly paginate list results using the `nextPageToken`.

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

- [ ] Use Marketo REST API with OAuth 2.0 (client_credentials grant)
- [ ] Use `MARKETO_CLIENT_ID`, `MARKETO_CLIENT_SECRET`, `MARKETO_BASE_URL` env vars
- [ ] Base URL format: `https://<MUNCHKIN_ID>.mktorest.com`
- [ ] Cache access tokens (expire in 3600 seconds = 1 hour)
- [ ] Leads API: Use `/rest/v1/leads.json` for CRUD operations
- [ ] Describe API: Use `/rest/v1/leads/describe.json` for field metadata
- [ ] Bulk API: Use for importing/exporting > 300 records
- [ ] Activities: Use `/rest/v1/activities.json` with activity type IDs
- [ ] Campaigns: Use `/rest/v1/campaigns/{id}/trigger.json` to trigger
- [ ] Pagination: Use `nextPageToken` from response for subsequent calls
- [ ] Rate limits: 100 calls per 20 seconds per user, varies by tier
- [ ] Never log or expose client secret or access tokens

---

## When to Use

Use this skill when:

- Managing Marketo leads (create, read, update, delete, upsert)
- Syncing leads between your app and Marketo
- Triggering Marketo campaigns from external systems
- Importing/exporting large lead datasets
- Querying lead activities (page visits, form fills, email opens, clicks)
- Working with Marketo custom objects
- Managing Marketo programs and tokens
- Building marketing automation integrations
- Processing Marketo webhooks
- Using Marketo's SOAP API for legacy integrations

---

## When NOT to Use

- For HubSpot-specific marketing — use `coding-hubspot-api` instead
- For Salesforce CRM — use `coding-salesforce-api` instead
- For Zendesk support — use `coding-zendesk-api` instead
- For simple HTTP-only use cases when a full SDK wrapper is overkill
- When you need real-time events (consider Marketo Webhooks instead)
- For read-only analytics reporting (use Marketo Analytics API directly)

---

## Core Workflow

1. **Authenticate** — Get access token using OAuth 2.0 client_credentials grant:
   - Endpoint: `POST /identity/oauth/token?grant_type=client_credentials&client_id=...&client_secret=...`
   - Token expires in 3600 seconds (1 hour) — cache it
   
   **Checkpoint:** Verify token response contains `access_token` and `expires_in`.

2. **Lead Operations** — Manage leads using REST API:
   - Get by ID: `GET /rest/v1/leads/{id}.json?fields=...`
   - Get by filter: `GET /rest/v1/leads.json?filterType=email&filterValues=...&fields=...`
   - Create/Update: `POST /rest/v1/leads.json` with JSON body
   - Upsert: Use `action=createOrUpdate` in query params
   
   **Checkpoint:** All lead operations specify `fields` parameter to return needed data.

3. **Activities** — Query lead activity history:
   - Get activity types: `GET /rest/v1/activities/types.json`
   - Get activities: `GET /rest/v1/activities.json?activityTypeIds=...&nextPageToken=...`
   - Activity type IDs: 1=Visit Webpage, 2=Fill Out Form, 3=Click Email, etc.
   
   **Checkpoint:** Activity queries include `nextPageToken` handling for pagination.

4. **Trigger Campaigns** — Trigger Smart Campaigns via API:
   - Endpoint: `POST /rest/v1/campaigns/{campaignId}/trigger.json`
   - Request body: `{"input": [{"id": leadId, "leads": [...]}]}`
   - Optionally pass `tokens` for dynamic content
   
   **Checkpoint:** Campaign exists and is "Trigger Campaign" type, not batch.

5. **Bulk Operations** — Use Bulk API for large datasets:
   - Bulk Export: Create job → Poll status → Download when complete
   - Bulk Import: Upload file → Create import job → Poll status
   - Use for operations involving > 300 records
   
   **Checkpoint:** Bulk jobs polled with exponential backoff, not tight loops.

6. **Handle Limits & Rate Limiting** — Handle Marketo's rate limits:
   - Standard: 100 calls per 20 seconds per user
   - Concurrent: Max 10 concurrent requests
   - Daily quota: Varies by subscription tier
   - 429 or 606 response codes = rate limit exceeded
   
   **Checkpoint:** Rate limit handling includes jittered exponential backoff.

---

## Implementation Patterns

### Pattern 1: Marketo Client Initialization (BAD vs GOOD)

```python
"""Marketo REST API client initialization patterns.

Key concepts:
- Marketo REST API: Primary API for all modern integrations
- Munchkin ID: Unique identifier for your Marketo instance
- Base URL: https://<MUNCHKIN_ID>.mktorest.com
- OAuth 2.0: client_credentials grant type
- Access token: Valid for 3600 seconds (1 hour), cache it
- Rate limits: 100 calls / 20 sec per user (varies by tier)

Environment variables:
    MARKETO_CLIENT_ID: OAuth client ID from Admin → LaunchPoint
    MARKETO_CLIENT_SECRET: OAuth client secret
    MARKETO_BASE_URL: Base URL (e.g., https://123-ABC-456.mktorest.com)
    MARKETO_MUNCHKIN_ID: Optional (derived from base URL)
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
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

# Try to import requests
try:
    import requests
    from requests.exceptions import RequestException, HTTPError, Timeout
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logger.warning("requests not installed. Run: pip install requests")


# ===================================================================
# ❌ BAD — hardcoded credentials, no token caching, no error handling
# ===================================================================

def bad_marketo_init() -> Any:
    """❌ BAD: Don't do any of these things."""
    if not REQUESTS_AVAILABLE:
        raise ImportError("requests library required")
    
    # ❌ Hardcoded credentials! Never commit these!
    client_id = "12345678-1234-1234-1234-1234567890ab"
    client_secret = "abc123def456ghi789"
    base_url = "https://123-ABC-456.mktorest.com"
    
    # ❌ Getting a new token for EVERY call (wasteful, slow)
    token_url = f"{base_url}/identity/oauth/token"
    params = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
    }
    response = requests.get(token_url, params=params)  # ❌ Should be POST!
    token_data = response.json()
    access_token = token_data["access_token"]
    
    # ❌ No validation
    # ❌ No error handling
    # ❌ No token caching
    # ❌ Using GET instead of POST for token endpoint
    # ❌ No rate limit handling
    
    return {"base_url": base_url, "access_token": access_token}


# ===================================================================
# ✅ GOOD — env-based config, token caching, auto-refresh, retries
# ===================================================================


class MarketoError(Exception):
    """Base exception for Marketo integration errors."""
    
    def __init__(self, message: str, error_code: Optional[str] = None):
        super().__init__(message)
        self.error_code = error_code


class MarketoAuthError(MarketoError):
    """Authentication failed or token invalid/expired."""
    pass


class MarketoRateLimitError(MarketoError):
    """Rate limit exceeded."""
    
    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


class MarketoNotFoundError(MarketoError):
    """Resource not found."""
    pass


# Marketo API error codes (common ones)
MARKETO_ERROR_CODES = {
    "601": "Access token invalid",
    "602": "Access token expired",
    "603": "Access denied",
    "604": "Request timed out",
    "605": "Request limit exceeded",
    "606": "Rate limit exceeded",
    "607": "Daily quota reached",
    "608": "API temporarily unavailable",
    "609": "Invalid subscription",
    "610": "Invalid target",
    "611": "System error",
    "701": "Lead not found",
    "702": "Multiple leads match",
    "703": "Invalid fields in request",
    "704": "Sync failed",
    "705": "Invalid operation for type",
    "706": "Invalid JSON",
    "707": "Invalid parameter value",
    "708": "Parameter missing",
    "709": "Unsupported operation",
    "710": "Invalid batch size",
    "711": "Invalid token",
}


@dataclass
class MarketoTokenStore:
    """Stores and manages Marketo OAuth tokens.
    
    Marketo access tokens expire after 3600 seconds (1 hour).
    We refresh proactively before expiry.
    """
    
    access_token: Optional[str] = None
    expires_at: Optional[datetime] = None  # When access_token expires
    
    def is_access_token_valid(self) -> bool:
        """Check if access token is still valid (has > 120 seconds left).
        
        Marketo tokens last 3600s. We use a 2-minute buffer to be safe.
        """
        if not self.access_token or not self.expires_at:
            return False
        
        now = datetime.now(timezone.utc)
        buffer = timedelta(seconds=120)
        
        return self.expires_at > (now + buffer)
    
    def set_token(
        self,
        access_token: str,
        expires_in_seconds: int = 3600,
    ) -> None:
        """Set token from OAuth response.
        
        Args:
            access_token: New access token
            expires_in_seconds: TTL in seconds (default 3600 = 1 hour)
        """
        self.access_token = access_token
        self.expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in_seconds)


@dataclass
class MarketoConfig:
    """Marketo configuration from environment variables.
    
    Environment variables:
        MARKETO_CLIENT_ID: OAuth client ID (from Admin → LaunchPoint)
        MARKETO_CLIENT_SECRET: OAuth client secret
        MARKETO_BASE_URL: Base URL, e.g., https://123-ABC-456.mktorest.com
        MARKETO_MUNCHKIN_ID: Optional (derived from base URL if not set)
    """
    
    # Required
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    base_url: Optional[str] = None
    
    # Derived/optional
    munchkin_id: Optional[str] = None
    
    # Request config
    timeout: float = 30.0
    max_retries: int = 5
    initial_retry_delay: float = 1.0
    max_retry_delay: float = 60.0
    
    @classmethod
    def from_env(cls) -> "MarketoConfig":
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
        
        base_url = os.environ.get("MARKETO_BASE_URL", "")
        
        # Derive Munchkin ID from base URL if available
        # URL format: https://123-ABC-456.mktorest.com
        munchkin_id = os.environ.get("MARKETO_MUNCHKIN_ID")
        if not munchkin_id and base_url:
            # Extract from hostname
            import re
            match = re.search(r"https?://([a-zA-Z0-9-]+)\.mktorest\.com", base_url)
            if match:
                munchkin_id = match.group(1)
        
        return cls(
            client_id=os.environ.get("MARKETO_CLIENT_ID"),
            client_secret=os.environ.get("MARKETO_CLIENT_SECRET"),
            base_url=base_url.rstrip("/") if base_url else None,
            munchkin_id=munchkin_id,
            timeout=parse_float("MARKETO_TIMEOUT", 30.0),
            max_retries=parse_int("MARKETO_MAX_RETRIES", 5),
        )
    
    def is_enabled(self) -> bool:
        """Check if Marketo is configured."""
        return bool(
            self.client_id
            and self.client_secret
            and self.base_url
        )
    
    def validate(self) -> bool:
        """Validate configuration.
        
        Returns:
            True if valid
            
        Raises:
            ValueError: If invalid when enabled
        """
        if not self.is_enabled():
            logger.info("Marketo not configured")
            return True
        
        if not self.client_id:
            raise ValueError("MARKETO_CLIENT_ID is required")
        if not self.client_secret:
            raise ValueError("MARKETO_CLIENT_SECRET is required")
        if not self.base_url:
            raise ValueError("MARKETO_BASE_URL is required")
        
        if not self.base_url.startswith("http"):
            raise ValueError(
                f"MARKETO_BASE_URL should start with https://, got: {self.base_url}"
            )
        
        return True


class MarketoClient:
    """Production-grade Marketo REST API client with token caching and retry handling.
    
    Features:
    - Config from environment
    - Automatic OAuth token caching and refresh
    - Exponential backoff for rate limits
    - Pagination helpers
    - Unified error handling with Marketo error code mapping
    """
    
    # Common Activity Type IDs
    ACTIVITY_VISIT_WEBPAGE = 1
    ACTIVITY_FILL_OUT_FORM = 2
    ACTIVITY_CLICK_EMAIL = 3
    ACTIVITY_OPEN_EMAIL = 4
    ACTIVITY_DELIVER_EMAIL = 6
    ACTIVITY_UNSUBSCRIBE_EMAIL = 7
    ACTIVITY_CLICK_LINK = 8
    ACTIVITY_ADD_TO_NURTURE = 9
    ACTIVITY_PROGRESS_STATUS = 10
    ACTIVITY_CHANGE_DATA_VALUE = 13
    ACTIVITY_MERGE_LEADS = 15
    ACTIVITY_ADD_TO_CAMPAIGN = 17
    ACTIVITY_REMOVE_FROM_CAMPAIGN = 18
    ACTIVITY_EMAIL_BOUNCE = 20
    ACTIVITY_EMAIL_BOUNCE_SOFT = 21
    ACTIVITY_CLICK_SALES_EMAIL = 27
    ACTIVITY_OPEN_SALES_EMAIL = 28
    ACTIVITY_INTERESTING_MOMENT = 46
    ACTIVITY_SCORE_CHANGED = 47
    
    # Lead partition filter types
    FILTER_TYPE_ID = "id"
    FILTER_TYPE_EMAIL = "email"
    FILTER_TYPE_SFDCLEADID = "sfdcLeadId"
    FILTER_TYPE_SFDCCONTACTID = "sfdcContactId"
    FILTER_TYPE_SFDCACCOUNTID = "sfdcAccountId"
    FILTER_TYPE_COOKIE = "cookie"
    FILTER_TYPE_TWITTERID = "twitterId"
    FILTER_TYPE_LINKEDINID = "linkedinId"
    FILTER_TYPE_FACEBOOKID = "facebookId"
    
    def __init__(self, config: MarketoConfig) -> None:
        self._config = config
        self._token_store = MarketoTokenStore()
        self._session: Optional[requests.Session] = None
    
    @property
    def _session(self) -> requests.Session:
        """Lazy-initialized requests session."""
        if self.__session is None:
            self.__session = requests.Session()
        return self.__session
    
    @_session.setter
    def _session(self, value: Optional[requests.Session]) -> None:
        self.__session = value
    
    def _refresh_access_token(self) -> str:
        """Get a new access token using OAuth 2.0 client_credentials grant.
        
        Marketo token endpoint: POST /identity/oauth/token
        
        Returns:
            New access token
            
        Raises:
            MarketoAuthError: If token request fails
        """
        if not REQUESTS_AVAILABLE:
            raise ImportError("requests library required for Marketo API")
        
        self._config.validate()
        
        token_url = urljoin(self._config.base_url, "/identity/oauth/token")
        
        params = {
            "grant_type": "client_credentials",
            "client_id": self._config.client_id,
            "client_secret": self._config.client_secret,
        }
        
        try:
            # Note: Marketo's token endpoint accepts either GET or POST
            # POST is more secure for credentials
            response = self._session.post(
                token_url,
                params=params,
                timeout=self._config.timeout,
            )
            response.raise_for_status()
            
            token_data = response.json()
            
            # Check for Marketo error response
            if token_data.get("success") is False:
                errors = token_data.get("errors", [])
                error_msg = errors[0].get("message", "Unknown error") if errors else "Token request failed"
                raise MarketoAuthError(f"Token request failed: {error_msg}")
            
            access_token = token_data.get("access_token")
            if not access_token:
                raise MarketoAuthError("Token response missing access_token")
            
            expires_in = token_data.get("expires_in", 3600)
            
            # Update token store
            self._token_store.set_token(
                access_token=access_token,
                expires_in_seconds=expires_in,
            )
            
            logger.info(
                "Marketo access token refreshed, expires in %d seconds",
                expires_in
            )
            
            return access_token
            
        except RequestException as e:
            raise MarketoAuthError(f"Failed to get Marketo access token: {e}") from e
    
    def _get_valid_access_token(self) -> str:
        """Get a valid access token, refreshing if needed.
        
        Returns:
            Valid access token
        """
        if self._token_store.is_access_token_valid():
            return self._token_store.access_token
        
        # Need to refresh
        logger.info("Marketo token expired or missing, refreshing...")
        return self._refresh_access_token()
    
    def _build_url(self, endpoint: str) -> str:
        """Build full API URL from endpoint path.
        
        Args:
            endpoint: API endpoint path (e.g., "/rest/v1/leads.json")
            
        Returns:
            Full URL
        """
        if endpoint.startswith("http"):
            return endpoint
        
        if not endpoint.startswith("/"):
            endpoint = "/" + endpoint
        
        return urljoin(self._config.base_url, endpoint)
    
    def _execute_with_retry(
        self,
        operation: Callable[[], requests.Response],
        operation_name: str = "operation",
    ) -> Dict[str, Any]:
        """Execute a Marketo API operation with retry for rate limits.
        
        Marketo error codes indicating retry:
        - 602: Access token expired (refresh and retry)
        - 606: Rate limit exceeded
        - 605: Request limit exceeded
        - 604: Request timed out
        
        Args:
            operation: Callable that returns requests Response
            operation_name: Name for logging
            
        Returns:
            Parsed JSON response dict
            
        Raises:
            MarketoError: Various error types based on response
        """
        import random
        
        delay = self._config.initial_retry_delay
        last_exception: Optional[Exception] = None
        
        for attempt in range(self._config.max_retries):
            try:
                response = operation()
                
                # Parse JSON response
                try:
                    data = response.json()
                except json.JSONDecodeError as e:
                    raise MarketoError(f"Invalid JSON response: {e}") from e
                
                # Check for Marketo API errors in response body
                success = data.get("success", True)
                
                if not success:
                    errors = data.get("errors", [])
                    
                    if errors:
                        err = errors[0]
                        error_code = str(err.get("code", ""))
                        error_msg = err.get("message", "Unknown error")
                        
                        # Token expired - refresh and retry (once)
                        if error_code == "602" and attempt == 0:
                            logger.warning(
                                "Marketo token expired (602), refreshing and retrying..."
                            )
                            self._refresh_access_token()
                            continue
                        
                        # Rate limit exceeded
                        if error_code in ("604", "605", "606"):
                            last_exception = MarketoRateLimitError(
                                f"Marketo rate limit error ({error_code}): {error_msg}"
                            )
                            
                            wait_time = min(
                                delay * (2 ** attempt) + random.uniform(0, 1),
                                self._config.max_retry_delay
                            )
                            logger.warning(
                                "Marketo rate limited on %s (attempt %d/%d). Waiting %.1fs",
                                operation_name, attempt + 1, self._config.max_retries, wait_time
                            )
                            time.sleep(wait_time)
                            continue
                        
                        # Access token invalid
                        if error_code == "601":
                            # Refresh once on first attempt
                            if attempt == 0:
                                logger.warning(
                                    "Marketo token invalid (601), refreshing..."
                                )
                                self._refresh_access_token()
                                continue
                            raise MarketoAuthError(
                                f"Marketo auth error ({error_code}): {error_msg}",
                                error_code=error_code
                            )
                        
                        # Not found
                        if error_code == "701":
                            raise MarketoNotFoundError(
                                f"Marketo resource not found: {error_msg}",
                                error_code=error_code
                            )
                        
                        # Other errors
                        raise MarketoError(
                            f"Marketo API error ({error_code}): {error_msg}",
                            error_code=error_code
                        )
                    
                    raise MarketoError("Marketo API request failed with no specific error")
                
                # Success
                return data
                
            except RequestException as e:
                # Network/HTTP errors
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
                
                raise MarketoError(f"Marketo request failed: {e}") from e
        
        # All retries exhausted
        raise MarketoRateLimitError(
            f"Rate limit retries exhausted after {self._config.max_retries} attempts"
        ) from last_exception
    
    def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        operation_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Make an authenticated API request to Marketo.
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint path
            params: Query parameters
            json: JSON body (POST/PUT)
            data: Form data body
            headers: Additional headers
            operation_name: Name for logging
            
        Returns:
            Parsed response dict
        """
        url = self._build_url(endpoint)
        op_name = operation_name or f"{method} {endpoint}"
        
        def _do_request() -> requests.Response:
            # Get fresh token each time (handles caching internally)
            access_token = self._get_valid_access_token()
            
            request_headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            }
            if json is not None:
                request_headers["Content-Type"] = "application/json"
            if headers:
                request_headers.update(headers)
            
            return self._session.request(
                method=method,
                url=url,
                params=params,
                json=json,
                data=data,
                headers=request_headers,
                timeout=self._config.timeout,
            )
        
        return self._execute_with_retry(_do_request, op_name)
    
    # ===================================================================
    # Lead Operations
    # ===================================================================
    
    def get_lead_by_id(
        self,
        lead_id: int,
        fields: Optional[List[str]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Get a single Lead by ID.
        
        Args:
            lead_id: Marketo lead ID
            fields: List of field names to return (default: common fields)
            
        Returns:
            Lead dict or None if not found
        """
        default_fields = [
            "id", "email", "firstName", "lastName", "phone", "company",
            "createdAt", "updatedAt", "leadScore", "sfdcLeadId", "sfdcContactId"
        ]
        field_list = fields if fields else default_fields
        fields_param = ",".join(field_list)
        
        try:
            data = self._request(
                "GET",
                f"/rest/v1/leads/{lead_id}.json",
                params={"fields": fields_param},
                operation_name=f"get_lead({lead_id})",
            )
            
            results = data.get("result", [])
            if not results:
                return None
            
            return results[0]
            
        except MarketoNotFoundError:
            return None
    
    def get_leads_by_email(
        self,
        emails: List[str],
        fields: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Get Leads by email addresses.
        
        Args:
            emails: List of email addresses (max 300 per request)
            fields: Fields to return
            
        Returns:
            List of lead dicts (empty if none found)
        """
        if not emails:
            return []
        
        default_fields = ["id", "email", "firstName", "lastName", "phone", "company"]
        field_list = fields if fields else default_fields
        
        # Marketo limit: 300 filter values per request
        all_results: List[Dict[str, Any]] = []
        batch_size = 300
        
        for i in range(0, len(emails), batch_size):
            batch = emails[i:i + batch_size]
            emails_param = ",".join(email.lower().strip() for email in batch)
            
            data = self._request(
                "GET",
                "/rest/v1/leads.json",
                params={
                    "filterType": "email",
                    "filterValues": emails_param,
                    "fields": ",".join(field_list),
                },
                operation_name=f"get_leads_by_email[{i}:{i+batch_size}]",
            )
            
            results = data.get("result", [])
            all_results.extend(results)
        
        return all_results
    
    def create_or_update_leads(
        self,
        leads: List[Dict[str, Any]],
        lookup_field: str = "email",
        action: str = "createOrUpdate",
        partition_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create or update Leads in batch.
        
        Actions:
        - createOrUpdate: Create if not exists, update if exists (default)
        - createOnly: Only create new, fail on duplicates
        - updateOnly: Only update existing, fail on missing
        - createDuplicate: Always create new (even if duplicate email)
        
        Args:
            leads: List of lead property dicts
            lookup_field: Field to use for deduplication (email, id, sfdcLeadId, etc.)
            action: Operation type
            partition_name: Optional lead partition name
            
        Returns:
            Response dict with 'result' list
        """
        if not leads:
            return {"result": []}
        
        # Marketo batch limit: 300 leads per request
        batch_size = 300
        all_results: List[Dict[str, Any]] = []
        
        for i in range(0, len(leads), batch_size):
            batch = leads[i:i + batch_size]
            
            params = {
                "action": action,
                "lookupField": lookup_field,
            }
            if partition_name:
                params["partitionName"] = partition_name
            
            data = self._request(
                "POST",
                "/rest/v1/leads.json",
                params=params,
                json={"input": batch},
                operation_name=f"create_or_update_leads[{i}:{i+batch_size}]",
            )
            
            results = data.get("result", [])
            all_results.extend(results)
            
            logger.info(
                "Lead batch %d-%d: %d records processed",
                i, i + len(batch) - 1, len(results)
            )
        
        return {"result": all_results}
    
    def delete_leads(
        self,
        lead_ids: List[int],
    ) -> Dict[str, Any]:
        """Delete Leads by ID.
        
        Args:
            lead_ids: List of lead IDs to delete (max 300 per request)
            
        Returns:
            Response dict
        """
        if not lead_ids:
            return {"result": []}
        
        batch_size = 300
        all_results: List[Dict[str, Any]] = []
        
        for i in range(0, len(lead_ids), batch_size):
            batch = lead_ids[i:i + batch_size]
            
            data = self._request(
                "POST",
                "/rest/v1/leads/delete.json",
                json={"input": [{"id": lid} for lid in batch]},
                operation_name=f"delete_leads[{i}:{i+batch_size}]",
            )
            
            results = data.get("result", [])
            all_results.extend(results)
        
        return {"result": all_results}
    
    def describe_lead(
        self,
    ) -> Dict[str, Any]:
        """Get Lead object metadata (all fields and their types).
        
        Useful for discovering available fields and their properties.
        
        Returns:
            Describe response with 'result' containing field definitions
        """
        return self._request(
            "GET",
            "/rest/v1/leads/describe.json",
            operation_name="describe_lead",
        )
    
    # ===================================================================
    # Activities
    # ===================================================================
    
    def get_activity_types(
        self,
    ) -> List[Dict[str, Any]]:
        """Get all available activity type definitions.
        
        Returns:
            List of activity type dicts with id, name, description, attributes
        """
        data = self._request(
            "GET",
            "/rest/v1/activities/types.json",
            operation_name="get_activity_types",
        )
        return data.get("result", [])
    
    def get_activities(
        self,
        activity_type_ids: List[int],
        since_datetime: Optional[datetime] = None,
        lead_ids: Optional[List[int]] = None,
        batch_size: int = 300,
        max_total: Optional[int] = None,
    ) -> Generator[Dict[str, Any], None, None]:
        """Get activities, yielding them as they're fetched.
        
        Handles pagination automatically using nextPageToken.
        
        Args:
            activity_type_ids: List of activity type IDs to filter by
            since_datetime: Only get activities since this time
            lead_ids: Optional filter by lead IDs (max 30)
            batch_size: Page size (max 300)
            max_total: Optional maximum total activities to return
            
        Yields:
            Individual activity dicts
        """
        if not activity_type_ids:
            return
        
        params: Dict[str, Any] = {
            "activityTypeIds": ",".join(str(t) for t in activity_type_ids),
            "batchSize": min(batch_size, 300),
        }
        
        if since_datetime:
            # Marketo uses ISO 8601 format
            params["sinceDatetime"] = since_datetime.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        if lead_ids:
            # Marketo limit: 30 lead IDs for activity filter
            if len(lead_ids) > 30:
                logger.warning("lead_ids truncated to 30 (Marketo limit for activity filter)")
                lead_ids = lead_ids[:30]
            params["leadIds"] = ",".join(str(lid) for lid in lead_ids)
        
        next_page_token: Optional[str] = None
        total_yielded = 0
        
        while True:
            if max_total and total_yielded >= max_total:
                break
            
            current_params = dict(params)
            if next_page_token:
                current_params["nextPageToken"] = next_page_token
            
            data = self._request(
                "GET",
                "/rest/v1/activities.json",
                params=current_params,
                operation_name="get_activities",
            )
            
            results = data.get("result", [])
            
            if not results:
                break
            
            for activity in results:
                if max_total and total_yielded >= max_total:
                    break
                yield activity
                total_yielded += 1
            
            # Check for more pages
            next_page_token = data.get("nextPageToken")
            
            if not next_page_token:
                break
            
            logger.debug("Fetching next activity page with token: %s", next_page_token[:20] + "...")
    
    def get_lead_activities(
        self,
        lead_id: int,
        activity_type_ids: Optional[List[int]] = None,
        since_days: int = 30,
    ) -> List[Dict[str, Any]]:
        """Get recent activities for a specific Lead.
        
        Args:
            lead_id: Lead ID
            activity_type_ids: Optional filter by activity types
            since_days: How many days back to look
            
        Returns:
            List of activity dicts
        """
        since_dt = datetime.now(timezone.utc) - timedelta(days=since_days)
        
        # Default activity types if not specified
        if activity_type_ids is None:
            activity_type_ids = [
                self.ACTIVITY_VISIT_WEBPAGE,
                self.ACTIVITY_FILL_OUT_FORM,
                self.ACTIVITY_CLICK_EMAIL,
                self.ACTIVITY_OPEN_EMAIL,
                self.ACTIVITY_CHANGE_DATA_VALUE,
                self.ACTIVITY_SCORE_CHANGED,
            ]
        
        activities = list(self.get_activities(
            activity_type_ids=activity_type_ids,
            since_datetime=since_dt,
            lead_ids=[lead_id],
        ))
        
        return activities
    
    # ===================================================================
    # Campaigns
    # ===================================================================
    
    def get_campaigns(
        self,
        program_id: Optional[int] = None,
        is_triggerable: Optional[bool] = None,
    ) -> List[Dict[str, Any]]:
        """Get Smart Campaigns.
        
        Args:
            program_id: Optional filter by program ID
            is_triggerable: Optional filter for trigger campaigns (vs batch)
            
        Returns:
            List of campaign dicts
        """
        params: Dict[str, Any] = {}
        if program_id is not None:
            params["programId"] = program_id
        
        data = self._request(
            "GET",
            "/rest/v1/campaigns.json",
            params=params,
            operation_name="get_campaigns",
        )
        
        campaigns = data.get("result", [])
        
        if is_triggerable is not None:
            campaigns = [c for c in campaigns if c.get("isTriggerable", False) == is_triggerable]
        
        return campaigns
    
    def trigger_campaign(
        self,
        campaign_id: int,
        lead_ids: List[int],
        tokens: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Trigger a Smart Campaign for one or more Leads.
        
        The campaign must be a "Trigger Campaign" type
        (isTriggerable = true), not a Batch Campaign.
        
        Args:
            campaign_id: Smart Campaign ID
            lead_ids: List of lead IDs (max 100)
            tokens: Optional my tokens to override (e.g., [{"name": "{{my.Message}}", "value": "Hello"}])
            
        Returns:
            Response dict
        """
        if not lead_ids:
            raise ValueError("lead_ids is required")
        
        # Marketo limit: 100 leads per trigger call
        if len(lead_ids) > 100:
            logger.warning("lead_ids truncated to 100 (Marketo limit for trigger)")
            lead_ids = lead_ids[:100]
        
        payload: Dict[str, Any] = {
            "input": [{"id": lead_id} for lead_id in lead_ids]
        }
        
        if tokens:
            payload["tokens"] = tokens
        
        return self._request(
            "POST",
            f"/rest/v1/campaigns/{campaign_id}/trigger.json",
            json=payload,
            operation_name=f"trigger_campaign({campaign_id})",
        )
    
    def schedule_batch_campaign(
        self,
        campaign_id: int,
        run_at: Optional[datetime] = None,
        clone_to_program_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Schedule a Batch Campaign to run.
        
        For Batch campaigns (isTriggerable = false).
        
        Args:
            campaign_id: Batch Campaign ID
            run_at: When to run (default: now)
            clone_to_program_id: Optional program ID to clone into
            
        Returns:
            Response dict
        """
        payload: Dict[str, Any] = {"input": {}}
        
        if run_at:
            payload["input"]["runAt"] = run_at.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        if clone_to_program_id:
            payload["input"]["cloneToProgramId"] = clone_to_program_id
        
        return self._request(
            "POST",
            f"/rest/v1/campaigns/{campaign_id}/schedule.json",
            json=payload,
            operation_name=f"schedule_campaign({campaign_id})",
        )
    
    # ===================================================================
    # Programs
    # ===================================================================
    
    def get_programs(
        self,
        program_type: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get Marketo Programs.
        
        Program types: Email, Program, Engagement, Webinar, etc.
        
        Args:
            program_type: Optional filter by type
            status: Optional filter by status
            
        Returns:
            List of program dicts
        """
        params: Dict[str, Any] = {}
        if program_type:
            params["filterType"] = "programType"
            params["filterValues"] = program_type
        if status:
            params["status"] = status
        
        data = self._request(
            "GET",
            "/rest/asset/v1/programs.json",
            params=params,
            operation_name="get_programs",
        )
        
        return data.get("result", [])
    
    # ===================================================================
    # Static Lists
    # ===================================================================
    
    def add_leads_to_list(
        self,
        list_id: int,
        lead_ids: List[int],
    ) -> Dict[str, Any]:
        """Add Leads to a Static List.
        
        Args:
            list_id: Static List ID
            lead_ids: List of lead IDs (max 300)
            
        Returns:
            Response dict
        """
        if not lead_ids:
            return {"result": []}
        
        batch_size = 300
        all_results: List[Dict[str, Any]] = []
        
        for i in range(0, len(lead_ids), batch_size):
            batch = lead_ids[i:i + batch_size]
            
            data = self._request(
                "POST",
                f"/rest/v1/lists/{list_id}/leads.json",
                json={"input": [{"id": lid} for lid in batch]},
                operation_name=f"add_leads_to_list({list_id})[{i}:{i+batch_size}]",
            )
            
            results = data.get("result", [])
            all_results.extend(results)
        
        return {"result": all_results}
    
    def remove_leads_from_list(
        self,
        list_id: int,
        lead_ids: List[int],
    ) -> Dict[str, Any]:
        """Remove Leads from a Static List.
        
        Args:
            list_id: Static List ID
            lead_ids: List of lead IDs
            
        Returns:
            Response dict
        """
        if not lead_ids:
            return {"result": []}
        
        batch_size = 300
        all_results: List[Dict[str, Any]] = []
        
        for i in range(0, len(lead_ids), batch_size):
            batch = lead_ids[i:i + batch_size]
            ids_param = ",".join(str(lid) for lid in batch)
            
            data = self._request(
                "DELETE",
                f"/rest/v1/lists/{list_id}/leads.json",
                params={"id": ids_param},
                operation_name=f"remove_leads_from_list({list_id})[{i}:{i+batch_size}]",
            )
            
            results = data.get("result", [])
            all_results.extend(results)
        
        return {"result": all_results}
    
    def get_leads_in_list(
        self,
        list_id: int,
        fields: Optional[List[str]] = None,
        batch_size: int = 300,
    ) -> Generator[Dict[str, Any], None, None]:
        """Get all Leads in a Static List (generator for pagination).
        
        Args:
            list_id: Static List ID
            fields: Fields to return
            batch_size: Page size
            
        Yields:
            Lead dicts
        """
        default_fields = ["id", "email", "firstName", "lastName"]
        field_list = fields if fields else default_fields
        
        next_page_token: Optional[str] = None
        
        while True:
            params: Dict[str, Any] = {
                "batchSize": min(batch_size, 300),
                "fields": ",".join(field_list),
            }
            if next_page_token:
                params["nextPageToken"] = next_page_token
            
            data = self._request(
                "GET",
                f"/rest/v1/lists/{list_id}/leads.json",
                params=params,
                operation_name=f"get_leads_in_list({list_id})",
            )
            
            results = data.get("result", [])
            
            if not results:
                break
            
            for lead in results:
                yield lead
            
            next_page_token = data.get("nextPageToken")
            
            if not next_page_token:
                break


# ===================================================================
# Bulk Import/Export Helpers
# ===================================================================

class MarketoBulkClient:
    """Helper for Marketo Bulk API operations.
    
    Use when:
    - Exporting > 300 leads
    - Importing > 300 leads
    - Exporting activity data in bulk
    
    Flow:
    1. Create export job with filter criteria
    2. Poll job status until it's "Completed"
    3. Download the data file
    
    For imports:
    1. Upload CSV/TSV file
    2. Create import job referencing the file
    3. Poll until complete
    """
    
    # Bulk export filter types
    FILTER_CREATED_AT = "createdAt"
    FILTER_UPDATED_AT = "updatedAt"
    FILTER_STATIC_LIST_IDS = "staticListIds"
    FILTER_SMART_LIST_IDS = "smartListIds"
    
    def __init__(self, client: MarketoClient):
        self._client = client
    
    def create_lead_export_job(
        self,
        fields: List[str],
        filter_type: str,
        filter_start_date: Optional[datetime] = None,
        filter_end_date: Optional[datetime] = None,
        filter_list_ids: Optional[List[int]] = None,
        format: str = "CSV",
    ) -> int:
        """Create a bulk lead export job.
        
        Args:
            fields: List of field names to export
            filter_type: One of: createdAt, updatedAt, staticListIds, smartListIds
            filter_start_date: Start date for time-based filters
            filter_end_date: End date for time-based filters
            filter_list_ids: List IDs for list-based filters
            format: CSV, TSV, or JSON
            
        Returns:
            Export job ID
        """
        payload: Dict[str, Any] = {
            "fields": fields,
            "format": format,
            "filter": {
                "filterType": filter_type,
            }
        }
        
        if filter_type in (self.FILTER_CREATED_AT, self.FILTER_UPDATED_AT):
            if filter_start_date:
                payload["filter"]["startAt"] = filter_start_date.strftime("%Y-%m-%dT%H:%M:%SZ")
            if filter_end_date:
                payload["filter"]["endAt"] = filter_end_date.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        elif filter_type in (self.FILTER_STATIC_LIST_IDS, self.FILTER_SMART_LIST_IDS):
            if filter_list_ids:
                payload["filter"]["staticListIds"] = filter_list_ids
        
        data = self._client._request(
            "POST",
            "/bulk/v1/leads/export/create.json",
            json=payload,
            operation_name="create_lead_export_job",
        )
        
        results = data.get("result", [])
        if not results:
            raise MarketoError("No export job created")
        
        export_id = results[0].get("exportId")
        if not export_id:
            raise MarketoError("Export response missing exportId")
        
        logger.info("Created lead export job: %s", export_id)
        return int(export_id)
    
    def enqueue_export_job(self, export_id: int) -> bool:
        """Enqueue (start) a created export job.
        
        After creating, you must enqueue the job for processing.
        
        Args:
            export_id: Export job ID
            
        Returns:
            True if queued successfully
        """
        data = self._client._request(
            "POST",
            f"/bulk/v1/leads/export/{export_id}/enqueue.json",
            operation_name=f"enqueue_export_job({export_id})",
        )
        
        results = data.get("result", [])
        if not results:
            return False
        
        status = results[0].get("status", "")
        logger.info("Export job %s enqueued, status: %s", export_id, status)
        
        return True
    
    def get_export_job_status(self, export_id: int) -> Dict[str, Any]:
        """Get status of an export job.
        
        Status values: Created, Queued, Processing, Completed, Failed, Cancelled
        
        Args:
            export_id: Export job ID
            
        Returns:
            Job status dict
        """
        data = self._client._request(
            "GET",
            f"/bulk/v1/leads/export/{export_id}/status.json",
            operation_name=f"get_export_job_status({export_id})",
        )
        
        results = data.get("result", [])
        if not results:
            return {}
        
        return results[0]
    
    def poll_export_until_complete(
        self,
        export_id: int,
        poll_interval: float = 30.0,
        timeout: float = 1800.0,  # 30 minutes
    ) -> bool:
        """Poll export job status until complete or timeout.
        
        Args:
            export_id: Export job ID
            poll_interval: Seconds between polls
            timeout: Max total wait time
            
        Returns:
            True if completed successfully
        """
        start_time = time.time()
        
        while True:
            elapsed = time.time() - start_time
            
            if elapsed > timeout:
                raise MarketoError(
                    f"Export job {export_id} timed out after {timeout} seconds"
                )
            
            status = self.get_export_job_status(export_id)
            status_str = status.get("status", "")
            
            if status_str == "Completed":
                logger.info(
                    "Export job %s completed in %.1f seconds. Number of records: %s",
                    export_id, elapsed, status.get("numberOfRecords")
                )
                return True
            
            if status_str == "Failed":
                raise MarketoError(
                    f"Export job {export_id} failed: {status.get('message', 'Unknown error')}"
                )
            
            if status_str == "Cancelled":
                raise MarketoError(f"Export job {export_id} was cancelled")
            
            # Still processing
            logger.info(
                "Export job %s status: %s (%.1fs elapsed). Checking again in %.1fs",
                export_id, status_str, elapsed, poll_interval
            )
            time.sleep(poll_interval)
    
    def download_export_data(self, export_id: int) -> str:
        """Download completed export data as a string.
        
        Args:
            export_id: Export job ID
            
        Returns:
            File content as string (CSV/TSV/JSON format)
        """
        # Need to use raw requests for file download
        access_token = self._client._get_valid_access_token()
        url = self._client._build_url(f"/bulk/v1/leads/export/{export_id}/file.json")
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept-Encoding": "gzip",  # Marketo returns gzipped content
        }
        
        response = requests.get(
            url,
            headers=headers,
            timeout=self._client._config.timeout * 3,  # Longer timeout for download
        )
        response.raise_for_status()
        
        # Handle gzip if needed
        content = response.content
        
        # Check if gzipped
        if len(content) >= 2 and content[0] == 0x1f and content[1] == 0x8b:
            import gzip
            content = gzip.decompress(content)
        
        return content.decode("utf-8")
    
    def export_leads_simple(
        self,
        fields: List[str],
        static_list_id: Optional[int] = None,
        updated_since_days: int = 7,
        format: str = "CSV",
    ) -> str:
        """Simplified bulk export: one method to do it all.
        
        Args:
            fields: Fields to export
            static_list_id: Optional static list to filter by
            updated_since_days: Number of days to look back (if no list)
            format: CSV, TSV, JSON
            
        Returns:
            Exported data as string
        """
        # Determine filter
        if static_list_id:
            filter_type = self.FILTER_STATIC_LIST_IDS
            export_id = self.create_lead_export_job(
                fields=fields,
                filter_type=filter_type,
                filter_list_ids=[static_list_id],
                format=format,
            )
        else:
            filter_type = self.FILTER_UPDATED_AT
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=updated_since_days)
            
            export_id = self.create_lead_export_job(
                fields=fields,
                filter_type=filter_type,
                filter_start_date=start_date,
                filter_end_date=end_date,
                format=format,
            )
        
        # Enqueue and wait
        self.enqueue_export_job(export_id)
        self.poll_export_until_complete(export_id)
        
        # Download
        return self.download_export_data(export_id)


# ===================================================================
# SOAP API (Legacy)
# ===================================================================

class MarketoSOAPClient:
    """Legacy SOAP API client (for older Marketo functionality).
    
    Most operations should use the REST API now.
    Use SOAP only if:
    - You need functionality not available in REST
    - You're maintaining legacy code
    
    Environment variables:
        MARKETO_SOAP_USER_ID: SOAP user ID
        MARKETO_SOAP_ENCRYPTION_KEY: SOAP encryption key
        MARKETO_MUNCHKIN_ID: Munchkin ID for SOAP endpoint
    """
    
    def __init__(
        self,
        user_id: Optional[str] = None,
        encryption_key: Optional[str] = None,
        munchkin_id: Optional[str] = None,
    ):
        self._user_id = user_id or os.environ.get("MARKETO_SOAP_USER_ID")
        self._encryption_key = encryption_key or os.environ.get("MARKETO_SOAP_ENCRYPTION_KEY")
        self._munchkin_id = munchkin_id or os.environ.get("MARKETO_MUNCHKIN_ID")
        
        # Check for zeep (SOAP library)
        try:
            import zeep
            self._zeep_available = True
        except ImportError:
            self._zeep_available = False
            logger.warning(
                "zeep not installed. For SOAP support, run: pip install zeep"
            )
    
    def _get_soap_endpoint(self) -> str:
        """Get SOAP API endpoint URL."""
        if not self._munchkin_id:
            raise ValueError("MARKETO_MUNCHKIN_ID is required for SOAP")
        return f"https://{self._munchkin_id}.mktoapi.com/soap/mktows/2_0"
    
    def _generate_wss_header(
        self,
        timestamp: Optional[datetime] = None,
    ) -> str:
        """Generate WS-Security UsernameToken header for Marketo SOAP.
        
        Marketo SOAP auth algorithm:
        1. Create a nonce (random bytes)
        2. Create timestamp (ISO 8601 format)
        3. Create: secret_hash = SHA256(nonce + timestamp + encryption_key)
        4. Base64 encode nonce and secret_hash
        """
        import hashlib
        import base64
        import secrets
        
        if timestamp is None:
            timestamp = datetime.now(timezone.utc)
        
        timestamp_str = timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # Generate nonce (16-32 random bytes)
        nonce_bytes = secrets.token_bytes(24)
        
        # Build signature string: nonce + timestamp + encryption_key
        signature_string = nonce_bytes + timestamp_str.encode("utf-8")
        
        if self._encryption_key:
            signature_string += self._encryption_key.encode("utf-8")
        
        # SHA256 hash
        secret_hash_bytes = hashlib.sha256(signature_string).digest()
        
        # Base64 encode
        nonce_b64 = base64.b64encode(nonce_bytes).decode("utf-8")
        secret_hash_b64 = base64.b64encode(secret_hash_bytes).decode("utf-8")
        
        # Return formatted header XML (if needed)
        return f"""
<wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <wsse:UsernameToken>
    <wsse:Username>{self._user_id}</wsse:Username>
    <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">
      {secret_hash_b64}
    </wsse:Password>
    <wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">
      {nonce_b64}
    </wsse:Nonce>
    <wsu:Created xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
      {timestamp_str}
    </wsu:Created>
  </wsse:UsernameToken>
</wsse:Security>
"""


# Global client (lazy-loaded)
_global_client: Optional[MarketoClient] = None


def get_marketo_client() -> MarketoClient:
    """Get or create global Marketo client."""
    global _global_client
    if _global_client is None:
        config = MarketoConfig.from_env()
        _global_client = MarketoClient(config)
    return _global_client
```

### Pattern 2: Common Lead Sync & Webhook Patterns

```python
"""Common Marketo lead sync and webhook handling patterns.

Lead Sync Best Practices:
- Use email as primary lookup field for upsert
- Include 'id' in fields for existing leads
- Batch 300 leads per call
- Handle status in response: 'created', 'updated', 'skipped'

Webhook Best Practices:
- Marketo calls your endpoint with lead data
- Validate source (IP whitelist, basic auth, or custom header)
- Response can update lead fields via JSON
- Marketo webhook timeout: 30 seconds
"""

from __future__ import annotations

import logging
from typing import Any, Optional, List, Dict
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class LeadSyncResult:
    """Result of a lead sync operation."""
    
    lead_id: Optional[int] = None
    email: Optional[str] = None
    status: Optional[str] = None  # created, updated, skipped, failed
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    created: bool = False
    updated: bool = False


class LeadSyncer:
    """Helper for syncing leads to Marketo with proper error handling.
    
    Features:
    - Batch processing with proper sizing
    - Detailed result tracking
    - Status mapping from Marketo response
    - Idempotent upsert operations
    """
    
    # Marketo sync operation statuses
    STATUS_CREATED = "created"
    STATUS_UPDATED = "updated"
    STATUS_SKIPPED = "skipped"
    STATUS_FAILED = "failed"
    
    def __init__(self, client: Any):
        self._client = client
    
    def sync_leads(
        self,
        leads: List[Dict[str, Any]],
        lookup_field: str = "email",
        action: str = "createOrUpdate",
        required_fields: Optional[List[str]] = None,
    ) -> List[LeadSyncResult]:
        """Sync leads to Marketo.
        
        Args:
            leads: List of lead property dicts (must include lookup field)
            lookup_field: Field to use for deduplication
            action: createOrUpdate, createOnly, updateOnly, createDuplicate
            required_fields: Fields that must be present in each lead
            
        Returns:
            List of LeadSyncResult
        """
        if not leads:
            return []
        
        # Validate required fields
        if required_fields:
            for i, lead in enumerate(leads):
                for field in required_fields:
                    if field not in lead:
                        raise ValueError(
                            f"Lead {i} missing required field: {field}"
                        )
        
        # Normalize email if using email as lookup
        normalized_leads = []
        for lead in leads:
            lead_copy = dict(lead)
            if "email" in lead_copy:
                lead_copy["email"] = lead_copy["email"].strip().lower()
            normalized_leads.append(lead_copy)
        
        # Execute sync
        response = self._client.create_or_update_leads(
            leads=normalized_leads,
            lookup_field=lookup_field,
            action=action,
        )
        
        results = response.get("result", [])
        
        # Map to our result format
        sync_results: List[LeadSyncResult] = []
        
        for i, result in enumerate(results):
            original_lead = leads[i] if i < len(leads) else {}
            
            status = result.get("status", "")
            lead_id = result.get("id")
            
            sync_result = LeadSyncResult(
                lead_id=int(lead_id) if lead_id else None,
                email=original_lead.get("email"),
                status=self._map_status(status),
                created=(status == "created"),
                updated=(status == "updated"),
            )
            
            # Check for errors
            reasons = result.get("reasons", [])
            if reasons:
                reason = reasons[0]
                sync_result.error_code = str(reason.get("code", ""))
                sync_result.error_message = reason.get("message", "")
                sync_result.status = self.STATUS_FAILED
            
            sync_results.append(sync_result)
        
        # Log summary
        created_count = sum(1 for r in sync_results if r.created)
        updated_count = sum(1 for r in sync_results if r.updated)
        skipped_count = sum(1 for r in sync_results if r.status == self.STATUS_SKIPPED)
        failed_count = sum(1 for r in sync_results if r.status == self.STATUS_FAILED)
        
        logger.info(
            "Lead sync complete: %d created, %d updated, %d skipped, %d failed",
            created_count, updated_count, skipped_count, failed_count
        )
        
        return sync_results
    
    @staticmethod
    def _map_status(marketo_status: str) -> str:
        """Map Marketo status to our standard statuses."""
        mapping = {
            "created": LeadSyncer.STATUS_CREATED,
            "updated": LeadSyncer.STATUS_UPDATED,
            "skipped": LeadSyncer.STATUS_SKIPPED,
        }
        return mapping.get(marketo_status.lower(), marketo_status)
    
    def sync_lead_simple(
        self,
        email: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        phone: Optional[str] = None,
        company: Optional[str] = None,
        **additional_fields: Any,
    ) -> LeadSyncResult:
        """Sync a single lead (convenience method).
        
        Args:
            email: Lead email (required)
            first_name: First name
            last_name: Last name
            phone: Phone
            company: Company
            **additional_fields: Any other lead fields
            
        Returns:
            LeadSyncResult
        """
        lead_data: Dict[str, Any] = {"email": email}
        
        if first_name:
            lead_data["firstName"] = first_name
        if last_name:
            lead_data["lastName"] = last_name
        if phone:
            lead_data["phone"] = phone
        if company:
            lead_data["company"] = company
        
        lead_data.update(additional_fields)
        
        results = self.sync_leads(
            leads=[lead_data],
            lookup_field="email",
            action="createOrUpdate",
        )
        
        return results[0] if results else LeadSyncResult(status=self.STATUS_FAILED)


# ===================================================================
# Marketo Webhook Handler
# ===================================================================

class MarketoWebhookHandler:
    """Handler for Marketo webhook calls.
    
    Marketo Webhook Flow:
    1. You configure a webhook in Marketo (Admin → Webhooks)
    2. You add a "Call Webhook" flow step to a Smart Campaign
    3. When triggered, Marketo calls your endpoint with lead data
    4. Your endpoint responds (within 30s)
    5. Marketo can map your JSON response back to lead fields
    
    Request Format (Marketo → You):
    {
        "id": 12345,
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "leadScore": 75,
        "Acquisition_Program__c": "Webinar-Series",
        ...
    }
    
    Response Format (You → Marketo):
    {
        "leadScore": 100,
        "Status__c": "Qualified",
        "Last_Reviewed_Date__c": "2026-05-20",
        "myCustomResponseField": "calculated-value"
    }
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        allowed_ips: Optional[List[str]] = None,
    ):
        """
        Args:
            api_key: Optional API key for basic auth or header validation
            allowed_ips: Optional IP whitelist for Marketo servers
        """
        self._api_key = api_key
        self._allowed_ips = allowed_ips
    
    def validate_request(
        self,
        headers: Dict[str, str],
        source_ip: Optional[str] = None,
        api_key_param: Optional[str] = None,
    ) -> tuple[bool, Optional[str]]:
        """Validate incoming webhook request.
        
        Args:
            headers: Request headers dict
            source_ip: Source IP address
            api_key_param: API key from query or header
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Validate IP if whitelist configured
        if self._allowed_ips and source_ip:
            # Marketo IPs can be found in Marketo docs
            # They also support X-Forwarded-For
            if source_ip not in self._allowed_ips:
                # Check X-Forwarded-For if present
                xff = headers.get("X-Forwarded-For", "")
                if xff:
                    # First IP in chain is usually the client
                    forwarded_ips = [ip.strip() for ip in xff.split(",")]
                    if not any(ip in self._allowed_ips for ip in forwarded_ips):
                        return False, f"IP not allowed: {source_ip}"
                else:
                    return False, f"IP not allowed: {source_ip}"
        
        # Validate API key if configured
        if self._api_key:
            # Check common locations
            key_candidates = [
                api_key_param,
                headers.get("Authorization", "").replace("Bearer ", ""),
                headers.get("X-API-Key", ""),
                headers.get("x-api-key", ""),
            ]
            
            if not any(key == self._api_key for key in key_candidates if key):
                return False, "Invalid or missing API key"
        
        return True, None
    
    def parse_webhook_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Marketo webhook payload into a normalized format.
        
        Args:
            payload: Raw JSON payload from Marketo
            
        Returns:
            Normalized lead dict with standard keys
        """
        lead = {
            "id": payload.get("id"),
            "lead_id": payload.get("id"),
            "email": payload.get("email"),
            "first_name": payload.get("firstName"),
            "last_name": payload.get("lastName"),
            "phone": payload.get("phone"),
            "company": payload.get("company"),
            "lead_score": payload.get("leadScore"),
            "created_at": payload.get("createdAt"),
            "updated_at": payload.get("updatedAt"),
            "sfdc_lead_id": payload.get("sfdcLeadId"),
            "sfdc_contact_id": payload.get("sfdcContactId"),
            "raw": payload,
        }
        
        # Also include all custom fields
        for key, value in payload.items():
            if key not in lead and key != "raw":
                lead[key] = value
        
        return lead
    
    def build_response(
        self,
        lead_updates: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Build a response for Marketo to map back to lead fields.
        
        Marketo can map any top-level JSON key to a lead field.
        
        Args:
            lead_updates: Dict of field_name -> value to update on the lead
            error: Optional error message (sets a failure field)
            
        Returns:
            Response dict that Marketo can process
        """
        response: Dict[str, Any] = {}
        
        if lead_updates:
            response.update(lead_updates)
        
        if error:
            response["webhook_error"] = error
            response["webhook_success"] = False
        else:
            response["webhook_success"] = True
            response["webhook_processed_at"] = datetime.now(timezone.utc).isoformat()
        
        return response
    
    def build_response_with_tokens(
        self,
        tokens: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Build response using Marketo {{my.tokens}} pattern.
        
        In your webhook configuration, you can map response keys
        to specific lead fields or tokens.
        
        This pattern is useful when you want to:
        - Calculate lead score adjustments
        - Look up data from external systems
        - Validate/enrich lead data
        
        Args:
            tokens: Dict of token_name -> value
            
        Returns:
            Response dict
        """
        response: Dict[str, Any] = {}
        
        if tokens:
            for name, value in tokens.items():
                # Marketo often uses double-underscore or specific naming
                response[name] = value
        
        return response


# ===================================================================
# Lead Scoring Helper
# ===================================================================

class LeadScoreManager:
    """Helper for calculating and updating lead scores in Marketo.
    
    Best practices:
    - Use a "Behavior Score" and "Demographic Score" if possible
    - Use positive scores for desired behaviors
    - Use negative scores for inactivity (decay)
    - Cap scores at reasonable maxima
    - Log all score changes for audit
    """
    
    def __init__(self, client: Any):
        self._client = client
    
    def calculate_behavior_score(
        self,
        activities: List[Dict[str, Any]],
        scoring_rules: Optional[Dict[int, int]] = None,
    ) -> int:
        """Calculate behavior score from lead activities.
        
        Args:
            activities: List of activity dicts from get_activities()
            scoring_rules: Dict of activity_type_id -> points (positive or negative)
            
        Returns:
            Calculated score
        """
        # Default scoring rules if not provided
        default_rules: Dict[int, int] = {
            # Positive behaviors
            MarketoClient.ACTIVITY_FILL_OUT_FORM: 25,
            MarketoClient.ACTIVITY_CLICK_EMAIL: 5,
            MarketoClient.ACTIVITY_OPEN_EMAIL: 2,
            MarketoClient.ACTIVITY_VISIT_WEBPAGE: 3,
            MarketoClient.ACTIVITY_CLICK_LINK: 5,
            MarketoClient.ACTIVITY_INTERESTING_MOMENT: 50,
        }
        
        rules = scoring_rules or default_rules
        
        score = 0
        
        for activity in activities:
            activity_type = activity.get("activityTypeId", 0)
            points = rules.get(activity_type, 0)
            score += points
        
        return score
    
    def update_lead_score(
        self,
        lead_id: int,
        score_field: str,
        new_score: int,
        score_change_field: Optional[str] = None,
        max_score: int = 200,
        min_score: int = 0,
    ) -> Dict[str, Any]:
        """Update a lead's score field in Marketo.
        
        Args:
            lead_id: Lead ID
            score_field: Field name (e.g., "leadScore", "Behavior_Score__c")
            new_score: New score value
            score_change_field: Optional field to store the change amount
            max_score: Maximum allowed score
            min_score: Minimum allowed score
            
        Returns:
            Sync result
        """
        # Clamp score to bounds
        clamped_score = max(min_score, min(new_score, max_score))
        
        # Get current score if we need to calculate change
        current_score = None
        if score_change_field:
            try:
                existing = self._client.get_lead_by_id(
                    lead_id,
                    fields=["id", score_field]
                )
                if existing:
                    current_score_str = existing.get(score_field)
                    if current_score_str is not None:
                        current_score = int(current_score_str)
            except Exception:
                pass
        
        # Build update payload
        updates: Dict[str, Any] = {
            "id": lead_id,
            score_field: str(clamped_score),
        }
        
        # Calculate and store change if field provided
        if score_change_field and current_score is not None:
            change = clamped_score - current_score
            updates[score_change_field] = str(change)
            
            logger.info(
                "Updating lead %d score: %d -> %d (change: %+d)",
                lead_id, current_score, clamped_score, change
            )
        else:
            logger.info(
                "Updating lead %d score: -> %d",
                lead_id, clamped_score
            )
        
        # Sync to Marketo
        result = self._client.create_or_update_leads(
            leads=[updates],
            lookup_field="id",
            action="updateOnly",
        )
        
        return result
```
