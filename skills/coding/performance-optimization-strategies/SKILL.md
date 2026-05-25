---
name: performance-optimization-strategies
description: Implements concrete performance optimization techniques including query-level tuning, multi-layer caching strategies, connection pooling, and lazy loading patterns for production web applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: performance optimization, slow API response, database query optimization, caching strategy, lazy loading, connection pooling, N+1 queries, how do i make my app faster
  archetypes:
    - tactical
    - diagnostic
  anti_triggers:
    - infrastructure cost analysis
    - load testing methodology
    - capacity planning
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: caching-strategies, postgresql-performance-tuning, async-programming
---

# Performance Optimization Strategies

Diagnoses and resolves bottlenecks across the full stack — database queries, API response times, frontend rendering, and caching layers. When loaded, this skill makes the model act as a senior performance engineer applying systematic profiling, targeted optimization patterns, and benchmark-driven validation to reduce latency and resource consumption in production web applications. This skill enforces measurement-first discipline: never optimize without baseline metrics, always verify improvement with controlled benchmarks.

## TL;DR Checklist

- [ ] Establish a measurable baseline — record p50/p95/p99 latencies, throughput, memory usage before any code changes
- [ ] Profile the bottleneck tier using EXPLAIN ANALYZE (SQL), --inspect-profiler (Node.js), or cProfile (Python)
- [ ] Apply targeted optimization to the identified tier only — don't rewrite unrelated code paths
- [ ] Verify improvement with before/after comparison using identical test data and load conditions
- [ ] Add performance regression tests to CI that fail if latency exceeds established thresholds
- [ ] Instrument monitoring dashboards with the same metrics used during profiling for ongoing detection

---

## When to Use

Use this skill when:

- A specific API endpoint consistently exceeds its SLA target (e.g., p95 latency > 200ms on a CRUD endpoint)
- Database query execution time grows disproportionately as data volume increases (indicating missing indexes or N+1 queries)
- Frontend bundle size causes slow initial page loads (>3s on 3G connections per Web Vitals guidelines)
- Memory usage in long-running processes (API servers, background workers) shows a monotonically increasing trend suggesting a leak
- CPU profiling reveals hot functions consuming >30% of total execution time in the critical path

---

## When NOT to Use

Avoid applying this skill for:

- **Infrastructure cost analysis** — if the issue is cloud bill optimization or resource sizing, use infrastructure capacity planning tools instead of code-level profiling
- **Load testing methodology** — designing load test scenarios and stress tests is a separate discipline; use performance-testing skills first
- **Pre-optimization** — do not optimize code paths that are not yet identified as bottlenecks by profiler data. Premature optimization adds complexity without measurable benefit
- **Cold start latency for serverless functions** — cold starts are primarily an infrastructure/runtime concern, not a query or caching issue

---

## Core Workflow

1. **Profile with Metrics to Establish Baseline** — Measure the current state before touching any code. For database queries: run `EXPLAIN ANALYZE` on slow statements and capture execution plans with actual row counts. For application servers: use Node.js `--inspect-profiler` for CPU profiling, or Python `cProfile` / `py-spy record -o profile.svg`. Capture P50/P95/P99 latencies across the full request lifecycle, not just individual function times. **Checkpoint:** Every metric must include a numeric value with units (ms, MB, req/s) and the exact code path measured. Without this baseline, you cannot prove improvement or detect regression.

2. **Identify the Bottleneck Tier** — Narrow down whether the bottleneck is in the database layer (slow queries, missing indexes, lock contention), application logic (expensive computation, unnecessary serialization), external API calls (third-party latency, connection timeouts), or frontend rendering (large DOM, unoptimized images, excessive re-renders). Use a timing breakdown tool like `opentelemetry` span timers or `console.time` / `time.perf_counter()` to attribute milliseconds to each tier. **Checkpoint:** The bottleneck must account for >40% of total latency at P95. If no single tier dominates, address the largest one first and re-profile.

3. **Apply Targeted Optimization Strategy** — Select the optimization technique matching the identified bottleneck:
   - Database: add covering indexes, rewrite subqueries as JOINs, paginate large result sets with cursor-based pagination instead of OFFSET
   - Application: eliminate N+1 queries with eager loading, cache expensive computations with memoization, batch small operations into single calls
   - Caching layer: introduce Redis/TTL cache for read-heavy data, set Cache-Control headers on HTTP responses, use cache invalidation patterns tied to write events
   - Frontend: lazy-load routes and images, tree-shake unused dependencies, defer non-critical JavaScript parsing
   **Checkpoint:** Each optimization must directly address the specific bottleneck from step 2. Do not optimize a layer that is already below 10% of total latency.

4. **Verify Improvement with Before/After Comparison** — Re-run the exact same profiling setup used in Step 1 on the optimized code. Compare P50/P95/P99 latencies, throughput, and resource consumption. Use identical test data volumes and load conditions (same number of concurrent requests, same data set size). The optimization must show measurable improvement (at least 10% latency reduction) while maintaining full correctness. **Checkpoint:** If the optimized version is slower or produces incorrect results, revert immediately and re-evaluate the approach. Never ship performance regressions.

5. **Add Monitoring to Detect Future Regression** — Instrument the optimized path with production monitoring: add latency histogram buckets (e.g., 10ms, 50ms, 100ms, 500ms, 1s+), set up alerts for P95 exceeding the target threshold, and add performance regression tests in CI that compare against the established baseline. **Checkpoint:** Every optimized endpoint must have a Grafana dashboard panel tracking its latency percentiles with an alert rule configured. If it's not monitored, it will regress within weeks.

---

## Implementation Patterns

### Pattern 1: N+1 Query Elimination with Eager Loading

The N+1 query problem occurs when iterating over a collection of parent objects and executing a separate database query for each child association. This pattern demonstrates the problem and its fix using SQLAlchemy's eager loading mechanisms.

```python
"""
Pattern 1: N+1 query elimination with eager loading in SQLAlchemy.
Shows the anti-pattern (N+1 queries) and three optimized alternatives:
joinedload, selectinload, and subqueryload.
"""

from typing import List
from sqlalchemy.orm import Session, joinedload, selectinload, subqueryload
from sqlalchemy import func


# ❌ BAD: N+1 query — executes 1 query for users + N queries for orders
def get_users_with_orders_bad(db: Session) -> List[dict]:
    """This pattern causes N+1 queries. For every user, a separate query
    loads their associated orders."""
    users = db.query(User).all()  # 1 query
    result = []
    for user in users:  # N additional queries — THIS IS THE PROBLEM
        orders = db.query(Order).filter(Order.user_id == user.id).all()
        result.append({
            "user": user.name,
            "order_count": len(orders),
        })
    return result


# ✅ GOOD: joinedload — single SQL query with JOIN for one-to-many relationships
def get_users_with_orders_joined(db: Session) -> List[dict]:
    """Uses a single JOIN query. Best when the result set is small to moderate
    and you need all related records in memory."""
    users = (
        db.query(User)
        .options(joinedload(User.orders))
        .all()
    )
    return [
        {"user": u.name, "order_count": len(u.orders)}
        for u in users
    ]


# ✅ GOOD: selectinload — two queries (one for parents, one IN-clause for children)
# Best when the child table has many rows per parent (avoids Cartesian explosion)
def get_users_with_orders_selectin(db: Session) -> List[dict]:
    """Uses two queries with an IN clause. Preferred for 1-to-many or N-to-N
    relationships where a single user might have hundreds of orders."""
    users = (
        db.query(User)
        .options(selectinload(User.orders))
        .all()
    )
    return [
        {"user": u.name, "order_count": len(u.orders)}
        for u in users
    ]


# ✅ GOOD: subqueryload — two queries with a subselect
def get_users_with_orders_subquery(db: Session) -> List[dict]:
    """Uses a separate subquery to load all children at once. Good for
    relationships with very large result sets where selectinload's IN
    clause would exceed the database's parameter limit."""
    users = (
        db.query(User)
        .options(subqueryload(User.orders))
        .all()
    )
    return [
        {"user": u.name, "order_count": len(u.orders)}
        for u in users
    ]
```

### Pattern 2: Multi-Layer Caching Strategy with TTL Management

Implement a three-tier caching strategy: application-level memoization for CPU-bound pure functions, Redis-based distributed cache for shared state, and HTTP Cache-Control headers for browser/CDN caching. Each layer has different TTLs based on data freshness requirements.

```python
"""
Pattern 2: Three-layer caching strategy with TTL management.
Layer 1 (L1): In-process memoization via @lru_cache — fastest, no network overhead
Layer 2 (L2): Redis cache with configurable TTL — shared across service instances
Layer 3 (L3): HTTP Cache-Control headers — served by browsers and CDNs
"""

import time
import hashlib
from typing import Optional, Any
from functools import lru_cache, wraps
import redis


class CacheConfig:
    """Centralized cache configuration keyed by data freshness requirements."""

    # Data that changes frequently (user sessions, live counts)
    FRESH = 30        # 30 seconds TTL
    # Data updated periodically (product listings, search results)
    NORMAL = 300      # 5 minutes TTL
    # Data updated infrequently (category trees, configuration)
    STALE = 3600      # 1 hour TTL
    # Immutable or rarely changed data (static assets, reference tables)
    STATIC = 86400    # 24 hours TTL


@lru_cache(maxsize=256)
def compute_product_ranking(product_id: int) -> dict:
    """L1 cache: memoize expensive pure function calls.
    
    The lru_cache uses (product_id,) as the key automatically via Python's
    internal hashing. This is in-process, so it's shared only within this
    Python interpreter — not across workers or instances.
    """
    # Simulate CPU-intensive ranking computation
    time.sleep(0.01)  # In reality: complex scoring algorithm
    return {
        "product_id": product_id,
        "score": round(sum(range(product_id % 100)) / 100, 3),
        "rank": None,  # Will be set after all products computed
    }


def redis_cache_get(
    client: redis.Redis,
    cache_key: str,
    ttl: int = CacheConfig.NORMAL,
) -> Optional[Any]:
    """L2 cache: read from Redis with TTL fallback.
    
    Args:
        client: Active Redis connection pool.
        cache_key: Namespaced key (e.g., 'products:pricing:12345').
        ttl: Time-to-live in seconds if the value needs to be set by caller.

    Returns:
        Deserialized cached value, or None for cache miss.
    """
    # Use a consistent prefix to avoid collisions across application features
    namespaced_key = f"cache:{cache_key}"
    raw = client.get(namespaced_key)
    
    if raw is None:
        return None  # Cache miss — caller computes the value
    
    import json
    data = json.loads(raw.decode("utf-8"))
    return data


def redis_cache_set(
    client: redis.Redis,
    cache_key: str,
    value: Any,
    ttl: int = CacheConfig.NORMAL,
) -> None:
    """L2 cache: write to Redis with configurable TTL.
    
    Always set TTL based on the data's freshness requirement — never use a
    hardcoded value or omit TTL entirely (which creates permanent stale data).
    """
    import json
    namespaced_key = f"cache:{cache_key}"
    client.setex(namespaced_key, ttl, json.dumps(value))


def get_cache_control_ttl(data_freshness: str) -> int:
    """Map a logical freshness category to an integer TTL in seconds.
    
    Args:
        data_freshness: One of 'fresh', 'normal', 'stale', 'static'.

    Returns:
        TTL value that must be used for Cache-Control: max-age header.
    """
    mapping = {
        "fresh": CacheConfig.FRESH,
        "normal": CacheConfig.NORMAL,
        "stale": CacheConfig.STALE,
        "static": CacheConfig.STATIC,
    }
    if data_freshness not in mapping:
        raise ValueError(
            f"Unknown freshness category '{data_freshness}'. "
            f"Valid options: {list(mapping.keys())}"
        )
    return mapping[data_freshness]


# ❌ BAD: Single cache layer with hardcoded TTL and no invalidation strategy
def get_product_bad(product_id: int) -> dict:
    """No cache at all — every request hits the database directly."""
    return db.query(Product).filter(Product.id == product_id).one()


# ✅ GOOD: Three-layer cache with proper TTL management and invalidation
@cache_with_invalidation("products", "pricing")
def get_product_pricing(product_id: int) -> dict:
    """Uses all three cache layers. When the product price changes, the
    cache_key_prefix('products', 'pricing') triggers invalidation of all
    related cached entries across Redis."""
    # L1: check in-process memoization (fastest, no network)
    memo_key = f"pricing:{product_id}"
    if memo_key in _local_memo:
        return _local_memo[memo_key]
    
    # L2: check Redis distributed cache
    redis_result = redis_cache_get(redis_client, memo_key, CacheConfig.NORMAL)
    if redis_result is not None:
        _local_memo[memo_key] = redis_result
        return redis_result
    
    # Cache miss — compute from database
    product = db.query(Product).filter(Product.id == product_id).one()
    result = {"id": product.id, "price": product.price, "currency": product.currency}
    
    # Write back to L2 and L1 layers
    redis_cache_set(redis_client, memo_key, result, CacheConfig.NORMAL)
    _local_memo[memo_key] = result
    
    return result


# HTTP response header: Cache-Control: max-age=300, public
# This tells browsers and CDNs to serve the cached response for 5 minutes
```

### Pattern 3: Database Query Optimization with Covering Indexes

Use `EXPLAIN ANALYZE` output to diagnose slow queries, then apply covering indexes that allow PostgreSQL to satisfy a query entirely from the index without visiting the heap. This pattern shows how to read EXPLAIN output and select the right index type.

```sql
-- Pattern 3: Database query optimization with EXPLAIN ANALYZE-driven indexing

-- ❌ BAD: No index on frequently-filtered column — full table scan on large tables
-- EXPLAIN ANALYZE output: Seq Scan on orders ... Actual Rows: 2,500,000 ... Time: 450ms
SELECT * FROM orders
WHERE status = 'shipped' AND created_at > '2024-01-01'
ORDER BY created_at DESC
LIMIT 50;

-- Fix 1: Composite covering index on the WHERE + ORDER BY columns
-- The (status, created_at) composite index allows PostgreSQL to filter and sort
-- without reading the heap for the WHERE clause. Add included column if SELECT * is needed.
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

-- Fix 2: Covering index with INCLUDE for queries that select specific columns
-- This makes the query fully index-only (no heap access needed)
CREATE INDEX idx_orders_covering
ON orders(status, created_at DESC)
INCLUDE (customer_id, total_amount);
-- Now this query runs entirely from the index:
EXPLAIN ANALYZE SELECT id, status, created_at, customer_id, total_amount
FROM orders WHERE status = 'shipped' AND created_at > '2024-01-01'
ORDER BY created_at DESC LIMIT 50;

-- ✅ GOOD: EXPLAIN ANALYZE output after adding covering index shows Index Only Scan
--   "Index Scan using idx_orders_covering on orders ... (actual rows: 50, time: 3ms)"

-- Additional optimization for partial queries using WHERE predicates:
CREATE INDEX idx_orders_recent_shipped
ON orders(created_at DESC)
WHERE status = 'shipped';
-- This partial index is smaller than a full composite index because it only
-- stores rows matching the predicate. Ideal when >80% of rows have other statuses.

-- Connection pooling with PgBouncer: instead of opening new connections per request,
-- reuse pooled connections. Configure in pgbouncer.ini:
-- [pgbouncer]
-- pool_mode = transaction    -- Release connection to pool after each transaction
-- max_client_conn = 200      -- Allow up to 200 simultaneous client connections
-- default_pool_size = 25     -- Maintain 25 connections per database per pool
```

---

## Constraints

### MUST DO

- Measure before and after every performance change — record p50/p95/p99 latency, throughput, and resource usage with identical test data. An unmeasured optimization is speculation, not engineering
- Use production-like data volumes for benchmarking — testing with 10 rows does not reveal index or pagination issues that manifest at 10 million rows. Replicate approximate production data sizes
- Set cache TTLs based on data freshness requirements documented alongside the code. Never hardcode a TTL value without a comment explaining why that specific duration was chosen. Use `CacheConfig.FRESH`, `CacheConfig.NORMAL`, etc. as named constants, not magic numbers
- Add performance regression tests to CI that fail if latency exceeds established thresholds. Use tools like `pytest-benchmark` for Python, `@testing-library` benchmarks for React, or k6 scripts for API endpoints
- Profile with the actual hot path — route representative traffic through the code under test rather than calling isolated unit functions. Profiling a non-hot path produces misleading results

### MUST NOT DO

- Optimize without profiling first — never guess at bottlenecks. If EXPLAIN ANALYZE or `cProfile` hasn't identified the problem, any optimization is premature and adds unnecessary complexity
- Hardcode cache TTLs with magic numbers (e.g., `client.setex("key", 60, value)`) — always use named constants tied to freshness requirements so the intent is documented in code
- Remove database constraints (foreign keys, NOT NULL, unique indexes) for performance reasons — this trades correctness for speed and creates data integrity risks. Optimize queries instead
- Pre-optimize code paths that are not yet identified as bottlenecks by profiler data — the 80/20 rule means 20% of code consumes 80% of time; focus there first

---

## Live References

- [PostgreSQL EXPLAIN ANALYZE Documentation](https://www.postgresql.org/docs/current/using-explain.html) — Official guide to reading query execution plans with actual row counts
- [SQLAlchemy Eager Loading Guide](https://docs.sqlalchemy.org/en/20/orm/queryguide/index.html#sqlalchemy-orm-query-guide) — joinedload, selectinload, and subqueryload usage patterns
- [Redis TTL and Cache Invalidation Patterns](https://redis.io/docs/latest/develop/use/caching-patterns/) — TTL strategies, cache stampede prevention, and write-through patterns
- [Web Vitals Performance Metrics](https://web.dev/vitals/) — Google's LCP, FID, CLS measurement standards for user-perceived performance
- [PgBouncer Connection Pooling Documentation](https://www.pgbouncer.org/config/) — Transaction-level pooling configuration for PostgreSQL applications
- [Python cProfile and py-spy Profiling](https://docs.python.org/3/library/profile.html) — Built-in CPU profiler documentation with output interpretation
- [Lighthouse CI Performance Budgets](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md#performance-budgets) — CI-integrated performance regression detection

---

## Related Skills

| Skill | Purpose |
|---|---|
| `caching-strategies` | Advanced caching architectures including cache-aside, write-through, write-behind, and invalidation patterns at scale |
| `postgresql-performance-tuning` | Database-specific tuning: shared buffers, work_mem, vacuum strategies, and query plan analysis |
| `async-programming` | Asynchronous I/O patterns using asyncio to reduce latency for I/O-bound operations without thread overhead |
