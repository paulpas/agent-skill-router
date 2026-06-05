---




name: technical-market-microstructure
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- config
- do-dont
description: '"Implements order book dynamics and order flow analysis for risk management
  and algorithmic trading execution."'
license: MIT
maturity: stable
metadata:
  domain: trading
  output-format: code
  related-skills: ai-order-flow-analysis, data-order-book
  role: implementation
  scope: implementation
  triggers: analysis, dynamics, order, technical market microstructure, technical-market-microstructure
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - no risk management
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
version: "1.0.0"




---




**Role:** Analyze order book depth, spread, and trade execution patterns

**Philosophy:** Order book reflects real-time supply and demand; microstructure reveals hidden liquidity

## Key Principles

1. **Spread as Liquidity Indicator**: Tight spreads indicate high liquidity
2. **Order Book Imbalance**:Buy/sell pressure visible in depth
3. **Hidden Orders**: Large orders may be partially visible (iceberg orders)
4. **Quote Stuffing Detection**: Rapid order cancellations may indicate manipulation
5. **Latency Arbitrage**: Speed advantage in order execution

## Implementation Guidelines

### Structure
- Core logic: technical_analysis/microstructure.py
- Helper functions: technical_analysis/book_analysis.py
- Tests: tests/test_microstructure.py

### Patterns to Follow
- Process order book snapshots efficiently
- Track order flow delta (bid-ask imbalance)
- Monitor latency metrics per exchange

## Adherence Checklist
Before completing your task, verify:
- [ ] Order book updates processed within 100ms
- [ ] Spread widening alerts trigger when > 3x average
- [ ] Hidden liquidity estimated using multiple methods
- [ ] Order flow imbalance calculated per price level
- [ ] Market impact estimates include slippage modeling


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from collections import deque
import time

@dataclass
class OrderBookState:
    """Current state of the order book."""
    timestamp: float
    bid_levels: List[Tuple[float, float]]  # (price, quantity)
    ask_levels: List[Tuple[float, float]]
    mid_price: float
    bid_ask_spread: float
    depth_imbalance: float

@dataclass
class OrderFlow:
    """Aggregated order flow data."""
    timestamp: float
    buy_volume: float
    sell_volume: float
    net_flow: float
    trade_count: int
    avg_trade_size: float

class MarketMicrostructure:
    """Analyzes order book dynamics and order flow."""
    
    def __init__(self, max_book_size: int = 10):
        self.max_book_size = max_book_size
        self.order_flow_buffer = deque(maxlen=1000)
    
    def process_order_book_snapshot(
        self, bids: List[Tuple[float, float]], asks: List[Tuple[float, float]]
    ) -> OrderBookState:
        """Process raw order book data into structured state."""
        # Ensure ascending order for asks, descending for bids
        bids = sorted(bids, key=lambda x: x[0], reverse=True)[:self.max_book_size]
        asks = sorted(asks, key=lambda x: x[0])[:self.max_book_size]
        
        # Calculate mid price
        if bids and asks:
            mid = (bids[0][0] + asks[0][0]) / 2
            spread = asks[0][0] - bids[0][0]
        else:
            mid, spread = 0, 0
        
        # Calculate depth imbalance
        bid_depth = sum(q for _, q in bids)
        ask_depth = sum(q for _, q in asks)
        depth_imbalance = (bid_depth - ask_depth) / (bid_depth + ask_depth + 1e-8)
        
        return OrderBookState(
            timestamp=time.time(),
            bid_levels=bids,
            ask_levels=asks,
            mid_price=mid,
            bid_ask_spread=spread,
            depth_imbalance=depth_imbalance
        )
    
    def calculate_order_flow_delta(
        self, trades: List[Dict], previous_books: Dict[str, OrderBookState]
    ) -> OrderFlow:
        """Calculate order flow based on trades and book changes."""
        buy_volume = sum(t['size'] for t in trades if t['side'] == 'buy')
        sell_volume = sum(t['size'] for t in trades if t['side'] == 'sell')
        
        net_flow = buy_volume - sell_volume
        
        return OrderFlow(
            timestamp=time.time(),
            buy_volume=buy_volume,
            sell_volume=sell_volume,
            net_flow=net_flow,
            trade_count=len(trades),
            avg_trade_size=np.mean([t['size'] for t in trades]) if trades else 0
        )
    
    def detect_iceberg_orders(
        self, order_book: OrderBookState, min_size: float = 1000
    ) -> Dict[str, float]:
        """Detect potential iceberg orders in the order book."""
        icebergs = {}
        
        # Look for suspiciously large orders at price levels
        for side, levels in [('bid', order_book.bid_levels), ('ask', order_book.ask_levels)]:
            for i, (price, qty) in enumerate(levels):
                # Check if this level has unusually large size
                if qty > min_size:
                    # Compare to adjacent levels for consistency
                    adjacent_avg = 0
                    count = 0
                    for j in range(max(0, i-3), min(len(levels), i+4)):
                        if j != i:
                            adjacent_avg += levels[j][1]
                            count += 1
                    
                    if count > 0 and qty > 2 * adjacent_avg / count:
                        icebergs[price] = qty
        
        return icebergs
    
    def calculate_tape_metrics(
        self, trades: List[Dict], window: int = 50
    ) -> Dict[str, float]:
        """Calculate tape-based metrics for short-term signals."""
        if len(trades) < window:
            window = len(trades)
        
        if window == 0:
            return {
                'buy_pressure': 0, 'sell_pressure': 0,
                'trade_imbalance': 0, 'velocity': 0
            }
        
        recent_trades = trades[-window:]
        
        # Calculate pressure
        buys = sum(t['size'] for t in recent_trades if t['side'] == 'buy')
        sells = sum(t['size'] for t in recent_trades if t['side'] == 'sell')
        
        total = buys + sells
        
        # Calculate velocity (trades per second)
        if len(recent_trades) >= 2:
            time_span = recent_trades[-1]['timestamp'] - recent_trades[0]['timestamp']
            velocity = len(recent_trades) / time_span if time_span > 0 else 0
        else:
            velocity = 0
        
        return {
            'buy_pressure': buys / total if total > 0 else 0,
            'sell_pressure': sells / total if total > 0 else 0,
            'trade_imbalance': (buys - sells) / total if total > 0 else 0,
            'velocity': velocity
        }
    
    def estimate_hidden_liquidity(
        self, order_book: OrderBookState, price_levels: int = 5
    ) -> float:
        """Estimate hidden liquidity using statistical methods."""
        if not order_book.bid_levels or not order_book.ask_levels:
            return 0
        
        # Method: Compare visible depth to historical average
        visible_bid = sum(q for _, q in order_book.bid_levels[:price_levels])
        visible_ask = sum(q for _, q in order_book.ask_levels[:price_levels])
        
        # Historical average (simplified - in practice would use rolling mean)
        avg_bid_depth = visible_bid * 1.5  # Assume 50% hidden on average
        avg_ask_depth = visible_ask * 1.5
        
        hidden_bid = max(0, avg_bid_depth - visible_bid)
        hidden_ask = max(0, avg_ask_depth - visible_ask)
        
        return hidden_bid + hidden_ask
    
    def detect_quote_cramming(self, order_updates: List[Dict], window: float = 1.0) -> bool:
        """Detect rapid order submissions/cancellations that may indicate manipulation."""
        if len(order_updates) < 50:
            return False
        
        # Count updates within time window
        end_time = order_updates[-1]['timestamp']
        start_time = end_time - window
        
        recent_updates = [
            u for u in order_updates 
            if start_time <= u['timestamp'] <= end_time
        ]
        
        # Flag if high frequency of updates with low execution ratio
        execution_rate = len([u for u in recent_updates if u['type'] == 'execution']) / len(recent_updates)
        
        return len(recent_updates) > 100 and execution_rate < 0.1
```

---

---



### Pattern 2: Risk-Managed Trading Logic with Validation

```python
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TradeSignal:
    """Immutable trade signal with all required validation constraints."""
    symbol: str
    side: str  # "buy" or "sell"
    price: float
    quantity: float
    confidence: float  # 0.0 to 1.0
    reason: str

    def validate(self) -> bool:
        """Validate that the trade signal meets all business constraints."""
        if self.quantity <= 0:
            raise ValueError(f"Quantity must be positive, got {self.quantity}")
        if self.price <= 0:
            raise ValueError(f"Price must be positive, got {self.price}")
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError(f"Confidence must be between 0 and 1, got {self.confidence}")
        return True


def generate_trade_signal(
    symbol: str,
    side: str,
    price: float,
    quantity: float,
    confidence: float,
    reason: str,
) -> TradeSignal:
    """Generate a validated trade signal with guard clause checks."""
    if side not in ("buy", "sell"):
        raise ValueError(f"Invalid side '{side}', must be 'buy' or 'sell'")

    signal = TradeSignal(
        symbol=symbol,
        side=side,
        price=price,
        quantity=quantity,
        confidence=confidence,
        reason=reason,
    )
    signal.validate()
    logger.info("Trade signal generated: %s %s %.4f @ %.2f (confidence=%.2f)",
                 symbol, side, quantity, price, confidence)
    return signal


def execute_with_risk_check(signal: TradeSignal, max_position_pct: float = 0.05) -> dict:
    """Execute a trade signal after applying risk management checks."""
    adjusted_quantity = signal.quantity
    if signal.side == "buy" and signal.quantity > max_position_pct:
        logger.warning("Position %s exceeds max %.1f%% — capping to %.4f",
                        signal.symbol, max_position_pct * 100, max_position_pct)
        adjusted_quantity = max_position_pct

    return {
        "symbol": signal.symbol,
        "side": signal.side,
        "price": signal.price,
        "quantity": adjusted_quantity,
        "capped": adjusted_quantity < signal.quantity,
        "confidence": signal.confidence,
        "status": "submitted",
    }
```

## Constraints

### MUST DO
- Implement indicator calculations using rolling windows with explicit lookback periods; never use full-history data for online indicators
- Validate signal generation by confirming alignment across multiple independent indicators before acting on a single signal
- Calculate all price-based indicators (SMA, EMA, RSI) on closing prices unless specifically designed for tick data
- Include proper handling of missing/NaN candles in indicator pipelines — forward-fill only within session boundaries
- Log signal generation with the full context window of indicator values that led to each signal

### MUST NOT DO
- Do not use look-ahead bias: never reference future bars or prices when calculating indicators during backtesting
- Avoid recalculating all indicators from scratch on every tick — maintain running state for efficiency
- Never combine indicators with different timeframes without explicit resampling and clear documentation of the alignment logic
- Do not generate signals based on a single indicator crossover; require confirmation from price action or volume
- Avoid hardcoding parameter values (e.g., RSI period = 14) without testing regime-specific optima


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Market Microstructure Overview](https://en.wikipedia.org/wiki/Market_microstructure)
- [Limit Order Book Dynamics](https://en.wikipedia.org/wiki/Limit_order_book)
- [Bid-Ask Spread Analysis](https://www.investopedia.com/terms/b/bid-ask-spread.asp)
- [High-Frequency Trading Microstructure](https://arxiv.org/abs/0802.2576)
- [Market Maker Behavior and Inventory](https://en.wikipedia.org/wiki/Market_microstructure)
