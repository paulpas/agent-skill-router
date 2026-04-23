---
name: trading-ai-sentiment-features
description: Extract market sentiment from news, social media, and analyst reports
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: ai sentiment features, ai-sentiment-features, extract, market, social
---

**Role:** Convert sentiment signals into actionable trading features with proper temporal alignment

**Philosophy:** Sentiment reflects market psychology but can lag prices. Prioritize real-time processing, sentiment drift detection, and integration with price-based signals.

## Key Principles

1. **Temporal Alignment**: Ensure sentiment matches the correct future period
2. **Sentiment Drift**: Track sentiment changes, not just absolute values
3. **Source Weighting**: Different sources have different predictive power
4. **Contrarian Signals**: Use sentiment extremes as counter-trend signals
5. **Volume Context**: Normalize sentiment by news volume to avoid outliers

## Implementation Guidelines

### Structure
- Core logic: `sentiment/extractors.py` - Sentiment extraction pipeline
- Integrator: `sentiment/integrator.py` - Feature integration with price data
- Analyzers: `sentiment/analyzers.py` - Sentiment pattern detection
- Config: `config/sentiment_config.yaml` - Sentiment parameters

### Patterns to Follow
- Use sliding window for sentiment aggregation
- Normalize by news volume to avoid burst artifacts
- Track sentiment momentum (change rate)
- Align sentiment with lagged price responses

## Adherence Checklist
Before completing your task, verify:
- [ ] Sentiment features temporally aligned with price movements
- [ ] Sentiment normalized by news volume
- [ ] Sentiment momentum/changes tracked
- [ ] Contrarian signals detected at extremes
- [ ] Source-specific sentiment weighted appropriately



## Code Examples

### Sentiment Feature Extractor

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from dataclasses import dataclass
from collections import defaultdict

@dataclass
class SentimentRecord:
    """Single sentiment record for a time period."""
    timestamp: int
    sentiment: float  # -1 to 1
    source: str
    volume: int  # News volume for this period
    entities: List[str]

class SentimentFeatureExtractor:
    """Extract sentiment features from news data."""
    
    def __init__(self, window_sizes: List[int] = [1, 3, 5, 10]):
        self.window_sizes = window_sizes
        self.sources = defaultdict(list)
    
    def extract_from_news(self, news_data: pd.DataFrame) -> List[SentimentRecord]:
        """Extract sentiment from news articles."""
        records = []
        
        for _, row in news_data.iterrows():
            timestamp = row['timestamp']
            sentiment = self._calculate_sentiment(row['text'])
            source = row.get('source', 'unknown')
            volume = row.get('volume', 1)
            entities = row.get('entities', [])
            
            records.append(SentimentRecord(
                timestamp=timestamp,
                sentiment=sentiment,
                source=source,
                volume=volume,
                entities=entities
            ))
        
        return records
    
    def _calculate_sentiment(self, text: str) -> float:
        """Calculate sentiment score for text."""
        # Simple keyword-based sentiment
        positive_words = ['good', 'strong', 'surge', 'gain', 'upgrade', 'profit', 'outperform']
        negative_words = ['bad', 'weak', 'plunge', 'loss', 'downgrade', 'concern', 'underperform']
        
        text_lower = text.lower()
        
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        total = positive_count + negative_count
        if total == 0:
            return 0.0
        
        score = (positive_count - negative_count) / total
        return np.clip(score, -1.0, 1.0)
    
    def aggregate_sentiment(self, records: List[SentimentRecord]) -> Dict[str, np.ndarray]:
        """Aggregate sentiment across time windows."""
        if not records:
            return {}
        
        # Sort by timestamp
        records = sorted(records, key=lambda x: x.timestamp)
        
        timestamps = [r.timestamp for r in records]
        sentiments = [r.sentiment for r in records]
        volumes = [r.volume for r in records]
        
        # Calculate various aggregations
        features = {
            'sentiment': np.array(sentiments),
            'sentiment_weighted': np.array([r.sentiment * r.volume for r in records]) / 
                                (np.array(volumes) + 1e-6)
        }
        
        # Window-based aggregations
        for window in self.window_sizes:
            rolling_mean = pd.Series(sentiments).rolling(window).mean().fillna(0).values
            features[f'sentiment_ma_{window}'] = rolling_mean
            
            # Momentum
            if len(rolling_mean) > window:
                features[f'sentiment_momentum_{window}'] = (
                    rolling_mean - pd.Series(rolling_mean).shift(window).fillna(0).values
                )
        
        # Sentiment extremes
        features['sentiment_extreme'] = np.abs(sentiments) > 0.7
        
        return features
    
    def extract_all(self, news_data: pd.DataFrame) -> Dict[str, np.ndarray]:
        """Extract all sentiment features from news data."""
        records = self.extract_from_news(news_data)
        return self.aggregate_sentiment(records)
```

### Sentiment-Price Integration

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple

class SentimentPriceIntegrator:
    """Integrate sentiment features with price data."""
    
    def __init__(self, price_lag: int = 1, sentiment_lag: int = 0):
        self.price_lag = price_lag
        self.sentiment_lag = sentiment_lag
    
    def align_sentiment_prices(self, sentiment_features: Dict[str, np.ndarray],
                               prices: np.ndarray,
                               sentiment_times: np.ndarray,
                               price_times: np.ndarray) -> Dict[str, np.ndarray]:
        """Align sentiment features with price data."""
        # Interpolate sentiment to price timestamps
        aligned_features = {}
        
        for feature_name, sentiment_values in sentiment_features.items():
            # Simple nearest neighbor interpolation
            aligned = np.interp(price_times, sentiment_times, sentiment_values, 
                               left=sentiment_values[0], right=sentiment_values[-1])
            aligned_features[feature_name] = aligned
        
        # Add price-based features
        aligned_features['price'] = prices
        aligned_features['returns'] = np.diff(np.log(np.concatenate([[prices[0]], prices])))
        
        return aligned_features
    
    def create_lagged_features(self, features: Dict[str, np.ndarray],
                               max_lag: int = 5) -> Dict[str, np.ndarray]:
        """Create lagged versions of features."""
        lagged = {}
        
        for name, values in features.items():
            values = np.asarray(values)
            lagged[name] = values
            
            for lag in range(1, max_lag + 1):
                if lag < len(values):
                    lagged[f'{name}_lag{lag}'] = np.concatenate([
                        [values[0]] * lag,
                        values[:-lag]
                    ])
        
        return lagged
    
    def create_derivative_features(self, features: Dict[str, np.ndarray]) -> Dict[str, np.ndarray]:
        """Create derivative (change) features."""
        derivatives = {}
        
        for name, values in features.items():
            values = np.asarray(values)
            if name.endswith('_lag'):
                continue  # Skip lagged features
            
            derivatives[f'{name}_diff'] = np.diff(values, prepend=values[0])
            derivatives[f'{name}_ pct_change'] = (
                np.diff(values, prepend=values[0]) / (np.abs(values) + 1e-6)
            )
        
        return derivatives
```

### Sentiment Contrarian Signal Detector

```python
import numpy as np
from typing import Dict, List, Tuple

class SentimentContrarianDetector:
    """Detect contrarian sentiment signals for counter-trend opportunities."""
    
    def __init__(self, extremethreshold: float = 0.8, 
                 lookback_period: int = 20,
                 divergence_threshold: float = 0.5):
        self.threshold = extremethreshold
        self.lookback = lookback_period
        self.divergence = divergence_threshold
    
    def detect_contrarian_signals(self, sentiment: np.ndarray, 
                                  returns: np.ndarray) -> List[Dict]:
        """Detect contrarian signals where sentiment diverges from price."""
        signals = []
        
        for i in range(self.lookback, len(sentiment)):
            # Calculate sentiment extremes
            recent_sentiment = sentiment[i-self.lookback:i]
            sent_mean = np.mean(recent_sentiment)
            sent_std = np.std(recent_sentiment) if len(recent_sentiment) > 1 else 0
            
            # Calculate price returns
            recent_returns = returns[i-self.lookback:i]
            return_sum = np.sum(recent_returns)
            
            # Normalize sentiment to z-score
            sent_z = (sentiment[i] - sent_mean) / (sent_std + 1e-6)
            
            # Detect contrarian signal
            is_extreme = np.abs(sent_z) > self.threshold
            has_divergence = (sent_z > 0 and return_sum < -self.divergence) or \
                           (sent_z < 0 and return_sum > self.divergence)
            
            if is_extreme and has_divergence:
                direction = 'short' if sent_z > 0 else 'long'
                
                signals.append({
                    'timestamp': i,
                    'type': 'contrarian',
                    'direction': direction,
                    'strength': float(np.abs(sent_z)),
                    'sentiment': float(sentiment[i]),
                    'recent_return': float(return_sum),
                    'explanation': f'Extreme sentiment ({sentiment[i]:.2f}) against trend'
                })
        
        return signals
    
    def calculate_sentiment_reversal(self, sentiment: np.ndarray,
                                    threshold: float = 0.3) -> np.ndarray:
        """Calculate sentiment reversal potential."""
        if len(sentiment) < 2:
            return np.zeros_like(sentiment)
        
        # Calculate sentiment momentum
        momentum = np.diff(sentiment, prepend=sentiment[0])
        
        # Calculate how far sentiment is from neutral
        from_neutral = np.abs(sentiment)
        
        # Reversal potential: high sentiment + high momentum change
        reversal_potential = momentum * from_neutral
        
        return reversal_potential
    
    def sentiment_volume_ratio(self, sentiment: np.ndarray,
                              volume: np.ndarray) -> np.ndarray:
        """Calculate sentiment relative to news volume."""
        # Normalize sentiment by volume
        volume_normalized = sentiment / (np.log(volume + 1) + 1e-6)
        
        return volume_normalized
```

### Multi-Source Sentiment Aggregator

```python
import numpy as np
import pandas as pd
from typing import Dict, List

class MultiSourceSentimentAggregator:
    """Aggregate sentiment from multiple sources with source weighting."""
    
    def __init__(self, source_weights: Dict[str, float] = None):
        self.source_weights = source_weights or {
            'professional': 1.5,
            'news_agency': 1.2,
            'social_media': 0.8,
            'analyst': 1.3,
            'blog': 0.5
        }
    
    def weighted_sentiment(self, records: List[Dict]) -> np.ndarray:
        """Calculate weighted average sentiment by source."""
        if not records:
            return np.array([])
        
        timestamps = [r['timestamp'] for r in records]
        sentiments = [r['sentiment'] for r in records]
        sources = [r['source'] for r in records]
        
        # Get weights for each record
        weights = np.array([
            self.source_weights.get(source, 1.0) for source in sources
        ])
        
        # Normalize weights
        weights = weights / np.sum(weights)
        
        # Weighted average
        weighted_sentiment = np.sum(weights * np.array(sentiments))
        
        return weighted_sentiment
    
    def aggregate_by_time_window(self, records: List[Dict],
                                window_size: int = 60) -> Dict[str, np.ndarray]:
        """Aggregate sentiment in time windows."""
        if not records:
            return {}
        
        # Sort records
        records = sorted(records, key=lambda x: x['timestamp'])
        
        timestamps = []
        aggregated = []
        
        current_window_start = records[0]['timestamp']
        window_records = []
        
        for record in records:
            if record['timestamp'] - current_window_start > window_size:
                # End current window
                if window_records:
                    timestamps.append(current_window_start)
                    sent = self.weighted_sentiment(window_records)
                    aggregated.append(sent)
                
                # Start new window
                current_window_start = record['timestamp']
                window_records = [record]
            else:
                window_records.append(record)
        
        # Final window
        if window_records:
            timestamps.append(current_window_start)
            sent = self.weighted_sentiment(window_records)
            aggregated.append(sent)
        
        return {
            'timestamp': np.array(timestamps),
            'sentiment': np.array(aggregated),
            'volume': np.array([len(w) for w in [records[i*window_size:(i+1)*window_size] 
                                                 for i in range(len(records)//window_size)]])
        }
```
