---




name: production-debugging-observability
description: Debugs production systems using OpenTelemetry traces, structured logs with context propagation, and eBPF diagnostics for root cause analysis without service interruption.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: production debugging, OpenTelemetry tracing, eBPF debugging, structured logging, distributed tracing, log correlation, context propagation, how do i debug production issues
  archetypes:
    - diagnostic
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, examples]
  related-skills: coding-debugging-methodology, cncf-prometheus, sre-engineering




---





# Production Debugging with Observability

Production debugging engineer using observability signals — OpenTelemetry traces, structured logs with context propagation, and eBPF diagnostics — to find root causes of incidents without interrupting service. This skill makes the model act as an incident diagnostician that correlates data across trace, log, and system signal layers to isolate failures in running production systems.

## TL;DR Checklist

- [ ] Extract the trace ID from the failing request and reconstruct the full span tree
- [ ] Correlate logs to traces using `trace_id` and `span_id` structured fields — never search logs without a trace context
- [ ] Use eBPF (bpftrace) for system-level diagnostics when application-level tracing is insufficient
- [ ] Compare resource metrics (CPU, memory, network) during the incident window against normal baselines
- [ ] Hypothesize root cause from combined signal sources before making any changes
- [ ] Validate hypothesis by reproducing in staging or observing a second occurrence with focused instrumentation

---

## When to Use

Use this skill when:

- A production system exhibits unexpected behavior and you need to find the root cause without stopping the service
- Requests are failing intermittently and you need to trace them across microservice boundaries
- Performance degradation is observed and you need to identify which span or service is responsible
- The application lacks a debugger attached to production (the normal case — never attach a debugger to prod)
- You need to correlate logs, traces, and metrics to distinguish between application bugs, infrastructure issues, and data problems

---

## When NOT to Use

Avoid this skill for:

- Local development debugging where you can use pdb, breakpoints, or an IDE debugger directly
- Simple single-process applications with no distributed calls — basic logging may suffice
- Incident response requiring immediate service restart — use SRE runbooks first, then debug
- Debugging hardware-level failures (disk corruption, NIC faults) — these require infrastructure tooling

---

## Core Workflow

### Step 1: Collect Tracing Data

**Step 1: Identify the failing span using trace IDs and reconstruct the span tree.**

Every distributed tracing system propagates a `trace_id` across service boundaries. Extract it from error messages, HTTP headers (`Traceparent` per W3C Trace Context), or log lines.

```python
"""Structured logger with context propagation for production debugging."""

import logging
import uuid
import time
import json
from contextvars import ContextVar
from typing import Any


# Context variables for propagating trace state through async boundaries
_trace_id: ContextVar[str | None] = ContextVar("trace_id", default=None)
_span_id: ContextVar[str | None] = ContextVar("span_id", default=None)


def get_current_context() -> dict[str, str]:
    """Extract the current trace context from context variables.

    Returns a dict suitable for inclusion in log records and HTTP headers.
    Always returns both trace_id and span_id — even if only one exists,
    the other is set to 'root' or a placeholder.

    Returns:
        Dict with 'trace_id' and 'span_id' keys
    """
    return {
        "trace_id": _trace_id.get() or str(uuid.uuid4())[:16],
        "span_id": _span_id.get() or str(uuid.uuid4())[:8],
    }


class ContextPropagatingFormatter(logging.Formatter):
    """JSON log formatter that automatically includes trace context.

    Every log record emitted while a request is in flight will contain
    trace_id, span_id, and service_name — enabling log-to-trace correlation.
    """

    def __init__(self, service_name: str):
        super().__init__()
        self.service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        # Build the base log dict
        log_entry = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created)),
            "level": record.levelname,
            "service": self.service_name,
            "message": record.getMessage(),
            **get_current_context(),
        }

        # Include exception info if present
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "stack": self.formatException(record.exc_info),
            }

        # Include any extra fields from the log call
        if hasattr(record, "extra_fields"):
            log_entry.update(record.extra_fields)

        return json.dumps(log_entry, default=str)


class Tracer:
    """Simple distributed tracer that produces W3C Trace Context compatible IDs.

    This tracer propagates trace_id and span_id through context variables
    so they are available in all layers (handlers, services, database calls).

    Usage:
        tracer = Tracer("order-service")
        async def handle_request(request):
            with tracer.span("process_order") as span_ctx:
                # All logs within this block contain trace_id and span_id
                await process_payment(span_ctx["trace_id"], span_ctx["span_id"])
    """

    def __init__(self, service_name: str):
        self.service_name = service_name
        self._logger = logging.getLogger(service_name)
        self._logger.setLevel(logging.DEBUG)

    @staticmethod
    def _generate_span_id() -> str:
        return uuid.uuid4().hex[:16]

    def span(self, name: str) -> "SpanContext":
        """Create a new span within the current trace context.

        Args:
            name: Human-readable name for this operation (e.g., 'process_order')

        Returns:
            SpanContext — an async context manager that sets trace/span in contextvars
        """
        parent_trace = _trace_id.get()
        parent_span = _span_id.get()

        trace_id = parent_trace or uuid.uuid4().hex[:32]
        span_id = self._generate_span_id()

        return SpanContext(
            trace_id=trace_id,
            span_id=span_id,
            parent_span=parent_span,
            span_name=name,
            service=self.service_name,
        )


class SpanContext:
    """Async context manager that sets and propagates trace context."""

    def __init__(self, trace_id: str, span_id: str, parent_span: str | None,
                 span_name: str, service: str):
        self.trace_id = trace_id
        self.span_id = span_id
        self.parent_span = parent_span
        self.span_name = span_name
        self.service = service
        self.start_time = time.monotonic()
        self._token_trace = None
        self._token_span = None

    def __enter__(self) -> dict[str, str]:
        # Set context variables — available to all nested calls
        self._token_trace = _trace_id.set(self.trace_id)
        self._token_span = _span_id.set(self.span_id)
        return {"trace_id": self.trace_id, "span_id": self.span_id}

    def __exit__(self, exc_type, exc_val, exc_tb):
        # Restore previous context values
        _trace_id.reset(self._token_trace)
        _span_id.reset(self._token_span)

        # Log the completed span
        duration_ms = (time.monotonic() - self.start_time) * 1000
        level = logging.ERROR if exc_type else logging.DEBUG
        self._logger.log(
            level,
            f"{self.span_name} completed",
            extra={
                "extra_fields": {
                    "duration_ms": round(duration_ms, 2),
                    "trace_id": self.trace_id,
                    "span_id": self.span_id,
                    "has_exception": exc_type is not None,
                }
            },
            exc_info=exc_val if exc_type else None,
        )
        return False  # Don't suppress exceptions


# ── Usage Example ──────────────────────────────────────────────────

"""
tracer = Tracer("payment-service")

async def handle_payment_request(request):
    with tracer.span("incoming_payment_request") as ctx:
        trace_id, span_id = ctx["trace_id"], ctx["span_id"]

        # All logs here contain trace_id and span_id
        logger.info("Processing payment", extra={
            "extra_fields": {"amount": request.amount}
        })

        with tracer.span("validate_card") as inner:
            await validate_card(request.card)

        with tracer.span("charge_stripe") as inner:
            result = await charge_external_api(span_id, request.amount)

        return PaymentResponse(status="completed", trace_id=trace_id)
"""
```

**Checkpoint:** You have identified the trace ID from the error. If no trace ID is available in the error output, look for it in HTTP response headers (`X-Trace-ID`, `Traceparent`) or in structured log lines emitted by the failing service.

### Step 2: Correlate Logs with Traces

**Step 2: Query logs using the trace_id to see all log lines for a specific request.**

Structured logging with embedded trace context enables precise log-to-trace correlation. Search logs across all services using the same `trace_id` value.

```python
# ❌ BAD — unstructured logging with no trace context; impossible to correlate
import logging

logger = logging.getLogger("payment-service")

async def handle_payment(request):
    logger.info(f"Processing payment for {request.user_id} amount={request.amount}")
    # Log output: "INFO - payment-service - Processing payment for 12345 amount=99.99"
    # ❌ Problem: no trace_id, no span_id — cannot find related logs across services
    # ❌ Problem: f-string interpolation leaks PII into log files
    result = await process_payment(request)
    logger.info(f"Payment {'succeeded' if result else 'failed'}")
    return result
```

```python
# ✅ GOOD — structured JSON logging with trace context propagation
import logging
import json
from contextvars import ContextVar

_trace_id: ContextVar[str | None] = ContextVar("trace_id", default=None)
_span_id: ContextVar[str | None] = ContextVar("span_id", default=None)


def get_current_context() -> dict[str, str]:
    return {
        "trace_id": _trace_id.get() or "unknown",
        "span_id": _span_id.get() or "unknown",
    }


class JSONTraceFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "timestamp": record.created,
            "level": record.levelname,
            "service": "payment-service",
            **get_current_context(),
        }
        if hasattr(record, "extra_fields"):
            entry.update(record.extra_fields)
        return json.dumps(entry)


async def handle_payment(request):
    import uuid

    trace_id = _trace_id.get() or uuid.uuid4().hex[:32]
    span_id = uuid.uuid4().hex[:16]
    _trace_id.set(trace_id)
    _span_id.set(span_id)

    logger.info(
        "Processing payment",
        extra={
            "extra_fields": {
                "user_id_masked": f"uid_{request.user_id[-4:]}",  # No PII
                "amount": request.amount,
            }
        },
    )
    # Log output: {"timestamp": ..., "level": "INFO", "service": "payment-service",
    #              "trace_id": "a1b2c3...", "span_id": "d4e5f6...", "message": ...}
    # ✅ Each log has trace_id — can be queried across all services
    result = await process_payment()
    return result
```

```python
"""HTTP middleware that extracts and propagates W3C Trace Context headers."""

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class TraceContextMiddleware(BaseHTTPMiddleware):
    """Extracts W3C Trace Context from incoming requests and injects it into outgoing responses.

    This middleware ensures trace IDs flow through the entire request lifecycle:
    1. Extract Traceparent header (W3C standard) or generate one if missing
    2. Set context vars so all downstream code has access to trace_id/span_id
    3. Inject Traceparent into response headers for caller correlation
    4. Log every request with trace context attached

    Integrates with the ContextPropagatingFormatter from the structured logger
    so all logs emitted during a request carry the same trace_id.
    """

    def __init__(self, app, service_name: str):
        super().__init__(app)
        self.service_name = service_name

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        import uuid

        # Extract trace context from incoming W3C Traceparent header
        traceparent = request.headers.get("traceparent", "")
        span_id = None
        trace_id = None

        if traceparent:
            # W3C Traceparent format: version-trace_id-span_id-trace_flags
            parts = traceparent.strip().split("-")
            if len(parts) == 4:
                _, trace_id, span_id, _ = parts

        # Generate new context if no trace was propagated
        if not trace_id:
            trace_id = uuid.uuid4().hex[:32]
        if not span_id:
            span_id = self._generate_span_id()

        # Set in global context for structured logging
        _trace_id.set(trace_id)
        _span_id.set(span_id)

        start_time = time.monotonic()

        try:
            response = await call_next(request)

            # Inject trace context into response headers for caller correlation
            new_span_id = self._generate_span_id()
            response.headers["Traceparent"] = (
                f"00-{trace_id}-{new_span_id}-01"  # version-trace_id-span_id-flags
            )

            duration_ms = (time.monotonic() - start_time) * 1000
            status_class = response.status_code // 100

            # Log with trace context — uses ContextPropagatingFormatter
            log_level = logging.WARNING if status_class >= 5 else logging.DEBUG
            self._logger.log(
                log_level,
                f"{'GET' if request.method == 'POST' else request.method} {request.url.path}",
                extra={
                    "extra_fields": {
                        "trace_id": trace_id,
                        "span_id": span_id,
                        "response_span_id": new_span_id,
                        "duration_ms": round(duration_ms, 2),
                        "status_code": response.status_code,
                        "method": request.method,
                        "path": str(request.url.path),
                    }
                },
            )

            return response

        except Exception as e:
            duration_ms = (time.monotonic() - start_time) * 1000

            self._logger.error(
                f"Unhandled exception during {request.method} {request.url.path}",
                exc_info=e,
                extra={
                    "extra_fields": {
                        "trace_id": trace_id,
                        "span_id": span_id,
                        "duration_ms": round(duration_ms, 2),
                        "exception_type": type(e).__name__,
                        "method": request.method,
                        "path": str(request.url.path),
                    }
                },
            )
            raise

    @staticmethod
    def _generate_span_id() -> str:
        return uuid.uuid4().hex[:16]
```

**Checkpoint:** All log lines for the failing request share the same `trace_id`. If logs from multiple services share the trace ID, correlation is working correctly. If you cannot find logs by trace_id, the service may not be emitting structured logs with context propagation — this is a root cause candidate.

### Step 3: Use eBPF for System-Level Diagnostics

**Step 3: Apply bpftrace for system-level diagnostics when application tracing is insufficient.**

When you need to debug at the kernel level (slow syscalls, file I/O bottlenecks, network issues) without modifying application code, use eBPF tools. These attach to running processes with zero code changes.

```bash
# ── Common bpftrace commands for production debugging ──────────────

# 1. Identify slow syscalls (latency > 1ms) across all processes
sudo bpftrace -e '
tracepoint:syscalls:sys_enter_* /args->duration > 1000/ {
    printf("%-16s %-8d %-20s %d us\n",
           comm, pid, str(args->name), args->duration)
}
'

# 2. Track file read latency for a specific process (PID from top/htop)
sudo bpftrace -e '
tracepoint:syscalls:sys_exit_read /pid == TARGET_PID/ {
    printf("PID %d read %d bytes in %d us\n", pid, args->ret, args->duration)
}
' --probe-kernel-version

# 3. Monitor network connection establishment (new TCP connections)
sudo bpftrace -e '
tracepoint:syscalls:sys_enter_connect /comm == "python"/ {
    printf("PID %d connecting to %s:%d\n", pid, str(args->sap->sin_addr.s_addr), args->sap->sin_port)
}
'

# 4. Profile CPU time per function (flame graph generation)
sudo ./kernel-tools/perf record -F 99 -p TARGET_PID -g -- sleep 30
sudo ./kernel-tools/perf script | ./scripts/stackcollapse-perf.pl | ./flamegraph.pl > cpu_profile.svg

# 5. Detect blocked I/O (processes waiting on disk)
sudo bpftrace -e '
kprobe:blk_account_io_start {
    @start[tid] = nsecs;
}
kprobe:blk_account_io_done /@start[tid]/ {
    @io_bytes = hist(args->bytes);
    printf("IO stats:\n");
    print(@io_bytes);
    delete(@start[tid]);
}
'

# 6. Trace Python function execution (using uprobes)
sudo bpftrace -e '
uprobe:/usr/bin/python3:main {
    @py_start[ustack(20)] = nsecs;
}
uretprobe:/usr/bin/python3:main /@py_start[ustack(20)]/ {
    printf("Python call completed in %d us\n", nsecs - @py_start[ustack(20)])
}
'

# 7. Monitor open file descriptors (leak detection)
sudo bpftrace -e '
tracepoint:syscalls:sys_enter_openat /comm == "python"/ {
    @open_files[pid, str(args->filename)] = count();
}
tracepoint:syscalls:sys_exit_close /comm == "python"/ {
    # Track closed FDs — compare with opens to find leaks
}
'

# 8. Trace gRPC calls for latency breakdown (requires grpc instrumentation)
sudo bpftrace -e '
uprobe:/usr/lib/python3/dist-packages/grpc/_cython/cygrpc.so:* /pid == TARGET_PID/ {
    printf("%d %s\n", pid, str(args->0));
}
'
```

**Checkpoint:** eBPF traces show anomalies (high latency syscalls, growing file descriptor counts, connection errors) that correlate with the time window of the incident. If no system-level issues are found, focus shifts back to application-level tracing.

### Step 4: Analyze Resource Metrics During the Incident Window

**Step 4: Compare resource metrics during the incident against normal baselines.**

```python
"""Resource metric analyzer for production debugging."""

import subprocess
from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass
class MetricSample:
    timestamp: datetime
    value: float
    label: str


def collect_incident_metrics(
    target_pid: int | None = None,
    incident_start: datetime | None = None,
    incident_end: datetime | None = None,
    baseline_period_hours: int = 24,
) -> dict[str, list[MetricSample]]:
    """Collect CPU, memory, and network metrics for the incident window.

    Args:
        target_pid: PID of the process to monitor (None = all processes)
        incident_start: When the incident began (defaults to now - 1 hour)
        incident_end: When the incident ended (defaults to now)
        baseline_period_hours: Hours of historical data for comparison

    Returns:
        Dict mapping metric name to list of samples
    """
    import psutil
    import time

    if not incident_start:
        incident_start = datetime.now() - timedelta(hours=1)
    if not incident_end:
        incident_end = datetime.now()

    metrics: dict[str, list[MetricSample]] = {
        "cpu_percent": [],
        "memory_rss_mb": [],
        "memory_percent": [],
        "open_fds": [],
    }

    # Collect samples at 5-second intervals (simulates what Prometheus would have)
    start_time = time.time()
    interval = 5.0

    while time.time() - start_time < (incident_end - incident_start).total_seconds():
        for proc in psutil.process_iter(["pid", "name", "cpu_percent", "memory_info"]):
            try:
                if target_pid and proc.info["pid"] != target_pid:
                    continue

                mem = proc.memory_info()
                metrics["cpu_percent"].append(MetricSample(
                    timestamp=datetime.now(),
                    value=proc.cpu_percent(interval=0.1) or 0,
                    label=f"pid={proc.info['pid']} name={proc.info['name']}",
                ))
                metrics["memory_rss_mb"].append(MetricSample(
                    timestamp=datetime.now(),
                    value=mem.rss / (1024 * 1024),
                    label=f"pid={proc.info['pid']} name={proc.info['name']}",
                ))
                metrics["open_fds"].append(MetricSample(
                    timestamp=datetime.now(),
                    value=proc.num_fds(),
                    label=f"pid={proc.info['pid']} name={proc.info['name']}",
                ))
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

        time.sleep(interval)

    # Compare incident metrics against baseline
    results = {}
    for metric_name, samples in metrics.items():
        if not samples:
            continue

        incident_avg = sum(s.value for s in samples) / len(samples)
        incident_max = max(s.value for s in samples)

        # Estimate baseline from historical data (in real systems, use Prometheus/Grafana)
        baseline_multiplier = 1.0  # No baseline without historical data
        results[metric_name] = {
            "incident_avg": round(incident_avg, 2),
            "incident_max": round(incident_max, 2),
            "baseline_estimate": round(incident_avg / baseline_multiplier, 2) if baseline_multiplier != 1 else None,
            "deviation_percent": round((incident_avg / max(baseline_multiplier * incident_avg, 0.01) - 1) * 100, 1),
        }

    return results


def analyze_metric_anomalies(metric_results: dict) -> list[str]:
    """Identify anomalous metrics that indicate the root cause.

    Args:
        metric_results: Output from collect_incident_metrics()

    Returns:
        List of anomaly descriptions — empty if no anomalies detected
    """
    anomalies = []

    for metric_name, values in metric_results.items():
        avg = values["incident_avg"]
        max_val = values["incident_max"]
        baseline = values.get("baseline_estimate")

        if baseline and baseline > 0:
            deviation = (avg - baseline) / baseline * 100

            if metric_name == "memory_rss_mb":
                if deviation > 50:
                    anomalies.append(
                        f"Memory usage {deviation:.1f}% above baseline "
                        f"(avg {avg:.0f}MB vs baseline {baseline:.0f}MB) — possible memory leak"
                    )
                elif max_val > avg * 2:
                    anomalies.append(
                        f"Memory spike detected: {max_val:.0f}MB peak vs {avg:.0f}MB average "
                        f"— intermittent allocation burst"
                    )

            elif metric_name == "cpu_percent":
                if deviation > 100:
                    anomalies.append(
                        f"CPU usage {deviation:.1f}% above baseline — possible infinite loop or busy wait"
                    )

            elif metric_name == "open_fds":
                if deviation > 30:
                    anomalies.append(
                        f"File descriptors {deviation:.1f}% above baseline ({avg:.0f} vs {baseline:.0f}) — possible FD leak"
                    )

    return anomalies


# ── Command-line usage ─────────────────────────────────────────────

"""
# Run on the production host (requires psutil installed)
python -c "
from metrics import collect_incident_metrics, analyze_metric_anomalies
import json
metrics = collect_incident_metrics(target_pid=12345)
anomalies = analyze_metric_anomalies(metrics)
if anomalies:
    for a in anomalies: print(f'ANOMALY: {a}')
else:
    print('No resource anomalies detected — issue is likely application logic or external dependency')
"

# Or use the traditional /proc approach when psutil is unavailable
cat /proc/12345/status | grep -E 'VmRSS|Threads'
ls -la /proc/12345/fd | wc -l  # Count open file descriptors
cat /proc/12345/stat | awk '{print $14, $15}'  # CPU time (utime + stime)
"""
```

**Checkpoint:** At least one metric shows a significant deviation during the incident window. If all metrics are normal, the issue is likely in application logic (e.g., wrong query returning incorrect results) rather than resource exhaustion.

### Step 5: Hypothesize Root Cause and Validate

**Step 5: Synthesize all signal sources into a root cause hypothesis.**

Cross-reference findings from traces, logs, eBPF, and metrics to form a testable hypothesis.

| Signal Source | What It Tells You | Confidence Boost When |
|---|---|---|
| Trace tree shows one span taking 90% of duration | Bottleneck service identified | The slow span matches the error location |
| Logs show repeated retry patterns in one service | Cascading failure or dependency issue | Retry count correlates with timeout errors in traces |
| eBPF shows high I/O wait time | Disk bottleneck or lock contention | Matches memory/RSS spike from resource metrics |
| Open FD count growing during incident | File descriptor leak | Correlates with specific code paths in the trace tree |

```python
def synthesize_root_cause(
    trace_anomalies: list[str],
    log_findings: list[str],
    metric_anomalies: list[str],
    ebpf_findings: list[str],
) -> dict:
    """Synthesize findings from all observability signals into a root cause hypothesis.

    Args:
        trace_anomalies: Descriptions of anomalies found in distributed traces
        log_findings: Key patterns found when correlating logs by trace_id
        metric_anomalies: Resource deviations detected during the incident window
        ebpf_findings: System-level issues identified via bpftrace

    Returns:
        Dict with confidence level, root cause hypothesis, and recommended validation steps
    """
    evidence_strength = 0
    hypotheses = []

    # Strong signal: trace bottleneck + error location match
    if trace_anomalies:
        for anomaly in trace_anomalies:
            if "timeout" in anomaly.lower() or "latency" in anomaly.lower():
                evidence_strength += 2
                hypotheses.append({
                    "hypothesis": f"Performance bottleneck detected: {anomaly}",
                    "confidence": "HIGH",
                    "evidence_sources": ["distributed traces"],
                    "validation": "Check if the slow service has recent deployments or dependency updates",
                })

    # Strong signal: FD leak (trace + metric + eBPF)
    if metric_anomalies and ebpf_findings:
        for metric in metric_anomalies:
            if "fd" in metric.lower() or "file descriptor" in metric.lower():
                evidence_strength += 3
                hypotheses.append({
                    "hypothesis": "File descriptor leak causing resource exhaustion",
                    "confidence": "HIGH" if ebpf_findings else "MEDIUM",
                    "evidence_sources": ["resource metrics"] + (["eBPF traces"] if ebpf_findings else []),
                    "validation": "Run 'ls -la /proc/<pid>/fd | wc -l' on the affected process and compare to baseline",
                })

    # Moderate signal: log patterns suggesting cascading failure
    if log_findings:
        for finding in log_findings:
            if "retry" in finding.lower() or "cascading" in finding.lower():
                evidence_strength += 2
                hypotheses.append({
                    "hypothesis": f"Cascading failure pattern: {finding}",
                    "confidence": "MEDIUM",
                    "evidence_sources": ["structured logs"],
                    "validation": "Check if downstream service is degraded and causing upstream retries",
                })

    # Rank by confidence
    hypotheses.sort(key=lambda h: {"HIGH": 3, "MEDIUM": 2, "LOW": 1}.get(h["confidence"], 0), reverse=True)

    return {
        "top_hypothesis": hypotheses[0] if hypotheses else None,
        "all_hypotheses": hypotheses,
        "evidence_strength_score": evidence_strength,
        "recommended_actions": [h["validation"] for h in hypotheses],
    }
```

**Checkpoint:** The top hypothesis is supported by at least 2 different signal sources. If only one source supports the hypothesis, mark it as "requires independent validation" before making changes.

---

## Implementation Patterns

### Pattern 1: Structured Logger with Context Propagation (Python)

See `Tracer`, `SpanContext`, and `ContextPropagatingFormatter` classes in Step 1 above. These provide the foundation for all observability debugging in Python applications.

### Pattern 2: OpenTelemetry Instrumentation for HTTP Services

```python
"""OpenTelemetry instrumentation for a production HTTP service."""

from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentation


def setup_observability(service_name: str, otlp_endpoint: str = "http://otel-collector:4317"):
    """Configure OpenTelemetry for a production service.

    This function sets up the full observability stack in one call:
    1. Tracing with OTLP exporter (connects to your collector)
    2. Metrics with Prometheus-compatible exports
    3. Auto-instrumentation for HTTP server and outgoing requests

    Args:
        service_name: Service identifier used in all trace/metric labels
        otlp_endpoint: OTLP collector endpoint URL
    """
    # ── Tracing Setup ──────────────────────────────────────────────
    tracer_provider = TracerProvider()

    # Export spans to the OTLP collector (Grafana Tempo, Jaeger, etc.)
    span_exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
    span_processor = BatchSpanProcessor(span_exporter)
    tracer_provider.add_span_processor(span_processor)

    trace.set_tracer_provider(tracer_provider)
    tracer = trace.get_tracer(service_name)

    # ── Metrics Setup ──────────────────────────────────────────────
    metric_reader = PeriodicExportingMetricsReader(
        PrometheusMetricExporter()  # or OTLPMetricExporter for other backends
    )
    meter_provider = MeterProvider(metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)
    meter = metrics.get_meter(service_name)

    # Create standard operational metrics
    request_counter = meter.create_counter(
        name="http_requests_total",
        description="Total HTTP requests",
        unit="1",
    )
    request_duration = meter.create_histogram(
        name="http_request_duration_seconds",
        description="HTTP request duration in seconds",
        unit="s",
    )

    # ── Auto-Instrumentation ───────────────────────────────────────
    # FastAPI instrumentation adds spans for each HTTP route handler
    # and automatically propagates trace context via Traceparent headers
    FastAPIInstrumentor.instrument_app(app)

    # Requests library instrumentation traces outgoing HTTP calls
    RequestsInstrumentation().instrument()

    return tracer, meter


def instrumented_handler(tracer: trace.Tracer):
    """Example of manual span creation for custom business logic.

    Auto-instrumentation covers HTTP layers. Use manual spans for
    database queries, cache operations, and external API calls.
    """
    with tracer.start_as_current_span("process_order") as span:
        # Set span attributes — visible in trace viewer
        span.set_attribute("order.id", "ORD-12345")
        span.set_attribute("order.amount", 99.99)

        # Database call
        with tracer.start_as_current_span("query_inventory_db") as db_span:
            inventory = get_inventory_from_db(order_items)
            db_span.set_attribute("db.operation", "SELECT")
            db_span.set_attribute("db.rows_returned", len(inventory))

        # External API call
        with tracer.start_as_current_span("charge_payment_gateway") as payment_span:
            result = await charge_external(payment_data)
            payment_span.set_attribute("payment.provider", "stripe")
            payment_span.set_attribute("payment.success", True)

        return result


# ── OTLP Collector Configuration (docker-compose.yml) ─────────────
"""
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config", "/etc/otelcol-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC (traces)
      - "4318:4318"   # OTLP HTTP (metrics, logs)
      - "55679:55679" # Prometheus scraping

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
"""

# ── OTLP Collector Config (otel-collector-config.yaml) ────────────
"""
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

processors:
  batch:
    timeout: 5s
    send_batch_size: 1000
  memory_limiter:
    check_interval: 1s
    limit_mib: 512

exporters:
  otlp/tempo:
    endpoint: "tempo:4317"
    tls:
      insecure: true
  prometheus:
    endpoint: "0.0.0.0:8889"
    const_labels:
      label1: value1

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, memory_limiter]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
"""
```

### Pattern 3: bpftrace Commands for Common Production Issues

See the eBPF commands in Step 3 above. Here are quick-reference patterns mapped to symptoms:

| Symptom | bpftrace Command | What It Diagnoses |
|---|---|---|
| High latency on specific requests | `tracepoint:syscalls:sys_enter_* /args->duration > 1000/` | Slow system calls causing request timeout |
| Intermittent connection failures | `tracepoint:syscalls:sys_enter_connect /comm == "python"/` | Network connections being dropped or refused |
| Memory growing over time | `/proc/<pid>/status VmRSS tracking + bpftrace openat count` | File descriptor leak or memory leak |
| Disk I/O bottleneck | `kprobe:blk_account_io_start/done/ with hist()` | Disk saturation causing slow database queries |
| CPU spikes without application error | `perf record -F 99 -g -- sleep 30` + flamegraph | Code path consuming CPU (infinite loop, heavy computation) |

---

## Constraints

### MUST DO
- Always extract the trace ID first before searching logs or metrics — it is the anchor for correlation
- Use structured JSON logging with `trace_id` and `span_id` fields in every service that participates in a request
- Propagate W3C Trace Context (`Traceparent` header) across all HTTP boundaries
- Run eBPF tools with minimal overhead — use sampling or event filtering, never blanket tracing in production
- Collect resource metrics for the exact incident window — compare against a baseline, don't just look at absolute values
- Form hypotheses that are supported by at least 2 independent signal sources before making changes

### MUST NOT DO
- Attach a debugger (pdb, py-spy with --attach) to a production process during an active incident unless all other diagnostics are exhausted — debugging changes execution timing and may mask the issue
- Search logs without a trace ID — unstructured log searching across services is not correlation and wastes time
- Change code in production based on a single signal source — always validate with cross-correlation
- Run long-running eBPF probes during peak traffic without filtering — they add overhead
- Assume high CPU or memory usage means the application is broken — check if it's expected behavior (batch processing, report generation)
- Forget to clean up bpftrace scripts after use — leave them attached or they consume system resources

---

## Output Template

When debugging production with this skill active, produce:

1. **Trace Reconstruction** — Full span tree for the failing request with duration per span, identifying the slowest and error-producing spans
2. **Log Correlation Report** — All log lines matching the trace ID, grouped by service, with timestamps showing the sequence of events
3. **eBPF Diagnostics Summary** — System-level findings (slow syscalls, FD leaks, I/O bottlenecks) mapped to the incident timeline
4. **Resource Metric Analysis** — CPU, memory, network, and file descriptor metrics during incident vs baseline, with anomaly descriptions
5. **Root Cause Hypothesis** — Top hypothesis ranked by confidence, supported by evidence from at least 2 signal sources, with specific validation steps
6. **Recommended Actions** — Ordered list of remediation steps, starting with zero-risk actions (configuration changes) before code changes

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-debugging-methodology` | General debugging approach and systematic problem-solving — use for local/development debugging where a real debugger is available |
| `cncf-prometheus` | Prometheus metrics collection, PromQL queries, and alerting rules — provides the metrics data that complements trace-based debugging |
| `sre-engineering` | Incident response runbooks, post-mortem processes, and on-call workflows — use when debugging reveals an incident requiring formal response |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [OpenTelemetry Python Documentation — Instrumentation](https://opentelemetry.io/docs/languages/python/)
- [W3C Trace Context Specification](https://www.w3.org/TR/trace-context/)
- [bpftrace One-Liners for Troubleshooting](https://github.com/brendangregg/bpftrace/blob/master/manpages/bpftrace_man.page)
- [Brendan Gregg's eBPF Resources — System Performance](http://www.brendangregg.com/ebpf.html)
- [Structured Logging in Python — JSON Formatter Patterns](https://docs.python.org/3/library/logging.html)
- [Prometheus Query Language (PromQL) Reference](https://prometheus.io/docs/prometheus/latest/querying/examples/)
- [Grafana Tempo — Distributed Tracing with Prometheus Ecosystem](https://grafana.com/docs/tempo/latest/)
