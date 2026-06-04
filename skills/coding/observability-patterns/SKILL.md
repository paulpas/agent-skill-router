---




name: observability-patterns
description: Implements structured logging, Prometheus metrics collection, and distributed
  tracing with OpenTelemetry for production systems to enable debugging, performance
  monitoring, and incident response.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: observability, structured logging, metrics, distributed tracing, open
    telemetry, prometheus, health checks, debug production
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
  related-skills: code-review, security-review, software-design-principles




---




# Observability Patterns for Production Systems

Implements structured logging, metrics collection, and distributed tracing to make production systems debuggable, performant, and incident-resilient. When this skill is loaded, the model produces concrete observability code — not generic monitoring advice.

## TL;DR Checklist

- [ ] All log output uses structured JSON with `trace_id` and `span_id` correlation fields
- [ ] Metrics follow Prometheus naming: `{namespace}_{subsystem}_{name}_{unit}` convention
- [ ] Every public HTTP/gRPC endpoint exposes request latency histogram and request counter
- [ ] Health checks expose `/healthz` (liveness) and `/readyz` (readiness) as separate endpoints
- [ ] Distributed tracing is initialized at service entry with context propagation through async boundaries
- [ ] Alert rules reference specific metric thresholds, not vague "high error rate"

---

## When to Use

- Designing observability for a new microservice or monolith module
- Adding debugging capability to an existing production system that has none
- Investigating performance regressions — set up metrics and tracing before profiling
- Building runbooks for incident response that rely on specific metric thresholds
- Migrating from opaque logging (plain text, no structure) to structured observability

## When NOT to Use

- For simple scripts or CLI tools where process exit codes are sufficient
- When the system has fewer than 10 requests/day — overhead outweighs benefit
- As a substitute for writing tests — observability catches runtime issues, not development bugs
- Without a concrete alerting strategy — metrics without alerts create dashboard noise

---

## Core Workflow

1. **Design Log Levels Strategy** — Define which log levels map to which output destinations. ERROR → PagerDuty/webhook, WARN → Slack channel + structured logs, INFO → local file, DEBUG → disabled in production. **Checkpoint:** Confirm that no PII or secrets appear in any log level.

2. **Set Up Metrics Collection** — Register Prometheus-compatible counters, histograms, and gauges for your service's public interface. Every HTTP/gRPC handler should record `request_duration_seconds` (histogram) and `requests_total` (counter with labels). **Checkpoint:** Verify metric naming follows `{namespace}_{subsystem}_{name}_{unit}` convention.

3. **Inject Distributed Tracing** — Initialize OpenTelemetry tracer at service entry point. Inject trace context into all outgoing HTTP requests via baggage/headers. Extract incoming context from `traceparent` headers on request entry. **Checkpoint:** Confirm spans cross async boundaries (thread pools, event loops) using context managers or explicit propagation.

4. **Create Alert Rules** — Define alerting thresholds based on real metrics: 95th percentile latency > 500ms for more than 2 minutes, error rate counter delta > 10 per minute, availability gauge dropping below 0.99. **Checkpoint:** Every alert must reference a specific metric name and include runbook URL annotation.

5. **Design Dashboard Layout** — Build dashboards organized by service health (top), business KPIs (middle), and infrastructure signals (bottom). Each dashboard must answer: "Is the system healthy?" in under 10 seconds. **Checkpoint:** No dashboard should require more than one scroll to see all critical signals.

---

## Implementation Patterns

### Pattern 1: Structured Logging with Correlation IDs

Structured logging uses JSON output with consistent fields across every log statement. The correlation ID (`trace_id`) ties together all log entries and spans for a single request as it flows through services.

```python
# ❌ BAD: Unstructured text logs — impossible to search, correlate, or parse automatically
def process_order(order_id: str) -> None:
    print(f"Processing order {order_id}")  # No structure, no context
    try:
        charge_payment(order_id)
    except PaymentError as e:
        print(f"Payment failed for {order_id}: {e}")  # Still unstructured
        return
```

```python
# ✅ GOOD: Structured JSON logging with correlation IDs from OpenTelemetry
import json
import logging
import uuid
from typing import Any

logger = logging.getLogger("observability")


class CorrelationFilter(logging.Filter):
    """Injects trace_id and span_id into every log record from the current context."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            from opentelemetry import trace

            span = trace.get_current_span()
            ctx = span.get_span_context()
            if ctx.is_valid:
                record.trace_id = f"{ctx.trace_id:032x}"
                record.span_id = f"{ctx.span_id:016x}"
            else:
                # Fallback: generate a correlation ID for non-traced paths
                record.trace_id = getattr(record, "trace_id", str(uuid.uuid4())[:8])
                record.span_id = "none"
        except Exception:
            record.trace_id = getattr(record, "trace_id", "unavailable")
            record.span_id = "unavailable"
        return True


def setup_logging(level: str = "INFO") -> logging.Logger:
    """Configure structured JSON logging for production use.

    Args:
        level: Log level string (DEBUG, INFO, WARNING, ERROR, CRITICAL).

    Returns:
        Configured logger instance with JSON formatter and correlation filter.
    """
    logger = logging.getLogger("observability")
    logger.setLevel(getattr(logging, level.upper()))

    handler = logging.StreamHandler()
    handler.setFormatter(StructuredJsonFormatter())
    handler.addFilter(CorrelationFilter())

    # Avoid duplicate handlers on re-initialization
    if not logger.handlers:
        logger.addHandler(handler)

    return logger


class StructuredJsonFormatter(logging.Formatter):
    """Formats log records as single-line JSON for structured log aggregation."""

    def format(self, record: logging.LogRecord) -> str:
        log_data: dict[str, Any] = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "trace_id": getattr(record, "trace_id", "none"),
            "span_id": getattr(record, "span_id", "none"),
        }
        # Include extra fields if present on the log record
        for key in ("module", "function", "line"):
            val = getattr(record, key, None)
            if val:
                log_data[key] = val
        return json.dumps(log_data, default=str)


def log_request(
    logger: logging.Logger,
    method: str,
    path: str,
    status_code: int,
    duration_seconds: float,
    trace_id: str,
) -> None:
    """Log an HTTP request as a structured JSON event.

    Args:
        logger: Configured observability logger instance.
        method: HTTP method (GET, POST, etc.).
        path: Request URL path.
        status_code: Response HTTP status code.
        duration_seconds: Request processing time in seconds.
        trace_id: OpenTelemetry trace correlation ID.
    """
    logger.info(
        "HTTP request completed",
        extra={
            "module": "http_handler",
            "function": "log_request",
            "line": 0,
        },
    )


def process_order(order_id: str) -> None:
    """Process an order with structured logging and correlation."""
    logger = setup_logging("INFO")

    try:
        logger.info(
            "Order processing started",
            extra={"module": "order_service", "function": "process_order"},
        )
        charge_payment(order_id)
        logger.info("Order processed successfully")
    except PaymentError as exc:
        logger.error(
            "Payment failed during order processing",
            extra={
                "module": "order_service",
                "function": "process_order",
                "error_type": type(exc).__name__,
                "error_detail": str(exc),
            },
        )
        raise
```

---

### Pattern 2: Prometheus Metrics Exporter with Counters, Histograms, and Gauges

Every public-facing service must expose a `/metrics` endpoint that returns Prometheus-format metrics. Use counters for event totals, histograms for latency distributions, and gauges for current-state values.

```python
# ❌ BAD: No metrics at all — the service is blind in production
@app.route("/api/orders", methods=["POST"])
def create_order():
    order = parse_request()
    db.save(order)
    return {"status": "created"}, 201
```

```python
# ✅ GOOD: Full Prometheus metrics exporter with proper naming and labels
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from prometheus_client import CollectorRegistry
import time
from typing import Optional


class ServiceMetrics:
    """Prometheus metrics collector for an order processing service.

    Metric naming follows the convention: {namespace}_{subsystem}_{name}_{unit}
    Labels must be chosen carefully — high-cardinality labels (user_id, IP address)
    are forbidden as they cause Prometheus cardinality explosion.
    """

    def __init__(self, registry: Optional[CollectorRegistry] = None):
        self._registry = registry or CollectorRegistry()

        # Counters: monotonically increasing event counts
        self.request_total = Counter(
            "order_service_request_total",
            "Total number of incoming requests",
            labelnames=["method", "path", "status_code"],
            registry=self._registry,
        )
        self.order_created_total = Counter(
            "order_service_order_created_total",
            "Total number of orders successfully created",
            labelnames=["payment_method"],
            registry=self._registry,
        )
        self.payment_failed_total = Counter(
            "order_service_payment_failed_total",
            "Total number of payment processing failures",
            labelnames=["error_type"],
            registry=self._registry,
        )

        # Histogram: request latency distribution with automatic bucketing
        self.request_duration_seconds = Histogram(
            "order_service_request_duration_seconds",
            "HTTP request duration in seconds",
            labelnames=["method", "path"],
            buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
            registry=self._registry,
        )

        # Gauges: point-in-time values that go up and down
        self.active_orders_gauge = Gauge(
            "order_service_active_orders",
            "Number of orders currently being processed",
            registry=self._registry,
        )
        self.payment_queue_depth_gauge = Gauge(
            "order_service_payment_queue_depth",
            "Current number of payments waiting in queue",
            registry=self._registry,
        )

    def record_request(
        self,
        method: str,
        path: str,
        status_code: int,
        duration_seconds: float,
    ) -> None:
        """Record an HTTP request metric for Prometheus ingestion.

        Args:
            method: HTTP method string.
            path: Request URL path (use parameterized paths like /orders/{id}).
            status_code: Response HTTP status code integer.
            duration_seconds: Wall clock time for the request in seconds.
        """
        self.request_total.labels(
            method=method, path=path, status_code=str(status_code)
        ).inc()
        self.request_duration_seconds.labels(method=method, path=path).observe(
            duration_seconds
        )

    def export_metrics(self) -> bytes:
        """Return Prometheus-format metrics as bytes for the /metrics endpoint.

        Returns:
            Prometheus exposition format bytes.
        """
        return generate_latest(self._registry)


# Usage within a request handler
metrics = ServiceMetrics()


def handle_create_order(request) -> dict:
    method = request.method
    path = "/api/orders"
    start_time = time.monotonic()

    try:
        order = parse_request_body(request)
        metrics.active_orders_gauge.inc()

        result = process_order(order)

        metrics.order_created_total.labels(
            payment_method=order.payment_method
        ).inc()
        duration = time.monotonic() - start_time
        metrics.record_request(method, path, 201, duration)
        return {"status": "created", "order_id": result.id}, 201

    except PaymentError as exc:
        metrics.payment_failed_total.labels(
            error_type=type(exc).__name__
        ).inc()
        duration = time.monotonic() - start_time
        metrics.record_request(method, path, 502, duration)
        raise
```

---

### Pattern 3: Distributed Tracing with OpenTelemetry and Context Propagation

Distributed tracing injects trace context into every service boundary — HTTP headers, message queue messages, and async task payloads. The `traceparent` header (W3C Trace Context spec) is the standard for HTTP propagation.

```python
# ❌ BAD: Tracing initialized but context lost across async boundaries
from opentelemetry import trace

tracer = trace.get_tracer(__name__)


async def handle_request(request):
    with tracer.start_as_current_span("handle_request") as span:
        # ❌ Context is NOT propagated to this background task
        asyncio.create_task(process_payment(request.order_id))
        return {"status": "ok"}
```

```python
# ✅ GOOD: Full OpenTelemetry initialization with context propagation through all boundaries
import asyncio
from contextlib import asynccontextmanager
from typing import Any, Optional

from opentelemetry import trace, metrics as metrics_api
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.propagate import inject, extract
from opentelemetry.propagators.textmap import DictGetter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor


# Global tracer provider — initialized once at application startup
_service_name: str = "order-service"
_resource = Resource.create({"service.name": _service_name})
_provider: Optional[TracerProvider] = None


def init_tracing(otlp_endpoint: str = "http://localhost:4317") -> TracerProvider:
    """Initialize OpenTelemetry tracing with OTLP gRPC exporter.

    This function is called once during application startup, before any
    request handling begins. It sets the global tracer provider and configures
    span batching for efficient network transport.

    Args:
        otlp_endpoint: OTLP trace collector endpoint URL (gRPC, not HTTP).

    Returns:
        Configured TracerProvider instance ready to create spans.
    """
    global _provider

    if _provider is not None:
        return _provider  # Already initialized

    resource = Resource.create({"service.name": _service_name})
    _provider = TracerProvider(resource=resource)

    otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
    batch_processor = BatchSpanProcessor(otlp_exporter, max_queue_size=2048)
    _provider.add_span_processor(batch_processor)

    trace.set_tracer_provider(_provider)
    return _provider


def get_tracer() -> trace.Tracer:
    """Get the global tracer instance after initialization.

    Returns:
        OpenTelemetry Tracer for creating spans in this module.

    Raises:
        RuntimeError: If init_tracing() has not been called yet.
    """
    if _provider is None:
        raise RuntimeError("Tracing not initialized. Call init_tracing() at startup.")
    return _provider.get_tracer(f"{_service_name}.handlers")


def extract_context_from_request(request_headers: dict[str, str]) -> dict[str, Any]:
    """Extract trace context from incoming HTTP request headers.

    Uses W3C Trace Context (traceparent header) or B3 multi-header format
    depending on what the upstream service sent.

    Args:
        request_headers: Dict of HTTP headers from the incoming request.

    Returns:
        Propagation carrier dict suitable for trace context extraction.
    """
    return DictGetter().extract(request_headers)


async def handle_request(request_headers: dict[str, str]) -> dict[str, Any]:
    """Handle an incoming request with full distributed tracing.

    Extracts context from the incoming request, creates a root span, and
    propagates trace context to all downstream calls (HTTP, DB, message queues).

    Args:
        request_headers: Incoming HTTP headers containing traceparent or B3 headers.

    Returns:
        Response dict with status information.
    """
    tracer = get_tracer()
    ctx = extract_context_from_request(request_headers)

    with tracer.start_as_current_span(
        "handle_request", context=ctx, kind=trace.SpanKind.SERVER
    ) as span:
        # Record request metadata as span attributes
        span.set_attribute("http.method", "POST")
        span.set_attribute("http.url", "/api/orders")

        order_id = await process_order(span=span)

        span.set_attribute("order.id", order_id)
        return {"status": "processed", "order_id": order_id}


async def process_payment(order_id: str, parent_span: trace.Span) -> None:
    """Process payment with proper trace context propagation.

    This function runs as a background task and MUST propagate the parent
    span's context to maintain the distributed trace. Using an async context
    manager ensures the new span is properly nested under the caller's span.

    Args:
        order_id: The order to process payment for.
        parent_span: The OpenTelemetry span from the request handler.
    """
    tracer = get_tracer()

    # ✅ Context propagation through async task boundary
    ctx = trace.set_span_in_context(parent_span)
    with tracer.start_as_current_span(
        "process_payment", context=ctx, kind=trace.SpanKind.CLIENT
    ) as payment_span:
        payment_span.set_attribute("payment.order_id", order_id)

        try:
            await call_payment_gateway(order_id)
            payment_span.set_status(trace.Status(trace.StatusCode.OK))
        except PaymentGatewayError as exc:
            payment_span.set_status(
                trace.Status(trace.StatusCode.ERROR, str(exc))
            )
            payment_span.record_exception(exc)


def inject_context_into_outgoing_request(
    headers: dict[str, str], order_id: str
) -> dict[str, str]:
    """Inject current trace context into an outgoing HTTP request.

    This ensures the downstream service can continue the distributed trace.
    The `traceparent` header is set per W3C Trace Context specification.

    Args:
        headers: Mutable dict of HTTP headers for the outgoing request.
        order_id: Order identifier to include as a baggage item.

    Returns:
        Headers dict with `traceparent` (and optionally `baggage`) injected.
    """
    # Inject W3C trace context into the headers dict
    inject(headers, setter=dict.__setitem__)

    # Optionally add business-level correlation data via baggage
    from opentelemetry.baggage import set_baggage

    span = trace.get_current_span()
    if span.is_recording():
        set_baggage("order_id", order_id)

    return headers
```

---

## Constraints

### MUST DO
- Use structured JSON logging — no plain text print statements in production code
- Include `trace_id` in every log line for request correlation across services
- Name metrics using `{namespace}_{subsystem}_{name}_{unit}` convention consistently
- Label histograms and counters with low-cardinality values only (method, path, status_code)
- Never label metrics with user_id, IP address, or any high-cardinality field
- Initialize OpenTelemetry tracing at application startup before accepting requests
- Propagate trace context through ALL service boundaries: HTTP, message queues, async tasks
- Separate liveness (`/healthz`) from readiness (`/readyz`) health check endpoints
- Record latency with histograms — not counters or gauges
- Include `span.record_exception(exc)` for every caught exception in a span

### MUST NOT DO
- Log passwords, API keys, tokens, PII (SSN, email, phone), or credit card numbers at any level
- Use `time.time()` for request duration — use `time.monotonic()` instead
- Create Prometheus metrics inside hot loops without checking if they're registered
- Call `trace.get_tracer_provider()` before calling `set_tracer_provider()` at startup
- Use thread-local storage to pass trace context across async boundaries (it breaks event loops)
- Disable tracing in production for debugging — use sampling instead of disabling entirely
- Add labels with cardinality greater than 1,000 unique values per metric

---

## Output Template

When implementing or reviewing observability code, produce:

1. **Logging Design** — Log level strategy, JSON formatter config, correlation ID injection mechanism
2. **Metrics Registry** — List of all counters/histograms/gauges with naming convention and label definitions
3. **Tracing Initialization** — TracerProvider setup, span processor configuration, export endpoint
4. **Context Propagation** — How trace context is extracted from incoming requests and injected into outgoing calls
5. **Health Check Endpoints** — Liveness probe checks (process alive) vs readiness probe checks (dependencies healthy)

---

## Related Skills

| Skill                  | Purpose                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `code-review`          | Review observability code for missing metrics or log gaps    |
| `security-review`      | Audit logs and traces for PII leaks and secret exposure      |
| `software-design-principles` | Design service boundaries that produce meaningful trace spans |
