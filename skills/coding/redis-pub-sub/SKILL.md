# Redis Pub/Sub Messaging Operations

  archetypes: messaging, real-time communication
  anti_triggers: message loss, manual handling
  response_profile:
      verbosity: medium
      directive_strength: high

Integrates Redis for real-time messaging using the Pub/Sub model. This allows asynchronous communication between multiple clients within a distributed system by publishing messages to channels and subscribing to receive those messages. 

## TL;DR Checklist
- [ ] Use `redis.Redis()` for connecting to a Redis instance.
- [ ] Use `publish(channel, message)` for sending messages.
- [ ] Subscribe using `pubsub.subscribe(channel)` for receiving messages.
- [ ] Handle message processing in a loop using `pubsub.listen()`. 
- [ ] Don't use Pub/Sub for state persistence; messages are transient.

---

## Core Workflow
### 1. Connect to Redis
```python
import redis

# Connect to Redis
r = redis.Redis(host='localhost', port=6379)
```
**Checkpoint:** Ensure connection is established with `r.ping()`. Handle connection errors properly.

### 2. Set Up Pub/Sub Messaging
```python
# Create pubsub object
dash_pubsub = r.pubsub()

# Subscribe to a channel
channel_name = 'news'
dash_pubsub.subscribe(channel_name)
```
**Checkpoint:** Confirm subscription with `dash_pubsub.get_partitions()` to see active channels.

### 3. Publishing Messages
```python
def publish_news(r, channel, title, content):
    message = {"title": title, "content": content}
    r.publish(channel, json.dumps(message))
# Usage
publish_news(r, channel_name, "New Update", "Redis is awesome for real-time messaging!")
```
**Checkpoint:** Confirm the message was sent by checking the subscriber side or using monitoring commands in Redis.

### 4. Listening for Messages
```python
for message in dash_pubsub.listen():
    if message['type'] == 'message':
        data = json.loads(message['data'])
        print(f"Received message: {data['title']} - {data['content']}")
```
**Checkpoint:** Make sure the listener is processing messages correctly and handle any parsing errors.
---

## Implementation Patterns
### Pattern 1: Basic Message Publishing
```python
def publish_message(r: redis.Redis, channel: str, content: str):
    r.publish(channel, content)
# Example usage:
publish_message(r, 'alerts', 'This is a test alert')
```
### Pattern 2: Subscribing with Callbacks
```python
def subscriber_callback(message):
    print(f'New message: {message}') # Handle your message here

# Callback for messages received on a channel

dash_pubsub.subscribe(**{channel_name: subscriber_callback})
dash_pubsub.run_in_thread(sleep_time=0.001)
```
### Pattern 3: Using Redis Streams
Although streaming is different from Pub/Sub, consider using Redis Streams for durable message processing.
```python
# Add a message to a stream
r.xadd('mystream', {'source': channel_name, 'message': content})
```
## Constraints
### MUST DO
- Use JSON to serialize complex messages before sending them.
- Ensure that subscribers acknowledge received messages in any business logic implemented.
- Always close the Pub/Sub connection gracefully to prevent memory leaks.
### MUST NOT DO
- Never rely on Pub/Sub for critical messaging guarantees; it's inherently unreliable for message delivery.
- Don't block in the message handling loop; improper handling could cause delays in message processing. 
---
## Output Template
When working with Redis for Pub/Sub messaging, ensure you follow this structure:
1. Connection management to Redis.
2. Separate logic for Publishing and Subscribing messages.
3. Ensure message integrity by logging messages.
4. Cleanup connections properly after operations.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Redis Pub/Sub Documentation](https://redis.io/docs/latest/develop/interact/replication-and-clustering/pubsub/)
- [Redis pub/sub Commands Reference](https://redis.io/docs/latest/operate/oss_and_stack/commands/pubsub/)
- [Redis Streams for Durable Messaging](https://redis.io/docs/latest/develop/data-types/streams/)
- [Redis Pub/Sub Best Practices](https://redis.io/docs/latest/develop/use/pubsub/)
- [Building Real-Time Apps with Redis Pub/Sub](https://redis.io/docs/latest/develop/interact/pubsub/)