---




name: segment-api
description: Implements Segment (CDP) integration (track, identify, group, page, screen,
  alias) using analytics-python SDK with event batching, user traits, group traits,
  page properties, Segment Spec compliance, and HTTP API fallback patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: segment, cdp, customer data platform, segment track identify, segment
    spec, how do i integrate segment tracking, rudderstack, customer data infrastructure
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
  related-skills: coding-amplitude-api, coding-mixpanel-api, coding-hubspot-api




---




# Segment CDP Integration

Implements production-grade Segment (Customer Data Platform) integration using the `analytics-python` SDK. When loaded, this skill makes the model implement Segment Spec-compliant tracking: `track()` for events, `identify()` for user traits, `group()` for account-level properties, `page()`/`screen()` for views, `alias()` for identity linking. All implementations follow Segment best practices: use `WRITE_KEY` from environment, batch events with configurable flush, use anonymousId for logged-out users, userId for authenticated users, implement context fields for device/channel info, and always include required fields from the Segment Spec.

## TL;DR Checklist

- [ ] Use `analytics-python` SDK with `SEGMENT_WRITE_KEY` from environment variable
- [ ] Initialize `analytics.write_key = WRITE_KEY` and configure `analytics.debug`
- [ ] Use `anonymousId` for logged-out users (UUID), `userId` for authenticated users
- [ ] Always include either `anonymousId` OR `userId` in every call
- [ ] Follow Segment Spec: `track()`, `identify()`, `group()`, `page()`, `alias()`
- [ ] Use `properties` dict for `track()` and `page()`, `traits` dict for `identify()` and `group()`
- [ ] Include `context` dict for device, channel, app, location info when available
- [ ] Use `timestamp` (ISO 8601 or datetime object) for historical backfill
- [ ] Set `flush_at` (batch size) and `flush_interval` (seconds) appropriately
- [ ] Call `analytics.flush()` explicitly before application shutdown

---

## When to Use

Use this skill when:

- Implementing a Customer Data Platform (CDP) for unified tracking
- Routing user data to multiple tools (Amplitude, Mixpanel, HubSpot, Salesforce)
- Building server-side tracking for Segment or RudderStack
- Implementing Segment Spec-compliant event tracking
- Managing user identity across anonymous and authenticated states
- Tracking page/screen views with rich properties
- Implementing account-based (B2B) tracking with `group()`
- Importing historical data with proper timestamps
- Building a data layer that feeds multiple analytics/marketing tools

---

## When NOT to Use

- For direct Amplitude tracking only — use `coding-amplitude-api` instead
- For direct Mixpanel tracking only — use `coding-mixpanel-api` instead
- For simple single-tool tracking (Segment adds complexity)
- When you need real-time event streaming (Segment has near-real-time)
- For error/exception tracking — use `coding-sentry-api`
- For server-side logging only — use logging libraries

---

## Core Workflow

1. **Initialize SDK** — Set `analytics.write_key = WRITE_KEY` from `SEGMENT_WRITE_KEY` environment variable. Configure optional: `analytics.debug = True/False`, `analytics.on_error = handler`, `analytics.flush_at`, `analytics.flush_interval`. **Checkpoint:** Validate with a test `identify()` or `track()` call and verify in debugger.

2. **Define Identity Strategy** — Handle user identity lifecycle:
   - Anonymous: Generate UUID `anonymousId` on first visit
   - At signup/login: Keep `anonymousId`, add `userId`, call `alias(userId, anonymousId)`
   - Authenticated: Use `userId` as primary identifier
   - At logout: Generate new `anonymousId`
   
   **Checkpoint:** Every call has exactly one identifier: `anonymousId` OR `userId` (or both).

3. **Implement Segment Spec Calls** — Use the 5 core methods:
   - `identify(userId, traits, context)`: Update user profile traits
   - `track(userId/anonymousId, event, properties, context)`: Track events
   - `group(userId/anonymousId, groupId, traits, context)`: Account-level properties
   - `page(userId/anonymousId, category, name, properties, context)`: Web page views
   - `screen(userId/anonymousId, category, name, properties, context)`: Mobile screens
   - `alias(newId, previousId)`: Link two identities
   
   **Checkpoint:** Every method call follows Segment Spec argument order and field naming.

4. **Add Context & Metadata** — Include `context` dict when available:
   - `context.device`: Device info (id, manufacturer, model)
   - `context.app`: App info (name, version, build)
   - `context.channel`: "server", "browser", "mobile"
   - `context.ip`: IP address for geolocation
   - `context.locale`: User locale
   - `context.userAgent`: Browser user agent
   - `context.page`: Current page info (url, path, referrer)
   
   **Checkpoint:** Context fields follow Segment Spec naming conventions.

5. **Handle Batching & Flush** — Configure:
   - `flush_at`: Batch size (default 15, adjust for volume)
   - `flush_interval`: Seconds between flushes (default 10)
   - Call `analytics.flush()` explicitly at shutdown
   - Implement error handler with `analytics.on_error = handler`
   
   **Checkpoint:** Application explicitly flushes before exit; errors are caught and logged.

---

## Implementation Patterns

### Pattern 1: Segment SDK Initialization (BAD vs GOOD)

```python
"""Segment SDK initialization patterns.

Key concepts:
- WRITE_KEY: Project write key (public, not secret)
- Batch events by default (15 events per batch)
- Async flushing by default
- On_error handler for failed deliveries

Important: Segment SDK for Python is called 'analytics-python' on PyPI,
and the import is 'analytics' (not 'segment').
"""

from __future__ import annotations

import os
import json
import logging
from typing import Any, Optional, Dict, List, Callable
from datetime import datetime, timezone
from uuid import uuid4
from dataclasses import dataclass, field

import analytics  # from 'analytics-python' package

logger = logging.getLogger(__name__)


# ===================================================================
# ❌ BAD — hardcoded key, no error handler, no shutdown flush
# ===================================================================

def bad_segment_init_bad() -> None:
    """❌ BAD: Don't do any of these things."""
    
    # ❌ Hardcoded write key! Never commit this!
    analytics.write_key = "abcdef1234567890abcdef1234567890"
    
    # ❌ No error handler - failed deliveries are silent
    # ❌ No explicit flush at shutdown
    # ❌ Using generic event names
    analytics.track(
        user_id="user-123",
        event="click",  # ❌ Too generic
        properties={
            "button_name": "signup",  # ❌ snake_case instead of camelCase
        },
        # ❌ Missing context
    )


# ===================================================================
# ✅ GOOD — env-based config, error handling, graceful shutdown
# ===================================================================


class SegmentError(Exception):
    """Base exception for Segment integration errors."""
    pass


class SegmentConfigError(SegmentError):
    """Configuration is invalid or missing."""
    pass


@dataclass
class SegmentConfig:
    """Segment configuration from environment variables.
    
    Environment variables:
        SEGMENT_WRITE_KEY: Segment project write key (required)
        SEGMENT_DEBUG: Enable debug mode (1/0)
        SEGMENT_FLUSH_AT: Batch size (events per flush)
        SEGMENT_FLUSH_INTERVAL: Flush interval in seconds
    """
    
    write_key: Optional[str] = None
    debug: bool = False
    flush_at: int = 15
    flush_interval: float = 10.0
    gzip: bool = True
    sync_mode: bool = False
    
    @classmethod
    def from_env(cls) -> "SegmentConfig":
        """Load configuration from environment variables."""
        
        def parse_bool(env_var: str, default: bool) -> bool:
            val = os.environ.get(env_var)
            if val is None:
                return default
            return val.lower() in ("1", "true", "yes", "on")
        
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
            write_key=os.environ.get("SEGMENT_WRITE_KEY"),
            debug=parse_bool("SEGMENT_DEBUG", False),
            flush_at=parse_int("SEGMENT_FLUSH_AT", 15),
            flush_interval=parse_float("SEGMENT_FLUSH_INTERVAL", 10.0),
            gzip=parse_bool("SEGMENT_GZIP", True),
            sync_mode=parse_bool("SEGMENT_SYNC_MODE", False),
        )
    
    def is_enabled(self) -> bool:
        """Check if Segment should be enabled."""
        if not self.write_key:
            return False
        
        # Check for explicit disable
        if os.environ.get("SEGMENT_DISABLED") == "1":
            return False
        
        # Disable in test environment unless explicitly enabled
        env = os.environ.get("ENV", "").lower()
        if env in ("test", "testing", "local"):
            if os.environ.get("SEGMENT_FORCE_ENABLE") != "1":
                return False
        
        return True
    
    def validate(self) -> bool:
        """Validate configuration.
        
        Returns:
            True if valid
            
        Raises:
            SegmentConfigError: If invalid when enabled
        """
        if not self.is_enabled():
            logger.info("Segment disabled by configuration")
            return True
        
        if not self.write_key:
            raise SegmentConfigError("SEGMENT_WRITE_KEY is required when enabled")
        
        if self.flush_at < 1 or self.flush_at > 1000:
            raise SegmentConfigError(f"flush_at must be 1-1000, got {self.flush_at}")
        
        if self.flush_interval < 0.1:
            raise SegmentConfigError(f"flush_interval must be >= 0.1s, got {self.flush_interval}")
        
        return True


class SegmentClient:
    """Production-grade Segment client with lifecycle management.
    
    Features:
    - Configurable batching
    - Error handling
    - Graceful shutdown with flush
    - Identity management helpers
    - Context building
    """
    
    def __init__(self, config: SegmentConfig) -> None:
        self._config = config
        self._is_initialized = False
        self._shutdown_hooks: List[Callable[[], None]] = []
    
    def initialize(self) -> "SegmentClient":
        """Initialize the Segment SDK.
        
        Call this once at application startup.
        """
        if self._is_initialized:
            return self
        
        if not self._config.is_enabled():
            logger.info("Segment disabled - using no-op mode")
            self._is_initialized = True
            return self
        
        # Validate config
        self._config.validate()
        
        # Configure analytics SDK
        analytics.write_key = self._config.write_key
        analytics.debug = self._config.debug
        analytics.flush_at = self._config.flush_at
        analytics.flush_interval = self._config.flush_interval
        analytics.gzip = self._config.gzip
        analytics.sync_mode = self._config.sync_mode
        
        # Set error handler
        analytics.on_error = self._handle_error
        
        self._is_initialized = True
        
        logger.info(
            "Segment initialized: flush_at=%d, flush_interval=%.1fs, gzip=%s",
            self._config.flush_at,
            self._config.flush_interval,
            self._config.gzip,
        )
        
        return self
    
    def shutdown(self, flush: bool = True) -> None:
        """Shutdown the client and optionally flush remaining events.
        
        Call this at application shutdown.
        
        Args:
            flush: If True, flush all buffered events
        """
        if not self._is_initialized:
            return
        
        # Run shutdown hooks
        for hook in self._shutdown_hooks:
            try:
                hook()
            except Exception as e:
                logger.warning("Shutdown hook failed: %s", e)
        
        # Flush remaining events
        if flush and self._config.is_enabled():
            logger.info("Flushing remaining Segment events...")
            analytics.flush()
            logger.info("Segment flush complete")
        
        self._is_initialized = False
        logger.info("Segment client shut down")
    
    def _handle_error(self, exception: Exception, batch: List[Dict[str, Any]]) -> None:
        """Handle failed delivery.
        
        Args:
            exception: The exception that occurred
            batch: The batch of events that failed
        """
        logger.error(
            "Segment delivery failed: %s, batch_size=%d",
            exception,
            len(batch),
        )
    
    def add_shutdown_hook(self, hook: Callable[[], None]) -> None:
        """Add a hook to be called at shutdown.
        
        Args:
            hook: Callable to execute
        """
        self._shutdown_hooks.append(hook)
    
    # ===================================================================
    # Core Segment Spec Methods
    # ===================================================================
    
    def identify(
        self,
        user_id: Optional[str] = None,
        anonymous_id: Optional[str] = None,
        traits: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None,
    ) -> None:
        """Identify a user and set their traits.
        
        Call when:
        - User signs up
        - User logs in
        - User updates their profile
        - Periodically to sync user traits
        
        Args:
            user_id: Your internal user identifier
            anonymous_id: Anonymous identifier (if no user_id)
            traits: User properties (name, email, plan, etc.)
            context: Context about the call
            timestamp: Historical timestamp (for backfill)
        """
        if not self._is_initialized:
            return
        
        if not self._config.is_enabled():
            return
        
        if not user_id and not anonymous_id:
            logger.warning("Segment identify called without user_id or anonymous_id")
            return
        
        # Build kwargs
        kwargs: Dict[str, Any] = {}
        
        if user_id:
            kwargs["user_id"] = str(user_id)
        if anonymous_id:
            kwargs["anonymous_id"] = str(anonymous_id)
        if traits:
            kwargs["traits"] = self._sanitize_traits(traits)
        if context:
            kwargs["context"] = context
        if timestamp:
            kwargs["timestamp"] = self._format_timestamp(timestamp)
        
        analytics.identify(**kwargs)
        logger.debug("Segment identify: user_id=%s, traits_keys=%s",
                    user_id, list(traits.keys()) if traits else [])
    
    def track(
        self,
        event: str,
        user_id: Optional[str] = None,
        anonymous_id: Optional[str] = None,
        properties: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None,
    ) -> None:
        """Track an event.
        
        Call when:
        - User performs an action
        - User views something important
        - System state changes
        
        Args:
            event: Event name (PascalCase: "User Signed Up", "Checkout Completed")
            user_id: User identifier
            anonymous_id: Anonymous identifier
            properties: Event-specific properties
            context: Context about the call
            timestamp: Historical timestamp
        """
        if not self._is_initialized:
            return
        
        if not self._config.is_enabled():
            return
        
        if not event:
            logger.warning("Segment track called without event name")
            return
        
        if not user_id and not anonymous_id:
            logger.warning("Segment track called without user_id or anonymous_id")
            return
        
        kwargs: Dict[str, Any] = {"event": event}
        
        if user_id:
            kwargs["user_id"] = str(user_id)
        if anonymous_id:
            kwargs["anonymous_id"] = str(anonymous_id)
        if properties:
            kwargs["properties"] = self._sanitize_properties(properties)
        if context:
            kwargs["context"] = context
        if timestamp:
            kwargs["timestamp"] = self._format_timestamp(timestamp)
        
        analytics.track(**kwargs)
        logger.debug("Segment track: event=%s, user_id=%s", event, user_id)
    
    def group(
        self,
        group_id: str,
        user_id: Optional[str] = None,
        anonymous_id: Optional[str] = None,
        traits: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None,
    ) -> None:
        """Associate a user with a group (account, company, team).
        
        Use for B2B analytics:
        - Link user to their company
        - Set company-level properties
        - Build account-based funnels
        
        Args:
            group_id: Account/company/team identifier
            user_id: User identifier
            anonymous_id: Anonymous identifier
            traits: Group properties (name, plan, employeeCount, etc.)
            context: Context about the call
            timestamp: Historical timestamp
        """
        if not self._is_initialized:
            return
        
        if not self._config.is_enabled():
            return
        
        if not group_id:
            logger.warning("Segment group called without group_id")
            return
        
        if not user_id and not anonymous_id:
            logger.warning("Segment group called without user_id or anonymous_id")
            return
        
        kwargs: Dict[str, Any] = {"group_id": str(group_id)}
        
        if user_id:
            kwargs["user_id"] = str(user_id)
        if anonymous_id:
            kwargs["anonymous_id"] = str(anonymous_id)
        if traits:
            kwargs["traits"] = self._sanitize_traits(traits)
        if context:
            kwargs["context"] = context
        if timestamp:
            kwargs["timestamp"] = self._format_timestamp(timestamp)
        
        analytics.group(**kwargs)
        logger.debug("Segment group: group_id=%s, user_id=%s", group_id, user_id)
    
    def page(
        self,
        name: Optional[str] = None,
        category: Optional[str] = None,
        user_id: Optional[str] = None,
        anonymous_id: Optional[str] = None,
        properties: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None,
    ) -> None:
        """Track a page view (web).
        
        Call when:
        - User navigates to a page
        - Single-page app route changes
        
        Args:
            name: Page name (e.g., "Checkout", "Dashboard")
            category: Page category (e.g., "Billing", "Marketing")
            user_id: User identifier
            anonymous_id: Anonymous identifier
            properties: Page properties (url, path, title, referrer)
            context: Context about the call
            timestamp: Historical timestamp
        """
        if not self._is_initialized:
            return
        
        if not self._config.is_enabled():
            return
        
        if not user_id and not anonymous_id:
            logger.warning("Segment page called without user_id or anonymous_id")
            return
        
        kwargs: Dict[str, Any] = {}
        
        if user_id:
            kwargs["user_id"] = str(user_id)
        if anonymous_id:
            kwargs["anonymous_id"] = str(anonymous_id)
        if category:
            kwargs["category"] = category
        if name:
            kwargs["name"] = name
        if properties:
            kwargs["properties"] = self._sanitize_properties(properties)
        if context:
            kwargs["context"] = context
        if timestamp:
            kwargs["timestamp"] = self._format_timestamp(timestamp)
        
        analytics.page(**kwargs)
        logger.debug("Segment page: name=%s, category=%s, user_id=%s", name, category, user_id)
    
    def screen(
        self,
        name: Optional[str] = None,
        category: Optional[str] = None,
        user_id: Optional[str] = None,
        anonymous_id: Optional[str] = None,
        properties: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None,
    ) -> None:
        """Track a screen view (mobile).
        
        Mobile equivalent of page().
        
        Args:
            name: Screen name
            category: Screen category
            user_id: User identifier
            anonymous_id: Anonymous identifier
            properties: Screen properties
            context: Context about the call
            timestamp: Historical timestamp
        """
        if not self._is_initialized:
            return
        
        if not self._config.is_enabled():
            return
        
        if not user_id and not anonymous_id:
            logger.warning("Segment screen called without user_id or anonymous_id")
            return
        
        kwargs: Dict[str, Any] = {}
        
        if user_id:
            kwargs["user_id"] = str(user_id)
        if anonymous_id:
            kwargs["anonymous_id"] = str(anonymous_id)
        if category:
            kwargs["category"] = category
        if name:
            kwargs["name"] = name
        if properties:
            kwargs["properties"] = self._sanitize_properties(properties)
        if context:
            kwargs["context"] = context
        if timestamp:
            kwargs["timestamp"] = self._format_timestamp(timestamp)
        
        analytics.screen(**kwargs)
        logger.debug("Segment screen: name=%s, user_id=%s", name, user_id)
    
    def alias(
        self,
        user_id: str,
        previous_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None,
    ) -> None:
        """Link two user identities.
        
        Call when:
        - Anonymous user signs up (link anonymousId to userId)
        - User merges accounts
        
        Important:
        - In most SDKs, alias() takes (new_id, previous_id)
        - The new_id becomes the canonical identifier
        
        Args:
            user_id: The new canonical user identifier
            previous_id: The previous identifier (anonymousId or old userId)
            context: Context about the call
            timestamp: Historical timestamp
        """
        if not self._is_initialized:
            return
        
        if not self._config.is_enabled():
            return
        
        if not user_id:
            logger.warning("Segment alias called without user_id")
            return
        
        kwargs: Dict[str, Any] = {"user_id": str(user_id)}
        
        if previous_id:
            kwargs["previous_id"] = str(previous_id)
        if context:
            kwargs["context"] = context
        if timestamp:
            kwargs["timestamp"] = self._format_timestamp(timestamp)
        
        analytics.alias(**kwargs)
        logger.info("Segment alias: user_id=%s, previous_id=%s", user_id, previous_id)
    
    def flush(self) -> None:
        """Flush all buffered events."""
        if self._config.is_enabled():
            analytics.flush()
    
    # ===================================================================
    # Helpers
    # ===================================================================
    
    @staticmethod
    def generate_anonymous_id() -> str:
        """Generate a new anonymous ID (UUID).
        
        Call at first visit or after logout.
        
        Returns:
            UUID string for anonymous tracking
        """
        return str(uuid4())
    
    @staticmethod
    def build_context(
        channel: Optional[str] = "server",
        app_name: Optional[str] = None,
        app_version: Optional[str] = None,
        ip_address: Optional[str] = None,
        locale: Optional[str] = None,
        user_agent: Optional[str] = None,
        page_url: Optional[str] = None,
        page_path: Optional[str] = None,
        page_referrer: Optional[str] = None,
        device_id: Optional[str] = None,
        device_model: Optional[str] = None,
        device_manufacturer: Optional[str] = None,
        **additional: Any,
    ) -> Dict[str, Any]:
        """Build a Segment context dict.
        
        Context provides additional metadata about the call.
        
        Args:
            channel: "server", "browser", "mobile"
            app_name: Application name
            app_version: Application version
            ip_address: IP address for geolocation
            locale: User locale (e.g., "en-US")
            user_agent: Browser user agent
            page_url: Full page URL
            page_path: Page path
            page_referrer: Referrer URL
            device_id: Device identifier
            device_model: Device model
            device_manufacturer: Device manufacturer
            **additional: Additional context fields
        
        Returns:
            Context dict for Segment calls
        """
        context: Dict[str, Any] = {"channel": channel or "server"}
        
        if app_name or app_version:
            context["app"] = {}
            if app_name:
                context["app"]["name"] = app_name
            if app_version:
                context["app"]["version"] = app_version
        
        if ip_address:
            context["ip"] = ip_address
        
        if locale:
            context["locale"] = locale
        
        if user_agent:
            context["userAgent"] = user_agent
        
        if page_url or page_path or page_referrer:
            context["page"] = {}
            if page_url:
                context["page"]["url"] = page_url
            if page_path:
                context["page"]["path"] = page_path
            if page_referrer:
                context["page"]["referrer"] = page_referrer
        
        if device_id or device_model or device_manufacturer:
            context["device"] = {}
            if device_id:
                context["device"]["id"] = device_id
            if device_model:
                context["device"]["model"] = device_model
            if device_manufacturer:
                context["device"]["manufacturer"] = device_manufacturer
        
        # Add additional fields
        context.update(additional)
        
        return context
    
    def _sanitize_properties(self, properties: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize properties for Segment.
        
        Segment supports: string, number, boolean, list, None
        Nested objects are OK but flatten when possible.
        """
        result: Dict[str, Any] = {}
        
        for key, value in properties.items():
            if isinstance(value, (str, int, float, bool, type(None))):
                result[key] = value
            elif isinstance(value, list):
                result[key] = [
                    self._sanitize_value(v) if isinstance(v, dict) else v
                    for v in value
                ]
            elif isinstance(value, dict):
                # Nested objects are OK, but stringify if too large
                json_str = json.dumps(value)
                if len(json_str) < 1000:
                    result[key] = value
                else:
                    result[key] = "[object]"  # Too large
            else:
                result[key] = str(value)
        
        return result
    
    def _sanitize_traits(self, traits: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize user/group traits.
        
        Same as properties but with specific trait handling.
        """
        return self._sanitize_properties(traits)
    
    def _sanitize_value(self, value: Any) -> Any:
        """Sanitize a single value."""
        if isinstance(value, dict):
            return self._sanitize_properties(value)
        return value
    
    def _format_timestamp(self, dt: datetime) -> datetime:
        """Format timestamp for Segment.
        
        Segment SDK accepts datetime objects directly.
        Ensure timezone-aware.
        """
        if dt.tzinfo is None:
            # Naive datetime - assume UTC
            return dt.replace(tzinfo=timezone.utc)
        return dt


# Global client (lazy-loaded)
_global_client: Optional[SegmentClient] = None


def get_segment_client() -> SegmentClient:
    """Get or create global SegmentClient."""
    global _global_client
    if _global_client is None:
        config = SegmentConfig.from_env()
        _global_client = SegmentClient(config)
        if config.is_enabled():
            _global_client.initialize()
    return _global_client
```

### Pattern 2: Identity Management & Standard Events

```python
"""Identity management lifecycle and standard Segment events.

Identity lifecycle:
1. Anonymous visit → generate anonymousId
2. User signs up → alias(userId, anonymousId)
3. User logs in → use userId, sync traits with identify()
4. User logs out → generate new anonymousId

Standard event patterns follow Segment Spec conventions.
"""

from __future__ import annotations

import logging
from typing import Any, Optional, Dict
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

logger = logging.getLogger(__name__)


class IdentityManager:
    """Manages user identity for Segment tracking.
    
    Handles the complete identity lifecycle:
    - Anonymous device ID generation
    - Alias at signup/login
    - Logout with new anonymous ID
    - Traits synchronization
    """
    
    def __init__(self, client: Any) -> None:
        self._client = client
        self._user_id: Optional[str] = None
        self._anonymous_id: str = str(uuid4())
        self._is_aliased: bool = False
    
    @property
    def user_id(self) -> Optional[str]:
        """Get current user ID (authenticated users)."""
        return self._user_id
    
    @property
    def anonymous_id(self) -> str:
        """Get current anonymous ID."""
        return self._anonymous_id
    
    @property
    def current_identifier(self) -> str:
        """Get the best identifier to use for tracking.
        
        Returns:
            user_id if authenticated, otherwise anonymous_id
        """
        return self._user_id if self._user_id else self._anonymous_id
    
    def set_anonymous_id(self, anonymous_id: str) -> None:
        """Set existing anonymous ID (from cookie/storage)."""
        self._anonymous_id = anonymous_id
        if not self._user_id:
            logger.info("Restored anonymous_id: %s", anonymous_id)
    
    def generate_new_anonymous_id(self) -> str:
        """Generate a new anonymous ID.
        
        Call at first visit or after logout.
        
        Returns:
            New UUID
        """
        self._anonymous_id = str(uuid4())
        self._user_id = None
        self._is_aliased = False
        logger.info("Generated new anonymous_id: %s", self._anonymous_id)
        return self._anonymous_id
    
    def signup(
        self,
        user_id: str,
        traits: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Handle user signup.
        
        1. Call alias() to link anonymousId to userId
        2. Call identify() to set user traits
        3. Track "User Signed Up" event
        
        Args:
            user_id: Your internal user identifier
            traits: User properties
            context: Context dict
        """
        previous_id = self._anonymous_id
        
        # Only alias if we haven't already aliased this pair
        if not self._is_aliased:
            self._client.alias(
                user_id=user_id,
                previous_id=previous_id,
                context=context,
            )
            self._is_aliased = True
            logger.info("Aliased anonymous_id=%s to user_id=%s", previous_id, user_id)
        
        # Set current user
        self._user_id = user_id
        
        # Identify the user with traits
        if traits:
            # First-touch traits via set_once pattern
            # In Segment, identify() sets traits that can be updated
            # For first-touch only, use traits that you only set at signup
            self._client.identify(
                user_id=user_id,
                traits=traits,
                context=context,
            )
        
        # Track signup event
        self._client.track(
            event="User Signed Up",
            user_id=user_id,
            properties={
                "signupMethod": traits.get("signupMethod") if traits else None,
                "referralCode": traits.get("referralCode") if traits else None,
            },
            context=context,
        )
    
    def login(
        self,
        user_id: str,
        traits: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
        perform_alias: bool = False,
    ) -> None:
        """Handle user login.
        
        Args:
            user_id: Your internal user identifier
            traits: User properties to update
            context: Context dict
            perform_alias: Whether to call alias() (use False if already done at signup)
        """
        previous_id = self._user_id or self._anonymous_id
        
        if perform_alias and not self._is_aliased:
            self._client.alias(
                user_id=user_id,
                previous_id=previous_id,
                context=context,
            )
            self._is_aliased = True
        
        self._user_id = user_id
        
        # Update traits
        login_traits = dict(traits or {})
        login_traits["lastLoginDate"] = datetime.now(timezone.utc).isoformat()
        
        # Increment login count (if tracking)
        # Note: Segment doesn't have increment via identify - use your own tracking
        
        self._client.identify(
            user_id=user_id,
            traits=login_traits,
            context=context,
        )
        
        # Track login event
        self._client.track(
            event="User Logged In",
            user_id=user_id,
            properties={
                "loginMethod": login_traits.get("loginMethod"),
                "isNewDevice": login_traits.get("isNewDevice"),
            },
            context=context,
        )
    
    def logout(
        self,
        context: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Handle user logout.
        
        1. Track "User Logged Out" event
        2. Update user traits (isLoggedIn = false)
        3. Generate new anonymous ID
        """
        if self._user_id:
            # Track logout event
            self._client.track(
                event="User Logged Out",
                user_id=self._user_id,
                properties={
                    "logoutDate": datetime.now(timezone.utc).isoformat(),
                },
                context=context,
            )
            
            # Update traits
            self._client.identify(
                user_id=self._user_id,
                traits={
                    "isLoggedIn": False,
                    "lastLogoutDate": datetime.now(timezone.utc).isoformat(),
                },
                context=context,
            )
        
        # Generate new anonymous identity
        self.generate_new_anonymous_id()


class StandardEvents:
    """Standard Segment Spec-compliant events.
    
    These follow Segment's Digital Analytics Specification and B2B SaaS spec.
    
    Event naming: "Title Case With Spaces"
    Properties: camelCase
    
    Reference: https://segment.com/docs/spec/
    """
    
    @staticmethod
    def track_user_signed_up(
        client: Any,
        user_id: str,
        signup_method: str,
        referral_code: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        **properties: Any,
    ) -> None:
        """Track "User Signed Up" event.
        
        Fires when a user completes the signup form and creates an account.
        
        Spec: https://segment.com/docs/spec/lifecycle/#user-signed-up
        """
        props: Dict[str, Any] = {
            "signupMethod": signup_method,
        }
        
        if referral_code:
            props["referralCode"] = referral_code
        
        props.update(properties)
        
        client.track(
            event="User Signed Up",
            user_id=user_id,
            properties=props,
            context=context,
        )
    
    @staticmethod
    def track_user_logged_in(
        client: Any,
        user_id: str,
        login_method: str,
        is_new_device: bool = False,
        context: Optional[Dict[str, Any]] = None,
        **properties: Any,
    ) -> None:
        """Track "User Logged In" event.
        
        Spec: https://segment.com/docs/spec/lifecycle/#user-logged-in
        """
        props: Dict[str, Any] = {
            "loginMethod": login_method,
            "isNewDevice": is_new_device,
        }
        props.update(properties)
        
        client.track(
            event="User Logged In",
            user_id=user_id,
            properties=props,
            context=context,
        )
    
    @staticmethod
    def track_user_logged_out(
        client: Any,
        user_id: str,
        context: Optional[Dict[str, Any]] = None,
        **properties: Any,
    ) -> None:
        """Track "User Logged Out" event."""
        client.track(
            event="User Logged Out",
            user_id=user_id,
            properties=properties,
            context=context,
        )
    
    @staticmethod
    def track_product_viewed(
        client: Any,
        user_id: str,
        product_id: str,
        product_name: str,
        product_sku: Optional[str] = None,
        category: Optional[str] = None,
        price: Optional[float] = None,
        currency: str = "USD",
        context: Optional[Dict[str, Any]] = None,
        **properties: Any,
    ) -> None:
        """Track "Product Viewed" event.
        
        Fires when a user views a product detail page.
        
        Spec: https://segment.com/docs/spec/ecommerce/#product-viewed
        """
        props: Dict[str, Any] = {
            "productId": product_id,
            "name": product_name,
        }
        
        if product_sku:
            props["sku"] = product_sku
        if category:
            props["category"] = category
        if price is not None:
            props["price"] = price
            props["currency"] = currency
        
        props.update(properties)
        
        client.track(
            event="Product Viewed",
            user_id=user_id,
            properties=props,
            context=context,
        )
    
    @staticmethod
    def track_checkout_started(
        client: Any,
        user_id: str,
        order_id: Optional[str] = None,
        total: Optional[float] = None,
        currency: str = "USD",
        item_count: Optional[int] = None,
        coupon: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        **properties: Any,
    ) -> None:
        """Track "Checkout Started" event.
        
        Fires when a user begins the checkout process.
        
        Spec: https://segment.com/docs/spec/ecommerce/#checkout-started
        """
        props: Dict[str, Any] = {}
        
        if order_id:
            props["orderId"] = order_id
        if total is not None:
            props["total"] = total
            props["currency"] = currency
        if item_count:
            props["itemCount"] = item_count
        if coupon:
            props["coupon"] = coupon
        
        props.update(properties)
        
        client.track(
            event="Checkout Started",
            user_id=user_id,
            properties=props,
            context=context,
        )
    
    @staticmethod
    def track_checkout_completed(
        client: Any,
        user_id: str,
        order_id: str,
        total: float,
        currency: str = "USD",
        item_count: Optional[int] = None,
        coupon: Optional[str] = None,
        discount: Optional[float] = None,
        payment_method: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        **properties: Any,
    ) -> None:
        """Track "Checkout Completed" event.
        
        Fires when a user successfully completes a purchase.
        
        Spec: https://segment.com/docs/spec/ecommerce/#checkout-completed
        """
        props: Dict[str, Any] = {
            "orderId": order_id,
            "total": total,
            "currency": currency,
        }
        
        if item_count:
            props["itemCount"] = item_count
        if coupon:
            props["coupon"] = coupon
        if discount is not None:
            props["discount"] = discount
        if payment_method:
            props["paymentMethod"] = payment_method
        
        props.update(properties)
        
        client.track(
            event="Checkout Completed",
            user_id=user_id,
            properties=props,
            context=context,
        )
        
        # Also update user LTV traits
        client.identify(
            user_id=user_id,
            traits={
                "lastPurchaseDate": datetime.now(timezone.utc).isoformat(),
                "lastPurchaseValue": total,
                # Note: totalSpend and orderCount would need to be tracked separately
                # since Segment identify() doesn't support increment operations
            },
            context=context,
        )
    
    @staticmethod
    def track_feature_used(
        client: Any,
        user_id: str,
        feature_name: str,
        feature_module: Optional[str] = None,
        usage_duration_seconds: Optional[int] = None,
        is_successful: bool = True,
        error_type: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        **properties: Any,
    ) -> None:
        """Track "Feature Used" event.
        
        For B2B SaaS product adoption tracking.
        """
        props: Dict[str, Any] = {
            "featureName": feature_name,
            "isSuccessful": is_successful,
        }
        
        if feature_module:
            props["featureModule"] = feature_module
        if usage_duration_seconds is not None:
            props["usageDurationSeconds"] = usage_duration_seconds
        if error_type:
            props["errorType"] = error_type
        
        props.update(properties)
        
        client.track(
            event="Feature Used",
            user_id=user_id,
            properties=props,
            context=context,
        )
    
    @staticmethod
    def track_invite_sent(
        client: Any,
        user_id: str,
        invite_method: str,
        recipient_email: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        **properties: Any,
    ) -> None:
        """Track "Invite Sent" event.
        
        For B2B invitation and team management.
        """
        props: Dict[str, Any] = {
            "inviteMethod": invite_method,
        }
        
        if recipient_email:
            # Note: Be careful about sending PII!
            # Consider hashing email if privacy is a concern
            props["recipientEmailHash"] = hash(recipient_email)
        
        props.update(properties)
        
        client.track(
            event="Invite Sent",
            user_id=user_id,
            properties=props,
            context=context,
        )


# Example complete user journey

def example_user_journey(client: Any) -> None:
    """Example of a complete user journey with Segment."""
    
    identity = IdentityManager(client)
    
    # 1. Anonymous user visits
    anonymous_id = identity.anonymous_id
    
    # Build server context
    context = SegmentClient.build_context(
        channel="server",
        app_name="MyApp",
        app_version="1.2.3",
        locale="en-US",
    )
    
    # Anonymous views product
    StandardEvents.track_product_viewed(
        client=client,
        user_id=None,
        anonymous_id=anonymous_id,
        product_id="prod-premium",
        product_name="Premium Subscription",
        category="Subscriptions",
        price=99.99,
        context=context,
    )
    
    # Also track page view
    client.page(
        name="Premium Pricing",
        category="Pricing",
        anonymous_id=anonymous_id,
        properties={
            "url": "https://example.com/pricing",
            "path": "/pricing",
            "referrer": "https://google.com",
        },
        context=context,
    )
    
    # 2. User signs up
    user_id = "user-abc123"
    
    identity.signup(
        user_id=user_id,
        traits={
            "email": "user@example.com",
            "name": "Test User",
            "signupMethod": "email",
            "marketingOptIn": True,
            "signupDate": datetime.now(timezone.utc).isoformat(),
            "isLoggedIn": True,
        },
        context=context,
    )
    
    # 3. User starts checkout
    StandardEvents.track_checkout_started(
        client=client,
        user_id=user_id,
        total=99.99,
        item_count=1,
        context=context,
    )
    
    # 4. User completes checkout
    StandardEvents.track_checkout_completed(
        client=client,
        user_id=user_id,
        order_id="order-xyz789",
        total=99.99,
        item_count=1,
        payment_method="credit_card",
        context=context,
    )
    
    # 5. User logs out later
    identity.logout(context=context)
    
    # 6. Flush events
    client.flush()
```

---

## Constraints

### MUST DO

- Always include either `anonymousId` OR `userId` in every call
- Use `analytics.write_key = WRITE_KEY` to initialize SDK
- Call `analytics.flush()` explicitly at application shutdown
- Implement `analytics.on_error` handler for failed deliveries
- Use `anonymousId` (UUID) for logged-out users
- Call `alias()` when anonymous user signs up or logs in for the first time
- Use `track()` for events, `identify()` for user traits, `group()` for account traits
- Use `page()` for web page views, `screen()` for mobile app screens
- Follow Segment Spec for event naming ("Title Case With Spaces")
- Use camelCase for property and trait names
- Include `context.channel` to identify call origin (server, browser, mobile)

### MUST NOT DO

- NEVER hardcode `SEGMENT_WRITE_KEY` in source code
- NEVER mix `userId` and `anonymousId` incorrectly without calling `alias()`
- NEVER skip calling `alias()` when linking anonymous to authenticated identity
- NEVER call `alias()` more than once per identity pair
- NEVER use empty or generic event names like "event" or "click"
- NEVER send PII without explicit user consent and privacy policy
- NEVER nest objects deeper than necessary (flatten when possible)
- NEVER use milliseconds for timestamps (Segment SDK accepts datetime objects)
- NEVER forget to flush at shutdown (events can be lost)
- NEVER use snake_case for property names (Segment convention is camelCase)

---

## Output Template

When implementing Segment integrations, produce:

1. **Client Initialization** — `SegmentConfig` + `SegmentClient` with env-based write key
2. **Identity Manager** — `IdentityManager` handling anonymousId, alias at signup/login, logout
3. **Standard Events** — Segment Spec-compliant event methods with proper naming
4. **Context Builder** — `build_context()` for channel, app, page, device context
5. **Core Methods** — `track()`, `identify()`, `group()`, `page()`, `screen()`, `alias()`
6. **Batching & Flush** — Configurable `flush_at` and `flush_interval`, explicit `flush()` at shutdown
7. **Error Handling** — `on_error` handler for failed deliveries

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-amplitude-api` | Amplitude as destination tool |
| `coding-mixpanel-api` | Mixpanel as destination tool |
| `coding-hubspot-api` | HubSpot as marketing destination |
| `coding-salesforce-api` | Salesforce as CRM destination |

---

## Live References

| Resource | URL |
|----------|-----|
| analytics-python (PyPI) | https://pypi.org/project/analytics-python/ |
| Segment Python SDK | https://github.com/segmentio/analytics-python |
| Segment Spec | https://segment.com/docs/spec/ |
| Identify Spec | https://segment.com/docs/spec/identify/ |
| Track Spec | https://segment.com/docs/spec/track/ |
| Group Spec | https://segment.com/docs/spec/group/ |
| Page Spec | https://segment.com/docs/spec/page/ |
| Alias Spec | https://segment.com/docs/spec/alias/ |
| Ecommerce Spec | https://segment.com/docs/spec/ecommerce/ |
| B2B SaaS Spec | https://segment.com/docs/spec/b2b-saas/ |
| Troubleshooting | https://segment.com/docs/sources/server/python/#troubleshooting |

---

## 📎 Segment Spec: 5 Core Methods

| Method | Purpose | Required Fields | Use When |
|--------|---------|-----------------|----------|
| `identify()` | Set/update user traits | userId or anonymousId, traits | User signs up, logs in, updates profile |
| `track()` | Track an action/event | userId or anonymousId, event, properties | User performs any action |
| `group()` | Link user to account/company | userId or anonymousId, groupId, traits | B2B account tracking |
| `page()` | Track web page view | userId or anonymousId | User navigates to page (web) |
| `screen()` | Track mobile screen view | userId or anonymousId | User views screen (mobile) |
| `alias()` | Link two identities | userId, previousId | User signs up (anonymous → authenticated) |

---

## 📎 Property vs Trait

| Type | Used In | Description |
|------|---------|-------------|
| **Properties** | `track()`, `page()`, `screen()` | Event-specific data |
| **Traits** | `identify()`, `group()` | User/group profile attributes |

**Naming Convention:** Both use camelCase.

---

## 📎 Identity Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ANONYMOUS VISIT                           │
├─────────────────────────────────────────────────────────────┤
│  anonymousId = UUID (generate at first visit)                │
│                                                              │
│  Calls:                                                       │
│  - page() / screen() with anonymousId                        │
│  - track() with anonymousId for events                        │
│  - identify() optional (can set anonymous traits)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ User signs up or logs in
┌─────────────────────────────────────────────────────────────┐
│                      CALL ALIAS()                            │
├─────────────────────────────────────────────────────────────┤
│  alias(                                                                        │
│      user_id = "your_internal_user_id",                      │
│      previous_id = anonymousId  (the old UUID)              │
│  )                                                           │
│                                                              │
│  This tells Segment: "All events from anonymousId actually  │
│  belong to userId. Merge their profiles and histories."      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ After alias
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATED USER                        │
├─────────────────────────────────────────────────────────────┤
│  Use userId (your internal ID) for all calls                 │
│                                                              │
│  Calls:                                                       │
│  - identify(userId, traits) → update user profile           │
│  - track(userId, event, properties) → track events          │
│  - group(userId, groupId, traits) → B2B account tracking    │
│  - page()/screen() with userId                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ User logs out
┌─────────────────────────────────────────────────────────────┐
│                    GENERATE NEW anonymousId                   │
├─────────────────────────────────────────────────────────────┤
│  anonymousId = new UUID                                      │
│  userId = None                                               │
│                                                              │
│  Next actions are anonymous, not linked to previous user.    │
└─────────────────────────────────────────────────────────────┘
```

**Important:** Call `alias()` EXACTLY ONCE when a user first signs up.
Calling it multiple times for the same pair causes issues.
