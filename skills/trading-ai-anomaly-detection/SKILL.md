---
name: trading-ai-anomaly-detection
description: Detect anomalous market behavior, outliers, and potential market manipulation
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: ai anomaly detection, ai-anomaly-detection, anomalous, detect, market
  related-skills: trading-ai-explainable-ai, trading-ai-feature-engineering, trading-technical-cycle-analysis,
    trading-technical-false-signal-filtering
---

**Role:** Build detection systems that identify unusual price movements, volume spikes, and structural breaks

**Philosophy:** Anomalies signal information - either noise, news events, or market inefficiencies. Prioritize low false positive rates and explainable detections over pure sensitivity.

## Key Principles

1. **Multi-Modal Detection**: Combine statistical, temporal, and contextual anomaly detection
2. **Adaptive Thresholds**: Adjust sensitivity based on market volatility regime
3. **Explainability**: Provide clear rationale for each anomaly detection
4. **False Positive Control**: Use multiple validation layers to reduce noise
5. **Temporal Awareness**: Consider cyclical patterns (intraday, weekly, monthly)

## Implementation Guidelines

### Structure
- Core logic: `anomaly/detectors.py` - Individual detector implementations
- Aggregator: `anomaly/ensemble.py` - Combine multiple detectors
- Alerts: `anomaly/alerts.py` - Anomaly notification system
- Config: `config/anomaly_config.yaml` - Detection parameters

### Patterns to Follow
- Use unsupervised methods for novel anomaly detection
- Include both point anomalies and collective anomalies
- Add volume and volatility context to price anomalies
- Implement real-time detection pipelines

## Adherence Checklist
Before completing your task, verify:
- [ ] Multiple detection methods combined (statistical, ML, rule-based)
- [ ] Thresholds adapt to current market volatility
- [ ] Each detection includes explanatory features
- [ ] False positive rate controlled through validation
- [ ] Both price and volume anomalies detected



## Code Examples

### Statistical Anomaly Detection

```python
import numpy as np
import pandas as pd
from scipy import stats
from typing import Tuple, List, Dict
from dataclasses import dataclass

@dataclass
class Anomaly Detection:
    """Represents a detected anomaly with metadata."""
    timestamp: int
    score: float
    type: str  # 'price', 'volume', 'spread'
    magnitude: float
    explanation: str
    z_score: float = None

class StatisticalAnomalyDetector:
    """Statistical anomaly detection using Z-scores and rolling statistics."""
    
    def __init__(self, window_size: int = 50, z_threshold: float = 3.0, 
                 min_std: float = 0.001):
        self.window_size = window_size
        self.z_threshold = z_threshold
        self.min_std = min_std
        self.rolling_stats = {}
    
    def fit(self, prices: np.ndarray, volumes: np.ndarray = None):
        """Calculate rolling statistics for anomaly detection."""
        prices = np.asarray(prices)
        
        # Calculate rolling mean and std for prices
        self.rolling_stats['price'] = {
            'mean': pd.Series(prices).rolling(self.window_size).mean().values,
            'std': pd.Series(prices).rolling(self.window_size).std().fillna(self.min_std).values
        }
        
        if volumes is not None:
            self.rolling_stats['volume'] = {
                'mean': pd.Series(volumes).rolling(self.window_size).mean().values,
                'std': pd.Series(volumes).rolling(self.window_size).std().fillna(1.0).values
            }
    
    def detect_price_anomalies(self, prices: np.ndarray) -> List[Anomaly]:
        """Detect price anomalies using Z-score method."""
        prices = np.asarray(prices)
        anomalies = []
        
        stats = self.rolling_stats['price']
        returns = np.diff(np.log(prices))
        
        for i in range(self.window_size, len(prices)):
            z_score = (returns[i-1] - stats['mean'][i]) / max(stats['std'][i], self.min_std)
            
            if abs(z_score) > self.z_threshold:
                direction = 'upward' if z_score > 0 else 'downward'
                magnitude = abs(z_score) / self.z_threshold
                
                anomalies.append(Anomaly(
                    timestamp=i,
                    score=abs(z_score),
                    type='price',
                    magnitude=magnitude,
                    explanation=f'{direction} price spike: {z_score:.2f} std devs from mean',
                    z_score=z_score
                ))
        
        return anomalies
    
    def detect_volume_anomalies(self, volumes: np.ndarray) -> List[Anomaly]:
        """Detect volume anomalies using rolling statistics."""
        volumes = np.asarray(volumes)
        anomalies = []
        
        if 'volume' not in self.rolling_stats:
            return anomalies
        
        stats = self.rolling_stats['volume']
        
        for i in range(self.window_size, len(volumes)):
            z_score = (volumes[i] - stats['mean'][i]) / max(stats['std'][i], 1.0)
            
            if z_score > self.z_threshold:
                anomalies.append(Anomaly(
                    timestamp=i,
                    score=z_score,
                    type='volume',
                    magnitude=z_score / self.z_threshold,
                    explanation=f'Unusual volume: {volumes[i]:.0f} (z-score: {z_score:.2f})',
                    z_score=z_score
                ))
        
        return anomalies
    
    def fit_detect(self, prices: np.ndarray, volumes: np.ndarray = None) -> List[Anomaly]:
        """Fit detector and detect anomalies in one step."""
        self.fit(prices, volumes)
        
        price_anomalies = self.detect_price_anomalies(prices)
        volume_anomalies = self.detect_volume_anomalies(volumes) if volumes is not None else []
        
        return price_anomalies + volume_anomalies
```

### Isolation Forest for Multivariate Anomalies

```python
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import numpy as np
import pandas as pd
from typing import Tuple, List

class IsolationForestAnomalyDetector:
    """Isolation Forest for detecting multivariate anomalies in market data."""
    
    def __init__(self, contamination: float = 0.05, n_estimators: int = 100,
                 max_samples: str = 'auto', random_state: int = 42):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.max_samples = max_samples
        self.random_state = random_state
        self.model = IsolationForest(
            contamination=contamination,
            n_estimators=n_estimators,
            max_samples=max_samples,
            random_state=random_state
        )
        self.scaler = StandardScaler()
        self.feature_names = []
    
    def extract_features(self, prices: np.ndarray, volumes: np.ndarray = None,
                        returns_window: List[int] = [1, 5, 10, 20]) -> np.ndarray:
        """Extract features for anomaly detection."""
        features = []
        
        # Price returns
        prices = np.asarray(prices)
        log_prices = np.log(prices)
        for window in returns_window:
            if window < len(prices):
                returns = np.diff(log_prices, n=window) / window
                features.append(returns)
        
        features = np.array(features).T
        
        # Add volume if available
        if volumes is not None:
            volumes = np.asarray(volumes)
            log_volumes = np.log(volumes + 1)
            features = np.column_stack([features, log_volumes])
        
        # Fill NaN values
        features = np.nan_to_num(features, nan=0.0)
        
        return features
    
    def fit(self, prices: np.ndarray, volumes: np.ndarray = None):
        """Fit Isolation Forest on market data."""
        features = self.extract_features(prices, volumes)
        self.feature_names = [f'return_{w}d' for w in [1, 5, 10, 20]]
        if volumes is not None:
            self.feature_names.append('log_volume')
        
        scaled_features = self.scaler.fit_transform(features)
        self.model.fit(scaled_features)
    
    def detect(self, prices: np.ndarray, volumes: np.ndarray = None) -> Tuple[np.ndarray, np.ndarray]:
        """Detect anomalies and return anomaly scores."""
        features = self.extract_features(prices, volumes)
        scaled_features = self.scaler.transform(features)
        
        predictions = self.model.predict(scaled_features)  # -1 for anomaly, 1 for normal
        scores = -self.model.score_samples(scaled_features)  # Higher = more anomalous
        
        return predictions, scores
    
    def fit_detect(self, prices: np.ndarray, volumes: np.ndarray = None) -> List[dict]:
        """Fit detector and return anomaly list."""
        features = self.extract_features(prices, volumes)
        
        # Store feature values for explanation
        feature_names = [f'return_{w}d' for w in [1, 5, 10, 20]]
        if volumes is not None:
            feature_names.append('log_volume')
        
        self.fit(prices, volumes)
        predictions, scores = self.detect(prices, volumes)
        
        anomalies = []
        for i, (pred, score) in enumerate(zip(predictions, scores)):
            if pred == -1:  # Anomaly detected
                # Get feature values for explanation
                feature_values = features[i]
                feature_contributions = {
                    name: float(val) for name, val in zip(feature_names, feature_values)
                }
                
                anomalies.append({
                    'timestamp': i,
                    'score': float(score),
                    'z_score': float(self._normalize_score(score)),
                    'type': 'multivariate',
                    'magnitude': float(score / self._calculate_threshold()),
                    'explanation': f"Multivariate anomaly detected using isolation forest",
                    'features': feature_contributions
                })
        
        return anomalies
    
    def _normalize_score(self, score: float, mean: float = 0.0, std: float = 1.0) -> float:
        """Normalize anomaly score to Z-score."""
        return (score - mean) / std if std > 0 else 0.0
    
    def _calculate_threshold(self) -> float:
        """Calculate threshold based on contamination rate."""
        return np.percentile([1.5, 2.0, 3.0], 95)  # Empirical threshold
```

### Ensemble Anomaly Detection

```python
import numpy as np
from typing import List, Dict, Tuple

class EnsembleAnomalyDetector:
    """Ensemble of multiple anomaly detection methods."""
    
    def __init__(self, detectors: Dict[str, object], weights: Dict[str, float] = None):
        self.detectors = detectors
        self.weights = weights or {name: 1.0 / len(detectors) for name in detectors}
        
        # Normalize weights
        total_weight = sum(self.weights.values())
        self.weights = {k: v / total_weight for k, v in self.weights.items()}
    
    def fit(self, prices: np.ndarray, volumes: np.ndarray = None):
        """Fit all detectors."""
        for name, detector in self.detectors.items():
            if hasattr(detector, 'fit'):
                detector.fit(prices, volumes)
    
    def fit_detect(self, prices: np.ndarray, volumes: np.ndarray = None) -> List[dict]:
        """Fit detectors and combine anomaly scores."""
        # Fit all detectors
        self.fit(prices, volumes)
        
        # Get anomalies from each detector
        all_scores = np.zeros(len(prices))
        anomaly_counts = np.zeros(len(prices))
        
        for name, detector in self.detectors.items():
            weights = self.weights[name]
            
            if hasattr(detector, 'fit_detect'):
                anomalies = detector.fit_detect(prices, volumes)
            elif hasattr(detector, 'detect'):
                if name == 'statistical':
                    anomalies = detector.detect_price_anomalies(prices)
                else:
                    anomalies = detector.detect(prices, volumes)
            else:
                continue
            
            for anomaly in anomalies:
                idx = anomaly.timestamp
                all_scores[idx] += weights * anomaly.score
                anomaly_counts[idx] += 1
        
        # Normalize combined scores
        combined_scores = all_scores / (anomaly_counts + 1e-6)
        
        # Create anomaly list
        anomalies = []
        threshold = np.percentile(combined_scores, 95)
        
        for i, score in enumerate(combined_scores):
            if score > threshold:
                # Find individual detector scores for this timestamp
                detector_scores = {}
                for name, detector in self.detectors.items():
                    if hasattr(detector, 'fit_detect'):
                        det_anomalies = detector.fit_detect(prices, volumes)
                    elif hasattr(detector, 'detect_price_anomalies'):
                        det_anomalies = detector.detect_price_anomalies(prices)
                    else:
                        continue
                    
                    for det_anomaly in det_anomalies:
                        if det_anomaly.timestamp == i:
                            detector_scores[name] = det_anomaly.score
                            break
                
                anomalies.append({
                    'timestamp': i,
                    'score': float(score),
                    'type': 'ensemble',
                    'magnitude': float(score / threshold),
                    'explanation': f'Ensemble anomaly: {len(detector_scores)} detectors flagged',
                    'detector_scores': detector_scores
                })
        
        return sorted(anomalies, key=lambda x: x['score'], reverse=True)
```