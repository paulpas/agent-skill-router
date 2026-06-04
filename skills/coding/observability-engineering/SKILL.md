---
name: observability-engineering
description: Designs observability engineering systems with SLO-driven instrumentation,
  multi-window burn rate alerting, OpenTelemetry patterns, signal correlation, and
  cost governance for production reliability.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: observability engineering, SLO SLI error budget, burn rate alerting, open
    telemetry instrumentation, distributed tracing strategy, signal correlation, observability
    cost management, how do i design observability, multi-window burn rate, OTel collector
    architecture
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
  - config
  - examples
  - diagrams
  related-skills: coding-observability-patterns, coding-production-readiness, cncf-open-telemetry
---
# Observability Engineering Framework

Designs observability systems that enable interactive investigation of unknown unknowns — not just monitoring known failure modes. When loaded, the model acts as a senior reliability engineer who defines user-centric SLIs, calculates multi-window burn rates, instruments services with OpenTelemetry following semantic conventions, architectes Collector pipelines, and establishes cost governance for signal retention. Applies the five laws of elegant defense: validate inputs at every telemetry boundary (Law 2), fail fast with descriptive error messages including context (Law 4), return new data structures for clean state transitions during incident recovery (Law 3), guide data naturally through failure scenarios (Law 1), and ensure graceful degradation prevents cascading observability failures (Law 5).

## TL;DR Checklist

- [ ] Every SLI is user-centric — measures what the end user experiences, not internal infrastructure metrics
- [ ] SLO targets are defined per service with warning/critical thresholds for error budget consumption
- [ ] Multi-window burn rate alerts use Google's two-burn-rate approach (fast + slow windows)
- [ ] OpenTelemetry instrumentation uses semantic conventions and propagates context across async boundaries
- [ ] OTel Collector config includes memory limiter, batch processor, and attribute enrichment
- [ ] Signal retention policy is defined: traces (7–14 days hot), logs (30–90 days), metrics (unlimited aggregated)
- [ ] Cost estimate per signal type is calculated before committing instrumentation strategy

---

## When to Use

Use this skill when:

- Designing observability from scratch for a new microservice or system architecture
- Defining SLOs and error budgets that align with actual user experience
- Implementing multi-window burn rate alerting using Google SRE methodology
- Architecting OpenTelemetry Collector pipelines for production telemetry aggregation
- Conducting signal correlation strategy — determining which signals to correlate and how
- Estimating observability costs (storage, ingestion, egress) before deploying instrumentation at scale

---

## When NOT to Use

Avoid this skill for:

- Setting up basic Prometheus scraping targets or writing individual PromQL queries — use `coding-observability-patterns` instead
- Configuring Grafana dashboard layouts as standalone visualizations — that is a presentation concern
- Simple scripts, CLI tools, or batch jobs where process exit codes are sufficient
- Situations where the system handles fewer than 10 requests per day — observability overhead outweighs benefit

---

## Core Workflow

1. **Define User-Centric SLIs** — Identify 3–5 service-level indicators that directly measure what end users experience. Each SLI must be a quantitative ratio: good events / total events. Use HTTP success rates, latency percentiles under thresholds, or business transaction completion rates. Never define an SLI based on CPU, memory, or disk metrics — those are infrastructure signals, not user signals.

   **Checkpoint:** Every SLI has a metric expression that starts with `sum(rate(...))` or equivalent counting logic and a clearly defined "bad event" condition (5xx responses, failed health checks, timeout errors).

2. **Set SLO Targets and Error Budget Policy** — For each SLI, define the target availability fraction (e.g., 0.999 for "four nines") with warning and critical thresholds. Calculate the error budget as `1.0 - slo_target` and define response procedures at different consumption levels (warning at 25%, stability sprint at 50%, feature freeze at 100%). Store the policy as structured data that can be evaluated programmatically.

   **Checkpoint:** Error budget is expressed as both a fraction (e.g., 0.001) and an absolute time allowance (e.g., "43.2 minutes per month"). Response procedures are actionable, not abstract.

3. **Implement Multi-Window Burn Rate Alerting** — Deploy Google's two-burn-rate alerting pattern: evaluate burn rate over a fast window (5m or 30m) AND a slow window (1h or 6h). Critical alerts fire when fast burn > 14.4x AND slow burn > 1x (budget exhausted in ~2 hours). Warning alerts fire when fast burn > 6x AND slow burn > 1x (exhausted in ~6 hours). The dual-window approach prevents false positives from transient spikes.

   **Checkpoint:** Every burn rate alert includes BOTH a fast-window query and a slow-window query combined with `and on(job)`. A single-window alert is insufficient — it fires on noise or misses sustained degradation.

4. **Instrument Services with OpenTelemetry** — Initialize the OTel SDK at service entry with proper resource attributes (service.name, service.version, deployment.environment). Apply semantic conventions for HTTP spans (`http.method`, `http.status_code`, `url.path`). Inject context propagation through async boundaries using context managers or explicit span creation. For client calls to external services, create child spans with `SpanKind.CLIENT` and set server address attributes.

   **Checkpoint:** Every outgoing request includes trace context in headers (OTEL propagator: W3C TraceContext). Incoming requests extract context from `traceparent` / `baggage` headers before creating the entry span.

5. **Configure OTel Collector Pipeline** — Deploy the OpenTelemetry Collector with receivers (OTLP gRPC/HTTP), processors (batch, memory_limiter, attributes for enrichment), and exporters to appropriate backends (Tempo for traces, Loki for logs, Prometheus/Mimir for metrics). Use a gateway aggregation pattern at scale: sidecar collectors send to node-level gateway collectors, which aggregate traffic before sending to backends.

   **Checkpoint:** Memory limiter is always configured with `limit_mib` and `spike_limit_mib`. Batch processor timeout is ≤ 5s for traces (fast delivery) and ≤ 30s for metrics. Attribute processor enriches every signal with environment, service version, and cluster identifier.

6. **Establish Signal Retention Policy** — Define tiered retention per signal type based on investigation needs and cost constraints. Traces require the shortest hot retention (7–14 days) because full span detail is storage-intensive. Logs need medium retention (30–90 days) for post-incident investigation. Metrics can be retained indefinitely in aggregated form with high compression. Archive cold data to object storage (S3/GCS) with indexed metadata only.

   **Checkpoint:** Retention policy is documented as a table showing each signal type, hot retention period, cold/archive strategy, and estimated monthly cost impact. No signal has "unlimited" retention without justification and cost approval.

---

## Implementation Patterns / Reference Guide

### Pattern 1: SLO and Error Budget Evaluation

This pattern implements the core error budget calculation engine used by reliability dashboards. It evaluates current request metrics against SLO targets to determine remaining budget, projected days until exhaustion, and alerting status.

```python
"""
Production-grade error budget evaluation for observability engineering.
Used daily by SLO dashboards to track reliability budget consumption per service.
"""

from dataclasses import dataclass, field
from enum import Enum


class SLOWindow(Enum):
    """Standard SLO evaluation windows used across the organization."""
    SHORT = "short"       # 28 days — current sprint window
    MEDIUM = "medium"     # 90 days — quarterly review
    LONG = "long"         # 365 days — annual review


@dataclass(frozen=True)
class BudgetPolicy:
    """
    Defines SLO target and response procedures when budget is consumed.
    
    Google SRE recommended thresholds for budget exhaustion responses:
      - Warning: notify team at 75% consumption
      - Stability Sprint: dedicate sprint to reliability at 50% remaining
      - Feature Freeze: stop all non-critical releases at 0% remaining
    """
    slo_target: float = field(default=0.999)
    evaluation_window: SLOWindow = SLOWindow.SHORT
    feature_freeze_at: float = 1.0
    stability_sprint_at: float = 0.5
    warning_at: float = 0.25

    @property
    def allowed_error_rate(self) -> float:
        return 1.0 - self.slo_target

    @property
    def max_error_count_per_window(self, total_requests: float) -> int:
        """Maximum bad requests allowed per evaluation window."""
        return int(total_requests * self.allowed_error_rate)


@dataclass
class SLOMetrics:
    """Captured metrics for a single evaluation period."""
    total_requests: int
    bad_requests: int
    latency_p50_ms: float = 0.0
    latency_p95_ms: float = 0.0
    latency_p99_ms: float = 0.0


@dataclass
class BudgetStatus:
    """Result of budget evaluation — what the on-call engineer sees."""
    total_requests: int
    bad_requests: int
    error_rate: float
    allowed_error_rate: float
    remaining_budget: float     # 1.0 = full budget, 0.0 = exhausted
    budget_consumed_pct: float
    status: str                 # "healthy", "warning", "elevated", "critical", "exhausted"
    days_until_exhaustion: int


def evaluate_error_budget(
    metrics: SLOMetrics,
    policy: BudgetPolicy,
) -> BudgetStatus:
    """
    Evaluate current error budget status for a service.

    Called daily by the SLO dashboard. Returns projected exhaustion date
    based on current burn rate and overall consumption level.
    """
    if metrics.total_requests <= 0:
        raise ValueError("Cannot evaluate SLO with zero requests")

    actual_error_rate = metrics.bad_requests / metrics.total_requests
    window_days = {
        SLOWindow.SHORT: 28,
        SLOWindow.MEDIUM: 90,
        SLOWindow.LONG: 365,
    }[policy.evaluation_window]

    remaining_budget = max(0.0,
        (policy.allowed_error_rate - actual_error_rate) / policy.allowed_error_rate
    ) if policy.allowed_error_rate > 0 else 1.0

    budget_consumed_pct = round((1.0 - remaining_budget) * 100, 2)

    # Project days until exhaustion at current burn rate
    if actual_error_rate >= policy.allowed_error_rate:
        days_until_exhaustion = 0
    elif metrics.total_requests > 0:
        daily_bad_rate = metrics.bad_requests / window_days
        daily_allowed = (metrics.total_requests / window_days) * policy.allowed_error_rate
        if daily_allowed > 0 and daily_bad_rate > daily_allowed:
            remaining_errors = policy.max_error_count_per_window(metrics.total_requests) - metrics.bad_requests
            daily_consumption_rate = daily_bad_rate - daily_allowed
            days_until_exhaustion = int(remaining_errors / daily_consumption_rate) if daily_consumption_rate > 0 else 999
        else:
            days_until_exhaustion = 999
    else:
        days_until_exhaustion = 999

    # Determine status based on consumption level
    if remaining_budget <= 0:
        status = "exhausted"
    elif budget_consumed_pct >= policy.feature_freeze_at * 100:
        status = "critical"
    elif budget_consumed_pct >= policy.stability_sprint_at * 100:
        status = "elevated"
    elif budget_consumed_pct >= policy.warning_at * 100:
        status = "warning"
    else:
        status = "healthy"

    return BudgetStatus(
        total_requests=metrics.total_requests,
        bad_requests=metrics.bad_requests,
        error_rate=round(actual_error_rate, 6),
        allowed_error_rate=policy.allowed_error_rate,
        remaining_budget=round(remaining_budget, 4),
        budget_consumed_pct=budget_consumed_pct,
        status=status,
        days_until_exhaustion=days_until_exhaustion,
    )


# Example usage: daily dashboard evaluation
if __name__ == "__main__":
    policy = BudgetPolicy(slo_target=0.999)
    metrics = SLOMetrics(total_requests=1_000_000, bad_requests=250)
    status = evaluate_error_budget(metrics, policy)

    print(f"Status: {status.status}")
    print(f"Remaining budget: {status.remaining_budget:.2%}")
    print(f"Days until exhaustion: {status.days_until_exhaustion}")
```

### Pattern 2: Multi-Window Burn Rate Alerting (Google SRE Standard)

This pattern implements the Google-recommended dual-window burn rate alerting. The key insight is that a single time window fires false positives on transient spikes and misses slow degradation. Two windows together eliminate both failure modes.

```python
"""
Multi-window burn rate alerting following Google SRE methodology.
Evaluates error budget consumption across fast and slow time windows.
"""


def calculate_burn_rate(
    total_requests: float,
    bad_requests: float,
    slo_target: float = 0.999,
) -> float:
    """
    Calculate error budget burn rate for a given measurement period.

    Burn rate = (actual error rate) / (allowed error rate)
    
    At SLO 99.9%: allowed error rate = 0.1%
    If actual error rate = 0.5%, burn rate = 5x — consuming budget 5x faster
    
    Args:
        total_requests: Total request count in the measurement window
        bad_requests: Requests that violated the SLO definition
        slo_target: Target availability fraction (e.g., 0.999)

    Returns:
        Burn rate multiplier. Values > 1 indicate budget being consumed faster than allowed.
    """
    if total_requests <= 0:
        return 0.0

    actual_error_rate = bad_requests / total_requests
    allowed_error_rate = 1.0 - slo_target

    if allowed_error_rate <= 0:
        raise ValueError("SLO target must be less than 1.0 — error budget cannot be negative")

    return actual_error_rate / allowed_error_rate


def evaluate_burn_rate_alerts(
    fast_total: float, fast_bad: float,
    slow_total: float, slow_bad: float,
    slo_target: float = 0.999,
) -> list[tuple[str, str]]:
    """
    Evaluate multi-window burn rate against Google alerting criteria.

    Critical: Fast burn > 14.4x AND slow burn > 1x (budget exhausted in ~2h)
    Warning:  Fast burn > 6x AND slow burn > 1x (exhausted in ~6h)

    Args:
        fast_total/fast_bad: Request counts for fast window (5m or 30m)
        slow_total/slow_bad: Request counts for slow window (1h or 6h)
        slo_target: SLO availability target

    Returns:
        List of (severity, explanation) tuples. Empty list = no alert.
    """
    fast_burn = calculate_burn_rate(fast_total, fast_bad, slo_target)
    slow_burn = calculate_burn_rate(slow_total, slow_bad, slo_target)

    alerts: list[tuple[str, str]] = []

    # Critical: Budget exhaustion in ~2 hours
    if fast_burn > 14.4 and slow_burn > 1.0:
        alerts.append(("CRITICAL",
            f"Budget exhaustion projected in ~2h. Fast: {fast_burn:.1f}x, Slow: {slow_burn:.1f}x"
        ))

    # Warning: Budget consumption elevated — exhaustion in ~6 hours
    elif fast_burn > 6.0 and slow_burn > 1.0:
        alerts.append(("WARNING",
            f"Elevated burn rate. Fast: {fast_burn:.1f}x, Slow: {slow_burn:.1f}x"
        ))

    # Info: Elevated but below alerting threshold
    elif fast_burn > 3.0 or slow_burn > 0.5:
        alerts.append(("INFO",
            f"Elevated burn observed. Fast: {fast_burn:.1f}x, Slow: {slow_burn:.1f}x"
        ))

    return alerts if alerts else [("NORMAL", "Error budget consumption within target")]


# Prometheus PromQL for critical burn rate alert (SLO 99.9%)
CRITICAL_BURN_RATE_PROMQL = """
(
  sum(rate(http_requests_total{status=~"5..",job="api"}[5m]))
  /
  sum(rate(http_requests_total{job="api"}[5m]))
)
/ 0.001
> 14.4
and on(job)
(
  (
    sum(rate(http_requests_total{status=~"5..",job="api"}[1h]))
    /
    sum(rate(http_requests_total{job="api"}[1h]))
  )
  / 0.001
  > 1.0
)
"""

# Prometheus PromQL for warning burn rate alert (SLO 99.9%)
WARNING_BURN_RATE_PROMQL = """
(
  sum(rate(http_requests_total{status=~"5..",job="api"}[30m]))
  /
  sum(rate(http_requests_total{job="api"}[30m]))
)
/ 0.001
> 6.0
and on(job)
(
  (
    sum(rate(http_requests_total{status=~"5..",job="api"}[6h]))
    /
    sum(rate(http_requests_total{job="api"}[6h]))
  )
  / 0.001
  > 1.0
)
"""
```

### Pattern 3: OpenTelemetry Instrumentation — Python (BAD vs GOOD)

This pattern demonstrates proper OTel instrumentation for a web service, showing the contrast between naive span creation and production-grade semantic convention usage.

```python
# ❌ BAD: Naive instrumentation without semantic conventions or context propagation
import requests

def process_order(order_id: str) -> dict:
    """Processes an order — no trace context, no attributes, no error handling."""
    # Creates a span but with no semantic meaning
    result = requests.get(f"http://inventory-service/stock/{order_id}")
    db_query(order_id)
    return {"status": "done"}

# ❌ BAD: Creating a span per internal call — trace becomes bloated and noisy
def process_order_bloated(order_id: str) -> dict:
    with tracer.start_as_current_span("validate"):       # Too granular
        validate_input(order_id)
    with tracer.start_as_current_span("check_inventory"):  # Internal, no external call
        check_inventory(order_id)
    with tracer.start_as_current_span("save_to_db"):     # Auto-instrumented anyway
        save_order(order_id)
    return {"status": "processed"}


# ✅ GOOD: Production-grade instrumentation with semantic conventions and context propagation
from fastapi import FastAPI, Request, Response
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode, SpanKind
from opentelemetry.semconv.attributes.http_attributes import (
    HTTP_REQUEST_METHOD, HTTP_RESPONSE_STATUS_CODE, URL_PATH,
)
from opentelemetry.semconv.attributes.exception_attributes import EXCEPTION_MESSAGE

app = FastAPI(title="order-service")
tracer = trace.get_tracer("order-service", "1.0.0")


@app.middleware("http")
async def telemetry_middleware(request: Request, call_next) -> Response:
    """
    Top-level middleware creating the entry span for every HTTP request.
    
    This is the ENTRY POINT of every distributed trace in this service.
    Uses SpanKind.SERVER and semantic conventions for HTTP attributes.
    """
    with tracer.start_as_current_span(
        name=f"HTTP {request.method} {request.url.path}",
        kind=SpanKind.SERVER,
        attributes={
            HTTP_REQUEST_METHOD: request.method,
            URL_PATH: request.url.path,
        }
    ) as span:
        try:
            response = await call_next(request)
            span.set_attribute(HTTP_RESPONSE_STATUS_CODE, response.status_code)
            return response

        except Exception as e:
            span.set_status(Status(StatusCode.ERROR))
            span.set_attribute(EXCEPTION_MESSAGE, str(e))
            span.record_exception(e)
            raise


async def process_order(order_id: str) -> dict:
    """
    Process an order with child spans for external calls only.

    Internal functions (validate_input) do NOT get individual spans —
    they are implementation details of the HTTP entry span. External
    service calls (inventory API, database) each get a child span.
    """
    validate_input(order_id)  # Internal — no span needed

    # Child span for EXTERNAL inventory API call
    with tracer.start_as_current_span(
        "inventory.api.call",
        SpanKind.CLIENT,
    ) as inv_span:
        inv_span.set_attribute("server.address", "inventory-service")
        resp = await client.get(
            f"http://inventory-service/stock/{order_id}",
            timeout=5.0,
        )
        inv_span.set_attribute(HTTP_RESPONSE_STATUS_CODE, resp.status_code)

    # Child span for database write (auto-instrumented via OTel SDK)
    save_order(order_id)  # Database calls are auto-instrumented
    
    return {"status": "processed", "order_id": order_id}
```

### Pattern 4: OpenTelemetry Collector Gateway Configuration

For production clusters, use a three-tier Collector architecture to reduce fan-out from N pods to one gateway per node. This is critical at scale — a 500-pod cluster with individual OTLP connections would overwhelm your tracing backend.

```yaml
# Production OpenTelemetry Collector — Gateway/Aggregation Pattern
# Receives telemetry from sidecar collectors on the same node,
# aggregates and filters, then forwards to backends.
# Deployed as a DaemonSet so one collector runs per cluster node.

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"     # Receives from sidecars on same node
      http:
        endpoint: "0.0.0.0:4318"

  prometheus:
    config:
      scrape_configs:
        - job_name: 'otel-collector'
          static_configs:
            - targets: ['localhost:8888']

processors:
  # Memory limiter prevents OOM in the collector itself
  memory_limiter:
    check_interval: 1s
    limit_mib: 1500           # Maximum 1.5 GiB heap
    spike_limit_mib: 200      # Allow temporary spikes of 200 MiB

  # Batch spans and metrics to reduce exporter connection overhead
  batch:
    timeout: 2s               # Fast delivery for traces
    send_batch_size: 2048     # Larger batches at gateway level

  # Enrich every signal with common attributes for filtering/aggregation
  attributes:
    actions:
      - key: deployment.environment
        value: "production"
        action: upsert
      - key: cluster.name
        from_context:
          key: net.sock.peer.addr
        action: insert

  # Filter out noise spans (health checks, metrics endpoints)
  filter/trace:
    spans:
      include:
        match_type: regexp
        attributes:
          - key: http.route
            values: ["^/(?!healthz$|readyz$|metrics$).*$"]

exporters:
  # Send traces to Tempo (CNCF graduated tracing backend)
  otlp/tempo:
    endpoint: "tempo-gateway.monitoring.svc:4317"
    tls:
      insecure: true
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

  # Send logs to Loki (CNCF graduated log aggregation)
  loki:
    endpoint: "http://loki-gateway.monitoring.svc:3100/loki/api/v1/push"

  # Send metrics to Prometheus remote write
  prometheusremotewrite:
    endpoint: "http://prometheus.monitoring.svc:9090/api/v1/write"
    external_labels:
      cluster: production

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, attributes, filter/trace]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp, prometheus]
      processors: [memory_limiter, batch, attributes]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch, attributes]
      exporters: [loki]

  # Telemetry endpoint for collector health monitoring
  telemetry:
    metrics:
      address: ":8888"
```

---

## Observability Maturity Assessment

Use this model to assess your team's current observability maturity and identify the next improvement area. Moving from Level 2 to Level 3 is where the most significant reliability gains are achieved.

| Level | Name        | Characteristics                                                                                                                              | Key Missing Capability                                    |
|-------|-------------|----------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| **1**     | Initial/Ad-hoc | No formal monitoring. Reactive firefighting. "Does it work?" checked manually or via basic ping checks.                                        | Any automated signal collection                           |
| **2**     | Defined        | Basic metrics and dashboards exist (CPU, memory, disk). Alert on infrastructure thresholds. No SLOs defined.                                   | User-centric SLIs and error budgets                       |
| **3**     | Managed        | SLIs/SLOs defined for all services. Error budgets tracked in a dashboard. Standardized OTel instrumentation. Cross-service tracing works.       | Multi-window burn rate alerting                           |
| **4**     | Optimized      | Proactive: anomaly detection, baseline modeling, automated runbooks triggered by alerts. Observability checks in CI/CD pipeline.               | Signal cost governance and retention optimization         |
| **5**     | Continuous    | Reliability is a product feature tracked on the roadmap. SLOs drive release priorities. Blameless post-mortems are standard. Full automation. | — (no gaps at this level)                                |

---

## Cost Governance for Observability Signals

Observability costs scale with signal volume. Without governance, telemetry spend can exceed compute costs. Apply these retention and sampling policies to control costs.

### Retention Policy Matrix

| Signal Type | Hot Retention    | Cold/Archive Strategy            | Estimated Monthly Cost (per 10M spans/day) |
|-------------|------------------|----------------------------------|--------------------------------------------|
| **Traces**   | 7–14 days       | 30–90 days indexed-only (S3/GCS) | $8K–$15K with full detail, $2K with sampling |
| **Logs**     | 30–90 days      | 1 year compressed + metadata     | $3K–$10K depending on verbosity             |
| **Metrics**  | 90 days minimum | Unlimited (highly compressed)    | $200–$500 — metrics are the cheapest signal |

### Cost Control Patterns

```python
"""
Signal sampling configuration for cost-optimized observability.

At high request volumes (> 100K RPS), full trace sampling is economically
unfeasible. Use adaptive sampling: sample all error traces (cost-effective
because errors are rare) and probabilistically sample success traces.
"""

from dataclasses import dataclass
from typing import Protocol


@dataclass
class SamplingPolicy:
    """
    Configures how telemetry signals are sampled to control cost.
    
    Adaptive sampling strategy:
      - Errors (status >= 400): ALWAYS sample — these are investigation-critical
      - Slow requests (latency > p95): ALWAYS sample — performance regression signal
      - Normal traffic: probabilistic sampling (e.g., 1% of successful requests)
    """
    error_sample_rate: float = 1.0           # Always sample errors
    slow_request_threshold_ms: float = 1000.0  # Above p95 latency
    slow_sample_rate: float = 1.0            # Always sample slow requests  
    normal_sample_rate: float = 0.01         # 1% of normal traffic

    def should_sample(self, status_code: int, latency_ms: float) -> bool:
        """
        Determine whether to retain telemetry for this request.
        
        Args:
            status_code: HTTP response status code
            latency_ms: Request latency in milliseconds

        Returns:
            True if the signal should be fully retained, False for sampling discard.
        """
        if status_code >= 400:
            return True  # Errors are always sampled — critical for investigation
        
        if latency_ms > self.slow_request_threshold_ms:
            return True  # Slow requests are always sampled — performance signal
        
        # Probabilistic sampling for normal traffic
        import random
        return random.random() < self.normal_sample_rate


# Prometheus-based cost estimation helper
COST_ESTIMATION_PROMQL = """
# Estimate monthly trace ingestion volume (spans per month)
sum(increase(otel_trace_spans_exported{service_namespace="production"}[30d]))

# Estimate monthly log ingestion volume (bytes per month)
sum(increase(log_messages_total{environment="production"}[30d])) * avg(log_message_size_bytes)

# Estimated cost = (spans * $0.000015) + (logs_bytes * $0.00001) + (metrics_series * $0.001)
# Adjust unit costs based on your backend provider's pricing
"""
```

---

## Signal Investigation Methodology

When an alert fires, follow this structured investigation workflow to correlate signals and identify root cause efficiently. This methodology prevents the "dashboard hopping" pattern where engineers toggle between metrics, logs, and traces without a hypothesis.

### The Correlation Chain

```
Alert Fires → Metric Anomaly (WHAT) → Log Context (WHERE) → Trace Detail (WHY) → Root Cause
     ↓              ↓                     ↓                    ↓                ↓
  "Error rate   "Look at log         "Follow the          "Find which       Code bug, 
   elevated"    entries around      span across          service took       configuration
               alert timestamp      service boundary     longest            error, DB lock
```

1. **Identify WHAT changed** — The alert tells you a metric is anomalous (error rate spike, latency increase). Confirm the anomaly against the SLO: is this burning through your error budget? If the burn rate is below 3x and the window is within normal variance, log it as an INFO event and move on.

2. **Find WHERE it happened** — Query structured logs for entries with the same `service.name`, `deployment.environment`, and timestamp window as the alert. Look for error-level entries or exception patterns that correlate with the metric anomaly. Extract the `trace_id` from any correlated log entry.

3. **Determine WHY in the trace** — Open the distributed trace using the extracted `trace_id`. Identify the span with the longest duration, highest error count, or anomalous attribute values. Look for spans where `status_code = ERROR` or `exception.message` is populated.

4. **Identify ROOT CAUSE** — Within the problematic span, check: server.address (which upstream service?), db.operation (which query?), rpc.system (which protocol?). Cross-reference with recent deployments (check git tags on the `service.version` attribute). If the span belongs to an external dependency, the root cause is likely downstream.

---

## Constraints

### MUST DO
- Define SLIs as user-centric ratios (good events / total events) — never use infrastructure metrics (CPU, memory, disk) as SLO indicators
- Implement multi-window burn rate alerting with BOTH a fast window and slow window combined with `and on(job)` to prevent false positives
- Apply OpenTelemetry semantic conventions in all instrumentation: HTTP spans must include `http.method`, `http.status_code`, and `url.path` attributes
- Always configure the OTel Collector memory_limiter processor to prevent OOM kills during traffic spikes
- Enforce trace context propagation across async boundaries using W3C TraceContext propagator — never create orphaned spans
- Define a signal retention policy table before deploying instrumentation — every signal type must have hot retention, archive strategy, and estimated cost
- Structure investigation workflows as a correlation chain: metric → log → trace → root cause

### MUST NOT DO
- Create more than 5 SLIs per service — each SLI requires error budget tracking and team attention; dilute focus degrades reliability outcomes
- Use single-window burn rate alerts (e.g., only a 5-minute window) — transient spikes will fire false positives constantly
- Instrument every internal function call with individual spans — this creates bloated traces that obscure the actual request path
- Set trace retention to "unlimited" without justification and cost approval — at 10M spans/day, unlimited retention costs $8K–$15K/month
- Configure OTel Collector batch processor timeout above 10s for traces — delayed delivery makes real-time alerting unreliable
- Use proprietary APM agent instrumentation without also supporting OTLP export — vendor lock-in prevents backend migration and cost optimization
- Skip error budget response procedures at different consumption levels — an SLO with no defined action when the budget runs out is just a vanity metric

---

## Output Template

When designing or auditing an observability system, produce:

1. **SLI/SLO Definition Document** — Table of each SLI (name, metric expression, bad event definition), SLO target, evaluation window, and error budget percentage
2. **Burn Rate Alert Configuration** — PromQL rules for both CRITICAL (14.4x + 1x) and WARNING (6x + 1x) burn rates with the specific alerting thresholds
3. **OTel Instrumentation Plan** — List of endpoints/handlers with their span names, kinds (SERVER/CLIENT), required attributes, and context propagation requirements
4. **Collector Architecture Diagram** — ASCII diagram showing sidecar → gateway → backend flow with processor configuration per pipeline stage
5. **Signal Retention Policy** — Table with signal type, hot retention period, cold archive strategy, and estimated monthly cost
6. **Investigation Runbook** — Correlation chain steps for the top 3 alert types, including log query patterns and trace ID extraction instructions

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-observability-patterns` | Basic observability implementation (structured logging, Prometheus metrics setup, distributed tracing basics) — use this for surface-level monitoring concerns |
| `coding-production-readiness` | Pre-deployment validation checklist that includes SLO/SLO checks and error budget review as part of the broader readiness assessment |
| `cncf-open-telemetry` | OpenTelemetry Collector reference with YAML configuration examples and deployment patterns for CNCF environments |

---

## Live References

> Authoritative documentation links for observability engineering practices. The model follows these links at load time to resolve external references.

- [Google SRE Book — Service Level Objectives](https://sre.google/sre-book/service-level-objectives/) — Comprehensive guide to SLO design, error budgets, and multi-window burn rate alerting
- [OpenTelemetry Specification — Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/) — Standardized attribute conventions for HTTP, database, messaging, and cloud provider spans
- [OpenTelemetry Collector Configuration Guide](https://opentelemetry.io/docs/collector/configuration/) — Pipeline architecture, processors, exporters, and deployment patterns
- [Grafana Tempo — Trace Storage Architecture](https://grafana.com/docs/tempo/latest/) — CNCF-graduated trace backend with cost-efficient retention strategies
- [OpenTelemetry Python SDK Documentation](https://opentelemetry.io/docs/languages/python/) — Instrumentation patterns, auto-instrumentation agents, and context propagation for Python services
- [Google SRE Workbook — Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/) — Golden signals, monitoring philosophy, and investigation methodology

---

*This skill covers the observability engineering discipline — the strategic design of signal collection, correlation, and cost governance that makes production systems investigable. It complements basic monitoring implementation skills by providing the architectural and methodological framework for why you instrument what you instrument and how you investigate when things go wrong.*
