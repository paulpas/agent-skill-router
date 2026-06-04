---
name: data-candle-data
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- config
- do-dont
description: '"OHLCV candle data processing, timeframe management, and validation
  for" trading algorithms'
license: MIT
maturity: stable
metadata:
  domain: trading
  output-format: code
  related-skills: ai-order-flow-analysis, data-alternative-data, data-backfill-strategy
  role: implementation
  scope: implementation
  triggers: data candle data, data-candle-data, ohlcv, processing, timeframe
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
  version: 1.0.0
------
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

---

## Core Workflow

1. **Ingest Raw Tick Data** — Load raw tick-by-tick or trade data from exchange APIs, WebSocket feeds, or CSV exports. Normalize timestamps to UTC, deduplicate by (timestamp, trade_id), and reject records with missing price or volume fields.
   **Checkpoint:** Verify that the total number of ticks after deduplication matches expected count for the time range.

2. **Resample into Candle Intervals** — Group ticks into OHLCV candles using pandas `resample` or a custom binning function. For each candle, compute Open (first price), High (max price), Low (min price), Close (last price), and Volume (sum of traded quantities).
   **Checkpoint:** Verify that the sum of all candle volumes equals the total tick volume for the period (within tolerance for missing ticks).

3. **Validate Candle Integrity** — Apply sanity checks: `high >= open, high >= close, low <= open, low <= close`, volume > 0, no negative prices. Flag and quarantine invalid candles for manual review rather than silently fixing them.
   **Checkpoint:** The validation function must return a pass/fail rate; anything below 99.5% indicates a data pipeline issue.

4. **Handle Missing Data** — For gaps shorter than the candle interval, forward-fill the close price. For gaps longer than one full candle period, mark as missing with NaN rather than interpolating. Document the gap source (exchange outage, network issue).
   **Checkpoint:** Never interpolate across a gap — interpolated candles are hallucinated data that corrupt backtests.

5. **Persist and Version** — Store validated candle data in a time-series database (InfluxDB, QuestDB) or Parquet files partitioned by date. Tag each dataset with source, timeframe, version number, and validation checksum for reproducibility.
   **Checkpoint:** Every stored candle file must include a manifest.json with metadata including sha256 checksum and row count.

---

## Implementation Patterns

### Pattern 1: OHLCV Candle Resampling from Tick Data

```python
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Iterator

import numpy as np
import pandas as pd


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Tick:
    """Immutable tick record from exchange trade data."""
    symbol: str
    timestamp: datetime
    price: float
    volume: float
    side: str  # "buy" or "sell"
    trade_id: str

    @property
    def is_buy(self) -> bool:
        return self.side.lower() in ("buy", "bid", "taker_buy")


@dataclass(frozen=True)
class Candle:
    """Immutable OHLCV candle record."""
    symbol: str
    timestamp_open: datetime
    timestamp_close: datetime
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    volume: float
    trade_count: int = 0

    def is_valid(self) -> bool:
        """Validate candle price relationships. Returns False if illegal."""
        if self.high_price < self.open_price:
            return False
        if self.high_price < self.close_price:
            return False
        if self.low_price > self.open_price:
            return False
        if self.low_price > self.close_price:
            return False
        if self.open_price <= 0 or self.high_price <= 0 or self.low_price <= 0:
            return False
        if self.volume < 0:
            return False
        return True


def resample_ticks_to_candles(
    ticks: list[Tick],
    timeframe: str = "1m",
) -> list[Candle]:
    """Resample a list of raw ticks into OHLCV candles.

    Args:
        ticks: Sorted list of Tick objects (ascending timestamp).
        timeframe: Pandas offset string for candle intervals ("1m", "5m", "1h", "4h", "1d").

    Returns:
        List of validated Candle objects in chronological order.

    Raises:
        ValueError: If input ticks are empty or not sorted by timestamp.
    """
    if not ticks:
        raise ValueError("Cannot resample empty tick list")

    # Validate sort order
    for i in range(1, len(ticks)):
        if ticks[i].timestamp <= ticks[i - 1].timestamp:
            raise ValueError(f"Ticks must be sorted by timestamp: index {i}")

    # Build DataFrame for efficient resampling
    df = pd.DataFrame([
        {
            "symbol": t.symbol,
            "timestamp": t.timestamp,
            "price": t.price,
            "volume": t.volume,
            "side": t.side,
        }
        for t in ticks
    ])
    df.set_index("timestamp", inplace=True)

    # Resample to OHLCV using pandas resample
    ohlcv = df.groupby("symbol")["price"].resample(timeframe).agg(
        open="first",
        high="max",
        low="min",
        close="last",
    )

    # Calculate volume as sum of all tick volumes in the interval
    volumes = df.groupby("symbol")["volume"].resample(timeframe).sum()

    candles: list[Candle] = []
    for symbol, group in ohlcv.groupby(level=0):
        time_range = pd.Series(group.index)
        for i, (idx, row) in enumerate(group.iterrows()):
            candle = Candle(
                symbol=symbol,
                timestamp_open=time_range.iloc[i].to_pydatetime(),
                timestamp_close=time_range.iloc[min(i + 1, len(time_range) - 1)].to_pydatetime()
                    if i + 1 < len(time_range)
                    else time_range.iloc[-1].to_pydatetime(),
                open_price=row["open"],
                high_price=row["high"],
                low_price=row["low"],
                close_price=row["close"],
                volume=float(volumes.loc[symbol].iloc[i]),
            )
            if candle.is_valid():
                candles.append(candle)
            else:
                logger.warning(
                    "Invalid candle detected at %s for %s — high=%.4f low=%.4f open=%.4f close=%.4f",
                    idx, symbol, row["high"], row["low"], row["open"], row["close"],
                )

    logger.info("Resampled %d ticks → %d valid candles (timeframe=%s)", len(ticks), len(candles), timeframe)
    return candles


def detect_missing_candle_gaps(
    candles: list[Candle],
    expected_interval: pd.Timedelta,
    tolerance_seconds: int = 30,
) -> list[dict]:
    """Detect gaps in candle data where candles are missing.

    Args:
        candles: Chronologically sorted list of Candle objects.
        expected_interval: Expected time between candles (e.g., pd.Timedelta("1m")).
        tolerance_seconds: Seconds of slack allowed for partial candles at boundaries.

    Returns:
        List of gap dicts with start_time, end_time, and missing_candle_count.
    """
    if len(candles) < 2:
        return []

    gaps: list[dict] = []
    for i in range(1, len(candles)):
        delta = candles[i].timestamp_open - candles[i - 1].timestamp_close
        expected_minutes = expected_interval.total_seconds()

        if delta > pd.Timedelta(seconds=expected_minutes + tolerance_seconds):
            missing_count = max(1, int(delta.total_seconds() / expected_minutes) - 1)
            gaps.append({
                "start_time": candles[i - 1].timestamp_close.isoformat(),
                "end_time": candles[i].timestamp_open.isoformat(),
                "missing_candles": missing_count,
                "duration_seconds": delta.total_seconds(),
            })

    if gaps:
        logger.warning("Detected %d candle gaps in dataset (%d total candles)", len(gaps), len(candles))
    return gaps
```

### Pattern 2: Timeframe Resampling with Volume-Weighted Close Price

```python
def resample_with_vwap_close(
    ticks: list[Tick],
    timeframe: str = "1h",
) -> list[Candle]:
    """Resample ticks into candles using VWAP (volume-weighted average price) as the close price.

    This is preferred over last-price-as-close for tick data that has irregular
    trade timing — it gives more weight to price levels where volume traded,
    reducing the impact of stale or outlier single-trade prices.

    Args:
        ticks: Sorted list of Tick objects.
        timeframe: Pandas resample offset string.

    Returns:
        List of Candle objects with VWAP-based close prices.
    """
    if not ticks:
        return []

    df = pd.DataFrame([
        {"timestamp": t.timestamp, "price": t.price, "volume": t.volume}
        for t in ticks
    ])
    df.set_index("timestamp", inplace=True)

    # Calculate VWAP per interval using cumulative price*volume / cumulative volume
    ohlcv = df.resample(timeframe).agg(
        open=("price", "first"),
        high=("price", "max"),
        low=("price", "min"),
    )
    ohlcv["vwap_volume"] = (df["price"] * df["volume"]).resample(timeframe).sum()
    ohlcv["total_volume"] = df["volume"].resample(timeframe).sum()

    # VWAP close = cumulative price*volume / cumulative volume within interval
    ohlcv["close"] = np.where(
        ohlcv["total_volume"] > 0,
        ohlcv["vwap_volume"] / ohlcv["total_volume"],
        np.nan,
    )

    candles: list[Candle] = []
    for idx, row in ohlcv.iterrows():
        if pd.notna(row["close"]) and row["total_volume"] > 0:
            candle = Candle(
                symbol=ticks[0].symbol if ticks else "",
                timestamp_open=idx.to_pydatetime(),
                timestamp_close=idx.to_pydatetime(),
                open_price=float(row["open"]),
                high_price=float(row["high"]),
                low_price=float(row["low"]),
                close_price=float(row["close"]),
                volume=float(row["total_volume"]),
            )
            if candle.is_valid():
                candles.append(candle)

    return candles
```

## Constraints

### MUST DO
- Validate all incoming data against schema constraints (type, range, nullability) before processing or storage
- Implement idempotent operations: re-processing the same data must produce identical results
- Track data lineage and provenance with timestamps, source identifiers, and transformation history for every record
- Handle out-of-order data by implementing a watermark-based ordering mechanism with configurable tolerance window
- Log data quality metrics (completeness, freshness, accuracy) per source with automatic alerting on degradation

### MUST NOT DO
- Do not silently drop records that fail validation — log them to a quarantine table for review
- Avoid concatenating strings for timestamp comparison; use proper datetime/timedelta objects
- Never assume data arrives in chronological order from any external feed without explicit ordering guarantees
- Do not store raw and processed data in the same table without clear partitioning or separation strategy
- Avoid blocking on slow data sources — implement async prefetch with timeout-based fallback to cached data


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Pandas Time Series OHLC Documentation](https://pandas.pydata.org/docs/user_guide/timeseries.html#ohlc-data)
- [Candlestick Pattern Recognition](https://www.investopedia.com/trading/candlestick-patterns-trading/)
- [OHLC Data Processing with Python](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.resample.html)
- [Volume-Weighted OHLC Aggregation](https://pandas.pydata.org/docs/user_guide/timeseries.html#resampling)
- [Candlestick Charting in Python](https://plotly.com/python/candlestick-charts/)
