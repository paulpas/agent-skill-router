---
name: trading-technical-support-resistance
description: Technical levels where price tends to pause or reverse
---

**Role:** Identify and validate key S/R levels for entry, exit, and stop placement

**Philosophy:** Support and resistance represent collective memory and psychological barriers in the market

## Key Principles

1. **Confluence**: Multiple indicators confirming same level increases validity
2. **Time Integration**: Levels tested multiple times gain strength
3. **Volume Confirmation**: High volume at level indicates institutional interest
4. **Timeframe Hierarchy**: Higher timeframe levels override lower timeframe
5. **Breakout Validation**: Breakouts need follow-through to be valid

## Implementation Guidelines

### Structure
- Core logic: technical_analysis/support_resistance.py
- Helper functions: technical_analysis/level_analysis.py
- Tests: tests/test_support_resistance.py

### Patterns to Follow
- Cluster levels by price bins
- Track test frequency and volume at each level
- Calculate level strength score

## Adherence Checklist
Before completing your task, verify:
- [ ] Support/resistance levels update in real-time
- [ ] Level strength incorporates volume, frequency, and recency
- [ ] Breakout confirmation requires 2x average volume
- [ ] False breakouts are detected and flagged
- [ ] Level retests are tracked with success rate


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class SupportLevel:
    """A support level with metadata."""
    price: float
    strength: float  # 0-1 score
    test_count: int
    volume_at_level: float
    last_test: datetime
    confirmed: bool

@dataclass
class ResistanceLevel:
    """A resistance level with metadata."""
    price: float
    strength: float  # 0-1 score
    test_count: int
    volume_at_level: float
    last_test: datetime
    broken: bool

class SupportResistanceAnalyzer:
    """Identifies and tracks support and resistance levels."""
    
    def __init__(self, bin_size: float = 0.01, min_tests: int = 2):
        self.bin_size = bin_size
        self.min_tests = min_tests
    
    def identify_support_levels(
        self, candles: pd.DataFrame, lookback: int = 100
    ) -> List[SupportLevel]:
        """Identify key support levels from historical data."""
        recent_candles = candles.tail(lookback)
        support_levels = []
        
        # Find swing lows
        for i in range(1, len(recent_candles) - 1):
            low = recent_candles['low'].iloc[i]
            prev_low = recent_candles['low'].iloc[i-1]
            next_low = recent_candles['low'].iloc[i+1]
            
            # Swing low: lower than neighbors
            if low < prev_low and low < next_low:
                support_levels.append({
                    'price': low,
                    'volume': recent_candles['volume'].iloc[i],
                    'index': i
                })
        
        # Cluster similar support levels
        clustered = self._cluster_levels(support_levels)
        
        # Calculate strength for each level
        result = []
        for level_data in clustered:
            strength = self._calculate_support_strength(
                candles, level_data['price'], level_data['count']
            )
            result.append(SupportLevel(
                price=level_data['price'],
                strength=strength,
                test_count=level_data['count'],
                volume_at_level=level_data['total_volume'],
                last_test=candles.index[level_data['last_index']],
                confirmed=strength > 0.5
            ))
        
        return sorted(result, key=lambda x: x.price, reverse=True)
    
    def identify_resistance_levels(
        self, candles: pd.DataFrame, lookback: int = 100
    ) -> List[ResistanceLevel]:
        """Identify key resistance levels from historical data."""
        recent_candles = candles.tail(lookback)
        resistance_levels = []
        
        # Find swing highs
        for i in range(1, len(recent_candles) - 1):
            high = recent_candles['high'].iloc[i]
            prev_high = recent_candles['high'].iloc[i-1]
            next_high = recent_candles['high'].iloc[i+1]
            
            # Swing high: higher than neighbors
            if high > prev_high and high > next_high:
                resistance_levels.append({
                    'price': high,
                    'volume': recent_candles['volume'].iloc[i],
                    'index': i
                })
        
        # Cluster similar resistance levels
        clustered = self._cluster_levels(resistance_levels)
        
        # Calculate strength for each level
        result = []
        for level_data in clustered:
            strength = self._calculate_resistance_strength(
                candles, level_data['price'], level_data['count']
            )
            result.append(ResistanceLevel(
                price=level_data['price'],
                strength=strength,
                test_count=level_data['count'],
                volume_at_level=level_data['total_volume'],
                last_test=candles.index[level_data['last_index']],
                broken=False
            ))
        
        return sorted(result, key=lambda x: x.price)
    
    def _cluster_levels(
        self, levels: List[Dict], tolerance: float = None
    ) -> List[Dict]:
        """Cluster nearby support/resistance levels."""
        if tolerance is None:
            tolerance = self.bin_size * 3
        
        if not levels:
            return []
        
        # Sort by price
        sorted_levels = sorted(levels, key=lambda x: x['price'])
        clusters = []
        
        current_cluster = {
            'prices': [sorted_levels[0]['price']],
            'volumes': [sorted_levels[0]['volume']],
            'indices': [sorted_levels[0]['index']],
            'total_volume': sorted_levels[0]['volume']
        }
        
        for level in sorted_levels[1:]:
            if level['price'] - current_cluster['prices'][-1] <= tolerance:
                # Add to current cluster
                current_cluster['prices'].append(level['price'])
                current_cluster['volumes'].append(level['volume'])
                current_cluster['indices'].append(level['index'])
                current_cluster['total_volume'] += level['volume']
            else:
                # Save current cluster and start new
                clusters.append({
                    'price': np.mean(current_cluster['prices']),
                    'count': len(current_cluster['prices']),
                    'last_index': current_cluster['indices'][-1],
                    'total_volume': current_cluster['total_volume']
                })
                current_cluster = {
                    'prices': [level['price']],
                    'volumes': [level['volume']],
                    'indices': [level['index']],
                    'total_volume': level['volume']
                }
        
        # Don't forget last cluster
        clusters.append({
            'price': np.mean(current_cluster['prices']),
            'count': len(current_cluster['prices']),
            'last_index': current_cluster['indices'][-1],
            'total_volume': current_cluster['total_volume']
        })
        
        return clusters
    
    def _calculate_support_strength(
        self, candles: pd.DataFrame, price: float, test_count: int
    ) -> float:
        """Calculate strength score for support level."""
        strength = 0
        
        # Test count factor (more tests = stronger)
        test_score = min(test_count / 5, 1.0) * 0.3
        
        # Volume factor (higher volume = stronger)
        recent_vol = candles['volume'].tail(50).mean()
        level_vol = candles[candles['low'].between(price - 0.01, price + 0.01)]['volume'].sum()
        volume_score = min(level_vol / (recent_vol * 10), 1.0) * 0.3
        
        # Recency factor (more recent tests = stronger)
        if test_count > 0:
            recent_tests = candles[candles['low'] <= price + 0.01].tail(10)
            recency_score = len(recent_tests) / 10 * 0.4
        else:
            recency_score = 0
        
        return min(test_score + volume_score + recency_score, 1.0)
    
    def _calculate_resistance_strength(
        self, candles: pd.DataFrame, price: float, test_count: int
    ) -> float:
        """Calculate strength score for resistance level."""
        strength = 0
        
        # Test count factor
        test_score = min(test_count / 5, 1.0) * 0.3
        
        # Volume factor
        recent_vol = candles['volume'].tail(50).mean()
        level_vol = candles[candles['high'].between(price - 0.01, price + 0.01)]['volume'].sum()
        volume_score = min(level_vol / (recent_vol * 10), 1.0) * 0.3
        
        # Recency factor
        if test_count > 0:
            recent_tests = candles[candles['high'] >= price - 0.01].tail(10)
            recency_score = len(recent_tests) / 10 * 0.4
        else:
            recency_score = 0
        
        return min(test_score + volume_score + recency_score, 1.0)
```
