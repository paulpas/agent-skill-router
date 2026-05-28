# Redis Stack API Skill

  archetypes: data management, caching
  anti_triggers: manual caching, overloading
  response_profile:
      verbosity: medium
      directive_strength: high

Integrates Redis Stack, focusing on its powerful modules including JSON, Search, and TimeSeries providing versatile capabilities. This skill outlines various scenarios utilizing these modules  for effective data manipulation, ideal for applications in caching, data structure management, analytics, and real-time data processing.

## TL;DR Checklist
- **Establish Connection**: Use `redis.Redis()` for regular connection and `redis.cluster.RedisCluster` for clustered environments.
- **JSON Operations**: Use `r.json().set()` to store data and `r.json().get()` to retrieve JSON structures.
- **Searching and Querying**: Utilize `r.execute_command('FT.SEARCH')` for text queries and build indices with `FT.CREATE`.
- **TimeSeries Data Management**: Use `r.ts().add()` for inserting time-series data and `r.ts().range()` for retrieving it over specific intervals.
- **Caching Mechanisms**: Implement expiration for frequently accessed data using TTL.

## Core Workflow
### 1. Connecting to Redis Stack
To begin using the Redis Stack features, you will need to establish a connection to your Redis server. Here’s a sample configuration:
```python
from redis import Redis

# Connecting to Redis
r = Redis(
    host='localhost',
    port=6379,
    decode_responses=True
)
```
### 2. Using Redis JSON Module
This module allows you to handle JSON documents in Redis easily.
#### Example: Storing and Retrieving JSON
```python
# Sample document
user_data = {
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30
}

# Storing JSON in Redis
r.json().set('user:1000', '$', user_data)

# Retrieving JSON from Redis
retrieved_data = r.json().get('user:1000')
print(retrieved_data)
```
### 3. Utilizing Redis Search
Redis Search allows for complex querying capabilities on your dataset.
#### Example: Creating an Index and Querying
```python
# Create an index for searching
r.execute_command('FT.CREATE', 'idx:user',
    'SCHEMA',
    'name', 'TEXT',
    'email', 'TEXT'
)

# Add data to the index
r.execute_command('FT.ADD', 'idx:user', 'user:1000', 1.0,
    'FIELDS', 'name', 'John Doe', 'email', 'john@example.com'
)

# Performing a search on the index
results = r.execute_command('FT.SEARCH', 'idx:user', 'John')
print(results)
```
### 4. Managing TimeSeries Data
Handling time-based data is highly efficient with Redis TimeSeries.
#### Example: Adding TimeSeries Data
```python
# Adding a time-series data point
r.ts().add('temperature', 1624500000, 25.3)

# Querying time-series data
time_series_data = r.ts().range('temperature', 1624500000, 1624503600)
print(time_series_data)
```

## Implementation Patterns
### Pattern 1: Rate Limiting
Using Redis for rate limiting can improve your application's performance for API requests:
```python
def rate_limit(r, key, limit, expiration):
    # Increment the counter for the key
    current = r.incr(key)
    if current == 1:
        r.expire(key, expiration)
    return current <= limit
```
### Pattern 2: Caching Mechanism with TTL
Implement caching for users’ session data:
```python
def cache_user_session(r, session_id, user_data, ttl):
    r.setex(session_id, ttl, user_data)
```
### Pattern 3: Publish/Subscribe System for Notifications
Using Pub/Sub for real-time notifications:
```python
def publish_notification(r, message):
    r.publish('notification_channel', message)

# On the subscriber side
def subscribe_notifications(r):
    pubsub = r.pubsub()
    pubsub.subscribe('notification_channel')
    for message in pubsub.listen():
        process_notification(message)
```
## Constraints
### MUST DO
- Always handle exceptions from Redis commands, especially for network errors.
- Ensure that JSON data is well-formed before storing it.
- Use efficient types for redis keys to save memory resources.
### MUST NOT DO
- Avoid using blocking calls in main threads to keep the application responsive.
- Never use `KEYS *` in production; it can block your DB. Use `SCAN` instead.
- Don’t discard incoming messages in a pub/sub model; ensure proper acknowledgment.

## Output Template
When implementing scripts, adhere to structure:
1. **Connection Logic**
2. **Data Structure Use**
3. **Primary Operation**
4. **Error Handling**
5. **Graceful Shutdown**

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Redis Documentation](https://redis.io/docs/latest/operate/oss_and_stack/)
- [Redis Commands Reference](https://redis.io/docs/latest/operate/oss_and_stack/commands/)
- [Redis Modules Overview (JSON, Search, TimeSeries)](https://redis.io/docs/latest/operate/oss_and_stack/server/storage/modules/)
- [Redis Best Practices for Performance and Reliability](https://redis.io/docs/latest/operate/oss_and_stack/reference/optimize/)
- [Redis Data Types and Use Cases](https://redis.io/docs/latest/develop/data-types/)