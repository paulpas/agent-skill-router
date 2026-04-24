---
name: trading-technical-volume-profile
description: Volume analysis techniques for understanding market structure
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: analysis, technical volume profile, technical-volume-profile, techniques,
    understanding
---


**Role:** Interpret volume distribution to identify accumulation, distribution, and liquidity zones

**Philosophy:** Volume confirms price moves; volume profile reveals where smart money is active

## Key Principles

1. **Volume-Price Relationship**: High volume at price levels indicates strong interest
2. **Point of Control**: Highest volume level acts as magnet or barrier
3. **Value Area**: 70% of session volume defines fair price range
4. **Volume Imbalance**: Large one-sided volume suggests trend strength
5. **Volume Divergence**: Price moving on low volume signals weakness

## Implementation Guidelines

### Structure
- Core logic: technical_analysis/volume_profile.py
- Helper functions: technical_analysis/volume_helpers.py
- Tests: tests/test_volume_profile.py

### Patterns to Follow
- Use pandas DataFrame for efficient volume calculations
- Implement multiple volume metrics (VPVR, OBV, Volume MA)
- Support session-based and custom time windows

## Adherence Checklist
Before completing your task, verify:
- [ ] Volume profile recalculates only on new session
- [ ] Volume-based indicators update in real-time
- [ ] Volume spikes are flagged (2x+ average volume)
- [ ] Volume divergence detection runs on all timeframes
- [ ] Session types (regular, extended) are properly handled


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
from dataclasses import dataclass
from datetime import datetime

@dataclass
class VolumeProfile:
    """Volume profile for a trading session."""
    session_start: datetime
    session_end: datetime
    point_of_control: float  # Highest volume price level
    value_area: Tuple[float, float]  # 70% volume range
    volume_distribution: Dict[float, float]  # Price -> Volume mapping
    total_volume: float

class VolumeProfileAnalyzer:
    """Analyzes volume distribution and volume-based indicators."""
    
    def __init__(self, tick_size: float = 0.01, session_start: str = "09:30"):
        self.tick_size = tick_size
        self.session_start = session_start
        self.session_end = "16:00"
    
    def calculate_volume_profile(
        self, candles: pd.DataFrame, session_only: bool = True
    ) -> VolumeProfile:
        """Calculate Volume Profile Visible Range (VPVR)."""
        # Filter to session hours if required
        if session_only:
            candles = self._filter_session_hours(candles)
        
        # Bin prices into discrete levels
        price_levels = np.arange(
            candles['low'].min(),
            candles['high'].max() + self.tick_size,
            self.tick_size
        )
        
        # Calculate volume at each price level
        volume_dist = {}
        for _, candle in candles.iterrows():
            # Volume is attributed to all prices the candle traversed
            for price in np.arange(
                candle['low'], candle['high'] + self.tick_size, self.tick_size
            ):
                price_rounded = round(price / self.tick_size) * self.tick_size
                volume_dist[price_rounded] = volume_dist.get(price_rounded, 0) + candle['volume']
        
        # Find Point of Control (POC)
        poc_price = max(volume_dist, key=volume_dist.get)
        
        # Calculate Value Area (70% of total volume)
        sorted_levels = sorted(volume_dist.items(), key=lambda x: x[1], reverse=True)
        cumulative_volume = 0
        total_volume = sum(volume_dist.values())
        target_volume = total_volume * 0.7
        
        va_low = sorted_levels[0][0]
        va_high = sorted_levels[0][0]
        
        for price, vol in sorted_levels:
            if cumulative_volume >= target_volume:
                break
            cumulative_volume += vol
            va_low = min(va_low, price)
            va_high = max(va_high, price)
        
        return VolumeProfile(
            session_start=candles.index[0],
            session_end=candles.index[-1],
            point_of_control=poc_price,
            value_area=(va_low, va_high),
            volume_distribution=volume_dist,
            total_volume=total_volume
        )
    
    def calculate_obv(self, candles: pd.DataFrame) -> pd.Series:
        """Calculate On-Balance Volume (OBV)."""
        obv = [0]
        
        for i in range(1, len(candles)):
            if candles['close'].iloc[i] > candles['close'].iloc[i-1]:
                obv.append(obv[-1] + candles['volume'].iloc[i])
            elif candles['close'].iloc[i] < candles['close'].iloc[i-1]:
                obv.append(obv[-1] - candles['volume'].iloc[i])
            else:
                obv.append(obv[-1])
        
        return pd.Series(obv, index=candles.index)
    
    def calculate_volume_ma(self, candles: pd.DataFrame, period: int = 20) -> pd.Series:
        """Calculate Volume Moving Average."""
        return candles['volume'].rolling(window=period).mean()
    
    def detect_volume_spikes(self, candles: pd.DataFrame, threshold: float = 2.0) -> List[datetime]:
        """Detect unusual volume spikes."""
        vol_ma = self.calculate_volume_ma(candles)
        spikes = []
        
        for i in range(len(candles)):
            if candles['volume'].iloc[i] > threshold * vol_ma.iloc[i]:
                spikes.append(candles.index[i])
        
        return spikes
    
    def identify_volume_divergence(
        self, candles: pd.DataFrame, period: int = 20
    ) -> List[Dict]:
        """Identify volume-price divergences."""
        divergences = []
        prices = candles['close'].values
        volumes = candles['volume'].values
        
        for i in range(period, len(candles)):
            # Price higher, volume lower = bearish divergence
            if prices[i] > prices[i-period] and volumes[i] < volumes[i-period]:
                divergences.append({
                    'type': 'bearish',
                    'date': candles.index[i],
                    'price_change': (prices[i] - prices[i-period]) / prices[i-period] * 100,
                    'volume_change': (volumes[i] - volumes[i-period]) / volumes[i-period] * 100
                })
            
            # Price lower, volume higher = bullish divergence
            elif prices[i] < prices[i-period] and volumes[i] > volumes[i-period]:
                divergences.append({
                    'type': 'bullish',
                    'date': candles.index[i],
                    'price_change': (prices[i] - prices[i-period]) / prices[i-period] * 100,
                    'volume_change': (volumes[i] - volumes[i-period]) / volumes[i-period] * 100
                })
        
        return divergences
    
    def _filter_session_hours(self, candles: pd.DataFrame) -> pd.DataFrame:
        """Filter candles to regular trading hours."""
        candles_copy = candles.copy()
        candles_copy['hour'] = candles_copy.index.hour
        candles_copy['minute'] = candles_copy.index.minute
        
        # Regular session: 9:30 AM to 4:00 PM
        start_hour, start_min = 9, 30
        end_hour, end_min = 16, 0
        
        mask = (
            ((candles_copy['hour'] == start_hour) & (candles_copy['minute'] >= start_min)) |
            (candles_copy['hour'] > start_hour)
        ) & (
            ((candles_copy['hour'] == end_hour) & (candles_copy['minute'] <= end_min)) |
            (candles_copy['hour'] < end_hour)
        )
        
        return candles_copy[mask]
```
