---
name: trading-execution-rate-limiting
description: Rate Limiting and Exchange API Management for Robust Trading Execution
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: execution rate limiting, execution-rate-limiting, exchange, management, robust
---

**Role:** Trading Infrastructure Engineer — designs rate limiting systems and exchange API integrations to ensure reliable, compliant, and efficient order execution without triggering account suspensions or API blacklists.

**Philosophy:** Exchange Compliance Excellence — rate limiting systems should predict, prevent, and recover from API constraints while maximizing throughput and minimizing execution delays through intelligent request scheduling and adaptive throttling.

## Key Principles

1. **Predictive Rate Limiting**: Anticipate API constraints by modeling exchange rate limits, historical usage patterns, and current account quotas to prevent hitting limits before they occur.

2. **Adaptive Throttling**: Dynamically adjust request frequency based on real-time API response codes (429, 503), latency spikes, and quota utilization to maintain optimal throughput.

3. **Request Batching and Queuing**: Group multiple API requests into efficient batches and implement sophisticated queuing systems to smooth traffic and avoid burst patterns that trigger limits.

4. **Exponential Backoff with Jitter**: Implement intelligent retry mechanisms with exponentially increasing delays and random jitter to prevent thundering herd problems and synchronize retries with rate limit resets.

5. **Graceful Degradation**: Continue partial operation during rate limiting by prioritizing critical orders, deferring non-essential requests, and maintaining execution continuity through local buffering.

## Implementation Guidelines

### Structure
- Core logic: `skills/execution-algorithms/rate_limiting.py`
- Helper functions: `skills/execution-algorithms/api_throttler.py`
- Tests: `skills/tests/test_rate_limiting.py`

### Patterns to Follow
- Use circular buffers for sliding window rate limit tracking
- Implement state machine for connection state management
- Separate rate limit prediction from request queuing
- Use async/await for non-blocking API operations
- Track request/response correlation IDs for debugging

## Code Examples

### Sliding Window Rate Limiter

```python
from dataclasses import dataclass
from typing import List, Tuple, Optional
from collections import deque
from datetime import datetime, timedelta
import threading
import time

@dataclass
class RateLimitConfig:
    """Configuration for rate limiting."""
    max_requests: int
    window_seconds: float
    burst_factor: float = 1.0
    cooldown_seconds: float = 60.0

@dataclass
class RateLimitResult:
    """Result of rate limit check."""
    allowed: bool
    wait_time_seconds: float
    quota_remaining: int
    reset_time: datetime

class SlidingWindowRateLimiter:
    """
    Track API requests using sliding window algorithm.
    More accurate than fixed window for handling burst scenarios.
    """
    
    def __init__(self, config: RateLimitConfig):
        self.config = config
        self.request_times: deque = deque()
        self.lock = threading.Lock()
    
    def _cleanup_old_requests(self, current_time: datetime):
        """Remove requests outside the current window."""
        cutoff = current_time - timedelta(seconds=self.config.window_seconds)
        while self.request_times and self.request_times[0] < cutoff:
            self.request_times.popleft()
    
    def check_rate_limit(self, current_time: datetime = None) -> RateLimitResult:
        """
        Check if request is allowed under rate limit.
        
        Returns result with permission status and wait time if limited.
        """
        if current_time is None:
            current_time = datetime.now()
        
        with self.lock:
            self._cleanup_old_requests(current_time)
            
            current_count = len(self.request_times)
            max_allowed = int(self.config.max_requests * self.config.burst_factor)
            
            if current_count < max_allowed:
                # Request allowed
                self.request_times.append(current_time)
                return RateLimitResult(
                    allowed=True,
                    wait_time_seconds=0.0,
                    quota_remaining=max_allowed - current_count - 1,
                    reset_time=current_time + timedelta(seconds=self.config.window_seconds)
                )
            
            # Calculate wait time
            oldest_in_window = self.request_times[0]
            wait_time = (oldest_in_window + timedelta(seconds=self.config.window_seconds) - current_time).total_seconds()
            
            return RateLimitResult(
                allowed=False,
                wait_time_seconds=max(0.0, wait_time),
                quota_remaining=0,
                reset_time=oldest_in_window + timedelta(seconds=self.config.window_seconds)
            )
    
    def record_request(self, timestamp: datetime = None):
        """Manually record a request (for external quota tracking)."""
        if timestamp is None:
            timestamp = datetime.now()
        
        with self.lock:
            self._cleanup_old_requests(timestamp)
            self.request_times.append(timestamp)
    
    def get_current_usage(self) -> Tuple[int, int]:
        """Get current request count and limit."""
        with self.lock:
            return len(self.request_times), int(self.config.max_requests * self.config.burst_factor)
```

### Adaptive Throttler with Backpressure

```python
from dataclasses import dataclass
from typing import List, Dict, Optional
from collections import deque
from datetime import datetime, timedelta
import time
import threading

@dataclass
class ThrottleState:
    """Current throttling state."""
    active: bool
    current_delay_ms: float
    last_adjustment: datetime
    adjustment_count: int

class AdaptiveThrottler:
    """
    Dynamically adjust request delay based on API response patterns.
    Uses backpressure detection to reduce load when errors occur.
    """
    
    def __init__(self,
                 base_delay_ms: float = 100.0,
                 min_delay_ms: float = 10.0,
                 max_delay_ms: float = 5000.0,
                 backoff_multiplier: float = 1.5,
                 recovery_multiplier: float = 0.9):
        self.base_delay = base_delay_ms
        self.min_delay = min_delay_ms
        self.max_delay = max_delay_ms
        self.backoff_mult = backoff_multiplier
        self.recovery_mult = recovery_multiplier
        
        self.current_delay = base_delay_ms
        self.request_times: deque = deque(maxlen=100)
        self.response_times: deque = deque(maxlen=100)
        self.error_counts: deque = deque(maxlen=50)
        self.lock = threading.Lock()
        
        self._state = ThrottleState(
            active=False,
            current_delay_ms=base_delay_ms,
            last_adjustment=datetime.now(),
            adjustment_count=0
        )
    
    def record_request(self, timestamp: datetime = None):
        """Record a request being sent."""
        if timestamp is None:
            timestamp = datetime.now()
        with self.lock:
            self.request_times.append(timestamp)
    
    def record_response(self, response_code: int, response_time_ms: float, 
                        timestamp: datetime = None):
        """
        Record API response for throttling adjustment.
        
        Response codes:
        - 200, 201: Success
        - 429: Rate limit exceeded
        - 503: Service unavailable
        - 500-599: Server errors
        """
        if timestamp is None:
            timestamp = datetime.now()
        
        with self.lock:
            self.response_times.append((timestamp, response_time_ms))
            
            # Track errors
            is_error = response_code in [429, 503, 500, 502, 503, 504]
            if is_error:
                self.error_counts.append(timestamp)
            
            self._adjust_delay(response_code, response_time_ms)
    
    def _adjust_delay(self, response_code: int, response_time_ms: float):
        """Adjust delay based on response patterns."""
        current = datetime.now()
        
        # Immediate backoff on rate limit errors
        if response_code == 429:
            self.current_delay = min(
                self.current_delay * self.backoff_mult,
                self.max_delay
            )
            self._state = ThrottleState(
                active=True,
                current_delay_ms=self.current_delay,
                last_adjustment=current,
                adjustment_count=self._state.adjustment_count + 1
            )
            return
        
        # Backoff on other errors
        if response_code >= 500:
            self.current_delay = min(
                self.current_delay * self.backoff_mult,
                self.max_delay
            )
            return
        
        # Recovery on success
        if response_code < 400 and self.current_delay > self.min_delay:
            # Only recover slowly if no recent errors
            recent_errors = [
                t for t in self.error_counts 
                if current - t < timedelta(seconds=30)
            ]
            if not recent_errors:
                self.current_delay = max(
                    self.current_delay * self.recovery_mult,
                    self.min_delay
                )
        
        self._state = ThrottleState(
            active=self.current_delay > self.base_delay * 1.2,
            current_delay_ms=self.current_delay,
            last_adjustment=current,
            adjustment_count=self._state.adjustment_count + 1
        )
    
    def get_delay_ms(self) -> float:
        """Get current recommended delay in milliseconds."""
        return self.current_delay
    
    def get_throttle_state(self) -> Dict:
        """Get current throttle status as dictionary."""
        with self.lock:
            # Calculate recent error rate
            current = datetime.now()
            recent_requests = len([
                t for t in self.request_times 
                if current - t < timedelta(seconds=60)
            ])
            recent_errors = len([
                t for t in self.error_counts 
                if current - t < timedelta(seconds=60)
            ])
            
            return {
                'active': self._state.active,
                'current_delay_ms': self.current_delay,
                'base_delay_ms': self.base_delay,
                'recent_requests_per_minute': recent_requests,
                'recent_error_rate': recent_errors / max(1, recent_requests),
                'avg_response_time_ms': self._calculate_avg_response_time(),
                'adjustment_count': self._state.adjustment_count
            }
    
    def _calculate_avg_response_time(self) -> float:
        """Calculate average response time from recent responses."""
        if not self.response_times:
            return 0.0
        return sum(t for _, t in self.response_times) / len(self.response_times)
```

### Exponential Backoff with Jitter

```python
from dataclasses import dataclass
from typing import Callable, Any, Optional
import random
import time
import threading

@dataclass
class BackoffConfig:
    """Configuration for exponential backoff."""
    base_delay_ms: float = 100.0
    max_delay_ms: float = 30000.0
    multiplier: float = 2.0
    max_retries: int = 5
    jitter_factor: float = 0.3

class ExponentialBackoff:
    """
    Implement exponential backoff with jitter for retry logic.
    Prevents thundering herd and synchronizes retries.
    """
    
    def __init__(self, config: BackoffConfig):
        self.config = config
        self.lock = threading.Lock()
        self.current_retry = 0
    
    def calculate_delay_ms(self, retry_count: int) -> float:
        """
        Calculate delay for given retry attempt.
        
        Returns delay in milliseconds with jitter applied.
        """
        # Base exponential delay
        base_delay = self.config.base_delay_ms * (self.config.multiplier ** retry_count)
        
        # Apply maximum
        base_delay = min(base_delay, self.config.max_delay_ms)
        
        # Apply jitter
        jitter_range = base_delay * self.config.jitter_factor
        jitter = random.uniform(-jitter_range, jitter_range)
        
        return max(0, base_delay + jitter)
    
    def calculate_delay_with_jitter(self) -> float:
        """Get delay for current retry state with jitter."""
        return self.calculate_delay_ms(self.current_retry)
    
    def reset(self):
        """Reset backoff state for new operation."""
        with self.lock:
            self.current_retry = 0
    
    def increment(self) -> bool:
        """
        Increment retry count.
        
        Returns True if retries remaining, False if max reached.
        """
        with self.lock:
            if self.current_retry >= self.config.max_retries:
                return False
            self.current_retry += 1
            return True
    
    def execute_with_backoff(self, func: Callable, *args, **kwargs) -> Optional[Any]:
        """
        Execute function with exponential backoff retry.
        
        Args:
            func: Function to execute
            *args: Positional arguments for function
            **kwargs: Keyword arguments for function
            
        Returns:
            Function result if successful, None if all retries failed
        """
        self.reset()
        
        while True:
            try:
                result = func(*args, **kwargs)
                return result  # Success
            except Exception as e:
                if not self.increment():
                    return None  # Max retries reached
                
                delay_ms = self.calculate_delay_with_jitter()
                time.sleep(delay_ms / 1000.0)  # Convert to seconds
    
    def get_retry_status(self) -> Dict:
        """Get current retry status."""
        return {
            'current_retry': self.current_retry,
            'max_retries': self.config.max_retries,
            'retry_remaining': self.config.max_retries - self.current_retry,
            'next_delay_ms': self.calculate_delay_with_jitter() if self.current_retry < self.config.max_retries else 0
        }
```

### Request Queue with Priority

```python
from dataclasses import dataclass
from typing import List, Tuple, Optional, Callable
from collections import defaultdict
from datetime import datetime
import threading
import heapq

@dataclass
class QueuedRequest:
    """A request in the queue."""
    request_id: str
    timestamp: datetime
    priority: int  # Lower = higher priority
    payload: dict
    callback: Optional[Callable] = None
    retry_count: int = 0
    max_retries: int = 3

class PriorityQueue:
    """
    Priority queue for managing API requests with rate limiting.
    Ensures high-priority requests are processed first within rate limits.
    """
    
    def __init__(self, rate_limiter):
        self.rate_limiter = rate_limiter
        self.queues: Dict[int, List] = defaultdict(list)
        self.lock = threading.Lock()
        self.request_counter = 0
        self.request_map: Dict[str, QueuedRequest] = {}
    
    def enqueue(self, payload: dict, priority: int = 0,
                callback: Callable = None) -> str:
        """
        Add request to queue.
        
        Returns request ID for tracking.
        """
        with self.lock:
            self.request_counter += 1
            request_id = f"req_{self.request_counter}_{int(datetime.now().timestamp())}"
            
            request = QueuedRequest(
                request_id=request_id,
                timestamp=datetime.now(),
                priority=priority,
                payload=payload,
                callback=callback
            )
            
            heapq.heappush(self.queues[priority], (request.timestamp, request_id, request))
            self.request_map[request_id] = request
            
            return request_id
    
    def dequeue(self) -> Optional[QueuedRequest]:
        """
        Get highest priority request that fits rate limits.
        
        Returns None if no requests available or rate limited.
        """
        with self.lock:
            if not self.queues:
                return None
            
            # Get highest priority (lowest number)
            priority = min(self.queues.keys())
            queue = self.queues[priority]
            
            if not queue:
                del self.queues[priority]
                return None
            
            # Check rate limit
            result = self.rate_limiter.check_rate_limit()
            if not result.allowed:
                return None
            
            # Pop and return request
            _, request_id, request = heapq.heappop(queue)
            del self.request_map[request_id]
            
            # Clean empty priority queue
            if not queue:
                del self.queues[priority]
            
            return request
    
    def peek(self) -> Optional[QueuedRequest]:
        """Peek at next request without removing."""
        with self.lock:
            if not self.queues:
                return None
            
            priority = min(self.queues.keys())
            queue = self.queues[priority]
            
            if not queue:
                return None
            
            return queue[0][2]
    
    def get_queue_stats(self) -> Dict:
        """Get queue statistics."""
        with self.lock:
            total = sum(len(q) for q in self.queues.values())
            by_priority = {p: len(q) for p, q in self.queues.items()}
            
            return {
                'total_queued': total,
                'by_priority': by_priority,
                'highest_priority': min(by_priority.keys()) if by_priority else None,
                'oldest_wait_seconds': self._calculate_oldest_wait()
            }
    
    def _calculate_oldest_wait(self) -> float:
        """Calculate wait time for oldest request."""
        oldest = None
        with self.lock:
            for queue in self.queues.values():
                if queue:
                    timestamp = queue[0][1].timestamp
                    if oldest is None or timestamp < oldest:
                        oldest = timestamp
        
        if oldest is None:
            return 0.0
        return (datetime.now() - oldest).total_seconds()
```

### Batch Request Optimizer

```python
from dataclasses import dataclass
from typing import List, Dict, Optional
from collections import defaultdict
from datetime import datetime

@dataclass
class BatchRequest:
    """A batch request containing multiple sub-requests."""
    batch_id: str
    requests: List[dict]
    created_at: datetime
    status: str = 'pending'  # pending, processing, completed, failed

class BatchRequestOptimizer:
    """
    Optimize request batching to maximize throughput while respecting rate limits.
    Groups compatible requests into efficient batches.
    """
    
    def __init__(self, max_batch_size: int = 100, batch_timeout_ms: int = 1000):
        self.max_batch_size = max_batch_size
        self.batch_timeout = batch_timeout_ms
        self.pending_requests: List[dict] = []
        self.pending_time: datetime = None
        self.lock = None  # Would be initialized in real implementation
    
    def add_request(self, request: dict) -> Optional[BatchRequest]:
        """
        Add request to pending batch.
        
        Returns completed batch if threshold reached, None otherwise.
        """
        if not self.pending_time:
            self.pending_time = datetime.now()
        
        self.pending_requests.append(request)
        
        # Check if batch is full
        if len(self.pending_requests) >= self.max_batch_size:
            return self._create_batch()
        
        # Check if timeout exceeded
        elapsed = (datetime.now() - self.pending_time).total_seconds() * 1000
        if elapsed >= self.batch_timeout:
            return self._create_batch()
        
        return None
    
    def _create_batch(self) -> BatchRequest:
        """Create a batch from pending requests."""
        batch = BatchRequest(
            batch_id=f"batch_{len(self.pending_requests)}_{int(datetime.now().timestamp())}",
            requests=self.pending_requests.copy(),
            created_at=self.pending_time
        )
        
        self.pending_requests = []
        self.pending_time = None
        
        return batch
    
    def group_requests_by_type(self, requests: List[dict]) -> Dict[str, List[dict]]:
        """Group requests by their type for batch optimization."""
        groups = defaultdict(list)
        for request in requests:
            request_type = request.get('type', 'unknown')
            groups[request_type].append(request)
        return dict(groups)
    
    def optimize_batch_timing(self, 
                              estimated_latency_ms: float,
                              rate_limit_per_second: int) -> Dict:
        """
        Calculate optimal batch timing based on rate limits.
        
        Returns batch scheduling information.
        """
        total_requests = len(self.pending_requests)
        if total_requests == 0:
            return {'suggestion': 'no_requests'}
        
        # Calculate how many batches needed
        batches_needed = (total_requests + self.max_batch_size - 1) // self.max_batch_size
        
        # Time between batches to stay under rate limit
        min_interval_ms = 1000 / rate_limit_per_second * self.max_batch_size
        
        return {
            'total_requests': total_requests,
            'batches_needed': batches_needed,
            'min_interval_ms': min_interval_ms,
            'estimated_total_time_ms': batches_needed * min_interval_ms,
            'current_pending': total_requests
        }
```

## Adherence Checklist

Before completing your task, verify:
- [ ] **Guard Clauses**: All rate limit checks return early with wait time when limited; all queue operations check for empty state
- [ ] **Parsed State**: API response codes parsed into structured enums/types; no raw integers in core logic
- [ ] **Atomic Predictability**: Rate limit calculations are deterministic; only jitter uses randomness
- [ ] **Fail Fast**: Invalid rate limit configuration (zero window, negative delay) throws descriptive error immediately
- [ ] **Intentional Naming**: Classes and methods use clear names like `SlidingWindowRateLimiter`, `calculate_delay_with_jitter`

## Common Mistakes to Avoid

1. **Fixed Window Artifacts**: Using fixed-time windows causes burst artifacts at window boundaries. Sliding window algorithms distribute load more evenly.

2. **No Jitter on Retries**: Synchronized retries without jitter cause thundering herd problems and prolong outages. Always add random jitter (30-50%).

3. **Over-Batching**: Batching too many requests increases latency and memory usage. Find the optimal batch size through load testing.

4. **Ignoring API Quotas**: Different API endpoints have different rate limits. Track usage per endpoint, not just per account.

5. **No Graceful Degradation**: Failing completely during rate limiting disrupts execution. Implement local buffering and priority queuing to maintain continuity.

## References

1. Google Cloud API Gateway Best Practices (2026). Rate limiting strategies and patterns.
2. Netflix Tech Blog: "Asynchronous Rate Limiting" (2025). Adaptive throttling techniques.
3. AWS SDK Retry Strategy Documentation (2026). Exponential backoff with jitter implementation.
4. Alvaro et al. (2023). "Efficient Request Batching for High-Throughput APIs". *ACM Transactions on Architecture*.


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.
