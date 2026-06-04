---
name: risk-liquidity-risk
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- config
- do-dont
description: '"Implements liquidity assessment and trade execution risk for risk management
  and algorithmic trading execution."'
license: MIT
maturity: stable
metadata:
  domain: trading
  output-format: code
  related-skills: backtest-drawdown-analysis, exchange-order-execution-api
  role: implementation
  scope: implementation
  triggers: assessment, execution, risk liquidity risk, risk-liquidity-risk, trade
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
**Role:** Evaluate liquidity conditions before executing trades

**Philosophy:** Liquidity dries up when needed most; position sizing should reflect real-time liquidity

## Key Principles

1. **Liquidity Metrics**: Spread, depth, turnover ratio, market impact
2. **Liquidity Score**: Composite measure of liquidity conditions
3. **Trade Sizing Limits**: Based on available liquidity
4. **Liquidity Warnings**: Alerts when liquidity falls below thresholds
5. **Hierarchical Liquidity**: Order book levels for partial fills

## Implementation Guidelines

### Structure
- Core logic: risk_engine/liquidity.py
- Helper functions: risk_engine/market_depth.py
- Tests: tests/test_liquidity.py

### Patterns to Follow
- Calculate multiple liquidity metrics
- Track liquidity over time
- Link liquidity to position sizing

## Adherence Checklist
Before completing your task, verify:
- [ ] Multiple liquidity metrics calculated
- [ ] Liquidity score combines all metrics
- [ ] Trade size limits enforced
- [ ] Liquidity warnings at configured thresholds
- [ ] Order book depth used for execution planning


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

@dataclass
class LiquidityMetrics:
    """Liquidity metrics for an instrument."""
    bid_ask_spread: float
    bid_ask_spread_pct: float
    order_book_depth: float
    turnover_ratio: float
    market_impact: float
    liquidity_score: float

class LiquidityAssessment:
    """Assesses market liquidity conditions."""
    
    def __init__(
        self,
        avg_volume_window: int = 20,
        spread_threshold: float = 0.005
    ):
        self.avg_volume_window = avg_volume_window
        self.spread_threshold = spread_threshold
    
    def calculate_spread_metrics(
        self, order_book: Dict[str, List], current_price: float
    ) -> Tuple[float, float]:
        """Calculate bid-ask spread from order book."""
        if not order_book.get('bids') or not order_book.get('asks'):
            return 0, 0
        
        best_bid = order_book['bids'][0][0]
        best_ask = order_book['asks'][0][0]
        
        spread = best_ask - best_bid
        spread_pct = spread / current_price if current_price > 0 else 0
        
        return spread, spread_pct
    
    def calculate_order_book_depth(
        self, order_book: Dict[str, List], levels: int = 5
    ) -> Dict[str, float]:
        """Calculate order book depth at various price levels."""
        if not order_book.get('bids') or not order_book.get('asks'):
            return {'bid_depth': 0, 'ask_depth': 0, 'total_depth': 0}
        
        # Sum volume at top N levels
        bid_depth = sum(q for _, q in order_book['bids'][:levels])
        ask_depth = sum(q for _, q in order_book['asks'][:levels])
        
        return {
            'bid_depth': bid_depth,
            'ask_depth': ask_depth,
            'total_depth': bid_depth + ask_depth,
            'imbalance': bid_depth / ask_depth if ask_depth > 0 else 1.0
        }
    
    def calculate_turnover_ratio(
        self, daily_volume: float, avg_volume: float
    ) -> float:
        """Calculate turnover ratio."""
        return daily_volume / avg_volume if avg_volume > 0 else 0
    
    def calculate_liquidity_score(
        self, metrics: Dict[str, float], weights: Dict[str, float] = None
    ) -> float:
        """Calculate composite liquidity score (0-1)."""
        if weights is None:
            weights = {
                'spread_pct': 0.35,
                'depth': 0.30,
                'turnover': 0.20,
                'impact': 0.15
            }
        
        scores = []
        
        # Spread score (lower is better)
        spread_pct = metrics.get('spread_pct', 0.01)
        spread_score = 1 - min(spread_pct / 0.01, 1.0)
        scores.append(spread_score * weights['spread_pct'])
        
        # Depth score (higher is better)
        depth = metrics.get('depth', 0)
        depth_score = min(depth / 1000, 1.0)
        scores.append(depth_score * weights['depth'])
        
        # Turnover score (higher is better)
        turnover = metrics.get('turnover', 0)
        turnover_score = min(turnover / 2.0, 1.0)
        scores.append(turnover_score * weights['turnover'])
        
        # Impact score (lower is better)
        impact = metrics.get('impact', 0.001)
        impact_score = 1 - min(impact / 0.005, 1.0)
        scores.append(impact_score * weights['impact'])
        
        return sum(scores)
    
    def assess_liquidity(
        self, candles: pd.DataFrame, order_book: Dict[str, List] = None
    ) -> LiquidityMetrics:
        """Comprehensive liquidity assessment."""
        # Calculate volume-based metrics
        avg_volume = candles['volume'].tail(self.avg_volume_window).mean()
        current_volume = candles['volume'].iloc[-1] if len(candles) > 0 else 0
        
        turnover = current_volume / avg_volume if avg_volume > 0 else 0
        
        # Calculate spread from candles (proxy)
        spread_pct = (candles['high'] - candles['low']).tail(10).mean() / candles['close'].tail(10).mean() if len(candles) > 0 else 0.01
        
        # Order book depth if available
        depth = 0
        if order_book:
            depth_metrics = self.calculate_order_book_depth(order_book)
            depth = depth_metrics['total_depth']
        
        # Calculate impact (simplified)
        impact = spread_pct + (1 - depth / 10000)
        
        # Composite score
        metrics = {
            'spread_pct': spread_pct,
            'depth': depth,
            'turnover': turnover,
            'impact': impact
        }
        
        score = self.calculate_liquidity_score(metrics)
        
        return LiquidityMetrics(
            bid_ask_spread=spread_pct * candles['close'].iloc[-1] if len(candles) > 0 else 0,
            bid_ask_spread_pct=spread_pct,
            order_book_depth=depth,
            turnover_ratio=turnover,
            market_impact=impact,
            liquidity_score=score
        )
    
    def get_max_trade_size(
        self, liquidity_score: float, base_size: float,
        max_impact_pct: float = 0.005
    ) -> float:
        """Determine maximum trade size given liquidity."""
        if liquidity_score < 0.3:
            return base_size * 0.25  # Only 25% of normal size
        elif liquidity_score < 0.5:
            return base_size * 0.5  # 50% size
        elif liquidity_score < 0.7:
            return base_size * 0.75  # 75% size
        else:
            return base_size  # Normal size
    
    def liquidity_warning_levels(
        self, score: float
    ) -> Tuple[bool, str, str]:
        """Determine warning level based on liquidity score."""
        if score < 0.3:
            return True, 'CRITICAL', 'Severely illiquid - avoid trading'
        elif score < 0.5:
            return True, 'WARNING', 'Low liquidity - reduce position size'
        elif score < 0.7:
            return False, 'MODERATE', 'Moderate liquidity - monitor closely'
        else:
            return False, 'GOOD', 'Adequate liquidity'
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
- Calculate position sizing using a risk-per-trade percentage of portfolio equity, not a fixed dollar amount
- Implement layered risk controls: stop loss → drawdown limit → portfolio-level circuit breaker → kill switch
- Compute VaR using historical simulation with at least 1 year of data and multiple confidence levels (95%, 99%)
- Track correlation matrices across all open positions and flag portfolios where top-3 correlations exceed 0.8
- Log all risk events (stop hits, drawdown warnings, kill switches) with full context including P&L, position state, and market conditions

### MUST NOT DO
- Do not use a stop loss as the sole risk control — always layer with portfolio-level limits
- Avoid recalculating position sizes during active drawdown without regime analysis — volatility is likely elevated
- Never allow a single position to exceed 5% of portfolio equity regardless of signal strength or confidence score
- Do not backtest risk metrics without including slippage, commissions, and partial fills in the simulation
- Avoid using standard deviation alone for VaR when returns show fat tails — use historical simulation or EVT


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Liquidity Risk Explained](https://www.investopedia.com/terms/l/liquidityrisk.asp)
- [Market Liquidity Measures](https://en.wikipedia.org/wiki/Liquability_(finance))
- [Liquidity Risk in Portfolio Management](https://www.investopedia.com/articles/investing/07/liquability-risk.asp)
- [Bid-Ask Spread and Market Depth](https://www.investopedia.com/terms/b/bid-ask-spread.asp)
- [Liquidity Stress Testing Methods](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1495603)
