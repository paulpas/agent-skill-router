---
name: caching-strategies
description: Implements caching strategies (cache-aside, write-through, write-behind,
  multi-tier architecture, stampede prevention) for high-performance data access layers
  with consistency guarantees.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: cache stampede, LRU eviction, write-through, TTL-based, cache invalidation,
    multi-tier cache, thundering herd, how do i speed up my app
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
  related-skills: system-design-fundamentals,data-intensive-systems,performance-optimization
------
# Caching Strategy Architect
Designs and implements high-performance caching layers that balance read speed, write consistency, and memory efficiency. The model evaluates access patterns, data volatility, and failure domains to select the right combination of cache patterns — cache-aside for read-heavy workloads, write-through or write-behind for consistency-sensitive paths, multi-tier architectures for latency-critical systems, and stampede prevention for hot-key resilience.

## TL;DR Checklist
- [ ] Profile read/write ratio before choosing a cache pattern
- [ ] Select TTL based on data staleness tolerance, not arbitrary defaults
- [ ] Implement LRU or LFU eviction with bounded memory footprint
- [ ] Add mutex-based locking or probabilistic early expiration to prevent cache stampede
- [ ] Separate L1 (in-process) from L2 (remote) caches by latency tier
- [ ] Define explicit invalidation strategy per data type (TTL vs. event-driven vs. write-through)
---
## Core Workflow
1. **Profile Access Patterns**: Measure read/write ratio, data staleness tolerance, and hot-key distribution across your dataset. Identify which keys exceed a threshold QPS (e.g., > 100 req/s).   **Checkpoint:** Confirm the dominant access pattern is read-heavy (read/write > 5:1) before defaulting to cache-aside. Write-heavy workloads may need write-through or no cache at all.
2. **Select Primary Cache Pattern** — Map profiled patterns to a strategy:
   - Read-heavy, stale-tolerant → **Cache-Aside (Lazy Loading)**
   - Strong consistency required → **Write-Through**
   - High write throughput acceptable with async durability → **Write-Behind**
   - Mixed workload with latency tiers → **Multi-Tier (L1 + L2 + L3)**
3. **Design Eviction and TTL Strategy** — Choose eviction policy based on access distribution:
   - Zipfian / hot-key dominated → **LRU** or **LFU**
   - Uniform access, bounded lifetime → **TTL-based with sliding window**
   **Checkpoint:** Set cache capacity as a function of available memory. Reserve 20% headroom for growth — never use unbounded caches.
4. **Implement Stampede Prevention** — For any key accessed above 10 QPS, add either mutex-based serialization or probabilistic early expiration to prevent the thundering herd on cache misses.
   **Checkpoint:** Verify that only one background thread regenerates a given hot key while all others wait or serve stale data.
5. **Wire Invalidation and Consistency** — Decide per-data-type: TTL-only for ephemeral data, explicit invalidation (pub/sub or event-based) for strong-consistency domains like user profiles.
   **Checkpoint:** Test that a write followed by a read within your consistency window returns the updated value (or explainable staleness).
6. **Validate Under Load** — Run integration tests simulating worst-case stampede (1000 concurrent requests for one cold key) and measure p99 latency, cache hit rate, and memory usage.
   **Checkpoint:** Hit rate should be stable above 85% under sustained load; no single key should exhaust thread pool or connection pool resources.
---
## Implementation Patterns
### Pattern 1: Cache-Aside (Lazy Loading) with Stampede Prevention
The application checks the cache first; on miss, it loads from the data source and populates the cache. The BAD example demonstrates a classic thundering herd vulnerability where concurrent misses all hit the database simultaneously.
```python
import threading
import time
from typing import Optional, Any


class CacheAsideWithProtection:
    """Thread-safe cache-aside pattern with mutex-based stampede prevention.

    On cache miss, only one thread loads data from the source while others
    wait and receive either the freshly loaded value or a stale fallback.
    """

    def __init__(self, ttl_seconds: float = 300.0, max_size: int = 10_000):
        self._cache: dict[str, tuple[Any, float]] = {}
        self._lock = threading.RLock()
        self._locks: dict[str, threading.Lock] = {}
        self._ttl = ttl_seconds
        self._max_size = max_size

    def get(self, key: str, loader) -> Any:
        """Return cached value or load via loader(key) with stampede protection.

        Args:
            key: The cache key to look up.
            loader: Callable that accepts a key and returns the data from source.

        Returns:
            The loaded data value.

        Raises:
            ValueError: If the loader is not callable.
        """
        if not callable(loader):
            raise ValueError("loader must be a callable accepting a single key argument")

        # Fast path: check local cache under shared lock
        with self._lock:
            entry = self._cache.get(key)
            if entry is not None:
                value, expiry = entry
                if time.monotonic() < expiry:
                    return value
                else:
                    del self._cache[key]

        # Slow path: ensure only one thread loads per key
        per_key_lock = self._get_or_create_lock(key)
        with per_key_lock:
            # Double-check after acquiring per-key lock — another thread may have loaded
            with self._lock:
                entry = self._cache.get(key)
                if entry is not None and time.monotonic() < entry[1]:
                    return entry[0]

            value = loader(key)
            self._evict_if_needed()
            with self._lock:
                self._cache[key] = (value, time.monotonic() + self._ttl)

        return value

    def _get_or_create_lock(self, key: str) -> threading.Lock:
        """Get or create a per-key lock for stampede prevention."""
        with self._lock:
            if key not in self._locks:
                self._locks[key] = threading.Lock()
            return self._locks[key]

    def _evict_if_needed(self) -> None:
        """Evict oldest entries when cache exceeds capacity."""
        while len(self._cache) > self._max_size:
            evicted_key, _ = next(iter(self._cache.items()))
            del self._cache[evicted_key]

    def invalidate(self, key: str) -> None:
        """Remove a single key from the cache immediately."""
        with self._lock:
            self._cache.pop(key, None)

    def clear(self) -> None:
        """Wipe entire cache."""
        with self._lock:
            self._cache.clear()
```

**BAD vs. GOOD — Stampede Vulnerability:**
```python
# ❌ BAD: No stampede prevention — 1000 concurrent misses = 1000 database hits
class BadCacheAside:
    def __init__(self, ttl_seconds: float = 300.0):
        self._cache: dict[str, tuple[Any, float]] = {}
        self._ttl = ttl_seconds

    def get(self, key: str, loader) -> Any:
        """Thundering herd on every cache miss for hot keys."""  
        # No mutex — multiple threads all call loader(key) simultaneously
        if key in self._cache:
            value, expiry = self._cache[key]
            if time.monotonic() < expiry:
                return value

        # Every concurrent thread misses and calls the expensive loader
        value = loader(key)  # DB hit — N times for one key
        self._cache[key] = (value, time.monotonic() + self._ttl)
        return value


# ✅ GOOD: Per-key mutex serializes loads; other threads wait or use stale data
# See CacheAsideWithProtection.get() above
```
---
### Pattern 2: Write-Through with Synchronous Dual Writes
Write-Through ensures the cache and backing store are always in sync by writing to both simultaneously. The BAD example shows a common mistake where write-through becomes a performance bottleneck because the application blocks on both writes sequentially without atomicity guarantees.
```python
import logging
from typing import Any

logger = logging.getLogger(__name__)


class WriteThroughCache:
    """Write-through cache that keeps backing store in sync on every mutation.

    Every write propagates synchronously to both the in-memory cache and
    the persistent backing store, guaranteeing strong consistency at the
    cost of higher write latency.
    """

    def __init__(self,
        backing_store: Any,
        ttl_seconds: float = 600.0,
        max_size: int = 50_000,
    ):
        self._backing_store = backing_store
        self._cache: dict[str, tuple[Any, float]] = {}
        self._lock = threading.RLock()
        self._ttl = ttl_seconds
        self._max_size = max_size

    def put(self, key: str, value: Any) -> None:
        """Write to both cache and backing store atomically (within single-thread scope).

        Args:
            key: The cache/store key.
            value: The data to persist.
        """
        # Write to backing store first — if this fails, never update cache
        try:
            self._backing_store.put(key, value)
        except Exception as exc:
            logger.error("Write-through failed for key=%s: %s", key, exc)
            raise

        # Only update in-memory cache after backing store confirms durability
        with self._lock:
            self._evict_if_needed()
            self._cache[key] = (value, time.monotonic() + self._ttl)

    def get(self, key: str) -> Optional[Any]:
        """Return cached value if present and not expired."""
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            value, expiry = entry
            if time.monotonic() >= expiry:
                del self._cache[key]
                return None
            return value

    def invalidate(self, key: str) -> None:
        """Remove from both cache and backing store."""
        with self._lock:
            self._cache.pop(key, None)
        self._backing_store.delete(key)

    def _evict_if_needed(self) -> None:
        while len(self._cache) > self._max_size:
            evicted_key, _ = next(iter(self._cache.items()))
            del self._cache[evicted_key]


class FakeBackingStore:
    """Mock backing store for testing write-through behavior."""

    def __init__(self) -> None:
        self._store: dict[str, Any] = {}

    def put(self, key: str, value: Any) -> None:
        self._store[key] = value

    def get(self, key: str) -> Optional[Any]:
        return self._store.get(key)

    def delete(self, key: str) -> None:
        self._store.pop(key, None)
```
**BAD vs. GOOD — Write-Through Consistency:**
```python
# ❌ BAD: Writes to cache first, backing store second — inconsistent on failure
class BadWriteThrough:
    def put(self, key: str, value: Any) -> None:
        self._cache[key] = value  # Cache updated...
        try:
            self.db.put(key, value)  # ...but DB write may fail
        except Exception:
            pass  # Swallowed — cache says data exists, DB does not


# ✅ GOOD: Backing store writes first; in-memory only updates after confirmation
# See WriteThroughCache.put() above — fails fast if backing store rejects the write
```
---
### Pattern 3: Write-Behind (Async Cache-Aside with Batched Flush)
Write-Behind acknowledges the write to the caller immediately, buffers mutations, and flushes them asynchronously in batches. The BAD example demonstrates a memory leak scenario where buffered writes accumulate without any flushing strategy.
```python
import asyncio
from collections import deque
from typing import Any


class WriteBehindCache:
    """Write-behind cache with asynchronous batched flush to backing store.

    Writes are acknowledged immediately and buffered. A background task
    flushes accumulated mutations to the backing store in configurable
    batches or at a maximum time interval — whichever comes first.
    """

    def __init__(self,
        backing_store: Any,
        flush_interval_seconds: float = 1.0,
        batch_size: int = 100,
    ):
        self._backing_store = backing_store
        self._buffer: deque[tuple[str, Any]] = deque(maxlen=50_000)
        self._flush_interval = flush_interval_seconds
        self._batch_size = batch_size

    async def put(self, key: str, value: Any) -> None:
        """Buffer a write; caller returns immediately without waiting for persistence."""
        self._buffer.append((key, value))
        if len(self._buffer) >= self._batch_size:
            await self._flush()

    async def flush(self) -> None:
        """Flush all buffered writes to the backing store atomically in one batch."""
        if not self._buffer:
            return

        batch = list(self._buffer)
        self._buffer.clear()

        try:
            # Batch write — single round trip to backing store
            for key, value in batch:
                self._backing_store.put(key, value)
        except Exception as exc:
            logger.error("Write-behind flush failed, re-queueing %d items", len(batch))
            self._buffer.extendleft(reversed(batch))
            raise

    def get_buffered_count(self) -> int:
        return len(self._buffer)

    async def drain(self) -> None:
        """Drain all remaining buffered writes (call during shutdown)."""
        while self._buffer:
            await self.flush()
```
**BAD vs. GOOD — Write-Behind Safety:**
```python
# ❌ BAD: No flush strategy — buffer grows unbounded until OOM
class BadWriteBehind:
    def __init__(self):
        self._buffer = []  # Unbounded list, never flushed

    def put(self, key: str, value: Any) -> None:
        self._buffer.append((key, value))
        # No flush logic — data is lost on process restart


# ✅ GOOD: Bounded buffer with batch size threshold and shutdown drain
# See WriteBehindCache above — deque(maxlen=50_000) caps memory; flush() drains explicitly
```
---
### Pattern 4: LRU Eviction Policy (Bounded In-Process Cache)
Least Recently Used eviction discards the oldest accessed entries when capacity is reached. Below, we show both a simple dictionary-based approach and a proper doubly-linked-list implementation that guarantees O(1) operations.
**BAD vs. GOOD — LRU Implementation:**
```python
# ❌ BAD: O(n) removal on eviction — scans entire dict to find least recently used
class BadLRUCache:
    def __init__(self, capacity: int = 100):
        self._cache: dict[str, Any] = {}
        self._capacity = capacity

    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            return self._cache[key]
        return None

    def put(self, key: str, value: Any) -> None:
        self._cache[key] = value
        # O(n): finds and removes arbitrary old item — no real LRU logic
        if len(self._cache) > self._capacity:
            evicted_key = next(iter(self._cache))
            del self._cache[evicted_key]


# ✅ GOOD: Doubly-linked list + hash map for O(1) get, put, and eviction
class LRUCache:
    """Least Recently Used cache with O(1) operations via doubly-linked list."""

    class _Node:
        __slots__ = ("key", "value", "prev", "next")

        def __init__(self, key: str, value: Any) -> None:
            self.key = key
            self.value = value
            self.prev: LRUCache._Node | None = None
            self.next: LRUCache._Node | None = None

    def __init__(self, capacity: int) -> None:
        if capacity <= 0:
            raise ValueError("LRU capacity must be positive")

        self._capacity = capacity
        self._cache: dict[str, LRUCache._Node] = {}

        # Sentinel head and tail to eliminate boundary checks
        self._head = self._Node("", "")  # Most recently used side
        self._tail = self._Node("", "")  # Least recently used side
        self._head.next = self._tail
        self._tail.prev = self._head
        self._size = 0

    def get(self, key: str) -> Optional[Any]:
        """Retrieve value and move node to MRU position in O(1)."""
        if key not in self._cache:
            return None
        node = self._cache[key]
        self._move_to_head(node)
        return node.value

    def put(self, key: str, value: Any) -> None:
        """Insert or update key, evicting LRU node if at capacity."""
        if key in self._cache:
            node = self._cache[key]
            node.value = value
            self._move_to_head(node)
        else:
            node = self._Node(key, value)
            self._cache[key] = node
            self._add_to_head(node)
            self._size += 1

            if self._size > self._capacity:
                evicted = self._remove_tail()
                del self._cache[evicted.key]
                self._size -= 1

    def _add_to_head(self, node: _Node) -> None:
        node.prev = self._head
        node.next = self._head.next
        self._head.next.prev = node
        self._head.next = node

    def _move_to_head(self, node: _Node) -> None:
        self._remove_node(node)
        self._add_to_head(node)

    def _remove_node(self, node: _Node) -> None:
        prev_node = node.prev
        next_node = node.next
        if prev_node:
            prev_node.next = next_node
        if next_node:
            next_node.prev = prev_node

    def _remove_tail(self) -> _Node:
        node = self._tail.prev
        self._remove_node(node)
        return node
```
---
### Pattern 5: TTL-Based Eviction with Sliding Expiration
TTL (Time-to-Live) expires entries after a configurable duration. The BAD example uses lazy expiration only on read, which means stale data can persist indefinitely if the key is never accessed again. The GOOD example adds proactive background cleanup alongside lazy checks.
```python
class TTLCache:
    """Cache with TTL-based expiration and optional proactive cleanup.

    Each entry stores an absolute expiry timestamp. On read, expired entries
    are lazily evicted. A separate periodic sweeper can clean stale entries
    proactively to free memory regardless of access patterns.
    """

    def __init__(self, default_ttl_seconds: float = 60.0) -> None:
        self._cache: dict[str, tuple[Any, float]] = {}
        self._lock = threading.RLock()
        self._default_ttl = default_ttl_seconds
        self._sweep_interval = default_ttl_seconds * 2

    def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: float | None = None,
    ) -> None:
        """Store a value with its TTL expiry timestamp."""
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
        expiry = time.monotonic() + ttl
        with self._lock:
            self._cache[key] = (value, expiry)

    def get(self, key: str) -> Optional[Any]:
        """Return value if present and not expired; lazily evict on miss."""
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            value, expiry = entry
            if time.monotonic() >= expiry:
                del self._cache[key]
                return None
            return value

    def sweep(self) -> int:
        """Remove all expired entries. Returns count of evicted items."""
        now = time.monotonic()
        with self._lock:
            expired_keys = [
                k for k, (_, expiry) in self._cache.items() if now >= expiry
            ]
            for key in expired_keys:
                del self._cache[key]
            return len(expired_keys)

    def remaining_ttl(self, key: str) -> Optional[float]:
        """Return seconds until this key expires, or None if not found/expired."""
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            _, expiry = entry
            remaining = expiry - time.monotonic()
            if remaining <= 0:
                del self._cache[key]
                return None
            return remaining
```
**BAD vs. GOOD — TTL Consistency:**
```python
# ❌ BAD: Lazy eviction only; allows stale keys to persist indefinitely
class BadTTLCache:
    def __init__(self, default_ttl: float = 60):
        self._cache = {}  # Store without expiry

    def set(self, key: str, value: Any):
        self._cache[key] = value  # No expiry; entries remain forever

    def get(self, key: str) -> Optional[Any]:
        return self._cache.get(key)  # Eviction happens on access only


# ✅ GOOD: Combines lazy eviction with proactive sweeps — safety net against stale entries
# See TTLCache above for dual expiry strategies.
```
---
## Constraints
### MUST DO
- Bound every cache instance with a maximum capacity — never use unbounded in-memory stores
- Implement stampede prevention (mutex-based locking or probabilistic early expiration) for any key exceeding 50 QPS
- Use TTL based on data staleness tolerance, not arbitrary defaults — profile your domain's consistency requirements
- Separate L1 (process-local) and L2 (remote) caches by latency tier with clear read/write semantics
- Implement proactive sweep/cleanup in addition to lazy eviction to reclaim memory from keys no longer accessed
- Log cache hit/miss ratios and p99 read latency as operational metrics for capacity planning
- Fail fast on backing store errors during write-through — do not silently corrupt cache state
- Use per-key locking (not a global lock) for stampede prevention to maintain concurrency at scale
### MUST NOT DO
- Never serve stale data beyond the configured TTL without explicit caller consent — freshness is part of the contract
- Do not use cache-aside as the sole strategy for write-heavy workloads (write ratio > 1:3 read:write)
- Never skip backing store durability on write-through — cache must never be ahead of persistent storage
- Do not rely solely on lazy TTL expiration — stale keys accumulate in memory without proactive sweep
- Never place a global mutex around the entire cache get() path — it serializes all reads and defeats the purpose
- Do not hardcode TTL values; parameterize per data type (e.g., session data = 30 min, product catalog = 6 hours)
---
## Output Template
When designing or reviewing a caching strategy, produce:
1. **Access Pattern Summary** — Read/write ratio, estimated QPS per key tier, and hot-key count
2. **Selected Strategy** — Primary cache pattern (cache-aside / write-through / write-behind) with justification based on the access profile
3. **Eviction Policy** — LRU / LFU / TTL with capacity sizing rationale and memory estimate
4. **Stampede Prevention Plan** — Locking strategy or early expiration approach for keys above 50 QPS
5. **Tier Architecture** — L1/L2/L3 breakdown with latency targets per tier
6. **Invalidation Strategy** — TTL values, event-driven invalidation triggers, and consistency model (eventual vs. strong)
7. **Failure Mode Analysis** — What happens when L2 is unreachable; fallback behavior; circuit breaker thresholds
---
## Live References
> Authoritative documentation and research for caching architecture, eviction policies, and distributed cache systems.
