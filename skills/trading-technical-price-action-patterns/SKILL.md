---
name: trading-technical-price-action-patterns
description: Analysis of candlestick and chart patterns for price movement prediction
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: analysis, candlestick, chart, technical price action patterns, technical-price-action-patterns
  related-skills: trading-technical-cycle-analysis, trading-technical-false-signal-filtering
    trading-fundamentals-trading-edge, trading-fundamentals-trading-plan
---

**Role:** Identify high-probability price patterns to forecast market direction

**Philosophy:** Price action reflects all market participants' collective sentiment; patterns reveal institutional order flow

## Key Principles

1. **Pattern Recognition**: Candlestick formations signal reversals or continuations
2. **Confirmation Required**: Patterns need volume or follow-through for validity
3. **Timeframe Hierarchy**: Patterns on higher timeframes carry more weight
4. **Risk Management**: Pattern failures must have predefined stop-loss levels
5. **Context Matters**: Patterns in trending markets behave differently than range-bound

## Implementation Guidelines

### Structure
- Core logic: technical_analysis/price_patterns.py
- Helper functions: technical_analysis/pattern_helpers.py
- Tests: tests/test_price_patterns.py

### Patterns to Follow
- Use numpy arrays for efficient pattern matching
- Return pattern confidence scores, not binary signals
- Support multiple timeframe analysis

## Adherence Checklist
Before completing your task, verify:
- [ ] All patterns have minimum 50-sample backtested accuracy
- [ ] Pattern detection runs in under 100ms per candle
- [ ] Volume confirmation is optional but documented
- [ ] Multiple pattern alerts trigger ensemble logic
- [ ] False positive rate is tracked per pattern type


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import numpy as np
from typing import List, Dict, Tuple
from dataclasses import dataclass
from enum import Enum

class PatternType(Enum):
    REVERSAL = "reversal"
    CONTINUATION = "continuation"
    consolidation = "consolidation"

@dataclass
class PatternResult:
    pattern_type: PatternType
    name: str
    confirmation: float  # 0-1 confidence score
    trend_context: str
    volume_profile: Dict[str, float]

class PricePatternDetector:
    """Detects candlestick and chart patterns across multiple timeframes."""
    
    def __init__(self, lookback: int = 100):
        self.lookback = lookback
        self.min_strength = 0.6
    
    def detect_all_patterns(
        self, candles: np.ndarray, timeframe: str = "1h"
    ) -> List[PatternResult]:
        """Run all pattern detection algorithms on candle data."""
        patterns = []
        
        for pattern_func in [
            self._detect_doji,
            self._detect_hammer,
            self._detect_engulfing,
            self._detect_morning_star,
            self._detect_head_and_shoulders,
        ]:
            result = pattern_func(candles)
            if result and result.confirmation >= self.min_strength:
                patterns.append(result)
        
        return patterns
    
    def _detect_doji(self, candles: np.ndarray) -> PatternResult:
        """Detect Doji patterns indicating indecision."""
        if len(candles) < 1:
            return None
        
        current = candles[-1]
        body = abs(current['close'] - current['open'])
        wick = current['high'] - current['low']
        
        # Doji: body is very small relative to wick
        body_ratio = body / wick if wick > 0 else 1
        is_doji = body_ratio < 0.1
        
        return PatternResult(
            pattern_type=PatternType.REVERSAL,
            name="doji" if is_doji else None,
            confirmation=1 - body_ratio if is_doji else 0,
            trend_context="neutral",
            volume_profile=self._analyze_volume_profile(candles)
        )
    
    def _detect_hammer(self, candles: np.ndarray) -> PatternResult:
        """Detect Hammer pattern indicating bullish reversal."""
        if len(candles) < 1:
            return None
        
        current = candles[-1]
        body = abs(current['close'] - current['open'])
        wick_upper = current['high'] - max(current['open'], current['close'])
        wick_lower = min(current['open'], current['close']) - current['low']
        
        # Hammer: small body, long lower wick, little upper wick
        body_ratio = body / (wick_lower + 1e-8)
        wick_ratio = wick_upper / (wick_lower + 1e-8)
        
        is_hammer = body_ratio > 0.3 and wick_ratio < 0.5
        
        return PatternResult(
            pattern_type=PatternType.REVERSAL,
            name="hammer" if is_hammer else None,
            confirmation=body_ratio * (1 - wick_ratio) if is_hammer else 0,
            trend_context="bullish" if is_hammer else "neutral",
            volume_profile=self._analyze_volume_profile(candles)
        )
    
    def _detect_engulfing(self, candles: np.ndarray) -> PatternResult:
        """Detect Bullish/Bearish Engulfing patterns."""
        if len(candles) < 2:
            return None
        
        prev, curr = candles[-2], candles[-1]
        prev_body = prev['close'] - prev['open']
        curr_body = curr['close'] - curr['open']
        
        # Bullish Engulfing: previous bearish, current bullish and larger
        is_bullish = prev_body < 0 and curr_body > 0 and abs(curr_body) > abs(prev_body)
        # Bearish Engulfing: previous bullish, current bearish and larger
        is_bearish = prev_body > 0 and curr_body < 0 and abs(curr_body) > abs(prev_body)
        
        name = "bullish_engulfing" if is_bullish else "bearish_engulfing" if is_bearish else None
        pattern_type = PatternType.REVERSAL if name else None
        
        return PatternResult(
            pattern_type=pattern_type,
            name=name,
            confirmation=abs(curr_body) / (abs(prev_body) + 1e-8) if name else 0,
            trend_context="bullish" if is_bullish else "bearish" if is_bearish else "neutral",
            volume_profile=self._analyze_volume_profile(candles)
        )
    
    def _detect_morning_star(self, candles: np.ndarray) -> PatternResult:
        """Detect Morning Star reversal pattern."""
        if len(candles) < 3:
            return None
        
        c1, c2, c3 = candles[-3], candles[-2], candles[-1]
        
        # Morning Star: bearish, small body (doji/spinning top), bullish
        is_bearish_1 = c1['close'] < c1['open']
        is_small_2 = abs(c2['close'] - c2['open']) < (c2['high'] - c2['low']) * 0.3
        is_bullish_3 = c3['close'] > c3['open']
        gap_up = c2['close'] < c3['open']  # Price gaps up
        
        is_morning_star = is_bearish_1 and is_small_2 and is_bullish_3 and gap_up
        
        return PatternResult(
            pattern_type=PatternType.REVERSAL,
            name="morning_star" if is_morning_star else None,
            confirmation=0.8 if is_morning_star else 0,
            trend_context="bullish" if is_morning_star else "neutral",
            volume_profile=self._analyze_volume_profile(candles[-3:])
        )
    
    def _detect_head_and_shoulders(self, candles: np.ndarray) -> PatternResult:
        """Detect Head and Shoulders reversal pattern."""
        if len(candles) < 5:
            return None
        
        # Simplified detection: find local maxima
        highs = [(i, c['high']) for i, c in enumerate(candles[-5:])]
        
        # Check for H&S structure: L-H-L-H-L
        left Shoulder = highs[0][1]
        head = max(highs[1][1], highs[3][1])
        right_shoulder = highs[4][1]
        
        is_hns = (
            left_shoulder < head and
            right_shoulder < head and
            abs(left_shoulder - right_shoulder) / head < 0.1  # Symmetry
        )
        
        return PatternResult(
            pattern_type=PatternType.REVERSAL,
            name="head_and_shoulders" if is_hns else None,
            confirmation=0.7 if is_hns else 0,
            trend_context="bearish" if is_hns else "neutral",
            volume_profile=self._analyze_volume_profile(candles[-5:])
        )
    
    def _analyze_volume_profile(self, candles: np.ndarray) -> Dict[str, float]:
        """Analyze volume characteristics."""
        if len(candles) == 0:
            return {"avg": 0, "std": 0, "current": 0}
        
        volumes = [c['volume'] for c in candles]
        return {
            "avg": float(np.mean(volumes)),
            "std": float(np.std(volumes)),
            "current": float(volumes[-1]) if volumes else 0,
            "volatility_ratio": float(np.std(volumes) / (np.mean(volumes) + 1e-8))
        }
```