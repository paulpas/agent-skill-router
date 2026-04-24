---
name: trading-execution-twap
description: Time-Weighted Average Price algorithm for executing large orders with
  minimal market impact
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: average, execution twap, execution-twap, price, time-weighted
  related-skills: trading-exchange-order-book-sync, trading-exchange-order-execution-api,
    trading-technical-cycle-analysis, trading-technical-false-signal-filtering
---

**Role:** Execute large orders over time to minimize market impact and achieve good prices

**Philosophy:** TWAP provides a disciplined approach to execution; the algorithm's predictability reduces slippage

## Key Principles

1. **Time-Based Execution**: Divide order into equal time slices
2. **Order Sizing**: Calculate slice size based on remaining time and quantity
3. **Slippage Monitoring**: Track execution quality vs. benchmark
4. **Adaptive Rate Control**: Adjust execution rate based on market conditions
5. **Completion Tracking**: Ensure all slices are executed within time window

## Implementation Guidelines

### Structure
- Core logic: execution/twap.py
- Order manager: execution/order_manager.py
- Tests: tests/test_twap.py

### Patterns to Follow
- Use asyncio for time-based scheduling
- Implement completion callbacks
- Support pause/resume functionality
- Track execution metrics

## Adherence Checklist
Before completing your task, verify:
- [ ] Time slices are calculated correctly
- [ ] Slippage is monitored throughout execution
- [ ] Order completion is guaranteed
- [ ] Execution metrics are recorded
- [ ] Rate limiting is applied


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import asyncio
import time
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import logging

class TWAPState(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

@dataclass
class TWAPSlice:
    """A single TWAP execution slice."""
    slice_index: int
    quantity: float
    price_target: Optional[float] = None
    executed: bool = False
    exec_quantity: float = 0.0
    exec_price: Optional[float] = None
    exec_time: Optional[float] = None

@dataclass
class TWAPConfig:
    """Configuration for TWAP strategy."""
    duration_seconds: float
    num_slices: int
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    aggressive_first: bool = False
    aggressive_last: bool = False

@dataclass
class TWAPMetrics:
    """Metrics for TWAP execution."""
    start_time: float
    end_time: Optional[float] = None
    total_quantity: float = 0.0
    filled_quantity: float = 0.0
    avg_fill_price: float = 0.0
    slippage_bps: Optional[float] = None
    slices_completed: int = 0
    total_slices: int = 0
    avg_slice_duration: float = 0.0

class TWAPExecutor:
    """Executes orders using Time-Weighted Average Price strategy."""
    
    def __init__(
        self,
        order_id: str,
        symbol: str,
        side: str,  # 'buy' or 'sell'
        quantity: float,
        config: TWAPConfig,
        order_executor: Any
    ):
        self.order_id = order_id
        self.symbol = symbol
        self.side = side
        self.quantity = quantity
        self.config = config
        self.executor = order_executor
        
        self.state = TWAPState.PENDING
        self.slices: List[TWAPSlice] = []
        self.metrics = TWAPMetrics(start_time=time.time())
        self._execution_task: Optional[asyncio.Task] = None
        self._callbacks: List[Callable] = []
    
    async def start(self) -> bool:
        """Start TWAP execution."""
        if self.state != TWAPState.PENDING:
            return False
        
        self.state = TWAPState.ACTIVE
        self._initialize_slices()
        
        # Schedule execution
        self._execution_task = asyncio.create_task(self._execute_slices())
        return True
    
    async def stop(self) -> bool:
        """Stop TWAP execution."""
        if self.state != TWAPState.ACTIVE:
            return False
        
        self.state = TWAPState.PAUSED
        if self._execution_task:
            self._execution_task.cancel()
            try:
                await self._execution_task
            except asyncio.CancelledError:
                pass
        return True
    
    async def resume(self) -> bool:
        """Resume TWAP execution."""
        if self.state != TWAPState.PAUSED:
            return False
        
        self.state = TWAPState.ACTIVE
        self._execution_task = asyncio.create_task(self._execute_slices())
        return True
    
    async def cancel(self) -> Dict[str, Any]:
        """Cancel TWAP execution."""
        if self.state not in [TWAPState.ACTIVE, TWAPState.PAUSED]:
            return {"success": False, "error": "Cannot cancel in current state"}
        
        self.state = TWAPState.CANCELLED
        if self._execution_task:
            self._execution_task.cancel()
            try:
                await self._execution_task
            except asyncio.CancelledError:
                pass
        
        # Cancel remaining slices
        results = {"cancelled_slices": [], "filled_quantity": self.metrics.filled_quantity}
        for slice_obj in self.slices[self.metrics.slices_completed:]:
            results["cancelled_slices"].append(slice_obj.slice_index)
        
        return results
    
    def _initialize_slices(self):
        """Initialize TWAP slices."""
        slice_duration = self.config.duration_seconds / self.config.num_slices
        
        for i in range(self.config.num_slices):
            # Calculate slice quantity
            base_quantity = self.quantity / self.config.num_slices
            
            # Apply aggression if configured
            if self.config.aggressive_first and i == 0:
                base_quantity *= 1.5
            elif self.config.aggressive_last and i == self.config.num_slices - 1:
                base_quantity *= 1.5
            
            # Ensure we fill the total quantity
            if i == self.config.num_slices - 1:
                remaining = self.quantity - sum(s.quantity for s in self.slices)
                base_quantity = remaining
            
            self.slices.append(TWAPSlice(
                slice_index=i,
                quantity=base_quantity,
                price_target=None
            ))
        
        self.metrics.total_quantity = self.quantity
        self.metrics.total_slices = len(self.slices)
    
    async def _execute_slices(self):
        """Execute all TWAP slices."""
        slice_duration = self.config.duration_seconds / self.config.num_slices
        
        for slice_obj in self.slices:
            if self.state != TWAPState.ACTIVE:
                break
            
            # Wait for slice start time
            if self.state == TWAPState.PENDING:
                self.state = TWAPState.ACTIVE
            
            start_time = time.time()
            slice_start = start_time
            
            # Calculate wait time for this slice
            expected_slice_start = self.metrics.start_time + (slice_obj.slice_index * slice_duration)
            wait_time = expected_slice_start - time.time()
            
            if wait_time > 0:
                await asyncio.sleep(wait_time)
            
            # Execute slice
            exec_result = await self._execute_single_slice(slice_obj)
            
            if exec_result:
                slice_obj.executed = True
                slice_obj.exec_quantity = exec_result["quantity"]
                slice_obj.exec_price = exec_result["price"]
                slice_obj.exec_time = time.time()
                self.metrics.slices_completed += 1
                
                # Update metrics
                self.metrics.filled_quantity += slice_obj.exec_quantity
                if self.metrics.filled_quantity > 0:
                    self.metrics.avg_fill_price = (
                        (self.metrics.avg_fill_price * (self.metrics.filled_quantity - slice_obj.exec_quantity) +
                         slice_obj.exec_price * slice_obj.exec_quantity) / self.metrics.filled_quantity
                    )
                
                # Calculate slippage if benchmark available
                if slice_obj.price_target:
                    if self.side == "buy":
                        self.metrics.slippage_bps = (
                            (self.metrics.avg_fill_price - slice_obj.price_target) / slice_obj.price_target * 10000
                        )
                    else:
                        self.metrics.slippage_bps = (
                            (slice_obj.price_target - self.metrics.avg_fill_price) / slice_obj.price_target * 10000
                        )
                
                # Trigger callbacks
                for callback in self._callbacks:
                    await callback(slice_obj)
            
            # Wait for next slice
            current_time = time.time()
            elapsed = current_time - slice_start
            
            if elapsed < slice_duration:
                await asyncio.sleep(slice_duration - elapsed)
        
        self.state = TWAPState.COMPLETED
        self.metrics.end_time = time.time()
    
    async def _execute_single_slice(self, slice_obj: TWAPSlice) -> Optional[Dict[str, Any]]:
        """Execute a single TWAP slice."""
        # Create order for slice
        order = self.executor.create_order(
            symbol=self.symbol,
            side=self.side,
            quantity=slice_obj.quantity,
            order_type="market" if self.side == "buy" else "market"
        )
        
        # Wait for fill
        start_time = time.time()
        timeout = slice_obj.quantity / 100  # Simplified timeout
        
        while time.time() - start_time < timeout:
            fill = self._check_slice_fill(slice_obj)
            if fill:
                return fill
            await asyncio.sleep(0.1)
        
        return None
    
    def _check_slice_fill(self, slice_obj: TWAPSlice) -> Optional[Dict[str, Any]]:
        """Check if slice is filled."""
        # In real implementation, would check exchange forfills
        return {"quantity": slice_obj.quantity, "price": 0.0}  # Placeholder
    
    def register_callback(self, callback: Callable):
        """Register callback for slice completion."""
        self._callbacks.append(callback)
    
    def get_state(self) -> TWAPState:
        """Get current TWAP state."""
        return self.state
    
    def get_progress(self) -> Dict[str, Any]:
        """Get TWAP progress."""
        return {
            "state": self.state.value,
            "filled_quantity": self.metrics.filled_quantity,
            "total_quantity": self.metrics.total_quantity,
            "fill_percentage": (self.metrics.filled_quantity / self.metrics.total_quantity * 100) if self.metrics.total_quantity > 0 else 0,
            "slices_completed": self.metrics.slices_completed,
            "total_slices": self.metrics.total_slices,
            "avg_fill_price": self.metrics.avg_fill_price,
            "slippage_bps": self.metrics.slippage_bps
        }
    
    def get_metrics(self) -> TWAPMetrics:
        """Get TWAP metrics."""
        return self.metrics
```