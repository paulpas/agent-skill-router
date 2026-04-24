---
name: trading-execution-vwap
description: Volume-Weighted Average Price algorithm for executing orders relative
  to market volume
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: average, execution vwap, execution-vwap, price, volume-weighted
  related-skills: trading-exchange-order-book-sync, trading-exchange-order-execution-api
    trading-technical-cycle-analysis, trading-technical-false-signal-filtering
---

**Role:** Execute orders in proportion to market volume to minimize slippage in high-volume periods

**Philosophy:** Volume-weighted execution aligns with market liquidity; orders follow the market's trading patterns

## Key Principles

1. **Volume Proportionality**: Execute more during high-volume periods
2. **Historical Volume Patterns**: Use past volume profiles for execution planning
3. **Real-Time Volume Tracking**: Adjust execution based on current volume
4. ** VWAP Benchmark**: Compare execution price to VWAP benchmark
5. **Partial Execution**: Allow orders to execute across multiple volume bars

## Implementation Guidelines

### Structure
- Core logic: execution/vwap.py
- Volume profiler: execution/volume_profile.py
- Tests: tests/test_vwap.py

### Patterns to Follow
- Implement volume-based scheduling
- Track execution vs. benchmark
- Support dynamic adjustment
- Monitor VWAP deviation

## Adherence Checklist
Before completing your task, verify:
- [ ] Volume profiles are calculated correctly
- [ ] Execution follows volume profile
- [ ] VWAP benchmark is tracked
- [ ] Slippage vs. VWAP is monitored
- [ ] Execution adapts to volume changes


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import asyncio
import time
from typing import Dict, List, Optional, Callable, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import logging
import numpy as np

class VWAPState(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

@dataclass
class VolumeBar:
    """Volume data for a time period."""
    timestamp: float
    volume: float
    price: float
    bar_type: str = "minute"  # minute, hour, day

@dataclass
class VWAPConfig:
    """Configuration for VWAP strategy."""
    duration_minutes: int = 30
    start_time: Optional[str] = None  # HH:MM format
    volume_profile: Dict[str, float] = field(default_factory=dict)  # time -> volume %
    adaptive: bool = True
    max_slippage_bps: float = 10.0

@dataclass
class VWAPMetrics:
    """Metrics for VWAP execution."""
    total_quantity: float = 0.0
    filled_quantity: float = 0.0
    avg_fill_price: float = 0.0
    vwap_benchmark: float = 0.0
    slippage_bps: float = 0.0
    volume_imbalance: float = 0.0
    bars_participated: int = 0

class VolumeProfiler:
    """Profiles historical volume patterns."""
    
    def __init__(self, lookback_days: int = 20):
        self.lookback = lookback_days
        self.volume_profile: Dict[str, Dict[str, float]] = {}
        self._minute_profile: Dict[int, float] = {}
        self._hour_profile: Dict[int, float] = {}
    
    def add_bar(self, symbol: str, bar: VolumeBar):
        """Add a volume bar to the profile."""
        if symbol not in self.volume_profile:
            self.volume_profile[symbol] = {}
        
        # Add to minute profile
        minute = datetime.fromtimestamp(bar.timestamp).minute
        if minute not in self._minute_profile:
            self._minute_profile[minute] = 0
        self._minute_profile[minute] += bar.volume
    
    def get_volume_profile(self, symbol: str, date: str) -> Dict[str, float]:
        """Get volume profile for a date."""
        return self.volume_profile.get(symbol, {}).get(date, {})
    
    def get_minute_distribution(self) -> Dict[int, float]:
        """Get minute-by-minute volume distribution."""
        total = sum(self._minute_profile.values())
        if total == 0:
            return {}
        return {m: v / total for m, v in self._minute_profile.items()}
    
    def get_hour_distribution(self) -> Dict[int, float]:
        """Get hour-by-hour volume distribution."""
        hour_profile: Dict[int, float] = {}
        for minute, volume in self._minute_profile.items():
            hour = minute // 60
            hour_profile[hour] = hour_profile.get(hour, 0) + volume
        
        total = sum(hour_profile.values())
        if total == 0:
            return {}
        return {h: v / total for h, v in hour_profile.items()}

class VWAPExecutor:
    """Executes orders using Volume-Weighted Average Price strategy."""
    
    def __init__(
        self,
        order_id: str,
        symbol: str,
        side: str,
        quantity: float,
        config: VWAPConfig,
        order_executor: Any
    ):
        self.order_id = order_id
        self.symbol = symbol
        self.side = side
        self.quantity = quantity
        self.config = config
        self.executor = order_executor
        
        self.state = VWAPState.PENDING
        self.volume_profile: Dict[str, float] = {}
        self.current_volume: float = 0.0
        self.bars: List[VolumeBar] = []
        self.metrics = VWAPMetrics()
        self._execution_task: Optional[asyncio.Task] = None
        self._callbacks: List[Callable] = []
    
    async def start(self) -> bool:
        """Start VWAP execution."""
        if self.state != VWAPState.PENDING:
            return False
        
        self.state = VWAPState.ACTIVE
        await self._build_volume_profile()
        await self._calculate_execution_schedule()
        
        self._execution_task = asyncio.create_task(self._execute_based_on_volume())
        return True
    
    async def stop(self) -> bool:
        """Stop VWAP execution."""
        if self.state != VWAPState.ACTIVE:
            return False
        
        self.state = VWAPState.PAUSED
        if self._execution_task:
            self._execution_task.cancel()
            try:
                await self._execution_task
            except asyncio.CancelledError:
                pass
        return True
    
    async def cancel(self) -> Dict[str, Any]:
        """Cancel VWAP execution."""
        if self.state not in [TWAPState.ACTIVE, TWAPState.PAUSED]:
            return {"success": False, "error": "Cannot cancel in current state"}
        
        self.state = VWAPState.CANCELLED
        if self._execution_task:
            self._execution_task.cancel()
            try:
                await self._execution_task
            except asyncio.CancelledError:
                pass
        
        return {
            "cancelled": True,
            "filled_quantity": self.metrics.filled_quantity
        }
    
    async def _build_volume_profile(self):
        """Build volume profile for execution planning."""
        # Get historical volume profile
        # In real implementation, would query data store
        self.volume_profile = self._default_volume_profile()
    
    def _default_volume_profile(self) -> Dict[str, float]:
        """Generate default volume profile."""
        # Typical US equity volume profile (after hours excluded)
        profile = {}
        
        # Pre-market (4-9:30 AM)
        for hour in range(4, 10):
            profile[f"{hour:02d}"] = 0.02
        
        # Regular market (9:30 AM - 4 PM)
        for hour in range(9, 17):
            if hour == 9:
                profile[f"{hour}:30"] = 0.08
            elif hour == 15:
                profile[f"{hour}"] = 0.12
            else:
                profile[f"{hour}"] = 0.05
        
        # After-hours (4-8 PM)
        for hour in range(16, 20):
            profile[f"{hour}"] = 0.01
        
        return profile
    
    async def _calculate_execution_schedule(self):
        """Calculate execution schedule based on volume profile."""
        # Normalize volume profile to get execution percentages
        total_volume = sum(self.volume_profile.values())
        if total_volume == 0:
            return
        
        for time_key in self.volume_profile:
            self.volume_profile[time_key] /= total_volume
    
    async def _execute_based_on_volume(self):
        """Execute orders based on current volume."""
        start_time = time.time()
        duration_seconds = self.config.duration_minutes * 60
        
        while time.time() - start_time < duration_seconds:
            if self.state != VWAPState.ACTIVE:
                break
            
            # Get current volume rate
            current_rate = self._get_current_volume_rate()
            target_rate = self._get_target_volume_rate()
            
            # Calculate execution rate
            if current_rate > 0:
                volume_ratio = current_rate / target_rate
                execution_quantity = self._calculate_slice_size() * volume_ratio
            else:
                execution_quantity = self._calculate_slice_size()
            
            # Execute slice
            if self._can_execute(execution_quantity):
                result = await self._execute_slice(execution_quantity)
                if result:
                    self.metrics.bars_participated += 1
                    self._update_metrics(result)
            
            # Wait for next volume bar
            await asyncio.sleep(60)  # Check every minute
    
    def _get_current_volume_rate(self) -> float:
        """Get current volume rate."""
        # In real implementation, would query current volume data
        # For now, return average
        return 1.0
    
    def _get_target_volume_rate(self) -> float:
        """Get target volume rate from profile."""
        hour = datetime.now().hour
        minute = datetime.now().minute
        time_key = f"{hour}:{minute // 30 * 30:02d}" if minute % 30 >= 15 else f"{hour}:{minute // 30 * 30:02d}"
        
        return self.volume_profile.get(time_key, 0.01)
    
    def _calculate_slice_size(self) -> float:
        """Calculate slice size based on remaining quantity."""
        remaining = self.quantity - self.metrics.filled_quantity
        remaining_time = self.config.duration_minutes * 60 - (time.time() - self.metrics.total_quantity)
        
        # Calculate number of remaining slices
        remaining_slices = max(1, self.config.duration_minutes - self.metrics.bars_participated)
        
        return remaining / remaining_slices
    
    def _can_execute(self, quantity: float) -> bool:
        """Check if execution is allowed."""
        if quantity <= 0:
            return False
        
        if self.metrics.filled_quantity + quantity > self.quantity:
            return False
        
        return True
    
    async def _execute_slice(self, quantity: float) -> Optional[Dict[str, Any]]:
        """Execute a single slice."""
        order = self.executor.create_order(
            symbol=self.symbol,
            side=self.side,
            quantity=quantity,
            order_type="market"
        )
        
        # Wait for fill
        start_time = time.time()
        while time.time() - start_time < 60:  # 1 minute timeout
            # Check if filled
            if self._slice_filled(order):
                return {"quantity": quantity, "price": 0.0}  # Placeholder
        
        return None
    
    def _slice_filled(self, order) -> bool:
        """Check if order slice is filled."""
        # In real implementation, would check order status
        return True  # Placeholder
    
    def _update_metrics(self, fill: Dict[str, Any]):
        """Update execution metrics."""
        self.metrics.filled_quantity += fill["quantity"]
        self.metrics.total_quantity = self.quantity
        
        # Update average fill price
        if self.metrics.filled_quantity > 0:
            # Simplified average price calculation
            self.metrics.avg_fill_price = fill["price"]
        
        # Calculate VWAP benchmark
        total_volume_price = sum(b.volume * b.price for b in self.bars)
        total_volume = sum(b.volume for b in self.bars)
        if total_volume > 0:
            self.metrics.vwap_benchmark = total_volume_price / total_volume
        
        # Calculate slippage
        if self.metrics.vwap_benchmark > 0:
            if self.side == "buy":
                self.metrics.slippage_bps = (
                    (self.metrics.avg_fill_price - self.metrics.vwap_benchmark) / self.metrics.vwap_benchmark * 10000
                )
            else:
                self.metrics.slippage_bps = (
                    (self.metrics.vwap_benchmark - self.metrics.avg_fill_price) / self.metrics.vwap_benchmark * 10000
                )
    
    def register_callback(self, callback: Callable):
        """Register callback for execution updates."""
        self._callbacks.append(callback)
    
    def get_state(self) -> VWAPState:
        """Get current VWAP state."""
        return self.state
    
    def get_progress(self) -> Dict[str, Any]:
        """Get VWAP progress."""
        return {
            "state": self.state.value,
            "filled_quantity": self.metrics.filled_quantity,
            "total_quantity": self.metrics.total_quantity,
            "fill_percentage": (self.metrics.filled_quantity / self.metrics.total_quantity * 100) if self.metrics.total_quantity > 0 else 0,
            "vwap_benchmark": self.metrics.vwap_benchmark,
            "avg_fill_price": self.metrics.avg_fill_price,
            "slippage_bps": self.metrics.slippage_bps
        }

class VWAPBenchmark:
    """Calculates and tracks VWAP benchmark."""
    
    def __init__(self, window_minutes: int = 30):
        self.window = window_minutes
        self.bars: List[VolumeBar] = []
        self._lock = None
    
    def add_bar(self, bar: VolumeBar):
        """Add a volume bar."""
        self.bars.append(bar)
        self._cleanup_old_bars()
    
    def _cleanup_old_bars(self):
        """Remove bars outside the window."""
        cutoff = time.time() - (self.window * 60)
        self.bars = [b for b in self.bars if b.timestamp > cutoff]
    
    def calculate_vwap(self) -> float:
        """Calculate current VWAP."""
        if not self.bars:
            return 0.0
        
        total_volume_price = sum(b.volume * b.price for b in self.bars)
        total_volume = sum(b.volume for b in self.bars)
        
        return total_volume_price / total_volume if total_volume > 0 else 0.0
    
    def get_vwap_series(self) -> List[Tuple[float, float]]:
        """Get VWAP time series."""
        # Simplified: return current VWAP
        return [(time.time(), self.calculate_vwap())]
```