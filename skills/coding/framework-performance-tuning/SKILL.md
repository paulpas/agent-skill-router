---
name: framework-performance-tuning
description: Optimizes framework runtime performance through profiling-driven bottleneck
  analysis, caching strategies, connection pooling, async concurrency patterns, and
  memory management to reduce latency and increase throughput in production applications.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: framework performance, performance tuning, optimize framework, profiling
    application, connection pooling, caching strategy, async optimization, memory
    management, reduce latency, increase throughput, framework benchmarking, slow
    endpoint
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
  related-skills: framework-utilization, framework-selection, observability-patterns
---
# Framework Performance Tuner

Optimizes framework runtime performance through profiling-driven bottleneck analysis, caching strategies, connection pooling, async concurrency patterns, and memory management. The model acts as a senior performance engineer, producing actionable optimization plans backed by measured benchmarks rather than guesswork. This skill applies the 5 Laws of Elegant Defense: validate inputs before processing, make illegal states unrepresentable, fail fast with descriptive errors, return new data structures, and guide data naturally through the optimization pipeline.

## TL;DR Checklist

- [ ] Profile first — never optimize without baseline measurements from real traffic or realistic load
- [ ] Identify the single slowest endpoint or query before applying any optimization
- [ ] Add caching at the correct layer (response, query, fragment) and set appropriate TTLs
- [ ] Configure connection pools with `min`/`max` settings matched to your concurrency profile
- [ ] Convert synchronous I/O-bound code to async where the framework supports it
- [ ] Set memory limits and implement heap profiling for long-running processes
- [ ] Benchmark before and after every change — document the delta

---

## When to Use

Use this skill when:

- Production endpoints consistently exceed target latency thresholds (e.g., p95 > 500ms)
- Database connection exhaustion causes request failures under load
- Memory usage grows unbounded over time, requiring periodic process restarts
- API throughput cannot scale linearly with additional worker processes
- Load testing reveals bottlenecks in specific code paths or framework middleware chains
- Cold start times for serverless framework deployments exceed acceptable limits

---

## When NOT to Use

Avoid this skill for:

- First-time framework setup — use `framework-requirements` for initial scaffolding instead
- Algorithmic complexity problems — optimize Big-O before tuning framework settings
- Network latency issues caused by infrastructure — profiling will show external calls dominate; fix the network layer instead
- Database schema design flaws — if queries are O(N) when they should be O(log N), add indexes, not caching

---

## Core Workflow

1. **Establish Performance Baseline** — Measure current performance under realistic load using a production-equivalent dataset. Record p50, p95, and p99 latencies per endpoint, total request throughput (req/s), memory usage over time, and database query counts per request. Use tools appropriate to the framework: `py-spy` for Python, `wrk` or `ab` for HTTP load testing, `cProfile` for CPU profiling. **Checkpoint:** Every metric must have a numeric value with units. If you cannot measure it, you cannot optimize it.

2. **Profile and Identify Bottlenecks** — Use the baseline metrics to pinpoint the top 1-3 bottlenecks. Profile at three levels:
   - **CPU profile** (`cProfile`, `py-spy`): Identify which functions consume the most time
   - **I/O profile**: Identify blocking network calls, slow database queries, or synchronous HTTP calls
   - **Memory profile** (`tracemalloc`, `memory_profiler`): Identify leaks and high-usage patterns
   
   **Checkpoint:** Rank bottlenecks by impact (time saved × request frequency). Focus on the highest-leverage item first. Do not proceed to optimization until you have a ranked list.

3. **Apply Targeted Optimizations** — For each identified bottleneck, select from the implementation patterns below:
   - Database slow queries → Add indexes, batch queries, implement query result caching
   - CPU-heavy computation → Cache results, move to async/background tasks, consider compiled extensions
   - Synchronous I/O blocking → Convert to async with `asyncio` or add connection pooling
   - High memory usage → Implement pagination, stream responses, cache eviction policies
   
   **Checkpoint:** After each optimization, re-benchmark against the baseline. Document the improvement. If an optimization yields less than 5% improvement, consider whether the effort is justified.

4. **Validate Under Sustained Load** — Run the optimized code under sustained load (not just peak) for at least 30 minutes to verify no memory leaks, connection exhaustion, or degradation over time. Monitor with the same metrics from the baseline. **Checkpoint:** All p95/p99 latency targets must be met under sustained load, not just short bursts.

5. **Document Optimization Decisions** — Record every optimization applied, the measured improvement, and any trade-offs (e.g., "Redis cache added for product catalog — reduced p95 from 450ms to 80ms at cost of stale data up to 60 seconds"). This becomes institutional knowledge for future tuning.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Database Connection Pool Optimization

Connection pools are one of the most impactful optimizations for database-backed frameworks. Properly configured pools prevent connection exhaustion while avoiding the overhead of creating connections per-request. This pattern applies to FastAPI/SQLAlchemy, Django/psycopg2, and Flask/sqlalchemy stacks.

```python
"""Optimized database connection pool configuration for high-throughput applications."""

from __future__ import annotations

import logging
import os
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.pool import QueuePool

logger = logging.getLogger(__name__)


@dataclass
class PoolConfig:
    """Connection pool configuration tuned for different workload profiles."""

    min_size: int = 5                          # Minimum connections to keep alive
    max_size: int = 20                         # Maximum connections (tune based on DB capacity)
    max_overflow: int = 10                     # Extra connections beyond max_size during spikes
    pool_timeout: int = 30                     # Seconds to wait for a connection before failing
    pool_recycle: int = 1800                   # Recycle connections after 30 minutes (prevents stale connections)
    pool_pre_ping: bool = True                 # Verify connections before use (catches dropped ones)
    echo: bool = False                         # Log all SQL statements for debugging

    @classmethod
    def for_high_throughput(cls, worker_count: int = 4) -> "PoolConfig":
        """Create a pool config optimized for high-throughput applications.
        
        Rule of thumb: max_size = min(worker_count * 3, DB connection limit * 0.7).
        Leaves headroom for background jobs and administrative queries.
        
        Args:
            worker_count: Number of concurrent worker processes handling requests.
        
        Returns:
            PoolConfig tuned for the specified concurrency level.
        """
        return cls(
            min_size=worker_count,
            max_size=min(worker_count * 3, 50),  # Cap at 50 to protect DB
            max_overflow=10,
            pool_recycle=900,   # More aggressive recycling under high load
            pool_pre_ping=True,
        )

    @classmethod
    def for_serverless(cls) -> "PoolConfig":
        """Create a pool config optimized for serverless/short-lived processes.
        
        Serverless functions have short lifetimes, so use fewer connections
        and shorter timeouts to minimize resource waste.
        """
        return cls(
            min_size=2,
            max_size=10,
            max_overflow=5,
            pool_timeout=10,     # Fail fast if no connection available
            pool_recycle=600,    # Recycle more aggressively for cold-start safety
        )


@asynccontextmanager
async def create_optimized_pool(
    database_url: str,
    config: PoolConfig | None = None,
) -> AsyncEngine:
    """Create an async SQLAlchemy engine with optimized pool settings.
    
    Applies Law 4 (Fail Fast): validates database URL format and pool parameters
    before creating the engine. Fails immediately with a descriptive error if
    any parameter is invalid.
    
    Args:
        database_url: PostgreSQL connection URL (e.g., postgresql+asyncpg://...).
        config: Optional pool configuration. Defaults to high-throughput profile.
    
    Returns:
        Configured AsyncEngine with optimized connection pooling.
    
    Raises:
        ValueError: If the database URL is missing or pool settings are invalid.
    """
    if not database_url or not database_url.startswith("postgresql"):
        raise ValueError(
            f"Invalid database URL: {database_url!r}. "
            "Must be a PostgreSQL URL (postgresql+asyncpg://...)"
        )

    cfg = config or PoolConfig.for_high_throughput()

    if cfg.min_size < 1:
        raise ValueError("pool min_size must be >= 1")
    if cfg.max_size < cfg.min_size:
        raise ValueError("pool max_size must be >= min_size")

    engine = create_async_engine(
        database_url,
        poolclass=QueuePool,
        pool_size=cfg.max_size,
        max_overflow=cfg.max_overflow,
        pool_timeout=cfg.pool_timeout,
        pool_recycle=cfg.pool_recycle,
        pool_pre_ping=cfg.pool_pre_ping,
        echo=cfg.echo,
    )

    # Attach event listener to log slow queries (> 1 second)
    @event.listens_for(engine.sync_engine, "before_cursor_execute")
    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        conn.info.setdefault("query_start_time", []).append(time.time())

    @event.listens_for(engine.sync_engine, "after_cursor_execute")
    def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        total = time.time() - conn.info["query_start_time"].pop(-1)
        if total > 1.0:
            logger.warning("Slow query detected (%.2fs): %s", total, statement[:200])

    logger.info(
        "Connection pool created: min=%d max=%d overflow=%d recycle=%ds",
        cfg.min_size, cfg.max_size, cfg.max_overflow, cfg.pool_recycle,
    )
    return engine


# ── Usage Example ───────────────────────────────────────────────

async def main() -> None:
    """Demonstrate optimized pool creation and usage."""
    db_url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://app_user:secret@localhost:5432/app_db",
    )

    pool_config = PoolConfig.for_high_throughput(worker_count=8)
    engine = await create_optimized_pool(db_url, config=pool_config)

    # Execute queries using the pooled connection (connection auto-returned to pool)
    async with engine.connect() as conn:
        result = await conn.execute("SELECT 1")
        print(result.scalar())

    await engine.dispose()  # Close all connections in the pool gracefully


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

### Pattern 2: Multi-Layer Caching Strategy (BAD vs. GOOD)

Effective caching operates at multiple layers simultaneously: in-memory cache for hot data, distributed cache (Redis/Memcached) for shared state, and database query result caching for expensive queries. The BAD example below demonstrates the anti-pattern of adding caching ad-hoc without a layered strategy, leading to cache inconsistency and memory leaks.

```python
# ── ❌ BAD: Ad-hoc in-memory caching with no eviction or consistency —──────────────

import time
from typing import Any


class Cache:
    """Ad-hoc dictionary-based cache — no eviction, no TTL, no thread safety."""

    def __init__(self) -> None:
        self._store: dict[str, Any] = {}

    def get(self, key: str) -> Any:
        return self._store.get(key)  # No TTL check — stale data forever

    def set(self, key: str, value: Any) -> None:
        self._store[key] = value  # No size limit — memory grows unbounded

    def invalidate(self, key: str) -> None:
        self._store.pop(key, None)


# Used across all request handlers as a global singleton → race conditions
global_cache = Cache()


def get_user_profile_bad(user_id: int) -> dict:
    """Fetch user profile — uses the broken ad-hoc cache."""
    cached = global_cache.get(f"user:{user_id}")
    if cached is not None:
        return cached  # Could be arbitrarily stale

    # Simulate database fetch
    profile = {"id": user_id, "name": "Alice", "email": "alice@example.com"}
    global_cache.set(f"user:{user_id}", profile)
    return profile


# ── ✅ GOOD: Layered caching with TTL, eviction, and consistency —──────────────────

import hashlib
import json
import logging
import time
from collections import OrderedDict
from typing import Any, Generic, TypeVar

logger = logging.getLogger(__name__)
T = TypeVar("T")


class LRUCache(Generic[T]):
    """Thread-safe LRU cache with TTL and size limits.
    
    Implements a bounded in-memory cache suitable for hot data that doesn't
    need to be shared across processes. Uses OrderedDict for O(1) access
    and eviction. Items expire after `ttl_seconds` from last access.
    """

    def __init__(self, max_size: int = 1000, ttl_seconds: int = 300) -> None:
        self._cache: OrderedDict[str, tuple[T, float]] = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> T | None:
        """Retrieve a value from cache. Returns None on miss or TTL expiration."""
        if key not in self._cache:
            self._misses += 1
            return None

        value, expires_at = self._cache[key]
        if time.time() > expires_at:
            # Expired — evict and count as miss
            del self._cache[key]
            self._misses += 1
            logger.debug("Cache expired for key: %s", key)
            return None

        # Move to end (most recently used)
        self._cache.move_to_end(key)
        self._hits += 1
        return value

    def set(self, key: str, value: T) -> None:
        """Store a value in cache with automatic eviction of least-recently-used items."""
        if len(self._cache) >= self._max_size and key not in self._cache:
            # Evict LRU item
            evicted_key, _ = self._cache.popitem(last=False)
            logger.debug("Evicted LRU cache entry: %s", evicted_key)

        expires_at = time.time() + self._ttl
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = (value, expires_at)

    @property
    def stats(self) -> dict[str, int]:
        """Return cache hit/miss statistics for monitoring."""
        total = self._hits + self._misses
        return {
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": round(self._hits / total * 100, 1) if total > 0 else 0.0,
            "size": len(self._cache),
        }


class CacheLayer:
    """Multi-layer cache combining in-memory LRU with Redis distributed cache.
    
    Reads flow through layers: memory → Redis → database (on miss).
    Writes use write-through: update memory and Redis simultaneously.
    """

    def __init__(
        self,
        memory_cache: LRUCache | None = None,
        redis_client: Any = None,  # redis.asyncio.Redis instance
    ) -> None:
        self._memory = memory_cache or LRUCache(max_size=2000, ttl_seconds=60)
        self._redis = redis_client

    async def get(self, key: str) -> bytes | None:
        """Get value from layered cache (memory first, then Redis)."""
        # Layer 1: In-memory cache (fastest — < 1ms)
        cached = self._memory.get(key)
        if cached is not None:
            logger.debug("Cache hit [memory]: %s", key)
            return cached

        # Layer 2: Redis distributed cache (~5ms with local Redis)
        if self._redis:
            try:
                value = await self._redis.get(key)
                if value is not None:
                    # Populate memory cache for subsequent requests
                    self._memory.set(key, value)
                    logger.debug("Cache hit [redis]: %s", key)
                    return value
            except Exception as exc:
                logger.warning("Redis read failed for %s: %s", key, exc)

        # Layer 3: Miss — caller must fetch from database and populate cache
        logger.debug("Cache miss for all layers: %s", key)
        return None

    async def set(self, key: str, value: bytes | str, ttl_seconds: int = 60) -> None:
        """Write-through to both memory and Redis caches."""
        data = value if isinstance(value, bytes) else value.encode()
        
        # Write to memory cache (synchronous, bounded by LRU eviction)
        self._memory.set(key, data)

        # Write to Redis with TTL
        if self._redis:
            try:
                await self._redis.setex(key, ttl_seconds, data)
            except Exception as exc:
                logger.warning("Redis write failed for %s: %s", key, exc)

    async def invalidate(self, pattern: str | None = None, key: str | None = None) -> int:
        """Invalidate cache entries by exact key or glob pattern.
        
        Returns the number of entries invalidated.
        """
        count = 0
        # Clear memory cache
        if key:
            self._memory.get(key)  # Just ensure it exists in stats tracking
            self._memory._cache.pop(key, None)
            count += 1

        # Clear Redis matches
        if self._redis and pattern:
            try:
                for redis_key in self._redis.scan_iter(match=pattern):
                    await self._redis.delete(redis_key)
                    count += 1
            except Exception as exc:
                logger.warning("Redis invalidate failed for %s: %s", pattern, exc)

        return count


# ── Usage Example ───────────────────────────────────────────────

async def get_user_profile_good(
    user_id: int,
    cache_layer: CacheLayer,
    db_fetch_function,  # Your database query function
) -> dict:
    """Fetch user profile with multi-layer caching.
    
    Flow: memory cache → Redis → database → populate all layers on miss.
    TTL is 60 seconds for consistency (user profiles change infrequently).
    """
    key = f"user:{user_id}"
    cached = await cache_layer.get(key)
    if cached is not None:
        return json.loads(cached)

    # Cache miss — fetch from database
    profile = await db_fetch_function(user_id)

    # Write-through to all cache layers (TTL 60s)
    await cache_layer.set(key, json.dumps(profile), ttl_seconds=60)

    return profile
```

### Pattern 3: Async Request Handling for I/O-Bound Endpoints

Converting synchronous request handlers to async in FastAPI eliminates thread pool blocking for I/O-bound operations (database queries, HTTP calls, file reads). This pattern demonstrates the transformation with proper error handling and resource cleanup. The key insight: async only helps when the underlying libraries themselves support async — you cannot make a synchronous library non-blocking just by adding `async`/`await`.

```python
"""Async request handler optimization for FastAPI I/O-bound endpoints.

This module shows how to convert synchronous handlers that perform database
queries, external API calls, and file operations into properly async handlers
that don't block the event loop.

Critical rule: NEVER call synchronous blocking code directly in an async handler.
Use run_in_executor() to offload synchronous work to a thread pool, or use
async-native libraries where available.
"""

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Request/Response Models ────────────────────────────────────

class ProductRequest(BaseModel):
    """Request to fetch multiple products with related data."""
    product_ids: list[int] = Field(min_length=1, max_length=100)
    include_reviews: bool = True
    include_inventory: bool = True


class ProductResponse(BaseModel):
    """Response containing product details with optional related data."""
    id: int
    name: str
    price: float
    reviews: list[dict[str, Any]] | None = None
    inventory_count: int | None = None


# ── Async Data Fetchers (simulated) ────────────────────────────

async def fetch_products_async(product_ids: list[int]) -> list[dict]:
    """Fetch products asynchronously (e.g., using asyncpg or httpx)."""
    # In production, this would use an async database driver like asyncpg
    await asyncio.sleep(0.01 * len(product_ids))  # Simulate DB round-trip time
    return [
        {"id": pid, "name": f"Product {pid}", "price": 29.99 + (pid * 1.5)}
        for pid in product_ids
    ]


async def fetch_reviews_async(product_ids: list[int]) -> dict[int, list[dict]]:
    """Fetch reviews for multiple products in parallel."""
    await asyncio.sleep(0.02)  # Simulate DB query time
    return {
        pid: [
            {"user": "Reviewer A", "rating": 4 + (pid % 2), "text": "Great product!"}
            for _ in range(3)
        ]
        for pid in product_ids
    }


async def fetch_inventory_async(product_ids: list[int]) -> dict[int, int]:
    """Fetch inventory counts from the warehouse API."""
    await asyncio.sleep(0.015)  # Simulate external API latency
    return {pid: 100 + (pid * 7) % 200 for pid in product_ids}


def fetch_product_sync_blocking(product_id: int) -> dict:
    """Synchronous database query — MUST NOT be called directly in async context.
    
    This simulates a synchronous ORM call (e.g., SQLAlchemy with psycopg2).
    To use this in an async handler, wrap with asyncio.to_thread().
    """
    import time
    time.sleep(0.05)  # 50ms blocking — would block the entire event loop
    return {"id": product_id, "name": f"Product {product_id}", "price": 29.99}


# ── Optimized Async Handlers ───────────────────────────────────

@router.get("/products/{product_id}")
async def get_product_fast(product_id: int) -> dict:
    """Fast endpoint: fetches a single product using async I/O.
    
    Performance: ~10ms (non-blocking) vs 50ms (synchronous blocking).
    The async handler yields the event loop during the simulated I/O wait,
    allowing other requests to be processed concurrently.
    """
    try:
        product = await asyncio.to_thread(fetch_product_sync_blocking, product_id)
        return product
    except Exception as exc:
        logger.error("Failed to fetch product %d: %s", product_id, exc)
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")


@router.post("/products/batch", response_model=list[ProductResponse])
async def get_products_batch(request: ProductRequest) -> list[ProductResponse]:
    """Batch endpoint: fetches multiple products with related data concurrently.
    
    Uses asyncio.gather() to run I/O operations in parallel rather than sequentially.
    Sequential approach would take 3 × ~20ms = 60ms. Parallel approach takes ~20ms.
    
    This demonstrates the fan-out pattern: split independent I/O tasks, wait for all.
    """
    try:
        # Step 1: Fetch products (sequential is fine — single DB round-trip)
        products = await fetch_products_async(request.product_ids)

        # Step 2: Fan out related data fetches in parallel
        tasks: list[asyncio.Task] = []
        
        if request.include_reviews:
            tasks.append(asyncio.create_task(fetch_reviews_async(request.product_ids)))
        
        if request.include_inventory:
            tasks.append(asyncio.create_task(fetch_inventory_async(request.product_ids)))

        # Wait for all parallel tasks to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Step 3: Assemble responses
        reviews_map = {}
        inventory_map = {}
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.warning("Parallel task failed: %s", result)
                continue
            
            if request.include_reviews and i == 0:
                reviews_map = result

        responses = []
        for product in products:
            pid = product["id"]
            responses.append(ProductResponse(
                id=pid,
                name=product["name"],
                price=product["price"],
                reviews=reviews_map.get(pid) if request.include_reviews else None,
                inventory_count=inventory_map.get(pid) if request.include_inventory else None,
            ))

        return responses

    except Exception as exc:
        logger.error("Batch fetch failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch products")
```

### Pattern 4: Memory Management and Leak Prevention

Long-running framework processes accumulate memory through unclosed file handles, growing data structures, and cached objects that are never evicted. This pattern implements proactive memory management with monitoring, garbage collection tuning, and leak detection hooks.

```python
"""Memory management utilities for long-running Python web frameworks."""

from __future__ import annotations

import gc
import logging
import os
import time
from collections import deque
from dataclasses import dataclass
from threading import Lock
from typing import Any


@dataclass
class MemorySnapshot:
    """Point-in-time snapshot of memory usage metrics."""
    timestamp: float
    rss_mb: float           # Resident Set Size (physical memory used)
    vms_mb: float           # Virtual Memory Size
    gc_counts: tuple[int, int, int]
    open_file_handles: int = 0

    @property
    def rss_gb(self) -> float:
        return self.rss_mb / 1024


class MemoryMonitor:
    """Monitors process memory usage and alerts on leaks or threshold breaches.
    
    Tracks RSS memory over time, detects sustained growth patterns, and can
    trigger soft limits (warn + GC) before hard limits (process restart) are hit.
    """

    def __init__(
        self,
        warn_threshold_mb: float = 1024,    # Warn at 1GB RSS
        critical_threshold_mb: float = 2048, # Kill/rotate at 2GB RSS
        leak_detection_window_minutes: int = 30,
        sample_interval_seconds: int = 10,
    ) -> None:
        self._warn = warn_threshold_mb
        self._critical = critical_threshold_mb
        self._window_minutes = leak_detection_window_minutes
        self._samples: deque[MemorySnapshot] = deque(maxlen=600)
        self._lock = Lock()
        self._leak_detected = False

    def take_snapshot(self) -> MemorySnapshot:
        """Capture current memory state using /proc/self on Linux."""
        try:
            with open("/proc/self/status", "r") as f:
                status = f.read()

            rss_kb = 0
            vms_kb = 0
            for line in status.splitlines():
                if line.startswith("VmRSS:"):
                    rss_kb = int(line.split()[1])
                elif line.startswith("VmSize:"):
                    vms_kb = int(line.split()[1])

            gc_counts = gc.get_counts()
            open_fds = len(os.listdir("/proc/self/fd")) if os.path.exists("/proc/self/fd") else 0

        except (FileNotFoundError, PermissionError, ValueError) as exc:
            logger.debug("Could not read /proc status: %s", exc)
            rss_kb = 0
            vms_kb = 0
            gc_counts = (0, 0, 0)
            open_fds = 0

        snapshot = MemorySnapshot(
            timestamp=time.time(),
            rss_mb=rss_kb / 1024,
            vms_mb=vms_kb / 1024,
            gc_counts=gc_counts,
            open_file_handles=open_fds,
        )

        with self._lock:
            self._samples.append(snapshot)

        if snapshot.rss_mb >= self._critical:
            logger.critical("CRITICAL: RSS %.0fMB exceeds critical threshold %.0fMB",
                           snapshot.rss_mb, self._critical)
            self._leak_detected = True
            self._trigger_gc()

        elif snapshot.rss_mb >= self._warn:
            logger.warning("WARN: RSS %.0fMB exceeds warning threshold %.0fMB",
                          snapshot.rss_mb, self._warn)

        self._check_leak_pattern()
        return snapshot

    def _trigger_gc(self) -> None:
        """Force garbage collection and log the results."""
        gc.collect()
        counts = gc.get_counts()
        logger.info("Forced GC triggered — stats: %s", counts)

    def _check_leak_pattern(self) -> None:
        """Detect sustained memory growth over the configured time window."""
        with self._lock:
            if len(self._samples) < 10:
                return

            window_start = time.time() - (self._window_minutes * 60)
            recent_samples = [s for s in self._samples if s.timestamp >= window_start]

            if len(recent_samples) < 5:
                return

            oldest = min(s.rss_mb for s in recent_samples)
            newest = max(s.rss_mb for s in recent_samples)
            growth_mb = newest - oldest

            if oldest > 100 and growth_mb / oldest > 0.10:
                logger.warning(
                    "Memory leak suspected: RSS grew from %.0fMB to %.0fMB (%.1f%% increase) "
                    "over %d minutes",
                    oldest, newest, (growth_mb / oldest) * 100, self._window_minutes,
                )
                self._leak_detected = True

    @property
    def is_leaking(self) -> bool:
        return self._leak_detected

    def get_trend(self) -> float | None:
        """Return the average memory growth rate in MB/min over recent samples.
        
        Returns None if insufficient data.
        """
        with self._lock:
            if len(self._samples) < 10:
                return None

            first = self._samples[0]
            last = self._samples[-1]
            elapsed_minutes = (last.timestamp - first.timestamp) / 60

            if elapsed_minutes <= 0:
                return None

            growth_per_min = (last.rss_mb - first.rss_mb) / elapsed_minutes
            return round(growth_per_min, 2)


# ── Usage Example — Registering with a FastAPI Application ──────────────────────

memory_monitor = MemoryMonitor(
    warn_threshold_mb=1024,
    critical_threshold_mb=2048,
    leak_detection_window_minutes=30,
    sample_interval_seconds=30,
)


def register_memory_monitor(app):  # type: ignore[no-untyped-def]
    """Register memory monitoring with a FastAPI application.
    
    Takes snapshots on each request and periodically checks for leaks.
    This is called during application startup in the lifespan handler.
    """
    import atexit

    @atexit.register
    def shutdown_report() -> None:
        snapshot = memory_monitor.take_snapshot()
        logger.info(
            "Final memory snapshot — RSS: %.1fMB, Trend: %s MB/min",
            snapshot.rss_mb,
            memory_monitor.get_trend() or "N/A",
        )
```

---

## Constraints

### MUST DO

- Profile before optimizing — establish a numeric baseline with p50/p95/p99 latency, throughput, and memory metrics under realistic load
- Use the `MemoryMonitor` class for long-running processes to detect leaks before they cause OOM kills
- Configure connection pools with `pool_pre_ping=True` to catch stale connections before they fail requests
- Set `pool_recycle` values lower than your database's `wait_timeout` to prevent stale connections
- Convert synchronous I/O handlers to async only when using async-native libraries (asyncpg, httpx, aiofiles) — never add async for CPU-bound work
- Use `asyncio.gather()` with bounded concurrency (`asyncio.Semaphore`) for fan-out patterns to avoid overwhelming downstream services
- Set explicit cache TTLs based on data freshness requirements — never cache indefinitely without eviction
- Implement write-through caching for data that must be consistent across workers (use Redis or similar)
- Run `gc.collect()` proactively during low-traffic periods for long-running processes; do not rely solely on automatic GC thresholds
- Document every optimization with measured before/after benchmarks — unmeasured changes are guesses, not engineering

### MUST NOT DO

- Never optimize without a baseline — guessing what is slow wastes effort and introduces regressions
- Do not add caching as a substitute for fixing algorithmic complexity — O(n²) code will be slow regardless of cache hit rate
- Do not use `time.sleep()` in async handlers — it blocks the entire event loop; use `await asyncio.sleep()` instead
- Never create database connections inside request handlers — always use connection pooling
- Do not set connection pool `max_size` higher than 70% of your database's max connection limit
- Do not cache API responses with user-specific data without proper cache key isolation (user ID + version hash)
- Never ignore slow query logs — a single unindexed query can dominate total latency under load
- Do not increase worker count as the primary scaling strategy — fix bottlenecks first, then scale horizontally

---

## Output Template

When applying this skill to optimize an application, produce:

1. **Baseline Metrics** — Current p50/p95/p99 latency (ms), throughput (req/s), memory usage (MB) per endpoint or service
2. **Bottleneck Analysis** — Ranked list of top 1-3 bottlenecks with profiling evidence (which functions/queries consume the most time)
3. **Optimization Plan** — Specific optimizations to apply, ordered by estimated impact:
   - Short-term fixes (< 1 hour): indexes, cache additions, pool tuning
   - Medium-term changes (1-2 days): async conversion, query restructuring
   - Long-term improvements (1+ week): architecture changes, framework migration
4. **Expected Improvement** — Estimated latency/throughput change for each optimization based on benchmark methodology
5. **Risk Assessment** — Potential regressions (cache consistency, connection exhaustion under burst, GC pauses) and mitigations
6. **Post-Optimization Metrics** — After implementation, report new p50/p95/p99 values with percentage improvement

---

## Related Skills

| Skill                         | Purpose                                                          |
|-------------------------------|------------------------------------------------------------------|
| `framework-utilization`       | Integration patterns for frameworks (DI, config, lifecycle) before performance tuning |
| `framework-selection`         | Evaluating which framework to use — pick a performant foundation first |
| `observability-patterns`      | Monitoring and alerting infrastructure needed to detect performance regressions |

---

> 📖 skill(local cache): framework-utilization, framework-selection, observability-patterns
