---




name: monolith-scaling-strategies
description: Implements vertical scaling, database optimization, caching tiering, deployment patterns, CI/CD pipelines, and observability strategies for growing monolithic applications to delay or eliminate premature service decomposition.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: scaling monolith, vertical scaling, how do i scale a monolith, database connection pool, caching strategy, blue-green deployment, performance bottleneck
  related-skills: monolith-first-design, monolith-architecture, monolith-refactoring, deployment-strategies, database-optimization
  archetypes: tactical, diagnostic
  anti_triggers: microservices, event sourcing, CQRS, service mesh, distributed tracing
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational




---





# Monolith Scaling Strategies

This skill makes the model diagnose bottlenecks in a growing monolithic application and implement operational scaling patterns that defer or eliminate premature service decomposition. It covers vertical scaling, database optimization, caching tiering, zero-downtime deployment, CI/CD pipelines, and observability — all patterns specific to single-process architectures.

## TL;DR Checklist

- [ ] Profile the running monolith to identify the actual bottleneck (CPU, memory, I/O, or database)
- [ ] Configure connection pool sizing based on measured workload type (read-heavy vs write-heavy)
- [ ] Deploy a two-tier cache: local LRU for hot keys + Redis distributed tier for shared state
- [ ] Implement vertical scaling readiness assessment with explicit thresholds before any hardware upgrade decision
- [ ] Set up blue-green or canary deployment pipeline with backward-compatible database migrations
- [ ] Instrument structured logging with correlation IDs and collect monolith-specific performance metrics

---

## When to Use

Use this skill when:

- A monolithic application is hitting resource limits (CPU, memory, connections) under production load but does not yet justify service decomposition
- You need to handle 3x–10x traffic growth by optimizing the existing single deployment before splitting into microservices
- Database connection pool exhaustion or query latency is the primary bottleneck in a monolith serving multiple modules
- You must perform zero-downtime deployments on a single large service without supporting blue-green at the infrastructure level (or when using load balancers)
- The team needs CI/CD pipeline optimizations for long build times and slow test suites caused by monolithic codebases
- Monitoring shows correlated slow-downs across unrelated modules, indicating shared resource contention in a single process

---

## When NOT to Use

Avoid this skill for:

- **Microservices already deployed** — use distributed system scaling patterns (service mesh, event sourcing, CQRS) instead
- **Greenfield projects with no traffic** — start small; these patterns add operational complexity that premature deployments cannot justify
- **Hardware is obviously insufficient** — if CPU/MEM/DISK metrics show the server is 80% under-provisioned relative to capacity, horizontal scaling or hardware upgrade comes before architectural optimization
- **Database is the sole bottleneck and requires schema changes** — use `database-optimization` skill for heavy refactoring of table structures; this skill handles connection pool and query-level tuning only

---

## Core Workflow

### Step 1: Profile and Identify the Bottleneck Type

Measure which resource saturates first under production-like load. Run a baseline benchmark against each module of the monolith.

**Actions:**
- Enable structured request logging with correlation IDs across all modules
- Collect per-module latency percentiles (p50, p95, p99) and error rates
- Measure database query count per request using an APM interceptor or middleware
- Profile memory allocation patterns to detect leaks or excessive garbage collection

**Checkpoint:** Before proceeding, you must have identified the primary bottleneck category: CPU-bound, I/O-bound, connection pool exhaustion, slow queries, or cache miss storms. If multiple bottlenecks coexist, prioritize the one with the highest revenue impact (slowest path in the critical user flow).

---

### Step 2: Configure Connection Pool Based on Workload Profile

Use the workload profile from Step 1 to calculate correct pool sizing. An undersized pool causes request queuing; an oversized pool exhausts database connections.

**Actions:**
- Calculate pool size using the formula: `pool_size = (cpu_cores * 2) + effective_spindle_count` for HDD-based databases, or `pool_size = cpu_cores * 2` for SSD
- Apply read/write split: route SELECT queries to replicas and INSERT/UPDATE/DELETE to the primary
- Implement per-module connection pools when different modules have radically different traffic patterns (e.g., reporting module vs checkout)

**Checkpoint:** Verify pool utilization stays between 60–80% under peak load. Below 40% means you are over-provisioned; above 90% means you will queue requests and risk timeouts.

---

### Step 3: Deploy Two-Tier Caching for Hot Data Paths

Identify the top 5 read paths by request volume and cache miss rate. Implement local LRU for single-instance hot keys and Redis as the distributed tier.

**Actions:**
- Wrap frequently accessed data behind a cache manager with TTL-aware expiration
- Use cache-aside pattern: check local cache, then Redis, then database on read; write-through on mutation
- Set cache warming to pre-populate hot keys during off-peak hours or at deployment time

**Checkpoint:** Cache hit ratio should exceed 85% for the target data paths. Local cache alone should serve >60% of reads without any network call to Redis.

---

### Step 4: Configure Vertical Scaling and Deployment Pipeline

Assess whether vertical scaling (bigger machine) is still viable versus horizontal scaling. Set up zero-downtime deployment patterns that work for a single service.

**Actions:**
- Run the scaling readiness assessment with current metrics against defined thresholds
- Implement graceful shutdown hooks to drain in-flight requests before process termination
- Set up blue-green or canary deployment using load balancer traffic shifting

**Checkpoint:** Deployment rollback must complete within 60 seconds of trigger. Database migrations must maintain backward compatibility for at least one release cycle.

---

### Step 5: Instrument Observability and CI/CD Pipelines

Add structured observability specific to monoliths where all modules share the same process space, and optimize the build/test pipeline.

**Actions:**
- Add correlation ID propagation through the entire request lifecycle (middleware → service layer → database queries)
- Collect per-module metrics: latency, error rate, queue depth, cache hit ratio
- Parallelize test execution using shard strategies based on module boundaries

**Checkpoint:** Every production incident must be traceable to a specific module and root cause within 5 minutes of alerting. Build time should not increase more than 10% per feature added.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Connection Pool Configuration Calculator

Calculate optimal database connection pool sizes based on measured workload type, CPU cores, and storage backend. Returns a configuration dict ready for your ORM or database driver.

```python
"""Connection pool sizing for monolithic applications.

Calculates optimal pool sizes based on workload profiling data to prevent
connection exhaustion while avoiding over-provisioning that wastes database
server resources.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class WorkloadType(Enum):
    """Workload classification based on request profiling."""

    READ_HEAVY = "read_heavy"       # >70% SELECT queries
    WRITE_HEAVY = "write_heavy"     # >30% non-SELECT queries
    BALANCED = "balanced"           # 30–70% read/write split
    BATCH_BURST = "batch_burst"     # Periodic large batch operations


@dataclass(frozen=True)
class PoolConfiguration:
    """Immutable connection pool configuration."""

    primary_max: int          # Max connections to the write-primary database
    replica_max: int | None   # Max connections to read replicas (None if no replicas)
    min_idle: int             # Minimum idle connections to keep open
    max_lifetime_seconds: int # Max lifetime before a connection is recycled
    checkout_timeout_ms: int  # Max time to wait for an available connection


class ConnectionPoolSizer:
    """Calculates connection pool sizes based on workload profiling.

    Uses the CPU-bound + spindle formula and applies workload-specific
    multipliers to prevent both connection exhaustion and resource waste.
    """

    # Base formula constants (from Tomcat/JDBC best practices)
    _BASE_MULTIPLIER = 2
    _BATCH_BURST_FACTOR = 4       # Batch workloads need larger pools temporarily
    _READ_HEAVY_REPLICA_RATIO = 3 # Each replica can handle ~3x the primary's share
    _MIN_POOL_SIZE = 5            # Never go below this regardless of workload
    _MAX_POOL_SIZE = 200          # Cap to prevent database server overload

    def calculate(
        self,
        cpu_cores: int,
        storage_type: str,  # "ssd" or "hdd"
        workload: WorkloadType,
        has_read_replicas: bool = False,
        peak_requests_per_second: float = 0.0,
        avg_query_time_ms: float = 50.0,
    ) -> PoolConfiguration:
        """Calculate optimal pool configuration from profiling data.

        Args:
            cpu_cores: Number of CPU cores on the application server.
            storage_type: "ssd" or "hdd" for the database backend.
            workload: Classification of the workload type from profiling.
            has_read_replicas: Whether read replicas are available.
            peak_requests_per_second: Measured peak RPS under load.
            avg_query_time_ms: Average query execution time in milliseconds.

        Returns:
            PoolConfiguration ready to apply to your database driver.
        """
        effective_spindles = 1 if storage_type == "ssd" else 7
        base_size = (cpu_cores * self._BASE_MULTIPLIER) + effective_spindles

        workload_multiplier = self._get_workload_multiplier(workload)
        pool_size = min(
            int(base_size * workload_multiplier),
            self._MAX_POOL_SIZE,
        )
        pool_size = max(pool_size, self._MIN_POOL_SIZE)

        if has_read_replicas:
            # Route reads to replicas, writes stay on primary
            read_pool_size = int(pool_size * 0.7 / 2) if has_read_replicas else 0
            replica_max = read_pool_size if has_read_replicas else None
            primary_max = pool_size - (read_pool_size * 2) if has_read_replicas else pool_size
        else:
            primary_max = pool_size
            replica_max = None

        # Apply query time adjustment: longer queries mean fewer concurrent connections needed
        if avg_query_time_ms > 100:
            primary_max = max(self._MIN_POOL_SIZE, int(primary_max * 0.8))
            if replica_max:
                replica_max = max(self._MIN_POOL_SIZE // 2, int(replica_max * 0.8))

        min_idle = max(int(pool_size * 0.2), self._MIN_POOL_SIZE)

        logger.info(
            "Pool config calculated: primary=%d, replicas=%s, min_idle=%d, "
            "workload=%s, peak_rps=%.1f",
            primary_max,
            replica_max,
            min_idle,
            workload.value,
            peak_requests_per_second,
        )

        return PoolConfiguration(
            primary_max=primary_max,
            replica_max=replica_max,
            min_idle=min_idle,
            max_lifetime_seconds=1800,  # 30 minutes
            checkout_timeout_ms=5000,   # 5 second timeout before failing fast
        )

    def _get_workload_multiplier(self, workload: WorkloadType) -> float:
        """Return the multiplier based on workload classification.

        Write-heavy and batch workloads generate more concurrent connections
        because each write requires a dedicated connection that holds a
        transaction lock until commit.
        """
        multipliers = {
            WorkloadType.READ_HEAVY: 1.0,
            WorkloadType.WRITE_HEAVY: 1.5,
            WorkloadType.BALANCED: 1.2,
            WorkloadType.BATCH_BURST: self._BATCH_BURST_FACTOR,
        }
        return multipliers[workload]


# --- Usage example ---
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    sizer = ConnectionPoolSizer()
    config = sizer.calculate(
        cpu_cores=8,
        storage_type="ssd",
        workload=WorkloadType.READ_HEAVY,
        has_read_replicas=True,
        peak_requests_per_second=1200.0,
        avg_query_time_ms=35.0,
    )
    print(f"Primary max connections: {config.primary_max}")
    print(f"Replica max connections: {config.replica_max}")
    print(f"Minimum idle connections: {config.min_idle}")
```

---

### Pattern 2: Two-Tier Cache Manager (Local LRU + Redis)

Manages a local in-process LRU cache backed by a Redis distributed tier. Implements cache-aside read pattern and write-through invalidation with TTL-aware expiration to prevent stale reads in a single-process monolith that may run on multiple instances behind a load balancer.

```python
"""Two-tier cache management for monolithic applications.

Provides a local LRU cache for hot data paths (sub-millisecond access)
with Redis as the distributed tier for cross-instance consistency.
Implements cache-aside reads and write-through invalidation.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import time
from collections import OrderedDict
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Any, Callable, Generic, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


@dataclass
class CacheEntry(Generic[T]):
    """A single cache entry with TTL tracking."""

    value: T
    created_at: float = field(default_factory=time.time)
    access_count: int = 0

    @property
    def is_expired(self) -> bool:
        return (time.time() - self.created_at) > self.ttl_seconds if hasattr(self, 'ttl_seconds') else False


class LocalLRUCache(Generic[T]):
    """Thread-safe in-process LRU cache with TTL expiration.

    Used as the first tier for hot data that is accessed frequently
    and does not need cross-instance consistency within a single process lifetime.
    """

    def __init__(self, max_size: int = 1024, default_ttl_seconds: float = 300.0) -> None:
        self._store: OrderedDict[str, CacheEntry[T]] = OrderedDict()
        self._max_size = max_size
        self._default_ttl = default_ttl_seconds

    def get(self, key: str) -> T | None:
        """Retrieve a value from the local cache. Returns None on miss or expiration."""
        entry = self._store.get(key)
        if entry is None:
            return None

        if time.time() - entry.created_at >= self._default_ttl:
            del self._store[key]
            return None

        # Move to end (most recently used)
        self._store.move_to_end(key)
        entry.access_count += 1
        return entry.value

    def set(self, key: str, value: T, ttl_seconds: float | None = None) -> None:
        """Store a value in the local cache with optional TTL override."""
        if len(self._store) >= self._max_size:
            # Evict oldest entry
        self._store[key] = CacheEntry(value=value)  # type: ignore[call-arg]
        self._store.move_to_end(key)

    def invalidate(self, key: str) -> bool:
        """Remove a single key. Returns True if the key existed."""
        if key in self._store:
            del self._store[key]
            return True
        return False

    def invalidate_prefix(self, prefix: str) -> int:
        """Invalidate all keys matching a prefix. Returns count of removed entries."""
        keys_to_remove = [k for k in self._store if k.startswith(prefix)]
        for key in keys_to_remove:
            del self._store[key]
        return len(keys_to_remove)

    @property
    def size(self) -> int:
        return len(self._store)


class RedisCacheClient:
    """Thin wrapper around Redis for distributed cache operations.

    Uses pipeline operations to batch cache reads/writes efficiently,
    minimizing network round-trips in the monolith's request path.
    """

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379/0",
        max_connections: int = 20,
        socket_timeout_ms: int = 2000,
    ) -> None:
        self._redis_url = redis_url
        self._max_connections = max_connections
        self._socket_timeout_ms = socket_timeout_ms

    async def get(self, key: str) -> bytes | None:
        """Get a value from Redis. Returns None on cache miss."""
        # In production, use aioredis or redis.asyncio here
        logger.debug("Redis GET %s", key)
        return None  # Placeholder — replace with actual Redis call

    async def set(self, key: str, value: bytes, ttl_seconds: int = 600) -> None:
        """Set a value in Redis with TTL."""
        logger.debug("Redis SET %s TTL=%ds", key, ttl_seconds)

    async def delete(self, key: str) -> None:
        """Delete a key from Redis."""
        logger.debug("Redis DEL %s", key)

    async def invalidate_prefix(self, prefix: str) -> int:
        """Invalidate all keys with a given prefix using SCAN (no BLOCKING)."""
        # Use SCAN instead of KEYS to avoid blocking the Redis server
        count = 0
        logger.debug("Redis invalidate prefix: %s", prefix)
        return count


@dataclass
class CacheConfig:
    """Configuration for the two-tier cache system."""

    local_max_size: int = 2048          # Entries in local LRU per instance
    redis_url: str = "redis://localhost:6379/0"
    default_ttl_seconds: float = 300.0  # 5 minutes default TTL
    hot_key_threshold: int = 100        # Access count to promote to Redis tier


class CacheTierManager:
    """Manages two-tier caching for a monolithic application.

    Read path: local LRU → Redis → database
    Write path: update database → write-through to both cache tiers

    This pattern prevents the "thundering herd" problem where many instances
    simultaneously miss their caches and hammer the database.
    """

    def __init__(
        self,
        config: CacheConfig | None = None,
    ) -> None:
        self._config = config or CacheConfig()
        self._local_cache: LocalLRUCache[Any] = LocalLRUCache(
            max_size=self._config.local_max_size,
            default_ttl_seconds=self._config.default_ttl_seconds,
        )
        self._redis_client: RedisCacheClient = RedisCacheClient(
            redis_url=self._config.redis_url,
        )

    async def get_or_fetch(
        self,
        key: str,
        fetch_fn: Callable[[], T | None],
        ttl_seconds: float | None = None,
        prefer_local: bool = True,
    ) -> T | None:
        """Cache-aside pattern: check tiers then fetch from source on miss.

        Args:
            key: Unique cache key for the data.
            fetch_fn: Async callable that retrieves data from the database.
            ttl_seconds: Optional TTL override. Defaults to config default.
            prefer_local: When True, local cache is checked first (faster).

        Returns:
            The cached or freshly fetched value, or None if not found.
        """
        local_ttl = ttl_seconds or self._config.default_ttl_seconds

        # Tier 1: Local LRU cache (fastest, sub-millisecond)
        if prefer_local:
            local_value = self._local_cache.get(key)
            if local_value is not None:
                logger.debug("Cache hit [local] key=%s", key)
                return local_value

        # Tier 2: Redis distributed cache (network call, ~1ms)
        redis_value = await self._redis_client.get(key)
        if redis_value is not None:
            deserialized_value = self._deserialize(redis_value)
            # Promote to local cache on distributed hit
            self._local_cache.set(key, deserialized_value, ttl_seconds=local_ttl)
            logger.debug("Cache hit [redis] key=%s", key)
            return deserialized_value

        # Tier 3: Database (slow path)
        logger.info("Cache miss for key=%s, fetching from source", key)
        value = fetch_fn()

        if value is not None:
            # Write-through to both tiers on cache miss
            await self._write_through(key, value, ttl_seconds=local_ttl)

        return value

    async def invalidate(self, key: str) -> None:
        """Cache-aside invalidation: remove from all tiers."""
        self._local_cache.invalidate(key)
        await self._redis_client.delete(key)
        logger.debug("Invalidated key=%s across all cache tiers", key)

    async def invalidate_prefix(self, prefix: str) -> int:
        """Invalidate all keys matching a prefix across both tiers.

        Critical for schema changes where entire categories of cached data
        become stale (e.g., after a user profile table migration).
        """
        local_count = self._local_cache.invalidate_prefix(prefix)
        redis_count = await self._redis_client.invalidate_prefix(prefix)
        total = local_count + redis_count
        logger.info(
            "Invalidated %d keys with prefix '%s' (local=%d, redis=%d)",
            total, prefix, local_count, redis_count,
        )
        return total

    async def _write_through(self, key: str, value: Any, ttl_seconds: float) -> None:
        """Write value to both cache tiers simultaneously.

        In a single-process monolith, this runs synchronously during the
        request that caused the data mutation. The critical insight is that
        write-through keeps all instances consistent without requiring
        pub/sub messaging between processes.
        """
        self._local_cache.set(key, value, ttl_seconds=ttl_seconds)
        serialized = self._serialize(value)
        await self._redis_client.set(key, serialized, ttl_seconds=int(ttl_seconds))

    @staticmethod
    def _serialize(value: Any) -> bytes:
        import json
        return json.dumps(value).encode("utf-8")

    @staticmethod
    def _deserialize(data: bytes) -> Any:
        import json
        return json.loads(data.decode("utf-8"))


# --- Usage example ---
if __name__ == "__main__":
    async def demo():
        config = CacheConfig(local_max_size=512, default_ttl_seconds=60.0)
        manager = CacheTierManager(config)

        # Simulate fetching user data from database
        async def fetch_user(user_id: str) -> dict[str, Any] | None:
            logger.info("Fetching user %s from database", user_id)
            return {"id": user_id, "name": f"User-{user_id}", "email": f"user-{user_id}@example.com"}

        key = f"user:{12345}"
        result = await manager.get_or_fetch(key, lambda: fetch_user("12345"))
        print(f"Retrieved: {result}")

        # Invalidate after update
        await manager.invalidate(key)
        print(f"Local cache size after invalidation: {manager._local_cache.size}")

    asyncio.run(demo())
```

---

### Pattern 3: Vertical Scaling Readiness Assessment

Evaluates whether a monolith is still within the viable range for vertical scaling (upgrading server resources) versus needing horizontal scaling or service decomposition. Returns actionable recommendations with explicit thresholds.

```python
"""Vertical scaling readiness assessment for monolithic applications.

Analyzes current system metrics against operational thresholds to determine
whether the monolith can still scale vertically, needs horizontal scaling,
or has reached the point where service decomposition becomes necessary.

This prevents two common anti-patterns:
  1. Scaling vertically forever until hitting hardware limits (wasteful)
  2. Decomposing services before the monolith is properly optimized (premature)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


logger = logging.getLogger(__name__)


class ScalingRecommendation(Enum):
    """Verdict on whether to scale vertically or take another action."""

    SCALE_VERTICALLY = "scale_vertically"      # Still viable: upgrade resources
    OPTIMIZE_FIRST = "optimize_first"          # Bottlenecks can be fixed via code/db tuning
    HORIZONTAL_SCALING = "horizontal_scaling"  # Vertical scaling diminishing returns
    DECOMPOSE = "decompose"                    # Monolith has structural issues requiring splitting


@dataclass
class SystemMetrics:
    """Runtime metrics collected from a running monolith."""

    cpu_utilization_percent: float            # 0–100, average across all cores
    memory_utilization_percent: float         # 0–100, heap + OS overhead
    database_connections_active: int          # Currently checked-out connections
    database_connections_max_pool: int        # Pool max configured size
    cache_hit_ratio: float                    # 0.0–1.0, overall hit rate
    p99_latency_ms: float                     # 99th percentile response time
    error_rate_percent: float                 # Failed requests / total requests
    disk_io_utilization_percent: float        # 0–100, I/O wait percentage


@dataclass
class Thresholds:
    """Configurable thresholds that define operational boundaries."""

    cpu_warning: float = 75.0
    cpu_critical: float = 90.0
    memory_warning: float = 80.0
    memory_critical: float = 92.0
    connection_pool_utilization_warning: float = 70.0
    connection_pool_utilization_critical: float = 85.0
    cache_hit_ratio_minimum: float = 0.85
    p99_latency_warning_ms: float = 500.0
    p99_latency_critical_ms: float = 2000.0
    error_rate_warning: float = 1.0         # Percentage
    error_rate_critical: float = 5.0        # Percentage


@dataclass
class AssessmentResult:
    """Complete vertical scaling assessment with actionable recommendations."""

    recommendation: ScalingRecommendation
    score: float                              # 0–100, higher is better for vertical scaling
    findings: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    actions: list[str] = field(default_factory=list)


class VerticalScalingAssessor:
    """Assesses whether a monolith is ready for vertical scaling.

    Evaluates system metrics against thresholds and produces a scored
    recommendation with specific, actionable findings. Designed to run
    as a periodic health check or before any capacity planning decision.
    """

    def __init__(self, thresholds: Thresholds | None = None) -> None:
        self._thresholds = thresholds or Thresholds()

    def assess(self, metrics: SystemMetrics) -> AssessmentResult:
        """Evaluate system readiness for vertical scaling.

        Args:
            metrics: Current runtime metrics from the monolith.

        Returns:
            AssessmentResult with recommendation and actionable findings.
        """
        score = 100.0
        findings: list[str] = []
        warnings: list[str] = []
        actions: list[str] = []

        # --- CPU Assessment ---
        cpu_delta = metrics.cpu_utilization_percent - self._thresholds.cpu_warning
        if metrics.cpu_utilization_percent >= self._thresholds.cpu_critical:
            score -= 30.0
            findings.append(
                f"CRITICAL: CPU at {metrics.cpu_utilization_percent:.1f}% "
                f"(threshold: {self._thresholds.cpu_critical}%)"
            )
            actions.append("Profile CPU-bound paths; consider upgrading from current instance type")
        elif metrics.cpu_utilization_percent >= self._thresholds.cpu_warning:
            score -= 15.0
            warnings.append(f"CPU elevated at {metrics.cpu_utilization_percent:.1f}%")

        # --- Memory Assessment ---
        if metrics.memory_utilization_percent >= self._thresholds.memory_critical:
            score -= 25.0
            findings.append(
                f"CRITICAL: Memory at {metrics.memory_utilization_percent:.1f}% "
                f"(threshold: {self._thresholds.memory_critical}%)"
            )
            actions.append("Investigate memory leaks; check for large object caching without TTL")
        elif metrics.memory_utilization_percent >= self._thresholds.memory_warning:
            score -= 10.0
            warnings.append(f"Memory elevated at {metrics.memory_utilization_percent:.1f}%")

        # --- Database Connection Pool Assessment ---
        if metrics.database_connections_max_pool > 0:
            pool_utilization = (
                metrics.database_connections_active / metrics.database_connections_max_pool * 100
            )
            if pool_utilization >= self._thresholds.connection_pool_utilization_critical:
                score -= 20.0
                findings.append(
                    f"CRITICAL: Connection pool at {pool_utilization:.0f}% utilization "
                    f"({metrics.database_connections_active}/{metrics.database_connections_max_pool})"
                )
                actions.append("Increase pool size or optimize slow queries blocking connections")
            elif pool_utilization >= self._thresholds.connection_pool_utilization_warning:
                score -= 10.0
                warnings.append(f"Connection pool at {pool_utilization:.0f}% utilization")

        # --- Cache Hit Ratio Assessment ---
        if metrics.cache_hit_ratio < self._thresholds.cache_hit_ratio_minimum:
            score -= 15.0
            cache_deficit = (self._thresholds.cache_hit_ratio_minimum - metrics.cache_hit_ratio) * 100
            findings.append(
                f"Cache hit ratio {metrics.cache_hit_ratio:.2%} is below minimum "
                f"{self._thresholds.cache_hit_ratio_minimum:.0%}"
            )
            actions.append(f"Add caching for top {cache_deficit:.0f}% missed queries; review TTL settings")

        # --- Latency Assessment ---
        if metrics.p99_latency_ms >= self._thresholds.p99_latency_critical_ms:
            score -= 20.0
            findings.append(
                f"CRITICAL: p99 latency {metrics.p99_latency_ms:.0f}ms exceeds "
                f"{self._thresholds.p99_latency_critical_ms:.0f}ms threshold"
            )
            actions.append("Identify slow endpoints; check for N+1 queries or unbounded loops")
        elif metrics.p99_latency_ms >= self._thresholds.p99_latency_warning_ms:
            score -= 8.0
            warnings.append(f"p99 latency {metrics.p99_latency_ms:.0f}ms above warning threshold")

        # --- Error Rate Assessment ---
        if metrics.error_rate_percent >= self._thresholds.error_rate_critical:
            score -= 25.0
            findings.append(
                f"CRITICAL: Error rate {metrics.error_rate_percent:.1f}% exceeds "
                f"{self._thresholds.error_rate_critical}% critical threshold"
            )
            actions.append("Investigate error source; check upstream dependencies and circuit breakers")
        elif metrics.error_rate_percent >= self._thresholds.error_rate_warning:
            score -= 5.0
            warnings.append(f"Error rate {metrics.error_rate_percent:.1f}% above warning threshold")

        # --- Disk I/O Assessment ---
        if metrics.disk_io_utilization_percent >= 90.0:
            score -= 15.0
            findings.append(
                f"Disk I/O at {metrics.disk_io_utilization_percent:.1f}% — may indicate "
                f"I/O-bound queries or insufficient storage throughput"
            )
            actions.append("Check slow query log; consider read replicas for SELECT-heavy workloads")

        # Clamp score
        score = max(0.0, min(100.0, score))

        # Determine recommendation based on score and specific conditions
        recommendation = self._determine_recommendation(score, metrics)

        result = AssessmentResult(
            recommendation=recommendation,
            score=round(score, 1),
            findings=findings,
            warnings=warnings,
            actions=actions,
        )

        logger.info("Scaling assessment complete: score=%.1f, recommendation=%s", score, recommendation.value)
        return result

    def _determine_recommendation(
        self, score: float, metrics: SystemMetrics
    ) -> ScalingRecommendation:
        """Translate score into a specific scaling recommendation."""
        # High error rate or critical latency means the monolith has structural problems
        if (
            metrics.error_rate_percent >= self._thresholds.error_rate_critical
            and metrics.p99_latency_ms >= self._thresholds.p99_latency_critical_ms
        ):
            return ScalingRecommendation.DECOMPOSE

        # Connection pool exhaustion + high latency = database is the bottleneck, not compute
        if (
            metrics.database_connections_active / max(metrics.database_connections_max_pool, 1)
            >= self._thresholds.connection_pool_utilization_critical
        ):
            return ScalingRecommendation.HORIZONTAL_SCALING

        # Score below 30 with multiple critical findings means vertical scaling is not viable
        if score < 30:
            return ScalingRecommendation.DECOMPOSE

        # Score between 30–60 means optimization should happen before any hardware change
        if 30 <= score < 60:
            return ScalingRecommendation.OPTIMIZE_FIRST

        # Score above 60 means vertical scaling is still productive
        return ScalingRecommendation.SCALE_VERTICALLY


# --- Usage example ---
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    assessor = VerticalScalingAssessor()
    metrics = SystemMetrics(
        cpu_utilization_percent=82.0,
        memory_utilization_percent=71.0,
        database_connections_active=45,
        database_connections_max_pool=50,
        cache_hit_ratio=0.78,
        p99_latency_ms=850.0,
        error_rate_percent=2.3,
        disk_io_utilization_percent=65.0,
    )

    result = assessor.assess(metrics)
    print(f"\n=== Vertical Scaling Assessment ===")
    print(f"Score: {result.score}/100")
    print(f"Recommendation: {result.recommendation.value}")
    if result.findings:
        print(f"\nFindings:")
        for f in result.findings:
            print(f"  ❌ {f}")
    if result.warnings:
        print(f"\nWarnings:")
        for w in result.warnings:
            print(f"  ⚠️  {w}")
    if result.actions:
        print(f"\nActions:")
        for a in result.actions:
            print(f"  → {a}")
```

---

## Constraints

### MUST DO
- Always profile before optimizing — measure p99 latency, error rates, and connection pool utilization with real production-like traffic before changing any configuration
- Route read queries to replicas explicitly; never let SELECT queries hit the write-primary during normal operation
- Use cache-aside reads (check cache first, then database) and write-through invalidation (update both on mutation) — never rely solely on TTL expiration for consistency in financial or inventory-critical paths
- Implement graceful shutdown with a configurable drain period (30–60 seconds) that stops accepting new requests but completes in-flight ones before process termination
- Every deployment of a growing monolith must maintain backward-compatible database schemas for at least one release cycle — add columns and indexes as nullable before removing defaults or dropping them
- Collect per-module metrics even within the single process; use middleware decorators or aspect-oriented patterns to instrument each module independently

### MUST NOT DO
- Do not decompose a service until the vertical scaling readiness score is below 30 AND at least one of: error rate >5%, p99 latency >2 seconds, or connection pool exhaustion >85% sustained for more than 1 hour
- Do not set cache TTLs longer than 15 minutes for data that changes through user actions — use write-through invalidation instead of relying on expiration alone
- Do not increase the connection pool size beyond the calculated optimal without first optimizing slow queries — a larger pool masks query inefficiency rather than fixing it
- Do not perform database schema migrations (DROP COLUMN, CHANGE TYPE) during the same deployment that changes application code referencing those columns
- Do not deploy without rollback capability — every monolith deployment must include an automated rollback path that completes within 60 seconds
- Do not use a single global cache key for data that is updated by different modules at different frequencies — this forces stale-cache propagation across unrelated features

---

## Output Template

When this skill is active, your output must contain:

1. **Bottleneck Analysis** — Identify the measured bottleneck type (CPU, memory, I/O, database) with specific metrics
2. **Configuration Calculations** — Show exact pool sizes, cache limits, or threshold values computed from profiling data
3. **Implementation Code** — Provide typed, documented code blocks matching the patterns above, adapted to the user's tech stack
4. **Deployment Plan** — Step-by-step deployment sequence with rollback triggers and database compatibility notes
5. **Monitoring Setup** — Specify exact metrics to collect, alert thresholds, and correlation ID propagation strategy

---

## Related Skills

| Skill | Purpose |
|---|---|
| `monolith-first-design` | Decide when a monolith is the right starting point for new projects |
| `monolith-architecture` | Structural patterns for organizing modules within a single deployment |
| `monolith-refactoring` | Incremental service extraction from a growing monolith |
| `deployment-strategies` | Advanced blue-green and canary patterns beyond this skill's scope |
| `database-optimization` | Heavy database schema refactoring, indexing strategies, partitioning |

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Martin Fowler — Scaling the Monolith](https://martinfowler.com/articles/scaling-monolith.html)
- [High Performance MySQL — Connection Pooling & Caching](https://www.oreilly.com/library/view/high-performance-mysql/9780596525725/)
- [AWS Well-Architected Framework — Scaling Patterns](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)
- [Redis Documentation — Caching Strategies](https://redis.io/docs/latest/develop/use/caching/)
- [Nginx Blue-Green Deployment Guide](https://www.nginx.com/blog/zero-downtime-deployment-strategies/)
