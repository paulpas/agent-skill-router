---
name: mixpanel-api
description: Implements Mixpanel analytics integration (event tracking, user profiles,
  JQL queries, funnel analysis, cohort export) using mixpanel Python SDK with event
  batching, distinct_id management, engage updates, export API, and ingestion API
  patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: mixpanel, event tracking, user profiles, jql queries, mixpanel funnels,
    cohort analysis, how do i track events in mixpanel, product analytics
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
  related-skills: coding-amplitude-api, coding-segment-api, coding-hubspot-api
------
# Mixpanel Analytics Integration

Implements production-grade Mixpanel analytics integration using the `mixpanel` Python SDK and HTTP APIs. When loaded, this skill makes the model implement event tracking with `distinct_id`, user profile management via Engage API, JQL (JavaScript Query Language) for complex analysis, funnel and retention queries, export API for raw data, and cohort management. All implementations follow Mixpanel best practices: use `MIXPANEL_TOKEN` from environment, batch events for efficiency, always use `distinct_id` for user identification, avoid high-cardinality property values, implement `$ignore_time` for historical imports, and validate API connectivity on startup.

## TL;DR Checklist

- [ ] Use `mixpanel` SDK with `MIXPANEL_TOKEN` from environment variable
- [ ] Always include `distinct_id` in every event and profile update
- [ ] Batch events using `track_batch()` or automatic flush with `Consumer`
- [ ] Use `time` property (Unix seconds) for event timestamping
- [ ] Use Engage API for user profiles: `people_set()`, `people_set_once()`, `people_increment()`
- [ ] Use `$insert_id` for deduplication of retried events
- [ ] Set `$ignore_time: true` when importing historical data
- [ ] Use JQL for complex queries, Export API for raw event export
- [ ] Include `token` in every event payload
- [ ] Never send PII without user consent (Mixpanel has GDPR/CCPA features)

---

## When to Use

Use this skill when:

- Tracking user behavior events for product analytics
- Building and analyzing funnels for conversion optimization
- Running cohort analysis for retention and churn
- Managing user profiles with properties for segmentation
- Exporting raw event data for internal systems
- Building custom dashboards using JQL queries
- Implementing A/B test result analysis
- Setting up behavioral email triggers via integrations
- Importing historical data from other systems
- Tracking revenue and LTV (Customer Lifetime Value)

---

## When NOT to Use

- For Amplitude-specific analytics — use `coding-amplitude-api` instead
- For Segment as a unified tracking layer — use `coding-segment-api` instead
- For error/exception tracking — use `coding-sentry-api` instead
- For server-side logging only — use logging libraries
- For high-volume server-side metrics — consider Segment first
- When you need real-time stream processing (Mixpanel is near-real-time)

---

## Core Workflow

1. **Initialize Client** — Configure Mixpanel client using `MIXPANEL_TOKEN` from environment. Choose consumer type: `Consumer` (direct HTTP), `BufferedConsumer` (batching), `AsyncConsumer` (async). **Checkpoint:** Validate with `track()` test event or `people_set()` test update.

2. **Define Identity Strategy** — Choose between:
   - `distinct_id`: Primary user identifier (use your internal user ID for logged-in users)
   - `$device_id`: Anonymous identifier for logged-out users
   - `alias()`: Link anonymous `$device_id` to authenticated `distinct_id` at signup/login
   
   **Checkpoint:** Every event has exactly one `distinct_id` (never both `anonymous_id` and `user_id`).

3. **Implement Event Tracking** — Track events with `track()` method. Include `event` name, `properties` dict, `time` (Unix seconds). Use `properties["distinct_id"]` or pass as separate parameter. **Checkpoint:** Events have `token`, `distinct_id`, `event`, and `properties` fields.

4. **Manage User Profiles** — Use Engage API to update user profiles:
   - `people_set()`: Update properties (overwrites)
   - `people_set_once()`: Set only if not already set (signup date, initial source)
   - `people_increment()`: Increment numeric properties (login count, total spend)
   - `people_append()`: Add to list properties
   - `people_unset()`: Remove properties
   
   **Checkpoint:** User profile operations use same `distinct_id` as event tracking.

5. **Query & Export Data** — Use appropriate API for data retrieval:
   - JQL API: Complex analysis with JavaScript-like query language
   - Export API: Bulk export of raw events
   - Funnels API: Funnel analysis
   - Retention API: Retention analysis
   - Cohort API: Cohort export
   
   **Checkpoint:** Queries include `from_date` and `to_date` for time bounds.

6. **Handle Aliasing & Identity Merging** — Call `alias()` when anonymous user signs up or logs in. This links the pre-login behavior (`$device_id`) to the post-login user identity (`distinct_id`). **Checkpoint:** `alias()` called exactly once per user at signup/login.

---

## Implementation Patterns

### Pattern 1: Mixpanel Client Initialization (BAD vs GOOD)

```python
"""Mixpanel client initialization patterns.

Key concepts:
- Project Token: Public token (not secret), used for tracking
- API Secret: Secret key for query/export APIs (keep secret)
- Service Account: For server-to-server API access (recommended for exports)

Consumer types:
- Consumer: Direct HTTP call per track (simple but slow)
- BufferedConsumer: Batch events (better performance)
- AsyncConsumer: Async with threads (for high volume)
- CeleryConsumer: For Celery workers

Endpoints:
- Standard: https://api.mixpanel.com
- EU: https://api-eu.mixpanel.com (for EU data residency)
"""

from __future__ import annotations

import os
import json
import time
import logging
import threading
from typing import Any, Optional, Literal
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from collections import deque
from uuid import uuid4

import requests

logger = logging.getLogger(__name__)

ServerRegion = Literal["US", "EU"]


# ===================================================================
# ❌ BAD — hardcoded token, no batching, missing distinct_id
# ===================================================================

def bad_mixpanel_init_bad() -> None:
    """❌ BAD: Don't do any of these things."""
    
    # ❌ Hardcoded token!
    token = "abcdef1234567890abcdef1234567890"
    
    # ❌ Using direct HTTP per event (no batching)
    # ❌ No distinct_id (required!)
    # ❌ Generic event name
    # ❌ No timestamp (events get ingest time)
    event = {
        "event": "click",  # ❌ Too generic
        "properties": {
            "token": token,
            # ❌ Missing distinct_id!
            "button": "signup",
        },
    }


# ===================================================================
# ✅ GOOD — env-based config, batching, proper identification
# ===================================================================


class MixpanelError(Exception):
    """Base exception for Mixpanel client errors."""
    pass


class MixpanelAuthError(MixpanelError):
    """Token/secret is invalid or missing."""
    pass


class MixpanelRateLimitError(MixpanelError):
    """Rate limit exceeded."""
    
    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


@dataclass
class MixpanelConfig:
    """Mixpanel configuration from environment variables.
    
    Environment variables:
        MIXPANEL_TOKEN: Project token (required for tracking)
        MIXPANEL_API_SECRET: API secret (for query APIs)
        MIXPANEL_SERVICE_ACCOUNT_USERNAME: Service account username
        MIXPANEL_SERVICE_ACCOUNT_SECRET: Service account secret
        MIXPANEL_REGION: US or EU (for data residency)
        MIXPANEL_FLUSH_INTERVAL: Auto-flush interval in seconds
        MIXPANEL_BATCH_SIZE: Events per batch
    """
    
    # Tracking (public token)
    token: Optional[str] = None
    
    # Query/Export (secret keys)
    api_secret: Optional[str] = None
    service_account_username: Optional[str] = None
    service_account_secret: Optional[str] = None
    
    # Server config
    region: ServerRegion = "US"
    
    # Batching config
    flush_interval_seconds: float = 10.0
    batch_size: int = 50
    max_retries: int = 3
    initial_retry_delay: float = 1.0
    
    # HTTP config
    timeout: float = 10.0
    
    # Endpoints
    _US_ENDPOINTS = {
        "track": "https://api.mixpanel.com/track",
        "engage": "https://api.mixpanel.com/engage",
        "import": "https://api.mixpanel.com/import",
        "export": "https://data.mixpanel.com/api/2.0/export",
        "jql": "https://mixpanel.com/api/2.0/jql",
        "funnels": "https://mixpanel.com/api/2.0/funnels",
        "retention": "https://mixpanel.com/api/2.0/retention",
    }
    
    _EU_ENDPOINTS = {
        "track": "https://api-eu.mixpanel.com/track",
        "engage": "https://api-eu.mixpanel.com/engage",
        "import": "https://api-eu.mixpanel.com/import",
        "export": "https://data-eu.mixpanel.com/api/2.0/export",
        "jql": "https://eu.mixpanel.com/api/2.0/jql",
        "funnels": "https://eu.mixpanel.com/api/2.0/funnels",
        "retention": "https://eu.mixpanel.com/api/2.0/retention",
    }
    
    @classmethod
    def from_env(cls) -> "MixpanelConfig":
        """Load configuration from environment variables."""
        
        # Parse region
        region_str = os.environ.get("MIXPANEL_REGION", "US").upper()
        region: ServerRegion = "EU" if region_str == "EU" else "US"
        
        # Parse numeric values
        def parse_int(env_var: str, default: int) -> int:
            val = os.environ.get(env_var)
            if val is None:
                return default
            try:
                return int(val)
            except ValueError:
                return default
        
        def parse_float(env_var: str, default: float) -> float:
            val = os.environ.get(env_var)
            if val is None:
                return default
            try:
                return float(val)
            except ValueError:
                return default
        
        return cls(
            token=os.environ.get("MIXPANEL_TOKEN"),
            api_secret=os.environ.get("MIXPANEL_API_SECRET"),
            service_account_username=os.environ.get("MIXPANEL_SERVICE_ACCOUNT_USERNAME"),
            service_account_secret=os.environ.get("MIXPANEL_SERVICE_ACCOUNT_SECRET"),
            region=region,
            flush_interval_seconds=parse_float("MIXPANEL_FLUSH_INTERVAL", 10.0),
            batch_size=parse_int("MIXPANEL_BATCH_SIZE", 50),
            timeout=parse_float("MIXPANEL_TIMEOUT", 10.0),
        )
    
    def get_endpoint(self, name: str) -> str:
        """Get endpoint for current region.
        
        Args:
            name: Endpoint name: track, engage, import, export, jql, funnels, retention
        
        Returns:
            Full URL
        """
        endpoints = self._EU_ENDPOINTS if self.region == "EU" else self._US_ENDPOINTS
        
        if name not in endpoints:
            raise ValueError(f"Unknown endpoint: {name}")
        
        return endpoints[name]
    
    def is_enabled(self) -> bool:
        """Check if Mixpanel should be enabled."""
        if not self.token:
            return False
        
        # Check for explicit disable
        if os.environ.get("MIXPANEL_DISABLED") == "1":
            return False
        
        # Disable in test environment unless explicitly enabled
        env = os.environ.get("ENV", "").lower()
        if env in ("test", "testing", "local"):
            if os.environ.get("MIXPANEL_FORCE_ENABLE") != "1":
                return False
        
        return True
    
    def validate(self) -> bool:
        """Validate configuration.
        
        Returns:
            True if valid
            
        Raises:
            ValueError: If invalid
        """
        if not self.is_enabled():
            logger.info("Mixpanel disabled by configuration")
            return True
        
        if not self.token:
            raise ValueError("MIXPANEL_TOKEN is required when enabled")
        
        # Batch size limits
        if self.batch_size < 1 or self.batch_size > 2000:
            raise ValueError(f"batch_size must be 1-2000, got {self.batch_size}")
        
        return True


class MixpanelEventBuilder:
    """Builder for creating properly formatted Mixpanel events.
    
    Ensures consistent structure and naming conventions.
    """
    
    def __init__(self, token: str) -> None:
        self._token = token
    
    @staticmethod
    def current_time_seconds() -> int:
        """Get current time in seconds since epoch (Unix time).
        
        Mixpanel uses seconds, not milliseconds!
        """
        return int(datetime.now(timezone.utc).timestamp())
    
    @staticmethod
    def generate_insert_id() -> str:
        """Generate a unique insert ID for deduplication.
        
        Use when retrying events to prevent duplicates.
        Mixpanel uses $insert_id as a deduplication key.
        """
        return str(uuid4())
    
    def build_event(
        self,
        event_name: str,
        distinct_id: str,
        properties: Optional[dict[str, Any]] = None,
        time: Optional[int] = None,
        insert_id: Optional[str] = None,
        ignore_time: bool = False,
    ) -> dict[str, Any]:
        """Build a properly formatted Mixpanel event.
        
        Mixpanel event structure:
        {
            "event": "EventName",
            "properties": {
                "token": "...",
                "distinct_id": "...",
                "time": 1234567890,  // Unix seconds
                "$insert_id": "uuid",  // Optional for dedup
                // custom properties...
            }
        }
        
        Note: Time is in SECONDS, not milliseconds!
        
        Args:
            event_name: Event name (Use Title Case: "User Signed Up", "Checkout Completed")
            distinct_id: User identifier (required)
            properties: Additional event properties
            time: Unix timestamp in SECONDS
            insert_id: Unique ID for deduplication
            ignore_time: If True, use $ignore_time for historical imports
        
        Returns:
            Event dict ready for Mixpanel API
        """
        # Validate required fields
        if not event_name:
            raise ValueError("event_name is required")
        
        if not distinct_id:
            raise ValueError("distinct_id is required")
        
        # Build properties
        event_properties: dict[str, Any] = {
            "token": self._token,
            "distinct_id": str(distinct_id),
        }
        
        # Timestamp (seconds since epoch)
        if time is not None:
            event_properties["time"] = int(time)
        else:
            event_properties["time"] = self.current_time_seconds()
        
        # Insert ID for deduplication
        if insert_id:
            event_properties["$insert_id"] = insert_id
        
        # Ignore time (for historical imports)
        if ignore_time:
            event_properties["$ignore_time"] = True
        
        # Add custom properties
        if properties:
            for key, value in properties.items():
                # Skip reserved properties
                if key in ("token", "distinct_id", "time", "$insert_id", "$ignore_time"):
                    logger.warning("Skipping reserved property: %s", key)
                    continue
                event_properties[key] = self._sanitize_value(value)
        
        event: dict[str, Any] = {
            "event": event_name,
            "properties": event_properties,
        }
        
        return event
    
    def _sanitize_value(self, value: Any) -> Any:
        """Sanitize property value for Mixpanel.
        
        Mixpanel supports: string, number, boolean, list, None
        Nested objects are converted to JSON strings or skipped.
        """
        if isinstance(value, (str, int, float, bool, type(None))):
            return value
        elif isinstance(value, list):
            # Lists are OK, but sanitize each item
            return [self._sanitize_value(v) for v in value]
        elif isinstance(value, dict):
            # Nested objects not recommended - stringify small ones
            json_str = json.dumps(value)
            if len(json_str) < 500:
                return json_str
            return "[object]"  # Too large
        else:
            # Convert to string representation
            return str(value)


class MixpanelPeopleBuilder:
    """Builder for user profile (Engage) operations.
    
    Mixpanel user property special operations:
    - $set: Set/update properties
    - $set_once: Set only if not already set
    - $add: Increment numeric properties
    - $append: Add value to list
    - $union: Add unique values to list
    - $unset: Remove properties
    """
    
    def __init__(self) -> None:
        self._operations: dict[str, dict[str, Any]] = {}
    
    def set(self, key: str, value: Any) -> "MixpanelPeopleBuilder":
        """Set or update a user property.
        
        Args:
            key: Property name
            value: Property value
        """
        if "$set" not in self._operations:
            self._operations["$set"] = {}
        self._operations["$set"][key] = value
        return self
    
    def set_once(self, key: str, value: Any) -> "MixpanelPeopleBuilder":
        """Set a property only if not already set.
        
        Use for first-touch properties: signup date, initial source, etc.
        """
        if "$set_once" not in self._operations:
            self._operations["$set_once"] = {}
        self._operations["$set_once"][key] = value
        return self
    
    def add(self, key: str, value: int | float) -> "MixpanelPeopleBuilder":
        """Increment a numeric property.
        
        Args:
            key: Property name
            value: Amount to add (can be negative)
        """
        if "$add" not in self._operations:
            self._operations["$add"] = {}
        self._operations["$add"][key] = value
        return self
    
    def append(self, key: str, value: Any) -> "MixpanelPeopleBuilder":
        """Append a value to a list property.
        
        Use for: viewedProducts, purchasedCategories, etc.
        """
        if "$append" not in self._operations:
            self._operations["$append"] = {}
        self._operations["$append"][key] = value
        return self
    
    def union(self, key: str, values: list[Any]) -> "MixpanelPeopleBuilder":
        """Add unique values to a list property.
        
        Like append, but duplicates are ignored.
        """
        if "$union" not in self._operations:
            self._operations["$union"] = {}
        self._operations["$union"][key] = values
        return self
    
    def unset(self, key: str) -> "MixpanelPeopleBuilder":
        """Remove a property.
        
        Use list of property names for $unset.
        """
        if "$unset" not in self._operations:
            self._operations["$unset"] = []
        self._operations["$unset"].append(key)
        return self
    
    def build(self) -> dict[str, Any]:
        """Build the operations dict."""
        return dict(self._operations)
    
    def is_empty(self) -> bool:
        """Check if any operations have been added."""
        return len(self._operations) == 0


class MixpanelClient:
    """Production-grade Mixpanel client with batching and retries.
    
    Features:
    - Event batching with automatic flush
    - Exponential backoff retries
    - $insert_id deduplication
    - Engage API (user profiles)
    - Alias API (identity linking)
    - Basic query support
    """
    
    def __init__(self, config: MixpanelConfig) -> None:
        self._config = config
        self._event_builder = MixpanelEventBuilder(config.token or "")
        
        self._event_buffer: deque[dict[str, Any]] = deque()
        self._lock = threading.Lock()
        self._flush_thread: Optional[threading.Thread] = None
        self._running = False
        self._session = requests.Session()
        
        # Statistics
        self._total_tracked: int = 0
        self._total_sent: int = 0
        self._total_failed: int = 0
    
    def start(self) -> None:
        """Start the background flush thread."""
        if self._running:
            return
        
        if not self._config.is_enabled():
            logger.info("Mixpanel disabled, not starting flush thread")
            return
        
        self._running = True
        self._flush_thread = threading.Thread(
            target=self._flush_loop,
            daemon=True,
            name="mixpanel-flusher",
        )
        self._flush_thread.start()
        
        logger.info(
            "Mixpanel client started: region=%s, flush_interval=%.1fs, batch_size=%d",
            self._config.region,
            self._config.flush_interval_seconds,
            self._config.batch_size,
        )
    
    def stop(self) -> None:
        """Stop the background thread and flush remaining events."""
        self._running = False
        
        if self._flush_thread:
            self._flush_thread.join(timeout=5.0)
            self._flush_thread = None
        
        # Final flush
        self.flush()
    
    def _flush_loop(self) -> None:
        """Background flush thread loop."""
        while self._running:
            time.sleep(self._config.flush_interval_seconds)
            try:
                self.flush()
            except Exception:
                logger.exception("Mixpanel background flush failed")
    
    def _calculate_delay(self, attempt: int) -> float:
        """Calculate exponential backoff with jitter."""
        import random
        delay = self._config.initial_retry_delay * (2 ** attempt)
        jitter = 1.0 + random.uniform(-0.2, 0.2)
        return min(delay * jitter, 30.0)  # Max 30s
    
    def _get_auth_for_query(self) -> Optional[tuple[str, str]]:
        """Get authentication tuple for query/export APIs.
        
        Priority:
        1. Service Account (username:secret)
        2. API Secret (secret:blank)
        
        Returns:
            (username, password) tuple for HTTP Basic Auth
        """
        if self._config.service_account_username and self._config.service_account_secret:
            return (self._config.service_account_username, self._config.service_account_secret)
        elif self._config.api_secret:
            return (self._config.api_secret, "")
        return None
    
    def _send_track_batch(self, events: list[dict[str, Any]]) -> bool:
        """Send a batch of events to Mixpanel /track endpoint.
        
        Args:
            events: List of event dicts
        
        Returns:
            True if successful
        """
        if not events:
            return True
        
        url = self._config.get_endpoint("track")
        
        # /track endpoint accepts form data with 'data' parameter
        # containing base64-encoded JSON, or plain JSON
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "text/plain",
        }
        
        # For batch, we can send JSON array directly
        payload = events
        
        for attempt in range(self._config.max_retries):
            try:
                response = self._session.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=self._config.timeout,
                )
                
                # Mixpanel /track returns 1 for success, 0 for error
                response_text = response.text.strip()
                
                if response.status_code == 200 and response_text == "1":
                    logger.debug("Mixpanel: Sent %d events successfully", len(events))
                    return True
                
                elif response.status_code == 400:
                    logger.error("Mixpanel: Invalid request (400): %s", response.text[:200])
                    return False
                
                elif response.status_code == 429:
                    if attempt < self._config.max_retries - 1:
                        delay = self._calculate_delay(attempt)
                        logger.warning("Mixpanel rate limited (429), retrying in %.1fs", delay)
                        time.sleep(delay)
                        continue
                    else:
                        raise MixpanelRateLimitError(
                            f"Mixpanel rate limit exceeded after {self._config.max_retries} retries"
                        )
                
                else:
                    logger.error("Mixpanel error %d: %s", response.status_code, response.text[:200])
                    if attempt < self._config.max_retries - 1:
                        delay = self._calculate_delay(attempt)
                        time.sleep(delay)
                        continue
                    return False
                
            except requests.RequestException as e:
                logger.warning("Mixpanel network error: %s", e)
                if attempt < self._config.max_retries - 1:
                    delay = self._calculate_delay(attempt)
                    time.sleep(delay)
                    continue
                return False
        
        return False
    
    def track(
        self,
        event_name: str,
        distinct_id: str,
        properties: Optional[dict[str, Any]] = None,
        time: Optional[int] = None,
        insert_id: Optional[str] = None,
        ignore_time: bool = False,
        **kwargs: Any,
    ) -> Optional[str]:
        """Track an event.
        
        Args:
            event_name: Event name (Title Case: "User Signed Up")
            distinct_id: User identifier
            properties: Additional event properties
            time: Unix timestamp in SECONDS
            insert_id: Unique ID for deduplication
            ignore_time: For historical imports
            **kwargs: Additional fields
        
        Returns:
            Insert ID if tracked, None if disabled
        """
        if not self._config.is_enabled():
            return None
        
        try:
            event = self._event_builder.build_event(
                event_name=event_name,
                distinct_id=distinct_id,
                properties=properties,
                time=time,
                insert_id=insert_id or self._event_builder.generate_insert_id(),
                ignore_time=ignore_time,
            )
            
            actual_insert_id = event["properties"].get("$insert_id")
            
            with self._lock:
                self._event_buffer.append(event)
                self._total_tracked += 1
                
                # Auto-flush if buffer reaches batch size
                if len(self._event_buffer) >= self._config.batch_size:
                    self._flush_locked()
            
            return actual_insert_id
            
        except Exception as e:
            logger.warning("Mixpanel track failed: %s", e)
            return None
    
    def engage(
        self,
        distinct_id: str,
        builder: Optional[MixpanelPeopleBuilder] = None,
        **operations: dict[str, Any],
    ) -> bool:
        """Update user profile via Engage API.
        
        Can use either:
        1. MixpanelPeopleBuilder for type-safe operations
        2. Direct operation dicts: $set, $set_once, $add, etc.
        
        Args:
            distinct_id: User identifier
            builder: Builder with operations
            **operations: Direct operations like $set={"key": "value"}
        
        Returns:
            True if successful
        """
        if not self._config.is_enabled():
            return False
        
        # Build operations
        if builder and not builder.is_empty():
            user_properties = builder.build()
        elif operations:
            user_properties = dict(operations)
        else:
            logger.warning("Mixpanel engage called with no operations")
            return False
        
        # Build engage payload
        # $distinct_id, $token, and operations
        payload: dict[str, Any] = {
            "$token": self._config.token,
            "$distinct_id": str(distinct_id),
        }
        
        # Add all operations
        for op_key, op_value in user_properties.items():
            payload[op_key] = op_value
        
        url = self._config.get_endpoint("engage")
        
        try:
            response = self._session.post(
                url,
                headers={"Content-Type": "application/json"},
                json=[payload],  # Engage accepts array
                timeout=self._config.timeout,
            )
            
            if response.status_code == 200 and response.text.strip() == "1":
                logger.debug("Mixpanel engage succeeded for distinct_id=%s", distinct_id)
                return True
            else:
                logger.warning("Mixpanel engage failed: %d %s", response.status_code, response.text[:100])
                return False
                
        except Exception as e:
            logger.warning("Mixpanel engage error: %s", e)
            return False
    
    def alias(
        self,
        alias_id: str,
        original_id: str,
    ) -> bool:
        """Link two user identities (alias API).
        
        Call this when an anonymous user signs up or logs in.
        Links their pre-login behavior ($device_id) to their user ID.
        
        Args:
            alias_id: The new identifier (your internal user ID)
            original_id: The existing identifier ($device_id or previous distinct_id)
        
        Returns:
            True if successful
        """
        if not self._config.is_enabled():
            return False
        
        # Alias is done via /track with special event
        # Or via dedicated API
        
        # Method 1: Track a $create_alias event
        event = self._event_builder.build_event(
            event_name="$create_alias",
            distinct_id=alias_id,  # The new ID
            properties={
                "alias": alias_id,
                "distinct_id": original_id,  # The old ID
            },
        )
        
        # Override distinct_id in properties for alias
        event["properties"]["distinct_id"] = original_id
        
        url = self._config.get_endpoint("track")
        
        try:
            response = self._session.post(
                url,
                headers={"Content-Type": "application/json"},
                json=[event],
                timeout=self._config.timeout,
            )
            
            if response.status_code == 200 and response.text.strip() == "1":
                logger.info("Mixpanel alias created: %s -> %s", original_id, alias_id)
                return True
            else:
                logger.warning("Mixpanel alias failed: %d %s", response.status_code, response.text[:100])
                return False
                
        except Exception as e:
            logger.warning("Mixpanel alias error: %s", e)
            return False
    
    def flush(self) -> int:
        """Flush all buffered events to Mixpanel.
        
        Returns:
            Number of events sent
        """
        with self._lock:
            return self._flush_locked()
    
    def _flush_locked(self) -> int:
        """Flush buffer (must hold lock)."""
        if not self._event_buffer:
            return 0
        
        events = list(self._event_buffer)
        self._event_buffer.clear()
        
        try:
            success = self._send_track_batch(events)
            
            if success:
                self._total_sent += len(events)
                logger.debug("Mixpanel: Flushed %d events", len(events))
                return len(events)
            else:
                # Put back for later retry
                self._event_buffer.extendleft(reversed(events))
                self._total_failed += len(events)
                return 0
                
        except Exception as e:
            self._event_buffer.extendleft(reversed(events))
            self._total_failed += len(events)
            logger.warning("Mixpanel flush failed: %s", e)
            return 0
    
    def get_stats(self) -> dict[str, int]:
        """Get client statistics."""
        with self._lock:
            return {
                "buffered": len(self._event_buffer),
                "total_tracked": self._total_tracked,
                "total_sent": self._total_sent,
                "total_failed": self._total_failed,
            }


# Global client (lazy-loaded)
_global_client: Optional[MixpanelClient] = None


def get_mixpanel_client() -> MixpanelClient:
    """Get or create global MixpanelClient."""
    global _global_client
    if _global_client is None:
        config = MixpanelConfig.from_env()
        _global_client = MixpanelClient(config)
        if config.is_enabled():
            _global_client.start()
    return _global_client
```

### Pattern 2: Standard Events & Identity Management

```python
"""Standard event tracking patterns and identity management.

Mixpanel identity best practices:

1. Logged-out users:
   - Use $device_id (UUID) for anonymous tracking
   - Store $device_id in cookie/localStorage
   - Set distinct_id = $device_id

2. At signup/login:
   - Call alias(your_user_id, $device_id)
   - This links pre-login behavior to user

3. Logged-in users:
   - Set distinct_id = your internal user ID
   - Update user profile with people_set/people_set_once

4. At logout:
   - Generate new $device_id
   - distinct_id = new $device_id

Never mix anonymous_id and user_id in distinct_id without aliasing!
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Optional
from dataclasses import dataclass
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class IdentityManager:
    """Manages user identity for Mixpanel tracking.
    
    Handles:
    - Anonymous device ID generation and persistence
    - User ID at login
    - Alias at signup/login
    - Profile updates
    """
    
    def __init__(self, client: Any) -> None:
        self._client = client
        self._distinct_id: Optional[str] = None
        self._user_id: Optional[str] = None
        self._device_id: Optional[str] = None
        self._is_aliased: bool = False
    
    def generate_device_id(self) -> str:
        """Generate a new anonymous device ID.
        
        Call at first visit, or after logout.
        
        Returns:
            UUID string for anonymous tracking
        """
        self._device_id = str(uuid.uuid4())
        self._distinct_id = self._device_id
        self._user_id = None
        self._is_aliased = False
        logger.info("Generated new Mixpanel device_id: %s", self._device_id)
        return self._device_id
    
    def set_device_id(self, device_id: str) -> None:
        """Set existing device ID (from cookie/storage)."""
        self._device_id = device_id
        if not self._user_id:
            self._distinct_id = device_id
    
    def login(
        self,
        user_id: str,
        user_properties: Optional[dict[str, Any]] = None,
        perform_alias: bool = True,
    ) -> None:
        """Handle user login.
        
        1. If anonymous user and first login: alias(device_id, user_id)
        2. Set distinct_id = user_id
        3. Update user profile
        
        Args:
            user_id: Your internal user identifier
            user_properties: Properties to set on profile
            perform_alias: Whether to call alias() (use False if already done at signup)
        """
        previous_distinct_id = self._distinct_id
        self._user_id = user_id
        self._distinct_id = user_id
        
        # Call alias if we were previously anonymous and haven't aliased yet
        if (
            perform_alias
            and not self._is_aliased
            and self._device_id
            and previous_distinct_id == self._device_id
        ):
            # Link the anonymous device_id to the new user_id
            # In Mixpanel alias:
            #   alias_id = new identifier (user_id)
            #   original_id = existing identifier (device_id)
            self._client.alias(alias_id=user_id, original_id=self._device_id)
            self._is_aliased = True
            logger.info("Aliased device_id=%s to user_id=%s", self._device_id, user_id)
        
        # Update user profile
        builder = MixpanelPeopleBuilder()
        
        # First-touch properties (set_once)
        builder.set_once("firstLoginDate", datetime.now(timezone.utc).isoformat())
        
        # Current properties (set)
        builder.set("lastLoginDate", datetime.now(timezone.utc).isoformat())
        builder.set("isLoggedIn", True)
        
        # Additional properties
        if user_properties:
            for key, value in user_properties.items():
                builder.set(key, value)
        
        # Increment login count
        builder.add("loginCount", 1)
        
        self._client.engage(distinct_id=user_id, builder=builder)
    
    def signup(
        self,
        user_id: str,
        signup_method: str,
        user_properties: Optional[dict[str, Any]] = None,
    ) -> None:
        """Handle user signup.
        
        Similar to login but with signup-specific properties.
        Always calls alias() at signup.
        
        Args:
            user_id: Your internal user identifier
            signup_method: How user signed up (email, google, github, etc.)
            user_properties: Additional properties
        """
        # Build signup properties
        props = dict(user_properties or {})
        props["signupMethod"] = signup_method
        props["signupDate"] = datetime.now(timezone.utc).isoformat()
        
        # First-touch properties via set_once
        builder = MixpanelPeopleBuilder()
        builder.set_once("initialSignupMethod", signup_method)
        builder.set_once("signupDate", datetime.now(timezone.utc).isoformat())
        builder.set_once("signUpCount", 1)
        
        # Set properties
        builder.set("signupMethod", signup_method)
        builder.set("isLoggedIn", True)
        builder.set("lastLoginDate", datetime.now(timezone.utc).isoformat())
        
        # Additional properties
        if user_properties:
            for key, value in user_properties.items():
                builder.set(key, value)
        
        # Perform login WITH alias
        self._user_id = user_id
        previous_distinct_id = self._distinct_id
        
        # Call alias if coming from anonymous
        if self._device_id and previous_distinct_id == self._device_id:
            self._client.alias(alias_id=user_id, original_id=self._device_id)
            self._is_aliased = True
        
        self._distinct_id = user_id
        
        # Update profile
        self._client.engage(distinct_id=user_id, builder=builder)
    
    def logout(self) -> None:
        """Handle user logout.
        
        1. Update user profile (isLoggedIn = false)
        2. Generate new device_id for anonymous tracking
        """
        if self._user_id:
            # Update last known state
            self._client.engage(
                distinct_id=self._user_id,
                **{"$set": {
                    "isLoggedIn": False,
                    "lastLogoutDate": datetime.now(timezone.utc).isoformat(),
                }}
            )
        
        # Generate new anonymous identity
        self.generate_device_id()
    
    @property
    def distinct_id(self) -> Optional[str]:
        """Get current distinct_id for tracking."""
        return self._distinct_id


class StandardEvents:
    """Standard event types with consistent property schemas.
    
    Mixpanel naming conventions vary by team, but common patterns:
    
    Event Names: Often "Title Case with Spaces" or "TitleCaseNoSpaces"
    Properties: camelCase
    
    This implementation uses "Title Case" for event names as it's readable.
    """
    
    @staticmethod
    def track_user_signed_up(
        client: Any,
        distinct_id: str,
        signup_method: str,
        referral_code: Optional[str] = None,
        is_first_purchase: bool = False,
        **properties: Any,
    ) -> Optional[str]:
        """Track User Signed Up event.
        
        Event Name: "User Signed Up"
        """
        event_properties: dict[str, Any] = {
            "signupMethod": signup_method,
            "isFirstPurchase": is_first_purchase,
        }
        
        if referral_code:
            event_properties["referralCode"] = referral_code
        
        event_properties.update(properties)
        
        return client.track(
            event_name="User Signed Up",
            distinct_id=distinct_id,
            properties=event_properties,
        )
    
    @staticmethod
    def track_user_logged_in(
        client: Any,
        distinct_id: str,
        login_method: str,
        is_new_device: bool = False,
        **properties: Any,
    ) -> Optional[str]:
        """Track User Logged In event.
        
        Event Name: "User Logged In"
        """
        event_properties: dict[str, Any] = {
            "loginMethod": login_method,
            "isNewDevice": is_new_device,
        }
        event_properties.update(properties)
        
        return client.track(
            event_name="User Logged In",
            distinct_id=distinct_id,
            properties=event_properties,
        )
    
    @staticmethod
    def track_product_viewed(
        client: Any,
        distinct_id: str,
        product_id: str,
        product_name: str,
        product_category: str,
        price: float,
        currency: str = "USD",
        is_organic: bool = True,
        campaign_source: Optional[str] = None,
        **properties: Any,
    ) -> Optional[str]:
        """Track Product Viewed event.
        
        Event Name: "Product Viewed"
        """
        event_properties: dict[str, Any] = {
            "productId": product_id,
            "productName": product_name,
            "productCategory": product_category,
            "price": price,
            "currency": currency,
            "isOrganic": is_organic,
        }
        
        if campaign_source:
            event_properties["campaignSource"] = campaign_source
        
        event_properties.update(properties)
        
        return client.track(
            event_name="Product Viewed",
            distinct_id=distinct_id,
            properties=event_properties,
        )
    
    @staticmethod
    def track_checkout_started(
        client: Any,
        distinct_id: str,
        cart_value: float,
        item_count: int,
        currency: str = "USD",
        coupon_code: Optional[str] = None,
        **properties: Any,
    ) -> Optional[str]:
        """Track Checkout Started event.
        
        Event Name: "Checkout Started"
        
        Use with "Checkout Completed" for funnel analysis.
        """
        event_properties: dict[str, Any] = {
            "cartValue": cart_value,
            "itemCount": item_count,
            "currency": currency,
        }
        
        if coupon_code:
            event_properties["couponCode"] = coupon_code
        
        event_properties.update(properties)
        
        return client.track(
            event_name="Checkout Started",
            distinct_id=distinct_id,
            properties=event_properties,
        )
    
    @staticmethod
    def track_checkout_completed(
        client: Any,
        distinct_id: str,
        order_id: str,
        total_value: float,
        item_count: int,
        currency: str = "USD",
        payment_method: str = "card",
        coupon_code: Optional[str] = None,
        discount_amount: float = 0.0,
        **properties: Any,
    ) -> Optional[str]:
        """Track Checkout Completed event.
        
        Event Name: "Checkout Completed"
        
        Critical for funnel conversion and revenue analytics.
        Also updates user profile with LTV properties.
        """
        event_properties: dict[str, Any] = {
            "orderId": order_id,
            "totalValue": total_value,
            "itemCount": item_count,
            "currency": currency,
            "paymentMethod": payment_method,
            "discountAmount": discount_amount,
        }
        
        if coupon_code:
            event_properties["couponCode"] = coupon_code
        
        event_properties.update(properties)
        
        # Track event
        insert_id = client.track(
            event_name="Checkout Completed",
            distinct_id=distinct_id,
            properties=event_properties,
        )
        
        # Update user profile for LTV
        builder = MixpanelPeopleBuilder()
        builder.add("totalSpend", total_value)
        builder.add("orderCount", 1)
        builder.set("lastPurchaseDate", datetime.now(timezone.utc).isoformat())
        builder.set("lastOrderValue", total_value)
        
        # First purchase
        builder.set_once("firstPurchaseDate", datetime.now(timezone.utc).isoformat())
        builder.set_once("customerType", "paid")
        
        client.engage(distinct_id=distinct_id, builder=builder)
        
        return insert_id
    
    @staticmethod
    def track_feature_used(
        client: Any,
        distinct_id: str,
        feature_name: str,
        feature_module: str,
        usage_duration_seconds: Optional[int] = None,
        is_successful: bool = True,
        error_type: Optional[str] = None,
        **properties: Any,
    ) -> Optional[str]:
        """Track Feature Used event.
        
        Event Name: "Feature Used"
        
        For adoption analysis.
        """
        event_properties: dict[str, Any] = {
            "featureName": feature_name,
            "featureModule": feature_module,
            "isSuccessful": is_successful,
        }
        
        if usage_duration_seconds is not None:
            event_properties["usageDurationSeconds"] = usage_duration_seconds
        
        if error_type:
            event_properties["errorType"] = error_type
        
        event_properties.update(properties)
        
        # Track event
        insert_id = client.track(
            event_name="Feature Used",
            distinct_id=distinct_id,
            properties=event_properties,
        )
        
        # Update feature usage properties
        builder = MixpanelPeopleBuilder()
        builder.set(f"lastUsed_{feature_name}", datetime.now(timezone.utc).isoformat())
        builder.add(f"usageCount_{feature_name}", 1)
        
        client.engage(distinct_id=distinct_id, builder=builder)
        
        return insert_id


# Example complete user journey

def example_user_journey(client: Any) -> None:
    """Example of a complete user journey with proper identity management."""
    
    # 1. Anonymous user visits site
    identity = IdentityManager(client)
    device_id = identity.generate_device_id()
    
    # Anonymous views product
    StandardEvents.track_product_viewed(
        client=client,
        distinct_id=identity.distinct_id,
        product_id="prod-premium",
        product_name="Premium Subscription",
        product_category="Subscriptions",
        price=99.99,
    )
    
    # 2. User signs up
    user_id = "user-abc123"
    
    # Alias is called during signup
    identity.signup(
        user_id=user_id,
        signup_method="email",
        user_properties={
            "emailDomain": "example.com",
            "marketingOptIn": True,
        }
    )
    
    # 3. User starts checkout
    StandardEvents.track_checkout_started(
        client=client,
        distinct_id=identity.distinct_id,
        cart_value=99.99,
        item_count=1,
    )
    
    # 4. User completes checkout
    StandardEvents.track_checkout_completed(
        client=client,
        distinct_id=identity.distinct_id,
        order_id="order-xyz789",
        total_value=99.99,
        item_count=1,
        payment_method="credit_card",
    )
    
    # 5. User logs out later
    identity.logout()
    
    # Flush events
    client.flush()
```

---

## Constraints

### MUST DO

- Always include `distinct_id` in every event and profile update
- Use Unix time in SECONDS (not milliseconds) for `time` property
- Call `alias()` exactly once when anonymous user signs up/logs in
- Use `$set_once` for first-touch properties (signup date, initial source)
- Use `$add` for numeric counters (login count, total spend)
- Use `$insert_id` for deduplication when retrying events
- Set `$ignore_time: true` when importing historical data
- Include `token` in every event payload
- Use consistent event naming (Title Case or PascalCase)
- Use camelCase for property names
- Never send PII without explicit user consent

### MUST NOT DO

- NEVER hardcode `MIXPANEL_TOKEN` in source code
- NEVER use milliseconds for `time` property (Mixpanel uses seconds)
- NEVER mix anonymous and user identities without calling `alias()`
- NEVER call `alias()` more than once per user pair
- NEVER use `distinct_id` values that can collide (use your internal user IDs)
- NEVER send high-cardinality property values unnecessarily
- NEVER nest objects deeper than 1 level (stringify or flatten)
- NEVER send PII (names, emails, phone, credit cards) without consent
- NEVER use empty or generic event names like "event" or "click"
- NEVER exceed 255 characters for property names
- NEVER send more than 2000 events per batch (practical limit ~50-100)

---

## Output Template

When implementing Mixpanel integrations, produce:

1. **Client Initialization** — `MixpanelConfig` + `MixpanelClient` with env-based token
2. **Event Builder** — `MixpanelEventBuilder` ensuring seconds timestamp, distinct_id, token
3. **People Builder** — `MixpanelPeopleBuilder` for type-safe profile operations
4. **Identity Manager** — `IdentityManager` handling anonymous device_id, alias at signup/login
5. **Standard Events** — Event type constants with property schemas
6. **Batching & Retries** — Automatic flush with exponential backoff and `$insert_id` deduplication
7. **Funnel & Retention** — Query patterns for funnel conversion and cohort analysis

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-amplitude-api` | Amplitude as alternative product analytics platform |
| `coding-segment-api` | Segment as unified tracking layer (routes to Mixpanel + others) |
| `coding-hubspot-api` | HubSpot for marketing automation and user property enrichment |
| `coding-salesforce-api` | Salesforce CRM for customer data integration |

---

## Live References

| Resource | URL |
|----------|-----|
| mixpanel (PyPI) | https://pypi.org/project/mixpanel/ |
| Mixpanel Python SDK | https://github.com/mixpanel/mixpanel-python |
| Tracking API | https://developer.mixpanel.com/reference/track-event |
| Engage API | https://developer.mixpanel.com/reference/user-profile |
| Export API | https://developer.mixpanel.com/reference/export-raw-events |
| JQL API | https://developer.mixpanel.com/reference/jql |
| Alias API | https://developer.mixpanel.com/reference/identify-users |
| Identity Management | https://developer.mixpanel.com/docs/identifying-users |
| EU Data Residency | https://developer.mixpanel.com/reference/eu-endpoints |

---

## 📎 Identity Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      ANONYMOUS USER                          │
├─────────────────────────────────────────────────────────────┤
│  distinct_id = $device_id (UUID)                             │
│  - Track events: Product Viewed, etc.                       │
│  - Update user profile (optional)                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ Signup or Login
┌─────────────────────────────────────────────────────────────┐
│                         CALL ALIAS()                         │
├─────────────────────────────────────────────────────────────┤
│  alias(alias_id=user_id, original_id=$device_id)            │
│                                                              │
│  This tells Mixpanel: "Events from $device_id actually     │
│  belong to user_id. Merge their profiles."                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ After alias
┌─────────────────────────────────────────────────────────────┐
│                      AUTHENTICATED USER                      │
├─────────────────────────────────────────────────────────────┤
│  distinct_id = user_id (your internal ID)                   │
│  - Track events with user_id                                │
│  - Update user profile with people_set/people_set_once      │
│  - Pre-login events now visible under user_id in Mixpanel   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📎 Time Property Important!

Mixpanel uses **seconds since epoch**, not milliseconds!

| Correct | Incorrect |
|---------|-----------|
| `1705344000` | `1705344000000` |
| `int(datetime.now().timestamp())` | `int(datetime.now().timestamp() * 1000)` |
| `1705344000` (Jan 15, 2024) | `1705344000000` (year ~56000+) |

**Critical:** If you send milliseconds, your events will appear ~50,000 years in the future!

---

## 📎 User Property Operations

| Operation | Use Case | Example |
|-----------|----------|---------|
| `$set` | Update mutable properties | `$set: {"emailDomain": "gmail.com"}` |
| `$set_once` | Set only if not already set | `$set_once: {"signupDate": "..."}` |
| `$add` | Increment numeric counter | `$add: {"loginCount": 1}` |
| `$append` | Add to list property | `$append: {"viewedProducts": "Premium"}` |
| `$union` | Add unique values to list | `$union: {"tags": ["new", "active"]}` |
| `$unset` | Remove property | `$unset: ["tempProperty"]` |
