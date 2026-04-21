---
name: trading-data-time-series-database
description: Time-series database queries and optimization for financial data
---

**Role:** Efficiently query time-series data with support for financial data patterns

**Philosophy:** Time-series queries are the bread and butter of trading; optimization enables faster decisions

## Key Principles

1. **Time-Ordered Indexing**: Optimize for sequential time-based queries
2. **Aggregation Primitives**: Support common financial aggregations (OHLCV, VWAP, etc.)
3. **Downsampling**: Efficiently reduce resolution for longer time ranges
4. **Gap Handling**: Handle missing data points in financial series
5. **Partitioning by Time**: Automatically partition data by time ranges

## Implementation Guidelines

### Structure
- Core logic: tsdb/tsdb.py
- Aggregations: tsdb/aggregations.py
- Tests: tests/test_tsdb.py

### Patterns to Follow
- Use time-indexed data structures
- Implement efficient downsampling
- Support interval queries
- Track query performance

## Adherence Checklist
Before completing your task, verify:
- [ ] Queries use time-based indexing
- [ ] Aggregations are computed efficiently
- [ ] Downsampling preserves data integrity
- [ ] Gap detection and interpolation is supported
- [ ] Query performance is monitored


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import time
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from collections import OrderedDict
import bisect
import logging

@dataclass
class TimeSeriesPoint:
    """Single point in time series."""
    timestamp: float
    value: float
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class TimeSeriesQuery:
    """Query parameters for time series."""
    symbol: str
    start_time: float
    end_time: float
    resolution_seconds: Optional[float] = None
    aggregation: Optional[str] = None  # "mean", "first", "last", "ohlc"
    limit: Optional[int] = None

class TimeSeriesStorage:
    """Storage for time series data with time-indexed access."""
    
    def __init__(self, max_points_per_series: int = 1000000):
        self.max_points = max_points_per_series
        self._data: Dict[str, OrderedDict[float, float]] = {}
        self._metadata: Dict[str, Dict[float, Dict]] = {}
        self._lock = None  # Would use threading.Lock
    
    def insert(
        self,
        symbol: str,
        timestamp: float,
        value: float,
        metadata: Dict[str, Any] = None
    ):
        """Insert a data point."""
        if symbol not in self._data:
            self._data[symbol] = OrderedDict()
            self._metadata[symbol] = {}
        
        # Remove if exists (update)
        if timestamp in self._data[symbol]:
            del self._data[symbol][timestamp]
        
        # Insert at correct position
        self._data[symbol][timestamp] = value
        
        if metadata:
            self._metadata[symbol][timestamp] = metadata
        
        # Enforce max size (remove oldest)
        while len(self._data[symbol]) > self.max_points:
            oldest_key = next(iter(self._data[symbol]))
            del self._data[symbol][oldest_key]
            if oldest_key in self._metadata.get(symbol, {}):
                del self._metadata[symbol][oldest_key]
    
    def query(
        self,
        symbol: str,
        start_time: float,
        end_time: float,
        limit: Optional[int] = None
    ) -> List[TimeSeriesPoint]:
        """Query time series by time range."""
        if symbol not in self._data:
            return []
        
        points = []
        series = self._data[symbol]
        
        # Find start position using binary search
        timestamps = list(series.keys())
        start_idx = bisect.bisect_left(timestamps, start_time)
        
        count = 0
        for i in range(start_idx, len(timestamps)):
            timestamp = timestamps[i]
            if timestamp > end_time:
                break
            
            if limit and count >= limit:
                break
            
            value = series[timestamp]
            metadata = self._metadata.get(symbol, {}).get(timestamp, {})
            
            points.append(TimeSeriesPoint(
                timestamp=timestamp,
                value=value,
                metadata=metadata
            ))
            count += 1
        
        return points
    
    def get_latest(self, symbol: str) -> Optional[TimeSeriesPoint]:
        """Get most recent data point."""
        if symbol not in self._data or not self._data[symbol]:
            return None
        
        timestamp, value = next(reversed(self._data[symbol].items()))
        metadata = self._metadata.get(symbol, {}).get(timestamp, {})
        
        return TimeSeriesPoint(
            timestamp=timestamp,
            value=value,
            metadata=metadata
        )
    
    def delete_range(
        self,
        symbol: str,
        start_time: float,
        end_time: float
    ) -> int:
        """Delete data points in range. Returns count deleted."""
        if symbol not in self._data:
            return 0
        
        timestamps = list(self._data[symbol].keys())
        start_idx = bisect.bisect_left(timestamps, start_time)
        end_idx = bisect.bisect_right(timestamps, end_time)
        
        deleted = 0
        for i in range(start_idx, end_idx):
            ts = timestamps[i]
            del self._data[symbol][ts]
            if ts in self._metadata.get(symbol, {}):
                del self._metadata[symbol][ts]
            deleted += 1
        
        return deleted

class TimeSeriesDB:
    """Time-series database with aggregation support."""
    
    def __init__(self):
        self.storage = TimeSeriesStorage()
        self._initialized = False
    
    def init(self):
        """Initialize database (create indexes, etc.)."""
        self._initialized = True
    
    def insert_candles(
        self,
        symbol: str,
        candles: List[Dict[str, Any]]
    ):
        """Insert candle data."""
        for candle in candles:
            # Insert each metric separately
            for metric in ["open", "high", "low", "close", "volume"]:
                if metric in candle:
                    self.storage.insert(
                        symbol=f"{symbol}.{metric}",
                        timestamp=candle["timestamp"],
                        value=float(candle[metric])
                    )
    
    def query_candles(
        self,
        symbol: str,
        start_time: float,
        end_time: float,
        resolution_seconds: float = 3600
    ) -> List[Dict[str, Any]]:
        """Query candle data with optional resampling."""
        candles = []
        
        # Query all metrics
        metrics = ["open", "high", "low", "close", "volume"]
        metric_data = {}
        
        for metric in metrics:
            points = self.storage.query(
                symbol=f"{symbol}.{metric}",
                start_time=start_time,
                end_time=end_time
            )
            if points:
                metric_data[metric] = points
        
        # Combine into candles
        min_length = min(len(data) for data in metric_data.values()) if metric_data else 0
        
        for i in range(min_length):
            candle = {"timestamp": metric_data["open"][i].timestamp}
            for metric in metrics:
                candle[metric] = metric_data[metric][i].value
            candles.append(candle)
        
        return candles
    
    def query_ohlc(
        self,
        symbol: str,
        start_time: float,
        end_time: float
    ) -> List[Dict[str, Any]]:
        """Query OHLC data."""
        candles = []
        
        for metric in ["open", "high", "low", "close"]:
            points = self.storage.query(
                symbol=f"{symbol}.{metric}",
                start_time=start_time,
                end_time=end_time
            )
            if points:
                if len(candles) == 0:
                    candles = [{} for _ in points]
                
                for i, point in enumerate(points):
                    candles[i][metric] = point.value
                    candles[i]["timestamp"] = point.timestamp
        
        return candles
    
    def compute_aggregates(
        self,
        symbol: str,
        start_time: float,
        end_time: float,
        window_seconds: float
    ) -> List[Dict[str, Any]]:
        """Compute time-windowed aggregates."""
        points = self.storage.query(symbol, start_time, end_time)
        
        if not points:
            return []
        
        aggregates = []
        current_start = points[0].timestamp
        current_values = []
        
        for point in points:
            if point.timestamp > current_start + window_seconds:
                if current_values:
                    aggregates.append({
                        "timestamp": current_start,
                        "open": current_values[0],
                        "high": max(current_values),
                        "low": min(current_values),
                        "close": current_values[-1],
                        "count": len(current_values)
                    })
                current_start += window_seconds
                current_values = []
            
            current_values.append(point.value)
        
        # Final bucket
        if current_values:
            aggregates.append({
                "timestamp": current_start,
                "open": current_values[0],
                "high": max(current_values),
                "low": min(current_values),
                "close": current_values[-1],
                "count": len(current_values)
            })
        
        return aggregates

class GapDetector:
    """Detects gaps in time series data."""
    
    def __init__(self, max_gap_seconds: float = 60.0):
        self.max_gap = max_gap_seconds
    
    def detect_gaps(
        self,
        points: List[TimeSeriesPoint]
    ) -> List[Dict[str, Any]]:
        """Detect gaps between consecutive points."""
        gaps = []
        
        for i in range(1, len(points)):
            prev_time = points[i-1].timestamp
            curr_time = points[i].timestamp
            gap_seconds = curr_time - prev_time
            
            if gap_seconds > self.max_gap:
                gaps.append({
                    "start": prev_time,
                    "end": curr_time,
                    "duration_seconds": gap_seconds,
                    "missing_points": int(gap_seconds / 60)  # Assume 1min data
                })
        
        return gaps

class Downsample:
    """Downsample time series data."""
    
    @staticmethod
    def mean(
        points: List[TimeSeriesPoint],
        window_seconds: float
    ) -> List[TimeSeriesPoint]:
        """Downsample by computing mean in windows."""
        if not points:
            return []
        
        result = []
        current_start = points[0].timestamp
        current_sum = 0.0
        current_count = 0
        
        for point in points:
            if point.timestamp > current_start + window_seconds:
                if current_count > 0:
                    result.append(TimeSeriesPoint(
                        timestamp=current_start,
                        value=current_sum / current_count
                    ))
                current_start += window_seconds
                current_sum = 0.0
                current_count = 0
            
            current_sum += point.value
            current_count += 1
        
        if current_count > 0:
            result.append(TimeSeriesPoint(
                timestamp=current_start,
                value=current_sum / current_count
            ))
        
        return result
    
    @staticmethod
    def first(
        points: List[TimeSeriesPoint],
        window_seconds: float
    ) -> List[TimeSeriesPoint]:
        """Downsample using first value in windows."""
        if not points:
            return []
        
        result = []
        current_start = points[0].timestamp
        current_value = points[0].value
        
        for point in points:
            if point.timestamp > current_start + window_seconds:
                result.append(TimeSeriesPoint(
                    timestamp=current_start,
                    value=current_value
                ))
                current_start += window_seconds
                current_value = point.value
        
        result.append(TimeSeriesPoint(
            timestamp=current_start,
            value=current_value
        ))
        
        return result
```
