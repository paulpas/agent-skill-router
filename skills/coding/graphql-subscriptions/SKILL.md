---
name: graphql-subscriptions
description: Implements real-time GraphQL subscriptions with Strawberry Python, WebSocket protocol, PubSub patterns, and client reconnection handling for live data delivery.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: graphql subscriptions, websocket, pubsub pattern, live updates, graphql-ws, reconnection handling, server push, presence system
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
  related-skills: graphql-api-design, graphql-error-handling-validation, graphql-dataloader-pattern
---

# GraphQL Subscriptions & Real-Time Updates

Implements production-grade real-time data delivery using GraphQL subscriptions over WebSocket with the Strawberry Python framework. Models subscription resolvers as async generators, designs PubSub backends (in-memory for development, Redis-backed for distributed systems), handles authentication at connection handshake, and manages client reconnection with exponential backoff.

## TL;DR Checklist

- [ ] Use `AsyncGenerator` with `@strawberry.subscriber` for all subscription resolvers — never use bare generators
- [ ] Authenticate WebSocket connections via `on_connect` before accepting any subscriptions (reject unauthorized on handshake)
- [ ] Deploy Redis-backed PubSub for any multi-instance production deployment — in-memory only works for single-node
- [ ] Enforce connection-level rate limiting to prevent subscription event flooding from clients
- [ ] Wrap all async generators in try/finally blocks to clean up PubSub listeners on disconnect and prevent memory leaks
- [ ] Limit concurrent subscriptions per client (hard cap of ~50) and apply query complexity limits on subscription fields
- [ ] Use `graphql-ws` protocol — never use the deprecated `subscriptions-transport-ws` library

---

## When to Use

Use this skill when:

- Building real-time features like live notifications, order status updates, or chat channels that require server-to-client push
- Implementing a presence system where clients need instant awareness of user online/offline state changes
- Streaming incremental data from long-running operations (e.g., report generation progress, AI model output tokens)
- Designing an event-driven notification center where multiple subscribers react to the same events across services
- Adding live dashboard widgets that reflect changing data without requiring page refresh or polling

---

## When NOT to Use

Avoid this skill for:

- Bulk data transfer — subscriptions are for incremental, real-time updates, not historical data dumps (use REST pagination or GraphQL queries with cursor-based loading instead)
- One-time data fetches where the client can poll at reasonable intervals (every 30+ seconds) — polling is simpler and has lower infrastructure overhead
- High-frequency tick data (>1kHz events per subscription) where WebSocket frame overhead dominates payload size (use raw binary Protobuf over gRPC instead)
- Applications with no server-side event source — subscriptions require an actual async event stream to drive them, not just periodic database snapshots

---

## Core Workflow

### 1. Define the Subscription Schema — Add Subscription Root to GraphQL Type System

GraphQL defines three root operation types: `Query`, `Mutation`, and `Subscription`. The `Subscription` type uses async generator resolvers that yield events as they occur. Define subscription fields with clear input parameters (what event to subscribe to) and strongly-typed return types (the shape of each event).

**Checkpoint:** Every subscription field returns an `AsyncGenerator[EventType, None]` — never a bare `Event`, `List[Event]`, or generator expression. The return type must be a Strawberry `@strawberry.type` with documented fields.

### 2. Choose PubSub Backend — In-Memory for Development, Redis for Production

Select the event distribution layer based on deployment topology:

- **In-memory PubSub**: Python dict-based subscriber registry. Simple and fast but only works when all subscription consumers run in the same process. Suitable for local development and single-container deployments.
- **Redis-backed PubSub**: Uses Redis `PUBLISH`/`SUBSCRIBE` channels to distribute events across multiple worker processes or pods. Required for any production deployment with horizontal scaling.

**Checkpoint:** If your service runs on more than one pod/container, in-memory PubSub will silently drop events published from other instances — you must use Redis or another external broker.

### 3. Implement Async Generator Resolvers — Yield Events as They Occur

Each subscription resolver is an async generator function decorated with `@strawberry.subscriber`. The resolver subscribes to the chosen PubPub backend, filters events relevant to the client's parameters, and yields typed event objects. When the connection closes (client disconnects), the generator exits via cancellation and must perform cleanup.

**Checkpoint:** Every subscription generator must have a `try/finally` block in its cleanup path that unsubscribes from the PubSub channel, preventing memory leaks of abandoned listener callbacks.

### 4. Add Authentication — Validate JWT in WebSocket Handshake (on_connect)

WebSocket connections for subscriptions authenticate during the connection handshake phase, before any subscription messages flow. The `graphql-ws` protocol defines a `ConnectionInit` message (type `"connection_init"`) sent by the client as the first message. Extract the JWT token from this message, validate it server-side, and reject unauthorized connections before they can subscribe.

**Checkpoint:** Reject on_connect with an error for missing or invalid tokens — never allow anonymous subscription connections in production. Store decoded user identity in the WebSocket scope/context so resolvers can access `info.context["user_id"]`.

### 5. Implement Reconnection Handling — Exponential Backoff and State Tracking

Clients will disconnect due to network instability, server restarts, or deployment rollouts. Implement reconnection logic on the client side (exponential backoff with jitter) and on the server side (track active subscriptions per connection, preserve event ordering). For stateful subscriptions like chat channels, consider implementing last-event replay so reconnecting clients receive missed events.

**Checkpoint:** Server-side subscription state must be keyed by connection ID, not IP address, since NAT gateways and mobile networks can change IPs without disconnecting. Clean up all stale subscriptions when connections terminate.

### 6. Apply Backpressure Controls — Rate Limit Per Connection, Cap Concurrent Subscriptions

Without backpressure, a single misbehaving or compromised client can consume unbounded server resources through excessive subscription events or connection multiplexing. Implement: (a) per-connection rate limiting on event yield frequency, (b) maximum concurrent subscriptions per connection (~50), and (c) query complexity limits restricted to subscription fields only.

**Checkpoint:** Rate-limited events should be silently dropped (not queued indefinitely) to prevent memory growth from backlog. Log rate-limit violations for operational monitoring but do not return errors to the client — silent dropping is standard for real-time event streams.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Basic Subscription with Async Generator

The simplest subscription pattern uses `@strawberry.subscriber` with an async generator that polls a hypothetical event source and yields typed results. This pattern works well when you have an existing event queue, database watch mechanism, or message broker to poll from within the resolver loop.

```python
# subscriptions/base.py — Basic async generator subscription
import strawberry
from strawberry.types import Info
from typing import AsyncGenerator
import asyncio


@strawberry.type(description="A chat message sent in a channel")
class ChatMessage:
    """Represents a single chat message within a channel."""

    id: strawberry.ID
    content: str
    author_id: str
    created_at: str
    edited: bool = False


@strawberry.type(description="Root subscription type for real-time events")
class Subscription:
    @strawberry.subscriber(
        description="Stream new chat messages from a specific channel",
    )
    async def new_message(self, channel_id: str) -> AsyncGenerator[ChatMessage, None]:
        """Yields chat messages as they arrive in the specified channel.

        The resolver polls a message store for new entries. In production,
        replace the polling loop with Redis PubSub subscription or a
        Kafka consumer for low-latency event delivery.

        Args:
            channel_id: The unique identifier of the chat channel to subscribe to.

        Yields:
            ChatMessage objects as they are created.
        """
        last_seen_id: str = ""

        while True:
            messages = await get_new_messages(channel_id, after_id=last_seen_id)

            if messages:
                for msg in messages:
                    last_seen_id = str(msg.id)
                    yield ChatMessage(
                        id=msg.id,
                        content=msg.content,
                        author_id=msg.author_id,
                        created_at=msg.created_at.isoformat(),
                        edited=msg.edited,
                    )

            # Poll interval — adjust based on latency requirements
            await asyncio.sleep(0.5)


# ❌ BAD: Bare generator without AsyncGenerator type hint
# This confuses the GraphQL engine and loses typing information
@strawberry.type
class BadSubscription:
    @strawberry.subscriber()
    def broken_resolver(self, channel_id: str):  # No return type!
        async def inner():
            while True:
                yield await get_message(channel_id)  # Missing await on event fetch
        return inner()


# ✅ GOOD: AsyncGenerator with explicit return type and proper async/await
@strawberry.type
class GoodSubscription:
    @strawberry.subscriber()
    async def reliable_resolver(
        self, channel_id: str
    ) -> AsyncGenerator[ChatMessage, None]:  # Explicit type hint
        while True:
            msg = await get_message(channel_id)  # Properly awaited
            yield ChatMessage(...)
```

### Pattern 2: PubSub-Based Subscription (In-Memory for Development)

The PubSub pattern decouples event producers from subscription consumers. An in-memory registry maps event names to sets of subscriber callbacks. This approach works perfectly for single-process development and testing but must be replaced with Redis-backed PubSub for any multi-instance deployment.

```python
# subscriptions/pubsub.py — In-memory PubSub for development
import strawberry
from strawberry.types import Info
from typing import AsyncGenerator, Any, Awaitable, Callable, Set
import asyncio


class MyPubSub:
    """In-memory publish/subscribe event dispatcher.

    Maps event names to sets of async callback functions. When publish() is
    called for an event name, all registered callbacks receive the data.

    WARNING: This implementation only works within a single Python process.
    For distributed deployments across multiple pods/workers, use RedisPubSub
    (see Pattern 5).
    """

    def __init__(self) -> None:
        self._subscribers: dict[str, Set[Callable[[Any], Awaitable[None]]]] = {}

    async def publish(self, event_name: str, data: Any) -> None:
        """Publish an event to all registered subscribers for the given event name."""
        if event_name in self._subscribers:
            # Fire-and-forget: callbacks run concurrently without blocking publisher
            tasks = [cb(data) for cb in self._subscribers[event_name]]
            await asyncio.gather(*tasks, return_exceptions=True)

    def subscribe(
        self, event_name: str, callback: Callable[[Any], Awaitable[None]]
    ) -> None:
        """Register a callback to receive events of the given name."""
        if event_name not in self._subscribers:
            self._subscribers[event_name] = set()
        self._subscribers[event_name].add(callback)

    def unsubscribe(
        self, event_name: str, callback: Callable[[Any], Awaitable[None]]
    ) -> None:
        """Remove a previously registered callback (critical for cleanup on disconnect)."""
        if event_name in self._subscribers:
            self._subscribers[event_name].discard(callback)


# Shared PubSub instance — inject as dependency into Strawberry schema
pubsub = MyPubSub()


@strawberry.type(description="Status update for a trade order")
class OrderStatusUpdate:
    """Real-time status change for an order placed in the system."""

    order_id: str
    status: str
    updated_at: str


@strawberry.type(description="Root subscription type")
class Subscription:
    @strawberry.subscriber(
        description="Stream order status updates for a specific order",
    )
    async def order_status(self, order_id: str) -> AsyncGenerator[OrderStatusUpdate, None]:
        """Yields status changes as they are published by mutations or external systems.

        The resolver registers a listener callback during subscription setup and
        removes it in the finally block when the connection closes.
        """
        pending_events: list[dict[str, Any]] = []
        listener_started = asyncio.Event()

        async def listener(data: Any) -> None:
            if data.get("order_id") == order_id:
                pending_events.append(data)
                listener_started.set()

        pubsub.subscribe("order_status_updated", listener)

        try:
            while True:
                # Wait for new events or check the buffer periodically
                if pending_events:
                    data = pending_events.pop(0)
                    yield OrderStatusUpdate(
                        order_id=data["order_id"],
                        status=data["status"],
                        updated_at=data["updated_at"],
                    )
                else:
                    await asyncio.sleep(0.1)
        finally:
            # CRITICAL: Remove listener to prevent memory leaks
            pubsub.unsubscribe("order_status_updated", listener)


# Example mutation that triggers the subscription events
@strawberry.type(description="Root mutation type")
class Mutation:
    @strawberry.mutation(description="Update an order's status and notify subscribers")
    async def update_order_status(self, order_id: str, new_status: str) -> bool:
        """Changes order status and publishes the event to all subscribed clients."""
        import datetime

        await pubsub.publish("order_status_updated", {
            "order_id": order_id,
            "status": new_status,
            "updated_at": datetime.datetime.utcnow().isoformat(),
        })
        return True


# ❌ BAD: No cleanup of listener on disconnect — memory leak grows with each reconnect
@strawberry.type
class BadSubscriptionNoCleanup:
    @strawberry.subscriber()
    async def leaky_order_status(self, order_id: str) -> AsyncGenerator[OrderStatusUpdate, None]:
        async def listener(data):
            if data.get("order_id") == order_id:
                yield OrderStatusUpdate(order_id=data["order_id"], status=data["status"], updated_at=data["updated_at"])

        pubsub.subscribe("order_status_updated", listener)
        # NO try/finally — listener is never removed when client disconnects
        while True:
            await asyncio.sleep(1)


# ✅ GOOD: try/finally ensures listener cleanup on connection close
@strawberry.type
class GoodSubscriptionCleanup:
    @strawberry.subscriber()
    async def safe_order_status(self, order_id: str) -> AsyncGenerator[OrderStatusUpdate, None]:
        pending_events: list[dict] = []

        async def listener(data):
            if data.get("order_id") == order_id:
                pending_events.append(data)

        pubsub.subscribe("order_status_updated", listener)
        try:
            while True:
                if pending_events:
                    data = pending_events.pop(0)
                    yield OrderStatusUpdate(
                        order_id=data["order_id"], status=data["status"], updated_at=data["updated_at"]
                    )
                else:
                    await asyncio.sleep(0.1)
        finally:
            # CRITICAL: Always remove listener to prevent memory leaks
            pubsub.unsubscribe("order_status_updated", listener)
```

### Pattern 3: WebSocket Authentication via on_connect

WebSocket connections must be authenticated before any subscription payload flows. The `graphql-ws` protocol expects the client to send a `ConnectionInit` message as the first frame. Extract authentication credentials from this message, validate them server-side, and reject unauthorized connections during the handshake phase — never defer auth to individual resolvers.

```python
# subscriptions/auth.py — WebSocket connection authentication
import strawberry
from strawberry.types import Info
from typing import Any, AsyncGenerator
import jwt


secret_key = "your-signing-secret"  # Load from environment variable in production


async def on_connect(data: dict[str, Any]) -> dict[str, Any]:
    """Authenticate the WebSocket connection before allowing subscriptions.

    Called by Strawberry when the client sends a ConnectionInit message
    as part of the graphql-ws protocol handshake.

    Args:
        data: The payload sent in the initial connection_init message.
              Typically contains {"Authorization": "Bearer <jwt_token>"}.

    Returns:
        A dict of context values to attach to the WebSocket scope, available
        via info.context["user_id"] in resolvers.

    Raises:
        Exception: If authentication fails — the connection is terminated immediately.
    """
    auth_header = data.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        raise Exception(
            "Unauthorized: Missing or invalid Authorization header. "
            "Send {\"Authorization\": \"Bearer <token>\"} in connection_init."
        )

    token = auth_header[7:]  # Remove "Bearer " prefix

    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return {
            "user_id": payload["sub"],
            "role": payload.get("role", "user"),
            "permissions": payload.get("permissions", []),
        }
    except jwt.ExpiredSignatureError:
        raise Exception("Unauthorized: Token has expired. Re-authenticate and reconnect.")
    except jwt.InvalidTokenError as exc:
        raise Exception(f"Unauthorized: Invalid token — {exc}")


# Strawberry schema with authenticated subscription resolver
@strawberry.type(description="Subscription type for user-specific real-time events")
class Subscription:
    @strawberry.subscriber(
        description="Stream personalized events for the authenticated user",
    )
    async def user_events(self, info: Info) -> AsyncGenerator[str, None]:
        """Yields events specific to the authenticated user's account.

        Accesses user identity from the WebSocket context established by on_connect()
        during the authentication handshake. Unauthorized users never reach this resolver
        because the connection is rejected before subscription messages are processed.
        """
        user_id: str = info.context["user_id"]  # Set by on_connect authentication
        role: str = info.context.get("role", "user")

        while True:
            events = await get_user_events(user_id, role=role)

            if events:
                for event in events:
                    yield f"[{event['type']}] {event['message']}"

            await asyncio.sleep(0.5)


# ❌ BAD: No authentication — any client can subscribe to any data stream
@strawberry.type
class UnauthenticatedSubscription:
    @strawberry.subscriber()
    async def all_data(self, info: Info) -> AsyncGenerator[dict, None]:
        # No on_connect validation — unauthenticated users reach this resolver
        while True:
            yield await get_all_events()  # Leaks all system events to anyone


# ✅ GOOD: Subscription with proper authentication and role-based filtering
@strawberry.type
class AuthenticatedSubscription:
    @strawberry.subscriber(
        description="Stream only data the authenticated user has permission to access",
    )
    async def secure_events(self, info: Info) -> AsyncGenerator[dict[str, Any], None]:
        """Resolver protected by on_connect() authentication handshake.

        Only users with valid JWT tokens reach this code. The user identity
        from on_connect() provides context for filtering events at the source.
        """
        user_id: str = info.context["user_id"]
        role: str = info.context.get("role", "user")

        # Role-based event filtering — admins see all, users see only their own
        event_source = "all_events" if role == "admin" else f"user_events:{user_id}"

        while True:
            events = await get_filtered_events(event_source)
            for event in events:
                yield event

            await asyncio.sleep(0.5)
```

### Pattern 4: Rate Limiting and Backpressure Protection

Without backpressure controls, a single client can flood the server with subscription events by opening many concurrent subscriptions or triggering high-frequency events. Implement per-connection rate limiting using a sliding window counter, enforce maximum concurrent subscriptions per connection, and log violations for operational awareness without returning errors to the client (silent drop is standard for event streams).

```python
# subscriptions/backpressure.py — Connection-level rate limiting
import strawberry
from collections import defaultdict
import time
import logging


logger = logging.getLogger("graphql.subscriptions")


class SubscriptionRateLimiter:
    """Sliding-window rate limiter per subscription connection.

    Tracks event timestamps per connection ID and enforces a maximum events
    per second limit. Events exceeding the rate are silently dropped to
    prevent memory growth from backlogged queues.

    Args:
        max_events_per_second: Maximum number of events allowed per connection per second.
    """

    def __init__(self, max_events_per_second: int = 10) -> None:
        self.max_rate = max_events_per_second
        self._timestamps: defaultdict[str, list[float]] = defaultdict(list)

    async def allow(self, connection_id: str) -> bool:
        """Check if an event is allowed for the given connection within rate limits.

        Uses a sliding window approach: removes timestamps older than 1 second
        and counts remaining entries against the maximum allowed rate.

        Args:
            connection_id: Unique identifier for the WebSocket connection.

        Returns:
            True if the event can proceed, False if rate-limited.
        """
        now = time.monotonic()
        window_start = now - 1.0

        # Remove timestamps outside the sliding window
        self._timestamps[connection_id] = [
            ts for ts in self._timestamps[connection_id] if ts > window_start
        ]

        if len(self._timestamps[connection_id]) >= self.max_rate:
            return False

        self._timestamps[connection_id].append(now)
        return True

    async def cleanup_stale_connections(self, active_connection_ids: set[str]) -> None:
        """Remove rate limiter state for connections that are no longer active."""
        stale = set(self._timestamps.keys()) - active_connection_ids
        for conn_id in stale:
            del self._timestamps[conn_id]


rate_limiter = SubscriptionRateLimiter(max_events_per_second=5)


@strawberry.type(description="Root subscription type")
class Subscription:
    @strawberry.subscriber(
        description="Stream real-time market price updates for a trading symbol",
    )
    async def market_update(self, symbol: str) -> AsyncGenerator[dict[str, Any], None]:
        """Yields market data updates with built-in rate limiting.

        Events exceeding the per-connection rate limit are silently dropped
        to protect server resources from flooding clients or misbehaving subscribers.
        """
        conn_id = id(self)  # In production, use a real WebSocket connection ID

        while True:
            if await rate_limiter.allow(conn_id):
                data = await get_market_data(symbol)
                yield data
            else:
                # Silently drop event — standard behavior for backpressure in event streams
                pass

            await asyncio.sleep(0.2)


# ✅ GOOD: Protected resolver with rate limiting (shown above in the main code block)
# The Subscription.market_update resolver uses SubscriptionRateLimiter to enforce
# a per-connection ceiling of events, silently dropping excess traffic.

# ❌ BAD: No rate limiting — a single client can flood the server
@strawberry.type
class UnprotectedSubscription:
    @strawberry.subscriber()
    async def unlimited_stream(self, info: Info) -> AsyncGenerator[dict, None]:
        while True:
            # Yields events as fast as possible — no backpressure control
            yield await get_data()  # Server can be overwhelmed by a single client

```

### Pattern 5: Redis-Backed PubSub for Distributed Deployments

Production systems running across multiple pods or containers require an external event broker to distribute subscription events. Redis PubSub provides a simple publish/subscribe channel system where any worker process can publish events and Strawberry subscription resolvers listen on matching channels. Use `aioredis` for async Redis connectivity compatible with Strawberry's async resolver model.

```python
# subscriptions/redis_pubsub.py — Redis-backed distributed PubSub
import json
import strawberry
from typing import AsyncGenerator, Any
import logging


logger = logging.getLogger("graphql.subscriptions")

# Channel naming convention: prefix + event_name ensures namespace isolation
CHANNEL_PREFIX = "graphql_sub_"


class RedisPubSub:
    """Redis-backed publish/subscribe for distributed subscription deployments.

    Uses Redis Pub/Sub channels to broadcast events across all worker processes.
    Each subscription resolver subscribes to a specific Redis channel and yields
    events as they arrive from any producer in the cluster.

    Important notes:
    - Redis PubSub is fire-and-forget; dropped messages are not retransmitted on reconnect
    - For guaranteed delivery with replay capabilities, use Kafka or RabbitMQ instead
    - Each worker process gets its own PubSub connection — don't share across tasks
    """

    def __init__(self, redis_url: str = "redis://localhost:6379", max_connections: int = 20) -> None:
        import aioredis

        self._redis_url = redis_url
        self._max_connections = max_connections
        self._redis: Any = None  # Lazy init to avoid blocking schema import

    async def _get_redis(self) -> Any:
        """Lazy-initialized Redis connection pool."""
        if self._redis is None:
            self._redis = aioredis.from_url(
                self._redis_url,
                max_connections=self._max_connections,
                decode_responses=True,
            )
        return self._redis

    async def publish(self, event_name: str, data: Any) -> None:
        """Publish an event to all subscribers on the matching channel.

        Args:
            event_name: Logical event name (channel suffix).
            data: Serializable payload (dict, list, or primitive).
        """
        redis = await self._get_redis()
        channel = f"{CHANNEL_PREFIX}{event_name}"
        await redis.publish(channel, json.dumps(data))

    async def subscribe_events(self, event_name: str) -> AsyncGenerator[dict[str, Any], None]:
        """Subscribe to a Redis PubSub channel and yield events as they arrive.

        Creates a dedicated PubSub subscription that listens on the Redis channel.
        Events are deserialized from JSON before yielding to the resolver.

        Args:
            event_name: The logical event name matching published messages.

        Yields:
            Deserialized event dictionaries from any producer in the cluster.
        """
        import aioredis

        redis = await self._get_redis()
        channel = f"{CHANNEL_PREFIX}{event_name}"
        pubsub = redis.pubsub()
        await pubsub.subscribe(channel)

        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    yield data
                elif message["type"] == "unsubscribe":
                    logger.info("Redis subscription channel '%s' unsubscribed", channel)
                    break
        finally:
            await pubsub.unsubscribe(channel)
            # Close the pubsub object but keep the main Redis connection alive
            await pubsub.close()


# Shared Redis PubSub instance — configured via environment variable
redis_pubsub = RedisPubSub(redis_url="redis://localhost:6379")


@strawberry.type(description="Subscription type for distributed chat channels")
class Subscription:
    @strawberry.subscriber(
        description="Stream messages from a chat channel across all deployed instances",
    )
    async def channel_message(self, channel_id: str) -> AsyncGenerator[dict[str, Any], None]:
        """Yields messages from any producer in the cluster using Redis PubSub.

        Unlike the in-memory PubSub (Pattern 2), this resolver receives events
        published from ANY pod or container running the service, enabling horizontal
        scaling without losing message delivery.
        """
        async for event in redis_pubsub.subscribe_events(f"channel_{channel_id}_messages"):
            yield event


# Example mutation publishing to Redis PubSub (works across all instances)
@strawberry.type(description="Root mutation type")
class Mutation:
    @strawberry.mutation(
        description="Send a chat message and broadcast to all subscribed clients",
    )
    async def send_message(self, channel_id: str, content: str, author_id: str) -> dict[str, Any]:
        """Publishes a message event that all instances' subscription resolvers will receive."""
        import datetime

        event = {
            "channel_id": channel_id,
            "content": content,
            "author_id": author_id,
            "timestamp": datetime.datetime.utcnow().isoformat(),
        }

        await redis_pubsub.publish(f"channel_{channel_id}_messages", event)
        return event


# ✅ GOOD: Redis-backed PubSub (shown above in the main code block with RedisPubSub class)
# Uses aioredis pubsub channel subscriptions for cross-pod event distribution.

# ❌ BAD: Using in-memory PubSub with multiple pods — events published from Pod A
# will never reach subscription resolvers running in Pod B
@strawberry.type
class DistributedButBroken:
    @strawberry.subscriber()
    async def shared_in_memory(self, channel_id: str) -> AsyncGenerator[dict, None]:
        # MyPubSub (from Pattern 2) is a single process dict — cross-pod events are lost
        while True:
            msg = await get_message_from_local_cache(channel_id)  # Only sees own pod's data
            yield msg
```

### Pattern 6: Reconnection State Management and Last-Event Replay

When clients reconnect after a disconnect, they should be able to receive events they missed. Implement last-event replay by tracking the most recent event ID or timestamp per subscription in Redis (shared across instances), then use it to resume from the correct point. The client-side should implement exponential backoff with jitter to avoid thundering herd on reconnect storms.

```python
# subscriptions/reconnection.py — Last-event replay support
import strawberry
from typing import AsyncGenerator, Any, Optional


class ReplayStateManager:
    """Tracks last-seen event state per (subscription_id, user_id) pair.

    Stores state in Redis so it survives across server restarts and is accessible
    from any pod. Enables clients to resume subscriptions from the point of
    disconnection rather than starting fresh.
    """

    def __init__(self, redis_url: str = "redis://localhost:6379") -> None:
        import aioredis
        self._redis = aioredis.from_url(redis_url, decode_responses=True)

    async def set_last_event(self, subscription_key: str, event_id: str) -> None:
        """Record the last event ID seen by a subscription.

        Args:
            subscription_key: Unique key like "order_status:123" or "channel:456".
            event_id: The most recent event ID the client has received.
        """
        await self._redis.set(
            f"replay:{subscription_key}",
            event_id,
            ex=3600,  # Expire after 1 hour — stale state auto-cleanup
        )

    async def get_last_event(self, subscription_key: str) -> Optional[str]:
        """Retrieve the last known event ID for a subscription.

        Returns None if no prior state exists (new client connection).
        """
        return await self._redis.get(f"replay:{subscription_key}")


# Shared replay state manager
replay_state = ReplayStateManager()


@strawberry.type(description="Root subscription type with replay support")
class Subscription:
    @strawberry.subscriber(
        description="Stream messages with automatic replay from last-seen event on reconnect",
    )
    async def replayable_messages(self, channel_id: str) -> AsyncGenerator[dict[str, Any], None]:
        """Yields messages, optionally replaying missed events based on connection state.

        On first connection (or after long disconnection), replays recent events
        from the store. On reconnection within a short window, resumes from the
        last known event ID to avoid duplicates while catching up on misses.
        """
        subscription_key = f"channel:{channel_id}"
        state_manager = replay_state
        last_event_id = await state_manager.get_last_event(subscription_key)

        # First pass: replay any missed events from the store
        if last_event_id is not None:
            async for event in get_missed_events(channel_id, after_id=last_event_id):
                yield event
                await state_manager.set_last_event(subscription_key, event["id"])

        # Second pass: live events going forward
        while True:
            messages = await get_new_messages(channel_id, after_id=last_event_id or "")

            if messages:
                for msg in messages:
                    last_event_id = str(msg.id)
                    yield msg.model_dump() if hasattr(msg, "model_dump") else msg
                    await state_manager.set_last_event(subscription_key, msg.id)

            await asyncio.sleep(0.3)
```

---

## Constraints

### MUST DO

- Use `AsyncGenerator[EventType, None]` with `@strawberry.subscriber` for ALL subscription resolvers — never bare generators or async def returning a single value
- Authenticate WebSocket connections in the `on_connect` handshake phase (reject unauthorized before any subscription messages flow) — never defer auth to individual resolvers
- Deploy Redis-backed PubSub for any multi-instance or horizontal-scale deployment — in-memory PubSub only works within a single Python process
- Wrap every async generator resolver in `try/finally` to unsubscribe from PubSub listeners on connection close — uncleaned listeners are memory leaks that grow unbounded
- Enforce per-connection rate limiting (default: 5–10 events/second) and cap concurrent subscriptions per client at ~50 maximum
- Log subscription lifecycle events (connect, subscribe, unsubscribe, disconnect) for operational monitoring and debugging

### MUST NOT DO

- Never use `subscriptions-transport-ws` — it has been deprecated since November 2023 with no active maintenance; always use `graphql-ws` protocol
- Don't yield events without checking connection state or wrapping in try/finally — client disconnects cause unhandled CancelledError exceptions if listeners are not cleaned up
- Don't share in-memory PubSub instances across workers, processes, or pods — events published from one instance will never reach subscription resolvers in another instance (use Redis)
- Don't allow unlimited concurrent subscriptions per connection — enforce a hard cap (~50) to prevent resource exhaustion attacks
- Don't use subscriptions for bulk data transfer or historical queries — subscriptions are designed for incremental real-time updates only; use GraphQL queries with pagination for data retrieval
- Don't buffer queued events indefinitely when rate-limited — silently drop excess events rather than growing unbounded memory queues

---

## Output Template

When implementing or reviewing GraphQL subscription code, produce:

1. **Subscription Type Definitions** — Complete `@strawberry.type` Subscription root type with all subscription fields decorated as `@strawberry.subscriber`, each returning `AsyncGenerator[EventType, None]` with typed event payload types defined as Strawberry types
2. **PubSub Backend Implementation** — Either in-memory (development) or Redis-backed (production) PubSub class with `publish()`, `subscribe()`, and `unsubscribe()` methods matching the chosen deployment topology
3. **Authentication Handshake Code** — `on_connect` async function that validates JWT tokens from the `ConnectionInit` message, raises exceptions for unauthorized connections, and returns user context to resolvers via `info.context`
4. **Rate Limiter and Backpressure Controls** — Per-connection rate limiter class with sliding window implementation, concurrent subscription cap enforcement, and silent-drop behavior for exceeded rates
5. **Reconnection Support (if applicable)** — Last-event replay state manager with Redis-backed persistence, client-side exponential backoff description, and event ID tracking logic
6. **Cleanup Guarantees** — Explicit `try/finally` blocks in every resolver demonstrating listener cleanup on connection termination

---

## Related Skills

| Skill | Purpose |
|---|---|
| `graphql-api-design` | Design the overall GraphQL schema including Query, Mutation, and Subscription types; defines the API contract subscriptions operate within |
| `graphql-error-handling-validation` | Handle subscription-level errors, structured error unions for failed connections, and input validation on subscription arguments |
| `graphql-dataloader-pattern` | Apply DataLoader batching to resolve data associated with subscription events (e.g., fetching user profiles alongside chat messages) |

---

## Live References

> Authoritative documentation links for GraphQL subscriptions and Strawberry implementation. The model follows markdown links at load time to resolve external references and inline content.

- [Strawberry GraphQL Documentation](https://strawberry.rocks/) — Python-first GraphQL framework with native type-hint support, `@strawberry.subscriber` decorator, and async generator patterns
- [graphql-ws Protocol Specification](https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md) — The current WebSocket protocol standard for GraphQL subscriptions (replacement for the deprecated subscriptions-transport-ws)
- [GraphQL Subscription Specification](https://github.com/graphql/graphql-over-http/blob/main/rfcs/GraphQLEngineSubscription.md) — Official GraphQL-over-HTTP extension defining subscription semantics and transport requirements
- [aioredis Documentation](https://docs.aiohttp.org/en/stable/) — Async Redis client library for Python, used with Strawberry's async resolver model for Redis-backed PubSub
- [JWT.io — JSON Web Token Reference](https://jwt.io/introduction) — JWT token structure, encoding, and validation reference for WebSocket handshake authentication patterns
- [Relay Connection Spec (Cursor Pagination)](https://relay.dev/docs/guides/graphql/connection-specifications/) — Cursor-based pagination patterns applicable when combining subscriptions with paginated query results
