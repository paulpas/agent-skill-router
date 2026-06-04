---
name: postgresql-performance-tuning
description: Diagnoses and optimizes PostgreSQL performance through execution plan
  analysis, index strategies, configuration tuning, autovacuum management, partitioning,
  and monitoring with pg_stat_statements.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: postgresql performance tuning, psql query optimization, index strategy,
    slow queries, pgbouncer, autovacuum tuning, pg_stat_statements, how do i make
    postgresql faster
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
  - examples
  related-skills: coding-database-design-modeling, coding-caching-strategies, coding-performance-optimization
---
# PostgreSQL Performance Tuning

Diagnoses and optimizes PostgreSQL performance across execution plans, indexes, server configuration, connection pooling, vacuum strategy, query patterns, partitioning, and production monitoring. This skill turns raw EXPLAIN ANALYZE output, pg_stat_statements data, and table statistics into actionable optimization decisions for production databases running PostgreSQL 12 through 17.

## TL;DR Checklist

- [ ] Run `EXPLAIN (ANALYZE, BUFFERS)` on every slow query before proposing changes
- [ ] Check buffer cache hit ratio — target >0.99 for OLTP, >0.95 for analytics
- [ ] Verify autovacuum is keeping up: dead_tuple / live_tuple < 20%
- [ ] Ensure `shared_buffers` is 15–25% of total RAM, `effective_cache_size` at 50–75%
- [ ] Deploy PgBouncer in transaction pooling mode for any app with >50 concurrent connections
- [ ] Validate index type matches query pattern: B-tree (default), GIN (JSONB/full-text), GiST (range/spatial), BRIN (time-series)
- [ ] Review composite index column order: equality columns before range columns

---

## When to Use

Use this skill when:

- A production PostgreSQL database is experiencing slow queries or high latency
- EXPLAIN ANALYZE shows sequential scans on large tables where indexes could help
- Autovacuum is falling behind, causing table bloat and degraded query performance
- Connection exhaustion under load indicates the need for connection pooling with PgBouncer
- Tables are growing beyond 10M rows and require partitioning strategies
- `pg_stat_statements` reveals specific queries consuming disproportionate time or I/O
- PostgreSQL configuration parameters have not been tuned for the current hardware
- You need to reduce checkpoint I/O spikes affecting query latency

---

## When NOT to Use

Avoid this skill for:

- Application-level query bugs (e.g., N+1 queries in Python) — fix the application first, then tune the database
- Network latency between app and database server — that is an infrastructure problem
- Missing application caching — use `coding-caching-strategies` before over-tuning the database
- Schema redesign needs — use `coding-database-design-modeling` when table relationships need restructuring

---

## Core Workflow

1. **Capture Baseline Metrics** — Connect to the database and collect current performance data using `pg_stat_statements`, `pg_stat_database`, and buffer cache hit ratio calculations. **Checkpoint:** You must have at least one slow query identified via `pg_stat_statements` (mean_exec_time > 1000ms) before proceeding.

2. **Analyze Execution Plans** — Run `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` on each slow query. Look for sequential scans on tables over 10K rows, nested loops with high row estimates, and actual vs estimated row ratios exceeding 10x. **Checkpoint:** Every identified problem must map to a specific node in the EXPLAIN output.

3. **Select Optimization Strategy** — Choose from: index creation or modification (missing indexes, wrong index type), configuration tuning (shared_buffers, work_mem, checkpoint settings), connection pooling (PgBouncer for high concurrency), vacuum tuning (autovacuum thresholds), partitioning (tables over 10M rows), or query rewriting (subquery to JOIN conversion). **Checkpoint:** The chosen strategy must be reversible — always have a rollback plan.

4. **Apply Changes** — Execute optimizations in the correct order: schema changes first (indexes, partitions), then configuration changes (requires reload), then connection pool changes. Test each change with `EXPLAIN ANALYZE` before moving to the next. **Checkpoint:** Verify improvement on the target query after each change; do not proceed if metrics regress.

5. **Monitor and Document** — Set up continuous monitoring for regression using `pg_stat_statements` tracking, buffer cache hit ratio over time, and autovacuum health checks. Document all changes with before/after metrics. **Checkpoint:** Alert thresholds must be configured within 24 hours of any optimization.

---

## Implementation Patterns

### Pattern 1: EXPLAIN ANALYZE Deep Dive — Diagnosing Execution Plans

Reading EXPLAIN output correctly is the foundation of PostgreSQL performance tuning. The key metrics to extract from every plan: actual rows vs estimated rows (ratio reveals statistics staleness), cost estimates (startup vs total cost determines if parallelism helps), buffer hit/miss ratios (`Buffers:` section shows cache efficiency), and scan types (Seq Scan = missing index or full table read needed).

```sql
-- Comprehensive EXPLAIN for diagnostic depth
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT o.id, o.total, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.created_at > '2026-01-01'
  AND o.status = 'completed'
ORDER BY o.created_at DESC
LIMIT 50;
```

Typical output to analyze:

```
Limit  (cost=1247.82..1247.83 rows=1 width=32) (actual time=48.291..48.293 rows=50 loops=1)
  Output: o.id, o.total, c.name
  ->  Sort  (cost=1247.82..1247.82 rows=1 width=32) (actual time=48.289..48.290 rows=50 loops=1)
        Sort Key: o.created_at DESC
        Sort Method: top-N heapsort  Memory: 38kB
        ->  Nested Loop  (cost=0.71..1247.81 rows=1 width=32) (actual time=0.065..48.234 rows=50 loops=1)
              Output: o.id, o.total, c.name
              ->  Index Scan using orders_pkey on public.orders o  (cost=0.29..436.78 rows=1 width=16) (actual time=0.040..0.041 rows=1 loops=1)
                    Index Cond: (id = 12345)
              ->  Seq Scan on public.customers c  (cost=0.00..811.00 rows=1 width=16) (actual time=0.018..48.179 rows=50 loops=1)
                    Filter: (c.id = o.customer_id)
                    Rows Removed by Filter: 999950
  Buffers: shared hit=123 read=847
Planning Time: 0.312 ms
Execution Time: 48.356 ms
```

Red flags in the output above: `Seq Scan` on `customers` with `Rows Removed by Filter: 999950` means a sequential scan is reading ~1 million rows to find 50 matches — an index on `customers.id` is needed.

**Diagnosing Nested Loop Problems:**
When a Nested Loop shows high row counts (e.g., loops=500,000 with inner rows=1 each), the inner side lacks an appropriate index:

```sql
-- ❌ BAD: Nested loop over 500K rows — missing index on join column
-- Plan shows: Nested Loop (actual rows=500000 loops=1)
-- Inner side: Seq Scan on order_items (Rows Removed by Filter: 499999)

-- ✅ GOOD: Bitmap Heap Scan replaces nested loop with index lookup
-- EXPLAIN shows: Bitmap Index Scan using idx_order_items_order_id
```

**Parallel Query Detection:**
Look for `Worker` lines in EXPLAIN output to confirm parallelism is working:

```sql
-- Force and verify parallel query behavior
SET max_parallel_workers_per_gather = 4;

EXPLAIN (ANALYZE, BUFFERS)
SELECT customer_id, COUNT(*), SUM(total_amount)
FROM orders
WHERE created_at >= '2026-01-01'
GROUP BY customer_id;
```

With parallelism enabled, output includes: `Worker 0`, `Worker 1` showing per-worker row counts. If workers show zero work while `max_parallel_workers_per_gather > 0`, check that the query cost exceeds `parallel_setup_cost` + `parallel_tuple_cost`.

---

### Pattern 2: Index Strategy Selection — Choosing the Right Index Type

PostgreSQL offers five index methods, each optimized for different query patterns. Selecting the wrong type wastes disk I/O and slows writes.

**B-tree (default):** Best for equality lookups, range queries (`>`, `<`, `BETWEEN`), ORDER BY, and DISTINCT. Use when the query uses comparison operators or sorts results.

```sql
-- B-tree: standard single-column index for equality lookups
CREATE INDEX CONCURRENTLY idx_orders_customer_id
  ON orders (customer_id);

-- Composite B-tree with leftmost prefix rule: equality columns first, range second
-- Query WHERE customer_id = 5 AND status IN ('pending', 'processing') AND created_at > '2026-01-01'
-- Column order: customer_id (equality) → status (equality/IN) → created_at (range)
CREATE INDEX CONCURRENTLY idx_orders_customer_status_date
  ON orders (customer_id, status, created_at DESC);

-- Covering index for index-only scans — eliminates table lookups entirely
-- Query: SELECT email FROM users WHERE active = true;
CREATE INDEX CONCURRENTLY idx_users_active_covering
  ON users (active) INCLUDE (email, full_name);
```

**GIN (Generalized Inverted Index):** Best for JSONB columns, array columns, and full-text search (`tsvector`). Each element in an array or JSON path becomes a separate index entry.

```sql
-- GIN index on JSONB column — supports ? && @> ? operators
CREATE INDEX CONCURRENTLY idx_orders_tags_gin
  ON orders USING gin (tags);

-- GIN with jsonb_path_ops — more compact, only supports @> operator
-- Faster reads but less flexibility (no = or ? operators)
CREATE INDEX CONCURRENTLY idx_metadata_path_ops
  ON documents USING gin (metadata jsonb_path_ops);

-- GIN for full-text search
ALTER TABLE articles ADD COLUMN content_tsv tsvector;
UPDATE articles SET content_tsv = to_tsvector('english', title || ' ' || body);
CREATE INDEX CONCURRENTLY idx_articles_fts
  ON articles USING gin (content_tsv);

-- Query with GIN full-text index
SELECT id, title FROM articles
WHERE content_tsv @@ to_tsquery('english', 'database & performance');
```

**GiST (Generalized Search Tree):** Best for range types, geometric data, and nearest-neighbor searches. Supports `<>`, `<->` distance operators.

```sql
-- GiST for spatial queries (PostGIS)
CREATE INDEX CONCURRENTLY idx_locations_geom
  ON locations USING gist (geom);

-- GiST for range types (e.g., date ranges)
CREATE INDEX CONCURRENTLY idx_booking_ranges
  ON reservations USING gist (date_range);

-- Nearest-neighbor search with PostGIS
SELECT id, name, geom <-> ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326) AS distance
FROM locations
ORDER BY geom <-> ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326)
LIMIT 10;
```

**BRIN (Block Range INdex):** Best for large tables with natural sort-order correlation like time-series data, sequential IDs, or auto-incrementing primary keys. Extremely compact index size but only effective when data is physically ordered.

```sql
-- BRIN for time-series: pages are naturally sorted by created_at
CREATE INDEX CONCURRENTLY idx_events_created_at_brin
  ON events USING brin (created_at) WITH (pages_per_range = 128);

-- BRIN checkpoint to update the index summary after bulk loads
-- Required periodically since BRIN doesn't track every row
SELECT brin_summarize_new_values('idx_events_created_at_brin');

-- Verify correlation — BRIN only works when data is physically sorted
-- Correlation > 0.8 or < -0.8 means BRIN will be effective
SELECT attname, correlation
FROM pg_stats
WHERE tablename = 'events' AND attname = 'created_at';
```

**Partial Indexes:** Index only rows matching a WHERE clause — reduces index size dramatically when queries filter on a specific condition.

```sql
-- Partial index: only index active orders (typically <5% of total)
CREATE INDEX CONCURRENTLY idx_orders_active_status_date
  ON orders (customer_id, created_at DESC)
  WHERE status = 'active';

-- Expression partial index for NULL-safe lookups
CREATE INDEX CONCURRENTLY idx_users_email_lookup
  ON users (email)
  WHERE email IS NOT NULL;
```

**Expression Indexes:** Index the result of a function applied to a column — enables index-based lookups on transformed data.

```sql
-- Case-insensitive search using expression index
CREATE INDEX CONCURRENTLY idx_users_email_lower
  ON users (lower(email));

-- Query automatically uses the expression index
SELECT * FROM users WHERE lower(email) = 'admin@example.com';

-- Expression index with GIN for array containment
CREATE INDEX CONCURRENTLY idx_events_tags_normalized
  ON events USING gin (array_lower(tags, 1), array_upper(tags, 1));
```

---

### Pattern 3: Configuration Tuning — postgresql.conf Parameters

PostgreSQL configuration parameters interact in complex ways. Changing one parameter without understanding its effect on others can degrade performance. The following covers the critical parameters in priority order.

**`shared_buffers`** — Memory allocated for PostgreSQL's buffer cache (page cache). Set to 15–25% of total system RAM. Must be a multiple of 128KB. On Linux, the OS file system cache (referenced by `effective_cache_size`) works alongside this.

```ini
# For a 32GB server:
shared_buffers = 8GB        # ~25% of RAM
effective_cache_size = 24GB # ~75% of RAM (planner heuristic)
```

**`work_mem`** — Memory per-sort or per-hash operation *per query segment*. Dangerous when multiplied by concurrent connections. Default is 4MB; increase cautiously for complex queries but keep low for high-concurrency OLTP.

```ini
# Conservative: 16MB per sort/hash op (safe for 200+ concurrent connections)
work_mem = 16MB

# Aggressive: 64MB (only for dedicated analytics servers with <50 connections)
# work_mem = 64MB  # NOT recommended for production OLTP with many connections
```

**`maintenance_work_mem`** — Memory for VACUUM, CREATE INDEX, and ALTER TABLE operations. Set higher since these are infrequent operations.

```ini
# For a 32GB server: 1-2GB (maintenance ops don't multiply across connections)
maintenance_work_mem = 1GB
```

**`effective_io_concurrency`** — Number of concurrent disk I/O operations the planner assumes the storage can handle. Set to 200 for SSD/NVMe, 1 for spinning disks.

```ini
# SSD/NVMe storage
effective_io_concurrency = 200

# Spinning disk (HDD)
# effective_io_concurrency = 1
```

**Checkpoint tuning** — Controls how frequently checkpoints occur and how fast they write dirty pages.

```ini
# Checkpoint frequency: target checkpoint completion over 90% of the interval
checkpoint_completion_target = 0.9

# WAL segment size (default 16MB, increase for high-write workloads)
#wal_level = replica

# Archive mode for point-in-time recovery (enables pg_waldump analysis)
wal_compression = on
```

**Parallel query settings:**

```ini
# Max parallel workers per gather node (match to CPU cores available)
max_parallel_workers_per_gather = 4

# Total max parallel workers across all backends
max_parallel_workers = 8

# Total background worker capacity
max_worker_processes = 16
```

---

### Pattern 4: PgBouncer Connection Pooling — Configuration and Mode Selection

Connection pooling is essential for any PostgreSQL-backed application with more than ~30 concurrent database connections. PgBouncer is the industry-standard pooler, providing transaction-level isolation between client sessions and backend connections.

**Sizing Rules:**
```
optimal_pool_size = (max_client_connections * 0.8) / num_postgres_backends
```
For a setup with one PostgreSQL server: `default_pool_size = max_client_connections * 0.8`.

**PgBouncer Configuration — Transaction Pooling Mode (Recommended):**

```ini
# /etc/pgbouncer/pgbouncer.ini
[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
unix_socket_dir = /var/run/postgresql
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
server_lifetime = 3600        # Maximum connection lifetime in seconds (1 hour)
server_idle_timeout = 300     # Close idle server connections after 5 minutes
server_connect_timeout = 15
server_login_retry_timeout = 3
cancel_wait_timeout = 10
query_timeout = 120
query_wait_timeout = 60
client_idle_timeout = 0
log_connections = 1
log_disconnections = 1
admin_users = postgres, pgbouncer_stats
stats_users = pgbouncer_stats

[databases]
appdb = host=127.0.0.1 port=5432 dbname=appdb pool_size=25
```

**PgBouncer Pooling Modes Comparison:**

| Mode | Behavior | Use When | Transaction Safety |
|------|----------|----------|-------------------|
| `transaction` | Reuses connections across transactions; client releases connection back to pool immediately after COMMIT/ROLLBACK | General OLTP workloads, high concurrency (>50 connections), most applications | ✅ Safe — all transaction state cleared between uses |
| `session` | One client connection tied to one server connection for the entire session lifetime. Behaves like direct connection | Applications using prepared statements, temporary tables, or SET LOCAL that must persist | ✅ Fully safe but uses more connections |
| `statement` | Closes server connection after each query statement. Least overhead but incompatible with most features | Read-only queries that never use transactions | ❌ Unsafe for write workloads — no transaction support |

```ini
# Session pooling: safest mode, one connection per client session
# Use when application relies on PostgreSQL session state (SET LOCAL, temporary tables)
pool_mode = session
default_pool_size = 20       # Smaller because each client holds a dedicated connection

# Statement pooling: rarely appropriate for real applications
pool_mode = statement
# Only use for read-only analytics queries with no transaction needs
```

**Monitoring PgBouncer:**

```sql
-- Connect to pgbouncer database directly (not appdb)
psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer

SHOW DATABASES;   -- List configured databases and their connection limits
SHOW STATS;       -- Aggregate statistics across all connections
SHOW CLIENTS;     -- Connected client sessions
SHOW SERVERS;     – Active server (backend) connections
SHOW POOLS;       -- Pool status with waiting_clients count — the critical metric
SHOW VERSION;     -- PgBouncer version and uptime
```

`SHOW POOLS` output to watch for `waiting_clients > 0` — indicates connection starvation. If `waiting_clients` is persistently non-zero, increase `default_pool_size` or `max_client_conn`.

---

### Pattern 5: Autovacuum Tuning and Dead Tuple Monitoring

Autovacuum reclaims dead tuples created by UPDATE and DELETE operations. When it falls behind, queries scan dead tuples alongside live ones, wasting I/O and CPU. The key health metric is the dead tuple ratio: `n_dead_tup / n_live_tup`. Above 20%, autovacuum is falling behind and requires intervention.

**Autovacuum Monitoring Query:**

```sql
-- Comprehensive autovacuum health check
SELECT
    schemaname,
    relname AS table_name,
    n_live_tup,
    n_dead_tup,
    CASE WHEN n_live_tup > 0
         THEN ROUND(100.0 * n_dead_tup / n_live_tup, 2)
         ELSE 0 END AS dead_pct,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    n_mod_since_analyze,
    pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size
FROM pg_stat_user_tables s
JOIN pg_class c ON c.relname = s.relname AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = s.schemaname)
WHERE n_live_tup > 10000          -- Ignore tiny tables
ORDER BY n_dead_tup DESC;
```

**Autovacuum Configuration at Table Level:**

```sql
-- For a high-churn OLTP table (e.g., 'orders' with millions of updates):
ALTER TABLE orders SET (
    autovacuum_vacuum_threshold = 1000,              -- Minimum dead tuples before vacuum triggers
    autovacuum_vacuum_scale_factor = 0.05,           -- 5% of live rows (lower = more frequent)
    autovacuum_analyze_threshold = 500,
    autovacuum_analyze_scale_factor = 0.02,          -- Analyze more often for better statistics
    autovacuum_vacuum_cost_delay = 2,                -- Reduce cost delay to vacuum faster
    autovacuum_vacuum_cost_limit = 1000              -- Allow more I/O per vacuum cycle
);

-- For a low-churn lookup table (e.g., 'countries', rarely modified):
ALTER TABLE countries SET (
    autovacuum_enabled = false                       -- Safe to disable for static reference tables
);

-- For append-only time-series data:
ALTER TABLE events SET (
    autovacuum_vacuum_scale_factor = 0.25,           -- Less frequent — dead tuples get partitioned away
    autovacuum_analyze_scale_factor = 0.10
);
```

**Global Default Tuning (postgresql.conf):**

```ini
# Global autovacuum settings — overridden per-table as needed
autovacuum = on
autovacuum_max_workers = 3              # Number of concurrent autovacuum workers
autovacuum_naptime = 60                 # How often to check for tables needing vacuum (seconds)
autovacuum_vacuum_threshold = 50        # Global dead tuple threshold before vacuum triggers
autovacuum_vacuum_scale_factor = 0.2    # 20% of live rows above threshold
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.1   # 10% for statistics refresh
```

**Bloat Detection and Remediation:**

```sql
-- Detect table bloat ratio
SELECT
    schemaname,
    relname AS table_name,
    n_live_tup,
    n_dead_tup,
    pg_size_pretty(pg_total_relation_size(c.oid)) AS total_table_size,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_ratio_pct,
    CASE WHEN n_dead_tup > n_live_tup * 0.2 THEN 'NEEDS_VACUUM'
         ELSE 'OK' END AS status
FROM pg_stat_user_tables s
JOIN pg_class c ON c.relname = s.relname AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = s.schemaname)
ORDER BY n_dead_tup DESC;

-- Detect index bloat: compare actual index size to expected based on row count
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0                      -- Unused indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Vacuum Remediation Commands:**

```sql
-- Manual vacuum with analyze (use during maintenance window for large tables)
VACUUM (VERBOSE, ANALYZE) orders;

-- VACUUM FULL rewrites the entire table — exclusive lock, use only during downtime
VACUUM FULL VERBOSE orders;

-- REINDEX rebuilds a specific index to reduce bloat (online, no table lock)
REINDEX INDEX CONCURRENTLY idx_orders_customer_id;

-- pg_repack for online reorganization without locking (requires extension installed)
-- Requires: CREATE EXTENSION pg_repack;
-- Usage: psql -d appdb -c "SELECT pg_repack.repack('orders');"
```

---

### Pattern 6: Query Optimization Patterns — Subqueries, CTEs, and Window Functions

Transforming query structure can yield order-of-magnitude performance improvements. The following patterns address the most common anti-patterns in PostgreSQL queries.

**Subquery to JOIN Conversion:**

```sql
-- ❌ BAD: Correlated subquery executes once per row in outer query
SELECT o.id, o.total,
    (SELECT c.name FROM customers c WHERE c.id = o.customer_id) AS customer_name
FROM orders o
WHERE o.created_at > '2026-01-01';

-- ✅ GOOD: JOIN with index lookup on customers.id — single table scan of both tables
SELECT o.id, o.total, c.name AS customer_name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.created_at > '2026-01-01';

-- Index required: CREATE INDEX CONCURRENTLY idx_orders_created_at ON orders(created_at);
```

**CTE Materialization Control (PostgreSQL 12+):**

```sql
-- PostgreSQL 12 changed CTE behavior: they are now inlined by default unless referenced once or used in a non-optimizable context.
-- Use MATERIALIZED to force materialization (save results in temp storage).
-- Use INLINE to force inlining (merge into parent query).

-- ❌ BAD: CTE may be inlined, causing the filter to not push down efficiently
WITH recent_orders AS (
    SELECT * FROM orders WHERE created_at > '2026-01-01'
)
SELECT * FROM recent_orders JOIN customers c ON c.id = customer_id;

-- ✅ GOOD: Force materialization when CTE result is large and reused
WITH recent_orders AS MATERIALIZED (
    SELECT * FROM orders WHERE created_at > '2026-01-01'
)
SELECT * FROM recent_orders r
JOIN customers c ON c.id = r.customer_id
WHERE r.status = 'completed';

-- ✅ GOOD: Force inline when CTE should act as a filter push-down
SELECT * FROM (
    SELECT * FROM orders WHERE created_at > '2026-01-01'
) AS recent_orders INLINE
JOIN customers c ON c.id = recent_orders.customer_id;
```

**Lateral Joins for Correlated Subqueries:**

```sql
-- ❌ BAD: Correlated subquery in SELECT — executes per row
SELECT o.id, o.total,
    (SELECT MAX(o2.created_at) FROM orders o2 WHERE o2.customer_id = o.customer_id AND o2.id != o.id) AS previous_order_date
FROM orders o;

-- ✅ GOOD: Lateral join — optimizer can parallelize and use indexes on the inner query
SELECT o.id, o.total, prev.max_date AS previous_order_date
FROM orders o
LEFT JOIN LATERAL (
    SELECT MAX(created_at) AS max_date
    FROM orders o2
    WHERE o2.customer_id = o.customer_id
      AND o2.id != o.id
) prev ON true;

-- Index required: CREATE INDEX CONCURRENTLY idx_orders_customer_id_date ON orders(customer_id, created_at DESC);
```

**Window Function Optimization:**

```sql
-- Efficient window function for running totals and row numbering
SELECT
    order_id,
    customer_id,
    total_amount,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at) AS order_sequence,
    SUM(total_amount) OVER (PARTITION BY customer_id ORDER BY created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total,
    AVG(total_amount) OVER (PARTITION BY customer_id ORDER BY created_at ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg_7d
FROM orders
WHERE created_at >= '2026-01-01'
ORDER BY customer_id, created_at;

-- For window functions on large datasets, ensure the partition columns are indexed
CREATE INDEX CONCURRENTLY idx_orders_customer_created ON orders(customer_id, created_at);
```

**Prepared Statement Plan Cache Implications:**

```sql
-- Prepared statements cache the first plan and reuse it for all subsequent executions.
-- This is beneficial when parameter values produce similar plans but dangerous when
-- data distribution causes dramatically different optimal plans.

-- ✅ GOOD: Use prepared statements for queries with stable plans
PREPARE get_order_by_id (integer) AS
SELECT * FROM orders WHERE id = $1;
EXECUTE get_order_by_id(12345);

-- ❌ BAD: Using prepared statements where parameter selectivity varies wildly
-- Example: searching by status where some statuses have 1 row and others have 1M rows
-- The first plan (cached) may be terrible for subsequent different-status queries.
-- Instead, use server-side prepare with proper bind variables or let PostgreSQL handle plan caching.

-- Fix for varying selectivity: use pg_hint_plan or force parameterized plans
-- Or simply avoid PREPARE for highly variable queries — let PL/pgSQL handle it
```

---

### Pattern 7: Partitioning — Declarative Partitioning (PostgreSQL 10+)

Partitioning splits a large table into smaller, more manageable pieces. It excels at time-series data and improves query performance through partition pruning. However, it adds complexity to maintenance operations and can degrade write performance if over-partitioned.

**When to Partition:**
- Tables exceeding ~10M rows with clear temporal or categorical boundaries
- Query patterns naturally filter on the partition key (enables partition pruning)
- Historical data needs different retention policies per partition

**When NOT to Partition:**
- Tables under 1M rows — partition overhead outweighs benefits
- Read-heavy workloads without filtering on partition key — scans all partitions
- High-write workloads with many concurrent inserts — partition lock contention

**Range Partitioning by Date:**

```sql
-- Create a partitioned table (PostgreSQL 10+)
CREATE TABLE events (
    event_id      BIGSERIAL,
    event_type    VARCHAR(50) NOT NULL,
    payload       JSONB,
    created_at    TIMESTAMPTZ NOT NULL,
    source        VARCHAR(100),
    PRIMARY KEY (event_id, created_at)  -- Partition key must be part of PK
) PARTITION BY RANGE (created_at);

-- Create monthly partitions with proper naming convention
CREATE TABLE events_2026_01 PARTITION OF events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE events_2026_02 PARTITION OF events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE events_2026_03 PARTITION OF events
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Create default partition for any dates outside defined ranges
CREATE TABLE events_default PARTITION OF events DEFAULT;

-- Automatic index creation on partition key
-- Indexes defined on the parent table are automatically created on each partition
CREATE INDEX CONCURRENTLY idx_events_type_created ON events(event_type, created_at DESC);
```

**Partition Pruning Demonstration:**

```sql
-- EXPLAIN shows which partitions are scanned — "Partitions selected: 1" means pruning works
EXPLAIN (ANALYZE, BUFFERS)
SELECT event_type, COUNT(*) AS count
FROM events
WHERE created_at >= '2026-03-01' AND created_at < '2026-04-01'
GROUP BY event_type;

-- Typical output with pruning:
-- Partition Pruning: Pruned 34 of 35 partitions
-- -> Append (actual rows=...)
--     -> Seq Scan on events_2026_03 ...   <-- Only the matching partition is scanned

-- Without proper date filtering, ALL partitions are scanned:
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM events WHERE event_type = 'purchase';
-- Output shows scanning all partitions — this is expected and correct behavior
```

**Automatic Partition Management with a Scheduler:**

```python
def create_future_partitions(
    table_name: str = "events",
    partition_key: str = "created_at",
    months_ahead: int = 12,
    conn_string: str = "postgresql://user:pass@localhost/appdb"
) -> list[str]:
    """Create monthly partitions for future months to avoid insert failures.
    
    Uses psycopg2 for connection management and generates CREATE TABLE
    statements following the naming convention events_YYYY_MM.
    
    Args:
        table_name: Name of the parent partitioned table
        partition_key: Column used for range partitioning
        months_ahead: Number of future months to pre-create partitions
        conn_string: PostgreSQL connection string
    
    Returns:
        List of created partition names
    """
    import psycopg2
    from datetime import datetime, timedelta
    from dateutil.relativedelta import relativedelta

    created = []
    with psycopg2.connect(conn_string) as conn:
        cursor = conn.cursor()
        # Get the latest existing partition boundary
        cursor.execute(f"""
            SELECT pg_get_expr(relpartbound, c.oid)
            FROM pg_class p
            JOIN pg_inherits i ON i.inhparent = p.oid
            JOIN pg_class c ON c.oid = i.inhrelid
            WHERE p.relname = %s
            ORDER BY p.relname DESC LIMIT 1;
        """, (table_name,))
        row = cursor.fetchone()
        latest_boundary = row[0] if row else None

        # Determine starting month for partition creation
        start_date = datetime.now().replace(day=1)
        if latest_boundary:
            # Parse the boundary date from pg_get_expr output like "FROM ('2026-05-01')"
            start_date = datetime.strptime(latest_boundary.split("'")[1], "%Y-%m-%d").replace(day=1)

        for i in range(1, months_ahead + 1):
            partition_date = start_date + relativedelta(months=i)
            next_date = partition_date + relativedelta(months=1)
            partition_name = f"{table_name}_{partition_date.strftime('%Y_%m')}"

            create_sql = f"""
                CREATE TABLE IF NOT EXISTS {partition_name}
                PARTITION OF {table_name}
                FOR VALUES FROM ('{partition_date}') TO ('{next_date}');
            """
            cursor.execute(create_sql)
            created.append(partition_name)

        conn.commit()
    return created


def drop_old_partitions(
    table_name: str = "events",
    keep_months: int = 24,
    conn_string: str = "postgresql://user:pass@localhost/appdb"
) -> list[str]:
    """Drop partitions older than the retention period."""
    import psycopg2
    from datetime import datetime, timedelta

    dropped = []
    cutoff_date = (datetime.now() - timedelta(days=365 * keep_months)).strftime("%Y-%m-%d")

    with psycopg2.connect(conn_string) as conn:
        cursor = conn.cursor()
        # Find partitions below retention cutoff
        cursor.execute(f"""
            SELECT c.relname FROM pg_class p
            JOIN pg_inherits i ON i.inhparent = p.oid
            JOIN pg_class c ON c.oid = i.inhrelid
            WHERE p.relname = %s AND c.relname != '{table_name}_default'
              AND pg_get_expr(c.relpartbound, c.oid) < 'FROM (\\'{cutoff_date}\\')';
        """, (table_name,))

        for (partition_name,) in cursor.fetchall():
            drop_sql = f"DROP TABLE IF EXISTS {partition_name} CASCADE;"
            cursor.execute(drop_sql)
            dropped.append(partition_name)

        conn.commit()
    return dropped
```

**Hash Partitioning for Even Distribution:**

```sql
-- Hash partitioning distributes rows evenly across partitions by hash value.
-- Useful when you have no natural range (like date) but need to split large tables.

CREATE TABLE sessions (
    session_id  BIGSERIAL,
    user_id     BIGINT NOT NULL,
    data        JSONB,
    created_at  TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (session_id)
) PARTITION BY HASH (user_id);

-- Create 8 hash partitions — distribute by modulo
CREATE TABLE sessions_p0 PARTITION OF sessions FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE sessions_p1 PARTITION OF sessions FOR VALUES WITH (MODULUS 8, REMAINDER 1);
CREATE TABLE sessions_p2 PARTITION OF sessions FOR VALUES WITH (MODULUS 8, REMAINDER 2);
CREATE TABLE sessions_p3 PARTITION OF sessions FOR VALUES WITH (MODULUS 8, REMAINDER 3);
CREATE TABLE sessions_p4 PARTITION OF sessions FOR VALUES WITH (MODULUS 8, REMAINDER 4);
CREATE TABLE sessions_p5 PARTITION OF sessions FOR VALUES WITH (MODULUS 8, REMAINDER 5);
CREATE TABLE sessions_p6 PARTITION OF sessions FOR VALUES WITH (MODULUS 8, REMAINDER 6);
CREATE TABLE sessions_p7 PARTITION OF sessions FOR VALUES WITH (MODULUS 8, REMAINDER 7);

-- Queries filtering on user_id will prune to exactly one partition
SELECT * FROM sessions WHERE user_id = 123456;
-- Partition Pruning: Pruned 7 of 8 partitions
```

---

### Pattern 8: Monitoring and Diagnostics — pg_stat_statements and System Views

Production monitoring requires the `pg_stat_statements` extension, which tracks query execution statistics across all queries. This is the single most important tool for identifying slow queries and understanding database behavior.

**Enabling pg_stat_statements:**

```sql
-- Add to postgresql.conf:
shared_preload_libraries = 'pg_stat_statements'   # Requires PostgreSQL restart

-- Then create the extension in each database you want to monitor:
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Configure statistics collection thresholds
# Track all queries taking >1ms (set higher for high-traffic systems)
pg_stat_statements.track = all      # track 'all', 'top', or 'none'
pg_stat_statements.max = 10000      # Maximum number of tracked queries
pg_stat_statements.track_utility = off   # Don't track utility commands (VACUUM, etc.)
```

**Interpreting pg_stat_statements:**

```sql
-- Top 20 slowest queries by total execution time
SELECT
    queryid,
    query,
    calls,
    ROUND(total_exec_time / calls, 2) AS mean_exec_ms,
    ROUND(total_exec_time / 1000, 2) AS total_exec_seconds,
    ROUND(min_exec_time, 2) AS min_ms,
    ROUND(max_exec_time, 2) AS max_ms,
    ROUND(mean_exec_time, 2) AS mean_ms,
    ROUND(stddev_exec_time, 2) AS stddev_ms,
    rows,
    shared_blks_hit,
    shared_blks_read,
    -- Buffer cache efficiency for this query
    ROUND(100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0), 2) AS hit_pct,
    temp_blks_written,
    wal_bytes
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY total_exec_time DESC
LIMIT 20;

-- Queries with worst I/O efficiency (low hit ratio) — candidates for indexing
SELECT
    query,
    calls,
    ROUND(mean_exec_time, 2) AS mean_ms,
    shared_blks_hit,
    shared_blks_read,
    ROUND(100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0), 2) AS cache_hit_pct
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND shared_blks_hit + shared_blks_read > 1000
ORDER BY cache_hit_pct ASC
LIMIT 10;

-- Queries consuming the most I/O pages (read-heavy)
SELECT
    query,
    calls,
    ROUND(mean_exec_time, 2) AS mean_ms,
    shared_blks_read,
    temp_blks_written,
    -- External I/O ratio — reads that miss the buffer cache
    ROUND(100.0 * shared_blks_read / NULLIF(shared_blks_hit + shared_blks_read, 0), 2) AS io_ratio_pct
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY shared_blks_read DESC
LIMIT 10;
```

**Buffer Cache Hit Ratio — The Golden Metric:**

```sql
-- Overall buffer cache hit ratio (target: >0.99 for OLTP)
-- Formula: sum(blks_hit) / (sum(blks_hit) + sum(blks_read))
SELECT
    round(100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2) AS cache_hit_pct,
    sum(blks_hit) AS total_hits,
    sum(blks_read) AS total_reads,
    sum(blks_written) AS total_writes,
    sum(conns) AS active_connections,
    sum(tup_fetched) AS rows_returned,
    sum(tup_inserted) AS rows_inserted,
    sum(tup_updated) AS rows_updated,
    sum(tup_deleted) AS rows_deleted
FROM pg_stat_database
WHERE datname = current_database();

-- Interpretation:
-- > 99% : Excellent — buffer cache is doing its job
-- 95-99%: Acceptable for OLTP with large working sets
-- < 90% : Critical — either shared_buffers is too low or queries are scanning entire tables
```

**Table-Level Health Monitoring:**

```sql
-- Comprehensive table health dashboard
SELECT
    s.schemaname,
    s.relname AS table_name,
    pg_size_pretty(pg_total_relation_size(s.relid)) AS total_size,
    pg_size_pretty(pg_relation_size(s.relid)) AS table_size,
    pg_size_pretty(pg_indexes_size(s.relid)) AS indexes_size,
    s.seq_scan,
    s.idx_scan,
    CASE WHEN s.seq_scan + s.idx_scan > 0
         THEN ROUND(100.0 * s.idx_scan / (s.seq_scan + s.idx_scan), 2)
         ELSE 0 END AS index_usage_pct,
    s.n_live_tup,
    s.n_dead_tup,
    CASE WHEN s.n_live_tup > 0
         THEN ROUND(100.0 * s.n_dead_tup / s.n_live_tup, 2)
         ELSE 0 END AS dead_tuple_pct,
    s.n_mod_since_analyze,
    COALESCE(s.last_vacuum, 'never') AS last_vacuum,
    COALESCE(s.last_autovacuum, 'never') AS last_autovacuum,
    COALESCE(s.last_analyze, 'never') AS last_analyze,
    COALESCE(s.last_autoanalyze, 'never') AS last_autoanalyze
FROM pg_stat_user_tables s
ORDER BY pg_total_relation_size(s.relid) DESC;

-- Critical alerts: tables with high dead tuple ratios and no recent vacuum
SELECT relname AS alert_table, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > n_live_tup * 0.20   -- More than 20% dead tuples
  AND (last_autovacuum IS NULL OR last_autovacuum < NOW() - INTERVAL '24 hours')
ORDER BY n_dead_tup DESC;
```

**Checkpoint I/O Monitoring:**

```sql
-- Monitor checkpoint frequency and duration — spikes indicate I/O pressure
SELECT
    checkpoints_timed,
    checkpoints_req,
    checkpoint_write_time,
    checkpoint_sync_time,
    buffers_checkpoint,
    buffers_clean,
    maxwritten_clean
FROM pg_stat_bgwriter;

-- Interpretation:
-- checkpoints_timed << checkpoints_req means frequent forced checkpoints
--   → shared_buffers is too small; dirty pages accumulate faster than auto-checkpoint can write them.
-- checkpoint_write_time / checkpoint_sync_time ratio indicates disk speed type.

-- Tune checkpoints for smoother I/O:
# In postgresql.conf:
checkpoint_completion_target = 0.9        # Spread writes over 90% of interval (was 0.5 in PG < 9.6)
```

---

## Constraints

### MUST DO
- Always run `EXPLAIN (ANALYZE, BUFFERS)` before proposing any index or schema change
- Target buffer cache hit ratio >0.99 for OLTP workloads; document baseline before and after changes
- Size `shared_buffers` to 15–25% of total system RAM and `effective_cache_size` to 50–75%
- Set `work_mem` conservatively (4–16MB) for production OLTP — the per-operation × concurrent connection multiplication is a common trap
- Deploy PgBouncer in transaction pooling mode (`pool_mode = transaction`) for applications exceeding ~30 concurrent database connections
- Monitor `n_dead_tup / n_live_tup` ratio daily; alert when it exceeds 20% on any production table
- Use `CREATE INDEX CONCURRENTLY` to avoid locking tables during index creation in production
- Order composite index columns by leftmost prefix rule: equality columns first, then range columns
- Partition tables exceeding ~10M rows where queries filter on the partition key (enables partition pruning)
- Test all configuration changes against `EXPLAIN ANALYZE` output before applying to production

### MUST NOT DO
- Set `work_mem` above 64MB on any server handling concurrent connections — memory exhaustion will crash PostgreSQL
- Run `VACUUM FULL` in production without scheduling a maintenance window — it takes an exclusive lock on the entire table
- Disable autovacuum on production tables unless the table is truly static (reference data, lookup tables)
- Create indexes on foreign key columns without verifying actual query patterns — unused indexes slow writes
- Use GIN indexes for simple equality lookups — B-tree is always faster for single-value comparisons
- Partition tables under 1M rows — the partition overhead adds unnecessary complexity with no benefit
- Configure `checkpoint_completion_target` below 0.9 — this concentrates I/O into short bursts that hurt query latency
- Create partial indexes without a WHERE clause that matches actual query predicates

---

## Output Template

When diagnosing or optimizing PostgreSQL performance, produce:

1. **Baseline Metrics** — Current buffer cache hit ratio, autovacuum dead tuple ratios for top tables, and pg_stat_statements slow query summary
2. **EXPLAIN ANALYZE Output** — Full plan for the target query with `BUFFERS` included, highlighting scan types and actual vs estimated row discrepancies
3. **Identified Issues** — Specific problems found (e.g., "Sequential scan on orders table with 950K rows removed by filter")
4. **Optimization Recommendations** — Concrete changes: index type and columns, configuration parameter values, or query rewrites
5. **Rollback Plan** — Commands to undo each change (DROP INDEX, ALTER SYSTEM RESET, revert config file)

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-database-design-modeling` | Schema design and normalization before performance tuning — fix the structure first |
| `coding-caching-strategies` | Application-level caching (Redis/Memcached) to reduce database load before over-tuning PostgreSQL |
| `coding-performance-optimization` | Broader application performance optimization including query patterns, batching, and async processing |

---

## Live References

> Authoritative documentation and operational guides for PostgreSQL performance tuning.

- [PostgreSQL Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html) — Official performance guidance from PostgreSQL documentation
- [EXPLAIN (Documentation)](https://www.postgresql.org/docs/current/using-explain.html) — Complete EXPLAIN output format and interpretation guide
- [pg_stat_statements Extension](https://www.postgresql.org/docs/current/pgstatstatements.html) — Query statistics tracking extension reference
- [PostgreSQL Configuration Parameters](https://www.postgresql.org/docs/current/runtime-config.html) — Full parameter catalog with defaults and descriptions
- [PgBouncer Documentation](https://www.pgbouncer.org/config.html) — Connection pooling configuration, modes, and monitoring
- [PostgreSQL Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html) — Declarative partitioning setup and management
- [pg_repack Extension](https://github.com/reorg/pg_repack) — Online table reorganization without exclusive locks
