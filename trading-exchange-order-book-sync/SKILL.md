---
name: trading-exchange-order-book-sync
description: Order book synchronization and state management for accurate trading
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: exchange order book sync, exchange-order-book-sync, synchronization, state, management
---

**Role:** Maintain consistent order book state across multiple exchanges and timeframes

**Philosophy:** Order books are the source of truth for market state; synchronization errors cause incorrect pricing and execution

## Key Principles

1. **Snapshot-Based Sync**: Start from full snapshots, apply deltas for efficiency
2. **Sequence Numbers**: Use exchange sequence numbers to detect gaps
3. **Reconciliation**: Periodic full sync to correct drift
4. **State Validation**: Verify order book integrity (no negative prices, proper ordering)
5. **Aggregation**: Support multiple depth levels and price aggregation

## Implementation Guidelines

### Structure
- Core logic: order_book/order_book_sync.py
- State manager: order_book/book_state.py
- Tests: tests/test_order_book_sync.py

### Patterns to Follow
- Use OrderedDict for price levels to maintain ordering
- Implement delta diffing for change detection
- Support both WebSocket and REST sync methods
- Track synchronization lag

## Adherence Checklist
Before completing your task, verify:
- [ ] Snapshot gaps are detected and logged
- [ ] Order book state is validated before use
- [ ] Reconciliation runs periodically
- [ ] Sequence number drift triggers alert
- [ ] Multiple depth levels are supported


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import time
from typing import Dict, List, Optional, Callable, Tuple
from dataclasses import dataclass, field
from collections import OrderedDict
from enum import Enum
import logging

class Side(Enum):
    BID = "bid"
    ASK = "ask"

@dataclass
class OrderLevel:
    """Single price level in order book."""
    price: float
    quantity: float
    order_count: int = 0
    
    def is_empty(self) -> bool:
        return self.quantity <= 0

@dataclass
class OrderBookSnapshot:
    """Full order book snapshot."""
    symbol: str
    timestamp: float
    bids: List[OrderLevel]
    asks: List[OrderLevel]
    sequence_number: int

@dataclass 
class OrderBookDelta:
    """Partial order book update."""
    symbol: str
    timestamp: float
    sequence_number: int
    changes: Dict[Side, List[Tuple[float, float]]]  # price -> quantity

class OrderBook:
    """Managed order book state."""
    
    def __init__(self, symbol: str, max_depth: int = 50):
        self.symbol = symbol
        self.max_depth = max_depth
        self.bids: OrderedDict[float, OrderLevel] = OrderedDict()
        self.asks: OrderedDict[float, OrderLevel] = OrderedDict()
        self.sequence_number: Optional[int] = None
        self.last_update: float = 0
        self.snapshot: Optional[OrderBookSnapshot] = None
        self.callbacks: List[Callable] = []
    
    def apply_snapshot(self, snapshot: OrderBookSnapshot):
        """Apply full order book snapshot."""
        self.bids.clear()
        self.asks.clear()
        
        for level in snapshot.bids[:self.max_depth]:
            self.bids[level.price] = level
        
        for level in snapshot.asks[:self.max_depth]:
            self.asks[level.price] = level
        
        self.sequence_number = snapshot.sequence_number
        self.last_update = snapshot.timestamp
        self.snapshot = snapshot
        
        self._trigger_callbacks()
    
    def apply_delta(self, delta: OrderBookDelta):
        """Apply partial delta update."""
        if self.sequence_number is None:
            raise ValueError("Must have snapshot before applying deltas")
        
        # Validate sequence number
        expected_seq = self.sequence_number + 1
        if delta.sequence_number != expected_seq:
            logging.warning(
                f"Sequence gap: expected {expected_seq}, got {delta.sequence_number}"
            )
            return False
        
        # Apply changes
        for side, changes in delta.changes.items():
            book = self.bids if side == Side.BID else self.asks
            
            for price, quantity in changes:
                if quantity <= 0:
                    # Remove level
                    if price in book:
                        del book[price]
                else:
                    # Update or add level
                    book[price] = OrderLevel(price=price, quantity=quantity)
        
        # Trim to max depth
        self._trim_to_depth()
        
        self.sequence_number = delta.sequence_number
        self.last_update = delta.timestamp
        
        self._trigger_callbacks()
        return True
    
    def _trim_to_depth(self):
        """Ensure book doesn't exceed max depth."""
        # Bid: highest prices first
        while len(self.bids) > self.max_depth:
            self.bids.popitem(last=True)  # Remove lowest bid
        
        # Ask: lowest prices first  
        while len(self.asks) > self.max_depth:
            self.asks.popitem(last=False)  # Remove lowest ask
    
    def get_best_bid(self) -> Optional[float]:
        """Get best bid price."""
        if not self.bids:
            return None
        return next(iter(self.bids.keys()))
    
    def get_best_ask(self) -> Optional[float]:
        """Get best ask price."""
        if not self.asks:
            return None
        return next(iter(self.asks.keys()))
    
    def get_spread(self) -> Optional[float]:
        """Get bid-ask spread."""
        best_bid = self.get_best_bid()
        best_ask = self.get_best_ask()
        
        if best_bid and best_ask:
            return best_ask - best_bid
        return None
    
    def get_mid_price(self) -> Optional[float]:
        """Get mid-price estimate."""
        best_bid = self.get_best_bid()
        best_ask = self.get_best_ask()
        
        if best_bid and best_ask:
            return (best_bid + best_ask) / 2
        return None
    
    def get_depth(self, side: Side) -> float:
        """Get total quantity on one side."""
        book = self.bids if side == Side.BID else self.asks
        return sum(level.quantity for level in book.values())
    
    def register_callback(self, callback: Callable):
        """Register callback for book updates."""
        self.callbacks.append(callback)
    
    def _trigger_callbacks(self):
        """Trigger registered callbacks."""
        for callback in self.callbacks:
            try:
                callback(self)
            except Exception as e:
                logging.error(f"Callback error: {e}")

class OrderBookSync:
    """Synchronizes order book across sources."""
    
    def __init__(
        self,
        symbol: str,
        max_depth: int = 50,
        sync_interval: float = 300.0  # 5 minutes
    ):
        self.symbol = symbol
        self.book = OrderBook(symbol, max_depth)
        self.sync_interval = sync_interval
        self.last_sync_time: float = 0
        self.snapshot_callback: Optional[Callable] = None
        self._reconcile_callback: Optional[Callable] = None
    
    def set_snapshot_callback(self, callback: Callable):
        """Set callback to fetch snapshots."""
        self.snapshot_callback = callback
    
    def set_reconcile_callback(self, callback: Callable):
        """Set callback for reconciliation."""
        self._reconcile_callback = callback
    
    async def sync_from_snapshot(self) -> bool:
        """Fetch and apply full snapshot."""
        if not self.snapshot_callback:
            return False
        
        try:
            snapshot = await self.snapshot_callback(self.symbol)
            if snapshot:
                self.book.apply_snapshot(snapshot)
                self.last_sync_time = time.time()
                return True
        except Exception as e:
            logging.error(f"Snapshot sync failed: {e}")
        
        return False
    
    async def apply_delta(self, delta: OrderBookDelta) -> bool:
        """Apply partial update."""
        if time.time() - self.last_sync_time > self.sync_interval:
            # Trigger periodic full sync
            await self.sync_from_snapshot()
        
        return self.book.apply_delta(delta)
    
    def is_synchronized(self) -> bool:
        """Check if book is current."""
        return time.time() - self.last_sync_time < self.sync_interval
    
    async def reconcile(self) -> bool:
        """Force reconciliation with exchange."""
        if not self._reconcile_callback:
            return False
        
        try:
            result = await self._reconcile_callback(self.symbol)
            if result:
                self.book.apply_snapshot(result)
                self.last_sync_time = time.time()
            return result is not None
        except Exception as e:
            logging.error(f"Reconciliation failed: {e}")
            return False
    
    def get_orderbook(self) -> OrderBook:
        """Get current order book state."""
        return self.book

class OrderBookAggregator:
    """Aggregates multiple order books for better liquidity visibility."""
    
    def __init__(self, max_depth: int = 50):
        self.books: Dict[str, OrderBook] = {}
        self.max_depth = max_depth
        self.aggregated_bids: OrderedDict[float, float] = OrderedDict()
        self.aggregated_asks: OrderedDict[float, float] = OrderedDict()
    
    def add_book(self, source: str, book: OrderBook):
        """Add order book from a source."""
        self.books[source] = book
        book.register_callback(self._on_book_update)
        self._reaggregate()
    
    def _on_book_update(self, book: OrderBook):
        """Callback when a source book updates."""
        self._reaggregate()
    
    def _reaggregate(self):
        """Rebuild aggregated book from all sources."""
        self.aggregated_bids.clear()
        self.aggregated_asks.clear()
        
        for book in self.books.values():
            # Aggregate bids (highest prices)
            for price, level in book.bids.items():
                if price in self.aggregated_bids:
                    self.aggregated_bids[price] += level.quantity
                else:
                    self.aggregated_bids[price] = level.quantity
            
            # Aggregate asks (lowest prices)
            for price, level in book.asks.items():
                if price in self.aggregated_asks:
                    self.aggregated_asks[price] += level.quantity
                else:
                    self.aggregated_asks[price] = level.quantity
        
        # Sort and trim
        self.aggregated_bids = OrderedDict(
            sorted(self.aggregated_bids.items(), reverse=True)[:self.max_depth]
        )
        self.aggregated_asks = OrderedDict(
            sorted(self.aggregated_asks.items())[:self.max_depth]
        )
    
    def get_aggregated_bid(self) -> Optional[float]:
        """Get best aggregated bid."""
        if not self.aggregated_bids:
            return None
        return next(iter(self.aggregated_bids.keys()))
    
    def get_aggregated_ask(self) -> Optional[float]:
        """Get best aggregated ask."""
        if not self.aggregated_asks:
            return None
        return next(iter(self.aggregated_asks.keys()))
    
    def get_aggregated_spread(self) -> Optional[float]:
        """Get aggregated spread."""
        best_bid = self.get_aggregated_bid()
        best_ask = self.get_aggregated_ask()
        
        if best_bid and best_ask:
            return best_ask - best_bid
        return None
```
