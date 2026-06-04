---
name: data-stream-processing
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- config
- do-dont
description: '"Provides Streaming data processing for real-time trading signals and
  analytics"'
license: MIT
maturity: stable
metadata:
  domain: trading
  output-format: code
  related-skills: ai-order-flow-analysis, data-alternative-data
  role: implementation
  scope: implementation
  triggers: data stream processing, data-stream-processing, real-time, streaming,
    trading
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
version: "1.0.0"
---
**Role:** Process streaming data with low latency for real-time trading decisions

**Philosophy:** Real-time processing enables competitive advantage; systems must handle high throughput with predictable latency

## Key Principles

1. **Low-Latency Design**: Minimize processing delay for time-sensitive decisions
2. **Exactly-Once Semantics**: Ensure no data loss or duplication
3. **Backpressure Handling**: Manage flow when upstream exceeds downstream capacity
4. **Windowed Aggregations**: Support tumbling, sliding, and session windows
5. **State Management**: Maintain state across stream processing operations

## Implementation Guidelines

### Structure
- Core logic: stream_processing/stream_processor.py
- Window handlers: stream_processing/windows.py
- Tests: tests/test_stream_processing.py

### Patterns to Follow
- Use asyncio for concurrent stream processing
- Implement window buffers with cleanup
- Support checkpointing for recovery
- Track processing metrics

## Adherence Checklist
Before completing your task, verify:
- [ ] Processing latency is measured and alertable
- [ ] Backpressure triggers protective measures
- [ ] Window boundaries are enforced
- [ ] Exactly-once semantics are maintained
- [ ] State is persisted for recovery


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import asyncio
import time
from typing import Dict, List, Optional, Any, Callable, TypeVar, Generic
from dataclasses import dataclass, field
from collections import deque
from enum import Enum
import logging

T = TypeVar('T')
R = TypeVar('R')

class WindowType(Enum):
    TUMBLING = "tumbling"
    SLIDING = "sliding"
    SESSION = "session"

@dataclass
class WindowConfig:
    """Configuration for a window."""
    window_type: WindowType
    size_seconds: float
    slide_seconds: Optional[float] = None
    gap_seconds: Optional[float] = None  # For session windows

@dataclass
class WindowEvent(Generic[T]):
    """Event in a window."""
    data: T
    timestamp: float
    window_start: float
    window_end: float

@dataclass
class ProcessingMetrics:
    """Metrics for stream processing."""
    events_processed: int = 0
    events_per_second: float = 0.0
    avg_latency_ms: float = 0.0
    errors: int = 0
    backpressure_events: int = 0

class WindowBuffer(Generic[T]):
    """Buffer for windowed stream processing."""
    
    def __init__(self, config: WindowConfig, max_size: int = 10000):
        self.config = config
        self.max_size = max_size
        self.events: deque = deque()
        self.lock = asyncio.Lock()
    
    async def add(self, event: T, timestamp: float):
        """Add event to window buffer."""
        async with self.lock:
            # Evict old events
            self._evict_old(timestamp)
            
            # Check capacity
            if len(self.events) >= self.max_size:
                raise BufferOverflowError(f"Window buffer overflow: {len(self.events)} events")
            
            window_event = WindowEvent(
                data=event,
                timestamp=timestamp,
                window_start=self._get_window_start(timestamp),
                window_end=self._get_window_end(timestamp)
            )
            
            self.events.append(window_event)
    
    def _get_window_start(self, timestamp: float) -> float:
        """Calculate window start time."""
        if self.config.window_type == WindowType.TUMBLING:
            return timestamp - (timestamp % self.config.size_seconds)
        elif self.config.window_type == WindowType.SLIDING:
            return timestamp - self.config.size_seconds
        return timestamp - self.config.size_seconds
    
    def _get_window_end(self, timestamp: float) -> float:
        """Calculate window end time."""
        return self._get_window_start(timestamp) + self.config.size_seconds
    
    def _evict_old(self, current_time: float):
        """Remove events outside current window."""
        cutoff = current_time - (self.config.size_seconds * 1.5)
        while self.events and self.events[0].timestamp < cutoff:
            self.events.popleft()
    
    async def get_events(self) -> List[WindowEvent[T]]:
        """Get events in current window."""
        async with self.lock:
            return list(self.events)
    
    async def clear(self):
        """Clear all events."""
        async with self.lock:
            self.events.clear()
    
    def size(self) -> int:
        """Get buffer size."""
        return len(self.events)

class BufferOverflowError(Exception):
    """Raised when buffer overflows."""
    pass

class StreamProcessor(Generic[T, R]):
    """Processes streaming data with configurable windows."""
    
    def __init__(
        self,
        window_config: WindowConfig,
        process_func: Callable[[T], R],
        callback: Optional[Callable[[R], Any]] = None
    ):
        self.window_config = window_config
        self.process_func = process_func
        self.callback = callback
        self.buffer: WindowBuffer[T] = WindowBuffer(window_config)
        self.metrics = ProcessingMetrics()
        self._last_metric_update = time.time()
        self._latencies: deque = deque(maxlen=1000)
    
    async def process_event(self, event: T) -> Optional[R]:
        """Process a single event."""
        start_time = time.time()
        
        try:
            await self.buffer.add(event, time.time())
            
            # Process if window is ready
            result = await self._process_window()
            
            if result and self.callback:
                await self.callback(result)
            
            # Track latency
            latency = time.time() - start_time
            self._latencies.append(latency)
            self.metrics.events_processed += 1
            
            return result
            
        except BufferOverflowError as e:
            self.metrics.backpressure_events += 1
            logging.warning(f"Backpressure: {e}")
            return None
    
    async def _process_window(self) -> Optional[R]:
        """Process events in current window."""
        events = await self.buffer.get_events()
        
        if not events:
            return None
        
        # Get latest window end time
        window_end = max(e.window_end for e in events)
        
        # Process events in current window
        current_window_events = [
            e for e in events 
            if e.window_start <= time.time() <= e.window_end
        ]
        
        if not current_window_events:
            return None
        
        # Apply processing function
        processed = [self.process_func(e.data) for e in current_window_events]
        
        # Return aggregated result (simplified)
        if processed:
            return processed[-1]  # Return latest processed value
        
        return None
    
    def get_metrics(self) -> Dict:
        """Get processing metrics."""
        elapsed = time.time() - self._last_metric_update
        
        if elapsed > 1.0:
            self.metrics.events_per_second = (
                self.metrics.events_processed / elapsed
            )
            self.metrics.avg_latency_ms = (
                sum(self._latencies) / len(self._latencies) * 1000
                if self._latencies else 0
            )
            self._last_metric_update = time.time()
        
        return {
            "events_processed": self.metrics.events_processed,
            "events_per_second": self.metrics.events_per_second,
            "avg_latency_ms": self.metrics.avg_latency_ms,
            "errors": self.metrics.errors,
            "backpressure_events": self.metrics.backpressure_events,
            "buffer_size": self.buffer.size()
        }

class Aggregator(Generic[T]):
    """Aggregates stream data over windows."""
    
    def __init__(
        self,
        window_config: WindowConfig,
        aggregation_func: Callable[[List[T]], Any]
    ):
        self.window_config = window_config
        self.aggregation_func = aggregation_func
        self.buffer: WindowBuffer[T] = WindowBuffer(window_config)
    
    async def add(self, data: T, timestamp: float = None):
        """Add data to aggregation window."""
        await self.buffer.add(data, timestamp or time.time())
    
    async def get_aggregate(self) -> Any:
        """Get current aggregation result."""
        events = await self.buffer.get_events()
        if events:
            return self.aggregation_func([e.data for e in events])
        return None
    
    async def reset(self):
        """Reset aggregation buffer."""
        await self.buffer.clear()

class JoinProcessor(Generic[L, R, O]):
    """Joins two streams based on keys."""
    
    def __init__(
        self,
        left_key: Callable[[L], str],
        right_key: Callable[[R], str],
        join_func: Callable[[L, R], O]
    ):
        self.left_key = left_key
        self.right_key = right_key
        self.join_func = join_func
        self.left_buffer: Dict[str, L] = {}
        self.right_buffer: Dict[str, R] = {}
    
    async def add_left(self, left: L):
        """Add left stream event."""
        key = self.left_key(left)
        self.left_buffer[key] = left
        await self._try_join(key, left, None)
    
    async def add_right(self, right: R):
        """Add right stream event."""
        key = self.right_key(right)
        self.right_buffer[key] = right
        await self._try_join(key, None, right)
    
    async def _try_join(
        self,
        key: str,
        left: Optional[L],
        right: Optional[R]
    ) -> Optional[O]:
        """Attempt to join if both sides available."""
        if left and key in self.right_buffer:
            return self.join_func(left, self.right_buffer[key])
        elif right and key in self.left_buffer:
            return self.join_func(self.left_buffer[key], right)
        return None
```

---

---


### Pattern 2: Real-time Price Feed Aggregator with Deduplication

```python
from __future__ import annotations

import asyncio
import logging
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import AsyncIterator, Optional


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PriceUpdate:
    """Immutable price tick from any exchange feed."""
    symbol: str
    bid: float
    ask: float
    timestamp: float  # Unix epoch (sub-millisecond precision)
    exchange: str
    sequence: int = 0


class StreamProcessor:
    """Real-time aggregator for multiple exchange price feeds.

    Handles out-of-order messages, deduplicates by sequence number,
    and maintains a consistent best-bid/best-offer view across exchanges.
    """

    def __init__(self, window_seconds: float = 1.0):
        self._window = window_seconds
        self._seen_sequences: dict[str, deque] = defaultdict(
            lambda: deque(maxlen=10_000)
        )
        self._best_prices: dict[str, PriceUpdate] = {}

    async def process_feed(self, symbol: str, updates: AsyncIterator[PriceUpdate]) -> None:
        """Consume a price feed for a single symbol and maintain aggregated state."""
        async for update in updates:
            if self._is_duplicate(symbol, update.sequence):
                logger.debug("Skipping duplicate sequence %d from %s", update.sequence, symbol)
                continue

            self._record_sequence(symbol, update.sequence)
            self._update_best_price(update)

    def _is_duplicate(self, symbol: str, sequence: int) -> bool:
        return sequence in self._seen_sequences[symbol]

    def _record_sequence(self, symbol: str, sequence: int) -> None:
        self._seen_sequences[symbol].append(sequence)

    def _update_best_price(self, update: PriceUpdate) -> None:
        key = update.symbol
        existing = self._best_prices.get(key)

        if existing is None or update.timestamp > existing.timestamp:
            self._best_prices[key] = update
            logger.info(
                "New best price for %s: bid=%.4f ask=%.4f @ %.3fs (%s)",
                key, update.bid, update.ask, time.time() - update.timestamp,
                update.exchange,
            )

    def get_best_quotes(self, symbols: list[str] | None = None) -> dict[str, PriceUpdate]:
        """Return the latest price update for each tracked symbol."""
        if symbols:
            return {s: self._best_prices[s] for s in symbols if s in self._best_prices}
        return dict(self._best_prices)

    async def stream_aggregated(
        self,
        exchange_streams: dict[str, AsyncIterator[PriceUpdate]],
        symbols: list[str],
    ) -> AsyncIterator[tuple[str, PriceUpdate]]:
        """Yield best-price updates as they change across all feeds.

        Usage:
            streams = {"binance": binance_feed, "kraken": kraken_feed}
            async for symbol, price in stream_aggregated(streams, ["BTC/USDT", "ETH/USDT"]):
                print(f"{symbol}: bid={price.bid}, ask={price.ask}")
        """
        tasks = [
            self.process_feed(symbol, feed)
            for feed in exchange_streams.values()
            for symbol in symbols
        ]
        await asyncio.gather(*tasks)

        last_prices: dict[str, PriceUpdate] = {}
        while True:
            current = self.get_best_quotes(symbols)
            changed = {s: p for s, p in current.items() if s not in last_prices or p.timestamp > last_prices[s].timestamp}

            for symbol, price in changed.items():
                yield symbol, price
                last_prices[symbol] = price

            await asyncio.sleep(0.1)
```

## Constraints

### MUST DO
- Validate all incoming data against schema constraints (type, range, nullability) before processing or storage
- Implement idempotent operations: re-processing the same data must produce identical results
- Track data lineage and provenance with timestamps, source identifiers, and transformation history for every record
- Handle out-of-order data by implementing a watermark-based ordering mechanism with configurable tolerance window
- Log data quality metrics (completeness, freshness, accuracy) per source with automatic alerting on degradation

### MUST NOT DO
- Do not silently drop records that fail validation — log them to a quarantine table for review
- Avoid concatenating strings for timestamp comparison; use proper datetime/timedelta objects
- Never assume data arrives in chronological order from any external feed without explicit ordering guarantees
- Do not store raw and processed data in the same table without clear partitioning or separation strategy
- Avoid blocking on slow data sources — implement async prefetch with timeout-based fallback to cached data


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Kafka Streams Documentation](https://kafka.apache.org/documentation/#streams)
- [Real-Time Data Processing Patterns](https://www.confluent.io/blog/stream-processing-patterns/)
- [Apache Flink for Streaming Analytics](https://flink.apache.org/)
- [Stream Processing Architecture Guide](https://docs.quantconnect.com/tutorials/live-trading-overview)
- [Event-Driven Trading Data Pipelines](https://kafka.apache.org/documentation/streamssdk/)
