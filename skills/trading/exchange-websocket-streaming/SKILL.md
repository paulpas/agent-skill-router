---
name: websocket-streaming
description: '"Implements real-time market data streaming and processing for risk
  management and algorithmic trading execution."'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: exchange websocket streaming, exchange-websocket-streaming, market, processing,
    real-time
  related-skills: ai-order-flow-analysis, data-alternative-data
---



**Role:** Handle real-time WebSocket connections for low-latency market data

**Philosophy:** Real-time data is the foundation of competitive advantage; streaming systems must be robust and efficient

## Key Principles

1. **Connection Management**: Auto-reconnect, exponential backoff, heartbeat monitoring
2. **Data Validation**: Validate incoming messages before processing
3. **Rate Limiting**: Prevent API throttling and connection drops
4. **Buffer Management**: Handle message bursts efficiently
5. **Message Parsing**: Fast, schema-based parsing of market data

## Implementation Guidelines

### Structure
- Core logic: exchange_integration/websocket_client.py
- Helper functions: exchange_integration/data_handlers.py
- Tests: tests/test_websocket.py

### Patterns to Follow
- Use asyncio for non-blocking operations
- Implement retry logic with exponential backoff
- Separate connection management from data processing

## Adherence Checklist
Before completing your task, verify:
- [ ] WebSocket connections auto-reconnect on failure
- [ ] Heartbeat monitoring detects stale connections
- [ ] Rate limiting prevents API throttling
- [ ] Message validation rejects malformed data
- [ ] Buffer overflow triggers protective measures


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import asyncio
import json
import websockets
import numpy as np
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass
from datetime import datetime
import time
import logging

@dataclass
class MarketData:
    """Real-time market data point."""
    symbol: str
    timestamp: float
    price: float
    size: float
    side: str  # 'buy' or 'sell'
    order_type: str

class WebSocketClient:
    """Handles WebSocket connections for real-time market data."""
    
    def __init__(
        self,
        url: str,
        reconnect_delay: float = 1.0,
        max_reconnect_delay: float = 30.0
    ):
        self.url = url
        self.reconnect_delay = reconnect_delay
        self.max_reconnect_delay = max_reconnect_delay
        self.ws = None
        self.connected = False
        self.message_handlers = {}
        self.reconnect_task = None
        self.last_heartbeat = time.time()
    
    async def connect(self):
        """Establish WebSocket connection with auto-reconnect."""
        while True:
            try:
                async with websockets.connect(self.url) as ws:
                    self.ws = ws
                    self.connected = True
                    self.last_heartbeat = time.time()
                    await self.on_connect()
                    await self.receive_messages()
            except Exception as e:
                self.connected = False
                logging.warning(f"WebSocket connection error: {e}")
                # Exponential backoff
                delay = min(self.reconnect_delay * 2, self.max_reconnect_delay)
                await asyncio.sleep(delay)
    
    async def receive_messages(self):
        """Continuously receive and process messages."""
        async for message in self.ws:
            self.last_heartbeat = time.time()
            await self.process_message(message)
    
    async def process_message(self, message: str):
        """Process incoming WebSocket message."""
        try:
            data = json.loads(message)
            msg_type = data.get('type', 'unknown')
            
            if msg_type in self.message_handlers:
                for handler in self.message_handlers[msg_type]:
                    await handler(data)
            elif msg_type == 'heartbeat':
                self.last_heartbeat = time.time()
        except json.JSONDecodeError:
            logging.error(f"Failed to parse message: {message}")
    
    def register_handler(self, message_type: str, handler: Callable):
        """Register a message handler for a specific message type."""
        if message_type not in self.message_handlers:
            self.message_handlers[message_type] = []
        self.message_handlers[message_type].append(handler)
    
    async def send_message(self, message: Dict):
        """Send a message through the WebSocket."""
        if self.ws and self.connected:
            await self.ws.send(json.dumps(message))
    
    async def on_connect(self):
        """Called when connection is established."""
        # Subscribe to market data channels
        await self.send_message({'type': 'subscribe', 'channels': ['trade', 'book']})
    
    def is_healthy(self, timeout: float = 30.0) -> bool:
        """Check if connection is healthy based on heartbeat."""
        return time.time() - self.last_heartbeat < timeout


class RateLimiter:
    """Rate limiter to prevent API throttling."""
    
    def __init__(self, max_requests: int, time_window: float = 60.0):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = []
    
    async def acquire(self):
        """Wait until a request can be made within rate limits."""
        while True:
            now = time.time()
            # Remove old requests
            self.requests = [t for t in self.requests if now - t < self.time_window]
            
            if len(self.requests) < self.max_requests:
                self.requests.append(now)
                return
            
            # Wait until oldest request expires
            sleep_time = self.time_window - (now - self.requests[0])
            await asyncio.sleep(max(sleep_time, 0.01))


class DataBuffer:
    """Buffer for handling message bursts."""
    
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self.buffer = []
        self.overflow_count = 0
    
    def add(self, data: MarketData) -> bool:
        """Add data to buffer. Returns False if buffer is full."""
        if len(self.buffer) >= self.max_size:
            self.overflow_count += 1
            return False
        
        self.buffer.append(data)
        return True
    
    def get_all(self) -> List[MarketData]:
        """Get all buffered data and clear buffer."""
        data = self.buffer.copy()
        self.buffer.clear()
        return data
    
    def get_limited(self, max_items: int = 100) -> List[MarketData]:
        """Get up to max_items from buffer, oldest first."""
        data = self.buffer[:max_items]
        self.buffer = self.buffer[max_items:]
        return data
    
    def is_overflowing(self) -> bool:
        """Check if buffer has overflowed recently."""
        return self.overflow_count > 0
```