---
name: trading-paper-fill-simulation
description: Fill Simulation Models for Order Execution Probability
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: execution, models, order, paper fill simulation, paper-fill-simulation
---


**Role:** Fill Simulation Engineer — implements sophisticated models for predicting order fill probability, partial fills, and execution quality under realistic market conditions.

**Philosophy:** Probabilistic Execution — order fills are uncertain events subject to market liquidity, order book dynamics, and timing; simulation should model these probabilities to provide realistic performance expectations.

## Key Principles

1. **Fill Probability Modeling**: Estimate probability of full fill, partial fill, or no fill based on order size, market liquidity, and order type.

2. **Partial Fill Dynamics**: Model partial fills and their impact on portfolio exposure and risk.

3. **Order Book Depth Analysis**: Simulate fill based on available liquidity at each price level.

4. **Time-Based Fill Modeling**: Account for fill probability over time (market hours, volatility periods).

5. **Fill Quality Metrics**: Track fill quality (slippage, execution time) for performance analysis.

## Implementation Guidelines

### Structure
- Core logic: `skills/paper-trading/fill_simulator.py`
- Order book models: `skills/paper-trading/order_book.py`
- Tests: `skills/tests/test_fill_simulation.py`

### Patterns to Follow
- Use probability distributions for fill modeling
- Implement order book depth analysis
- Track fill timing and partial fills
- Separate fill simulation from order placement
- Use Monte Carlo methods for complex fill scenarios

## Code Examples

### Fill Probability Model

```python
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
from enum import Enum
import numpy as np
import pandas as pd
from scipy import stats
from collections import defaultdict


class OrderStatus(Enum):
    """Order status enumeration."""
    PENDING = "pending"
    PARTIAL = "partial"
    FILLED = "filled"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


@dataclass
class OrderBookLevel:
    """Single level in order book."""
    price: float
    quantity: float
    count: int  # Number of orders at this level


@dataclass
class OrderBook:
    """Complete order book state."""
    bids: List[OrderBookLevel]  # Buy orders (descending price)
    asks: List[OrderBookLevel]  # Sell orders (ascending price)
    mid_price: float
    spread: float
    timestamp: pd.Timestamp


class FillProbabilityModel:
    """
    Models fill probability for orders based on market conditions.
    """
    
    def __init__(self,
                 min_fill_probability: float = 0.1,
                 max_fill_probability: float = 0.99,
                 liquidity_threshold: float = 100,
                 volatility_factor: float = 0.5):
        self.min_fill_probability = min_fill_probability
        self.max_fill_probability = max_fill_probability
        self.liquidity_threshold = liquidity_threshold
        self.volatility_factor = volatility_factor
    
    def calculate_base_fill_probability(self, order_size: float,
                                       liquidity: float,
                                       spread: float) -> float:
        """
        Calculate base fill probability based on order size and liquidity.
        
        Fills are more likely when:
        - Order size is small relative to liquidity
        - Spread is narrow (tight market)
        """
        if liquidity == 0:
            return self.min_fill_probability
        
        # Size ratio: how large is order relative to liquidity
        size_ratio = order_size / liquidity
        
        # Base probability declines with size ratio
        if size_ratio < 0.1:
            base_prob = 0.95
        elif size_ratio < 0.25:
            base_prob = 0.85
        elif size_ratio < 0.5:
            base_prob = 0.70
        elif size_ratio < 1.0:
            base_prob = 0.50
        else:
            base_prob = 0.30
        
        # Adjust for spread (tighter spread = higher probability)
        spread_adjustment = 1.0 - (spread / 0.01) * 0.2
        spread_adjustment = max(0.8, min(1.0, spread_adjustment))
        
        return max(self.min_fill_probability, min(self.max_fill_probability, base_prob * spread_adjustment))
    
    def calculate_time_based_probability(self, order_age: float,
                                        time_window: float,
                                        volatility: float) -> float:
        """
        Calculate time-based fill probability.
        
        Orders have higher fill probability as they age,
        but volatility can reduce fill probability.
        """
        # Base probability increases with time (up to time_window)
        time_factor = min(1.0, order_age / time_window)
        
        # Volatility reduces probability
        volatility_adjustment = max(0.5, 1.0 - self.volatility_factor * volatility)
        
        return time_factor * volatility_adjustment
    
    def calculate_liquidation_probability(self, order_size: float,
                                         order_book: OrderBook,
                                         side: str) -> Tuple[float, float]:
        """
        Calculate probability of filling order by liquidating available depth.
        
        Returns (fill_probability, expected_fill_quantity).
        """
        if order_book is None:
            return self.min_fill_probability, 0.0
        
        # Get available liquidity in the direction of the order
        if side == "buy":
            levels = order_book.asks
        else:
            levels = order_book.bids
        
        # Calculate cumulative liquidity
        cumulative_liquidity = 0.0
        fill_probabilities = []
        
        for level in levels:
            cumulative_liquidity += level.quantity
            
            # Probability of filling this level
            if order_size <= cumulative_liquidity:
                # Can fill completely within this level
                remaining = order_size - (cumulative_liquidity - level.quantity)
                prob = remaining / level.quantity if level.quantity > 0 else 0
                fill_probabilities.append(prob)
                break
            else:
                # Will fill this entire level
                fill_probabilities.append(1.0)
        
        # Overall fill probability
        if not fill_probabilities:
            return self.min_fill_probability, 0.0
        
        # Combined probability (all levels must fill sequentially)
        combined_prob = 1.0
        for prob in fill_probabilities:
            combined_prob *= prob
        
        # Expected fill quantity
        expected_fill = min(order_size, sum(level.quantity for level in levels))
        
        return max(self.min_fill_probability, combined_prob), expected_fill
    
    def simulate_fill(self, order_size: float, order_book: OrderBook,
                     side: str, time_window: float = 3600,
                     volatility: float = 0.02) -> Dict:
        """
        Simulate order fill with Monte Carlo approach.
        
        Returns dict with:
        - filled: Whether order was filled
        - fill_quantity: Quantity actually filled
        - fill_probability: Estimated fill probability
        - expected_slippage: Expected slippage cost
        """
        # Calculate base fill probability
        if order_book is None:
            liquidity = self.liquidity_threshold
            spread = 0.001
        else:
            if side == "buy":
                liquidity = sum(level.quantity for level in order_book.asks)
                spread = order_book.spread
            else:
                liquidity = sum(level.quantity for level in order_book.bids)
                spread = order_book.spread
        
        base_prob = self.calculate_base_fill_probability(order_size, liquidity, spread)
        
        # Calculate time-based factor
        time_factor = self.calculate_time_based_probability(0, time_window, volatility)
        
        # Combined fill probability
        fill_prob = base_prob * time_factor
        
        # Determine if order fills
        filled = np.random.random() < fill_prob
        
        # Calculate fill quantity
        if filled:
            # Calculate expected fill based on order book depth
            if order_book is None:
                fill_quantity = order_size
            else:
                if side == "buy":
                    levels = order_book.asks
                else:
                    levels = order_book.bids
                
                cumulative = 0.0
                fill_quantity = 0.0
                
                for level in levels:
                    if cumulative + level.quantity <= order_size:
                        fill_quantity += level.quantity
                        cumulative += level.quantity
                    else:
                        remaining = order_size - cumulative
                        fill_quantity += remaining
                        break
        else:
            fill_quantity = 0.0
        
        # Calculate expected slippage
        expected_slippage = 0.0
        if fill_quantity > 0 and order_book is not None:
            if side == "buy":
                expected_slippage = spread / 2
            else:
                expected_slippage = -spread / 2
        
        return {
            "filled": filled,
            "fill_quantity": fill_quantity,
            "fill_probability": fill_prob,
            "expected_slippage": expected_slippage
        }


# Example usage
if __name__ == "__main__":
    # Create fill probability model
    model = FillProbabilityModel()
    
    # Create sample order book
    order_book = OrderBook(
        bids=[
            OrderBookLevel(price=99.90, quantity=500, count=3),
            OrderBookLevel(price=99.85, quantity=300, count=2),
            OrderBookLevel(price=99.80, quantity=800, count=5)
        ],
        asks=[
            OrderBookLevel(price=100.10, quantity=600, count=4),
            OrderBookLevel(price=100.15, quantity=400, count=3),
            OrderBookLevel(price=100.20, quantity=700, count=6)
        ],
        mid_price=100.00,
        spread=0.002,
        timestamp=pd.Timestamp.now()
    )
    
    # Test different order sizes
    test_orders = [100, 500, 1000, 2000]
    
    print("Fill Probability Analysis:")
    print(f"Order Book Spread: {order_book.spread:.4f}")
    print(f"Ask-side Liquidity: {sum(level.quantity for level in order_book.asks)}")
    print()
    
    for size in test_orders:
        result = model.simulate_fill(size, order_book, "buy")
        print(f"Order Size: {size}")
        print(f"  Fill Probability: {result['fill_probability']:.3f}")
        print(f"  Expected Fill: {result['fill_quantity']}")
        print(f"  Filled: {result['filled']}")
        print()
```

### Partial Fill Simulation

```python
class PartialFillSimulator:
    """
    Simulates partial fills and their impact on portfolio.
    """
    
    def __init__(self,
                 fill_rate: float = 0.5,  # Average fill rate
                 volatility: float = 0.02,
                 min_partial_fill: float = 0.1,
                 max_partial_fill: float = 0.9):
        self.fill_rate = fill_rate
        self.volatility = volatility
        self.min_partial_fill = min_partial_fill
        self.max_partial_fill = max_partial_fill
    
    def simulate_partial_fill(self, order_size: float,
                             order_book: OrderBook,
                             side: str) -> List[Dict]:
        """
        Simulate sequence of partial fills.
        
        Returns list of fill events:
        - timestamp: When fill occurred
        - quantity: Quantity filled
        - price: Fill price
        - cumulative_quantity: Running total filled
        - remaining_quantity: Quantity still to fill
        """
        fills = []
        remaining = order_size
        cumulative = 0.0
        current_time = pd.Timestamp.now()
        
        while remaining > 0:
            # Simulate next fill
            fill_size = self._simulate_single_fill(remaining, order_book, side)
            
            if fill_size <= 0:
                break
            
            # Calculate fill price based on order book
            if side == "buy":
                price = self._get_ask_price(order_book, cumulative)
            else:
                price = self._get_bid_price(order_book, cumulative)
            
            fills.append({
                "timestamp": current_time,
                "quantity": fill_size,
                "price": price,
                "cumulative_quantity": cumulative + fill_size,
                "remaining_quantity": remaining - fill_size
            })
            
            cumulative += fill_size
            remaining -= fill_size
            current_time += pd.Timedelta(seconds=np.random.exponential(10))
        
        return fills
    
    def _simulate_single_fill(self, remaining: float,
                             order_book: OrderBook,
                             side: str) -> float:
        """Simulate a single partial fill."""
        if order_book is None:
            return remaining * np.random.uniform(0.3, 0.8)
        
        # Get available liquidity
        if side == "buy":
            levels = order_book.asks
        else:
            levels = order_book.bids
        
        # Find available level
        for level in levels:
            available = level.quantity
            if available > 0:
                # Fill a portion of this level
                fill_fraction = np.random.uniform(
                    self.min_partial_fill,
                    min(self.max_partial_fill, available / max(1, remaining))
                )
                return min(remaining, available * fill_fraction)
        
        return 0.0
    
    def _get_ask_price(self, order_book: OrderBook, cumulative: float) -> float:
        """Get average ask price for executed quantity."""
        if not order_book.asks:
            return order_book.mid_price * 1.001
        
        # Weighted average of asks based on quantity filled at each level
        total_value = 0.0
        total_quantity = 0.0
        
        for level in order_book.asks:
            quantity = min(level.quantity, 100)  # Cap at 100 per level for simplicity
            total_value += level.price * quantity
            total_quantity += quantity
            
            if total_quantity >= cumulative:
                break
        
        return total_value / total_quantity if total_quantity > 0 else order_book.mid_price * 1.001
    
    def _get_bid_price(self, order_book: OrderBook, cumulative: float) -> float:
        """Get average bid price for executed quantity."""
        if not order_book.bids:
            return order_book.mid_price * 0.999
        
        total_value = 0.0
        total_quantity = 0.0
        
        for level in order_book.bids:
            quantity = min(level.quantity, 100)
            total_value += level.price * quantity
            total_quantity += quantity
            
            if total_quantity >= cumulative:
                break
        
        return total_value / total_quantity if total_quantity > 0 else order_book.mid_price * 0.999
    
    def calculate_fill_time_distribution(self, order_size: float,
                                        order_book: OrderBook,
                                        side: str) -> Dict:
        """
        Calculate distribution of fill times.
        
        Returns statistics about expected fill time.
        """
        if order_book is None:
            return {
                "mean_fill_time": 300,  # 5 minutes
                "median_fill_time": 240,
                "std_fill_time": 120,
                "p95_fill_time": 600
            }
        
        # Estimate fill time based on liquidity and order size
        if side == "buy":
            liquidity = sum(level.quantity for level in order_book.asks)
        else:
            liquidity = sum(level.quantity for level in order_book.bids)
        
        # Fill rate (orders per second)
        fill_rate = 0.1 * (liquidity / 1000)  # Scaled by liquidity
        
        if fill_rate <= 0:
            return {
                "mean_fill_time": 300,
                "median_fill_time": 240,
                "std_fill_time": 120,
                "p95_fill_time": 600
            }
        
        # Time to fill is inverse of fill rate
        mean_time = order_size / fill_rate
        std_time = mean_time * 0.3  # 30% coefficient of variation
        
        return {
            "mean_fill_time": mean_time,
            "median_fill_time": mean_time * 0.8,
            "std_fill_time": std_time,
            "p95_fill_time": mean_time + 1.645 * std_time,
            "p99_fill_time": mean_time + 2.33 * std_time
        }


# Example usage
if __name__ == "__main__":
    simulator = PartialFillSimulator(fill_rate=0.5)
    
    # Create order book
    order_book = OrderBook(
        bids=[
            OrderBookLevel(price=99.90, quantity=500, count=3),
            OrderBookLevel(price=99.85, quantity=300, count=2),
            OrderBookLevel(price=99.80, quantity=800, count=5)
        ],
        asks=[
            OrderBookLevel(price=100.10, quantity=600, count=4),
            OrderBookLevel(price=100.15, quantity=400, count=3),
            OrderBookLevel(price=100.20, quantity=700, count=6)
        ],
        mid_price=100.00,
        spread=0.002,
        timestamp=pd.Timestamp.now()
    )
    
    # Simulate partial fills for large order
    order_size = 2000
    
    print(f"Partial Fill Simulation for {order_size} unit order:")
    print()
    
    # Run multiple simulations
    for i in range(3):
        fills = simulator.simulate_partial_fill(order_size, order_book, "buy")
        
        print(f"Simulation {i+1}:")
        for j, fill in enumerate(fills):
            print(f"  Fill {j+1}: {fill['quantity']} @ {fill['price']:.2f} "
                  f"(cumulative: {fill['cumulative_quantity']}, remaining: {fill['remaining_quantity']})")
        print()
    
    # Time distribution
    time_dist = simulator.calculate_fill_time_distribution(order_size, order_book, "buy")
    
    print("Fill Time Distribution:")
    print(f"  Mean: {time_dist['mean_fill_time']:.1f} seconds")
    print(f"  Median: {time_dist['median_fill_time']:.1f} seconds")
    print(f"  P95: {time_dist['p95_fill_time']:.1f} seconds")
```

### Fill Quality Analysis

```python
class FillQualityAnalyzer:
    """
    Analyzes fill quality for performance attribution.
    """
    
    def __init__(self):
        self.fill_history: List[Dict] = []
    
    def record_fill(self, order_id: int, quantity: float, price: float,
                   market_price: float, timestamp: pd.Timestamp,
                   fill_type: str = "market"):
        """Record a fill for later analysis."""
        slippage = price - market_price
        
        self.fill_history.append({
            "order_id": order_id,
            "quantity": quantity,
            "fill_price": price,
            "market_price": market_price,
            "slippage": slippage,
            "slippage_bps": slippage / market_price * 10000 if market_price > 0 else 0,
            "timestamp": timestamp,
            "fill_type": fill_type
        })
    
    def get_fill_quality_metrics(self) -> Dict:
        """Calculate fill quality metrics."""
        if not self.fill_history:
            return {}
        
        df = pd.DataFrame(self.fill_history)
        
        # Basic statistics
        avg_slippage = df["slippage_bps"].mean()
        avg_slippage_std = df["slippage_bps"].std()
        
        # Directional slippage
        buy_slippage = df[df["slippage"] > 0]["slippage_bps"].mean() if len(df[df["slippage"] > 0]) > 0 else 0
        sell_slippage = df[df["slippage"] < 0]["slippage_bps"].mean() if len(df[df["slippage"] < 0]) > 0 else 0
        
        # Percentages
        full_fills = (df["quantity"] > 0).sum()
        total_fills = len(df)
        fill_rate = full_fills / total_fills if total_fills > 0 else 0
        
        # Execution time analysis (if available)
        if "duration" in df.columns:
            avg_duration = df["duration"].mean()
            max_duration = df["duration"].max()
        else:
            avg_duration = 0
            max_duration = 0
        
        return {
            "avg_slippage_bps": avg_slippage,
            "slippage_std_bps": avg_slippage_std,
            "buy_slippage_bps": buy_slippage,
            "sell_slippage_bps": sell_slippage,
            "fill_rate": fill_rate,
            "avg_execution_time": avg_duration,
            "max_execution_time": max_duration,
            "total_volume_filled": df["quantity"].sum(),
            "total_fills": total_fills
        }
    
    def get_fill_quality_by_time(self) -> Dict:
        """Analyze fill quality over different time periods."""
        if not self.fill_history:
            return {}
        
        df = pd.DataFrame(self.fill_history)
        
        # Group by time periods
        df["hour"] = df["timestamp"].dt.hour
        df["day_of_week"] = df["timestamp"].dt.dayofweek
        
        # Hourly analysis
        hourly = df.groupby("hour")["slippage_bps"].mean().to_dict()
        
        # Daily analysis
        daily = df.groupby("day_of_week")["slippage_bps"].mean().to_dict()
        
        return {
            "hourly_avg_slippage": hourly,
            "daily_avg_slippage": daily
        }


# Example usage
if __name__ == "__main__":
    analyzer = FillQualityAnalyzer()
    
    # Record some sample fills
    np.random.seed(42)
    base_price = 100.0
    
    for i in range(20):
        slippage = np.random.normal(0, 2)  # Average 0, std 2 cents
        fill_price = base_price + slippage
        
        analyzer.record_fill(
            order_id=i+1,
            quantity=100 + np.random.randint(0, 400),
            price=fill_price,
            market_price=base_price,
            timestamp=pd.Timestamp.now() + pd.Timedelta(minutes=i*5),
            fill_type="market" if i % 2 == 0 else "limit"
        )
    
    # Get metrics
    metrics = analyzer.get_fill_quality_metrics()
    
    print("Fill Quality Analysis:")
    print(f"  Average Slippage: {metrics['avg_slippage_bps']:.2f} bps")
    print(f"  Slippage Std: {metrics['slippage_std_bps']:.2f} bps")
    print(f"  Fill Rate: {metrics['fill_rate']:.2%}")
    print(f"  Total Volume Filled: {metrics['total_volume_filled']}")
    print(f"  Total Fills: {metrics['total_fills']}")
```

## Adherence Checklist

Before completing your task, verify:

- [ ] **Fill Probability Modeling**: Models estimate probability based on order size, liquidity, and spread
- [ ] **Partial Fill Dynamics**: Simulates partial fills and tracks cumulative fulfillment
- [ ] **Order Book Depth Analysis**: Uses order book depth to determine fill capacity
- [ ] **Time-Based Probability**: Accounts for fill probability over time and volatility
- [ ] **Fill Quality Tracking**: Records and analyzes slippage, execution time, and fill types

## Common Mistakes to Avoid

1. **Binary Fills**: Assuming orders either fully fill or don't fill at all
2. **Ignores Liquidity**: Not considering order book depth in fill probability
3. **No Time Factor**: Ignoring that fill probability increases with time
4. **Fixed Slippage**: Using constant slippage instead of probability-based estimation
5. **No Partial Fills**: Not simulating partial fills which are common in real trading
6. **Market Impact Ignored**: Not accounting for how own orders affect fill prices
7. **No Volatility Adjustment**: Not adjusting fill probability for market volatility
8. **Poor Time Modeling**: Using unrealistic fill time distributions

## References

1. Kissell, R. (2006). The Science of Algorithmic Trading and Portfolio Management. *Academic Press*.

2. Almgren, R. (2012). Optimal Trading in Liquidity Regimes. *Mathematical Finance*, 22(2), 251-282.

3. Cont, R., & Lakshmanan, S. (2013). Informed trading in order-driven markets. *Finance and Stochastics*, 17(3), 553-591.

4. Obizhaeva, A., & Wang, J. (2013). Optimal Trading Execution and Market Manipulation. *Journal of Financial Markets*, 16(3), 519-555.

5. Bershatsky, A. (2019). *High-Frequency Trading and Liquidity Provision*. CRC Press.

---

Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.
