---
name: pagerduty-api
description: Implements PagerDuty API integration (incident management, on-call schedules,
  escalation policies, alerts, events API v2) using pdpyras Python SDK with event
  ingestion, incident querying, on-call retrieval, and maintenance windows.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: pagerduty, incidents, on-call schedules, escalation policies, events api
    v2, pagerduty alerts, how do i trigger pagerduty alerts, incident management
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
  related-skills: coding-datadog-api, coding-sentry-api, coding-grafana-prometheus
------
# PagerDuty API Integration

Implements production-grade PagerDuty API integration using the `pdpyras` Python SDK and direct HTTP API calls. When loaded, this skill makes the model implement Event API v2 ingestion (trigger/acknowledge/resolve), incident querying and management, on-call schedule lookup, escalation policy management, alert grouping, and maintenance window creation. All implementations follow PagerDuty best practices: use Events API for alert ingestion (not REST API), always include `dedup_key` for deduplication, implement exponential backoff for rate limits, and validate API connectivity on startup.

## TL;DR Checklist

- [ ] Use `pdpyras` SDK or direct HTTP calls with `PAGERDUTY_API_KEY` from env var
- [ ] Use Events API v2 (`https://events.pagerduty.com/v2/enqueue`) for alert ingestion
- [ ] Use REST API (`https://api.pagerduty.com`) for management operations
- [ ] Always include `dedup_key` in Events API calls for deduplication
- [ ] Use `routing_key` (integration key) for Events API, `api_key` for REST API
- [ ] Include required headers: `Authorization: Token token=<key>`, `Accept: application/vnd.pagerduty+json;version=2`
- [ ] Add explicit `From` email header for user context operations
- [ ] Implement exponential backoff for 429 rate limit responses
- [ ] Use `event_action: trigger`, `event_action: acknowledge`, `event_action: resolve` consistently
- [ ] Always include `payload.summary`, `payload.source`, `payload.severity` in trigger events

---

## When to Use

Use this skill when:

- Triggering alerts from monitoring systems (Prometheus, Datadog, New Relic)
- Acknowledging and resolving incidents programmatically
- Looking up who is currently on-call
- Managing escalation policies via API
- Creating and managing incident responders
- Setting up maintenance windows to suppress alerts
- Querying incident history for reporting
- Automating incident response workflows
- Building chatops integrations (Slack, Mattermost)
- Syncing on-call schedules with internal systems

---

## When NOT to Use

- For Datadog-specific alerting — use `coding-datadog-api` instead
- For Opsgenie (Atlassian competitor) — use dedicated Opsgenie patterns
- For internal-only alerting without on-call management — consider simpler solutions
- When you need push notification only (SMS, email) without escalation
- For incident response in non-24/7 environments (just use email)

---

## Core Workflow

1. **Initialize Configuration** — Configure PagerDuty client using `PAGERDUTY_API_KEY` (REST API) and `PAGERDUTY_ROUTING_KEY` (Events API integration key) from environment variables. Determine correct endpoint: `api.pagerduty.com` for REST, `events.pagerduty.com` for Events. **Checkpoint:** Validate connectivity with GET `/users` or send a test resolve event.

2. **Choose API for Task** — Decide between:
   - **Events API v2**: Ingestion only (trigger/ack/resolve), uses routing key (integration key), lower rate limits, higher reliability for alerts
   - **REST API**: All management operations, uses API key, full CRUD on incidents, schedules, policies, users
   
   **Checkpoint:** Never use REST API for alert ingestion; Events API is designed for that.

3. **Implement Events API Ingestion** — Build event payloads with required fields: `routing_key`, `event_action`, `dedup_key`, `payload.summary`, `payload.severity`, `payload.source`. Add optional: `payload.custom_details`, `links`, `images`. **Checkpoint:** Every trigger event has unique `dedup_key` for deduplication and resolution.

4. **Query & Manage Incidents** — Use REST API to list incidents with filters (`statuses`, `service_ids`, `urgency`), get single incident, update status, add notes, assign responders. Use `since`/`until` for historical queries. **Checkpoint:** All list operations have appropriate time bounds to avoid full scans.

5. **On-Call & Schedules** — Query on-call users via `GET /oncalls` with `schedule_ids`, `time_zone`, `since`/`until`. Get schedule details, overrides, and final schedule. **Checkpoint:** Always specify `time_zone` to avoid UTC confusion.

6. **Maintenance Windows** — Create maintenance windows via `POST /maintenance_windows` with `start_time`, `end_time`, `services`, `description`. **Checkpoint:** Maintenance windows have timezone-aware timestamps in ISO 8601 format.

---

## Implementation Patterns

### Pattern 1: PagerDuty Client Initialization (BAD vs GOOD)

```python
"""PagerDuty client initialization patterns.

Two primary APIs:
1. Events API v2: Alert ingestion (trigger/ack/resolve)
   - Endpoint: https://events.pagerduty.com/v2/enqueue
   - Uses: routing_key (integration key from service integration)
   - Lower rate limits, higher reliability for alert paths

2. REST API v2: Management operations
   - Endpoint: https://api.pagerduty.com
   - Uses: api_key (Personal API token or OAuth)
   - Full CRUD on incidents, schedules, policies, users

Headers for REST API:
- Authorization: Token token=<api_key>
- Accept: application/vnd.pagerduty+json;version=2
- Content-Type: application/json
- From: user@example.com (for operations requiring user context)

SDK: pdpyras is the official Python SDK
"""

from __future__ import annotations

import os
import json
import time
import logging
import random
from typing import Any, Optional, Literal
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field

import requests

logger = logging.getLogger(__name__)

EventAction = Literal["trigger", "acknowledge", "resolve"]
Severity = Literal["critical", "warning", "error", "info"]
IncidentStatus = Literal["triggered", "acknowledged", "resolved"]


# ===================================================================
# ❌ BAD — hardcoded keys, wrong API choice, missing headers
# ===================================================================

def bad_pagerduty_init_bad() -> dict[str, Any]:
    """❌ BAD: Hardcoded keys, wrong API, missing headers."""
    
    # ❌ Hardcoded! Should come from env
    api_key = "u+xxxxxxxxx_xxxxx_xx"
    
    # ❌ Using REST API for alert ingestion (wrong!)
    # Should use Events API for triggering/acking/resolving
    endpoint = "https://api.pagerduty.com/incidents"
    
    # ❌ Missing required headers:
    # - Accept with version specifier
    # - Content-Type
    
    return {"api_key": api_key, "endpoint": endpoint}


# ===================================================================
# ✅ GOOD — env-based config, correct APIs, typed errors
# ===================================================================


class PagerDutyError(Exception):
    """Base exception for PagerDuty client errors."""
    pass


class PagerDutyAuthError(PagerDutyError):
    """Authentication/API key is invalid."""
    pass


class PagerDutyRateLimitError(PagerDutyError):
    """Rate limit exceeded."""
    
    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


@dataclass
class PagerDutyConfig:
    """PagerDuty configuration from environment variables.
    
    Environment variables:
        PAGERDUTY_API_KEY: REST API Personal Token
        PAGERDUTY_ROUTING_KEY: Events API integration key (per-service)
        PAGERDUTY_FROM_EMAIL: User email for 'From' header
        PAGERDUTY_TIMEOUT: Request timeout in seconds
    """
    
    # REST API config
    api_key: Optional[str] = None
    rest_api_endpoint: str = "https://api.pagerduty.com"
    
    # Events API config
    routing_key: Optional[str] = None
    events_api_endpoint: str = "https://events.pagerduty.com/v2/enqueue"
    
    # Common
    from_email: Optional[str] = None
    timeout: float = 30.0
    max_retries: int = 3
    initial_retry_delay: float = 1.0
    
    @classmethod
    def from_env(cls) -> "PagerDutyConfig":
        """Load from environment variables."""
        timeout_str = os.environ.get("PAGERDUTY_TIMEOUT", "30")
        try:
            timeout = float(timeout_str)
        except ValueError:
            timeout = 30.0
        
        return cls(
            api_key=os.environ.get("PAGERDUTY_API_KEY"),
            routing_key=os.environ.get("PAGERDUTY_ROUTING_KEY"),
            from_email=os.environ.get("PAGERDUTY_FROM_EMAIL"),
            timeout=timeout,
        )
    
    def validate(self, require_api_key: bool = False, require_routing_key: bool = False) -> bool:
        """Validate configuration.
        
        Args:
            require_api_key: If True, REST API key must be present
            require_routing_key: If True, Events API routing key must be present
        
        Returns:
            True if valid
            
        Raises:
            ValueError: If validation fails
        """
        if require_api_key and not self.api_key:
            raise ValueError("PAGERDUTY_API_KEY required for REST API operations")
        
        if require_routing_key and not self.routing_key:
            raise ValueError("PAGERDUTY_ROUTING_KEY required for Events API operations")
        
        return True


class PagerDutyClient:
    """Client for both PagerDuty Events API and REST API.
    
    Features:
    - Events API: trigger, acknowledge, resolve
    - REST API: incidents, oncalls, schedules, policies
    - Automatic retries with exponential backoff and jitter
    - Rate limit handling
    """
    
    def __init__(self, config: PagerDutyConfig) -> None:
        self._config = config
        self._session = requests.Session()
    
    def _get_rest_headers(self) -> dict[str, str]:
        """Get headers for REST API calls."""
        if not self._config.api_key:
            raise ValueError("PAGERDUTY_API_KEY not configured")
        
        headers: dict[str, str] = {
            "Authorization": f"Token token={self._config.api_key}",
            "Accept": "application/vnd.pagerduty+json;version=2",
            "Content-Type": "application/json",
        }
        
        # Some operations require From header (user context)
        if self._config.from_email:
            headers["From"] = self._config.from_email
        
        return headers
    
    def _get_events_headers(self) -> dict[str, str]:
        """Get headers for Events API calls."""
        return {
            "Content-Type": "application/json",
        }
    
    def _calculate_delay(self, attempt: int) -> float:
        """Calculate exponential backoff with jitter.
        
        Args:
            attempt: 0-based attempt number
        
        Returns:
            Delay in seconds
        """
        delay = self._config.initial_retry_delay * (2 ** attempt)
        # Add jitter ±20%
        jitter = random.uniform(0.8, 1.2)
        return delay * jitter
    
    def _request_with_retry(
        self,
        method: str,
        url: str,
        headers: dict[str, str],
        json_data: Optional[dict[str, Any]] = None,
        params: Optional[dict[str, Any]] = None,
        is_events_api: bool = False,
    ) -> dict[str, Any]:
        """Make HTTP request with automatic retries.
        
        Args:
            method: HTTP method
            url: Full URL
            headers: Request headers
            json_data: Optional JSON body
            params: Optional query params
            is_events_api: If True, use Events API error handling
        
        Returns:
            Parsed JSON response
        
        Raises:
            PagerDutyAuthError: If 401/403
            PagerDutyRateLimitError: If 429
            PagerDutyError: For other errors
        """
        last_exception: Optional[Exception] = None
        
        for attempt in range(self._config.max_retries):
            try:
                response = self._session.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=json_data,
                    params=params,
                    timeout=self._config.timeout,
                )
                
                # Handle response
                if response.status_code == 204:
                    return {}
                
                try:
                    result = response.json()
                except json.JSONDecodeError:
                    result = {"raw": response.text[:500]}
                
                # Check status codes
                if response.status_code in (200, 201, 202):
                    return result
                
                elif response.status_code == 401:
                    raise PagerDutyAuthError("PagerDuty API key invalid or missing")
                
                elif response.status_code == 403:
                    raise PagerDutyAuthError(f"PagerDuty forbidden: {result}")
                
                elif response.status_code == 429:
                    retry_after = response.headers.get("Retry-After")
                    delay = int(retry_after) if retry_after else self._calculate_delay(attempt)
                    
                    if attempt < self._config.max_retries - 1:
                        logger.warning(
                            "PagerDuty rate limited (429), retrying in %.1fs",
                            delay
                        )
                        time.sleep(delay)
                        continue
                    else:
                        raise PagerDutyRateLimitError(
                            f"PagerDuty rate limit exceeded after {self._config.max_retries} retries",
                            retry_after=int(retry_after) if retry_after else None
                        )
                
                else:
                    # Other error - don't retry
                    raise PagerDutyError(
                        f"PagerDuty HTTP {response.status_code}: {result}"
                    )
                
            except requests.RequestException as e:
                last_exception = e
                if attempt < self._config.max_retries - 1:
                    delay = self._calculate_delay(attempt)
                    logger.warning("PagerDuty request failed, retrying in %.1fs: %s", delay, e)
                    time.sleep(delay)
                continue
        
        # If we get here, all retries failed
        raise PagerDutyError(
            f"PagerDuty request failed after {self._config.max_retries} retries: {last_exception}"
        ) from last_exception
    
    # ===================================================================
    # Events API v2 (Alert Ingestion)
    # ===================================================================
    
    def send_event(
        self,
        event_action: EventAction,
        dedup_key: str,
        summary: str,
        severity: Severity = "critical",
        source: Optional[str] = None,
        custom_details: Optional[dict[str, Any]] = None,
        routing_key_override: Optional[str] = None,
        links: Optional[list[dict[str, str]]] = None,
        images: Optional[list[dict[str, str]]] = None,
    ) -> dict[str, Any]:
        """Send an event to PagerDuty Events API v2.
        
        Use this to trigger, acknowledge, or resolve incidents.
        
        Args:
            event_action: "trigger", "acknowledge", or "resolve"
            dedup_key: Unique key for deduplication (required for all actions)
            summary: Brief summary (required for trigger)
            severity: "critical", "warning", "error", "info" (trigger only)
            source: Location affected (e.g., hostname, service name)
            custom_details: Additional context data
            routing_key_override: Override default routing key
            links: List of {href, text} links
            images: List of {src, href, alt} images
        
        Returns:
            Response from Events API: {status, message, dedup_key}
        
        Example:
            client.send_event(
                event_action="trigger",
                dedup_key="checkout-service-high-errors-20240115",
                summary="High error rate (>5%) on checkout service",
                severity="critical",
                source="checkout-service-prod",
                custom_details={
                    "error_rate_pct": 8.7,
                    "total_requests": 1245,
                    "error_count": 108,
                },
                links=[
                    {"href": "https://grafana.example.com/d/checkout", "text": "Dashboard"},
                    {"href": "https://runbooks.example.com/high-errors", "text": "Runbook"},
                ],
            )
        """
        routing_key = routing_key_override or self._config.routing_key
        if not routing_key:
            raise ValueError("PAGERDUTY_ROUTING_KEY not configured")
        
        # Build payload
        payload: dict[str, Any] = {
            "routing_key": routing_key,
            "event_action": event_action,
            "dedup_key": dedup_key,
        }
        
        if event_action == "trigger":
            # Trigger requires full payload
            trigger_payload: dict[str, Any] = {
                "summary": summary,
                "severity": severity,
            }
            
            if source:
                trigger_payload["source"] = source
            else:
                trigger_payload["source"] = "unknown"  # Required field
            
            if custom_details:
                trigger_payload["custom_details"] = custom_details
            
            payload["payload"] = trigger_payload
            
            # Optional fields for trigger
            if links:
                payload["links"] = links
            if images:
                payload["images"] = images
        
        elif event_action in ("acknowledge", "resolve"):
            # Ack/resolve can have optional payload
            if summary:
                payload["payload"] = {"summary": summary}
        
        headers = self._get_events_headers()
        
        response = self._request_with_retry(
            method="POST",
            url=self._config.events_api_endpoint,
            headers=headers,
            json_data=payload,
            is_events_api=True,
        )
        
        logger.info(
            "PagerDuty %s event sent: dedup_key=%s, status=%s",
            event_action,
            dedup_key,
            response.get("status", "unknown"),
        )
        
        return response
    
    def trigger_incident(
        self,
        dedup_key: str,
        summary: str,
        severity: Severity = "critical",
        source: Optional[str] = None,
        custom_details: Optional[dict[str, Any]] = None,
        runbook_url: Optional[str] = None,
        dashboard_url: Optional[str] = None,
    ) -> dict[str, Any]:
        """Convenience method to trigger an incident with standard links.
        
        Args:
            dedup_key: Unique deduplication key
            summary: Brief summary
            severity: Severity level
            source: Source service/host
            custom_details: Additional context
            runbook_url: Optional runbook link
            dashboard_url: Optional dashboard link
        
        Returns:
            Events API response
        """
        links: list[dict[str, str]] = []
        
        if runbook_url:
            links.append({"href": runbook_url, "text": "Runbook"})
        if dashboard_url:
            links.append({"href": dashboard_url, "text": "Dashboard"})
        
        return self.send_event(
            event_action="trigger",
            dedup_key=dedup_key,
            summary=summary,
            severity=severity,
            source=source,
            custom_details=custom_details,
            links=links if links else None,
        )
    
    def resolve_incident(
        self,
        dedup_key: str,
        summary: str = "Incident resolved",
    ) -> dict[str, Any]:
        """Resolve an incident via Events API.
        
        Args:
            dedup_key: Same key used when triggering
            summary: Resolution message
        
        Returns:
            Events API response
        """
        return self.send_event(
            event_action="resolve",
            dedup_key=dedup_key,
            summary=summary,
        )
    
    # ===================================================================
    # REST API - Incidents
    # ===================================================================
    
    def list_incidents(
        self,
        statuses: Optional[list[IncidentStatus]] = None,
        service_ids: Optional[list[str]] = None,
        urgency: Optional[Literal["high", "low"]] = None,
        since: Optional[str] = None,  # ISO 8601
        until: Optional[str] = None,  # ISO 8601
        limit: int = 25,
        offset: int = 0,
        sort_by: Optional[str] = None,  # e.g., "created_at:desc"
    ) -> dict[str, Any]:
        """List incidents with filtering.
        
        Args:
            statuses: Filter by status: ["triggered", "acknowledged", "resolved"]
            service_ids: Filter by service IDs
            urgency: "high" or "low"
            since: ISO 8601 start time
            until: ISO 8601 end time
            limit: Results per page (max 100)
            offset: Pagination offset
            sort_by: Sort field and direction
        
        Returns:
            Dict with incidents, limit, offset, total
        """
        params: dict[str, Any] = {
            "limit": min(limit, 100),
            "offset": offset,
        }
        
        if statuses:
            params["statuses[]"] = statuses
        if service_ids:
            params["service_ids[]"] = service_ids
        if urgency:
            params["urgencies[]"] = [urgency]
        if since:
            params["since"] = since
        if until:
            params["until"] = until
        if sort_by:
            params["sort_by"] = sort_by
        
        headers = self._get_rest_headers()
        
        return self._request_with_retry(
            method="GET",
            url=f"{self._config.rest_api_endpoint}/incidents",
            headers=headers,
            params=params,
        )
    
    def get_incident(self, incident_id: str) -> dict[str, Any]:
        """Get a single incident by ID.
        
        Args:
            incident_id: Incident ID (e.g., "Q022JNK45AB8")
        
        Returns:
            Incident details
        """
        headers = self._get_rest_headers()
        
        return self._request_with_retry(
            method="GET",
            url=f"{self._config.rest_api_endpoint}/incidents/{incident_id}",
            headers=headers,
        )
    
    def update_incident_status(
        self,
        incident_id: str,
        status: IncidentStatus,
        resolution: Optional[str] = None,
    ) -> dict[str, Any]:
        """Update incident status.
        
        Args:
            incident_id: Incident ID
            status: New status: "acknowledged" or "resolved"
            resolution: Resolution message for resolved status
        
        Returns:
            Updated incident
        """
        incident: dict[str, Any] = {
            "type": "incident_reference",
            "status": status,
        }
        
        if status == "resolved" and resolution:
            incident["resolution"] = resolution
        
        payload = {"incident": incident}
        headers = self._get_rest_headers()
        
        return self._request_with_retry(
            method="PUT",
            url=f"{self._config.rest_api_endpoint}/incidents/{incident_id}",
            headers=headers,
            json_data=payload,
        )
    
    # ===================================================================
    # REST API - On-Calls & Schedules
    # ===================================================================
    
    def get_oncalls(
        self,
        schedule_ids: Optional[list[str]] = None,
        escalation_policy_ids: Optional[list[str]] = None,
        time_zone: Optional[str] = None,
        since: Optional[str] = None,
        until: Optional[str] = None,
        include: Optional[list[str]] = None,  # users, schedules, escalation_policies
    ) -> dict[str, Any]:
        """Get current on-call users.
        
        Args:
            schedule_ids: Filter by schedule IDs
            escalation_policy_ids: Filter by policy IDs
            time_zone: Time zone (e.g., "America/New_York", "UTC")
            since: ISO 8601 start
            until: ISO 8601 end
            include: Related objects to include
        
        Returns:
            Oncall entries with users
        """
        params: dict[str, Any] = {}
        
        if schedule_ids:
            params["schedule_ids[]"] = schedule_ids
        if escalation_policy_ids:
            params["escalation_policy_ids[]"] = escalation_policy_ids
        if time_zone:
            params["time_zone"] = time_zone
        if since:
            params["since"] = since
        if until:
            params["until"] = until
        if include:
            params["include[]"] = include
        
        headers = self._get_rest_headers()
        
        return self._request_with_retry(
            method="GET",
            url=f"{self._config.rest_api_endpoint}/oncalls",
            headers=headers,
            params=params,
        )
    
    def get_schedule(
        self,
        schedule_id: str,
        time_zone: Optional[str] = None,
        since: Optional[str] = None,
        until: Optional[str] = None,
    ) -> dict[str, Any]:
        """Get a schedule with rendered on-call layers.
        
        Args:
            schedule_id: Schedule ID
            time_zone: Time zone for rendering
            since: Start time
            until: End time
        
        Returns:
            Schedule details with final_schedule
        """
        params: dict[str, Any] = {}
        
        if time_zone:
            params["time_zone"] = time_zone
        if since:
            params["since"] = since
        if until:
            params["until"] = until
        
        headers = self._get_rest_headers()
        
        return self._request_with_retry(
            method="GET",
            url=f"{self._config.rest_api_endpoint}/schedules/{schedule_id}",
            headers=headers,
            params=params,
        )
    
    # ===================================================================
    # REST API - Maintenance Windows
    # ===================================================================
    
    def create_maintenance_window(
        self,
        start_time: str,  # ISO 8601
        end_time: str,    # ISO 8601
        service_ids: list[str],
        description: str,
    ) -> dict[str, Any]:
        """Create a maintenance window to suppress notifications.
        
        Args:
            start_time: ISO 8601 start time (e.g., "2024-01-15T10:00:00Z")
            end_time: ISO 8601 end time
            service_ids: List of service IDs
            description: Description
        
        Returns:
            Created maintenance window
        """
        # Build services references
        services = [
            {"id": sid, "type": "service_reference"}
            for sid in service_ids
        ]
        
        window = {
            "type": "maintenance_window",
            "start_time": start_time,
            "end_time": end_time,
            "description": description,
            "services": services,
        }
        
        payload = {"maintenance_window": window}
        headers = self._get_rest_headers()
        
        return self._request_with_retry(
            method="POST",
            url=f"{self._config.rest_api_endpoint}/maintenance_windows",
            headers=headers,
            json_data=payload,
        )
    
    def validate(self) -> bool:
        """Validate connectivity by listing users or sending test event.
        
        Returns:
            True if connection works
        """
        # Try REST API first if key available
        if self._config.api_key:
            try:
                headers = self._get_rest_headers()
                self._request_with_retry(
                    "GET",
                    f"{self._config.rest_api_endpoint}/users",
                    headers=headers,
                    params={"limit": 1},
                )
                logger.info("PagerDuty REST API connectivity validated")
                return True
            except Exception as e:
                logger.warning("REST API validation failed: %s", e)
        
        # Try Events API if routing key available
        if self._config.routing_key:
            try:
                # Send a resolve with a unique key (safe, won't trigger)
                dedup_key = f"validation-test-{int(time.time())}"
                response = self.resolve_incident(dedup_key, "Validation test")
                logger.info("PagerDuty Events API connectivity validated")
                return True
            except Exception as e:
                logger.warning("Events API validation failed: %s", e)
        
        raise PagerDutyError("No valid PagerDuty API keys configured")


# Global client (lazy-loaded)
_global_client: Optional[PagerDutyClient] = None


def get_pagerduty_client() -> PagerDutyClient:
    """Get or create global PagerDutyClient."""
    global _global_client
    if _global_client is None:
        config = PagerDutyConfig.from_env()
        _global_client = PagerDutyClient(config)
    return _global_client
```

### Pattern 2: Alert Deduplication & Correlation

```python
"""Deduplication key strategies for PagerDuty Events API.

The dedup_key is critical:
- Same key = same incident (for ack/resolve)
- Used for deduplication of repeated events
- MUST be consistent across trigger/ack/resolve

Good strategies:
1. Service + Alert Type: "checkout-service-high-error-rate"
2. Service + Alert Type + Date: "checkout-service-high-errors-20240115"
3. Service + Specific Component: "checkout-service-db-connection-failed"
4. Include entity ID for per-resource alerts: "host-web-01-cpu-high"

Never use:
- Random UUIDs (can't resolve later)
- Timestamps alone (every event is unique)
- Very short or generic keys ("error", "alert")
"""

from __future__ import annotations

import hashlib
import logging
from typing import Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class DedupKeyStrategy:
    """Generator for consistent deduplication keys.
    
    Provides strategies for generating deterministic dedup_key values.
    """
    
    @staticmethod
    def by_service_and_type(
        service: str,
        alert_type: str,
        include_date: bool = True,
    ) -> str:
        """Generate key by service and alert type.
        
        Args:
            service: Service name (e.g., "checkout-service")
            alert_type: Alert type (e.g., "high-error-rate")
            include_date: Include YYYYMMDD for daily uniqueness
        
        Returns:
            dedup_key string
        """
        parts = [service, alert_type]
        
        if include_date:
            today = datetime.now(timezone.utc).strftime("%Y%m%d")
            parts.append(today)
        
        return "-".join(parts)
    
    @staticmethod
    def by_entity(
        service: str,
        entity_type: str,
        entity_id: str,
        alert_type: str,
    ) -> str:
        """Generate key including specific entity.
        
        Use for per-resource alerts like:
        - Specific host down
        - Specific database connection issue
        - Specific queue backlog
        
        Args:
            service: Service name
            entity_type: Type (host, queue, database, etc.)
            entity_id: Entity identifier
            alert_type: Alert type
        
        Returns:
            dedup_key string
        """
        return f"{service}-{entity_type}-{entity_id}-{alert_type}"
    
    @staticmethod
    def by_content_hash(
        service: str,
        alert_type: str,
        content: str,
    ) -> str:
        """Generate key by hashing alert content.
        
        Use when same exact error should deduplicate.
        
        Args:
            service: Service name
            alert_type: Alert type
            content: Content to hash (error message, stack trace, etc.)
        
        Returns:
            dedup_key with hash suffix
        """
        content_hash = hashlib.md5(content.encode()).hexdigest()[:12]
        return f"{service}-{alert_type}-{content_hash}"


# Alert correlation helpers

class AlertCorrelator:
    """Correlates related alerts to reduce noise.
    
    Use before sending to PagerDuty to:
    - Group related alerts
    - Determine severity escalation
    - Add context links
    """
    
    def __init__(self, client: Any) -> None:
        self._client = client
        self._recent_alerts: dict[str, float] = {}  # dedup_key -> timestamp
    
    def should_trigger(
        self,
        dedup_key: str,
        threshold_seconds: float = 300.0,  # 5 minutes
    ) -> tuple[bool, Optional[str]]:
        """Check if alert should trigger or is recent duplicate.
        
        Args:
            dedup_key: Deduplication key
            threshold_seconds: Suppress if triggered within this window
        
        Returns:
            (should_trigger, reason) tuple
        """
        now = datetime.now(timezone.utc).timestamp()
        
        if dedup_key in self._recent_alerts:
            last_trigger = self._recent_alerts[dedup_key]
            elapsed = now - last_trigger
            
            if elapsed < threshold_seconds:
                return (
                    False,
                    f"Suppressed: triggered {elapsed:.0f}s ago (threshold={threshold_seconds}s)"
                )
        
        # Record this trigger
        self._recent_alerts[dedup_key] = now
        
        # Clean up old entries
        self._cleanup_old_entries(now, threshold_seconds * 2)
        
        return (True, "First occurrence or outside suppression window")
    
    def _cleanup_old_entries(self, now: float, max_age: float) -> None:
        """Remove entries older than max_age."""
        keys_to_remove = [
            k for k, v in self._recent_alerts.items()
            if now - v > max_age
        ]
        for k in keys_to_remove:
            del self._recent_alerts[k]


# Example: Standard alerting workflow

def alert_on_high_error_rate(
    client: Any,
    correlator: AlertCorrelator,
    service: str,
    error_rate_pct: float,
    threshold_pct: float = 5.0,
) -> dict[str, Any]:
    """Standard workflow for high error rate alert.
    
    Steps:
    1. Check if rate exceeds threshold
    2. Check correlation/suppression window
    3. Build rich context
    4. Send to PagerDuty
    
    Returns:
        Result dict
    """
    if error_rate_pct < threshold_pct:
        return {"action": "suppressed", "reason": f"Below threshold ({error_rate_pct}% < {threshold_pct}%)"}
    
    # Determine severity
    if error_rate_pct >= 20.0:
        severity = "critical"
    elif error_rate_pct >= 10.0:
        severity = "error"
    else:
        severity = "warning"
    
    # Generate consistent dedup key
    dedup_key = DedupKeyStrategy.by_service_and_type(
        service=service,
        alert_type="high-error-rate",
        include_date=True,
    )
    
    # Check correlation
    should_trigger, reason = correlator.should_trigger(dedup_key)
    if not should_trigger:
        return {"action": "suppressed", "reason": reason, "dedup_key": dedup_key}
    
    # Build context
    summary = (
        f"High error rate on {service}: {error_rate_pct:.1f}% "
        f"(threshold: {threshold_pct}%)"
    )
    
    custom_details = {
        "service": service,
        "error_rate_pct": round(error_rate_pct, 2),
        "threshold_pct": threshold_pct,
        "severity": severity,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    
    # Send to PagerDuty
    response = client.trigger_incident(
        dedup_key=dedup_key,
        summary=summary,
        severity=severity,
        source=service,
        custom_details=custom_details,
        runbook_url=f"https://runbooks.example.com/high-error-rate",
        dashboard_url=f"https://grafana.example.com/d/{service}",
    )
    
    return {
        "action": "triggered",
        "dedup_key": dedup_key,
        "severity": severity,
        "response": response,
    }
```

---

## Constraints

### MUST DO

- Use Events API v2 for alert ingestion (trigger/ack/resolve), NOT REST API
- Always include `dedup_key` in all Events API calls
- Use `routing_key` for Events API, `api_key` for REST API
- Include required REST API headers: `Authorization: Token token=...`, `Accept: application/vnd.pagerduty+json;version=2`
- Add `From` header for user context operations
- Implement exponential backoff with jitter for 429 responses
- Include `payload.summary`, `payload.severity`, `payload.source` in all trigger events
- Use consistent `dedup_key` generation strategy across trigger/ack/resolve
- Include `runbook_url` and `dashboard_url` as links when triggering
- Set appropriate maintenance windows during deploys

### MUST NOT DO

- NEVER use REST API for alert ingestion (Events API is designed for this)
- NEVER generate random `dedup_key` (can't resolve later)
- NEVER use timestamps in `dedup_key` (every event becomes unique)
- NEVER omit `payload.source` in trigger events (required field)
- NEVER send PII or sensitive data in `custom_details`
- NEVER ignore 429 responses without backoff
- NEVER create maintenance windows without timezone-aware timestamps
- NEVER resolve incidents with wrong `dedup_key`
- NEVER use `event_action: trigger` when you mean `acknowledge` or `resolve`
- NEVER hardcode API keys or routing keys in source code

---

## Output Template

When implementing PagerDuty integrations, produce:

1. **Client Initialization** — `PagerDutyConfig` and `PagerDutyClient` reading from env vars
2. **Deduplication Strategy** — `DedupKeyStrategy` with service+alert_type+date pattern
3. **Alert Correlation** — `AlertCorrelator` for noise reduction and suppression windows
4. **Standard Alert Workflow** — Threshold check → severity determination → context building → trigger
5. **Events API Usage** — `trigger_incident()`, `resolve_incident()` with proper fields
6. **REST API Helpers** — `list_incidents()`, `get_oncalls()`, `create_maintenance_window()`
7. **Rate Limit Handling** — Exponential backoff with jitter, `Retry-After` parsing

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-datadog-api` | Datadog monitoring with PagerDuty integration |
| `coding-grafana-prometheus` | Prometheus Alertmanager with PagerDuty receiver |
| `coding-sentry-api` | Sentry error tracking with PagerDuty notifications |
| `coding-slack-api` | ChatOps with Slack for incident management |

---

## Live References

| Resource | URL |
|----------|-----|
| pdpyras (PyPI) | https://pypi.org/project/pdpyras/ |
| Events API v2 Docs | https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTgw-events-api-v2-overview |
| REST API v2 Docs | https://developer.pagerduty.com/api-reference/ |
| PagerDuty Python SDK | https://github.com/PagerDuty/pdpyras |
| Incident Management | https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTY3-incidents |
| On-Call Schedules | https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTcw-on-calls |
| Maintenance Windows | https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTcw-maintenance-windows |
| Rate Limits | https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTc3-rest-api-rate-limits |

---

## 📎 API Keys vs Routing Keys

| Type | Used For | Format | Source |
|------|-----------|--------|--------|
| **API Key** | REST API operations | `u+_...` or `pd_...` | User Profile → User Settings |
| **Routing Key** | Events API ingestion | 32 char hex | Service → Integrations |
| **Integration Key** | Same as routing key | 32 char hex | Same as routing key |

**Critical:** Don't confuse them! Events API needs routing/integration key. REST API needs API key.

---

## 📎 Event Action States

| Action | Purpose | Required Fields |
|--------|---------|-----------------|
| `trigger` | Create/Open incident | `routing_key`, `dedup_key`, `payload.summary`, `payload.severity`, `payload.source` |
| `acknowledge` | Mark as being worked on | `routing_key`, `dedup_key` (matching trigger) |
| `resolve` | Close incident | `routing_key`, `dedup_key` (matching trigger) |

**Important:** Use the SAME `dedup_key` for ack/resolve that you used for trigger.
