---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- config
- do-dont
description: '"Effective patterns for using CCXT library for exchange connectivity
  including" error handling, rate limiting, and state management'
license: MIT
maturity: stable
metadata:
  domain: trading
  output-format: code
  related-skills: ai-order-flow-analysis, data-alternative-data
  role: implementation
  scope: implementation
  triggers: connectivity, effective, exchange ccxt patterns, exchange-ccxt-patterns,
    library
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - no risk management
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
name: ccxt-patterns
------
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
    
    # 