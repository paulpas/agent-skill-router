---
name: memoization-cache-patterns
description: Implements application-level caching and memoization patterns (LRU/LFU caches, TTL strategies, cache invalidation, write-through/write-back, stampede prevention) for performance optimization in Python systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: memoization, cache pattern, LRU cache, LFU cache, cache invalidation, TTL strategy, write-through, cache stampede, function decorator, how do i speed up slow functions
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: framework-performance-tuning, software-error-handling, observability-patterns, pydantic-models
---

# Memoization & Cache Patterns

Implements production-grade caching and memoization strategies to eliminate redundant computation and I/O. When active, this skill makes the model design cache layers with correct invalidation semantics, choose between in-memory and distributed caches based on access patterns, prevent stampedes with mutex-based serialization, and implement write-through or write-back strategies that match consistency requirements. Grounded in SOLID principles — the Open/Closed Principle ensures cache implementations are swappable without changing calling code, and the Single Responsibility Principle isolates caching logic into dedicated layers.

## TL;DR Checklist

- [ ] Choose cache type (memoization vs LRU vs LFU) based on access pattern: uniform = LRU, zipfian = LFU
- [ ] Set TTL with jitter to prevent thundering herd on expiry
- [ ] Implement stampede prevention (singleflight/mutex) for every expensive cached lookup
- [ ] Tag cache keys with version prefixes when data schema changes
- [ ] Instrument hit/miss rate and evict count — optimize only what metrics show is hot
- [ ] Use `functools.lru_cache` for pure function memoization; build custom caches for stateful or distributed needs

---

## When to Use

Use this skill when:

- Designing a cache layer for a frequently-read but slowly-computed function (database query, API call, expensive calculation)
- Choosing between LRU and LFU eviction policies based on observed access distribution
- Implementing cache invalidation when underlying data changes (event-based, time-based, or versioned keys)
- Preventing stampede/thundering herd when a cached value expires and multiple requests arrive simultaneously
- Deciding between write-through and write-back strategies for a caching layer behind a database
- Optimizing a hot path where the same computation runs repeatedly with identical arguments

---

## When NOT to Use

Avoid this skill for:

- Functions that are already O(1) or microsecond-fast — cache overhead exceeds any benefit
- Data that changes every request (e.g., real-time stock tick data without aggregation) — no reuse exists
- Stateful computations where side effects must occur on every invocation (caching hides the side effect)
- Environments with strict memory limits and no eviction policy configured — unbounded caches cause OOM
- Cross-process coordination needs solved by a message queue — don't confuse caching with pub/sub

---

## Core Workflow

1. **Profile Before Caching** — Identify the actual bottleneck using timing or profiling data. Measure the raw cost of the computation (no cache), then estimate cache hit rate from call frequency and argument distribution. **Checkpoint:** Only proceed to cache design if the function executes more than 10 times per second with repeated identical inputs, or if each invocation costs more than 50ms.

2. **Select Cache Type** — Match the cache strategy to the access pattern:
   - Uniform access (all keys equally likely) → LRU eviction
   - Zipfian access (few hot keys, many cold) → LFU eviction
   - Pure function with identical arguments → simple memoization dict or `functools.lru_cache`
   - Cross-process needs (multi-worker web app) → distributed cache (Redis, Memcached)
   **Checkpoint:** The selected type must be explicitly justified by access pattern evidence, not assumed.

3. **Design Key Structure** — Choose key components that uniquely identify the computation result. Use a versioned prefix when data schema changes. For multi-argument functions, use a canonicalized tuple of sorted keyword arguments plus positional args. **Checkpoint:** Every cache key must produce identical bytes for equivalent calls; non-deterministic key generation causes silent cache misses.

4. **Implement TTL + Jitter** — Set a maximum lifetime on every cached entry to prevent stale data from persisting forever. Add random jitter (10–20% of TTL) to stagger expiry across keys and avoid thundering herd. **Checkpoint:** No cached entry may live beyond `max_ttl + jitter_max` seconds without explicit re-validation.

5. **Add Stampede Prevention** — For every cache lookup that could miss during high traffic, wrap the computation in a mutex/singleflight guard so only one thread computes while others wait. **Checkpoint:** Verify that at least 2 concurrent requests hitting a cold key result in exactly one underlying computation, not N.

6. **Plan Invalidations** — Define how cached data becomes stale and must be evicted:
   - Time-based (TTL expiry) — always present as a safety net
   - Event-based (on write/update) — explicit `cache.delete(key)` on mutations
   - Versioned keys — increment version number in key when schema changes, all old keys become cold
   **Checkpoint:** Every data mutation path must have a corresponding invalidation call. A missing invalidation is a bug, not an optimization.

7. **Instrument and Monitor** — Add metrics: hit count, miss count, evict count, average latency with/without cache. **Checkpoint:** Production code must expose at minimum `cache_hits`, `cache_misses`, and `cache_evictions` as counters or gauges.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Simple Memoization Decorator (for Pure Functions)

For pure functions where identical arguments always produce identical results, use a decorator-based memoization that stores results keyed by function arguments. This is the simplest cache and has zero staleness concerns because the output is deterministic by definition.

```python
from __future__ import annotations
import functools
import hashlib
import threading
from typing import Any, Callable, TypeVar

F = TypeVar("F", bound=Callable[..., Any])


def memoize(
    func: F,
    max_size: int | None = 128,
) -> F:
    """Memoize a pure function with LRU eviction.

    Identical argument tuples return cached results without re-execution.
    Uses functools.lru_cache for maximum compatibility and correctness.

    Args:
        func: The pure function to memoize.
        max_size: Maximum number of cached entries (None = unbounded).

    Returns:
        Wrapped function with caching behavior.
    """
    if max_size is None:
        return functools.cache(func)  # type: ignore[return-value]
    return functools.lru_cache(maxsize=max_size)(func)


# Usage — expensive Fibonacci becomes O(n) instead of O(2^n):
@memoize(max_size=256)
def fibonacci(n: int) -> int:
    """Compute the nth Fibonacci number with memoization."""
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

### Pattern 2: Full LRU Cache with TTL, Jitter, and Metrics (BAD vs. GOOD)

A production cache must handle expiration, eviction, and observability — not just storage and retrieval.

```python
# ❌ BAD: Unbounded dict with no eviction, no TTL, no metrics.
#   Will grow until OOM under sustained traffic. No visibility into behavior.
class NaiveCache:
    def __init__(self):
        self._store: dict[str, Any] = {}

    def get(self, key: str) -> Any | None:
        return self._store.get(key)

    def put(self, key: str, value: Any) -> None:
        self._store[key] = value


# ✅ GOOD: Bounded LRU with TTL, jittered expiry, eviction metrics,
#   and thread-safe access via RLock. Follows SOLID — the cache is
#   swappable (OCP) because all callers interact through get/put.
from collections import OrderedDict
import random
import time
import threading


class LRUCache:
    """Thread-safe LRU cache with TTL-based expiry and eviction metrics."""

    def __init__(
        self,
        max_size: int = 1024,
        default_ttl_seconds: float = 300.0,
    ) -> None:
        self._store: OrderedDict[str, tuple[Any, float]] = OrderedDict()
        self._max_size = max_size
        self._default_ttl = default_ttl_seconds
        self._lock = threading.RLock()

        # Metrics — required for production observability
        self._hits = 0
        self._misses = 0
        self._evictions = 0

    def get(self, key: str) -> Any | None:
        """Retrieve a cached value if present and not expired.

        Returns None on miss or expired entry (which is then evicted).
        """
        with self._lock:
            if key not in self._store:
                self._misses += 1
                return None

            value, expires_at = self._store[key]
            if time.monotonic() > expires_at:
                del self._store[key]
                self._evictions += 1
                self._misses += 1
                return None

            # Move to end (most recently used)
            self._store.move_to_end(key)
            self._hits += 1
            return value

    def put(
        self,
        key: str,
        value: Any,
        ttl_seconds: float | None = None,
    ) -> None:
        """Store a value with TTL. Jitter is applied to prevent thundering herd."""
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
        # Add jitter: random offset between 0 and 15% of TTL
        jitter = random.uniform(0, ttl * 0.15)
        expires_at = time.monotonic() + ttl + jitter

        with self._lock:
            if key in self._store:
                self._store.move_to_end(key)

            self._store[key] = (value, expires_at)

            # Evict oldest entries if over capacity
            while len(self._store) > self._max_size:
                self._store.popitem(last=False)  # removes least recently used
                self._evictions += 1

    @property
    def metrics(self) -> dict[str, int]:
        """Return cache performance metrics for monitoring."""
        with self._lock:
            total = self._hits + self._misses
            hit_rate = (self._hits / total * 100) if total > 0 else 0.0
            return {
                "hits": self._hits,
                "misses": self._misses,
                "evictions": self._evictions,
                "hit_rate_pct": round(hit_rate, 2),
                "size": len(self._store),
            }

    def invalidate(self, key: str) -> None:
        """Explicitly remove a key — used on data mutations."""
        with self._lock:
            self._store.pop(key, None)

    def clear(self) -> None:
        """Flush all entries. Use during deployments or config reloads."""
        with self._lock:
            self._store.clear()
```

### Pattern 3: Stampede Prevention (Singleflight / Mutex Guard)

When a cached entry expires, multiple concurrent requests may attempt to recompute it simultaneously. This pattern ensures only one thread computes while others wait and share the result.

```python
import asyncio
from contextlib import asynccontextmanager


class SingleFlightGuard:
    """Prevents cache stampede by serializing concurrent miss handlers.

    If multiple callers request the same key simultaneously and it is
    not yet cached, only one caller executes the loader function while
    all others await its result. Subsequent requests (after the first
    completes) get the cached value normally.
    """

    def __init__(self) -> None:
        self._locks: dict[str, asyncio.Lock] = {}
        self._global_lock = asyncio.Lock()

    @asynccontextmanager
    async def guard(self, key: str):
        """Context manager that serializes access to a single key.

        Usage:
            async with guard.guard("user:123"):
                result = await expensive_load("user:123")
                cache.put("user:123", result)
        """
        # Get or create per-key lock (bounded to prevent unbounded dict growth)
        async with self._global_lock:
            if key not in self._locks or self._locks[key].locked():
                self._locks[key] = asyncio.Lock()
            lock = self._locks[key]

        async with lock:
            yield


# Usage — cache lookup with stampede prevention:
async def get_user_profile(user_id: str, cache: LRUCache) -> dict:
    """Fetch user profile with cache + singleflight protection."""
    cache_key = f"user:{user_id}"

    # Fast path: hit the cache first
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # Slow path: miss — but only one thread computes per key
    async with SingleFlightGuard().guard(cache_key):
        # Double-check after acquiring lock — another thread may have loaded it
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        # Actually load from source of truth
        profile = await fetch_user_from_database(user_id)

        # Cache with TTL so future lookups are fast
        cache.put(cache_key, profile, ttl_seconds=600)
        return profile
```

### Pattern 4: LFU Cache for Zipfian Access Patterns

When a small subset of keys accounts for most reads (common in APIs, databases, and web caches), LRU evicts hot keys that haven't been accessed in the TTL window. LFU tracks access frequency and preserves frequently-used entries regardless of recency.

```python
import time
from collections import defaultdict


class LFUCache:
    """Least-Frequently-Used cache with per-entry frequency tracking.

    Best for workloads with a small set of hot keys accessed thousands of
    times and many cold keys accessed once or twice. Evicts the key with
    the lowest access count, breaking ties by eviction count (not recency).
    """

    def __init__(self, max_size: int = 512, default_ttl_seconds: float = 300.0) -> None:
        self._store: dict[str, tuple[Any, float, int]] = {}  # key -> (value, expires_at, frequency)
        self._frequency_map: dict[int, list[str]] = defaultdict(list)  # freq -> [keys]
        self._max_size = max_size
        self._default_ttl = default_ttl_seconds
        self._hits = 0
        self._misses = 0
        self._evictions = 0

    def get(self, key: str) -> Any | None:
        if key not in self._store:
            self._misses += 1
            return None

        value, expires_at, freq = self._store[key]

        # Expired? Evict and miss.
        if time.monotonic() > expires_at:
            self._evictions += 1
            self._misses += 1
            del self._store[key]
            return None

        # Increment frequency — remove from old freq bucket, add to new
        self._frequency_map[freq].remove(key)
        if not self._frequency_map[freq]:
            del self._frequency_map[freq]

        new_freq = freq + 1
        self._store[key] = (value, expires_at, new_freq)
        self._frequency_map[new_freq].append(key)
        self._hits += 1
        return value

    def put(self, key: str, value: Any, ttl_seconds: float | None = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
        expires_at = time.monotonic() + ttl

        with_freq = (value, expires_at, 1)
        was_existing = key in self._store

        # If existing, remove from old frequency bucket first
        if was_existing:
            _, _, old_freq = self._store[key]
            self._frequency_map[old_freq].remove(key)
            if not self._frequency_map[old_freq]:
                del self._frequency_map[old_freq]

        self._store[key] = with_freq
        self._frequency_map[1].append(key)

        # Evict lowest-frequency key if over capacity
        while len(self._store) > self._max_size:
            self._evict_one()

    def _evict_one(self) -> None:
        """Remove the key with the lowest frequency count."""
        min_freq = min(self._frequency_map.keys())
        keys_at_freq = self._frequency_map[min_freq]
        evict_key = keys_at_freq.pop(0)
        if not keys_at_freq:
            del self._frequency_map[min_freq]
        del self._store[evict_key]
        self._evictions += 1

    @property
    def metrics(self) -> dict[str, int]:
        total = self._hits + self._misses
        hit_rate = (self._hits / total * 100) if total > 0 else 0.0
        return {
            "hits": self._hits,
            "misses": self._misses,
            "evictions": self._evictions,
            "hit_rate_pct": round(hit_rate, 2),
            "size": len(self._store),
        }
```

### Pattern 5: Versioned Keys for Schema-Change Safe Invalidation

When cached data structures change schema (e.g., user profile gains a new field), old keys contain stale-shaped values. Versioning the key prefix forces all existing entries to become cold automatically, with no explicit delete needed.

```python
# Version is incremented whenever the underlying data model changes.
_CACHE_VERSION = "v2"


def make_cache_key(*args: Any, version: str = _CACHE_VERSION) -> str:
    """Build a versioned cache key that auto-invalidates on schema changes.

    When CACHE_VERSION is bumped from 'v1' to 'v2', all keys prefixed
    with 'v1:' become cold (expired effectively) without any delete call.
    The new code simply starts writing 'v2:' keys.
    """
    parts = [version] + [str(a) for a in args]
    return ":".join(parts)


# Usage — all cache lookups automatically respect version boundaries:
def get_user(user_id: str, cache: LRUCache) -> dict:
    key = make_cache_key("user", user_id)
    result = cache.get(key)
    if result is not None:
        return result

    # Fresh data from database — always matches current schema
    user = fetch_user_from_db(user_id)
    cache.put(key, user)
    return user
```

### Pattern 6: Write-Through vs Write-Back Strategy Selection

Choose write-through when consistency is critical (financial transactions, inventory). Choose write-back when durability can tolerate brief delays and throughput matters more (session data, analytics counters).

```python
import threading
from collections import deque
from typing import Callable


# ✅ WRITE-THROUGH: Cache and database updated atomically on every write.
#   Pros: Zero data loss, always consistent.
#   Cons: Write latency = DB write time + cache write time.
class WriteThroughCache:
    def __init__(self, cache_store, db_write: Callable[[str, Any], None]):
        self._cache = cache_store
        self._db_write = db_write

    def put(self, key: str, value: Any) -> None:
        # DB write first (source of truth), then cache update
        try:
            self._db_write(key, value)  # Block until durable
            self._cache.put(key, value)  # Fast in-memory update
        except Exception:
            self._cache.invalidate(key)  # Rollback cache if DB fails
            raise


# ✅ WRITE-BACK: Cache accepts write immediately; background flusher
#   persists to DB asynchronously.
#   Pros: Sub-millisecond write latency.
#   Cons: Brief window of data loss on process crash.
class WriteBackCache:
    def __init__(self, cache_store, db_write: Callable[[str, Any], None]):
        self._cache = cache_store
        self._db_write = db_write
        self._pending: deque[tuple[str, Any]] = deque(maxlen=10000)
        self._flush_interval_seconds = 5.0

    def put(self, key: str, value: Any) -> None:
        # Fast in-memory write — return immediately to caller
        self._cache.put(key, value)
        self._pending.append((key, value))

    def flush_pending(self) -> None:
        """Persist all pending writes to the database."""
        while self._pending:
            key, value = self._pending.popleft()
            try:
                self._db_write(key, value)
            except Exception:
                # Re-queue on failure so it will be retried
                self._pending.appendleft((key, value))
                break  # Stop after first failure to avoid busy loop

    def background_flush(self, stop_event: threading.Event) -> None:
        """Run in a daemon thread to periodically persist pending writes."""
        while not stop_event.is_set():
            self.flush_pending()
            stop_event.wait(timeout=self._flush_interval_seconds)
```

---

## Constraints

### MUST DO
- Bound every cache with `max_size` — unbounded caches cause OOM in production
- Add TTL jitter (10–15% random variance) to stagger expiry and prevent thundering herd
- Implement stampede prevention (singleflight/mutex) for high-traffic cache keys that expire during load spikes
- Instrument hit/miss/evict metrics before claiming any optimization — you cannot improve what you cannot measure
- Use versioned cache keys when data schema changes, so old entries cold out without explicit deletes
- Thread-lock all mutable cache state with `RLock` or equivalent for concurrent safety

### MUST NOT DO
- Cache functions with side effects (I/O, mutations, network calls) unless the side effect is idempotent — caching hides repeated execution and breaks semantics
- Use a fixed TTL without jitter across thousands of keys — they all expire simultaneously
- Rely solely on LRU when access follows Zipf's law (few hot, many cold) — LFU preserves hot keys better
- Leave cache invalidation to GC or TTL alone — every mutating path must explicitly `invalidate()` or bump version
- Set `max_size` higher than your available memory divided by average value size — always reserve headroom for the process itself

---

## Output Template

When designing or reviewing a caching solution, produce:

1. **Access Pattern Analysis** — Uniform vs. Zipfian distribution estimate, hit rate expectation
2. **Cache Type Selection** — LRU, LFU, simple memo, or distributed — with justification
3. **Key Design** — Key format, version strategy, and collision handling
4. **TTL Strategy** — Base TTL value, jitter range, and expiration rationale
5. **Invalidation Plan** — Event-based deletes, version bumps, or TTL-only
6. **Stampede Mitigation** — Singleflight guard placement, double-check pattern
7. **Metrics Requirements** — Which counters/gauges to expose for monitoring

---

## Related Skills

| Skill | Purpose |
| --- | --- |
| `framework-performance-tuning` | Broader performance optimization beyond caching — connection pooling, async I/O, memory management |
| `software-error-handling` | Error handling in cache layers — fallback when Redis is down, graceful degradation on miss storms |
| `observability-patterns` | Structured logging and metrics integration for cache hit rates, latency percentiles, and evict counters |
| `pydantic-models` | Type-safe data models that pair with versioned cache keys to ensure schema consistency across versions |
