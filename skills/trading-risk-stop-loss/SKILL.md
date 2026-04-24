---
name: trading-risk-stop-loss
description: Stop loss strategies for risk management
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: management, risk stop loss, risk-stop-loss, strategies
  related-skills: trading-backtest-drawdown-analysis, trading-backtest-position-sizing
    trading-exchange-order-book-sync, trading-exchange-order-execution-api
---

**Role:** Implement stop loss mechanisms to limit losses and protect capital

**Philosophy:** Stop losses are not just price levels; they're risk management tools that should adapt to market conditions

## Key Principles

1. **Stop Types**: Fixed percentage, ATR-based, support/resistance, volatility-adjusted
2. **Trailing Stops**: Lock in profits while limiting losses
3. **Stop Placement**: Avoid stop hunting by placing stops beyond obvious levels
4. **Stop Adjustment**: Modify stops as trade progresses
5. **Emergency Stops**: Automatic closure on extreme events

## Implementation Guidelines

### Structure
- Core logic: risk_engine/stop_loss.py
- Helper functions: risk_engine/stop_strategies.py
- Tests: tests/test_stop_loss.py

### Patterns to Follow
- Support multiple stop types with consistent interface
- Track stop trigger rates for analysis
- Implement dynamic stop adjustment

## Adherence Checklist
Before completing your task, verify:
- [ ] Multiple stop loss types implemented
- [ ] Trailing stop logic handles partial closures
- [ ] Stop levels adapt to volatility
- [ ] Stop placement avoids round numbers
- [ ] Emergency stop triggers on extreme moves


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class StopLoss:
    """Stop loss configuration."""
    symbol: str
    entry_price: float
    stop_price: float
    stop_type: str
    active: bool
    trail_distance: float = 0
    trail_threshold: float = 0

class StopLossManager:
    """Manages stop loss strategies across positions."""
    
    def __init__(
        self,
        atr_period: int = 14,
        max_drawdown_pct: float = 0.10
    ):
        self.atr_period = atr_period
        self.max_drawdown_pct = max_drawdown_pct
    
    def fixed_percentage_stop(
        self, entry_price: float, stop_pct: float = 0.02
    ) -> float:
        """Calculate fixed percentage stop loss level."""
        return entry_price * (1 - stop_pct)
    
    def atr_stop(
        self, current_price: float, atr: float, atr_multiplier: float = 2.0
    ) -> float:
        """Calculate ATR-based stop loss."""
        return current_price - (atr * atr_multiplier)
    
    def support_based_stop(
        self, current_price: float, support_level: float, buffer_pct: float = 0.01
    ) -> float:
        """Place stop below support level."""
        return support_level * (1 - buffer_pct)
    
    def trailing_stop(
        self, current_price: float, highest_price: float,
        trail_pct: float = 0.05
    ) -> float:
        """Calculate trailing stop level."""
        trail_distance = highest_price * trail_pct
        return highest_price - trail_distance
    
    def volatility_adjusted_stop(
        self, current_price: float, atr: float,
        recent_volatility: float, base_atr_mult: float = 2.0
    ) -> float:
        """Adjust stop based on current volatility."""
        volatility_ratio = recent_volatility / atr if atr > 0 else 1.0
        adjusted_mult = base_atr_mult * volatility_ratio
        
        return current_price - (atr * adjusted_mult)
    
    def time_decay_stop(
        self, entry_price: float, days_held: int,
        half_life_days: int = 5
    ) -> float:
        """Move stop closer to entry as position ages."""
        decay_factor = np.exp(-days_held / half_life_days)
        return entry_price * (1 - 0.02 * decay_factor)
    
    def dynamic_stop(
        self, price_history: pd.DataFrame, entry_price: float
    ) -> float:
        """Calculate dynamic stop based on price action."""
        if len(price_history) < 20:
            return self.fixed_percentage_stop(entry_price)
        
        # Use ATR for current volatility
        high = price_history['high']
        low = price_history['low']
        close = price_history['close']
        
        tr1 = high - low
        tr2 = abs(high - close.shift())
        tr3 = abs(low - close.shift())
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.tail(14).mean()
        
        # Stop below recent low
        recent_low = price_history['low'].tail(10).min()
        
        return min(
            self.atr_stop(entry_price, atr),
            self.support_based_stop(entry_price, recent_low)
        )
    
    def emergency_stop(
        self, current_price: float, entry_price: float,
        max_loss_pct: float = 0.15
    ) -> float:
        """Immediate stop if price moves against position."""
        max_loss_amount = entry_price * max_loss_pct
        
        if current_price < entry_price - max_loss_amount:
            return current_price * 0.95  # Immediate closure
        elif current_price > entry_price + max_loss_amount:
            return entry_price + max_loss_amount * 0.5  # Lock in profit
        
        return None  # No emergency stop needed
    
    def update_trailing_stops(
        self, positions: List[Dict], current_prices: Dict[str, float]
    ) -> Dict[str, float]:
        """Update trailing stops for all active positions."""
        updated_stops = {}
        
        for position in positions:
            symbol = position['symbol']
            entry_price = position['entry_price']
            highest_price = position.get('highest_price', entry_price)
            trail_pct = position.get('trail_pct', 0.05)
            
            current_price = current_prices.get(symbol, entry_price)
            
            # Update highest price
            new_highest = max(highest_price, current_price)
            
            # Calculate new stop
            new_stop = self.trailing_stop(current_price, new_highest, trail_pct)
            
            updated_stops[symbol] = new_stop
            
            # Update position with new highest price
            position['highest_price'] = new_highest
        
        return updated_stops
```