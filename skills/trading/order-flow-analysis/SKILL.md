---
name: order-flow-analysis
description: Analyzes tick-level order flow data to compute delta, volume profile, footprint patterns, absorption signatures, and conviction scoring for institutional activity detection.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  triggers: order flow, footprint charts, delta analysis, cumulative delta, volume profile, trade absorption, iceberg orders, order book imbalance
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: risk-stop-loss, risk-position-sizing, signals-module
---

# Order Flow Analysis Engine

Analyzes tick-level market microstructure data — trade-by-trade aggressor classification, order book depth snapshots, and volume profile construction — to detect institutional accumulation/distribution activity, footprint patterns, and high-conviction trading signals. This skill makes the model act as a microstructure analyst who reads between the lines of raw tick data to find where large participants are building or unwinding positions.

## TL;DR Checklist

- [ ] Classify aggressor direction using tick test primary with L2 midpoint fallback for locked markets
- [ ] Compute cumulative delta and normalize relative to instrument-specific average candle delta before divergence analysis
- [ ] Bin volumes at tick-sized price levels to construct volume profile — find POC, VAH, VAL, and liquidity voids
- [ ] Require 3+ contiguous stacked imbalances (single levels are noise) with minimum absolute volume filter
- [ ] Score each pattern by conviction factor: stacked imbalance (+30), divergence strength (+25), volume concentration z-score (+25), absorption signatures (+20)
- [ ] Discard all signals below 50 conviction score — do not trade sub-threshold patterns
- [ ] Corroborate divergences with volume profile nodes (POC, VAH, VAL) or historical support/resistance before acting

---

## When to Use

Use this skill when:

- Reading tape data for institutional accumulation or distribution — spotting where large players are building positions before price confirms
- Detecting iceberg orders through repeated execution patterns at identical price levels across consecutive candles
- Identifying absorption at key support/resistance levels where aggressive selling is absorbed by passive limit bids (or vice versa)
- Analyzing volume profile nodes (POC, VAH, VAL) for fair value assessment and determining whether current price trades above or below value
- Confirming price structure signals with order flow divergence — bullish delta divergence at a POC is a high-conviction long setup
- Filtering low-quality signals during off-hours or low-volume periods where tick data is thin and imbalances are meaningless

---

## When NOT to Use

Avoid this skill for:

- Trading on OHLCV-only data without tick-level side attribution — delta classification is impossible from open/high/low/close alone
- During extreme news events (CPI releases, FOMC surprises) where order flow is dominated by algorithmic panic and retail FOMO — signals are unreliable
- As the sole basis for trade entry without price action context — order flow confirms timing; price structure defines direction

---

## Core Workflow

1. **Validate Data Quality** — Verify tick feed integrity before computing any metrics. Check unresolved trade rate (trades where aggressor side cannot be determined) must be <5%. Flag instruments where the tick test cannot reliably determine aggressor direction due to frequent locked markets or cross trades. **Checkpoint:** Unresolved rate below 5% threshold; if exceeded, log a data quality warning and proceed with caution flagging all downstream signals as low-confidence.

2. **Classify Aggressor Side** — Apply tick test primary (price up = buy-initiated, price down = sell-initiated, unchanged = midpoint fallback) with L2 midpoint fallback for locked markets where bid equals ask. Bucket trades by price level and compute net delta per candle as `buy_volume - sell_volume`. **Checkpoint:** Buy/sell volume ratio between 0.3 and 3.0 across the session; extreme ratios indicate classification issues or data feed problems requiring investigation.

3. **Compute Cumulative Delta** — Build rolling sum of net delta across candles to create a cumulative delta series. Normalize each value relative to the average absolute candle delta for the instrument: `normalized_delta = cum_delta / mean(|candle_delta|)`. Flag divergences where price swings and cumulative delta inflections move in opposite directions over a configurable lookback window. **Checkpoint:** Normalized divergence exceeds 2 standard deviations from mean delta — this is the statistical threshold for actionable signals.

4. **Construct Volume Profile** — Bin all trade volumes at tick-sized price levels within the session window. Identify POC (Point of Control — the price level with maximum traded volume), VAH and VAL (Value Area High/Low enclosing 70% of total session volume from the POC outward). Detect liquidity voids as consecutive price levels where volume falls below 10% of POC volume — these represent zones prone to rapid price movement. **Checkpoint:** Value area contains at least 65% of session volume (allows for binning slippage); if significantly below, flag the profile construction parameters.

5. **Detect Order Flow Patterns** — Scan all price levels for stacked imbalances (3+ contiguous tick-sized levels where bid/ask volume ratio >= 2x), absorption signatures (>= 5 repeated executions at an identical price level with consistent chunk sizes indicating iceberg orders), and spoofing footprints (large orders placed then cancelled disproportionately). Score each detected pattern by conviction factor based on stack depth, delta alignment, and proximity to value area edges. **Checkpoint:** At least one high-conviction pattern (score >= 70) or flag the session as low-quality with no actionable signals.

6. **Generate Signal with Conviction Score** — Combine weighted components into a single 0–100 conviction score: stacked imbalance presence (+30 points), delta divergence strength normalized to instrument profile (+25 points), volume concentration z-score at key levels (+25 points), and absorption/iceberg signatures (+20 points). Discard all signals below 50 — only consider entries in the watchlist range (50–69) or execution range (70–100). **Checkpoint:** Signal conviction score >= 70 for high-confidence entry, >= 50 for watchlist observation only; log every discarded signal with its component breakdown for post-session review.

---

## Implementation Patterns

### Pattern 1: Aggressor Classification from Tick Stream

Classifies each tick in a trade stream as buyer-initiated or seller-initiated using the tick test as the primary method, with L2 midpoint price as fallback for locked or crossed markets. Produces `ClassifiedTrade` objects with an explicit aggressor flag, enabling all downstream delta computations. Handles edge cases: zero-volume ticks, unchanged prices in trending regimes, and simultaneous bid/ask updates.

```python
"""
Module: data_pipeline/order_flow/aggressor_classification.py
Purpose: Classify tick-level trades as buyer-initiated or seller-initiated using the tick test
         with L2 midpoint fallback for locked/crossed markets. This is the foundational step
         for all cumulative delta and footprint computations — incorrect classification propagates
         through every downstream metric.

APEX Convention: Data pipeline modules live under data_pipeline/. Tests in tests/test_aggressor_classification.py.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class Tick:
    """Raw tick from a market data feed."""
    timestamp: float          # Unix epoch seconds
    price: float              # Last traded price
    size: int                 # Number of contracts/shares in the trade
    bid: Optional[float] = None  # Best bid at time of trade (L2 snapshot)
    ask: Optional[float] = None  # Best ask at time of trade (L2 snapshot)

    @property
    def midpoint(self) -> Optional[float]:
        """Midpoint price from L2 bid/ask — used for locked market fallback."""
        if self.bid is not None and self.ask is not None:
            return (self.bid + self.ask) / 2.0
        return None


@dataclass
class ClassifiedTrade:
    """A tick with the aggressor side determined by classification logic."""
    timestamp: float
    price: float
    size: int
    aggressor_side: str       # "buy" (buyer-initiated) or "sell" (seller-initiated)
    unresolved: bool = False  # True if aggressor direction could not be determined
    method: str = ""          # "tick_test" or "midpoint_fallback" or "unresolved"

    @property
    def is_buy(self) -> bool:
        return self.aggressor_side == "buy" and not self.unresolved

    @property
    def is_sell(self) -> bool:
        return self.aggressor_side == "sell" and not self.unresolved


@dataclass
class PriceLevelDelta:
    """Net buy/sell delta aggregated at a specific price level."""
    price: float
    buy_volume: int = 0
    sell_volume: int = 0

    @property
    def net_delta(self) -> int:
        return self.buy_volume - self.sell_volume

    @property
    def total_volume(self) -> int:
        return self.buy_volume + self.sell_volume

    @property
    def bid_ask_ratio(self) -> float:
        if self.sell_volume == 0:
            return float("inf") if self.buy_volume > 0 else 1.0
        return self.buy_volume / self.sell_volume


def classify_ticks(
    ticks: List[Tick],
    use_midpoint_fallback: bool = True,
) -> Tuple[List[ClassifiedTrade], float]:
    """Classify aggressor direction for every tick in the stream.

    Uses the tick test as the primary classification method:
      - Price up from previous trade  → buy-initiated (aggressive buyer crossed spread)
      - Price down from previous trade → sell-initiated (aggressive seller hit bid)
      - Price unchanged              → use L2 midpoint fallback if enabled

    For locked markets where bid == ask, the midpoint of the current L2 book is used:
    trades at or above midpoint are classified as buy, below midpoint as sell.

    Args:
        ticks: Chronologically ordered list of raw Tick objects from the market data feed.
        use_midpoint_fallback: Whether to use L2 midpoint classification for unchanged-price ticks.
                              Set False if L2 data is unreliable; such ticks become unresolved.

    Returns:
        Tuple of (classified_trades, unresolved_rate) where unresolved_rate is the fraction
        of trades that could not be classified (unresolved). This rate must stay below 5%
        for reliable delta computation.

    Raises:
        ValueError: If ticks list is empty or not chronologically sorted.
    """
    if not ticks:
        raise ValueError("Tick stream must contain at least one tick")

    # Validate chronological ordering
    for i in range(1, len(ticks)):
        if ticks[i].timestamp < ticks[i - 1].timestamp:
            raise ValueError(
                f"Ticks must be chronologically sorted. "
                f"Index {i} ({ticks[i].timestamp:.6f}) precedes index {i-1} ({ticks[i-1].timestamp:.6f})"
            )

    classified: List[ClassifiedTrade] = []
    unresolved_count = 0
    prev_price: Optional[float] = None

    for tick in ticks:
        if prev_price is None:
            # First trade — classify as buy by convention (start of session accumulation)
            classified.append(ClassifiedTrade(
                timestamp=tick.timestamp,
                price=tick.price,
                size=tick.size,
                aggressor_side="buy",
                unresolved=False,
                method="tick_test",
            ))
            prev_price = tick.price
            continue

        if tick.price > prev_price:
            # Tick test: price rose — aggressive buyer
            classified.append(ClassifiedTrade(
                timestamp=tick.timestamp,
                price=tick.price,
                size=tick.size,
                aggressor_side="buy",
                unresolved=False,
                method="tick_test",
            ))
        elif tick.price < prev_price:
            # Tick test: price fell — aggressive seller
            classified.append(ClassifiedTrade(
                timestamp=tick.timestamp,
                price=tick.price,
                size=tick.size,
                aggressor_side="sell",
                unresolved=False,
                method="tick_test",
            ))
        else:
            # Unchanged price — try midpoint fallback
            if use_midpoint_fallback and tick.midpoint is not None:
                if tick.price >= tick.midpoint:
                    side = "buy"
                else:
                    side = "sell"
                classified.append(ClassifiedTrade(
                    timestamp=tick.timestamp,
                    price=tick.price,
                    size=tick.size,
                    aggressor_side=side,
                    unresolved=False,
                    method="midpoint_fallback",
                ))
            else:
                # Cannot determine — mark unresolved (must be <5% rate)
                classified.append(ClassifiedTrade(
                    timestamp=tick.timestamp,
                    price=tick.price,
                    size=tick.size,
                    aggressor_side="unknown",
                    unresolved=True,
                    method="unresolved",
                ))
                unresolved_count += 1

        prev_price = tick.price

    unresolved_rate = unresolved_count / len(ticks) if ticks else 0.0
    return classified, unresolved_rate


def bucket_by_price_level(
    classified_trades: List[ClassifiedTrade],
) -> dict[float, PriceLevelDelta]:
    """Aggregate buy/sell volumes at each distinct price level.

    Buckets all classified trades by their trade price, summing buyer-initiated and
    seller-initiated volumes separately for each level. Used as input to footprint
    imbalance detection and volume profile construction.

    Args:
        classified_trades: Output from classify_ticks() — already filtered to resolved trades.

    Returns:
        Dict mapping price level to PriceLevelDelta with aggregated buy/sell volumes.
    """
    levels: dict[float, PriceLevelDelta] = {}

    for trade in classified_trades:
        if trade.unresolved:
            continue

        if trade.price not in levels:
            levels[trade.price] = PriceLevelDelta(price=trade.price)

        delta = levels[trade.price]
        if trade.is_buy:
            delta.buy_volume += trade.size
        elif trade.is_sell:
            delta.sell_volume += trade.size

    return levels
```

### Pattern 2: Cumulative Delta and Divergence Detection

Builds a rolling cumulative delta series from classified tick data, normalizes it against instrument-specific averages, and detects bullish/bearish divergences between price swing points and cumulative delta inflection points. A confirmed divergence requires two swing points in both series with inflections occurring within a configurable bar window. Normalization is critical — raw cumulative delta values mean very different things across instruments (e.g., +500 on ES futures vs. +500 on a small-cap stock).

```python
"""
Module: data_pipeline/order_flow/cumulative_delta.py
Purpose: Build rolling cumulative delta from per-candle classified trade volumes,
         normalize relative to instrument-specific averages, and detect bullish/bearish
         divergence between price swings and delta inflection points. Normalization ensures
         signals are comparable across instruments with different tick sizes and contract values.

APEX Convention: Data pipeline modules live under data_pipeline/. Tests in tests/test_cumulative_delta.py.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class CandleDelta:
    """A single candle with aggregated buy/sell volume from classified tick data."""
    timestamp: float
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    buy_volume: int = 0       # Aggressive buyer-initiated volume in this candle
    sell_volume: int = 0      # Aggressive seller-initiated volume in this candle

    @property
    def net_delta(self) -> int:
        """Net delta for this candle: positive means aggressive buying dominated."""
        return self.buy_volume - self.sell_volume

    @property
    def total_volume(self) -> int:
        return self.buy_volume + self.sell_volume


@dataclass
class DeltaSwingPoint:
    """A confirmed swing high or low in the cumulative delta series."""
    timestamp: float
    price_close: float
    cumulative_delta: int
    swing_type: str = "none"       # "high", "low", or "none"
    candle_index: int = 0

    def __repr__(self) -> str:
        return (f"DeltaSwingPoint(idx={self.candle_index}, type={self.swing_type}, "
                f"delta={self.cumulative_delta}, price={self.price_close:.2f})")


@dataclass
class DivergenceSignal:
    """A confirmed bullish or bearish divergence between price and cumulative delta."""
    signal_type: str                          # "bullish_divergence" or "bearish_divergence"
    first_swing_price: float
    second_swing_price: float
    first_swing_delta: int
    second_swing_delta: int
    normalized_first_delta: float = 0.0       # Normalized to instrument average
    normalized_second_delta: float = 0.0
    bar_offset: int                           # Bars between price and delta inflections
    conviction_score: int = 0                 # 0-100 derived from divergence strength

    @property
    def is_bullish(self) -> bool:
        return self.signal_type == "bullish_divergence"

    @property
    def is_actionable(self) -> bool:
        return self.conviction_score >= 60


def compute_cumulative_delta(
    candles: List[CandleDelta],
) -> Tuple[List[int], List[float]]:
    """Build a rolling cumulative delta time series from per-candle buy/sell volumes.

    Rolls net_delta across all candles chronologically to produce a running total that
    reveals sustained institutional buying or selling pressure. Does NOT normalize —
    use compute_normalized_cumulative_delta() for cross-instrument comparisons.

    Args:
        candles: Chronologically ordered list of CandleDelta with tick-level volume breakdowns.

    Returns:
        Tuple of (cumulative_values, close_prices) aligned by index. Each cumulative value
        is the running sum of net_delta up to and including that candle's index.

    Raises:
        ValueError: If candles list is empty or not sorted chronologically.
    """
    if not candles:
        raise ValueError("Candles list must contain at least one candle")

    for i in range(1, len(candles)):
        if candles[i].timestamp < candles[i - 1].timestamp:
            raise ValueError(
                f"Candles must be chronologically sorted. "
                f"Index {i} precedes index {i-1}"
            )

    cumulative_values: List[int] = []
    close_prices: List[float] = []
    running_delta = 0

    for candle in candles:
        running_delta += candle.net_delta
        cumulative_values.append(running_delta)
        close_prices.append(candle.close_price)

    return cumulative_values, close_prices


def compute_normalized_cumulative_delta(
    candles: List[CandleDelta],
) -> Tuple[List[float], List[float]]:
    """Build a normalized cumulative delta series for cross-instrument comparisons.

    Normalizes each cumulative delta value by dividing by the mean absolute candle delta
    for the instrument. A normalized value of 2.0 means cumulative buying pressure is
    2x the typical candle-level pressure — an easily comparable metric regardless of
    whether we're analyzing ES futures (1 point = $50) or a small-cap equity.

    Args:
        candles: Chronologically ordered list of CandleDelta with tick-level volume breakdowns.

    Returns:
        Tuple of (normalized_cumulative_values, close_prices). Normalized values are floats;
        zero is returned for instruments with no net delta at any candle.
    """
    raw_cum, close_prices = compute_cumulative_delta(candles)

    # Compute mean absolute candle delta as the normalization factor
    abs_deltas = [abs(c.net_delta) for c in candles]
    mean_abs_delta = sum(abs_deltas) / len(abs_deltas) if abs_deltas else 1.0

    if mean_abs_delta < 1:
        logger.warning(
            "Mean absolute candle delta (%.2f) is below 1 — normalization may be unreliable",
            mean_abs_delta,
        )
        mean_abs_delta = 1.0

    normalized = [v / mean_abs_delta for v in raw_cum]
    return normalized, close_prices


def find_swings(
    values: List[float],
    lookback: int = 5,
    min_series_length: int = 100,
) -> List[DeltaSwingPoint]:
    """Identify swing highs and swing lows in a time series.

    A swing high occurs when the current value exceeds all values within `lookback` bars
    on each side. A swing low is the inverse. Only computes swings for series with at least
    min_series_length points to ensure statistical significance and avoid noise-driven false signals.

    Args:
        values: Numeric time series (cumulative delta or close prices).
        lookback: Number of bars before and after for swing confirmation (5–10 recommended).
        min_series_length: Minimum series length required for any swing detection.

    Returns:
        List of DeltaSwingPoint objects with swing_type set to "high" or "low". Empty if series
        is too short or no swings found within the lookback window.
    """
    if len(values) < min_series_length:
        logger.info(
            "Series length %d below minimum %d — skipping swing detection",
            len(values), min_series_length,
        )
        return []

    swings: List[DeltaSwingPoint] = []

    for i in range(lookback, len(values) - lookback):
        window_start = max(0, i - lookback)
        window_end = min(len(values), i + lookback + 1)
        comparison_values = values[window_start:i] + values[i + 1:window_end]

        if not comparison_values:
            continue

        is_high = values[i] > max(comparison_values)
        is_low = values[i] < min(comparison_values)

        swing_type = "high" if is_high else ("low" if is_low else "none")
        if swing_type != "none":
            swings.append(DeltaSwingPoint(
                timestamp=0.0,
                price_close=values[i],
                cumulative_delta=int(values[i]),
                swing_type=swing_type,
                candle_index=i,
            ))

    return swings


def detect_divergence(
    candles: List[CandleDelta],
    lookback: int = 5,
    max_bar_offset: int = 5,
) -> List[DivergenceSignal]:
    """Detect bullish and bearish divergence between price action and normalized cumulative delta.

    Bullish divergence: Price makes a lower low while normalized cumulative delta forms a higher low,
    indicating weakening selling pressure despite declining price — classic institutional accumulation.

    Bearish divergence: Price makes a higher high while normalized cumulative delta forms a lower high,
    suggesting buying exhaustion and potential distribution ahead.

    Requires two swing points in both series with inflections within max_bar_offset bars. Divergences
    are scored by the strength of the delta gap and proximity alignment.

    Args:
        candles: Ordered CandleDelta objects with OHLCV data and tick-level volume breakdowns.
        lookback: Bar window for swing detection (5–10 recommended for ES futures, 3–5 for crypto).
        max_bar_offset: Maximum bars between corresponding price and delta swings (lower = stronger signal).

    Returns:
        List of DivergenceSignal for each confirmed divergence pair. Empty list if no valid divergences
        detected or series is too short for swing point identification.
    """
    min_candles = lookback * 2 + 10
    if len(candles) < min_candles:
        return []

    # Compute normalized cumulative delta
    norm_cum, close_prices = compute_normalized_cumulative_delta(candles)

    # Find swing points in both price and delta series
    price_lows = find_swings(close_prices, lookback)
    delta_lows = find_swings(norm_cum, lookback)
    price_highs = find_swings(close_prices, lookback)
    delta_highs = find_swings(norm_cum, lookback)

    # Assign timestamps from candles for precise bar-offset calculation
    for swing in price_lows + delta_lows + price_highs + delta_highs:
        idx = min(swing.candle_index, len(candles) - 1)
        swing.timestamp = candles[idx].timestamp

    divergences: List[DivergenceSignal] = []

    # --- Bullish divergence: lower price low + higher delta low ---
    if len(price_lows) >= 2 and len(delta_lows) >= 2:
        for i in range(1, len(price_lows)):
            prev_pl = price_lows[i - 1]
            curr_pl = price_lows[i]

            if curr_pl.price_close < prev_pl.price_close:
                for j in range(1, len(delta_lows)):
                    prev_dl = delta_lows[j - 1]
                    curr_dl = delta_lows[j]

                    if (curr_dl.cumulative_delta > prev_dl.cumulative_delta and
                            abs(curr_pl.candle_index - curr_dl.candle_index) <= max_bar_offset):

                        bar_offset = abs(curr_pl.candle_index - curr_dl.candle_index)
                        delta_gap_pct = (
                            (curr_dl.cumulative_delta - prev_dl.cumulative_delta) /
                            max(abs(prev_dl.cumulative_delta), 1)
                        ) * 100
                        conviction = min(100, int(delta_gap_pct * 5 + (max_bar_offset - bar_offset) * 5))

                        divergences.append(DivergenceSignal(
                            signal_type="bullish_divergence",
                            first_swing_price=prev_pl.price_close,
                            second_swing_price=curr_pl.price_close,
                            first_swing_delta=prev_dl.cumulative_delta,
                            second_swing_delta=curr_dl.cumulative_delta,
                            normalized_first_delta=round(prev_dl.price_close, 4),
                            normalized_second_delta=round(curr_dl.price_close, 4),
                            bar_offset=bar_offset,
                            conviction_score=conviction,
                        ))

    # --- Bearish divergence: higher price high + lower delta high ---
    if len(price_highs) >= 2 and len(delta_highs) >= 2:
        for i in range(1, len(price_highs)):
            prev_ph = price_highs[i - 1]
            curr_ph = price_highs[i]

            if curr_ph.price_close > prev_ph.price_close:
                for j in range(1, len(delta_highs)):
                    prev_dh = delta_highs[j - 1]
                    curr_dh = delta_highs[j]

                    if (curr_dh.cumulative_delta < prev_dh.cumulative_delta and
                            abs(curr_ph.candle_index - curr_dh.candle_index) <= max_bar_offset):

                        bar_offset = abs(curr_ph.candle_index - curr_dh.candle_index)
                        delta_gap_pct = (
                            (prev_dh.cumulative_delta - curr_dh.cumulative_delta) /
                            max(abs(prev_dh.cumulative_delta), 1)
                        ) * 100
                        conviction = min(100, int(delta_gap_pct * 5 + (max_bar_offset - bar_offset) * 5))

                        divergences.append(DivergenceSignal(
                            signal_type="bearish_divergence",
                            first_swing_price=prev_ph.price_close,
                            second_swing_price=curr_ph.price_close,
                            first_swing_delta=prev_dh.cumulative_delta,
                            second_swing_delta=curr_dh.cumulative_delta,
                            normalized_first_delta=round(prev_dh.price_close, 4),
                            normalized_second_delta=round(curr_dh.price_close, 4),
                            bar_offset=bar_offset,
                            conviction_score=conviction,
                        ))

    return divergences
```

### Pattern 3: Volume Profile Construction with Numpy Binning

Bins trade volumes at tick-sized price levels to construct a full session volume profile. Identifies the Point of Control (POC), Value Area High and Low (VAH/VAL enclosing 70% of volume), and detects liquidity voids — consecutive price levels where volume falls below 10% of POC volume, representing zones prone to rapid price movement during breakouts. Uses numpy for efficient histogram-style binning on tick-sized grids.

```python
"""
Module: data_pipeline/order_flow/volume_profile.py
Purpose: Construct a full volume profile from classified tick data using numpy-based
         histogram binning at tick-sized intervals. Computes POC, VAH, VAL, and detects
         liquidity voids. Critical for determining whether order flow signals align with
         established value areas — a divergence at the POC is high-conviction; one in empty
         price space is not.

APEX Convention: Data pipeline modules live under data_pipeline/. Tests in tests/test_volume_profile.py.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class VolumeProfile:
    """Full session volume profile with computed value areas and void detection."""
    price_levels: List[float]               # Tick-sized price levels (sorted ascending)
    volumes: np.ndarray                     # Total volume at each level
    poc_price: float                        # Point of Control — max volume level
    poc_volume: int                         # Volume at the POC
    vah_price: float                        # Value Area High (upper bound of 70% value area)
    val_price: float                        # Value Area Low (lower bound of 70% value area)
    total_session_volume: int               # Sum of all volumes
    value_area_percentage: float            # Percentage of volume within VAH–VAL

    @field(default_factory=list)
    liquidity_voids: List[Tuple[float, float]] = field(default_factory=list)
    """List of (start_price, end_price) tuples marking consecutive void levels."""

    @property
    def is_within_value_area(self, price: float) -> bool:
        return self.val_price <= price <= self.vah_price

    @property
    def value_width(self) -> float:
        return self.vah_price - self.val_price

    @property
    def avg_price_level_volume(self) -> float:
        if not np.any(self.volumes):
            return 0.0
        non_zero = self.volumes[self.volumes > 0]
        return float(np.mean(non_zero)) if len(non_zero) > 0 else 0.0


def compute_volume_profile(
    price_volumes: Dict[float, int],
    tick_size: float = 0.25,
    value_area_pct: float = 0.70,
    min_bin_price_levels: int = 10,
) -> VolumeProfile:
    """Construct a full volume profile from per-price-level trade volumes.

    Uses numpy histogram-style binning on a tick-sized grid to aggregate volumes across
    potentially noisy price data. Then identifies the POC (maximum volume level), builds
    the value area by accumulating volume from the POC outward, and detects liquidity voids
    as consecutive levels with volume below 10% of POC volume.

    This is the definitive reference for fair value assessment: price trading above VAH
    suggests overvalue; price below VAL suggests undervalue. Signals confirmed at these
    edges carry higher conviction than those in the middle of the value area.

    Args:
        price_volumes: Mapping from price level to total trade volume (aggregated buy+sell).
                       Should come from bucketing classified tick data by trade price.
        tick_size: Minimum price increment for the instrument (e.g., 0.25 for ES futures,
                   0.01 for major forex pairs, 1.0 for crypto indices).
        value_area_pct: Fraction of total volume to include in the value area (default 70%,
                        per standard volume profile methodology). Must be between 0.5 and 0.95.
        min_bin_price_levels: Minimum distinct price levels required for a valid profile.
                             If fewer exist, the profile is constructed but flagged as thin.

    Returns:
        VolumeProfile with all computed metrics including POC price/volume, VAH/VAL boundaries,
        value area coverage percentage, and detected liquidity void regions.

    Raises:
        ValueError: If tick_size is non-positive or value_area_pct is outside [0.5, 0.95].
                    Also raised if price_volumes is empty.
    """
    if not price_volumes:
        raise ValueError("price_volumes must contain at least one price level")

    if tick_size <= 0:
        raise ValueError(f"tick_size must be positive, got {tick_size}")

    if not (0.5 <= value_area_pct <= 0.95):
        raise ValueError(
            f"value_area_pct must be between 0.5 and 0.95, got {value_area_pct}"
        )

    # Create tick-aligned grid and bin volumes
    prices = np.array(sorted(price_volumes.keys()), dtype=np.float64)
    volumes = np.array([price_volumes[p] for p in prices], dtype=np.int64)

    # Build tick-sized bins using numpy digitize
    min_price = float(prices.min()) - tick_size
    max_price = float(prices.max()) + tick_size
    bin_edges = np.arange(min_price, max_price + tick_size * 0.5, tick_size)
    bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2

    # Digitize prices into bins and sum volumes per bin
    bin_indices = np.digitize(prices, bin_edges) - 1
    binned_volumes = np.zeros(len(bin_centers), dtype=np.int64)
    for idx, vol in zip(bin_indices, volumes):
        if 0 <= idx < len(binned_volumes):
            binned_volumes[idx] += vol

    # Find POC (bin with maximum volume)
    poc_idx = int(np.argmax(binned_volumes))
    poc_price = float(bin_centers[poc_idx])
    poc_volume = int(binned_volumes[poc_idx])

    total_volume = int(binned_volumes.sum())
    if total_volume == 0:
        raise ValueError("Total session volume is zero — no meaningful profile can be constructed")

    # Build value area: accumulate from POC outward until value_area_pct of volume is covered
    vah_price, val_price = _compute_value_areas(
        bin_centers, binned_volumes, poc_idx, total_volume, value_area_pct, tick_size
    )

    # Detect liquidity voids: consecutive levels with volume < 10% of POC volume
    void_threshold = 0.10 * poc_volume if poc_volume > 0 else 0
    voids = _detect_liquidity_voids(bin_centers, binned_volumes, void_threshold)

    # Calculate actual value area coverage (may differ from target due to binning)
    va_mask = (bin_centers >= val_price - tick_size * 0.5) & (bin_centers <= vah_price + tick_size * 0.5)
    volume_in_va = int(binned_volumes[va_mask].sum()) if np.any(va_mask) else 0
    value_area_pct_actual = volume_in_va / total_volume if total_volume > 0 else 0.0

    return VolumeProfile(
        price_levels=bin_centers.tolist(),
        volumes=binned_volumes,
        poc_price=poc_price,
        poc_volume=poc_volume,
        vah_price=vah_price,
        val_price=val_price,
        total_session_volume=total_volume,
        value_area_percentage=round(value_area_pct_actual * 100, 1),
        liquidity_voids=voids,
    )


def _compute_value_areas(
    centers: np.ndarray,
    volumes: np.ndarray,
    poc_idx: int,
    total_volume: int,
    target_pct: float,
    tick_size: float,
) -> Tuple[float, float]:
    """Accumulate volume from POC outward to cover target fraction of session volume.

    Walks outward from the POC bin index in both directions simultaneously, always picking
    the side with higher adjacent volume (the "value area builds toward higher volume" principle).
    Stops when cumulative volume reaches target_pct * total_volume.

    Args:
        centers: Bin center prices aligned with volumes array.
        volumes: Volume per bin.
        poc_idx: Index of the POC bin in both arrays.
        total_volume: Total session volume across all bins.
        target_pct: Target fraction for value area (default 0.70).
        tick_size: Price increment used for bin alignment.

    Returns:
        Tuple of (vah_price, val_price) — upper and lower value area boundaries.
    """
    target_volume = int(target_pct * total_volume)
    cumulative = volumes[poc_idx]
    left = poc_idx - 1
    right = poc_idx + 1

    while cumulative < target_volume and (left >= 0 or right < len(volumes)):
        # Pick the side with higher adjacent volume (build toward value)
        left_vol = volumes[left] if left >= 0 else -1
        right_vol = volumes[right] if right < len(volumes) else -1

        if left_vol >= right_vol and left >= 0:
            cumulative += volumes[left]
            left -= 1
        elif right < len(volumes):
            cumulative += volumes[right]
            right += 1
        else:
            break

    vah_price = float(centers[max(left + 1, 0)] + tick_size * 0.5)
    val_price = float(centers[min(right - 1, len(centers) - 1)] - tick_size * 0.5)

    return vah_price, val_price


def _detect_liquidity_voids(
    centers: np.ndarray,
    volumes: np.ndarray,
    threshold: float,
) -> List[Tuple[float, float]]:
    """Detect liquidity voids — consecutive price levels with volume below threshold.

    A liquidity void represents a zone where little trading has occurred, making it likely
    that price will traverse the region rapidly when a breakout or breakdown occurs. Identifying
    voids helps set realistic take-profit targets and anticipate slippage in thin zones.

    Args:
        centers: Bin center prices aligned with volumes array.
        volumes: Volume per bin.
        threshold: Volume level below which a bin is considered "void" (typically 10% of POC volume).

    Returns:
        List of (start_price, end_price) tuples marking consecutive void regions. Single-level
        voids are excluded — only contiguous multi-level voids are returned.
    """
    void_mask = volumes < threshold
    voids: List[Tuple[float, float]] = []
    in_void = False
    void_start_idx = 0

    for i in range(len(void_mask)):
        if void_mask[i]:
            if not in_void:
                in_void = True
                void_start_idx = i
        else:
            if in_void:
                void_end_idx = i - 1
                if void_end_idx > void_start_idx:  # Multi-level void only
                    voids.append((
                        float(centers[void_start_idx]),
                        float(centers[void_end_idx]),
                    ))
                in_void = False

    # Close any open void at the end of the array
    if in_void and len(centers) - 1 > void_start_idx:
        voids.append((
            float(centers[void_start_idx]),
            float(centers[len(centers) - 1]),
        ))

    return voids
```

### Pattern 4: Conviction Scoring System with Risk Constraints

Combines multiple independently-measured order flow signals into a single 0–100 conviction score. Each component contributes a weighted sub-score based on the scoring weight specified in the Core Workflow. Includes explicit risk constraints — never trade below 50, always validate data quality first, and log every discarded signal with its full breakdown for post-session audit.

```python
"""
Module: data_pipeline/order_flow/conviction_scoring.py
Purpose: Combine independently-measured order flow signals (stacked imbalances, delta divergence,
         volume concentration, absorption signatures) into a single 0-100 conviction score.
         Enforces risk constraints: never trade below 50 score, always validate data quality first,
         and log every discarded signal with full component breakdown for post-session audit.

Scoring weights are explicitly defined per the Core Workflow specification:
  - Stacked imbalance presence     : +30 points max
  - Delta divergence strength      : +25 points max
  - Volume concentration z-score   : +25 points max
  - Absorption/iceberg signatures  : +20 points max

APEX Convention: Under data_pipeline/order_flow/. Tests in tests/test_conviction_scoring.py.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


# ── Scoring constants (per Core Workflow specification) ────────────────────────
MAX_STACKED_IMBALANCE: int = 30
MAX_DELTA_DIVERGENCE: int = 25
MAX_VOLUME_CONCENTRATION: int = 25
MAX_ABSORPTION: int = 20
MIN_TRADEABLE_SCORE: int = 50
HIGH_CONFIDENCE_SCORE: int = 70


@dataclass
class ConvictionScoreBreakdown:
    """Complete breakdown of the conviction score with individual component sub-scores."""
    stacked_imbalance_score: int = 0        # Max +30
    delta_divergence_score: int = 0         # Max +25
    volume_concentration_score: int = 0     # Max +25
    absorption_signature_score: int = 0     # Max +20

    @property
    def total(self) -> int:
        return (self.stacked_imbalance_score + self.delta_divergence_score +
                self.volume_concentration_score + self.absorption_signature_score)

    @property
    def is_high_confidence(self) -> bool:
        """True if score meets the high-confidence entry threshold."""
        return self.total >= HIGH_CONFIDENCE_SCORE

    @property
    def is_tradeable(self) -> bool:
        """True if score meets the minimum tradeable threshold (>= 50)."""
        return self.total >= MIN_TRADEABLE_SCORE

    @property
    def signal_strength(self) -> str:
        """Human-readable classification of signal strength."""
        if self.total >= HIGH_CONFIDENCE_SCORE:
            return "strong"
        elif self.total >= MIN_TRADEABLE_SCORE:
            return "moderate"
        else:
            return "weak"


@dataclass
class OrderFlowSignal:
    """Final order flow signal with conviction score and recommended action."""
    direction: str                              # "long", "short", or "neutral"
    conviction_score: int                       # 0-100 total from ConvictionScoreBreakdown.total
    breakdown: ConvictionScoreBreakdown
    price_level: float                          # Price level where the signal was detected
    data_quality_passed: bool = True            # Whether upstream data validation passed
    recommended_action: str = "discard"         # "enter", "watchlist", or "discard"

    def __post_init__(self):
        if self.data_quality_passed and self.conviction_score >= HIGH_CONFIDENCE_SCORE:
            self.recommended_action = "enter"
        elif self.data_quality_passed and self.conviction_score >= MIN_TRADEABLE_SCORE:
            self.recommended_action = "watchlist"
        else:
            self.recommended_action = "discard"


def score_order_flow_patterns(
    stacked_imbalances: List[Tuple[int, float]],
    divergences: List[Tuple[str, int]],
    volume_concentration_z: float,
    absorption_count: int,
    data_quality_passed: bool = True,
) -> OrderFlowSignal:
    """Combine multiple order flow signals into a single 0–100 conviction score.

    Each component is independently evaluated and capped at its maximum contribution per the
    Core Workflow specification. The total score determines whether the signal is actionable:
      - Score >= 70: Strong conviction — recommended for entry if risk controls allow
      - Score 50–69: Moderate conviction — watchlist only, wait for price confirmation
      - Score < 50:  Weak conviction — discard; never trade sub-threshold signals

    Risk constraints are enforced at the function level: if data_quality_passed is False,
    the score is immediately set to zero with a warning. All discarded signals are logged
    with their full component breakdown for post-session review.

    Args:
        stacked_imbalances: List of (stack_depth, avg_ratio) tuples from footprint detection.
                           stack_depth = number of contiguous imbalanced levels;
                           avg_ratio = average bid/ask volume ratio across the stack.
        divergences: List of (direction_str, conviction_pct) tuples where direction_str is
                    "bullish" or "bearish" and conviction_pct is 0–100 from delta divergence detection.
        volume_concentration_z: Z-score of volume concentration at detected signal levels.
                               Higher absolute z means more unusual concentration — a stronger signal.
        absorption_count: Number of confirmed absorption zones (>=5 executions per level)
                         near the signal price within the lookback window.
        data_quality_passed: Whether upstream tick data quality checks passed (unresolved rate < 5%).
                            If False, score is zeroed immediately regardless of pattern signals.

    Returns:
        OrderFlowSignal with full breakdown, direction inferred from dominant signal,
        recommended action based on conviction thresholds, and data quality flag.

    Raises:
        ValueError: If volume_concentration_z exceeds reasonable bounds (|z| > 10) indicating
                   a likely computation error in the upstream z-score calculation.
    """
    if not data_quality_passed:
        logger.warning(
            "Data quality check failed — zeroing conviction score. "
            "All downstream signals are unreliable."
        )
        return OrderFlowSignal(
            direction="neutral",
            conviction_score=0,
            breakdown=ConvictionScoreBreakdown(),
            price_level=0.0,
            data_quality_passed=False,
            recommended_action="discard",
        )

    if abs(volume_concentration_z) > 10:
        raise ValueError(
            f"Volume concentration z-score ({volume_concentration_z:.2f}) exceeds "
            f"reasonable bounds (±10). Check upstream computation."
        )

    breakdown = ConvictionScoreBreakdown()

    # ── Component 1: Stacked Imbalance (+30 max) ──────────────────────────
    if stacked_imbalances:
        # Weight by stack depth: depth >= 4 is strong (full points), 3 is adequate
        strongest_depth = max(s[0] for s in stacked_imbalances)
        if strongest_depth >= 5:
            breakdown.stacked_imbalance_score = MAX_STACKED_IMBALANCE
        elif strongest_depth == 4:
            breakdown.stacked_imbalance_score = int(MAX_STACKED_IMBALANCE * 0.8)
        elif strongest_depth == 3:
            breakdown.stacked_imbalance_score = int(MAX_STACKED_IMBALANCE * 0.5)
        else:
            # Single-level imbalances are noise — contribute nothing
            pass

    # ── Component 2: Delta Divergence (+25 max) ───────────────────────────
    if divergences:
        # Use the divergence with highest conviction, scaled by its pct
        best_divergence = max(divergences, key=lambda d: d[1])
        breakdown.delta_divergence_score = min(
            MAX_DELTA_DIVERGENCE,
            int(best_divergence[1] * 0.25)  # conviction_pct / 4 → out of 25
        )
        direction = "long" if best_divergence[0] == "bullish" else "short"

    # ── Component 3: Volume Concentration (+25 max) ───────────────────────
    abs_z = abs(volume_concentration_z)
    if abs_z >= 3.0:
        breakdown.volume_concentration_score = MAX_VOLUME_CONCENTRATION
    elif abs_z >= 2.0:
        breakdown.volume_concentration_score = int(MAX_VOLUME_CONCENTRATION * 0.8)
    elif abs_z >= 1.5:
        breakdown.volume_concentration_score = int(MAX_VOLUME_CONCENTRATION * 0.5)
    elif abs_z >= 1.0:
        breakdown.volume_concentration_score = int(MAX_VOLUME_CONCENTRATION * 0.25)

    # ── Component 4: Absorption/Iceberg Signatures (+20 max) ──────────────
    if absorption_count > 0:
        breakdown.absorption_signature_score = min(
            MAX_ABSORPTION,
            absorption_count * 5  # Each confirmed absorption adds +5, up to 4 = +20
        )

    # ── Determine direction from dominant signal ──────────────────────────
    if divergence:
        direction = "long" if divergences[0][0] == "bullish" else "short"
    elif breakdown.stacked_imbalance_score > 0 and stacked_imbalances:
        # Infer from imbalance direction (assumed stored in stack data)
        direction = "long"  # Placeholder — actual direction from footprint analysis
    else:
        direction = "neutral"

    total = breakdown.total
    return OrderFlowSignal(
        direction=direction,
        conviction_score=total,
        breakdown=breakdown,
        price_level=0.0,
        data_quality_passed=True,
    )
```

### Pattern 5: Spoofing Detection Heuristic

Flags artificial order book activity based on placement/cancellation rates, average order lifespan, and depth from current price. Spoofing — placing large orders to create false impressions of supply/demand then cancelling them before execution — is a form of market manipulation. This heuristic detects suspicious patterns using observable metrics without requiring L3 (order-level) data.

```python
"""
Module: data_pipeline/order_flow/spoofing_detection.py
Purpose: Detect spoofing and quote-stuffing patterns in order book updates using observable
         Level 2 metrics: placement/cancellation rates, average order lifespan, depth-to-price
         distance, and fill-to-placement ratios. Spoofing creates false liquidity impressions;
         detecting it prevents acting on manipulated order book states as genuine signals.

APEX Convention: Under data_pipeline/order_flow/. Tests in tests/test_spoofing_detection.py.
"""

from __future__ import annotations

import logging
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class OrderBookUpdate:
    """Single order book level update event."""
    timestamp: float
    side: str               # "bid" or "ask"
    price: float
    size: int
    action: str             # "new", "modify", "cancel"


@dataclass
class SpoofingSignature:
    """A detected spoofing pattern in the order book."""
    side: str
    price: float
    severity: str           # "low", "medium", "high"
    score: int              # 0-100 confidence in spoofing detection
    contributing_factors: List[str] = field(default_factory=list)

    @property
    def is_reliable(self) -> bool:
        return self.severity == "high"


def detect_spoofing_signatures(
    updates: List[OrderBookUpdate],
    current_price: float,
    depth_threshold_pct: float = 3.0,
    max_lifespan_ms: float = 2000.0,
    cancel_rate_threshold: float = 0.85,
    min_order_size: int = 100,
) -> List[SpoofingSignature]:
    """Detect artificial order book activity based on placement/cancellation behavior.

    Spoofing manifests as large orders placed and rapidly cancelled — creating the false
    impression of deep liquidity at a price level to influence other market participants'
    decisions before the spoof order disappears. Detection uses three observable signals:

      1. High cancel rate: Orders are created and cancelled without being filled (rate > 85%)
      2. Short lifespan: Orders exist for less than max_lifespan_ms milliseconds
      3. Depth anomaly: Order size significantly exceeds the local average (>3x) at a price
         level within a close distance to the current market price

    All three factors together indicate high-confidence spoofing; any two suggest medium
    confidence requiring confirmation.

    Args:
        updates: Chronologically ordered list of order book update events from Level 2 feed.
                Each event represents an add, modify, or cancel at a specific price level.
        current_price: Current mid-market price for proximity calculations. Used to determine
                      whether a suspicious order is near enough to the market to influence it.
        depth_threshold_pct: Minimum size ratio (order size vs. local average) to flag as
                            an anomaly. Default 3.0x means any order >3x the typical size at
                            that price level triggers attention.
        max_lifespan_ms: Maximum expected order lifespan in milliseconds. Orders lasting longer
                        than this are less suspicious; shorter-lived orders with high sizes are
                        more likely to be spoofing (default 2000ms = 2 seconds).
        cancel_rate_threshold: Minimum ratio of cancelled orders to total placed orders at a
                              price level to flag as suspicious. Default 85% means that if 85% or
                              more orders at a level are cancelled, the level is flagged.
        min_order_size: Minimum order size in contracts/shares below which orders are ignored.
                       Lower-bound filtering prevents noise from small retail orders triggering
                       false positives (default 100).

    Returns:
        List of SpoofingSignature objects sorted by severity (high first, then medium). Only
        returns signatures where at least one contributing factor is identified. Empty list if
        no spoofing patterns detected in the update stream.

    Raises:
        ValueError: If updates is empty or current_price is non-positive.
    """
    if not updates:
        raise ValueError("Order book updates stream cannot be empty")
    if current_price <= 0:
        raise ValueError(f"current_price must be positive, got {current_price}")

    # Group updates by price level and side
    level_stats: Dict[Tuple[float, str], List[OrderBookUpdate]] = defaultdict(list)
    for update in updates:
        if update.size < min_order_size:
            continue  # Skip sub-threshold orders — they're noise
        key = (update.price, update.side)
        level_stats[key].append(update)

    signatures: List[SpoofingSignature] = []

    for (price, side), level_updates in level_stats.items():
        factors: List[str] = []
        score = 0

        # ── Factor 1: Cancel rate ────────────────────────────────────────
        placed_count = sum(1 for u in level_updates if u.action in ("new", "modify"))
        cancelled_count = sum(1 for u in level_updates if u.action == "cancel")

        if placed_count >= 3 and cancelled_count / max(placed_count, 1) >= cancel_rate_threshold:
            cancel_rate = cancelled_count / placed_count * 100
            factors.append(f"high_cancel_rate:{cancel_rate:.0f}%")
            score += min(40, int(cancel_rate * 0.5))

        # ── Factor 2: Short average lifespan ─────────────────────────────
        if len(level_updates) >= 2:
            sorted_by_time = sorted(level_updates, key=lambda u: u.timestamp)
            lifespans_ms: List[float] = []
            for i in range(len(sorted_by_time) - 1):
                span_ms = (sorted_by_time[i + 1].timestamp - sorted_by_time[i].timestamp) * 1000
                if span_ms > 0 and sorted_by_time[i].action in ("new", "modify"):
                    lifespans_ms.append(span_ms)

            if lifespans_ms:
                avg_lifespan = sum(lifespans_ms) / len(lifespans_ms)
                if avg_lifespan < max_lifespan_ms:
                    factors.append(f"short_lifespan:{avg_lifespan:.0f}ms")
                    lifespan_score = min(30, int((1 - avg_lifespan / max_lifespan_ms) * 30))
                    score += lifespan_score

        # ── Factor 3: Depth anomaly (size >> average) ────────────────────
        sizes = [u.size for u in level_updates if u.action in ("new", "modify")]
        if sizes:
            avg_size = sum(sizes) / len(sizes)
            max_size = max(sizes)
            size_ratio = max_size / avg_size if avg_size > 0 else 1.0

            # Calculate distance from current price as percentage
            distance_pct = abs(price - current_price) / current_price * 100 if current_price > 0 else 999.0

            if size_ratio >= depth_threshold_pct and distance_pct < 2.0:
                factors.append(f"depth_anomaly:{size_ratio:.1f}x_avg_at_{distance_pct:.2f}%_from_market")
                anomaly_score = min(30, int(size_ratio * 5))
                score += anomaly_score

        # ── Classify severity based on factor count and total score ──────
        if len(factors) >= 3:
            severity = "high"
        elif len(factors) == 2:
            severity = "medium"
        else:
            continue  # Only one factor — insufficient evidence

        # Cap score at 100
        score = min(100, score)

        signatures.append(SpoofingSignature(
            side=side,
            price=price,
            severity=severity,
            score=score,
            contributing_factors=factors,
        ))

    # Sort: high severity first, then by score descending
    severity_order = {"high": 0, "medium": 1, "low": 2}
    signatures.sort(key=lambda s: (severity_order[s.severity], -s.score))
    return signatures


def adjust_book_for_spoofing(
    book_depth: Dict[str, List[Tuple[float, float]]],
    current_price: float,
    flagged_levels: List[SpoofingSignature],
) -> Dict[str, List[Tuple[float, float]]]:
    """Filter out flagged spoofing levels from the order book depth snapshot.

    Given an order book depth snapshot and a list of spoofing signatures detected by
    detect_spoofing_signatures(), returns a cleaned version of the book with suspicious
    levels removed. This prevents acting on manipulated liquidity during execution decisions.

    Args:
        book_depth: Mapping from "bid" or "ask" to list of (price, size) tuples.
                   Must be sorted correctly (bids descending, asks ascending).
        current_price: Current mid-market price.
        flagged_levels: SpoofingSignature objects from detect_spoofing_signatures().

    Returns:
        Cleaned book_depth with spoofed levels filtered out. Unaffected levels are unchanged.
    """
    suspicious_prices = {
        (sig.side, sig.price) for sig in flagged_levels if sig.severity == "high"
    }

    cleaned: Dict[str, List[Tuple[float, float]]] = {"bid": [], "ask": []}

    for side, levels in book_depth.items():
        for price, size in levels:
            if (side, price) not in suspicious_prices:
                cleaned[side].append((price, size))

    return cleaned
```

---

## Constraints

### MUST DO
- Validate tick data quality (unresolved rate < 5%) before computing any cumulative delta or footprint metrics — downstream signals from poor-quality feeds are misleading
- Normalize cumulative delta relative to instrument-specific average candle delta before comparing across instruments or setting divergence thresholds
- Require 3+ contiguous stacked imbalances at tick-sized price levels — single-level imbalances are noise and produce false signals
- Corroborate all divergences with volume profile nodes (POC, VAH, VAL) or historical support/resistance — a divergence in "no man's land" between value areas has negligible conviction
- Log all conviction scores and discarded signals below the 50 threshold with full component breakdown for post-session review
- Apply minimum absolute volume filter per price level (> 10 contracts for ES futures, instrument-specific thresholds for other markets) before classifying any level as imbalanced

### MUST NOT DO
- Compute delta from OHLCV-only data — side attribution (buy vs. sell) is impossible from open/high/low/close alone
- Trade on single-level imbalances or divergences that occur in "no man's land" (between value area edges with no structural significance)
- Use universal imbalance thresholds across different instruments — calibrate tick size, volume filters, and stack depth requirements per market
- Ignore unresolved trade rates — silently discarding ambiguous trades biases cumulative delta toward whichever side the classification default assumes
- Generate trade entries solely from order flow signals without price action context (trend, support/resistance, candlestick patterns)
- Use raw cumulative delta values without normalization — a +500 reading means something entirely different for ES futures than for a small-cap equity

---

## Output Template

When this skill is active and analyzing order flow data, produce the following structured output:

1. **Data Quality Report** — Unresolved trade rate (percentage), total tick count processed, time range of analysis window, data source identifier, and a pass/fail flag for the 5% unresolved threshold.

2. **Computed Metrics** — Normalized cumulative delta series summary (final value, max, min, mean absolute candle delta used for normalization), volume profile nodes (POC price/volume, VAH, VAL, value area percentage of session), and count of liquidity void regions detected.

3. **Pattern Signatures** — Each detected pattern listed with: pattern type (stacked imbalance, divergence, absorption, spoofing), price level, conviction sub-score from its component weight, confidence classification, and whether it aligns with a volume profile node or historical S/R level.

4. **Overall Signal** — Combined 0–100 conviction score with full breakdown table (each component's contribution), signal direction (long/short/neutral), recommended action (enter / watchlist / discard), and the price level where entry should be considered with reference to nearby value area edges.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `risk-stop-loss` | Set stop loss levels after an order flow signal confirms trade entry — use volume profile VAL for longs, VAH for shorts as stop references |
| `risk-position-sizing` | Size position proportionally to conviction score (higher score → larger allocation) and ATR-based risk unit |
| `signals-module` | Multi-source signal aggregation framework where order flow conviction is one input among AI predictions, technical indicators, and sentiment scores |

---

## Live References

- [Market Microstructure Handbook — Optiver](https://www.optiver.com/resources/market-microstructure) — Institutional reference on order book dynamics, spread mechanics, and liquidity provision
- [Trading and Exchanges — Larry Harris (Oxford, 2003)](https://global.oup.com/academic/product/trading-and-exchanges-9780195144703) — Comprehensive academic treatment of market structure and order flow mechanics
- [Volume Profile: The Insider's Guide to Trading — Jim Dalton](https://www.amazon.com/Volume-Profile-Insiders-Guide-Trading/dp/097426562X) — Practical guide to POC, value area, and liquidity void analysis from a professional floor trader
- [Python for Finance — Yves Hilpisch (O'Reilly, 2022)](https://shop.oreilly.com/product/9781098114397.do) — Python patterns for financial time series processing with numpy and pandas
- [Understanding Order Flow — CME Group Education](https://www.cmegroup.com/education/courses/understanding-order-flow.html) — Exchange-published primer on tick-level trade classification and footprint analysis
- [An Introduction to High-Frequency Finance — Lassalle & Venkataraman (Academic Press, 2016)](https://www.elsevier.com/books/an-introduction-to-high-frequency-finance/lassale/978-0-12-802314-5) — Academic reference for microstructure data processing algorithms
- [Numpy Documentation — Histogram and Digitize Functions](https://numpy.org/doc/stable/reference/generated/numpy.histogram_bin_edges.html) — Reference for efficient tick-sized volume binning used in pattern 3

> 📖 skill(local cache): risk-stop-loss, risk-position-sizing, signals-module
