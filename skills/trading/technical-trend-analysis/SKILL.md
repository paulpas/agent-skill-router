---




name: technical-trend-analysis
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- config
- do-dont
description: '"Provides Trend identification, classification, and continuation analysis"'
license: MIT
maturity: stable
metadata:
  domain: trading
  output-format: code
  related-skills: fundamentals-trading-plan, technical-cycle-analysis
  role: implementation
  scope: implementation
  triggers: classification, continuation, identification, technical trend analysis,
    technical-trend-analysis
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - no risk management
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
version: "1.0.0"




---




**Role:** Determine market trend direction and strength for directional trading decisions

**Philosophy:** The trend is your friend; identifying trends early and confirming continuations maximizes reward/risk

## Key Principles

1. **Trend Classification**: Uptrend, downtrend, or range-bound
2. **Strength Metrics**: ATR-based volatility, ADX for trend strength
3. **Multi-Timeframe Confirmation**: Higher timeframe trend overrides lower
4. **Trend Exhaustion**: Identify when trend may reverse
5. **Trend Quality**: Clean trends vs. choppy, volatile conditions

## Implementation Guidelines

### Structure
- Core logic: technical_analysis/trend.py
- Helper functions: technical_analysis/trend_indicators.py
- Tests: tests/test_trend.py

### Patterns to Follow
- Use multiple trend filters in ensemble
- Track trend state transitions
- Calculate trend strength as composite score

## Adherence Checklist
Before completing your task, verify:
- [ ] Trend classification runs on multiple timeframes
- [ ] ADX-based trend strength calculated
- [ ] Trend exhaustion indicators trigger alerts
- [ ] False trend signals filtered by volatility
- [ ] Trend quality scores adjust position sizing


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from scipy import stats

@dataclass
class TrendState:
    """Current market trend state."""
    direction: str  # 'up', 'down', 'neutral'
    strength: float  # 0-1
    quality: float  # 0-1 (clean vs choppy)
    duration: int  # bars in current trend
    is_exhausted: bool

@dataclass
class TrendLine:
    """A trend line with parameters."""
    start_price: float
    end_price: float
    start_time: pd.Timestamp
    end_time: pd.Timestamp
    slope: float
    significance: float

class TrendAnalyzer:
    """Analyzes market trends across multiple timeframes."""
    
    def __init__(self, adx_period: int = 14):
        self.adx_period = adx_period
    
    def identify_trend(
        self, candles: pd.DataFrame, lookback: int = 50
    ) -> TrendState:
        """Identify current market trend."""
        if len(candles) < lookback:
            lookback = len(candles)
        
        recent = candles.tail(lookback)
        closes = recent['close'].values
        highs = recent['high'].values
        lows = recent['low'].values
        
        # Calculate trend direction using multiple methods
        # Method 1: Price vs Moving Averages
        sma20 = closes[-20:].mean()
        sma50 = closes[-50:].mean() if len(closes) >= 50 else sma20
        
        price_vs_ma = 1 if closes[-1] > max(sma20, sma50) else -1 if closes[-1] < min(sma20, sma50) else 0
        
        # Method 2: Higher Highs/Lower Lows
        hh_ll_trend = self._detect_hh_ll_trend(highs, lows)
        
        # Method 3: Linear Regression
        regression_trend = self._linear_regression_trend(closes)
        
        # Combine signals
        trend_score = (price_vs_ma + hh_ll_trend + regression_trend) / 3
        
        direction = 'up' if trend_score > 0.3 else 'down' if trend_score < -0.3 else 'neutral'
        
        # Calculate strength using ADX
        adx = self.calculate_adx(candles, lookback)
        strength = min(adx / 30, 1.0)  # ADX > 30 is strong
        
        # Calculate quality (inverse of volatility relative to trend)
        volatility = np.std(np.diff(closes[-20:]))
        trend_range = max(closes[-20:]) - min(closes[-20:])
        quality = 1 - min(volatility / (trend_range + 0.01), 1.0)
        
        # Detect trend exhaustion
        is_exhausted = self._detect_exhaustion(candles)
        
        return TrendState(
            direction=direction,
            strength=strength,
            quality=quality,
            duration=self._count_trend_bars(closes, direction),
            is_exhausted=is_exhausted
        )
    
    def _detect_hh_ll_trend(self, highs: np.ndarray, lows: np.ndarray) -> int:
        """Detect trend using higher highs and lower lows."""
        if len(highs) < 5:
            return 0
        
        # Count HH/HL sequences
        hh_count = 0
        ll_count = 0
        
        for i in range(2, len(highs)):
            if highs[i] > highs[i-2] and highs[i] > highs[i-1]:
                hh_count += 1
            if lows[i] < lows[i-2] and lows[i] < lows[i-1]:
                ll_count += 1
        
        if hh_count > 2:
            return 1
        if ll_count > 2:
            return -1
        return 0
    
    def _linear_regression_trend(self, prices: np.ndarray) -> int:
        """Detect trend using linear regression."""
        if len(prices) < 10:
            return 0
        
        x = np.arange(len(prices))
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, prices)
        
        # Normalize slope by price level
        normalized_slope = (slope * len(prices)) / prices.mean()
        
        return 1 if normalized_slope > 0.01 else -1 if normalized_slope < -0.01 else 0
    
    def calculate_adx(self, candles: pd.DataFrame, period: int = 14) -> float:
        """Calculate Average Directional Index."""
        if len(candles) < period + 1:
            return 0
        
        high = candles['high'].values
        low = candles['low'].values
        close = candles['close'].values
        
        # Calculate True Range
        tr = np.maximum(high[1:] - low[1:], 
                       np.maximum(abs(high[1:] - close[:-1]), abs(low[1:] - close[:-1])))
        
        # Calculate +DM and -DM
        up_move = high[1:] - high[:-1]
        down_move = low[:-1] - low[1:]
        
        plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0)
        minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0)
        
        # Calculate ADX components
        atr = np.mean(tr[-period:])
        plus_di = 100 * np.mean(plus_dm[-period:]) / atr if atr > 0 else 0
        minus_di = 100 * np.mean(minus_dm[-period:]) / atr if atr > 0 else 0
        
        dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di + 1e-8)
        
        return dx
    
    def _count_trend_bars(self, closes: np.ndarray, direction: str) -> int:
        """Count consecutive bars in current trend direction."""
        if direction == 'neutral':
            return 0
        
        count = 0
        for i in range(len(closes) - 1, -1, -1):
            if i == 0:
                break
            if direction == 'up' and closes[i] > closes[i-1]:
                count += 1
            elif direction == 'down' and closes[i] < closes[i-1]:
                count += 1
            else:
                break
        
        return count
    
    def _detect_exhaustion(self, candles: pd.DataFrame) -> bool:
        """Detect trend exhaustion signals."""
        if len(candles) < 10:
            return False
        
        recent = candles.tail(10)
        
        # RSI overbought/oversold
        rsi = self._calculate_rsi(recent['close'].values)
        
        # Divergence detection
        prices = recent['close'].values
        highs = recent['high'].values
        
        # Check for hidden divergence
        if prices[-1] > prices[-5] and rsi[-1] < rsi[-5]:
            return True  # Bearish hidden divergence
        if prices[-1] < prices[-5] and rsi[-1] > rsi[-5]:
            return True  # Bullish hidden divergence
        
        return False
    
    def _calculate_rsi(self, prices: np.ndarray, period: int = 14) -> np.ndarray:
        """Calculate RSI."""
        if len(prices) < period + 1:
            return np.array([50] * len(prices))
        
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
        
        return rsi
```

---

---



### Pattern 2: Risk-Managed Trading Logic with Validation

```python
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TradeSignal:
    """Immutable trade signal with all required validation constraints."""
    symbol: str
    side: str  # "buy" or "sell"
    price: float
    quantity: float
    confidence: float  # 0.0 to 1.0
    reason: str

    def validate(self) -> bool:
        """Validate that the trade signal meets all business constraints."""
        if self.quantity <= 0:
            raise ValueError(f"Quantity must be positive, got {self.quantity}")
        if self.price <= 0:
            raise ValueError(f"Price must be positive, got {self.price}")
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError(f"Confidence must be between 0 and 1, got {self.confidence}")
        return True


def generate_trade_signal(
    symbol: str,
    side: str,
    price: float,
    quantity: float,
    confidence: float,
    reason: str,
) -> TradeSignal:
    """Generate a validated trade signal with guard clause checks."""
    if side not in ("buy", "sell"):
        raise ValueError(f"Invalid side '{side}', must be 'buy' or 'sell'")

    signal = TradeSignal(
        symbol=symbol,
        side=side,
        price=price,
        quantity=quantity,
        confidence=confidence,
        reason=reason,
    )
    signal.validate()
    logger.info("Trade signal generated: %s %s %.4f @ %.2f (confidence=%.2f)",
                 symbol, side, quantity, price, confidence)
    return signal


def execute_with_risk_check(signal: TradeSignal, max_position_pct: float = 0.05) -> dict:
    """Execute a trade signal after applying risk management checks."""
    adjusted_quantity = signal.quantity
    if signal.side == "buy" and signal.quantity > max_position_pct:
        logger.warning("Position %s exceeds max %.1f%% — capping to %.4f",
                        signal.symbol, max_position_pct * 100, max_position_pct)
        adjusted_quantity = max_position_pct

    return {
        "symbol": signal.symbol,
        "side": signal.side,
        "price": signal.price,
        "quantity": adjusted_quantity,
        "capped": adjusted_quantity < signal.quantity,
        "confidence": signal.confidence,
        "status": "submitted",
    }
```

## Constraints

### MUST DO
- Implement indicator calculations using rolling windows with explicit lookback periods; never use full-history data for online indicators
- Validate signal generation by confirming alignment across multiple independent indicators before acting on a single signal
- Calculate all price-based indicators (SMA, EMA, RSI) on closing prices unless specifically designed for tick data
- Include proper handling of missing/NaN candles in indicator pipelines — forward-fill only within session boundaries
- Log signal generation with the full context window of indicator values that led to each signal

### MUST NOT DO
- Do not use look-ahead bias: never reference future bars or prices when calculating indicators during backtesting
- Avoid recalculating all indicators from scratch on every tick — maintain running state for efficiency
- Never combine indicators with different timeframes without explicit resampling and clear documentation of the alignment logic
- Do not generate signals based on a single indicator crossover; require confirmation from price action or volume
- Avoid hardcoding parameter values (e.g., RSI period = 14) without testing regime-specific optima


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Trend Analysis Guide](https://www.investopedia.com/articles/trading/09/trend-analysis.asp)
- [Identifying Trends with Moving Averages](https://www.investopedia.com/terms/m/moving-average.asp)
- [Dow Theory and Trend Principles](https://en.wikipedia.org/wiki/Dow_theory)
- [Trend Following Strategies](https://en.wikipedia.org/wiki/Trend_following)
- [Multi-Timeframe Trend Analysis](https://www.investopedia.com/trading/multi-timeframe-technical-analysis/)
