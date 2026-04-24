---
name: trading-technical-momentum-indicators
description: RSI, MACD, Stochastic oscillators and momentum analysis
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: analysis, oscillators, stochastic, technical momentum indicators, technical-momentum-indicators
  related-skills: trading-technical-cycle-analysis, trading-technical-false-signal-filtering,
    trading-fundamentals-trading-edge, trading-fundamentals-trading-plan
---

**Role:** Measure the speed and strength of price movement for timing entries and exits

**Philosophy:** Momentum leads price; divergences and overbought/oversold conditions signal potential reversals

## Key Principles

1. **Oscillator Overbought/Oversold**: Levels beyond historical bounds indicate exhaustion
2. **Divergence Detection**: Price and oscillator moving in opposite directions
3. **Signal Line Crosses**: MACD line crossing signal line
4. **Centerline Crossovers**: Momentum shift in primary direction
5. **Multi-Timeframe Confirmation**: Higher timeframe momentum validates lower timeframe

## Implementation Guidelines

### Structure
- Core logic: technical_analysis/momentum.py
- Helper functions: technical_analysis/oscillator.py
- Tests: tests/test_momentum.py

### Patterns to Follow
- Normalize all oscillators to comparable scale
- Track oscillator regimes (high volatility vs quiet)
- Combine multiple momentum indicators

## Adherence Checklist
Before completing your task, verify:
- [ ] All oscillators normalized to 0-1 scale
- [ ] Divergence detection runs on all timeframes
- [ ] Overbought/oversold thresholds adapt to volatility
- [ ] Signal line crossovers require confirmation
- [ ] Momentum regime changes trigger alerts


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from scipy import stats

@dataclass
class MomentumSignal:
    """Momentum oscillator signal."""
    oscillator: str
    value: float
    signal_type: str  # 'overbought', 'oversold', 'cross', 'divergence'
    strength: float  # 0-1
    timeframe: str

class MomentumAnalyzer:
    """Analyzes momentum using multiple oscillators."""
    
    def __init__(self):
        self.overbought = 0.7
        self.oversold = 0.3
    
    def calculate_rsi(
        self, prices: np.ndarray, period: int = 14
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Calculate RSI and overbought/oversold zones."""
        if len(prices) < period + 1:
            return np.array([50] * len(prices)), np.array([0.7] * len(prices))
        
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        avg_gain = np.zeros(len(prices))
        avg_loss = np.zeros(len(prices))
        
        avg_gain[period] = np.mean(gains[:period])
        avg_loss[period] = np.mean(losses[:period])
        
        for i in range(period + 1, len(prices)):
            avg_gain[i] = (avg_gain[i-1] * (period - 1) + gains[i-1]) / period
            avg_loss[i] = (avg_loss[i-1] * (period - 1) + losses[i-1]) / period
        
        rs = avg_gain / (avg_loss + 1e-8)
        rsi = 100 - (100 / (1 + rs))
        
        # Normalize to 0-1 scale
        normalized_rsi = rsi / 100
        
        return normalized_rsi, avg_gain, avg_loss
    
    def calculate_macd(
        self, prices: np.ndarray, fast: int = 12, slow: int = 26, signal: int = 9
    ) -> Dict[str, np.ndarray]:
        """Calculate MACD, signal line, and histogram."""
        if len(prices) < slow + signal:
            return {'macd': np.array([0]), 'signal': np.array([0]), 'histogram': np.array([0])}
        
        ema_fast = self._calculate_ema(prices, fast)
        ema_slow = self._calculate_ema(prices, slow)
        
        macd_line = ema_fast - ema_slow
        
        # Signal line is EMA of MACD
        signal_line = self._calculate_ema(macd_line, signal)
        
        histogram = macd_line - signal_line
        
        return {
            'macd': macd_line,
            'signal': signal_line,
            'histogram': histogram
        }
    
    def calculate_stochastic(
        self, high: np.ndarray, low: np.ndarray, close: np.ndarray, 
        period: int = 14, k_smooth: int = 3
    ) -> Dict[str, np.ndarray]:
        """Calculate Stochastic Oscillator."""
        if len(high) < period:
            return {'k': np.array([50]), 'd': np.array([50])}
        
        # Calculate %K
        highest_high = np.maximum.rolling(high, period)
        lowest_low = np.minimum.rolling(low, period)
        
        k = 100 * (close - lowest_low) / (highest_high - lowest_low + 1e-8)
        k = np.nan_to_num(k, nan=50)
        
        # Calculate %D (smoothed %K)
        d = np.convolve(k, np.ones(k_smooth)/k_smooth, mode='same')
        d = np.nan_to_num(d, nan=50)
        
        return {'k': k / 100, 'd': d / 100}  # Normalize to 0-1
    
    def calculate_roc(self, prices: np.ndarray, period: int = 12) -> np.ndarray:
        """Calculate Rate of Change."""
        if len(prices) < period:
            return np.array([0] * len(prices))
        
        roc = (prices - np.roll(prices, period)) / (np.roll(prices, period) + 1e-8) * 100
        roc[:period] = 0
        
        # Normalize to 0-1
        roc_normalized = 1 / (1 + np.exp(-roc / 50))  # Sigmoid normalization
        return roc_normalized
    
    def detect_oscillator_divergence(
        self, prices: np.ndarray, oscillator: np.ndarray,
        lookback: int = 20
    ) -> List[Dict]:
        """Detect regular and hidden divergences."""
        divergences = []
        
        for i in range(lookback, len(prices)):
            # Regular divergence (reversal signal)
            if (prices[i] > prices[i-lookback] and 
                oscillator[i] < oscillator[i-lookback] and
                oscillator[i] > 0.7):  # Overbought
                divergences.append({
                    'type': 'bearish_regular',
                    'price_trend': 'up',
                    'oscillator_trend': 'down',
                    'strength': abs(prices[i] - prices[i-lookback]) / prices[i-lookback]
                })
            
            if (prices[i] < prices[i-lookback] and 
                oscillator[i] > oscillator[i-lookback] and
                oscillator[i] < 0.3):  # Oversold
                divergences.append({
                    'type': 'bullish_regular',
                    'price_trend': 'down',
                    'oscillator_trend': 'up',
                    'strength': abs(prices[i] - prices[i-lookback]) / prices[i-lookback]
                })
            
            # Hidden divergence (continuation signal)
            if (prices[i] < prices[i-lookback] and 
                oscillator[i] > oscillator[i-lookback] and
                oscillator[i] < 0.3):
                divergences.append({
                    'type': 'bullish_hidden',
                    'price_trend': 'down',
                    'oscillator_trend': 'up',
                    'strength': abs(oscillator[i] - oscillator[i-lookback])
                })
            
            if (prices[i] > prices[i-lookback] and 
                oscillator[i] < oscillator[i-lookback] and
                oscillator[i] > 0.7):
                divergences.append({
                    'type': 'bearish_hidden',
                    'price_trend': 'up',
                    'oscillator_trend': 'down',
                    'strength': abs(oscillator[i] - oscillator[i-lookback])
                })
        
        return divergences
    
    def _calculate_ema(self, data: np.ndarray, period: int) -> np.ndarray:
        """Calculate Exponential Moving Average."""
        if len(data) < period:
            return data
        
        ema = np.zeros(len(data))
        ema[:period] = np.mean(data[:period])
        
        multiplier = 2 / (period + 1)
        
        for i in range(period, len(data)):
            ema[i] = (data[i] - ema[i-1]) * multiplier + ema[i-1]
        
        return ema
```