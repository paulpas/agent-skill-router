---
name: trading-technical-indicator-confluence
description: Indicator Confluence Validation Systems for Confirming Trading Signals
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: technical indicator confluence, technical-indicator-confluence, validation, systems, confirming
---

**Role:** Technical Validation Engineer — implements systems that require multiple technical indicators to align before confirming trading signals, reducing false positives and increasing probability of success.

**Philosophy:** Consensus-Based Validation — a single indicator may mislead, but when multiple independent indicators converge, the signal gains credibility. Confluence validation acts as a quality filter for trading decisions.

## Key Principles

1. **Independent Indicator Selection**: Confluent signals require indicators from different categories (trend, momentum, volume, volatility) to avoid correlated false signals.

2. **Strength-Based Scoring**: Each indicator contributes a strength score; confluence is the weighted sum of these scores.

3. **Directional Consistency**: All confluent indicators must agree on direction (long/short/flat) for a valid signal.

4. **Timeframe Alignment**: Indicators on multiple timeframes must align to confirm signals across market structure levels.

5. **Dynamic Thresholds**: Confluence thresholds should adapt to market regime and volatility conditions.

## Implementation Guidelines

### Structure
- Core logic: `skills/technical-analysis/confluence_validator.py`
- Indicator calculators: `skills/technical-analysis/indicators.py`
- Tests: `skills/tests/test_indicator_confluence.py`

### Patterns to Follow
- Use validator classes to encapsulate confluence logic
- Implement indicator strength scoring as separate methods
- Separate signal generation from confluence validation
- Use weighted scoring for different indicator categories
- Implement multi-timeframe confluence checking

## Code Examples

### Multi-Indicator Confluence Validation System

```python
from dataclasses import dataclass
from typing import List, Dict, Optional, Callable
from enum import Enum
import numpy as np
import pandas as pd
from abc import ABC, abstractmethod


class SignalType(Enum):
    """Types of trading signals."""
    BULLISH = "bullish"
    BEARISH = "bearish"
    NEUTRAL = "neutral"


class IndicatorCategory(Enum):
    """Categories of technical indicators."""
    TREND = "trend"
    MOMENTUM = "momentum"
    VOLUME = "volume"
    VOLATILITY = "volatility"
    STRUCTURE = "structure"


@dataclass
class IndicatorSignal:
    """Signal from a single indicator."""
    name: str
    category: IndicatorCategory
    direction: SignalType
    strength: float  # 0.0 to 1.0
    value: float
    timestamp: pd.Timestamp
    params: Dict = None


@dataclass
class ConfluenceSignal:
    """Aggregated confluence signal."""
    direction: SignalType
    confluence_score: float  # 0.0 to 1.0
    indicators: List[IndicatorSignal]
    timestamp: pd.Timestamp
    confidence: float


class Indicator(ABC):
    """Abstract base class for technical indicators."""
    
    @abstractmethod
    def calculate(self, prices: pd.Series, volume: pd.Series = None) -> IndicatorSignal:
        """Calculate indicator signal."""
        pass
    
    @abstractmethod
    def get_name(self) -> str:
        """Return indicator name."""
        pass
    
    @abstractmethod
    def get_category(self) -> IndicatorCategory:
        """Return indicator category."""
        pass


class MovingAverageIndicator(Indicator):
    """Moving average trend indicator."""
    
    def __init__(self, fast_ma: int = 9, slow_ma: int = 21):
        self.fast_ma = fast_ma
        self.slow_ma = slow_ma
    
    def calculate(self, prices: pd.Series, volume: pd.Series = None) -> IndicatorSignal:
        """Calculate MA crossover signal."""
        fast_ma = prices.rolling(self.fast_ma).mean()
        slow_ma = prices.rolling(self.slow_ma).mean()
        
        current_price = prices.iloc[-1]
        current_fast = fast_ma.iloc[-1]
        current_slow = slow_ma.iloc[-1]
        
        # Calculate strength based on price distance from MA
        distance_from_ma = abs(current_price - current_fast) / current_fast
        strength = min(1.0, distance_from_ma * 10)  # Normalize to 0-1
        
        # Determine direction
        if current_price > current_fast > current_slow:
            direction = SignalType.BULLISH
        elif current_price < current_fast < current_slow:
            direction = SignalType.BEARISH
        else:
            direction = SignalType.NEUTRAL
        
        return IndicatorSignal(
            name=self.get_name(),
            category=self.get_category(),
            direction=direction,
            strength=strength,
            value=current_fast,
            timestamp=prices.index[-1]
        )
    
    def get_name(self) -> str:
        return f"MA_{self.fast_ma}_{self.slow_ma}"
    
    def get_category(self) -> IndicatorCategory:
        return IndicatorCategory.TREND


class RSIIndicator(Indicator):
    """Relative Strength Index momentum indicator."""
    
    def __init__(self, period: int = 14, overbought: float = 70, oversold: float = 30):
        self.period = period
        self.overbought = overbought
        self.oversold = oversold
    
    def calculate(self, prices: pd.Series, volume: pd.Series = None) -> IndicatorSignal:
        """Calculate RSI signal."""
        returns = prices.pct_change()
        gains = returns.where(returns > 0, 0)
        losses = -returns.where(returns < 0, 0)
        
        avg_gain = gains.rolling(self.period).mean()
        avg_loss = losses.rolling(self.period).mean()
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        current_rsi = rsi.iloc[-1]
        
        # Calculate strength based on how far from neutral
        if current_rsi > 50:
            strength = min(1.0, (current_rsi - 50) / 50)
            direction = SignalType.BULLISH
        else:
            strength = min(1.0, (50 - current_rsi) / 50)
            direction = SignalType.BEARISH
        
        # Adjust strength based on extreme levels
        if current_rsi > self.overbought or current_rsi < self.oversold:
            strength *= 0.8  # Less confident at extremes
        
        return IndicatorSignal(
            name=self.get_name(),
            category=self.get_category(),
            direction=direction,
            strength=strength,
            value=current_rsi,
            timestamp=prices.index[-1]
        )
    
    def get_name(self) -> str:
        return f"RSI_{self.period}"
    
    def get_category(self) -> IndicatorCategory:
        return IndicatorCategory.MOMENTUM


class MACDIndicator(Indicator):
    """MACD trend and momentum indicator."""
    
    def __init__(self, fast: int = 12, slow: int = 26, signal: int = 9):
        self.fast = fast
        self.slow = slow
        self.signal = signal
    
    def calculate(self, prices: pd.Series, volume: pd.Series = None) -> IndicatorSignal:
        """Calculate MACD signal."""
        ema_fast = prices.ewm(span=self.fast, adjust=False).mean()
        ema_slow = prices.ewm(span=self.slow, adjust=False).mean()
        
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=self.signal, adjust=False).mean()
        
        current_macd = macd_line.iloc[-1]
        current_signal = signal_line.iloc[-1]
        histogram = current_macd - current_signal
        
        # Strength based on histogram distance from zero
        strength = min(1.0, abs(histogram) / prices.iloc[-1] * 100)
        
        if histogram > 0:
            direction = SignalType.BULLISH
        elif histogram < 0:
            direction = SignalType.BEARISH
        else:
            direction = SignalType.NEUTRAL
        
        return IndicatorSignal(
            name=self.get_name(),
            category=self.get_category(),
            direction=direction,
            strength=strength,
            value=current_macd,
            timestamp=prices.index[-1]
        )
    
    def get_name(self) -> str:
        return f"MACD_{self.fast}_{self.slow}_{self.signal}"
    
    def get_category(self) -> IndicatorCategory:
        return IndicatorCategory.MOMENTUM


class VolumeIndicator(Indicator):
    """Volume-based indicator."""
    
    def __init__(self, period: int = 20):
        self.period = period
    
    def calculate(self, prices: pd.Series, volume: pd.Series) -> IndicatorSignal:
        """Calculate volume signal."""
        avg_volume = volume.rolling(self.period).mean()
        current_volume = volume.iloc[-1]
        
        # Strength based on volume relative to average
        strength = min(1.0, current_volume / avg_volume.iloc[-1] - 1) if avg_volume.iloc[-1] > 0 else 0.5
        
        # Direction based on price action relative to volume
        price_change = prices.pct_change().iloc[-1]
        
        if price_change > 0 and current_volume > avg_volume.iloc[-1]:
            direction = SignalType.BULLISH
        elif price_change < 0 and current_volume > avg_volume.iloc[-1]:
            direction = SignalType.BEARISH
        else:
            direction = SignalType.NEUTRAL
        
        return IndicatorSignal(
            name=self.get_name(),
            category=self.get_category(),
            direction=direction,
            strength=strength,
            value=current_volume,
            timestamp=prices.index[-1]
        )
    
    def get_name(self) -> str:
        return f"Volume_{self.period}"
    
    def get_category(self) -> IndicatorCategory:
        return IndicatorCategory.VOLUME


class BollingerBandsIndicator(Indicator):
    """Bollinger Bands volatility indicator."""
    
    def __init__(self, period: int = 20, std_dev: float = 2.0):
        self.period = period
        self.std_dev = std_dev
    
    def calculate(self, prices: pd.Series, volume: pd.Series = None) -> IndicatorSignal:
        """Calculate Bollinger Bands signal."""
        middle_band = prices.rolling(self.period).mean()
        std = prices.rolling(self.period).std()
        
        upper_band = middle_band + (std * self.std_dev)
        lower_band = middle_band - (std * self.std_dev)
        
        current_price = prices.iloc[-1]
        current_upper = upper_band.iloc[-1]
        current_lower = lower_band.iloc[-1]
        current_middle = middle_band.iloc[-1]
        
        # Calculate position within bands (0 = lower, 1 = upper)
        band_width = current_upper - current_lower
        position = (current_price - current_lower) / band_width if band_width > 0 else 0.5
        
        # Strength based on distance from middle band
        distance_from_middle = abs(current_price - current_middle) / current_middle
        strength = min(1.0, distance_from_middle * 5)
        
        # Direction based on band position
        if current_price < current_lower:
            direction = SignalType.BULLISH  # Oversold potential
            strength *= 1.2  # More confident at extremes
        elif current_price > current_upper:
            direction = SignalType.BEARISH  # Overbought potential
            strength *= 1.2
        elif current_price > current_middle:
            direction = SignalType.BULLISH
        else:
            direction = SignalType.BEARISH
        
        return IndicatorSignal(
            name=self.get_name(),
            category=self.get_category(),
            direction=direction,
            strength=strength,
            value=position,
            timestamp=prices.index[-1]
        )
    
    def get_name(self) -> str:
        return f"BB_{self.period}_{self.std_dev}"
    
    def get_category(self) -> IndicatorCategory:
        return IndicatorCategory.VOLATILITY


class ConfluenceValidator:
    """
    Validates trading signals through multi-indicator confluence.
    Requires multiple independent indicators to agree on signals.
    """
    
    def __init__(self,
                 indicators: List[Indicator] = None,
                 min_indicators: int = 3,
                 min_confluence_score: float = 0.6,
                 category_weights: Dict[IndicatorCategory, float] = None):
        self.indicators = indicators or self._default_indicators()
        self.min_indicators = min_indicators
        self.min_confluence_score = min_confluence_score
        
        # Default category weights (prefer diverse categories)
        self.category_weights = category_weights or {
            IndicatorCategory.TREND: 1.2,
            IndicatorCategory.MOMENTUM: 1.1,
            IndicatorCategory.VOLUME: 1.3,
            IndicatorCategory.VOLATILITY: 1.0,
            IndicatorCategory.STRUCTURE: 1.2
        }
        
        self.signal_history: List[ConfluenceSignal] = []
    
    def _default_indicators(self) -> List[Indicator]:
        """Default set of diverse indicators."""
        return [
            MovingAverageIndicator(fast_ma=9, slow_ma=21),
            MACDIndicator(fast=12, slow=26, signal=9),
            RSIIndicator(period=14),
            VolumeIndicator(period=20),
            BollingerBandsIndicator(period=20)
        ]
    
    def calculate_indicator_signals(self, prices: pd.Series, 
                                   volume: pd.Series = None) -> List[IndicatorSignal]:
        """Calculate signals from all indicators."""
        signals = []
        
        for indicator in self.indicators:
            signal = indicator.calculate(prices, volume)
            signals.append(signal)
        
        return signals
    
    def calculate_confluence_score(self, signals: List[IndicatorSignal]) -> float:
        """Calculate overall confluence score from indicator signals."""
        if len(signals) < self.min_indicators:
            return 0.0
        
        # Direction agreement scoring
        direction_scores = {
            SignalType.BULLISH: 0,
            SignalType.BEARISH: 0,
            SignalType.NEUTRAL: 0
        }
        
        total_weighted_strength = 0.0
        total_weight = 0.0
        
        for signal in signals:
            # Apply category weight
            category_weight = self.category_weights.get(signal.category, 1.0)
            
            # Direction matching
            direction_scores[signal.direction] += category_weight
            
            # Weighted strength contribution
            total_weighted_strength += signal.strength * category_weight
            total_weight += category_weight
        
        # Calculate direction consensus
        max_direction_score = max(direction_scores.values())
        total_direction_score = sum(direction_scores.values())
        
        if total_direction_score == 0:
            return 0.0
        
        direction_consensus = max_direction_score / total_direction_score
        
        # Average strength
        avg_strength = total_weighted_strength / total_weight if total_weight > 0 else 0
        
        # Confluence score combines consensus and strength
        confluence_score = (direction_consensus * 0.5 + avg_strength * 0.5)
        
        return confluence_score
    
    def get_direction_from_signals(self, signals: List[IndicatorSignal]) -> SignalType:
        """Determine overall direction from indicator signals."""
        direction_counts = {
            SignalType.BULLISH: 0,
            SignalType.BEARISH: 0,
            SignalType.NEUTRAL: 0
        }
        
        for signal in signals:
            direction_counts[signal.direction] += 1
        
        # Return majority direction
        max_count = max(direction_counts.values())
        
        if max_count == 1:
            return SignalType.NEUTRAL
        
        for direction, count in direction_counts.items():
            if count == max_count and count > 1:
                return direction
        
        return SignalType.NEUTRAL
    
    def validate_confluence(self, prices: pd.Series, 
                           volume: pd.Series = None,
                           timestamp: pd.Timestamp = None) -> Optional[ConfluenceSignal]:
        """Validate confluence and return signal if thresholds met."""
        if timestamp is None:
            timestamp = pd.Timestamp.now()
        
        signals = self.calculate_indicator_signals(prices, volume)
        confluence_score = self.calculate_confluence_score(signals)
        
        # Check minimum threshold
        if confluence_score < self.min_confluence_score:
            return None
        
        # Get direction
        direction = self.get_direction_from_signals(signals)
        
        confluence_signal = ConfluenceSignal(
            direction=direction,
            confluence_score=confluence_score,
            indicators=signals,
            timestamp=timestamp,
            confidence=confluence_score
        )
        
        self.signal_history.append(confluence_signal)
        
        return confluence_signal
    
    def validate_multi_timeframe(self, prices_dict: Dict[str, pd.Series],
                                 volume_dict: Dict[str, pd.Series] = None) -> Optional[ConfluenceSignal]:
        """
        Validate confluence across multiple timeframes.
        Requires alignment across timeframes for stronger confirmation.
        """
        if not prices_dict:
            return None
        
        all_signals = []
        timeframe_agreement = []
        
        for timeframe, prices in prices_dict.items():
            volume = volume_dict.get(timeframe) if volume_dict else None
            signals = self.calculate_indicator_signals(prices, volume)
            
            # Add timeframe metadata to signals
            for signal in signals:
                signal_copy = IndicatorSignal(
                    name=f"{signal.name}_{timeframe}",
                    category=signal.category,
                    direction=signal.direction,
                    strength=signal.strength,
                    value=signal.value,
                    timestamp=prices.index[-1]
                )
                all_signals.append(signal_copy)
            
            # Record timeframe direction
            direction = self.get_direction_from_signals(signals)
            timeframe_agreement.append(direction)
        
        # Check if timeframes agree
        agreement_count = sum(
            1 for d in timeframe_agreement 
            if d == timeframe_agreement[0] and d != SignalType.NEUTRAL
        )
        
        if agreement_count < len(timeframe_agreement) * 0.5:
            return None
        
        # Recalculate confluence with all signals
        confluence_score = self.calculate_confluence_score(all_signals)
        
        if confluence_score < self.min_confluence_score:
            return None
        
        direction = self.get_direction_from_signals(all_signals)
        
        return ConfluenceSignal(
            direction=direction,
            confluence_score=confluence_score,
            indicators=all_signals,
            timestamp=pd.Timestamp.now(),
            confidence=confluence_score * 1.2  # Bonus for multi-timeframe
        )


# Example usage
if __name__ == "__main__":
    # Create synthetic price data
    np.random.seed(42)
    n_days = 200
    
    # Generate trending market with volume
    prices = pd.Series(100 * np.cumprod(1 + np.random.normal(0.002, 0.01, n_days)))
    volume = pd.Series(np.random.uniform(0.8, 1.5, n_days) * 1000000)
    
    # Initialize validator
    validator = ConfluenceValidator(
        min_indicators=3,
        min_confluence_score=0.6
    )
    
    # Calculate signals
    signals = validator.calculate_indicator_signals(prices, volume)
    
    print("Individual Indicator Signals:")
    for signal in signals:
        print(f"  {signal.name} ({signal.category.value}): "
              f"{signal.direction.value} (strength: {signal.strength:.3f})")
    
    # Validate confluence
    confluence = validator.validate_confluence(prices, volume)
    
    if confluence:
        print(f"\nConfluence Signal Validated!")
        print(f"  Direction: {confluence.direction.value}")
        print(f"  Score: {confluence.confluence_score:.3f}")
        print(f"  Indicators: {len(confluence.indicators)}")
    else:
        print("\nNo confluence signal (score below threshold)")
    
    # Multi-timeframe example
    timeframes = {
        "1D": prices,
        "1W": prices.resample('W').last(),
        "1M": prices.resample('M').last()
    }
    
    multi_tf = validator.validate_multi_timeframe(timeframes)
    
    if multi_tf:
        print(f"\nMulti-Timeframe Confluence Signal!")
        print(f"  Direction: {multi_tf.direction.value}")
        print(f"  Score: {multi_tf.confluence_score:.3f}")
```

### Confluence-Based Trading System

```python
class ConfluenceTradingSystem:
    """
    Complete trading system based on indicator confluence.
    Generates signals only when multiple indicators align.
    """
    
    def __init__(self,
                 validator: ConfluenceValidator,
                 position_sizer: Callable = None):
        self.validator = validator
        self.position_sizer = position_sizer or self._default_position_sizer
        self.active_position: Optional[Dict] = None
    
    def _default_position_sizer(self, signal: ConfluenceSignal, 
                                price: float,
                                account_size: float) -> float:
        """Default position sizing based on confluence score."""
        base_size = account_size * 0.02  # 2% risk per trade
        
        # Scale by confluence score
        adjusted_size = base_size * signal.confidence
        
        # Calculate position size in units
        position_size = adjusted_size / price
        
        return position_size
    
    def analyze_market(self, prices: pd.Series, volume: pd.Series = None,
                      timestamp: pd.Timestamp = None) -> Dict:
        """Complete market analysis with confluence validation."""
        if timestamp is None:
            timestamp = pd.Timestamp.now()
        
        # Validate confluence
        confluence = self.validator.validate_confluence(prices, volume, timestamp)
        
        # Check active position management
        position_status = self._check_position_status(prices.iloc[-1], timestamp)
        
        return {
            "confluence": confluence,
            "position_status": position_status,
            "timestamp": timestamp
        }
    
    def _check_position_status(self, current_price: float, 
                               timestamp: pd.Timestamp) -> Dict:
        """Check status of active positions."""
        if self.active_position is None:
            return {"status": "no_position"}
        
        # Check stop loss and take profit
        entry_price = self.active_position["entry_price"]
        stop_loss = self.active_position["stop_loss"]
        take_profit = self.active_position["take_profit"]
        
        # Calculate P&L
        if self.active_position["direction"] == "long":
            pnl = current_price - entry_price
        else:
            pnl = entry_price - current_price
        
        # Check exit conditions
        exit_signal = None
        
        if pnl >= take_profit:
            exit_signal = "take_profit"
        elif pnl <= -stop_loss:
            exit_signal = "stop_loss"
        
        return {
            "status": "active",
            "pnl": pnl,
            "exit_signal": exit_signal
        }
    
    def execute_trade(self, prices: pd.Series, volume: pd.Series = None,
                     account_size: float = 100000,
                     timestamp: pd.Timestamp = None) -> Optional[Dict]:
        """Execute trade if confluence conditions met."""
        if timestamp is None:
            timestamp = pd.Timestamp.now()
        
        # Analyze market
        analysis = self.analyze_market(prices, volume, timestamp)
        
        # Check if we should enter
        if analysis["confluence"] is None:
            return None
        
        if analysis["position_status"]["status"] != "no_position":
            return None
        
        signal = analysis["confluence"]
        
        # Only enter if we have clear direction
        if signal.direction == SignalType.NEUTRAL:
            return None
        
        # Calculate position size
        current_price = prices.iloc[-1]
        position_size = self.position_sizer(signal, current_price, account_size)
        
        # Determine stop loss and take profit
        atr = self._calculate_atr(prices)
        if signal.direction == SignalType.BULLISH:
            stop_loss = current_price - 2 * atr
            take_profit = current_price + 3 * atr
            direction = "long"
        else:
            stop_loss = current_price + 2 * atr
            take_profit = current_price - 3 * atr
            direction = "short"
        
        # Create position
        self.active_position = {
            "entry_price": current_price,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "position_size": position_size,
            "direction": direction,
            "entry_timestamp": timestamp
        }
        
        return {
            "action": "enter",
            "direction": direction,
            "price": current_price,
            "size": position_size,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "confluence_score": signal.confluence_score,
            "timestamp": timestamp
        }
    
    def _calculate_atr(self, prices: pd.Series, period: int = 14) -> float:
        """Calculate Average True Range."""
        high = prices + prices.pct_change().abs() * prices
        low = prices - prices.pct_change().abs() * prices
        
        tr = pd.concat([
            high - low,
            abs(high - prices.shift(1)),
            abs(low - prices.shift(1))
        ], axis=1).max(axis=1)
        
        return tr.tail(period).mean()
    
    def check_exit(self, prices: pd.Series, timestamp: pd.Timestamp = None) -> Optional[Dict]:
        """Check for exit signals on active positions."""
        if timestamp is None:
            timestamp = pd.Timestamp.now()
        
        if self.active_position is None:
            return None
        
        current_price = prices.iloc[-1]
        status = self._check_position_status(current_price, timestamp)
        
        if status["status"] == "no_position":
            return None
        
        if status["exit_signal"]:
            # Close position
            exit_price = current_price
            pnl = status["pnl"]
            
            exit_signal = {
                "action": "exit",
                "reason": status["exit_signal"],
                "price": exit_price,
                "pnl": pnl,
                "timestamp": timestamp
            }
            
            self.active_position = None
            
            return exit_signal
        
        return None


# Example trading bot
class ConfluenceTradingBot:
    """Complete trading bot using confluence validation."""
    
    def __init__(self, account_size: float = 100000):
        validator = ConfluenceValidator(
            min_indicators=3,
            min_confluence_score=0.6
        )
        self.system = ConfluenceTradingSystem(validator)
        self.account_size = account_size
        self.trades: List[Dict] = []
    
    def process_bar(self, prices: pd.Series, volume: pd.Series = None,
                   timestamp: pd.Timestamp = None):
        """Process a single bar of data."""
        if timestamp is None:
            timestamp = pd.Timestamp.now()
        
        # Check for exits first
        exit_signal = self.system.check_exit(prices, timestamp)
        
        if exit_signal:
            print(f"EXIT: {exit_signal}")
            self.trades.append(exit_signal)
        
        # Look for new entries
        entry_signal = self.system.execute_trade(
            prices, volume, self.account_size, timestamp
        )
        
        if entry_signal:
            print(f"ENTRY: {entry_signal}")
            self.trades.append(entry_signal)
    
    def get_performance(self) -> Dict:
        """Calculate trading performance."""
        if not self.trades:
            return {"total_trades": 0, "total_pnl": 0}
        
        pnl_trades = [t.get("pnl", 0) for t in self.trades if "pnl" in t]
        
        return {
            "total_trades": len(pnl_trades),
            "total_pnl": sum(pnl_trades),
            "avg_pnl": sum(pnl_trades) / len(pnl_trades) if pnl_trades else 0,
            "win_rate": sum(1 for p in pnl_trades if p > 0) / len(pnl_trades) if pnl_trades else 0
        }
```

## Adherence Checklist

Before completing your task, verify:

- [ ] **Independent Indicator Selection**: Confluence system uses indicators from multiple categories (trend, momentum, volume, volatility)
- [ ] **Directional Consistency**: All indicators must agree on direction for valid confluence signal
- [ ] **Strength-Based Scoring**: Each indicator contributes to score based on its strength and category weight
- [ ] **Multi-Timeframe Alignment**: Multi-timeframe confluence requires agreement across different time horizons
- [ ] **Dynamic Thresholds**: Confluence thresholds adapt to market conditions and regime

## Common Mistakes to Avoid

1. **Correlated Indicators**: Using multiple indicators of the same type (e.g., three different moving averages) doesn't provide true confluence
2. **Ignoring Category Weights**: Not weighting indicator categories appropriately (volume should have higher weight than trend for confirmation)
3. **Over-Conflation**: Requiring too many indicators (8+) leads to no signals being generated
4. **No Direction Check**: Allowing mixed-direction indicators to create confluence signals
5. **Static Thresholds**: Not adjusting confluence thresholds based on market regime
6. **Ignoring Timeframe Alignment**: Not checking multi-timeframe confluence for higher probability signals
7. **No Position Management**: Generating signals without proper risk management and position sizing
8. **Backtest Overfitting**: Optimizing confluence parameters on the same data being tested

## References

1. Elder, A. (2012). *Come Into My Room: A Guide to Better Trading*. Eldershore Publishing.

2. Murphy, J. J. (1999). *Technical Analysis of the Financial Markets*. New York Institute of Finance.

3. Bulkowski, T. N. (2005). *Encyclopedia of Chart Patterns*. John Wiley & Sons.

4. Sharpe, W. F., & Kretlow, W. G. (1972). An Approach to Portfolio Performance Measurement. *The Journal of Business*, 45(3), 455-471.

5. Pring, R. D. (1986). *Technical Analysis Explained*. McGraw-Hill.

---

Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.
