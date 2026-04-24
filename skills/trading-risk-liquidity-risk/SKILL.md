---
name: trading-risk-liquidity-risk
description: Liquidity assessment and trade execution risk
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: assessment, execution, risk liquidity risk, risk-liquidity-risk, trade
  related-skills: trading-backtest-drawdown-analysis, trading-backtest-position-sizing,
    trading-exchange-order-book-sync, trading-exchange-order-execution-api
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