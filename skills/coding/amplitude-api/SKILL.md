---
name: amplitude-api
description: Implements Amplitude analytics integration (event tracking, user profiles, identify API, cohort analysis, dashboard export) using amplitude-analytics Python SDK with event batching, user properties, group identify, revenue tracking, and Amplitude HTTP API v2 patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: amplitude, event tracking, user analytics, amplitude events, identify api, cohort analysis, how do i track user events in amplitude, product analytics
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-mixpanel-api, coding-segment-api, coding-salesforce-api
---

# Amplitude Analytics Integration

Implements production-grade Amplitude analytics integration using the `amplitude-analytics` Python SDK and HTTP API v2. When loaded, this skill makes the model implement event tracking with rich properties, user profile management via Identify API, group analytics, revenue tracking, event batching for efficiency, user property operations (set, set_once, add, unset), and cohort export. All implementations follow Amplitude best practices: use `AMPLITUDE_API_KEY` from environment, batch events with configurable flush interval, always include `user_id` or `device_id`, avoid high-cardinality property values, validate API connectivity on startup, and never send PII without user consent.

## TL;DR Checklist

- [ ] Use `amplitude-analytics` SDK with `AMPLITUDE_API_KEY` from environment variable
- [ ] Always include either `user_id` OR `device_id` in every event
- [ ] Batch events (10-100 per batch) and use flush interval (5-30 seconds)
- [ ] Use Identify API for user properties: `set()`, `set_once()`, `add()`, `append()`, `unset()`
- [ ] Include `event_type` (required, descriptive), `time` (millis timestamp), `event_properties` dict
- [ ] Use `$insert_id` for deduplication of retried events
- [ ] Set `session_id` for grouping events into user sessions
- [ ] Use Revenue API for purchase tracking: `price`, `quantity`, `productId`, `revenueType`
- [ ] Use Group Identify API for account-level properties (B2B analytics)
- [ ] Never send PII (names, emails, phone) unless explicitly allowed by privacy policy

---

## When to Use

Use this skill when:

- Tracking user behavior events in web/mobile applications
- Managing user profiles and properties for segmentation
- Implementing cohort analysis and retention tracking
- Tracking revenue and purchases for LTV calculations
- Building account-based (B2B) analytics with groups
- Creating funnels for conversion analysis
- Exporting cohort data for internal systems
- A/B test result analysis with Amplitude
- Setting up behavioral email triggers based on user actions
- Implementing feature adoption tracking

---

## When NOT to Use

- For Mixpanel-specific analytics — use `coding-mixpanel-api` instead
- For Segment as a unified tracking layer — use `coding-segment-api` instead
- For error/exception tracking — use `coding-sentry-api` instead
- For server-side logging only — use logging libraries, not Amplitude
- For high-volume server-side metrics (100k+/sec) — consider Segment or CDP first
- When you need real-time stream processing (Amplitude is near-real-time)

---

## Core Workflow

1. **Initialize Client** — Configure Amplitude client using `AMPLITUDE_API_KEY` from environment variable. Set flush interval (10-30s), batch size (10-100), server zone (US/EU). **Checkpoint:** Validate with test event or HTTP API `/batch` test call.

2. **Define Event Schema** — Establish consistent event naming (PascalCase `UserSignedUp`, `CheckoutCompleted`), property naming (camelCase `signupMethod`, `totalValue`), and required fields: `user_id` or `device_id`, `event_type`, `time`. **Checkpoint:** Every event has at least one user identifier and event type.

3. **Implement Event Tracking** — Track events with `track()` method. Include `event_properties` for event-specific data, `user_properties` for set-once operations on that event. Use `$insert_id` for deduplication. **Checkpoint:** Events batched automatically or flushed explicitly at shutdown.

4. **Manage User Properties** — Use Identify API to update user profile properties: `set()` for mutable values, `set_once()` for first-touch values (signup date), `add()` for counters, `append()` for lists, `unset()` to remove. **Checkpoint:** User properties updated via `identify()`, not within event tracking.

5. **Track Revenue & Purchases** — Use Revenue API or `revenue` field for tracking transactions. Include `price`, `quantity`, `productId`, `revenueType`. For refunds, use negative price. **Checkpoint:** Every purchase event has valid numeric price and revenue calculated.

6. **Group Analytics (B2B)** — Use Group Identify API for account-level properties. Set group with `setGroup()`, update group properties with Group Identify. Use `group_properties` in events. **Checkpoint:** B2B analytics uses consistent group type (e.g., "company", "account", "team").

---

## Implementation Patterns

### Pattern 1: Amplitude Client Initialization (BAD vs GOOD)

```python
"""Amplitude client initialization patterns.

Two primary approaches:
1. amplitude-analytics SDK: Official Python SDK (recommended)
2. HTTP API v2: Direct HTTP calls (for simple use cases)

Server zones:
- US: Standard server (api2.amplitude.com)
- EU: EU data residency (api.eu.amplitude.com)

Key concepts:
- API Key: Project-level key (not secret, can be used client-side)
- Secret Key: For export/management APIs (keep secret)
- Batch size: Events per HTTP call (10-100 recommended)
- Flush interval: Seconds between automatic flushes
"""

from __future__ import annotations

import os
import json
import time
import logging
import threading
from typing import Any, Optional, Literal
from dataclasses import dataclass, field
from datetime import datetime, timezone
from collections import deque
from uuid import uuid4

import requests

logger = logging.getLogger(__name__)

ServerZone = Literal["US", "EU"]


# ===================================================================
# ❌ BAD — hardcoded key, no batching, missing required fields
# ===================================================================

def bad_amplitude_init_bad() -> None:
    """❌ BAD: Don't do any of these things."""
    
    # ❌ Hardcoded API key!
    api_key = "abc123def456"
    
    # ❌ No batching - sending one HTTP request per event
    # ❌ No user_id or device_id (required!)
    # ❌ No timestamp (events will use ingest time, not occurrence time)
    event = {
        "event_type": "button_click",  # ❌ Not PascalCase
        # ❌ Missing user_id/device_id
        # ❌ Missing time
        # ❌ Using snake_case instead of camelCase for properties
        "event_properties": {
            "button_name": "signup",  # ❌ Should be buttonName
        },
    }


# ===================================================================
# ✅ GOOD — env-based config, batching, proper field naming
# ===================================================================


class AmplitudeError(Exception):
    """Base exception for Amplitude client errors."""
    pass


class AmplitudeAuthError(AmplitudeError):
    """API key is invalid or missing."""
    pass


class AmplitudeRateLimitError(AmplitudeError):
    """Rate limit exceeded."""
    
    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


@dataclass
class AmplitudeConfig:
    """Amplitude configuration from environment variables.
    
    Environment variables:
        AMPLITUDE_API_KEY: Amplitude project API key (required for tracking)
        AMPLITUDE_SECRET_KEY: Secret key for export/management APIs
        AMPLITUDE_SERVER_ZONE: US or EU (for data residency)
        AMPLITUDE_FLUSH_INTERVAL: Auto-flush interval in seconds
        AMPLITUDE_BATCH_SIZE: Events per batch
        AMPLITUDE_TIMEOUT: Request timeout in seconds
    """
    
    # Required
    api_key: Optional[str] = None
    secret_key: Optional[str] = None
    
    # Server config
    server_zone: ServerZone = "US"
    
    # Batching config
    flush_interval_seconds: float = 10.0
    batch_size: int = 50
    max_retries: int = 3
    initial_retry_delay: float = 1.0
    
    # HTTP config
    timeout: float = 10.0
    
    # EU endpoints
    _US_ENDPOINTS = {
        "http_api": "https://api2.amplitude.com",
        "identify": "https://api2.amplitude.com/identify",
        "batch": "https://api2.amplitude.com/batch",
        "export": "https://amplitude.com/api/2",
    }
    
    _EU_ENDPOINTS = {
        "http_api": "https://api.eu.amplitude.com",
        "identify": "https://api.eu.amplitude.com/identify",
        "batch": "https://api.eu.amplitude.com/batch",
        "export": "https://analytics.eu.amplitude.com/api/2",
    }
    
    @classmethod
    def from_env(cls) -> "AmplitudeConfig":
        """Load configuration from environment variables."""
        
        # Parse server zone
        zone_str = os.environ.get("AMPLITUDE_SERVER_ZONE", "US").upper()
        server_zone: ServerZone = "EU" if zone_str == "EU" else "US"
        
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
            api_key=os.environ.get("AMPLITUDE_API_KEY"),
            secret_key=os.environ.get("AMPLITUDE_SECRET_KEY"),
            server_zone=server_zone,
            flush_interval_seconds=parse_float("AMPLITUDE_FLUSH_INTERVAL", 10.0),
            batch_size=parse_int("AMPLITUDE_BATCH_SIZE", 50),
            timeout=parse_float("AMPLITUDE_TIMEOUT", 10.0),
        )
    
    def get_endpoint(self, name: str) -> str:
        """Get endpoint for current server zone.
        
        Args:
            name: Endpoint name: http_api, identify, batch, export
        
        Returns:
            Full URL
        """
        endpoints = self._EU_ENDPOINTS if self.server_zone == "EU" else self._US_ENDPOINTS
        
        if name not in endpoints:
            raise ValueError(f"Unknown endpoint: {name}")
        
        return endpoints[name]
    
    def is_enabled(self) -> bool:
        """Check if Amplitude should be enabled."""
        if not self.api_key:
            return False
        
        # Check for explicit disable
        if os.environ.get("AMPLITUDE_DISABLED") == "1":
            return False
        
        # Disable in test environment unless explicitly enabled
        env = os.environ.get("ENV", "").lower()
        if env in ("test", "testing", "local"):
            if os.environ.get("AMPLITUDE_FORCE_ENABLE") != "1":
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
            logger.info("Amplitude disabled by configuration")
            return True
        
        if not self.api_key:
            raise ValueError("AMPLITUDE_API_KEY is required when enabled")
        
        # Batch size limits
        if self.batch_size < 1 or self.batch_size > 2000:
            raise ValueError(f"batch_size must be 1-2000, got {self.batch_size}")
        
        return True


class AmplitudeEventBuilder:
    """Builder for creating properly formatted Amplitude events.
    
    Ensures consistent naming conventions and required fields.
    """
    
    def __init__(self, api_key: str) -> None:
        self._api_key = api_key
    
    @staticmethod
    def current_time_millis() -> int:
        """Get current time in milliseconds since epoch."""
        return int(datetime.now(timezone.utc).timestamp() * 1000)
    
    @staticmethod
    def generate_insert_id() -> str:
        """Generate a unique insert ID for deduplication.
        
        Use this when retrying events to prevent duplicates.
        """
        return str(uuid4())
    
    def build_event(
        self,
        event_type: str,
        user_id: Optional[str] = None,
        device_id: Optional[str] = None,
        event_properties: Optional[dict[str, Any]] = None,
        user_properties: Optional[dict[str, Any]] = None,
        time: Optional[int] = None,
        session_id: Optional[int] = None,
        insert_id: Optional[str] = None,
        groups: Optional[dict[str, Any]] = None,
        app_version: Optional[str] = None,
        platform: Optional[str] = None,
        os_name: Optional[str] = None,
        os_version: Optional[str] = None,
        device_brand: Optional[str] = None,
        device_model: Optional[str] = None,
        country: Optional[str] = None,
        region: Optional[str] = None,
        city: Optional[str] = None,
        language: Optional[str] = None,
        ip: Optional[str] = None,
        revenue: Optional[float] = None,
    ) -> dict[str, Any]:
        """Build a properly formatted Amplitude event.
        
        Required: Either user_id OR device_id
        Required: event_type
        
        Args:
            event_type: Event name (use PascalCase: UserSignedUp, CheckoutCompleted)
            user_id: Your internal user identifier
            device_id: Device identifier (for anonymous users)
            event_properties: Event-specific properties (camelCase keys)
            user_properties: User property operations (set, set_once, etc.)
            time: Event time in milliseconds since epoch
            session_id: Session identifier (epoch seconds * 1000)
            insert_id: Unique ID for deduplication
            groups: Groups for account-level analytics (B2B)
            app_version: Application version
            platform: Platform (Web, iOS, Android, Server)
            os_name: OS name
            os_version: OS version
            device_brand: Device brand
            device_model: Device model
            country: Country code (ISO 3166-1 alpha-2)
            region: Region/state
            city: City name
            language: Language code (ISO 639-1)
            ip: IP address (for geolocation)
            revenue: Revenue amount (deprecated, use Revenue API)
        
        Returns:
            Event dict ready for Amplitude API
        """
        # Validate required fields
        if not event_type:
            raise ValueError("event_type is required")
        
        if not user_id and not device_id:
            raise ValueError("Either user_id or device_id is required")
        
        # Build event
        event: dict[str, Any] = {
            "event_type": event_type,
        }
        
        # Identifiers
        if user_id:
            event["user_id"] = str(user_id)
        if device_id:
            event["device_id"] = str(device_id)
        
        # Timestamp
        if time is not None:
            event["time"] = int(time)
        else:
            event["time"] = self.current_time_millis()
        
        # Session
        if session_id is not None:
            event["session_id"] = int(session_id)
        
        # Insert ID for deduplication
        if insert_id:
            event["insert_id"] = insert_id
        
        # Properties
        if event_properties:
            event["event_properties"] = self._sanitize_properties(event_properties)
        
        # User property operations
        if user_properties:
            event["user_properties"] = self._sanitize_properties(user_properties)
        
        # Groups (B2B)
        if groups:
            event["groups"] = dict(groups)
        
        # App info
        if app_version:
            event["app_version"] = app_version
        if platform:
            event["platform"] = platform
        
        # Device/OS info
        if os_name:
            event["os_name"] = os_name
        if os_version:
            event["os_version"] = os_version
        if device_brand:
            event["device_brand"] = device_brand
        if device_model:
            event["device_model"] = device_model
        
        # Location
        if country:
            event["country"] = country
        if region:
            event["region"] = region
        if city:
            event["city"] = city
        if language:
            event["language"] = language
        if ip:
            event["ip"] = ip
        
        # Revenue (deprecated but still supported)
        if revenue is not None:
            event["revenue"] = float(revenue)
        
        return event
    
    def _sanitize_properties(self, properties: dict[str, Any]) -> dict[str, Any]:
        """Sanitize property values for Amplitude.
        
        Amplitude supports: string, number, boolean, array, None
        Nested objects are NOT recommended (flatten instead)
        """
        result: dict[str, Any] = {}
        
        for key, value in properties.items():
            if isinstance(value, (str, int, float, bool, type(None))):
                result[key] = value
            elif isinstance(value, list):
                # Arrays are OK
                result[key] = value
            elif isinstance(value, dict):
                # Nested objects not recommended - stringify or skip
                result[key] = json.dumps(value) if len(str(value)) < 1000 else "[object]"
            else:
                # Convert to string representation
                result[key] = str(value)
        
        return result


class AmplitudeIdentifyBuilder:
    """Builder for Identify API user property operations.
    
    User property operations:
    - $set: Set or update a property
    - $setOnce: Set a property only if not already set
    - $add: Increment a numeric property
    - $append: Add value to a list property
    - $prepend: Add value to beginning of list
    - $unset: Remove a property
    """
    
    def __init__(self) -> None:
        self._operations: dict[str, dict[str, Any]] = {}
    
    def set(self, key: str, value: Any) -> "AmplitudeIdentifyBuilder":
        """Set or update a user property.
        
        Args:
            key: Property name
            value: Property value
        """
        if "$set" not in self._operations:
            self._operations["$set"] = {}
        self._operations["$set"][key] = value
        return self
    
    def set_once(self, key: str, value: Any) -> "AmplitudeIdentifyBuilder":
        """Set a property only if not already set.
        
        Use for first-touch properties: signup date, initial source, etc.
        """
        if "$setOnce" not in self._operations:
            self._operations["$setOnce"] = {}
        self._operations["$setOnce"][key] = value
        return self
    
    def add(self, key: str, value: int | float) -> "AmplitudeIdentifyBuilder":
        """Increment a numeric property.
        
        Args:
            key: Property name
            value: Amount to add (can be negative)
        """
        if "$add" not in self._operations:
            self._operations["$add"] = {}
        self._operations["$add"][key] = value
        return self
    
    def append(self, key: str, value: Any) -> "AmplitudeIdentifyBuilder":
        """Append a value to a list property.
        
        Use for tracking history: viewedProducts, purchasedCategories, etc.
        """
        if "$append" not in self._operations:
            self._operations["$append"] = {}
        self._operations["$append"][key] = value
        return self
    
    def unset(self, key: str) -> "AmplitudeIdentifyBuilder":
        """Remove a property.
        
        Use "-" as value for unset operation.
        """
        if "$unset" not in self._operations:
            self._operations["$unset"] = {}
        self._operations["$unset"][key] = "-"
        return self
    
    def build(self) -> dict[str, Any]:
        """Build the user_properties dict for Amplitude."""
        return dict(self._operations)
    
    def is_empty(self) -> bool:
        """Check if any operations have been added."""
        return len(self._operations) == 0


class AmplitudeClient:
    """Production-grade Amplitude client with batching and retries.
    
    Features:
    - Event batching with automatic flush
    - Exponential backoff retries
    - Insert ID deduplication
    - Identify API support
    - Group Identify support
    - Revenue tracking
    """
    
    def __init__(self, config: AmplitudeConfig) -> None:
        self._config = config
        self._event_builder = AmplitudeEventBuilder(config.api_key or "")
        
        self._buffer: deque[dict[str, Any]] = deque()
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
            logger.info("Amplitude disabled, not starting flush thread")
            return
        
        self._running = True
        self._flush_thread = threading.Thread(
            target=self._flush_loop,
            daemon=True,
            name="amplitude-flusher",
        )
        self._flush_thread.start()
        
        logger.info(
            "Amplitude client started: zone=%s, flush_interval=%.1fs, batch_size=%d",
            self._config.server_zone,
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
                logger.exception("Amplitude background flush failed")
    
    def _calculate_delay(self, attempt: int) -> float:
        """Calculate exponential backoff with jitter."""
        delay = self._config.initial_retry_delay * (2 ** attempt)
        # Add jitter ±20%
        jitter = 1.0 + (random.uniform(-0.2, 0.2) if 'random' in dir() else 0)
        # Fallback jitter
        import random
        jitter = 1.0 + random.uniform(-0.2, 0.2)
        return min(delay * jitter, 30.0)  # Max 30s
    
    def _send_batch(self, events: list[dict[str, Any]]) -> bool:
        """Send a batch of events to Amplitude.
        
        Args:
            events: List of event dicts
        
        Returns:
            True if successful
        """
        if not events:
            return True
        
        url = self._config.get_endpoint("batch")
        
        # Build payload for /batch endpoint
        # Note: /batch uses different format than /httpapi
        payload = {
            "api_key": self._config.api_key,
            "events": events,
            "options": {
                "min_id_length": 1,
            },
        }
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "*/*",
        }
        
        for attempt in range(self._config.max_retries):
            try:
                response = self._session.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=self._config.timeout,
                )
                
                if response.status_code == 200:
                    logger.debug("Amplitude: Sent %d events successfully", len(events))
                    return True
                
                elif response.status_code == 400:
                    # Invalid request - don't retry
                    logger.error("Amplitude: Invalid request (400): %s", response.text[:200])
                    return False
                
                elif response.status_code == 413:
                    # Payload too large - split and retry smaller batches
                    logger.warning("Amplitude: Payload too large, batch size may be too big")
                    return False
                
                elif response.status_code == 429:
                    # Rate limited - retry with backoff
                    if attempt < self._config.max_retries - 1:
                        delay = self._calculate_delay(attempt)
                        logger.warning("Amplitude rate limited (429), retrying in %.1fs", delay)
                        time.sleep(delay)
                        continue
                    else:
                        raise AmplitudeRateLimitError(
                            f"Amplitude rate limit exceeded after {self._config.max_retries} retries"
                        )
                
                else:
                    logger.error("Amplitude error %d: %s", response.status_code, response.text[:200])
                    if attempt < self._config.max_retries - 1:
                        delay = self._calculate_delay(attempt)
                        time.sleep(delay)
                        continue
                    return False
                
            except requests.RequestException as e:
                logger.warning("Amplitude network error: %s", e)
                if attempt < self._config.max_retries - 1:
                    delay = self._calculate_delay(attempt)
                    time.sleep(delay)
                    continue
                return False
        
        return False
    
    def track(
        self,
        event_type: str,
        user_id: Optional[str] = None,
        device_id: Optional[str] = None,
        event_properties: Optional[dict[str, Any]] = None,
        user_properties: Optional[dict[str, Any]] = None,
        time: Optional[int] = None,
        session_id: Optional[int] = None,
        insert_id: Optional[str] = None,
        groups: Optional[dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Optional[str]:
        """Track an event.
        
        Args:
            event_type: Event name (PascalCase)
            user_id: User identifier
            device_id: Device identifier
            event_properties: Event-specific properties
            user_properties: User property operations for this event
            time: Event time in millis
            session_id: Session ID
            insert_id: Insert ID for deduplication
            groups: Groups for B2B analytics
            **kwargs: Additional event fields
        
        Returns:
            Insert ID if tracked, None if disabled
        """
        if not self._config.is_enabled():
            return None
        
        try:
            event = self._event_builder.build_event(
                event_type=event_type,
                user_id=user_id,
                device_id=device_id,
                event_properties=event_properties,
                user_properties=user_properties,
                time=time,
                session_id=session_id,
                insert_id=insert_id or self._event_builder.generate_insert_id(),
                groups=groups,
                **kwargs,
            )
            
            actual_insert_id = event.get("insert_id")
            
            with self._lock:
                self._buffer.append(event)
                self._total_tracked += 1
                
                # Auto-flush if buffer reaches batch size
                if len(self._buffer) >= self._config.batch_size:
                    self._flush_locked()
            
            return actual_insert_id
            
        except Exception as e:
            logger.warning("Amplitude track failed: %s", e)
            return None
    
    def identify(
        self,
        user_id: Optional[str] = None,
        device_id: Optional[str] = None,
        identify_builder: Optional[AmplitudeIdentifyBuilder] = None,
        **operations: dict[str, Any],
    ) -> bool:
        """Update user properties via Identify API.
        
        Can use either:
        1. AmplitudeIdentifyBuilder for type-safe operations
        2. Direct operation dicts: $set, $setOnce, $add, etc.
        
        Args:
            user_id: User identifier
            device_id: Device identifier
            identify_builder: Builder with operations
            **operations: Direct operations like $set={"key": "value"}
        
        Returns:
            True if successful (or queued for batch)
        """
        if not self._config.is_enabled():
            return False
        
        # Build user properties
        if identify_builder and not identify_builder.is_empty():
            user_properties = identify_builder.build()
        elif operations:
            user_properties = dict(operations)
        else:
            logger.warning("Amplitude identify called with no operations")
            return False
        
        # Create a special event for identify
        # In Amplitude, you can either:
        # 1. Send via /identify HTTP API
        # 2. Include user_properties in any event
        
        # For simplicity, we'll track with a special event type
        # OR send via HTTP API directly
        
        try:
            # Build identification payload
            payload: dict[str, Any] = {
                "api_key": self._config.api_key,
            }
            
            identification: dict[str, Any] = {}
            
            if user_id:
                identification["user_id"] = str(user_id)
            if device_id:
                identification["device_id"] = str(device_id)
            
            identification["user_properties"] = user_properties
            
            payload["identification"] = json.dumps([identification])
            
            url = self._config.get_endpoint("identify")
            
            response = self._session.post(
                url,
                data=payload,
                timeout=self._config.timeout,
            )
            
            if response.status_code == 200:
                logger.debug("Amplitude identify succeeded")
                return True
            else:
                logger.warning("Amplitude identify failed: %d %s", response.status_code, response.text[:100])
                return False
                
        except Exception as e:
            logger.warning("Amplitude identify error: %s", e)
            return False
    
    def set_group(
        self,
        user_id: str,
        group_type: str,
        group_name: Any,
    ) -> bool:
        """Associate a user with a group (for B2B analytics).
        
        Args:
            user_id: User identifier
            group_type: Group type (e.g., "company", "account", "team")
            group_name: Group name or list of group names
        
        Returns:
            True if successful
        """
        # Set group uses identify API with $groups
        return self.identify(
            user_id=user_id,
            **{"$groups": {group_type: group_name}},
        )
    
    def track_revenue(
        self,
        user_id: str,
        price: float,
        quantity: int = 1,
        product_id: Optional[str] = None,
        revenue_type: Optional[str] = None,
        event_properties: Optional[dict[str, Any]] = None,
    ) -> Optional[str]:
        """Track a revenue event.
        
        Args:
            user_id: User who made the purchase
            price: Price per unit (use negative for refunds)
            quantity: Number of units
            product_id: Product/SKU identifier
            revenue_type: Type of revenue (e.g., "purchase", "subscription", "refund")
            event_properties: Additional properties
        
        Returns:
            Insert ID
        """
        # Build event properties
        props: dict[str, Any] = dict(event_properties or {})
        
        # Revenue fields
        props["price"] = price
        props["quantity"] = quantity
        props["revenue"] = price * quantity  # Total revenue
        
        if product_id:
            props["productId"] = product_id
        if revenue_type:
            props["revenueType"] = revenue_type
        
        # Determine event type
        if price < 0:
            event_type = "RefundCompleted"
        else:
            event_type = "PurchaseCompleted"
        
        return self.track(
            event_type=event_type,
            user_id=user_id,
            event_properties=props,
        )
    
    def flush(self) -> int:
        """Flush all buffered events to Amplitude.
        
        Returns:
            Number of events sent
        """
        with self._lock:
            return self._flush_locked()
    
    def _flush_locked(self) -> int:
        """Flush buffer (must hold lock)."""
        if not self._buffer:
            return 0
        
        events = list(self._buffer)
        self._buffer.clear()
        
        try:
            success = self._send_batch(events)
            
            if success:
                self._total_sent += len(events)
                logger.debug("Amplitude: Flushed %d events", len(events))
                return len(events)
            else:
                # Put back for later retry
                self._buffer.extendleft(reversed(events))
                self._total_failed += len(events)
                return 0
                
        except Exception as e:
            self._buffer.extendleft(reversed(events))
            self._total_failed += len(events)
            logger.warning("Amplitude flush failed: %s", e)
            return 0
    
    def get_stats(self) -> dict[str, int]:
        """Get client statistics."""
        with self._lock:
            return {
                "buffered": len(self._buffer),
                "total_tracked": self._total_tracked,
                "total_sent": self._total_sent,
                "total_failed": self._total_failed,
            }


# Global client (lazy-loaded)
_global_client: Optional[AmplitudeClient] = None


def get_amplitude_client() -> AmplitudeClient:
    """Get or create global AmplitudeClient."""
    global _global_client
    if _global_client is None:
        config = AmplitudeConfig.from_env()
        _global_client = AmplitudeClient(config)
        if config.is_enabled():
            _global_client.start()
    return _global_client
```

### Pattern 2: Event Tracking Standards

```python
"""Standard event tracking patterns and naming conventions.

Amplitude best practices:
- Event types: PascalCase, noun-verb or action-object
  Good: UserSignedUp, CheckoutCompleted, ProductViewed
  Bad: user_signed_up, User signed up, click_button
  
- Properties: camelCase, descriptive
  Good: signupMethod, totalValue, isFirstPurchase
  Bad: signup_method, TotalValue, is_first_purchase

- Required for every event:
  - Either user_id OR device_id
  - event_type
  - time (auto-set if not provided)

- Recommended:
  - session_id for session grouping
  - $insert_id for deduplication
  - event_properties for event-specific data
  - app_version, platform for segmentation
"""

from __future__ import annotations

import logging
from typing import Any, Optional
from dataclasses import dataclass
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class StandardEvents:
    """Standard event types with consistent property schemas.
    
    Use these as a reference for implementing your event tracking.
    """
    
    # ===================================================================
    # ❌ BAD — Poor event naming and properties
    # ===================================================================
    
    @staticmethod
    def bad_event_patterns() -> None:
        """❌ Don't use these patterns."""
        
        # ❌ Event type: lowercase with underscores
        # ❌ Generic name: doesn't tell you what happened
        # ❌ Properties: snake_case, inconsistent
        bad_event_1 = {
            "event_type": "user_click",  # ❌ Too generic
            "event_properties": {
                "button_name": "signup",  # ❌ snake_case
                "ButtonColor": "blue",     # ❌ PascalCase
            },
        }
        
        # ❌ Too vague
        bad_event_2 = {
            "event_type": "page_view",
            # ❌ No property indicating which page
        }
        
        # ❌ Inconsistent units
        bad_event_3 = {
            "event_type": "purchase",
            "event_properties": {
                "value": 99,        # ❌ Is this dollars? cents?
                "quantity": "three",  # ❌ String instead of number
            },
        }
    
    # ===================================================================
    # ✅ GOOD — Standard events with proper naming
    # ===================================================================
    
    @staticmethod
    def track_signup(
        client: Any,
        user_id: str,
        signup_method: str,  # email, google, github, apple
        is_first_purchase: bool = False,
        referral_code: Optional[str] = None,
        session_id: Optional[int] = None,
    ) -> Optional[str]:
        """Track user signup event.
        
        Event Type: UserSignedUp
        
        Properties:
        - signupMethod: How user signed up (email, google, github, apple)
        - isFirstPurchase: Whether this user has purchased before
        - referralCode: Optional referral code used
        """
        event_properties: dict[str, Any] = {
            "signupMethod": signup_method,
            "isFirstPurchase": is_first_purchase,
        }
        
        if referral_code:
            event_properties["referralCode"] = referral_code
        
        # Also set first-touch user properties
        user_properties = {
            "$setOnce": {
                "initialSignupMethod": signup_method,
                "signupDate": datetime.now(timezone.utc).isoformat(),
            },
        }
        
        return client.track(
            event_type="UserSignedUp",
            user_id=user_id,
            event_properties=event_properties,
            user_properties=user_properties,
            session_id=session_id,
        )
    
    @staticmethod
    def track_login(
        client: Any,
        user_id: str,
        login_method: str,
        is_new_device: bool = False,
        session_id: Optional[int] = None,
    ) -> Optional[str]:
        """Track user login event.
        
        Event Type: UserLoggedIn
        
        Properties:
        - loginMethod: How user logged in
        - isNewDevice: Whether this is a new device for this user
        """
        return client.track(
            event_type="UserLoggedIn",
            user_id=user_id,
            event_properties={
                "loginMethod": login_method,
                "isNewDevice": is_new_device,
                "loginCount": 1,  # Use $add in user_properties for running total
            },
            user_properties={
                "$add": {"loginCount": 1},
                "$set": {
                    "lastLoginDate": datetime.now(timezone.utc).isoformat(),
                    "lastLoginMethod": login_method,
                },
            },
            session_id=session_id,
        )
    
    @staticmethod
    def track_product_view(
        client: Any,
        user_id: str,
        product_id: str,
        product_name: str,
        product_category: str,
        price: float,
        currency: str = "USD",
        is_organic: bool = True,
        campaign_source: Optional[str] = None,
        session_id: Optional[int] = None,
    ) -> Optional[str]:
        """Track product view event.
        
        Event Type: ProductViewed
        
        Properties:
        - productId: Product identifier
        - productName: Display name
        - productCategory: Category hierarchy
        - price: Unit price
        - currency: Currency code
        - isOrganic: Whether organic traffic or campaign
        - campaignSource: Campaign/source if paid
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
        
        return client.track(
            event_type="ProductViewed",
            user_id=user_id,
            event_properties=event_properties,
            session_id=session_id,
        )
    
    @staticmethod
    def track_checkout_started(
        client: Any,
        user_id: str,
        cart_value: float,
        item_count: int,
        currency: str = "USD",
        coupon_code: Optional[str] = None,
        session_id: Optional[int] = None,
    ) -> Optional[str]:
        """Track checkout start event (for funnel analysis).
        
        Event Type: CheckoutStarted
        
        Use with CheckoutCompleted to calculate conversion rate.
        """
        event_properties: dict[str, Any] = {
            "cartValue": cart_value,
            "itemCount": item_count,
            "currency": currency,
        }
        
        if coupon_code:
            event_properties["couponCode"] = coupon_code
        
        return client.track(
            event_type="CheckoutStarted",
            user_id=user_id,
            event_properties=event_properties,
            session_id=session_id,
        )
    
    @staticmethod
    def track_checkout_completed(
        client: Any,
        user_id: str,
        order_id: str,
        total_value: float,
        item_count: int,
        currency: str = "USD",
        payment_method: str = "card",
        coupon_code: Optional[str] = None,
        discount_amount: float = 0.0,
        session_id: Optional[int] = None,
    ) -> Optional[str]:
        """Track checkout completion event.
        
        Event Type: CheckoutCompleted
        
        Critical for revenue analytics and funnel conversion.
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
        
        # Also update user properties for LTV
        user_properties = {
            "$add": {
                "totalSpend": total_value,
                "orderCount": 1,
            },
            "$set": {
                "lastPurchaseDate": datetime.now(timezone.utc).isoformat(),
                "lastOrderValue": total_value,
            },
        }
        
        # Track revenue
        insert_id = client.track(
            event_type="CheckoutCompleted",
            user_id=user_id,
            event_properties=event_properties,
            user_properties=user_properties,
            session_id=session_id,
        )
        
        # Also track as revenue event
        client.track_revenue(
            user_id=user_id,
            price=total_value,
            quantity=1,
            product_id=order_id,
            revenue_type="purchase",
        )
        
        return insert_id
    
    @staticmethod
    def track_feature_used(
        client: Any,
        user_id: str,
        feature_name: str,
        feature_module: str,
        usage_duration_seconds: Optional[int] = None,
        is_successful: bool = True,
        error_type: Optional[str] = None,
        session_id: Optional[int] = None,
    ) -> Optional[str]:
        """Track feature usage for adoption analysis.
        
        Event Type: FeatureUsed
        
        Properties:
        - featureName: Name of the feature
        - featureModule: Module/area (e.g., "analytics", "billing", "settings")
        - usageDurationSeconds: Time spent using feature
        - isSuccessful: Whether usage succeeded
        - errorType: Type of error if failed
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
        
        # Update last used for this feature
        user_properties = {
            "$set": {
                f"lastUsed_{feature_name}": datetime.now(timezone.utc).isoformat(),
            },
            "$add": {
                f"usageCount_{feature_name}": 1,
            },
        }
        
        return client.track(
            event_type="FeatureUsed",
            user_id=user_id,
            event_properties=event_properties,
            user_properties=user_properties,
            session_id=session_id,
        )


class SessionManager:
    """Helper for managing Amplitude sessions.
    
    Amplitude session rules:
    - session_id = epoch_seconds * 1000 (milliseconds)
    - Session timeout: 5 minutes (300000ms) of inactivity = new session
    - Events without session_id are not grouped into sessions
    - session_id = -1 means event is out of session
    """
    
    SESSION_TIMEOUT_MS = 300000  # 5 minutes
    
    def __init__(self) -> None:
        self._current_session_id: Optional[int] = None
        self._last_activity_time: Optional[int] = None
    
    @staticmethod
    def current_time_millis() -> int:
        """Get current time in milliseconds."""
        return int(datetime.now(timezone.utc).timestamp() * 1000)
    
    def get_session_id(self) -> int:
        """Get current session ID, creating new if timeout exceeded.
        
        Returns:
            Session ID (milliseconds since epoch)
        """
        now = self.current_time_millis()
        
        if (
            self._current_session_id is None
            or self._last_activity_time is None
            or (now - self._last_activity_time) > self.SESSION_TIMEOUT_MS
        ):
            # New session
            self._current_session_id = now
            logger.info("Starting new Amplitude session: %d", self._current_session_id)
        
        self._last_activity_time = now
        return self._current_session_id
    
    def reset_session(self) -> int:
        """Force start a new session.
        
        Use when user explicitly logs out or logs in.
        """
        self._current_session_id = self.current_time_millis()
        self._last_activity_time = self._current_session_id
        logger.info("Reset Amplitude session: %d", self._current_session_id)
        return self._current_session_id
    
    def end_session(self) -> None:
        """End current session."""
        self._current_session_id = None
        self._last_activity_time = None


# Example usage flow

def example_user_journey(client: Any, session_manager: SessionManager) -> None:
    """Example of a complete user journey tracking."""
    
    session_id = session_manager.get_session_id()
    
    # Anonymous user views product
    client.track(
        event_type="ProductViewed",
        device_id="device-abc123",
        event_properties={
            "productId": "prod-456",
            "productName": "Premium Subscription",
            "price": 99.99,
        },
        session_id=session_id,
    )
    
    # User signs up
    user_id = "user-789"
    StandardEvents.track_signup(
        client=client,
        user_id=user_id,
        signup_method="email",
        session_id=session_id,
    )
    
    # Update user properties after signup
    builder = AmplitudeIdentifyBuilder()
    builder.set("emailDomain", "example.com")
    builder.set("signupSource", "organic_search")
    builder.set_once("firstVisitDate", datetime.now(timezone.utc).isoformat())
    
    client.identify(user_id=user_id, identify_builder=builder)
    
    # User starts checkout
    StandardEvents.track_checkout_started(
        client=client,
        user_id=user_id,
        cart_value=99.99,
        item_count=1,
        session_id=session_id,
    )
    
    # User completes checkout
    StandardEvents.track_checkout_completed(
        client=client,
        user_id=user_id,
        order_id="order-xyz",
        total_value=99.99,
        item_count=1,
        payment_method="credit_card",
        session_id=session_id,
    )
    
    # Explicit flush at end
    client.flush()
```

---

## Constraints

### MUST DO

- Always include either `user_id` OR `device_id` in every event
- Use PascalCase for event types: `UserSignedUp`, `CheckoutCompleted`
- Use camelCase for property names: `signupMethod`, `totalValue`
- Use `$insert_id` for deduplication when retrying events
- Set `session_id` for grouping events into user sessions
- Use Identify API for user property updates (not within event properties)
- Use `$setOnce` for first-touch properties (signup date, initial source)
- Use `$add` for numeric counters (login count, total spend)
- Include `app_version` and `platform` for segmentation
- Set `time` (millis) for historical backfill of events
- Never send PII unless you have explicit user consent

### MUST NOT DO

- NEVER hardcode `AMPLITUDE_API_KEY` in source code
- NEVER use snake_case for event types or properties
- NEVER send high-cardinality property values (timestamps, unique IDs) unnecessarily
- NEVER nest objects deeper than 1 level (stringify or flatten instead)
- NEVER send PII (names, emails, phone, credit cards) without consent
- NEVER use empty or generic event types like "click" or "view"
- NEVER mix user_id and device_id incorrectly (stick to one identifier per user)
- NEVER send duplicate events without `$insert_id`
- NEVER use string instead of numeric types for prices, counts, durations
- NEVER exceed 1024 characters for string property values
- NEVER send more than 1000 events per batch (practical limit ~100)

---

## Output Template

When implementing Amplitude integrations, produce:

1. **Client Initialization** — `AmplitudeConfig` + `AmplitudeClient` with env-based API key
2. **Event Builder** — `AmplitudeEventBuilder` ensuring required fields and naming conventions
3. **Identify Builder** — `AmplitudeIdentifyBuilder` for type-safe user property operations
4. **Standard Events** — Event type constants with property schemas
5. **Session Management** — `SessionManager` for session_id generation and timeout handling
6. **Batching & Retries** — Automatic flush with exponential backoff and `$insert_id` deduplication
7. **Revenue Tracking** — Purchase events with proper price, quantity, and `revenueType`

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-mixpanel-api` | Mixpanel as alternative product analytics platform |
| `coding-segment-api` | Segment as unified tracking layer (routes to Amplitude + others) |
| `coding-salesforce-api` | CRM integration for user property enrichment |
| `coding-hubspot-api` | HubSpot for marketing automation integration |

---

## Live References

| Resource | URL |
|----------|-----|
| amplitude-analytics (PyPI) | https://pypi.org/project/amplitude-analytics/ |
| Amplitude Python SDK | https://github.com/amplitude/Amplitude-Python |
| HTTP API v2 Docs | https://www.docs.developers.amplitude.com/analytics/apis/http-v2-api/ |
| Identify API | https://www.docs.developers.amplitude.com/analytics/apis/identify-api/ |
| Batch API | https://www.docs.developers.amplitude.com/analytics/apis/batch-event-upload-api/ |
| Event Taxonomy Guide | https://www.docs.developers.amplitude.com/analytics/cdp/apis/event-taxonomy/ |
| User Properties | https://www.docs.developers.amplitude.com/analytics/user-properties/ |
| Group Analytics | https://www.docs.developers.amplitude.com/analytics/account-level-analysis/ |
| Revenue Tracking | https://www.docs.developers.amplitude.com/analytics/revenue-tracking/ |

---

## 📎 Event Naming Convention

| Pattern | Example | Description |
|---------|---------|-------------|
| ActionObject | UserSignedUp | User performed action on object |
| ObjectAction | CheckoutCompleted | Object transitioned to state |
| FeatureUsed | FeatureUsed | Generic feature usage pattern |

**Properties:**
- Use camelCase: `signupMethod`, `totalValue`
- Booleans: `isFirstPurchase`, `isSuccessful`
- Numeric: `price`, `itemCount`, `usageDurationSeconds`
- Dates/Times: ISO 8601 strings: `"2024-01-15T10:30:00Z"`
- IDs: `productId`, `orderId`, `userId`

---

## 📎 User Property Operations

| Operation | Use Case | Example |
|-----------|----------|---------|
| `$set` | Update mutable properties | `$set: {"emailDomain": "gmail.com"}` |
| `$setOnce` | Set only once (first touch) | `$setOnce: {"signupDate": "..."}` |
| `$add` | Increment numeric counter | `$add: {"loginCount": 1}` |
| `$append` | Add to list property | `$append: {"viewedProducts": "Premium"}` |
| `$unset` | Remove property | `$unset: {"tempProperty": "-"}` |

---

## 📎 Session ID Rules

- Session ID = Unix timestamp in milliseconds when session starts
- A session expires after 5 minutes (300000ms) of inactivity
- New session ID = new session
- `session_id = -1` means explicitly out of session
- Events without `session_id` are not grouped into sessions
- Session ID should be same for all events in a user's visit
