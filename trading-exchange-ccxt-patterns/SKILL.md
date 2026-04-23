---
name: trading-exchange-ccxt-patterns
description: Effective patterns for using CCXT library for exchange connectivity including error handling, rate limiting, and state management
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: exchange ccxt patterns, exchange-ccxt-patterns, effective, library, connectivity
---

**Role:** Guide an AI coding assistant to build robust exchange integrations using CCXT with proper error handling, state management, and performance optimization

**Philosophy:** CCXT is powerful but requires careful handling. Exchange APIs are the boundary between your system and the real market - they fail, they rate limit, they return inconsistent data. Systems must treat exchange data as untrusted and implement comprehensive error handling, rate limiting, and retry logic while maintaining clean separation between CCXT and trading logic.

## Key Principles

1. **Error as Data**: Exchange errors are not exceptions to handle, they are data to process. Systems should handle all error cases gracefully and return structured error information.

2. **Rate Limiting is Non-Negotiable**: Rate limits are hard constraints, not suggestions. Systems must implement proper rate limiting before any exchange interaction.

3. **Stateful Connections**: WebSocket connections maintain state. Systems must track connection state and implement automatic reconnection with exponential backoff.

4. **Exchange Abstraction**: Never expose CCXT directly to trading logic. Create a clean abstraction layer that handles CCXT-specific quirks.

5. **Graceful Degradation**: When an exchange is unavailable, the system should continue operating with reduced functionality or switch to backup exchanges.

## Implementation Guidelines

### Structure
- Core logic: `exchange_integration/ccxt_wrapper.py`
- Error handling: `exchange_integration/errors.py`
- State management: `exchange_integration/state.py`
- Utilities: `exchange_integration/utils.py`

### Patterns to Follow
- **Early Exit**: Reject operations when exchange state is invalid
- **Atomic Predictability**: Exchange operations return consistent structures
- **Fail Fast**: Halt when critical exchange data is unavailable
- **Intentional Naming**: Clear names that distinguish CCXT calls from trading logic
- **Parse Don't Validate**: Exchange data parsed at boundaries, validated internally

## Code Examples

```python
# Example 1: CCXT Wrapper with Error Handling
import ccxt
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional
import asyncio
import time


class ExchangeErrorType(Enum):
    RATE_LIMIT = "rate_limit"
    AUTHENTICATION = "authentication"
    NETWORK = "network"
    INVALID_PARAMS = "invalid_params"
    SERVER_ERROR = "server_error"
    UNKNOWN = "unknown"


@dataclass
class ExchangeError:
    """Structured exchange error"""
    error_type: ExchangeErrorType
    message: str
    exchange_id: str
    timestamp: datetime
    retryable: bool
    http_status: Optional[int] = None
    ccxt_code: Optional[str] = None
    
    @property
    def is_transient(self) -> bool:
        """Is this error transient and worth retrying?"""
        return self.retryable and self.error_type in [
            ExchangeErrorType.NETWORK,
            ExchangeErrorType.RATE_LIMIT,
            ExchangeErrorType.SERVER_ERROR
        ]


class ExchangeWrapper:
    """Wrapper around CCXT with enhanced error handling and state management"""
    
    def __init__(self, exchange_id: str, config: dict = None):
        self.exchange_id = exchange_id
        self.config = config or {}
        
        # Initialize CCXT exchange
        exchange_class = getattr(ccxt, exchange_id)
        self.exchange = exchange_class(self._build_ccxt_config())
        
        # State tracking
        self.state = ExchangeState()
        self.last_rate_limit_reset = 0
        self.rate_limit_remaining = 0
        
        # Custom headers for some exchanges
        self._setup_custom_headers()
    
    def _build_ccxt_config(self) -> dict:
        """Build CCXT configuration from custom config"""
        ccxt_config = {
            'enableRateLimit': True,
            'timeout': self.config.get('timeout', 30000),
            'options': self.config.get('ccxt_options', {})
        }
        
        # Add credentials if available
        if 'api_key' in self.config:
            ccxt_config['apiKey'] = self.config['api_key']
        if 'secret' in self.config:
            ccxt_config['secret'] = self.config['secret']
        if 'password' in self.config:
            ccxt_config['password'] = self.config['password']
        if 'uid' in self.config:
            ccxt_config['uid'] = self.config['uid']
        
        return ccxt_config
    
    def _setup_custom_headers(self):
        """Setup exchange-specific custom headers"""
        # Some exchanges require custom headers
        custom_headers = self.config.get('custom_headers', {})
        if custom_headers:
            self.exchange.headers = custom_headers
    
    def _parse_error(self, error: Exception, operation: str) -> ExchangeError:
        """Parse CCXT exception into structured error"""
        error_str = str(error)
        
        # Check for known error patterns
        if 'rate' in error_str.lower() or 'rateLimit' in error_str.lower():
            return ExchangeError(
                error_type=ExchangeErrorType.RATE_LIMIT,
                message=f"Rate limit exceeded: {error_str}",
                exchange_id=self.exchange_id,
                timestamp=datetime.now(),
                retryable=True
            )
        
        if 'auth' in error_str.lower() or 'invalid' in error_str.lower():
            return ExchangeError(
                error_type=ExchangeErrorType.AUTHENTICATION,
                message=f"Authentication error: {error_str}",
                exchange_id=self.exchange_id,
                timestamp=datetime.now(),
                retryable=False
            )
        
        if 'network' in error_str.lower() or 'connection' in error_str.lower():
            return ExchangeError(
                error_type=ExchangeErrorType.NETWORK,
                message=f"Network error: {error_str}",
                exchange_id=self.exchange_id,
                timestamp=datetime.now(),
                retryable=True
            )
        
        # Check CCXT-specific error codes
        if hasattr(error, 'code'):
            ccxt_code = getattr(error, 'code', '')
            if ccxt_code:
                return ExchangeError(
                    error_type=ExchangeErrorType.UNKNOWN,
                    message=f"CCXT error: {error_str}",
                    exchange_id=self.exchange_id,
                    timestamp=datetime.now(),
                    retryable=False,
                    ccxt_code=ccxt_code
                )
        
        return ExchangeError(
            error_type=ExchangeErrorType.UNKNOWN,
            message=f"Unknown error: {error_str}",
            exchange_id=self.exchange_id,
            timestamp=datetime.now(),
            retryable=False
        )
    
    async def safe_call(self, operation: str, *args, **kwargs) -> dict:
        """
        Safe wrapper for CCXT operations with error handling and retry logic
        
        Usage:
            result = await wrapper.safe_call('fetch_ticker', 'BTC/USDT')
        """
        max_retries = self.config.get('max_retries', 3)
        retry_delay = self.config.get('retry_delay', 1.0)
        
        for attempt in range(max_retries + 1):
            try:
                # Check rate limit before call
                if not self._check_rate_limit():
                    await self._wait_for_rate_limit_reset()
                
                # Execute the operation
                method = getattr(self.exchange, operation)
                result = await method(*args, **kwargs)
                
                # Update state after successful call
                self._update_state_after_success()
                
                return result
                
            except Exception as error:
                exchange_error = self._parse_error(error, operation)
                
                if not exchange_error.is_transient:
                    # Don't retry non-transient errors
                    return {'error': exchange_error}
                
                if attempt == max_retries:
                    # Final attempt failed, return error
                    return {'error': exchange_error}
                
                # Wait before retry
                await asyncio.sleep(retry_delay * (attempt + 1))  # Exponential backoff
    
    def _check_rate_limit(self) -> bool:
        """Check if rate limit allows operation"""
        # CCXT has built-in rate limiting, but we track additional metrics
        now = time.time()
        
        if now < self.last_rate_limit_reset + self.exchange.rateLimit / 1000:
            return False
        
        return True
    
    def _wait_for_rate_limit_reset(self):
        """Wait for rate limit to reset"""
        # Use CCXT's built-in rate limiting
        time.sleep(self.exchange.rateLimit / 1000)
    
    def _update_state_after_success(self):
        """Update exchange state after successful operation"""
        self.state.successes += 1
        self.state.failures = 0
        self.state.last_success = datetime.now()
    
    # --- Convenience Methods ---
    async def fetch_ticker(self, symbol: str) -> dict:
        """Fetch ticker with structured return"""
        result = await self.safe_call('fetch_ticker', symbol)
        
        if 'error' in result:
            return {'error': result['error']}
        
        return {
            'symbol': result.get('symbol', symbol),
            'price': result.get('last'),
            'bid': result.get('bid'),
            'ask': result.get('ask'),
            'volume': result.get('baseVolume'),
            'timestamp': result.get('timestamp'),
            'success': True
        }
    
    async def fetch_balance(self) -> dict:
        """Fetch account balance with structured return"""
        result = await self.safe_call('fetch_balance')
        
        if 'error' in result:
            return {'error': result['error']}
        
        # Parse balance
        balance = {
            'total': {},
            'free': {},
            'used': {},
            'success': True
        }
        
        for currency, amounts in result.get('total', {}).items():
            balance['total'][currency] = amounts
            balance['free'][currency] = result.get('free', {}).get(currency, 0)
            balance['used'][currency] = result.get('used', {}).get(currency, 0)
        
        return balance
    
    async def create_order(
        self,
        symbol: str,
        type: str,
        side: str,
        amount: float,
        price: float = None
    ) -> dict:
        """Create order with structured return"""
        params = {}
        
        if type == 'limit' and price:
            params['price'] = price
        
        result = await self.safe_call('create_order', symbol, type, side, amount, price, params)
        
        if 'error' in result:
            return {'error': result['error']}
        
        return {
            'id': result.get('id'),
            'status': result.get('status'),
            'symbol': result.get('symbol'),
            'type': result.get('type'),
            'side': result.get('side'),
            'amount': result.get('amount'),
            'filled': result.get('filled'),
            'remaining': result.get('remaining'),
            'price': result.get('price'),
            'success': True
        }
    
    async def fetch_open_orders(self, symbol: str = None) -> list:
        """Fetch open orders with structured return"""
        result = await self.safe_call('fetch_open_orders', symbol)
        
        if 'error' in result:
            return {'error': result['error']}
        
        orders = []
        for order in result:
            orders.append({
                'id': order.get('id'),
                'symbol': order.get('symbol'),
                'type': order.get('type'),
                'side': order.get('side'),
                'amount': order.get('amount'),
                'filled': order.get('filled'),
                'remaining': order.get('remaining'),
                'price': order.get('price'),
                'timestamp': order.get('timestamp'),
                'status': order.get('status')
            })
        
        return orders
    
    async def fetch_markets(self) -> dict:
        """Fetch exchange markets with structured return"""
        result = await self.safe_call('fetch_markets')
        
        if 'error' in result:
            return {'error': result['error']}
        
        markets = {}
        for market in result:
            markets[market['symbol']] = {
                'id': market['id'],
                'symbol': market['symbol'],
                'base': market['base'],
                'quote': market['quote'],
                'precision': market.get('precision', {}),
                'limits': market.get('limits', {}),
                'active': market.get('active', True),
                'taker': market.get('taker', 0),
                'maker': market.get('maker', 0)
            }
        
        return markets


# Example 2: Exchange State Management
class ExchangeState:
    """Tracks exchange connection state and performance metrics"""
    
    def __init__(self):
        self.is_connected = False
        self.successes = 0
        self.failures = 0
        self.last_success: datetime = None
        self.last_failure: datetime = None
        self.connection_attempts = 0
        self.websocket_connected = False
        self.websocket_message_count = 0
        self.websocket_errors = 0
    
    def record_success(self):
        """Record successful operation"""
        self.successes += 1
        self.last_success = datetime.now()
        self.failures = 0
    
    def record_failure(self):
        """Record failed operation"""
        self.failures += 1
        self.last_failure = datetime.now()
    
    def connection_established(self):
        """Record successful connection"""
        self.is_connected = True
        self.connection_attempts = 0
    
    def connection_lost(self):
        """Record connection loss"""
        self.is_connected = False
        self.connection_attempts += 1
    
    def get_health_score(self) -> float:
        """Calculate exchange health score (0-1)"""
        if not self.is_connected:
            return 0.0
        
        total_operations = self.successes + self.failures
        if total_operations == 0:
            return 0.5  # No data yet
        
        success_rate = self.successes / total_operations
        
        # Decay factor based on recent failures
        failure_factor = 1.0
        if self.last_failure:
            time_since_failure = (datetime.now() - self.last_failure).total_seconds()
            if time_since_failure < 60:  # Recent failure
                failure_factor = 0.5
            elif time_since_failure < 300:  # Within 5 minutes
                failure_factor = 0.75
        
        return min(success_rate * failure_factor, 1.0)
    
    def is_operational(self, min_health: float = 0.7) -> bool:
        """Is the exchange operational based on health score"""
        return self.is_connected and self.get_health_score() >= min_health


# Example 3: WebSocket Connection Handler
import websockets
import json


class WebSocketHandler:
    """Manages WebSocket connections with reconnection logic"""
    
    def __init__(self, config: dict):
        self.config = config
        self.websocket = None
        self.state = ExchangeState()
        self.subscribed_channels = set()
        self.message_handlers = {}
        self.reconnect_delay = 1.0
        self.running = False
    
    def register_handler(self, channel: str, handler):
        """Register a message handler for a channel"""
        self.message_handlers[channel] = handler
    
    async def connect(self, url: str):
        """Connect to WebSocket with reconnection logic"""
        while self.running:
            try:
                self.websocket = await websockets.connect(url)
                self.state.connection_established()
                
                # Resubscribe to channels
                for channel in self.subscribed_channels:
                    await self.subscribe(channel)
                
                # Start message processing loop
                await self._process_messages()
                
            except Exception as error:
                self.state.connection_lost()
                self.state.websocket_errors += 1
                
                # Exponential backoff
                await asyncio.sleep(self.reconnect_delay)
                self.reconnect_delay = min(self.reconnect_delay * 2, 60)
    
    async def _process_messages(self):
        """Process incoming WebSocket messages"""
        try:
            async for message in self.websocket:
                self.state.websocket_message_count += 1
                
                # Parse message
                try:
                    data = json.loads(message)
                except json.JSONDecodeError:
                    continue
                
                # Route to handlers
                await self._route_message(data)
                
        except websockets.exceptions.ConnectionClosed:
            self.state.connection_lost()
        except Exception as error:
            self.state.websocket_errors += 1
    
    async def _route_message(self, data: dict):
        """Route message to appropriate handler"""
        channel = data.get('channel')
        if channel and channel in self.message_handlers:
            await self.message_handlers[channel](data)
        else:
            # Default handler
            await self._default_handler(data)
    
    async def _default_handler(self, data: dict):
        """Default message handler"""
        # Implement default message processing
        pass
    
    async def subscribe(self, channel: str):
        """Subscribe to a WebSocket channel"""
        subscription = {
            'type': 'subscribe',
            'channel': channel
        }
        
        await self.websocket.send(json.dumps(subscription))
        self.subscribed_channels.add(channel)
    
    async def unsubscribe(self, channel: str):
        """Unsubscribe from a WebSocket channel"""
        if channel in self.subscribed_channels:
            self.subscribed_channels.remove(channel)
    
    def start(self, url: str):
        """Start WebSocket connection"""
        self.running = True
        asyncio.create_task(self.connect(url))
    
    def stop(self):
        """Stop WebSocket connection"""
        self.running = False
        if self.websocket:
            asyncio.create_task(self.websocket.close())


# Example 4: Rate Limit Controller
class RateLimitController:
    """Controls API request rate limiting"""
    
    def __init__(self, config: dict):
        self.config = config
        self.requests = []
        self.window_seconds = config.get('window_seconds', 60)
        self.max_requests = config.get('max_requests', 100)
    
    def _cleanup_old_requests(self):
        """Remove requests outside the time window"""
        cutoff = datetime.now().timestamp() - self.window_seconds
        self.requests = [r for r in self.requests if r > cutoff]
    
    async def acquire(self) -> bool:
        """
        Attempt to acquire rate limit slot
        
        Returns True if request can proceed, False if rate limited
        """
        self._cleanup_old_requests()
        
        if len(self.requests) >= self.max_requests:
            return False
        
        self.requests.append(datetime.now().timestamp())
        return True
    
    async def wait_for_slot(self):
        """Wait until a rate limit slot becomes available"""
        while not await self.acquire():
            # Calculate wait time
            if self.requests:
                oldest_request = min(self.requests)
                wait_time = (oldest_request + self.window_seconds) - datetime.now().timestamp()
                await asyncio.sleep(max(wait_time, 0.1))
            else:
                await asyncio.sleep(0.1)
    
    def get_remaining_quota(self) -> int:
        """Get remaining requests in current window"""
        self._cleanup_old_requests()
        return max(0, self.max_requests - len(self.requests))
    
    def get_quota_reset_time(self) -> float:
        """Get timestamp when quota resets"""
        if not self.requests:
            return datetime.now().timestamp()
        
        return min(self.requests) + self.window_seconds
```

## Adherence Checklist
Before completing your task, verify:
- [ ] CCXT calls are wrapped in error handling layer
- [ ] Rate limiting is implemented before all exchange calls
- [ ] State is tracked separately from CCXT instance
- [ ] WebSocket connections have automatic reconnection
- [ ] Errors are parsed into structured data, not just exceptions
- [ ] Early exit prevents operations when exchange is unavailable
- [ ] Exchange abstraction layer hides CCXT-specific quirks

## Common Mistakes to Avoid

1. **Direct CCXT Exposure**: Exposing CCXT directly to trading logic
2. **No Retry Logic**: Not implementing retry with exponential backoff
3. **Ignoring Rate Limits**: Relying on CCXT's built-in rate limiting alone
4. **Poor Error Handling**: Treating all errors as exceptions instead of data
5. **State Leaks**: Not properly managing WebSocket state and reconnections

## References

- CCXT Documentation: https://docs.ccxt.com
- CryptoExchange API Best Practices - Binance Developer Docs
- Rate Limiting Patterns - AWS Architecture Blog
- WebSocket Reconnection Strategies - PubNub Documentation

## Base Directory
file:///home/paulpas/git/ideas/trading_bot/skills/exchange-integration
