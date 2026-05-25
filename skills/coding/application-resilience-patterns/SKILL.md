---
name: application-resilience-patterns
description: Implements application-layer resilience patterns including exponential
  backoff with jitter, circuit breakers, timeout management, fallback mechanisms,
  and rate limiters for handling external service failures gracefully.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: application resilience, retry with backoff, circuit breaker pattern, timeout
    management, fallback mechanism, rate limiter, token bucket, graceful degradation,
    external service failure, how do i handle API failures, idempotency keys
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
  - do-dont
  related-skills: microservice-resilience-patterns, systematic-debugging, distributed-systems-architecture
------
# Application Resilience Patterns

Implements application-layer resilience patterns for handling external service failures gracefully — ensuring your application remains functional when downstream dependencies degrade or fail.

## TL;DR Checklist

- [ ] Implement exponential backoff with random jitter for all retry logic
- [ ] Deploy circuit breakers around every external API call with configurable thresholds
- [ ] Set per-call timeouts and propagate deadlines through the request chain
- [ ] Define fallback responses (cached data, defaults, cached partial results) for critical paths
- [ ] Apply rate limiting with token bucket or sliding window algorithms
- [ ] Use idempotency keys for all retried operations on external APIs

---

## When to Use

Use this skill when:

- Building clients that call external third-party APIs (payment processors, CDN endpoints, email services)
- Your application depends on services you don't control and cannot guarantee availability for
- Implementing retry logic that must not amplify load on failing downstream services
- Protecting your application from cascading failures caused by a single slow dependency
- Building self-healing systems that recover automatically without human intervention
- Handling rate limits imposed by external APIs with automatic backoff and queue management

---

## When NOT to Use

Avoid this skill for:

- Internal service-to-service communication — use the inter-service resilience patterns (`microservice-resilience-patterns`) instead
- Idempotent read operations (GET requests) — retries are unnecessary and may mask underlying issues
- Database queries that should fail fast rather than retry — database failures require different handling
- Real-time, latency-sensitive operations where even milliseconds of delay from circuit breaker checks is unacceptable

---

## Core Workflow

1. **Classify the External Dependency** — Determine the reliability tier of each external service: Tier 1 (critical, high SLA like payment processors), Tier 2 (important but retryable like email services), Tier 3 (nice-to-have with graceful degradation like analytics). The tier determines how aggressively you apply resilience patterns.
   **Checkpoint:** Document every dependency's tier and the fallback behavior for each — this becomes your outage runbook.

2. **Implement Retry with Exponential Backoff + Jitter** — For retryable operations, implement exponential backoff (delay doubles each attempt) combined with random jitter (±25% of base delay) to prevent thundering herd when a service recovers. Calculate max retries based on the dependency's known recovery patterns — most transient failures resolve within 3 attempts.
   **Checkpoint:** Verify that total retry window fits within your overall request timeout budget.

3. **Deploy Circuit Breakers** — Wrap each external call with a circuit breaker that tracks failure rates over a sliding time window (typically 10–30 seconds). When the failure rate exceeds a threshold (e.g., 50% of requests fail), trip the circuit and short-circuit to fallback for a configured cooldown period. After cooldown, allow one probe request through in half-open state to test recovery.
   **Checkpoint:** Test the three states explicitly: closed (normal), open (failing fast), half-open (testing recovery).

4. **Configure Timeouts with Deadline Propagation** — Set per-call timeouts based on the P95 latency of each external service plus a margin (e.g., if P95 is 200ms, set timeout to 500ms). Use context-based deadline propagation so that when a downstream call times out, the entire request chain fails fast rather than accumulating cascading delays.
   **Checkpoint:** Ensure timeouts form a decreasing gradient from client → service → database — never let a downstream timeout exceed upstream budget.

5. **Implement Fallback Strategies** — For each critical external dependency, define a fallback that degrades gracefully: return cached data, serve stale responses with a staleness indicator, use default values for non-critical fields, or show a "partial functionality" UI state. Each fallback should be measurable so you can detect degradation in real-time monitoring.
   **Checkpoint:** Monitor fallback invocation rates — if a fallback triggers more than 5% of requests, the upstream service needs investigation.

6. **Apply Rate Limiting with Token Bucket** — For API calls where the external service enforces rate limits, implement a client-side token bucket or sliding window rate limiter that queues or throttles requests proactively rather than reacting to HTTP 429 responses after they occur.
   **Checkpoint:** Verify that your request rate never exceeds 80% of the service's documented limit to provide headroom for traffic spikes.

---

## Implementation Patterns

### Pattern 1: Retry with Exponential Backoff and Jitter

The most fundamental resilience pattern — retries must include jitter to prevent thundering herd.

```python
"""
Application-level resilience patterns for external service handling.
Implements retry with backoff+jitter, circuit breaker, timeout management,
fallback mechanisms, rate limiting, and idempotency key support.
"""

from __future__ import annotations

import logging
import random
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


class RetryableError(Exception):
    """Wraps an exception for retry classification."""
    def __init__(self, message: str, should_retry: bool = True, original: Exception | None = None):
        super().__init__(message)
        self.should_retry = should_retry
        self.original = original or Exception(message)


@dataclass
class RetryConfig:
    """Configuration for retry behavior on external API calls."""
    max_attempts: int = 3
    base_delay_ms: float = 100.0
    max_delay_ms: float = 5000.0
    jitter_factor: float = 0.25  # ±25% randomization
    retryable_status_codes: list[int] = field(default_factory=lambda: [429, 500, 502, 503, 504])

    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay for a given attempt using exponential backoff with jitter.

        Delay = min(base_delay * 2^attempt, max_delay) ± jitter_percentage

        Args:
            attempt: Zero-based attempt number (0 = first retry).

        Returns:
            Delay in seconds to wait before the next attempt.
        """
        exponential_delay = self.base_delay_ms * (2 ** attempt)
        capped_delay = min(exponential_delay, self.max_delay_ms)

        # Apply jitter: random value between [-jitter, +jitter] of the delay
        jitter_range = capped_delay * self.jitter_factor
        jittered_delay_ms = capped_delay + random.uniform(-jitter_range, jitter_range)

        return max(0, jittered_delay_ms / 1000.0)  # Convert ms to seconds


def retry_with_backoff(
    func: Callable[..., Any],
    config: RetryConfig | None = None,
    *args: Any,
    **kwargs: Any,
) -> Any:
    """Execute a function with exponential backoff and random jitter.

    Retries the function on transient failures (HTTP 429, 5xx, network errors)
    while respecting configurable delay bounds and maximum attempt limits.

    Args:
        func: The callable to execute (typically an API client method).
        config: Retry configuration — defaults to standard retry settings.
        *args: Positional arguments passed to the function.
        **kwargs: Keyword arguments passed to the function.

    Returns:
        The return value of the successful function invocation.

    Raises:
        RetryableError: If all retry attempts are exhausted.
    """
    if config is None:
        config = RetryConfig()

    last_exception: Exception | None = None

    for attempt in range(config.max_attempts):
        try:
            return func(*args, **kwargs)
        except (ConnectionError, TimeoutError, OSError) as e:
            # Network-level failures — always retryable
            last_exception = e
            logger.warning(
                f"Attempt {attempt + 1}/{config.max_attempts} failed "
                f"(network): {e}"
            )
        except Exception as e:
            # Non-network errors — check if this is a retriable HTTP status
            status_code = getattr(e, 'status_code', None)
            if status_code in config.retryable_status_codes:
                last_exception = e
                logger.warning(
                    f"Attempt {attempt + 1}/{config.max_attempts} failed "
                    f"(HTTP {status_code}): {e}"
                )
            else:
                # Non-retriable error — fail immediately
                raise

        if attempt < config.max_attempts - 1:
            delay = config.calculate_delay(attempt)
            logger.info(f"Retrying in {delay:.2f}s (attempt {attempt + 2}/{config.max_attempts})")
            time.sleep(delay)

    raise RetryableError(
        f"All {config.max_attempts} retry attempts exhausted",
        should_retry=False,
        original=last_exception or Exception("Unknown failure"),
    )
```

### Pattern 2: Circuit Breaker (BAD vs. GOOD)

```python
from enum import Enum


class CircuitState(Enum):
    """States for the circuit breaker lifecycle."""
    CLOSED = "closed"         # Normal operation — requests flow through
    OPEN = "open"             # Failing fast — requests short-circuit to fallback
    HALF_OPEN = "half_open"   # Testing recovery — one probe request allowed


class CircuitBreakerError(Exception):
    """Raised when a call is rejected by an open circuit breaker."""
    pass


# ❌ BAD — No circuit breaker, all failures cascade into retries
def bad_external_call(api_url: str) -> dict[str, Any]:
    """Always retries on failure with no circuit protection.

    When the external service is down, every request immediately retries,
    amplifying load on the failing service and delaying your own users.
    """
    import requests

    for attempt in range(5):  # Hardcoded retries, no jitter
        try:
            response = requests.get(api_url, timeout=30)
            return response.json()
        except requests.RequestException:
            time.sleep(1)  # Fixed delay — thundering herd guaranteed on recovery

    raise RuntimeError("All retries exhausted")


# ✅ GOOD — Circuit breaker prevents cascading failures
class CircuitBreaker:
    """Circuit breaker for external service calls with configurable thresholds.

    Tracks failure rates over a sliding window and opens the circuit when
    failures exceed the threshold. After cooldown, allows one probe request
    through to test recovery (half-open state).
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        failure_rate_threshold: float = 0.5,
        success_threshold: int = 3,
        cooldown_seconds: float = 30.0,
        name: str = "default",
    ):
        self.failure_threshold = failure_threshold
        self.failure_rate_threshold = failure_rate_threshold
        self.success_threshold = success_threshold
        self.cooldown_seconds = cooldown_seconds
        self.name = name

        # State management
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: float | None = None
        self._opened_at: float | None = None
        self._recent_results: list[tuple[float, bool]] = []

    def call(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        """Execute a function through the circuit breaker.

        In CLOSED state: executes normally and tracks success/failure.
        In OPEN state: raises CircuitBreakerError immediately (fail-fast).
        In HALF_OPEN state: allows one probe request; success transitions to CLOSED, failure back to OPEN.

        Args:
            func: The function to execute (typically an API call wrapper).
            *args: Arguments passed to the function.
            **kwargs: Keyword arguments passed to the function.

        Returns:
            The return value of the successful function invocation.

        Raises:
            CircuitBreakerError: When the circuit is open and requests are short-circuited.
            RetryableError: If all internal retries within the call fail.
        """
        # Check if we should transition from OPEN to HALF_OPEN
        if self._state == CircuitState.OPEN and self._should_probe():
            self._transition_to(CircuitState.HALF_OPEN)
            logger.info(f"Circuit '{self.name}' transitioning to HALF_OPEN — probe request allowed")

        # Reject requests when circuit is open (fail-fast)
        if self._state == CircuitState.OPEN:
            raise CircuitBreakerError(
                f"Circuit '{self.name}' is OPEN — rejecting call. "
                f"Cooling down for {self.cooldown_seconds:.0f}s total."
            )

        try:
            # Execute the function (may include its own retry logic)
            result = func(*args, **kwargs)
            self._record_success()
            return result

        except Exception as e:
            self._record_failure()
            raise

    def _should_probe(self) -> bool:
        """Check if the cooldown period has elapsed and we can send a probe request."""
        if self._opened_at is None:
            return False
        elapsed = time.time() - self._opened_at
        return elapsed >= self.cooldown_seconds

    def _record_success(self) -> None:
        """Record a successful call and potentially close the circuit."""
        now = time.time()
        self._recent_results.append((now, True))
        self._clean_old_results(now)

        if self._state == CircuitState.HALF_OPEN:
            self._success_count += 1
            if self._success_count >= self.success_threshold:
                logger.info(f"Circuit '{self.name}' closed after {self._success_count} successful probes")
                self._transition_to(CircuitState.CLOSED)
        else:
            # Reset failure count on success in CLOSED state
            self._failure_count = 0

    def _record_failure(self) -> None:
        """Record a failed call and potentially open the circuit."""
        now = time.time()
        self._recent_results.append((now, False))
        self._clean_old_results(now)

        if self._state == CircuitState.HALF_OPEN:
            logger.warning(f"Circuit '{self.name}' returned to OPEN after probe failure")
            self._transition_to(CircuitState.OPEN)
        else:
            self._failure_count += 1
            self._last_failure_time = now

            # Check if failure threshold is exceeded (absolute count or rate-based)
            if len(self._recent_results) >= 3:  # Need minimum sample size
                recent_fails = sum(1 for _, failed in self._recent_results if failed)
                failure_rate = recent_fails / len(self._recent_results)

                if (
                    self._failure_count >= self.failure_threshold or
                    failure_rate >= self.failure_rate_threshold
                ):
                    logger.warning(
                        f"Circuit '{self.name}' OPENED — "
                        f"failures={self._failure_count}, recent_rate={failure_rate:.1%}"
                    )
                    self._transition_to(CircuitState.OPEN)

    def _clean_old_results(self, now: float) -> None:
        """Remove results older than 2x the cooldown period to keep memory bounded."""
        cutoff = now - (self.cooldown_seconds * 2)
        self._recent_results = [(ts, ok) for ts, ok in self._recent_results if ts > cutoff]

    def _transition_to(self, new_state: CircuitState) -> None:
        """Transition the circuit breaker to a new state and reset counters."""
        old_state = self._state
        self._state = new_state

        if new_state == CircuitState.OPEN:
            self._opened_at = time.time()
            self._success_count = 0
        elif new_state == CircuitState.CLOSED:
            self._failure_count = 0
            self._success_count = 0
            self._recent_results.clear()

        if old_state != new_state:
            logger.info(f"Circuit '{self.name}': {old_state.value} → {new_state.value}")

    @property
    def state(self) -> CircuitState:
        """Current state of the circuit breaker (read-only for monitoring)."""
        return self._state


# Usage example:
# cb = CircuitBreaker(
#     failure_threshold=5,
#     failure_rate_threshold=0.5,
#     cooldown_seconds=30.0,
#     name="payment-api",
# )
#
# def call_payment_api(order_id: str) -> dict[str, Any]:
#     config = RetryConfig(max_attempts=2, base_delay_ms=200)
#     return retry_with_backoff(
#         lambda: _make_http_call(f"/payments/{order_id}"),  # Actual HTTP call
#         config=config,
#     )
#
# try:
#     result = cb.call(call_payment_api, order_id="ord-12345")
# except CircuitBreakerError:
#     # Fallback: queue payment for later retry
#     queue_payment_for_retry(order_id)
# except RetryableError as e:
#     # All retries exhausted — log and alert
#     logger.error(f"Payment API permanently failed: {e.original}")
```

### Pattern 3: Token Bucket Rate Limiter

```python
from __future__ import annotations

import threading
import time


class RateLimitExceeded(Exception):
    """Raised when a request exceeds the configured rate limit."""
    def __init__(self, retry_after_seconds: float):
        self.retry_after = retry_after_seconds
        super().__init__(f"Rate limit exceeded. Retry after {retry_after_seconds:.1f}s")


class TokenBucketLimiter:
    """Token bucket rate limiter for controlling outbound request rates.

    Refills tokens at a fixed rate up to a maximum capacity. Each request
    consumes one token. When no tokens are available, the caller receives
    an immediate exception with a recommended retry delay — avoiding HTTP 429
    responses from downstream services entirely.
    """

    def __init__(self, rate: float, capacity: int):
        """Initialize the rate limiter.

        Args:
            rate: Tokens added per second (sustained request rate).
            capacity: Maximum tokens in the bucket (burst capacity).
        """
        self.rate = rate
        self.capacity = capacity
        self._tokens: float = float(capacity)  # Start full
        self._last_refill: float = time.time()
        self._lock = threading.Lock()

    def acquire(self, tokens: int = 1) -> float:
        """Attempt to consume tokens from the bucket.

        Refills tokens based on elapsed time before attempting acquisition.
        If insufficient tokens are available, raises RateLimitExceeded with
        the calculated wait time until enough tokens are available.

        Args:
            tokens: Number of tokens to acquire (usually 1 per request).

        Returns:
            Sleep duration in seconds (always 0 if successful — caller should NOT sleep).

        Raises:
            RateLimitExceeded: If not enough tokens are available, with retry_after set.
        """
        with self._lock:
            self._refill()

            if self._tokens >= tokens:
                self._tokens -= tokens
                return 0.0  # Acquired — no delay needed

            # Calculate how long until enough tokens are available
            deficit = tokens - self._tokens
            wait_seconds = deficit / self.rate

        raise RateLimitExceeded(retry_after_seconds=wait_seconds)

    def _refill(self) -> None:
        """Refill tokens based on elapsed time since last refill."""
        now = time.time()
        elapsed = now - self._last_refill
        self._last_refill = now

        new_tokens = elapsed * self.rate
        self._tokens = min(self.capacity, self._tokens + new_tokens)

    def available_tokens(self) -> float:
        """Return current available tokens (for monitoring/histograms)."""
        with self._lock:
            self._refill()
            return self._tokens


# Usage example — wrapping an HTTP call with rate limiting + retry:
#
# limiter = TokenBucketLimiter(rate=10.0, capacity=20)  # 10 req/s sustained, 20 burst
#
# def rate_limited_call(url: str, method: str = "GET") -> dict[str, Any]:
#     config = RetryConfig(
#         max_attempts=3,
#         base_delay_ms=500,
#         retryable_status_codes=[429],
#     )
#
#     def _attempt():
#         limiter.acquire()  # Block or raise if at capacity
#         return requests.request(method, url)
#
#     response = retry_with_backoff(_attempt, config=config)
#     response.raise_for_status()
#     return response.json()
```

---

## Constraints

### MUST DO
- Always implement jitter on retries — fixed delays cause thundering herd problems when a service recovers
- Set circuit breaker failure thresholds based on real production metrics (use actual P95 latencies and error rates)
- Configure timeouts as a gradient: client timeout > service timeout > database timeout — never the reverse
- Provide a concrete fallback for every circuit breaker — an open circuit with no fallback is just denial of service
- Use idempotency keys for all retried write operations (POST, PUT, PATCH) to prevent duplicate side effects

### MUST NOT DO
- Never retry on non-retriable errors (400 Bad Request, 401 Unauthorized, 403 Forbidden) — these are client errors, not transient failures
- Do not set timeouts so high that they mask the real problem — if a call takes 60s, you're hiding a deeper issue
- Don't implement retry logic without monitoring — unmonitored retries become invisible load amplifiers in production
- Never allow circuit breakers to stay open indefinitely — always have a cooldown/probe mechanism for recovery detection

---

## Output Template

When implementing or reviewing resilience patterns, produce:

1. **Dependency Classification** — Tier assignment (critical/important/nice-to-have) for each external service
2. **Retry Configuration** — Max attempts, base delay, max delay, jitter factor, and retryable status codes
3. **Circuit Breaker Setup** — Failure threshold, rate threshold, cooldown period, and probe strategy
4. **Timeout Budget** — Per-call timeout values forming a decreasing gradient through the request chain
5. **Fallback Strategy** — Concrete fallback behavior (cached data, defaults, queued retries) with monitoring hooks
6. **Rate Limiter Config** — Token bucket or sliding window parameters based on the service's documented limits

---

## Related Skills

| Skill                        | Purpose                                                    |
| ---------------------------- | ---------------------------------------------------------- |
| `microservice-resilience-patterns` | Inter-service resilience — bulkheads, timeouts between services |
| `systematic-debugging`       | Diagnose cascading failures when resilience patterns are insufficient |
| `distributed-systems-architecture` | System-level resilience design beyond the application layer |

---

## Live References

> Authoritative documentation links for application resilience patterns.

- [AWS Resilience Patterns Documentation](https://aws.amazon.com/architecture/resiliency/)
- [Google SRE Book — Error Budgets and Retry Strategies](https://sre.google/sre-book/retries-and-timeouts/)
- [Martín Fowler — Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Microsoft Azure Resilience Patterns Guide](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
- [Netflix Chaos Engineering Principles](https://www.usenix.org/publications/loginonline/netflix-chaos-engineering)
- [Cloud Native Computing Foundation — Resilience Patterns](https://www.cncf.io/short courses/resiliency/)
