---
name: candle-data
description: '"OHLCV candle data processing, timeframe management, and validation
  for" trading algorithms'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: data candle data, data-candle-data, ohlcv, processing, timeframe
  related-skills: ai-order-flow-analysis, data-alternative-data
---



# Candle Data Pipeline: The 5 Laws of Financial Time Series

**Role:** Data Engineer for Financial Time Series — applies to OHLCV candle data processing, resampling, validation, and cleaning for trading algorithms.

**Philosophy:** Price is Truth — market data has a single source of truth. Preserve the original sequence, reject invalid states, and ensure all derived data is deterministic and reproducible.

## The 5 Laws

### 1. The Law of the Early Exit (Guard Clauses)
- **Concept:** Invalid candle data can corrupt entire backtests and live systems.
- **Rule:** Handle edge cases at the top of every data processing function. Reject invalid candles before any calculations.
- **Practice:** `if candle.low < candle.high: raise InvalidCandleError; return`

### 2. Make Illegal States Unrepresentable (Parse, Don't Validate)
- **Concept:** A candle with low > high is not just "bad data" — it's an illegal state that cannot exist in a valid market.
- **Rule:** Parse raw price data into a typed structure that cannot represent invalid states. Use dataclasses or Pydantic with validation.
- **Why:** Prevents entire classes of bugs where invalid candles propagate through calculations.

### 3. The Law of Atomic Predictability
- **Concept:** Resampling candle data must be deterministic. Same inputs = same outputs, always.
- **Rule:** Resampling functions should be pure. No shared state, no side effects. Given the same source candles, produce the same target candles.
- **Defense:** Avoid in-place modifications. Return new candle series from resampling operations.

### 4. The Law of "Fail Fast, Fail Loud"
- **Concept:** A single invalid candle in a backtest can lead to entirely wrong conclusions.
- **Rule:** If candle data cannot be validated, halt immediately with a descriptive error. Do not attempt to "fix" or skip invalid data.
- **Result:** Backtests and live systems can trust all data passing through the pipeline.

### 5. The Law of Intentional Naming
- **Concept:** Timeframe naming is critical: `1m`, `5m`, `15m`, `1h`, `4h`, `1d`, `1w`, `1M`.
- **Rule:** Use clear, consistent naming. Avoid ambiguous terms like "short", "medium", "long". Use raw time period names.
- **Defense:** `Timeframe.ONE_MINUTE` or `"1m"` not `Timeframe.SHORT`.

---

## Implementation Guidelines

### Structure and Patterns to Follow

1. **Candle Schema**: Define strict schema for OHLCV data
2. **Timeframe Enum**: Use explicit timeframe definitions
3. **Resampling Pipeline**: Pure functions for timeframe conversion
4. **Validation Layer**: Separate validation from resampling
5. **Forward/Back Fill Strategy**: Clear handling of missing data
6. **Deduplication**: Ensure no duplicate timestamps

### Common Data Structures

```python
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
from enum import Enum


class Timeframe(Enum):
    """Supported candle timeframes"""
    ONE_MINUTE = "1m"
    THREE_MINUTE = "3m"
    FIVE_MINUTE = "5m"
    FIFTEEN_MINUTE = "15m"
    THIRTY_MINUTE = "30m"
    ONE_HOUR = "1h"
    TWO_HOUR = "2h"
    FOUR_HOUR = "4h"
    SIX_HOUR = "6h"
    EIGHT_HOUR = "8h"
    TWELVE_HOUR = "12h"
    ONE_DAY = "1d"
    THREE_DAY = "3d"
    ONE_WEEK = "1w"
    ONE_MONTH = "1M"


@dataclass(frozen=True)
class Candle:
    """
    Canonical candle structure.
    frozen=True ensures immutability = atomic predictability
    """
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    
    def __post_init__(self):
        """Validate candle data immediately upon creation"""
        # Guard clauses for illegal states
        if self.low > self.high:
            raise ValueError(f"Invalid candle: low ({self.low}) > high ({self.high})")
        if self.open < 0 or self.high < 0 or self.low < 0 or self.close < 0:
            raise ValueError(f"Invalid candle: negative price values")
        if self.volume < 0:
            raise ValueError(f"Invalid candle: negative volume ({self.volume})")
        
        # For candles with no trades, allow special case
        if self.open == self.high == self.low == self.close == 0 and self.volume == 0:
            pass  # Empty candle is valid (no trades in period)
        elif self.open == 0 or self.close == 0:
            raise ValueError(f"Invalid candle: zero price without zero volume")
```

---

## Code Examples

### Example 1: Candle Data Validation and Cleaning Pipeline

```python
"""
Candle Data Validation Pipeline: Ensures data integrity from raw exchange API to algorithm input
"""

from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Iterator
from dataclasses import dataclass, field
from enum import Enum
import pandas as pd
import numpy as np


class Timeframe(Enum):
    """Supported candle timeframes"""
    ONE_MINUTE = "1m"
    FIVE_MINUTE = "5m"
    FIFTEEN_MINUTE = "15m"
    ONE_HOUR = "1h"
    FOUR_HOUR = "4h"
    ONE_DAY = "1d"


@dataclass(frozen=True)
class Candle:
    """
    Canonical candle structure with validation
    """
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    
    def __post_init__(self):
        # Early exit guard: empty candles (no trades) are valid
        if self.volume == 0:
            return
            
        # Validate price relationships
        if self.low > self.high:
            raise ValueError(f"Invalid candle: low ({self.low}) > high ({self.high})")
        if not (self.low <= self.open <= self.high):
            raise ValueError(f"Invalid candle: open ({self.open}) outside low-high range")
        if not (self.low <= self.close <= self.high):
            raise ValueError(f"Invalid candle: close ({self.close}) outside low-high range")
            
        # Validate prices are non-negative
        if self.open < 0 or self.high < 0 or self.low < 0 or self.close < 0:
            raise ValueError(f"Invalid candle: negative price values")
            
        # Validate volume is non-negative
        if self.volume < 0:
            raise ValueError(f"Invalid candle: negative volume ({self.volume})")
    
    @property
    def body(self) -> float:
        """Get candle body size"""
        return abs(self.close - self.open)
    
    @property
    def upper_shadow(self) -> float:
        """Get upper shadow size"""
        return self.high - max(self.open, self.close)
    
    @property
    def lower_shadow(self) -> float:
        """Get lower shadow size"""
        return min(self.open, self.close) - self.low
    
    @property
    def total_range(self) -> float:
        """Get total candle range"""
        return self.high - self.low
    
    @property
    def is_bullish(self) -> bool:
        """Check if candle is bullish"""
        return self.close > self.open
    
    @property
    def is_bearish(self) -> bool:
        """Check if candle is bearish"""
        return self.close < self.open
    
    @property
    def is_doji(self) -> bool:
        """Check if candle is a doji (no body)"""
        return self.body < 0.001 * self.total_range if self.total_range > 0 else False
    
    @classmethod
    def from_dataframe_row(cls, row: pd.Series) -> 'Candle':
        """Create Candle from DataFrame row"""
        return cls(
            timestamp=row['timestamp'],
            open=float(row['open']),
            high=float(row['high']),
            low=float(row['low']),
            close=float(row['close']),
            volume=float(row['volume'])
        )


class CandleValidationError(Exception):
    """Base exception for candle validation errors"""
    pass


class DuplicateCandleError(CandleValidationError):
    """Duplicate timestamp detected"""
    def __init__(self, timestamp: datetime):
        self.timestamp = timestamp
        super().__init__(f"Duplicate candle at {timestamp}")


class GapCandleError(CandleValidationError):
    """Missing time period in candle sequence"""
    def __init__(self, start: datetime, end: datetime, timeframe: Timeframe):
        self.start = start
        self.end = end
        self.timeframe = timeframe
        super().__init__(f"Gap in candles from {start} to {end}")


def validate_candle_series(candles: List[Candle], timeframe: Timeframe) -> List[Candle]:
    """
    Validate a complete candle series for:
    - No duplicates
    - No gaps
    - Proper sequence
    - Valid candle data
    
    Returns validated series or raises error
    """
    if not candles:
        return []
    
    # Sort by timestamp first
    candles = sorted(candles, key=lambda c: c.timestamp)
    
    validated = []
    seen_timestamps = set()
    
    for candle in candles:
        # Check for duplicates
        if candle.timestamp in seen_timestamps:
            raise DuplicateCandleError(candle.timestamp)
        seen_timestamps.add(candle.timestamp)
        
        # Validate individual candle (raises on invalid)
        validated.append(candle)
    
    # Check for gaps
    _check_for_gaps(validated, timeframe)
    
    return validated


def _check_for_gaps(candles: List[Candle], timeframe: Timeframe):
    """Check for gaps in candle sequence"""
    if len(candles) < 2:
        return
    
    expected_interval = _get_timeframe_seconds(timeframe)
    
    for i in range(1, len(candles)):
        actual_gap = (candles[i].timestamp - candles[i-1].timestamp).total_seconds()
        expected_gap = expected_interval
        
        # Allow small tolerance (1 second) for timing variations
        if abs(actual_gap - expected_gap) > 1:
            raise GapCandleError(
                start=candles[i-1].timestamp,
                end=candles[i].timestamp,
                timeframe=timeframe
            )


def _get_timeframe_seconds(timeframe: Timeframe) -> int:
    """Get timeframe interval in seconds"""
    mapping = {
        Timeframe.ONE_MINUTE: 60,
        Timeframe.FIVE_MINUTE: 300,
        Timeframe.FIFTEEN_MINUTE: 900,
        Timeframe.ONE_HOUR: 3600,
        Timeframe.FOUR_HOUR: 14400,
        Timeframe.ONE_DAY: 86400,
    }
    return mapping.get(timeframe, 86400)


def clean_candle_data(raw_candles: List[dict], timeframe: Timeframe) -> List[Candle]:
    """
    Clean and validate raw candle data from exchange API
    """
    cleaned = []
    
    for raw in raw_candles:
        try:
            # Parse raw data
            timestamp = _parse_timestamp(raw.get('timestamp') or raw.get('time') or raw.get('t'))
            open_price = float(raw.get('open') or raw.get('o'))
            high_price = float(raw.get('high') or raw.get('h'))
            low_price = float(raw.get('low') or raw.get('l'))
            close_price = float(raw.get('close') or raw.get('c'))
            volume = float(raw.get('volume') or raw.get('v') or 0)
            
            # Create and validate candle
            candle = Candle(
                timestamp=timestamp,
                open=open_price,
                high=high_price,
                low=low_price,
                close=close_price,
                volume=volume
            )
            cleaned.append(candle)
            
        except (ValueError, TypeError) as e:
            # Fail fast: log and skip invalid candle
            print(f"Skipping invalid candle: {e}")
            continue
    
    # Validate complete series
    return validate_candle_series(cleaned, timeframe)


def _parse_timestamp(ts) -> datetime:
    """Parse various timestamp formats"""
    if isinstance(ts, datetime):
        return ts
    if isinstance(ts, (int, float)):
        # Unix timestamp
        return datetime.fromtimestamp(int(ts))
    if isinstance(ts, str):
        # ISO format or various string formats
        formats = [
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(ts, fmt)
            except ValueError:
                continue
    return datetime.utcnow()


# Example: Clean and validate Binance-style candle data
def clean_binance_candles(raw_candles: List[List]) -> List[Candle]:
    """
    Clean Binance candle API response
    Format: [timestamp, open, high, low, close, volume, ...]
    """
    candles = []
    
    for candle_data in raw_candles:
        try:
            # Binance format: [open_time, open, high, low, close, volume, close_time, ...]
            candle = Candle(
                timestamp=datetime.fromtimestamp(candle_data[0] / 1000),  # ms to seconds
                open=float(candle_data[1]),
                high=float(candle_data[2]),
                low=float(candle_data[3]),
                close=float(candle_data[4]),
                volume=float(candle_data[5])
            )
            candles.append(candle)
        except (IndexError, ValueError, TypeError) as e:
            print(f"Skipping malformed Binance candle: {e}")
            continue
    
    return validate_candle_series(candles, Timeframe.ONE_HOUR)

```

### Example 2: Timeframe Resampling with Forward/Back Fill Strategies

```python
"""
Candle Timeframe Resampling: Convert between different timeframes
Supports forward fill, back fill, and interpolation strategies
"""

from datetime import datetime, timedelta
from typing import List, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import pandas as pd
import numpy as np


class FillStrategy(Enum):
    """Strategies for handling missing data"""
    FORWARD_FILL = "forward"      # Use last known value
    BACK_FILL = "back"            # Use next known value
    INTERPOLATE = "interpolate"   # Linear interpolation
    ZERO = "zero"                 # Use zero (for volumes)
    NULL = "null"                 # Leave as null/NaN


@dataclass
class ResampleConfig:
    """Configuration for candle resampling"""
    source_timeframe: str  # e.g., "1m"
    target_timeframe: str  # e.g., "1h"
    fill_strategy: FillStrategy = FillStrategy.FORWARD_FILL
    forward_fill_count: int = 5  # Max consecutive fills
    back_fill_count: int = 5     # Max consecutive fills


def resample_candles(
    candles: List[Candle],
    target_timeframe: Timeframe,
    config: Optional[ResampleConfig] = None
) -> List[Candle]:
    """
    Resample candles from source timeframe to target timeframe
    
    OHLCV resampling rules:
    - OPEN: First candle's open in the period
    - HIGH: Maximum high in the period
    - LOW: Minimum low in the period
    - CLOSE: Last candle's close in the period
    - VOLUME: Sum of volumes in the period
    """
    if not candles:
        return []
    
    if config is None:
        config = ResampleConfig(
            source_timeframe=candles[0].timestamp.strftime("%M") + "m",
            target_timeframe=target_timeframe.value,
            fill_strategy=FillStrategy.FORWARD_FILL
        )
    
    # Convert to DataFrame for efficient resampling
    df = _candles_to_dataframe(candles)
    
    # Resample the DataFrame
    resampled_df = _resample_dataframe(df, target_timeframe, config)
    
    # Convert back to Candle objects
    return _dataframe_to_candles(resampled_df)


def _candles_to_dataframe(candles: List[Candle]) -> pd.DataFrame:
    """Convert Candle list to DataFrame"""
    df = pd.DataFrame([{
        'timestamp': c.timestamp,
        'open': c.open,
        'high': c.high,
        'low': c.low,
        'close': c.close,
        'volume': c.volume
    } for c in candles])
    
    df.set_index('timestamp', inplace=True)
    df.sort_index(inplace=True)
    
    return df


def _resample_dataframe(
    df: pd.DataFrame,
    target_timeframe: Timeframe,
    config: ResampleConfig
) -> pd.DataFrame:
    """Resample DataFrame using pandas"""
    # Map pandas resample rules
    resample_rules = {
        Timeframe.ONE_MINUTE: '1min',
        Timeframe.FIVE_MINUTE: '5min',
        Timeframe.FIFTEEN_MINUTE: '15min',
        Timeframe.ONE_HOUR: '1h',
        Timeframe.FOUR_HOUR: '4h',
        Timeframe.ONE_DAY: '1d',
    }
    
    rule = resample_rules.get(target_timeframe, '1h')
    
    # Define aggregation rules
    aggregation = {
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last',
        'volume': 'sum'
    }
    
    # Resample
    resampled = df.resample(rule).agg(aggregation)
    
    # Apply fill strategy for missing values
    resampled = _apply_fill_strategy(resampled, config)
    
    # Reset index for Candle conversion
    resampled.reset_index(inplace=True)
    resampled.rename(columns={'index': 'timestamp'}, inplace=True)
    
    return resampled


def _apply_fill_strategy(df: pd.DataFrame, config: ResampleConfig) -> pd.DataFrame:
    """Apply fill strategy to handle missing data"""
    if config.fill_strategy == FillStrategy.FORWARD_FILL:
        df = df.fillna(method='ffill', limit=config.forward_fill_count)
    elif config.fill_strategy == FillStrategy.BACK_FILL:
        df = df.fillna(method='bfill', limit=config.back_fill_count)
    elif config.fill_strategy == FillStrategy.INTERPOLATE:
        df = df.interpolate(method='linear')
    elif config.fill_strategy == FillStrategy.ZERO:
        # Fill volume with 0, others with NaN
        df['volume'] = df['volume'].fillna(0)
    elif config.fill_strategy == FillStrategy.NULL:
        # Keep NaN values
        pass
    
    return df


def _dataframe_to_candles(df: pd.DataFrame) -> List[Candle]:
    """Convert DataFrame back to Candle list"""
    candles = []
    for _, row in df.iterrows():
        # Skip rows where all prices are NaN
        if pd.isna(row['open']) or pd.isna(row['close']):
            continue
            
        candle = Candle(
            timestamp=row['timestamp'].to_pydatetime(),
            open=float(row['open']),
            high=float(row['high']),
            low=float(row['low']),
            close=float(row['close']),
            volume=float(row['volume'] if pd.notna(row['volume']) else 0)
        )
        candles.append(candle)
    
    return candles


def resample_single_candle(
    target_timestamp: datetime,
    source_candles: List[Candle],
    target_timeframe: Timeframe
) -> Candle:
    """
    Resample a single candle at a specific timestamp
    Uses source candles that fall within the period
    """
    timeframe_seconds = _get_timeframe_seconds(target_timeframe)
    
    # Find candles within the period
    start_time = target_timestamp - timedelta(seconds=timeframe_seconds)
    end_time = target_timestamp
    
    period_candles = [
        c for c in source_candles
        if start_time <= c.timestamp < end_time
    ]
    
    if not period_candles:
        raise ValueError(f"No source candles found for period {start_time} to {end_time}")
    
    # Calculate OHLCV
    open_price = period_candles[0].open
    high_price = max(c.high for c in period_candles)
    low_price = min(c.low for c in period_candles)
    close_price = period_candles[-1].close
    volume = sum(c.volume for c in period_candles)
    
    return Candle(
        timestamp=target_timestamp,
        open=open_price,
        high=high_price,
        low=low_price,
        close=close_price,
        volume=volume
    )


def resample_to_multiple_timeframes(
    candles: List[Candle],
    timeframes: List[Timeframe]
) -> dict[str, List[Candle]]:
    """
    Resample candles to multiple timeframes efficiently
    Processes once and returns dict of timeframe -> candles
    """
    if not candles:
        return {t.value: [] for t in timeframes}
    
    df = _candles_to_dataframe(candles)
    
    result = {}
    for timeframe in sorted(timeframes, key=lambda t: _get_timeframe_seconds(t)):
        config = ResampleConfig(
            source_timeframe=candles[0].timestamp.strftime("%M") + "m",
            target_timeframe=timeframe.value,
            fill_strategy=FillStrategy.FORWARD_FILL
        )
        resampled_df = _resample_dataframe(df, timeframe, config)
        result[timeframe.value] = _dataframe_to_candles(resampled_df)
    
    return result


# Example usage
if __name__ == "__main__":
    # Create sample 1-minute candles
    base_time = datetime(2024, 1, 1, 0, 0, 0)
    candles_1m = [
        Candle(
            timestamp=base_time + timedelta(minutes=i),
            open=100 + i * 0.1,
            high=100 + i * 0.1 + 0.5,
            low=100 + i * 0.1 - 0.5,
            close=100 + (i + 1) * 0.1,
            volume=1000 + i * 10
        )
        for i in range(100)
    ]
    
    # Resample to 5-minute candles
    candles_5m = resample_candles(candles_1m, Timeframe.FIVE_MINUTE)
    print(f"100 x 1m candles → {len(candles_5m)} x 5m candles")
    
    # Resample to multiple timeframes
    result = resample_to_multiple_timeframes(
        candles_1m,
        [Timeframe.FIVE_MINUTE, Timeframe.ONE_HOUR, Timeframe.ONE_DAY]
    )
    print(f"Timeframes: {[f'{k}: {len(v)}' for k, v in result.items()]}")

```

### Example 3: Candle Data Quality Monitoring

```python
"""
Candle Data Quality Monitoring: Detect anomalies and data quality issues
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
from dataclasses import dataclass, field
from enum import Enum
import statistics
import numpy as np


class DataQualityIssue(Enum):
    """Types of data quality issues"""
    DUPLICATE_TIMESTAMP = "duplicate_timestamp"
    INVALID_PRICE_RANGE = "invalid_price_range"
    SPKI_PRICE = "spike_price"
    VOLUME_SPIKE = "volume_spike"
    MISSING_DATA = "missing_data"
    TIME_GAP = "time_gap"
    PRICE_OUTLIER = "price_outlier"
    VOLUME_OUTLIER = "volume_outlier"
    SEQUENCE_ERROR = "sequence_error"


@dataclass
class QualityIssue:
    """A single data quality issue"""
    issue_type: DataQualityIssue
    timestamp: datetime
    description: str
    severity: str  # "warning", "error", "critical"
    candle_index: Optional[int] = None


@dataclass
class QualityReport:
    """Quality report for a candle series"""
    total_candles: int
    valid_candles: int
    issues: List[QualityIssue] = field(default_factory=list)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    
    @property
    def quality_score(self) -> float:
        """Calculate quality score (0-100)"""
        if self.total_candles == 0:
            return 100.0
        valid_ratio = self.valid_candles / self.total_candles
        issue_penalty = len(self.issues) * 2  # 2 points per issue
        return max(0, min(100, valid_ratio * 100 - issue_penalty))
    
    @property
    def issue_counts(self) -> Dict[str, int]:
        """Count issues by type"""
        counts = {}
        for issue in self.issues:
            counts[issue.issue_type.value] = counts.get(issue.issue_type.value, 0) + 1
        return counts


def analyze_candle_quality(
    candles: List[Candle],
    expected_timeframe: Optional[str] = None
) -> QualityReport:
    """
    Analyze candle series for data quality issues
    
    Checks:
    - Duplicate timestamps
    - Invalid price ranges (low > high)
    - Price spikes (sudden large moves)
    - Volume spikes
    - Missing data
    - Time gaps
    """
    report = QualityReport(
        total_candles=len(candles),
        valid_candles=len(candles),
        start_time=candles[0].timestamp if candles else None,
        end_time=candles[-1].timestamp if candles else None
    )
    
    if not candles:
        return report
    
    # Sort candles
    candles = sorted(candles, key=lambda c: c.timestamp)
    
    # Analyze each candle
    prices = [c.close for c in candles]
    volumes = [c.volume for c in candles]
    
    # Calculate statistics for outlier detection
    price_mean = statistics.mean(prices)
    price_std = statistics.stdev(prices) if len(prices) > 1 else 0
    volume_mean = statistics.mean(volumes)
    volume_std = statistics.stdev(volumes) if len(volumes) > 1 else 0
    
    # Track seen timestamps
    seen_timestamps = set()
    
    for i, candle in enumerate(candles):
        # Check for duplicate timestamps
        if candle.timestamp in seen_timestamps:
            report.issues.append(QualityIssue(
                issue_type=DataQualityIssue.DUPLICATE_TIMESTAMP,
                timestamp=candle.timestamp,
                description=f"Duplicate timestamp at {candle.timestamp}",
                severity="error",
                candle_index=i
            ))
            report.valid_candles -= 1
            continue
        
        seen_timestamps.add(candle.timestamp)
        
        # Check for invalid price range
        if candle.low > candle.high:
            report.issues.append(QualityIssue(
                issue_type=DataQualityIssue.INVALID_PRICE_RANGE,
                timestamp=candle.timestamp,
                description=f"Invalid price range: low ({candle.low}) > high ({candle.high})",
                severity="critical",
                candle_index=i
            ))
            report.valid_candles -= 1
            continue
        
        # Check for price spikes
        if price_std > 0:
            z_score = abs(candle.close - price_mean) / price_std
            if z_score > 5:  # More than 5 standard deviations
                report.issues.append(QualityIssue(
                    issue_type=DataQualityIssue.SPKI_PRICE,
                    timestamp=candle.timestamp,
                    description=f"Price spike: close ({candle.close}) is {z_score:.2f} std from mean",
                    severity="warning",
                    candle_index=i
                ))
        
        # Check for volume spikes
        if volume_std > 0:
            volume_z_score = abs(candle.volume - volume_mean) / volume_std
            if volume_z_score > 4:  # More than 4 standard deviations
                report.issues.append(QualityIssue(
                    issue_type=DataQualityIssue.VOLUME_SPIKE,
                    timestamp=candle.timestamp,
                    description=f"Volume spike: {candle.volume} is {volume_z_score:.2f} std from mean",
                    severity="warning",
                    candle_index=i
                ))
        
        # Check for price outliers using IQR
        if len(prices) > 10:
            q1 = np.percentile(prices, 25)
            q3 = np.percentile(prices, 75)
            iqr = q3 - q1
            lower_bound = q1 - 3 * iqr
            upper_bound = q3 + 3 * iqr
            
            if candle.close < lower_bound or candle.close > upper_bound:
                report.issues.append(QualityIssue(
                    issue_type=DataQualityIssue.PRICE_OUTLIER,
                    timestamp=candle.timestamp,
                    description=f"Price outlier: {candle.close} outside IQR bounds [{lower_bound:.2f}, {upper_bound:.2f}]",
                    severity="warning",
                    candle_index=i
                ))
    
    # Check for time gaps
    if len(candles) > 1 and expected_timeframe:
        expected_seconds = _get_expected_seconds(expected_timeframe)
        for i in range(1, len(candles)):
            gap_seconds = (candles[i].timestamp - candles[i-1].timestamp).total_seconds()
            if gap_seconds > expected_seconds * 1.5:  # More than 50% gap
                report.issues.append(QualityIssue(
                    issue_type=DataQualityIssue.TIME_GAP,
                    timestamp=candles[i].timestamp,
                    description=f"Time gap detected: {gap_seconds}s between candles",
                    severity="error",
                    candle_index=i
                ))
    
    return report


def _get_expected_seconds(timeframe: str) -> int:
    """Get expected interval in seconds for a timeframe string"""
    mapping = {
        "1m": 60,
        "5m": 300,
        "15m": 900,
        "1h": 3600,
        "4h": 14400,
        "1d": 86400,
    }
    return mapping.get(timeframe, 86400)


def filter_by_quality(
    candles: List[Candle],
    min_quality_score: float = 95.0,
    max_critical_issues: int = 0,
    max_error_issues: int = 0
) -> List[Candle]:
    """
    Filter candle series by quality thresholds
    
    Returns only series that meet quality thresholds
    """
    report = analyze_candle_quality(candles)
    
    # Check quality score
    if report.quality_score < min_quality_score:
        return []
    
    # Check issue counts
    issue_counts = report.issue_counts
    
    if issue_counts.get("invalid_price_range", 0) > max_critical_issues:
        return []
    
    if issue_counts.get("duplicate_timestamp", 0) > max_error_issues:
        return []
    
    if issue_counts.get("time_gap", 0) > max_error_issues:
        return []
    
    return candles


def repair_candle_data(
    candles: List[Candle],
    strategy: str = "forward_fill"
) -> List[Candle]:
    """
    Attempt to repair common data quality issues
    
    Returns repaired candles (may be fewer if issues cannot be fixed)
    """
    repaired = []
    i = 0
    
    while i < len(candles):
        candle = candles[i]
        
        # Check for invalid price range
        if candle.low > candle.high:
            # Swap low and high
            repaired.append(Candle(
                timestamp=candle.timestamp,
                open=candle.open,
                high=candle.low,
                low=candle.high,
                close=candle.close,
                volume=candle.volume
            ))
            i += 1
            continue
        
        # Check for price sequence issues
        if repaired and candle.close < repaired[-1].close:
            # Check if it's a small dip or significant drop
            drop_pct = (repaired[-1].close - candle.close) / repaired[-1].close
            if drop_pct > 0.1:  # More than 10% drop
                # Could indicate data error, apply forward fill
                if strategy == "forward_fill" and i + 1 < len(candles):
                    next_candle = candles[i + 1]
                    if next_candle.close > repaired[-1].close:
                        # Forward fill from next candle
                        repaired.append(Candle(
                            timestamp=candle.timestamp,
                            open=repaired[-1].close,
                            high=next_candle.close,
                            low=next_candle.close,
                            close=next_candle.close,
                            volume=candle.volume
                        ))
                        i += 2
                        continue
        
        repaired.append(candle)
        i += 1
    
    return repaired


# Example usage
if __name__ == "__main__":
    # Create candles with quality issues
    candles_with_issues = [
        Candle(datetime(2024, 1, 1, 0, 0), 100, 105, 98, 103, 1000),
        Candle(datetime(2024, 1, 1, 0, 0), 103, 108, 101, 106, 1100),  # Duplicate timestamp
        Candle(datetime(2024, 1, 1, 0, 1), 106, 95, 104, 107, 1200),  # Invalid range
        Candle(datetime(2024, 1, 1, 0, 2), 107, 112, 106, 200, 1300),  # Price spike
        Candle(datetime(2024, 1, 1, 0, 3), 200, 205, 198, 202, 10000),  # Normal after spike
    ]
    
    # Analyze quality
    report = analyze_candle_quality(candles_with_issues, "1m")
    print(f"Quality Score: {report.quality_score:.1f}")
    print(f"Issue Counts: {report.issue_counts}")
    
    # Filter by quality
    quality_candles = filter_by_quality(candles_with_issues, min_quality_score=80)
    print(f"Filtered candles: {len(quality_candles)}")
    
    # Repair data
    repaired = repair_candle_data(candles_with_issues)
    print(f"Repaired candles: {len(repaired)}")

```

---

## Adherence Checklist

Before completing your candle data pipeline, verify:
- [ ] **Guard Clauses**: Are all invalid candle checks at the top of `__post_init__`?
- [ ] **Parsed State**: Is candle data parsed into `Candle` type at the boundary, rejected if invalid?
- [ ] **Purity**: Do resampling functions return new dataframes/candles without mutation?
- [ ] **Fail Loud**: Do invalid prices throw `ValueError` immediately in `__post_init__`?
- [ ] **Readability**: Are timeframe values `"1m"`, `"5m"`, `"1h"` not `"SHORT"`, `"MEDIUM"`, `"LONG"`?

---

## Common Mistakes to Avoid

### ❌ Mistake 1: No Candle Validation in Constructor
```python
# BAD: Allows invalid candles
@dataclass
class Candle:
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    # Missing: no validation in __post_init__

# GOOD: Validates immediately
@dataclass(frozen=True)
class Candle:
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    
    def __post_init__(self):
        if self.low > self.high:
            raise ValueError(f"Invalid candle: low > high")
```

### ❌ Mistake 2: In-Place Resampling
```python
# BAD: Mutates input data
def resample_inplace(candles: List[Candle]):
    for candle in candles:
        candle.timestamp = candle.timestamp + timedelta(hours=1)  # Mutation!
    return candles

# GOOD: Returns new data
def resample(candles: List[Candle]) -> List[Candle]:
    return [Candle(
        timestamp=c.timestamp + timedelta(hours=1),
        open=c.open, high=c.high, low=c.low, close=c.close, volume=c.volume
    ) for c in candles]
```

### ❌ Mistake 3: Silent Failure on Invalid Data
```python
# BAD: Skips without logging
def parse_candles(raw):
    candles = []
    for r in raw:
        try:
            candles.append(Candle(...))
        except:
            pass  # Silent failure!
    return candles

# GOOD: Logs and re-raises
def parse_candles(raw):
    candles = []
    for r in raw:
        try:
            candles.append(Candle(...))
        except ValueError as e:
            logger.error(f"Invalid candle data: {r}, error: {e}")
            raise InvalidCandleError(f"Failed to parse candle: {r}")
```

### ❌ Mistake 4: Ambiguous Timeframe Naming
```python
# BAD: Unclear what these mean
class Timeframe:
    SHORT = 60
    MEDIUM = 300
    LONG = 3600

# GOOD: Explicit and clear
class Timeframe(Enum):
    ONE_MINUTE = "1m"
    FIVE_MINUTE = "5m"
    ONE_HOUR = "1h"
```

### ❌ Mistake 5: No Gap Detection
```python
# BAD: Assumes continuous data
def calculate_rsi(candles: List[Candle]) -> List[float]:
    # Naively processes candles
    # Misses that there's a 1-hour gap in data
    pass

# GOOD: Checks for gaps first
def calculate_rsi(candles: List[Candle], expected_interval: int = 60) -> List[float]:
    for i in range(1, len(candles)):
        gap = (candles[i].timestamp - candles[i-1].timestamp).total_seconds()
        if gap > expected_interval * 1.5:
            raise GapError(f"Gap detected at {candles[i].timestamp}")
    # Then calculate RSI
    pass
```

---

## References

1. **Pandas Resampling** - https://pandas.pydata.org/pandas-docs/stable/user_guide/timeseries.html#resampling - Time-based grouping operations
2. **OHLCV Data Standards** - https://www.investopedia.com/terms/o/open-interest.asp - Candle data definitions
3. **Forward vs Backward Fill** - https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.fillna.html - Handling missing data
4. **Time Series Anomaly Detection** - https://en.wikipedia.org/wiki/Anomaly_detection - Statistical methods for quality monitoring
5. **Data Integrity Patterns** - https://martinfowler.com/bliki/DataValidation.html - Parse, don't validate approach