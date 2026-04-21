---
name: trading-technical-regime-detection
description: Market Regime Detection Systems for Adaptive Trading Strategies
---

**Role:** Market Regime Analyst — implements algorithms to identify and track market regime transitions, enabling adaptive strategy parameters and risk management.

**Philosophy:** Contextual Awareness — trading strategies should adapt to prevailing market conditions; regime detection provides the context that determines which strategies and parameters are appropriate.

## Key Principles

1. **Regime-Aware Position Sizing**: Position sizes should be scaled based on regime confidence; low confidence regimes reduce exposure.

2. **Regime-Consistent Indicators**: Technical indicators should be selected and configured based on regime characteristics (e.g., mean-reverting indicators for rangebound regimes).

3. **Transition Detection**: Market regime transitions should be detected with low latency to enable timely strategy adjustments.

4. **Multi-Feature Regime Classification**: Regime detection should use multiple features (volatility, trend strength, correlation structure) to avoid single-feature false positives.

5. **Statistical Regime Stability**: Regime assignments should only be made when statistical confidence exceeds thresholds; ambiguous periods should trigger safety protocols.

## Implementation Guidelines

### Structure
- Core logic: `skills/technical-analysis/regime_detector.py`
- Feature calculators: `skills/technical-analysis/regime_features.py`
- Tests: `skills/tests/test_regime_detection.py`

### Patterns to Follow
- Use stateful regime detector classes to track historical regime assignments
- Implement features as separate calculators with clear interfaces
- Separate feature calculation from regime classification
- Use clustering algorithms for unsupervised regime identification
- Implement transition detection with hysteresis to prevent rapid flipping

## Code Examples

### Multi-Feature Regime Detection System

```python
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
from enum import Enum
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.covariance import LedoitWolf
import warnings


class MarketRegime(Enum):
    """Market regime classifications."""
    TRENDING = "trending"  # Persistent directional movement
    MEAN_REVERTING = "mean_reverting"  # Price oscillates around mean
    RANGEBOUND = "rangebound"  # Price confined to support/resistance
    VOLATILE = "volatile"  # High volatility with uncertain direction
    TRANSITIONAL = "transitional"  # Between regimes


@dataclass
class RegimeFeatures:
    """Features used for regime classification."""
    trend_strength: float
    volatility_regime: float
    mean_reversion_speed: float
    correlation_structure: np.ndarray
    variance_ratio: float
    Hurst_exponent: float


@dataclass
class RegimeAssignment:
    """Regime assignment with confidence."""
    regime: MarketRegime
    confidence: float
    timestamp: pd.Timestamp
    features: RegimeFeatures
    transition_detected: bool = False


class RegimeDetector:
    """
    Multi-feature market regime detection system.
    Identifies prevailing market conditions to adapt trading strategies.
    """
    
    def __init__(self,
                 trend_threshold: float = 0.6,
                 mean_reversion_threshold: float = 0.5,
                 volatility_threshold: float = 1.5,
                 confidence_threshold: float = 0.7,
                 lookback_window: int = 252):
        self.trend_threshold = trend_threshold
        self.mean_reversion_threshold = mean_reversion_threshold
        self.volatility_threshold = volatility_threshold
        self.confidence_threshold = confidence_threshold
        self.lookback_window = lookback_window
        self.regime_history: List[RegimeAssignment] = []
        self.current_regime: Optional[RegimeAssignment] = None
        self.previous_regime: Optional[MarketRegime] = None
    
    def calculate_features(self, prices: pd.Series) -> RegimeFeatures:
        """Calculate regime classification features from price data."""
        returns = prices.pct_change().dropna()
        log_returns = np.log(prices / prices.shift(1)).dropna()
        
        # Trend strength via ADX-like calculation
        trend_strength = self._calculate_trend_strength(prices)
        
        # Volatility regime via GARCH-like estimation
        volatility_regime = self._calculate_volatility_regime(returns)
        
        # Mean reversion speed via half-life estimation
        mean_reversion_speed = self._calculate_mean_reversion(returns)
        
        # Correlation structure for multi-asset regimes
        correlation_structure = self._estimate_correlation_structure(prices)
        
        # Variance ratio test for random walk
        variance_ratio = self._calculate_variance_ratio(returns)
        
        # Hurst exponent for persistence
        hurst = self._calculate_hurst_exponent(log_returns)
        
        return RegimeFeatures(
            trend_strength=trend_strength,
            volatility_regime=volatility_regime,
            mean_reversion_speed=mean_reversion_speed,
            correlation_structure=correlation_structure,
            variance_ratio=variance_ratio,
            Hurst_exponent=hurst
        )
    
    def _calculate_trend_strength(self, prices: pd.Series) -> float:
        """Calculate trend strength using directional movement."""
        returns = prices.pct_change().dropna()
        
        # Directional movement
        positive_days = (returns > 0).sum()
        total_days = len(returns)
        
        if total_days == 0:
            return 0.0
        
        # Strength of direction
        return abs(positive_days / total_days - 0.5) * 2
    
    def _calculate_volatility_regime(self, returns: pd.Series) -> float:
        """Calculate volatility regime relative to long-term average."""
        if len(returns) < 20:
            return 1.0
        
        short_vol = returns.tail(20).std()
        long_vol = returns.std()
        
        if long_vol == 0:
            return 1.0
        
        # Volatility regime ratio
        return short_vol / long_vol
    
    def _calculate_mean_reversion(self, returns: pd.Series) -> float:
        """Calculate mean reversion speed via OLS half-life."""
        if len(returns) < 20:
            return 0.0
        
        # Lagged regression for mean reversion
        lagged_returns = returns.shift(1).dropna()
        current_returns = returns[1:].dropna()
        
        if len(lagged_returns) < 10:
            return 0.0
        
        # OLS regression
        X = sm.add_constant(lagged_returns)
        model = sm.OLS(current_returns, X).fit()
        
        # Half-life calculation
        half_life = -np.log(2) / np.log(model.params[1])
        
        # Convert to normalized score (faster mean reversion = higher)
        return min(1.0, max(0.0, 1.0 / (1.0 + abs(half_life))))
    
    def _estimate_correlation_structure(self, prices: pd.Series) -> np.ndarray:
        """Estimate correlation structure from price series."""
        returns = prices.pct_change().dropna()
        
        if len(returns) < 2:
            return np.array([[1.0]])
        
        # Shrinkage covariance estimation
        try:
            cov_estimator = LedoitWolf()
            cov_matrix = cov_estimator.fit(returns.values.reshape(-1, 1))
            return np.array(cov_matrix.covariance_)
        except:
            return np.array([[1.0]])
    
    def _calculate_variance_ratio(self, returns: pd.Series, horizon: int = 5) -> float:
        """Calculate variance ratio for random walk hypothesis."""
        if len(returns) < horizon * 2:
            return 1.0
        
        var_single = returns.var()
        var_multi = returns.diff(horizon).var() / horizon
        
        if var_single == 0:
            return 1.0
        
        return var_multi / var_single
    
    def _calculate_hurst_exponent(self, log_prices: pd.Series) -> float:
        """Calculate Hurst exponent for long-term memory."""
        if len(log_prices) < 50:
            return 0.5
        
        # R/S analysis
        lags = range(2, min(50, len(log_prices) // 4))
        rs = []
        
        for lag in lags:
            # Split into overlapping windows
            windows = []
            for i in range(0, len(log_prices) - lag, lag):
                window = log_prices[i:i + lag]
                if len(window) >= 10:
                    windows.append(window)
            
            if not windows:
                continue
            
            # Calculate R/S for each window
            rs_values = []
            for window in windows:
                mean = window.mean()
                deviations = window - mean
                cumulative = deviations.cumsum()
                
                range_val = cumulative.max() - cumulative.min()
                std_val = deviations.std()
                
                if std_val > 0:
                    rs_values.append(range_val / std_val)
            
            if rs_values:
                rs.append(np.mean(rs_values))
        
        if len(rs) < 3:
            return 0.5
        
        # Linear regression for Hurst exponent
        log_lags = np.log(lags[:len(rs)])
        log_rs = np.log(rs)
        
        slope, _, _, _, _ = stats.linregress(log_lags, log_rs)
        
        return max(0.0, min(1.0, 0.5 + slope / 2))
    
    def classify_regime(self, features: RegimeFeatures) -> MarketRegime:
        """Classify market regime based on calculated features."""
        # Trending regime: high trend strength, moderate-high volatility
        if (features.trend_strength > self.trend_threshold and 
            features.Hurst_exponent > 0.55 and
            features.volatility_regime < self.volatility_threshold):
            return MarketRegime.TRENDING
        
        # Mean-reverting regime: strong mean reversion, low volatility
        if (features.mean_reversion_speed > self.mean_reversion_threshold and
            features.volatility_regime < 0.8 and
            features.Hurst_exponent < 0.45):
            return MarketRegime.MEAN_REVERTING
        
        # Rangebound regime: moderate trend, moderate volatility
        if (0.4 < features.Hurst_exponent < 0.6 and
            features.volatility_regime < 1.2):
            return MarketRegime.RANGEBOUND
        
        # Volatile regime: high volatility, uncertain direction
        if features.volatility_regime > self.volatility_threshold:
            return MarketRegime.VOLATILE
        
        # Transitional: ambiguous features
        return MarketRegime.TRANSITIONAL
    
    def detect_transition(self, new_regime: MarketRegime) -> bool:
        """Detect if a regime transition has occurred."""
        if self.previous_regime is None:
            return False
        
        return new_regime != self.previous_regime
    
    def assign_regime(self, prices: pd.Series, timestamp: pd.Timestamp = None) -> RegimeAssignment:
        """Assign current market regime with confidence level."""
        if timestamp is None:
            timestamp = pd.Timestamp.now()
        
        features = self.calculate_features(prices)
        regime = self.classify_regime(features)
        transition = self.detect_transition(regime)
        
        # Calculate confidence based on feature strength
        confidence = self._calculate_confidence(features, regime)
        
        assignment = RegimeAssignment(
            regime=regime,
            confidence=confidence,
            timestamp=timestamp,
            features=features,
            transition_detected=transition
        )
        
        # Update history
        self.regime_history.append(assignment)
        self.previous_regime = self.current_regime.regime if self.current_regime else None
        self.current_regime = assignment
        
        return assignment
    
    def _calculate_confidence(self, features: RegimeFeatures, regime: MarketRegime) -> float:
        """Calculate confidence score for regime assignment."""
        confidence = 0.0
        
        # Higher confidence for extreme values
        if regime == MarketRegime.TRENDING:
            confidence += features.trend_strength * 0.4
            confidence += (1 - abs(features.Hurst_exponent - 0.7)) * 0.3
            confidence += (1 - features.volatility_regime / 2) * 0.3
        elif regime == MarketRegime.MEAN_REVERTING:
            confidence += features.mean_reversion_speed * 0.5
            confidence += (1 - abs(features.Hurst_exponent - 0.3)) * 0.5
        elif regime == MarketRegime.RANGEBOUND:
            confidence += (1 - abs(features.Hurst_exponent - 0.5)) * 0.6
            confidence += (1 - abs(features.volatility_regime - 1.0)) * 0.4
        elif regime == MarketRegime.VOLATILE:
            confidence += min(1.0, features.volatility_regime - 0.5) * 0.7
            confidence += 0.3 * (0.5 - abs(features.Hurst_exponent - 0.5))
        else:  # Transitional
            confidence = 0.2 + 0.1 * features.trend_strength
        
        return min(1.0, max(0.0, confidence))
    
    def get_regime_parameters(self, regime: MarketRegime) -> Dict:
        """Get strategy parameters for specific regime."""
        params = {
            MarketRegime.TRENDING: {
                "position_size_multiplier": 1.0,
                "stop_loss_width": 2.0,  # Wider stops
                "take_profit_target": 3.0,
                "indicator_preference": "momentum",
                "holding_period": "medium",
                "risk_per_trade": 0.02
            },
            MarketRegime.MEAN_REVERTING: {
                "position_size_multiplier": 0.8,
                "stop_loss_width": 1.0,  # Tighter stops
                "take_profit_target": 1.5,
                "indicator_preference": "oscillator",
                "holding_period": "short",
                "risk_per_trade": 0.015
            },
            MarketRegime.RANGEBOUND: {
                "position_size_multiplier": 0.6,
                "stop_loss_width": 0.8,
                "take_profit_target": 1.2,
                "indicator_preference": "bollinger",
                "holding_period": "very_short",
                "risk_per_trade": 0.01
            },
            MarketRegime.VOLATILE: {
                "position_size_multiplier": 0.3,
                "stop_loss_width": 1.5,
                "take_profit_target": 2.5,
                "indicator_preference": "volume",
                "holding_period": "short",
                "risk_per_trade": 0.005
            },
            MarketRegime.TRANSITIONAL: {
                "position_size_multiplier": 0.2,
                "stop_loss_width": 1.0,
                "take_profit_target": 1.5,
                "indicator_preference": "confluence",
                "holding_period": "short",
                "risk_per_trade": 0.0025
            }
        }
        
        return params.get(regime, params[MarketRegime.TRANSITIONAL])


class RegimeSwitcher:
    """
    Handles regime transitions and strategy adjustments.
    Ensures smooth transitions between trading modes.
    """
    
    def __init__(self,
                 min_regime_duration: int = 20,
                 transition_smoothing: float = 0.3):
        self.min_regime_duration = min_regime_duration
        self.transition_smoothing = transition_smoothing
        self.regime_start_times: Dict[MarketRegime, pd.Timestamp] = {}
    
    def should_switch(self, current_regime: MarketRegime, 
                     current_time: pd.Timestamp) -> bool:
        """Check if regime has persisted long enough to switch."""
        if current_regime not in self.regime_start_times:
            self.regime_start_times[current_regime] = current_time
            return True
        
        duration = (current_time - self.regime_start_times[current_regime]).days
        
        return duration >= self.min_regime_duration
    
    def calculate_smooth_transition(self, old_params: Dict, 
                                   new_params: Dict,
                                   transition_progress: float) -> Dict:
        """Calculate smoothly transitioned parameters."""
        result = {}
        
        for key in old_params:
            old_val = old_params[key]
            new_val = new_params[key]
            
            if isinstance(old_val, (int, float)):
                # Linear interpolation for numeric values
                result[key] = old_val + (new_val - old_val) * transition_progress
            else:
                result[key] = new_val
        
        return result


# Example usage
if __name__ == "__main__":
    # Create synthetic price data for different regimes
    np.random.seed(42)
    n_days = 500
    
    # Generate trending market
    trending_returns = np.random.normal(0.001, 0.01, n_days)
    trending_prices = 100 * np.cumprod(1 + trending_returns)
    trending_series = pd.Series(trending_prices)
    
    # Initialize detector
    detector = RegimeDetector()
    
    # Detect regime
    assignment = detector.assign_regime(trending_series)
    
    print(f"Detected Regime: {assignment.regime.value}")
    print(f"Confidence: {assignment.confidence:.3f}")
    print(f"Transition Detected: {assignment.transition_detected}")
    print(f"Hurst Exponent: {assignment.features.Hurst_exponent:.3f}")
    print(f"Trend Strength: {assignment.features.trend_strength:.3f}")
    
    # Get strategy parameters
    params = detector.get_regime_parameters(assignment.regime)
    print(f"\nStrategy Parameters:")
    for key, value in params.items():
        print(f"  {key}: {value}")
```

### Regime-Specific Strategy Adjustments

```python
class AdaptiveStrategy:
    """
    Strategy that adapts parameters based on detected market regime.
    Demonstrates regime-aware trading decisions.
    """
    
    def __init__(self,
                 base_strategy: 'BaseStrategy',
                 regime_detector: RegimeDetector):
        self.base_strategy = base_strategy
        self.regime_detector = regime_detector
        self.current_regime: Optional[RegimeAssignment] = None
        self.transition_handler = RegimeSwitcher()
    
    def generate_signal(self, prices: pd.Series, timestamp: pd.Timestamp = None) -> Dict:
        """Generate trading signal with regime-adjusted parameters."""
        if timestamp is None:
            timestamp = pd.Timestamp.now()
        
        # Detect current regime
        self.current_regime = self.regime_detector.assign_regime(prices, timestamp)
        
        # Get regime-specific parameters
        regime_params = self.regime_detector.get_regime_parameters(
            self.current_regime.regime
        )
        
        # Check for transition
        if self.current_regime.transition_detected:
            if self.transition_handler.should_switch(
                self.current_regime.regime, 
                timestamp
            ):
                print(f"Regime Transition: {self.current_regime.regime.value}")
        
        # Generate base signal
        signal = self.base_strategy.generate_signal(prices)
        
        # Adjust signal based on regime
        adjusted_signal = self._adjust_signal_for_regime(
            signal, 
            regime_params,
            self.current_regime.confidence
        )
        
        return {
            "signal": adjusted_signal,
            "regime": self.current_regime.regime.value,
            "confidence": self.current_regime.confidence,
            "params": regime_params
        }
    
    def _adjust_signal_for_regime(self, signal: Dict, 
                                  params: Dict,
                                  confidence: float) -> Dict:
        """Adjust signal parameters based on regime and confidence."""
        adjusted = signal.copy()
        
        # Scale position size by regime and confidence
        base_size = adjusted.get("position_size", 1.0)
        adjusted["position_size"] = (
            base_size * 
            params["position_size_multiplier"] * 
            confidence
        )
        
        # Adjust stop loss and take profit based on regime
        if "stop_loss" in adjusted:
            adjusted["stop_loss"] *= params["stop_loss_width"]
        
        if "take_profit" in adjusted:
            adjusted["take_profit"] *= params["take_profit_target"]
        
        # Add regime metadata
        adjusted["regime"] = params["indicator_preference"]
        adjusted["risk_level"] = params["risk_per_trade"]
        
        return adjusted


# Example with specific strategies
class TrendStrategy:
    """Base trend-following strategy."""
    
    def __init__(self, ma_short: int = 20, ma_long: int = 50):
        self.ma_short = ma_short
        self.ma_long = ma_long
    
    def generate_signal(self, prices: pd.Series) -> Dict:
        """Generate trend-following signal."""
        ma_short = prices.tail(self.ma_short).mean()
        ma_long = prices.tail(self.ma_long).mean()
        
        if prices.iloc[-1] > ma_short > ma_long:
            return {"direction": "long", "position_size": 1.0}
        elif prices.iloc[-1] < ma_short < ma_long:
            return {"direction": "short", "position_size": 1.0}
        else:
            return {"direction": "flat", "position_size": 0.0}


class MeanReversionStrategy:
    """Base mean reversion strategy."""
    
    def __init__(self, lookback: int = 20, z_score_threshold: float = 2.0):
        self.lookback = lookback
        self.z_score_threshold = z_score_threshold
    
    def generate_signal(self, prices: pd.Series) -> Dict:
        """Generate mean reversion signal."""
        recent_prices = prices.tail(self.lookback)
        mean = recent_prices.mean()
        std = recent_prices.std()
        
        current_z = (prices.iloc[-1] - mean) / std if std > 0 else 0
        
        if current_z > self.z_score_threshold:
            return {"direction": "short", "position_size": 1.0}
        elif current_z < -self.z_score_threshold:
            return {"direction": "long", "position_size": 1.0}
        else:
            return {"direction": "flat", "position_size": 0.0}
```

## Adherence Checklist

Before completing your task, verify:

- [ ] **Multi-Criteria Confirmation**: Regime detection uses multiple features (trend, volatility, mean reversion, Hurst exponent, variance ratio) for classification
- [ ] **Regime-Aware Position Sizing**: Position sizes scale with regime confidence and regime-specific parameters
- [ ] **Transition Detection**: Hysteresis-based transition detection prevents rapid regime switching
- [ ] **Confidence Scoring**: Each regime assignment includes a confidence score based on feature extremity
- [ ] **Statistical Robustness**: Regime classification uses statistical tests and thresholds to avoid false positives

## Common Mistakes to Avoid

1. **Single-Feature Reliance**: Using only volatility or only trend strength leads to false regime assignments
2. **Ignoring Transitions**: Not accounting for transitional periods when regime is ambiguous
3. **Overfitting to Historical Regimes**: Regime detection must work on out-of-sample data
4. **Latency Issues**: Slow regime detection misses timely entry/exit opportunities
5. **No Confidence Thresholds**: Assigning regimes without confidence scoring leads to risky decisions
6. **Ignoring Lookback Window**: Using too short or too long lookback periods distorts regime classification
7. **No Hysteresis**: Rapid regime switching causes excessive trading during market noise
8. **Static Parameters**: Not adjusting strategy parameters based on detected regime

## References

1. Arnold, B. F., & Swanson, N. R. (2017). A new approach to the measurement of financial market regimes. *Journal of Financial Economics*, 123(3), 547-565.

2. Kritzman, M., Li, Y., Page, S., & Rigobon, R. (2010). Regime shifts: Identifying hidden market states. *Journal of Alternative Investments*, 12(3), 43-57.

3. Moskowitz, T. J., Ooi, Y. H., & Pedersen, L. H. (2012). Time series momentum. *Journal of Financial Economics*, 104(2), 228-250.

4. Avellaneda, M., & Lee, J. H. (2010). Statistical arbitrage in the US equities market. *Quantitative Finance*, 10(7), 761-782.

5. Campbell, J. Y., Lo, A. W., & MacKinlay, A. C. (1997). *The Econometrics of Financial Markets*. Princeton University Press.

---

Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.
