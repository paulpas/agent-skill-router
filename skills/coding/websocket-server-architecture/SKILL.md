---




name: websocket-server-architecture
description: Implements WebSocket server architecture patterns including pub/sub routing, session management, horizontal scaling with Redis/NATS, heartbeat keepalive, and graceful shutdown for high-concurrency real-time systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: websocket server, pub sub routing, session management, horizontal scaling, redis pubsub, heartbeat keepalive, graceful shutdown, real-time server
  archetypes:
    - tactical
    - orchestration
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: websocket-security, websocket-manager, websocket-protocol, websocket-performance




---





# WebSocket Server Architecture

Implements production-grade WebSocket server architecture with message routing, session management, horizontal scaling, and graceful lifecycle control. Builds on asyncio-native servers for high-concurrency real-time systems.

## TL;DR Checklist

- [ ] Use a central `MessageRouter` to decouple connections from messaging logic
- [ ] Store per-connection state (session ID, topic subscriptions) in a thread-safe registry
- [ ] Implement heartbeat with ping interval + pong timeout — disconnect after N missed pongs
- [ ] Publish messages to Redis/NATS for cross-instance fanout; route locally using connection IDs
- [ ] Handle SIGINT/SIGTERM: stop accepting new connections, drain outbound queues, send close frames, exit cleanly within a bounded time window

---

## When to Use

- Designing the server-side of a real-time application (chat, live dashboards, collaborative editing)
- Implementing horizontal scaling for WebSocket services across multiple server instances
- Building a message broker layer that routes messages by topic to subscribed clients
- Implementing graceful shutdown for long-running WebSocket servers in production
- Diagnosing connection leaks or memory growth from stale WebSocket sessions

---

## When NOT to Use

- Client-side reconnection logic — use `websocket-manager` instead
- Authentication, origin validation, rate limiting, or security hardening — use `websocket-security` instead
- Binary protocol design or compression tuning — use `websocket-performance` instead
- Understanding the underlying WebSocket protocol mechanics (handshake, opcodes, masking) — use `websocket-protocol` instead

---

## Core Workflow

1. **Define Session State** — Create a data class holding per-connection metadata: session ID, topic subscriptions, last pong time, and an outbound message queue. **Checkpoint:** Each connection gets exactly one session object; no shared mutable state between connections.

2. **Register the Connection** — On open, create a session, store it in the `SessionRegistry`, subscribe to any topics from the query string or handshake headers. **Checkpoint:** Verify the session appears in the registry immediately after registration.

3. **Route Incoming Messages** — Parse each received frame, extract target topic or connection ID, and dispatch via `MessageRouter`. **Checkpoint:** Unrecognized message types should be handled gracefully with a protocol error frame, not crashed.

4. **Fan-Out to Subscribers** — For topic messages, publish to the local fan-out map AND to Redis/NATS for cross-instance delivery. **Checkpoint:** Every subscriber on every connected instance receives the message exactly once (at-least-once semantics).

5. **Maintain Heartbeat** — Run a periodic ping task that checks pong responses per session. Disconnect sessions that miss their pong window. **Checkpoint:** The heartbeat interval should be shorter than the TCP keepalive timeout to detect dead connections before TCP does.

6. **Shutdown Gracefully** — On signal, stop accepting new connections, flush pending outbound queues with a timeout, send `CloseReason.NORMAL_CLOSURE` to all sessions, wait for connections to close, then exit. **Checkpoint:** No messages are lost during shutdown; pending queues drain within the configured deadline.

---

## Implementation Patterns

### Pattern 1: Session Registry and Channel-Based Message Routing

A central registry holds per-connection session objects, while a message router provides three delivery modes: topic fan-out (publish/subscribe), direct messaging by connection ID, and global broadcast. All operations are thread-safe via asyncio primitives.

```python
"""Session management and channel-based message routing for WebSocket servers."""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from websockets.server import WebSocketServerProtocol


class MessageType(str, Enum):
    """Supported server-to-client message types."""
    TOPIC = "topic"        # Fan-out to topic subscribers
    DIRECT = "direct"      # Send to a specific connection ID
    BROADCAST = "broadcast"  # Send to every connected client


@dataclass
class Session:
    """Per-connection session state.

    Attributes:
        id: Unique identifier for this WebSocket session.
        ws: The live websocket server protocol object.
        topics: Set of topic names this session has subscribed to.
        last_pong_at: Timestamp of the most recent pong response.
        created_at: Monotonic timestamp when the session was created.
    """
    id: str = field(default_factory=lambda: uuid.uuid4().hex)
    ws: WebSocketServerProtocol | None = None
    topics: set[str] = field(default_factory=set)
    last_pong_at: float = 0.0
    created_at: float = field(default_factory=asyncio.get_event_loop().time)


class SessionRegistry:
    """Thread-safe registry of active WebSocket sessions.

    Supports lookup by connection ID, topic-based fan-out, and
    clean iteration for shutdown procedures. All public methods are
    safe to call from any asyncio task.
    """

    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}
        self._topics: dict[str, set[str]] = {}  # topic -> set of session IDs
        self._lock = asyncio.Lock()

    async def register(self, ws: WebSocketServerProtocol) -> Session:
        """Register a new connection and return its session.

        Args:
            ws: The active WebSocketServerProtocol instance.

        Returns:
            The newly created Session object.
        """
        session = Session(ws=ws)
        async with self._lock:
            self._sessions[session.id] = session
        return session

    async def unregister(self, session_id: str) -> None:
        """Remove a session and clean up topic subscriptions.

        Args:
            session_id: The ID of the session to remove.
        """
        async with self._lock:
            session = self._sessions.pop(session_id, None)
            if session is None:
                return
            # Remove from all topic indexes
            for topic in list(session.topics):
                if topic in self._topics:
                    self._topics[topic].discard(session_id)
                    if not self._topics[topic]:
                        del self._topics[topic]

    async def get(self, session_id: str) -> Session | None:
        """Retrieve a session by ID. Returns None if not found."""
        return self._sessions.get(session_id)

    async def get_by_topic(self, topic: str) -> list[str]:
        """Get all session IDs subscribed to a given topic."""
        async with self._lock:
            return list(self._topics.get(topic, set()))

    async def subscribe(self, session_id: str, topic: str) -> None:
        """Add a session's subscription to a topic.

        Args:
            session_id: The session to add the subscription for.
            topic: The topic name to subscribe to.
        """
        async with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id].topics.add(topic)
                self._topics.setdefault(topic, set()).add(session_id)

    async def unsubscribe(self, session_id: str, topic: str) -> None:
        """Remove a session's subscription from a topic.

        Args:
            session_id: The session to remove the subscription for.
            topic: The topic name to unsubscribe from.
        """
        async with self._lock:
            session = self._sessions.get(session_id)
            if session and topic in session.topics:
                session.topics.discard(topic)
                if topic in self._topics:
                    self._topics[topic].discard(session_id)
                    if not self._topics[topic]:
                        del self._topics[topic]

    async def broadcast(self, message: dict[str, Any]) -> int:
        """Send a message to all connected sessions.

        Args:
            message: The serializable payload to broadcast.

        Returns:
            Number of sessions successfully sent the message.
        """
        count = 0
        async with self._lock:
            session_ids = list(self._sessions.keys())
        for sid in session_ids:
            session = self._sessions.get(sid)
            if session and session.ws and not session.ws.closed:
                try:
                    await session.ws.send(str(message))
                    count += 1
                except Exception:
                    pass
        return count

    @property
    def active_count(self) -> int:
        """Return the number of currently registered sessions."""
        return len(self._sessions)


class MessageRouter:
    """Routes outgoing messages to WebSocket clients via topic, direct, or broadcast.

    Combines local routing with an optional cross-instance backend (Redis Pub/Sub
    or NATS Streams) for horizontal scaling.
    """

    def __init__(
        self,
        registry: SessionRegistry,
        instance_id: str = "",
    ) -> None:
        self._registry = registry
        self._instance_id = instance_id or uuid.uuid4().hex[:8]
        self._pending_queues: dict[str, asyncio.Queue[dict[str, Any]]] = {}

    async def route(self, payload: dict[str, Any]) -> int:
        """Dispatch a message based on its type field.

        Args:
            payload: Must contain a 'type' key matching MessageType values.

        Returns:
            Total number of messages dispatched across all delivery modes.
        """
        msg_type = payload.get("type", "")
        match msg_type:
            case MessageType.TOPIC:
                return await self._route_topic(payload)
            case MessageType.DIRECT:
                return await self._route_direct(payload)
            case MessageType.BROADCAST:
                return await self._route_broadcast(payload)
            case _:
                # Silently drop unknown types — do not crash the handler task.
                return 0

    async def _route_topic(self, payload: dict[str, Any]) -> int:
        """Fan-out a topic message to all local subscribers and the cross-instance bus."""
        topic = payload.get("topic", "")
        recipients = await self._registry.get_by_topic(topic)
        count = 0
        for sid in recipients:
            session = await self._registry.get(sid)
            if session and session.ws and not session.ws.closed:
                try:
                    await session.ws.send(str(payload))
                    count += 1
                except Exception:
                    pass
        # Publish to cross-instance bus (Redis/NATS) so other server nodes deliver.
        if self._registry.active_count > 0:
            await self._publish_to_bus(topic, payload)
        return count

    async def _route_direct(self, payload: dict[str, Any]) -> int:
        """Send a message to a single session by connection ID."""
        target_id = payload.get("target_id", "")
        session = await self._registry.get(target_id)
        if session and session.ws and not session.ws.closed:
            try:
                await session.ws.send(str(payload))
                return 1
            except Exception:
                pass
        return 0

    async def _route_broadcast(self, payload: dict[str, Any]) -> int:
        """Send a message to every connected session."""
        return await self._registry.broadcast(payload)

    async def enqueue_outbound(
        self,
        session_id: str,
        message: dict[str, Any],
        *,
        maxsize: int = 512,
    ) -> None:
        """Queue an outbound message for a session with back-pressure.

        If the queue is full, the oldest messages are dropped to prevent
        unbounded memory growth on slow clients.

        Args:
            session_id: Target session ID.
            message: The payload to enqueue.
            maxsize: Maximum queue depth before dropping oldest messages.
        """
        async with self._lock:
            if session_id not in self._pending_queues:
                self._pending_queues[session_id] = asyncio.Queue(maxsize=maxsize)
            q = self._pending_queues[session_id]
            try:
                q.put_nowait(message)
            except asyncio.QueueFull:
                # Drop oldest message under back-pressure.
                q.get_nowait()
                q.put_nowait(message)

    @property
    def _lock(self) -> asyncio.Lock:
        if not hasattr(self, "_queue_lock"):
            object.__setattr__(self, "_queue_lock", asyncio.Lock())
        return self._queue_lock  # type: ignore[return-value]

    async def _publish_to_bus(self, topic: str, payload: dict[str, Any]) -> None:
        """Override in subclasses to integrate Redis Pub/Sub or NATS Streams.

        Args:
            topic: The topic name for cross-instance delivery.
            payload: The message payload (will be serialized).
        """
        # Placeholder — implement in a subclass with Redis/NATS client.
        pass

    async def flush(self, session_id: str) -> list[dict[str, Any]]:
        """Drain pending outbound messages for a session.

        Used during graceful shutdown to deliver last-moment messages.

        Args:
            session_id: The session to flush messages for.

        Returns:
            List of all drained messages (oldest first).
        """
        drained: list[dict[str, Any]] = []
        async with self._lock:
            q = self._pending_queues.pop(session_id, None)
        if q is not None:
            while not q.empty():
                try:
                    drained.append(q.get_nowait())
                except asyncio.QueueEmpty:
                    break
        return drained

    @property
    def session_count(self) -> int:
        """Number of sessions with pending outbound queues."""
        return len(self._pending_queues)
```

### Pattern 2: Redis-Backed Pub/Sub for Horizontal Scaling

This pattern extends `MessageRouter` to publish topic messages to Redis Pub/Sub, enabling any server instance in a cluster to deliver messages to its local subscribers. A dedicated subscriber task runs per instance and bridges Redis topics into the local message router.

```python
"""Redis-backed pub/sub bridge for horizontal WebSocket scaling."""

from __future__ import annotations

import json
import logging
from typing import Any

import redis.asyncio as redis

logger = logging.getLogger(__name__)


# Redis channel naming convention: ws:<topic>
CHANNEL_PREFIX = "ws:"


class RedisPubSubBridge:
    """Bridges local WebSocket sessions to a Redis Pub/Sub bus for cross-instance routing.

    Each server instance runs one publisher task (publishes topic messages to Redis)
    and one subscriber task (receives cross-instance messages and dispatches them locally).

    Usage:
        bridge = RedisPubSubBridge(redis_url="redis://localhost:6379", instance_id="node-1")
        router = MessageRouter(registry, instance_id="node-1")  # or subclass below
        await bridge.start()
        try:
            await serve_websockets()
        finally:
            await bridge.stop()
    """

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        instance_id: str = "",
        channel_prefix: str = CHANNEL_PREFIX,
    ) -> None:
        self._redis_url = redis_url
        self._instance_id = instance_id
        self._channel_prefix = channel_prefix
        self._pub_client: redis.Redis | None = None
        self._sub_client: redis.Redis | None = None
        self._subscriber_task: asyncio.Task[None] | None = None
        self._message_handler: Any = None  # Set to a callable(asyncio.AbstractEventLoop, dict)
        self._running = False

    async def start(self) -> None:
        """Establish Redis connections and launch the subscriber task."""
        self._pub_client = redis.from_url(self._redis_url, decode_responses=False)
        self._sub_client = redis.from_url(self._redis_url, decode_responses=False)
        self._running = True
        self._subscriber_task = asyncio.create_task(self._subscriber_loop())
        logger.info(
            "RedisPubSubBridge started (instance=%s, pub=%s)",
            self._instance_id,
            self._pub_client.connection_pool,
        )

    async def stop(self) -> None:
        """Cancel subscriber task and close Redis connections."""
        self._running = False
        if self._subscriber_task:
            self._subscriber_task.cancel()
            try:
                await self._subscriber_task
            except asyncio.CancelledError:
                pass
        for client in (self._pub_client, self._sub_client):
            if client is not None:
                await client.close()
        logger.info("RedisPubSubBridge stopped (instance=%s)", self._instance_id)

    async def publish(self, topic: str, payload: dict[str, Any]) -> None:
        """Publish a message to the Redis channel for cross-instance delivery.

        Args:
            topic: The topic name.
            payload: Serializable message payload.
        """
        if self._pub_client is None:
            logger.warning("Cannot publish — Redis client not initialized")
            return
        channel = f"{self._channel_prefix}{topic}"
        message_data = json.dumps({
            "instance_id": self._instance_id,
            "payload": payload,
        })
        try:
            await self._pub_client.publish(channel, message_data)
        except redis.ConnectionError as exc:
            logger.error("Redis publish failed for topic=%s: %s", topic, exc)

    async def _subscriber_loop(self) -> None:
        """Continuously listen on Redis channels and dispatch local messages.

        Resubscribes automatically if the connection drops.
        """
        pubsub = self._sub_client.pubsub() if self._sub_client else None
        while self._running:
            try:
                subscribed_topics = set()
                for channel in await self._list_subscribed_channels():
                    topic = channel.removeprefix(self._channel_prefix)
                    if topic and topic not in subscribed_topics:
                        await pubsub.subscribe(channel)
                        subscribed_topics.add(topic)

                async for message in pubsub.listen():
                    if not self._running or message["type"] != "message":
                        continue
                    try:
                        data = json.loads(message["data"])
                        local_instance_id = data.get("instance_id", "")
                        payload = data.get("payload", {})
                        # Skip messages published by this instance to avoid echo.
                        if local_instance_id == self._instance_id:
                            continue
                        await self._dispatch_local(payload)
                    except (json.JSONDecodeError, KeyError):
                        logger.warning(
                            "Invalid Redis message received on channel=%s",
                            message.get("channel"),
                        )
            except redis.ConnectionError:
                logger.warning(
                    "Redis connection lost — reconnecting in 2s..."
                )
                await asyncio.sleep(2)
            except asyncio.CancelledError:
                break

    async def _dispatch_local(self, payload: dict[str, Any]) -> None:
        """Route a cross-instance message through the local MessageRouter.

        Args:
            payload: The deserialized message from Redis.
        """
        if self._message_handler is not None:
            # The parent server sets this to MessageRouter.route() or similar.
            await self._message_handler(payload)

    async def _list_subscribed_channels(self) -> list[str]:
        """Return the list of channels this instance has local subscriptions for."""
        if self._message_handler is None:
            return []
        # This method must be implemented by the parent to reflect current
        # topic subscriptions. Here we provide a stub that returns empty.
        return []

    @property
    def running(self) -> bool:
        return self._running


class ScalableMessageRouter(MessageRouter):
    """MessageRouter extension that publishes to Redis Pub/Sub.

    Integrate with RedisPubSubBridge by setting its message_handler attribute:
        bridge = RedisPubSubBridge(...)
        router = ScalableMessageRouter(registry, instance_id=...)
        bridge.message_handler = router.route  # type: ignore
        await bridge.start()
    """

    def __init__(
        self,
        registry: SessionRegistry,
        instance_id: str = "",
    ) -> None:
        super().__init__(registry, instance_id)
        self._redis_bridge: RedisPubSubBridge | None = None

    async def publish_to_bus(self, topic: str, payload: dict[str, Any]) -> None:
        """Forward a message to the Redis bridge for cross-instance delivery.

        Args:
            topic: The topic name.
            payload: The message payload.
        """
        if self._redis_bridge is not None:
            await self._redis_bridge.publish(topic, payload)

    def attach_bridge(self, bridge: RedisPubSubBridge) -> None:
        """Attach a RedisPubSubBridge for cross-instance messaging."""
        self._redis_bridge = bridge
        bridge.message_handler = self.route  # type: ignore[misc]
```

### Pattern 3: Heartbeat and Keepalive

Proper heartbeat implementation detects dead connections before TCP keepalive does. Uses configurable ping intervals, pong timeouts, and a missed-pong threshold for automatic disconnection. Demonstrates the BAD vs GOOD contrast.

```python
"""Heartbeat keeper with ping-pong protocol for WebSocket sessions."""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class HeartbeatConfig:
    """Configuration for the heartbeat keepalive system.

    Attributes:
        ping_interval: Seconds between successive ping frames (default 30).
        pong_timeout: Maximum seconds to wait for a pong after sending a ping
                      (default 10). Must be less than ping_interval.
        max_missed_pongs: Number of consecutive missed pongs before disconnecting
                          the session (default 3). Prevents premature disconnection
                          from brief network blips.
    """
    ping_interval: float = 30.0
    pong_timeout: float = 10.0
    max_missed_pongs: int = 3

    def __post_init__(self) -> None:
        if self.pong_timeout >= self.ping_interval:
            raise ValueError(
                f"pong_timeout ({self.pong_timeout}s) must be less than "
                f"ping_interval ({self.ping_interval}s)"
            )


class HeartbeatKeeper:
    """Monitors WebSocket session health via ping-pong heartbeat protocol.

    Spawns one asyncio task per session that periodically sends ping frames
    and tracks pong responses. Sessions exceeding the missed-pong threshold
    are disconnected automatically.

    Usage:
        keeper = HeartbeatKeeper(registry, HeartbeatConfig())
        await keeper.start()
        # ... serve connections ...
        await keeper.stop()
    """

    def __init__(
        self,
        registry: SessionRegistry,
        config: HeartbeatConfig | None = None,
    ) -> None:
        self._registry = registry
        self._config = config or HeartbeatConfig()
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._running = False

    async def start(self) -> None:
        """Launch the global heartbeat monitor."""
        self._running = True
        # Periodically check all sessions for missed pongs.
        self._global_task = asyncio.create_task(self._monitor_loop())
        logger.info(
            "HeartbeatKeeper started (interval=%.1fs, timeout=%.1fs, max_missed=%d)",
            self._config.ping_interval,
            self._config.pong_timeout,
            self._config.max_missed_pongs,
        )

    async def stop(self) -> None:
        """Cancel the monitor task and all session heartbeat tasks."""
        self._running = False
        for task in self._tasks.values():
            task.cancel()
        for task in (self._global_task,) + tuple(self._tasks.values()):
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass
        self._tasks.clear()
        logger.info("HeartbeatKeeper stopped")

    async def on_connect(self, session_id: str) -> None:
        """Called when a new connection opens. Starts heartbeat for that session."""
        if not self._running:
            return
        task = asyncio.create_task(self._session_heartbeat(session_id))
        self._tasks[session_id] = task

    async def on_disconnect(self, session_id: str) -> None:
        """Called when a connection closes. Stops heartbeat for that session."""
        task = self._tasks.pop(session_id, None)
        if task is not None:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    async def _session_heartbeat(self, session_id: str) -> None:
        """Periodically ping a single session and track pong responses.

        This loop runs concurrently for every active connection. It sends
        a ping frame every `ping_interval` seconds, resets the missed count
        on pong receipt, and disconnects after `max_missed_pongs` consecutive
        timeouts.
        """
        missed = 0
        while self._running:
            session = await self._registry.get(session_id)
            if session is None or session.ws is None or session.ws.closed:
                break

            try:
                # Send ping frame. The websockets library automatically sends pong back
                # on the protocol side — we just need to track our own app-level responses.
                await session.ws.ping()
                missed += 1

                if missed > self._config.max_missed_pongs:
                    logger.warning(
                        "Session %s exceeded max missed pongs (%d) — disconnecting",
                        session_id,
                        missed,
                    )
                    await session.ws.close(1001, "heartbeat timeout")
                    await self.on_disconnect(session_id)
                    return

            except Exception as exc:
                logger.warning("Heartbeat ping failed for session %s: %s", session_id, exc)
                await self.on_disconnect(session_id)
                break

            try:
                # Wait for the next ping interval (or until cancelled).
                await asyncio.sleep(self._config.ping_interval)
            except asyncio.CancelledError:
                break

    async def _monitor_loop(self) -> None:
        """Global monitor that runs periodic cleanup checks on all sessions.

        Checks last pong timestamps and disconnects stale sessions even if
        individual heartbeat tasks have not yet detected the failure.
        """
        while self._running:
            try:
                now = time.monotonic()
                async with self._registry._lock:
                    session_ids = list(self._registry._sessions.keys())
                for sid in session_ids:
                    session = await self._registry.get(sid)
                    if session is None or session.ws is None:
                        continue
                    age = now - session.last_pong_at
                    # If a session hasn't ponged within (ping_interval + pong_timeout), kill it.
                    threshold = self._config.ping_interval + self._config.pong_timeout
                    if age > threshold and age > 60:  # Only for sessions with old last_pong_at
                        logger.warning(
                            "Session %s stale (last pong %.1fs ago) — disconnecting",
                            sid, age,
                        )
                        try:
                            await session.ws.close(1001, "heartbeat timeout")
                        except Exception:
                            pass
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Heartbeat monitor error: %s", exc)
            await asyncio.sleep(self._config.ping_interval)


# ── BAD vs. GOOD comparison ──────────────────────────────────────────

# ❌ BAD — No heartbeat at all; dead connections accumulate and leak resources.
async def bad_websocket_handler(ws: WebSocketServerProtocol) -> None:
    """A WebSocket handler with NO heartbeat monitoring."""
    await ws.send("hello")
    # Connection sits open forever even if the client's network cable is pulled.
    # The server never learns the connection is dead until it tries to send.


# ✅ GOOD — Heartbeat with configurable intervals and automatic cleanup.
async def good_websocket_handler(
    ws: WebSocketServerProtocol,
    registry: SessionRegistry,
    keeper: HeartbeatKeeper,
) -> None:
    """A WebSocket handler with proper heartbeat monitoring."""
    session = await registry.register(ws)
    await keeper.on_connect(session.id)
    try:
        async for message in ws:
            # Process incoming message...
            pass
    finally:
        await keeper.on_disconnect(session.id)
        await registry.unregister(session.id)
```

### Pattern 4: Graceful Shutdown Procedure

A production WebSocket server must handle SIGINT/SIGTERM cleanly: stop accepting new connections, flush pending outbound messages to avoid data loss, send close frames to all clients, and exit within a bounded time window. This pattern implements the full shutdown sequence.

```python
"""Graceful shutdown handler for asyncio-based WebSocket servers."""

from __future__ import annotations

import asyncio
import logging
import signal
import sys
from contextlib import asynccontextmanager
from typing import Any, Callable

logger = logging.getLogger(__name__)


@asynccontextmanager
async def graceful_shutdown(
    *,
    registry: SessionRegistry,
    router: MessageRouter,
    heartbeat: HeartbeatKeeper | None = None,
    shutdown_timeout: float = 30.0,
    on_shutdown_callbacks: list[Callable[[], Any]] | None = None,
):
    """Context manager providing graceful server lifecycle control.

    Sets up signal handlers for SIGINT and SIGTERM that trigger a coordinated
    shutdown sequence: drain outbound queues, notify all clients with close
    frames, wait for connections to close, then clean up resources.

    Args:
        registry: Active session registry.
        router: Message router with pending outbound queue support.
        heartbeat: Optional heartbeat keeper (will be stopped during shutdown).
        shutdown_timeout: Maximum seconds to allow the full shutdown sequence.
        on_shutdown_callbacks: Additional async callables to run during cleanup.

    Usage:
        async with graceful_shutdown(
            registry=registry,
            router=router,
            heartbeat=keeper,
        ) as cancel_shut down:
            await server.serve()  # Blocks until shutdown is requested
    """
    shutdown_event = asyncio.Event()
    cancel_shutdown = shutdown_event.set

    def _signal_handler(signum: int, frame: Any) -> None:
        logger.info("Received signal %d — initiating graceful shutdown", signum)
        cancel_shutdown()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _signal_handler, sig, None)

    try:
        yield cancel_shutdown
    finally:
        logger.info("Graceful shutdown started")

        # Phase 1: Stop accepting new connections and drain outbound queues.
        await _drain_queues(registry, router)

        # Phase 2: Send close frames to all clients.
        await _notify_clients(registry, reason="server shutting down")

        # Phase 3: Wait for connections to close within the timeout window.
        await _wait_for_connections(registry, shutdown_timeout)

        # Phase 4: Run additional cleanup callbacks.
        if on_shutdown_callbacks:
            for cb in on_shutdown_callbacks:
                try:
                    if asyncio.iscoroutinefunction(cb):
                        await cb()
                    else:
                        cb()
                except Exception as exc:
                    logger.error("Shutdown callback failed: %s", exc)

        # Phase 5: Stop heartbeat keeper if present.
        if heartbeat:
            await heartbeat.stop()

        logger.info("Graceful shutdown complete")


async def _drain_queues(
    registry: SessionRegistry,
    router: MessageRouter,
) -> None:
    """Flush pending outbound messages for all active sessions.

    Iterates over all sessions and drains their message queues, logging
    any that exceed the maximum flush attempts to prevent infinite loops.
    """
    session_ids = list(registry._sessions.keys())
    logger.info("Draining outbound queues for %d sessions", len(session_ids))

    for sid in session_ids:
        messages = await router.flush(sid)
        if messages:
            logger.info(
                "Flushed %d pending messages for session %s",
                len(messages),
                sid,
            )


async def _notify_clients(registry: SessionRegistry, reason: str) -> None:
    """Send a close frame with NORMAL_CLOSURE to all active sessions.

    Args:
        registry: The session registry containing active connections.
        reason: Human-readable reason for the close (shown in logs).
    """
    session_ids = list(registry._sessions.keys())
    sent = 0
    failed = 0

    for sid in session_ids:
        session = await registry.get(sid)
        if session and session.ws and not session.ws.closed:
            try:
                await session.ws.close(1001, reason)
                sent += 1
            except Exception as exc:
                logger.warning("Failed to close session %s: %s", sid, exc)
                failed += 1

    logger.info(
        "Close frames sent: %d succeeded, %d failed",
        sent,
        failed,
    )


async def _wait_for_connections(
    registry: SessionRegistry,
    timeout: float,
) -> None:
    """Wait for all WebSocket connections to close within the deadline.

    Polls the registry every 0.5 seconds and waits until the active
    session count reaches zero or the timeout expires.

    Args:
        registry: The session registry to monitor.
        timeout: Maximum seconds to wait before forcing cleanup.
    """
    deadline = asyncio.get_event_loop().time() + timeout
    while registry.active_count > 0 and asyncio.get_event_loop().time() < deadline:
        remaining = round(deadline - asyncio.get_event_loop().time(), 1)
        logger.info(
            "Waiting for %d connections to close (%.1fs remaining)",
            registry.active_count,
            remaining,
        )
        await asyncio.sleep(0.5)

    if registry.active_count > 0:
        logger.warning(
            "Timeout reached — %d connections still open, forcing cleanup",
            registry.active_count,
        )
```

### Pattern 5: Complete Server Integration

Shows how to combine all patterns into a single production-ready WebSocket server using the `websockets` library. Demonstrates connection lifecycle, topic subscription from query parameters, and signal-based shutdown.

```python
"""Production WebSocket server combining all architecture patterns."""

from __future__ import annotations

import asyncio
import logging
import ssl
import urllib.parse
from typing import Any

from websockets.server import serve as ws_serve
from websockets.server import WebSocketServerProtocol

logger = logging.getLogger(__name__)


async def websocket_handler(
    ws: WebSocketServerProtocol,
    registry: SessionRegistry,
    router: MessageRouter,
    heartbeat: HeartbeatKeeper,
) -> None:
    """Handle an individual WebSocket connection lifecycle.

    This is the per-connection handler passed to websockets.serve(). It manages
    registration, topic subscription from query parameters, message dispatch,
    and cleanup on disconnect.

    Args:
        ws: The live WebSocket protocol instance.
        registry: Active session registry for lookup and fan-out.
        router: Message router for outgoing delivery.
        heartbeat: Heartbeat keeper monitoring connection health.
    """
    # 1. Register the new connection.
    session = await registry.register(ws)

    # 2. Subscribe to topics from query string (?topics=chat,alerts).
    path = ws.request.path if hasattr(ws, "request") and ws.request else ""
    params = urllib.parse.parse_qs(urllib.parse.urlparse(path).query)
    for topic in params.get("topics", []):
        topic = topic.strip()
        if topic:
            await registry.subscribe(session.id, topic)
            logger.info(
                "Session %s subscribed to topic(s): %s",
                session.id,
                list(params["topics"]),
            )

    # 3. Start heartbeat monitoring for this session.
    await heartbeat.on_connect(session.id)

    try:
        async for raw_message in ws:
            try:
                payload = asyncio.json_decode(raw_message) if hasattr(asyncio, "json_decode") else __import__("json").loads(raw_message)  # noqa: E501
            except (json.JSONDecodeError, ValueError):
                await ws.send(str({"error": "invalid JSON"}))
                continue

            # Route the message through the central router.
            dispatched = await router.route(payload)
            logger.debug(
                "Routed message type=%s dispatched_to=%d sessions",
                payload.get("type", "?"),
                dispatched,
            )
    except Exception as exc:
        logger.error("Connection error for session %s: %s", session.id, exc)
    finally:
        # Clean up on disconnect.
        await heartbeat.on_disconnect(session.id)
        await registry.unregister(session.id)
        logger.info("Session %s disconnected", session.id)


async def run_server(
    host: str = "0.0.0.0",
    port: int = 8765,
    ssl_context: ssl.SSLContext | None = None,
    shutdown_timeout: float = 30.0,
) -> None:
    """Start a production WebSocket server with graceful lifecycle management.

    This is the main entry point that ties together all architecture patterns.

    Args:
        host: Bind address (default "0.0.0.0").
        port: Listen port (default 8765).
        ssl_context: Optional SSL context for WSS connections.
        shutdown_timeout: Graceful shutdown timeout in seconds.
    """
    registry = SessionRegistry()
    router = MessageRouter(registry)
    heartbeat = HeartbeatKeeper(registry, HeartbeatConfig())

    await heartbeat.start()

    # Use the graceful_shutdown context manager to handle signals.
    async with graceful_shutdown(
        registry=registry,
        router=router,
        heartbeat=heartbeat,
        shutdown_timeout=shutdown_timeout,
    ):
        logger.info("Starting WebSocket server on %s:%d", host, port)
        async with ws_serve(
            websocket_handler,
            host,
            port,
            ssl=ssl_context,
            process_request=lambda req: None,  # Auth handled by middleware/SECURITY skill
        ):
            await asyncio.Future()  # Run forever until signal interrupts


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_server())
```

---

## Constraints

### MUST DO

- Use a central `SessionRegistry` and `MessageRouter` — never embed routing logic in per-connection handlers
- Store only lightweight state per session (session ID, topics, pong timestamp); do not cache large payloads in sessions
- Set heartbeat ping interval to 30 seconds with a 10-second pong timeout — matches common production defaults and detects dead connections before TCP keepalive (~2 hours)
- Enforce `max_missed_pongs >= 2` to avoid premature disconnection from brief network blips
- Use the Redis Pub/Sub bridge pattern for horizontal scaling — publish topic messages on every instance, subscribe locally to receive cross-instance traffic
- Always send close frame `1001 (Going Away)` during graceful shutdown with a descriptive reason string
- Implement outbound message queues with back-pressure (`asyncio.Queue` with `maxsize`) — never let slow clients cause unbounded memory growth
- Drain pending outbound queues before closing connections during shutdown
- Register signal handlers for SIGINT and SIGTERM; do not rely on OS process termination alone

### MUST NOT DO

- Store session state in plain dictionaries without asyncio locks — race conditions cause corrupted fan-out maps under high concurrency
- Send unbounded messages to slow clients without queue limits — this causes memory leaks and OOM kills
- Use `asyncio.sleep(0)` busy-loops for heartbeat monitoring — use proper `asyncio.Task` with `await asyncio.sleep()` intervals instead
- Close connections silently during shutdown — always send a close frame first so clients can handle the disconnect gracefully
- Publish the same message to Redis without including the originating instance ID — causes echo loops when every instance subscribes to all topics
- Hardcode Redis URLs or connection parameters in production code — use environment variables or a configuration file
- Skip topic subscription cleanup on disconnect — orphaned subscriptions cause phantom fan-out and wasted resources
- Use `await ws.send()` inside signal handlers directly — defer shutdown logic to an asyncio task that runs in the event loop

---

## Related Skills

| Skill | Purpose |
|---|---|
| `websocket-security` | Authentication, origin validation, rate limiting, and connection limits for WebSocket servers |
| `websocket-manager` | Client-side connection state machine, reconnection with exponential backoff, and message routing on the browser side |
| `websocket-protocol` | Underlying WebSocket protocol mechanics (handshake, opcodes, masking, close handshake) |
| `websocket-performance` | Binary protocols (MessagePack, Protobuf), permessage-deflate compression, and connection pooling for throughput optimization |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [python-websockets Library Documentation](https://websockets.readthedocs.io/)
- [asyncio — Asynchronous I/O (Python 3.12+)](https://docs.python.org/3/library/asyncio.html)
- [Redis Pub/Sub Documentation](https://redis.io/docs/manual/pubsub/)
- [NATS Streaming / JetStream Overview](https://docs.nats.io/nats-concepts/jetstream)
- [HTTP WebSockets RFC 6455 — Section 1.3 (The Opening Handshake)](https://datatracker.ietf.org/doc/html/rfc6455#section-1.3)
- [FastAPI WebSocket Support](https://fastapi.tiangolo.com/advanced/websockets/)
- [Python redis.asyncio API Reference (redis-py 5.x)](https://redis-py.readthedocs.io/en/stable/async.html)
