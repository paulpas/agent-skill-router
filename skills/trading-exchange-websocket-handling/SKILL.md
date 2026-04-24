---
name: trading-exchange-websocket-handling
description: Real-time market data handling with WebSockets including connection management,
  data aggregation, and robust error recovery
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: exchange websocket handling, exchange-websocket-handling, market, real-time,
    websockets
---


**Role:** Guide an AI coding assistant to build robust real-time data pipelines using WebSockets that handle connection instability, data synchronization, and high-frequency updates

**Philosophy:** Real-time data is the lifeblood of modern trading systems, but WebSocket connections are inherently unreliable. Systems must treat WebSocket data as potentially out-of-order, duplicate, or missing. The architecture should prioritize data integrity over raw speed, with robust state synchronization mechanisms that can recover from connection drops without losing critical information.

## Key Principles

1. **Data Integrity Over Freshness**: It's better to have stale but correct data than fresh but incorrect data. Systems should validate and order WebSocket messages before processing.

2. **State Synchronization Protocol**: When connections drop, systems must be able to reconstruct state by requesting snapshots and diffing with WebSocket updates.

3. **Connection Health Monitoring**: WebSocket connections need continuous health monitoring with automatic reconnection, backpressure handling, and graceful degradation.

4. **Message Ordering and Deduplication**: WebSocket streams can deliver messages out of order or duplicated. Systems must handle this gracefully.

5. **Graceful Degradation**: When WebSocket is unavailable, systems should fall back to REST API polling with appropriate lag handling.

## Implementation Guidelines

### Structure
- Core logic: `exchange_integration/websocket.py`
- Data aggregation: `exchange_integration/aggregator.py`
- State management: `exchange_integration/state_sync.py`
- Health monitoring: `exchange_integration/health.py`

### Patterns to Follow
- **Early Exit**: Reject data when synchronization state is invalid
- **Atomic Predictability**: WebSocket messages are processed in a deterministic order
- **Fail Fast**: Halt when WebSocket state cannot be synchronized
- **Intentional Naming**: Clear names for WebSocket operations and states
- **Parse Don't Validate**: WebSocket data parsed at boundaries, validated internally

## Code Examples

```python
# Example 1: WebSocket Connection Manager
import asyncio
import json
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional
import websockets
import logging


class WebSocketState(Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    SYNCHRONIZING = "synchronizing"
    FAILED = "failed"


@dataclass
class WebSocketHealth:
    """WebSocket connection health metrics"""
    last_message: datetime = None
    messages_per_second: float = 0.0
    last_heartbeat: datetime = None
    ping_latency: float = 0.0
    subscription_count: int = 0
    sync_lag: timedelta = timedelta(seconds=0)
    
    def is_healthy(self, max_lag_seconds: float = 5.0) -> bool:
        """Check if WebSocket is operating normally"""
        if self.last_message is None:
            return False
        
        time_since_message = (datetime.now() - self.last_message).total_seconds()
        return time_since_message < max_lag_seconds


class WebSocketConnection:
    """Manages a single WebSocket connection with comprehensive error handling"""
    
    def __init__(self, url: str, config: dict = None):
        self.url = url
        self.config = config or {}
        
        self.state = WebSocketState.DISCONNECTED
        self.websocket = None
        self.health = WebSocketHealth()
        
        self.message_handlers = {}
        self.reconnect_delay = 1.0
        self.max_reconnect_delay = 60.0
        
        self.message_queue = asyncio.Queue()
        self.running = False
        
        self.logger = logging.getLogger(f"websocket.{url}")
    
    async def connect(self):
        """Establish WebSocket connection with error handling"""
        self.state = WebSocketState.CONNECTING
        
        try:
            self.websocket = await websockets.connect(
                self.url,
                ping_interval=self.config.get('ping_interval', 20),
                ping_timeout=self.config.get('ping_timeout', 10),
                max_size=self.config.get('max_message_size', 10_000_000)
            )
            
            self.state = WebSocketState.CONNECTED
            self.health.last_heartbeat = datetime.now()
            self.logger.info(f"WebSocket connected: {self.url}")
            
            # Start message processing loop
            asyncio.create_task(self._process_messages())
            
            # Send initial subscription
            await self._send_initial_subscription()
            
        except Exception as error:
            self.logger.error(f"WebSocket connection failed: {error}")
            self.state = WebSocketState.FAILED
            raise
    
    async def _process_messages(self):
        """Process incoming WebSocket messages"""
        while self.running and self.state == WebSocketState.CONNECTED:
            try:
                message = await asyncio.wait_for(
                    self.websocket.recv(),
                    timeout=self.config.get('message_timeout', 30)
                )
                
                # Update health metrics
                self.health.last_message = datetime.now()
                self.health.messages_per_second += 1
                
                # Parse and route message
                try:
                    data = json.loads(message)
                except json.JSONDecodeError:
                    self.logger.warning(f"Invalid JSON message: {message}")
                    continue
                
                await self._route_message(data)
                
            except asyncio.TimeoutError:
                self.logger.warning("WebSocket timeout, reconnecting")
                await self._reconnect()
                
            except websockets.exceptions.ConnectionClosed:
                self.logger.warning("WebSocket connection closed")
                await self._reconnect()
                
            except Exception as error:
                self.logger.error(f"Error processing message: {error}")
    
    async def _route_message(self, data: dict):
        """Route message to appropriate handler"""
        # Check for ping/pong
        if data.get('type') == 'ping':
            await self._send_pong(data.get('id'))
            return
        
        if data.get('type') == 'pong':
            self.health.last_heartbeat = datetime.now()
            return
        
        # Route to channel-specific handler
        channel = data.get('channel')
        if channel and channel in self.message_handlers:
            await self.message_handlers[channel](data)
        else:
            await self._default_handler(data)
    
    async def _default_handler(self, data: dict):
        """Default message handler"""
        # Implement default processing
        self.logger.debug(f"Received: {data}")
    
    async def _reconnect(self):
        """Handle reconnection with exponential backoff"""
        self.state = WebSocketState.RECONNECTING
        
        # Calculate backoff delay
        delay = self.reconnect_delay
        self.reconnect_delay = min(self.reconnect_delay * 2, self.max_reconnect_delay)
        
        self.logger.info(f"Reconnecting in {delay} seconds")
        
        await asyncio.sleep(delay)
        
        try:
            await self.connect()
            self.reconnect_delay = self.config.get('initial_reconnect_delay', 1.0)
        except Exception as error:
            self.logger.error(f"Reconnection failed: {error}")
            await self._reconnect()
    
    async def _send_initial_subscription(self):
        """Send initial subscriptions after connection"""
        subscriptions = self.config.get('initial_subscriptions', [])
        
        for subscription in subscriptions:
            await self.send(json.dumps(subscription))
    
    async def send(self, message: str):
        """Send message to WebSocket with state check"""
        if self.state != WebSocketState.CONNECTED:
            raise RuntimeError(f"WebSocket not connected: {self.state.value}")
        
        await self.websocket.send(message)
    
    async def subscribe(self, channel: str, symbol: str, **kwargs):
        """Subscribe to a channel"""
        subscription = {
            'type': 'subscribe',
            'channel': channel,
            'symbol': symbol,
            **kwargs
        }
        
        await self.send(json.dumps(subscription))
        self.health.subscription_count += 1
    
    async def unsubscribe(self, channel: str, symbol: str):
        """Unsubscribe from a channel"""
        subscription = {
            'type': 'unsubscribe',
            'channel': channel,
            'symbol': symbol
        }
        
        await self.send(json.dumps(subscription))
        if channel in self.message_handlers:
            del self.message_handlers[channel]
            self.health.subscription_count -= 1
    
    def start(self):
        """Start the WebSocket connection"""
        self.running = True
        asyncio.create_task(self.connect())
    
    def stop(self):
        """Stop the WebSocket connection"""
        self.running = False
        if self.websocket:
            asyncio.create_task(self.websocket.close())
    
    def get_health_report(self) -> dict:
        """Get current WebSocket health report"""
        return {
            'state': self.state.value,
            'health': {
                'last_message': self.health.last_message.isoformat() if self.health.last_message else None,
                'messages_per_second': self.health.messages_per_second,
                'last_heartbeat': self.health.last_heartbeat.isoformat() if self.health.last_heartbeat else None,
                'ping_latency': self.health.ping_latency,
                'subscription_count': self.health.subscription_count
            },
            'sync_lag': self.health.sync_lag.total_seconds()
        }


# Example 2: State Synchronization System
class StateSynchronizer:
    """Maintains synchronized state between WebSocket updates and REST snapshots"""
    
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.state = {}  # Current synchronized state
        self.last_snapshot: dict = None
        self.snapshot_timestamp: datetime = None
        self.pending_updates: list = []
        self.sync_in_progress = False
    
    async def request_snapshot(self, fetch_func):
        """Request a snapshot from REST API"""
        self.sync_in_progress = True
        
        try:
            self.last_snapshot = await fetch_func()
            self.snapshot_timestamp = datetime.now()
            
            # Process pending updates since snapshot
            while self.pending_updates:
                update = self.pending_updates.pop(0)
                await self.apply_update(update)
            
            self.sync_in_progress = False
            return self.last_snapshot
            
        except Exception as error:
            self.sync_in_progress = False
            raise
    
    async def apply_update(self, update: dict):
        """Apply a WebSocket update to state"""
        if self.sync_in_progress:
            # Queue update for later processing
            self.pending_updates.append(update)
            return
        
        # Get the key for this update
        update_type = update.get('type')
        symbol = update.get('symbol')
        
        if update_type not in self.state:
            self.state[update_type] = {}
        
        # Apply update to state
        if update_type == 'orderbook':
            self._apply_orderbook_update(symbol, update)
        elif update_type == 'trade':
            self._apply_trade_update(symbol, update)
        elif update_type == 'ticker':
            self._apply_ticker_update(symbol, update)
    
    def _apply_orderbook_update(self, symbol: str, update: dict):
        """Apply orderbook update"""
        if symbol not in self.state['orderbook']:
            self.state['orderbook'][symbol] = {
                'bids': {},
                'asks': {},
                'timestamp': None
            }
        
        orderbook = self.state['orderbook'][symbol]
        
        # Update bids
        if 'bids' in update:
            for price, size in update['bids']:
                if size == 0:
                    if price in orderbook['bids']:
                        del orderbook['bids'][price]
                else:
                    orderbook['bids'][price] = size
        
        # Update asks
        if 'asks' in update:
            for price, size in update['asks']:
                if size == 0:
                    if price in orderbook['asks']:
                        del orderbook['asks'][price]
                else:
                    orderbook['asks'][price] = size
        
        orderbook['timestamp'] = update.get('timestamp', datetime.now())
    
    def _apply_trade_update(self, symbol: str, update: dict):
        """Apply trade update"""
        if symbol not in self.state['trades']:
            self.state['trades'][symbol] = []
        
        self.state['trades'][symbol].append({
            'price': update.get('price'),
            'amount': update.get('amount'),
            'side': update.get('side'),
            'timestamp': update.get('timestamp', datetime.now())
        })
        
        # Keep only recent trades
        max_trades = self.config.get('max_trades_history', 1000)
        if len(self.state['trades'][symbol]) > max_trades:
            self.state['trades'][symbol] = self.state['trades'][symbol][-max_trades:]
    
    def _apply_ticker_update(self, symbol: str, update: dict):
        """Apply ticker update"""
        if symbol not in self.state['ticker']:
            self.state['ticker'][symbol] = {}
        
        self.state['ticker'][symbol].update({
            'price': update.get('price'),
            'volume': update.get('volume'),
            'timestamp': update.get('timestamp', datetime.now())
        })
    
    def get_state(self, update_type: str, symbol: str = None) -> dict:
        """Get current state"""
        if symbol:
            return self.state.get(update_type, {}).get(symbol)
        return self.state.get(update_type, {})
    
    def get_orderbook(self, symbol: str) -> dict:
        """Get orderbook for a symbol"""
        return self.state.get('orderbook', {}).get(symbol, {
            'bids': {},
            'asks': {},
            'timestamp': None
        })
    
    def get_trades(self, symbol: str, limit: int = 100) -> list:
        """Get recent trades for a symbol"""
        trades = self.state.get('trades', {}).get(symbol, [])
        return trades[-limit:]
    
    def get_ticker(self, symbol: str) -> dict:
        """Get ticker for a symbol"""
        return self.state.get('ticker', {}).get(symbol, {})


# Example 3: Data Aggregator
class DataAggregator:
    """Aggregates WebSocket data into usable formats"""
    
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.synchronized_state = StateSynchronizer(config)
    
    def aggregate_orderbook(self, symbol: str, depth: int = 20) -> dict:
        """Aggregate orderbook to specified depth"""
        orderbook = self.synchronized_state.get_orderbook(symbol)
        
        bids = sorted(orderbook['bids'].items(), key=lambda x: x[0], reverse=True)[:depth]
        asks = sorted(orderbook['asks'].items(), key=lambda x: x[0])[:depth]
        
        return {
            'symbol': symbol,
            'bids': [{'price': p, 'size': s} for p, s in bids],
            'asks': [{'price': p, 'size': s} for p, s in asks],
            'timestamp': orderbook['timestamp']
        }
    
    def aggregate_ticker(self, symbol: str) -> dict:
        """Aggregate ticker data"""
        ticker = self.synchronized_state.get_ticker(symbol)
        trades = self.synchronized_state.get_trades(symbol, 100)
        
        if not trades:
            return {'symbol': symbol, **ticker}
        
        # Calculate 24h statistics
        prices = [t['price'] for t in trades]
        
        return {
            'symbol': symbol,
            'price': ticker.get('price', prices[-1]) if prices else None,
            'volume': ticker.get('volume', sum(t['amount'] for t in trades)),
            'high': max(prices) if prices else None,
            'low': min(prices) if prices else None,
            'open': trades[0]['price'] if trades else None,
            'close': prices[-1] if prices else None,
            'timestamp': ticker.get('timestamp', datetime.now())
        }
    
    def calculate_vwap(self, symbol: str, period_minutes: int = 5) -> float:
        """Calculate VWAP for a symbol"""
        trades = self.synchronized_state.get_trades(symbol)
        
        # Filter to recent trades
        cutoff = datetime.now() - timedelta(minutes=period_minutes)
        recent_trades = [t for t in trades if t['timestamp'] > cutoff]
        
        if not recent_trades:
            return 0.0
        
        total_value = sum(t['price'] * t['amount'] for t in recent_trades)
        total_amount = sum(t['amount'] for t in recent_trades)
        
        return total_value / total_amount if total_amount else 0.0


# Example 4: WebSocket Connection Pool
class WebSocketPool:
    """Manages multiple WebSocket connections with load balancing"""
    
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.connections = {}
        self.health = {}
    
    def add_connection(self, name: str, url: str, config: dict = None):
        """Add a WebSocket connection to the pool"""
        connection = WebSocketConnection(url, config or self.config)
        self.connections[name] = connection
        self.health[name] = WebSocketHealth()
    
    async def start_all(self):
        """Start all WebSocket connections"""
        for name, connection in self.connections.items():
            connection.start()
            self.health[name] = WebSocketHealth()
    
    async def stop_all(self):
        """Stop all WebSocket connections"""
        for connection in self.connections.values():
            connection.stop()
    
    def get_connection(self, name: str) -> Optional[WebSocketConnection]:
        """Get a specific connection"""
        return self.connections.get(name)
    
    def get_healthy_connections(self) -> list:
        """Get list of healthy connection names"""
        return [
            name for name, connection in self.connections.items()
            if connection.state == WebSocketState.CONNECTED
        ]
    
    def get_health_report(self) -> dict:
        """Get health report for all connections"""
        return {
            name: connection.get_health_report()
            for name, connection in self.connections.items()
        }
    
    async def subscribe_all(self, channel: str, symbol: str):
        """Subscribe to channel on all healthy connections"""
        for name, connection in self.connections.items():
            if connection.state == WebSocketState.CONNECTED:
                try:
                    await connection.subscribe(channel, symbol)
                except Exception as error:
                    self.health[name].subscription_count += 1
```

## Adherence Checklist
Before completing your task, verify:
- [ ] WebSocket state is tracked and monitored continuously
- [ ] Message ordering and deduplication is handled
- [ ] State synchronization can recover from connection drops
- [ ] Graceful degradation falls back to REST API polling
- [ ] Connection health is monitored with automatic reconnection
- [ ] Early exit prevents processing when state is invalid
- [ ] Intentional naming for all WebSocket operations

## Common Mistakes to Avoid

1. **Assuming Message Order**: Not handling out-of-order WebSocket messages
2. **No State Recovery**: Not having a way to recover state after connection drops
3. **Ignoring Duplicates**: Not deduplicating messages
4. **No Backpressure**: Not handling when message rate exceeds processing capacity
5. **No Health Monitoring**: Not monitoring WebSocket connection health

## References

- WebSocket Best Practices - IETF RFC 6455
- Real-Time Data Handling - Binance API Docs
- Orderbook Synchronization - Kraken API Documentation
- WebSockets vs REST - Coinbase Pro API Guide

## Base Directory
file:///home/paulpas/git/ideas/trading_bot/skills/exchange-integration
