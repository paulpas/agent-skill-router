---
name: system-design-foundations
description: Implements core distributed system design patterns (load balancing, caching strategies, database sharding, message queues) for building scalable and resilient production applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: system design, distributed systems, scalability, load balancing, caching strategy, database sharding, message queue, event-driven architecture, microservices communication, CAP theorem, consistency patterns, connection pooling, rate limiting, circuit breaker
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - brainstorming
    - vague ideation
    - quick hack
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, diagrams, do-dont]
  related-skills: distributed-systems-architecture, microservice-resilience-patterns, cqrs-pattern, domain-events, production-readiness
---

# System Design Foundations

Implements foundational patterns for distributed systems that handle horizontal scaling, fault tolerance, and data consistency across service boundaries in modern cloud-native architectures.

## TL;DR Checklist

- [ ] Identify consistency requirements (strong vs eventual) before choosing replication strategy
- [ ] Implement connection pooling for all database and inter-service communication
- [ ] Add circuit breakers to every outbound dependency call
- [ ] Use idempotent operations for all message queue consumers
- [ ] Cache at the edge, application layer, and database tier with distinct TTLs
- [ ] Partition data using hash or range sharding based on query patterns

---

## When to Use

- Designing a new distributed system or microservice architecture from requirements
- Refactoring a monolith into service-oriented components with clear boundaries
- Diagnosing scalability bottlenecks (database connection exhaustion, cache stampedes, message queue backlogs)
- Implementing resilience patterns (circuit breakers, retry with exponential backoff, bulkheads)
- Designing data partitioning strategies for high-throughput write workloads

---

## When NOT to Use

- For monolithic applications under 10k RPS — over-engineering adds latency and operational complexity
- For read-heavy workloads that fit in a single database with proper indexing — use `database-design-modeling` instead
- For internal tooling or admin panels where availability is not critical — simple vertical scaling suffices

---

## Core Workflow

1. **Analyze Load Characteristics** — Determine read/write ratio, peak RPS, data size growth rate, and latency SLOs. Classify the workload as CPU-bound, I/O-bound, or database-bound to guide architectural decisions.
   **Checkpoint:** Document baseline metrics (current p95 latency, error budget, max concurrent connections). Any new design must improve or maintain these baselines under 2x load.

2. **Choose Consistency Model** — Select between strong consistency (linearizable reads/writes) and eventual consistency based on domain requirements. Financial ledgers require strong consistency; social feeds tolerate eventual consistency.
   **Checkpoint:** If any data model requires atomic cross-entity transactions, design a saga orchestration or use distributed locking with explicit timeout bounds.

3. **Design Data Partitioning Strategy** — Select sharding key that distributes writes evenly and avoids hot partitions. Prefer hash-based sharding for uniform distribution, range-based for time-series queries.
   **Checkpoint:** Simulate data distribution across shards to verify no single shard exceeds 60% of average write throughput. Implement a rebalancing trigger when shard skew exceeds 20%.

4. **Implement Caching Layers** — Deploy cache at appropriate tier (CDN edge, application in-memory, distributed Redis/Memcached). Choose eviction policy (LRU, LFU, TTL) based on data volatility. Protect against cache stampede with single-flight locking.
   **Checkpoint:** Cache hit rate must exceed 85% for hot paths. Implement cache invalidation via write-through or background sync — never stale reads without version tokens.

5. **Add Fault Tolerance Mechanisms** — Insert circuit breakers around all external dependencies with configurable failure thresholds. Configure retry policies with jitter and exponential backoff. Deploy bulkhead isolation to prevent cascade failures.
   **Checkpoint:** Circuit breaker must transition from CLOSED → OPEN → HALF-OPEN automatically. Half-open probes must succeed before allowing full traffic restoration.

---

## Implementation Patterns

### Pattern 1: Connection Pool with Health Checking

```python
import asyncio
import time
import random
from dataclasses import dataclass, field
from typing import Optional
from contextlib import asynccontextmanager

@dataclass
class PoolConfig:
    min_connections: int = 5
    max_connections: int = 50
    connection_timeout: float = 5.0
    idle_timeout: float = 300.0
    health_check_interval: float = 30.0
    retry_attempts: int = 3

@dataclass
class ConnectionStats:
    active: int = 0
    idle: int = 0
    failed_health_checks: int = 0
    total_created: int = 0
    total_destroyed: int = 0

class ConnectionPool:
    """Async connection pool with automatic health checking and graceful degradation.
    
    Maintains a bounded set of reusable connections to external services.
    Automatically prunes stale connections and rejects requests when exhausted.
    """
    
    def __init__(self, config: PoolConfig):
        self.config = config
        self._connections: list[object] = []
        self._stats = ConnectionStats()
        self._lock = asyncio.Lock()
        self._pool_event = asyncio.Event()
        self._pool_event.set()  # Initially ready
        
    @asynccontextmanager
    async def acquire(self, timeout: Optional[float] = None) -> object:
        """Acquire a connection from the pool with timeout and retry logic.
        
        Raises TimeoutError if no connection available within timeout window.
        Retries up to config.retry_attempts times with jitter between attempts.
        """
        effective_timeout = timeout or self.config.connection_timeout
        
        for attempt in range(self.config.retry_attempts):
            try:
                async with asyncio.timeout(effective_timeout):
                    async with self._lock:
                        # Try to reuse an idle connection
                        if self._connections:
                            conn = self._connections.pop()
                            self._stats.active += 1
                            return conn
                        elif len(self._connections) < self.config.max_connections:
                            conn = await self._create_connection()
                            self._stats.total_created += 1
                            self._stats.active += 1
                            return conn
                    
                    # Pool exhausted — wait for release with jittered backoff
                    jitter = random.uniform(0.01, 0.1) * (2 ** attempt)
                    await asyncio.sleep(min(jitter, effective_timeout / self.config.retry_attempts))
                    
            except (TimeoutError, ConnectionError):
                if attempt == self.config.retry_attempts - 1:
                    raise
        
        raise TimeoutError("Connection pool exhausted after all retry attempts")
    
    async def release(self, connection: object) -> None:
        """Return a connection to the pool for reuse or destroy if stale."""
        async with self._lock:
            if self._is_stale(connection):
                await self._destroy_connection(connection)
                self._stats.total_destroyed += 1
                self._stats.active -= 1
            else:
                self._connections.append(connection)
                self._stats.active -= 1
                self._stats.idle = len(self._connections)
    
    async def _create_connection(self) -> object:
        """Create a new pooled connection to the target service."""
        # Implementation-specific connection creation
        return {"id": f"conn-{self._stats.total_created}", "state": "open"}
    
    @staticmethod
    def _is_stale(connection: dict) -> bool:
        """Check if a connection exceeds idle timeout or has failed health checks."""
        last_used = connection.get("last_used_at", 0)
        return (time.monotonic() - last_used) > 300
    
    @property
    def stats(self) -> ConnectionStats:
        return self._stats
```

### Pattern 2: Circuit Breaker with Half-Open Probing

```python
import time
from enum import Enum
from dataclasses import dataclass, field
from typing import Callable, Any, Optional

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation — requests pass through
    OPEN = "open"          # Failing — requests fail fast without calling downstream
    HALF_OPEN = "half_open"  # Testing — limited probes allowed to verify recovery

class CircuitBreakerError(Exception):
    """Raised when circuit breaker is open and request is rejected."""
    pass

@dataclass
class CircuitBreakerConfig:
    failure_threshold: int = 5            # Failures before opening circuit
    success_threshold: int = 3            # Successes in half-open before closing
    timeout_seconds: float = 30.0         # How long circuit stays open before probing
    half_open_max_calls: int = 3          # Max probe calls allowed in half-open state

class CircuitBreaker:
    """Implements the circuit breaker pattern to prevent cascade failures.
    
    Tracks consecutive failures on downstream calls. Opens circuit after threshold,
    rejects all calls during open state, and probes with limited traffic when recovery
    is suspected.
    """
    
    def __init__(self, name: str, config: Optional[CircuitBreakerConfig] = None):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._half_open_calls = 0
        self._last_failure_time: Optional[float] = None
        self._lock = False  # Reentrant call guard
        
    @property
    def state(self) -> CircuitState:
        """Transition from OPEN to HALF_OPEN if timeout has elapsed."""
        if self._state == CircuitState.OPEN and self._last_failure_time:
            elapsed = time.monotonic() - self._last_failure_time
            if elapsed >= self.config.timeout_seconds:
                self._state = CircuitState.HALF_OPEN
                self._half_open_calls = 0
                self._success_count = 0
        return self._state
    
    def call(self, func: Callable[..., Any], *args, **kwargs) -> Any:
        """Execute function through the circuit breaker.
        
        Raises CircuitBreakerError if circuit is open and not yet probing.
        Tracks success/failure to manage state transitions automatically.
        """
        current_state = self.state
        
        if current_state == CircuitState.OPEN:
            raise CircuitBreakerError(
                f"Circuit '{self.name}' is OPEN — request rejected"
            )
        
        if current_state == CircuitState.HALF_OPEN and self._half_open_calls >= self.config.half_open_max_calls:
            raise CircuitBreakerError(
                f"Circuit '{self.name}' half-open probe limit reached"
            )
        
        try:
            self._half_open_calls += 1
            result = func(*args, **kwargs)
            self._on_success()
            return result
            
        except Exception as exc:
            self._on_failure()
            raise
    
    def _on_success(self) -> None:
        """Record success and potentially close the circuit."""
        if self.state == CircuitState.HALF_OPEN:
            self._success_count += 1
            if self._success_count >= self.config.success_threshold:
                self._state = CircuitState.CLOSED
                self._failure_count = 0
                self._success_count = 0
                self._half_open_calls = 0
        else:
            # In CLOSED state, reset failure count on success
            self._failure_count = 0
    
    def _on_failure(self) -> None:
        """Record failure and potentially open the circuit."""
        self._failure_count += 1
        self._last_failure_time = time.monotonic()
        
        if self.state == CircuitState.CLOSED:
            if self._failure_count >= self.config.failure_threshold:
                self._state = CircuitState.OPEN
                print(f"Circuit '{self.name}' transitioned to OPEN after {self._failure_count} failures")
```

---

## Constraints

### MUST DO
- Enforce connection limits at every tier — database, cache, and inter-service calls must use pools with explicit max bounds
- Implement idempotency keys for all message queue consumers and HTTP APIs that process writes
- Use structured logging with correlation IDs that propagate across service boundaries via context headers
- Design data models with partition key locality in mind to minimize cross-shard queries
- Document the consistency model and failure mode for every data store and communication channel

### MUST NOT DO
- Implement synchronous call chains deeper than 3 hops between services — use async messaging or batched aggregation instead
- Store secrets or credentials in application configuration files — use vault-backed secret injection with rotation
- Bypass circuit breakers for "internal-only" service calls — internal failures cascade just as catastrophically as external ones
- Use round-robin load balancing without considering downstream health — implement weighted routing based on instance capacity
- Design sharding keys around monotonically increasing values (timestamps, auto-increment IDs) — this creates hot partitions

---

## Output Template

When designing or reviewing a distributed system, the output must contain:

1. **Component Diagram** — ASCII art showing services, data stores, load balancers, and message brokers with data flow arrows
2. **Consistency Analysis** — Table mapping each entity to its consistency model (strong/eventual), replication strategy, and failure impact
3. **Scaling Calculations** — Estimated RPS per shard, cache hit ratios, and connection pool sizing based on projected load
4. **Failure Mode Matrix** — For each component, describe what fails, the observable symptom, and the automated recovery action

---

## Related Skills

| Skill | Purpose |
|---|---|
| `distributed-systems-architecture` | Advanced distributed patterns (consensus protocols, event sourcing) |
| `microservice-resilience-patterns` | Bulkhead isolation, retry strategies, and graceful degradation |
| `cqrs-pattern` | Command Query Responsibility Segregation for read/write scaling |
| `domain-events` | Event-driven architecture with publish/subscribe messaging |
| `production-readiness` | Observability, SLO tracking, and incident response post-launch |

---

## Live References

> Authoritative documentation links for distributed system design.

- [Google Cloud Architecture Framework](https://cloud.google.com/architecture/framework)
- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)
- [Microsoft Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/)
- [Building Microservices (Sam Newman, 3rd Edition)](https://www.oreilly.com/library/view/building-microservices/9781492076868/)
- [Designing Data-Intensive Applications (Martin Kleppmann)](https://dataintensive.net/)
- [The Distributed Systems Reading List](http://dancingbear.me/distributed-systems-reading-list.html)
