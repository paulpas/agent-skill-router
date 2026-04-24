---
name: trading-technical-false-signal-filtering
description: False Signal Filtering Techniques for Robust Technical Analysis
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: analysis, robust, technical false signal filtering, technical-false-signal-filtering,
    techniques
---


**Role:** Technical Analysis Engineer — implements algorithms to identify and filter out spurious technical signals that lead to false entries and losses.

**Philosophy:** Signal Quality Assurance — filter rules should be conservative and data-driven, requiring multiple confirmations before a signal is considered valid to avoid whipsaws and random noise in trading decisions.

## Key Principles

1. **Multi-Criteria Confirmation**: All entry signals must be confirmed by at least two independent indicators or price patterns before execution.

2. **Volume Verification**: Price signals without confirming volume are likely false and should be filtered out.

3. **Timeframe Confluence**: Signals must align across multiple timeframes to be considered valid, preventing false signals from lower timeframe noise.

4. **Statistical Significance**: Signal strength must exceed statistical thresholds based on historical backtesting to be considered valid.

5. **Market Context Awareness**: Filter signals based on current market regime (trending, mean-reverting, volatile) to avoid inappropriate signals.

## Implementation Guidelines

### Structure
- Core logic: `skills/technical-analysis/false_signal_filter.py`
- Signal validators: `skills/technical-analysis/signal_validators.py`
- Tests: `skills/tests/test_false_signal_filtering.py`

### Patterns to Follow
- Use stateful filter classes to track signal history
- Implement validators as separate classes with clear interfaces
- Separate signal generation from signal validation
- Use vectorized NumPy operations for batch filtering

## Code Examples

### Filter Rules for False Signals

```python
from dataclasses import dataclass
from typing import List, Dict, Optional
from enum import Enum
import numpy as np


class SignalType(Enum):
    """Types of trading signals."""
    TREND_CROSS = "trend_cross"  # Moving average crossover
    BREAKOUT = "breakout"  # Price breaking support/resistance
   oscillators = "oscillators"  # RSI, Stochastic, etc.
    CANDLE_PATTERN = "candle_pattern"  # Candlestick patterns
    VOLUME_SPIKE = "volume_spike"  # Volume anomaly


@dataclass
class FilterRule:
    """Individual filter rule configuration."""
    name: str
    enabled: bool
    threshold: float
    weight: float  # Weight in composite score
    description: str


class FalseSignalFilter:
    """
    Comprehensive filter for technical analysis false signals.
    Applies multiple filter rules to validate signals before execution.
    """
    
    def __init__(self,
                 rules: List[FilterRule] = None,
                 composite_threshold: float = 0.7):
        self.rules = rules or self._default_rules()
        self.composite_threshold = composite_threshold
        self.signal_history: List[Dict] = []
    
    def _default_rules(self) -> List[FilterRule]:
        """Default filter rules for false signal filtering."""
        return [
            FilterRule(
                name="volume_confirmed",
                enabled=True,
                threshold=0.8,
                weight=0.3,
                description="Signal must have confirming volume above average"
            ),
            FilterRule(
                name="trend_alignment",
                enabled=True,
                threshold=0.7,
                weight=0.2,
                description="Signal must align with higher timeframe trend"
            ),
            FilterRule(
                name="volatility_appropriate",
                enabled=True,
                threshold=0.5,
                weight=0.15,
                description="Signal must be appropriate for current volatility"
            ),
            FilterRule(
                name="statistical_significance",
                enabled=True,
                threshold=0.6,
                weight=0.2,
                description="Signal strength must exceed statistical threshold"
            ),
            FilterRule(
                name="timeframe_confluence",
                enabled=True,
                threshold=0.7,
                weight=0.15,
                description="Signal must be confirmed across multiple timeframes"
            )
        ]
    
    def filter_signal(self,
                      signal_type: SignalType,
                      signal_data: Dict,
                      market_data: Dict = None) -> Dict:
        """
        Apply all filter rules to a signal.
        
        Args:
            signal_type: Type of signal being filtered
            signal_data: Signal details (prices, indicators, etc.)
            market_data: General market context
            
        Returns:
            Dict with filter results and pass/fail status
        """
        filter_results = {}
        composite_score = 0.0
        total_weight = 0.0
        
        for rule in self.rules:
            if not rule.enabled:
                filter_results[rule.name] = {
                    'passed': False,
                    'score': 0.0,
                    'reason': 'Rule disabled'
                }
                continue
            
            # Apply rule
            rule_passed, rule_score = self._apply_rule(rule, signal_type, signal_data, market_data)
            
            filter_results[rule.name] = {
                'passed': rule_passed,
                'score': rule_score,
                'weight': rule.weight,
                'threshold': rule.threshold,
                'reason': f"{'Pass' if rule_passed else 'Fail'}: {rule.description}"
            }
            
            # Accumulate weighted score
            if rule_passed:
                composite_score += rule_score * rule.weight
                total_weight += rule.weight
        
        # Calculate normalized composite score
        composite_score = composite_score / total_weight if total_weight > 0 else 0.0
        
        # Determine if signal passes all rules
        all_passed = all(
            result['passed'] 
            for result in filter_results.values()
            if self.rules[self.rules.index([r for r in self.rules if r.name == rule_name][0])].enabled
            for rule_name in filter_results.keys()
        )
        
        # Or use composite threshold
        signal_passed = composite_score >= self.composite_threshold
        
        # Record result
        self.signal_history.append({
            'timestamp': signal_data.get('timestamp'),
            'signal_type': signal_type.value,
            'composite_score': composite_score,
            'passed': signal_passed,
            'filter_results': filter_results
        })
        
        return {
            'signal_passed': signal_passed,
            'composite_score': composite_score,
            'filter_results': filter_results,
            'all_rules_passed': all_passed
        }
    
    def _apply_rule(self,
                    rule: FilterRule,
                    signal_type: SignalType,
                    signal_data: Dict,
                    market_data: Dict) -> tuple:
        """Apply a single filter rule and return (passed, score)."""
        if rule.name == "volume_confirmed":
            return self._filter_volume(rule, signal_data)
        elif rule.name == "trend_alignment":
            return self._filter_trend(rule, signal_data, market_data)
        elif rule.name == "volatility_appropriate":
            return self._filter_volatility(rule, signal_data, market_data)
        elif rule.name == "statistical_significance":
            return self._filter_statistical(rule, signal_data)
        elif rule.name == "timeframe_confluence":
            return self._filter_timeframe(rule, signal_data, market_data)
        else:
            return (False, 0.0)
    
    def _filter_volume(self,
                       rule: FilterRule,
                       signal_data: Dict) -> tuple:
        """Filter based on volume confirmation."""
        if 'volume' not in signal_data or 'avg_volume' not in signal_data:
            return (False, 0.0)
        
        volume = signal_data['volume']
        avg_volume = signal_data['avg_volume']
        
        if avg_volume <= 0:
            return (False, 0.0)
        
        volume_ratio = volume / avg_volume
        passed = volume_ratio >= rule.threshold
        score = min(1.0, volume_ratio)
        
        return (passed, score)
    
    def _filter_trend(self,
                      rule: FilterRule,
                      signal_data: Dict,
                      market_data: Dict) -> tuple:
        """Filter based on trend alignment."""
        if not market_data or 'higher_trend' not in market_data:
            return (False, 0.0)
        
        higher_trend = market_data['higher_trend']  # 'bullish', 'bearish', 'neutral'
        signal_direction = signal_data.get('direction', 'long')  # 'long' or 'short'
        
        # Align trend and signal direction
        if higher_trend == 'neutral':
            score = 0.5
        elif (higher_trend == 'bullish' and signal_direction == 'long') or \
             (higher_trend == 'bearish' and signal_direction == 'short'):
            score = 1.0
        else:
            score = 0.0
        
        passed = score >= rule.threshold
        return (passed, score)
    
    def _filter_volatility(self,
                           rule: FilterRule,
                           signal_data: Dict,
                           market_data: Dict) -> tuple:
        """Filter based on volatility appropriateness."""
        if not market_data or 'volatility' not in market_data:
            return (False, 0.0)
        
        current_vol = market_data['volatility']
        volatility_regime = market_data.get('volatility_regime', 'normal')
        
        # Different volatility regimes have different signal expectations
        if volatility_regime == 'low':
            expected_signal_size = 0.5  # Smaller moves expected
        elif volatility_regime == 'normal':
            expected_signal_size = 1.0
        else:  # high
            expected_signal_size = 0.7  # More noise, require stronger signal
        
        signal_strength = signal_data.get('signal_strength', 1.0)
        adjusted_strength = signal_strength * expected_signal_size
        
        score = min(1.0, adjusted_strength)
        passed = score >= rule.threshold
        
        return (passed, score)
    
    def _filter_statistical(self,
                            rule: FilterRule,
                            signal_data: Dict) -> tuple:
        """Filter based on statistical significance."""
        if 'signal_score' not in signal_data:
            return (False, 0.0)
        
        signal_score = signal_data['signal_score']
        
        # Assume signals are normally distributed around 0
        # Convert to z-score style confidence
        z_score = abs(signal_score) / 0.1  # Assuming std of 0.1
        confidence = 1.0 - (1.0 / (1.0 + z_score))  # Sigmoid-like
        
        score = confidence
        passed = score >= rule.threshold
        
        return (passed, score)
    
    def _filter_timeframe(self,
                          rule: FilterRule,
                          signal_data: Dict,
                          market_data: Dict) -> tuple:
        """Filter based on timeframe confluence."""
        if not market_data or 'timeframe_alignment' not in market_data:
            return (False, 0.0)
        
        alignment = market_data['timeframe_alignment']  # e.g., {'1m': 0.6, '15m': 0.8, '1h': 0.5}
        
        # Calculate average alignment
        scores = list(alignment.values())
        avg_score = np.mean(scores) if scores else 0.0
        
        passed = avg_score >= rule.threshold
        return (passed, avg_score)
    
    def get_filter_stats(self) -> Dict:
        """Get filtering statistics from signal history."""
        if not self.signal_history:
            return {}
        
        passed = [s for s in self.signal_history if s['passed']]
        failed = [s for s in self.signal_history if not s['passed']]
        
        # Count rule pass rates
        rule_counts = {}
        for rule in self.rules:
            rule_counts[rule.name] = {
                'total': 0,
                'passed': 0
            }
        
        for sig in self.signal_history:
            for rule_name, result in sig['filter_results'].items():
                if rule_name in rule_counts:
                    rule_counts[rule_name]['total'] += 1
                    if result['passed']:
                        rule_counts[rule_name]['passed'] += 1
        
        return {
            'total_signals': len(self.signal_history),
            'passed_signals': len(passed),
            'failed_signals': len(failed),
            'pass_rate': len(passed) / len(self.signal_history) if self.signal_history else 0,
            'avg_composite_score': np.mean([s['composite_score'] for s in self.signal_history]),
            'rule_stats': rule_counts
        }
```

### Confirmation Criteria

```python
from dataclasses import dataclass
from typing import List, Dict, Tuple
from enum import Enum
import numpy as np


class ConfirmationType(Enum):
    """Types of signal confirmations."""
    PRICE = "price"  # Price action confirmation
    INDICATOR = "indicator"  # Indicator confirmation
    VOLUME = "volume"  # Volume confirmation
    STRUCTURE = "structure"  # Price structure confirmation
    TIMEFRAME = "timeframe"  # Multi-timeframe confirmation


@dataclass
class ConfirmationRule:
    """Rule for a specific type of confirmation."""
    confirmation_type: ConfirmationType
    required: bool  # Is this confirmation required?
    threshold: float  # Minimum threshold for passing
    weight: float  # Weight in composite confirmation score


class SignalConfirmator:
    """
    Implements multiple confirmation methods for technical signals.
    Requires and weights different types of confirmations.
    """
    
    def __init__(self,
                 rules: List[ConfirmationRule] = None):
        self.rules = rules or self._default_rules()
        self.confirmation_history: List[Dict] = []
    
    def _default_rules(self) -> List[ConfirmationRule]:
        """Default confirmation rules."""
        return [
            ConfirmationRule(
                confirmation_type=ConfirmationType.PRICE,
                required=True,
                threshold=0.7,
                weight=0.3
            ),
            ConfirmationRule(
                confirmation_type=ConfirmationType.INDICATOR,
                required=True,
                threshold=0.6,
                weight=0.25
            ),
            ConfirmationRule(
                confirmation_type=ConfirmationType.VOLUME,
                required=True,
                threshold=0.5,
                weight=0.2
            ),
            ConfirmationRule(
                confirmation_type=ConfirmationType.STRUCTURE,
                required=False,
                threshold=0.4,
                weight=0.15
            ),
            ConfirmationRule(
                confirmation_type=ConfirmationType.TIMEFRAME,
                required=False,
                threshold=0.5,
                weight=0.1
            )
        ]
    
    def confirm_signal(self,
                       signal_type: str,
                       signal_data: Dict,
                       confirmation_data: Dict) -> Dict:
        """
        Confirm a signal using multiple confirmation methods.
        
        Args:
            signal_type: Type of signal being confirmed
            signal_data: Raw signal data
            confirmation_data: Data for confirmations
            
        Returns:
            Dict with confirmation results and score
        """
        confirmation_scores = {}
        total_weight = 0.0
        required_met = True
        
        for rule in self.rules:
            score = self._calculate_confirmation_score(
                rule.confirmation_type,
                signal_data,
                confirmation_data
            )
            
            confirmation_scores[rule.confirmation_type.value] = {
                'score': score,
                'required': rule.required,
                'threshold': rule.threshold,
                'weight': rule.weight
            }
            
            # Track required confirmations
            if rule.required and score < rule.threshold:
                required_met = False
            
            # Accumulate weighted score
            total_weight += rule.weight
        
        # Calculate composite confirmation score
        composite_score = sum(
            confirmation_scores[r.confirmation_type.value]['score'] * r.weight
            for r in self.rules
        )
        
        # Normalize if needed
        if total_weight > 0 and total_weight != 1.0:
            composite_score = composite_score / total_weight
        
        # Determine if signal is confirmed
        is_confirmed = composite_score >= 0.7 and required_met
        
        # Record confirmation
        self.confirmation_history.append({
            'signal_type': signal_type,
            'composite_score': composite_score,
            'is_confirmed': is_confirmed,
            'confirmation_scores': confirmation_scores,
            'timestamp': confirmation_data.get('timestamp')
        })
        
        return {
            'is_confirmed': is_confirmed,
            'composite_score': composite_score,
            'confirmation_scores': confirmation_scores,
            'required_met': required_met
        }
    
    def _calculate_confirmation_score(self,
                                       confirmation_type: ConfirmationType,
                                       signal_data: Dict,
                                       confirmation_data: Dict) -> float:
        """Calculate confirmation score for a specific type."""
        if confirmation_type == ConfirmationType.PRICE:
            return self._score_price_confirmation(signal_data, confirmation_data)
        elif confirmation_type == ConfirmationType.INDICATOR:
            return self._score_indicator_confirmation(signal_data, confirmation_data)
        elif confirmation_type == ConfirmationType.VOLUME:
            return self._score_volume_confirmation(signal_data, confirmation_data)
        elif confirmation_type == ConfirmationType.STRUCTURE:
            return self._score_structure_confirmation(signal_data, confirmation_data)
        elif confirmation_type == ConfirmationType.TIMEFRAME:
            return self._score_timeframe_confirmation(signal_data, confirmation_data)
        else:
            return 0.0
    
    def _score_price_confirmation(self,
                                   signal_data: Dict,
                                   confirmation_data: Dict) -> float:
        """Score price-based confirmation."""
        if 'price_direction' not in signal_data:
            return 0.0
        
        signal_price = signal_data['price']
        confirmed_price = confirmation_data.get('confirmed_price', signal_price)
        
        # Calculate price move direction match
        if signal_data.get('direction') == 'long':
            score = 1.0 if confirmed_price > signal_price else 0.0
        else:
            score = 1.0 if confirmed_price < signal_price else 0.0
        
        # Scale by magnitude of move
        price_change = abs(confirmed_price - signal_price) / signal_price if signal_price > 0 else 0
        score = score * min(1.0, price_change * 10)  # Scale up to 1.0
        
        return score
    
    def _score_indicator_confirmation(self,
                                       signal_data: Dict,
                                       confirmation_data: Dict) -> float:
        """Score indicator-based confirmation."""
        if 'indicator_signal' not in signal_data:
            return 0.0
        
        signal_indicator = signal_data['indicator_signal']
        confirmed_indicator = confirmation_data.get('confirmed_indicator', signal_indicator)
        
        # Check if indicators agree in direction
        if signal_indicator > 0 and confirmed_indicator > 0:
            score = min(1.0, confirmed_indicator / signal_indicator)
        elif signal_indicator < 0 and confirmed_indicator < 0:
            score = min(1.0, confirmed_indicator / signal_indicator)
        else:
            score = 0.0
        
        return score
    
    def _score_volume_confirmation(self,
                                    signal_data: Dict,
                                    confirmation_data: Dict) -> float:
        """Score volume-based confirmation."""
        if 'volume' not in signal_data or 'avg_volume' not in signal_data:
            return 0.0
        
        volume = signal_data['volume']
        avg_volume = signal_data['avg_volume']
        
        if avg_volume <= 0:
            return 0.0
        
        volume_ratio = volume / avg_volume
        
        # Score based on volume surge
        if volume_ratio >= 2.0:
            score = 1.0
        elif volume_ratio >= 1.5:
            score = 0.8
        elif volume_ratio >= 1.2:
            score = 0.6
        elif volume_ratio >= 1.0:
            score = 0.4
        else:
            score = 0.2
        
        return score
    
    def _score_structure_confirmation(self,
                                       signal_data: Dict,
                                       confirmation_data: Dict) -> float:
        """Score price structure confirmation."""
        if 'structure_level' not in signal_data:
            return 0.0
        
        structure_level = signal_data['structure_level']
        price = confirmation_data.get('price', signal_data.get('price', 0))
        
        # Check if price broke through structure
        if signal_data.get('direction') == 'long':
            score = 1.0 if price > structure_level else 0.0
        else:
            score = 1.0 if price < structure_level else 0.0
        
        # Scale by strength of breakout
        if score > 0:
            distance = abs(price - structure_level) / structure_level if structure_level > 0 else 0
            score = score * min(1.0, distance * 100)
        
        return score
    
    def _score_timeframe_confirmation(self,
                                       signal_data: Dict,
                                       confirmation_data: Dict) -> float:
        """Score multi-timeframe confirmation."""
        if 'timeframe_signals' not in confirmation_data:
            return 0.0
        
        timeframe_signals = confirmation_data['timeframe_signals']
        
        # Check alignment across timeframes
        if not timeframe_signals:
            return 0.0
        
        # Get dominant signal direction
        long_signals = sum(1 for s in timeframe_signals if s.get('direction') == 'long')
        short_signals = sum(1 for s in timeframe_signals if s.get('direction') == 'short')
        total = len(timeframe_signals)
        
        if long_signals > total / 2:
            dominant = 'long'
        elif short_signals > total / 2:
            dominant = 'short'
        else:
            dominant = 'neutral'
        
        # Score based on alignment with dominant signal
        signal_direction = signal_data.get('direction', 'neutral')
        
        if dominant == 'neutral':
            return 0.5
        
        if signal_direction == dominant:
            alignment_score = max(long_signals, short_signals) / total
        else:
            alignment_score = 1 - max(long_signals, short_signals) / total
        
        return alignment_score
    
    def get_confirmation_stats(self) -> Dict:
        """Get confirmation statistics."""
        if not self.confirmation_history:
            return {}
        
        confirmed = [c for c in self.confirmation_history if c['is_confirmed']]
        not_confirmed = [c for c in self.confirmation_history if not c['is_confirmed']]
        
        return {
            'total_signals': len(self.confirmation_history),
            'confirmed_signals': len(confirmed),
            'not_confirmed_signals': len(not_confirmed),
            'confirmation_rate': len(confirmed) / len(self.confirmation_history) if self.confirmation_history else 0,
            'avg_composite_score': np.mean([c['composite_score'] for c in self.confirmation_history])
        }
```

### Volume Confirmation

```python
from dataclasses import dataclass
from typing import List, Dict, Tuple
import numpy as np
from scipy import stats


@dataclass
class VolumeProfile:
    """Volume profile at a price level."""
    price: float
    volume: float
    pct_of_total: float
    bar_count: int


class VolumeConfirmator:
    """
    Confirms signals using volume analysis.
    Detects volume anomalies and confirms price moves.
    """
    
    def __init__(self,
                 volume_window: int = 20,
                 anomaly_threshold: float = 2.0,
                 min_volume: float = 1000):
        self.window = volume_window
        self.anomaly_threshold = anomaly_threshold
        self.min_volume = min_volume
        self.volume_history: List[float] = []
    
    def confirm_volume(self,
                       current_volume: float,
                       price_change: float,
                       direction: str) -> Tuple[bool, float]:
        """
        Confirm signal using volume analysis.
        
        Returns:
            Tuple of (confirmed, confidence_score)
        """
        # Update volume history
        self.volume_history.append(current_volume)
        if len(self.volume_history) > self.window:
            self.volume_history.pop(0)
        
        # Check if volume is above minimum
        if current_volume < self.min_volume:
            return (False, 0.2)
        
        # Calculate average volume
        avg_volume = np.mean(self.volume_history)
        vol_std = np.std(self.volume_history) if len(self.volume_history) > 1 else 0
        
        if avg_volume <= 0:
            return (False, 0.2)
        
        # Calculate volume ratio
        vol_ratio = current_volume / avg_volume
        
        # Check for volume anomaly
        is_volume_anomaly = vol_ratio >= self.anomaly_threshold
        
        # Score based on volume and price action alignment
        if direction == 'long' and price_change > 0:
            price_volume_alignment = 1.0
        elif direction == 'short' and price_change < 0:
            price_volume_alignment = 1.0
        else:
            price_volume_alignment = 0.0
        
        # Calculate confidence score
        score = (
            0.4 * min(1.0, vol_ratio / 2.0) +  # Volume component (0.2 to 1.0)
            0.3 * price_volume_alignment +  # Price alignment (0.0 or 1.0)
            0.3 * (0.5 + 0.5 * is_volume_anomaly)  # Anomaly bonus
        )
        
        # Required minimum score
        confirmed = score >= 0.6
        
        return (confirmed, score)
    
    def calculate_volume_profile(self,
                                  prices: np.ndarray,
                                  volumes: np.ndarray,
                                  num_bins: int = 20) -> List[VolumeProfile]:
        """
        Calculate volume profile across price levels.
        
        Returns volume distribution as list of VolumeProfile objects.
        """
        if len(prices) < 10:
            return []
        
        min_price, max_price = prices.min(), prices.max()
        bin_edges = np.linspace(min_price, max_price, num_bins + 1)
        
        profiles = []
        total_volume = volumes.sum()
        
        for i in range(num_bins):
            mask = (prices >= bin_edges[i]) & (prices < bin_edges[i + 1])
            if i == num_bins - 1:  # Include max price in last bin
                mask = (prices >= bin_edges[i]) & (prices <= bin_edges[i + 1])
            
            if mask.sum() > 0:
                bin_volume = volumes[mask].sum()
                profile = VolumeProfile(
                    price=bin_edges[i],
                    volume=bin_volume,
                    pct_of_total=bin_volume / total_volume if total_volume > 0 else 0,
                    bar_count=int(mask.sum())
                )
                profiles.append(profile)
        
        return profiles
    
    def detect_volume_surge(self,
                            current_volume: float,
                            lookback: int = 5) -> Tuple[bool, float]:
        """
        Detect if current volume represents a surge.
        
        Returns:
            Tuple of (surge_detected, surge_ratio)
        """
        if len(self.volume_history) < lookback:
            return (False, 1.0)
        
        recent_volumes = self.volume_history[-lookback:]
        avg_recent = np.mean(recent_volumes)
        
        if avg_recent <= 0:
            return (False, 1.0)
        
        surge_ratio = current_volume / avg_recent
        is_surge = surge_ratio >= self.anomaly_threshold
        
        return (is_surge, surge_ratio)
    
    def analyze_volume_divergence(self,
                                   prices: np.ndarray,
                                   volumes: np.ndarray) -> Dict:
        """
        Analyze volume-price divergence patterns.
        
        Bullish divergence: Price makes lower low, volume makes higher low
        Bearish divergence: Price makes higher high, volume makes lower high
        
        Returns:
            Dict with divergence analysis results
        """
        if len(prices) < 10 or len(volumes) < 10:
            return {'divergence': 'none', 'score': 0.0}
        
        # Find swing points
        price_lows = []
        price_highs = []
        volume_lows = []
        volume_highs = []
        
        for i in range(2, len(prices) - 2):
            # Price low
            if (prices[i] < prices[i-1] and 
                prices[i] < prices[i+1] and 
                prices[i] < prices[i-2] and 
                prices[i] < prices[i+2]):
                price_lows.append((i, prices[i]))
            
            # Price high
            if (prices[i] > prices[i-1] and 
                prices[i] > prices[i+1] and 
                prices[i] > prices[i-2] and 
                prices[i] > prices[i+2]):
                price_highs.append((i, prices[i]))
        
        # Calculate volume at swing points
        for idx, _ in price_lows:
            volume_lows.append((idx, volumes[idx]))
        for idx, _ in price_highs:
            volume_highs.append((idx, volumes[idx]))
        
        # Check for bullish divergence (lower low, higher low in volume)
        bullish_divergence = False
        if len(price_lows) >= 2 and len(volume_lows) >= 2:
            price_low_1 = price_lows[-2][1]
            price_low_2 = price_lows[-1][1]
            vol_low_1 = volume_lows[-2][1]
            vol_low_2 = volume_lows[-1][1]
            
            if price_low_2 < price_low_1 and vol_low_2 > vol_low_1:
                bullish_divergence = True
        
        # Check for bearish divergence (higher high, lower high in volume)
        bearish_divergence = False
        if len(price_highs) >= 2 and len(volume_highs) >= 2:
            price_high_1 = price_highs[-2][1]
            price_high_2 = price_highs[-1][1]
            vol_high_1 = volume_highs[-2][1]
            vol_high_2 = volume_highs[-1][1]
            
            if price_high_2 > price_high_1 and vol_high_2 < vol_high_1:
                bearish_divergence = True
        
        # Calculate score
        score = 0.0
        if bullish_divergence:
            score = 1.0
        elif bearish_divergence:
            score = -1.0
        
        return {
            'divergence': 'bullish' if bullish_divergence else ('bearish' if bearish_divergence else 'none'),
            'score': score,
            'bullish_divergence': bullish_divergence,
            'bearish_divergence': bearish_divergence,
            'price_lows_found': len(price_lows),
            'volume_lows_found': len(volume_lows),
            'price_highs_found': len(price_highs),
            'volume_highs_found': len(volume_highs)
        }
```

### Timeframe Confluence

```python
from dataclasses import dataclass
from typing import List, Dict, Tuple
import numpy as np


@dataclass
class TimeframeSignal:
    """Signal from a single timeframe."""
    timeframe: str
    direction: str  # 'long', 'short', 'neutral'
    strength: float  # 0-1
    indicators: Dict[str, float]  # Indicator values


class TimeframeConfluence:
    """
    Analyzes signal confluence across multiple timeframes.
    High timeframe sets bias, lower timeframes provide entry timing.
    """
    
    def __init__(self,
                 timeframe_hierarchy: List[str] = None):
        """
        Initialize with timeframe hierarchy.
        
        Higher timeframes should come first.
        Default: ['1h', '15m', '1m']
        """
        self.timeframes = timeframe_hierarchy or ['1h', '15m', '5m', '1m']
        self.hierarchy_weights = self._calculate_hierarchy_weights()
    
    def _calculate_hierarchy_weights(self) -> Dict[str, float]:
        """Calculate weights for each timeframe based on hierarchy position."""
        weights = {}
        n = len(self.timeframes)
        for i, tf in enumerate(self.timeframes):
            # Higher weight for higher timeframes
            weights[tf] = (n - i) / n
        return weights
    
    def analyze_confluence(self,
                           timeframe_signals: List[TimeframeSignal]) -> Dict:
        """
        Analyze confluence across all provided timeframes.
        
        Args:
            timeframe_signals: List of signals from different timeframes
            
        Returns:
            Dict with confluence analysis
        """
        if not timeframe_signals:
            return {
                'confluence_score': 0.0,
                'direction': 'neutral',
                'strength': 0.0,
                'timeframe_alignment': {}
            }
        
        # Organize signals by timeframe
        signals_by_tf = {s.timeframe: s for s in timeframe_signals}
        
        # Check for required timeframes (at least 2)
        if len(timeframe_signals) < 2:
            return {
                'confluence_score': 0.0,
                'direction': 'neutral',
                'strength': 0.0,
                'reason': 'Insufficient timeframes for confluence analysis'
            }
        
        # Analyze directional alignment
        directions = [s.direction for s in timeframe_signals]
        long_count = directions.count('long')
        short_count = directions.count('short')
        neutral_count = directions.count('neutral')
        
        total = len(directions)
        
        # Determine dominant direction
        if long_count > total / 2:
            dominant_direction = 'long'
            alignment_score = long_count / total
        elif short_count > total / 2:
            dominant_direction = 'short'
            alignment_score = short_count / total
        else:
            dominant_direction = 'neutral'
            alignment_score = 1.0 - max(long_count, short_count) / total
        
        # Calculate strength-weighted score
        strength_scores = [s.strength for s in timeframe_signals]
        avg_strength = np.mean(strength_scores) if strength_scores else 0.0
        
        # Confluence score combines alignment and strength
        confluence_score = (
            0.5 * alignment_score +
            0.5 * avg_strength
        )
        
        # Timeframe alignment dict for filter rules
        timeframe_alignment = {
            s.timeframe: s.strength if s.direction == dominant_direction else (1 - s.strength)
            for s in timeframe_signals
        }
        
        # Get overall strength
        overall_strength = (
            confluence_score * len(timeframe_signals) / 2  # Scale by number of timeframes
        )
        
        return {
            'confluence_score': confluence_score,
            'direction': dominant_direction,
            'strength': min(1.0, overall_strength),
            'alignment_score': alignment_score,
            'avg_strength': avg_strength,
            'timeframe_alignment': timeframe_alignment,
            'timeframe_counts': {
                'long': long_count,
                'short': short_count,
                'neutral': neutral_count
            }
        }
    
    def get_higher_timeframe_bias(self,
                                  timeframe_signals: List[TimeframeSignal]) -> str:
        """
        Get bias from higher timeframe (first in hierarchy).
        
        Returns 'long', 'short', or 'neutral'
        """
        if not timeframe_signals:
            return 'neutral'
        
        # Find highest timeframe signal
        highest_tf = min(self.timeframes)
        
        for signal in timeframe_signals:
            if signal.timeframe <= highest_tf:
                return signal.direction
        
        return 'neutral'
    
    def identify_entry_timeframe(self,
                                  timeframe_signals: List[TimeframeSignal]) -> str:
        """
        Identify optimal entry timeframe (lowest timeframe with signal).
        """
        if not timeframe_signals:
            return ''
        
        # Get signals with direction
        directional = [s for s in timeframe_signals if s.direction != 'neutral']
        
        if not directional:
            return ''
        
        # Return lowest timeframe signal
        entry_timeframes = [s.timeframe for s in directional]
        return min(entry_timeframes, key=lambda tf: self.timeframes.index(tf) if tf in self.timeframes else 999)
    
    def check_timeframe_flip(self,
                              current_signals: List[TimeframeSignal],
                              previous_signals: List[TimeframeSignal]) -> bool:
        """
        Check if higher timeframe has flipped direction.
        
        Returns True if direction changed significantly.
        """
        if not current_signals or not previous_signals:
            return False
        
        current_bias = self.get_higher_timeframe_bias(current_signals)
        previous_bias = self.get_higher_timeframe_bias(previous_signals)
        
        # Check for flip
        flips = [
            ('long', 'short'),
            ('short', 'long')
        ]
        
        return (current_bias, previous_bias) in flips
```

## Adherence Checklist

Before completing your task, verify:
- [ ] **Guard Clauses**: All filter rules check for missing data and invalid inputs; all confirmations handle empty data gracefully
- [ ] **Parsed State**: Signal and market data parsed into structured types before filtering
- [ ] **Atomic Predictability**: Filter rules are deterministic; scoring methods use consistent formulas
- [ ] **Fail Fast**: Missing required confirmation data throws descriptive error immediately
- [ ] **Intentional Naming**: Classes use clear names (`FalseSignalFilter`, `SignalConfirmator`, `VolumeConfirmator`)

## Common Mistakes to Avoid

1. **Insufficient Confirmation**: Requiring only one confirmation source (e.g., just volume) is insufficient. Multiple independent confirmations are needed.

2. **Static Thresholds**: Filter thresholds should be adjusted based on market regime and volatility. Fixed thresholds fail in changing conditions.

3. **Ignoring False Positive Costs**: Different false signals have different costs. Filter rules should be weighted by potential loss.

4. **Over-Filtering**: Too many filter rules can cause legitimate signals to be rejected. Balance between false positives and false negatives.

5. **Not Backtesting Filter Rules**: Filter effectiveness must be validated through backtesting. Rules that seem logical may not be effective.

## References

1.bulkley, J. L. "The Secret to Trading: How to Filter Out False Signals" (2026).
2. Murphy, J. J. "Technical Analysis of the Financial Markets" (1999, updated 2026).
3. Pring, R. G. "Technical Analysis Explained" (5th Edition, 2026).
4. Fibonacci Trading: How to Use Volume to Confirm Your Trades (2026).


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.
