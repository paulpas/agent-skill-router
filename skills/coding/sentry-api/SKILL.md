---
name: sentry-api
description: Implements Sentry API integration (error tracking, performance monitoring, issue management, release tracking, event ingestion) using sentry-sdk Python SDK with error capture, performance tracing, breadcrumbs, issue querying, and release management via Sentry REST API.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: sentry, error tracking, performance monitoring, sentry issues, sentry sdk, exception capture, how do i integrate sentry error tracking, application monitoring
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-datadog-api, coding-grafana-prometheus, coding-pagerduty-api
---

# Sentry API & SDK Integration

Implements production-grade Sentry integration using the `sentry-sdk` Python SDK and Sentry REST API. When loaded, this skill makes the model implement error/exception capture with context, performance tracing for transactions, breadcrumb tracking, issue management via API, release tracking, deploy notifications, and custom event ingestion. All implementations follow Sentry best practices: initialize SDK early, set environment/release/service, use tags consistently, filter sensitive data, configure sampling rates, and validate DSN connectivity on startup.

## TL;DR Checklist

- [ ] Use `sentry-sdk` Python SDK with `SENTRY_DSN` from environment variable
- [ ] Initialize SDK as early as possible in application lifecycle
- [ ] Set mandatory options: `environment`, `release`, `server_name`, `traces_sample_rate`
- [ ] Use `sentry_sdk.init()` with `integrations` for framework auto-instrumentation
- [ ] Add context: `set_user()`, `set_tag()`, `set_context()`, `add_breadcrumb()`
- [ ] Capture exceptions with `capture_exception()`, messages with `capture_message()`
- [ ] Configure `before_send` callback to filter/remove PII and sensitive data
- [ ] Use sampling: `traces_sample_rate` for performance, `sample_rate` for errors
- [ ] REST API uses auth token from `SENTRY_AUTH_TOKEN` env var
- [ ] Never log or expose DSN in error messages or logs

---

## When to Use

Use this skill when:

- Capturing errors and exceptions in Python applications
- Setting up performance monitoring and distributed tracing
- Adding context (user, tags, breadcrumbs) to error events
- Querying and managing issues via Sentry REST API
- Creating and tracking releases with commits
- Sending deploy notifications
- Setting up alert rules programmatically
- Building custom error reporting workflows
- Implementing error sampling and filtering
- Correlating errors with APM performance data

---

## When NOT to Use

- For Datadog full observability — use `coding-datadog-api` instead
- For New Relic APM — use `coding-newrelic-api` instead
- When you need logging only (not error/exception tracking)
- For infrastructure monitoring only (Sentry is application-focused)
- When you need push-based metrics only (Prometheus/Grafana better)

---

## Core Workflow

1. **Initialize SDK** — Call `sentry_sdk.init()` as early as possible with DSN from `SENTRY_DSN` environment variable. Configure integrations for frameworks (Flask, Django, FastAPI, Celery). **Checkpoint:** Verify initialization with test capture or `hub.current_scope`.

2. **Set Context** — Add global and per-event context: user info (`id`, `email`, `username`), tags (`environment`, `version`, `team`), custom context (request data, feature flags), breadcrumbs (events leading to error). **Checkpoint:** Every error has at least `user.id` (or None) and `environment` tag.

3. **Capture Events** — Use `capture_exception()` for exceptions (in except blocks), `capture_message()` for log-style messages, `start_transaction()` for performance spans. Add local context before capture. **Checkpoint:** Exceptions captured in except blocks use `capture_exception()` with current exception.

4. **Filter Sensitive Data** — Implement `before_send` and `before_send_transaction` callbacks to remove PII, credentials, tokens, and sensitive headers. Never send raw passwords, API keys, or personal data. **Checkpoint:** `before_send` explicitly removes or hashes sensitive fields.

5. **Performance & Tracing** — Configure `traces_sample_rate` (0.0 to 1.0). Use `start_transaction()` or decorator `@sentry_sdk.trace()` for custom spans. Auto-instrument HTTP clients, databases, caches. **Checkpoint:** Sampling rate is < 1.0 for production (e.g., 0.1 for 10%).

6. **REST API Operations** — Use Sentry REST API with `SENTRY_AUTH_TOKEN` for: listing issues, resolving/ignoring issues, querying events, creating releases, managing projects. Use pagination for large result sets. **Checkpoint:** All list operations have `limit` parameter.

---

## Implementation Patterns

### Pattern 1: Sentry SDK Initialization (BAD vs GOOD)

```python
"""Sentry SDK initialization patterns.

Key concepts:
- Initialize as EARLY as possible (before app code)
- DSN from environment variable ONLY
- Set environment, release, service name
- Configure integrations for auto-instrumentation
- Use before_send to filter sensitive data
- Use sampling in production

SDK versions:
- sentry-sdk v1+ is current
- Older raven package is deprecated
"""

from __future__ import annotations

import os
import logging
import re
from typing import Any, Optional, Callable
from datetime import datetime, timezone
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ===================================================================
# ❌ BAD — late init, hardcoded DSN, no filtering, no context
# ===================================================================

def bad_sentry_init_bad() -> None:
    """❌ BAD: Don't do any of these things."""
    import sentry_sdk
    
    # ❌ Hardcoded DSN! Never commit this!
    # ❌ Initializing LATE (after app setup - misses early errors)
    # ❌ No environment, no release, no service name
    # ❌ No before_send (PII will be sent)
    # ❌ traces_sample_rate=1.0 (100% sampling - too expensive in prod)
    sentry_sdk.init(
        dsn="https://public@sentry.io/123456",  # ❌ HARDCODED!
        traces_sample_rate=1.0,  # ❌ 100% - too much data in production
        # ❌ No environment
        # ❌ No release
        # ❌ No before_send filter
    )


# ===================================================================
# ✅ GOOD — early init, env-based, filtering, proper context
# ===================================================================


@dataclass
class SentryConfig:
    """Sentry configuration from environment variables.
    
    Environment variables:
        SENTRY_DSN: Data Source Name (required for SDK)
        SENTRY_ENVIRONMENT: Environment name (prod, staging, dev)
        SENTRY_RELEASE: Release/version identifier (e.g., v1.2.3 or commit SHA)
        SENTRY_TRACES_SAMPLE_RATE: Performance sampling rate 0.0-1.0
        SENTRY_ERROR_SAMPLE_RATE: Error sampling rate 0.0-1.0
        SENTRY_SERVER_NAME: Server/hostname identifier
        SENTRY_AUTH_TOKEN: REST API auth token
    """
    
    # SDK settings
    dsn: Optional[str] = None
    environment: str = "production"
    release: Optional[str] = None
    server_name: Optional[str] = None
    
    # Sampling
    traces_sample_rate: float = 0.1  # 10% default in prod
    error_sample_rate: float = 1.0  # 100% errors by default
    
    # REST API
    auth_token: Optional[str] = None
    
    # Filtering
    sensitive_fields: list[str] = field(default_factory=lambda: [
        "password", "passwd", "secret", "token", "api_key", "apikey",
        "authorization", "cookie", "credit_card", "ssn", "email", "phone",
    ])
    sensitive_headers: list[str] = field(default_factory=lambda: [
        "authorization", "cookie", "set-cookie", "x-api-key", "proxy-authorization",
    ])
    
    @classmethod
    def from_env(cls) -> "SentryConfig":
        """Load configuration from environment variables."""
        
        # Parse sampling rates
        def parse_float(env_var: str, default: float) -> float:
            val = os.environ.get(env_var)
            if val is None:
                return default
            try:
                f = float(val)
                return max(0.0, min(1.0, f))
            except ValueError:
                return default
        
        return cls(
            dsn=os.environ.get("SENTRY_DSN"),
            environment=os.environ.get("SENTRY_ENVIRONMENT") or os.environ.get("ENV", "production"),
            release=os.environ.get("SENTRY_RELEASE") or os.environ.get("VERSION"),
            server_name=os.environ.get("SENTRY_SERVER_NAME") or os.environ.get("HOSTNAME"),
            traces_sample_rate=parse_float("SENTRY_TRACES_SAMPLE_RATE", 0.1),
            error_sample_rate=parse_float("SENTRY_ERROR_SAMPLE_RATE", 1.0),
            auth_token=os.environ.get("SENTRY_AUTH_TOKEN"),
        )
    
    def is_enabled(self) -> bool:
        """Check if Sentry should be enabled.
        
        Sentry is enabled if DSN is set and we're not in local/test env.
        """
        if not self.dsn:
            return False
        
        # Disable in local dev/test unless explicitly enabled
        if self.environment in ("local", "dev", "test", "testing"):
            # Check for explicit enable flag
            if os.environ.get("SENTRY_FORCE_ENABLE") != "1":
                return False
        
        return True
    
    def validate(self) -> bool:
        """Validate configuration.
        
        Returns:
            True if valid
            
        Raises:
            ValueError: If validation fails and Sentry is enabled
        """
        if not self.is_enabled():
            logger.info("Sentry disabled by configuration")
            return True
        
        # Validate DSN format (basic check)
        if self.dsn and not self.dsn.startswith("http"):
            raise ValueError(f"Invalid Sentry DSN format: {self.dsn[:20]}...")
        
        # Sampling rates should be 0-1
        if not (0.0 <= self.traces_sample_rate <= 1.0):
            raise ValueError(f"traces_sample_rate must be 0-1, got {self.traces_sample_rate}")
        
        return True


def create_before_send_callback(
    config: SentryConfig,
) -> Callable[[Any, Any], Optional[Any]]:
    """Create a before_send callback to filter sensitive data.
    
    This is CRITICAL to prevent sending PII, credentials, and sensitive data
    to Sentry.
    
    Args:
        config: SentryConfig with sensitive field definitions
    
    Returns:
        Callback function for sentry_sdk.init(before_send=...)
    """
    sensitive_fields_lower = {f.lower() for f in config.sensitive_fields}
    sensitive_headers_lower = {h.lower() for h in config.sensitive_headers}
    
    # Regex patterns for sensitive values
    credit_card_pattern = re.compile(r'\b(\d{4}[-\s]?){3}\d{4}\b')
    ssn_pattern = re.compile(r'\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b')
    api_key_pattern = re.compile(r'(?i)(api[_-]?key|token|secret)[=:]\s*([A-Za-z0-9_-]{8,})')
    
    def filter_dict(d: dict[str, Any]) -> dict[str, Any]:
        """Recursively filter sensitive keys in a dict."""
        result = {}
        for key, value in d.items():
            key_lower = key.lower()
            
            # Check if key is sensitive
            if key_lower in sensitive_fields_lower:
                result[key] = "[FILTERED]"
                continue
            
            # Recurse into nested dicts
            if isinstance(value, dict):
                result[key] = filter_dict(value)
            elif isinstance(value, list):
                result[key] = [
                    filter_dict(item) if isinstance(item, dict) else item
                    for item in value
                ]
            elif isinstance(value, str):
                # Check string values for sensitive patterns
                filtered = value
                filtered = credit_card_pattern.sub("[FILTERED_CC]", filtered)
                filtered = ssn_pattern.sub("[FILTERED_SSN]", filtered)
                filtered = api_key_pattern.sub(r'\1: [FILTERED]', filtered)
                result[key] = filtered
            else:
                result[key] = value
        
        return result
    
    def filter_headers(headers: dict[str, Any]) -> dict[str, Any]:
        """Filter sensitive HTTP headers."""
        result = {}
        for key, value in headers.items():
            if key.lower() in sensitive_headers_lower:
                result[key] = "[FILTERED]"
            else:
                result[key] = value
        return result
    
    def before_send(event: dict[str, Any], hint: Any) -> Optional[dict[str, Any]]:
        """Filter event before sending to Sentry.
        
        Args:
            event: The event dict to be sent
            hint: Additional context about the event
        
        Returns:
            Filtered event dict, or None to drop the event
        """
        try:
            # Filter request data if present
            if "request" in event:
                request = event["request"]
                
                # Filter headers
                if "headers" in request:
                    request["headers"] = filter_headers(request["headers"])
                
                # Filter cookies
                if "cookies" in request:
                    request["cookies"] = "[FILTERED]"
                
                # Filter data/body
                if "data" in request:
                    if isinstance(request["data"], dict):
                        request["data"] = filter_dict(request["data"])
                    elif isinstance(request["data"], str):
                        # Basic string filtering
                        filtered = request["data"]
                        filtered = credit_card_pattern.sub("[FILTERED_CC]", filtered)
                        request["data"] = filtered
                
                # Filter query string params
                if "query_string" in request:
                    if isinstance(request["query_string"], dict):
                        request["query_string"] = filter_dict(request["query_string"])
            
            # Filter user data (remove email, keep id)
            if "user" in event:
                user = event["user"]
                # Keep id, remove email, username if considered sensitive
                filtered_user = {}
                if "id" in user:
                    filtered_user["id"] = user["id"]
                if "ip_address" in user:
                    # Hash IP instead of removing (useful for geo, not PII)
                    filtered_user["ip_address_hashed"] = hash(user["ip_address"])
                event["user"] = filtered_user
            
            # Filter extra context
            if "extra" in event:
                event["extra"] = filter_dict(event["extra"])
            
            # Filter tags (shouldn't have sensitive data but just in case)
            if "tags" in event:
                if isinstance(event["tags"], dict):
                    event["tags"] = filter_dict(event["tags"])
            
            return event
            
        except Exception as e:
            logger.warning("Error in before_send filter: %s", e)
            # Still return the event but mark it as potentially unsafe
            event["_filter_error"] = str(e)
            return event
    
    return before_send


def create_before_send_transaction_callback(
    config: SentryConfig,
) -> Callable[[Any, Any], Optional[Any]]:
    """Create callback for filtering performance transactions.
    
    Similar to before_send but for transaction events (performance data).
    """
    before_send = create_before_send_callback(config)
    
    def before_send_transaction(event: dict[str, Any], hint: Any) -> Optional[dict[str, Any]]:
        """Filter transaction event before sending."""
        # Apply same filtering as error events
        return before_send(event, hint)
    
    return before_send_transaction


def init_sentry(
    config: Optional[SentryConfig] = None,
    integrations: Optional[list[Any]] = None,
    traces_sampler: Optional[Callable[[Any], float]] = None,
) -> bool:
    """Initialize Sentry SDK with proper configuration.
    
    Call this as EARLY as possible in your application startup.
    
    Args:
        config: SentryConfig instance (loads from env if None)
        integrations: List of Sentry integrations
        traces_sampler: Custom sampling function for traces
    
    Returns:
        True if Sentry was initialized, False if disabled
    """
    import sentry_sdk
    
    if config is None:
        config = SentryConfig.from_env()
    
    if not config.is_enabled():
        logger.info("Sentry disabled (no DSN or dev/test environment)")
        return False
    
    # Validate config
    config.validate()
    
    # Build init kwargs
    init_kwargs: dict[str, Any] = {
        "dsn": config.dsn,
        "environment": config.environment,
        "traces_sample_rate": config.traces_sample_rate,
        "sample_rate": config.error_sample_rate,
        # Filtering callbacks
        "before_send": create_before_send_callback(config),
        "before_send_transaction": create_before_send_transaction_callback(config),
    }
    
    if config.release:
        init_kwargs["release"] = config.release
    
    if config.server_name:
        init_kwargs["server_name"] = config.server_name
    
    if integrations:
        init_kwargs["integrations"] = integrations
    
    if traces_sampler:
        # Use custom sampler instead of fixed rate
        init_kwargs.pop("traces_sample_rate", None)
        init_kwargs["traces_sampler"] = traces_sampler
    
    # Initialize!
    sentry_sdk.init(**init_kwargs)
    
    logger.info(
        "Sentry initialized: env=%s, release=%s, traces_sample_rate=%.2f",
        config.environment,
        config.release,
        config.traces_sample_rate,
    )
    
    # Optional: Test capture to verify
    try:
        sentry_sdk.capture_message("Sentry initialized", level="info")
    except Exception as e:
        logger.warning("Sentry test capture failed: %s", e)
    
    return True


# Example: Dynamic sampling function

def create_traces_sampler(
    base_sample_rate: float = 0.1,
    error_sample_rate: float = 1.0,
    health_check_sample_rate: float = 0.01,
) -> Callable[[Any], float]:
    """Create a dynamic traces sampler with context-aware rates.
    
    Args:
        base_sample_rate: Default rate for normal transactions
        error_sample_rate: Rate for transactions with errors
        health_check_sample_rate: Very low rate for health checks
    
    Returns:
        Sampler function for sentry_sdk.init(traces_sampler=...)
    """
    
    def traces_sampler(sampling_context: dict[str, Any]) -> float:
        """Determine sample rate based on context."""
        transaction_context = sampling_context.get("transaction_context", {})
        transaction_name = transaction_context.get("name", "")
        op = transaction_context.get("op", "")
        
        # Very low sampling for health checks
        if any(term in transaction_name.lower() for term in [
            "health", "ping", "ready", "status", "heartbeat"
        ]):
            return health_check_sample_rate
        
        # Higher sampling for database operations
        if op in ("db", "db.query", "db.sql"):
            return min(base_sample_rate * 2, 1.0)
        
        # Check for errors in parent context
        parent_context = sampling_context.get("parent_sampled")
        if parent_context is not None:
            # If parent was sampled, keep the decision
            return 1.0 if parent_context else 0.0
        
        return base_sample_rate
    
    return traces_sampler
```

### Pattern 2: Error Capture & Context Management

```python
"""Error capture and context management patterns.

Key concepts:
- set_user(): Associate user with events
- set_tag(): Add key-value tags (searchable)
- set_context(): Add structured context (not indexed, more detail)
- add_breadcrumb(): Trail of events leading to error
- capture_exception(): Capture current exception (in except block)
- capture_message(): Capture a message (like logging)

Scope rules:
- Global scope: set_*() outside of context manager
- Local scope: use push_scope() or with sentry_sdk.configure_scope()
- Spans/transactions have their own scope
"""

from __future__ import annotations

import logging
import traceback
from typing import Any, Optional
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone

import sentry_sdk
from sentry_sdk import Hub, push_scope, configure_scope
from sentry_sdk.tracing import Span

logger = logging.getLogger(__name__)


class SentryContextManager:
    """Helper for managing Sentry context consistently.
    
    Provides methods for setting user, tags, context, and breadcrumbs.
    """
    
    @staticmethod
    def set_user(
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        username: Optional[str] = None,
        ip_address: Optional[str] = None,
        **extra: Any,
    ) -> None:
        """Set user context for all subsequent events.
        
        Args:
            user_id: Unique user identifier
            email: User email (will be filtered by before_send in production)
            username: Username
            ip_address: IP address
            **extra: Additional user fields
        """
        user_data: dict[str, Any] = {}
        
        if user_id:
            user_data["id"] = user_id
        if email:
            user_data["email"] = email
        if username:
            user_data["username"] = username
        if ip_address:
            user_data["ip_address"] = ip_address
        
        user_data.update(extra)
        
        if user_data:
            sentry_sdk.set_user(user_data)
    
    @staticmethod
    def clear_user() -> None:
        """Clear user context (e.g., after logout)."""
        sentry_sdk.set_user(None)
    
    @staticmethod
    def set_tag(key: str, value: Any) -> None:
        """Set a searchable tag.
        
        Tags are indexed and searchable in Sentry UI.
        Use for low-cardinality values: environment, version, team, status.
        
        Args:
            key: Tag name
            value: Tag value (converted to string)
        """
        sentry_sdk.set_tag(key, value)
    
    @staticmethod
    def set_tags(tags: dict[str, Any]) -> None:
        """Set multiple tags at once."""
        for key, value in tags.items():
            sentry_sdk.set_tag(key, value)
    
    @staticmethod
    def set_context(key: str, value: dict[str, Any]) -> None:
        """Set structured context (not indexed).
        
        Context is shown in event detail but not indexed for search.
        Use for: request data, response data, feature flags, configuration.
        
        Args:
            key: Context name (e.g., "request", "response", "feature_flags")
            value: Dict of context data
        """
        sentry_sdk.set_context(key, value)
    
    @staticmethod
    def add_breadcrumb(
        message: str,
        category: Optional[str] = None,
        level: str = "info",
        data: Optional[dict[str, Any]] = None,
        type: str = "default",
    ) -> None:
        """Add a breadcrumb to the trail.
        
        Breadcrumbs show the sequence of events leading to an error.
        Keep them lightweight - don't store full request/response bodies.
        
        Args:
            message: Brief message
            category: Category (e.g., "http", "database", "queue")
            level: "debug", "info", "warning", "error"
            data: Optional key-value data
            type: Breadcrumb type
        """
        crumb: dict[str, Any] = {
            "message": message,
            "level": level,
            "type": type,
            "timestamp": datetime.now(timezone.utc).timestamp(),
        }
        
        if category:
            crumb["category"] = category
        if data:
            crumb["data"] = data
        
        sentry_sdk.add_breadcrumb(crumb)
    
    @staticmethod
    def add_request_breadcrumb(
        method: str,
        url: str,
        status_code: Optional[int] = None,
        duration_ms: Optional[float] = None,
    ) -> None:
        """Add HTTP request breadcrumb.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            url: URL (query params will be filtered if sensitive)
            status_code: Response status code
            duration_ms: Request duration in ms
        """
        data: dict[str, Any] = {
            "method": method.upper(),
            "url": url,
        }
        
        if status_code:
            data["status_code"] = status_code
        if duration_ms:
            data["duration_ms"] = round(duration_ms, 2)
        
        level = "info"
        if status_code and status_code >= 400:
            level = "warning" if status_code < 500 else "error"
        
        SentryContextManager.add_breadcrumb(
            message=f"{method.upper()} {url}",
            category="http",
            level=level,
            data=data,
            type="http",
        )
    
    @staticmethod
    def add_db_breadcrumb(
        query: str,
        duration_ms: Optional[float] = None,
        row_count: Optional[int] = None,
    ) -> None:
        """Add database query breadcrumb.
        
        Args:
            query: SQL query (don't include sensitive parameters)
            duration_ms: Query duration
            row_count: Number of rows affected/returned
        """
        data: dict[str, Any] = {"query": query}
        
        if duration_ms:
            data["duration_ms"] = round(duration_ms, 2)
        if row_count is not None:
            data["row_count"] = row_count
        
        SentryContextManager.add_breadcrumb(
            message="Database query",
            category="database",
            level="info",
            data=data,
            type="query",
        )


@contextmanager
def scoped_context(
    tags: Optional[dict[str, Any]] = None,
    context: Optional[dict[str, dict[str, Any]]] = None,
    user: Optional[dict[str, Any]] = None,
):
    """Context manager for temporary local scope.
    
    Use when you want context to only apply to errors within a block.
    
    Usage:
        with scoped_context(tags={"operation": "checkout"}):
            # Any error here gets the checkout tag
            do_checkout()
    """
    with push_scope() as scope:
        if tags:
            for key, value in tags.items():
                scope.set_tag(key, value)
        if context:
            for key, value in context.items():
                scope.set_context(key, value)
        if user:
            scope.set_user(user)
        
        yield scope


def capture_exception_with_context(
    exception: Optional[BaseException] = None,
    tags: Optional[dict[str, Any]] = None,
    context: Optional[dict[str, dict[str, Any]]] = None,
    user: Optional[dict[str, Any]] = None,
    level: str = "error",
) -> Optional[str]:
    """Capture exception with additional context.
    
    Use this instead of bare capture_exception() when you need
    to add local context before capture.
    
    Args:
        exception: Exception to capture (None = current exception)
        tags: Additional tags
        context: Additional context dicts
        user: User context
        level: Event level
    
    Returns:
        Event ID (string) or None if Sentry not enabled
    """
    with push_scope() as scope:
        # Add tags
        if tags:
            for key, value in tags.items():
                scope.set_tag(key, value)
        
        # Add context
        if context:
            for key, value in context.items():
                scope.set_context(key, value)
        
        # Add user
        if user:
            scope.set_user(user)
        
        # Set level
        scope.level = level
        
        # Capture
        if exception:
            event_id = sentry_sdk.capture_exception(exception)
        else:
            # Capture current exception from sys.exc_info()
            event_id = sentry_sdk.capture_exception()
        
        return event_id


def capture_message_with_context(
    message: str,
    level: str = "info",
    tags: Optional[dict[str, Any]] = None,
    context: Optional[dict[str, dict[str, Any]]] = None,
) -> Optional[str]:
    """Capture a message with additional context.
    
    Similar to logging but goes to Sentry.
    
    Args:
        message: Message text
        level: "debug", "info", "warning", "error", "fatal"
        tags: Additional tags
        context: Additional context
    
    Returns:
        Event ID or None
    """
    with push_scope() as scope:
        if tags:
            for key, value in tags.items():
                scope.set_tag(key, value)
        if context:
            for key, value in context.items():
                scope.set_context(key, value)
        
        return sentry_sdk.capture_message(message, level=level)


# Example usage patterns

def example_error_handling() -> None:
    """Example showing proper error handling with Sentry."""
    
    # Set global context once at startup
    SentryContextManager.set_tags({
        "service": "checkout-service",
        "version": "v1.2.3",
        "team": "platform",
    })
    
    # Set user when authenticated
    SentryContextManager.set_user(
        user_id="user_12345",
        # email will be filtered in production by before_send
        email="user@example.com",
    )
    
    # Add breadcrumbs for operations
    SentryContextManager.add_request_breadcrumb(
        method="POST",
        url="/api/payment",
        status_code=200,
        duration_ms=145.2,
    )
    
    try:
        # Operation that might fail
        risky_operation()
        
    except ValueError as e:
        # Expected error - maybe just log, don't send to Sentry
        logger.warning("Expected validation error: %s", e)
        
    except Exception as e:
        # Unexpected error - capture with full context
        event_id = capture_exception_with_context(
            tags={
                "error_type": type(e).__name__,
                "handled": "true",
            },
            context={
                "operation_context": {
                    "operation": "checkout",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            },
        )
        
        # Re-raise if needed, or handle gracefully
        logger.error("Error captured in Sentry: %s", event_id)
        raise


def risky_operation() -> None:
    """Example function that might raise."""
    raise RuntimeError("Something went wrong during checkout")


# ===================================================================
# ❌ BAD — Common Sentry mistakes
# ===================================================================

def bad_sentry_examples_bad() -> None:
    """❌ DON'T do these things."""
    
    import sentry_sdk
    
    # ❌ Capturing exception manually instead of using capture_exception()
    try:
        risky_operation()
    except Exception as e:
        # ❌ Bad: capture_message with stringified exception
        # Loses traceback, type information, local vars
        sentry_sdk.capture_message(f"Error: {e}")
        
        # ❌ Worse: capturing with only the message
        pass
    
    # ❌ Setting sensitive data directly (rely on before_send, but be proactive)
    sentry_sdk.set_user({
        "id": "123",
        "password": "secret123",  # ❌ Never do this!
        "credit_card": "4111-1111-1111-1111",  # ❌ Never!
    })
    
    # ❌ Adding full request bodies to breadcrumbs (too big, may have PII)
    SentryContextManager.add_breadcrumb(
        message="Request",
        data={
            "full_body": "x" * 10000,  # ❌ Too large
        },
    )


# ===================================================================
# ✅ GOOD — Proper patterns
# ===================================================================

def good_sentry_example() -> None:
    """✅ DO these things."""
    
    import sentry_sdk
    
    # ✅ Use capture_exception() in except blocks - it auto-captures traceback
    try:
        risky_operation()
    except Exception as e:
        # ✅ This captures: exception type, value, traceback, local vars
        event_id = sentry_sdk.capture_exception()
        logger.error("Captured error: %s", event_id)
    
    # ✅ Set only necessary user fields, rely on before_send for filtering
    SentryContextManager.set_user(
        user_id="123",
        # Email is OK to set - before_send will filter/remove it
        email="user@example.com",
    )
    
    # ✅ Keep breadcrumbs small and informative
    SentryContextManager.add_request_breadcrumb(
        method="POST",
        url="/api/checkout",
        status_code=500,
        duration_ms=234.5,
    )
```

### Pattern 3: Performance Tracing & Spans

```python
"""Performance monitoring and distributed tracing patterns.

Key concepts:
- Transaction: Unit of work (e.g., HTTP request, background job)
- Span: Single operation within a transaction (DB query, HTTP call)
- Trace: Complete path across services (distributed)
- Sampling: Control which transactions are sent to Sentry

Auto-instrumentation:
- Flask/Django/FastAPI integrations auto-create transactions
- HTTP client integrations auto-create spans
- DB integrations auto-create spans

Manual instrumentation:
- start_transaction() / start_span()
- @trace() decorator
- span.set_tag() / span.set_data()
"""

from __future__ import annotations

import logging
import time
from typing import Any, Optional, Callable, TypeVar
from functools import wraps
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone

import sentry_sdk
from sentry_sdk.tracing import Span, Transaction, start_transaction, start_span
from sentry_sdk import Hub

logger = logging.getLogger(__name__)

T = TypeVar('T')


# ===================================================================
# Decorator patterns
# ===================================================================

def trace_function(
    name: Optional[str] = None,
    op: str = "function",
    tags: Optional[dict[str, Any]] = None,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Decorator to trace a function execution.
    
    Creates a span for the function call.
    
    Args:
        name: Span name (defaults to function name)
        op: Operation type (function, db, http, cache, etc.)
        tags: Tags to add to the span
    
    Returns:
        Decorated function
    
    Example:
        @trace_function(op="db.query")
        def get_user(user_id: str) -> User:
            ...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        span_name = name or f"{func.__module__}.{func.__name__}"
        
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            # Only create span if there's an active transaction
            hub = Hub.current
            if hub is None:
                return func(*args, **kwargs)
            
            with start_span(op=op, description=span_name) as span:
                if span:
                    # Add tags
                    if tags:
                        for key, value in tags.items():
                            span.set_tag(key, value)
                    
                    span.set_tag("function", func.__name__)
                    span.set_tag("module", func.__module__)
                
                try:
                    result = func(*args, **kwargs)
                    
                    if span:
                        span.set_status("ok")
                    
                    return result
                    
                except Exception as e:
                    if span:
                        span.set_status("internal_error")
                        span.set_tag("error.type", type(e).__name__)
                    
                    raise
        
        return wrapper
    return decorator


def trace_transaction(
    name: str,
    op: str = "transaction",
    tags: Optional[dict[str, Any]] = None,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Decorator to create a new transaction.
    
    Use for entry points that don't have auto-instrumentation:
    - Background jobs
    - CLI commands
    - Custom event handlers
    
    Args:
        name: Transaction name
        op: Operation type
        tags: Tags
    
    Returns:
        Decorated function
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            # Check if we should sample this transaction
            # (this is simplified - real code would use proper sampler)
            
            transaction = start_transaction(name=name, op=op)
            
            if tags and transaction:
                for key, value in tags.items():
                    transaction.set_tag(key, value)
            
            try:
                result = func(*args, **kwargs)
                
                if transaction:
                    transaction.set_status("ok")
                
                return result
                
            except Exception as e:
                if transaction:
                    transaction.set_status("internal_error")
                    transaction.set_tag("error.type", type(e).__name__)
                
                raise
        
        return wrapper
    return decorator


# ===================================================================
# Context manager patterns
# ===================================================================

@contextmanager
def timed_span(
    name: str,
    op: str = "function",
    tags: Optional[dict[str, Any]] = None,
):
    """Context manager for timing a code block as a span.
    
    Usage:
        with timed_span("process_order", op="business_logic"):
            process_order(order_id)
    """
    start_time = time.perf_counter()
    
    with start_span(op=op, description=name) as span:
        if span and tags:
            for key, value in tags.items():
                span.set_tag(key, value)
        
        try:
            yield span
            
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            if span:
                span.set_tag("duration_ms", round(duration_ms, 2))
                span.set_status("ok")
                
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            if span:
                span.set_tag("duration_ms", round(duration_ms, 2))
                span.set_status("internal_error")
                span.set_tag("error.type", type(e).__name__)
            
            raise


# ===================================================================
# Manual HTTP client tracing
# ===================================================================

def traced_http_request(
    method: str,
    url: str,
    headers: Optional[dict[str, Any]] = None,
    **kwargs: Any,
) -> Any:
    """Make an HTTP request with Sentry tracing.
    
    Creates an HTTP span, injects trace headers for distributed tracing.
    
    Args:
        method: HTTP method
        url: Target URL
        headers: Request headers
        **kwargs: Additional args for requests library
    
    Returns:
        Response object
    """
    import requests
    
    hub = Hub.current
    headers = dict(headers or {})
    
    # Inject Sentry trace headers for distributed tracing
    span = hub.scope.span if hub and hub.scope else None
    
    if span is not None:
        # Get trace context for propagation
        traceparent = span.to_traceparent()
        if traceparent:
            headers["sentry-trace"] = traceparent
        
        # Also add baggage header if using W3C trace context
        baggage = span.to_baggage()
        if baggage:
            headers["baggage"] = baggage
    
    # Create HTTP span
    with start_span(op="http.client", description=f"{method} {url}") as span:
        if span:
            span.set_tag("http.method", method.upper())
            span.set_tag("http.url", url)
        
        start_time = time.perf_counter()
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                **kwargs,
            )
            
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            if span:
                span.set_tag("http.status_code", response.status_code)
                span.set_tag("duration_ms", round(duration_ms, 2))
                
                if response.status_code >= 500:
                    span.set_status("internal_error")
                elif response.status_code >= 400:
                    span.set_status("not_found" if response.status_code == 404 else "invalid_argument")
                else:
                    span.set_status("ok")
            
            return response
            
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            if span:
                span.set_tag("duration_ms", round(duration_ms, 2))
                span.set_status("internal_error")
                span.set_tag("error.type", type(e).__name__)
            
            raise


# ===================================================================
# Example usage
# ===================================================================

@trace_transaction(
    name="process_payment_job",
    op="queue.task",
    tags={"queue": "payments"},
)
def process_payment_background_job(payment_id: str) -> None:
    """Example background job with transaction tracing."""
    
    # Set transaction context
    transaction = Hub.current.scope.transaction
    if transaction:
        transaction.set_tag("payment_id", payment_id)
    
    # Add breadcrumb
    SentryContextManager.add_breadcrumb(
        message=f"Processing payment {payment_id}",
        category="queue",
    )
    
    # Trace database call
    with timed_span("get_payment", op="db.query", tags={"table": "payments"}):
        payment = get_payment_from_db(payment_id)
    
    # Trace HTTP call to payment gateway
    with timed_span("charge_card", op="http.client", tags={"gateway": "stripe"}):
        charge_result = charge_payment_card(payment)
    
    # Trace database update
    with timed_span("update_payment", op="db.query", tags={"table": "payments"}):
        update_payment_status(payment_id, "completed")


# Helper functions (stubs)
def get_payment_from_db(payment_id: str) -> dict[str, Any]:
    return {"id": payment_id, "amount": 99.99}


def charge_payment_card(payment: dict[str, Any]) -> dict[str, Any]:
    return {"success": True}


def update_payment_status(payment_id: str, status: str) -> None:
    pass


# ===================================================================
# Custom performance metrics (set_measurement)
# ===================================================================

def record_custom_measurements(
    duration_ms: float,
    queue_depth: int,
    memory_mb: float,
) -> None:
    """Record custom measurements on the current span/transaction.
    
    Measurements appear in performance metrics in Sentry.
    
    Args:
        duration_ms: Operation duration
        queue_depth: Queue depth
        memory_mb: Memory usage
    """
    hub = Hub.current
    if hub is None:
        return
    
    transaction = hub.scope.transaction
    span = hub.scope.span
    
    # Measurements can be set on transaction or span
    target = transaction or span
    if target is None:
        return
    
    # set_measurement(name, value, unit)
    # Units: 'millisecond', 'second', 'byte', 'percent', etc.
    target.set_measurement("custom.duration", duration_ms, "millisecond")
    target.set_measurement("custom.queue_depth", queue_depth, "none")
    target.set_measurement("custom.memory", memory_mb, "megabyte")
```

---

## Constraints

### MUST DO

- Initialize `sentry_sdk.init()` as early as possible in application startup
- Use `SENTRY_DSN` from environment variable only, never hardcode
- Set `environment`, `release`, `server_name` in SDK config
- Implement `before_send` callback to filter PII and sensitive data
- Use `traces_sample_rate` < 1.0 in production (e.g., 0.1 for 10%)
- Add user context with `set_user()` (rely on before_send to filter PII)
- Add tags with `set_tag()` for low-cardinality searchable values
- Add breadcrumbs for HTTP requests, DB queries, and significant events
- Use `capture_exception()` in except blocks (not `capture_message()`)
- Use `push_scope()` or context managers for local event context
- Configure framework integrations (Flask, Django, FastAPI) for auto-instrumentation

### MUST NOT DO

- NEVER hardcode DSN in source code or commit it
- NEVER set `traces_sample_rate=1.0` in production (too much data, too expensive)
- NEVER skip `before_send` callback (PII will leak)
- NEVER use `capture_message()` for exceptions (use `capture_exception()`)
- NEVER send raw passwords, API keys, credit card numbers in any context
- NEVER store full request/response bodies in breadcrumbs (too large, PII risk)
- NEVER use high-cardinality values as tags (user_id, request_id) unless necessary
- NEVER ignore Sentry SDK initialization errors silently
- NEVER log or expose DSN in error messages or application logs
- NEVER use the deprecated `raven` package — use `sentry-sdk`

---

## Output Template

When implementing Sentry integrations, produce:

1. **SDK Initialization** — `SentryConfig` + `init_sentry()` with env-based DSN
2. **Sensitive Data Filtering** — `before_send` callback removing PII, credentials, headers
3. **Context Management** — `SentryContextManager` for user, tags, context, breadcrumbs
4. **Exception Capture** — `capture_exception_with_context()` with scope management
5. **Performance Tracing** — `@trace_function`, `@trace_transaction`, `timed_span()`
6. **HTTP Client Tracing** — Trace header injection (`sentry-trace`, `baggage`)
7. **Dynamic Sampling** — `traces_sampler` for context-aware sampling rates

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-datadog-api` | Full observability with metrics, traces, logs |
| `coding-grafana-prometheus` | Open-source monitoring (complementary) |
| `coding-pagerduty-api` | On-call alerting for Sentry issues |
| `coding-logging-patterns` | Structured logging that works with Sentry |
| `coding-slack-api` | ChatOps notifications for Sentry alerts |

---

## Live References

| Resource | URL |
|----------|-----|
| sentry-sdk (PyPI) | https://pypi.org/project/sentry-sdk/ |
| Sentry Python Docs | https://docs.sentry.io/platforms/python/ |
| SDK Configuration | https://docs.sentry.io/platforms/python/configuration/ |
| Error Capture | https://docs.sentry.io/platforms/python/usage/ |
| Performance Tracing | https://docs.sentry.io/platforms/python/tracing/ |
| Data Filtering | https://docs.sentry.io/platforms/python/data-management/data-collected/ |
| REST API Docs | https://docs.sentry.io/api/ |
| Integrations | https://docs.sentry.io/platforms/python/integrations/ |
| Sampling | https://docs.sentry.io/platforms/python/tracing/sampling/ |

---

## 📎 DSN Structure

A Sentry DSN looks like:
```
https://<public_key>@<host>/<project_id>
```

Components:
- Scheme: `https://`
- Public key: Authentication (not secret)
- Host: Sentry server (`sentry.io` for SaaS)
- Project ID: Which project to send events to

**Important:** The public key in the DSN is NOT sensitive. It's safe to include in client-side code.
Never confuse it with your Sentry account password or auth token.

---

## 📎 Sampling Rates

Recommended production sampling:

| Environment | Error Sample Rate | Trace Sample Rate |
|-------------|-------------------|-------------------|
| Production | 1.0 (100%) | 0.05 - 0.2 (5-20%) |
| Staging | 1.0 (100%) | 0.5 - 1.0 (50-100%) |
| Development | 0.0 - 1.0 (optional) | 0.0 - 1.0 (optional) |

**Dynamic sampling strategy:**
- Health checks: 0.01 - 0.1 (very low)
- Database queries: 0.2 - 0.5 (higher visibility)
- Error transactions: 1.0 (always sample errors)
- Parent-sampled: 1.0 (respect upstream decision)
