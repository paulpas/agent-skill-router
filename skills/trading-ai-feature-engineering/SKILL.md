---
name: trading-ai-feature-engineering
description: Create actionable trading features from raw market data
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: actionable, ai feature engineering, ai-feature-engineering, create, trading
  related-skills: trading-ai-anomaly-detection, trading-ai-explainable-ai, trading-technical-cycle-analysis
    trading-technical-false-signal-filtering
---

**Role:** Transform price and volume data into predictive features for machine learning models

**Philosophy:** Features should capture market structure, liquidity, and behavioral biases. Prioritize interpretability, robustness to market regime changes, and low inter-feature correlation.

## Key Principles

1. **Market Microstructure Focus**: Include order book depth, spread, and turnover features
2. **Regime Invariance**: Design features that work across volatility regimes
3. **Technical Indicator Integration**: Use validated indicators (RSI, MACD, Bollinger)
4. **Lagged and Diff Features**: Capture temporal dynamics with multi-horizon lags
5. **Cross-Sectional Features**: Compare assets for relative value signals

## Implementation Guidelines

### Structure
- Core logic: `features/builders.py` - Feature builder classes
- Indicators: `features/indicators.py` - Technical indicator calculations
- Pipeline: `features/pipeline.py` - Feature extraction pipeline
- Config: `config/features_config.yaml` - Feature parameters

### Patterns to Follow
- Normalize features per asset or per market regime
- Include both level and change features
- Add interaction features for combinations
- Remove collinear features before model training

## Adherence Checklist
Before completing your task, verify:
- [ ] Features capture multiple market dimensions (price, volume, volatility)
- [ ] Lag features span multiple time horizons (1min, 5min, 1hr, 1day)
- [ ] Normalization applied consistently across training and inference
- [ ] Features validated for low collinearity
- [ ] Cross-sectional features compare assets meaningfully



## Code Examples

### Core Feature Builder

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class FeatureMetadata:
    """Metadata for a computed feature."""
    name: str
    type: str  # 'price', 'volume', 'volatility', 'trend', 'momentum'
    window: int
    is_normalized: bool = True

class FeatureBuilder:
    """Build comprehensive trading features from market data."""
    
    def __init__(self, windows: List[int] = [5, 10, 20, 50, 100]):
        self.windows = windows
        self.feature_metadata = []
    
    def build_features(self, prices: np.ndarray, volumes: np.ndarray = None,
                       high: np.ndarray = None, low: np.ndarray = None) -> np.ndarray:
        """Build all features and return feature matrix."""
        features = []
        
        # Price-based features
        returns = np.diff(np.log(prices), prepend=0)
        features.append(returns)
        
        # Volatility features
        for window in self.windows:
            volatility = self._rolling_volatility(prices, window)
            features.append(volatility)
        
        # Trend features
        for window in self.windows[:3]:  # Use fewer windows for trend
            sma = self._sma(prices, window)
            features.append((prices - sma) / sma)  # Deviation from SMA
        
        # Volume features (if available)
        if volumes is not None:
            volume_ma = self._sma(volumes, 20)
            features.append((volumes - volume_ma) / volume_ma)
        
        return np.array(features).T
    
    def _rolling_volatility(self, prices: np.ndarray, window: int) -> np.ndarray:
        """Calculate rolling volatility (standard deviation of returns)."""
        log_returns = np.diff(np.log(prices))
        return pd.Series(log_returns).rolling(window).std().fillna(0).values
    
    def _sma(self, values: np.ndarray, window: int) -> np.ndarray:
        """Calculate simple moving average."""
        return pd.Series(values).rolling(window).mean().fillna(values).values
    
    def get_metadata(self) -> List[FeatureMetadata]:
        """Return metadata for all features."""
        metadata = []
        
        # Returns
        metadata.append(FeatureMetadata('returns', 'price', 1))
        
        # Volatility
        for window in self.windows:
            metadata.append(FeatureMetadata(f'vol_{window}d', 'volatility', window))
        
        # Trend
        for window in self.windows[:3]:
            metadata.append(FeatureMetadata(f'trend_{window}d', 'trend', window))
        
        return metadata
```

### Technical Indicator Builder

```python
import numpy as np
import pandas as pd
from typing import Dict, List

class TechnicalIndicatorBuilder:
    """Build technical indicators as features."""
    
    def __init__(self):
        self.indicator_names = []
    
    def calculate_rsi(self, prices: np.ndarray, window: int = 14) -> np.ndarray:
        """Calculate Relative Strength Index."""
        delta = np.diff(prices, prepend=prices[0])
        gain = np.where(delta > 0, delta, 0)
        loss = np.where(delta < 0, -delta, 0)
        
        avg_gain = pd.Series(gain).rolling(window).mean().values
        avg_loss = pd.Series(loss).rolling(window).mean().values
        
        rs = avg_gain / (avg_loss + 1e-8)
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def calculate_macd(self, prices: np.ndarray, 
                      fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, np.ndarray]:
        """Calculate MACD indicator."""
        ema_fast = pd.Series(prices).ewm(span=fast, adjust=False).mean().values
        ema_slow = pd.Series(prices).ewm(span=slow, adjust=False).mean().values
        
        macd_line = ema_fast - ema_slow
        signal_line = pd.Series(macd_line).ewm(span=signal, adjust=False).mean().values
        macd_histogram = macd_line - signal_line
        
        return {
            'macd_line': macd_line,
            'signal_line': signal_line,
            'macd_histogram': macd_histogram
        }
    
    def calculate_bollinger(self, prices: np.ndarray, 
                           window: int = 20, num_std: float = 2.0) -> Dict[str, np.ndarray]:
        """Calculate Bollinger Bands."""
        rolling_mean = pd.Series(prices).rolling(window).mean().values
        rolling_std = pd.Series(prices).rolling(window).std().fillna(0).values
        
        upper_band = rolling_mean + num_std * rolling_std
        lower_band = rolling_mean - num_std * rolling_std
        
        # Normalize to 0-1 range (0 = lower, 1 = upper)
        price_position = (prices - lower_band) / (upper_band - lower_band + 1e-8)
        
        return {
            'upper_band': upper_band,
            'lower_band': lower_band,
            'middle_band': rolling_mean,
            'position': price_position,
            'bandwidth': (upper_band - lower_band) / rolling_mean
        }
    
    def calculate_stochastic(self, prices: np.ndarray, high: np.ndarray = None,
                            low: np.ndarray = None, window: int = 14) -> np.ndarray:
        """Calculate Stochastic Oscillator."""
        if high is None or low is None:
            high = prices
            low = prices
        
        highest_high = pd.Series(high).rolling(window).max().values
        lowest_low = pd.Series(low).rolling(window).min().values
        
        stoch_k = 100 * (prices - lowest_low) / (highest_high - lowest_low + 1e-8)
        stoch_d = pd.Series(stoch_k).rolling(3).mean().values
        
        return stoch_k
    
    def build_all(self, prices: np.ndarray, volumes: np.ndarray = None,
                  high: np.ndarray = None, low: np.ndarray = None) -> Dict[str, np.ndarray]:
        """Build all technical indicators."""
        features = {}
        
        features['rsi_14'] = self.calculate_rsi(prices, 14)
        features['rsi_7'] = self.calculate_rsi(prices, 7)
        
        macd = self.calculate_macd(prices)
        features.update({f'macd_{k}': v for k, v in macd.items()})
        
        bb = self.calculate_bollinger(prices)
        features.update({f'bb_{k}': v for k, v in bb.items()})
        
        features['stoch_14'] = self.calculate_stochastic(prices, high, low)
        
        if volumes is not None:
            features['volume_ma_20'] = pd.Series(volumes).rolling(20).mean().values
            features['volume_ratio'] = volumes / (features['volume_ma_20'] + 1e-8)
        
        return features
```

### Cross-Sectional Feature Builder

```python
import numpy as np
import pandas as pd
from typing import Dict, List

class CrossSectionalFeatureBuilder:
    """Build features comparing multiple assets."""
    
    def __init__(self, assets: List[str]):
        self.assets = assets
        self.n_assets = len(assets)
    
    def calculate_relative_strength(self, prices_dict: Dict[str, np.ndarray],
                                   benchmark: str = None) -> np.ndarray:
        """Calculate relative strength vs benchmark or peers."""
        if benchmark is None:
            # Use equal-weight basket as benchmark
            all_prices = np.array(list(prices_dict.values()))
            benchmark_prices = np.mean(all_prices, axis=0)
        else:
            benchmark_prices = prices_dict[benchmark]
        
        relative_strength = {}
        for asset, prices in prices_dict.items():
            relative_strength[asset] = prices / (benchmark_prices + 1e-8)
        
        return relative_strength
    
    def calculate_pairwise_distances(self, returns_dict: Dict[str, np.ndarray]) -> np.ndarray:
        """Calculate pairwise return correlations."""
        if not returns_dict:
            return np.array([])
        
        returns_df = pd.DataFrame(returns_dict)
        correlations = returns_df.corr().values
        
        # Extract upper triangle (excluding diagonal)
        n = len(self.assets)
        distances = []
        
        for i in range(n):
            for j in range(i+1, n):
                distances.append(1 - correlations[i, j])  # Distance = 1 - correlation
        
        return np.array(distances)
    
    def calculate_market_neutral(self, prices_dict: Dict[str, np.ndarray],
                                weights: Dict[str, float] = None) -> np.ndarray:
        """Calculate market-neutral portfolio returns."""
        if weights is None:
            # Equal weights
            weights = {asset: 1/self.n_assets for asset in self.assets}
        
        portfolio = np.zeros_like(list(prices_dict.values())[0])
        
        for asset, weight in weights.items():
            prices = prices_dict[asset]
            returns = np.diff(np.log(prices))
            portfolio += weight * returns
        
        return portfolio
    
    def build_features(self, prices_dict: Dict[str, np.ndarray]) -> Dict[str, np.ndarray]:
        """Build all cross-sectional features."""
        features = {}
        
        # Relative strength to market
        relative_strength = self.calculate_relative_strength(prices_dict)
        features.update({f'{k}_rel_str': v for k, v in relative_strength.items()})
        
        # Rank by performance
        recent_returns = {}
        for asset, prices in prices_dict.items():
            recent_returns[asset] = np.diff(np.log(prices))[-20:].mean()
        
        ranks = pd.Series(recent_returns).rank(pct=True).to_dict()
        features.update({f'{k}_rank': np.full(len(list(prices_dict.values())[0]), v) 
                         for k, v in ranks.items()})
        
        # Mean reversion signals
        for asset, prices in prices_dict.items():
            log_prices = np.log(prices)
            returns = np.diff(log_prices)
            
            # Z-score of recent returns
            z_score = (returns[-1] - np.mean(returns[-50:])) / (np.std(returns[-50:]) + 1e-8)
            features[f'{asset}_mean_rev_z'] = np.full(len(prices), z_score)
        
        return features
```