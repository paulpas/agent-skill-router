---
name: backpressure-handling
description: Implements production-grade backpressure mechanisms (bounded queues, adaptive rate limiting, circuit breakers, priority queuing) to prevent resource exhaustion in high-throughput event-driven message systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: backpressure, flow control, rate limiting, circuit breaker, consumer lag, processing overload, bounded queue, signal propagation
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
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: event-driven-patterns,message-queue-design,system-reliability-architecture,event-bus,data-pipeline-engineering
---

# Backpressure Handling for Event-Driven Systems

Implements backpressure mechanisms that flow from slow consumers upstream to producers — bounded queues, adaptive rate limiting, circuit breakers, priority-based processing, and signal propagation patterns. When loaded, this skill makes the model design, implement, and validate flow-control layers that prevent resource exhaustion (OOM, thread starvation, connection pool depletion) in high-throughput asynchronous message systems.

## TL;DR Checklist

- [ ] All consumer queues are bounded with explicit `maxsize` — never use unbounded queues in production
- [ ] Implement a token bucket or sliding window rate limiter before any external I/O call
- [ ] Add a circuit breaker to every downstream dependency that can become slow or unresponsive
- [ ] Design priority-based routing so low-priority events are dropped before system resources degrade
- [ ] Measure queue depth, processing latency percentiles (p50/p95/p99), and consumer lag continuously
- [ ] Propagate backpressure signals upstream via pause publishing, batch size reduction, or async flow-control channels

---

## When to Use

Use this skill when:

- Building high-throughput event-driven systems where producers can outpace consumers during traffic spikes
- Designing message pipelines that connect microservices with differing processing capabilities (e.g., a fast HTTP ingestion layer feeding slower batch processors)
- Experiencing OOM crashes, thread pool starvation, or connection pool exhaustion under load
- Implementing streaming data pipelines where late arrivals or backlogged events must be handled gracefully
- Designing event bus architectures where fan-out to multiple consumers creates asymmetric processing loads
- Adding observability for queue depth, consumer lag, and processing latency as early-warning signals

---

## When NOT to Use

Avoid this skill for:

- Simple synchronous request-response APIs with no message queuing — backpressure is an async/event-driven concern
- Implementing general circuit breaker patterns for HTTP calls without message flow context — use `microservice-resilience-patterns` instead
- Designing retry strategies or bulkhead isolation — those are distinct resilience concerns; backpressure complements but does not replace them
- Low-throughput systems processing fewer than a few hundred events per second — the overhead of flow-control layers may outweigh benefits

---

## Core Workflow

1. **Map the Event Flow and Identify Pressure Points** — Trace every producer-to-consumer path. Identify which components process synchronously (database writes, external API calls) versus asynchronously (in-memory transforms). Mark each step as a potential pressure point where backpressure could be injected. **Checkpoint:** You have a diagram listing every queue, its current capacity (bounded or unbounded), and the expected vs actual processing rate at each stage.

2. **Implement Consumer-Side Bounded Queues** — Replace every `Queue()` with `Queue(maxsize=N)` where N is calculated from consumer capacity times a safety multiplier (typically 2x). Configure producers to block when the queue fills, creating natural backpressure that propagates upstream. **Checkpoint:** No unbounded queues exist in the production codebase; every `asyncio.Queue` has an explicit `maxsize`.

3. **Add Adaptive Rate Limiting** — Deploy a rate limiter (token bucket or sliding window) before each downstream external call. The limiter should adapt its throughput based on real-time system metrics (CPU utilization, memory pressure, database connection pool availability). Start with static thresholds and transition to adaptive mode once observability is in place. **Checkpoint:** Rate limiters expose current throughput metrics; alerts fire when effective rate drops below 50% of configured maximum.

4. **Deploy Circuit Breakers on Slow Dependencies** — For every consumer that calls an external service or database, add a circuit breaker. When the downstream becomes slow (high latency) or failing (errors), open the circuit to prevent queue buildup. Route messages to a dead-letter queue or degraded processing path when the circuit is open. **Checkpoint:** Circuit breaker state transitions are logged and exposed as metrics; every consumer has at least one circuit breaker configured.

5. **Implement Priority-Based Processing During Overload** — Design event classes with priority levels. During normal operation, all events process in priority order. When system load exceeds a threshold, lower-priority events are either delayed or dropped entirely while critical events continue processing. **Checkpoint:** Priority thresholds and drop policies are documented; monitoring shows distinct latency curves for each priority tier.

6. **Establish Signal Propagation Mechanisms** — Design how backpressure information flows from the most constrained consumer back to the original producers. This can be done via async channels, shared state with lock-free reads, or explicit pause/resume protocols on message brokers. **Checkpoint:** Producers can detect when downstream consumers are saturated and respond within 1–2 seconds by throttling their publish rate.

---

## Implementation Patterns

### Pattern 1: Bounded Async Queue with Natural Backpressure

The simplest and most effective backpressure mechanism — a bounded `asyncio.Queue` that blocks producers when full, creating natural upstream pressure without any explicit flow-control protocol.

```python
import asyncio
import logging
from dataclasses import dataclass, field
from enum import IntEnum
from typing import Any

logger = logging.getLogger(__name__)


class EventPriority(IntEnum):
    """Event priority levels for scheduling during overload conditions."""
    CRITICAL = 0       # Must never be dropped (e.g., payment events)
    HIGH = 1           # Dropped only under extreme load (e.g., user actions)
    MEDIUM = 2         # Delayed or dropped when queue is filling (e.g., analytics)
    LOW = 3            # First to drop during overload (e.g., background tasks)


@dataclass(order=True)
class PrioritizedEvent:
    """An event wrapper that enables priority-ordered queue consumption."""
    priority: EventPriority
    sequence_number: int = field(compare=True)
    payload: Any = field(compare=False, repr=False)

    @property
    def timestamp(self) -> float:
        import time
        return time.monotonic()


class BoundedEventQueue:
    """A bounded async queue with backpressure and priority support.

    When the queue reaches maxsize, producers are blocked (natural backpressure).
    During overload, lower-priority events can be rejected before blocking producers.
    """

    def __init__(
        self,
        maxsize: int = 1000,
        drop_on_overload: bool = True,
        drop_below_priority: EventPriority = EventPriority.MEDIUM,
    ) -> None:
        """Initialize the bounded event queue.

        Args:
            maxsize: Maximum number of events in the queue before producers block.
            drop_on_overload: If True, drop low-priority events before blocking producers.
            drop_below_priority: Events at or below this priority are dropped during overload.
        """
        self._queue: asyncio.PriorityQueue[PrioritizedEvent] = asyncio.PriorityQueue(
            maxsize=maxsize
        )
        self._maxsize = maxsize
        self._drop_on_overload = drop_on_overload
        self._drop_below_priority = drop_below_priority
        self._sequence_counter: int = 0
        self._stats = {
            "enqueued": 0,
            "dequeued": 0,
            "dropped": 0,
            "blocked_producers": 0,
        }

    @property
    def current_size(self) -> int:
        return self._queue.qsize()

    @property
    def utilization(self) -> float:
        """Return queue utilization as a fraction (0.0 to 1.0)."""
        return self.current_size / self._maxsize if self._maxsize > 0 else 0.0

    @property
    def is_near_capacity(self) -> bool:
        """Return True when queue exceeds 80% capacity — overload warning threshold."""
        return self.utilization >= 0.8

    async def put(
        self,
        event: Any,
        priority: EventPriority = EventPriority.MEDIUM,
        *,
        timeout: float | None = None,
    ) -> bool:
        """Put an event into the queue with backpressure handling.

        Args:
            event: The payload to enqueue.
            priority: Event priority level for scheduling.
            timeout: Optional timeout in seconds for blocking put. None means block indefinitely.

        Returns:
            True if event was enqueued, False if it was dropped due to overload.
        """
        # During overload, drop low-priority events instead of blocking producers
        if self._drop_on_overload and self.is_near_capacity:
            if priority <= self._drop_below_priority:
                self._stats["dropped"] += 1
                logger.debug(
                    "Dropped %s event (priority=%d) — queue near capacity (%.0f%%)",
                    type(event).__name__, priority, self.utilization * 100,
                )
                return False

        # Block producer when queue is full — this IS the backpressure signal
        wrapped = PrioritizedEvent(
            priority=priority,
            sequence_number=self._sequence_counter,
            payload=event,
        )
        self._sequence_counter += 1

        try:
            if timeout is not None:
                await asyncio.wait_for(self._queue.put(wrapped), timeout=timeout)
            else:
                await self._queue.put(wrapped)

            self._stats["enqueued"] += 1
            return True

        except (asyncio.QueueFull, asyncio.TimeoutError):
            self._stats["blocked_producers"] += 1
            logger.warning(
                "Queue full — producer blocked for %s (utilization=%.0f%%)",
                type(event).__name__, self.utilization * 100,
            )
            return False

    async def get(self) -> PrioritizedEvent:
        """Get the highest-priority event from the queue. Blocks until available."""
        event = await self._queue.get()
        self._stats["dequeued"] += 1
        return event

    def task_done(self) -> None:
        """Mark a task as done (required for join())."""
        self._queue.task_done()

    @property
    def stats(self) -> dict[str, int]:
        return self._stats.copy()

    async def wait_empty(self) -> None:
        """Wait until all queued events have been processed."""
        await self._queue.join()


# --- Usage Example ---
async def main():
    queue = BoundedEventQueue(maxsize=100, drop_on_overload=True)

    # Producer side — automatically blocked when queue is full
    async def producer(events: list[str], priority: EventPriority) -> int:
        sent = 0
        for event in events:
            if await queue.put(event, priority):
                sent += 1
        return sent

    # Consumer side — processes in priority order
    async def consumer(consumer_id: int) -> None:
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=5.0)
                logger.info(
                    "Consumer %d processing %s (priority=%d, seq=%d)",
                    consumer_id, type(event.payload).__name__,
                    event.priority, event.sequence_number,
                )
                await asyncio.sleep(0.01)  # Simulate work
                queue.task_done()
            except asyncio.TimeoutError:
                break

    # Run the pipeline
    tasks = [
        asyncio.create_task(consumer(i)) for i in range(3)
    ]
    await producer([f"event-{i}" for i in range(50)], EventPriority.HIGH)

    await queue.wait_empty()
    for t in tasks:
        t.cancel()

    print(f"Queue stats: {queue.stats}")
    print(f"Final utilization: {queue.utilization:.1%}")


if __name__ == "__main__":
    asyncio.run(main())
```

### Pattern 2: Token Bucket Rate Limiter

The token bucket algorithm controls throughput by regulating how many operations can execute per time unit. Tokens are added at a fixed rate; each operation consumes one token. If no tokens are available, the caller blocks or fails — implementing smooth rate limiting that handles burst traffic gracefully.

```python
import asyncio
import time
import logging
from dataclasses import dataclass
from typing import AsyncGenerator, Any

logger = logging.getLogger(__name__)


@dataclass
class RateLimiterMetrics:
    """Runtime metrics for a token bucket rate limiter."""
    tokens_per_second: float
    burst_capacity: int
    current_tokens: float
    total_allowed: int = 0
    total_rejected: int = 0
    total_wait_time_seconds: float = 0.0

    @property
    def rejection_rate(self) -> float:
        total = self.total_allowed + self.total_rejected
        return self.total_rejected / total if total > 0 else 0.0


class TokenBucketRateLimiter:
    """Token bucket rate limiter with async support and metrics collection.

    Tokens refill at a constant rate up to a maximum burst capacity.
    Each acquire() call consumes one token. When no tokens are available,
    the caller waits (async) until a token is refilled — implementing
    smooth backpressure on downstream services.
    """

    def __init__(
        self,
        rate: float,              # Tokens added per second
        burst_capacity: int = 10, # Maximum tokens (burst limit)
        initial_tokens: float | None = None,
    ) -> None:
        """Initialize the token bucket.

        Args:
            rate: Tokens added per second (sustained throughput).
            burst_capacity: Maximum tokens allowed — controls burst size.
            initial_tokens: Starting token count. Defaults to burst_capacity.
        """
        self._rate = rate
        self._burst_capacity = burst_capacity
        self._tokens = initial_tokens if initial_tokens is not None else float(burst_capacity)
        self._last_refill_time = time.monotonic()
        self._lock = asyncio.Lock()
        self._metrics = RateLimiterMetrics(
            tokens_per_second=rate,
            burst_capacity=burst_capacity,
            current_tokens=self._tokens,
        )

    @property
    def metrics(self) -> RateLimiterMetrics:
        return self._metrics

    def _refill(self) -> None:
        """Refill tokens based on elapsed time. Must be called under lock."""
        now = time.monotonic()
        elapsed = now - self._last_refill_time
        self._tokens = min(
            self._burst_capacity,
            self._tokens + elapsed * self._rate,
        )
        self._last_refill_time = now

    async def acquire(self, tokens: int = 1, *, timeout: float | None = None) -> bool:
        """Acquire one or more tokens, waiting (backpressure) if none available.

        Args:
            tokens: Number of tokens to consume.
            timeout: Maximum seconds to wait for tokens. None waits indefinitely.

        Returns:
            True if tokens were acquired, False if timeout expired.
        """
        deadline = None if timeout is None else time.monotonic() + timeout

        while True:
            async with self._lock:
                self._refill()

                if self._tokens >= tokens:
                    self._tokens -= tokens
                    self._metrics.total_allowed += 1
                    self._metrics.current_tokens = self._tokens
                    return True

                # Calculate wait time until enough tokens are available
                deficit = tokens - self._tokens
                wait_time = deficit / self._rate

            # Check timeout before waiting
            if deadline is not None and time.monotonic() >= deadline:
                self._metrics.total_rejected += 1
                return False

            # Wait for token refill — this IS the backpressure mechanism
            await asyncio.sleep(min(wait_time, deadline - time.monotonic()) if deadline else wait_time)

    async def try_acquire(self, tokens: int = 1) -> bool:
        """Non-blocking attempt to acquire tokens. Returns immediately."""
        async with self._lock:
            self._refill()
            if self._tokens >= tokens:
                self._tokens -= tokens
                self._metrics.total_allowed += 1
                self._metrics.current_tokens = self._tokens
                return True
            self._metrics.total_rejected += 1
            return False

    @property
    def available_rate(self) -> float:
        """Current effective throughput rate after refill calculations."""
        return min(self._rate, self._tokens / max(time.monotonic() - self._last_refill_time, 0.001))


# --- Usage Example: Rate-Limited Downstream Call ---
class RateLimitedServiceClient:
    """Example of a service client protected by token bucket rate limiting."""

    def __init__(self, events_per_second: float = 50.0, burst_size: int = 100) -> None:
        self._limiter = TokenBucketRateLimiter(
            rate=events_per_second,
            burst_capacity=burst_size,
        )

    async def process_event(self, event_data: dict[str, Any]) -> bool:
        """Process a single event with rate limiting backpressure."""
        acquired = await self._limiter.acquire(timeout=10.0)
        if not acquired:
            logger.warning("Rate limit timeout — event dropped: %s", event_data.get("type"))
            return False

        # Simulate downstream processing
        await asyncio.sleep(0.01)
        return True

    @property
    def metrics(self) -> RateLimiterMetrics:
        return self._limiter.metrics
```

### Pattern 3: Adaptive Rate Limiter Driven by System Load Metrics

Static rate limits become ineffective when system conditions change. An adaptive rate limiter reads real-time CPU, memory, and database connection pool utilization to dynamically adjust throughput — reducing rates before the system degrades rather than crashing after.

```python
import asyncio
import os
import logging
from dataclasses import dataclass, field
from typing import Protocol
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class SystemMetricsProvider(Protocol):
    """Interface for providing real-time system load metrics."""

    async def get_cpu_usage(self) -> float: ...       # 0.0 to 1.0
    async def get_memory_pressure(self) -> float: ...  # 0.0 to 1.0
    async def get_db_pool_utilization(self) -> float: ...  # 0.0 to 1.0


class DummyMetricsProvider:
    """Default metrics provider using real system data for demonstration."""

    async def get_cpu_usage(self) -> float:
        try:
            import psutil
            return psutil.cpu_percent(interval=0.1) / 100.0
        except ImportError:
            return 0.3  # Default assumption if psutil unavailable

    async def get_memory_pressure(self) -> float:
        try:
            import psutil
            mem = psutil.virtual_memory()
            return mem.used / mem.total
        except ImportError:
            return 0.5

    async def get_db_pool_utilization(self) -> float:
        # In production, this queries your DB driver's pool status
        return 0.4


@dataclass
class AdaptiveRateConfig:
    """Configuration for adaptive rate limiting behavior."""
    # Throughput bounds
    max_events_per_second: float = 100.0
    min_events_per_second: float = 5.0

    # System load thresholds (0.0 to 1.0) — trigger throttling at these levels
    cpu_threshold_high: float = 0.80
    memory_threshold_high: float = 0.85
    db_pool_threshold_high: float = 0.75

    # Throttling aggressiveness (0.0 = gentle, 1.0 = aggressive)
    throttle_aggressiveness: float = 0.6

    # Smoothing to prevent rate oscillation
    smoothing_factor: float = 0.3  # New rate = old * (1-factor) + new * factor


class AdaptiveRateLimiter:
    """Dynamically adjusts throughput based on real-time system load metrics.

    When CPU, memory, or DB pool utilization exceeds thresholds, the effective
    rate is reduced proportionally — providing automatic backpressure that adapts
    to system conditions without manual tuning.
    """

    def __init__(
        self,
        config: AdaptiveRateConfig | None = None,
        metrics_provider: SystemMetricsProvider | None = None,
    ) -> None:
        self._config = config or AdaptiveRateConfig()
        self._provider = metrics_provider or DummyMetricsProvider()
        self._current_rate: float = self._config.max_events_per_second
        self._target_rate: float = self._config.max_events_per_second
        self._lock = asyncio.Lock()

    @property
    def effective_rate(self) -> float:
        return self._current_rate

    async def compute_target_rate(self) -> float:
        """Compute the ideal throughput based on current system metrics.

        Uses a weighted penalty approach: each overloaded subsystem reduces
        the target rate by its excess load multiplied by throttle aggressiveness.
        """
        cpu = await self._provider.get_cpu_usage()
        memory = await self._provider.get_memory_pressure()
        db_pool = await self._provider.get_db_pool_utilization()

        penalties: list[float] = []

        # CPU penalty — linear increase in excess
        if cpu > self._config.cpu_threshold_high:
            excess = (cpu - self._config.cpu_threshold_high) / (
                1.0 - self._config.cpu_threshold_high
            )
            penalties.append(excess * self._config.throttle_aggressiveness)

        # Memory penalty — more aggressive due to OOM risk
        if memory > self._config.memory_threshold_high:
            excess = (memory - self._config.memory_threshold_high) / (
                1.0 - self._config.memory_threshold_high
            )
            penalties.append(excess * min(1.0, self._config.throttle_aggressiveness * 1.2))

        # DB pool penalty — connection exhaustion is catastrophic
        if db_pool > self._config.db_pool_threshold_high:
            excess = (db_pool - self._config.db_pool_threshold_high) / (
                1.0 - self._config.db_pool_threshold_high
            )
            penalties.append(excess * self._config.throttle_aggressiveness)

        # Calculate target rate reduction
        if penalties:
            total_penalty = sum(penalties) / len(penalties)
            reduction_factor = max(0.0, 1.0 - total_penalty)
        else:
            reduction_factor = 1.0

        target = self._config.max_events_per_second * reduction_factor
        return max(self._config.min_events_per_second, min(
            self._config.max_events_per_second, target
        ))

    async def update_rate(self) -> float:
        """Compute new target rate and apply smoothing to avoid oscillation."""
        new_target = await self.compute_target_rate()

        async with self._lock:
            # Apply exponential smoothing to prevent rate oscillation
            old = self._current_rate
            self._current_rate = (
                old * (1.0 - self._config.smoothing_factor) +
                new_target * self._config.smoothing_factor
            )

        logger.debug(
            "Adaptive rate updated: %.1f -> %.1f events/s "
            "(smoothed from %.1f)",
            old, self._current_rate, new_target,
        )
        return self._current_rate

    async def acquire(self) -> bool:
        """Non-blocking check — always returns True. The limiter controls rate externally."""
        # This method exists so the limiter can be used uniformly with static limiters
        return True


# --- Usage Example: Adaptive Rate-Limited Consumer ---
async def adaptive_consumer_pipeline(
    events: asyncio.Queue[dict],
    limiter: AdaptiveRateLimiter,
) -> None:
    """Consumer that adapts its processing rate to system load."""
    while True:
        # Periodically update the effective rate based on system health
        await limiter.update_rate()

        try:
            event = await asyncio.wait_for(events.get(), timeout=1.0)
        except asyncio.TimeoutError:
            continue

        # The limiter's effective_rate dictates how fast we should process.
        # If it drops to 10 events/s due to high CPU, we naturally slow down
        # by increasing our wait between events.
        min_delay = 1.0 / limiter.effective_rate if limiter.effective_rate > 0 else 0.1

        # Process the event
        logger.info("Processing event (rate=%.1f evt/s, delay=%.3fs)",
                     limiter.effective_rate, min_delay)

        # Simulate variable processing time
        await asyncio.sleep(min_delay)
```

### Pattern 4: Circuit Breaker for Message Consumers

When a downstream service becomes slow or unresponsive, messages pile up in the consumer's queue. A circuit breaker detects this degradation and opens — stopping new work from being dispatched to the failing dependency while allowing existing queued work to drain. Messages are rerouted to a dead-letter queue or degraded processing path.

```python
import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, TypeVar

T = TypeVar("T")

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Three-state circuit breaker lifecycle."""
    CLOSED = "closed"         # Normal: pass-through, monitoring errors
    OPEN = "open"             # Tripped: reject new work, queue for later
    HALF_OPEN = "half_open"   # Testing: allow limited probe requests


@dataclass
class ConsumerCircuitBreakerConfig:
    """Configuration for a consumer-side circuit breaker."""
    failure_threshold: int = 5            # Successive failures before opening
    recovery_timeout_seconds: float = 30.0  # Time in Open before Half-Open
    half_open_max_calls: int = 3          # Probe calls allowed in Half-Open
    success_threshold: int = 2            # Successes needed to close from Half-Open
    latency_threshold_ms: float = 5000.0  # Slow call threshold (ms)


class CircuitTripError(Exception):
    """Raised when work is rejected by an open circuit breaker."""

    def __init__(self, dependency: str, state: CircuitState) -> None:
        self.dependency = dependency
        self.state = state
        super().__init__(
            f"Circuit breaker {state.value} for '{dependency}' — "
            f"rejecting work to prevent queue buildup"
        )


@dataclass
class CircuitBreakerMetrics:
    """Observable metrics for circuit breaker monitoring."""
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    rejected_calls: int = 0
    state_transitions: list[dict] = field(default_factory=list)

    def record_transition(self, from_state: CircuitState, to_state: CircuitState, reason: str) -> None:
        self.state_transitions.append({
            "from": from_state.value,
            "to": to_state.value,
            "reason": reason,
            "timestamp": time.time(),
        })


class ConsumerCircuitBreaker:
    """Circuit breaker that protects downstream dependencies in message consumers.

    When a consumer's downstream call becomes slow or fails repeatedly, the circuit
    opens and rejects new work — preventing queue overflow and OOM. Existing queued
    work continues processing (for retries of previously accepted calls), but no NEW
    work is dispatched until recovery is detected.
    """

    def __init__(
        self,
        dependency_name: str,
        config: ConsumerCircuitBreakerConfig | None = None,
    ) -> None:
        self._name = dependency_name
        self._config = config or ConsumerCircuitBreakerConfig()
        self._state = CircuitState.CLOSED
        self._failure_count: int = 0
        self._success_count: int = 0
        self._half_open_calls: int = 0
        self._opened_at: float | None = None
        self._metrics = CircuitBreakerMetrics()

    @property
    def state(self) -> CircuitState:
        """Get current state, with auto-transition from Open to Half-Open."""
        if self._state == CircuitState.OPEN and self._opened_at:
            elapsed = time.monotonic() - self._opened_at
            if elapsed >= self._config.recovery_timeout_seconds:
                old_state = self._state
                self._transition(CircuitState.HALF_OPEN, "recovery timeout expired")
        return self._state

    @property
    def metrics(self) -> CircuitBreakerMetrics:
        return self._metrics

    def _transition(self, new_state: CircuitState, reason: str) -> None:
        old = self._state
        self._state = new_state
        self._metrics.record_transition(old, new_state, reason)
        logger.info(
            "Circuit '%s': %s -> %s (%s)",
            self._name, old.value, new_state.value, reason,
        )

    def allow_work(self) -> bool:
        """Check if new work can be dispatched to the downstream dependency.

        Returns True if the circuit allows work (Closed or Half-Open with capacity).
        Raises CircuitTripError if the circuit is Open — this is the backpressure signal.
        """
        current = self.state  # Triggers Open -> Half-Open transition check

        if current == CircuitState.CLOSED:
            return True
        elif current == CircuitState.OPEN:
            self._metrics.rejected_calls += 1
            raise CircuitTripError(self._name, CircuitState.OPEN)
        else:  # HALF_OPEN
            if self._half_open_calls < self._config.half_open_max_calls:
                self._half_open_calls += 1
                return True
            self._metrics.rejected_calls += 1
            raise CircuitTripError(self._name, CircuitState.HALF_OPEN)

    def record_success(self, latency_ms: float = 0.0) -> None:
        """Record a successful call to the downstream dependency."""
        self._metrics.total_calls += 1
        self._metrics.successful_calls += 1

        if self._state == CircuitState.CLOSED:
            self._failure_count = 0
        elif self._state == CircuitState.HALF_OPEN:
            self._success_count += 1
            if self._success_count >= self._config.success_threshold:
                self._half_open_calls = 0
                self._success_count = 0
                self._failure_count = 0
                self._transition(CircuitState.CLOSED, "recovery confirmed")

    def record_failure(self) -> None:
        """Record a failed or slow call to the downstream dependency."""
        self._metrics.total_calls += 1
        self._metrics.failed_calls += 1

        if self._state == CircuitState.CLOSED:
            self._failure_count += 1
            if self._failure_count >= self._config.failure_threshold:
                self._opened_at = time.monotonic()
                self._transition(CircuitState.OPEN, f"{self._failure_count} failures exceeded threshold")
        elif self._state == CircuitState.HALF_OPEN:
            # Any failure in Half-Open immediately re-trips the circuit
            self._half_open_calls = 0
            self._opened_at = time.monotonic()
            self._transition(CircuitState.OPEN, "probe call failed")


# --- Usage Example: Circuit-Guarded Message Processing ---
class MessageProcessorWithCircuitBreaker:
    """Example showing how a circuit breaker protects message consumers."""

    def __init__(self) -> None:
        self._circuit = ConsumerCircuitBreaker("payment-gateway")

    async def process_payment(self, order_id: str, amount: float) -> dict[str, Any]:
        """Process a payment through the circuit breaker protected gateway."""
        try:
            # This call blocks if circuit is open — backpressure signal to caller
            self._circuit.allow_work()

            # Simulate downstream call (would be an actual HTTP/API call in production)
            await asyncio.sleep(0.05)
            result = {"order_id": order_id, "status": "processed", "amount": amount}

            self._circuit.record_success(latency_ms=50)
            return result

        except CircuitTripError:
            # Circuit is open — route to dead-letter queue instead of queuing forever
            logger.warning("Circuit open for payment-gateway — routing %s to DLQ", order_id)
            return {"order_id": order_id, "status": "dead_lettered", "reason": "circuit_open"}

    def get_status_report(self) -> dict[str, Any]:
        """Return circuit breaker status for monitoring dashboards."""
        m = self._circuit.metrics
        return {
            "dependency": self._circuit._name,
            "state": self._circuit.state.value,
            "total_calls": m.total_calls,
            "success_rate": m.successful_calls / max(m.total_calls, 1),
            "rejected_count": m.rejected_calls,
            "recent_transitions": m.state_transitions[-5:],
        }
```

### Pattern 5: Sliding Window Throttling Algorithm

The sliding window algorithm divides time into discrete buckets and counts events per bucket. When the sum of events in recent buckets exceeds a threshold, new events are rejected. This provides smoother rate limiting than fixed-window approaches and eliminates boundary burst issues.

```python
import asyncio
import logging
import time
from collections import deque
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class SlidingWindowMetrics:
    """Runtime metrics for a sliding window throttle."""
    window_size_seconds: float
    max_events_per_window: int
    current_count: int
    total_allowed: int = 0
    total_rejected: int = 0

    @property
    def utilization(self) -> float:
        return self.current_count / self.max_events_per_window if self.max_events_per_window > 0 else 0.0


class SlidingWindowThrottle:
    """Sliding window rate throttler with time-bucketed event counting.

    Events are tracked in fixed-size time buckets. The throttle counts events
    across all non-expired buckets to determine current throughput. When the
    total exceeds the threshold, new events are rejected — providing smooth,
    boundary-free rate limiting.
    """

    def __init__(
        self,
        max_events: int,                # Max events allowed per window
        window_size_seconds: float = 1.0,
        bucket_duration_ms: float = 100.0,  # Sub-bucket granularity (ms)
    ) -> None:
        """Initialize the sliding window throttle.

        Args:
            max_events: Maximum events allowed per window period.
            window_size_seconds: Duration of the sliding window.
            bucket_duration_ms: Granularity of sub-buckets for finer resolution.
        """
        self._max_events = max_events
        self._window_size = window_size_seconds
        self._bucket_duration = bucket_duration_ms / 1000.0  # Convert to seconds
        self._buckets: deque[tuple[float, int]] = deque()  # (bucket_start_time, count)
        self._lock = asyncio.Lock()
        self._metrics = SlidingWindowMetrics(
            window_size_seconds=window_size_seconds,
            max_events_per_window=max_events,
            current_count=0,
        )

    def _cleanup_expired_buckets(self, now: float) -> None:
        """Remove buckets that have fallen outside the sliding window."""
        window_start = now - self._window_size
        while self._buckets and self._buckets[0][0] < window_start:
            self._buckets.popleft()

    def _current_count(self, now: float) -> int:
        """Calculate total events across all active buckets."""
        return sum(count for _, count in self._buckets)

    async def allow_event(self) -> bool:
        """Check if an event is allowed under the current rate limit.

        Returns True if the event can proceed, False if it would exceed
        the sliding window threshold (backpressure signal to caller).
        """
        now = time.monotonic()

        async with self._lock:
            self._cleanup_expired_buckets(now)

            current = self._current_count(now)
            self._metrics.current_count = current

            if current < self._max_events:
                # Calculate which bucket this event falls into
                bucket_start = now - (now % self._bucket_duration)
                self._metrics.total_allowed += 1

                # Add to existing bucket or create new one
                if self._buckets and abs(self._buckets[-1][0] - bucket_start) < 0.0001:
                    last_time, last_count = self._buckets.pop()
                    self._buckets.append((last_time, last_count + 1))
                else:
                    self._buckets.append((bucket_start, 1))

                return True
            else:
                self._metrics.current_count = current
                self._metrics.total_rejected += 1
                logger.debug(
                    "Sliding window throttle: REJECTED (count=%d/%d)",
                    current, self._max_events,
                )
                return False

    @property
    def metrics(self) -> SlidingWindowMetrics:
        return self._metrics

    async def wait_for_slot(self, timeout: float | None = None) -> bool:
        """Wait until a slot opens in the window (blocking backpressure).

        Args:
            timeout: Maximum seconds to wait. None waits indefinitely.

        Returns:
            True if a slot became available, False if timed out.
        """
        deadline = time.monotonic() + timeout if timeout else None

        while True:
            now = time.monotonic()

            if deadline is not None and now >= deadline:
                return False

            if await self.allow_event():
                return True

            # Sleep for the smallest bucket duration before re-checking
            await asyncio.sleep(self._bucket_duration)


# --- Usage Example: Sliding Window on High-Throughput Ingestion ---
class HighThroughputIngestor:
    """Example of a high-throughput event ingester using sliding window throttling."""

    def __init__(self, max_rps: int = 1000) -> None:
        self._throttle = SlidingWindowThrottle(
            max_events=max_rps,
            window_size_seconds=1.0,
            bucket_duration_ms=50.0,
        )

    async def ingest(self, event: dict[str, Any]) -> bool:
        """Ingest a single event with sliding window rate control."""
        if await self._throttle.allow_event():
            # Process event — write to storage, dispatch downstream, etc.
            logger.debug("Ingested %s", event.get("type"))
            return True
        else:
            # Backpressure applied — reject or buffer
            logger.warning("Throttled event ingestion (rate limit reached)")
            return False

    @property
    def metrics(self) -> SlidingWindowMetrics:
        m = self._throttle.metrics
        m.total_allowed += 0  # Just pass through for consistency
        return m
```

### Pattern 6: Producer Pause with Flow-Control Signal Propagation

Backpressure must flow upstream from the slowest consumer to producers. This pattern implements an async signal channel that consumers use to tell producers to pause, reduce batch size, or resume publishing — closing the feedback loop.

```python
import asyncio
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Any, AsyncGenerator

logger = logging.getLogger(__name__)


class FlowControlSignal(Enum):
    """Signals that flow from consumers back to producers."""
    PAUSE = "pause"          # Stop publishing immediately
    THROTTLE = "throttle"    # Continue but reduce publish rate
    RESUME = "resume"        # Resume normal publish rate


@dataclass
class FlowControlMessage:
    """Flow-control message carrying backpressure signals from consumers to producers."""
    signal: FlowControlSignal
    reason: str
    timestamp: float = 0.0

    def __post_init__(self) -> None:
        if self.timestamp == 0.0:
            import time
            self.timestamp = time.monotonic()


class FlowControlChannel:
    """Async channel for propagating backpressure signals from consumers to producers.

    Consumers push flow control signals onto the channel when they detect overload.
    Producers monitor the channel and respond by pausing, throttling, or resuming.
    This implements the signal propagation pattern — the physical mechanism by which
    backpressure flows upstream in event-driven systems.
    """

    def __init__(self) -> None:
        self._signals: asyncio.Queue[FlowControlMessage] = asyncio.Queue(maxsize=100)
        self._paused = False
        _lock = asyncio.Lock()

    async def send_signal(
        self,
        signal: FlowControlSignal,
        reason: str,
    ) -> None:
        """Send a flow control signal from consumer to producers.

        This is called by consumers when they detect overload conditions.
        The signal propagates through the channel and triggers producer-side actions.
        """
        await self._signals.put(FlowControlMessage(signal=signal, reason=reason))
        logger.info("Flow control: %s — %s", signal.value, reason)

    async def receive_signals(self) -> AsyncGenerator[FlowControlMessage, None]:
        """Consume flow control signals. Producers iterate this to react to backpressure."""
        while True:
            message = await self._signals.get()

            if message.signal == FlowControlSignal.PAUSE:
                logger.warning("PAUSE signal received — stopping publish loop")
                yield message

            elif message.signal == FlowControlSignal.THROTTLE:
                logger.info("THROTTLE signal received — reducing publish rate")
                yield message

            elif message.signal == FlowControlSignal.RESUME:
                logger.info("RESUME signal received — restoring normal rate")
                yield message


class BackpressureAwareProducer:
    """A producer that responds to flow control signals from downstream consumers."""

    def __init__(self, flow_channel: FlowControlChannel) -> None:
        self._flow = flow_channel
        self._paused = False
        self._batch_size = 100           # Normal batch size
        self._throttled_batch_size = 10  # Reduced batch size during throttle

    @property
    def current_batch_size(self) -> int:
        return self._throttled_batch_size if self._paused else self._batch_size

    async def run_publish_loop(
        self,
        event_source: AsyncGenerator[Any, None],
    ) -> dict[str, int]:
        """Publish events while respecting flow control signals from consumers.

        Args:
            event_source: Async generator producing events to publish.

        Returns:
            Statistics about published events and flow control responses.
        """
        stats = {"published": 0, "paused_for": 0.0, "batch_reductions": 0}
        batch: list[Any] = []
        pause_start: float | None = None

        async for event in event_source:
            # Check for flow control signals before each event
            try:
                while not self._flow._signals.empty():
                    signal_msg = await asyncio.wait_for(
                        self._flow._signals.get(), timeout=0.01
                    )
                    if signal_msg.signal == FlowControlSignal.PAUSE:
                        if not self._paused:
                            pause_start = time.monotonic() if "time" in dir() else 0
                            self._paused = True
                            stats["batch_reductions"] += 1
                    elif signal_msg.signal == FlowControlSignal.RESUME:
                        if self._paused and pause_start is not None:
                            import time as t
                            stats["paused_for"] += t.monotonic() - pause_start
                            self._paused = False
                            pause_start = None

            except asyncio.TimeoutError:
                pass  # No signals available right now

            # Batch events for publishing
            batch.append(event)

            if len(batch) >= (self._throttled_batch_size if self._paused else self._batch_size):
                await self._publish_batch(batch)
                stats["published"] += len(batch)
                batch = []

        # Publish remaining events
        if batch:
            await self._publish_batch(batch)
            stats["published"] += len(batch)

        return stats

    async def _publish_batch(self, batch: list[Any]) -> None:
        """Publish a batch of events to the message broker."""
        logger.debug("Publishing batch of %d events", len(batch))
        await asyncio.sleep(0.001 * len(batch))  # Simulate network I/O

    async def get_status(self) -> dict[str, Any]:
        return {
            "paused": self._paused,
            "batch_size": self.current_batch_size,
            "flow_channel_depth": self._flow._signals.qsize(),
        }


# --- Usage Example: Closed-Loop Backpressure System ---
async def demonstrate_flow_control() -> None:
    """Demonstrate the complete flow control loop."""
    import time
    channel = FlowControlChannel()

    producer = BackpressureAwareProducer(channel)

    async def event_generator():
        """Simulate a stream of events from an upstream source."""
        for i in range(200):
            yield {"id": i, "type": "user_action"}
            await asyncio.sleep(0.001)  # Small delay between events

    # Run producer with flow control awareness
    task = asyncio.create_task(producer.run_publish_loop(event_generator()))

    # Simulate consumer detecting overload after some events
    async def simulate_consumer_overload():
        await asyncio.sleep(0.05)  # Let a few events through first
        await channel.send_signal(
            FlowControlSignal.PAUSE,
            "consumer queue depth exceeds 80% capacity",
        )
        await asyncio.sleep(0.1)  # Pause for 100ms
        await channel.send_signal(
            FlowControlSignal.RESUME,
            "queue depth recovered below threshold",
        )

    await asyncio.gather(
        task,
        simulate_consumer_overload(),
    )

    status = await producer.get_status()
    print(f"Producer status: {status}")


if __name__ == "__main__":
    asyncio.run(demonstrate_flow_control())
```

### Pattern 7: Consumer Lag Monitor and Alerting Thresholds

Effective backpressure requires observability. This monitor tracks queue depth, processing latency percentiles (p50/p95/p99), consumer lag, and resource utilization — providing the metrics that feed into adaptive rate limiting and circuit breaker decisions.

```python
import asyncio
import logging
import math
from dataclasses import dataclass, field
from typing import Any
from collections import deque

logger = logging.getLogger(__name__)


@dataclass
class PercentileTracker:
    """Efficient moving-window percentile tracker using a sorted deque."""

    max_window_seconds: float = 60.0
    _values: deque[tuple[float, float]] = field(default_factory=deque)  # (timestamp, value)

    def record(self, value: float) -> None:
        now = asyncio.get_event_loop().time() if "asyncio" in dir() else __import__("time").monotonic()
        self._values.append((now, value))

    def _prune(self, current_time: float) -> None:
        cutoff = current_time - self.max_window_seconds
        while self._values and self._values[0][0] < cutoff:
            self._values.popleft()

    def percentile(self, p: float) -> float | None:
        """Calculate the p-th percentile (0-100) of recent values."""
        current_time = asyncio.get_event_loop().time() if "asyncio" in dir() else __import__("time").monotonic()
        self._prune(current_time)

        if not self._values:
            return None

        sorted_values = sorted(v for _, v in self._values)
        index = int(len(sorted_values) * p / 100.0)
        index = min(index, len(sorted_values) - 1)
        return sorted_values[index]

    @property
    def count(self) -> int:
        current_time = asyncio.get_event_loop().time() if "asyncio" in dir() else __import__("time").monotonic()
        self._prune(current_time)
        return len(self._values)


@dataclass
class ConsumerLagMetrics:
    """Comprehensive backpressure observability metrics."""
    queue_depth: int = 0
    p50_latency_ms: float = 0.0
    p95_latency_ms: float = 0.0
    p99_latency_ms: float = 0.0
    events_processed_per_second: float = 0.0
    consumer_lag_seconds: float = 0.0
    cpu_usage_percent: float = 0.0
    memory_pressure_percent: float = 0.0
    db_pool_utilization_percent: float = 0.0

    @property
    def is_overloaded(self) -> bool:
        """Return True if any metric exceeds critical thresholds."""
        return (
            self.queue_depth > 10000 or
            self.p99_latency_ms > 5000 or
            self.cpu_usage_percent > 85 or
            self.memory_pressure_percent > 85 or
            self.db_pool_utilization_percent > 75
        )

    @property
    def is_degraded(self) -> bool:
        """Return True if system is under moderate pressure — early warning."""
        return (
            self.queue_depth > 5000 or
            self.p95_latency_ms > 2000 or
            self.cpu_usage_percent > 70 or
            self.memory_pressure_percent > 70
        )


class ConsumerLagMonitor:
    """Monitors consumer health metrics and provides backpressure observability.

    Tracks queue depth, processing latency percentiles, throughput rates, and
    system resource utilization. Exposes overload/degraded state flags that can
    feed directly into adaptive rate limiters and circuit breakers.
    """

    def __init__(self, consumer_name: str = "default") -> None:
        self._name = consumer_name
        self._latency_tracker = PercentileTracker(max_window_seconds=60.0)
        self._throughput_history: deque[tuple[float, int]] = deque(maxlen=100)
        self._last_processed_count: int = 0
        self._last_timestamp: float | None = None
        self._lock = asyncio.Lock()

    def record_event_completion(self, processing_time_ms: float) -> None:
        """Record a completed event's processing time for latency tracking."""
        self._latency_tracker.record(processing_time_ms)

        now = __import__("time").monotonic()
        with asyncio.Runner().call(__import__("asyncio").get_running_loop, __import__("asyncio").Lock().__aenter__()) if False else None:
            pass  # Placeholder — use simple counter in sync context

        self._last_processed_count += 1
        self._throughput_history.append((now, self._last_processed_count))

    def update_queue_depth(self, depth: int) -> None:
        """Update the current queue depth measurement."""
        pass  # State is accessed via property in real implementation

    @property
    def queue_depth(self) -> int:
        """Current queue depth — set externally by the consumer."""
        return getattr(self, "_queue_depth", 0)

    def _compute_throughput(self) -> float:
        """Calculate events processed per second from throughput history."""
        if len(self._throughput_history) < 2:
            return 0.0

        first_time, first_count = self._throughput_history[0]
        last_time, last_count = self._throughput_history[-1]
        elapsed = last_time - first_time
        if elapsed <= 0:
            return 0.0
        return (last_count - first_count) / elapsed

    async def get_metrics(self, system_overrides: dict[str, float] | None = None) -> ConsumerLagMetrics:
        """Compute comprehensive metrics snapshot for backpressure decisions.

        Args:
            system_overrides: Optional dict of {metric_name: value} to override
                             real system readings (useful for testing).

        Returns:
            Full ConsumerLagMetrics snapshot including overload indicators.
        """
        overrides = system_overrides or {}

        return ConsumerLagMetrics(
            queue_depth=overrides.get("queue_depth", self.queue_depth),
            p50_latency_ms=self._latency_tracker.percentile(50) or 0.0,
            p95_latency_ms=self._latency_tracker.percentile(95) or 0.0,
            p99_latency_ms=self._latency_tracker.percentile(99) or 0.0,
            events_processed_per_second=self._compute_throughput(),
            consumer_lag_seconds=overrides.get("lag_seconds", 0.0),
            cpu_usage_percent=overrides.get("cpu_percent", 0.0),
            memory_pressure_percent=overrides.get("memory_percent", 0.0),
            db_pool_utilization_percent=overrides.get("db_pool_percent", 0.0),
        )

    async def monitor_loop(
        self,
        queue_getter: Any = None,
        interval_seconds: float = 5.0,
    ) -> AsyncGenerator[ConsumerLagMetrics, None]:
        """Continuously emit metrics snapshots for observability and alerting.

        This coroutine yields a fresh metrics snapshot every `interval_seconds`,
        suitable for feeding into monitoring dashboards or adaptive throttling loops.
        """
        while True:
            try:
                metrics = await self.get_metrics()
                yield metrics

                # Alert on overload conditions
                if metrics.is_overloaded:
                    logger.critical(
                        "CONSUMER OVERLOAD [%s]: q=%d, p99=%.0fms, cpu=%.0f%%",
                        self._name, metrics.queue_depth,
                        metrics.p99_latency_ms, metrics.cpu_usage_percent,
                    )
                elif metrics.is_degraded:
                    logger.warning(
                        "CONSUMER DEGRADED [%s]: q=%d, p95=%.0fms, cpu=%.0f%%",
                        self._name, metrics.queue_depth,
                        metrics.p95_latency_ms, metrics.cpu_usage_percent,
                    )

            except Exception as e:
                logger.error("Metrics collection error: %s", e)

            await asyncio.sleep(interval_seconds)


# --- Usage Example: Metrics-Driven Adaptive Backpressure ---
async def demonstrate_monitoring() -> None:
    """Show how metrics drive backpressure decisions."""
    monitor = ConsumerLagMonitor(consumer_name="payment-processor")

    # Simulate recording event latencies
    import random
    for i in range(100):
        latency = random.gauss(50, 20)  # Normal distribution: mean 50ms, sigma 20ms
        monitor.record_event_completion(max(1, latency))

    metrics = await monitor.get_metrics({
        "queue_depth": 7500,
        "cpu_percent": 72.0,
        "memory_percent": 68.0,
        "db_pool_percent": 45.0,
    })

    print(f"Consumer: {monitor._name}")
    print(f"  Queue depth: {metrics.queue_depth}")
    print(f"  Latency — p50: {metrics.p50_latency_ms:.1f}ms, "
          f"p95: {metrics.p95_latency_ms:.1f}ms, p99: {metrics.p99_latency_ms:.1f}ms")
    print(f"  Throughput: {metrics.events_processed_per_second:.1f} events/s")
    print(f"  Status: {'OVERLOADED' if metrics.is_overloaded else 'DEGRADED' if metrics.is_degraded else 'HEALTHY'}")


if __name__ == "__main__":
    asyncio.run(demonstrate_monitoring())
```

---

## Constraints

### MUST DO

- Always use bounded queues (`asyncio.Queue(maxsize=N)`) — never leave consumer queues unbounded in production; calculate N as `consumer_capacity * safety_multiplier (2x)`
- Implement token bucket or sliding window rate limiters before any downstream external I/O call — the limiter is the first line of defense against queue buildup
- Deploy circuit breakers on every consumer that calls an external dependency (database, third-party API, message broker) — track both error rates AND latency as trip signals
- Design priority-based event processing with at least three tiers (critical, high, medium/low) so system degradation doesn't affect business-critical events
- Measure and expose p50/p95/p99 processing latency percentiles, queue depth utilization, and consumer lag — these are the primary indicators for when backpressure should engage
- Implement signal propagation from consumers to producers via async channels or shared flow-control state — backpressure is ineffective if producers cannot detect downstream saturation
- Add alerting thresholds at both degraded (warning) and overloaded (critical) states — use 70% CPU/memory as degradation thresholds, 85% as critical thresholds

### MUST NOT DO

- Never use unbounded queues (`asyncio.Queue()` with no `maxsize`) in any production consumer — an unbounded queue will grow until the process runs out of memory and OOM kills
- Do not implement circuit breakers that silently drop all messages when open — always route to a dead-letter queue or persistence layer so no data is lost during circuit trips
- Never use fixed-window rate limiting for high-throughput systems — boundary effects allow burst traffic at window boundaries; always prefer sliding window or token bucket algorithms
- Do not let backpressure signals require synchronous acknowledgment from producers — flow control channels should be fire-and-forget async signals, not request-response protocols
- Avoid making throttling decisions based on a single metric alone — always use at least two indicators (e.g., queue depth AND latency percentile) to prevent false positive throttle triggers
- Never implement priority queuing without a clear drop policy — if low-priority events can stay in the queue indefinitely, they starve critical events and defeat the purpose of prioritization

---

## Output Template

When implementing or reviewing backpressure handling in an event-driven system, produce:

1. **Architecture Diagram** — ASCII or text-based flow showing all producers, queues, consumers, and circuit breakers with their capacities (maxsize values)
2. **Queue Capacity Calculations** — For each consumer queue: the maxsize value, how it was derived (capacity × safety multiplier), and the expected overflow behavior
3. **Rate Limiter Configuration** — Token bucket rate (events/s, burst capacity) or sliding window parameters (window size, max events) for each downstream call with rationale
4. **Circuit Breaker Settings** — Per-dependency configuration: failure threshold, recovery timeout, half-open probe limits, and what happens when the circuit opens (DLQ routing, degraded path)
5. **Priority Scheme** — Defined priority tiers with event type mappings, drop policies, and the overload thresholds that trigger tier-based filtering
6. **Flow Control Protocol** — How signals propagate from consumers to producers: channel implementation, signal types, and producer response behavior for each signal
7. **Monitoring Plan** — Metrics to expose (queue depth, p50/p95/p99 latency, consumer lag, throughput), alert thresholds (degraded at 70%, overloaded at 85%), and the dashboards or alerting rules to configure

---

## Related Skills

| Skill | Purpose |
|---|---|
| `event-driven-patterns` | Broader event-driven architecture patterns (event sourcing, CQRS) — backpressure is a cross-cutting concern within this architecture |
| `message-queue-design` | Message broker configuration, queue topology, and durability settings — complements application-level backpressure with broker-level flow control |
| `system-reliability-architecture` | System-wide reliability design including redundancy, failover, and disaster recovery — backpressure is one layer in the reliability defense-in-depth strategy |
| `event-bus` | Event bus implementation patterns (publish/subscribe, topic-based routing) — backpressure mechanisms integrate with event bus consumer groups |
| `data-pipeline-engineering` | High-throughput data pipeline construction (Apache Kafka, Flink, Spark Streaming) — backpressure is critical in streaming pipelines to prevent memory pressure |

---

## Live References

| Resource | URL |
|----------|-----|
| Python asyncio.Queue Documentation | https://docs.python.org/3/library/asyncio-stream.html#asyncio.Queue |
| Token Bucket Algorithm (Wikipedia) | https://en.wikipedia.org/wiki/Token_bucket |
| Sliding Window Counter Algorithm | https://medium.com/@gerg.kis/10-microservice-design-patterns-you-should-know-c628e9ebec05 |
| Circuit Breaker Pattern (Martin Fowler) | https://martinfowler.com/bliki/CircuitBreaker.html |
| Backpressure in Reactive Streams (Reactive Streams spec) | https://www.reactivestreams.org/ |
| Kubernetes Resource Management (Memory Pressure) | https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/ |

---

> 📖 skill(local cache): backpressure-handling
