---




name: database-admin
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements database administration best practices (PostgreSQL tuning,
  MySQL replication, MongoDB sharding, Redis optimization) with real operational commands
  and query analysis patterns.
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: code
  related-skills: cncf-azure-managed-database, cncf-postgresql
  role: implementation
  scope: infrastructure
  triggers: database administration, postgresql tuning, connection pooling, query
    optimization, vacuuming, mysql replication, mongodb sharding, redis memory
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
version: "1.0.0"




---




# Database Administration

Implements comprehensive database administration practices across PostgreSQL, MySQL, MongoDB, and Redis with real operational commands, performance optimization patterns, and emergency procedures.

## TL;DR Checklist

- [ ] Run EXPLAIN ANALYZE before executing production queries
- [ ] Check connection pool usage before scaling
- [ ] Verify vacuum progress on large tables
- [ ] Confirm replication lag before failover
- [ ] Monitor Redis memory fragmentation ratio
- [ ] Validate shard balance before adding new shards

---

## When to Use

Use this skill when:

- Tuning slow queries in PostgreSQL using EXPLAIN ANALYZE and index optimization
- Configuring connection pooling (pgbouncer, proxysql) for high-concurrency applications
- Setting up MySQL replication or failover for high availability
- Diagnosing MongoDB performance issues with query analysis and shard balancing
- Optimizing Redis memory usage and persistence configuration
- Planning emergency database maintenance windows
- Reviewing database performance metrics before scaling decisions

---

## When NOT to Use

Avoid this skill for:

- Simple CRUD operations with known-fast queries (use application-level caching instead)
- Development environments where performance isn't critical
- Schema design decisions (use coding-database-schema instead)
- Backup/restore operations (use cncf-backup-automation instead)
- Database migration scripts (use cncf-migration-tooling instead)
- Basic database connectivity (use exchange-adapters for trading platform connections)

---

## Core Workflow

1. **Assess Current State** — Connect to database and run diagnostic queries to understand current performance baseline. **Checkpoint:** You must have EXPLAIN output for slow queries before proceeding.

2. **Identify Bottleneck Category** — Classify issues as: query optimization, connection management, resource allocation, or infrastructure limits. **Checkpoint:** You must have a clear category before selecting optimization strategy.

3. **Apply Targeted Optimization** — Execute domain-specific commands based on identified bottleneck. **Checkpoint:** Test changes in staging before production with 10% traffic.

4. **Verify Improvement** — Run same diagnostic queries post-optimization and compare metrics. **Checkpoint:** At least 20% improvement in target metric required to proceed.

5. **Document Changes** — Record all modifications with before/after metrics for audit trail. **Checkpoint:** Documentation must include rollback procedure.

6. **Monitor Long-Term** — Set up continuous monitoring for regression. **Checkpoint:** Alert thresholds must be configured within 24 hours.

---

## Implementation Patterns / Reference Guide

### Pattern 1: PostgreSQL Query Optimization with EXPLAIN ANALYZE

Analyzes query performance and identifies optimization opportunities using PostgreSQL's EXPLAIN command with ANALYZE option to execute queries and capture actual runtime statistics.

```bash
# Basic query analysis
EXPLAIN SELECT * FROM orders WHERE customer_id = 123;

# With actual execution statistics
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 123;

# Verbose output with costs
EXPLAIN (ANALYZE, BUFFERS, VERBOSE) SELECT * FROM orders WHERE customer_id = 123;

# JSON format for programmatic analysis
EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM orders WHERE customer_id = 123;
```

```sql
-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Find missing indexes on frequently queried columns
SELECT 
    schemaname,
    tablename,
    attname AS column_name,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
AND (n_distinct < 100 OR correlation < 0.5)
ORDER BY n_distinct ASC;
```

```bash
# Analyze table to update statistics
ANALYZE orders;

# Analyze specific column
ANALYZE orders (customer_id, order_date);

# Force statistics collection for all tables
VACUUM ANALYZE;
```

### Pattern 2: PostgreSQL Connection Pooling with pgbouncer

Configures pgbouncer for connection pooling to handle high-concurrency database connections efficiently, reducing connection overhead and improving throughput.

```bash
# Install pgbouncer (Ubuntu/Debian)
sudo apt-get install pgbouncer

# Configure pgbouncer (pgbouncer.ini)
[pgbouncer]
logfile = /var/log/postgresql/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
max_wait = 60
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
```

```bash
# Create userlist.txt for authentication
echo '"app_user" "md5hash"' > /etc/pgbouncer/userlist.txt

# Start pgbouncer
sudo service pgbouncer start

# Connect through pgbouncer
psql -h 127.0.0.1 -p 6432 -U app_user -d myapp

# Check pgbouncer status
echo "SHOW POOLS;" | psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer
echo "SHOW STATS;" | psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer
echo "SHOW CLIENTS;" | psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer
```

```sql
-- Monitor connection pool health
SELECT 
    database,
    user,
    pool_mode,
    total_connections,
    active_connections,
    waiting_clients,
    maxwait,
    maxwait_us
FROM pgbouncer.pools;

-- View server stats
SHOW SERVERS;

-- View client stats
SHOW CLIENTS;

-- View all pools
SHOW POOLS;

-- View queries in queue
SHOW ACTIVE;
```

**BAD vs GOOD: Connection Pool Configuration**

```bash
# ❌ BAD — too small pool causes connection starvation
default_pool_size = 2
max_client_conn = 50

# ✅ GOOD — appropriately sized for workload
default_pool_size = 20
max_client_conn = 1000
```

```bash
# ❌ BAD — no timeout causes resource leaks
max_wait = 0

# ✅ GOOD — fails fast with clear timeout
max_wait = 60
```

### Pattern 3: PostgreSQL Vacuum Management

Configures and monitors autovacuum for optimal table maintenance, preventing bloat and ensuring statistics remain current for query optimization.

```bash
# Check vacuum progress on large tables
SELECT 
    relname AS table_name,
    last_vacuum,
    last_autovacuum,
    n_dead_tup,
    n_live_tup,
    CASE 
        WHEN n_live_tup > 0 
        THEN round(100.0 * n_dead_tup / n_live_tup, 2)
        ELSE 0 
    END AS dead_ratio_pct
FROM pg_stat_user_tables
WHERE n_live_tup > 10000
ORDER BY n_dead_tup DESC;

# Check vacuum activity
SELECT * FROM pg_stat_progress_vacuum;

# Check table bloat
SELECT
    relname as table_name,
    n_live_tup,
    n_dead_tup,
    round(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2) as dead_ratio
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

```sql
-- Manual vacuum command
VACUUM (VERBOSE, ANALYZE) orders;

-- Vacuum with specific options
VACUUM (FULL, ANALYZE, VERBOSE) large_table;

-- Vacuum specific column statistics only
VACUUM (ANALYZE) orders (customer_id, order_date);

-- Check vacuum configuration
SHOW autovacuum;
SHOW autovacuum_vacuum_threshold;
SHOW autovacuum_vacuum_scale_factor;
```

```bash
# Configure autovacuum for specific table
ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE orders SET (autovacuum_vacuum_threshold = 1000);

# Disable autovacuum for specific table (not recommended)
ALTER TABLE orders SET (autovacuum = off);
```

**BAD vs GOOD: Vacuum Strategy**

```sql
-- ❌ BAD — too aggressive causes I/O contention
ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.01);
ALTER TABLE orders SET (autovacuum_vacuum_threshold = 100);

-- ✅ GOOD — balanced for large table
ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE orders SET (autovacuum_vacuum_threshold = 1000);
```

```bash
# ❌ BAD — vacuuming during peak hours
0 2 * * * vacuumdb --all --full --analyze

# ✅ GOOD — vacuuming during maintenance window
0 3 * * 0 vacuumdb --all --full --analyze  # Sunday 3 AM
```

### Pattern 4: PostgreSQL Index Management

Creates, monitors, and maintains indexes for optimal query performance while avoiding index bloat and maintenance overhead.

```bash
# Create index with specific options
CREATE INDEX CONCURRENTLY idx_orders_customer ON orders(customer_id);

# Create partial index for filtered queries
CREATE INDEX idx_orders_active ON orders(status) WHERE status = 'active';

# Create composite index for multi-column queries
CREATE INDEX idx_orders_date_customer ON orders(order_date, customer_id);

# Create index with INCLUDE clause for covering queries
CREATE INDEX idx_orders_covering ON orders(customer_id, order_date) INCLUDE (total_amount);
```

```sql
-- Find unused indexes
SELECT 
    schemaname,
    relname as table_name,
    indexrelname as index_name,
    idx_scan as times_used,
    pg_size_pretty(pg_relation_size(quote_ident(schemaname) || '.' || quote_ident(indexrelname))) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname = 'public'
ORDER BY pg_relation_size(quote_ident(schemaname) || '.' || quote_ident(indexrelname)) DESC;

-- Find duplicate indexes
SELECT 
    schemaname,
    tablename,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexdef;

-- Check index size
SELECT 
    relname as table_name,
    indexrelname as index_name,
    pg_size_pretty(pg_relation_size(quote_ident(schemaname) || '.' || quote_ident(indexrelname))) as index_size,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(quote_ident(schemaname) || '.' || quote_ident(indexrelname)) DESC;
```

```bash
# Rebuild index to reduce bloat
REINDEX TABLE orders;

# Rebuild specific index
REINDEX INDEX idx_orders_customer;

# Rebuild all indexes in database
REINDEX DATABASE myapp;

# Check index bloat
SELECT 
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(quote_ident(tablename) || '.' || quote_ident(indexname))) as index_size,
    pg_size_pretty(pg_relation_size(quote_ident(tablename) || '.' || quote_ident(indexname)) - pg_relation_size(indexrelid)) as wasted_space
FROM pg_stat_user_indexes
WHERE pg_relation_size(quote_ident(tablename) || '.' || quote_ident(indexname)) > 100000000  -- > 100MB
ORDER BY wasted_space DESC;
```

**BAD vs GOOD: Index Creation**

```sql
-- ❌ BAD — creates index that will never be used
CREATE INDEX idx_orders_temp ON orders(temp_column);

-- ✅ GOOD — creates index with clear purpose
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date);
```

```sql
-- ❌ BAD — creates index without considering NULL handling
CREATE INDEX idx_orders_status ON orders(status);

-- ✅ GOOD — handles NULL values explicitly
CREATE INDEX idx_orders_status ON orders(status) WHERE status IS NOT NULL;
```

### Pattern 5: MySQL Replication Configuration

Sets up MySQL replication for high availability with proper configuration for master-slave and master-master setups.

```bash
# Configure master server (my.cnf)
[mysqld]
server-id = 1
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW
expire_logs_days = 7
max_binlog_size = 100M
sync_binlog = 1
innodb_flush_log_at_trx_commit = 1
innodb_support_xa = 1

# Restart MySQL
sudo service mysql restart

# Create replication user
mysql -u root -p -e "CREATE USER 'repl'@'%' IDENTIFIED BY 'password';"
mysql -u root -p -e "GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';"
mysql -u root -p -e "FLUSH PRIVILEGES;"

# Get master status
mysql -u root -p -e "SHOW MASTER STATUS;"
```

```bash
# Configure slave server (my.cnf)
[mysqld]
server-id = 2
relay_log = /var/log/mysql/mysql-relay-bin.log
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW
read_only = 1
relay_log_purge = 1
log_slave_updates = 1
skip_slave_start = 1

# Restart MySQL
sudo service mysql restart

# Configure replication
mysql -u root -p -e "
CHANGE MASTER TO
MASTER_HOST='master_host',
MASTER_USER='repl',
MASTER_PASSWORD='password',
MASTER_LOG_FILE='mysql-bin.000001',
MASTER_LOG_POS=107;
"

# Start replication
mysql -u root -p -e "START SLAVE;"

# Check slave status
mysql -u root -p -e "SHOW SLAVE STATUS\G"
```

```sql
-- Monitor replication lag
SHOW SLAVE STATUS\G
-- Watch: Seconds_Behind_Master, SQL_Delay, SQL_Run_State, IO_Run_State

-- Check master status
SHOW MASTER STATUS;

-- Check binary logs
SHOW BINARY LOGS;

-- Purge old binary logs
PURGE BINARY LOGS TO 'mysql-bin.000010';
PURGE BINARY LOGS BEFORE '2024-01-01 00:00:00';

-- Skip replication error (emergency only)
STOP SLAVE;
SET GLOBAL SQL_SLAVE_SKIP_COUNTER = 1;
START SLAVE;
```

```bash
# Monitor replication health
mysql -u root -p -e "
SELECT 
    Slave_IO_Running,
    Slave_SQL_Running,
    Seconds_Behind_Master,
    Last_Errno,
    Last_Error,
    Relay_Master_Log_File,
    Exec_Master_Log_Pos
FROM INFORMATION_SCHEMA.SLAVE_STATUS;
"
```

**BAD vs GOOD: Replication Configuration**

```ini
# ❌ BAD — unsafe settings for production
binlog_format = STATEMENT
sync_binlog = 0
innodb_flush_log_at_trx_commit = 2

# ✅ GOOD — safe settings for production
binlog_format = ROW
sync_binlog = 1
innodb_flush_log_at_trx_commit = 1
```

```sql
-- ❌ BAD — no monitoring of replication lag
-- Just checking once, no alerts

# ✅ GOOD — continuous monitoring
SELECT 
    Seconds_Behind_Master,
    CASE 
        WHEN Seconds_Behind_Master > 30 THEN 'CRITICAL'
        WHEN Seconds_Behind_Master > 10 THEN 'WARNING'
        ELSE 'OK'
    END AS status
FROM INFORMATION_SCHEMA.SLAVE_STATUS;
```

### Pattern 6: MySQL Failover Procedures

Executes automated failover procedures for MySQL replication setups with proper validation and rollback capabilities.

```bash
# Check current master status
mysql -u root -p -e "SHOW MASTER STATUS\G"

# Check slave status before failover
mysql -u root -p -e "SHOW SLAVE STATUS\G"

# Stop slave replication
mysql -u root -p -e "STOP SLAVE;"

# Reset slave configuration (if promoting)
mysql -u root -p -e "RESET SLAVE ALL;"

# Configure as master
mysql -u root -p -e "RESET MASTER;"

# Verify no more slave connections
mysql -u root -p -e "SHOW SLAVE HOSTS;"

# Update application connection string
# Update load balancer to point to new master
```

```sql
-- Force failover with GTID (MySQL 5.6+)
STOP SLAVE;
RESET SLAVE ALL;
CHANGE MASTER TO
    MASTER_HOST = '',
    MASTER_USER = '',
    MASTER_PASSWORD = '',
    MASTER_AUTO_POSITION = 1;
START SLAVE;

-- Promote slave to master
SET GLOBAL read_only = OFF;

-- Verify no transactions are pending
SHOW MASTER STATUS;
```

```bash
# Automated failover script (failover.sh)
#!/bin/bash

# Check slave status
SLAVE_STATUS=$(mysql -u root -p -e "SHOW SLAVE STATUS\G" | grep "Slave_IO_Running" | awk '{print $2}')
SLAVE_LAG=$(mysql -u root -p -e "SHOW SLAVE STATUS\G" | grep "Seconds_Behind_Master" | awk '{print $2}')

# Failover conditions
if [ "$SLAVE_STATUS" != "Yes" ]; then
    echo "IO thread not running, proceeding with failover"
    mysql -u root -p -e "STOP SLAVE; RESET SLAVE ALL; SET GLOBAL read_only=OFF;"
    echo "Promoted to master"
    exit 0
fi

if [ "$SLAVE_LAG" -gt 60 ]; then
    echo "Replication lag too high, failing over"
    mysql -u root -p -e "STOP SLAVE; RESET SLAVE ALL; SET GLOBAL read_only=OFF;"
    echo "Promoted to master due to lag"
    exit 0
fi

echo "No failover required"
exit 1
```

**BAD vs GOOD: Failover Procedure**

```bash
# ❌ BAD — no validation before failover
mysql -u root -p -e "STOP SLAVE; RESET SLAVE ALL;"

# ✅ GOOD — validates before failover
mysql -u root -p -e "SHOW SLAVE STATUS\G"
mysql -u root -p -e "STOP SLAVE;"
mysql -u root -p -e "RESET SLAVE ALL;"
```

```bash
# ❌ BAD — no notification of failover
# Failover happens silently

# ✅ GOOD — notifications on failover
#!/bin/bash
# ... failover commands ...
curl -X POST "https://hooks.slack.com/services/XXX" \
    -H "Content-Type: application/json" \
    -d '{"text": "MySQL Failover completed - New master: '$(hostname)'}'
```

### Pattern 7: MongoDB Sharding Configuration

Configures and manages MongoDB sharded clusters with proper shard key selection and chunk management.

```bash
# Enable sharding on database
mongosh --host config1:27017,config2:27017,config3:27017 --eval "
sh.enableDatabase('myapp');
"

# Add shard to cluster
mongosh --host config1:27017,config2:27017,config3:27017 --eval "
sh.addShard('rs1/mongos1:27017,mongos2:27017,mongos3:27017');
sh.addShard('rs2/mongos4:27017,mongos5:27017,mongos6:27017');
"

# Enable sharding on collection
mongosh --host config1:27017,config2:27017,config3:27017 --eval "
sh.shardCollection('myapp.orders', { customer_id: 1, order_date: 1 });
"

# Verify sharding status
mongosh --host config1:27017,config2:27017,config3:27017 --eval "
sh.status();
"
```

```bash
# Check chunk distribution
mongosh --host config1:27017,config2:27017,config3:27017 --eval "
sh.status();
"

# Manual chunk split
mongosh --host config1:27017,config2:27017,config3:27017 --eval "
sh.splitAt('myapp.orders', { customer_id: 1000, order_date: ISODate('2024-01-01') });
"

# Manual chunk move
mongosh --host config1:27017,config2:27017,config3:27017 --eval "
sh.moveChunk('myapp.orders', { customer_id: 1000 }, 'rs2');
"

# Balance chunk distribution
mongosh --host config1:27017,config2:27017,config3:27017 --eval "
sh.enableBalancing('myapp.orders');
"
```

```javascript
// Monitor sharding performance
db.adminCommand({ shardServerStatus: 1 })

// Check chunk size
db.adminCommand({ listShards: 1 })

// Get shard key info
db.getCollectionInfos({ name: "orders" })[0].options.shardKey

// Check balancer status
db.adminCommand({BalancerStatus: 1})

// Manually trigger balancer
db.adminCommand({ BalancerPass: 1 })
```

```bash
# Add new shard and rebalance
mongosh --host config1:27017,config2:27017,config3:27017 --eval "
sh.addShard('rs3/mongos7:27017,mongos8:27017,mongos9:27017');
"

# Monitor rebalancing
mongosh --host config1:27017,config2:27017,config3:27017 --eval "
sh.status({ verbose: true });
"
```

**BAD vs GOOD: Shard Key Selection**

```javascript
// ❌ BAD — poor shard key causes hot spots
sh.shardCollection('myapp.orders', { order_date: 1 });

// ✅ GOOD — composite shard key prevents hot spots
sh.shardCollection('myapp.orders', { customer_id: 1, order_date: 1 });
```

```javascript
// ❌ BAD — no monitoring of chunk distribution
// Assuming everything is balanced

// ✅ GOOD — continuous monitoring
db.adminCommand({
    getShardDistribution: 'myapp.orders'
})
```

### Pattern 8: MongoDB Query Optimization

Analyzes and optimizes MongoDB queries using explain plans and index management.

```bash
# Analyze query performance
db.orders.find({ customer_id: 123 }).explain('executionStats')

# Analyze with verbose output
db.orders.find({ customer_id: 123 }).explain('allPlansExecution')

# Check index usage
db.orders.find({ customer_id: 123 }).explain('executionStats').executionStats

# Get index statistics
db.orders.getIndexes()

# Index usage statistics
db.orders.totalIndexSize()
db.orders.dataSize()
```

```javascript
// Create index
db.orders.createIndex({ customer_id: 1 })

// Create compound index
db.orders.createIndex({ customer_id: 1, order_date: -1 })

// Create unique index
db.users.createIndex({ email: 1 }, { unique: true })

// Create text index
db.orders.createIndex({ description: 'text', product_name: 'text' })

// Create sparse index
db.orders.createIndex({ customer_id: 1 }, { sparse: true })

// Create partial index
db.orders.createIndex(
    { order_date: 1 },
    { partialFilterExpression: { status: 'active' } }
)
```

```bash
# Drop unused index
db.orders.dropIndex({ customer_id: 1 })

# Drop all indexes except _id
db.orders.dropIndexes()

# Get index size
db.orders.totalIndexSize()

# Check index build progress
db.currentOp({ 'command.createIndexes': { $exists: true } })

# Kill index build
db.killOp(opId)
```

```javascript
// Monitor query performance
db.setProfilingLevel(1, { slowms: 100 })

// View slow queries
db.system.profile.find().sort({ ts: -1 }).limit(10)

// Check query plan cache
db.orders.getQueryPlanner()

// Force index usage
db.orders.find({ customer_id: 123 }).hint({ customer_id: 1 })
```

**BAD vs GOOD: Index Strategy**

```javascript
// ❌ BAD — index on low-cardinality field
db.orders.createIndex({ status: 1 });

// ✅ GOOD — index on high-cardinality field
db.orders.createIndex({ customer_id: 1 });
```

```javascript
// ❌ BAD — no index for frequent query pattern
db.orders.find({ customer_id: 123, order_date: { $gte: ISODate('2024-01-01') } });

// ✅ GOOD — compound index for query pattern
db.orders.createIndex({ customer_id: 1, order_date: -1 });
db.orders.find({ customer_id: 123, order_date: { $gte: ISODate('2024-01-01') } });
```

### Pattern 9: Redis Memory Optimization

Optimizes Redis memory usage through configuration tuning, memory analysis, and eviction policy management.

```bash
# Check Redis memory usage
redis-cli INFO memory

# Check memory peak
redis-cli CONFIG GET maxmemory

# Check memory fragmentation ratio
redis-cli INFO memory | grep fragmentation_ratio

# Check keys by type
redis-cli --help

# Scan keys (non-blocking)
redis-cli SCAN 0 MATCH * COUNT 1000

# Get key size
redis-cli DEBUG OBJECT key_name

# Memory analysis
redis-cli --bigkeys
```

```bash
# Configure Redis memory limits (redis.conf)
maxmemory 4gb
maxmemory-policy allkeys-lru
maxmemory-samples 5
hz 10

# Enable AOF for persistence
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Configure RDB snapshots
save 900 1
save 300 10
save 60 10000

# Restart Redis
sudo service redis-server restart
```

```bash
# Analyze memory usage by pattern
redis-cli --scan --pattern '*' | while read key; do
    echo -e "$(redis-cli DEBUG OBJECT $key | awk '{print $2}') $key"
done | sort -n | tail -20

# Find large keys
redis-cli --bigkeys

# Memory analysis by type
redis-cli --memcat --pattern 'user:*'
```

```bash
# Force memory reclamation
redis-cli BGSAVE
redis-cli DEBUG SYNC
redis-cli MEMORY DOCTOR

# Compact RDB file
redis-cli BGREWRITEAOF

# Memory stats breakdown
redis-cli INFO memory
redis-cli INFO stats
redis-cli INFO keyspace
```

```bash
# Monitor Redis in real-time
watch -n 1 'redis-cli INFO memory | grep -E "(used_memory_human|used_memory_peak_human|fragmentation_ratio)"'
```

**BAD vs GOOD: Memory Configuration**

```conf
# ❌ BAD — no memory limit causes OOM
# maxmemory not set

# ✅ GOOD — explicit memory limit
maxmemory 4gb
maxmemory-policy allkeys-lru
```

```conf
# ❌ BAD — aggressive persistence during peak hours
save 60 10000
appendfsync everysec

# ✅ GOOD — balanced persistence
save 900 1
save 300 10
appendfsync everysec
```

### Pattern 10: Redis Persistence Configuration

Configures Redis persistence with balanced RDB snapshots and AOF for data durability without sacrificing performance.

```bash
# Check current persistence settings
redis-cli CONFIG GET save
redis-cli CONFIG GET appendonly
redis-cli CONFIG GET appendfsync

# Enable AOF
redis-cli CONFIG SET appendonly yes

# Configure AOF fsync policy
redis-cli CONFIG SET appendfsync everysec

# Force AOF rewrite
redis-cli BGREWRITEAOF

# Check AOF status
redis-cli INFO persistence

# Verify RDB status
redis-cli LASTSAVE
```

```bash
# Configure persistence (redis.conf)
# RDB snapshots
save 900 1
save 300 10
save 60 10000
dbfilename dump.rdb
dir /var/lib/redis

# AOF persistence
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

```bash
# Check AOF rewrite status
redis-cli INFO persistence | grep aof

# Monitor RDB save in progress
redis-cli LASTSAVE
redis-cli INFO persistence | grep rdb

# Check disk usage
redis-cli INFO persistence | grep aof_current_size
redis-cli INFO persistence | grep rdb_current_size
```

```bash
# Emergency recovery from corrupted AOF
# 1. Stop Redis
sudo service redis-server stop

# 2. Backup current AOF
cp /var/lib/redis/appendonly.aof /var/lib/redis/appendonly.aof.bak

# 3. Restore from RDB if available
cp /var/lib/redis/dump.rdb /var/lib/redis/dump.rdb.bak

# 4. Disable AOF temporarily
redis-cli CONFIG SET appendonly no

# 5. Restart Redis
sudo service redis-server start

# 6. Fix AOF if possible
redis-check-aof --fix /var/lib/redis/appendonly.aof

# 7. Re-enable AOF
redis-cli CONFIG SET appendonly yes
```

**BAD vs GOOD: Persistence Strategy**

```conf
# ❌ BAD — too aggressive AOF causes I/O contention
appendfsync always
auto-aof-rewrite-percentage 50

# ✅ GOOD — balanced persistence
appendfsync everysec
auto-aof-rewrite-percentage 100
```

```conf
# ❌ BAD — no RDB snapshots for disaster recovery
# save disabled

# ✅ GOOD — multiple RDB checkpoints
save 900 1
save 300 10
save 60 10000
```

---

## Constraints

### MUST DO
- Run EXPLAIN ANALYZE before executing queries that scan more than 1% of a table
- Configure connection pool size based on 2 × CPU cores + 1 rule for PostgreSQL
- Set autovacuum_vacuum_scale_factor to 0.1 for tables with >1M rows
- Create indexes on foreign key columns and frequently filtered fields
- Monitor MySQL replication lag and alert at 30 seconds behind
- Balance MongoDB chunks evenly across shards before adding new shards
- Configure Redis maxmemory to 75% of available RAM
- Enable AOF with everysec fsync for production Redis instances

### MUST NOT DO
- Disable autovacuum on any table in production PostgreSQL
- Use STATEMENT-based replication in MySQL without comprehensive testing
- Sharding on monotonically increasing keys (e.g., timestamps alone)
- Set Redis maxmemory to 100% of available memory
- Run REINDEX CONCURRENTLY during peak business hours
- Use FULL OUTER JOIN on tables >1M rows without proper indexing
- Execute VACUUM FULL without scheduling maintenance window
- Add shards to MongoDB cluster with <20% imbalance without rebalancing

---

## Output Template

When this skill is loaded, your output must contain:

1. **Command Analysis** — Provide the exact database command(s) to execute, with all required flags and options
2. **Expected Output Format** — Show what successful output looks like (sample JSON, table format, etc.)
3. **Error Handling** — Include common error conditions and their solutions
4. **Performance Metrics** — List key metrics to capture before and after changes
5. **Rollback Procedure** — Include command(s) to revert changes if optimization fails

Example structure:
```
[COMMAND TO EXECUTE]

[EXPECTED OUTPUT]

[ERROR HANDLING]

[PERFORMANCE METRICS TO CAPTURE]

[ROLLBACK COMMAND]
```

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-postgresql` | Kubernetes deployment and management of PostgreSQL clusters |
| `cncf-azure-managed-database` | Azure Database for PostgreSQL/MySQL/MariaDB management |
| `trading-risk-stop-loss` | Position risk management with database-backed historical analysis |
| `defi-arbitrage` | Cross-exchange arbitrage with database query optimization for pricing data |

---

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MySQL Replication Documentation](https://dev.mysql.com/doc/refman/8.0/en/replication.html)
- [MongoDB Sharding Documentation](https://www.mongodb.com/docs/manual/sharding/)
- [Redis Memory Optimization Guide](https://redis.io/docs/management/optimization/memory/)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- [MongoDB Query Optimization](https://www.mongodb.com/docs/manual/core/query-optimization/)

---

## Quick Reference Commands

### PostgreSQL
```bash
# Connection
psql -h host -U user -d database

# Analyze query
EXPLAIN ANALYZE SELECT * FROM table WHERE condition;

# Vacuum table
VACUUM ANALYZE table_name;

# Show indexes
\d table_name

# Check connections
SELECT * FROM pg_stat_activity;
```

### MySQL
```bash
# Connection
mysql -h host -u user -p database

# Replication status
SHOW SLAVE STATUS\G

# Slow query log
SHOW VARIABLES LIKE 'slow_query%';

# Process list
SHOW PROCESSLIST;
```

### MongoDB
```bash
# Connection
mongosh -h host -u user -p password --authenticationDatabase admin

# Sharding status
sh.status()

# Explain query
db.collection.find({query}).explain()

# Index list
db.collection.getIndexes()
```

### Redis
```bash
# Connection
redis-cli -h host -p 6379

# Memory info
redis-cli INFO memory

# Key scan
redis-cli SCAN 0 MATCH * COUNT 1000

# Performance info
redis-cli INFO stats
```
