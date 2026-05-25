---
name: newrelic-api
description: Implements New Relic API integration (metrics, traces, logs, NRDB queries,
  dashboards, alert policies) using newrelic Python SDK v8+ with NerdGraph GraphQL
  API, NRQL queries, custom events, and distributed tracing patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: new relic, nrql queries, nerdgraph, custom events, new relic alerts, apm
    tracing, how do i send data to new relic, observability platform
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
  related-skills: coding-datadog-api, coding-grafana-prometheus, coding-sentry-api
------
# New Relic API Integration

Implements production-grade New Relic API integration using the `newrelic` Python SDK v8+ and NerdGraph GraphQL API. When loaded, this skill makes the model implement custom metrics submission, NRDB queries with NRQL, custom events via Event API, distributed tracing with New Relic APM, alert policy creation, and dashboard management via GraphQL. All implementations follow New Relic best practices: use `NEW_RELIC_LICENSE_KEY` environment variable, batch events/metrics for efficiency, use consistent attribute naming, implement exponential backoff for rate limits, and validate API connectivity on startup.

## TL;DR Checklist

- [ ] Use `newrelic` SDK v8+ or NerdGraph GraphQL API with `NEW_RELIC_LICENSE_KEY` from env var
- [ ] Read license key from `NEW_RELIC_LICENSE_KEY`, never hardcode
- [ ] Use region-specific endpoints: US (`newrelic.com`) vs EU (`eu.newrelic.com`)
- [ ] Batch custom events in 100-1000 event batches (max 1MB per payload)
- [ ] Use consistent attribute naming: camelCase (New Relic convention), mandatory `appName`, `environment`
- [ ] Validate API connectivity on startup with a lightweight NRQL query
- [ ] Implement exponential backoff for 429 rate limit responses
- [ ] Use NerdGraph for resource management (dashboards, alerts) and Event API for telemetry
- [ ] Never send PII or sensitive data as custom event attributes
- [ ] Include `team.name` attribute in all telemetry for ownership

---

## When to Use

Use this skill when:

- Sending custom business events and metrics from Python applications
- Querying telemetry data using NRQL (New Relic Query Language)
- Creating and managing alert policies and conditions programmatically
- Building and updating dashboards via NerdGraph GraphQL API
- Implementing distributed tracing across microservices
- Forwarding structured logs with context attributes
- Querying APM data for SLI/SLO calculations
- Managing New Relic resources as code (Infrastructure as Code)

---

## When NOT to Use

- For Datadog-specific monitoring — use `coding-datadog-api` instead
- For Prometheus + Grafana open-source stack — use `coding-grafana-prometheus`
- For error tracking only (not full observability) — use `coding-sentry-api`
- When you need DogStatsD UDP protocol (Datadog-specific)
- For on-premise without cloud connectivity — consider open-source alternatives

---

## Core Workflow

1. **Initialize Configuration** — Create New Relic client using `NEW_RELIC_LICENSE_KEY` and `NEW_RELIC_REGION` from environment variables. Determine endpoint: US (`insights-collector.newrelic.com`) or EU (`insights-collector.eu.newrelic.com`). **Checkpoint:** Validate connectivity by sending a test custom event or running `SELECT 1` NRQL query.

2. **Define Attribute Naming Strategy** — Follow New Relic convention: camelCase attribute names, define mandatory attributes: `appName`, `environment`, `service.name`, `team.name`. Map OpenTelemetry conventions where applicable. **Checkpoint:** Every custom event must have at least `appName` and `environment`.

3. **Implement Batch Event Submission** — Collect custom events in memory and submit via Event API. Max 1000 events or 1MB per payload. Use `EventApi` from SDK or HTTP POST to `v1/accounts/{accountId}/events`. **Checkpoint:** Batch size configurable; default 100 events per submission.

4. **Execute NRQL Queries** — Use NerdGraph GraphQL API to run NRQL queries. Query format: `{ actor { account(id: ACCOUNT_ID) { nrql(query: "SELECT ...") { results } } } }`. Handle pagination for large result sets. **Checkpoint:** All queries include `SINCE`/`UNTIL` time bounds to prevent full-table scans.

5. **Create Alert Policies & Conditions** — Use NerdGraph mutations to create alert policies, NRQL alert conditions, and notification channels (Webhook, Slack, PagerDuty). Define violation time limits and loss-of-signal conditions. **Checkpoint:** Every alert condition has a corresponding runbook URL in the description.

6. **Build Dashboards via NerdGraph** — Use GraphQL mutations to create dashboards with widgets. Use template variables for `environment` and `appName` filtering. Support both line charts and table widgets. **Checkpoint:** Dashboard has `team.name` tag for ownership attribution.

---

## Implementation Patterns

### Pattern 1: New Relic Client Initialization (BAD vs GOOD)

```python
"""New Relic SDK and API client initialization patterns.

Two primary APIs:
1. Telemetry Data Ingestion (Event API, Metrics API, Trace API)
   - Uses License Key (ingest key)
   - Endpoint: insights-collector.newrelic.com (US) or .eu variant
   
2. NerdGraph GraphQL API (for queries and resource management)
   - Uses Personal API Key (USER key)
   - Endpoint: api.newrelic.com/graphql

SDK versions:
- newrelic v8+: Current Python SDK with telemetry SDK integration
- newrelic-telemetry-sdk: Lower-level ingestion only
- NerdGraph: GraphQL API for everything else (preferred for resources)
"""

from __future__ import annotations

import os
import json
import logging
import time
from typing import Any, Optional, Literal
from datetime import datetime, timedelta, timezone
from urllib.parse import urljoin

import requests

logger = logging.getLogger(__name__)

NewRelicRegion = Literal["US", "EU"]

# ===================================================================
# ❌ BAD — hardcoded keys, no region handling, no validation
# ===================================================================

def bad_newrelic_init_bad() -> dict[str, Any]:
    """❌ BAD: Hardcoded keys, no region awareness, no validation."""
    
    # ❌ Hardcoded! Never commit API keys!
    license_key = "NRAK-xxxxxxxxxxxxxxxxxxxxxxx"
    
    # ❌ US-only endpoint, won't work for EU customers
    endpoint = "https://insights-collector.newrelic.com/v1/accounts/1234567/events"
    
    # ❌ No validation
    # ❌ No error handling
    return {"license_key": license_key, "endpoint": endpoint}


# ===================================================================
# ✅ GOOD — env-based auth, region-aware, validation, typed errors
# ===================================================================


class NewRelicClientError(Exception):
    """Base exception for New Relic client errors."""
    pass


class NewRelicAuthError(NewRelicClientError):
    """Authentication/API key is invalid."""
    pass


class NewRelicRateLimitError(NewRelicClientError):
    """Rate limit exceeded."""
    
    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


class NewRelicRegionConfig:
    """Region-specific endpoint configuration."""
    
    REGION_CONFIGS: dict[NewRelicRegion, dict[str, str]] = {
        "US": {
            "event_api": "https://insights-collector.newrelic.com",
            "nerdgraph": "https://api.newrelic.com/graphql",
            "trace_api": "https://trace-api.newrelic.com",
            "metric_api": "https://metric-api.newrelic.com",
        },
        "EU": {
            "event_api": "https://insights-collector.eu.newrelic.com",
            "nerdgraph": "https://api.eu.newrelic.com/graphql",
            "trace_api": "https://trace-api.eu.newrelic.com",
            "metric_api": "https://metric-api.eu.newrelic.com",
        },
    }
    
    @classmethod
    def get_endpoint(cls, region: NewRelicRegion, api_type: str) -> str:
        """Get endpoint for a region and API type."""
        if region not in cls.REGION_CONFIGS:
            raise ValueError(f"Unknown region: {region}")
        
        config = cls.REGION_CONFIGS[region]
        if api_type not in config:
            raise ValueError(f"Unknown API type: {api_type}")
        
        return config[api_type]
    
    @classmethod
    def detect_region(cls) -> NewRelicRegion:
        """Detect region from environment variable.
        
        Checks: NEW_RELIC_REGION, NR_REGION
        Default: US
        """
        region = os.environ.get("NEW_RELIC_REGION") or os.environ.get("NR_REGION", "US")
        region_upper = region.strip().upper()
        
        if region_upper in ("EU", "US"):
            return region_upper  # type: ignore[return-value]
        
        logger.warning("Unknown region '%s', defaulting to US", region)
        return "US"


class NewRelicConfig:
    """New Relic configuration from environment variables.
    
    Environment variables:
        NEW_RELIC_LICENSE_KEY: Ingest license key (required for telemetry)
        NEW_RELIC_API_KEY: Personal API key (for NerdGraph queries)
        NEW_RELIC_REGION: US or EU (default: US)
        NEW_RELIC_ACCOUNT_ID: Account ID (required for some operations)
        NEW_RELIC_APP_NAME: Default application name for telemetry
        ENVIRONMENT: Environment tag (production, staging, dev)
    
    Usage:
        config = NewRelicConfig.from_env()
        if config.validate():
            client = NewRelicClient(config)
    """
    
    def __init__(
        self,
        license_key: Optional[str] = None,
        api_key: Optional[str] = None,
        region: NewRelicRegion = "US",
        account_id: Optional[int] = None,
        app_name: Optional[str] = None,
        environment: Optional[str] = None,
    ) -> None:
        self.license_key = license_key.strip() if license_key else None
        self.api_key = api_key.strip() if api_key else None
        self.region = region
        self.account_id = account_id
        self.app_name = app_name
        self.environment = environment or os.environ.get("ENVIRONMENT")
    
    @classmethod
    def from_env(cls) -> "NewRelicConfig":
        """Load configuration from environment variables.
        
        Returns:
            Configured NewRelicConfig instance.
        """
        account_id_str = os.environ.get("NEW_RELIC_ACCOUNT_ID")
        account_id = int(account_id_str) if account_id_str else None
        
        return cls(
            license_key=os.environ.get("NEW_RELIC_LICENSE_KEY"),
            api_key=os.environ.get("NEW_RELIC_API_KEY"),
            region=NewRelicRegionConfig.detect_region(),
            account_id=account_id,
            app_name=os.environ.get("NEW_RELIC_APP_NAME"),
            environment=os.environ.get("ENVIRONMENT"),
        )
    
    def validate(self, require_license_key: bool = True) -> bool:
        """Validate configuration.
        
        Args:
            require_license_key: If True, license_key must be present.
        
        Returns:
            True if validation passes.
            
        Raises:
            ValueError: If validation fails.
        """
        if require_license_key:
            if not self.license_key:
                if os.environ.get("ENV") == "production":
                    raise ValueError("NEW_RELIC_LICENSE_KEY required in production")
                logger.warning("NEW_RELIC_LICENSE_KEY not set — using placeholder mode")
        
        if self.region not in ("US", "EU"):
            raise ValueError(f"Invalid region: {self.region}")
        
        return True
    
    def get_event_api_endpoint(self, account_id: Optional[int] = None) -> str:
        """Get Event API endpoint URL.
        
        Args:
            account_id: Override default account ID.
        
        Returns:
            Full endpoint URL.
        """
        account = account_id or self.account_id
        if not account:
            raise ValueError("Account ID required for Event API")
        
        base = NewRelicRegionConfig.get_endpoint(self.region, "event_api")
        return f"{base}/v1/accounts/{account}/events"
    
    def get_nerdgraph_endpoint(self) -> str:
        """Get NerdGraph GraphQL endpoint."""
        return NewRelicRegionConfig.get_endpoint(self.region, "nerdgraph")


class NewRelicClient:
    """New Relic API client supporting both Event API and NerdGraph.
    
    Features:
    - Custom event submission (batch, automatic retries)
    - NRQL queries via NerdGraph
    - Alert policy management via NerdGraph
    - Dashboard management via NerdGraph
    """
    
    def __init__(self, config: NewRelicConfig, timeout: float = 30.0) -> None:
        self._config = config
        self._timeout = timeout
        self._session = requests.Session()
    
    def _get_auth_headers(self, use_api_key: bool = False) -> dict[str, str]:
        """Get authentication headers.
        
        Args:
            use_api_key: If True, use Personal API Key (for NerdGraph).
                        If False, use License Key (for Event API).
        """
        if use_api_key:
            api_key = self._config.api_key
            if not api_key:
                raise ValueError("NEW_RELIC_API_KEY required for NerdGraph operations")
            return {"API-Key": api_key}
        else:
            license_key = self._config.license_key
            if not license_key:
                raise ValueError("NEW_RELIC_LICENSE_KEY required for Event API")
            return {"X-Insert-Key": license_key}
    
    def submit_custom_events(
        self,
        events: list[dict[str, Any]],
        account_id: Optional[int] = None,
    ) -> bool:
        """Submit custom events to Event API.
        
        Args:
            events: List of event dictionaries. Each must have `eventType`.
            account_id: Optional override account ID.
        
        Returns:
            True if successful.
        
        Raises:
            NewRelicAuthError: If key is invalid.
            NewRelicRateLimitError: If rate limited.
            NewRelicClientError: For other errors.
        """
        if not events:
            return True
        
        # Each event must have eventType
        for event in events:
            if "eventType" not in event:
                raise ValueError("Each event must have 'eventType' key")
        
        endpoint = self._config.get_event_api_endpoint(account_id)
        headers = self._get_auth_headers(use_api_key=False)
        headers["Content-Type"] = "application/json"
        
        # Add default attributes from config
        enriched_events = []
        for event in events:
            enriched = dict(event)
            if self._config.app_name and "appName" not in enriched:
                enriched["appName"] = self._config.app_name
            if self._config.environment and "environment" not in enriched:
                enriched["environment"] = self._config.environment
            enriched_events.append(enriched)
        
        try:
            response = self._session.post(
                endpoint,
                headers=headers,
                json=enriched_events,
                timeout=self._timeout,
            )
            
            if response.status_code == 200:
                logger.debug("Submitted %d custom events", len(events))
                return True
            
            elif response.status_code == 401:
                raise NewRelicAuthError("Invalid New Relic license key")
            
            elif response.status_code == 429:
                retry_after = response.headers.get("Retry-After")
                raise NewRelicRateLimitError(
                    "New Relic Event API rate limited",
                    retry_after=int(retry_after) if retry_after else None
                )
            
            else:
                raise NewRelicClientError(
                    f"Event API failed: {response.status_code} {response.text[:200]}"
                )
        
        except requests.RequestException as e:
            raise NewRelicClientError(f"Network error submitting events: {e}") from e
    
    def nerdgraph_query(
        self,
        query: str,
        variables: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """Execute a NerdGraph GraphQL query.
        
        Args:
            query: GraphQL query string.
            variables: Optional variables dict.
        
        Returns:
            Parsed JSON response.
        
        Example:
            result = client.nerdgraph_query('''
                query($accountId: Int!) {
                    actor {
                        account(id: $accountId) {
                            nrql(query: "SELECT count(*) FROM Transaction SINCE 1 hour ago") {
                                results
                            }
                        }
                    }
                }
            ''', {"accountId": 1234567})
        """
        endpoint = self._config.get_nerdgraph_endpoint()
        headers = self._get_auth_headers(use_api_key=True)
        headers["Content-Type"] = "application/json"
        
        payload: dict[str, Any] = {"query": query}
        if variables:
            payload["variables"] = variables
        
        try:
            response = self._session.post(
                endpoint,
                headers=headers,
                json=payload,
                timeout=self._timeout,
            )
            
            if response.status_code != 200:
                if response.status_code == 401:
                    raise NewRelicAuthError("Invalid New Relic API key")
                elif response.status_code == 429:
                    retry_after = response.headers.get("Retry-After")
                    raise NewRelicRateLimitError(
                        "NerdGraph rate limited",
                        retry_after=int(retry_after) if retry_after else None
                    )
                else:
                    raise NewRelicClientError(
                        f"NerdGraph failed: {response.status_code} {response.text[:200]}"
                    )
            
            data = response.json()
            
            if "errors" in data:
                errors = data["errors"]
                raise NewRelicClientError(f"NerdGraph query errors: {errors}")
            
            return data.get("data", {})
        
        except requests.RequestException as e:
            raise NewRelicClientError(f"Network error in NerdGraph: {e}") from e
    
    def run_nrql(
        self,
        nrql_query: str,
        account_id: Optional[int] = None,
    ) -> list[dict[str, Any]]:
        """Run a NRQL query and return results.
        
        Args:
            nrql_query: NRQL query string (e.g., "SELECT count(*) FROM Transaction")
            account_id: Optional override account ID.
        
        Returns:
            List of result rows.
        """
        account = account_id or self._config.account_id
        if not account:
            raise ValueError("Account ID required for NRQL queries")
        
        # Escape double quotes in NRQL for GraphQL
        escaped_nrql = nrql_query.replace('"', '\\"')
        
        graphql_query = f'''
        query {{
            actor {{
                account(id: {account}) {{
                    nrql(query: "{escaped_nrql}") {{
                        results
                        metadata {{
                            eventTypes
                            facets
                            timeWindow {{
                                begin
                                end
                                since
                                until
                            }}
                        }}
                    }}
                }}
            }}
        }}
        '''
        
        result = self.nerdgraph_query(graphql_query)
        
        try:
            results = result["actor"]["account"]["nrql"]["results"]
            return results if isinstance(results, list) else [results]
        except (KeyError, TypeError) as e:
            raise NewRelicClientError(f"Failed to parse NRQL results: {e}") from e
    
    def validate_connectivity(self) -> bool:
        """Validate API connectivity.
        
        Sends a lightweight test event or runs a simple query.
        
        Returns:
            True if connection works.
        """
        # Try NerdGraph if API key available
        if self._config.api_key and self._config.account_id:
            try:
                result = self.run_nrql(
                    "SELECT 1 FROM Transaction LIMIT 1 SINCE 1 minute ago",
                )
                logger.info("New Relic NerdGraph connectivity validated")
                return True
            except NewRelicClientError as e:
                if "rate limit" not in str(e).lower():
                    logger.warning("NerdGraph validation failed: %s", e)
        
        # Fallback: just check config
        self._config.validate(require_license_key=True)
        logger.info("New Relic config validated")
        return True


# Global client (lazy-loaded)
_global_client: Optional[NewRelicClient] = None


def get_newrelic_client() -> NewRelicClient:
    """Get or create the global NewRelicClient instance."""
    global _global_client
    if _global_client is None:
        config = NewRelicConfig.from_env()
        _global_client = NewRelicClient(config)
    return _global_client
```

### Pattern 2: Custom Event Batching & Submission

```python
"""Custom event batching for New Relic Event API.

Event API limits:
- Max 1000 events per request
- Max 1MB total payload size
- Each event max 256KB
- Attribute names: max 255 chars
- Attribute values: string max 4096 chars

Best practices:
- Batch 100-1000 events per call
- Use camelCase for attribute names (New Relic convention)
- Always include eventType, appName, environment
- Add timestamp explicitly (or let New Relic set at ingest)
- Don't nest objects deeper than 1 level
"""

from __future__ import annotations

import time
import threading
import logging
from typing import Any, Optional
from collections import deque
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class NewRelicEventBatcher:
    """Thread-safe batcher for New Relic custom events.
    
    Buffers events and flushes:
    - When batch size reaches threshold
    - When flush interval elapses
    - On explicit flush() call
    
    Usage:
        batcher = NewRelicEventBatcher(client, batch_size=100, flush_interval_seconds=10)
        batcher.start()
        
        # Record events
        batcher.record(
            eventType="CheckoutCompleted",
            orderId="ORD-12345",
            amount=99.99,
            currency="USD",
            paymentMethod="credit_card",
        )
        
        # When shutting down
        batcher.stop()
        batcher.flush()
    """
    
    DEFAULT_BATCH_SIZE = 100
    DEFAULT_FLUSH_INTERVAL = 10.0  # seconds
    MAX_BATCH_SIZE = 1000  # New Relic API limit
    
    def __init__(
        self,
        client: Any,
        batch_size: int = DEFAULT_BATCH_SIZE,
        flush_interval_seconds: float = DEFAULT_FLUSH_INTERVAL,
        default_attributes: Optional[dict[str, Any]] = None,
    ) -> None:
        self._client = client
        self._batch_size = min(max(1, batch_size), self.MAX_BATCH_SIZE)
        self._flush_interval = max(1.0, flush_interval_seconds)
        self._default_attributes = dict(default_attributes) if default_attributes else {}
        
        self._buffer: deque[dict[str, Any]] = deque()
        self._lock = threading.Lock()
        self._flush_thread: Optional[threading.Thread] = None
        self._running = False
        self._total_submitted = 0
        self._total_failed = 0
    
    def start(self) -> None:
        """Start the background flush thread."""
        if self._running:
            return
        
        self._running = True
        self._flush_thread = threading.Thread(
            target=self._flush_loop,
            daemon=True,
            name="newrelic-event-flusher",
        )
        self._flush_thread.start()
        logger.info("NewRelicEventBatcher started with batch_size=%d, flush_interval=%.1fs",
                    self._batch_size, self._flush_interval)
    
    def stop(self) -> None:
        """Stop the background flush thread."""
        self._running = False
        if self._flush_thread:
            self._flush_thread.join(timeout=5.0)
            self._flush_thread = None
    
    def _flush_loop(self) -> None:
        """Background thread that periodically flushes the buffer."""
        while self._running:
            time.sleep(self._flush_interval)
            try:
                self.flush()
            except Exception:
                logger.exception("Background event flush failed")
    
    def _now_ms(self) -> int:
        """Get current Unix timestamp in milliseconds."""
        return int(datetime.now(timezone.utc).timestamp() * 1000)
    
    def record(
        self,
        eventType: str,
        timestamp: Optional[int] = None,
        **attributes: Any,
    ) -> None:
        """Record a custom event.
        
        Args:
            eventType: Name of the event type (e.g., "CheckoutCompleted", "UserLoggedIn")
            timestamp: Optional Unix timestamp in milliseconds (defaults to now)
            **attributes: Additional key-value attributes
        
        Example:
            batcher.record(
                "CheckoutCompleted",
                orderId="ORD-12345",
                amount=99.99,
                items=3,
                coupon="SUMMER20",
            )
        """
        if not eventType or not eventType.strip():
            logger.warning("Empty eventType skipped")
            return
        
        event: dict[str, Any] = {
            "eventType": eventType.strip(),
        }
        
        # Add default attributes first
        event.update(self._default_attributes)
        
        # Add provided attributes
        event.update(attributes)
        
        # Add timestamp if provided
        if timestamp is not None:
            event["timestamp"] = timestamp
        
        # Validate attribute types
        for key, value in list(event.items()):
            # New Relic supports: string, number, boolean
            # Convert anything else to string representation
            if not isinstance(value, (str, int, float, bool, type(None))):
                event[key] = str(value)
        
        with self._lock:
            self._buffer.append(event)
            
            # Auto-flush if buffer reaches threshold
            if len(self._buffer) >= self._batch_size:
                self._flush_locked()
    
    def flush(self) -> int:
        """Flush all buffered events to New Relic.
        
        Returns:
            Number of events successfully submitted.
        """
        with self._lock:
            return self._flush_locked()
    
    def _flush_locked(self) -> int:
        """Flush buffer (must hold lock)."""
        if not self._buffer:
            return 0
        
        to_submit = list(self._buffer)
        self._buffer.clear()
        
        try:
            success = self._client.submit_custom_events(to_submit)
            
            if success:
                submitted = len(to_submit)
                self._total_submitted += submitted
                logger.debug("Submitted %d events to New Relic", submitted)
                return submitted
            else:
                # Put back for retry
                self._buffer.extendleft(reversed(to_submit))
                return 0
                
        except Exception as e:
            # Put back unless it's an auth error
            if "auth" not in type(e).__name__.lower():
                self._buffer.extendleft(reversed(to_submit))
            
            self._total_failed += len(to_submit)
            logger.warning("Failed to submit %d events: %s", len(to_submit), e)
            return 0
    
    def get_stats(self) -> dict[str, int]:
        """Get submission statistics."""
        with self._lock:
            return {
                "buffered": len(self._buffer),
                "submitted": self._total_submitted,
                "failed": self._total_failed,
            }


# ===================================================================
# ❌ BAD — DO NOT DO THIS
# ===================================================================

def bad_event_example_bad() -> dict[str, Any]:
    """❌ BAD: Poor event structure."""
    return {
        # ❌ No eventType (required!)
        # ❌ No appName or environment context
        # ❌ Using snake_case instead of camelCase
        "order_id": "ORD-12345",
        "total_amount": 99.99,
        # ❌ Nested objects deeper than 1 level (flatten instead)
        "customer": {
            "id": "CUST-789",
            "name": "John Doe",  # ❌ PII! Don't send names/emails
            "email": "john@example.com",
        },
        # ❌ Very long string values
        "debugInfo": "x" * 5000,  # Over 4096 char limit
    }


# ===================================================================
# ✅ GOOD — Proper event structure
# ===================================================================

def record_checkout_event(
    batcher: NewRelicEventBatcher,
    order_id: str,
    amount: float,
    currency: str,
    payment_method: str,
    item_count: int,
    customer_id: str,  # Hash ID, not email
) -> None:
    """Record a properly structured checkout event.
    
    ✅ Has eventType
    ✅ Uses camelCase attribute names
    ✅ Has context: appName, environment (added via default_attributes)
    ✅ No PII (using customerId hash, not email)
    ✅ Simple types only (no deep nesting)
    """
    batcher.record(
        eventType="CheckoutCompleted",
        orderId=order_id,
        amount=amount,
        currency=currency,
        paymentMethod=payment_method,
        itemCount=item_count,
        customerId=customer_id,  # Hashed, not PII
        success=True,
    )
```

### Pattern 3: NRQL Query Patterns

```python
"""NRQL (New Relic Query Language) patterns.

NRQL is similar to SQL but for New Relic's event database.

Common patterns:
- Aggregation: SELECT count(*), avg(duration), percentile(duration, 95)
- Filtering: WHERE appName = 'checkout' AND environment = 'production'
- Time bounds: SINCE 1 hour ago UNTIL 5 minutes ago
- Grouping: FACET serviceName, hostname
- Ordering: LIMIT 10, ORDER BY count(*) DESC

Reference: https://docs.newrelic.com/docs/query-your-data/nrql-new-relic-query-language
"""

from __future__ import annotations

import logging
from typing import Any, Optional
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)


class NRQLQueryBuilder:
    """Helper for building NRQL queries with safe parameterization.
    
    Features:
    - Type-safe parameter substitution
    - Automatic time bound generation
    - Common query pattern helpers
    - Facet and limit support
    """
    
    def __init__(
        self,
        event_type: str,
        app_name: Optional[str] = None,
        environment: Optional[str] = None,
    ) -> None:
        self._event_type = event_type
        self._conditions: list[str] = []
        self._facets: list[str] = []
        self._since: Optional[str] = None
        self._until: Optional[str] = None
        self._limit: Optional[int] = None
        self._order_by: Optional[str] = None
        self._select = "count(*)"
        
        if app_name:
            self.where("appName = %s", app_name)
        if environment:
            self.where("environment = %s", environment)
    
    def select(self, clause: str) -> "NRQLQueryBuilder":
        """Set SELECT clause.
        
        Examples:
            select("count(*)")
            select("avg(duration), percentile(duration, 95)")
            select("uniqueCount(sessionId)")
        """
        self._select = clause
        return self
    
    def where(self, condition: str, *values: Any) -> "NRQLQueryBuilder":
        """Add WHERE condition with parameter escaping.
        
        Examples:
            where("status = %s", "success")
            where("duration > %s", 5.0)
            where("httpStatusCode IN (%s)", [200, 201, 204])
        """
        processed = condition
        for value in values:
            if isinstance(value, str):
                # Escape single quotes
                escaped = value.replace("'", "\\'")
                processed = processed.replace("%s", f"'{escaped}'", 1)
            elif isinstance(value, list):
                # Handle IN clause
                items = ", ".join(
                    f"'{v.replace(':', \"'\").replace(':', \"'\")}" if isinstance(v, str) else str(v)
                    for v in value
                )
                # Actually handle properly:
                escaped_items = []
                for v in value:
                    if isinstance(v, str):
                        escaped_items.append(f"'{v.replace(\"'\", \"\\'\")}'")
                    else:
                        escaped_items.append(str(v))
                processed = processed.replace("%s", ", ".join(escaped_items), 1)
            else:
                processed = processed.replace("%s", str(value), 1)
        
        self._conditions.append(processed)
        return self
    
    def since(self, value: str | timedelta) -> "NRQLQueryBuilder":
        """Set SINCE time bound.
        
        Examples:
            since("1 hour ago")
            since(timedelta(hours=24))
        """
        if isinstance(value, timedelta):
            seconds = int(value.total_seconds())
            if seconds < 60:
                self._since = f"{seconds} seconds ago"
            elif seconds < 3600:
                self._since = f"{seconds // 60} minutes ago"
            else:
                self._since = f"{seconds // 3600} hours ago"
        else:
            self._since = value
        return self
    
    def until(self, value: str | timedelta) -> "NRQLQueryBuilder":
        """Set UNTIL time bound."""
        if isinstance(value, timedelta):
            seconds = int(value.total_seconds())
            if seconds < 60:
                self._until = f"{seconds} seconds ago"
            elif seconds < 3600:
                self._until = f"{seconds // 60} minutes ago"
            else:
                self._until = f"{seconds // 3600} hours ago"
        else:
            self._until = value
        return self
    
    def facet(self, *attributes: str) -> "NRQLQueryBuilder":
        """Add FACET clause for grouping.
        
        Example: facet("serviceName", "hostname")
        """
        self._facets.extend(attributes)
        return self
    
    def limit(self, n: int) -> "NRQLQueryBuilder":
        """Set LIMIT clause. Default max is 1000."""
        self._limit = n
        return self
    
    def order_by(self, clause: str, desc: bool = True) -> "NRQLQueryBuilder":
        """Set ORDER BY clause.
        
        Example: order_by("count(*)", desc=True)
        """
        direction = "DESC" if desc else "ASC"
        self._order_by = f"{clause} {direction}"
        return self
    
    def build(self) -> str:
        """Build the final NRQL query string."""
        parts = [f"SELECT {self._select} FROM {self._event_type}"]
        
        if self._conditions:
            parts.append("WHERE " + " AND ".join(f"({c})" for c in self._conditions))
        
        if self._since:
            parts.append(f"SINCE {self._since}")
        
        if self._until:
            parts.append(f"UNTIL {self._until}")
        
        if self._facets:
            parts.append("FACET " + ", ".join(self._facets))
        
        if self._limit is not None:
            parts.append(f"LIMIT {self._limit}")
        
        if self._order_by:
            parts.append(f"ORDER BY {self._order_by}")
        
        return " ".join(parts)


# Common query patterns

def query_error_rate(
    client: Any,
    app_name: str,
    environment: str,
    since_hours: int = 1,
) -> dict[str, Any]:
    """Query error rate for an application.
    
    Returns:
        Dict with total_events, error_events, error_rate_pct.
    """
    query = NRQLQueryBuilder("Transaction", app_name, environment)
    query.select("count(*) as total, filter(count(*), WHERE error is true) as errors")
    query.since(timedelta(hours=since_hours))
    
    results = client.run_nrql(query.build())
    
    if not results:
        return {"total_events": 0, "error_events": 0, "error_rate_pct": 0.0}
    
    row = results[0]
    total = row.get("total", 0)
    errors = row.get("errors", 0)
    
    return {
        "total_events": total,
        "error_events": errors,
        "error_rate_pct": (errors / total * 100) if total > 0 else 0.0,
    }


def query_latency_percentiles(
    client: Any,
    app_name: str,
    environment: str,
    since_hours: int = 1,
) -> dict[str, float]:
    """Query latency percentiles for an application.
    
    Returns:
        Dict with p50, p95, p99 latency in milliseconds.
    """
    query = NRQLQueryBuilder("Transaction", app_name, environment)
    query.select("percentile(duration, 50, 95, 99)")
    query.since(timedelta(hours=since_hours))
    
    results = client.run_nrql(query.build())
    
    if not results:
        return {"p50": 0.0, "p95": 0.0, "p99": 0.0}
    
    row = results[0]
    
    return {
        "p50": row.get("duration_50", 0.0),
        "p95": row.get("duration_95", 0.0),
        "p99": row.get("duration_99", 0.0),
    }


def query_top_transactions(
    client: Any,
    app_name: str,
    environment: str,
    limit: int = 10,
    since_hours: int = 24,
) -> list[dict[str, Any]]:
    """Query most frequently called transactions.
    
    Returns:
        List of {name, count, avg_duration_ms} dicts.
    """
    query = NRQLQueryBuilder("Transaction", app_name, environment)
    query.select("count(*) as count, average(duration) as avg_duration")
    query.facet("name")
    query.since(timedelta(hours=since_hours))
    query.limit(limit)
    query.order_by("count(*)")
    
    results = client.run_nrql(query.build())
    
    return [
        {
            "name": row.get("name"),
            "count": row.get("count", 0),
            "avg_duration_ms": row.get("avg_duration", 0.0),
        }
        for row in results
    ]
```

---

## Constraints

### MUST DO

- Always use `NEW_RELIC_LICENSE_KEY` and `NEW_RELIC_API_KEY` from environment variables
- Use region-specific endpoints: US (`newrelic.com`) vs EU (`eu.newrelic.com`)
- Batch custom events (100-1000 per call) to reduce HTTP overhead
- Follow camelCase attribute naming convention (New Relic standard)
- Include `eventType` in every custom event (required)
- Add `appName` and `environment` attributes to all telemetry
- Use SINCE/UNTIL time bounds in all NRQL queries
- Validate API connectivity on startup before production traffic
- Implement exponential backoff for 429 rate limit responses
- Include `team.name` attribute for ownership attribution

### MUST NOT DO

- NEVER hardcode license keys or API keys in source code
- NEVER send PII (names, emails, phone numbers) as custom attributes
- NEVER submit events one-by-one in a tight loop (batching required)
- NEVER create NRQL queries without SINCE time bound (full table scans)
- NEVER nest objects deeper than 1 level in custom events
- NEVER use snake_case for attribute names (camelCase is convention)
- NEVER ignore 429 responses (back off, don't hammer the API)
- NEVER store credit card data, credentials, or secrets in event attributes
- NEVER exceed 4096 characters for string attribute values
- NEVER create events without `eventType` (they'll be rejected)

---

## Output Template

When implementing New Relic integrations, produce:

1. **NewRelicConfig Initialization** — Config factory reading from `NEW_RELIC_LICENSE_KEY`, `NEW_RELIC_API_KEY`, `NEW_RELIC_REGION`, `NEW_RELIC_ACCOUNT_ID`
2. **Event Batching** — `NewRelicEventBatcher` with configurable batch size and flush interval
3. **Standard Attribute Set** — Mandatory attributes: `eventType`, `appName`, `environment`, `team.name`
4. **NRQL Query Builder** — Type-safe query construction with parameter escaping
5. **Alert Policy NerdGraph Mutations** — GraphQL mutations for creating policies, conditions, notification channels
6. **Dashboard NerdGraph Mutations** — GraphQL mutations for dashboards with template variables
7. **Rate Limit Handling** — Exponential backoff, `Retry-After` parsing, queued retry

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-datadog-api` | Datadog as alternative monitoring platform |
| `coding-grafana-prometheus` | Open-source monitoring with Prometheus + Grafana |
| `coding-sentry-api` | Error tracking (complementary to New Relic APM) |
| `coding-logging-patterns` | Structured logging patterns for New Relic Logs |
| `coding-pagerduty-api` | On-call management for alert escalation |

---

## Live References

| Resource | URL |
|----------|-----|
| newrelic (PyPI) | https://pypi.org/project/newrelic/ |
| newrelic-telemetry-sdk (PyPI) | https://pypi.org/project/newrelic-telemetry-sdk/ |
| NRQL Reference | https://docs.newrelic.com/docs/query-your-data/nrql-new-relic-query-language/ |
| NerdGraph Explorer | https://api.newrelic.com/graphiql |
| Event API Docs | https://docs.newrelic.com/docs/data-apis/ingest-apis/event-api/ |
| Custom Events Guide | https://docs.newrelic.com/docs/data-apis/ingest-apis/event-api/insert-custom-events/ |
| Alert Policies API | https://docs.newrelic.com/docs/alerts-applied-intelligence/new-relic-alerts/ |
| Dashboard API | https://docs.newrelic.com/docs/apis/nerdgraph/examples/nerdgraph-dashboards-tutorial/ |

---

## 📎 Naming Conventions

### Attribute Names

New Relic convention is camelCase:

| ✅ GOOD | ❌ BAD |
|---------|--------|
| `orderId` | `order_id` |
| `paymentMethod` | `payment_method` |
| `responseTimeMs` | `response_time_ms` |
| `appName` | `app_name` |

### Event Types

Use PascalCase for event types (noun phrases):

- `CheckoutCompleted`
- `UserLoggedIn`
- `ApiRequest`
- `BackgroundJobFailed`

### Querying

When querying with NRQL:

```sql
-- Filter by app and environment (always!)
SELECT count(*) FROM Transaction 
WHERE appName = 'checkout-service' 
  AND environment = 'production'
SINCE 1 hour ago

-- Group by a dimension
SELECT average(duration) FROM Transaction 
WHERE appName = 'checkout-service'
SINCE 24 hours ago
FACET name  -- Group by transaction name
LIMIT 10

-- Calculate error rate
SELECT 
  count(*) as total,
  filter(count(*), WHERE error is true) as errors,
  percentage(count(*), WHERE error is true) as error_rate
FROM Transaction
WHERE appName = 'checkout-service'
SINCE 1 hour ago
```

---

## 📎 Region Awareness

Critical: New Relic has separate US and EU data centers with different endpoints.

| Region | Event API | NerdGraph | License Key Prefix |
|--------|-----------|------------|---------------------|
| US | insights-collector.newrelic.com | api.newrelic.com/graphql | NRAK- |
| EU | insights-collector.eu.newrelic.com | api.eu.newrelic.com/graphql | NRAA- |

Always detect region from `NEW_RELIC_REGION` environment variable. Never hardcode endpoints.
