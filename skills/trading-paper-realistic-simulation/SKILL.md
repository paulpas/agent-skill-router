---
name: trading-paper-realistic-simulation
description: Realistic Paper Trading Simulation with Market Impact and Execution Fees
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: impact, market, paper realistic simulation, paper-realistic-simulation,
    trading
  related-skills: trading-fundamentals-market-regimes, trading-paper-commission-model,
    trading-fundamentals-trading-edge, trading-fundamentals-trading-plan
---

**Role:** Trading System Simulator — implements comprehensive paper trading simulations that replicate live trading conditions including slippage, fees, partial fills, and market impact for accurate performance estimation.

**Philosophy:** Live Trading Replication — paper trading must simulate real-world execution friction to provide accurate expectations of live trading performance; unrealistic simulations lead to overoptimistic performance projections.

## Key Principles

1. **Execution Friction Modeling**: Include all real-world costs (commissions, spreads, slippage, fees) that affect live trading returns.

2. **Order Book Dynamics**: Simulate partial fills and fill probability based on order book depth and size.

3. **Market Impact**: Account for price movement caused by own orders, especially for larger positions.

4. **Fill Latency**: Include realistic latency between order placement and fill execution.

5. **Scenario-Based Testing**: Test under multiple market conditions (trending, volatile, rangebound).

## Implementation Guidelines

### Structure
- Core logic: `skills/paper-trading/simulator.py`
- Order book models: `skills/paper-trading/order_book.py`
- Tests: `skills/tests/test_paper_trading_simulation.py`

### Patterns to Follow
- Use stateful simulator classes to track account state
- Implement order book models with realistic liquidity patterns
- Separate order placement from fill execution
- Track latency between order submission and execution
- Use vectorized operations for efficient simulation

## Code Examples

### Realistic Paper Trading Simulator

```python
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from collections import defaultdict


class OrderType(Enum):
    """Order types."""
    MARKET = "market"  # Execute immediately at market price
    LIMIT = "limit"  # Execute at specified price or better
    STOP = "stop"  # Trigger market order when price hits stop level
    STOP_LIMIT = "stop_limit"  # Trigger limit order when price hits stop level


class OrderSide(Enum):
    """Order direction."""
    BUY = "buy"
    SELL = "sell"


class FillStatus(Enum):
    """Order fill status."""
    PENDING = "pending"
    PARTIAL = "partial"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


@dataclass
class Order:
    """Trading order."""
    order_id: int
    order_type: OrderType
    order_side: OrderSide
    quantity: float
    price: Optional[float] = None
    stop_price: Optional[float] = None
    submitted_at: Optional[pd.Timestamp] = None
    filled_at: Optional[pd.Timestamp] = None
    filled_price: Optional[float] = None
    filled_quantity: float = 0.0
    status: FillStatus = FillStatus.PENDING
    commission: float = 0.0
    slippage: float = 0.0


@dataclass
class Position:
    """Current position state."""
    symbol: str
    quantity: float
    entry_price: float
    entry_timestamp: pd.Timestamp
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0


@dataclass
class Trade:
    """Executed trade."""
    trade_id: int
    order_id: int
    symbol: str
    side: OrderSide
    quantity: float
    price: float
    timestamp: pd.Timestamp
    commission: float
    slippage: float


@dataclass
class AccountState:
    """Account state at a point in time."""
    timestamp: pd.Timestamp
    cash: float
    equity: float
    margin_used: float
    margin_available: float
    positions: Dict[str, Position]
    open_orders: List[Order]
    trades: List[Trade]
    daily_pnl: float
    cumulative_pnl: float
    max_drawdown: float


class OrderBook:
    """
    Simulated order book with realistic liquidity patterns.
    """
    
    def __init__(self, 
                 spread: float = 0.001,  # 10 bps default
                 depth: int = 10,
                 volatility: float = 0.02,
                 impact_coefficient: float = 0.01):
        self.spread = spread
        self.depth = depth
        self.volatility = volatility
        self.impact_coefficient = impact_coefficient
        self.bids: List[Tuple[float, float]] = []  # (price, quantity)
        self.asks: List[Tuple[float, float]] = []  # (price, quantity)
    
    def update(self, mid_price: float, timestamp: pd.Timestamp):
        """Update order book with current market conditions."""
        # Generate realistic order book
        self.bids = []
        self.asks = []
        
        for i in range(1, self.depth + 1):
            # Bids below mid price
            bid_price = mid_price * (1 - self.spread / 2 - i * 0.0005)
            bid_quantity = 100 * (1 + 0.1 * (self.depth - i)) * np.random.uniform(0.5, 1.5)
            self.bids.append((bid_price, bid_quantity))
        
        for i in range(1, self.depth + 1):
            # Asks above mid price
            ask_price = mid_price * (1 + self.spread / 2 + i * 0.0005)
            ask_quantity = 100 * (1 + 0.1 * (self.depth - i)) * np.random.uniform(0.5, 1.5)
            self.asks.append((ask_price, ask_quantity))
    
    def get_spread(self, mid_price: float) -> Tuple[float, float]:
        """Get current bid-ask spread."""
        if not self.bids or not self.asks:
            return mid_price * (1 - self.spread / 2), mid_price * (1 + self.spread / 2)
        
        return self.bids[0][0], self.asks[0][0]
    
    def get_liquidity(self, side: OrderSide) -> Dict[int, float]:
        """Get cumulative liquidity at each price level."""
        levels = {}
        
        if side == OrderSide.BUY:
            price, quantity = self.asks[0]
            cumulative = 0
            for i, (p, q) in enumerate(self.asks):
                cumulative += q
                levels[i + 1] = cumulative
        else:
            price, quantity = self.bids[0]
            cumulative = 0
            for i, (p, q) in enumerate(self.bids):
                cumulative += q
                levels[i + 1] = cumulative
        
        return levels
    
    def calculate_market_impact(self, order_side: OrderSide, quantity: float, 
                               mid_price: float) -> float:
        """Calculate price impact of executing an order."""
        # Square root impact model
        total_liquidity = sum(q for _, q in self.asks if order_side == OrderSide.BUY else self.bids)
        impact = self.impact_coefficient * (quantity / total_liquidity) ** 0.5
        
        if order_side == OrderSide.BUY:
            return mid_price * (1 + impact)
        else:
            return mid_price * (1 - impact)


class ExecutionModel:
    """
    Models order execution with realistic behavior.
    """
    
    def __init__(self,
                 fill_probability_model: str = "quantity_based",
                 latency_mean: float = 0.1,  # seconds
                 latency_std: float = 0.05,
                 commission_rate: float = 0.001,  # 10 bps
                 commission_minimum: float = 1.0,
                 slippage_model: str = "uniform",
                 slippage_range: Tuple[float, float] = (-0.001, 0.001)):
        self.fill_probability_model = fill_probability_model
        self.latency_mean = latency_mean
        self.latency_std = latency_std
        self.commission_rate = commission_rate
        self.commission_minimum = commission_minimum
        self.slippage_model = slippage_model
        self.slippage_range = slippage_range
    
    def get_fill_probability(self, order: Order, order_book: OrderBook,
                            mid_price: float, timestamp: pd.Timestamp) -> float:
        """Calculate probability of order being filled."""
        if order.order_type == OrderType.MARKET:
            # Market orders fill immediately
            return 1.0
        
        elif order.order_type == OrderType.LIMIT:
            # Limit orders fill if price condition is met
            if order.order_side == OrderSide.BUY:
                # Fill if bid price >= limit price
                best_bid, _ = order_book.get_spread(mid_price)
                return 1.0 if best_bid >= order.price else 0.0
            else:
                # Fill if ask price <= limit price
                _, best_ask = order_book.get_spread(mid_price)
                return 1.0 if best_ask <= order.price else 0.0
        
        elif order.order_type == OrderType.STOP:
            # Stop orders trigger when price hits stop level
            if order.order_side == OrderSide.BUY:
                return 1.0 if mid_price >= order.stop_price else 0.0
            else:
                return 1.0 if mid_price <= order.stop_price else 0.0
        
        elif order.order_type == OrderType.STOP_LIMIT:
            # Stop-limit orders trigger at stop, then limit
            return 0.5  # Partial probability for stop-limit
        
        return 0.0
    
    def calculate_slippage(self, order: Order, order_book: OrderBook,
                          mid_price: float) -> float:
        """Calculate expected slippage for an order."""
        if self.slippage_model == "uniform":
            # Uniform slippage within range
            return np.random.uniform(
                self.slippage_range[0], 
                self.slippage_range[1]
            )
        
        elif self.slippage_model == "quantity_weighted":
            # Slippage scales with order size
            base_slippage = np.random.uniform(
                self.slippage_range[0], 
                self.slippage_range[1]
            )
            return base_slippage * (1 + order.quantity / 1000)
        
        elif self.slippage_model == "market_impact":
            # Slippage based on market impact
            impact = order_book.calculate_market_impact(
                order.order_side, order.quantity, mid_price
            )
            return (impact - mid_price) / mid_price
        
        return 0.0
    
    def calculate_commission(self, quantity: float, price: float) -> float:
        """Calculate commission for a trade."""
        commission = quantity * price * self.commission_rate
        return max(commission, self.commission_minimum)
    
    def simulate_fill(self, order: Order, order_book: OrderBook,
                     mid_price: float, timestamp: pd.Timestamp) -> Tuple[float, float]:
        """
        Simulate order fill.
        Returns (filled_price, filled_quantity).
        """
        if order.order_type == OrderType.MARKET:
            # Market order fills at best available price + slippage
            if order.order_side == OrderSide.BUY:
                _, ask_price = order_book.get_spread(mid_price)
                filled_price = ask_price * (1 + self.slippage_range[1])
            else:
                bid_price, _ = order_book.get_spread(mid_price)
                filled_price = bid_price * (1 + self.slippage_range[0])
            
            return filled_price, order.quantity
        
        elif order.order_type == OrderType.LIMIT:
            # Limit order fills at limit price or better
            return order.price, order.quantity
        
        elif order.order_type == OrderType.STOP:
            # Stop order triggers market order
            if order.order_side == OrderSide.BUY:
                _, ask_price = order_book.get_spread(mid_price)
                filled_price = ask_price
            else:
                bid_price, _ = order_book.get_spread(mid_price)
                filled_price = bid_price
            
            return filled_price, order.quantity
        
        elif order.order_type == OrderType.STOP_LIMIT:
            # Stop-limit fills at limit price if triggered
            return order.price, order.quantity
        
        return mid_price, 0.0


class PaperTradingSimulator:
    """
    Comprehensive paper trading simulator with realistic execution.
    """
    
    def __init__(self,
                 initial_cash: float = 100000,
                 commission_rate: float = 0.001,
                 commission_minimum: float = 1.0,
                 slippage_range: Tuple[float, float] = (-0.001, 0.001),
                 market_impact_coefficient: float = 0.01,
                 order_latency_mean: float = 0.1):
        self.initial_cash = initial_cash
        self.commission_rate = commission_rate
        self.commission_minimum = commission_minimum
        self.slippage_range = slippage_range
        self.market_impact_coefficient = market_impact_coefficient
        
        self.account = {
            "cash": initial_cash,
            "equity": initial_cash,
            "positions": {},
            "open_orders": [],
            "trades": [],
            "trade_id": 0,
            "order_id": 0,
            "equity_curve": [],
            "max_drawdown": 0.0,
            "cumulative_pnl": 0.0
        }
        
        self.order_book = OrderBook(
            spread=0.001,
            impact_coefficient=market_impact_coefficient
        )
        
        self.execution_model = ExecutionModel(
            commission_rate=commission_rate,
            commission_minimum=commission_minimum,
            slippage_range=slippage_range
        )
        
        self.current_timestamp: Optional[pd.Timestamp] = None
        self.trading_active = True
        self.order_latency_mean = order_latency_mean
    
    def submit_order(self, symbol: str, order_type: OrderType,
                    order_side: OrderSide, quantity: float,
                    price: Optional[float] = None,
                    stop_price: Optional[float] = None,
                    timestamp: Optional[pd.Timestamp] = None) -> Order:
        """Submit a new order."""
        if not self.trading_active:
            return None
        
        if timestamp is None:
            timestamp = pd.Timestamp.now()
        
        self.current_timestamp = timestamp
        
        self.account["order_id"] += 1
        
        order = Order(
            order_id=self.account["order_id"],
            order_type=order_type,
            order_side=order_side,
            quantity=quantity,
            price=price,
            stop_price=stop_price,
            submitted_at=timestamp
        )
        
        self.account["open_orders"].append(order)
        
        return order
    
    def cancel_order(self, order_id: int) -> bool:
        """Cancel an open order."""
        for order in self.account["open_orders"]:
            if order.order_id == order_id:
                order.status = FillStatus.CANCELLED
                return True
        return False
    
    def update_market(self, prices: pd.Series, timestamp: pd.Timestamp):
        """Update market state for a new timestamp."""
        self.current_timestamp = timestamp
        
        # Update order book
        current_price = prices.iloc[-1]
        self.order_book.update(current_price, timestamp)
        
        # Process pending orders
        self._process_orders(prices, timestamp)
        
        # Update position values
        self._update_positions(prices, timestamp)
        
        # Calculate account metrics
        self._calculate_account_metrics()
        
        # Store equity curve point
        self.account["equity_curve"].append({
            "timestamp": timestamp,
            "equity": self.account["equity"],
            "cash": self.account["cash"],
            "positions": sum(
                pos.quantity * prices.iloc[-1] 
                for pos in self.account["positions"].values()
            )
        })
        
        # Update max drawdown
        self._update_max_drawdown()
    
    def _process_orders(self, prices: pd.Series, timestamp: pd.Timestamp):
        """Process pending orders for current market state."""
        for order in self.account["open_orders"][:]:
            if order.status != FillStatus.PENDING:
                continue
            
            # Check fill probability
            fill_prob = self.execution_model.get_fill_probability(
                order, self.order_book, prices.iloc[-1], timestamp
            )
            
            if fill_prob > np.random.random():
                # Simulate fill
                filled_price, filled_quantity = self.execution_model.simulate_fill(
                    order, self.order_book, prices.iloc[-1], timestamp
                )
                
                # Generate fill latency
                latency = np.random.normal(
                    self.execution_model.latency_mean,
                    self.execution_model.latency_std
                )
                latency = max(0, latency)
                
                fill_timestamp = timestamp + timedelta(seconds=latency)
                
                # Execute trade
                self._execute_trade(
                    order, filled_price, filled_quantity, fill_timestamp
                )
    
    def _execute_trade(self, order: Order, filled_price: float,
                      filled_quantity: float, timestamp: pd.Timestamp):
        """Execute a trade and update account state."""
        # Update order
        order.filled_price = filled_price
        order.filled_quantity = filled_quantity
        order.filled_at = timestamp
        order.status = FillStatus.FILLED
        
        # Remove from open orders
        self.account["open_orders"] = [
            o for o in self.account["open_orders"] 
            if o.order_id != order.order_id
        ]
        
        # Calculate commissions
        commission = self.execution_model.calculate_commission(
            filled_quantity, filled_price
        )
        
        # Calculate slippage
        mid_price = self.order_book.bids[0][0] if order.order_side == OrderSide.BUY else self.order_book.asks[0][0]
        slippage = self.execution_model.calculate_slippage(
            order, self.order_book, mid_price
        )
        
        order.commission = commission
        order.slippage = slippage
        
        # Update positions
        self._update_position(order, filled_price, filled_quantity)
        
        # Update cash
        if order.order_side == OrderSide.BUY:
            self.account["cash"] -= filled_quantity * filled_price + commission
        else:
            self.account["cash"] += filled_quantity * filled_price - commission
        
        # Create trade record
        self.account["trade_id"] += 1
        trade = Trade(
            trade_id=self.account["trade_id"],
            order_id=order.order_id,
            symbol="SYMBOL",  # Simplified for single symbol
            side=order.order_side,
            quantity=filled_quantity,
            price=filled_price,
            timestamp=timestamp,
            commission=commission,
            slippage=slippage
        )
        
        self.account["trades"].append(trade)
    
    def _update_position(self, order: Order, filled_price: float, 
                        filled_quantity: float):
        """Update position for executed order."""
        symbol = "SYMBOL"  # Simplified
        
        if symbol not in self.account["positions"]:
            self.account["positions"][symbol] = Position(
                symbol=symbol,
                quantity=0,
                entry_price=0,
                entry_timestamp=self.current_timestamp
            )
        
        position = self.account["positions"][symbol]
        
        if order.order_side == OrderSide.BUY:
            # Buying increases position
            total_cost = position.quantity * position.entry_price + \
                        filled_quantity * filled_price
            position.quantity += filled_quantity
            if position.quantity > 0:
                position.entry_price = total_cost / position.quantity
        else:
            # Selling decreases position
            # Simplified FIFO for this example
            cost_of_goods_sold = filled_quantity * position.entry_price
            position.quantity -= filled_quantity
            
            if position.quantity <= 0:
                position.quantity = 0
                position.entry_price = 0
        
        # Update unrealized P&L
        current_price = self.order_book.get_spread(
            self.account["equity"] / max(1, position.quantity) if position.quantity > 0 else 1
        )[0]
        position.unrealized_pnl = (current_price - position.entry_price) * position.quantity
    
    def _update_positions(self, prices: pd.Series, timestamp: pd.Timestamp):
        """Update all positions with current market prices."""
        current_price = prices.iloc[-1]
        
        for symbol, position in self.account["positions"].items():
            position.unrealized_pnl = (current_price - position.entry_price) * position.quantity
    
    def _calculate_account_metrics(self):
        """Calculate account metrics."""
        # Calculate positions value
        positions_value = sum(
            pos.quantity * self.order_book.bids[0][0]
            for pos in self.account["positions"].values()
        )
        
        # Calculate equity
        self.account["equity"] = self.account["cash"] + positions_value
        
        # Calculate margin metrics (simplified)
        self.account["margin_used"] = 0.0  # Simplified for cash account
        self.account["margin_available"] = self.account["cash"]
        
        # Calculate daily P&L
        if len(self.account["equity_curve"]) > 1:
            previous_equity = self.account["equity_curve"][-2]["equity"]
            self.account["daily_pnl"] = self.account["equity"] - previous_equity
        else:
            self.account["daily_pnl"] = 0.0
        
        # Calculate cumulative P&L
        self.account["cumulative_pnl"] = self.account["equity"] - self.initial_cash
    
    def _update_max_drawdown(self):
        """Update maximum drawdown calculation."""
        if len(self.account["equity_curve"]) > 1:
            equity_values = [point["equity"] for point in self.account["equity_curve"]]
            running_max = np.maximum.accumulate(equity_values)
            drawdowns = (running_max - equity_values) / running_max
            max_dd = np.max(drawdowns)
            
            self.account["max_drawdown"] = max(self.account["max_drawdown"], max_dd)
    
    def get_account_state(self, timestamp: Optional[pd.Timestamp] = None) -> AccountState:
        """Get current account state."""
        if timestamp is None:
            timestamp = self.current_timestamp
        
        return AccountState(
            timestamp=timestamp or pd.Timestamp.now(),
            cash=self.account["cash"],
            equity=self.account["equity"],
            margin_used=self.account["margin_used"],
            margin_available=self.account["margin_available"],
            positions=dict(self.account["positions"]),
            open_orders=list(self.account["open_orders"]),
            trades=list(self.account["trades"]),
            daily_pnl=self.account["daily_pnl"],
            cumulative_pnl=self.account["cumulative_pnl"],
            max_drawdown=self.account["max_drawdown"]
        )
    
    def generate_report(self) -> Dict:
        """Generate comprehensive trading report."""
        trades = self.account["trades"]
        equity_curve = self.account["equity_curve"]
        
        if not equity_curve:
            return {"error": "No trading data available"}
        
        # Calculate performance metrics
        returns = []
        for i in range(1, len(equity_curve)):
            if equity_curve[i-1]["equity"] > 0:
                returns.append(
                    equity_curve[i]["equity"] / equity_curve[i-1]["equity"] - 1
                )
        
        returns_series = pd.Series(returns)
        
        total_return = self.account["cumulative_pnl"] / self.initial_cash
        
        if len(returns_series) > 1:
            daily_std = returns_series.std()
            annualized_return = (1 + total_return) ** (252 / len(equity_curve)) - 1
            annualized_volatility = daily_std * np.sqrt(252)
            sharpe_ratio = (annualized_return - 0.02) / annualized_volatility if annualized_volatility > 0 else 0
            sortino_ratio = (annualized_return - 0.02) / (daily_std * np.sqrt(252) * (returns_series < 0).sum() / len(returns_series)) if (returns_series < 0).sum() > 0 else 0
        else:
            annualized_return = total_return * 252
            annualized_volatility = 0
            sharpe_ratio = 0
            sortino_ratio = 0
        
        # Trade statistics
        wins = sum(1 for t in trades if (t.side == OrderSide.BUY and t.price > self.initial_price) or 
                   (t.side == OrderSide.SELL and t.price < self.initial_price))
        
        # Calculate initial price for comparison
        initial_price = self.order_book.bids[0][0] if self.order_book.bids else 100
        
        return {
            "performance": {
                "total_return": total_return,
                "annualized_return": annualized_return,
                "annualized_volatility": annualized_volatility,
                "sharpe_ratio": sharpe_ratio,
                "sortino_ratio": sortino_ratio,
                "max_drawdown": self.account["max_drawdown"],
                "profit_factor": self._calculate_profit_factor()
            },
            "trades": {
                "total_trades": len(trades),
                "win_rate": wins / len(trades) if trades else 0,
                "total_commissions": sum(t.commission for t in trades),
                "total_slippage": sum(t.slippage * t.quantity * t.price for t in trades)
            },
            "account": {
                "initial_cash": self.initial_cash,
                "final_equity": self.account["equity"],
                "daily_pnl": self.account["daily_pnl"],
                "cumulative_pnl": self.account["cumulative_pnl"]
            }
        }
    
    def _calculate_profit_factor(self) -> float:
        """Calculate profit factor (gross profits / gross losses)."""
        if not self.account["trades"]:
            return 1.0
        
        gross_profits = sum(
            t.quantity * (t.price - self.order_book.get_spread(t.price)[0])
            for t in self.account["trades"]
            if t.side == OrderSide.BUY and t.price > self.order_book.get_spread(t.price)[1]
        )
        
        gross_losses = abs(sum(
            t.quantity * (t.price - self.order_book.get_spread(t.price)[0])
            for t in self.account["trades"]
            if t.side == OrderSide.BUY and t.price < self.order_book.get_spread(t.price)[1]
        ))
        
        return gross_profits / gross_losses if gross_losses > 0 else float('inf') if gross_profits > 0 else 1.0


# Example usage
if __name__ == "__main__":
    # Create synthetic price data
    np.random.seed(42)
    n_days = 252
    
    prices = pd.Series(
        100 * np.cumprod(1 + np.random.normal(0.001, 0.015, n_days)),
        index=pd.date_range('2024-01-01', periods=n_days, freq='D')
    )
    
    # Initialize simulator
    simulator = PaperTradingSimulator(
        initial_cash=100000,
        commission_rate=0.001,
        slippage_range=(-0.001, 0.001)
    )
    
    # Store initial price
    simulator.initial_price = 100
    
    # Simulate trading
    for i in range(len(prices)):
        timestamp = prices.index[i]
        current_prices = prices.iloc[:i+1]
        
        # Update market
        simulator.update_market(current_prices, timestamp)
        
        # Submit some orders (simplified strategy)
        if i > 20:
            if np.random.random() > 0.95:
                # Random trading
                if np.random.random() > 0.5:
                    simulator.submit_order(
                        "SYMBOL", OrderType.MARKET, OrderSide.BUY, 10
                    )
                else:
                    simulator.submit_order(
                        "SYMBOL", OrderType.MARKET, OrderSide.SELL, 10
                    )
    
    # Generate report
    report = simulator.generate_report()
    
    print("Paper Trading Simulation Report:")
    print(f"  Total Return: {report['performance']['total_return']:.2%}")
    print(f"  Annualized Return: {report['performance']['annualized_return']:.2%}")
    print(f"  Sharpe Ratio: {report['performance']['sharpe_ratio']:.3f}")
    print(f"  Max Drawdown: {report['performance']['max_drawdown']:.2%}")
    print(f"  Total Trades: {report['trades']['total_trades']}")
    print(f"  Win Rate: {report['trades']['win_rate']:.2%}")
    print(f"  Total Commissions: ${report['trades']['total_commissions']:.2f}")
    print(f"  Final Equity: ${report['account']['final_equity']:.2f}")
```

### Market Impact Simulation

```python
class MarketImpactSimulator:
    """
    Simulates market impact on large orders.
    Implements square root and linear impact models.
    """
    
    def __init__(self,
                 volatility: float = 0.20,
                 half_life: float = 0.1,  # hours
                 impact_coefficient: float = 0.01,
                 alpha: float = 0.5):
        self.volatility = volatility
        self.half_life = half_life
        self.impact_coefficient = impact_coefficient
        self.alpha = alpha
    
    def calculate_square_root_impact(self, volume: float, 
                                    market_volume: float,
                                    mid_price: float) -> float:
        """
        Calculate impact using square root model.
        Impact ∝ √(order_size / market_volume)
        """
        if market_volume == 0:
            return 0
        
        ratio = volume / market_volume
        impact = self.impact_coefficient * np.sqrt(ratio)
        
        return mid_price * impact
    
    def calculate_linear_impact(self, volume: float,
                               market_volume: float,
                               mid_price: float) -> float:
        """
        Calculate impact using linear model.
        Impact ∝ (order_size / market_volume)
        """
        if market_volume == 0:
            return 0
        
        ratio = volume / market_volume
        impact = self.impact_coefficient * ratio
        
        return mid_price * impact
    
    def calculate_liquidation_impact(self, positions: Dict[str, float],
                                    volumes: Dict[str, float],
                                    prices: Dict[str, float]) -> Dict[str, float]:
        """
        Calculate impact of liquidating positions.
        """
        impacts = {}
        
        for symbol, position in positions.items():
            if symbol not in volumes or symbol not in prices:
                continue
            
            volume = volumes[symbol]
            price = prices[symbol]
            
            # Calculate impact for closing position
            if position > 0:
                # Closing long position
                impact = self.calculate_square_root_impact(
                    abs(position), volume, price
                )
                impacts[symbol] = -impact  # Negative impact (price moves against us)
            else:
                # Closing short position
                impact = self.calculate_square_root_impact(
                    abs(position), volume, price
                )
                impacts[symbol] = impact  # Positive impact (price moves against us)
        
        return impacts


# Example usage
if __name__ == "__main__":
    # Create market impact simulator
    impact_sim = MarketImpactSimulator(
        volatility=0.20,
        impact_coefficient=0.01,
        alpha=0.5
    )
    
    # Calculate impact for different order sizes
    market_volume = 1000000  # 1M daily volume
    mid_price = 100
    
    order_sizes = [1000, 5000, 10000, 50000, 100000]
    
    print("Market Impact Analysis:")
    print(f"Market Volume: {market_volume:,}")
    print(f"Mid Price: ${mid_price}")
    print("\nOrder Size | Square Root | Linear | Percent Impact")
    print("-" * 50)
    
    for size in order_sizes:
        square_root_impact = impact_sim.calculate_square_root_impact(size, market_volume, mid_price)
        linear_impact = impact_sim.calculate_linear_impact(size, market_volume, mid_price)
        
        sq_pct = square_root_impact / mid_price * 100
        linear_pct = linear_impact / mid_price * 100
        
        print(f"${size:>8,} | ${square_root_impact:>10.2f} | ${linear_impact:>6.2f} | {sq_pct:>6.2%}")
```

## Adherence Checklist

Before completing your task, verify:

- [ ] **Execution Friction Modeling**: All real-world costs (commissions, spreads, slippage) are included
- [ ] **Order Book Dynamics**: Simulated order book with realistic liquidity patterns
- [ ] **Market Impact**: Order execution accounts for price impact based on order size
- [ ] **Fill Latency**: Realistic latency between order submission and execution
- [ ] **Scenario-Based Testing**: Simulation can test under different market conditions

## Common Mistakes to Avoid

1. **No Slippage**: Ignoring slippage leads to overoptimistic performance estimates
2. **Instant Fills**: Assuming orders fill immediately without latency
3. **Full Fills**: Assuming all orders fill completely regardless of market liquidity
4. **No Commissions**: Omitting trading commissions and fees
5. **Fixed Impact**: Using constant market impact instead of variable impact based on order size
6. **Perfect Execution**: Simulating perfect fill at limit price for all orders
7. **No Partial Fills**: Not accounting for partial fills on larger orders
8. **Unrealistic Liquidity**: Assuming infinite market depth for large orders

## References

1. Almgren, R., & Chriss, N. (2000). Optimal Execution of Portfolio Transactions. *Journal of Risk*, 3(2), 5-39.

2. Bouchaud, J. P., & Potters, M. (2003). *Theory of Financial Risk and Derivative Pricing*. Springer.

3. Gatheral, J. (2010). No-Dynamic-Arbitrage and Market Impact. *Quantitative Finance*, 10(7), 749-759.

4. Cont, R., & de Larrard, A. (2013). Price impact of meta-orders in continuous time models. *SIAM Journal on Financial Mathematics*, 4(1), 1-25.

5. Moro, E.,zx
    - **Market Impact**: Order execution accounts for price impact based on order size
- [ ] **Fill Latency**: Realistic latency between order submission and execution
- [ ] **Scenario-Based Testing**: Simulation can test under different market conditions

## Common Mistakes to Avoid

1. **No Slippage**: Ignoring slippage leads to overoptimistic performance estimates
2. **Instant Fills**: Assuming orders fill immediately without latency
3. **Full Fills**: Assuming all orders fill completely regardless of market liquidity
4. **No Commissions**: Omitting trading commissions and fees
5. **Fixed Impact**: Using constant market impact instead of variable impact based on order size
6. **Unrealistic Liquidity**: Assuming infinite market depth for large orders
- [ ] **Fill Latency**: Realistic latency between order submission and execution
- [ ] **Scenario-Based Testing**: Simulation can test under different market conditions

## Common Mistakes to Avoid

1. **No Slippage**: Ignoring slippage leads to overoptimistic performance estimates
2. **Instant Fills**: Assuming orders fill immediately without latency
3. **Full Fills**: Assuming all orders fill completely regardless of market liquidity
4. **No Commissions**: Omitting trading commissions and fees
5. **Fixed Impact**: Using constant market impact instead of variable impact based on order size
6. **Unrealistic Liquidity**: Assuming infinite market depth for large orders
- [ ] **Fill Latency**: Realistic latency between order submission and execution
- [ ] **Scenario-Based Testing**: Simulation can test under different market conditions

## Common Mistakes to Avoid

1. **No Slippage**: Ignoring slippage leads to overoptimistic performance estimates
2. **Instant Fills**: Assuming orders fill immediately without latency
3. **Full Fills**: Assuming all orders fill completely regardless of market liquidity
4. **No Commissions**: Omitting trading commissions and fees
5. **Fixed Impact**: Using constant market impact instead of variable impact based on order size
6. **Unrealistic Liquidity**: Assuming infinite market depth for large orders

---

Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.