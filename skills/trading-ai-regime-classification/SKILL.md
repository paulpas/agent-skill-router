---
name: trading-ai-regime-classification
description: Detect current market regime for adaptive trading strategies
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: ai regime classification, ai-regime-classification, current, detect, market
---


**Role:** Identify market regimes to switch between trading strategies based on current conditions

**Philosophy:** Markets operate in distinct regimes (trending, mean-reverting, volatile, quiet). Prioritize regime stability, early detection, and smooth transitions between strategy modes.

## Key Principles

1. **Multi-Dimensional Regimes**: Classify based on volatility, trend, correlation, and liquidity
2. **Regime Persistence**: Account for slow regime transitions and hysteresis
3. **Early Detection**: Use leading indicators for regime shifts
4. **Ensemble Detection**: Combine multiple regime detectors for robustness
5. **Strategy Mapping**: Explicitly map regimes to appropriate trading strategies

## Implementation Guidelines

### Structure
- Core logic: `regime/detectors.py` - Regime detection algorithms
- Classifier: `regime/classifier.py` - Multi-regime classifier
- Tracker: `regime/tracker.py` - Regime path tracking
- Config: `config/regime_config.yaml` - Regime parameters

### Patterns to Follow
- Use sliding window statistics for regime features
- Track regime duration and transition probabilities
- Implement regime hysteresis (different thresholds for entering vs exiting)
- Monitor regime stability with confidence measures

## Adherence Checklist
Before completing your task, verify:
- [ ] Multiple regime dimensions tracked (volatility, trend, correlation)
- [ ] Regime transitions include hysteresis thresholds
- [ ] Confidence scores provided for each regime classification
- [ ] Early warning indicators for regime shifts
- [ ] Strategy mapping explicit and documented



## Code Examples

### Market Regime Classifier

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from dataclasses import dataclass
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from hmmlearn.hmm import GaussianHMM

@dataclass
class Regime:
    """Market regime definition."""
    name: str
    volatility_level: float  # 0-1
    trend_strength: float    # 0-1
    correlation_regime: str  # 'low', 'medium', 'high'

class MarketRegimeClassifier:
    """Classify market into regimes based on multiple indicators."""
    
    def __init__(self, n_regimes: int = 4):
        self.n_regimes = n_regimes
        self.regimes = [
            Regime('trending_low_vol', 0.2, 0.7, 'low'),
            Regime('trending_high_vol', 0.5, 0.7, 'high'),
            Regime('mean_reverting_low_vol', 0.2, 0.3, 'low'),
            Regime('mean_reverting_high_vol', 0.5, 0.3, 'high'),
        ]
        
        self.scaler = StandardScaler()
        self.hmm = None
        self.is_fitted = False
    
    def extract_features(self, prices: np.ndarray, volumes: np.ndarray = None,
                        returns_window: List[int] = [5, 20, 60]) -> np.ndarray:
        """Extract regime detection features."""
        features = []
        
        prices = np.asarray(prices)
        returns = np.diff(np.log(prices))
        
        # Volatility features
        for window in returns_window:
            vol = np.std(returns[-window:]) if len(returns) >= window else np.std(returns)
            features.append(vol)
        
        # Trend strength
        sma_20 = np.mean(prices[-20:]) if len(prices) >= 20 else np.mean(prices)
        trend = (prices[-1] - sma_20) / sma_20 if sma_20 > 0 else 0
        features.append(trend)
        
        # Momentum
        momentum_1m = (prices[-20] - prices[-1]) / prices[-1] if len(prices) >= 20 else 0
        momentum_3m = (prices[-60] - prices[-1]) / prices[-1] if len(prices) >= 60 else 0
        features.extend([momentum_1m, momentum_3m])
        
        # Volume特征
        if volumes is not None:
            avg_vol = np.mean(volumes[-20:]) if len(volumes) >= 20 else np.mean(volumes)
            vol_ratio = volumes[-1] / avg_vol if avg_vol > 0 else 1.0
            features.append(vol_ratio)
        
        return np.array(features)
    
    def fit(self, prices: np.ndarray, volumes: np.ndarray = None):
        """Fit HMM for regime detection."""
        features = self.extract_features(prices, volumes)
        features_scaled = self.scaler.fit_transform(features.reshape(1, -1))
        
        # Fit HMM
        self.hmm = GaussianHMM(n_components=self.n_regimes, covariance_type='diag', n_iter=100)
        self.hmm.fit(features_scaled.T)
        
        self.is_fitted = True
    
    def predict_regime(self, prices: np.ndarray, volumes: np.ndarray = None) -> Dict:
        """Predict current market regime."""
        if not self.is_fitted:
            return self._simple_regime(prices, volumes)
        
        features = self.extract_features(prices, volumes)
        features_scaled = self.scaler.transform(features.reshape(1, -1))
        
        # Get HMM prediction
        state = self.hmm.predict(features_scaled.T)[-1]
        
        # Get state probabilities
        state_probs = self.hmm.predict_proba(features_scaled.T)[0]
        
        return {
            'regime': f'regime_{state}',
            'state': state,
            'state_probs': dict(enumerate(state_probs)),
            'confidence': float(np.max(state_probs)),
            'features': dict(enumerate(features))
        }
    
    def _simple_regime(self, prices: np.ndarray, volumes: np.ndarray = None) -> Dict:
        """Simple regime detection without HMM."""
        prices = np.asarray(prices)
        
        returns = np.diff(np.log(prices))
        volatility = np.std(returns)
        trend = (prices[-1] - np.mean(prices[-20:])) / np.mean(prices[-20:]) if len(prices) >= 20 else 0
        
        # Determine regime based on rules
        if volatility < 0.001 and abs(trend) < 0.01:
            regime = 'quiet_mean_reverting'
        elif volatility < 0.001 and abs(trend) >= 0.01:
            regime = 'quiet_trending'
        elif volatility >= 0.001 and abs(trend) < 0.01:
            regime = 'volatile_mean_reverting'
        else:
            regime = 'volatile_trending'
        
        return {
            'regime': regime,
            'volatility': volatility,
            'trend': trend,
            'confidence': 0.8
        }
```

### Multi-Regime Strategy Switcher

```python
import numpy as np
from typing import Dict, List, Callable

class MultiRegimeStrategy:
    """Switch between strategies based on detected market regime."""
    
    def __init__(self, regime_classifier, strategies: Dict[str, object]):
        self.regime_classifier = regime_classifier
        self.strategies = strategies
        
        # Define which strategies work in which regimes
        self.regime_strategy_map = {
            'trending_low_vol': ['trend_following', 'momentum'],
            'trending_high_vol': ['trend_following', 'breakout'],
            'mean_reverting_low_vol': ['mean_reversion', 'pairs_trading'],
            'mean_reverting_high_vol': ['mean_reversion', 'volatility_arb'],
            'quiet_mean_reverting': ['mean_reversion', 'swing_trading'],
            'quiet_trending': ['trend_following', 'carry_trade'],
            'volatile_mean_reverting': ['mean_reversion', 'options_selling'],
            'volatile_trending': ['trend_following', 'leverage_trading']
        }
        
        self.current_regime = None
        self.active_strategies = []
    
    def select_strategies(self, prices: np.ndarray, volumes: np.ndarray = None) -> List[str]:
        """Select appropriate strategies for current regime."""
        regime_info = self.regime_classifier.predict_regime(prices, volumes)
        
        if regime_info is None:
            return self.active_strategies
        
        regime = regime_info.get('regime', 'unknown')
        confidence = regime_info.get('confidence', 0.5)
        
        # Get candidate strategies
        candidates = self.regime_strategy_map.get(regime, [])
        
        # Filter by confidence
        self.active_strategies = [s for s in candidates if confidence > 0.6]
        
        self.current_regime = regime
        
        return self.active_strategies
    
    def get_regime_transition(self, old_regime: str, new_regime: str) -> Dict:
        """Analyze regime transition."""
        transitions = {
            'trending': {'mean_reverting': 'reversal_risk', 'trending': 'continuation'},
            'mean_reverting': {'trending': 'breakout_opportunity', 'mean_reverting': 'continuation'},
            'quiet': {'volatile': 'increase_in_uncertainty', 'quiet': 'continuation'},
            'volatile': {'quiet': 'decrease_in_volatility', 'volatile': 'continuation'}
        }
        
        old_cat = 'trending' if 'trend' in old_regime else ('mean_reverting' if 'mean' in old_regime else 'unknown')
        new_cat = 'trending' if 'trend' in new_regime else ('mean_reverting' if 'mean' in new_regime else 'unknown')
        
        transition_type = transitions.get(old_cat, {}).get(new_cat, 'unknown')
        
        return {
            'from': old_regime,
            'to': new_regime,
            'transition_type': transition_type,
            'implication': f'Consider {transition_type} actions'
        }
```

### Hidden Markov Model Regime Detector

```python
import numpy as np
from hmmlearn.hmm import GaussianHMM
from typing import List, Dict

class HMMLatentRegimeDetector:
    """Detect regimes using Hidden Markov Model on latent factors."""
    
    def __init__(self, n_hidden_states: int = 4, n_components: int = 2):
        self.n_states = n_hidden_states
        self.n_components = n_components
        self.hmm = None
        self.is_fitted = False
    
    def fit(self, features: np.ndarray):
        """Fit HMM on feature matrix."""
        # Ensure 2D array
        if len(features.shape) == 1:
            features = features.reshape(-1, 1)
        
        self.hmm = GaussianHMM(
            n_components=self.n_states,
            covariance_type='diag',
            n_iter=100,
            random_state=42
        )
        
        self.hmm.fit(features)
        self.is_fitted = True
    
    def detect_regimes(self, features: np.ndarray) -> np.ndarray:
        """Predict hidden regimes."""
        if not self.is_fitted:
            raise ValueError("Model not fitted")
        
        return self.hmm.predict(features)
    
    def get_regime_probabilities(self, features: np.ndarray) -> np.ndarray:
        """Get probability of each regime."""
        if not self.is_fitted:
            raise ValueError("Model not fitted")
        
        return self.hmm.predict_proba(features)
    
    def detect_regime_changes(self, features: np.ndarray, threshold: float = 0.1) -> List[int]:
        """Detect regime change points."""
        regimes = self.detect_regimes(features)
        
        changes = []
        for i in range(1, len(regimes)):
            if regimes[i] != regimes[i-1]:
                changes.append(i)
        
        return changes
```

### Regime Stability Analyzer

```python
import numpy as np
from typing import List, Dict

class RegimeStabilityAnalyzer:
    """Analyze regime stability and transition dynamics."""
    
    def __init__(self, min_duration: int = 10):
        self.min_duration = min_duration
    
    def calculate_regime_duration(self, regimes: np.ndarray) -> Dict[str, float]:
        """Calculate average duration in each regime."""
        if len(regimes) < 2:
            return {'all': len(regimes)}
        
        durations = []
        current_regime = regimes[0]
        current_duration = 1
        
        for i in range(1, len(regimes)):
            if regimes[i] == current_regime:
                current_duration += 1
            else:
                if current_duration >= self.min_duration:
                    durations.append(current_duration)
                current_regime = regimes[i]
                current_duration = 1
        
        if current_duration >= self.min_duration:
            durations.append(current_duration)
        
        return {
            'mean_duration': np.mean(durations) if durations else 0,
            'median_duration': np.median(durations) if durations else 0,
            'min_duration': np.min(durations) if durations else 0,
            'max_duration': np.max(durations) if durations else 0,
            'total_durations': len(durations)
        }
    
    def calculate_transition_matrix(self, regimes: np.ndarray) -> np.ndarray:
        """Calculate regime transition probabilities."""
        n_regimes = len(np.unique(regimes))
        transition_matrix = np.zeros((n_regimes, n_regimes))
        
        for i in range(len(regimes) - 1):
            from_regime = regimes[i]
            to_regime = regimes[i + 1]
            transition_matrix[from_regime, to_regime] += 1
        
        # Normalize rows
        row_sums = transition_matrix.sum(axis=1, keepdims=True)
        transition_matrix = transition_matrix / (row_sums + 1e-10)
        
        return transition_matrix
    
    def calculate_regime_hysteresis(self, regimes: np.ndarray,
                                   volatility: np.ndarray,
                                   volatility_threshold: float = None) -> Dict:
        """Calculate hysteresis (different thresholds for entering vs exiting regimes)."""
        if volatility_threshold is None:
            volatility_threshold = np.median(volatility)
        
        # Count transitions through high volatility
        high_vol_transitions = 0
        low_vol_transitions = 0
        
        for i in range(1, len(regimes)):
            if volatility[i] > volatility_threshold:
                if regimes[i] != regimes[i-1]:
                    high_vol_transitions += 1
            else:
                if regimes[i] != regimes[i-1]:
                    low_vol_transitions += 1
        
        return {
            'high_vol_transitions': high_vol_transitions,
            'low_vol_transitions': low_vol_transitions,
            'transition_ratio': high_vol_transitions / (low_vol_transitions + 1e-6),
            'hysteresis_indicator': 'strong' if high_vol_transitions > low_vol_transitions * 1.5 else 'weak'
        }
```
