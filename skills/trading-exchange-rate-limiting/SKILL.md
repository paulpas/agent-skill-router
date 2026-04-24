---
name: trading-exchange-rate-limiting
description: Rate Limiting Strategies and Circuit Breaker Patterns for Exchange API
  Integration
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: breaker, circuit, exchange rate limiting, exchange-rate-limiting, strategies
  related-skills: trading-exchange-order-book-sync, trading-exchange-order-execution-api
    trading-technical-cycle-analysis, trading-technical-false-signal-filtering
---

**Role:** Backend System Architect — designs robust API integration patterns that respect exchange rate limits while maximizing throughput and resilience.

**Philosophy:** Intelligent Throttling — rate limiting should be proactive and adaptive, preventing disruptions before they occur while maintaining optimal execution speed through predictive capacity management.

## Key Principles

1. **Token Bucket Algorithm**: Implement token bucket rate limiting with configurable refill rates and burst capacity for handling temporary spikes.

2. **Sliding Window Tracking**: Use sliding window counters for precise rate limiting that adapts to recent activity patterns.

3. **Per-Endpoint Granularity**: Apply different rate limits to different endpoints based on their impact and exchange-specific requirements.

4. **Circuit Breaker Patterns**: Implement circuit breakers that trip when failures exceed thresholds, preventing cascading failures and allowing recovery.

5. **Backpressure Handling**: Design for graceful degradation when rate limits are exceeded, queueing requests rather than dropping them.

## Implementation Guidelines

### Structure
- Core logic: `skills/exchange-integration/rate_limiter.py`
- Circuit breaker: `skills/exchange-integration/circuit_breaker.py`
- Tests: `skills/tests/test_rate_limiting.py`

### Patterns to Follow
- Use asyncio locks for thread-safe rate limiting in concurrent environments
- Implement rate limiters as stateful classes with clean interfaces
- Separate rate limit tracking from request execution
- Use exponential backoff with jitter for retry delays

## Code Examples

### Token Bucket Algorithm

```python
import asyncio
import time
from dataclasses import dataclass
from typing import Optional
import threading


@dataclass
class TokenBucketConfig:
    """Configuration for token bucket."""
    rate: float  # Tokens per second
    capacity: float  # Maximum tokens (burst capacity)
    initial_tokens: Optional[float] = None
    
    def __post_init__(self):
        if self.initial_tokens is None:
            self.initial_tokens = self.capacity


class TokenBucket:
    """
    Thread-safe token bucket rate limiter.
    
    Tokens are consumed on each request and refill at a constant rate.
    When no tokens are available, requests must wait.
    """
    
    def __init__(self, config: TokenBucketConfig):
        self.config = config
        self.tokens = config.initial_tokens
        self.last_update = time.monotonic()
        self.lock = threading.Lock()
    
    def _refill_tokens(self):
        """Refill tokens based on elapsed time."""
        now = time.monotonic()
        elapsed = now - self.last_update
        tokens_to_add = elapsed * self.config.rate
        self.tokens = min(self.config.capacity, self.tokens + tokens_to_add)
        self.last_update = now
    
    def consume(self, tokens: float = 1.0) -> bool:
        """
        Attempt to consume tokens.
        
        Returns True if tokens were consumed, False otherwise.
        """
        with self.lock:
            self._refill_tokens()
            
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False
    
    async def consume_async(self, tokens: float = 1.0) -> bool:
        """Async version that waits for tokens if none available."""
        with self.lock:
            self._refill_tokens()
            
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            
            # Calculate wait time
            tokens_needed = tokens - self.tokens
            wait_time = tokens_needed / self.config.rate
            
            return wait_time
    
    async def wait_and_consume(self, tokens: float = 1.0) -> float:
        """
        Wait for tokens to become available and consume them.
        
        Returns actual wait time in seconds.
        """
        start_time = time.monotonic()
        
        while True:
            with self.lock:
                self._refill_tokens()
                
                if self.tokens >= tokens:
                    self.tokens -= tokens
                    break
                
                tokens_needed = tokens - self.tokens
                wait_time = tokens_needed / self.config.rate
            
            # Wait for calculated time plus small jitter
            await asyncio.sleep(wait_time * 0.9 + wait_time * 0.2 * (hash(time.monotonic()) % 100) / 100)
        
        return time.monotonic() - start_time
    
    def get_available_tokens(self) -> float:
        """Get current token count (after refill)."""
        with self.lock:
            self._refill_tokens()
            return self.tokens
    
    def get_wait_time(self, tokens: float = 1.0) -> float:
        """Get estimated wait time for given tokens."""
        with self.lock:
            self._refill_tokens()
            
            if self.tokens >= tokens:
                return 0.0
            
            tokens_needed = tokens - self.tokens
            return tokens_needed / self.config.rate


class AdaptiveTokenBucket(TokenBucket):
    """
    Token bucket with adaptive rate adjustment based on performance feedback.
    
    Increases rate when consecutive successful requests occur.
    Decreases rate when rate limit errors are encountered.
    """
    
    def __init__(self, 
                 config: TokenBucketConfig,
                 min_rate: float = None,
                 max_rate: float = None,
                 adjustment_factor: float = 1.2):
        super().__init__(config)
        self.min_rate = min_rate or (config.rate * 0.5)
        self.max_rate = max_rate or (config.rate * 2.0)
        self.adjustment_factor = adjustment_factor
        self.success_streak = 0
        self.failure_streak = 0
    
    def on_success(self):
        """Called after successful request."""
        self.success_streak += 1
        self.failure_streak = 0
        
        # Gradually increase rate after success streak
        if self.success_streak >= 10:
            new_rate = self.config.rate * self.adjustment_factor
            if new_rate <= self.max_rate:
                self.config.rate = new_rate
                self.success_streak = 0
    
    def on_failure(self):
        """Called after rate limit error or failure."""
        self.failure_streak += 1
        self.success_streak = 0
        
        # Reduce rate after failures
        if self.failure_streak >= 3:
            new_rate = self.config.rate / self.adjustment_factor
            if new_rate >= self.min_rate:
                self.config.rate = new_rate
                self.failure_streak = 0
    
    def get_stats(self) -> dict:
        """Get current bucket statistics."""
        return {
            'tokens': self.get_available_tokens(),
            'rate': self.config.rate,
            'success_streak': self.success_streak,
            'failure_streak': self.failure_streak
        }


class SlidingWindowCounter:
    """
    Sliding window rate limiter for precise limiting.
    
    Counts requests in a sliding time window rather than fixed intervals.
    More accurate than fixed window for bursty traffic patterns.
    """
    
    def __init__(self, window_seconds: float, max_requests: int):
        self.window = window_seconds
        self.max_requests = max_requests
        self.requests = []
        self.lock = threading.Lock()
    
    def _cleanup_old_requests(self):
        """Remove requests outside the current window."""
        now = time.monotonic()
        cutoff = now - self.window
        self.requests = [t for t in self.requests if t > cutoff]
    
    def is_allowed(self) -> bool:
        """Check if request is allowed without recording it."""
        with self.lock:
            self._cleanup_old_requests()
            return len(self.requests) < self.max_requests
    
    def record_request(self) -> bool:
        """Record a request and check if it was allowed."""
        with self.lock:
            self._cleanup_old_requests()
            
            if len(self.requests) >= self.max_requests:
                return False
            
            self.requests.append(time.monotonic())
            return True
    
    def get_request_count(self) -> int:
        """Get current request count in window."""
        with self.lock:
            self._cleanup_old_requests()
            return len(self.requests)
    
    def get_wait_time(self) -> float:
        """Get time until next request would be allowed."""
        with self.lock:
            self._cleanup_old_requests()
            
            if len(self.requests) < self.max_requests:
                return 0.0
            
            # Find oldest request and calculate when it expires
            oldest = min(self.requests)
            return (oldest + self.window) - time.monotonic()


class HybridRateLimiter:
    """
    Hybrid rate limiter combining token bucket and sliding window.
    
    Token bucket for burst handling, sliding window for hard limits.
    """
    
    def __init__(self, 
                 burst_config: TokenBucketConfig,
                 window_config: dict):
        self.token_bucket = AdaptiveTokenBucket(burst_config)
        self.sliding_window = SlidingWindowCounter(
            window_config['seconds'],
            window_config['max_requests']
        )
    
    def is_allowed(self) -> bool:
        """Check if request is allowed."""
        return (self.token_bucket.consume() and 
                self.sliding_window.is_allowed())
    
    async def wait_and_execute(self) -> float:
        """Wait for both limiters and return total wait time."""
        # Wait for token bucket first
        bucket_wait = await self.token_bucket.wait_and_consume()
        
        # Check sliding window
        if self.sliding_window.is_allowed():
            self.sliding_window.record_request()
            return bucket_wait
        
        # Need to wait for sliding window too
        window_wait = self.sliding_window.get_wait_time()
        await asyncio.sleep(window_wait)
        
        self.sliding_window.record_request()
        return bucket_wait + window_wait
    
    def get_stats(self) -> dict:
        """Get combined statistics."""
        return {
            'bucket': self.token_bucket.get_stats(),
            'window': {
                'requests': self.sliding_window.get_request_count(),
                'window_seconds': self.sliding_window.window,
                'max_requests': self.sliding_window.max_requests
            }
        }
```

### Per-Endpoint Rate Limits

```python
from dataclasses import dataclass, field
from typing import Dict, Optional
from enum import Enum
import threading


class EndpointType(Enum):
    """Types of exchange endpoints."""
    AUTH = "auth"  # Authentication/authorization
    MARKET = "market"  # Public market data
    ORDER = "order"  # Order placement/cancellation
    ACCOUNT = "account"  # Account information
    HISTORY = "history"  # Trade/candle history


@dataclass
class EndpointRateLimit:
    """Rate limit configuration for a single endpoint."""
    endpoint_type: EndpointType
    rate: float  # Requests per second
    burst_capacity: float
    weight: float = 1.0  # Relative weight (higher = more expensive)
    hard_limit: Optional[int] = None  # Maximum requests per period


class EndpointRateLimiter:
    """
    Manages rate limits per endpoint type.
    Allows prioritizing critical endpoints while limiting others.
    """
    
    def __init__(self, limits: Dict[EndpointType, EndpointRateLimit]):
        self.limits = limits
        self.buckets: Dict[EndpointType, TokenBucket] = {}
        self.lock = threading.Lock()
        
        # Initialize buckets for each endpoint
        for endpoint_type, config in limits.items():
            bucket_config = TokenBucketConfig(
                rate=config.rate,
                capacity=config.burst_capacity
            )
            self.buckets[endpoint_type] = TokenBucket(bucket_config)
    
    def consume(self, endpoint_type: EndpointType, weight: float = 1.0) -> bool:
        """Consume tokens for an endpoint."""
        with self.lock:
            bucket = self.buckets.get(endpoint_type)
            if bucket is None:
                raise ValueError(f"No rate limit configured for {endpoint_type}")
            
            # Scale tokens by weight
            tokens_needed = weight * (1.0 / bucket_config.rate) if bucket_config else 1.0
            return bucket.consume(tokens_needed)
    
    async def wait_for_endpoint(self, 
                                 endpoint_type: EndpointType,
                                 weight: float = 1.0) -> float:
        """Wait for tokens for specific endpoint."""
        with self.lock:
            bucket = self.buckets.get(endpoint_type)
            if bucket is None:
                raise ValueError(f"No rate limit configured for {endpoint_type}")
            
            tokens_needed = weight * (1.0 / bucket.config.rate) if bucket.config else 1.0
            return await bucket.wait_and_consume(tokens_needed)
    
    def is_endpoint_allowed(self, endpoint_type: EndpointType) -> bool:
        """Check if endpoint is currently allowed."""
        with self.lock:
            bucket = self.buckets.get(endpoint_type)
            if bucket is None:
                return True  # No limit means no restriction
            return bucket.consume(0)  # Check without consuming


class GlobalRateLimiter:
    """
    Global rate limiter that applies across all endpoints.
    Prevents exceeding overall exchange quota.
    """
    
    def __init__(self, 
                 global_rate: float,
                 global_burst: float,
                 endpoint_limits: Dict[EndpointType, EndpointRateLimit]):
        self.global_bucket = AdaptiveTokenBucket(
            TokenBucketConfig(rate=global_rate, capacity=global_burst)
        )
        self.endpoint_limiter = EndpointRateLimiter(endpoint_limits)
    
    def consume(self, endpoint_type: EndpointType, weight: float = 1.0) -> bool:
        """Consume from both global and endpoint-specific limits."""
        # Check global limit first
        if not self.global_bucket.consume(weight * 0.1):  # 10% of weight for global
            return False
        
        # Check endpoint-specific
        return self.endpoint_limiter.consume(endpoint_type, weight)
    
    async def wait_and_execute(self, 
                                endpoint_type: EndpointType,
                                weight: float = 1.0) -> float:
        """Wait for both limits and execute."""
        global_wait = await self.global_bucket.wait_and_consume(weight * 0.1)
        endpoint_wait = await self.endpoint_limiter.wait_for_endpoint(endpoint_type, weight)
        return global_wait + endpoint_wait


class PriorityRateLimiter:
    """
    Rate limiter with priority support.
    Higher priority endpoints can preempt lower priority ones.
    """
    
    def __init__(self, 
                 rates: Dict[str, float],
                 priorities: Dict[str, int]):
        """
        Initialize with rate and priority for each endpoint type.
        
        Args:
            rates: Endpoint type -> requests per second
            priorities: Endpoint type -> priority (higher = more important)
        """
        self.buckets: Dict[str, AdaptiveTokenBucket] = {}
        self.priorities = priorities
        
        for endpoint_type, rate in rates.items():
            config = TokenBucketConfig(rate=rate, capacity=rate * 2)
            self.buckets[endpoint_type] = AdaptiveTokenBucket(config)
    
    def consume(self, endpoint_type: str, priority_override: int = None) -> bool:
        """Consume tokens with optional priority override."""
        bucket = self.buckets.get(endpoint_type)
        if bucket is None:
            return False
        
        # If priority is high enough, we can use more tokens
        current_priority = priority_override or self.priorities.get(endpoint_type, 0)
        
        if current_priority >= 10:  # High priority
            return bucket.consume(1.5)  # Use 50% more tokens
        
        return bucket.consume(1.0)
    
    def get_endpoint_priority(self, endpoint_type: str) -> int:
        """Get priority level for endpoint."""
        return self.priorities.get(endpoint_type, 0)
    
    def can_priority_preempt(self, high_priority: str, low_priority: str) -> bool:
        """Check if high priority can preempt low priority."""
        high_prio = self.priorities.get(high_priority, 0)
        low_prio = self.priorities.get(low_priority, 0)
        return high_prio > low_prio + 5  # Need 5 point advantage
```

### Circuit Breaker Patterns

```python
from dataclasses import dataclass
from typing import Callable, Optional
from enum import Enum
import time
import threading


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing recovery


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5  # Failures to open circuit
    success_threshold: int = 3  # Successes to close circuit
    timeout_seconds: float = 30.0  # Time to wait before half-open
    half_open_max_calls: int = 3  # Max calls in half-open state


class CircuitBreaker:
    """
    Circuit breaker pattern implementation.
    
    Protects against cascading failures by stopping requests to failing services.
    """
    
    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[float] = None
        self.lock = threading.Lock()
    
    def _should_attempt_request(self) -> bool:
        """Check if request should be attempted based on circuit state."""
        if self.state == CircuitState.CLOSED:
            return True
        
        if self.state == CircuitState.OPEN:
            # Check if timeout has passed
            if self.last_failure_time is None:
                return False
            
            elapsed = time.monotonic() - self.last_failure_time
            if elapsed >= self.config.timeout_seconds:
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
                return True
            
            return False
        
        # HALF_OPEN state
        return True
    
    def record_success(self):
        """Record a successful request."""
        with self.lock:
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                if self.success_count >= self.config.success_threshold:
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
                    self.success_count = 0
            elif self.state == CircuitState.CLOSED:
                self.failure_count = 0  # Reset on success
    
    def record_failure(self):
        """Record a failed request."""
        with self.lock:
            self.failure_count += 1
            self.last_failure_time = time.monotonic()
            
            if self.state == CircuitState.HALF_OPEN:
                # Any failure in half-open goes back to open
                self.state = CircuitState.OPEN
                self.success_count = 0
            elif self.state == CircuitState.CLOSED:
                if self.failure_count >= self.config.failure_threshold:
                    self.state = CircuitState.OPEN
    
    def execute(self, func: Callable, *args, **kwargs):
        """
        Execute function with circuit breaker protection.
        
        Raises CircuitBreakerOpen if circuit is open.
        """
        if not self._should_attempt_request():
            raise CircuitBreakerOpen(
                f"Circuit is {self.state.value}, last failure: {self.last_failure_time}"
            )
        
        try:
            result = func(*args, **kwargs)
            self.record_success()
            return result
        except Exception as e:
            self.record_failure()
            raise


class CircuitBreakerOpen(Exception):
    """Exception raised when circuit breaker is open."""
    pass


class RateLimitedCircuitBreaker(CircuitBreaker):
    """
    Circuit breaker with rate limiting for recovery attempts.
    
    Prevents flood of recovery requests when circuit opens.
    """
    
    def __init__(self, 
                 breaker_config: CircuitBreakerConfig,
                 rate_limit_config: dict = None):
        super().__init__(breaker_config)
        
        if rate_limit_config is None:
            rate_limit_config = {
                'rate': 0.1,  # 1 request per 10 seconds
                'burst': 1
            }
        
        from .rate_limiter import TokenBucketConfig, TokenBucket
        
        self.recovery_limiter = TokenBucket(
            TokenBucketConfig(
                rate=rate_limit_config['rate'],
                capacity=rate_limit_config['burst']
            )
        )
    
    def _should_attempt_request(self) -> bool:
        """Check if request should be attempted with rate limiting."""
        # First check circuit state
        if not super()._should_attempt_request():
            return False
        
        # Then check recovery rate limit
        return self.recovery_limiter.consume()
    
    async def execute_with_rate_limit(self, func: Callable, *args, **kwargs):
        """Execute with rate limiting during recovery."""
        if not self._should_attempt_request():
            raise CircuitBreakerOpen(f"Circuit is {self.state.value}")
        
        # Wait for rate limiter if needed
        from .rate_limiter import AdaptiveTokenBucket
        
        if isinstance(self.recovery_limiter, AdaptiveTokenBucket):
            wait_time = await self.recovery_limiter.wait_and_consume()
            if wait_time > 0:
                import asyncio
                await asyncio.sleep(wait_time)
        
        try:
            result = func(*args, **kwargs)
            self.record_success()
            return result
        except Exception as e:
            self.record_failure()
            raise


class CompositeCircuitBreaker:
    """
    Circuit breaker for multiple dependent services.
    
    Opens circuit if any dependent service fails.
    """
    
    def __init__(self, services: list):
        self.services = {s: CircuitBreaker(CircuitBreakerConfig()) for s in services}
        self.main_breaker = CircuitBreaker(CircuitBreakerConfig())
    
    def get_breaker(self, service: str) -> CircuitBreaker:
        """Get circuit breaker for specific service."""
        return self.services.get(service)
    
    def on_service_failure(self, service: str):
        """Record failure for specific service."""
        breaker = self.services.get(service)
        if breaker:
            breaker.record_failure()
        
        # Propagate to main breaker
        self.main_breaker.record_failure()
    
    def on_service_success(self, service: str):
        """Record success for specific service."""
        breaker = self.services.get(service)
        if breaker:
            breaker.record_success()
        
        # Check if all services are healthy
        all_healthy = all(
            b.state == CircuitState.CLOSED for b in self.services.values()
        )
        
        if all_healthy:
            self.main_breaker.record_success()
```

## Adherence Checklist

Before completing your task, verify:
- [ ] **Guard Clauses**: All rate limiters check for zero/negative values; all circuit breakers validate configuration
- [ ] **Parsed State**: Rate limit configurations parsed into structured types before initialization
- [ ] **Atomic Predictability**: Rate limiting logic is deterministic; only timing of waits involves delay
- [ ] **Fail Fast**: Invalid rate limit configuration throws descriptive error immediately
- [ ] **Intentional Naming**: Classes use clear names (`TokenBucket`, `SlidingWindowCounter`, `CircuitBreaker`)

## Common Mistakes to Avoid

1. **Using Fixed Time Windows**: Fixed window rate limiting allows burst at window boundaries. Sliding window or token bucket is preferred.

2. **Not Handling Burst Traffic**: Rate limits should allow for temporary bursts (token bucket capacity) to handle legitimate traffic spikes.

3. **Circuit Breaker Too Sensitive**: Too few failures before opening circuit causes unnecessary outages. Too many allows cascading failures.

4. **Not Backing Off Properly**: When rate limited, exponential backoff with jitter prevents thundering herd problems.

5. **Ignoring Per-Endpoint Limits**: Different endpoints have different limits. Treating all endpoints equally can cause some to fail while others have capacity.

## References

1. Netflix: Circuit Breaker Pattern (2012). Original paper on circuit breaker implementation.
2. Hohpe, G. (2008). "Enterprise Integration Patterns".Addison-Wesley.
3. AWS: Rate Limiting Best Practices (2026). Cloud-specific guidelines.
4. GitHub API Rate Limiting Documentation (2026). Real-world implementation examples.


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.