---
name: trading-paper-market-impact
description: Market Impact Modeling and Order Book Simulation
---

**Role:** Market Microstructure Specialist — implements sophisticated market impact models to simulate how order flow affects prices, incorporating order book dynamics, inventory imbalances, and liquidity provision.

**Philosophy:** Order Flow Awareness — market impact is not static; it evolves with order book state, inventory, and market conditions; accurate modeling requires understanding the dynamics of price formation.

## Key Principles

1. **Inventory-Based Impact**: Market impact depends on dealer inventory; large positions in one direction create asymmetric impact that scales non-linearly.

2. **Order Book Simulation**: Simulating actual order book dynamics provides more realistic impact than simplified formulas.

3. **Time-to-Arbitrage**: Impact decays as arbitrageurs restore equilibrium; models should capture this mean-reverting behavior.

4. **Volume Participation Effects**: Impact varies with participation rate; executing too quickly in illiquid stocks causes disproportionately high impact.

5. **Cross-Asset Effects**: Large orders in one asset can create spillover impact to correlated assets and sectors.

## Implementation Guidelines

### Structure
- Core logic: `skills/paper-trading/market_impact.py`
- Order book simulation: `skills/paper-trading/order_book.py`
- Tests: `skills/tests/test_market_impact.py`

### Patterns to Follow
- Implement market impact as a dynamic model with inventory tracking
- Support both microstructure-based and empirical impact models
- Include order book state simulation
- Provide impact decomposition by component
- Use vectorized operations for efficient batch simulations

## Adherence Checklist
Before completing your task, verify:
- [ ] **Inventory Effect**: Does the model account for dealer inventory asymmetry?
- [ ] **Non-Linear Scaling**: Does impact scale non-linearly with participation rate?
- [ ] **Decay Dynamics**: Does impact decay over time as arbitrageurs restore balance?
- [ ] **Order Book Simulation**: Are order book dynamics simulated or approximated?
- [ ] **Cross-Asset Effects**: Are spillover effects to correlated assets included?

## Code Examples

### Market Impact Model with Inventory Tracking

```python
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
import numpy as np
import pandas as pd
from enum import Enum
from datetime import datetime, timedelta


class ImpactModel(Enum):
    """Available market impact models."""
    LINEAR = "linear"
    SQUARE_ROOT = "square_root"
    QUADRATIC = "quadratic"
    INVENTORY = "inventory"
    ORDER_BOOK = "order_book"


@dataclass
class MarketState:
    """Current market state for impact calculation."""
    mid_price: float
    bid_price: float
    ask_price: float
    bid_volume: float
    ask_volume: float
    spread: float
    volume_today: float
    avg_daily_volume: float
    inventory_imbalance: float  # Dealer inventory, positive = long
    volatility: float
    liquidity_score: float  # 0-1 scale
    time_of_day: str  # 'open', 'midday', 'close', 'after_hours'


@dataclass 
class ImpactResult:
    """Result of impact calculation."""
    price_impact: float  # Price change from impact
    execution_price: float
    total_cost: float
    impact_bps: float
    inventory_effect: float
    liquidity_effect: float
    timing_effect: float
    market_state: MarketState


class MarketImpactModel:
    """
    Comprehensive market impact model with inventory tracking.
    Combines multiple impact sources for realistic simulation.
    """
    
    def __init__(self,
                 impact_model: ImpactModel = ImpactModel.INVENTORY,
                 inventory_sensitivity: float = 0.5,
                 volatility_multiplier: float = 1.0,
                 time_window_minutes: int = 30):
        """
        Initialize market impact model.
        
        Args:
            impact_model: Model to use for impact calculation
            inventory_sensitivity: How sensitive impact is to inventory
            volatility_multiplier: Multiplier for volatility effects
            time_window_minutes: Time window for execution
        """
        self.impact_model = impact_model
        self.inventory_sensitivity = inventory_sensitivity
        self.volatility_multiplier = volatility_multiplier
        self.time_window = time_window_minutes
        self.trading_days_per_year = 252
    
    def calculate_impact(self,
                        order_size: float,
                        market_state: MarketState,
                        execution_time_minutes: float = None,
                        order_type: str = 'market') -> ImpactResult:
        """
        Calculate market impact for an order.
        
        Args:
            order_size: Order size (positive = buy, negative = sell)
            market_state: Current market state
            execution_time_minutes: Time allowed for execution
            order_type: Type of order ('market', 'limit', 'twap', 'vwap')
            
        Returns:
            ImpactResult with all impact components
        """
        is_buy = order_size > 0
        order_size_abs = abs(order_size)
        
        # Calculate participation rate
        avg_daily_volume = market_state.avg_daily_volume
        participation_rate = order_size_abs / avg_daily_volume if avg_daily_volume > 0 else 0
        
        # Limit participation rate
        participation_rate = min(participation_rate, 1.0)
        
        # Base impact calculation
        base_impact = self._calculate_base_impact(
            participation_rate,
            market_state,
            order_type
        )
        
        # Inventory adjustment
        inventory_impact = self._calculate_inventory_impact(
            order_size,
            market_state,
            base_impact
        )
        
        # Liquidity adjustment
        liquidity_impact = self._calculate_liquidity_impact(
            participation_rate,
            market_state
        )
        
        # Timing adjustment
        timing_impact = self._calculate_timing_impact(
            execution_time_minutes or self.time_window,
            participation_rate,
            market_state
        )
        
        # Combine impacts
        total_impact = (
            base_impact +
            inventory_impact +
            liquidity_impact +
            timing_impact
        )
        
        # Direction adjustment
        if is_buy:
            total_impact = abs(total_impact)
        else:
            total_impact = -abs(total_impact)
        
        # Calculate execution price
        execution_price = market_state.mid_price * (1 + total_impact)
        
        # Calculate cost
        cost = order_size_abs * total_impact
        
        # Convert to basis points
        impact_bps = total_impact * 10000
        
        return ImpactResult(
            price_impact=total_impact,
            execution_price=execution_price,
            total_cost=cost,
            impact_bps=impact_bps,
            inventory_effect=inventory_impact,
            liquidity_effect=liquidity_impact,
            timing_effect=timing_impact,
            market_state=market_state
        )
    
    def _calculate_base_impact(self,
                               participation_rate: float,
                               market_state: MarketState,
                               order_type: str) -> float:
        """Calculate base impact without inventory or timing adjustments."""
        
        # Base volatility component
        daily_vol = market_state.volatility
        hourly_vol = daily_vol / np.sqrt(252 * 6.5)  # Hourly volatility
        
        if self.impact_model == ImpactModel.LINEAR:
            # Linear model: impact proportional to participation
            coefficient = 0.05  # Typical coefficient
            base = coefficient * participation_rate
            
        elif self.impact_model == ImpactModel.SQUARE_ROOT:
            # Square root model: impact ~ sqrt(participation)
            coefficient = 0.1  # Typical coefficient
            base = coefficient * np.sqrt(participation_rate)
            
        elif self.impact_model == ImpactModel.QUADRATIC:
            # Quadratic model: impact ~ participation^2
            coefficient = 1.0  # Typical coefficient
            base = coefficient * participation_rate ** 2
            
        else:
            # Default: square root
            coefficient = 0.1
            base = coefficient * np.sqrt(participation_rate)
        
        # Adjust for order type
        if order_type == 'limit':
            base *= 0.3  # Limit orders have less impact
        elif order_type == 'twap':
            base *= 0.5  # TWAP spreads impact
        elif order_type == 'vwap':
            base *= 0.4  # VWAP aligns with volume
        
        # Adjust for volatility
        base *= self.volatility_multiplier
        
        return base
    
    def _calculate_inventory_impact(self,
                                    order_size: float,
                                    market_state: MarketState,
                                    base_impact: float) -> float:
        """Calculate inventory-based impact adjustment."""
        
        if self.impact_model == ImpactModel.LINEAR:
            return 0.0
        
        inventory = market_state.inventory_imbalance
        inventory_sensitivity = self.inventory_sensitivity
        
        # Normalize inventory
        normalized_inventory = inventory / market_state.avg_daily_volume if market_state.avg_daily_volume > 0 else 0
        
        # Inventory effect: impact increases with opposing inventory
        # Large long positions make sell impact worse, buy impact better
        direction_factor = 1 if order_size > 0 else -1
        
        inventory_effect = (
            inventory_sensitivity * normalized_inventory * direction_factor * base_impact
        )
        
        return inventory_effect
    
    def _calculate_liquidity_impact(self,
                                    participation_rate: float,
                                    market_state: MarketState) -> float:
        """Calculate liquidity-based impact adjustment."""
        
        liquidity = market_state.liquidity_score
        
        # Low liquidity increases impact
        # High liquidity decreases impact
        
        if liquidity < 0.3:
            liquidity_multiplier = 2.0  # Very low liquidity
        elif liquidity < 0.5:
            liquidity_multiplier = 1.5  # Below average liquidity
        elif liquidity < 0.7:
            liquidity_multiplier = 1.0  # Average liquidity
        elif liquidity < 0.9:
            liquidity_multiplier = 0.8  # Above average liquidity
        else:
            liquidity_multiplier = 0.5  # High liquidity
        
        # Small orders in illiquid stocks face higher impact
        if participation_rate < 0.01:
            liquidity_multiplier *= 1.2
        
        return liquidity_multiplier
    
    def _calculate_timing_impact(self,
                                 execution_time_minutes: float,
                                 participation_rate: float,
                                 market_state: MarketState) -> float:
        """Calculate timing-based impact adjustment."""
        
        # TWAP/VWAP with more time has lower impact
        if execution_time_minutes > 60:
            timing_factor = 0.7  # Extended execution window
        elif execution_time_minutes > 30:
            timing_factor = 0.85
        elif execution_time_minutes > 15:
            timing_factor = 0.95
        else:
            timing_factor = 1.0  # Immediate execution
        
        # Intraday timing
        if market_state.time_of_day == 'open':
            timing_factor *= 1.2  # Higher impact at open
        elif market_state.time_of_day == 'close':
            timing_factor *= 1.15  # Higher impact at close
        elif market_state.time_of_day == 'midday':
            timing_factor *= 0.85  # Lower impact midday
        
        return timing_factor
    
    def calculate_price_path(self,
                            order_size: float,
                            market_state: MarketState,
                            n_steps: int = 10) -> List[ImpactResult]:
        """
        Calculate price impact path over time.
        
        Args:
            order_size: Order size
            market_state: Initial market state
            n_steps: Number of time steps
            
        Returns:
            List of impact results at each time step
        """
        results = []
        
        for i in range(n_steps):
            # Update market state to simulate impact
            impact_result = self.calculate_impact(
                order_size=order_size,
                market_state=market_state,
                execution_time_minutes=self.time_window * (i + 1) / n_steps
            )
            
            results.append(impact_result)
            
            # Update market state (simplified)
            market_state = MarketState(
                mid_price=impact_result.execution_price,
                bid_price=impact_result.execution_price * 0.999,
                ask_price=impact_result.execution_price * 1.001,
                bid_volume=market_state.bid_volume * 0.9,
                ask_volume=market_state.ask_volume * 0.9,
                spread=market_state.spread * 1.05,
                volume_today=market_state.volume_today + abs(order_size) / n_steps,
                avg_daily_volume=market_state.avg_daily_volume,
                inventory_imbalance=market_state.inventory_imbalance + order_size / n_steps,
                volatility=market_state.volatility * 1.02,
                liquidity_score=market_state.liquidity_score * 0.95,
                time_of_day=market_state.time_of_day
            )
        
        return results
```

### Order Book Simulator for Realistic Impact

```python
@dataclass
class OrderBookLevel:
    """Single level of order book."""
    price: float
    quantity: float
    orders: List[Dict] = field(default_factory=list)


class OrderBookSimulator:
    """
    Order book simulator for realistic market impact.
    """
    
    def __init__(self,
                 mid_price: float = 100.0,
                 spread: float = 0.01,
                 depth_per_level: int = 5,
                 levels: int = 10):
        """
        Initialize order book simulator.
        
        Args:
            mid_price: Initial mid price
            spread: Initial bid-ask spread
            depth_per_level: Average depth per level
            levels: Number of book levels to simulate
        """
        self.mid_price = mid_price
        self.spread = spread
        self.depth_per_level = depth_per_level
        self.levels = levels
        
        self.bids = []
        self.asks = []
        self._initialize_book()
        
        # Order history for analysis
        self.order_history = []
        self.trade_history = []
    
    def _initialize_book(self):
        """Initialize order book levels."""
        self.bids = []
        self.asks = []
        
        for i in range(self.levels):
            bid_price = self.mid_price - self.spread / 2 - i * 0.01
            ask_price = self.mid_price + self.spread / 2 + i * 0.01
            
            self.bids.append(OrderBookLevel(
                price=bid_price,
                quantity=np.random.exponential(self.depth_per_level)
            ))
            self.asks.append(OrderBookLevel(
                price=ask_price,
                quantity=np.random.exponential(self.depth_per_level)
            ))
    
    def get_quote(self) -> Tuple[float, float, float, float]:
        """Get current best bid and ask."""
        best_bid = self.bids[0].price if self.bids else self.mid_price
        best_ask = self.asks[0].price if self.asks else self.mid_price
        return best_bid, best_ask, best_ask - best_bid, self.mid_price
    
    def simulate_order(self,
                      order_size: int,
                      is_buy: bool,
                      order_type: str = 'market',
                      limit_price: float = None) -> Dict:
        """
        Simulate an order execution.
        
        Args:
            order_size: Order size
            is_buy: Whether this is a buy order
            order_type: Type of order ('market', 'limit')
            limit_price: Limit price for limit orders
            
        Returns:
            Dictionary with execution results
        """
        # Record order
        self.order_history.append({
            'size': order_size,
            'is_buy': is_buy,
            'order_type': order_type,
            'timestamp': len(self.order_history)
        })
        
        # Track execution
        executed = 0
        total_cost = 0
        average_price = 0
        price_impact = 0
        
        # Market order execution
        if order_type == 'market':
            book = self.asks if is_buy else self.bids
            
            for level in book:
                if executed >= order_size:
                    break
                    
                available = level.quantity
                take = min(available, order_size - executed)
                
                # Update book
                level.quantity -= take
                executed += take
                total_cost += take * level.price
                
                # Record trade
                self.trade_history.append({
                    'price': level.price,
                    'quantity': take,
                    'is_buy': is_buy,
                    'timestamp': len(self.trade_history)
                })
        
        # Limit order execution
        elif order_type == 'limit':
            if is_buy:
                # Check if limit price crosses spread
                best_ask = self.asks[0].price if self.asks else self.mid_price
                if limit_price >= best_ask:
                    # Order will execute immediately
                    return self.simulate_order(order_size, is_buy, 'market', None)
                else:
                    # Add to order book
                    return {
                        'executed': 0,
                        'remaining': order_size,
                        'average_price': 0,
                        'price_impact': 0,
                        'placed': True
                    }
            else:
                # Sell limit
                best_bid = self.bids[0].price if self.bids else self.mid_price
                if limit_price <= best_bid:
                    return self.simulate_order(order_size, is_buy, 'market', None)
                else:
                    return {
                        'executed': 0,
                        'remaining': order_size,
                        'average_price': 0,
                        'price_impact': 0,
                        'placed': True
                    }
        
        # Calculate results
        if executed > 0:
            average_price = total_cost / executed
            
            # Calculate price impact
            if is_buy:
                price_impact = (average_price - self.mid_price) / self.mid_price
            else:
                price_impact = (self.mid_price - average_price) / self.mid_price
        
        # Update mid price based on imbalance
        self._update_mid_price()
        
        return {
            'executed': executed,
            'remaining': order_size - executed,
            'average_price': average_price,
            'price_impact': price_impact,
            'total_cost': total_cost
        }
    
    def _update_mid_price(self):
        """Update mid price based on recent activity."""
        if not self.trade_history:
            return
        
        # Recent trades influence price
        recent_trades = self.trade_history[-20:]
        if not recent_trades:
            return
        
        buy_volume = sum(t['quantity'] for t in recent_trades if t['is_buy'])
        sell_volume = sum(t['quantity'] for t in recent_trades if not t['is_buy'])
        
        imbalance = (buy_volume - sell_volume) / (buy_volume + sell_volume + 1e-10)
        
        # Price drift based on imbalance
        drift = imbalance * 0.001  # 10 bps per unit imbalance
        self.mid_price *= (1 + drift)
        
        # Rebalance book around new mid
        old_mid = self.mid_price / (1 + drift)
        for level in self.bids:
            level.price = level.price * (1 + drift)
        for level in self.asks:
            level.price = level.price * (1 + drift)
    
    def get_liquidity(self, side: str = 'both') -> Dict:
        """
        Get current liquidity at different depth levels.
        
        Args:
            side: 'buy', 'sell', or 'both'
            
        Returns:
            Dictionary with liquidity metrics
        """
        total_bid = sum(level.quantity for level in self.bids)
        total_ask = sum(level.quantity for level in self.asks)
        
        result = {
            'total_bid_depth': total_bid,
            'total_ask_depth': total_ask,
            'bid_ask_spread': self.asks[0].price - self.bids[0].price if self.bids and self.asks else 0,
            'improvement_ratio': total_bid / total_ask if total_ask > 0 else 1.0
        }
        
        if side == 'both':
            return result
        elif side == 'buy':
            return {'depth': total_bid, 'price': self.bids[0].price if self.bids else 0}
        else:
            return {'depth': total_ask, 'price': self.asks[0].price if self.asks else 0}
    
    def simulate_tick(self):
        """Simulate a market tick (price movement)."""
        # Random walk with drift
        drift = np.random.normal(0, 0.0005)
        
        self.mid_price *= (1 + drift)
        
        # Update book levels
        for level in self.bids:
            level.price *= (1 + drift)
        for level in self.asks:
            level.price *= (1 + drift)
        
        # Add some noise to depths
        for level in self.bids + self.asks:
            level.quantity = max(0, level.quantity * np.random.normal(1, 0.1))


# Combined Impact and Order Book Model
class ComprehensiveMarketImpact:
    """
    Combined market impact model with order book simulation.
    """
    
    def __init__(self,
                 initial_price: float = 100.0,
                 initial_volatility: float = 0.20,
                 initial_liquidity: float = 0.7):
        self.initial_price = initial_price
        self.initial_volatility = initial_volatility
        self.initial_liquidity = initial_liquidity
        
        self.order_book = OrderBookSimulator(
            mid_price=initial_price,
            spread=0.01,
            depth_per_level=100
        )
        
        self.market_state = MarketState(
            mid_price=initial_price,
            bid_price=initial_price * 0.9995,
            ask_price=initial_price * 1.0005,
            bid_volume=1000,
            ask_volume=1000,
            spread=0.01,
            volume_today=0,
            avg_daily_volume=1000000,
            inventory_imbalance=0,
            volatility=initial_volatility,
            liquidity_score=initial_liquidity,
            time_of_day='midday'
        )
    
    def simulate_large_order(self,
                            order_size: int,
                            is_buy: bool,
                            execution_time_minutes: float = 30) -> Dict:
        """
        Simulate execution of a large order.
        
        Args:
            order_size: Order size
            is_buy: Whether this is a buy order
            execution_time_minutes: Time allowed for execution
            
        Returns:
            Dictionary with complete simulation results
        """
        impact_model = MarketImpactModel(
            impact_model=ImpactModel.INVENTORY,
            inventory_sensitivity=0.5,
            volatility_multiplier=1.0,
            time_window_minutes=execution_time_minutes
        )
        
        # Execute in steps
        remaining = order_size
        steps = 10
        total_executed = 0
        total_cost = 0
        all_impacts = []
        
        for i in range(steps):
            step_size = remaining // (steps - i)
            step_size = min(step_size, remaining)
            
            impact = impact_model.calculate_impact(
                order_size=step_size if is_buy else -step_size,
                market_state=self.market_state,
                execution_time_minutes=execution_time_minutes * (i + 1) / steps
            )
            
            # Execute in order book
            execution = self.order_book.simulate_order(
                order_size=step_size,
                is_buy=is_buy,
                order_type='market'
            )
            
            if execution['executed'] > 0:
                total_executed += execution['executed']
                total_cost += execution['total_cost']
            
            all_impacts.append(impact)
            
            # Update market state
            self.market_state = MarketState(
                mid_price=impact.execution_price,
                bid_price=impact.execution_price * 0.999,
                ask_price=impact.execution_price * 1.001,
                bid_volume=self.market_state.bid_volume * 0.9,
                ask_volume=self.market_state.ask_volume * 0.9,
                spread=self.market_state.spread * 1.05,
                volume_today=self.market_state.volume_today + step_size,
                avg_daily_volume=self.market_state.avg_daily_volume,
                inventory_imbalance=self.market_state.inventory_imbalance + step_size if is_buy else self.market_state.inventory_imbalance - step_size,
                volatility=self.market_state.volatility * 1.02,
                liquidity_score=self.market_state.liquidity_score * 0.95,
                time_of_day=self.market_state.time_of_day
            )
            
            remaining -= step_size
        
        # Calculate summary
        avg_price = total_cost / total_executed if total_executed > 0 else self.initial_price
        
        return {
            'order_size': order_size,
            'is_buy': is_buy,
            'execution_time': execution_time_minutes,
            'total_executed': total_executed,
            'average_execution_price': avg_price,
            'price_impact_bps': (avg_price / self.initial_price - 1) * 10000 * (1 if is_buy else -1),
            'impact_breakdown': {
                'first_step': all_impacts[0].impact_bps if all_impacts else 0,
                'last_step': all_impacts[-1].impact_bps if all_impacts else 0,
                'inventory_effect': all_impacts[-1].inventory_effect if all_impacts else 0,
                'liquidity_effect': all_impacts[-1].liquidity_effect if all_impacts else 0,
                'timing_effect': all_impacts[-1].timing_effect if all_impacts else 0
            },
            'final_inventory': self.market_state.inventory_imbalance,
            'final_liquidity': self.market_state.liquidity_score
        }
    
    def get_order_book_snapshot(self) -> Dict:
        """Get current order book snapshot."""
        bid_levels = [{'price': level.price, 'quantity': level.quantity} 
                     for level in self.order_book.bids[:5]]
        ask_levels = [{'price': level.price, 'quantity': level.quantity} 
                     for level in self.order_book.asks[:5]]
        
        return {
            'bids': bid_levels,
            'asks': ask_levels,
            'spread_bps': (self.order_book.asks[0].price - self.order_book.bids[0].price) / self.initial_price * 10000,
            'book_imbalance': (sum(l['quantity'] for l in bid_levels) - sum(l['quantity'] for l in ask_levels)) / 
                            (sum(l['quantity'] for l in bid_levels) + sum(l['quantity'] for l in ask_levels))
        }
```

### Empirical Impact Calibration

```python
class ImpactCalibrator:
    """
    Calibrate impact model parameters to empirical data.
    """
    
    def __init__(self):
        self.historical_impacts = []
    
    def add_observation(self,
                       participation_rate: float,
                       impact_bps: float,
                       inventory_imbalance: float = 0,
                       liquidity_score: float = 0.5):
        """Add an observation for calibration."""
        self.historical_impacts.append({
            'participation_rate': participation_rate,
            'impact_bps': impact_bps,
            'inventory_imbalance': inventory_imbalance,
            'liquidity_score': liquidity_score
        })
    
    def calibrate_linear(self) -> Dict:
        """
        Calibrate linear impact model.
        Impact = a * participation_rate
        
        Returns:
            Dictionary with calibrated parameters
        """
        if not self.historical_impacts:
            return {'error': 'No observations'}
        
        # Simple linear regression
        x = np.array([o['participation_rate'] for o in self.historical_impacts])
        y = np.array([o['impact_bps'] for o in self.historical_impacts])
        
        # Fit y = a * x
        a = np.sum(x * y) / np.sum(x * x) if np.sum(x * x) > 0 else 0
        
        # Calculate R-squared
        y_pred = a * x
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r_squared = 1 - ss_res / ss_tot if ss_tot > 0 else 0
        
        return {
            'coefficient_a': a,
            'r_squared': r_squared,
            'n_observations': len(self.historical_impacts)
        }
    
    def calibrate_square_root(self) -> Dict:
        """
        Calibrate square root impact model.
        Impact = a * sqrt(participation_rate)
        
        Returns:
            Dictionary with calibrated parameters
        """
        if not self.historical_impacts:
            return {'error': 'No observations'}
        
        x = np.array([np.sqrt(o['participation_rate']) for o in self.historical_impacts])
        y = np.array([o['impact_bps'] for o in self.historical_impacts])
        
        # Fit y = a * x
        a = np.sum(x * y) / np.sum(x * x) if np.sum(x * x) > 0 else 0
        
        y_pred = a * x
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r_squared = 1 - ss_res / ss_tot if ss_tot > 0 else 0
        
        return {
            'coefficient_a': a,
            'r_squared': r_squared,
            'n_observations': len(self.historical_impacts)
        }
    
    def calibrate_full(self) -> Dict:
        """
        Calibrate full multi-parameter model.
        Impact = a * sqrt(pr) + b * inventory + c * (1/liquidity) + d * pr^2
        
        Returns:
            Dictionary with calibrated parameters
        """
        if not self.historical_impacts or len(self.historical_impacts) < 5:
            return {'error': 'Insufficient observations'}
        
        # Prepare features
        n = len(self.historical_impacts)
        X = np.zeros((n, 4))
        y = np.array([o['impact_bps'] for o in self.historical_impacts])
        
        for i, o in enumerate(self.historical_impacts):
            X[i, 0] = np.sqrt(o['participation_rate'])
            X[i, 1] = o['inventory_imbalance']
            X[i, 2] = 1 / o['liquidity_score'] if o['liquidity_score'] > 0 else 10
            X[i, 3] = o['participation_rate'] ** 2
        
        # Solve X @ beta = y using least squares
        try:
            beta, residuals, rank, s = np.linalg.lstsq(X, y, rcond=None)
            
            # Calculate R-squared
            y_pred = X @ beta
            ss_res = np.sum((y - y_pred) ** 2)
            ss_tot = np.sum((y - np.mean(y)) ** 2)
            r_squared = 1 - ss_res / ss_tot if ss_tot > 0 else 0
            
            return {
                'coefficient_sqrt': beta[0],
                'coefficient_inventory': beta[1],
                'coefficient_liquidity': beta[2],
                'coefficient_square': beta[3],
                'r_squared': r_squared,
                'n_observations': n
            }
        except:
            return {'error': 'Calibration failed'}
```
