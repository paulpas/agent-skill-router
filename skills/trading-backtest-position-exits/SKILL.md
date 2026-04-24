---
name: trading-backtest-position-exits
description: Exit strategies, trailing stops, and take-profit mechanisms for trading systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: backtest position exits, backtest-position-exits, strategies, trailing, stops
---

**Role:** Manage the systematic exit of trading positions to lock in profits, limit losses, and adapt to market conditions.

**Philosophy:** Position exits are equally important as entry decisions. A great entry with poor exits will result in suboptimal performance. Exit strategies should be systematic, adaptive, and designed to capture the majority of trends while cutting losses quickly. The philosophy emphasizes probability management, risk containment, and adaptive behavior based on market state.

## Key Principles

1. **Exit as Important as Entry**: Every position should have a pre-defined exit strategy before entry
2. **Risk Containment First**: Losses must be cut quickly and systematically
3. **Adaptive Profit Taking**: Take-profit mechanisms should adapt to market volatility and trend strength
4. **Trailing Mechanisms**: Use dynamic trailing stops to capture trends while protecting gains
5. **State-Based Exits**: Different exit strategies for different market regimes (trending, mean-reverting, sideways)

## Implementation Guidelines

### Structure
- Core logic: `trading_system/exits/exit_strategies.py`
- Helper functions: `trading_system/exits/utils.py`
- Tests: `tests/exits/`

### Patterns to Follow
- Use dataclasses for exit configuration (clear, immutable parameters)
- Implement strategy pattern for different exit types
- Separate exit logic from position management
- Include market state detection for adaptive exits

## Adherence Checklist
Before completing your task, verify:
- [ ] Each position has exactly one primary exit strategy defined at entry
- [ ] Loss cut mechanisms trigger before position risk exceeds maximum threshold
- [ ] Trailing stops use volatility-adjusted distances (ATR-based)
- [ ] Take-profit levels scale with position risk (minimum 1:2 risk-reward)
- [ ] Exit strategies adapt to detected market regime

## Code Examples

### Exit Strategy Base Class and Implementations

```python
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
from enum import Enum
import numpy as np
import pandas as pd
from datetime import datetime
from abc import ABC, abstractmethod


class MarketRegime(Enum):
    """Market state classification for adaptive exits."""
    TRENDING = "trending"
    MEAN_REVERTING = "mean_reverting"
    SIDESWAY = "sideway"


@dataclass
class ExitConfig:
    """Configuration for exit strategy."""
    stop_loss_pct: float
    take_profit_pct: float
    trailing_stop_pct: float
    time_stop_hours: Optional[int] = None
    adaptive_multiplier: float = 1.0  # Adjust based on volatility


@dataclass
class PositionExit:
    """Result of exit decision."""
    exit_type: str
    exit_price: float
    exit_time: datetime
    profit_pct: float
    reason: str


class ExitStrategy(ABC):
    """Base class for exit strategies."""
    
    def __init__(self, config: ExitConfig):
        self.config = config
        self.entry_price: Optional[float] = None
        self.entry_time: Optional[datetime] = None
        self.max_price: Optional[float] = None
        self.min_price: Optional[float] = None
    
    def initialize(self, entry_price: float, entry_time: datetime):
        """Initialize strategy with entry information."""
        self.entry_price = entry_price
        self.entry_time = entry_time
        self.max_price = entry_price
        self.min_price = entry_price
    
    @abstractmethod
    def check_exit(self, current_price: float, current_time: datetime, 
                   price_history: pd.Series) -> Optional[PositionExit]:
        """Check if exit should be triggered."""
        pass
    
    def update_price_tracking(self, current_price: float):
        """Update max/min price tracking for trailing stops."""
        if self.max_price is None or current_price > self.max_price:
            self.max_price = current_price
        if self.min_price is None or current_price < self.min_price:
            self.min_price = current_price
    
    def calculate_profit_pct(self, current_price: float) -> float:
        """Calculate profit percentage from entry."""
        if self.entry_price is None:
            return 0.0
        return (current_price - self.entry_price) / self.entry_price


class FixedPercentExit(ExitStrategy):
    """Fixed percentage stop loss and take profit exit strategy."""
    
    def check_exit(self, current_price: float, current_time: datetime,
                   price_history: pd.Series) -> Optional[PositionExit]:
        """Check for fixed percent exit conditions."""
        if self.entry_price is None:
            return None
        
        self.update_price_tracking(current_price)
        
        # Calculate profit
        profit_pct = self.calculate_profit_pct(current_price)
        
        # Check stop loss
        if profit_pct <= -self.config.stop_loss_pct:
            return PositionExit(
                exit_type="stop_loss",
                exit_price=current_price,
                exit_time=current_time,
                profit_pct=profit_pct,
                reason=f"Stop loss hit at {profit_pct:.2%}"
            )
        
        # Check take profit
        if profit_pct >= self.config.take_profit_pct:
            return PositionExit(
                exit_type="take_profit",
                exit_price=current_price,
                exit_time=current_time,
                profit_pct=profit_pct,
                reason=f"Take profit hit at {profit_pct:.2%}"
            )
        
        # Check time stop if configured
        if self.config.time_stop_hours is not None and self.entry_time is not None:
            elapsed_hours = (current_time - self.entry_time).total_seconds() / 3600
            if elapsed_hours >= self.config.time_stop_hours:
                return PositionExit(
                    exit_type="time_stop",
                    exit_price=current_price,
                    exit_time=current_time,
                    profit_pct=profit_pct,
                    reason=f"Time stop exceeded {elapsed_hours:.1f} hours"
                )
        
        return None


class TrailingStopExit(ExitStrategy):
    """Dynamic trailing stop exit strategy with volatility adjustment."""
    
    def __init__(self, config: ExitConfig, atr_window: int = 14):
        super().__init__(config)
        self.atr_window = atr_window
        self.current_trailing_stop: Optional[float] = None
    
    def _calculate_atr(self, price_history: pd.Series) -> float:
        """Calculate Average True Range for volatility adjustment."""
        if len(price_history) < self.atr_window + 1:
            return price_history.std() * 0.5  # Fallback if insufficient data
        
        high = price_history.rolling(2).max()
        low = price_history.rolling(2).min()
        prev_close = price_history.shift(1)
        
        tr1 = high - low
        tr2 = abs(high - prev_close)
        tr3 = abs(low - prev_close)
        
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(self.atr_window).mean().iloc[-1]
        
        return atr if not np.isnan(atr) else price_history.std() * 0.5
    
    def check_exit(self, current_price: float, current_time: datetime,
                   price_history: pd.Series) -> Optional[PositionExit]:
        """Check for trailing stop exit."""
        if self.entry_price is None:
            return None
        
        self.update_price_tracking(current_price)
        
        # Update trailing stop based on current price
        atr = self._calculate_atr(price_history)
        trailing_distance = atr * self.config.trailing_stop_pct * self.config.adaptive_multiplier
        
        if self.current_trailing_stop is None:
            self.current_trailing_stop = self.entry_price - trailing_distance
        
        # Move trailing stop up if price increases
        new_trailing_stop = self.max_price - trailing_distance
        if new_trailing_stop > self.current_trailing_stop:
            self.current_trailing_stop = new_trailing_stop
        
        # Calculate profit
        profit_pct = self.calculate_profit_pct(current_price)
        
        # Check stop loss (trailing)
        if current_price <= self.current_trailing_stop:
            return PositionExit(
                exit_type="trailing_stop",
                exit_price=current_price,
                exit_time=current_time,
                profit_pct=profit_pct,
                reason=f"Trailing stop hit at {self.current_trailing_stop:.2f}"
            )
        
        # Check fixed take profit
        if profit_pct >= self.config.take_profit_pct:
            return PositionExit(
                exit_type="take_profit",
                exit_price=current_price,
                exit_time=current_time,
                profit_pct=profit_pct,
                reason=f"Take profit hit at {profit_pct:.2%}"
            )
        
        return None


class ProfitFactorExit(ExitStrategy):
    """Exit when profit factor or drawdown threshold is reached."""
    
    def __init__(self, config: ExitConfig, max_drawdown_pct: float = 0.05):
        super().__init__(config)
        self.max_drawdown_pct = max_drawdown_pct
        self.peak_price: Optional[float] = None
        self.first_price: Optional[float] = None
    
    def _calculate_drawdown(self, current_price: float) -> float:
        """Calculate maximum drawdown from peak."""
        if self.peak_price is None:
            return 0.0
        return (self.peak_price - current_price) / self.peak_price
    
    def check_exit(self, current_price: float, current_time: datetime,
                   price_history: pd.Series) -> Optional[PositionExit]:
        """Check for drawdown or profit factor exit."""
        if self.entry_price is None:
            return None
        
        # Initialize tracking
        if self.peak_price is None:
            self.peak_price = current_price
        if self.first_price is None:
            self.first_price = current_price
        
        self.peak_price = max(self.peak_price, current_price)
        self.update_price_tracking(current_price)
        
        profit_pct = self.calculate_profit_pct(current_price)
        drawdown = self._calculate_drawdown(current_price)
        
        # Check maximum drawdown
        if drawdown >= self.max_drawdown_pct and profit_pct > 0:
            return PositionExit(
                exit_type="drawdown_protection",
                exit_price=current_price,
                exit_time=current_time,
                profit_pct=profit_pct,
                reason=f"Drawdown protection triggered: {drawdown:.2%} from peak"
            )
        
        # Check stop loss
        if profit_pct <= -self.config.stop_loss_pct:
            return PositionExit(
                exit_type="stop_loss",
                exit_price=current_price,
                exit_time=current_time,
                profit_pct=profit_pct,
                reason=f"Stop loss hit at {profit_pct:.2%}"
            )
        
        # Check take profit
        if profit_pct >= self.config.take_profit_pct:
            return PositionExit(
                exit_type="take_profit",
                exit_price=current_price,
                exit_time=current_time,
                profit_pct=profit_pct,
                reason=f"Take profit hit at {profit_pct:.2%}"
            )
        
        return None


def detect_market_regime(price_history: pd.Series, threshold: float = 0.5) -> MarketRegime:
    """Detect current market regime based on price action."""
    if len(price_history) < 20:
        return MarketRegime.SIDESWAY
    
    # Calculate trend strength
    returns = price_history.pct_change().dropna()
    
    # Directional bias
    trend_strength = returns.mean() / returns.std()
    
    # Volatility regime
    volatility = returns.std()
    is_high_volatility = volatility > returns.quantile(0.75)
    
    # Mean reversion signal
    autocorr = returns.autocorr(lag=1)
    is_mean_reverting = autocorr < -0.1
    
    if abs(trend_strength) > threshold and not is_mean_reverting:
        return MarketRegime.TRENDING
    elif is_mean_reverting:
        return MarketRegime.MEAN_REVERTING
    else:
        return MarketRegime.SIDESWAY


class AdaptiveExitManager:
    """Manages different exit strategies based on market regime."""
    
    def __init__(self, base_config: ExitConfig):
        self.base_config = base_config
        self.active_strategy: Optional[ExitStrategy] = None
        self.regime: MarketRegime = MarketRegime.SIDESWAY
    
    def initialize(self, entry_price: float, entry_time: datetime, 
                   price_history: pd.Series):
        """Initialize exit strategy based on current market regime."""
        self.regime = detect_market_regime(price_history)
        
        # Adjust configuration based on regime
        config = self._adjust_config_for_regime(self.base_config, self.regime)
        
        # Select appropriate strategy
        if self.regime == MarketRegime.TRENDING:
            self.active_strategy = TrailingStopExit(config, atr_window=14)
        elif self.regime == MarketRegime.MEAN_REVERTING:
            self.active_strategy = FixedPercentExit(config)
        else:  # SIDESWAY
            self.active_strategy = ProfitFactorExit(config)
        
        self.active_strategy.initialize(entry_price, entry_time)
    
    def _adjust_config_for_regime(self, config: ExitConfig, 
                                   regime: MarketRegime) -> ExitConfig:
        """Adjust exit configuration based on market regime."""
        if regime == MarketRegime.TRENDING:
            # Wider stops, longer trailing, higher take profit
            return ExitConfig(
                stop_loss_pct=config.stop_loss_pct * 1.5,
                take_profit_pct=config.take_profit_pct * 1.3,
                trailing_stop_pct=config.trailing_stop_pct * 1.2,
                adaptive_multiplier=1.5
            )
        elif regime == MarketRegime.MEAN_REVERTING:
            # Tighter stops, faster exits
            return ExitConfig(
                stop_loss_pct=config.stop_loss_pct * 0.8,
                take_profit_pct=config.take_profit_pct * 0.9,
                trailing_stop_pct=0.0,  # Disable trailing
                time_stop_hours=24  # Faster time-based exits
            )
        else:  # SIDESWAY
            # Default strategy
            return config
    
    def check_exit(self, current_price: float, current_time: datetime,
                   price_history: pd.Series) -> Optional[PositionExit]:
        """Check exit conditions using active strategy."""
        if self.active_strategy is None:
            return None
        
        # Periodically re-evaluate regime
        if len(price_history) % 50 == 0:
            self.regime = detect_market_regime(price_history)
            if self.regime != MarketRegime.TRENDING:
                # Re-initialize strategy if regime changed
                if isinstance(self.active_strategy, TrailingStopExit):
                    config = self._adjust_config_for_regime(self.base_config, self.regime)
                    self.active_strategy = FixedPercentExit(config)
        
        return self.active_strategy.check_exit(current_price, current_time, price_history)


# Example usage
if __name__ == "__main__":
    # Create sample price data
    np.random.seed(42)
    prices = pd.Series(
        np.random.randn(100).cumsum() + 100,
        name="price"
    )
    
    # Create exit configuration
    config = ExitConfig(
        stop_loss_pct=0.02,  # 2% stop loss
        take_profit_pct=0.05,  # 5% take profit
        trailing_stop_pct=0.03,  # 3% trailing stop
        time_stop_hours=48
    )
    
    # Test different strategies
    strategies = [
        FixedPercentExit(config),
        TrailingStopExit(config, atr_window=14),
        ProfitFactorExit(config)
    ]
    
    for strategy in strategies:
        strategy.initialize(prices.iloc[0], datetime.now())
        
        for i in range(1, len(prices)):
            exit = strategy.check_exit(prices.iloc[i], datetime.now(), prices.iloc[:i+1])
            if exit:
                print(f"{strategy.__class__.__name__}: {exit.reason} at {exit.exit_price:.2f}")
                break
```

### Market Regime Detection and Exit Switcher

```python
from typing import Dict, List, Tuple, Optional
import pandas as pd
import numpy as np
from dataclasses import dataclass
from datetime import datetime


@dataclass
class RegimeMetrics:
    """Market regime metrics."""
    trend_strength: float
    volatility_regime: str
    mean_reversion_score: float
    breakout_probability: float


class MarketRegimeDetector:
    """Detects current market regime using multiple indicators."""
    
    def __init__(self, lookback_periods: List[int] = None):
        self.lookback_periods = lookback_periods or [20, 50, 100]
    
    def detect_regime(self, price_history: pd.Series) -> Tuple[str, RegimeMetrics]:
        """
        Detect current market regime.
        
        Returns:
            Tuple of (regime_name, metrics)
        """
        if len(price_history) < max(self.lookback_periods):
            return "insufficient_data", RegimeMetrics(0.0, "unknown", 0.0, 0.5)
        
        returns = price_history.pct_change().dropna()
        
        # Trend analysis
        trend_scores = []
        for period in self.lookback_periods:
            if len(returns) < period:
                continue
            
            rolling_returns = returns.tail(period)
            trend_score = (rolling_returns.mean() / 
                          (rolling_returns.std() + 1e-8))
            trend_scores.append(trend_score)
        
        avg_trend_strength = np.mean(trend_scores)
        
        # Volatility regime
        current_vol = returns.std()
        historical_vol = returns.tail(50).std()
        volatility_regime = "high" if current_vol > historical_vol * 1.2 else "normal"
        
        # Mean reversion score
        autocorr_1 = returns.autocorr(lag=1)
        autocorr_5 = returns.autocorr(lag=5)
        mean_reversion_score = -0.5 * (autocorr_1 + autocorr_5)
        
        # Breakout probability
        rolling_max = price_history.tail(20).max()
        rolling_min = price_history.tail(20).min()
        current_price = price_history.iloc[-1]
        breakout_prob = 0.5 + 0.5 * (current_price - rolling_min) / (rolling_max - rolling_min + 1e-8)
        
        metrics = RegimeMetrics(
            trend_strength=avg_trend_strength,
            volatility_regime=volatility_regime,
            mean_reversion_score=mean_reversion_score,
            breakout_probability=breakout_prob
        )
        
        # Determine regime
        if avg_trend_strength > 0.5 and mean_reversion_score < 0:
            regime = "trending_up"
        elif avg_trend_strength < -0.5 and mean_reversion_score < 0:
            regime = "trending_down"
        elif mean_reversion_score > 0.3:
            regime = "mean_reverting"
        else:
            regime = "sideways"
        
        return regime, metrics


class AdaptiveExitSwitcher:
    """Switches between exit strategies based on regime detection."""
    
    def __init__(self, config: ExitConfig):
        self.config = config
        self.detector = MarketRegimeDetector()
        self.active_strategy: Optional[str] = None
        self.strategy_history: List[Tuple[str, datetime]] = []
    
    def get_optimal_strategy(self, regime: str) -> str:
        """Determine optimal exit strategy for given regime."""
        strategy_map = {
            "trending_up": "trailing_stop",
            "trending_down": "trailing_stop",
            "mean_reverting": "mean_reversion",
            "sideways": "time_based",
            "insufficient_data": "fixed_percent"
        }
        return strategy_map.get(regime, "fixed_percent")
    
    def check_and_switch(self, price_history: pd.Series, current_time: datetime) -> Optional[str]:
        """Check if regime has changed and switch strategy if needed."""
        regime, _ = self.detector.detect_regime(price_history)
        optimal_strategy = self.get_optimal_strategy(regime)
        
        if self.active_strategy != optimal_strategy:
            self.active_strategy = optimal_strategy
            self.strategy_history.append((optimal_strategy, current_time))
            return optimal_strategy
        
        return None
    
    def get_strategy_config(self, strategy: str) -> Dict:
        """Get configuration for specific strategy."""
        configs = {
            "trailing_stop": {
                "stop_loss_pct": self.config.stop_loss_pct * 1.5,
                "take_profit_pct": self.config.take_profit_pct * 1.5,
                "trailing_stop_pct": self.config.trailing_stop_pct * 1.3,
                "adaptive_multiplier": 1.5
            },
            "mean_reversion": {
                "stop_loss_pct": self.config.stop_loss_pct * 0.7,
                "take_profit_pct": self.config.take_profit_pct * 0.8,
                "trailing_stop_pct": 0.0,
                "time_stop_hours": 12
            },
            "time_based": {
                "stop_loss_pct": self.config.stop_loss_pct,
                "take_profit_pct": self.config.take_profit_pct * 0.6,
                "trailing_stop_pct": 0.0,
                "time_stop_hours": 6
            },
            "fixed_percent": {
                "stop_loss_pct": self.config.stop_loss_pct,
                "take_profit_pct": self.config.take_profit_pct,
                "trailing_stop_pct": 0.0
            }
        }
        return configs.get(strategy, configs["fixed_percent"])


# Example usage
if __name__ == "__main__":
    # Create sample price data with trending behavior
    np.random.seed(42)
    prices = pd.Series(
        np.random.randn(150).cumsum() * 2 + 100,
        name="price"
    )
    
    config = ExitConfig(
        stop_loss_pct=0.02,
        take_profit_pct=0.05,
        trailing_stop_pct=0.03
    )
    
    switcher = AdaptiveExitSwitcher(config)
    
    # Simulate regime changes
    regime_changes = []
    for i in range(20, len(prices)):
        changed = switcher.check_and_switch(prices.iloc[:i], datetime.now())
        if changed:
            regime_changes.append((i, changed))
    
    print("Regime changes detected:")
    for i, strategy in regime_changes[:10]:  # Show first 10
        print(f"  t={i}: {strategy}")
```

## Common Mistakes to Avoid

1. **Reactive Exits**: Exiting based on emotion rather than pre-defined rules. Always use systematic triggers, not gut feelings.

2. **Ignoring Market State**: Using the same exit strategy in all market conditions. Trending markets need trailing stops, mean-reverting markets need tighter stops.

3. **Over-Optimization**: Setting stop loss and take profit levels based on backtest perfection rather than statistical robustness. Aim for 1:2 minimum risk-reward, not 1:5.

4. **Moving Stops Against Position**: Adjusting stop loss lower after entry to avoid hitting it. This turns a quick loss into a large loss. Set and forget.

5. **Neglecting Time-Based Exits**: Holding losing positions indefinitely because there's no time-based exit rule. Use time stops to prevent "hope trading."

## References

1. Van Tharp, M. (2007). *Trade Your Way to Financial Freedom*. McGraw-Hill. - Discusses position sizing and exit strategies.
2. Elder, A. (2007). *Come Into My Room and See the Configuration*. Van Tharp Institute. - Psychological aspects of trading systems.
3. Murphy, J. J. (2012). *Technical Analysis of the Financial Markets*. Wiley. - Comprehensive chart pattern and trend analysis.
4. Sharpe, W. F. (1994). *The Sharpe Ratio*. Journal of Portfolio Management. - Risk-adjusted return metrics for exit evaluation.
5. Elder, A. (2014). *Three Signs a Trend Is Ending*. Elder Trading. - Identifying trend exhaustion for optimal exit timing.

---

Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.
