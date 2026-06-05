---




name: caching-architecture
description: Designs multi-level caching strategies (cache-aside, write-through, write-behind, invalidation patterns) for distributed systems with consistency guarantees, TTL management, cache stampede prevention, and monitoring.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: caching strategy, cache-aside pattern, cache invalidation, TTL management, cache stampede, Redis cache, multi-level cache, cache warm-up
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: performance-optimization, database-design-modeling, asyncio-patterns, configuration-management-patterns
  author: https://github.com/openai/skill-router-contributors
  source: https://github.com/paulpas/git/agent-skill-router
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




---





# Caching Architecture

Designs multi-level caching strategies for distributed systems — from L1 in-memory caches to L2 Redis-backed stores — with consistency guarantees, stampede prevention, TTL jittering, and comprehensive monitoring.

## TL;DR Checklist

- [ ] Classify data access pattern (read-heavy, write-heavy, mixed) before choosing cache strategy
- [ ] Always pair TTL with jitter (±10–25%) to prevent thundering herd on expiry
- [ ] Implement stampede prevention (mutex/bloom filter) for every hot key in read-heavy paths
- [ ] Monitor hit/miss ratio per cache level — target ≥80% for L1, ≥60% for L2
- [ ] Define explicit invalidation strategy (event-based preferred over time-based) before deploying

---

## When to Use

Use this skill when:

- Database query latency exceeds acceptable thresholds (>50ms p99) and reads dominate writes
- You need to protect downstream services from traffic spikes during peak loads
- Your application has hot keys accessed thousands of times per second
- You're building a multi-tier caching architecture (L1 in-memory + L2 distributed)
- You need cache invalidation guarantees that keep stale data out of user-facing responses

---

## When NOT to Use

Avoid this skill for:

- Low-traffic applications where cache overhead exceeds benefit (fewer than 100 req/s)
- Data that must be strictly consistent on every read — use database reads with proper indexing instead
- One-time batch jobs that process data sequentially — caching adds complexity without throughput gain
- When your primary bottleneck is CPU-bound computation — cache the result, not the input

---

## Core Workflow

1. **Profile Current Access Patterns** — Measure read/write ratio, key hotness distribution (Pareto analysis), and current latency percentiles. **Checkpoint:** If write ratio exceeds 50%, caching may hurt more than help — prefer query optimization first.

2. **Select Cache Strategy** — Match strategy to access pattern: cache-aside for read-heavy, write-through for consistency-critical writes, write-behind for throughput-critical writes with acceptable staleness. **Checkpoint:** Document the chosen strategy's consistency model (eventual, strong) and acceptability of stale reads.

3. **Implement TTL with Jitter** — Every cached item needs a TTL. Apply random jitter to prevent synchronized expiry storms across all instances. **Checkpoint:** Jitter range should be 10–25% of base TTL; never use static TTL without jitter in distributed systems.

4. **Add Stampede Prevention** — For hot keys, protect against concurrent cache misses flooding the backend. Use distributed locks (Redis SET NX) or probabilistic early expiration with background refresh. **Checkpoint:** Lock timeout must be shorter than the maximum backend execution time to prevent deadlocks.

5. **Deploy Monitoring** — Track hit/miss ratio, eviction rate, memory usage, and latency percentiles per cache level. Set alerts for degradation thresholds. **Checkpoint:** Miss ratio spike (>30% increase) should trigger immediate investigation of application errors.

---

## Implementation Patterns

### Pattern 1: Cache-Aside (Lazy Loading) with Stampede Prevention

The most common pattern. Application reads from cache first; on miss, loads from source and populates the cache. Uses distributed mutex to prevent thundering herd on key expiry.

```python
from __future__ import annotations
import asyncio
import hashlib
import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Generic, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


@dataclass
class CacheStats:
    """Tracks cache performance metrics for monitoring and alerting."""
    hits: int = 0
    misses: int = 0
    writes: int = 0
    evictions: int = 0
    stampede_prevented: int = 0

    @property
    def hit_ratio(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "hits": self.hits,
            "misses": self.misses,
            "hit_ratio": round(self.hit_ratio, 4),
            "writes": self.writes,
            "evictions": self.evictions,
            "stampede_prevented": self.stampede_prevented,
        }


class DistributedLock:
    """Simple Redis-based distributed lock using SET NX with expiry."""

    def __init__(self, redis_client: Any, ttl_ms: int = 5000) -> None:  # type: ignore[unused-ignores]
        self._redis = redis_client  # type: ignore[unused-ignores]
        self._ttl_ms = ttl_ms

    async def acquire(self, key: str, timeout_seconds: float = 10.0) -> str | None:
        """Acquire a lock with unique token. Returns token on success, None on timeout."""
        token = str(uuid.uuid4())
        lock_key = f"lock:{key}"
        expiry_ms = min(int(timeout_seconds * 1000), self._ttl_ms)

        # SET with NX and PX (milliseconds) — atomic operation in Redis
        acquired = await self._redis.set(lock_key, token, nx=True, px=expiry_ms)  # type: ignore[attr-defined]
        if acquired:
            return token

        # Backoff and retry for short-lived locks
        elapsed = 0.0
        while elapsed < timeout_seconds:
            await asyncio.sleep(0.05)
            elapsed += 0.05
            acquired = await self._redis.set(lock_key, token, nx=True, px=expiry_ms)  # type: ignore[attr-defined]
            if acquired:
                return token

        return None

    async def release(self, key: str, token: str) -> bool:
        """Release the lock only if we own it (token-based ownership)."""
        lock_key = f"lock:{key}"
        # Atomic check-and-delete via Lua script to prevent releasing another holder's lock
        lua_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        result = await self._redis.eval(lua_script, 1, lock_key, token)  # type: ignore[attr-defined]
        return bool(result)


class CacheAsideWithStampedePrevention:
    """Cache-aside pattern with distributed mutex-based stampede prevention.

    When a cache miss occurs for a hot key, the first caller acquires a lock,
    loads data from the source, and populates the cache. Subsequent callers
    wait on the lock rather than hitting the backend concurrently.
    """

    def __init__(
        self,
        redis_client: Any,  # type: ignore[unused-ignores]
        ttl_seconds: int = 300,
        ttl_jitter_pct: float = 0.15,
        lock_timeout: float = 5.0,
    ) -> None:
        self._redis = redis_client
        self._ttl = ttl_seconds
        self._jitter_pct = max(0.0, min(ttl_jitter_pct, 0.5))
        self._lock = DistributedLock(redis_client, ttl_ms=int(lock_timeout * 1000))
        self._stats = CacheStats()

    def _compute_effective_ttl(self) -> int:
        """Add random jitter to base TTL to prevent synchronized expiry storms."""
        import random
        jitter_range = int(self._ttl * self._jitter_pct)
        jitter = random.randint(-jitter_range, jitter_range)
        effective = self._ttl + jitter
        return max(effective, 10)  # Minimum 10 seconds

    def _cache_key(self, namespace: str, identifier: str) -> str:
        """Generate a namespaced cache key with hash for consistent bucketing."""
        raw = f"{namespace}:{identifier}"
        return hashlib.sha256(raw.encode()).hexdigest()[:32]

    async def get_or_fetch(
        self,
        namespace: str,
        identifier: str,
        fetch_fn: Any,  # Callable[[], T | None]
    ) -> Any | None:
        """Get value from cache or fetch from source with stampede prevention.

        Args:
            namespace: Logical grouping prefix (e.g., "user", "product")
            identifier: Unique key within the namespace
            fetch_fn: Async callable that returns data or None on not-found

        Returns:
            Cached value, freshly fetched value, or None if source returned None
        """
        cache_key = self._cache_key(namespace, identifier)

        # Attempt 1: Read from cache
        cached = await self._redis.get(cache_key)  # type: ignore[attr-defined]
        if cached is not None:
            self._stats.hits += 1
            return json.loads(cached)

        # Cache miss — acquire lock to prevent stampede
        token = await self._lock.acquire(cache_key, timeout_seconds=self._lock._ttl_ms / 1000)  # type: ignore[attr-defined]
        if token is not None:
            try:
                # Double-check after acquiring lock (another task may have populated it)
                cached = await self._redis.get(cache_key)  # type: ignore[attr-defined]
                if cached is not None:
                    self._stats.stampede_prevented += 1
                    return json.loads(cached)

                # Load from source
                data = await fetch_fn()
                if data is not None:
                    effective_ttl = self._compute_effective_ttl()
                    await self._redis.setex(  # type: ignore[attr-defined]
                        cache_key, effective_ttl, json.dumps(data)
                    )
                    self._stats.writes += 1

            finally:
                await self._lock.release(cache_key, token)
        else:
            # Lock acquisition failed — fall back to direct fetch with exponential backoff
            logger.warning("Stampede lock timeout for key %s, performing direct fetch", cache_key)
            data = await fetch_fn()

        if data is not None:
            self._stats.misses += 1

        return data

    @property
    def stats(self) -> CacheStats:
        return self._stats
```

```python
# ❌ BAD: No stampede protection — thundering herd on cache miss
async def bad_get_user(user_id: str):
    key = f"user:{user_id}"
    cached = await redis.get(key)
    if cached:
        return json.loads(cached)
    # 100 concurrent requests → 100 database queries simultaneously
    user = await db.get_user(user_id)
    await redis.setex(key, 300, json.dumps(user))  # Static TTL — all expire at once
    return user

# ✅ GOOD: Stampede prevention + TTL jitter protect the backend
async def get_user_safe(user_id: str):
    cache = CacheAsideWithStampedePrevention(
        redis_client=redis_pool,
        ttl_seconds=300,
        ttl_jitter_pct=0.15,  # ±45 second jitter on 5-minute TTL
    )

    user = await cache.get_or_fetch(
        namespace="user",
        identifier=user_id,
        fetch_fn=lambda: db.get_user(user_id),
    )
    return user
```

**When to use Cache-Aside:** Read-heavy workloads where the data source (database) is expensive to query. You can tolerate stale reads between cache expiry and next refresh. This is the most common starting pattern for caching.

**When NOT to use Cache-Aside:** Writes are frequent — every write requires explicit cache invalidation, leading to consistency bugs. Use write-through instead when writes dominate and consistency matters.

---

### Pattern 2: Write-Through with Write-Behind Batching

Write-through persists data to both cache and backend synchronously — guarantees consistency at the cost of write latency. Write-behind batches writes for throughput-critical paths.

```python
from __future__ import annotations
import asyncio
import json
import logging
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class PendingWrite:
    """Represents a single pending write operation in the write-behind queue."""
    cache_key: str
    value: bytes
    timestamp: float = field(default_factory=time.monotonic)
    attempt_count: int = 0

    @property
    def age_seconds(self) -> float:
        return time.monotonic() - self.timestamp


class WriteThroughCache:
    """Write-through cache: persist to both cache and backend synchronously.

    Provides strong consistency — reads always return the latest written value.
    Ideal for financial data, inventory counts, or any write-consistent dataset.
    """

    def __init__(
        self,
        redis_client: Any,  # type: ignore[unused-ignores]
        backend_writer: Any,  # Callable[[str, bytes], Awaitable[None]] — type: ignore[unused-ignores]
        ttl_seconds: int = 600,
    ) -> None:
        self._redis = redis_client
        self._backend_writer = backend_writer
        self._ttl = ttl_seconds

    async def set(self, key: str, value: Any) -> None:
        """Write to both cache and backend synchronously."""
        data = json.dumps(value).encode()

        # Write to Redis first (fast operation)
        await self._redis.setex(key, self._ttl, data)  # type: ignore[attr-defined]

        # Write to backend — blocks until confirmed
        await self._backend_writer(key, data)

    async def get(self, key: str) -> Any | None:
        """Read from cache. Since we write through, cache is always current."""
        value = await self._redis.get(key)  # type: ignore[attr-defined]
        if value is None:
            return None
        return json.loads(value)

    async def delete(self, key: str) -> None:
        """Delete from both cache and backend."""
        await self._redis.delete(key)  # type: ignore[attr-defined]
        await self._backend_writer(f"__delete__:{key}", b"")


class WriteBehindBatchProcessor:
    """Processes pending writes in batches for throughput optimization.

    Accumulates writes into a queue and flushes them to the backend in
    configurable batches or time intervals, whichever comes first.
    Cache is updated immediately; backend write is deferred.
    """

    def __init__(
        self,
        redis_client: Any,  # type: ignore[unused-ignores]
        backend_writer: Any,  # type: ignore[unused-ignores]
        batch_size: int = 50,
        flush_interval_seconds: float = 2.0,
        max_retry_attempts: int = 3,
        retry_delay_seconds: float = 1.0,
    ) -> None:
        self._redis = redis_client
        self._backend_writer = backend_writer
        self._batch_size = batch_size
        self._flush_interval = flush_interval_seconds
        self._max_retries = max_retry_attempts
        self._retry_delay = retry_delay_seconds
        self._queue: deque[PendingWrite] = deque()
        self._running = False
        self._stats = {"flushed": 0, "failed": 0, "retried": 0}

    async def enqueue(self, key: str, value: Any) -> None:
        """Queue a write for delayed backend persistence. Cache is updated immediately."""
        data = json.dumps(value).encode()
        await self._redis.setex(key, self._flush_interval * 3, data)  # type: ignore[attr-defined]
        self._queue.append(PendingWrite(cache_key=key, value=data))

        if len(self._queue) >= self._batch_size and not self._running:
            asyncio.create_task(self._flush_loop())

    async def _flush_loop(self) -> None:
        """Background loop that flushes batches at configured intervals."""
        self._running = True
        try:
            while self._queue:
                batch = list(self._queue)[:self._batch_size]
                self._queue.clear()

                if not batch:
                    break

                success = await self._flush_batch(batch)
                if not success and self._queue:
                    # Re-enqueue failed items for retry
                    for pending in batch:
                        pending.attempt_count += 1
                        if pending.attempt_count < self._max_retries:
                            self._stats["retried"] += 1
                            self._queue.append(pending)
                            await asyncio.sleep(self._retry_delay)
                        else:
                            logger.error("Write failed after %d retries: %s", pending.attempt_count, pending.cache_key)
                            self._stats["failed"] += 1

                # Wait for interval before next batch (if queue has new items)
                if self._queue:
                    await asyncio.sleep(self._flush_interval)
        finally:
            self._running = False

    async def _flush_batch(self, batch: list[PendingWrite]) -> bool:
        """Flush a batch of pending writes to the backend. Returns True on success."""
        try:
            # Build bulk write payload
            ops: list[tuple[str, bytes]] = [
                (p.cache_key, p.value) for p in batch
            ]
            await self._backend_writer(ops)  # type: ignore[union-attr]
            self._stats["flushed"] += len(batch)
            return True
        except Exception as e:  # noqa: BLE001 — broad exception is intentional for retry logic
            logger.error("Batch flush failed: %s", e)
            return False

    @property
    def stats(self) -> dict[str, int]:
        return self._stats.copy()
```

```python
# ❌ BAD: Write-behind with no retry — lost writes on failure
async def bad_write_behind(key, value):
    await redis.setex(key, 10, json.dumps(value))  # Cache updated
    # Backend write happens asynchronously with no error handling
    asyncio.create_task(db.bulk_write([(key, value)]))

# ✅ GOOD: Batch processor with retry, monitoring, and bounded queue
processor = WriteBehindBatchProcessor(
    redis_client=redis,
    backend_writer=db.bulk_write,
    batch_size=100,
    flush_interval_seconds=1.0,
    max_retry_attempts=5,
)
await processor.enqueue("order:42", {"status": "confirmed", "total": 99.99})
```

**When to use Write-Through:** Strong consistency between cache and backend is required (financial balances, inventory counts). Read-after-write consistency is non-negotiable for your users.

**When to use Write-Behind:** Write throughput matters more than eventual consistency. You can tolerate seconds of staleness on the backend while gains in write latency are significant (10–100x improvement).

**When NOT to use either:** Your writes are infrequent — direct writes with cache-aside reads provide sufficient performance without write-path complexity.

---

### Pattern 3: TTL Management with Jitter

Prevents synchronized cache expiry storms by randomizing the time-to-live for each cached item. Without jitter, thousands of keys expiring simultaneously creates a thundering herd that can overwhelm your backend.

```python
from __future__ import annotations
import asyncio
import hashlib
import json
import logging
import math
import random
import time
from typing import Any

logger = logging.getLogger(__name__)


class TTLManager:
    """Manages per-key TTL assignment with configurable jitter to prevent synchronized expiry.

    Uses multiple strategies depending on the use case:
    - Random jitter: Simple ±range around base TTL (default)
    - Exponential backoff TTL: Increases TTL based on access frequency
    - Staggered expiry: Distributes expiry times across a window
    """

    def __init__(
        self,
        redis_client: Any,  # type: ignore[unused-ignores]
        default_ttl_seconds: int = 300,
        jitter_pct: float = 0.15,
        min_ttl_seconds: int = 10,
    ) -> None:
        self._redis = redis_client
        self._base_ttl = max(default_ttl_seconds, 1)
        self._jitter_pct = max(0.0, min(jitter_pct, 0.5))
        self._min_ttl = max(min_ttl_seconds, 1)

    def compute_effective_ttl(self, key: str, base_ttl: int | None = None) -> int:
        """Compute TTL with jitter based on key hash for deterministic but distributed expiry.

        Uses the key's hash to generate a consistent jitter value so that all instances
        agree on the same TTL for the same key — important for cache coherency.
        """
        ttl = base_ttl or self._base_ttl
        # Deterministic jitter: hash-based seed ensures consistency across instances
        hash_seed = int(hashlib.md5(key.encode()).hexdigest()[:8], 16)
        jitter_range = int(ttl * self._jitter_pct)

        # Map hash to a value in [-jitter_range, +jitter_range]
        jitter = (hash_seed % (2 * jitter_range + 1)) - jitter_range

        effective = ttl + jitter
        return max(effective, self._min_ttl)

    async def set_with_managed_ttl(
        self, key: str, value: Any, base_ttl: int | None = None
    ) -> int:
        """Set a cache value with managed TTL. Returns the effective TTL used."""
        effective_ttl = self.compute_effective_ttl(key, base_ttl)
        await self._redis.setex(key, effective_ttl, json.dumps(value))  # type: ignore[attr-defined]
        return effective_ttl

    async def extend_ttl(self, key: str, additional_seconds: int = 60) -> bool:
        """Extend an existing key's TTL atomically. Returns True if key existed."""
        result = await self._redis.expire(key, additional_seconds)  # type: ignore[attr-defined]
        if not result:
            logger.warning("Cannot extend TTL for non-existent key: %s", key)
        return bool(result)

    async def set_with_sliding_ttl(
        self, key: str, value: Any, base_ttl: int = 300, read_window: int = 60
    ) -> None:
        """Set a value with sliding TTL — extends expiry on every read within the window.

        Ideal for "hot" data that should persist as long as it's being accessed.
        The key expires only after no reads occur within the last `read_window` seconds.
        """
        await self._redis.setex(key, base_ttl, json.dumps(value))  # type: ignore[attr-defined]

    async def get_with_sliding_ttl(
        self, key: str
    ) -> tuple[Any | None, bool]:
        """Get value and extend TTL if the key is within its read window.

        Returns (value, was_extended) — was_extended indicates if TTL was refreshed.
        """
        ttl_remaining = await self._redis.ttl(key)  # type: ignore[attr-defined]
        if ttl_remaining is None or ttl_remaining <= 0:
            return None, False

        value = await self._redis.get(key)  # type: ignore[attr-defined]
        if value is not None and ttl_remaining < 120:  # Extend if less than 2 minutes left
            await self._redis.expire(key, 300)  # type: ignore[attr-defined]
            return json.loads(value), True

        if value is not None:
            return json.loads(value), False
        return None, False


class ExponentialBackoffTTL:
    """Dynamically increases TTL based on access frequency.

    Popular keys get longer cache lifetimes automatically.
    Cold keys expire quickly to reclaim memory.
    """

    def __init__(
        self,
        base_ttl_seconds: int = 60,
        max_ttl_seconds: int = 3600,
        boost_per_access: float = 1.5,
        decay_threshold: int = 10,
    ) -> None:
        self._base_ttl = max(base_ttl_seconds, 1)
        self._max_ttl = max(max_ttl_seconds, base_ttl_seconds)
        self._boost_factor = boost_per_access
        self._decay_threshold = decay_threshold

    def compute_ttl(self, access_count: int, current_ttl: int | None = None) -> int:
        """Compute TTL based on how many times this key has been accessed.

        Args:
            access_count: Number of successful accesses to this key
            current_ttl: Current remaining TTL (for decay detection)

        Returns:
            Recommended TTL in seconds
        """
        if access_count < self._decay_threshold:
            # Cold key — short TTL to free memory quickly
            return self._base_ttl

        # Warm/hot key — exponential increase with cap
        boosted = int(self._base_ttl * (self._boost_factor ** min(access_count, 20)))
        return min(boosted, self._max_ttl)
```

```python
# ❌ BAD: All keys expire at the same time — thundering herd
async def bad_cache_set(key, value):
    await redis.setex(key, 300, json.dumps(value))  # Everyone expires at T+300s
    # When 1000 keys expire simultaneously → 1000 database queries in one instant

# ✅ GOOD: Deterministic jitter distributes expiry across the TTL window
async def cache_set_safe(key, value):
    ttl_mgr = TTLManager(redis_client=redis, default_ttl_seconds=300, jitter_pct=0.15)
    effective_ttl = await ttl_mgr.set_with_managed_ttl(key, value)
    # Keys with same base TTL now expire at T+260 to T+340 — staggered across instances

# ✅ GOOD: Hot keys automatically get longer cache lifetimes
ttl_policy = ExponentialBackoffTTL(base_ttl_seconds=30, max_ttl_seconds=1800)
for access in range(25):  # Simulate repeated accesses to a hot key
    recommended = ttl_policy.compute_ttl(access_count=access)
    print(f"Access #{access}: TTL = {recommended}s")  # Grows from 30s → caps at 1800s
```

**When to use Jitter:** Every cached item in a distributed system. This is not optional for production systems with multiple application instances sharing the same cache backend.

**When to use Sliding TTL:** Hot data that should persist while actively used but not indefinitely (e.g., session data, API rate-limit counters).

**When NOT to use Jitter:** Single-instance deployments where thundering herd is impossible — deterministic TTL is fine and easier to reason about.

---

### Pattern 4: Cache Invalidation Strategies

Three complementary strategies for keeping cache data fresh: event-based (preferred), time-based (fallback), and reference-counting (for shared resources).

```python
from __future__ import annotations
import asyncio
import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class InvalidationEvent(Enum):
    """Types of cache invalidation events."""
    ENTITY_CREATED = "entity_created"
    ENTITY_UPDATED = "entity_updated"
    ENTITY_DELETED = "entity_deleted"
    BATCH_REFRESH = "batch_refresh"
    DEPENDENCY_CHANGED = "dependency_changed"


@dataclass
class CacheInvalidationMessage:
    """Message published when a cache invalidation event occurs."""
    event_type: InvalidationEvent
    entity_type: str  # e.g., "user", "product", "order"
    entity_id: str | None = None
    pattern: str | None = None  # Wildcard pattern for bulk invalidation (e.g., "user:*")
    timestamp: float = field(default_factory=lambda: time.monotonic())
    source_instance: str = field(default_factory=lambda: f"instance-{asyncio.get_event_loop().get_id()}")  # type: ignore[union-attr]

    @property
    def keys_to_invalidate(self) -> list[str]:
        """Compute cache keys that should be invalidated by this message."""
        if self.entity_type and self.entity_id:
            return [f"{self.entity_type}:{self.entity_id}"]
        elif self.entity_type and self.pattern:
            return []  # Pattern-based — requires SCAN in Redis
        elif self.entity_type:
            return []  # No specific ID or pattern — skip (too broad)
        return []


class InvalidationStrategy(ABC):
    """Base protocol for cache invalidation strategies."""

    @abstractmethod
    async def invalidate(self, message: CacheInvalidationMessage) -> int:
        """Invalidate matching cache keys. Returns number of keys removed.""" ...

    @abstractmethod
    async def subscribe(self, handler: Any) -> None:  # type: ignore[unused-ignores]
        """Subscribe to invalidation events from other instances.""" ...


class EventBasedInvalidator(InvalidationStrategy):
    """Event-driven invalidation: publish an event when data changes, cache subscribers react.

    This is the gold standard for cache consistency — invalidation happens at the exact
    moment data changes, with zero staleness window between write and cache removal.
    """

    def __init__(self, redis_client: Any) -> None:  # type: ignore[unused-ignores]
        self._redis = redis_client
        self._event_stream = "cache:invalidation:stream"
        self._group = "app-instances"
        self._instance_id = f"inst-{id(self)}"

    async def publish(self, message: CacheInvalidationMessage) -> None:
        """Publish an invalidation event to all cache instances."""
        payload = json.dumps({
            "event_type": message.event_type.value,
            "entity_type": message.entity_type,
            "entity_id": message.entity_id,
            "pattern": message.pattern,
            "timestamp": message.timestamp,
            "source": message.source_instance,
        })
        # Use Redis Streams for reliable pub/sub with consumer groups
        await self._redis.xadd(self._event_stream, {"data": payload})  # type: ignore[attr-defined]

    async def invalidate(self, message: CacheInvalidationMessage) -> int:
        """Invalidate specific keys or patterns matching the event."""
        keys = message.keys_to_invalidate
        if not keys:
            return 0

        # For wildcard patterns, use SCAN instead of KEYS (non-blocking)
        deleted = 0
        for key in keys:
            result = await self._redis.delete(key)  # type: ignore[attr-defined]
            deleted += result if result else 0

        logger.info("Invalidated %d keys for event %s.%s", deleted, message.entity_type, message.entity_id)
        return deleted

    async def handle_event(self, raw_message: dict[str, str]) -> int:
        """Handle an invalidation event received from the stream."""
        data = json.loads(raw_message["data"])
        message = CacheInvalidationMessage(
            event_type=InvalidationEvent(data["event_type"]),
            entity_type=data["entity_type"],
            entity_id=data.get("entity_id"),
            pattern=data.get("pattern"),
        )
        return await self.invalidate(message)


class TimeBasedInvalidator(InvalidationStrategy):
    """Time-based (TTL) invalidation with configurable per-key expiry.

    Used as a safety net when event-based invalidation is not feasible.
    All keys have finite lifetimes regardless of data changes.
    """

    def __init__(self, redis_client: Any, default_ttl_seconds: int = 300) -> None:  # type: ignore[unused-ignores]
        self._redis = redis_client
        self._default_ttl = default_ttl_seconds

    async def invalidate_expired(self) -> int:
        """Scan for and remove all expired keys. Note: Redis auto-deletes expired keys,
        so this is mainly useful for counting how many were evicted."""
        info = await self._redis.info("stats")  # type: ignore[attr-defined]
        expired_keys = info.get("expired_keys", 0)  # type: ignore[operator]
        return int(expired_keys)

    async def set_with_ttl(self, key: str, value: Any, ttl_override: int | None = None) -> None:
        """Set a value with explicit TTL."""
        ttl = ttl_override or self._default_ttl
        await self._redis.setex(key, ttl, json.dumps(value))  # type: ignore[attr-defined]


class ReferenceCountingInvalidator(InvalidationStrategy):
    """Reference-counting for shared resources.

    Tracks how many consumers depend on a cached value. Only invalidates when
    the reference count drops to zero — prevents premature eviction of shared data.
    """

    def __init__(self, redis_client: Any) -> None:  # type: ignore[unused-ignores]
        self._redis = redis_client
        self._ref_key_prefix = "__ref:"
        self._data_key_prefix = "data:"

    async def acquire(self, resource_id: str, consumer_id: str) -> int:
        """Acquire a reference to a cached resource. Returns new count."""
        ref_key = f"{self._ref_key_prefix}{resource_id}"
        count = await self._redis.incr(ref_key)  # type: ignore[attr-defined]
        if count == 1:
            await self._redis.expire(ref_key, 3600)  # type: ignore[attr-defined]
        return count

    async def release(self, resource_id: str, consumer_id: str) -> bool:
        """Release a reference. Returns True if the resource should be invalidated."""
        ref_key = f"{self._ref_key_prefix}{resource_id}"
        count = await self._redis.decr(ref_key)  # type: ignore[attr-defined]

        if count <= 0:
            data_key = f"{self._data_key_prefix}{resource_id}"
            await self._redis.delete(data_key)  # type: ignore[attr-defined]
            await self._redis.delete(ref_key)  # type: ignore[attr-defined]
            return True
        return False

    async def invalidate_all(self, resource_id: str) -> None:
        """Force-invalidated a shared resource — clears both data and reference count."""
        ref_key = f"{self._ref_key_prefix}{resource_id}"
        data_key = f"{self._data_key_prefix}{resource_id}"
        await self._redis.delete(ref_key)  # type: ignore[attr-defined]
        await self._redis.delete(data_key)  # type: ignore[attr-defined]
```

```python
# ❌ BAD: No invalidation — stale data persists until TTL expires
def bad_on_user_update(user_id: str, new_data: dict):
    db.update(user_id, new_data)
    # Cache still has old data — users see stale profile until TTL expires (up to 5 min)

# ✅ GOOD: Event-based invalidation at the moment of change
async def on_user_updated(user_id: str, new_data: dict):
    # 1. Update source of truth
    await db.update_user(user_id, new_data)

    # 2. Publish invalidation event immediately
    event = CacheInvalidationMessage(
        event_type=InvalidationEvent.ENTITY_UPDATED,
        entity_type="user",
        entity_id=user_id,
    )
    await invalidator.publish(event)

    # 3. All cache instances receive the event and delete their copy
    # Zero staleness window between write and cache removal
```

**When to use Event-Based:** Data changes are tracked in your application logic. You need near-real-time consistency (sub-second staleness). Multiple services share the same cached data.

**When to use Time-Based:** You cannot instrument invalidation events (third-party data sources, read-only caches). The TTL window is acceptable for your consistency requirements.

**When to use Reference-Counting:** Shared resources accessed by multiple consumers with different cache lifetimes. Prevents one consumer's eviction from affecting others still using the same cached value.

---

### Pattern 5: Multi-Level Caching (L1 In-Memory + L2 Distributed)

Combines fast in-memory caching (L1) with distributed caching (L2/Redis) to minimize latency while maintaining consistency across application instances.

```python
from __future__ import annotations
import asyncio
import json
import logging
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Any, Generic, TypeVar

logger = logging.getLogger(__name__)
T = TypeVar("T")


class InMemoryCache(Generic[T]):
    """Thread-safe L1 in-memory LRU cache with per-key TTL support.

    Uses OrderedDict for O(1) get/set with automatic eviction of least-recently-used entries.
    Suitable for single-process caching before falling back to distributed layer.
    """

    def __init__(
        self,
        max_size: int = 10000,
        default_ttl_seconds: int = 60,
        cleanup_interval_seconds: float = 30.0,
    ) -> None:
        self._cache: OrderedDict[str, dict[str, Any]] = OrderedDict()
        self._max_size = max(max_size, 1)
        self._default_ttl = max(default_ttl_seconds, 1)
        self._cleanup_interval = cleanup_interval_seconds
        self._last_cleanup: float = time.monotonic()
        self._stats = {"hits": 0, "misses": 0, "evictions": 0}

    def get(self, key: str) -> Any | None:
        """Get value from cache. Returns None on miss or expiry."""
        entry = self._cache.get(key)
        if entry is None:
            self._stats["misses"] += 1
            return None

        # Check TTL expiry
        if time.monotonic() > entry["expires_at"]:
            del self._cache[key]
            self._stats["evictions"] += 1
            self._stats["misses"] += 1
            return None

        # Move to end (most recently used) for LRU eviction
        self._cache.move_to_end(key)
        self._stats["hits"] += 1
        return entry["value"]

    def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        """Set value in cache with optional per-key TTL."""
        ttl = (ttl_seconds or self._default_ttl) + random.randint(0, int((ttl_seconds or self._default_ttl) * 0.15)) if ttl_seconds else self._default_ttl + random.randint(0, 9)

        if key in self._cache:
            self._cache.move_to_end(key)

        self._cache[key] = {
            "value": value,
            "expires_at": time.monotonic() + (ttl or self._default_ttl),
        }

        # Evict LRU entries if over capacity
        while len(self._cache) > self._max_size:
            evicted_key, _ = self._cache.popitem(last=False)
            self._stats["evictions"] += 1

    def delete(self, key: str) -> bool:
        """Remove a key from the cache. Returns True if it existed."""
        if key in self._cache:
            del self._cache[key]
            return True
        return False

    @property
    def size(self) -> int:
        return len(self._cache)

    @property
    def stats(self) -> dict[str, int]:
        return self._stats.copy()


class MultiLevelCache(Generic[T]):
    """Multi-level cache combining L1 in-memory + L2 distributed (Redis) cache.

    Read path: L1 → L2 → backend → populate both levels
    Write path: Update backend → invalidate L1 + publish to L2 invalidation stream
    L1 uses probabilistic expiration; L2 uses deterministic TTL with jitter.
    """

    def __init__(
        self,
        redis_client: Any,  # type: ignore[unused-ignores]
        l1_max_size: int = 5000,
        l1_default_ttl_seconds: int = 30,
        l2_default_ttl_seconds: int = 600,
        l2_jitter_pct: float = 0.15,
    ) -> None:
        self._l1 = InMemoryCache(
            max_size=l1_max_size,
            default_ttl_seconds=l1_default_ttl_seconds,
        )
        self._redis = redis_client
        self._l2_ttl = l2_default_ttl_seconds
        self._l2_jitter_pct = l2_jitter_pct
        self._stats = {
            "l1_hits": 0, "l1_misses": 0,
            "l2_hits": 0, "l2_misses": 0,
            "backend_hits": 0,
            "total_requests": 0,
        }

    def _make_key(self, namespace: str, identifier: str) -> str:
        import hashlib
        return f"{namespace}:{hashlib.sha256(f'{namespace}:{identifier}'.encode()).hexdigest()[:16]}"

    async def get(
        self,
        namespace: str,
        identifier: str,
        fetch_fn: Any,  # Callable[[], Awaitable[T | None]] — type: ignore[unused-ignores]
    ) -> T | None:
        """Multi-level read: L1 → L2 → backend.

        Falls through each level on miss. The first successful level is returned.
        On backend fetch, both L1 and L2 are populated for subsequent reads.
        """
        key = self._make_key(namespace, identifier)
        self._stats["total_requests"] += 1

        # Level 1: In-memory cache (fastest — <1ms)
        value = self._l1.get(key)
        if value is not None:
            self._stats["l1_hits"] += 1
            return value

        self._stats["l1_misses"] += 1

        # Level 2: Redis cache (~0.5ms network latency)
        cached = await self._redis.get(key)  # type: ignore[attr-defined]
        if cached is not None:
            self._stats["l2_hits"] += 1
            value = json.loads(cached)
            # Promote to L1 on L2 hit
            self._l1.set(key, value)
            return value

        self._stats["l2_misses"] += 1

        # Level 3: Backend database (~50-200ms)
        value = await fetch_fn()
        if value is not None:
            self._stats["backend_hits"] += 1
            # Populate L1 and L2 for future reads
            l1_ttl = random.randint(15, 45)
            l2_ttl = int(self._l2_ttl + random.uniform(-self._l2_ttl * self._l2_jitter_pct, self._l2_ttl * self._l2_jitter_pct))
            self._l1.set(key, value, ttl_seconds=l1_ttl)
            await self._redis.setex(key, max(l2_ttl, 60), json.dumps(value))  # type: ignore[attr-defined]

        return value

    async def invalidate(self, namespace: str, identifier: str) -> None:
        """Invalidate a key from both cache levels."""
        key = self._make_key(namespace, identifier)
        self._l1.delete(key)
        await self._redis.delete(key)  # type: ignore[attr-defined]

    async def invalidate_pattern(self, namespace: str) -> int:
        """Invalidate all keys matching a namespace pattern.

        L1: iterate and delete in-process.
        L2: use SCAN with pattern match (non-blocking).
        """
        l1_deleted = 0
        for key in list(self._l1._cache.keys()):  # noqa: SLF001 — internal access for namespace filtering
            if key.startswith(f"{namespace}:"):
                self._l1.delete(key)
                l1_deleted += 1

        # L2: SCAN for pattern match (non-blocking alternative to KEYS)
        l2_deleted = 0
        cursor = 0
        while True:
            cursor, keys = await self._redis.scan(cursor, match=f"{namespace}:*", count=100)  # type: ignore[attr-defined]
            if keys:
                l2_deleted += await self._redis.delete(*keys)  # type: ignore[arg-type]
            if cursor == 0:
                break

        return l1_deleted + l2_deleted

    @property
    def stats(self) -> dict[str, Any]:
        combined = {**self._stats}
        combined["l1_current_size"] = self._l1.size
        combined["l1_stats"] = self._l1.stats
        return combined
```

```python
# ❌ BAD: Single-level cache — either too slow (DB only) or inconsistent (Redis only, no L1)
async def bad_get_product(product_id: str):
    # No L1 in-memory — every request hits Redis + network
    cached = await redis.get(f"product:{product_id}")
    if cached:
        return json.loads(cached)
    product = await db.get_product(product_id)
    await redis.setex(f"product:{product_id}", 600, json.dumps(product))
    return product

# ✅ GOOD: Multi-level cache — hot products served from memory in <1ms
ml_cache = MultiLevelCache(
    redis_client=redis_pool,
    l1_max_size=5000,
    l2_default_ttl_seconds=600,
)

product = await ml_cache.get(
    namespace="product",
    identifier=str(product_id),
    fetch_fn=lambda: db.get_product(product_id),
)

# Stats show hit distribution across levels
stats = ml_cache.stats  # {"l1_hits": 8500, "l2_hits": 900, "l2_misses": 600, ...}
```

**When to use Multi-Level:** High-throughput applications where L1 hits alone satisfy ≥70% of reads. Multiple application instances sharing the same data — L2 provides cross-instance consistency.

**When NOT to use Multi-Level:** Single-instance deployments with modest throughput — L2-only is simpler and avoids cache coherency complexity between levels. Memory-constrained environments where L1 overhead exceeds benefit.

---

## Constraints

### MUST DO
- Always apply TTL jitter (±10–25%) to prevent synchronized expiry in distributed systems
- Use Redis Streams or pub/sub for event-based invalidation — never rely on TTL alone
- Monitor hit/miss ratio per cache level and set alerts for degradation (>30% miss spike)
- Implement stampede prevention (distributed lock or probabilistic early refresh) for hot keys
- Keep L1 cache size bounded (`max_size`) with LRU eviction to prevent unbounded memory growth
- Use atomic operations (Lua scripts) for cache coherency-critical reads

### MUST NOT DO
- Never serve stale data without a staleness indicator — always flag or return error on expired caches
- Do not use synchronous writes for write-through when backend latency exceeds 100ms — use write-behind instead
- Do not bypass invalidation events to "speed up" writes — inconsistency bugs are more expensive to fix than latency savings
- Do not use `SCAN` with wide patterns (e.g., `*:*:*:*`) — it blocks Redis and degrades performance for all clients
- Do not cache without monitoring — a cache with no metrics is indistinguishable from a broken one

---

## Output Template

When this skill is active, your output must contain:

1. **Strategy Recommendation** — Which caching strategy fits the access pattern (cache-aside, write-through, write-behind) with justification
2. **TTL Configuration** — Base TTL, jitter range, and per-key overrides with rationale
3. **Implementation Code** — Typed Python classes with full stampede prevention, invalidation logic, or multi-level caching as applicable
4. **Monitoring Plan** — Metrics to track (hit ratio, latency percentiles, eviction rate) and alerting thresholds
5. **Invalidation Strategy** — Which invalidation method (event-based, time-based, reference-counting) and why

---

## Related Skills

| Skill | Purpose |
|---|---|
| `performance-optimization` | Broader performance optimization techniques beyond caching — indexing, query planning, connection pooling |
| `database-design-modeling` | Database schema design to complement caching strategies — denormalization for cache-friendly reads |
| `asyncio-patterns` | Async execution patterns that affect cache lock contention, stampede prevention, and background flush loops |
| `configuration-management-patterns` | Manage TTL values, cache sizes, and strategy selection via externalized configuration |

---

## Live References

> Authoritative documentation links for caching architecture.

- [Redis Documentation — Caching Best Practices](https://redis.io/docs/manual/patterns/)
- [Netflix Pringle: Multi-Level Caching at Scale](https://netflixtechblog.com/pringle-multi-level-caching-at-netflix-a3adef0e4ed3)
- [AWS ElastiCache — Cache-Aside Pattern](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/cache-aside.html)
- [Google Engineering Practices — Caching at Google Scale](https://research.google/pubs/caching-at-google-scale-5-reasons-we-still-use-disk/)
- [Cloudflare Engineering — Cache Invalidation Patterns](https://blog.cloudflare.com/cache-invalidation-best-practices/)
