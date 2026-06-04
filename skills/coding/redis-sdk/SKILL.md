---




name: redis-sdk
description: Integrates Redis using redis-py 5.x with patterns for caching, streams,
  pub/sub, sorted sets, Redis Stack modules (JSON, Search, TimeSeries), and cluster
  connections.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: redis, redis-py, redis cache, redis streams, redis pub/sub, how do i use
    redis from python, redis stack, redis cluster
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
  related-skills: coding-postgresql-sdk, coding-mongodb-driver, coding-caching-strategies




---




# Redis Python SDK (redis-py) Integration

Integrates Redis using `redis-py` 5.x — the official Python Redis client — with patterns for caching, streams, pub/sub, sorted sets (leaderboards), Redis Stack modules (JSON, Search, TimeSeries), pipeline transactions, and cluster/sentinel connections.

## TL;DR Checklist

- [ ] Use `redis.Redis()` for standalone, `redis.cluster.RedisCluster` for cluster mode
- [ ] Use `pipeline()` for atomic multi-command transactions
- [ ] Use `XADD` / `XREAD` for stream-based message queues (not Pub/Sub for durable messaging)
- [ ] Use `SETEX` or `PSETEX` for time-bound caching
- [ ] Use `ZADD` / `ZRANK` / `ZRANGEBYSCORE` for leaderboards and range queries
- [ ] Use `redis-py` Stack modules (`JSON`, `Search`) when using Redis Stack
- [ ] Use `Redis Sentinel` for high-availability connections

---

## When to Use

Use this skill when:

- Implementing distributed caching with TTL-based expiration
- Building real-time message queues with Redis Streams (consumer groups, acknowledgments)
- Implementing pub/sub for real-time notifications (WebSocket backends, event broadcasting)
- Building leaderboards or time-series data with sorted sets
- Managing rate limits with atomic counters (`INCR` + `EXPIRE`)
- Using Redis Stack for document storage (JSON), search (RediSearch), or time-series (RedisTimeSeries)
- Connecting to Redis Cluster or Redis Sentinel deployments from Python

---

## When NOT to Use

- For persistent relational data with complex queries (use PostgreSQL)
- For document storage at scale (use MongoDB instead)
- For message queues requiring persistence guarantees (use RabbitMQ or Kafka instead)
- For data larger than available RAM (Redis is an in-memory store)
- For complex aggregation queries (use Elasticsearch or MongoDB instead)

---

## Core Workflow

### 1. Connect to Redis

```python
import redis
from redis.exceptions import RedisError, ConnectionError, TimeoutError

# Standalone Redis
r = redis.Redis(
    host="localhost",
    port=6379,
    db=0,
    decode_responses=True,     # Return strings instead of bytes
    socket_connect_timeout=5,
    socket_timeout=10,
    retry_on_timeout=True,
    health_check_interval=30,
)

# Redis Sentinel (high availability)
from redis.sentinel import Sentinel

sentinel = Sentinel(
    [("sentinel1", 26379), ("sentinel2", 26379)],
    socket_timeout=0.5,
)
r = sentinel.master_for("mymaster", db=0, decode_responses=True)
```

**Checkpoint:** Verify connectivity with `r.ping()`. Catch `ConnectionError` at startup — do not let operations fail silently on a dead connection.

### 2. Basic Key-Value Operations with TTL

```python
from typing import Any, Optional

def cache_set(
    r: redis.Redis,
    key: str,
    value: Any,
    ttl_seconds: int = 300,
) -> None:
    """Set a cache value with TTL. Serializes non-string values as JSON."""
    import json
    if not isinstance(value, (str, bytes)):
        value = json.dumps(value)
    r.setex(key, ttl_seconds, value)

def cache_get(r: redis.Redis, key: str) -> Optional[Any]:
    """Get a cache value, deserializing JSON if applicable."""
    value = r.get(key)
    if value is None:
        return None
    try:
        import json
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value
```

**Checkpoint:** Always set TTL for cache keys to prevent memory exhaustion. Use `EXISTS` to check key presence without fetching value.

### 3. Pipeline Transactions

Use pipelines for atomic multi-key operations and reducing round-trips.

```python
def transfer_leaderboard_points(
    r: redis.Redis,
    from_player: str,
    to_player: str,
    points: int,
) -> bool:
    """Atomically transfer points between two players in a leaderboard."""
    pipe = r.pipeline(transaction=True)
    try:
        pipe.zincrby("leaderboard", -points, from_player)
        pipe.zincrby("leaderboard", points, to_player)
        pipe.execute()
        return True
    except RedisError:
        return False
```

**Checkpoint:** Use `pipeline(transaction=True)` for atomicity when multiple keys must change together. Always handle `RedisError` on `execute()`.

### 4. Redis Streams for Reliable Message Queues

```python
import time

def produce_message(r: redis.Redis, stream: str, data: dict) -> str:
    """Add a message to a stream and return its ID."""
    return r.xadd(stream, data, maxlen=10000)  # Capped stream

def consume_messages(
    r: redis.Redis,
    stream: str,
    group: str,
    consumer: str,
    count: int = 10,
    block_ms: int = 5000,
) -> list[dict]:
    """Read and acknowledge messages from a consumer group."""
    # Create group if it doesn't exist (idempotent)
    try:
        r.xgroup_create(stream, group, id="0", mkstream=True)
    except redis.exceptions.ResponseError as exc:
        if "BUSYGROUP" not in str(exc):
            raise

    # Read pending and new messages
    results = r.xreadgroup(group, consumer, {stream: ">"}, count=count, block=block_ms)
    messages = []
    for stream_name, entries in results:
        for msg_id, msg_data in entries:
            messages.append({"id": msg_id, "data": msg_data})
            r.xack(stream, group, msg_id)  # Acknowledge after processing
    return messages
```

**Checkpoint:** Always acknowledge messages with `XACK` after successful processing to prevent redelivery. Use consumer groups for load-balanced stream consumption.

---

## Implementation Patterns

### Pattern 1: Rate Limiter with INCR + EXPIRE

```python
def check_rate_limit(
    r: redis.Redis,
    key: str,
    max_requests: int,
    window_seconds: int,
) -> bool:
    """Check if a rate limit has been exceeded. Returns True if allowed."""
    current = r.incr(key)
    if current == 1:
        r.expire(key, window_seconds)
    return current <= max_requests
```

### Pattern 2: Redis Stack JSON Documents

```python
from redis.commands.json.path import Path

def set_json_doc(r: redis.Redis, key: str, doc: dict) -> None:
    """Store a JSON document using Redis JSON module."""
    r.json().set(key, Path.root_path(), doc)

def get_json_field(r: redis.Redis, key: str, field_path: str = "$") -> list:
    """Query a JSON document field path."""
    return r.json().get(key, field_path)
```

### Pattern 3: Pub/Sub with Pattern Matching

```python
def publish_event(r: redis.Redis, channel: str, event: dict) -> int:
    """Publish an event to a channel. Returns subscriber count."""
    import json
    return r.publish(channel, json.dumps(event))

def listen_for_events(r: redis.Redis, pattern: str):
    """Subscribe to events matching a glob pattern."""
    pubsub = r.pubsub()
    pubsub.psubscribe(pattern)
    for message in pubsub.listen():
        if message["type"] == "pmessage":
            yield message["data"]
```

### BAD vs GOOD: Caching Pattern

```python
# ❌ BAD — No TTL, no serialization handling, no connection check
def get_user_bad(r, user_id: str):
    data = r.get(f"user:{user_id}")
    return data

# ✅ GOOD — TTL-based caching with proper serialization
def get_user_good(r: redis.Redis, user_id: str) -> Optional[dict]:
    """Get cached user, returning None on cache miss."""
    import json
    try:
        data = r.get(f"user:{user_id}")
        if data is None:
            return None
        return json.loads(data)
    except (RedisError, json.JSONDecodeError):
        return None
```

### BAD vs GOOD: Stream Consumption

```python
# ❌ BAD — No consumer group, no acknowledgment, no error handling
def consume_bad(r, stream):
    while True:
        results = r.xread({stream: "$"}, block=1000)
        for _, entries in results:
            for msg_id, data in entries:
                process(data)  # If this fails, message is lost

# ✅ GOOD — Consumer group with XACK
def consume_good(r: redis.Redis, stream: str, group: str, consumer: str):
    """Reliable stream consumer with acknowledgment."""
    for message in consume_messages(r, stream, group, consumer):
        try:
            process(message["data"])
        except Exception:
            # Move to dead-letter stream on processing failure
            r.xadd(f"{stream}:dlq", message["data"])
            r.xack(stream, group, message["id"])
```

---

## Constraints

### MUST DO
- Always call `r.close()` in shutdown hooks or use connection pool context managers
- Set `decode_responses=True` for string-based workflows (eliminates manual `.decode()` calls)
- Use `SETEX` or `PSETEX` for all cache entries — Redis is memory-bound, TTL prevents exhaustion
- Use pipeline transactions for atomic multi-key operations
- Use `health_check_interval` in production to detect dead connections
- Use consumer groups for reliable stream processing with acknowledgment

### MUST NOT DO
- Never use `KEYS *` in production — use `SCAN` for iterating keys
- Do not store large values (>10MB) in Redis — it blocks the event loop
- Do not use Pub/Sub for message delivery guarantees — subscribers miss messages on disconnect
- Avoid single-key rate limits without TTL — keys accumulate forever
- Never hardcode Redis connection parameters — use environment variables or config

---

## Output Template

When writing Redis integration code, structure your output as:

1. **Connection Setup** — Redis client with host, port, db, decode_responses, timeouts
2. **Data Structure Selection** — String (cache), List (queue), Set (tags), Sorted Set (leaderboard), Stream (message queue)
3. **Operation** — Command with proper arguments and error handling
4. **TTL Management** — EXPIRE or SETEX for cache entries
5. **Cleanup** — Close connection in finally / context manager

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-postgresql-sdk` | PostgreSQL for persistent relational storage alongside Redis cache |
| `coding-caching-strategies` | Cache-aside, write-through, and invalidation patterns |
| `coding-asyncio-patterns` | Async Redis with redis-py asyncio support |

---

## Live References

- [redis-py Documentation](https://redis.readthedocs.io/en/latest/) — Official redis-py 5.x documentation
- [Redis Commands Reference](https://redis.io/commands/) — Complete Redis command catalog
- [Redis Streams Intro](https://redis.io/docs/data-types/streams/) — Stream data type and consumer groups
- [Redis Stack Documentation](https://redis.io/docs/stack/) — JSON, Search, TimeSeries, and Bloom modules
- [Redis Cluster Tutorial](https://redis.io/docs/management/scaling/) — Cluster setup and client configuration
- [Redis Sentinel Docs](https://redis.io/docs/management/sentinel/) — High availability with Sentinel
- [redis-py GitHub Repository](https://github.com/redis/redis-py) — Source code, issues, and releases
