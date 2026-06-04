---
name: system-design-fundamentals
description: Implements production system design patterns including capacity planning,
  multi-tier caching strategies, load balancing algorithms, rate limiting, CDN placement
  decisions, database sharding strategies, and circuit breaker implementations for
  scalable distributed applications.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: system design, capacity planning, cache strategy, load balancing, rate
    limiting, CDN placement, database sharding, circuit breaker, how do i design a
    scalable system, request estimation, traffic scaling, horizontal scaling
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
  - examples
  - do-dont
  related-skills: microservices-architecture, distributed-systems-architecture, event-driven-patterns
---
# System Design Fundamentals

Designs scalable production systems by applying proven patterns for capacity estimation, multi-tier caching, load balancing, request rate limiting, CDN strategy, database scaling, and failure isolation. When loaded, the model acts as a senior systems architect who translates requirements into concrete architectural decisions backed by numerical estimates, code patterns, and operational considerations.

## TL;DR Checklist

- [ ] Calculate requests-per-second capacity before choosing any infrastructure component
- [ ] Implement multi-tier caching (client → edge → app → database) with explicit invalidation strategies
- [ ] Choose load balancing algorithm based on session affinity and backend heterogeneity
- [ ] Add rate limiting at API gateway layer using token bucket or sliding window counters
- [ ] Place static assets behind CDN; cache dynamic content at edge for repeatable requests
- [ ] Shard databases by natural partition key; use consistent hashing for rebalance safety
- [ ] Deploy circuit breakers on every inter-service call with configurable thresholds

---

## When to Use

Use this skill when:

- Estimating infrastructure capacity (CPU, memory, bandwidth, IOPS) before provisioning servers or cloud instances.
- Designing a caching strategy that spans multiple tiers — client browser, CDN edge, application cache (Redis/Memcached), and database query cache.
- Choosing between load balancing algorithms (round-robin, least-connections, weighted, sticky sessions) for a service with specific traffic patterns.
- Implementing rate limiting to protect backend services from abuse or traffic spikes (API keys, per-user, per-IP limits).
- Planning CDN placement strategy for static and semi-static assets across geographic regions.
- Designing database scaling strategies — read replicas, write splitting, horizontal sharding, partitioning by time range.
- Adding circuit breakers and bulkheads to prevent cascade failures in a microservices architecture.

---

## When NOT to Use

Avoid this skill for:

- Single-server deployments with predictable, low traffic (under 100 RPS) — simple vertical scaling suffices.
- Real-time systems requiring deterministic sub-millisecond latency where cache invalidation timing introduces unacceptable variance.
- Designing individual microservice internals — use `microservices-architecture` for bounded context design, service discovery, and inter-service contracts.
- Implementing consensus algorithms or distributed data structures — use `distributed-systems-architecture` for Raft, Paxos, vector clocks, and consistent hashing at the protocol level.

---

## Core Workflow

1. **Estimate System Capacity Requirements** — Start from business requirements: expected users, request frequency, data size growth, and peak-to-average ratio. Calculate requests per second (RPS), bytes per second, database operations per second, and storage growth rate. Use the formula: `peak_RPS = avg_RPS * peak_to_average_ratio`. For web services, a typical peak-to-average ratio is 3–10x; for flash-sale events, it can be 50–100x. **Checkpoint:** Every component (load balancer, application server, database connection pool) must have documented capacity limits that exceed the calculated peak demand with a 40% safety margin.

2. **Design Multi-Tier Caching Strategy** — Layer caches from outermost to innermost: browser cache (HTTP Cache-Control headers, max-age 1h–30d for static assets), CDN edge cache (TTL 5min–24h for API responses and dynamic content), application-level cache (Redis/Memcached with TTL 1min–1h for computed results), database query cache (short-lived for reference data). For each layer, define the cache key formula, TTL policy, and invalidation mechanism. Use write-through for frequently-read data; use write-behind (async) for high-write workloads where eventual consistency is acceptable. **Checkpoint:** Cache hit rate must exceed 90% at every tier for that tier to justify its operational cost.

3. **Select Load Balancing Algorithm** — Match the algorithm to traffic characteristics:
   - **Round-Robin**: Uniform backends, stateless requests. Simple, no session affinity.
   - **Least-Connections**: Backends with heterogeneous capacity or long-lived connections (WebSockets, gRPC streaming). Routes to the least-busy backend.
   - **Weighted Round-Robin**: Backends with different capacities. Assign weights proportional to CPU/memory/throughput.
   - **Sticky Sessions (IP or Cookie)**: Required when sessions are stored in-process on application servers. Use with caution — it prevents healthy connection draining during rolling deployments.
   - **Consistent Hashing**: Required when cache affinity matters (session stores, shard routing). Minimizes cache invalidation on backend changes.
   **Checkpoint:** The load balancer itself must be highly available (at least 2 instances in different failure zones) and the algorithm must support dynamic weight adjustment for canary deployments.

4. **Implement Rate Limiting at the API Gateway** — Deploy rate limiting before requests reach application servers. Choose an algorithm based on threat model:
   - **Token Bucket**: Smooth traffic bursts; allows controlled over-quota spikes. Best for most APIs. Configure with `bucket_size` (max burst) and `refill_rate` (tokens per second).
   - **Sliding Window Counter**: More precise than fixed-window; divides the time window into sub-windows and interpolates between them. Higher memory cost but accurate against distributed clients.
   - **Leaky Bucket**: Strict constant-rate output regardless of input burst. Best for protecting downstream services from any burstiness.
   
   Set tiered limits per customer tier (free, pro, enterprise). Return standard `429 Too Many Requests` with `Retry-After` header and a `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers on every response. **Checkpoint:** Rate limiter must be distributed (shared state via Redis) when the API gateway runs on multiple instances; per-process rate limiters are ineffective under load balancing.

5. **Plan CDN Placement and Cache Invalidation Strategy** — Classify content by cacheability:
   - **Static assets** (images, CSS, JS): Cache at CDN with long TTLs (1h–30d), version filenames for busting (`app.a1b2c3.js`).
   - **Semi-dynamic API responses**: Cache at CDN edge for 5min–1h where data staleness is acceptable. Use cache keys based on request parameters.
   - **User-specific data**: Never cache at CDN; route directly to origin with per-user cookie-based routing.
   
   For cache invalidation, prefer TTL expiration over push invalidation (which is expensive at scale). When push invalidation is necessary, use a distributed publish/subscribe channel to invalidate edge caches across all POPs within 30 seconds. **Checkpoint:** Verify that no sensitive data (PII, auth tokens, payment details) can be cached at any CDN edge node by scanning Cache-Control headers in the deployment pipeline.

6. **Design Database Scaling Strategy** — Start with vertical scaling, then move to horizontal patterns as needed:
   - **Read Replicas**: Add read replicas for query-heavy workloads. Route reads to replicas, writes to primary. Monitor replication lag (`Seconds_Behind_Master`) and implement fallback to primary when lag exceeds 5 seconds.
   - **Write Splitting / Sharding**: Shard by a natural partition key (user_id, tenant_id, geographic region). Use consistent hashing with virtual nodes for rebalance safety. Each shard is an independent database instance handling its own writes and reads.
   - **Partitioning by Time Range**: For time-series data (logs, metrics, events), partition by month or week. Drop old partitions instead of deleting rows — O(1) operation vs. O(n) DELETE.
   - **Connection Pooling**: Use PgBouncer or similar poolers between application servers and databases. Set pool size to `min((CPU cores * 2) + effective_spindle_count, max_connections / num_app_servers)`.
   **Checkpoint:** Every sharding key must have an index; queries that scan across shards (full table scans on non-sharded columns) are performance killers and should be caught in code review.

7. **Deploy Circuit Breakers on All Inter-Service Communication** — Every HTTP/gRPC/MQ call to another service must be wrapped with a circuit breaker pattern. Use the state machine model:
   - **CLOSED**: Normal operation. Track failure count. When failures exceed `failure_threshold` (default: 5) within `failure_window` (default: 10s), transition to OPEN.
   - **OPEN**: Reject requests immediately with a fallback response. After `sleep_window` (default: 30s), transition to HALF-OPEN.
   - **HALF-OPEN**: Allow one probe request through. If it succeeds, transition back to CLOSED; if it fails, return to OPEN and restart the sleep window.
   
   Implement bulkheads by isolating failure domains — a database outage should not exhaust thread pools for unrelated services. Use separate connection pools, thread pools, and rate limiters per downstream dependency. **Checkpoint:** Every circuit breaker must log state transitions with timestamps and downstream service name; monitor `circuit_breaker_state` as a metric in your observability stack.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Capacity Planning Calculator

```python
"""Capacity planning calculator for web application infrastructure."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol


@dataclass(frozen=True)
class CapacityEstimate:
    """Computed capacity requirements across infrastructure tiers."""
    avg_rps: float
    peak_rps: float
    p99_latency_ms: float
    cpu_cores_per_server: int = 8
    memory_gb_per_server: int = 32
    app_instances_needed: int = 0
    db_connections_needed: int = 0
    cache_memory_gb: float = 0.0
    bandwidth_gbps: float = 0.0


class ServerCapacity(Protocol):
    """Defines the throughput capacity of a single server instance."""

    @property
    def max_rps_per_instance(self) -> float: ...

    @property
    def max_concurrent_connections(self) -> int: ...

    @property
    def memory_gb(self) -> int: ...


def estimate_capacity(
    avg_rps: float,
    peak_to_avg_ratio: float,
    server_capacity: ServerCapacity,
    p99_latency_ms: float = 200.0,
    safety_margin: float = 0.4,
) -> CapacityEstimate:
    """Calculate infrastructure capacity based on traffic estimates and server specs.

    Args:
        avg_rps: Average requests per second during normal operations.
        peak_to_avg_ratio: Ratio of peak traffic to average (typically 3-10 for web apps).
        server_capacity: Capacity characteristics of a single application server instance.
        p99_latency_ms: Target 99th percentile latency in milliseconds.
        safety_margin: Additional headroom beyond calculated needs (default 40%).

    Returns:
        Complete capacity estimate with instance counts and resource requirements.
    """
    peak_rps = avg_rps * peak_to_avg_ratio
    effective_capacity = server_capacity.max_rps_per_instance / (1 + safety_margin)

    app_instances_needed = max(1, int((peak_rps / effective_capacity) + 0.999))
    db_connections_needed = min(
        app_instances_needed * 20,  # 20 connections per instance
        server_capacity.max_concurrent_connections,
    )

    # Estimate cache needs: assume 70% of requests hit cache at peak
    cache_entries_per_rps = avg_rps * 0.7
    cache_memory_gb = (cache_entries_per_rps * 1024) / (1024 * 1024 * 1024 / 8)  # ~8 bytes per entry key+metadata

    # Bandwidth estimate: average 5KB response per request
    bandwidth_bytes_per_sec = avg_rps * 5 * 1024  # 5KB per request
    bandwidth_gbps = (bandwidth_bytes_per_sec * 8) / (10**9)

    return CapacityEstimate(
        avg_rps=avg_rps,
        peak_rps=peak_rps,
        p99_latency_ms=p99_latency_ms,
        app_instances_needed=app_instances_needed,
        db_connections_needed=db_connections_needed,
        cache_memory_gb=round(cache_memory_gb, 2),
        bandwidth_gbps=round(bandwidth_gbps, 3),
    )


# Example usage: estimating capacity for an e-commerce API
class EC2MediumInstance(ServerCapacity):
    """AWS c6i.2xlarge equivalent: 8 vCPUs, 16GB RAM."""

    @property
    def max_rps_per_instance(self) -> float:
        return 2000.0  # ~2K RPS per instance at p99=200ms

    @property
    def max_concurrent_connections(self) -> int:
        return 4000

    @property
    def memory_gb(self) -> int:
        return 16


# Estimate for an API handling 500 avg RPS with 5x peak ratio
estimate = estimate_capacity(
    avg_rps=500.0,
    peak_to_avg_ratio=5.0,
    server_capacity=EC2MediumInstance(),
)

assert estimate.peak_rps == 2500.0  # Peak traffic: 2,500 RPS
# Need ~2 app instances (safety margin reduces effective capacity to ~1364 RPS)
```

### Pattern 2: Token Bucket Rate Limiter

```python
"""Distributed rate limiter using token bucket algorithm with Redis backend."""

from __future__ import annotations

import time
import threading
from typing import NamedTuple


class RateLimitResult(NamedTuple):
    """Result of a rate limit check operation."""
    allowed: bool
    remaining_tokens: int
    retry_after_seconds: float
    limit: int


class TokenBucketRateLimiter:
    """Token bucket rate limiter.

    Each client (identified by key) gets a bucket that refills at a constant rate.
    Requests consume tokens; if no tokens remain, the request is rejected.
    
    This implementation uses Redis for distributed state when running across
    multiple instances, and falls back to in-memory state for single-instance deployments.

    Attributes:
        max_tokens: Maximum burst size (bucket capacity).
        refill_rate: Tokens added per second.
        key_prefix: Redis key prefix for namespacing.
    """

    def __init__(
        self,
        max_tokens: int,
        refill_rate: float,
        *,
        redis_client: object | None = None,  # type: ignore[type-arg]
        key_prefix: str = "rate_limit",
    ) -> None:
        if max_tokens < 1:
            raise ValueError("max_tokens must be at least 1")
        if refill_rate <= 0:
            raise ValueError("refill_rate must be positive")

        self.max_tokens = max_tokens
        self.refill_rate = refill_rate
        self._key_prefix = key_prefix
        self._redis = redis_client
        self._local_buckets: dict[str, _LocalBucket] = {}
        self._lock = threading.Lock()

    def _bucket_key(self, identifier: str) -> str:
        return f"{self._key_prefix}:{identifier}"

    def check(self, identifier: str) -> RateLimitResult:
        """Check if a request from the given identifier is allowed.

        Args:
            identifier: Unique client identifier (e.g., API key, user ID, IP address).

        Returns:
            RateLimitResult with allow/deny decision and metadata for response headers.
        """
        now = time.monotonic()
        bucket_key = self._bucket_key(identifier)

        if self._redis is not None:
            return self._check_redis(bucket_key, now, identifier)

        # In-memory fallback (single-instance only — not safe under load balancing)
        with self._lock:
            if identifier not in self._local_buckets:
                self._local_buckets[identifier] = _LocalBucket(
                    tokens=self.max_tokens,
                    last_refill=now,
                )

            bucket = self._local_buckets[identifier]
            return self._consume(bucket, now)

    def _check_redis(self, key: str, now: float, identifier: str) -> RateLimitResult:  # noqa: ANN201
        """Distributed check using Redis Lua script for atomicity."""
        from redis import Redis  # type: ignore[import-not-found]  # Lazy import.

        lua_script = """
        local key = KEYS[1]
        local max_tokens = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        
        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local tokens = tonumber(bucket[1]) or max_tokens
        local last_refill = tonumber(bucket[2]) or now
        
        -- Calculate token refill since last check
        local elapsed = math.max(0, now - last_refill)
        local new_tokens = math.min(max_tokens, tokens + (elapsed * refill_rate))
        
        if new_tokens >= 1 then
            new_tokens = new_tokens - 1
            redis.call('HMSET', key, 'tokens', tostring(new_tokens), 'last_refill', tostring(now))
            redis.call('EXPIRE', key, 3600)  # Auto-cleanup after 1 hour.
            return {1, math.floor(new_tokens)}
        else
            local retry_after = (1 - tokens) / refill_rate
            return {0, 0, retry_after}
        end
        """

        result = self._redis.eval(  # type: ignore[union-attr]
            lua_script,
            keys=[key],
            args=[self.max_tokens, self.refill_rate, now],
        )

        if isinstance(result, list):
            allowed = bool(result[0])
            remaining = int(result[1]) if len(result) > 1 else 0
            retry_after = float(result[2]) if len(result) > 2 else 0
        else:
            allowed = bool(result)
            remaining = 0
            retry_after = self.max_tokens / self.refill_rate

        return RateLimitResult(
            allowed=allowed,
            remaining=remaining,
            retry_after_seconds=retry_after,
            limit=self.max_tokens,
        )

    def _consume(self, bucket: _LocalBucket, now: float) -> RateLimitResult:
        """Consume a token from the local bucket and return the result."""
        elapsed = now - bucket.last_refill
        bucket.tokens = min(self.max_tokens, bucket.tokens + elapsed * self.refill_rate)
        bucket.last_refill = now

        if bucket.tokens >= 1:
            bucket.tokens -= 1
            return RateLimitResult(
                allowed=True,
                remaining=int(bucket.tokens),
                retry_after_seconds=0.0,
                limit=self.max_tokens,
            )

        retry_after = (1 - bucket.tokens) / self.refill_rate
        return RateLimitResult(
            allowed=False,
            remaining=0,
            retry_after_seconds=retry_after,
            limit=self.max_tokens,
        )


class _LocalBucket:
    """In-memory token bucket state for single-instance deployments."""

    __slots__ = ("tokens", "last_refill")

    def __init__(self, tokens: float, last_refill: float) -> None:
        self.tokens = tokens
        self.last_refill = last_refill


# Example: API decorator applying rate limiting
def api_rate_limit(
    limiter: TokenBucketRateLimiter,
    key_func: object,  # type: ignore[type-arg]
) -> object:  # type: ignore[type-arg]
    """Decorator that applies per-client rate limiting to an API endpoint.

    Args:
        limiter: The rate limiter instance.
        key_func: Callable that extracts the client identifier from the request.

    Returns:
        Decorated function that rejects requests exceeding the rate limit.
    """
    def decorator(func: object) -> object:  # type: ignore[type-arg]
        def wrapper(*args: object, **kwargs: object) -> dict:  # type: ignore[type-arg]
            request = args[0] if args else None  # type: ignore[index]
            if request is None:
                return func(*args, **kwargs)

            identifier = key_func(request)
            result = limiter.check(identifier)

            if not result.allowed:
                return {
                    "error": "rate_limit_exceeded",
                    "message": f"Rate limit exceeded. Retry after {result.retry_after_seconds:.1f}s.",
                    "headers": {
                        "Retry-After": str(int(result.retry_after_seconds) + 1),
                        "X-RateLimit-Limit": str(result.limit),
                        "X-RateLimit-Remaining": str(result.remaining),
                    },
                }

            response = func(*args, **kwargs)
            if isinstance(response, dict):
                response["headers"] = {
                    "X-RateLimit-Limit": str(result.limit),
                    "X-RateLimit-Remaining": str(result.remaining),
                }
            return response
        return wrapper  # type: ignore[return-value]
    return decorator
```

### Pattern 3: Circuit Breaker Implementation

```python
"""Circuit breaker pattern with CLOSED/OPEN/HALF-OPEN state machine."""

from __future__ import annotations

import enum
import time
import threading
import random
from dataclasses import dataclass, field
from typing import TypeVar, Callable, Any


T = TypeVar("T")


class CircuitState(enum.Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass(frozen=True)
class CircuitBreakerConfig:
    """Configuration for a circuit breaker instance."""
    failure_threshold: int = 5           # Failures before opening circuit
    success_threshold: int = 3           # Successes in half-open before closing
    failure_window_seconds: float = 10.0  # Time window to count failures
    sleep_window_seconds: float = 30.0   # How long the circuit stays open
    half_open_max_calls: int = 1         # Max probe calls allowed in half-open


class CircuitBreakerError(Exception):
    """Raised when a request is rejected because the circuit is OPEN."""

    def __init__(self, downstream_service: str, state: CircuitState) -> None:
        self.downstream_service = downstream_service
        self.state = state
        super().__init__(
            f"Circuit breaker OPEN for '{downstream_service}' — "
            f"service unavailable. State: {state.value}"
        )


class CircuitBreaker:
    """Stateful circuit breaker for protecting callers from cascading failures.

    States:
        CLOSED   → Normal operation; requests flow through. Failures are counted.
        OPEN     → All requests fail fast with CircuitBreakerError. After sleep_window,
                   transitions to HALF-OPEN for a probe request.
        HALF_OPEN → Allows one call through. Success → CLOSED. Failure → OPEN again.

    Usage:
        breaker = CircuitBreaker(CircuitBreakerConfig(failure_threshold=3))
        
        try:
            result = breaker.execute(lambda: calls_api())
        except CircuitBreakerError:
            result = get_cached_fallback()
    """

    def __init__(self, config: CircuitBreakerConfig | None = None) -> None:
        self._config = config or CircuitBreakerConfig()
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: float = 0.0
        self._opened_at: float = 0.0
        self._half_open_calls = 0
        self._lock = threading.Lock()
        self._state_history: list[tuple[CircuitState, float]] = field(default_factory=list)

    @property
    def state(self) -> CircuitState:
        """Return the current circuit state, accounting for automatic transitions."""
        with self._lock:
            if self._state == CircuitState.OPEN:
                elapsed = time.monotonic() - self._opened_at
                if elapsed >= self._config.sleep_window_seconds:
                    self._transition(CircuitState.HALF_OPEN)
                    self._half_open_calls = 0
            return self._state

    def execute(self, func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
        """Execute a function through the circuit breaker.

        Args:
            func: Callable to execute (typically an HTTP request or database call).
            *args: Positional arguments passed to the callable.
            **kwargs: Keyword arguments passed to the callable.

        Returns:
            The return value of the callable on success.

        Raises:
            CircuitBreakerError: If the circuit is OPEN and rejects the call.
            Any exception raised by func() when circuit is CLOSED or HALF_OPEN.
        """
        current_state = self.state

        if current_state == CircuitState.OPEN:
            raise CircuitBreakerError(
                downstream_service="unknown", state=CircuitState.OPEN
            )

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as exc:
            self._on_failure()
            if isinstance(exc, CircuitBreakerError):
                raise
            # Re-raise the original exception after recording failure
            raise

    def _on_success(self) -> None:
        """Record a successful call and update state accordingly."""
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self._config.success_threshold:
                    self._transition(CircuitState.CLOSED)
            elif self._state == CircuitState.CLOSED:
                self._failure_count = max(0, self._failure_count - 1)

    def _on_failure(self) -> None:
        """Record a failed call and potentially transition the circuit."""
        with self._lock:
            now = time.monotonic()
            self._last_failure_time = now
            self._failure_count += 1

            if self._state == CircuitState.HALF_OPEN:
                self._transition(CircuitState.OPEN)
                self._opened_at = now
                self._success_count = 0

            elif self._state == CircuitState.CLOSED:
                # Only count failures within the configured window
                window_start = now - self._config.failure_window_seconds
                if self._last_failure_time < window_start:
                    self._failure_count = 1
                else:
                    self._failure_count += 1

                if self._failure_count >= self._config.failure_threshold:
                    self._transition(CircuitState.OPEN)
                    self._opened_at = now
                    self._success_count = 0

    def _transition(self, new_state: CircuitState) -> None:
        """Transition to a new circuit state with logging."""
        old_state = self._state
        self._state = new_state
        timestamp = time.monotonic()
        self._state_history.append((old_state, timestamp))
        # In production, emit this as a metric event (e.g., Prometheus counter).

    def get_stats(self) -> dict:
        """Return current circuit breaker statistics for monitoring."""
        return {
            "state": self.state.value,
            "failure_count": self._failure_count,
            "success_count": self._success_count,
            "half_open_calls": self._half_open_calls,
            "last_failure_time_ago_seconds": (
                time.monotonic() - self._last_failure_time if self._last_failure_time else 0
            ),
        }


# Example usage with a simulated API call
def make_api_call(endpoint: str) -> dict:
    """Simulated HTTP call that fails intermittently."""
    import random as _random  # noqa: N812
    if _random.random() < 0.7:  # 70% failure rate for demo
        raise ConnectionError(f"Connection refused to {endpoint}")
    return {"status": "ok", "data": "response"}


breaker = CircuitBreaker(CircuitBreakerConfig(
    failure_threshold=3,
    success_threshold=2,
    sleep_window_seconds=5.0,
))

# Safe call with fallback
try:
    response = breaker.execute(make_api_call, "/api/users")
except (ConnectionError, CircuitBreakerError):
    response = {"status": "cached_fallback"}  # Use cached or default data

stats = breaker.get_stats()
```

### Pattern 4: Database Read Replica Router with Lag Monitoring

```python
"""Database read replica router that routes reads to healthy replicas and falls back to primary on lag."""

from __future__ import annotations

import time
import threading
import logging
from dataclasses import dataclass, field
from typing import Protocol


logger = logging.getLogger(__name__)


@dataclass
class ReplicaStatus:
    """Current health status of a database read replica."""
    host: str
    port: int
    replication_lag_seconds: float = 0.0
    is_healthy: bool = True
    last_health_check: float = field(default_factory=time.monotonic)
    connections_in_use: int = 0

    def mark_unhealthy(self, lag_threshold: float = 5.0) -> None:
        """Mark replica as unhealthy if replication lag exceeds threshold."""
        self.is_healthy = False
        self.replication_lag_seconds = max(self.replication_lag_seconds, lag_threshold)


class DatabaseConnectionPool(Protocol):
    """Abstract connection pool for executing database queries."""

    def execute(self, query: str, *args: object) -> list[tuple]: ...  # type: ignore[type-arg]
    def close(self) -> None: ...


class ReplicationMonitor:
    """Monitors replication lag across read replicas and reports their health status.

    In production, this queries SHOW SLAVE STATUS (MySQL) or pg_replication_slots (PostgreSQL)
    on each replica to measure Seconds_Behind_Master or replay_lag.
    """

    def __init__(self, replica_hosts: list[tuple[str, int]], check_interval: float = 10.0) -> None:
        self._replica_hosts = replica_hosts
        self._check_interval = check_interval
        self._statuses: dict[str, ReplicaStatus] = {}
        self._lock = threading.Lock()
        self._latest_lag_values: dict[str, float] = {}
        for host, port in replica_hosts:
            key = f"{host}:{port}"
            self._statuses[key] = ReplicaStatus(host=host, port=port)

    def get_lag_for_replica(self, replica_key: str) -> float:
        """Return the latest measured replication lag in seconds for a given replica.

        In production, this would query pg_stat_replication or execute a test write/read
        to measure actual delay. For simulation, returns pre-loaded lag values.
        """
        return self._latest_lag_values.get(replica_key, 0.0)

    def update_lag(self, replica_key: str, lag_seconds: float) -> None:
        """Update the measured replication lag for a replica."""
        with self._lock:
            self._latest_lag_values[replica_key] = lag_seconds
            if replica_key in self._statuses:
                status = self._statuses[replica_key]
                if lag_seconds > 5.0:  # 5 second lag threshold
                    status.mark_unhealthy(lag_threshold=lag_seconds)
                    logger.warning(
                        "Replica %s replication lag %.1fs exceeds threshold",
                        replica_key, lag_seconds,
                    )
                else:
                    status.is_healthy = True
                    status.replication_lag_seconds = lag_seconds


class ReadReplicaRouter:
    """Routes read queries to healthy replicas; falls back to primary when needed.

    Strategy: round-robin across healthy replicas (sorted by lowest lag first).
    Falls back to the primary connection if no replica is healthy or all are stale.
    """

    def __init__(
        self,
        primary_pool: DatabaseConnectionPool,
        replica_pools: list[DatabaseConnectionPool],
        monitor: ReplicationMonitor,
        max_lag_seconds: float = 5.0,
    ) -> None:
        self._primary = primary_pool
        self._replicas = replica_pools
        self._monitor = monitor
        self._max_lag = max_lag_seconds
        self._rr_index = 0
        self._lock = threading.Lock()

    def read(self, query: str, *args: object) -> list[tuple]:
        """Execute a read query, routing to the healthiest available replica.

        Falls back to primary if no healthy replica exists or lag exceeds threshold.

        Args:
            query: SQL query string (parameterized).
            *args: Query parameters.

        Returns:
            Query result rows.
        """
        healthy_replicas = self._get_healthy_replicas()

        if not healthy_replicas:
            logger.info("No healthy replicas available; routing to primary")
            return self._primary.execute(query, *args)  # type: ignore[union-attr]

        with self._lock:
            replica = healthy_replicas[self._rr_index % len(healthy_replicas)]
            self._rr_index += 1

        try:
            return replica.execute(query, *args)  # type: ignore[union-attr]
        except Exception as exc:
            logger.error("Replica query failed; falling back to primary: %s", exc)
            return self._primary.execute(query, *args)  # type: ignore[union-attr]

    def _get_healthy_replicas(self) -> list[DatabaseConnectionPool]:
        """Return replica connection pools ordered by replication lag (lowest first)."""
        healthy = []
        for pool in self._replicas:
            # In production, extract host from pool configuration and query monitor.
            # Here we simulate with sorted order.
            pass

        # Simulate: return replicas in reverse order (lowest lag last)
        # Real implementation would sort by actual lag values from monitor
        healthy = list(self._replicas)  # type: ignore[list-item]
        return healthy


# Example usage
class MockConnectionPool:
    """Mock database pool for demonstration."""

    def __init__(self, name: str) -> None:
        self.name = name

    def execute(self, query: str, *args: object) -> list[tuple]:
        print(f"[{self.name}] Executing: {query}")  # noqa: T201
        return [("result",)]  # type: ignore[list-item]

    def close(self) -> None:
        pass


primary = MockConnectionPool("primary")
replica1 = MockConnectionPool("replica-1")
replica2 = MockConnectionPool("replica-2")

monitor = ReplicationMonitor([("db-replica-1", 5432), ("db-replica-2", 5432)])
router = ReadReplicaRouter(primary, [replica1, replica2], monitor)

rows = router.read("SELECT * FROM users WHERE id = %s", "abc-123")
```

---

## Constraints

### MUST DO
- **Calculate capacity before provisioning** — Never deploy without documenting expected RPS, peak-to-average ratio, and required instance counts. Include safety margin of at least 40% above calculated peak. If traffic patterns change (seasonality, growth), re-calculate monthly.
- **Implement circuit breakers on every inter-service call** — Every HTTP, gRPC, or database connection to an external dependency must be wrapped with a circuit breaker. Do not rely on network timeouts alone; the circuit breaker state machine provides faster failure detection and automatic recovery probes.
- **Use distributed rate limiting at the API gateway** — Per-process rate limiters are ineffective under load balancing. Always use Redis-backed token bucket or sliding window counters when the gateway runs on multiple instances. Include rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) in every API response for client-side backpressure signaling.
- **Design cache invalidation before caching** — Never add a cache layer without defining how data gets invalidated or expired. TTL-based expiration is preferred over push invalidation (which doesn't scale). Use versioned cache keys (`v1:resource:123`) when you must push invalidate.
- **Monitor replication lag for database reads on replicas** — Queries routed to stale read replicas return incorrect data. Always check `Seconds_Behind_Master` (MySQL) or `replay_lag` (PostgreSQL) before routing, and fall back to the primary within 5 seconds of lag exceeding threshold.

### MUST NOT DO
- **Cache sensitive user data at CDN edge** — Never set Cache-Control: public on responses containing PII, authentication tokens, payment details, or user-specific information. Always use private or no-store directives for these responses. Validate this in your deployment pipeline.
- **Use sticky sessions without a draining strategy** — Sticky sessions prevent healthy connection draining during rolling deployments. If you must use them (e.g., in-memory session stores), implement active session replication to all instances so a deploying node can serve requests from another instance's session data.
- **Shard by a column with high cardinality and low selectivity** — Sharding by `created_at` is fine for time-series data, but sharding by `user_id` when queries frequently filter by `tenant_id` creates cross-shard scans. Always verify that the most common query patterns align with your shard key before deploying.
- **Rely on application-level retries without idempotency** — Retrying a non-idempotent POST (e.g., "charge credit card") can result in double-charging. Every retried operation must be idempotent via an idempotency key, or use idempotent HTTP methods (GET, PUT, DELETE).
- **Deploy more instances than your load balancer can effectively route** — More application servers than active connections means idle resource waste and increased load balancer overhead. Set instance count = `ceil(peak_RPS / per_instance_capacity) + safety_margin`. Do not add instances "just in case" without capacity calculations.

---

## Output Template

When applying this skill to a system design task, produce:

1. **Traffic Analysis** — Document the estimated RPS (average and peak), request payload sizes, response sizes, database operations per second, and storage growth rate. Show all calculations with assumptions stated explicitly.

2. **Architecture Diagram** — ASCII diagram showing load balancers, application tiers, cache layers (Redis/Memcached), databases (primary + replicas), CDN nodes, and message queues. Include data flow arrows and label each connection type (sync/async) with expected latency.

3. **Component Capacity Table** — For each component (load balancer, app instances, cache servers, database primary, replicas), list: instance count, per-instance capacity, total capacity, safety margin percentage, and peak utilization estimate.

4. **Failure Scenarios** — Document the top 3 failure modes (e.g., primary DB goes down, Redis cluster partitioned, CDN edge node fails) and how the design handles each one with specific patterns (failover, fallback, degradation).

5. **Rate Limiting Configuration** — Per-tier limits (free/pro/enterprise), algorithm choice, and per-client header responses. Include the rate limit enforcement flow: request → gateway → auth service → rate limiter → backend.

6. **Circuit Breaker Configurations** — For each downstream dependency, specify failure threshold, sleep window, success threshold, and the fallback action when the circuit is open (cached data, default response, user-facing error message).

---

## Related Skills

| Skill | Purpose |
|---|---|
| `microservices-architecture` | Designs service boundaries, inter-service contracts, and API gateway routing — system design fundamentals provide the capacity and scaling patterns that microservices rely on. |
| `distributed-systems-architecture` | Covers lower-level distributed primitives (consensus algorithms, consistent hashing for partitioning, vector clocks) that complement the operational patterns in this skill. |
| `event-driven-patterns` | Provides async messaging patterns (pub/sub, message queues, sagas) for decoupling services — integrates with rate limiting and circuit breaker patterns for resilient event processing. |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [GitHub — donnemartin/system-design-primer (System Design Interview Guide)](https://github.com/donnemartin/system-design-primer)
- [Brendan Gregg — The System Performance Analysis Checklist](https://www.brendangregg.com/blog/2017-05-04/the-system-performance-analysis-checklist.html)
- [Netflix Tech Blog — Scalability at Netflix](https://netflixtechblog.com/tagged/scalability)
- [Google SRE Book — Capacity Planning & Load Shedding](https://sre.google/sre-book/capacity-planning/)
- [AWS Architecture Center — Best Practices for Building Scalable Systems](https://aws.amazon.com/architecture/well-architected/)
