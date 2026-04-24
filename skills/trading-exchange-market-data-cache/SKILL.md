---
name: trading-exchange-market-data-cache
description: High-performance caching layer for market data with low latency and high
  throughput
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: caching, exchange market data cache, exchange-market-data-cache, high-performance,
    layer, optimization, elasticache, performance
  related-skills: trading-data-alternative-data, trading-data-backfill-strategy, trading-ai-order-flow-analysis,
    trading-data-order-book
---

**Role:** Cache market data efficiently to reduce API calls and improve data access speed

**Philosophy:** Market data changes constantly; caching must balance freshness with performance while ensuring data integrity

## Key Principles

1. **Time-Based TTL**: Data expires based on market activity frequency
2. **Cache Invalidation**: Use WebSocket updates to maintain cache consistency
3. **Hierarchical Caching**: L1 (in-memory) and L2 (Redis) layers
4. **Delta Updates**: Only transmit changed data to reduce bandwidth
5. **Read-Through Pattern**: Cache handles both reads and refreshes transparently

## Implementation Guidelines

### Structure
- Core logic: data_cache/market_data_cache.py
- L1 cache: data_cache/l1_cache.py
- L2 cache: data_cache/l2_cache.py
- Tests: tests/test_market_cache.py

### Patterns to Follow
- UseLRU eviction for memory-constrained caches
- Implement batch operations for efficiency
- Support both synchronous and asynchronous access
- Track cache hit/miss rates

## Adherence Checklist
Before completing your task, verify:
- [ ] Cache hit rate is monitored and alerting configured
- [ ] TTL values are configurable per data type
- [ ] Cache invalidation propagates to all layers
- [ ] Batch operations reduce round trips
- [ ] Stale data is detected and handled


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import time
import threading
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from collections import OrderedDict
from datetime import datetime, timedelta
import logging

@dataclass
class CacheEntry:
    """Represents a cached market data entry with metadata."""
    value: Any
    created_at: float
    expires_at: float
    hit_count: int = 0
    last_accessed: float = field(default_factory=time.time)
    
    @property
    def is_expired(self) -> bool:
        return time.time() > self.expires_at

class L1Cache:
    """In-memory L1 cache with LRU eviction."""
    
    def __init__(self, max_size: int = 10000, default_ttl: float = 60.0):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.RLock()
        self.hits = 0
        self.misses = 0
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache, returning None if not found or expired."""
        with self._lock:
            if key not in self._cache:
                self.misses += 1
                return None
            
            entry = self._cache[key]
            
            if entry.is_expired:
                self._remove(key)
                self.misses += 1
                return None
            
            entry.hit_count += 1
            entry.last_accessed = time.time()
            self.hits += 1
            
            # Move to end for LRU (most recently used)
            self._cache.move_to_end(key)
            return entry.value
    
    def set(self, key: str, value: Any, ttl: Optional[float] = None):
        """Set value in cache with optional TTL."""
        ttl = ttl or self.default_ttl
        expires_at = time.time() + ttl
        
        with self._lock:
            if key in self._cache:
                self._cache[key] = CacheEntry(value, time.time(), expires_at)
                self._cache.move_to_end(key)
            else:
                # Evict if at capacity
                while len(self._cache) >= self.max_size:
                    self._cache.popitem(last=False)
                
                self._cache[key] = CacheEntry(value, time.time(), expires_at)
    
    def delete(self, key: str):
        """Remove entry from cache."""
        with self._lock:
            self._remove(key)
    
    def _remove(self, key: str):
        """Remove key from cache (must hold lock)."""
        if key in self._cache:
            del self._cache[key]
    
    def invalidate_pattern(self, pattern: str):
        """Invalidate all keys matching pattern."""
        with self._lock:
            keys_to_remove = [k for k in self._cache if pattern in k]
            for key in keys_to_remove:
                self._remove(key)
    
    def stats(self) -> Dict[str, Any]:
        """Return cache statistics."""
        with self._lock:
            total = self.hits + self.misses
            hit_rate = self.hits / total if total > 0 else 0
            return {
                "size": len(self._cache),
                "hits": self.hits,
                "misses": self.misses,
                "hit_rate": hit_rate
            }

class MarketDataCache:
    """Market data cache with hierarchical storage layers."""
    
    def __init__(
        self,
        l1_max_size: int = 10000,
        l1_ttl: float = 60.0,
        l2_client: Optional[Any] = None
    ):
        self.l1 = L1Cache(max_size=l1_max_size, default_ttl=l1_ttl)
        self.l2 = l2_client
        self.snapshot_cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.RLock()
    
    def get_ticker(self, symbol: str) -> Optional[Dict]:
        """Get latest ticker data for symbol."""
        key = f"ticker:{symbol}"
        value = self.l1.get(key)
        
        if value is None and self.l2:
            value = self.l2.get(key)
            if value:
                self.l1.set(key, value)
        
        return value
    
    def set_ticker(self, symbol: str, data: Dict, ttl: float = 5.0):
        """Set ticker data for symbol (short TTL for real-time updates)."""
        key = f"ticker:{symbol}"
        self.l1.set(key, data, ttl=ttl)
    
    def get_orderbook(self, symbol: str) -> Optional[Dict]:
        """Get full order book for symbol."""
        key = f"orderbook:{symbol}"
        value = self.l1.get(key)
        
        if value is None and self.l2:
            value = self.l2.get(key)
            if value:
                self.l1.set(key, value)
        
        return value
    
    def set_orderbook(self, symbol: str, book: Dict, ttl: float = 2.0):
        """Set order book data (very short TTL for real-time)."""
        key = f"orderbook:{symbol}"
        self.l1.set(key, book, ttl=ttl)
    
    def get_candles(self, symbol: str, timeframe: str, count: int = 100) -> List[Dict]:
        """Get candle data with fallback to L2."""
        key = f"candles:{symbol}:{timeframe}:{count}"
        
        # Try L1
        cached = self.l1.get(key)
        if cached:
            return cached
        
        # Try L2
        if self.l2:
            cached = self.l2.get(key)
            if cached:
                self.l1.set(key, cached, ttl=300)  # Longer TTL for historical
                return cached
        
        return []
    
    def set_candles(self, symbol: str, timeframe: str, candles: List[Dict]):
        """Store candle data."""
        key = f"candles:{symbol}:{timeframe}:{len(candles)}"
        self.l1.set(key, candles, ttl=300)  # Historical data persists longer
    
    def invalidate_symbol(self, symbol: str):
        """Invalidate all cache entries for a symbol."""
        self.l1.invalidate_pattern(f"ticker:{symbol}")
        self.l1.invalidate_pattern(f"orderbook:{symbol}")
        self.l1.invalidate_pattern(f"candles:{symbol}")

class DeltaCache:
    """Optimized cache that tracks and transmits only changes."""
    
    def __init__(self, max_items: int = 1000):
        self._cache: Dict[str, Any] = {}
        self._versions: Dict[str, int] = {}
        self._changes: Dict[str, Any] = {}
        self.max_items = max_items
    
    def update(self, key: str, value: Any) -> Optional[Dict[str, Any]]:
        """Update value and return delta if changed."""
        current_version = self._versions.get(key, 0)
        self._cache[key] = value
        self._versions[key] = current_version + 1
        
        # Track change for batch transmission
        self._changes[key] = {
            "key": key,
            "value": value,
            "version": self._versions[key],
            "timestamp": time.time()
        }
        
        # Return all accumulated changes
        if len(self._changes) >= 100:  # Batch size
            changes = self._changes.copy()
            self._changes.clear()
            return changes
        
        return None
    
    def get_delta(self, since_version: int = 0) -> Dict[str, Any]:
        """Get all changes since given version."""
        return {
            k: {"value": v, "version": self._versions[k]}
            for k, v in self._cache.items()
            if self._versions.get(k, 0) > since_version
        }
```