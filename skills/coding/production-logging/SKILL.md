---




name: production-logging
description: Implements production logging practices including structured logging,
  log level management, context propagation, correlation IDs, sensitive data redaction,
  and log aggregation patterns for actionable observability in software systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: production logging, structured logging, correlation ID, context propagation,
    log aggregation, how do i add logging to my app, sensitive data redaction, json
    logging
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
  related-skills: observability-patterns, software-error-handling, engineering-principles




---




# Production Logging Patterns

Implements production-grade logging practices to make systems debuggable and observable. This skill covers structured JSON logging, context propagation with correlation IDs, sensitive data redaction, tiered log level strategies, and log aggregation patterns — ensuring every log entry carries the right information at the right severity for real-time monitoring and post-incident debugging.

## TL;DR Checklist

- [ ] Configure structured JSON logger via `logging.config.dictConfig` with consistent field schema
- [ ] Inject correlation ID into every log call using a context or thread-local mechanism
- [ ] Route sensitive fields (passwords, tokens, PII) through a redaction filter before output
- [ ] Set DEBUG level per-component in production; reserve full DEBUG for local/dev environments
- [ ] Ensure every exception log includes traceback, correlation ID, and contextual state
- [ ] Verify log output is valid JSON parseable by aggregation tools (Fluentd, Datadog, ELK)

---

## When to Use

- Setting up logging in a new service or microservice
- Refactoring legacy `print()` or unstructured string-based logging into structured format
- Designing a logging strategy for a team — defining conventions, field names, and level policies
- Investigating a production incident where logs lack sufficient context (no correlation ID, no trace)
- Adding security-sensitive redaction to prevent PII leakage in log files or external aggregation pipelines
- Migrating from ad-hoc console output to a centralized log aggregation system

---

## When NOT to Use

- For real-time metric collection — use metrics libraries (Prometheus client, StatsD) instead of logging for counters and gauges
- For distributed request tracing across services — use OpenTelemetry tracing spans as the primary mechanism; logs supplement traces
- In test code — use lightweight log capture (`caplog`, `unittest.mock`) instead of full structured loggers; tests should verify logic, not parse JSON
- For high-frequency telemetry (thousands of entries per second per instance) — logging has serialization overhead; use metrics or event streams for high-volume data points

---

## Core Workflow

1. **Audit Existing Logging** — Inventory all current logging calls (`print()`, `logger.info()`, etc.). Identify missing correlation IDs, inconsistent formats, and any sensitive data exposure.
   **Checkpoint:** Every code path that handles user input or external API responses must be verified for redaction coverage.

2. **Define Logger Configuration** — Set up `logging.config.dictConfig` with: JSON formatter, structured fields schema (`timestamp`, `level`, `message`, `correlation_id`, `service`, `component`), and output destination (stdout for containerized environments).
   **Checkpoint:** Confirm all log entries emit valid JSON with the required fields before proceeding.

3. **Implement Context Propagation** — Build a correlation ID mechanism (thread-local for sync code, contextvars for async code) that generates or extracts IDs at request boundaries and makes them available to every logger call.
   **Checkpoint:** Verify that logs from database calls, HTTP client invocations, and background tasks all carry the same correlation ID as the originating request.

4. **Apply Redaction Filters** — Register a log record attribute transformer or filter that scans `extra` fields and message strings against a sensitive field pattern list (`password`, `token`, `ssn`, `credit_card`, `api_key`) and replaces values with `[REDACTED]`.
   **Checkpoint:** Run a test log with dummy PII to confirm redaction fires before serialization.

5. **Set Log Level Policy** — Configure per-component level overrides: root logger at `INFO` in production, `DEBUG` locally; framework handlers (e.g., SQLAlchemy, httpx) at `WARNING`; application code at `INFO`.
   **Checkpoint:** Start the service and verify no DEBUG messages appear in production logs.

6. **Validate End-to-End** — Fire a request through the full stack, follow it through database queries, HTTP calls, and background workers. Confirm: valid JSON, correlation ID present everywhere, sensitive data redacted, appropriate severity levels.
   **Checkpoint:** Pipe output to `jq .` or parse with Python `json.loads()` to confirm structural validity.

---

## Implementation Patterns

### Pattern 1: Structured JSON Logging (BAD vs. GOOD)

Unstructured string logs (`print()`, `f"..."`) are unsearchable, non-parseable by aggregation tools, and make correlation-impossible in multi-threaded or distributed environments.

```python
# ❌ BAD: Unstructured string logging — impossible to query, parse, or correlate
import datetime

logger = logging.getLogger("myapp")

def create_user(email: str, name: str) -> dict:
    logger.info(f"Creating user {email} with name {name}")  # No structure, no fields
    # ... business logic ...
    logger.info(f"User created successfully: {email}, id={user_id}")  # Inconsistent format
    return {"status": "created", "email": email}

def process_payment(amount: float, user_id: str) -> None:
    logger.debug(f"Processing payment for user {user_id}: ${amount}")  # No severity context
    # ... payment logic ...
```

```python
# ✅ GOOD: Structured JSON logging with consistent field schema
import logging
import logging.config
import json
from typing import Any


LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "app.logging.JsonFormatter",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
            "stream": "ext://sys.stdout",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}


def setup_logging(config: dict | None = None) -> None:
    """Configure structured JSON logging via dictConfig.

    Args:
        config: Optional override for the default logging configuration.
                Pass a custom dictConfig-compatible dict to override defaults.
    """
    cfg = config or LOGGING_CONFIG
    logging.config.dictConfig(cfg)


class JsonFormatter(logging.Formatter):
    """Formats log records as structured JSON with consistent fields."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Inject correlation ID if present
        if hasattr(record, "correlation_id"):
            payload["correlation_id"] = record.correlation_id

        # Inject service metadata from extra fields
        for key in ("service", "component", "span_id", "trace_id"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)

        # Attach exception info if present
        if record.exc_info and record.exc_info[0] is not None:
            payload["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": self.formatException(record.exc_info),
            }

        return json.dumps(payload, default=str)


def create_user(email: str, name: str) -> dict:
    """Create a new user with structured logging."""
    logger = logging.getLogger("app.users")
    logger.info("Creating user", extra={"component": "users", "email": email})

    # ... business logic to create the user ...
    user_id = 42  # hypothetical result

    logger.info(
        "User created successfully",
        extra={"component": "users", "user_id": user_id, "email": email},
    )
    return {"status": "created", "user_id": user_id, "email": email}
```

---

### Pattern 2: Context Propagation with Correlation IDs (BAD vs. GOOD)

Without correlation IDs, debugging a request that touches multiple components is like finding a needle in a haystack — you cannot distinguish which log lines belong to which request.

```python
# ❌ BAD: No correlation ID — logs are impossible to correlate across services
import logging

logger = logging.getLogger("app")

def handle_request(request_id: str | None) -> dict:
    logger.info(f"Processing request {request_id}")  # Only at the boundary
    # ... database call ...
    logger.info("Queried user from DB")  # No trace back to original request
    # ... HTTP call to external service ...
    logger.info("Called payment gateway")  # Also uncorrelated
    return {"ok": True}

def query_user(db, email: str) -> dict | None:
    logger.info(f"Querying user by email: {email}")  # No correlation context
    return db.execute(...)
```

```python
# ✅ GOOD: Contextvars-based correlation ID propagation for both sync and async code
import logging
import uuid
from contextvars import ContextVar
from typing import Any

# A single contextvar holds the correlation ID for the current execution
_correlation_id: ContextVar[str | None] = ContextVar("correlation_id", default=None)


def generate_correlation_id() -> str:
    """Generate a new v4 UUID correlation ID."""
    return str(uuid.uuid4())


def set_correlation_id(correlation_id: str | None) -> None:
    """Set the correlation ID for the current execution context.

    Args:
        correlation_id: A UUID string, or None to clear.
    """
    _correlation_id.set(correlation_id)


def get_correlation_id() -> str | None:
    """Return the correlation ID for the current execution context.

    Returns:
        The current correlation ID string, or None if not set.
    """
    return _correlation_id.get()


class CorrelationFilter(logging.Filter):
    """Automatically injects the current correlation ID into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        cid = get_correlation_id()
        record.correlation_id = cid or "none"
        return True


def setup_logging_with_context() -> None:
    """Setup logging with automatic correlation ID injection."""
    config: dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "correlation_id": {
                "()": __name__ + ".CorrelationFilter",
            },
        },
        "formatters": {
            "json": {
                "()": "app.logging.JsonFormatter",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "json",
                "stream": "ext://sys.stdout",
                "filters": ["correlation_id"],
            },
        },
        "root": {
            "handlers": ["console"],
            "level": "INFO",
            "filters": ["correlation_id"],
        },
    }
    logging.config.dictConfig(config)


# Usage in a request handler (e.g., FastAPI, Flask, Django middleware):
def handle_request(headers: dict[str, str]) -> dict:
    # Extract existing correlation ID from upstream headers or generate one
    correlation_id = headers.get("X-Correlation-ID") or generate_correlation_id()
    set_correlation_id(correlation_id)

    logger = logging.getLogger("app.request_handler")
    logger.info("Request started", extra={"method": "POST", "path": "/api/users"})

    result = query_user("alice@example.com")
    call_payment_gateway(result["user_id"])

    return {"status": "ok", "correlation_id": correlation_id}


def query_user(email: str) -> dict:
    logger = logging.getLogger("app.database")
    # correlation_id is automatically injected by CorrelationFilter
    logger.info("Database query", extra={"component": "database", "email": email})
    return {"user_id": 42, "email": email}


def call_payment_gateway(user_id: str) -> None:
    logger = logging.getLogger("app.gateway")
    # Same correlation_id flows through to this nested call
    logger.info("Payment gateway call", extra={"component": "gateway", "user_id": user_id})
```

---

### Pattern 3: Sensitive Data Redaction (BAD vs. GOOD)

Logging PII, passwords, tokens, or API keys — even in DEBUG mode — creates security and compliance violations (GDPR, PCI-DSS, HIPAA). Redaction must be automatic and transparent to the application developer.

```python
# ❌ BAD: Sensitive data leaks into logs without any protection
import logging

logger = logging.getLogger("app")

def authenticate_user(email: str, password: str) -> dict | None:
    logger.debug(f"Authenticating user: email={email}, password={password}")  # PASSWORD LOGGED
    # ... authentication logic ...
    return {"token": "sk_live_abc123secret456"}  # API KEY LOGGED IF RETURN VALUE IS LOGGED

def send_notification(user_id: str, message_body: dict) -> None:
    logger.info(f"Sending SMS to {user_id}: {message_body}")  # PHONE NUMBER IN BODY LOGGED
```

```python
# ✅ GOOD: Automatic sensitive field redaction via a log filter/transformer
import logging
import re
from typing import Any, Sequence


# Canonical list of field names that must be redacted.
SENSITIVE_FIELD_PATTERNS: list[str] = [
    r"(?i)password",
    r"(?i)passwd",
    r"(?i)secret",
    r"(?i)token",
    r"(?i)api.?key",
    r"(?i)apikey",
    r"(?i)access.?key",
    r"(?i)credit.?card",
    r"(?i)cc_num",
    r"(?i)ssn",
    r"(?i)social.?security",
    r"(?i)authorization",
    r"(?i)bearer",
]

_SENSITIVE_RE = re.compile("|".join(SENSITIVE_FIELD_PATTERNS))

REDACTED_VALUE = "[REDACTED]"


class SensitiveDataFilter(logging.Filter):
    """Redacts sensitive fields in log record attributes before formatting.

    Inspects all extra attributes on a LogRecord and replaces values of fields
    matching known sensitive patterns (case-insensitive) with '[REDACTED]'.
    Also scans the formatted message string for inline sensitive values.
    """

    def __init__(self, patterns: Sequence[str] | None = None) -> None:
        super().__init__()
        if patterns:
            self._patterns = [re.compile(p, re.IGNORECASE) for p in patterns]
        else:
            self._patterns = [re.compile(p, re.IGNORECASE) for p in SENSITIVE_FIELD_PATTERNS]

    def filter(self, record: logging.LogRecord) -> bool:
        # Redact extra attributes
        sensitive_keys_to_pop: list[str] = []
        for key, value in vars(record).items():
            if key in ("args", "msg", "exc_info", "levelname", "levelno",
                       "filename", "funcName", "lineno", "module", "name",
                       "pathname", "process", "processName", "thread", "threadName",
                       "created", "relativeCreated", "stack_info"):
                continue
            if self._patterns and any(pat.search(key) for pat in self._patterns):
                setattr(record, key, REDACTED_VALUE)

        # Redact sensitive values in the message string
        record.msg = _redact_string(str(record.msg), self._patterns)
        if record.args:
            record.args = tuple(
                REDACTED_VALUE if isinstance(a, str) and any(pat.search(a) for pat in self._patterns) else a
                for a in record.args
            )

        return True


def _redact_string(text: str, patterns: Sequence[re.Pattern[str]]) -> str:
    """Replace sensitive-looking values inline within a string with [REDACTED]."""
    for pat in patterns:
        text = pat.sub(REDACTED_VALUE, text)
    return text


# Usage — register the filter on all loggers:
def setup_logging_with_redaction() -> None:
    config: dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "redact_sensitive": {
                "()": __name__ + ".SensitiveDataFilter",
            },
        },
        "formatters": {
            "json": {
                "()": "app.logging.JsonFormatter",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "json",
                "stream": "ext://sys.stdout",
                "filters": ["redact_sensitive"],
            },
        },
        "root": {
            "handlers": ["console"],
            "level": "INFO",
            "filters": ["redact_sensitive"],
        },
    }
    logging.config.dictConfig(config)


# After setup, sensitive data is automatically redacted:
def authenticate_user(email: str, password: str) -> dict | None:
    logger = logging.getLogger("app.auth")
    # Even if password is passed in extra, it gets redacted by SensitiveDataFilter
    logger.debug(
        "Authenticating user",
        extra={"email": email, "password": password},  # Will appear as [REDACTED]
    )
    return {"token": "sk_live_abc123secret456"}  # Token in return value is application-level risk
```

---

### Pattern 4: Log Level Strategy (BAD vs. GOOD)

Using DEBUG level everywhere in production floods log aggregation with noise and hides real issues. Using only INFO loses actionable context during debugging. A tiered strategy balances signal against noise.

```python
# ❌ BAD: Either all DEBUG everywhere or INFO-only with no component-level tuning
import logging

logging.basicConfig(level=logging.DEBUG)  # DEBUG floods production logs

logger = logging.getLogger("app")
logger.info("Request received")       # Too verbose — can't distinguish issues
logger.debug("SQL: SELECT * FROM users WHERE id = %s", user_id)  # Exposes query in prod
```

```python
# ✅ GOOD: Tiered log level strategy with per-component overrides
import logging.config
from typing import Any


LOG_LEVEL_STRATEGY: dict[str, str] = {
    # Production default is INFO for the application root
    "": "INFO",

    # Application components can be tuned individually
    "app.users": "INFO",
    "app.payments": "INFO",
    "app.database": "WARNING",  # SQL noise suppressed in production
    "app.gateway": "INFO",

    # Third-party libraries are noisy by default — suppress to WARNING
    "sqlalchemy.engine": "WARNING",
    "httpx": "WARNING",
    "urllib3.connectionpool": "WARNING",
    "boto3": "WARNING",
    "botocore": "WARNING",

    # Framework internal logs are informational noise
    "fastapi.middleware": "WARNING",
    "uvicorn.error": "INFO",
    "uvicorn.access": "INFO",
}


def setup_tiered_logging(
    root_level: str = "INFO",
    component_levels: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Build and return a tiered logging configuration for production use.

    Args:
        root_level: Base log level for the application (typically INFO in prod, DEBUG locally).
        component_levels: Per-logger level overrides. Keys are logger names, values are levels.
                          Empty string key "" sets the root logger level.

    Returns:
        A dictConfig-compatible configuration dictionary.
    """
    levels = dict(LOG_LEVEL_STRATEGY)
    if component_levels:
        levels.update(component_levels)

    config: dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "json": {
                "()": "app.logging.JsonFormatter",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "json",
                "stream": "ext://sys.stdout",
            },
        },
        "root": {
            "handlers": ["console"],
            "level": root_level,
        },
    }

    # Apply per-logger level overrides
    for logger_name, level in levels.items():
        config.setdefault("loggers", {})[logger_name] = {
            "level": level,
            "propagate": True,
        }

    return config


# Per-environment configuration:
def get_logging_config(env: str = "production") -> dict[str, Any]:
    """Return logging configuration appropriate for the given environment.

    Args:
        env: One of 'production', 'staging', 'development'.

    Returns:
        A complete logging configuration dictionary.
    """
    if env == "development":
        root_level = "DEBUG"  # Verbose debugging locally is fine
    elif env == "staging":
        root_level = "INFO"
    else:
        root_level = "INFO"  # production default

    return setup_tiered_logging(
        root_level=root_level,
        component_levels={
            "app.database": "DEBUG" if env == "development" else "WARNING",
            "sqlalchemy.engine": "DEBUG" if env == "development" else "WARNING",
        },
    )
```

---

## Constraints

### MUST DO
- Configure logging via `dictConfig` with JSON formatter — never use `basicConfig` with plain text in production services
- Include correlation ID on every log record using contextvars (async-safe) or thread-local storage (sync-only)
- Redact sensitive fields matching known patterns before serialization — treat redaction as a security control, not an optional feature
- Set root logger to `INFO` in production; use per-component overrides to tune noise
- Include exception traceback in log entries when catching exceptions (`exc_info=True`)
- Log all user-facing errors at minimum `ERROR` level with correlation ID and component context
- Structure extra fields with a consistent naming convention: lowercase, dot-separated namespaces (e.g., `component`, `user_id`, `request_path`)

### MUST NOT DO
- Log raw passwords, tokens, API keys, session cookies, or PII in any field — even DEBUG level
- Use `print()`, `logging.basicConfig()` without JSON formatter, or manual string formatting for production log output
- Set root logger to `DEBUG` or `NOTSET` in production environments
- Log the full request/response body for endpoints handling authentication or payment data
- Use synchronous file handlers in containerized services — always write to stdout/stderr and let the platform (Fluentd, Vector, Datadog Agent) handle log shipping
- Store correlation IDs in a global mutable variable without `contextvars` thread-safety guarantees

---

## Output Template

When implementing or auditing logging in a codebase, produce:

1. **Logger Configuration** — The full `dictConfig` dictionary with formatters, handlers, and level strategy
2. **Field Schema Documentation** — List of all structured fields the logger emits (e.g., `correlation_id`, `level`, `timestamp`, `service`, `component`)
3. **Redaction Coverage Report** — Which endpoints or code paths handle sensitive data and whether redaction filters are applied
4. **Level Policy Summary** — Per-logger level assignments with rationale for each override above the root level
5. **Verification Steps** — Commands to validate: `echo '{"test":"data"}' | python -m json.tool` for JSON validity, grep for `[REDACTED]` in sample output

---

## Related Skills

| Skill | Purpose |
| --- | --- |
| `observability-patterns` | Complements logging with metrics and distributed tracing — logs handle text events; metrics handle numeric trends; traces handle request flows |
| `software-error-handling` | Defines how errors are caught, wrapped, and logged — pairs with structured logging to ensure error context is complete |
| `engineering-principles` | Provides the underlying software engineering principles (separation of concerns, defense in depth) that justify structured logging practices |
