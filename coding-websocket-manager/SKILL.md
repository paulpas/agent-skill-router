---
name: coding-websocket-manager
description: WebSocket connection manager with state machine (connecting/connected/reconnecting/error), exponential backoff, and message routing
---

# Skill: coding-websocket-manager

# WebSocket connection manager with state machine (connecting/connected/reconnecting/error), exponential backoff, and message routing

## Role / Purpose

This skill covers the canonical pattern for managing WebSocket connections to cryptocurrency exchanges. The manager tracks connection state via an explicit enum, reconnects automatically with exponential backoff up to a configurable ceiling, routes messages to registered handlers, and resubscribes to all channels after reconnect.

---

## Key Patterns

### 1. `ConnectionStatus` Enum — Explicit State Machine

Every connection has an explicit status value. Code that checks `conn.status != ConnectionStatus.CONNECTED` is readable English, not a boolean maze.

```python
from enum import Enum

class ConnectionStatus(Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    ERROR = "error"
```

---

### 2. `WebSocketConnection` Dataclass

Bundles the websocket object with its URI, state, and reconnection parameters. `reconnect_delay` starts at 5 seconds and backs off up to `max_reconnect_delay`.

```python
from dataclasses import dataclass
import websockets

@dataclass
class WebSocketConnection:
    ws: websockets.WebSocketClientProtocol
    uri: str
    status: ConnectionStatus = ConnectionStatus.DISCONNECTED
    last_pong: float = 0
    reconnect_delay: int = 5
    max_reconnect_delay: int = 60
```

---

### 3. `connect()` — Initial Connection

Establishes connection and transitions state to `CONNECTED`. Raises immediately on failure — the caller decides whether to retry.

```python
from collections import defaultdict
from typing import Dict
import logging

logger = logging.getLogger(__name__)

class WebSocketManager:
    """Manages WebSocket connections with automatic reconnection."""

    def __init__(self):
        self.connections: Dict[str, WebSocketConnection] = {}
        self._running = False
        self._message_handlers: Dict[str, list] = defaultdict(list)
        self._subscription_callbacks: list = []

    async def connect(self, uri: str, exchange: str) -> WebSocketConnection:
        """Establish a WebSocket connection."""
        try:
            ws = await websockets.connect(uri)
            conn = WebSocketConnection(ws=ws, uri=uri)
            self.connections[exchange] = conn
            conn.status = ConnectionStatus.CONNECTED
            logger.info(f"Connected to {exchange}")
            return conn
        except Exception as e:
            logger.error(f"Failed to connect to {exchange}: {e}")
            raise
```

---

### 4. `reconnect()` — Exponential Backoff

State is set to `RECONNECTING` before any sleep. Each failure doubles the delay: `delay = min(delay * 2, max_delay)`. After a successful reconnect, all registered subscription callbacks are replayed. If the max delay is exceeded, state transitions to `ERROR`.

```python
    async def reconnect(self, exchange: str):
        """Reconnect with exponential backoff."""
        if exchange not in self.connections:
            return

        conn = self.connections[exchange]
        conn.status = ConnectionStatus.RECONNECTING

        delay = conn.reconnect_delay
        while delay <= conn.max_reconnect_delay:
            try:
                logger.info(f"Reconnecting to {exchange} in {delay}s...")
                await asyncio.sleep(delay)

                await conn.ws.close()
                ws = await websockets.connect(conn.uri)
                conn.ws = ws
                conn.status = ConnectionStatus.CONNECTED

                # Resubscribe to all channels after reconnect
                for callback in self._subscription_callbacks:
                    await callback(exchange, ws)

                logger.info(f"Reconnected to {exchange}")
                return

            except Exception as e:
                logger.error(f"Reconnection failed for {exchange}: {e}")
                delay = min(delay * 2, conn.max_reconnect_delay)

        conn.status = ConnectionStatus.ERROR
```

---

### 5. `subscribe()` — Send Subscription Message

Guard clause verifies the exchange is connected before sending. Constructs a standard subscription JSON message.

```python
    async def subscribe(self, exchange: str, channel: str, symbols: list):
        """Subscribe to a WebSocket channel."""
        if exchange not in self.connections:
            raise RuntimeError(f"Not connected to {exchange}")

        conn = self.connections[exchange]
        message = {
            "op": "subscribe",
            "channel": channel,
            "symbols": symbols
        }

        await conn.ws.send(json.dumps(message))
```

---

### 6. `on_message()` / `on_subscribe()` Handler Registration

Both registrars append to lists — no validation needed, handlers are called in registration order.

```python
    def on_message(self, exchange: str, handler):
        """Register a message handler for an exchange."""
        self._message_handlers[exchange].append(handler)

    def on_subscribe(self, callback):
        """Register a callback for resubscription after reconnect."""
        self._subscription_callbacks.append(callback)
```

---

### 7. Message Processing Loop — `asyncio.wait_for(recv, timeout=1.0)`, Ping/Pong

The loop iterates over all connected exchanges. `asyncio.wait_for` with a 1-second timeout allows other connections to be polled without blocking indefinitely. Ping frames are answered with pong immediately. `ConnectionClosed` exceptions trigger `reconnect()`.

```python
    async def start(self):
        """Start message processing loop."""
        self._running = True
        while self._running:
            for exchange, conn in list(self.connections.items()):
                if conn.status != ConnectionStatus.CONNECTED:
                    continue

                try:
                    message = await asyncio.wait_for(conn.ws.recv(), timeout=1.0)
                    data = json.loads(message)

                    # Handle ping/pong
                    if isinstance(data, dict) and data.get("type") == "ping":
                        await conn.ws.send(json.dumps({"type": "pong"}))
                        continue

                    # Route to handlers
                    for handler in self._message_handlers.get(exchange, []):
                        await handler(exchange, data)

                except asyncio.TimeoutError:
                    continue
                except websockets.exceptions.ConnectionClosed:
                    logger.warning(f"Connection closed for {exchange}")
                    await self.reconnect(exchange)
                except Exception as e:
                    logger.error(f"Error processing message for {exchange}: {e}")
```

---

### 8. `stop()` Lifecycle

Clears `_running` flag and closes all connections cleanly.

```python
    async def stop(self):
        """Stop all connections."""
        self._running = False
        for conn in self.connections.values():
            await conn.ws.close()
```

---

## Code Examples

### Full Lifecycle Usage

```python
import asyncio
from apex.websocket import WebSocketManager

manager = WebSocketManager()

# Register a resubscription callback
async def resubscribe(exchange: str, ws):
    await manager.subscribe(exchange, "ticker", ["BTC/USDT", "ETH/USDT"])

manager.on_subscribe(resubscribe)

# Register message handlers
async def handle_binance(exchange: str, data: dict):
    print(f"[{exchange}] Received: {data}")

manager.on_message("binance", handle_binance)

# Connect and subscribe
async def main():
    conn = await manager.connect(
        uri="wss://stream.binance.com:9443/ws/btcusdt@ticker",
        exchange="binance",
    )
    await manager.subscribe("binance", "ticker", ["BTCUSDT"])

    # Start the message loop (runs until stopped)
    try:
        await manager.start()
    finally:
        await manager.stop()

asyncio.run(main())
```

### Backoff Delay Progression

```
delay=5  → sleep 5s, retry
delay=10 → sleep 10s, retry
delay=20 → sleep 20s, retry
delay=40 → sleep 40s, retry
delay=60 → sleep 60s, retry (capped at max_reconnect_delay)
delay=60 → max exceeded → status = ERROR
```

### Connection State Transitions

```
start
  └─> DISCONNECTED
        └─> connect() → CONNECTED
              └─> ConnectionClosed → RECONNECTING
                    └─> reconnect succeeds → CONNECTED
                    └─> max delay exceeded → ERROR
```

---

## Philosophy Checklist

- **Early Exit**: `subscribe()` raises immediately if the exchange is not connected; `reconnect()` returns immediately if exchange not tracked
- **Parse Don't Validate**: `json.loads(message)` parses raw bytes at the I/O boundary; handlers receive typed Python dicts
- **Atomic Predictability**: `on_message` and `on_subscribe` are pure registrations; the message loop is the only place that dispatches
- **Fail Fast**: `connect()` raises on failure; `reconnect()` transitions to `ERROR` rather than retrying forever
- **Intentional Naming**: `ConnectionStatus.RECONNECTING`, `on_subscribe`, `start`, `stop` — the entire lifecycle reads as a sequence of English verbs
