---




name: structured-logging
description: Implements structured JSON logging with correlation IDs, OpenTelemetry context propagation, and tiered log level strategies for production-grade observability in Python and Go services.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  content-types:
    - code
    - guidance
    - do-dont
    - examples
  triggers: structured logging, JSON logs, correlation ID, OpenTelemetry tracing, log levels, request tracing, how do i add structured logging, plain text vs structured logs
  archetypes:
    - tactical
    - diagnostic
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: production-readiness, error-handling-patterns, backpressure-handling, performance-optimization




---





# Structured Logging Patterns

Acts as a senior engineer implementing structured logging systems that produce machine-parsable JSON output with correlation IDs, OpenTelemetry context propagation, and tiered log level strategies — enabling request tracing across service boundaries and post-incident debugging from aggregated logs.

## TL;DR Checklist

- [ ] Configure `dictConfig` with JSON formatter — never use `basicConfig` with plain text in production services
- [ ] Inject correlation ID into every log record using `contextvars.ContextVar` (async-safe) or thread-local storage
- [ ] Enrich log records with OpenTelemetry trace_id and span_id from the active span context
- [ ] Redact sensitive fields (passwords, tokens, PII) via a registered logging filter before serialization
- [ ] Set root logger to `INFO` in production; use per-component overrides for framework noise suppression
- [ ] Sample high-volume DEBUG logs with a probabilistic sampler to prevent log flooding
- [ ] Validate every log line is valid JSON parseable by aggregation tools (`jq .`, `python -m json.tool`)

---

## When to Use

Use this skill when:

- Introducing logging to a service that currently uses `print()` or unstructured string formatting for output
- Debugging a production incident and logs lack correlation IDs, making request tracing impossible across component boundaries
- Designing a new microservice and establishing the logging contract (JSON schema, field conventions, severity levels) before writing business logic
- Migrating an existing codebase from plain-text log files to structured JSON logs consumed by Fluentd, Datadog, ELK, or Loki
- Configuring OpenTelemetry instrumentation and ensuring trace context flows through all logging calls for distributed tracing

---

## When NOT to Use

Avoid this skill for:

- **Simple scripts or one-off data pipelines** — A single `logging.basicConfig(level=logging.INFO)` with plain text output is sufficient; structured JSON adds indirection without benefit
- **Local development debugging where you only read logs in a terminal** — Plain text with colorized output is more readable; use structured logging only for services that run as daemons or in containers
- **Performance-critical inner loops that log at every iteration** — Logging itself introduces latency; instrument with metrics (counters, histograms) instead and reserve logging for boundary events

---

## Core Workflow

1. **Audit existing logging calls** — Inventory all current logging statements (`print()`, `logging.info()`, `console.log()`). Identify missing correlation IDs, inconsistent log formats, sensitive data exposure, and any code using unstructured string formatting.
   **Checkpoint:** Every function that handles user input, makes external API calls, or processes financial transactions must be verified for proper structured logging coverage.

2. **Define the JSON schema and logger configuration** — Set up `logging.config.dictConfig` (Python) or `slog` / `zap` (Go) with a consistent field schema: `timestamp`, `level`, `message`, `correlation_id`, `service`, `component`, `trace_id`, `span_id`. Output destination must be stdout for containerized environments.
   **Checkpoint:** Write a test that emits every supported log level and validate the output with `jq .` to confirm structural validity before proceeding.

3. **Implement correlation ID propagation** — Build a correlation ID mechanism using `contextvars.ContextVar[str | None]` (Python async-safe) or request-scoped context (Go `context.Context`) that generates IDs at the request boundary (HTTP middleware) and makes them available through every logging call in the execution chain.
   **Checkpoint:** Verify logs from database queries, HTTP client invocations, and background tasks all carry the same correlation ID as the originating request by tracing a single request end-to-end.

4. **Integrate OpenTelemetry context enrichment** — Configure the logger to read `trace_id` and `span_id` from the active OpenTelemetry span context on every log record. In Python, use `opentelemetry-api` with an InstrumentationScope; in Go, use `go.opentelemetry.io/otel/trace.ContextWithSpan`.
   **Checkpoint:** Emit a span at a service boundary and confirm the child component's logs contain matching `trace_id` and `span_id` values.

5. **Apply redaction filters and level policy** — Register a log filter that scans `extra` fields against known sensitive field patterns (`password`, `token`, `api_key`, `credit_card`, `ssn`) and replaces values with `[REDACTED]`. Set root logger to `INFO` in production with per-component overrides for framework noise suppression; sample high-volume DEBUG logs.
   **Checkpoint:** Fire a test request containing dummy PII (password, credit card number) and verify all log output redacts these fields before serialization.

---

## Implementation Patterns

### Pattern 1: JSON Structured Logger with Correlation IDs and Trace Context (BAD vs GOOD)

Plain `print()` or unstructured `logging.info(f"...")` calls produce text that no aggregation tool can parse, cannot be correlated across service boundaries, and hide errors in noise. Structured JSON logging solves all three problems.

```python
# ❌ BAD: Unstructured string logging — impossible to query, parse, or correlate
import datetime
import logging

logging.basicConfig(
    format="%(asctime)s %(levelname)-8s %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("app")


def create_user(email: str, name: str) -> dict:
    logger.info(f"Creating user {email} with name {name}")  # No structure, no fields
    # ... business logic ...
    logger.info(f"User created successfully: email={email}, id={user_id}")  # Inconsistent format
    return {"status": "created", "email": email}


def process_payment(amount: float, user_id: str) -> None:
    logger.debug(f"Processing payment for user {user_id}: ${amount:.2f}")  # No severity context, no correlation
    # ... payment logic ...
```

```python
# ✅ GOOD: Structured JSON logging with consistent field schema, correlation ID, and trace context
from __future__ import annotations

import json
import logging
import logging.config
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any

# -- Correlation ID via contextvars (async-safe) --
_correlation_id: ContextVar[str | None] = ContextVar("_correlation_id", default=None)


def set_correlation_id(cid: str | None = None) -> str:
    """Set or generate a correlation ID for the current execution context.

    Returns the correlation ID (either the provided one or a freshly generated UUID v4).
    """
    if cid is None:
        cid = str(uuid.uuid4())
    _correlation_id.set(cid)
    return cid


def get_correlation_id() -> str | None:
    return _correlation_id.get()


# -- Correlation ID filter (auto-injects into every log record) --
class CorrelationIdFilter(logging.Filter):
    """Injects the current correlation_id, trace_id, and span_id into every log record."""

    def __init__(self, tracer: Any | None = None) -> None:
        super().__init__()
        self._tracer = tracer

    def filter(self, record: logging.LogRecord) -> bool:
        cid = get_correlation_id()
        record.correlation_id = cid if cid else "none"

        # Enrich with OpenTelemetry trace context if available
        if self._tracer is not None:
            from opentelemetry import trace

            span = trace.get_current_span()
            ctx = span.get_context()
            trace_id = format(ctx.trace_id, "032x")
            span_id = format(ctx.span_id, "016x")
            record.trace_id = trace_id
            record.span_id = span_id
        else:
            record.trace_id = "none"
            record.span_id = "none"

        return True


# -- JSON formatter --
class JsonFormatter(logging.Formatter):
    """Formats log records as structured JSON with consistent fields."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": getattr(record, "correlation_id", "none"),
            "trace_id": getattr(record, "trace_id", "none"),
            "span_id": getattr(record, "span_id", "none"),
        }

        # Add service/component metadata from extra fields
        for key in ("service", "component", "user_id", "request_path", "http_method"):
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


# -- Logger configuration --
LOGGING_CONFIG: dict[str, Any] = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "correlation_id": {"()": __name__ + ".CorrelationIdFilter"},
    },
    "formatters": {"json": {"()": __name__ + ".JsonFormatter"}},
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
            "stream": "ext://sys.stdout",
            "filters": ["correlation_id"],
        },
    },
    "root": {"handlers": ["console"], "level": "INFO", "filters": ["correlation_id"]},
}


def setup_logging(tracer: Any | None = None) -> None:
    """Configure structured JSON logging via dictConfig.

    Args:
        tracer: Optional OpenTelemetry tracer instance for trace context enrichment.
    """
    config = LOGGING_CONFIG.copy()
    # Swap in the tracer-aware filter if provided
    if tracer is not None:
        config["filters"]["correlation_id"] = {"()": __name__ + ".CorrelationIdFilter", "tracer": tracer}
    logging.config.dictConfig(config)


# -- Usage example --
def create_user(email: str, name: str) -> dict:
    logger = logging.getLogger("app.users")
    logger.info("Creating user", extra={"component": "users", "email": email})

    # ... business logic to create the user ...
    user_id = 42

    logger.info(
        "User created successfully",
        extra={"component": "users", "user_id": user_id, "email": email},
    )
    return {"status": "created", "user_id": user_id, "email": email}
```

---

### Pattern 2: OpenTelemetry Context Propagation — Extract/Inject Trace Context (Python + Go)

Distributed tracing requires trace context to flow from the entry point through every downstream service. This pattern shows how to extract `traceparent` / `tracestate` headers at the HTTP boundary, inject them into log records, and propagate them across service boundaries in both Python and Go.

```python
# ✅ GOOD: Python — Extract trace context from HTTP headers and enrich all logs
from __future__ import annotations

import logging
import uuid
from http import HTTPStatus
from typing import Any


class TraceContextMiddleware:
    """HTTP middleware that extracts OpenTelemetry W3C Trace Context headers
    and injects correlation_id + trace/span IDs into the logging context.

    Works with FastAPI, Flask, Django ASGI/WSGI middleware, or any framework
    that supports request-response cycle hooks.
    """

    def __init__(self, tracer: Any | None = None) -> None:
        self._tracer = tracer

    def process_request(self, headers: dict[str, str]) -> tuple[str, str | None]:
        """Extract correlation ID and trace context from incoming HTTP headers.

        Args:
            headers: Incoming request headers as a case-insensitive mapping.

        Returns:
            Tuple of (correlation_id, parent_span_context) for downstream use.
        """
        # Extract or generate correlation ID
        cid = headers.get("X-Correlation-ID") or str(uuid.uuid4())
        set_correlation_id(cid)

        # Extract W3C Trace Context (traceparent header)
        traceparent = headers.get("Traceparent", "")
        parent_context: str | None = None
        if traceparent:
            parts = traceparent.split("-")
            if len(parts) == 4 and parts[0] == "00":
                # version-trace_id-span_id-trace_flags
                parent_context = "-".join(parts[1:])  # trace_id-span_id
                from opentelemetry import trace

                try:
                    context = trace.propagators.default_text_map_extractor.extract(
                        carrier={"traceparent": traceparent},
                        getter=trace.propagators.default_text_map_getter.get,
                    )
                    # Start child span inheriting parent context
                    self._tracer.start_as_current_span("http.request", context=context)
                except Exception:
                    # Graceful degradation: continue without tracing
                    pass

        return cid, parent_context


# -- Usage with a simulated request handler --
def handle_http_request(headers: dict[str, str], tracer: Any | None = None) -> dict[str, Any]:
    """Simulated HTTP request handler with full trace context propagation."""
    middleware = TraceContextMiddleware(tracer=tracer)
    cid, _ = middleware.process_request(headers)

    logger = logging.getLogger("app.http")
    logger.info(
        "Request started",
        extra={"component": "http", "correlation_id": cid},
    )

    # All downstream calls automatically carry correlation_id via contextvars
    result = process_business_logic()

    logger.info(
        "Request completed",
        extra={"component": "http", "status": HTTPStatus.OK},
    )
    return {"status": "ok", "correlation_id": cid}


def process_business_logic() -> dict:
    """Downstream function — correlation_id flows automatically via contextvars."""
    logger = logging.getLogger("app.business")
    logger.info("Business logic executed")  # correlation_id auto-injected by filter
    return {"result": "processed"}
```

```go
// ✅ GOOD: Go — Extract and inject OpenTelemetry trace context into structured logs
// File: internal/logging/otel_context.go

package logging

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
)

// TraceContextKey is the context key for passing trace context through handler chains.
type TraceContextKey struct{}

// TraceContext holds extracted OpenTelemetry context from incoming HTTP headers.
type TraceContext struct {
	CorrelationID string `json:"correlation_id"`
	TraceID       string `json:"trace_id,omitempty"`
	SpanID        string `json:"span_id,omitempty"`
}

// ExtractTraceContext extracts correlation ID and W3C trace context from HTTP headers.
// Returns a new context with the trace information stored, ready for downstream use.
func ExtractTraceContext(ctx context.Context, headers map[string]string) context.Context {
	// Extract or generate correlation ID
	correlationID := headers["X-Correlation-ID"]
	if correlationID == "" {
		correlationID = generateCorrelationID()
	}

	tc := TraceContext{CorrelationID: correlationID}

	// Extract W3C Trace Context (traceparent header)
	traceparent := headers["Traceparent"]
	if traceparent != "" {
		spanContext, err := extractTraceparent(traceparent)
		if err == nil && spanContext.IsValid() {
			tc.TraceID = spanContext.TraceID().String()
			tc.SpanID = spanContext.SpanID().String()

			// Restore remote span context for child spans
			ctx = otel.GetTextMapPropagator().Extract(ctx, traceHeaderCarrier(headers))

			// Start a new child span for this request handler
			_, span := otel.Tracer("app.http").Start(ctx, "http.request")
			ctx = trace.ContextWithSpan(ctx, span)
		}
	}

	return context.WithValue(ctx, TraceContextKey{}, tc)
}

// extractTraceparent parses a W3C traceparent header into a SpanContext.
func extractTraceparent(traceparent string) (trace.SpanContext, error) {
	parts := splitTraceparent(traceparent)
	if len(parts) != 4 || parts[0] != "00" {
		return trace.SpanContext{}, fmt.Errorf("invalid traceparent version")
	}

	traceID, err := trace.TraceIDFromHex(parts[1])
	if err != nil {
		return trace.SpanContext{}, fmt.Errorf("invalid trace_id: %w", err)
	}

	spanID, err := trace.SpanIDFromHex(parts[2])
	if err != nil {
		return trace.SpanContext{}, fmt.Errorf("invalid span_id: %w", err)
	}

	sc := trace.SpanContext{
		TraceID:    traceID,
		SpanID:     spanID,
		TraceFlags: trace.FlagsSampled,
	}

	if !sc.IsValid() {
		return trace.SpanContext{}, fmt.Errorf("span context not valid")
	}

	return sc, nil
}

// enrichWithTrace adds trace_id and span_id to the slog attributes.
func enrichWithTrace(ctx context.Context, attrs ...slog.Attr) []slog.Attr {
	span := trace.SpanFromContext(ctx)
	if !span.IsValid() {
		return append(attrs, slog.String("trace_id", "none"), slog.String("span_id", "none"))
	}

	sc := span.SpanContext()
	return append(attrs,
		slog.String("trace_id", sc.TraceID().String()),
		slog.String("span_id", sc.SpanID().String()),
	)
}

// LogInfo logs an info-level structured message with trace context enrichment.
func LogInfo(ctx context.Context, msg string, attrs ...slog.Attr) {
	tc, _ := ctx.Value(TraceContextKey{}).(TraceContext)

	allAttrs := enrichWithTrace(ctx,
		slog.String("correlation_id", tc.CorrelationID),
		slog.Time("timestamp", time.Now().UTC()),
	)
	allAttrs = append(allAttrs, attrs...)

	slog.InfoContext(ctx, msg, allAttrs...)
}

// --- Helper utilities ---

func splitTraceparent(header string) []string {
	parts := make([]string, 4)
	n := 0
	start := 0
	for i, c := range header {
		if c == '-' {
			if n < 4 {
				parts[n] = header[start:i]
				n++
				start = i + 1
			}
		}
	}
	if start < len(header) && n < 4 {
		parts[n] = header[start:]
	}
	return parts[:n]
}

type traceHeaderCarrier map[string]string

func (c traceHeaderCarrier) Get(key string) string { return c[key] }
func (c traceHeaderCarrier) Keys() []string        { keys := make([]string, 0, len(c)); for k := range c { keys = append(keys, k) }; return keys }

func generateCorrelationID() string {
	return fmt.Sprintf("req-%d-%s", time.Now().UnixNano(), randomHex(8))
}

func randomHex(n int) string {
	bytes := make([]byte, n/2+1)
	// Simplified — in production use crypto/rand
	for i := range bytes {
		bytes[i] = byte(i * 17) & 0xff
	}
	return fmt.Sprintf("%x", bytes)[:n]
}

// LoggableHTTPRequest demonstrates a complete HTTP handler with full trace context propagation.
func LoggableHTTPRequest(ctx context.Context, r *http.Request) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		// Extract trace context from incoming headers
		ctx = ExtractTraceContext(ctx, map[string]string{
			"X-Correlation-ID": req.Header.Get("X-Correlation-ID"),
			"Traceparent":      req.Header.Get("Traceparent"),
		})

		tc := ctx.Value(TraceContextKey{}).(TraceContext)

		// Log the incoming request with full trace context
		LogInfo(ctx, "HTTP request received",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", 0), // will update on completion
		)

		defer func() {
			LogInfo(ctx, "HTTP request completed")
		}()

		// Delegate to downstream handler — trace context flows automatically
		nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// All downstream LogInfo calls inherit ctx with trace context
			LogInfo(ctx, "Processing business logic")
			w.WriteHeader(200)
		})

		nextHandler.ServeHTTP(w, req.WithContext(ctx))
	})
}
```

---

### Pattern 3: Log Level Strategy — Sampling for High-Volume DEBUG (BAD vs GOOD)

Using `DEBUG` level everywhere in production floods log aggregation with noise and buries real errors. Using only `INFO` loses actionable context during debugging. A tiered strategy balances signal against noise, with probabilistic sampling for high-frequency DEBUG paths.

```python
# ❌ BAD: Either all DEBUG everywhere or INFO-only with no tuning
import logging

logging.basicConfig(level=logging.DEBUG)  # DEBUG floods production logs; every DB query logged

logger = logging.getLogger("app")
logger.info("Request received")          # Too verbose — can't distinguish issues
logger.debug(f"SQL: SELECT * FROM users WHERE id = {user_id}")  # Query exposure in prod
logger.debug(f"Cache hit for key={cache_key}")  # Thousands of cache hits per second
```

```python
# ✅ GOOD: Tiered log level strategy with per-component overrides and DEBUG sampling
from __future__ import annotations

import logging.config
import random
from typing import Any


class SampledDebugFilter(logging.Filter):
    """Probabilistic sampler for DEBUG-level log records.

    When enabled, only a configurable percentage of DEBUG logs pass through.
    This prevents high-frequency DEBUG logs (e.g., cache hits, heartbeat checks)
    from overwhelming log aggregation systems while preserving the ability to
    set sampling_rate=1.0 for debugging specific issues in production.
    """

    def __init__(self, sample_rate: float = 0.01, name: str = "") -> None:
        super().__init__(name)
        self.sample_rate = max(0.0, min(1.0, sample_rate))

    def filter(self, record: logging.LogRecord) -> bool:
        # Always allow non-DEBUG levels through
        if record.levelno != logging.DEBUG:
            return True
        # Probabilistic sampling for DEBUG level only
        return random.random() < self.sample_rate


# -- Tiered log level strategy configuration --
LOG_LEVEL_STRATEGY: dict[str, str] = {
    # Application root — INFO in production
    "": "INFO",

    # Application components
    "app.users": "INFO",
    "app.payments": "INFO",
    "app.gateway": "INFO",

    # Suppress noise from third-party libraries
    "sqlalchemy.engine": "WARNING",       # Raw SQL queries
    "httpx": "WARNING",                  # HTTP client debug noise
    "urllib3.connectionpool": "WARNING", # Connection pool activity
    "boto3": "WARNING",
    "botocore": "WARNING",

    # Framework internal logs — informational noise in production
    "fastapi.middleware": "WARNING",
    "uvicorn.error": "INFO",
    "uvicorn.access": "INFO",
}


def setup_tiered_logging(
    root_level: str = "INFO",
    component_levels: dict[str, str] | None = None,
    debug_sample_rate: float = 0.01,
) -> dict[str, Any]:
    """Build and return a tiered logging configuration for production use.

    Args:
        root_level: Base log level (INFO in prod, DEBUG locally).
        component_levels: Per-logger level overrides.
        debug_sample_rate: Fraction of DEBUG logs that pass through (0.01 = 1%).

    Returns:
        A dictConfig-compatible configuration dictionary.
    """
    levels = dict(LOG_LEVEL_STRATEGY)
    if component_levels:
        levels.update(component_levels)

    config: dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "debug_sampler": {"()": __name__ + ".SampledDebugFilter", "sample_rate": debug_sample_rate},
        },
        "formatters": {"json": {"()": "app.logging.JsonFormatter"}},
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
            "filters": ["debug_sampler"] if root_level == "DEBUG" else [],
        },
    }

    for logger_name, level in levels.items():
        logger_config: dict[str, Any] = {"level": level, "propagate": True}
        # Apply debug sampling filter to loggers set at DEBUG level
        if level == "DEBUG" and logger_name != "":
            logger_config["filters"] = ["debug_sampler"]
        config.setdefault("loggers", {})[logger_name] = logger_config

    return config


# -- Per-environment configuration --
def get_logging_config(env: str = "production") -> dict[str, Any]:
    """Return logging configuration appropriate for the given environment.

    Args:
        env: One of 'production', 'staging', 'development'.

    Returns:
        A complete logging configuration dictionary.
    """
    if env == "development":
        root_level = "DEBUG"  # Verbose debugging locally is fine, no sampling
        debug_sample_rate = 1.0  # Log all DEBUG in dev
    elif env == "staging":
        root_level = "INFO"
        debug_sample_rate = 0.05  # Sample at 5% in staging for debugging
    else:
        root_level = "INFO"  # production default
        debug_sample_rate = 0.01  # Sample at 1% in production

    return setup_tiered_logging(
        root_level=root_level,
        component_levels={
            "app.database": "DEBUG" if env == "development" else "WARNING",
            "sqlalchemy.engine": "DEBUG" if env == "development" else "WARNING",
        },
        debug_sample_rate=debug_sample_rate,
    )


# -- Health check endpoint pattern --
def health_check_logger(logger: logging.Logger) -> dict[str, Any]:
    """Health check handler that uses WARNING level so it survives in production.

    Health checks should be logged at WARNING (or INFO) rather than DEBUG,
    because they fire every few seconds and would be sampled to silence by
    the debug sampler if logged at DEBUG level.
    """
    logger.warning(
        "Health check",
        extra={"component": "health", "status": "pass"},
    )
    return {"status": "healthy"}
```

---

## Constraints

### MUST DO

- Configure logging via `logging.config.dictConfig` (Python) or `slog`/`zap` (Go) with JSON formatter — never use `basicConfig` with plain text in production services
- Include correlation ID on every log record using `contextvars.ContextVar` (async-safe in Python) or `context.Context` (Go) for request-scoped propagation
- Redact sensitive fields matching known patterns (`password`, `token`, `api_key`, `credit_card`, `ssn`) before serialization via a registered logging filter — treat redaction as a security control, not an optional feature
- Set root logger to `INFO` in production; use per-component overrides to suppress framework noise (e.g., `sqlalchemy.engine` → `WARNING`, `httpx` → `WARNING`)
- Include exception traceback in log entries when catching exceptions (`exc_info=True` in Python); always capture `trace_id` and `span_id` from the active OpenTelemetry span
- Log all user-facing errors at minimum `ERROR` level with correlation ID, component context, and relevant request metadata (HTTP method, path, status)
- Structure extra fields with consistent naming: lowercase, dot-separated namespaces (`component`, `user_id`, `request_path`, `http_method`)
- Use probabilistic sampling for high-volume DEBUG logs (1–5% sample rate in production) to prevent log flooding while preserving debugging capability

### MUST NOT DO

- Log raw passwords, tokens, API keys, session cookies, or PII in any field — even at `DEBUG` level; redaction must be automatic and transparent
- Use `print()`, manual string formatting (`f"..."`) for production log output; these produce unstructured text that aggregation tools cannot parse
- Set root logger to `DEBUG` or `NOTSET` in production environments — this floods log aggregation with framework noise
- Log the full request/response body for endpoints handling authentication, payment data, or PII — log only summary metadata (method, path, status code)
- Use synchronous file handlers in containerized services — always write to stdout/stderr and let the platform (Fluentd, Vector, Datadog Agent) handle log shipping
- Store correlation IDs in a global mutable variable without thread/context safety guarantees — `contextvars` in Python, `context.Context` in Go are required for async-safe propagation

---

## Output Template

When implementing or auditing structured logging in a codebase, produce:

1. **Logger Configuration** — The complete `dictConfig` dictionary (Python) or `slog` handler configuration (Go) with formatters, filters, handlers, and level strategy
2. **Field Schema Documentation** — List of all structured fields the logger emits (`correlation_id`, `trace_id`, `span_id`, `level`, `timestamp`, `service`, `component`) with types and descriptions
3. **Redaction Coverage Report** — Which endpoints or code paths handle sensitive data and whether redaction filters are applied to their logging calls
4. **Level Policy Summary** — Per-logger level assignments with rationale for each override above the root level; include sample rates for DEBUG-enabled loggers
5. **Verification Steps** — Commands to validate: pipe output through `jq .` for JSON validity, grep for `[REDACTED]` in sample output, confirm trace IDs propagate end-to-end

---

## Related Skills

| Skill | Purpose |
|---|---|
| `production-readiness` | Broader production checklist including health checks, graceful shutdown, and resource limits — structured logging is one pillar of production readiness |
| `error-handling-patterns` | Defines how errors are caught, wrapped, and logged — pairs with structured logging to ensure error context (stack trace, correlation ID) is complete in every error log |
| `backpressure-handling` | Manages flow control when downstream services are slow — structured logs at WARNING/ERROR level provide the observability needed to detect backpressure conditions |
| `performance-optimization` | Identifies and resolves latency bottlenecks — correlation IDs from structured logging enable request-level profiling across service boundaries |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Python logging cookbook](https://docs.python.org/3/howto/logging-cookbook.html) — Advanced patterns for the standard library logger
- [OpenTelemetry Python semantic conventions](https://opentelemetry.io/docs/specs/semconv/general/trace/) — Standard log attribute names for distributed tracing
- [Go log/slog package](https://pkg.go.dev/log/slog) — Structured logging with groups and levels (Go 1.21+)
- [W3C Trace Context specification](https://www.w3.org/TR/trace-context/) — Interoperable trace context propagation standard
- [JSON log best practices (EFK stack)](https://www.elastic.co/guide/en/elasticsearch/reference/current/json.html) — Schema design for Elasticsearch ingestion
