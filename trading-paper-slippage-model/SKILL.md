---
name: trading-paper-slippage-model
description: Slippage Modeling and Execution Simulation
---

**Role:** Execution Quality Specialist — implements comprehensive slippage models to simulate real-world execution quality, accounting for market impact, liquidity constraints, and order flow dynamics.

**Philosophy:** Realistic Simulation — paper trading must mirror live execution quality; ignoring slippage or using simplistic models produces misleading performance metrics that fail to predict live trading outcomes.

## Key Principles

1. **Slippage Sources**: Slippage arises from multiple sources: bid-ask spread, market impact, liquidity provision, and order type; all should be modeled accurately.

2. **Historical Analysis**: Slippage should be analyzed from historical execution data to calibrate models to actual market conditions and instrument characteristics.

3. **Order Size Dependence**: Slippage scales non-linearly with order size; small orders have minimal slippage while large orders face significant impact.

4. **Time-of-Day Effects**: Slippage varies significantly by time of day due to liquidity patterns; models must account for intraday liquidity cycles.

5. **VWAP Comparison**: Slippage should be measured relative to VWAP rather than just execution price to properly assess execution quality.

## Implementation Guidelines

### Structure
- Core logic: `skills/paper-trading/slippage_model.py`
- Historical analysis: `skills/paper-trading/slippage_analysis.py`
- Tests: `skills/tests/test_slippage_model.py`

### Patterns to Follow
- Implement slippage as a configurable model with multiple components
- Support both deterministic and stochastic slippage models
- Include historical slippage analysis and calibration
- Provide execution simulation with realistic timing
- Use vectorized operations for efficient batch simulations

## Adherence Checklist
Before completing your task, verify:
- [ ] **Bid-Ask Component**: Is the bid-ask spread properly modeled for each instrument?
- [ ] **Market Impact**: Does the model include order-size-dependent market impact?
- [ ] **Liquidity Adjustment**: Are slippage estimates adjusted for instrument liquidity?
- [ ] **Time-of-Day Effects**: Does the model account for intraday liquidity variations?
- [ ] **VWAP Reference**: Is slippage measured relative to VWAP, not just spot price?

## Code Examples

### Slippage Model with Multiple Components

```python
from dataclasses import dataclass
from typing import List, Tuple, Dict, Optional
import numpy as np
import pandas as pd
from enum import Enum
from datetime import datetime, time


class SlippageComponent(Enum):
    """Components of slippage."""
    BID_ASK = "bid_ask"
    MARKET_IMPACT = "market_impact"
    LIQUIDITY = "liquidity"
    TIME_OF_DAY = "time_of_day"
    ORDER_TYPE = "order_type"


@dataclass
class SlippageParameters:
    """Parameters for slippage model."""
    bid_ask_spread: float  # As fraction of price (e.g., 0.0001 = 10 bps)
    market_impact_coeff: float  # Coefficient for order-size impact
    liquidity_factor: float  # Inverse liquidity multiplier
    intraday_multiplier: float  # Intraday liquidity multiplier
    order_type_modifier: float  # Adjust based on order type
    
    @classmethod
    def default(cls) -> 'SlippageParameters':
        return cls(
            bid_ask_spread=0.0001,
            market_impact_coeff=0.00005,
            liquidity_factor=1.0,
            intraday_multiplier=1.0,
            order_type_modifier=1.0
        )


@dataclass
class SlippageResult:
    """Result of slippage calculation."""
    total_slippage: float
    bid_ask_component: float
    market_impact_component: float
    liquidity_component: float
    time_of_day_component: float
    order_type_component: float
    execution_price: float
    reference_price: float
    slippage_bps: float
    execution_quality: str


class SlippageModel:
    """
    Comprehensive slippage model with multiple components.
    Models bid-ask spread, market impact, liquidity effects, and intraday variation.
    """
    
    def __init__(self, 
                 parameters: Optional[SlippageParameters] = None,
                 instrument_liquidity: float = 1.0):
        """
        Initialize slippage model.
        
        Args:
            parameters: Slippage parameters (uses defaults if not provided)
            instrument_liquidity: Instrument liquidity factor (1.0 = average)
        """
        self.parameters = parameters or SlippageParameters.default()
        self.instrument_liquidity = instrument_liquidity
    
    def calculate_slippage(self,
                           order_size: float,
                           order_type: str,
                           reference_price: float,
                           execution_time: Optional[datetime] = None,
                           market_volume: Optional[float] = None,
                           avg_daily_volume: float = 1000000) -> SlippageResult:
        """
        Calculate total slippage for an order.
        
        Args:
            order_size: Size of the order (positive = buy, negative = sell)
            order_type: Type of order ('market', 'limit', 'stop')
            reference_price: Reference price (e.g., VWAP)
            execution_time: Optional execution time for intraday effects
            market_volume: Optional current market volume
            avg_daily_volume: Average daily volume for normalization
            
        Returns:
            SlippageResult with all components
        """
        # Determine direction
        is_buy = order_size > 0
        order_size_abs = abs(order_size)
        
        # 1. Bid-Ask Spread Component
        # Half spread is typical for market orders
        bid_ask_component = self.parameters.bid_ask_spread / 2
        if order_type == 'limit':
            bid_ask_component *= 0.1  # Much less for limit orders
        
        # Direction adjustment
        if is_buy:
            bid_ask_component = abs(bid_ask_component)
        else:
            bid_ask_component = -abs(bid_ask_component)
        
        # 2. Market Impact Component
        # Order size impact scales non-linearly
        # Impact = coefficient * (order_size / ADV)^exponent
        volume_ratio = order_size_abs / avg_daily_volume if avg_daily_volume > 0 else 1
        volume_ratio = min(volume_ratio, 1.0)  # Cap at 100% of ADV
        
        exponent = 1.5  # Typical exponent for market impact
        market_impact = self.parameters.market_impact_coeff * (
            volume_ratio ** exponent
        )
        
        # Direction adjustment
        if is_buy:
            market_impact = abs(market_impact)
        else:
            market_impact = -abs(market_impact)
        
        # 3. Liquidity Component
        # Adjust based on instrument liquidity
        liquidity_component = (
            self.parameters.liquidity_factor / self.instrument_liquidity - 1
        ) * 0.0001  # Typical liquidity adjustment
        
        # Direction adjustment (larger orders in low liquidity face more impact)
        liquidity_component *= (1 + volume_ratio * 0.5)
        
        if is_buy:
            liquidity_component = abs(liquidity_component)
        else:
            liquidity_component = -abs(liquidity_component)
        
        # 4. Time-of-Day Component
        # Adjust based on intraday liquidity patterns
        time_of_day_component = 0.0
        
        if execution_time is not None:
            hour = execution_time.hour
            minute = execution_time.minute
            
            # Calculate minutes from market open (9:30 AM EST = 570 minutes)
            market_open_minutes = 9 * 60 + 30
            market_close_minutes = 16 * 60
            current_minutes = hour * 60 + minute
            
            minutes_since_open = max(0, current_minutes - market_open_minutes)
            minutes_before_close = max(0, market_close_minutes - current_minutes)
            
            # Intraday pattern: higher slippage at open and close
            if minutes_since_open < 30:
                time_of_day_component = 0.0002  # Higher slippage at open
            elif minutes_before_close < 30:
                time_of_day_component = 0.00015  # Higher slippage at close
            else:
                # Midday has lower slippage
                time_of_day_component = 0.00005
        
        # Apply intraday multiplier from parameters
        time_of_day_component *= self.parameters.intraday_multiplier
        
        # 5. Order Type Component
        order_component = 0.0
        if order_type == 'market':
            order_component = 0.0  # Market orders already include spread
        elif order_type == 'limit':
            order_component = -0.00003  # Slight benefit for limit orders
        elif order_type == 'stop':
            order_component = 0.0001  # Higher slippage for stop orders
        
        # Apply order type modifier
        order_component *= self.parameters.order_type_modifier
        
        # Calculate total slippage
        total_slippage = (
            bid_ask_component +
            market_impact +
            liquidity_component +
            time_of_day_component +
            order_component
        )
        
        # Calculate execution price
        execution_price = reference_price * (1 + total_slippage)
        
        # Convert to basis points
        slippage_bps = total_slippage * 10000
        
        # Determine execution quality
        if slippage_bps < -5:
            quality = "Excellent"
        elif slippage_bps < 0:
            quality = "Good"
        elif slippage_bps < 5:
            quality = "Average"
        elif slippage_bps < 10:
            quality = "Poor"
        else:
            quality = "Very Poor"
        
        return SlippageResult(
            total_slippage=total_slippage,
            bid_ask_component=bid_ask_component,
            market_impact_component=market_impact,
            liquidity_component=liquidity_component,
            time_of_day_component=time_of_day_component,
            order_type_component=order_component,
            execution_price=execution_price,
            reference_price=reference_price,
            slippage_bps=slippage_bps,
            execution_quality=quality
        )
    
    def simulate_execution(self,
                           order_size: float,
                           reference_price: float,
                           execution_time: Optional[datetime] = None,
                           market_conditions: Optional[Dict] = None) -> Dict:
        """
        Simulate full execution process with realistic timing.
        
        Args:
            order_size: Size of the order
            reference_price: Reference price for execution
            execution_time: Time of execution
            market_conditions: Optional market conditions dict
            
        Returns:
            Dictionary with execution simulation results
        """
        market_conditions = market_conditions or {}
        
        # Default market conditions
        avg_daily_volume = market_conditions.get('adv', 1000000)
        instrument_liquidity = market_conditions.get('liquidity', 1.0)
        current_volume = market_conditions.get('current_volume', avg_daily_volume / 260)
        
        # Calculate slippage
        result = self.calculate_slippage(
            order_size=order_size,
            order_type=market_conditions.get('order_type', 'market'),
            reference_price=reference_price,
            execution_time=execution_time,
            market_volume=current_volume,
            avg_daily_volume=avg_daily_volume
        )
        
        # Add execution timing
        execution_delay_ms = np.random.exponential(50)  # Exponential delay
        
        return {
            "order_size": order_size,
            "reference_price": reference_price,
            "execution_price": result.execution_price,
            "slippage_bps": result.slippage_bps,
            "execution_quality": result.execution_quality,
            "execution_delay_ms": execution_delay_ms,
            "components": {
                "bid_ask": result.bid_ask_component * 10000,
                "market_impact": result.market_impact_component * 10000,
                "liquidity": result.liquidity_component * 10000,
                "time_of_day": result.time_of_day_component * 10000,
                "order_type": result.order_type_component * 10000
            }
        }


# Historical Slippage Analysis
class SlippageAnalyzer:
    """
    Analyze historical slippage data to calibrate models.
    """
    
    def __init__(self, 
                 executions: pd.DataFrame,
                 prices: pd.DataFrame):
        """
        Initialize slippage analyzer.
        
        Args:
            executions: DataFrame of execution history
            prices: DataFrame of price data (VWAP, close, etc.)
        """
        self.executions = executions
        self.prices = prices
    
    def analyze_slippage_distribution(self) -> Dict:
        """
        Analyze historical slippage distribution.
        
        Returns:
            Dictionary with slippage statistics
        """
        # Merge executions with prices
        merged = self.executions.merge(
            self.prices[['timestamp', 'vwap', 'close']],
            left_on='timestamp',
            right_on='timestamp',
            how='left'
        )
        
        # Calculate slippage relative to VWAP
        merged['slippage'] = (merged['execution_price'] - merged['vwap']) / merged['vwap']
        
        # Statistics
        total_slippage = merged['slippage'].mean()
        total_std = merged['slippage'].std()
        percentile_95 = merged['slippage'].quantile(0.95)
        percentile_5 = merged['slippage'].quantile(0.05)
        
        # By order type
        by_type = merged.groupby('order_type')['slippage'].agg(['mean', 'std', 'count'])
        
        # By hour of day
        merged['hour'] = merged['timestamp'].dt.hour
        by_hour = merged.groupby('hour')['slippage'].mean()
        
        return {
            "mean_slippage": total_slippage,
            "std_slippage": total_std,
            "p95_slippage": percentile_95,
            "p5_slippage": percentile_5,
            "by_order_type": by_type.to_dict(),
            "by_hour": by_hour.to_dict(),
            "n_executions": len(merged)
        }
    
    def fit_slippage_model(self) -> SlippageParameters:
        """
        Fit slippage model parameters from historical data.
        
        Returns:
            Fitted SlippageParameters
        """
        analysis = self.analyze_slippage_distribution()
        
        # Estimate bid-ask spread from limit order execution
        limit_orders = self.executions[self.executions['order_type'] == 'limit']
        if len(limit_orders) > 0:
            limit_slippage = abs(limit_orders['slippage']).mean()
            bid_ask_spread = limit_slippage * 2  # Estimate from limit order execution
        else:
            bid_ask_spread = 0.0001  # Default
        
        # Estimate market impact coefficient
        # Slippage ~ coefficient * (order_size / ADV)^1.5
        if 'order_size' in self.executions.columns and 'adv' in self.executions.columns:
            self.executions['size_ratio'] = abs(self.executions['order_size']) / self.executions['adv']
            self.executions['size_ratio'] = self.executions['size_ratio'].clip(0, 1)
            
            # Simple regression estimation
            x = self.executions['size_ratio'] ** 1.5
            y = abs(self.executions['slippage'])
            
            # Linear regression: y = a + b*x
            x_mean = x.mean()
            y_mean = y.mean()
            
            numerator = ((x - x_mean) * (y - y_mean)).sum()
            denominator = ((x - x_mean) ** 2).sum()
            
            slope = numerator / denominator if denominator > 0 else 0.0001
            intercept = y_mean - slope * x_mean
            
            market_impact_coeff = max(slope, 0.00001)
        else:
            market_impact_coeff = 0.00005  # Default
        
        return SlippageParameters(
            bid_ask_spread=bid_ask_spread,
            market_impact_coeff=market_impact_coeff,
            liquidity_factor=1.0,
            intraday_multiplier=analysis['by_hour'].get(10, 1.0),  # Mid-morning
            order_type_modifier=1.0
        )


# Execution Simulation System
class ExecutionSimulator:
    """
    Simulate multiple executions with realistic slippage.
    Used for strategy backtesting with accurate execution assumptions.
    """
    
    def __init__(self, 
                 slippage_model: SlippageModel,
                 avg_daily_volume: float = 1000000,
                 market_hours: Tuple[int, int] = (9, 16)):
        """
        Initialize execution simulator.
        
        Args:
            slippage_model: Slippage model to use
            avg_daily_volume: Average daily volume for normalization
            market_hours: Tuple of (market_open_hour, market_close_hour)
        """
        self.slippage_model = slippage_model
        self.avg_daily_volume = avg_daily_volume
        self.market_open = market_hours[0]
        self.market_close = market_hours[1]
    
    def simulate_order(self,
                      size: float,
                      reference_price: float,
                      execution_time: Optional[datetime] = None,
                      order_type: str = 'market',
                      instrument_liquidity: float = 1.0) -> Dict:
        """
        Simulate a single order execution.
        
        Args:
            size: Order size
            reference_price: Reference price
            execution_time: Optional execution time
            order_type: Order type
            instrument_liquidity: Instrument liquidity factor
            
        Returns:
            Dictionary with execution details
        """
        # Set default time to current hour if not provided
        if execution_time is None:
            execution_time = datetime.now().replace(
                minute=0, second=0, microsecond=0
            )
        
        # Generate market volume for time of day
        hour = execution_time.hour
        minutes_since_open = max(0, hour - self.market_open) * 60
        minutes_before_close = max(0, self.market_close - hour) * 60
        
        # Intraday volume pattern
        if minutes_since_open < 30 or minutes_before_close < 30:
            current_volume = self.avg_daily_volume * 0.15
        elif 30 <= minutes_since_open <= 360:
            current_volume = self.avg_daily_volume * 0.35
        else:
            current_volume = self.avg_daily_volume * 0.20
        
        market_conditions = {
            'adv': self.avg_daily_volume,
            'current_volume': current_volume,
            'liquidity': instrument_liquidity,
            'order_type': order_type
        }
        
        return self.slippage_model.simulate_execution(
            order_size=size,
            reference_price=reference_price,
            execution_time=execution_time,
            market_conditions=market_conditions
        )
    
    def simulate_batch(self,
                      orders: List[Dict],
                      prices: pd.DataFrame) -> pd.DataFrame:
        """
        Simulate batch of order executions.
        
        Args:
            orders: List of order dictionaries
            prices: DataFrame of price data
            
        Returns:
            DataFrame with all execution results
        """
        results = []
        
        for i, order in enumerate(orders):
            reference_price = prices.loc[order['timestamp'], 'vwap'] if order['timestamp'] in prices.index else order.get('reference_price', 100)
            
            execution = self.simulate_order(
                size=order.get('size', 0),
                reference_price=reference_price,
                execution_time=order.get('timestamp'),
                order_type=order.get('order_type', 'market'),
                instrument_liquidity=order.get('instrument_liquidity', 1.0)
            )
            
            result = {
                'order_index': i,
                'timestamp': order.get('timestamp'),
                'order_size': order.get('size', 0),
                'order_type': order.get('order_type', 'market'),
                'reference_price': reference_price,
                'execution_price': execution['execution_price'],
                'slippage_bps': execution['slippage_bps'],
                'execution_quality': execution['execution_quality'],
                'total_cost': abs(order.get('size', 0)) * execution['execution_price']
            }
            
            results.append(result)
        
        return pd.DataFrame(results)


if __name__ == "__main__":
    # Example usage
    model = SlippageModel()
    
    # Test different order scenarios
    scenarios = [
        {"size": 100, "type": "limit", "time": None},
        {"size": 500, "type": "market", "time": None},
        {"size": 1000, "type": "market", "time": None},
        {"size": 5000, "type": "market", "time": None},
        {"size": 10000, "type": "market", "time": None},
    ]
    
    print("Slippage Analysis for Different Order Sizes")
    print("=" * 60)
    
    for scenario in scenarios:
        result = model.calculate_slippage(
            order_size=scenario["size"],
            order_type=scenario["type"],
            reference_price=100.0,
            execution_time=datetime.now().replace(hour=10, minute=30)
        )
        
        print(f"\nOrder: {scenario['size']} shares, {scenario['type']}")
        print(f"  Total Slippage: {result.slippage_bps:.2f} bps")
        print(f"  Execution Quality: {result.execution_quality}")
        print(f"  Components (bps):")
        print(f"    Bid-Ask: {result.bid_ask_component * 10000:.2f}")
        print(f"    Market Impact: {result.market_impact_component * 10000:.2f}")
        print(f"    Liquidity: {result.liquidity_component * 10000:.2f}")
        print(f"    Time of Day: {result.time_of_day_component * 10000:.2f}")
```

### VWAP-Based Slippage Assessment

```python
class VWAPSlippageAnalyzer:
    """
    Analyze slippage relative to VWAP for execution quality assessment.
    VWAP is the standard reference for execution quality.
    """
    
    def __init__(self, executions: pd.DataFrame, vwap_data: pd.DataFrame):
        self.executions = executions
        self.vwap_data = vwap_data
    
    def calculate_vwap_slippage(self, 
                               window_minutes: int = 5) -> pd.DataFrame:
        """
        Calculate slippage relative to VWAP within time windows.
        
        Args:
            window_minutes: Time window for VWAP calculation
            
        Returns:
            DataFrame with VWAP-adjusted slippage
        """
        # Create time windows
        self.executions = self.executions.sort_values('timestamp')
        
        # Calculate VWAP within windows
        vwap_df = self.vwap_data.resample(f'{window_minutes}T').agg({
            'price': 'mean',
            'volume': 'sum'
        })
        
        vwap_df['vwap'] = vwap_df['price'] * vwap_df['volume'] / vwap_df['volume'].sum()
        
        # Merge with executions
        merged = self.executions.merge(
            vwap_df[['vwap']],
            left_on='timestamp',
            right_index=True,
            how='left'
        )
        
        # Calculate slippage
        merged['vwap_slippage'] = (
            merged['execution_price'] - merged['vwap']
        ) / merged['vwap']
        
        return merged
    
    def assess_execution_quality(self) -> Dict:
        """
        Comprehensive execution quality assessment.
        
        Returns:
            Dictionary with quality metrics
        """
        merged = self.calculate_vwap_slippage()
        
        # Overall statistics
        total_slippage = merged['vwap_slippage'].mean()
        total_std = merged['vwap_slippage'].std()
        
        # By order type
        by_type = merged.groupby('order_type')['vwap_slippage'].agg(['mean', 'std', 'count'])
        
        # By size bucket
        merged['size_bucket'] = pd.cut(
            merged['order_size'].abs(),
            bins=[0, 100, 500, 1000, 5000, float('inf')],
            labels=['0-100', '100-500', '500-1k', '1k-5k', '5k+']
        )
        by_size = merged.groupby('size_bucket')['vwap_slippage'].mean()
        
        # VWAP hit rate (executions on same side of VWAP as intended direction)
        merged['direction'] = np.where(merged['order_size'] > 0, 'buy', 'sell')
        merged['vwap_direction'] = np.where(merged['vwap_slippage'] > 0, 'negative', 'positive')
        merged['hit'] = (merged['direction'] == 'buy') == (merged['vwap_direction'] == 'positive')
        
        hit_rate = merged['hit'].mean()
        
        return {
            "total_average_slippage_bps": total_slippage * 10000,
            "total_std_slippage_bps": total_std * 10000,
            "execution_count": len(merged),
            "vwap_hit_rate": hit_rate,
            "by_order_type": by_type.to_dict(),
            "by_size_bucket": by_size.to_dict()
        }


# Intraday Slippage Pattern Analysis
class IntradaySlippagePatterns:
    """
    Analyze and model intraday slippage patterns.
    Slippage varies significantly by time of day.
    """
    
    def __init__(self, executions: pd.DataFrame):
        self.executions = executions
    
    def analyze_intraday_patterns(self) -> Dict:
        """
        Analyze intraday slippage patterns.
        
        Returns:
            Dictionary with intraday patterns
        """
        # Extract hour and minute
        self.executions['hour'] = self.executions['timestamp'].dt.hour
        self.executions['minute'] = self.executions['timestamp'].dt.minute
        
        # Calculate time since market open
        self.executions['minutes_since_open'] = (
            self.executions['hour'] - 9
        ) * 60 + (self.executions['minute'] - 30)
        
        # Ensure positive
        self.executions['minutes_since_open'] = self.executions['minutes_since_open'].clip(0)
        
        # By minute buckets
        self.executions['minute_bucket'] = self.executions['minutes_since_open'] // 5 * 5
        
        # Calculate slippage
        if 'vwap' in self.executions.columns:
            self.executions['slippage'] = (
                self.executions['execution_price'] - self.executions['vwap']
            ) / self.executions['vwap']
        
        # Intraday pattern
        pattern = self.executions.groupby('minute_bucket')['slippage'].agg(['mean', 'std', 'count'])
        
        # Peak times (highest slippage)
        peak_times = pattern['mean'].nlargest(3).index.tolist()
        
        # Lull times (lowest slippage)
        lull_times = pattern['mean'].nsmallest(3).index.tolist()
        
        # Volatility pattern
        vol_pattern = self.executions.groupby('minute_bucket')['slippage'].std()
        
        return {
            "pattern": pattern.to_dict(),
            "peak_slippage_minutes": peak_times,
            "lull_slippage_minutes": lull_times,
            "volatility_pattern": vol_pattern.to_dict(),
            "max_slippage_hour": pattern['mean'].idxmax(),
            "min_slippage_hour": pattern['mean'].idxmin()
        }
```
