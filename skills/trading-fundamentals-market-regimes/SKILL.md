---
name: trading-fundamentals-market-regimes
description: Market regime detection and adaptation for trading systems across changing market conditions.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: fundamentals market regimes, fundamentals-market-regimes, regime, detection, adaptation
---

**Role:** Identify and adapt to different market regimes (trending, mean-reverting, sideways, volatile) to optimize trading strategy parameters dynamically.

**Philosophy:** Markets do not operate in a single consistent state. Successful trading requires recognizing when market behavior changes and adjusting strategies accordingly. A regime-aware system anticipates shifts in market dynamics rather than reacting to them. The philosophy emphasizes regime detection as a first-class citizen in trading systems, with adaptation happening automatically and systematically before performance degradation occurs.

## Key Principles

1. **Regime Detection First**: Analyze market state before making trading decisions
2. **Adaptive Parameters**: Strategy parameters should change based on detected regime
3. **Regime Persistence**: Regimes persist for meaningful durations; avoid over-reacting to noise
4. **Multi-Regime Awareness**: Monitor multiple regime dimensions simultaneously (trend, volatility, mean-reversion)
5. **Graceful Degradation**: When regime is uncertain, reduce exposure or use conservative parameters

## Implementation Guidelines

### Structure
- Core logic: `trading_system/regimes/regime_detector.py`
- Helper functions: `trading_system/regimes/features.py`
- Tests: `tests/regimes/`

### Patterns to Follow
- Use regime state machine for clear transitions
- Feature-based detection with weighted scoring
- Separate regime detection from strategy execution
- Maintain regime history for statistical analysis

## Adherence Checklist
Before completing your task, verify:
- [ ] Regime detection uses at least 3 independent market features
- [ ] Strategy parameters adapt meaningfully to at least 2 regime dimensions
- [ ] Regime transitions have minimum persistence duration (no rapid flipping)
- [ ] System has fallback behavior for "unknown" or "transition" regimes
- [ ] Regime detection includes statistical confidence scoring

## Code Examples

### Core Regime Detector Implementation

```python
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
from enum import Enum
import numpy as np
import pandas as pd
from datetime import datetime
from collections import deque


class MarketRegime(Enum):
    """Market regime classification."""
    TRENDING_UP = "trending_up"
    TRENDING_DOWN = "trending_down"
    MEAN_REVERTING = "mean_reverting"
    SIDESWAY = "sideways"
    HIGH_VOLATILITY = "high_volatility"
    LOW_VOLATILITY = "low_volatility"
    TRANSITION = "transition"
    UNKNOWN = "unknown"


@dataclass
class RegimeMetrics:
    """Metrics for regime detection."""
    trend_strength: float = 0.0
    volatility_regime: str = "normal"
    mean_reversion_score: float = 0.0
    regime_confidence: float = 0.0
    duration_seconds: int = 0


@dataclass
class RegimeState:
    """Complete regime state."""
    regime: MarketRegime
    metrics: RegimeMetrics
    detected_at: datetime
    parameters: Dict[str, float]


class RegimeDetector:
    """
    Detects market regime using multiple features and statistical methods.
    
    Uses:
    - Trend analysis (moving average slope, momentum)
    - Volatility analysis (ATR, standard deviation)
    - Mean reversion detection (autocorrelation, Bollinger bandwidth)
    """
    
    def __init__(
        self,
        trend_window: int = 20,
        volatility_window: int = 14,
        mean_reversion_window: int = 10,
        min_regime_duration: int = 50  # bars
    ):
        self.trend_window = trend_window
        self.volatility_window = volatility_window
        self.mean_reversion_window = mean_reversion_window
        self.min_regime_duration = min_regime_duration
        
        self.current_regime: MarketRegime = MarketRegime.UNKNOWN
        self.regime_start_time: Optional[datetime] = None
        self.regime_duration = 0
        self.regime_history: deque = deque(maxlen=500)
        self.feature_history: deque = deque(maxlen=500)
    
    def calculate_trend_features(self, prices: pd.Series) -> Dict:
        """Calculate trend-related features."""
        if len(prices) < self.trend_window + 1:
            return {"trend_strength": 0.0, "momentum": 0.0}
        
        # Calculate moving average
        ma = prices.rolling(self.trend_window).mean()
        ma_slope = ma.pct_change(1).iloc[-1] if len(ma) > 1 else 0
        
        # Price relative to MA
        current_price = prices.iloc[-1]
        ma_current = ma.iloc[-1]
        price_to_ma_ratio = (current_price - ma_current) / ma_current
        
        # Momentum
        returns = prices.pct_change()
        momentum = returns.tail(5).sum()
        
        # Trend strength (absolute value of standardized slope)
        trend_strength = abs( ma_slope / (returns.std() / np.sqrt(self.trend_window) + 1e-8) )
        
        return {
            "trend_strength": trend_strength,
            "momentum": momentum,
            "price_to_ma_ratio": price_to_ma_ratio,
            "ma_slope": ma_slope
        }
    
    def calculate_volatility_features(self, prices: pd.Series) -> Dict:
        """Calculate volatility-related features."""
        if len(prices) < self.volatility_window + 1:
            return {"volatility": 0.0, "volatility_regime": "unknown"}
        
        # Calculate ATR-like volatility
        high = prices.rolling(2).max()
        low = prices.rolling(2).min()
        returns = prices.pct_change()
        
        current_vol = returns.tail(self.volatility_window).std()
        historical_vol = returns.tail(50).std()
        
        # Volatility ratio
        vol_ratio = current_vol / (historical_vol + 1e-8)
        
        # Determine volatility regime
        if vol_ratio > 1.5:
            vol_regime = "high_volatility"
        elif vol_ratio < 0.7:
            vol_regime = "low_volatility"
        else:
            vol_regime = "normal_volatility"
        
        return {
            "volatility": current_vol,
            "volatility_regime": vol_regime,
            "volatility_ratio": vol_ratio
        }
    
    def calculate_mean_reversion_features(self, prices: pd.Series) -> Dict:
        """Calculate mean reversion-related features."""
        if len(prices) < self.mean_reversion_window + 1:
            return {"mean_reversion_score": 0.0, "autocorr_1": 0.0}
        
        returns = prices.pct_change().dropna()
        
        # Autocorrelation at different lags
        autocorr_1 = returns.autocorr(lag=1)
        autocorr_5 = returns.autocorr(lag=5) if len(returns) > 5 else 0
        
        # Bollinger bandwidth (narrow = more mean-reverting)
        ma = prices.rolling(20).mean()
        std = prices.rolling(20).std()
        current_price = prices.iloc[-1]
        bb_width = std.iloc[-1] / ma.iloc[-1]
        
        # Mean reversion score (negative autocorr = mean reversion)
        mean_reversion_score = -0.6 * autocorr_1 - 0.4 * autocorr_5
        
        return {
            "mean_reversion_score": mean_reversion_score,
            "autocorr_1": autocorr_1,
            "autocorr_5": autocorr_5,
            "bb_width": bb_width
        }
    
    def detect_regime(self, prices: pd.Series, current_time: datetime) -> RegimeState:
        """
        Detect current market regime based on all features.
        
        Returns:
            RegimeState with detected regime and metrics
        """
        # Calculate all features
        trend_features = self.calculate_trend_features(prices)
        volatility_features = self.calculate_volatility_features(prices)
        mr_features = self.calculate_mean_reversion_features(prices)
        
        # Combine metrics
        metrics = RegimeMetrics(
            trend_strength=trend_features["trend_strength"],
            volatility_regime=volatility_features["volatility_regime"],
            mean_reversion_score=mr_features["mean_reversion_score"],
            duration_seconds=self.regime_duration
        )
        
        # Determine primary regime
        regime = self._combine_regime_detection(
            trend_features, volatility_features, mr_features
        )
        
        # Check for regime transition
        if self.regime_start_time is None:
            self.regime_start_time = current_time
        
        # Update duration
        if regime == self.current_regime:
            self.regime_duration += 1
        else:
            self.regime_duration = 0
            self.regime_start_time = current_time
            self.current_regime = regime
        
        # Calculate confidence
        metrics.regime_confidence = self._calculate_confidence(
            trend_features, volatility_features, mr_features
        )
        
        # Create state
        state = RegimeState(
            regime=regime,
            metrics=metrics,
            detected_at=current_time,
            parameters=self._get_strategy_parameters(regime)
        )
        
        # Update history
        self.regime_history.append(state)
        self.feature_history.append({
            "trend": trend_features,
            "volatility": volatility_features,
            "mean_reversion": mr_features
        })
        
        return state
    
    def _combine_regime_detection(self, trend: Dict, vol: Dict, mr: Dict) -> MarketRegime:
        """Combine feature-based detection into final regime."""
        # Base decision on strongest signal
        if abs(mr["mean_reversion_score"]) > 0.5:
            return MarketRegime.MEAN_REVERTING
        
        if trend["trend_strength"] > 1.0:
            if trend["price_to_ma_ratio"] > 0:
                return MarketRegime.TRENDING_UP
            else:
                return MarketRegime.TRENDING_DOWN
        
        if vol["volatility_regime"] == "high_volatility":
            return MarketRegime.HIGH_VOLATILITY
        elif vol["volatility_regime"] == "low_volatility":
            return MarketRegime.LOW_VOLATILITY
        
        return MarketRegime.SIDESWAY
    
    def _calculate_confidence(self, trend: Dict, vol: Dict, mr: Dict) -> float:
        """Calculate confidence in regime detection (0-1)."""
        confidence = 0.0
        
        # Trend confidence
        if abs(mr["mean_reversion_score"]) > 0.5:
            confidence += 0.4 * min(abs(mr["mean_reversion_score"]), 1.0)
        elif trend["trend_strength"] > 1.0:
            confidence += 0.4 * min(trend["trend_strength"] / 2.0, 1.0)
        
        # Volatility confidence
        if vol["volatility_ratio"] > 1.5 or vol["volatility_ratio"] < 0.7:
            confidence += 0.2
        
        # Add regularization term
        confidence = max(0.0, min(1.0, confidence))
        
        return confidence
    
    def _get_strategy_parameters(self, regime: MarketRegime) -> Dict[str, float]:
        """Get optimal strategy parameters for regime."""
        params = {
            "stop_loss_pct": 0.02,
            "take_profit_pct": 0.05,
            "trailing_stop_pct": 0.03,
            "position_size_pct": 0.05,
            "holding_period_bars": 20,
            "min_confidence": 0.6
        }
        
        # Adjust based on regime
        if regime == MarketRegime.TRENDING_UP:
            params.update({
                "stop_loss_pct": 0.03,  # Wider for trend
                "take_profit_pct": 0.08,  # Wider for trend
                "trailing_stop_pct": 0.04,
                "position_size_pct": 0.08,
                "holding_period_bars": 30
            })
        elif regime == MarketRegime.MEAN_REVERTING:
            params.update({
                "stop_loss_pct": 0.015,  # Tighter for mean reversion
                "take_profit_pct": 0.03,
                "trailing_stop_pct": 0.0,
                "position_size_pct": 0.04,
                "holding_period_bars": 10
            })
        elif regime == MarketRegime.HIGH_VOLATILITY:
            params.update({
                "stop_loss_pct": 0.025,
                "take_profit_pct": 0.06,
                "trailing_stop_pct": 0.035,
                "position_size_pct": 0.03,  # Smaller position
                "holding_period_bars": 25
            })
        elif regime == MarketRegime.SIDESWAY:
            params.update({
                "stop_loss_pct": 0.015,
                "take_profit_pct": 0.025,
                "trailing_stop_pct": 0.0,
                "position_size_pct": 0.03,
                "holding_period_bars": 8
            })
        
        return params
    
    def get_current_state(self) -> Optional[RegimeState]:
        """Get current regime state."""
        if not self.regime_history:
            return None
        return self.regime_history[-1]
    
    def get_regime_history(self, n: int = 10) -> List[RegimeState]:
        """Get recent regime history."""
        return list(self.regime_history)[-n:]


# Example usage
if __name__ == "__main__":
    # Create sample price data with regime changes
    np.random.seed(42)
    
    # Generate prices with different regime behaviors
    prices_list = []
    trend = 0
    
    for i in range(200):
        if i < 50:
            # Trending up
            trend = 0.1
        elif i < 100:
            # Mean reverting
            trend = -0.05 * (len(prices_list) % 10 - 5) if prices_list else 0
        elif i < 150:
            # High volatility
            trend = 0
        else:
            # Sideways
            trend = 0
        
        noise = np.random.randn() * (0.5 if i >= 100 and i < 150 else 0.3)
        price = (prices_list[-1] if prices_list else 100) + trend + noise
        prices_list.append(price)
    
    prices = pd.Series(prices_list)
    
    # Initialize detector
    detector = RegimeDetector()
    
    # Detect regimes
    regimes_detected = []
    for i in range(50, len(prices), 10):
        state = detector.detect_regime(prices.iloc[:i+1], datetime.now())
        regimes_detected.append({
            "bar": i,
            "regime": state.regime.value,
            "confidence": state.metrics.regime_confidence
        })
    
    print("Regime detection results:")
    for item in regimes_detected[:15]:
        print(f"  Bar {item['bar']}: {item['regime']} (confidence: {item['confidence']:.2f})")
```

### Regime-Aware Strategy Adapter

```python
from typing import Dict, List, Optional
import pandas as pd
import numpy as np


class RegimeAwareStrategyAdapter:
    """
    Adapts strategy behavior based on detected market regime.
    
    This adapter wraps any strategy and modifies its behavior
    based on current market regime.
    """
    
    def __init__(self, base_strategy, regime_detector):
        self.base_strategy = base_strategy
        self.regime_detector = regime_detector
        self.current_regime = None
        self.parameters = {}
    
    def update_regime(self, prices: pd.Series, current_time: datetime) -> Optional[str]:
        """Update regime and return regime name if changed."""
        state = self.regime_detector.detect_regime(prices, current_time)
        
        if state.regime != self.current_regime:
            old_regime = self.current_regime
            self.current_regime = state.regime
            self.parameters = state.parameters
            
            return f"Regime changed from {old_regime} to {state.regime}"
        
        return None
    
    def generate_signal(self, prices: pd.Series, current_time: datetime) -> Dict:
        """
        Generate trading signal adapted to current regime.
        
        Returns signal with regime-adjusted parameters.
        """
        # Update regime if needed
        self.update_regime(prices, current_time)
        
        # Generate base signal
        base_signal = self.base_strategy.generate_signal(prices, current_time)
        
        # Adapt signal based on regime
        adapted_signal = self._adapt_signal(base_signal)
        
        return {
            "original_signal": base_signal,
            "adapted_signal": adapted_signal,
            "current_regime": self.current_regime.value if self.current_regime else "unknown",
            "parameters": self.parameters
        }
    
    def _adapt_signal(self, base_signal: Dict) -> Dict:
        """Adapt signal based on current regime parameters."""
        if not base_signal:
            return base_signal
        
        # Scale position size based on regime
        base_position = base_signal.get("position_size", 0)
        position_scale = self.parameters.get("position_size_pct", 1.0)
        
        # Adjust stop loss based on regime
        base_stop = base_signal.get("stop_loss", 0)
        stop_pct = self.parameters.get("stop_loss_pct", 0.02)
        
        # Adjust take profit based on regime
        base_tp = base_signal.get("take_profit", 0)
        tp_pct = self.parameters.get("take_profit_pct", 0.05)
        
        adapted = base_signal.copy()
        adapted["position_size"] = base_position * position_scale
        adapted["stop_loss_pct"] = stop_pct
        adapted["take_profit_pct"] = tp_pct
        
        # Add regime metadata
        adapted["regime"] = self.current_regime.value if self.current_regime else "unknown"
        adapted["confidence"] = self.parameters.get("min_confidence", 0.6)
        
        return adapted
    
    def get_regime_state(self) -> Dict:
        """Get current regime state for logging/monitoring."""
        state = self.regime_detector.get_current_state()
        if not state:
            return {"regime": "unknown", "confidence": 0.0}
        
        return {
            "regime": state.regime.value,
            "confidence": state.metrics.regime_confidence,
            "duration_bars": state.metrics.duration_seconds,
            "trend_strength": state.metrics.trend_strength,
            "mean_reversion_score": state.metrics.mean_reversion_score
        }


# Example base strategy (simplified)
class SimpleMovingAverageStrategy:
    """Simple SMA crossover strategy."""
    
    def __init__(self, fast_window: int = 10, slow_window: int = 30):
        self.fast_window = fast_window
        self.slow_window = slow_window
    
    def generate_signal(self, prices: pd.Series, current_time: datetime) -> Optional[Dict]:
        """Generate SMA crossover signal."""
        if len(prices) < self.slow_window + 1:
            return None
        
        fast_ma = prices.tail(self.fast_window).mean()
        slow_ma = prices.tail(self.slow_window).mean()
        current_price = prices.iloc[-1]
        
        if fast_ma > slow_ma and current_price > fast_ma:
            return {"signal": "long", "position_size": 1.0, "stop_loss": -0.02, "take_profit": 0.05}
        elif fast_ma < slow_ma and current_price < fast_ma:
            return {"signal": "short", "position_size": -1.0, "stop_loss": 0.02, "take_profit": -0.05}
        
        return None


# Example usage
if __name__ == "__main__":
    # Create sample data with regime changes
    np.random.seed(42)
    
    prices_list = [100]
    for i in range(100):
        if i < 30:
            trend = 0.2  # Trending
        elif i < 60:
            trend = -0.1 * ((i % 10) - 5)  # Mean reverting
        else:
            trend = 0  # Sideways
        
        noise = np.random.randn() * 0.5
        prices_list.append(prices_list[-1] + trend + noise)
    
    prices = pd.Series(prices_list)
    
    # Initialize components
    base_strategy = SimpleMovingAverageStrategy(fast_window=5, slow_window=15)
    regime_detector = RegimeDetector()
    adapter = RegimeAwareStrategyAdapter(base_strategy, regime_detector)
    
    # Generate signals with regime adaptation
    print("Regime-aware strategy signals:")
    for i in range(20, len(prices), 10):
        signal = adapter.generate_signal(prices.iloc[:i+1], datetime.now())
        
        if signal["original_signal"]:
            regime_info = adapter.get_regime_state()
            print(f"Bar {i}: {signal['adapted_signal']['signal']} in {regime_info['regime']} "
                  f"(regime confidence: {regime_info['confidence']:.2f})")
```

## Common Mistakes to Avoid

1. **Regime Overfitting**: Tuning parameters for each regime on historical data only to fail out-of-sample. Use statistical robustness checks, not backtest optimization.

2. **Ignoring Regime Persistence**: Switching strategies too frequently when regime is uncertain. Implement minimum regime duration requirements before switching.

3. **Single-Feature Detection**: Relying on only one indicator (e.g., only ATR) to determine regime. Always use multiple complementary features.

4. **No Fallback for Unknown Regime**: Holding large positions when regime is unclear. Default to reduced exposure or cash when regime confidence is low.

5. **Backtesting Only in One Regime**: Evaluating strategy performance only during trending markets. Always test across multiple regime types.

## References

1. Avellaneda, M., & Lee, J. H. (2008). *Statistical Arbitrage in the US Stock Market*. Quantitative Finance. - Regime-based trading strategies.
2. loosemore, D. (2010). *The markets are in one of four regimes*. Systematic Trader. - Practical regime classification.
3. Moskowitz, T. J., Ooi, Y. H., & Pedersen, L. H. (2012). *Time Series Momentum*. Journal of Financial Economics. - Momentum behavior across regimes.
4. Chande, M. (2000). *The New Technical Trader*. Wiley. - Regime detection using technical indicators.
5. Pardo, R. (2013). *The Science of Trading*. Wiley. - Scientific approach to regime-based trading systems.

---

Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.
