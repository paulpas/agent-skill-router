---
name: system-reliability-architecture
description: Implements production reliability patterns (circuit breakers, retry with exponential backoff, bulkhead isolation, health checks, graceful degradation, distributed tracing) to build fault-tolerant distributed systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: system reliability, circuit breaker, bulkhead isolation, distributed tracing, chaos engineering, fault tolerance, how do i make my system resilient, graceful degradation
  archetypes:
    - tactical
    - diagnostic
    - strategic
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
  content-types: [code, guidance, do-dont, examples]
  related-skills: microservices-architecture, event-driven-architecture, microservice-resilience-patterns, api-architecture, architectural-review
---

# System Reliability Architecture

Designs and implements production-grade reliability patterns for distributed systems. When loaded, this skill makes the model build fault-tolerant architectures with circuit breakers, retry strategies with exponential backoff and jitter, bulkhead isolation, comprehensive health checks, graceful degradation, chaos engineering practices, observability foundations, distributed tracing with OpenTelemetry, saga-based distributed transactions, and idempotency guarantees.

## TL;DR Checklist

- [ ] Implement circuit breaker per downstream dependency with configurable failure threshold (default: 5 consecutive failures)
- [ ] Layer retry policies using exponential backoff + jitter — never use fixed-delay retries in production
- [ ] Isolate resource pools via bulkhead pattern — each critical path gets its own thread pool or executor
- [ ] Deploy liveness probes (process health → restart) and readiness probes (traffic health → drain/load balance out) separately
- [ ] Define graceful degradation strategies with fallback responses before implementing any new service dependency
- [ ] Instrument all services with metrics, structured logging, and distributed tracing from day one — never retrofit
- [ ] Apply idempotency keys to every write operation that may be retried or replayed
- [ ] Run at least one chaos experiment per quarter to validate failure assumptions

---

## When to Use

Use this skill when:

- Designing a new distributed system and you need to define its reliability architecture from scratch
- A production incident occurred due to cascading failures — you need to implement circuit breakers, timeouts, or bulkheads to prevent recurrence
- Building inter-service communication where downstream service failures could take down your own service
- Implementing an API gateway or service mesh that needs health-based routing and graceful degradation for end users
- Auditing an existing system for reliability gaps — identifying missing observability, retry storms, or lack of idempotency

---

## When NOT to Use

Avoid this skill for:

- Building monolithic single-process applications with no external dependencies — reliability patterns add overhead that isn't justified
- One-off scripts or throwaway prototypes — the cost of implementing circuit breakers and distributed tracing outweighs benefits
- Performance-critical hot paths where even microsecond latency from retry jitter or tracing spans is unacceptable (use inline timeout-only without full pattern infrastructure)

---

## Core Workflow

1. **Map External Dependencies** — Catalog every downstream service, database, cache, and external API your system calls. For each dependency, classify its failure impact: critical path (system halts), important path (degraded experience), or optional (nice to have). **Checkpoint:** Every critical-path dependency MUST have a circuit breaker and bulkhead pool before any production release.

2. **Implement Circuit Breakers Per Dependency** — Deploy three-state circuit breakers on each downstream call with configurable failure threshold, recovery timeout, and half-open success threshold. Use the decorator pattern for clean integration. **Checkpoint:** Verify the circuit opens after N consecutive failures, transitions to half-open after the recovery timeout, and closes only after M consecutive successes in half-open state.

3. **Layer Retry Policies with Exponential Backoff and Jitter** — On transient errors (503, timeouts, connection refused), implement retries using `delay = min(base_delay * (2^attempt) + random_jitter, max_delay)`. Always use jitter (random.uniform) to prevent thundering herd when the downstream service recovers. Never retry idempotent reads more than 3 times without a fallback. **Checkpoint:** Confirm retry logic skips non-retriable errors (4xx Client Errors except 429, 500/502/503/504 Server Errors) and includes jitter in every delay calculation.

4. **Establish Bulkhead Isolation** — Create separate thread pools or executor instances per critical downstream dependency. When one pool exhausts its threads due to a slow service, other services continue functioning independently. Implement explicit rejection policies (raise `BulkheadFullException` vs. block-and-queue). **Checkpoint:** Verify each bulkhead has independent configuration for max_concurrent_calls and queue_size, and that the calling service detects rejection promptly rather than queuing indefinitely.

5. **Deploy Comprehensive Health Check Endpoints** — Implement three types of probes: startup probe (is initialization complete?), liveness probe (is the process in a consistent state? → Kubernetes restarts), and readiness probe (can this service handle traffic? → Kubernetes removes from load balancer). Liveness must be fast and fail-open; readiness must check actual downstream dependencies. **Checkpoint:** Readiness probe MUST verify its own critical downstream dependencies — a service reporting ready while its database is unreachable routes broken requests to itself.

6. **Define Graceful Degradation Strategies** — For each critical dependency, define what "degraded mode" means for the end user: serve stale cached data, return default values, show cached search results, or display maintenance messaging. Prioritize fallbacks by data freshness requirements. **Checkpoint:** Every degraded path must be tested independently — verify that cached responses have proper TTL headers and that stale data is clearly labeled when served.

7. **Instrument Observability Foundations** — Add Prometheus-style metrics (request count, error rate, latency histograms at p50/p95/p99), structured JSON logging with correlation IDs propagated across async boundaries, and OpenTelemetry distributed tracing with W3C Trace Context headers (`traceparent`, `tracestate`). **Checkpoint:** Every trace must have a correlation ID that flows through the entire request chain; verify this end-to-end with a test request that spans all services.

---

## Reliability Patterns

### Pattern 1: Circuit Breaker Implementation

Three-state circuit breaker (Closed → Open → Half-Open) with configurable thresholds. Closes on consecutive successes in half-open state to prevent premature traffic recovery.

```python
from enum import Enum
import time
import threading
from functools import wraps
from typing import Callable, Any


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open and request is rejected."""
    pass


class CircuitBreaker:
    """Three-state circuit breaker with configurable thresholds.

    States:
      - CLOSED: Normal operation. Requests pass through. Failure counter increments on error.
        Opens to OPEN after `failure_threshold` consecutive failures.
      - OPEN: All requests rejected immediately. After `recovery_timeout` seconds, transitions to HALF_OPEN.
      - HALF_OPEN: Allows `success_threshold` test requests through. If all succeed → CLOSED.
                   If any fails → back to OPEN for another recovery_timeout period.
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        success_threshold: int = 3,
        name: str = "default",
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold
        self.name = name

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: float | None = None
        self._lock = threading.RLock()

    @property
    def state(self) -> CircuitState:
        with self._lock:
            if self._state == CircuitState.OPEN and self._last_failure_time is not None:
                elapsed = time.monotonic() - self._last_failure_time
                if elapsed >= self.recovery_timeout:
                    self._state = CircuitState.HALF_OPEN
                    self._success_count = 0
            return self._state

    def call(self, func: Callable, *args: Any, **kwargs: Any) -> Any:
        """Execute func through the circuit breaker."""
        current_state = self.state

        if current_state == CircuitState.OPEN:
            raise CircuitBreakerOpenError(
                f"Circuit breaker '{self.name}' is OPEN. "
                f"Recovery in {self.recovery_timeout - (time.monotonic() - self._last_failure_time):.1f}s"
            )

        try:
            result = func(*args, **kwargs)
            self._record_success()
            return result
        except Exception as e:
            self._record_failure()
            raise

    def _record_success(self) -> None:
        with self._lock:
            if self.state == CircuitState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self.success_threshold:
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    self._success_count = 0
            else:
                self._failure_count = 0

    def _record_failure(self) -> None:
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.monotonic()

            if self.state == CircuitState.HALF_OPEN:
                self._state = CircuitState.OPEN
                self._success_count = 0
            elif self._failure_count >= self.failure_threshold:
                self._state = CircuitState.OPEN

    def reset(self) -> None:
        with self._lock:
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._success_count = 0

    def __call__(self, func: Callable) -> Callable:
        """Decorator usage: @circuit_breaker on any function."""
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            return self.call(func, *args, **kwargs)
        return wrapper


# Usage example with decorator and manual call
breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=15.0, name="payment-service")

@breaker
def process_payment(user_id: int, amount: float) -> dict:
    """Payment processing protected by circuit breaker."""
    response = payment_api.charge(user_id, amount)
    return {"status": "success", "transaction_id": response.id}

# Manual call with explicit exception handling
try:
    result = breaker.call(payment_api.check_status, txn_id="abc123")
except CircuitBreakerOpenError as e:
    # Fallback: return cached or queued payment status
    result = get_cached_payment_status(txn_id="abc123")
```

### Pattern 2: Retry with Exponential Backoff and Jitter

Prevents thundering herd by adding random jitter to exponential backoff delays. Distinguishes retriable vs non-retriable errors.

```python
import time
import random
from typing import Type, Tuple, Callable, Any
from functools import wraps


class RetriableError(Exception):
    """Mark an exception as eligible for retry."""
    pass


class NonRetriableError(Exception):
    """Mark an exception as permanently failed — do not retry."""
    pass


def with_retry(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    retriable_exceptions: Tuple[Type[Exception], ...] = (RetriableError,),
    jitter: bool = True,
):
    """Retry decorator with exponential backoff and optional jitter.

    Delay formula: min(base_delay * (2 ^ attempt) + jitter_random, max_delay)
    Jitter uses random.uniform(0, delay / 2) to prevent synchronized retries
    from all clients simultaneously when the downstream service recovers.
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exception = None

            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except NonRetriableError:
                    raise  # Never retry non-retriable errors
                except retriable_exceptions as e:
                    last_exception = e

                    if attempt == max_retries:
                        raise  # Exhausted all retries

                    # Calculate delay with exponential backoff
                    delay = min(base_delay * (2 ** attempt), max_delay)

                    # Add jitter to prevent thundering herd
                    if jitter:
                        delay += random.uniform(0, delay / 2)

                    time.sleep(delay)

            raise RuntimeError(f"Failed after {max_retries} retries") from last_exception

        return wrapper
    return decorator


# Classification helper for HTTP responses
def classify_http_error(status_code: int, response_body: str) -> Exception:
    """Classify HTTP errors as retriable or non-retriable.

    Retriable: 429 (Too Many Requests), 500/502/503/504 (Server errors)
    Non-retriable: 4xx client errors except 429, connection resets
    """
    retriable_codes = {429, 500, 502, 503, 504}

    if status_code == 401 or status_code == 403:
        return NonRetriableError(f"Authentication failed — do not retry: HTTP {status_code}")
    if status_code in retriable_codes:
        return RetriableError(f"Transient server error: HTTP {status_code} — {response_body[:200]}")
    if 400 <= status_code < 500:
        return NonRetriableError(f"Client error — do not retry: HTTP {status_code}")

    return RetriableError(f"Unexpected status code: {status_code}")


# ❌ BAD: Fixed-delay retry without jitter causes thundering herd when all clients
# retry simultaneously upon service recovery, creating a secondary outage.
def bad_fixed_retry(url: str, payload: dict) -> dict:
    """Fixed 5-second delay between retries — never use in production."""
    import httpx, time

    client = httpx.Client(timeout=10.0)
    for attempt in range(4):  # 3 retries + 1 attempt
        try:
            response = client.post(url, json=payload)
            if response.status_code < 500:
                return response.json()
        except Exception:
            pass
        time.sleep(5.0)  # ❌ FIXED delay — every client sends retry at exactly T+5, T+10, T+15
    finally:
        client.close()
    raise RuntimeError("All retries exhausted")


# ✅ GOOD: Exponential backoff with random jitter prevents thundering herd.
# Delay = base_delay * 2^attempt + uniform(0, delay/2), capped at max_delay.
@with_retry(
    max_retries=3,
    base_delay=0.5,
    max_delay=30.0,
    jitter=True,
)
def call_downstream_service(url: str, payload: dict) -> dict:
    """Production-ready retry with exponential backoff and random jitter."""
    import httpx

    client = httpx.Client(timeout=10.0)
    try:
        response = client.post(url, json=payload)
        error = classify_http_error(response.status_code, response.text)

        if isinstance(error, NonRetriableError):
            raise NonRetriableError(str(error))
        if response.status_code >= 500 or response.status_code == 429:
            raise RetriableError(str(error))
        response.raise_for_status()
        return response.json()
    finally:
        client.close()
```

### Pattern 3: Bulkhead Isolation

Thread-pool-based bulkhead isolation prevents one slow downstream service from exhausting all worker threads and cascading failure.

```python
import threading
from concurrent.futures import ThreadPoolExecutor, Future, TimeoutError as FuturesTimeout
from typing import Callable, Any, Optional
from dataclasses import dataclass, field


@dataclass
class BulkheadMetrics:
    """Track bulkhead utilization for observability."""
    active_calls: int = 0
    rejected_calls: int = 0
    completed_calls: int = 0

    @property
    def utilization(self) -> float:
        return self.active_calls / self.max_capacity if self.max_capacity > 0 else 0.0


class BulkheadFullError(Exception):
    """Raised when the bulkhead pool is at capacity and rejecting new calls."""
    pass


class Bulkhead:
    """Thread-pool-based bulkhead isolation per downstream dependency.

    Each critical service gets its own Bulkhead instance with independent
    max_concurrent_calls and queue_size limits. When the pool is full,
    callers get an immediate rejection (REJECT policy) rather than queuing
    indefinitely and creating a cascading timeout chain.

    Example: PaymentService has 20 threads, SearchService has 50 threads.
    A slow SearchService exhausting its pool does NOT block payment processing.
    """

    def __init__(
        self,
        max_concurrent_calls: int = 10,
        queue_size: int = 0,
        rejection_policy: str = "raise",
        name: str = "default",
    ):
        self.max_concurrent_calls = max_concurrent_calls
        self.queue_size = queue_size
        self.rejection_policy = rejection_policy
        self.name = name
        self._executor = ThreadPoolExecutor(
            max_workers=max_concurrent_calls,
            thread_name_prefix=f"bulkhead-{name}",
        )
        self._semaphore = threading.Semaphore(max_concurrent_calls)
        self.metrics = BulkheadMetrics()
        self.metrics.max_capacity = max_concurrent_calls

    def execute(self, func: Callable, *args: Any, timeout: Optional[float] = None, **kwargs: Any) -> Any:
        """Execute func through the bulkhead with concurrency limiting.

        Raises:
            BulkheadFullError: When pool is at capacity and rejection policy is 'raise'.
            FuturesTimeout: When the callable does not complete within the timeout.
        """
        if not self._semaphore.acquire(blocking=False):
            self.metrics.rejected_calls += 1

            if self.rejection_policy == "raise":
                raise BulkheadFullError(
                    f"Bulkhead '{self.name}' is full ({self.max_concurrent_calls} concurrent calls). "
                    f"Rejected. Active: {self.metrics.active_calls}"
                )
            elif self.rejection_policy == "queue":
                queued = self._semaphore.acquire(blocking=True, timeout=timeout or 5.0)
                if not queued:
                    self.metrics.rejected_calls += 1
                    raise BulkheadFullError(f"Bulkhead '{self.name}' queue timed out after {timeout}s")

        future: Future = self._executor.submit(func, *args, **kwargs)

        try:
            self.metrics.active_calls += 1
            if timeout is not None:
                return future.result(timeout=timeout)
            return future.result()
        finally:
            self.metrics.active_calls -= 1
            self.metrics.completed_calls += 1
            self._semaphore.release()

    def shutdown(self, wait: bool = True) -> None:
        """Clean up the executor. Call during graceful shutdown."""
        self._executor.shutdown(wait=wait)

    @property
    def available_capacity(self) -> int:
        return self.max_concurrent_calls - self.metrics.active_calls


# Practical bulkhead setup for a service with multiple downstream dependencies
class ResilientOrderService:
    """Orders service with bulkhead isolation per downstream dependency."""

    def __init__(self):
        # Each dependency gets its own resource pool — a slow inventory check
        # does NOT exhaust payment processing threads
        self._payment_bulkhead = Bulkhead(
            max_concurrent_calls=30,
            queue_size=10,
            rejection_policy="raise",
            name="payments",
        )
        self._inventory_bulkhead = Bulkhead(
            max_concurrent_calls=50,
            queue_size=20,
            rejection_policy="raise",
            name="inventory",
        )
        self._notification_bulkhead = Bulkhead(
            max_concurrent_calls=10,
            queue_size=0,
            rejection_policy="raise",
            name="notifications",
        )

    def create_order(self, user_id: int, items: list[dict]) -> dict:
        """Process an order with bulkhead-protected downstream calls."""
        # Check inventory in its own thread pool
        inventory_result = self._inventory_bulkhead.execute(
            self._check_inventory, items, timeout=3.0
        )

        if not inventory_result.available:
            raise ValueError(f"Items unavailable: {inventory_result.unavailable_items}")

        # Process payment in a separate thread pool
        payment_result = self._payment_bulkhead.execute(
            self._process_payment, user_id, items, timeout=10.0
        )

        # Fire-and-forget notification in yet another pool
        try:
            self._notification_bulkhead.execute(
                self._send_confirmation, user_id, payment_result.order_id
            )
        except BulkheadFullError:
            # Notification is optional — log and continue, do not fail the order
            pass

        return {
            "order_id": payment_result.order_id,
            "status": "confirmed",
            "items": items,
        }

    def _check_inventory(self, items: list[dict]) -> dict: ...
    def _process_payment(self, user_id: int, items: list[dict]) -> dict: ...
    def _send_confirmation(self, user_id: int, order_id: str) -> None: ...
```

### Pattern 4: Health Check Patterns (Liveness vs Readiness)

Kubernetes liveness probes restart unhealthy processes; readiness probes control traffic routing. Implement both separately — they answer different questions.

```python
import time
from enum import Enum
from dataclasses import dataclass, field
from typing import Callable, Any


class ProbeType(Enum):
    STARTUP = "startup"
    LIVENESS = "liveness"
    READINESS = "readiness"


@dataclass
class HealthStatus:
    """Unified health check result for all probe types."""
    status: str = "healthy"           # "healthy", "unhealthy", "degraded"
    probe_type: ProbeType = ProbeType.LIVENESS
    details: dict[str, Any] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.monotonic)
    dependencies_ok: bool = True

    def unhealthy(self, reason: str, **extra) -> "HealthStatus":
        self.status = "unhealthy"
        self.dependencies_ok = False
        self.details["reason"] = reason
        self.details.update(extra)
        return self

    def degraded(self, reason: str, **extra) -> "HealthStatus":
        self.status = "degraded"
        self.details["reason"] = reason
        self.details.update(extra)
        return self


class HealthCheckRegistry:
    """Central health check registry supporting startup, liveness, and readiness probes.

    Kubernetes configuration:
      - startupProbe:    initialDelaySeconds=30, periodSeconds=5
                        Prevents premature restart during slow initialization
      - livenessProbe:   initialDelaySeconds=15, periodSeconds=10
                         Returns 503 if process is stuck — K8s restarts the pod
      - readinessProbe:  periodSeconds=5, successThreshold=1, failureThreshold=3
                         Returns 503 to remove from load balancer pool
    """

    def __init__(self):
        self._checkers: dict[str, Callable[[], HealthStatus]] = {}

    def register(self, name: str, checker: Callable[[], HealthStatus], probe_type: ProbeType = ProbeType.LIVENESS) -> None:
        self._checkers[name] = (checker, probe_type)

    def check_liveness(self) -> HealthStatus:
        """Liveness check: is the process alive and not in a bad state?

        Must be fast (< 500ms). Do NOT check slow downstream dependencies here —
        liveness failures cause pod restarts which amplify load on those same dependencies.
        If this service's database connection pool is exhausted, that's a readiness issue,
        not a liveness issue. The process can still function once the pool recovers.
        """
        status = HealthStatus(probe_type=ProbeType.LIVENESS)

        # Check internal state: thread deadlocks, memory pressure
        import threading
        active_threads = threading.active_count()
        if active_threads > 200:
            return status.unhealthy(
                "Thread count critically high",
                active_threads=active_threads,
            )

        for name, (checker, probe_type) in self._checkers.items():
            if probe_type == ProbeType.LIVENESS:
                try:
                    result = checker()
                    if not status.dependencies_ok:
                        return result  # Liveness failed — fail fast
                except Exception as e:
                    return status.unhealthy(f"Liveness check '{name}' threw", error=str(e))

        return status

    def check_readiness(self) -> HealthStatus:
        """Readiness check: can this service handle traffic?

        MUST verify all critical downstream dependencies. A service that reports
        healthy but cannot reach its database will receive broken requests from
        the load balancer and contribute to user-visible failures.
        """
        status = HealthStatus(probe_type=ProbeType.READINESS)

        for name, (checker, probe_type) in self._checkers.items():
            if probe_type == ProbeType.READINESS:
                try:
                    result = checker()
                    if not result.dependencies_ok:
                        return result  # Dependency failed — not ready for traffic
                except Exception as e:
                    return status.unhealthy(f"Readiness check '{name}' threw", error=str(e))

        return status


# Example: Flask/Sanic-style HTTP handlers for Kubernetes probes
from flask import Flask, jsonify

app = Flask(__name__)
health_registry = HealthCheckRegistry()

# Register a database health checker as readiness probe
def db_health_check() -> HealthStatus:
    """Verify the database connection pool has working connections."""
    try:
        # Simple query that verifies connectivity and permission
        with db_pool.connection() as conn:
            conn.execute("SELECT 1")
        return HealthStatus(probe_type=ProbeType.READINESS, status="healthy", dependencies_ok=True)
    except Exception:
        return HealthStatus(
            probe_type=ProbeType.READINESS,
            status="unhealthy",
            dependencies_ok=False,
            reason="database_unreachable",
        )

health_registry.register("database", db_health_check, ProbeType.READINESS)

# Register application-specific liveness check
def app_liveness_check() -> HealthStatus:
    """Verify the application process is not in a zombie state."""
    return HealthStatus(probe_type=ProbeType.LIVENESS, status="healthy")

health_registry.register("app", app_liveness_check, ProbeType.LIVENESS)


@app.get("/startup")
def startup_probe():
    """Kubernetes startup probe — returns 200 when initialization is complete."""
    if not app.initialized:
        return jsonify({"status": "initializing"}), 503
    return jsonify({"status": "ready"}), 200


@app.get("/healthz")
def liveness_probe():
    """Kubernetes liveness probe — returns 503 when process is broken."""
    result = health_registry.check_liveness()
    code = 200 if result.status == "healthy" else 503
    return jsonify(result.details), code


@app.get("/ready")
def readiness_probe():
    """Kubernetes readiness probe — returns 503 when not ready to receive traffic."""
    result = health_registry.check_readiness()
    code = 200 if result.dependencies_ok else 503
    return jsonify(result.details), code


# Kubernetes probe configuration example:
"""
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 10
  failureThreshold: 3        # 3 consecutive failures → restart pod

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3        # 3 consecutive failures → remove from service endpoints

startupProbe:
  httpGet:
    path: /startup
    port: 8080
  failureThreshold: 30       # Allow up to 150 seconds for startup (30 * 5s)
  periodSeconds: 5
"""
```

### Pattern 5: Graceful Degradation Strategies

Feature flag-based degradation system that serves fallback responses when downstream dependencies fail, prioritized by data freshness requirements.

```python
import time
from enum import IntEnum
from typing import Any, Optional
from dataclasses import dataclass, field


class FallbackPriority(IntEnum):
    """Priority ordering for fallback responses. Lower number = higher priority."""
    STALE_CACHE = 1          # Cached data with TTL — serve if available and not expired
    DEFAULT_VALUE = 2        # Sensible defaults (e.g., empty list, zero count)
    CACHED_LEGACY = 3        # Older cached version from long-term storage
    MAINTENANCE_MESSAGE = 4  # User-facing message explaining the limitation


@dataclass
class FallbackResponse:
    """Wrapped response with metadata about its provenance."""
    data: Any
    source: str              # "fresh", "stale_cache", "default", etc.
    priority: FallbackPriority = FallbackPriority.STALE_CACHE
    staleness_seconds: float = 0.0
    is_degraded: bool = False

    @property
    def fresh(self) -> bool:
        return self.source == "fresh"


class DegradationManager:
    """Manages fallback strategies for downstream dependency failures.

    Each protected service has a priority-ordered list of fallback responses.
    When the primary call fails, the manager tries each fallback in order until
    one succeeds. This ensures users always see SOMETHING — even if degraded —
    rather than a hard error.
    """

    def __init__(self):
        self._strategies: dict[str, list[Callable]] = {}

    def register(self, service_name: str, fallback_fn: Callable) -> None:
        """Register a fallback function for a specific downstream service."""
        if service_name not in self._strategies:
            self._strategies[service_name] = []
        self._strategies[service_name].append(fallback_fn)

    def serve_with_fallback(self, service_name: str, primary_fn: Callable, *args, **kwargs) -> FallbackResponse:
        """Execute primary function; fall back through registered handlers on failure.

        Returns the highest-priority successful response from any source.
        Raises only if ALL fallbacks also fail.
        """
        # Try the primary path first (fresh data)
        try:
            result = primary_fn(*args, **kwargs)
            return FallbackResponse(data=result, source="fresh", is_degraded=False)
        except Exception as primary_error:
            pass

        # Try fallbacks in registration order (highest priority first)
        fallbacks = self._strategies.get(service_name, [])
        last_error = primary_error

        for fallback_fn in fallbacks:
            try:
                result = fallback_fn(*args, **kwargs)
                return FallbackResponse(
                    data=result,
                    source=f"{service_name}_fallback",
                    priority=FallbackPriority.STALE_CACHE,
                    is_degraded=True,
                )
            except Exception as fallback_error:
                last_error = fallback_error
                continue

        raise RuntimeError(
            f"All paths failed for '{service_name}'. Primary error: {primary_error}. "
            f"Last fallback error: {last_error}"
        )


# Practical example: Product catalog with 3-level degradation
class ProductService:
    """Product service with graceful degradation across cache tiers."""

    def __init__(self, degradation_mgr: DegradationManager):
        self.degradation = degradation_mgr
        self.degradation.register("product_catalog", self._get_stale_cache)
        self.degradation.register("product_catalog", self._get_default_category)

    def get_product(self, product_id: str) -> FallbackResponse:
        """Get product details — always returns something if possible."""
        return self.degradation.serve_with_fallback(
            service_name="product_catalog",
            primary_fn=self._fetch_from_database,
            product_id=product_id,
        )

    def get_category_list(self) -> FallbackResponse:
        """Get category list — serve stale cache if database is down."""
        return self.degradation.serve_with_fallback(
            service_name="category_list",
            primary_fn=self._fetch_categories_db,
        )

    def _fetch_from_database(self, product_id: str) -> dict:
        """Primary: query the production database."""
        ...

    def _get_stale_cache(self, product_id: str) -> dict:
        """Fallback 1: serve from Redis cache if TTL hasn't expired."""
        cached = redis_client.get(f"product:{product_id}")
        if cached and not self._is_expired(cached):
            return cached
        raise Exception("Stale cache miss or expired")

    def _get_default_category(self) -> list[str]:
        """Fallback 2: serve a hardcoded default category list."""
        return ["Electronics", "Books", "Home & Garden"]

    @staticmethod
    def _is_expired(cached_data: bytes) -> bool:
        data = cached_data.decode()
        # Parse timestamp embedded in cache value
        ttl_seconds = 300  # 5-minute TTL
        return (time.monotonic() - float(data.split("|")[1])) > ttl_seconds
```

### Pattern 6: Distributed Idempotency

Idempotency keys ensure that duplicate or retried requests produce the same result without side effects. Uses a store with TTL to auto-expire old keys.

```python
import time
import hashlib
from typing import Any, Optional
from dataclasses import dataclass
from enum import Enum


class IdempotencyStatus(Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class IdempotencyRecord:
    """Stored idempotency record for a request key."""
    request_key: str
    response_data: Any
    status: IdempotencyStatus
    created_at: float = field(default_factory=time.monotonic)
    expires_at: float = 0.0

    @property
    def is_expired(self) -> bool:
        return self.expires_at > 0 and time.monotonic() > self.expires_at


class IdempotencyStore:
    """Abstract interface for idempotency key storage.

    Production implementations use Redis (with TTL auto-expiry) or
    a dedicated database table with periodic cleanup jobs.
    """

    def get(self, key: str) -> Optional[IdempotencyRecord]:
        raise NotImplementedError

    def put(self, record: IdempotencyRecord) -> None:
        raise NotImplementedError

    def delete(self, key: str) -> None:
        raise NotImplementedError


class RedisIdempotencyStore(IdempotencyStore):
    """Redis-backed idempotency store with automatic TTL expiry.

    Key format: `idemp:{hash_of_key}` — prevents key collision attacks.
    Value: JSON-serialized IdempotencyRecord.
    TTL: configured per-record (default 24 hours), allowing retries within that window
         while preventing indefinite storage growth.
    """

    def __init__(self, redis_client, default_ttl: int = 86400):
        self._redis = redis_client
        self._default_ttl = default_ttl

    def get(self, key: str) -> Optional[IdempotencyRecord]:
        raw = self._redis.get(f"idemp:{self._hash(key)}")
        if raw is None:
            return None
        import json
        data = json.loads(raw.decode())
        return IdempotencyRecord(**data)

    def put(self, record: IdempotencyRecord) -> None:
        import json
        key = f"idemp:{self._hash(record.request_key)}"
        data = {
            "request_key": record.request_key,
            "response_data": record.response_data,
            "status": record.status.value,
            "created_at": record.created_at,
            "expires_at": record.expires_at,
        }
        self._redis.setex(key, int(record.expires_at - time.monotonic()), json.dumps(data))

    def delete(self, key: str) -> None:
        self._redis.delete(f"idemp:{self._hash(key)}")

    @staticmethod
    def _hash(raw_key: str) -> str:
        return hashlib.sha256(raw_key.encode()).hexdigest()[:32]


class IdempotencyEngine:
    """Enforces idempotency on API endpoints using request-specific keys.

    Workflow:
      1. Client sends `Idempotency-Key` header with a UUID
      2. Engine checks store for existing record with this key
      3. If found and completed → returns the original response immediately
      4. If not found → executes the handler, stores result, returns it
      5. Store auto-expires records after TTL to prevent unbounded growth

    This protects against:
      - Network retries (client resends because it didn't get a response)
      - Webhook delivery duplicates (provider sends same event twice)
      - Client-side duplicate submission (double-click on "Pay" button)
    """

    def __init__(self, store: IdempotencyStore, default_ttl: int = 86400):
        self._store = store
        self._default_ttl = default_ttl

    def execute(
        self,
        handler: Any,
        idempotency_key: str,
        ttl: Optional[int] = None,
        *args: Any,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Execute a handler with idempotency protection.

        Args:
            handler: Callable that performs the actual work (side effects).
            idempotency_key: Unique key from client (UUID recommended).
            ttl: Time-to-live in seconds for this key (default: 24h).

        Returns:
            Dict with 'status' ('replayed' or 'executed'), 'result', and 'idempotency_key'.

        Raises:
            IdempotencyKeyRequired: If no idempotency key was provided.
        """
        if not idempotency_key:
            raise ValueError("Idempotency-Key header is required for write operations")

        ttl = ttl or self._default_ttl
        store_key = idempotency_key

        # Check for existing record
        existing = self._store.get(store_key)
        if existing and not existing.is_expired:
            if existing.status == IdempotencyStatus.COMPLETED:
                return {"status": "replayed", "result": existing.response_data, "idempotency_key": store_key}
            elif existing.status == IdempotencyStatus.FAILED:
                # Retry failed requests — the original handler might succeed this time
                pass

        # Execute handler and store result
        try:
            result = handler(*args, **kwargs)

            record = IdempotencyRecord(
                request_key=store_key,
                response_data=result,
                status=IdempotencyStatus.COMPLETED,
                created_at=time.monotonic(),
                expires_at=time.monotonic() + ttl,
            )
            self._store.put(record)

            return {"status": "executed", "result": result, "idempotency_key": store_key}

        except Exception as e:
            # Store failure so retries don't re-attempt (prevents retry storms on known failures)
            record = IdempotencyRecord(
                request_key=store_key,
                response_data={"error": str(e)},
                status=IdempotencyStatus.FAILED,
                created_at=time.monotonic(),
                expires_at=time.monotonic() + ttl,
            )
            self._store.put(record)
            raise

    def cleanup_expired(self) -> int:
        """Remove expired records from the store. Call periodically or rely on Redis TTL."""
        # Implementation depends on storage backend
        return 0


# Usage with Flask — extract key from header and protect write endpoints
@app.post("/orders")
def create_order():
    idempotency_key = request.headers.get("Idempotency-Key")

    if not idempotency_key:
        return jsonify({"error": "Idempotency-Key header required"}), 400

    engine = IdempotencyEngine(RedisIdempotencyStore(redis_client))

    try:
        result = engine.execute(
            handler=order_service.create_order,
            idempotency_key=idempotency_key,
            ttl=86400,  # 24-hour retry window
            user_id=request.json["user_id"],
            items=request.json["items"],
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    response_code = 201 if result["status"] == "executed" else 200
    return jsonify(result), response_code
```

---

## Observability Foundations

Observability is not optional — it's the feedback loop that tells you whether your reliability patterns are actually working. Without metrics, logs, and traces, circuit breakers fire blind and retry storms go undetected.

### Metrics

Collect request counts, error rates, and latency percentiles (p50, p95, p99) using histograms. Instrument every service boundary.

```python
import time
import prometheus_client
from prometheus_client import Histogram, Counter, Gauge, start_http_server


class ServiceMetrics:
    """Prometheus-style metrics for a distributed service."""

    def __init__(self, service_name: str):
        self.service_name = service_name

        # Request counting — total and per-status
        self.request_count = Counter(
            f"{service_name}_http_requests_total",
            "Total HTTP requests",
            ["method", "path", "status_code"],
        )
        self.error_count = Counter(
            f"{service_name}_http_errors_total",
            "Request errors by type",
            ["error_type", "source_service"],
        )

        # Latency histogram — captures p50, p95, p99 automatically
        self.request_latency = Histogram(
            f"{service_name}_http_request_duration_seconds",
            "HTTP request latency in seconds",
            ["method", "path"],
            buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
        )

        # Circuit breaker state tracking
        self.circuit_breaker_state = Gauge(
            f"{service_name}_circuit_breaker_open",
            "Circuit breaker open (1) or closed (0)",
            ["target_service"],
        )
        self.circuit_breaker_trips = Counter(
            f"{service_name}_circuit_breaker_trips_total",
            "Number of times circuit breakers opened",
            ["target_service"],
        )

    def measure_request(self, method: str, path: str, status_code: int):
        """Record a completed HTTP request."""
        self.request_count.labels(method=method, path=path, status_code=str(status_code)).inc()

    def track_latency(self, method: str, path: str):
        """Context manager to track request duration."""
        return _LatencyTimer(self.request_latency, method, path)

    def record_error(self, error_type: str, source_service: str):
        """Record an application-level error (not HTTP status)."""
        self.error_count.labels(error_type=error_type, source_service=source_service).inc()


class _LatencyTimer:
    """Context manager for timing operations and recording to histogram."""

    def __init__(self, histogram: Histogram, method: str, path: str):
        self._histogram = histogram
        self._method = method
        self._path = path
        self._start: float | None = None

    def __enter__(self) -> "_LatencyTimer":
        self._start = time.monotonic()
        return self

    def __exit__(self, *args):
        if self._start is not None:
            duration = time.monotonic() - self._start
            self._histogram.labels(method=self._method, path=self._path).observe(duration)


# Prometheus configuration for scraping
"""
scrape_configs:
  - job_name: 'order-service'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['order-service:8000']
    scrape_interval: 15s
"""
```

### Structured Logging

JSON logging with correlation IDs that propagate across async boundaries. Every log line must contain a `trace_id` for distributed request tracing.

```python
import json
import logging
import uuid
import asyncio
from typing import Any


class CorrelationIdContext:
    """Async-safe correlation ID context using contextvars (Python 3.7+).

    Each incoming request gets a unique trace_id that flows through all
    async operations, log messages, and cross-service HTTP calls.
    """
    _context = asyncio.get_event_loop().run_until_complete(
        asyncio.run(asyncio.create_task(_init_context()))
    )


async def _init_context() -> None:
    global CorrelationIdContext
    import contextvars
    CorrelationIdContext._trace_id: contextvars.ContextVar[str] = contextvars.ContextVar("trace_id", default=None)
    CorrelationIdContext._span_id: contextvars.ContextVar[str] = contextvars.ContextVar("span_id", default=None)


@staticmethod
def generate_trace_id() -> str:
    return uuid.uuid4().hex[:16]


def set_trace_id(trace_id: str | None = None) -> str:
    """Set the correlation ID for the current request scope. Returns the ID."""
    tid = trace_id or generate_trace_id()
    CorrelationIdContext._trace_id.set(tid)
    return tid


def get_trace_id() -> str:
    """Get the current correlation ID, generating one if absent."""
    return CorrelationIdContext._trace_id.get() or set_trace_id()


class StructuredLogger:
    """JSON logger that automatically includes trace_id in every log entry.

    Usage:
        logger = StructuredLogger("order-service")
        logger.info("Processing order", user_id=123, amount=49.99)
        # Output: {"level":"info","service":"order-service","trace_id":"abc...","message":"Processing order","user_id":123,"amount":49.99}
    """

    def __init__(self, service_name: str):
        self._logger = logging.getLogger(service_name)
        self._service_name = service_name

        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(message)s"))  # JSON is the message
        self._logger.addHandler(handler)
        self._logger.setLevel(logging.DEBUG)

    def _build_record(self, level: str, message: str, **extra_fields: Any) -> dict:
        return {
            "level": level,
            "service": self._service_name,
            "trace_id": get_trace_id(),
            "message": message,
            "timestamp": time.time(),
            **extra_fields,
        }

    def info(self, message: str, **extra):
        self._logger.info(json.dumps(self._build_record("info", message, **extra)))

    def error(self, message: str, **extra):
        self._logger.error(json.dumps(self._build_record("error", message, **extra)))

    def warning(self, message: str, **extra):
        self._logger.warning(json.dumps(self._build_record("warn", message, **extra)))


# Propagation to downstream services via HTTP headers
def inject_trace_headers(headers: dict[str, str]) -> dict[str, str]:
    """Add W3C Trace Context headers for distributed tracing propagation."""
    trace_id = get_trace_id()
    headers["traceparent"] = f"00-{trace_id}-{'0' * 16}-01"
    headers["x-correlation-id"] = trace_id
    return headers
```

### Distributed Tracing with OpenTelemetry

Set up OpenTelemetry for end-to-end request tracing across all services. Uses W3C Trace Context propagation (`traceparent`, `tracestate` headers) as the standard for cross-service span correlation.

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor


def setup_tracing(service_name: str, otlp_endpoint: str = "http://jaeger:4317") -> trace.Tracer:
    """Initialize OpenTelemetry tracing with resource attributes and OTLP exporter.

    W3C Trace Context headers (traceparent, tracestate) are automatically injected
    into outgoing HTTP requests by the instrumentation library. Incoming requests
    that carry these headers will have their trace context extracted and linked
    to existing spans, creating end-to-end distributed traces.
    """
    resource = Resource.create({
        "service.name": service_name,
        "service.version": "1.0.0",
        "deployment.environment": "production",
    })

    provider = TracerProvider(resource=resource)

    # Export to both OTLP (production) and console (development/debugging)
    otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
    provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))

    trace.set_tracer_provider(provider)
    HTTPXClientInstrumentor().instrument()  # Auto-instruments all httpx calls

    return trace.get_tracer(service_name)


def setup_baggage(key: str, value: str) -> None:
    """Set baggage for cross-cutting concerns (tenant ID, feature flags, user region).

    Baggage propagates with every span in the trace and is visible in all downstream services.
    Use sparingly — each baggage key adds ~200 bytes to every HTTP header.
    """
    from opentelemetry.baggage import set_baggage
    set_baggage(key, value)


# Usage example: instrumenting a specific operation
tracer = setup_tracing("order-service")

def create_order(user_id: int, items: list[dict]) -> dict:
    """Order creation with distributed tracing spanning multiple internal operations."""
    # Start an explicit span for the high-level operation
    with tracer.start_as_current_span("order.create") as order_span:
        order_span.set_attribute("user.id", user_id)
        order_span.set_attribute("item_count", len(items))

        # Check inventory — this creates a child span with automatic parent link
        inventory_result = check_inventory(items)

        if not inventory_result.available:
            order_span.set_attribute("order.status", "inventory_failed")
            raise ValueError(f"Inventory insufficient for {len(items)} items")

        # Process payment — another child span, potentially in a different service via gRPC/HTTP
        with tracer.start_as_current_span("order.payment.charge") as payment_span:
            payment_result = process_payment(user_id, items)
            payment_span.set_attribute("payment.amount", payment_result.total)

        # Create order record — third child span
        order = save_order(user_id, items, payment_result)
        order_span.set_attribute("order.id", order.id)

        return {
            "order_id": order.id,
            "status": "confirmed",
            "payment": payment_result.transaction_id,
        }
```

---

## Saga Pattern for Distributed Transactions

Orchestration-based sagas use a central coordinator that manages the lifecycle of distributed transactions and their compensating actions. Choreography-based sagas use events where each participant publishes an event that triggers the next step.

### Orchestration-Based Saga

A saga orchestrator coordinates multi-step transactions across independent services, executing compensating transactions in reverse order when any step fails.

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Any


class SagaStatus(Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    FAILED = "failed"


@dataclass
class SagaStep:
    """A single step in a saga with its forward and compensating actions."""
    name: str
    action: Callable  # Forward operation (e.g., reserve inventory)
    compensate: Callable  # Compensating operation (e.g., release inventory)


class SagaOrchestrator:
    """Orchestration-based saga coordinator for distributed transactions.

    Workflow:
      1. Execute each step sequentially in order.
      2. If any step fails, execute compensating actions for ALL previously
         completed steps in REVERSE order.
      3. Once compensation completes (even if a compensation itself fails),
         the saga is in FAILED state — requires manual intervention.

    This ensures atomic-like semantics across independent services that do NOT
    support distributed ACID transactions. Each step is locally transactional,
    and the saga pattern provides eventual consistency at the system level.
    """

    def __init__(self):
        self._steps: list[SagaStep] = []

    def add_step(self, name: str, action: Callable, compensate: Callable) -> "SagaOrchestrator":
        """Add a step with forward and compensating actions."""
        self._steps.append(SagaStep(name=name, action=action, compensate=compensate))
        return self

    def execute(self, context: dict[str, Any] | None = None) -> dict[str, Any]:
        """Execute all steps or compensate on failure.

        Returns a result dict with 'status', 'completed_steps', and 'failed_at'.
        """
        if context is None:
            context = {}

        completed_indices: list[int] = []

        # Forward execution
        try:
            for i, step in enumerate(self._steps):
                logger.info(f"Saga executing step: {step.name}", trace_id=get_trace_id())

                result = step.action(context)
                context[f"{step.name}_result"] = result
                completed_indices.append(i)

        except Exception as e:
            # Compensation phase — reverse order
            self._compensate(completed_indices, context)
            return {
                "status": SagaStatus.FAILED.value,
                "completed_steps": len(completed_indices),
                "total_steps": len(self._steps),
                "failed_at": e.__class__.__name__,
                "error": str(e),
            }

        return {
            "status": SagaStatus.COMPLETED.value,
            "completed_steps": len(completed_indices),
            "context": context,
        }

    def _compensate(self, completed_indices: list[int], context: dict) -> None:
        """Execute compensating actions in reverse order."""
        logger.info("Saga entering compensation phase", trace_id=get_trace_id())

        for i in reversed(completed_indices):
            step = self._steps[i]
            try:
                step.compensate(context)
                logger.info(f"Compensation successful for: {step.name}", trace_id=get_trace_id())
            except Exception as e:
                # Compensation itself failed — this is a critical failure requiring
                # manual intervention. Log and continue with remaining compensations.
                logger.error(
                    f"COMPENSATION FAILURE for {step.name}: {e}. "
                    f"Manual cleanup required.",
                    trace_id=get_trace_id(),
                )


# Complete example: 3-service order fulfillment saga
def build_order_saga() -> SagaOrchestrator:
    """Build a saga that spans Inventory → Payment → Shipping services."""

    def reserve_inventory(ctx: dict) -> dict:
        return inventory_service.reserve(
            items=ctx["items"],
            user_id=ctx["user_id"],
            reservation_id=f"res-{uuid.uuid4().hex[:8]}",
        )

    def release_inventory(ctx: dict) -> dict:
        return inventory_service.release(reservation_id=ctx.get("reserve_inventory_result", {}).get("reservation_id"))

    def charge_payment(ctx: dict) -> dict:
        return payment_service.charge(
            user_id=ctx["user_id"],
            amount=ctx["items_total"],
            order_id=ctx.get("reserve_inventory_result", {}).get("order_reference"),
        )

    def refund_payment(ctx: dict) -> dict:
        return payment_service.refund(transaction_id=ctx.get("charge_payment_result", {}).get("transaction_id"))

    def create_shipping(ctx: dict) -> dict:
        return shipping_service.create(
            order_id=ctx["order_reference"],
            address=ctx["shipping_address"],
        )

    def cancel_shipping(ctx: dict) -> dict:
        return shipping_service.cancel(shipping_id=ctx.get("create_shipping_result", {}).get("shipping_id"))

    orchestrator = SagaOrchestrator()
    orchestrator.add_step("reserve_inventory", reserve_inventory, release_inventory)
    orchestrator.add_step("charge_payment", charge_payment, refund_payment)
    orchestrator.add_step("create_shipping", create_shipping, cancel_shipping)

    return orchestrator


# Choreography-based alternative (event-driven):
"""
Service event flow:
  1. OrderService publishes OrderCreated → InventoryService listens
  2. InventoryService publishes ItemsReserved → PaymentService listens
  3. PaymentService publishes PaymentCharged → ShippingService listens
  4. ShippingService publishes ShippingCreated → Saga complete

On failure at any step, the failing service publishes a compensating event:
  - OrderCancelled → triggers InventoryService to publish ItemsReleased
  - PaymentRefunded → triggers InventoryService to publish ItemsReleased
  Each participant reacts independently based on its own state.
"""
```

---

## Chaos Engineering Principles

Build reliability through controlled experimentation, not hope. Apply chaos engineering principles to validate that your resilience patterns actually work under failure conditions.

**Core principles:**

1. **Define the steady state** — Quantitatively define what "normal" looks like: p95 latency < 200ms, error rate < 0.1%, all health checks passing. Without a baseline, you cannot measure whether an experiment caused degradation.

2. **Hypothesize failure scenarios** — Formulate each experiment as a falsifiable hypothesis: "If we kill 3 instances of the payment service simultaneously, the circuit breaker should open within 5 seconds and the bulkhead should reject new requests immediately." This prevents aimless experimentation.

3. **Start in production-like environments first** — Run chaos experiments in staging or canary environments before touching production. Use feature flags to limit blast radius. Never run high-risk experiments (network partition, data center outage) in production without a rollback plan and monitoring dashboard open.

4. **Automate recovery detection** — Verify that your health checks and circuit breakers automatically detect the injected failure. If you kill an instance and the load balancer doesn't remove it within 10 seconds, your readiness probes are broken.

5. **Progressively increase experiment severity** — Single instance restart → AZ failure → region failure → full network partition. Each level validates a different blast radius assumption in your architecture.

**Common chaos experiments (ranked by risk):**

| Experiment | Risk Level | What It Validates |
|---|---|---|
| Single pod/instance kill | Low | Health checks, auto-scaling, load balancer reconfiguration |
| High latency injection (500ms-10s) | Low-Medium | Timeout enforcement, retry backoff, bulkhead rejection |
| CPU/Memory saturation | Medium | Resource monitoring, graceful degradation under pressure |
| Network partition between services | Medium-High | Circuit breaker state transitions, bulkhead isolation effectiveness |
| Database connection pool exhaustion | Medium | Bulkhead thread pool separation — does a saturated DB pool block unrelated services? |
| Entire AZ/region outage | High | Multi-region failover, data consistency during partition, customer communication procedures |

**Implementation: Chaos experiment runner**

```python
import subprocess
from dataclasses import dataclass
from enum import Enum


class ExperimentSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ChaosExperiment:
    """Defines a chaos engineering experiment for automated execution."""
    name: str
    severity: ExperimentSeverity
    hypothesis: str
    action: Callable  # Function that injects the failure
    rollback_action: Callable  # Function that restores normal state
    expected_circuit_breaker_response: str  # What should happen automatically
    max_duration_seconds: int = 300


def run_experiment(experiment: ChaosExperiment, target_service: str) -> dict:
    """Execute a chaos experiment with automated safety checks.

    Returns experiment results including whether the hypothesis was confirmed,
    the actual circuit breaker response, and any unexpected behavior observed.
    """
    import time as _time

    start_time = _time.monotonic()
    baseline_metrics = get_service_metrics(target_service)

    # Verify steady state before injection
    if not verify_steady_state(baseline_metrics):
        return {"status": "aborted", "reason": "Steady state not confirmed"}

    # Inject failure
    experiment.action(target_service)

    # Monitor for expected automatic responses
    time.sleep(5)  # Allow circuit breakers to detect and open
    actual_response = get_circuit_breaker_state(target_service)

    if actual_response != experiment.expected_circuit_breaker_response:
        logger.error(
            f"Circuit breaker did not respond as expected. "
            f"Expected: {experiment.expected_circuit_breaker_response}, "
            f"Actual: {actual_response}",
            trace_id=get_trace_id(),
        )

    # Roll back within max_duration_seconds
    experiment.rollback_action(target_service)
    elapsed = _time.monotonic() - start_time

    post_metrics = get_service_metrics(target_service)

    return {
        "experiment": experiment.name,
        "severity": experiment.severity.value,
        "hypothesis_confirmed": actual_response == experiment.expected_circuit_breaker_response,
        "expected": experiment.expected_circuit_breaker_response,
        "actual": actual_response,
        "duration_seconds": elapsed,
        "pre_metrics": baseline_metrics,
        "post_metrics": post_metrics,
    }


# Example: Latency injection experiment
def inject_latency(service: str, latency_ms: int = 5000) -> None:
    """Inject network latency using tc (traffic control) on Linux."""
    subprocess.run(
        ["tc", "qdisc", "add", "dev", "eth0", "root", "netem",
         f"delay", f"{latency_ms}ms"],
        check=False,  # Ignore if qdisc already exists or tc not available
    )


def remove_latency(service: str) -> None:
    """Remove injected latency."""
    subprocess.run(
        ["tc", "qdisc", "del", "dev", "eth0", "root"],
        check=False,
    )


# Execute as part of a scheduled chaos test
latency_experiment = ChaosExperiment(
    name="payment-service-high-latency",
    severity=ExperimentSeverity.LOW,
    hypothesis="Circuit breaker should open after 5 consecutive timeout errors within 30s",
    action=lambda svc: inject_latency(svc, latency_ms=10000),
    rollback_action=lambda svc: remove_latency(svc),
    expected_circuit_breaker_response="OPEN",
)
```

---

## Constraints

### MUST DO

- Implement circuit breakers with at minimum 3 states (Closed, Open, Half-Open) and configurable failure threshold per downstream dependency — never use a single shared breaker across all services
- Layer retry policies using exponential backoff with random jitter (`random.uniform(0, delay/2)`) to prevent thundering herd on recovery — fixed-delay retries are unacceptable in production
- Isolate critical resource pools via bulkhead pattern — each downstream dependency gets its own thread pool with independent max_concurrent_calls configuration
- Deploy liveness probes (process health → restart) and readiness probes (traffic routing → drain) as separate endpoints with different dependency checks; never merge them into a single `/health` endpoint
- Define graceful degradation strategies for every external dependency before the first production release — if you cannot define what "degraded mode" means for a user, you have not completed the design
- Instrument all services with metrics (request count, error rate, latency histograms), structured JSON logging with trace_id propagation, and distributed tracing via OpenTelemetry from day one — never retrofit observability into production systems
- Apply idempotency keys to every write operation that may be retried or replayed — without this, retry logic creates duplicate orders, payments, and other data-corrupting side effects

### MUST NOT DO

- Never use infinite timeouts on any inter-service call — always enforce hard timeouts (default: 10s for API calls, 3s for database queries) with circuit breaker fallback
- Never retry non-retriable errors (4xx client errors except 429, authentication failures like 401/403) — retrying these wastes resources and masks bugs
- Never implement a single monolithic thread pool for all downstream calls — if one slow service exhausts the pool, everything else fails with it. This is the #1 cause of cascading outages
- Never make liveness probes check downstream dependencies — if the database is down, the process may still be alive and functioning. Liveness failures trigger pod restarts which amplify load on failing dependencies
- Never implement retries without jitter in production — synchronized retries from hundreds of clients simultaneously upon service recovery create a secondary outage known as thundering herd
- Never assume that successful compensation guarantees data consistency — compensating actions can also fail (network partition during refund, etc.) and require manual reconciliation or dead-letter queues
- Never add chaos engineering to the backlog or defer it — run at least one automated chaos experiment per quarter to validate your failure assumptions. If you haven't tested your circuit breakers under failure conditions, they may not work when needed

---

## Output Template

When this skill is active, produce output in this structure:

1. **Architecture Assessment** — List all identified external dependencies and classify each as critical path, important path, or optional
2. **Pattern Selection** — For each dependency, specify which reliability patterns apply (circuit breaker config, retry policy, bulkhead size) with rationale tied to the failure impact classification
3. **Implementation Code** — Production-ready Python code for each selected pattern with typed signatures and proper error handling
4. **Health Check Design** — Define liveness and readiness probe endpoints with their specific dependency checks
5. **Observability Plan** — Metrics to collect, log format specification, and OpenTelemetry span naming convention
6. **Chaos Experiment Plan** — At least one experiment per critical dependency with expected automatic responses documented

---

## Related Skills

| Skill | Purpose |
|---|---|
| `microservices-architecture` | Design the overall microservice topology this reliability layer protects |
| `event-driven-architecture` | Alternative to saga orchestration — use event-driven patterns for decoupled compensation |
| `microservice-resilience-patterns` | Overlapping resilience patterns (circuit breaker, retry, bulkhead) with additional timeout enforcement focus |
| `api-architecture` | Design the API contracts and error responses that reliability patterns surface to consumers |
| `architectural-review` | Audit existing systems for missing reliability patterns and prioritize remediation |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Netflix Chaos Engineering Principles](https://www.netflix.com/engineering-blog/chaos-engineering-principles) — Foundational principles from the team that popularized chaos engineering
- [Google SRE Book: Chapter 8 - Production Readiness](https://sre.google/sre-book/searching-for-reliability/) — Production readiness review checklist and reliability standards
- [AWS Architecture Blog: Resilience Patterns](https://aws.amazon.com/blogs/architecture/tag/resilience-patterns/) — AWS reference architectures for resilient distributed systems
- [CNCF Service Mesh Maturity Model](https://www.cncf.io/industry-bestservice-mesh-maturity-model/) — Service mesh patterns for circuit breaking, retries, and observability at the infrastructure layer
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/) — Official distributed tracing instrumentation and W3C Trace Context specification
- [AWS Well-Architected Framework: Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html) — Comprehensive reliability design patterns including bulkhead isolation and graceful degradation
- [Distributed Systems Patterns: Saga Pattern](https://microsoft.github.io/ddi-patterns/patterns/transactions/saga/index.html) — Microsoft's reference implementation of orchestration-based and choreography-based sagas
