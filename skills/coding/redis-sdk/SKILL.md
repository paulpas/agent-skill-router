---
name: redis-sdk
description: Integrates Redis using redis-py 5.x with patterns for caching, streams,
  pub/sub, sorted sets, Redis Stack modules (JSON, Search, TimeSeries), and cluster
  connections.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
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
------

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

