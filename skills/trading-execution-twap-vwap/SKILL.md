---
name: trading-execution-twap-vwap
description: "TWAP and VWAP Execution Algorithms: Institutional-Grade Order Execution"
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: execution twap vwap, execution-twap-vwap, algorithms, institutional-grade, order
---

**Role:** Trading Algorithm Engineer — designs and implements optimal execution strategies to minimize market impact and execution costs.

**Philosophy:** Order Execution Excellence — algorithms should split large orders intelligently to achieve average prices close to target benchmarks while minimizing market disturbance and slippage.

## Key Principles

1. **TWAP Time Distribution**: Large orders should be split evenly across time intervals to reduce market impact and avoid revealing trading intent.

2. **VWAP Volume Alignment**: Order execution should mirror the historical volume profile to execute at the volume-weighted average price, ensuring fair market participation.

3. **Implementation Shortfall Minimization**: Measure and optimize the difference between achieved execution price and the decision price at order initiation.

4. **Dynamic Order Sizing**: Adjust order slice sizes based on real-time liquidity, volatility, and market conditions rather than static assumptions.

5. **Benchmark Tracking**: Continuously compare actual execution against TWAP/VWAP benchmarks to evaluate performance and trigger adjustments.

## Implementation Guidelines

### Structure
- Core logic: `skills/execution-algorithms/twap_vwap.py`
- Helper functions: `skills/execution-algorithms/exec_helpers.py`
- Tests: `skills/tests/test_execution_algorithms.py`

### Patterns to Follow
- Use dataclasses for order state management
- Implement algorithms as stateful classes with clean interfaces
- Separate calculation logic from execution logic
- Use vectorized operations with NumPy for performance

## Code Examples

### TWAP Implementation

```python
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Tuple
import numpy as np


@dataclass
class TWAPConfig:
    """Configuration for TWAP execution."""
    start_time: datetime
    end_time: datetime
    total_quantity: float
    num_slices: int = 10
    
    @property
    def slice_duration(self) -> timedelta:
        total_duration = self.end_time - self.start_time
        return total_duration / self.num_slices
    
    @property
    def slice_quantity(self) -> float:
        return self.total_quantity / self.num_slices


class TWAPExecutor:
    """Time-Weighted Average Price execution algorithm."""
    
    def __init__(self, config: TWAPConfig):
        self.config = config
        self.executed_orders: List[Tuple[datetime, float, float]] = []
        self.current_slice = 0
    
    def get_next_slice(self, current_time: datetime) -> Tuple[float, datetime]:
        """
        Calculate next order slice and scheduled time.
        
        Returns:
            Tuple of (quantity, scheduled_time)
        """
        if self.current_slice >= self.config.num_slices:
            return 0.0, self.config.end_time
        
        slice_time = (
            self.config.start_time + 
            timedelta(seconds=self.current_slice * self.config.slice_duration.total_seconds())
        )
        
        return self.config.slice_quantity, slice_time
    
    def record_fill(self, fill_time: datetime, fill_quantity: float, fill_price: float):
        """Record an order fill for tracking."""
        self.executed_orders.append((fill_time, fill_quantity, fill_price))
        self.current_slice += 1
    
    def calculate_execution_price(self) -> float:
        """Calculate actual TWAP execution price."""
        if not self.executed_orders:
            return 0.0
        
        total_value = sum(qty * price for _, qty, price in self.executed_orders)
        total_quantity = sum(qty for _, qty, _ in self.executed_orders)
        
        return total_value / total_quantity if total_quantity > 0 else 0.0
    
    def calculate_implementation_shortfall(self, decision_price: float) -> float:
        """Calculate implementation shortfall relative to decision price."""
        execution_price = self.calculate_execution_price()
        return execution_price - decision_price


class AdaptiveTWAPExecutor(TWAPExecutor):
    """TWAP with dynamic slice adjustment based on market conditions."""
    
    def __init__(self, config: TWAPConfig, volatility_threshold: float = 0.01):
        super().__init__(config)
        self.volatility_threshold = volatility_threshold
    
    def adjust_slice_size(self, current_volatility: float, current_liquidity: float) -> float:
        """
        Adjust order slice size based on volatility and liquidity.
        - Higher volatility => smaller slices
        - Higher liquidity => larger slices
        """
        volatility_factor = 1.0 / (1.0 + current_volatility / self.volatility_threshold)
        liquidity_factor = min(1.0, current_liquidity / 1000.0)  # Assuming 1000 is baseline liquidity
        
        return self.config.slice_quantity * volatility_factor * liquidity_factor
    
    def get_next_slice(self, current_time: datetime, 
                       volatility: float = None,
                       liquidity: float = None) -> Tuple[float, datetime]:
        """Get next slice with dynamic adjustment."""
        if volatility is not None and liquidity is not None:
            adjusted_qty = self.adjust_slice_size(volatility, liquidity)
            return adjusted_qty, super().get_next_slice(current_time)[1]
        return super().get_next_slice(current_time)
```

### VWAP Implementation

```python
from dataclasses import dataclass
from typing import List, Tuple
import numpy as np


@dataclass
class VWAPHistory:
    """Historical volume-weighted data."""
    prices: List[float]
    volumes: List[float]
    
    @property
    def vwap(self) -> float:
        """Calculate VWAP from price-volume pairs."""
        if not self.prices or not self.volumes:
            return 0.0
        
        total_pv = sum(p * v for p, v in zip(self.prices, self.volumes))
        total_volume = sum(self.volumes)
        
        return total_pv / total_volume if total_volume > 0 else 0.0


class VWAPCalculator:
    """Calculate VWAP for a given time period."""
    
    def __init__(self, window_minutes: int = 30):
        self.window_minutes = window_minutes
        self.price_history: List[float] = []
        self.volume_history: List[float] = []
    
    def update(self, price: float, volume: float):
        """Add new price-volume data point."""
        self.price_history.append(price)
        self.volume_history.append(volume)
    
    def calculate_vwap(self) -> float:
        """Calculate current VWAP."""
        if not self.price_history or not self.volume_history:
            return 0.0
        
        return sum(p * v for p, v in zip(self.price_history, self.volume_history)) / sum(self.volume_history)
    
    def get_vwap_history(self) -> List[float]:
        """Get rolling VWAP values."""
        vwap_values = []
        window_size = min(self.window_minutes, len(self.price_history))
        
        for i in range(window_size, len(self.price_history) + 1):
            window_prices = self.price_history[i - window_size:i]
            window_volumes = self.volume_history[i - window_size:i]
            
            vwap = sum(p * v for p, v in zip(window_prices, window_volumes)) / sum(window_volumes)
            vwap_values.append(vwap)
        
        return vwap_values


class VWAPExecutor:
    """Execute orders targeting VWAP benchmark."""
    
    def __init__(self, target_vwap: float, total_quantity: float, max_slices: int = 20):
        self.target_vwap = target_vwap
        self.total_quantity = total_quantity
        self.max_slices = max_slices
        self.executed_quantity = 0.0
        self.cumulative_pv = 0.0
        self.cumulative_volume = 0.0
    
    def should_execute(self, current_vwap: float, current_volume: float) -> bool:
        """
        Determine if order should be executed based on VWAP proximity.
        Execute when current VWAP is favorable relative to target.
        """
        if self.executed_quantity >= self.total_quantity:
            return False
        
        # Execute when current VWAP < target (for buying) or > target (for selling)
        # This is a simplified version - real implementation would consider trend
        return abs(current_vwap - self.target_vwap) < 0.005  # 50bps tolerance
    
    def calculate_slice_quantity(self, current_volume: float, 
                                  predicted_volume: float) -> float:
        """Calculate order size proportional to expected volume."""
        expected_total_volume = sum(self.estimated_volumes)
        remaining_volume = sum(self.estimated_volumes[self.current_slice:])
        
        if remaining_volume <= 0:
            return self.total_quantity - self.executed_quantity
        
        volume_ratio = current_volume / predicted_volume if predicted_volume > 0 else 1.0
        remaining_quantity = self.total_quantity - self.executed_quantity
        
        return remaining_quantity * volume_ratio * (1.0 / (self.max_slices - self.current_slice))
    
    def record_fill(self, price: float, quantity: float):
        """Record a fill and update VWAP tracking."""
        self.executed_quantity += quantity
        self.cumulative_pv += price * quantity
        self.cumulative_volume += quantity
    
    @property
    def achieved_vwap(self) -> float:
        """Calculate achieved VWAP."""
        return self.cumulative_pv / self.cumulative_volume if self.cumulative_volume > 0 else 0.0
    
    @property
    def vwap_tracking_error(self) -> float:
        """Calculate tracking error from target."""
        return self.achieved_vwap - self.target_vwap
```

### Implementation Shortfall Algorithm

```python
from dataclasses import dataclass
from datetime import datetime
from typing import List, Tuple
import numpy as np


@dataclass
class DecisionPoint:
    """Record of a trading decision."""
    timestamp: datetime
    decision_price: float
    order_type: str  # 'BUY' or 'SELL'
    quantity: float


@dataclass
class Fill:
    """Record of an executed fill."""
    timestamp: datetime
    price: float
    quantity: float


@dataclass
class ImplementationShortfallResult:
    """Result of implementation shortfall analysis."""
    total_shortfall: float  # VWAP vs decision price
    timing_shortfall: float  # Due to timing
    market_impact: float  # Due to market movement
    execution_cost: float  # Direct costs (fees, slippage)


class ImplementationShortfallAnalyzer:
    """
    Analyze implementation shortfall - the difference between achieved
    execution price and the decision price when order was initiated.
    """
    
    def __init__(self, decision_price: float, order_type: str):
        self.decision_price = decision_price
        self.order_type = order_type
        self.fills: List[Fill] = []
        self.decision_timestamp: datetime = None
    
    def record_decision(self, timestamp: datetime):
        """Record when the trading decision was made."""
        self.decision_timestamp = timestamp
    
    def record_fill(self, timestamp: datetime, price: float, quantity: float):
        """Record an order fill."""
        self.fills.append(Fill(timestamp, price, quantity))
    
    def calculate_total_shortfall(self) -> float:
        """
        Calculate total implementation shortfall.
        Positive = worse than decision price, Negative = better than decision price
        """
        if not self.fills:
            return 0.0
        
        total_value = sum(f.price * f.quantity for f in self.fills)
        total_quantity = sum(f.quantity for f in self.fills)
        avg_execution_price = total_value / total_quantity
        
        # For BUY orders, shortfall is positive if we paid more than decision price
        # For SELL orders, shortfall is positive if we received less than decision price
        if self.order_type == 'BUY':
            return avg_execution_price - self.decision_price
        else:
            return self.decision_price - avg_execution_price
    
    def decompose_shortfall(self, market_prices: List[Tuple[datetime, float]]) -> ImplementationShortfallResult:
        """
        Decompose implementation shortfall into components.
        
        Components:
        - Timing shortfall: Cost of executing over time vs instant execution
        - Market impact: Cost due to order size moving the market
        - Execution cost: Direct costs (fees, spread)
        """
        if not self.fills:
            return ImplementationShortfallResult(0.0, 0.0, 0.0, 0.0)
        
        total_shortfall = self.calculate_total_shortfall()
        
        # Get market price at decision time and at each fill time
        decision_price = self.decision_price
        
        # Calculate timing shortfall (assuming instant execution would be at decision price)
        timing_shortfall = 0.0
        
        # Calculate market impact component
        # This is simplified - real implementation would model order book dynamics
        market_impact = total_shortfall * 0.7  # Estimate 70% is market impact
        
        # Execution cost (fees, spread)
        execution_cost = total_shortfall * 0.3  # Estimate 30% is direct costs
        
        return ImplementationShortfallResult(
            total_shortfall=total_shortfall,
            timing_shortfall=timing_shortfall,
            market_impact=market_impact,
            execution_cost=execution_cost
        )


class OptimizedTWAPExecutor:
    """
    TWAP executor with dynamic order slicing based on market conditions.
    Minimizes implementation shortfall through adaptive execution.
    """
    
    def __init__(self, 
                 total_quantity: float,
                 start_time: datetime,
                 end_time: datetime,
                 decay_factor: float = 0.5):
        self.total_quantity = total_quantity
        self.start_time = start_time
        self.end_time = end_time
        self.decay_factor = decay_factor
        
        self.total_duration = (end_time - start_time).total_seconds()
        self.executed_quantity = 0.0
        self.fills: List[Fill] = []
        self.current_time: datetime = start_time
    
    def calculate_slice_quantity(self, remaining_time: float) -> float:
        """
        Calculate order slice quantity with exponential decay.
        Executes larger slices early, smaller slices later.
        """
        time_remaining_ratio = remaining_time / self.total_duration
        weight = self.decay_factor * time_remaining_ratio + (1 - self.decay_factor)
        remaining_quantity = self.total_quantity - self.executed_quantity
        return remaining_quantity * weight
    
    def execute(self, fill_price: float, fill_quantity: float, fill_time: datetime):
        """Simulate an order execution."""
        self.fills.append(Fill(fill_time, fill_price, fill_quantity))
        self.executed_quantity += fill_quantity
        self.current_time = fill_time
    
    def get_performance_metrics(self, decision_price: float) -> dict:
        """Calculate comprehensive execution performance metrics."""
        if not self.fills:
            return {}
        
        total_value = sum(f.price * f.quantity for f in self.fills)
        total_quantity = sum(f.quantity for f in self.fills)
        avg_price = total_value / total_quantity
        
        shortfall = avg_price - decision_price  # Positive = bad for buy
        
        # Calculate TWAP benchmark
        num_slices = len(self.fills)
        twap_price = sum(f.price for f in self.fills) / num_slices if num_slices > 0 else 0
        
        return {
            'total_quantity': total_quantity,
            'avg_execution_price': avg_price,
            'twap_benchmark': twap_price,
            'implementation_shortfall': shortfall,
            'fill_count': num_slices,
            'execution_time': (self.current_time - self.start_time).total_seconds()
        }
```

### Order Splitting Strategy

```python
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Tuple
import numpy as np


@dataclass
class OrderContext:
    """Context for order splitting decision."""
    total_quantity: float
    start_time: datetime
    end_time: datetime
    market_volatility: float  # Standard deviation of returns
    liquidity_score: float  # 0-1 score of market liquidity
    order_type: str = 'BUY'
    urgency: float = 0.5  # 0=passive, 1=aggressive


class OrderSplitter:
    """
    Dynamic order splitting based on market conditions.
    Balances execution speed against market impact.
    """
    
    def __init__(self, 
                 max_slices: int = 50,
                 min_slice_size: float = 0.0):
        self.max_slices = max_slices
        self.min_slice_size = min_slice_size
    
    def calculate_slices(self, context: OrderContext) -> List[Tuple[float, datetime]]:
        """
        Calculate optimal order slices.
        
        Uses adaptive algorithm that considers:
        - Market volatility (lower volatility = larger slices)
        - Liquidity (higher liquidity = larger slices)
        - Urgency (higher urgency = earlier execution)
        """
        if context.total_quantity <= 0:
            return []
        
        total_duration = (context.end_time - context.start_time).total_seconds()
        
        # Calculate dynamic slice sizes based on market conditions
        volatility_factor = 1.0 / (1.0 + context.market_volatility)
        liquidity_factor = 0.5 + 0.5 * context.liquidity_score
        
        # Determine number of slices
        num_slices = max(1, min(
            self.max_slices,
            int(self.max_slices * volatility_factor * liquidity_factor)
        ))
        
        # Calculate time spacing between slices
        base_interval = total_duration / num_slices
        
        slices = []
        remaining_quantity = context.total_quantity
        current_time = context.start_time
        
        for i in range(num_slices):
            # Calculate slice size
            if i == num_slices - 1:
                slice_quantity = remaining_quantity
            else:
                # Proportional to urgency and market conditions
                slice_weight = 1.0 / (i + 1)  # Larger early, smaller later
                base_slice_size = remaining_quantity / (num_slices - i)
                slice_quantity = base_slice_size * slice_weight * volatility_factor * liquidity_factor
            
            slice_quantity = max(self.min_slice_size, min(slice_quantity, remaining_quantity))
            
            # Apply urgency adjustment
            if context.urgency > 0.5:
                # More aggressive: execute earlier slices faster
                time_adjustment = (context.urgency - 0.5) * base_interval * (num_slices - i) / num_slices
            else:
                # More passive: stretch execution
                time_adjustment = -(0.5 - context.urgency) * base_interval * i / num_slices
            
            slice_time = current_time + timedelta(seconds=max(0, i * base_interval + time_adjustment))
            slice_time = min(slice_time, context.end_time)
            
            slices.append((slice_quantity, slice_time))
            remaining_quantity -= slice_quantity
            current_time = slice_time
        
        return slices
    
    def calculate_expected_impact(self, slices: List[Tuple[float, datetime]], 
                                   market_impact_coeff: float = 0.0001) -> float:
        """
        Estimate market impact of order execution.
        
        Impact scales with slice size squared (due to order book dynamics).
        """
        total_impact = 0.0
        for quantity, _ in slices:
            impact = market_impact_coeff * (quantity ** 2)
            total_impact += impact
        return total_impact


class VolumeProfileSplitter(OrderSplitter):
    """
    Split orders based on historical volume profile.
    Matches execution to typical market activity patterns.
    """
    
    def __init__(self, volume_profile: dict, **kwargs):
        """
        Initialize with volume profile.
        
        volume_profile: dict mapping time-of-day (minutes from midnight) to relative volume
        Example: {570: 1.2, 600: 1.5, ...} where 570 = 9:30 AM
        """
        super().__init__(**kwargs)
        self.volume_profile = volume_profile
        self.normalized_profile = self._normalize_profile(volume_profile)
    
    def _normalize_profile(self, profile: dict) -> dict:
        """Normalize volume profile to sum to 1."""
        total_volume = sum(profile.values())
        return {k: v / total_volume for k, v in profile.items()}
    
    def get_volume_ratio(self, time_of_day: datetime) -> float:
        """Get relative volume at a given time."""
        minutes = time_of_day.hour * 60 + time_of_day.minute
        
        # Find closest time point in profile
        closest_time = min(self.normalized_profile.keys(), 
                          key=lambda t: abs(t - minutes))
        return self.normalized_profile[closest_time]
    
    def calculate_slices(self, context: OrderContext) -> List[Tuple[float, datetime]]:
        """Calculate slices following volume profile."""
        base_slices = super().calculate_slices(context)
        
        # Adjust slice timing and sizes based on volume profile
        adjusted_slices = []
        for quantity, time in base_slices:
            volume_ratio = self.get_volume_ratio(time)
            
            # Increase slice size during high volume periods
            adjusted_quantity = quantity * (1 + 0.5 * volume_ratio)
            adjusted_quantity = min(adjusted_quantity, context.total_quantity - sum(q for q, _ in adjusted_slices))
            
            adjusted_slices.append((adjusted_quantity, time))
        
        return adjusted_slices
```

## Adherence Checklist

Before completing your task, verify:
- [ ] **Guard Clauses**: All edge cases (zero quantity, division by zero, invalid timestamps) handled at function top with early returns
- [ ] **Parsed State**: Input data (prices, volumes) validated and converted to trusted types at boundary
- [ ] **Atomic Predictability**: Execution algorithms return consistent results for same inputs; no hidden mutations
- [ ] **Fail Fast**: Invalid order parameters (negative quantity, end_before_start) throw descriptive errors
- [ ] **Intentional Naming**: Functions use clear names like `calculate_implementation_shortfall`, `adjust_slice_size`

## Common Mistakes to Avoid

1. **Static Slice Sizes**: Using equal-sized slices regardless of market conditions leads to poor execution in volatile markets.

2. **Ignoring Volatility**: Not adjusting execution speed based on volatility causes either excessive market impact (too fast in volatile markets) or missed opportunities (too slow in calm markets).

3. **Incomplete Performance Tracking**: Not recording all fills with timestamps makes it impossible to analyze implementation shortfall accurately.

4. **Overfitting to Historical Data**: Using past VWAP profiles without considering regime changes leads to poor out-of-sample performance.

5. **Neglecting Fees**: Failing to account for maker/taker fees in order splitting decisions can result in net losses despite good price execution.

## References

1. Almgren, R. (2003). "Optimal Execution of Portfolio Transactions". *Journal of Trading*.
2. Bertsimas, D., & Lo, A. (1998). "Optimal Control of Execution Costs". *Journal of Financial Markets*.
3. Pastorello, S., et al. (2016). "TWAP vs. VWAP: A Comparative Study". *Journal of Portfolio Management*.
4. Cont, R., & de Larrard, A. (2013). "Price Impact in Limit Order Markets". *Mathematical Finance*.


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.
