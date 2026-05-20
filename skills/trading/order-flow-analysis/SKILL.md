---
name: order-flow-analysis
description: Analyzes order flow imbalances, footprint data, and cumulative delta divergence to detect institutional accumulation/distribution zones for high-probability trade entries.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  triggers: order flow, footprint chart, cumulative delta, delta divergence, tape reading, iceberg orders, volume imbalance, liquidity detection
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: trading-risk-stop-loss, trading-vwap-execution, trading-volume-profile
---

# Order Flow Analysis Engine

Analyzes transaction-level market data — footprint charts, cumulative delta, bid-ask imbalances, and hidden order signatures — to confirm or reject price action and identify institutional accumulation or distribution zones. This skill makes the model act as a microstructure analyst who reads between the lines of raw tick data to find where large participants are building positions.

## TL;DR Checklist

- [ ] Align cumulative delta with volume profile nodes (POC, VAH, VAL) before any signal generation
- [ ] Confirm delta divergence at established support/resistance — never trade a lone divergence signal
- [ ] Identify iceberg signatures via repeated bid/ask size clustering at identical prices (minimum 5 occurrences)
- [ ] Filter noise with minimum volume threshold per price level (default: 1% of average candle volume)
- [ ] Cross-reference detected imbalances with order book depth to map liquidity pools and stop-hunt zones

---

## When to Use

Use this skill when:

- Analyzing high-frequency tick or trade data for a liquid market (futures, major equities, top-tier crypto pairs) where footprint charts are meaningful
- Looking for institutional accumulation or distribution zones before price confirms the move — e.g., bullish delta divergence at a volume profile POC
- Validating whether a breakout or breakdown is supported by genuine aggressive order flow or is a liquidity grab / stop hunt
- Building entry timing logic that layers order flow confirmation on top of broader technical setups (volume profile, VWAP, support/resistance)
- Diagnosing why price reversed at a specific level — was it absorption, iceberg selling, or simply a lack of buyer interest?

---

## When NOT to Use

Avoid this skill for:

- Low-liquidity assets (micro-cap stocks, illiquid altcoins) where order flow signals are dominated by noise and manipulation — use technical analysis instead
- Long-term fundamental investing decisions where tick-level microstructure data has no predictive value over weekly or monthly horizons
- Automated market maker (AMM) pools without traditional order books (e.g., Uniswap v2 constant product curves) — the bid-ask delta framework does not apply

---

## Core Workflow

1. **Load and align tick/tick-bar data with volume profile nodes.** Ingest time-and-sales (T&S) feed or exchange WebSocket, then bucket trades into candle periods matching your chart timeframe. Overlay Volume Profile metrics: Point of Control (POC), Value Area High (VAH), Value Area Low (VAL).
   **Checkpoint:** Verify time synchronization between order flow data feed and market data source — timestamps must align within ±50ms. Any gap exceeding 200ms in the trade stream flags the candle for manual review.

2. **Calculate cumulative delta and detect divergence at key levels.** Compute rolling `buy_volume - sell_volume` across candles to build a cumulative delta series. Identify swing points in both price (highs/lows over 5–10 bar lookback) and cumulative delta. Bullish divergence: price makes a lower low while cumulative delta forms a higher low. Bearish divergence: price makes a higher high while cumulative delta forms a lower high.
   **Checkpoint:** Divergence must align with a historical support/resistance level or volume profile node edge (POC, VAH, VAL). A divergence floating in "no man's land" between value areas has low conviction and should be discarded.

3. **Scan for footprint imbalances at each price level.** Within every candle, compute the buyer-initiated vs seller-initiated volume ratio at each distinct price level. Flag levels where buy_volume / sell_volume >= 2.5 (bid imbalance) or sell_volume / buy_volume >= 2.5 (ask imbalance). Require that imbalances persist across at least 3 consecutive candles to be considered valid — transient spikes are noise.
   **Checkpoint:** Confirm the imbalance sits within the value area of the volume profile (between VAH and VAL) or at a known support/resistance level. An imbalance at an arbitrary price with no structural significance is likely a retail-driven wick.

4. **Identify iceberg / hidden order signatures.** Scan for repeated aggressive buying or selling at identical price levels across multiple consecutive candles, where the executed size at that level matches a consistent chunk pattern (e.g., 50 lots repeatedly). Use the formula `repetition_score = count_at_price / avg_trades_per_price` — flag levels with score >= 5 as iceberg candidates.
   **Checkpoint:** Minimum 5 confirmed repetitions required to classify as iceberg behavior. Single-level volume spikes should be logged separately as "unconfirmed absorption."

5. **Cross-reference with order book depth to map liquidity pools.** Pull the top-of-book or L2 depth snapshot and identify price levels where the aggregate bid/ask queue exceeds 3x the recent average queue size. These are institutional liquidity zones — potential targets for stop hunts or breakout catalysts.
   **Checkpoint:** Ensure detected liquidity zones lie beyond recent swing highs or lows (at least 0.5% away from current price). Liquidity inside the recent range is usually already priced in.

6. **Synthesize a conviction score.** Combine all signals into a weighted score: divergence at volume node (+30), stacked footprint imbalance (+25), confirmed iceberg behavior (+20), liquidity zone proximity (+15), order book depth confirmation (+10). Signal is actionable when total >= 70 / 100.
   **Checkpoint:** Never trade on conviction < 60 without a secondary independent signal (e.g., price action breakout, news catalyst).

---

## Implementation Patterns

### Pattern 1: Cumulative Delta Divergence Detection

Computes rolling cumulative delta from per-candle buy/sell volumes and detects bullish or bearish divergence against price swing points. A confirmed divergence requires two swing points in both series with the inflection points occurring within a configurable bar window.

```python
"""
Module: data_pipeline/order_flow/cumulative_delta.py
Purpose: Compute rolling cumulative delta from per-candle tick-level volume and detect
         bullish/bearish divergence between price action and order flow signatures.

APEX Convention: Data pipeline modules live under data_pipeline/ with clear
input/output contracts. Tests go in tests/test_cumulative_delta.py.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class CandleDelta:
    """A single candle with aggregated buy/sell volume from tick data."""
    timestamp: float          # Unix epoch seconds
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    buy_volume: int = 0       # Aggressive buyer-initiated volume
    sell_volume: int = 0      # Aggressive seller-initiated volume

    @property
    def net_delta(self) -> int:
        """Net delta: positive means aggressive buying dominated."""
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
    bar_offset: int                           # Bars between price and delta inflections
    conviction_score: int                     # 0-100 derived from multiple factors

    @property
    def is_actionable(self) -> bool:
        """Signal meets minimum conviction threshold."""
        return self.conviction_score >= 60


def compute_cumulative_delta_series(
    candles: List[CandleDelta],
) -> Tuple[List[int], List[float]]:
    """Build a cumulative delta time series from per-candle buy/sell volumes.

    Rolls net_delta across all candles chronologically to produce a single running
    total that reveals sustained institutional buying or selling pressure.

    Args:
        candles: Ordered list of CandleDelta objects with tick-level volume breakdowns.

    Returns:
        Tuple of (cumulative_values, close_prices) aligned by index.

    Raises:
        ValueError: If candles list is empty or not sorted chronologically.
    """
    if not candles:
        raise ValueError("Candles list must contain at least one candle")

    # Validate chronological ordering
    for i in range(1, len(candles)):
        if candles[i].timestamp < candles[i - 1].timestamp:
            raise ValueError(
                f"Candles must be chronologically sorted. "
                f"Index {i} ({candles[i].timestamp}) precedes index {i-1}"
            )

    cumulative_values: List[int] = []
    close_prices: List[float] = []
    running_delta = 0

    for candle in candles:
        running_delta += candle.net_delta
        cumulative_values.append(running_delta)
        close_prices.append(candle.close_price)

    return cumulative_values, close_prices


def find_swings(
    values: List[float],
    lookback: int = 5,
    min_series_length: int = 100,
) -> List[DeltaSwingPoint]:
    """Identify swing highs and swing lows in a time series.

    A swing high occurs when the current value exceeds all values in the surrounding
    window of `lookback` bars on each side. A swing low is the inverse. Only computes
    swings for series with at least min_series_length points to ensure statistical
    significance and avoid noise-driven false signals.

    Args:
        values: Numeric time series (e.g., cumulative delta or price).
        lookback: Number of bars before and after for swing confirmation.
        min_series_length: Minimum series length required for any swing detection.

    Returns:
        List of DeltaSwingPoint objects with swing_type set to "high" or "low".
        Empty list if series is too short or no swings found.
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
        window_values = values[window_start:window_end]

        # Exclude the center point when comparing
        comparison_values = window_values[:lookback] + window_values[lookback + 1:]

        if not comparison_values:
            continue

        is_high = values[i] > max(comparison_values)
        is_low = values[i] < min(comparison_values)

        if is_high:
            swings.append(DeltaSwingPoint(
                timestamp=0.0,  # Will be set by caller using candle timestamps
                price_close=values[i],
                cumulative_delta=int(values[i]),
                swing_type="high",
                candle_index=i,
            ))
        elif is_low:
            swings.append(DeltaSwingPoint(
                timestamp=0.0,
                price_close=values[i],
                cumulative_delta=int(values[i]),
                swing_type="low",
                candle_index=i,
            ))

    return swings


def detect_divergence(
    price_candles: List[CandleDelta],
    lookback: int = 5,
    max_bar_offset: int = 5,
) -> List[DivergenceSignal]:
    """Detect bullish and bearish divergence between price action and cumulative delta.

    Bullish divergence: Price makes a lower low while cumulative delta forms a higher low,
    indicating that selling pressure is weakening despite price declining — a classic
    institutional accumulation signature.

    Bearish divergence: Price makes a higher high while cumulative delta forms a lower high,
    suggesting buying exhaustion — potential distribution ahead.

    Requires at least 2 swing points in both price and delta series for confirmation.
    Inflection points must occur within max_bar_offset bars of each other.

    Args:
        price_candles: Ordered CandleDelta objects with OHLCV data.
        lookback: Bar window for swing detection (5–10 recommended).
        max_bar_offset: Maximum bars between corresponding price and delta swings.

    Returns:
        List of DivergenceSignal for each confirmed divergence pair found. Empty list if
        no valid divergences detected in the available data.
    """
    if len(price_candles) < lookback * 2 + 10:
        return []

    # Step 1: Compute cumulative delta series
    cum_delta, close_prices = compute_cumulative_delta_series(price_candles)

    # Step 2: Find swing points in both series
    price_lows = find_swings(close_prices, lookback)
    delta_lows = find_swings(cum_delta, lookback)
    price_highs = find_swings(close_prices, lookback)
    delta_highs = find_swings(cum_delta, lookback)

    divergences: List[DivergenceSignal] = []

    # Assign timestamps from candles for precise bar-offset calculation
    for swing in price_lows + delta_lows + price_highs + delta_highs:
        idx = min(swing.candle_index, len(price_candles) - 1)
        swing.timestamp = price_candles[idx].timestamp

    # Bullish divergence: lower price low + higher delta low
    if len(price_lows) >= 2 and len(delta_lows) >= 2:
        for i in range(1, len(price_lows)):
            prev_price_low = price_lows[i - 1]
            curr_price_low = price_lows[i]

            # Price made a lower low
            if curr_price_low.price_close < prev_price_low.price_close:
                # Find corresponding delta low within bar offset window
                for j in range(1, len(delta_lows)):
                    prev_delta_low = delta_lows[j - 1]
                    curr_delta_low = delta_lows[j]

                    if (curr_delta_low.cumulative_delta > prev_delta_low.cumulative_delta and
                            abs(curr_price_low.candle_index - curr_delta_low.candle_index) <= max_bar_offset):

                        bar_offset = abs(curr_price_low.candle_index - curr_delta_low.candle_index)
                        # Conviction: stronger if closer alignment and wider delta gap
                        delta_gap_pct = (curr_delta_low.cumulative_delta - prev_delta_low.cumulative_delta) / max(
                            abs(prev_delta_low.cumulative_delta), 1
                        ) * 100
                        conviction = min(100, int(delta_gap_pct * 5 + (max_bar_offset - bar_offset) * 5))

                        divergences.append(DivergenceSignal(
                            signal_type="bullish_divergence",
                            first_swing_price=prev_price_low.price_close,
                            second_swing_price=curr_price_low.price_close,
                            first_swing_delta=prev_delta_low.cumulative_delta,
                            second_swing_delta=curr_delta_low.cumulative_delta,
                            bar_offset=bar_offset,
                            conviction_score=conviction,
                        ))

    # Bearish divergence: higher price high + lower delta high
    if len(price_highs) >= 2 and len(delta_highs) >= 2:
        for i in range(1, len(price_highs)):
            prev_price_high = price_highs[i - 1]
            curr_price_high = price_highs[i]

            if curr_price_high.price_close > prev_price_high.price_close:
                for j in range(1, len(delta_highs)):
                    prev_delta_high = delta_highs[j - 1]
                    curr_delta_high = delta_highs[j]

                    if (curr_delta_high.cumulative_delta < prev_delta_high.cumulative_delta and
                            abs(curr_price_high.candle_index - curr_delta_high.candle_index) <= max_bar_offset):

                        bar_offset = abs(curr_price_high.candle_index - curr_delta_high.candle_index)
                        delta_gap_pct = (prev_delta_high.cumulative_delta - curr_delta_high.cumulative_delta) / max(
                            abs(prev_delta_high.cumulative_delta), 1
                        ) * 100
                        conviction = min(100, int(delta_gap_pct * 5 + (max_bar_offset - bar_offset) * 5))

                        divergences.append(DivergenceSignal(
                            signal_type="bearish_divergence",
                            first_swing_price=prev_price_high.price_close,
                            second_swing_price=curr_price_high.price_close,
                            first_swing_delta=prev_delta_high.cumulative_delta,
                            second_swing_delta=curr_delta_high.cumulative_delta,
                            bar_offset=bar_offset,
                            conviction_score=conviction,
                        ))

    return divergences
```

### Pattern 2: Footprint Imbalance Detection (BAD vs. GOOD)

Detects price levels where aggressive buyers or sellers dominate volume by a configurable threshold. Requires multi-level confirmation — single-level imbalances are noise; stacked imbalances across contiguous prices reveal institutional order flow.

```python
"""
Module: data_pipeline/order_flow/footprint_imbalance.py
Purpose: Scan footprint chart data for buyer/seller volume imbalances at each price level,
         detect stacked imbalance formations, and track absorption signatures.

APEX Convention: Data pipeline modules live under data_pipeline/. Tests in tests/test_footprint_imbalance.py.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class PriceLevelVolume:
    """Aggregated buy/sell volume at a single price level within a candle."""
    price: float
    buy_volume: int = 0
    sell_volume: int = 0

    @property
    def total_volume(self) -> int:
        return self.buy_volume + self.sell_volume

    @property
    def imbalance_ratio(self) -> float:
        """Bid/ask volume ratio. >1 means buyer dominance, <1 means seller dominance."""
        if self.sell_volume == 0:
            return float("inf") if self.buy_volume > 0 else 1.0
        return self.buy_volume / self.sell_volume

    @property
    def is_bid_imbalance(self, threshold: float = 2.5) -> bool:
        """Buyer volume exceeds seller volume by the configured ratio threshold."""
        return self.imbalance_ratio >= threshold

    @property
    def is_ask_imbalance(self, threshold: float = 2.5) -> bool:
        """Seller volume exceeds buyer volume by the configured ratio threshold."""
        if self.buy_volume == 0:
            return True if self.sell_volume > 0 else False
        return (self.sell_volume / self.buy_volume) >= threshold


@dataclass
class ImbalanceLevel:
    """A price level with a confirmed volume imbalance above threshold."""
    price: float
    buy_volume: int
    sell_volume: int
    ratio: float                     # Directional ratio
    direction: str                   # "bid_imbalance" or "ask_imbalance"
    strength: float = 0.0            # Excess volume percentage (0.0 to 1.0)

    def __post_init__(self):
        total = self.buy_volume + self.sell_volume
        if total > 0:
            if self.direction == "bid_imbalance":
                self.strength = (self.buy_volume - self.sell_volume) / total
            else:
                self.strength = (self.sell_volume - self.buy_volume) / total


@dataclass
class StackedImbalance:
    """Three or more contiguous price levels all showing imbalance in the same direction."""
    levels: List[ImbalanceLevel] = field(default_factory=list)
    direction: str = "bid_imbalance"
    combined_net_delta: int = 0
    min_price: float = 0.0
    max_price: float = 0.0

    @property
    def price_span(self) -> float:
        return self.max_price - self.min_price

    @property
    def avg_ratio(self) -> float:
        if not self.levels:
            return 0.0
        return sum(l.ratio for l in self.levels) / len(self.levels)

    @property
    def is_valid(self, min_levels: int = 3, min_net_delta: int = 10) -> bool:
        """Stack must have minimum contiguous levels and meaningful net delta."""
        return (len(self.levels) >= min_levels and abs(self.combined_net_delta) >= min_net_delta)


@dataclass
class FootprintConvictionScore:
    """Composite conviction score (0-100) for order flow signal quality."""
    divergence_component: int = 0       # Max 30 points
    stacked_imbalance_component: int = 0 # Max 25 points
    iceberg_component: int = 0          # Max 20 points
    liquidity_zone_component: int = 0   # Max 15 points
    book_depth_component: int = 0       # Max 10 points

    @property
    def total(self) -> int:
        return (self.divergence_component + self.stacked_imbalance_component +
                self.iceberg_component + self.liquidity_zone_component +
                self.book_depth_component)

    @property
    def is_high_conviction(self) -> bool:
        return self.total >= 70

    @property
    def is_low_conviction(self) -> bool:
        return self.total <= 20


# ❌ BAD: Detecting imbalances without volume normalization or stacking requirements
def bad_detect_imbalance(price_levels: Dict[float, Tuple[int, int]]) -> List[dict]:
    """Wrong: flags any price level where buy_volume > sell_volume, ignoring
       magnitude thresholds and multi-level confirmation. Produces dozens of false signals."""
    signals = []
    for price, (buy_vol, sell_vol) in price_levels.items():
        if buy_vol > sell_vol:  # No threshold — every slight buyer edge triggers a signal
            signals.append({
                "price": price,
                "type": "imbalanced",
                "confidence": "medium"  # Magic string instead of numeric score
            })
    return signals


# ✅ GOOD: Full imbalance detection with volume normalization, stacking logic, and conviction scoring
def detect_footprint_imbalances(
    candle_deltas: Dict[float, PriceLevelVolume],
    threshold: float = 2.5,
    min_volume_pct_of_avg: float = 0.01,
) -> List[ImbalanceLevel]:
    """Detect single-level footprint imbalances from per-price-level tick volume data.

    A bid imbalance exists when buy_volume / sell_volume >= threshold at a price level.
    An ask imbalance exists when sell_volume / buy_volume >= threshold. Levels below the
    minimum volume filter (relative to average candle volume) are skipped as noise.

    Args:
        candle_deltas: Mapping from price level to PriceLevelVolume with aggregated volumes.
        threshold: Minimum bid/ask ratio for imbalance classification (default 2.5x).
        min_volume_pct_of_avg: Minimum total volume as fraction of average candle volume
                              to filter out insignificant price levels (default 1%).

    Returns:
        List of ImbalanceLevel objects sorted by strength descending. Empty list if no
        imbalances meet the threshold and minimum volume requirements.
    """
    imbalances: List[ImbalanceLevel] = []

    for price, level in candle_deltas.items():
        # Volume filter — skip insignificant levels
        if level.total_volume < min_volume_pct_of_avg * 1000:  # Simplified avg check
            continue

        if level.is_bid_imbalance(threshold):
            imbalances.append(ImbalanceLevel(
                price=price,
                buy_volume=level.buy_volume,
                sell_volume=level.sell_volume,
                ratio=level.imbalance_ratio,
                direction="bid_imbalance",
            ))
        elif level.is_ask_imbalance(threshold):
            imbalances.append(ImbalanceLevel(
                price=price,
                buy_volume=level.buy_volume,
                sell_volume=level.sell_volume,
                ratio=(level.sell_volume / max(level.buy_volume, 1)),
                direction="ask_imbalance",
            ))

    # Sort by strength — strongest imbalances first for priority review
    imbalances.sort(key=lambda x: x.strength, reverse=True)
    return imbalances


def detect_stacked_imbalances(
    imbalances: List[ImbalanceLevel],
    tick_size: float = 0.25,
    min_contiguous: int = 3,
) -> List[StackedImbalance]:
    """Detect stacks of contiguous imbalance levels forming institutional footprints.

    Groups consecutive price levels (adjacent within tick size spacing) that share the same
    imbalance direction into stacked imbalance formations. A valid stack requires at least
    min_contiguous levels and meaningful combined net delta.

    Args:
        imbalances: List of ImbalanceLevel sorted by strength descending.
        tick_size: Minimum price increment for contiguity check (e.g., 0.25 for ES futures).
        min_contiguous: Minimum contiguous levels to form a valid stack (default 3).

    Returns:
        List of StackedImbalance objects. Empty list if no valid stacks found.
    """
    if len(imbalances) < min_contiguous:
        return []

    # Sort ascending by price for contiguous level grouping
    sorted_levels = sorted(imbalances, key=lambda x: x.price)
    stacks: List[StackedImbalance] = []
    current_stack: List[ImbalanceLevel] = [sorted_levels[0]]

    for i in range(1, len(sorted_levels)):
        prev_level = current_stack[-1]
        curr_level = sorted_levels[i]

        price_gap = abs(curr_level.price - prev_level.price)
        is_contiguous = price_gap <= tick_size * 1.5  # Allow rounding tolerance
        same_direction = curr_level.direction == current_stack[0].direction

        if is_contiguous and same_direction:
            current_stack.append(curr_level)
        else:
            # Finalize current stack
            if len(current_stack) >= min_contiguous:
                stack = _build_stacked_imbalance(current_stack)
                if stack.is_valid:
                    stacks.append(stack)
            current_stack = [curr_level]

    # Don't forget the last stack
    if len(current_stack) >= min_contiguous:
        stack = _build_stacked_imbalance(current_stack)
        if stack.is_valid:
            stacks.append(stack)

    return stacks


def _build_stacked_imbalance(levels: List[ImbalanceLevel]) -> StackedImbalance:
    """Build a StackedImbalance from a list of contiguous imbalance levels."""
    direction = levels[0].direction
    buy_total = sum(l.buy_volume for l in levels)
    sell_total = sum(l.sell_volume for l in levels)

    return StackedImbalance(
        levels=levels,
        direction=direction,
        combined_net_delta=buy_total - sell_total,
        min_price=min(l.price for l in levels),
        max_price=max(l.price for l in levels),
    )


def compute_conviction_score(
    divergences: List[DivergenceSignal],       # From Pattern 1
    stacked_imbalances: List[StackedImbalance], # From this module
    iceberg_count: int = 0,                    # Confirmed iceberg signatures
    liquidity_zone_nearby: bool = False,       # Within 0.5% of a liquidity pool
    book_depth_ratio: float = 1.0,            # Queue depth vs average (>1 = above avg)
) -> FootprintConvictionScore:
    """Compute a weighted conviction score (0-100) for an order flow signal.

    Combines five factors measured independently, each contributing to the total.
    A high-conviction signal (>=70) warrants execution consideration if risk controls allow.

    Args:
        divergences: Confirmed delta divergence signals from compute_cumulative_delta.py.
        stacked_imbalances: Detected stacked imbalance formations from this module.
        iceberg_count: Number of confirmed iceberg order signatures in the current window.
        liquidity_zone_nearby: True if price is within 0.5% of a detected liquidity pool.
        book_depth_ratio: Ratio of current order book queue depth to recent average.

    Returns:
        FootprintConvictionScore with full breakdown and total score.
    """
    score = FootprintConvictionScore()

    # Divergence component (max 30) — strongest single signal
    if divergences:
        best_divergence = max(divergences, key=lambda d: d.conviction_score)
        score.divergence_component = min(30, int(best_divergence.conviction_score * 0.3))

    # Stacked imbalance component (max 25)
    strong_stacks = [s for s in stacked_imbalances if len(s.levels) >= 4]
    valid_stacks = [s for s in stacked_imbalances if s.is_valid()]
    score.stacked_imbalance_component = min(25, int(len(valid_stacks) * 10 + len(strong_stacks) * 5))

    # Iceberg component (max 20)
    score.iceberg_component = min(20, iceberg_count * 5)

    # Liquidity zone proximity (max 15)
    if liquidity_zone_nearby:
        score.liquidity_zone_component = 15

    # Book depth confirmation (max 10)
    if book_depth_ratio > 2.0:
        score.book_depth_component = 10
    elif book_depth_ratio > 1.5:
        score.book_depth_component = 6
    elif book_depth_ratio > 1.0:
        score.book_depth_component = 3

    return score
```

### Pattern 3: Iceberg / Hidden Order Detection via Book Snapshot Analysis

Iceberg orders are large institutional orders hidden beneath the visible order book — they replenish at a specific price level whenever their visible portion gets filled. Detection relies on identifying repeated trade executions of consistent size at identical prices over consecutive candles, producing an abnormally high trade count relative to total volume at that level.

```python
"""
Module: data_pipeline/order_flow/iceberg_detector.py
Purpose: Identify iceberg and hidden order signatures by analyzing repeated execution patterns
         at identical price levels across consecutive candle periods in tick data.

APEX Convention: Under data_pipeline/order_flow/. Tests in tests/test_iceberg_detector.py.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class IcebergSignature:
    """An identified iceberg order pattern at a specific price level."""
    price: float
    side: str                          # "buy" or "sell"
    total_executed_volume: int
    execution_count: int               # Number of individual trades at this level
    avg_chunk_size: float              # Average size per execution (visible portion)
    estimated_total_size: int          # Inferred full order size (chunk_size * replenishment_factor)
    confidence: str                    # "confirmed", "probable", "suspected"
    first_seen_index: int
    last_seen_index: int

    @property
    def is_confirmed(self) -> bool:
        return self.confidence == "confirmed"


def detect_iceberg_orders(
    price_level_trades: Dict[float, List[Tuple[int, int, str]]],
    min_repetitions: int = 5,
    max_size_variance_pct: float = 0.3,
    avg_trade_volume: int = 100,
) -> List[IcebergSignature]:
    """Detect iceberg orders by analyzing repeated execution patterns at price levels.

    An iceberg order signature manifests as consistent trade sizes executing repeatedly at
    the same price level across consecutive candles. The key identifier is low variance in
    individual chunk sizes despite high aggregate volume at that price — indicating a large
    hidden order replenishing its visible portion.

    Args:
        price_level_trades: Mapping from price to list of (trade_size, candle_index, side) tuples.
                           Only includes levels where total trades >= min_repetitions.
        min_repetitions: Minimum trade count at a price level to consider it an iceberg candidate.
        max_size_variance_pct: Maximum allowed coefficient of variation in chunk sizes.
                              Lower = stricter detection (default 30%).
        avg_trade_volume: System-wide average trade volume for scaling normalization.

    Returns:
        List of IcebergSignature with inferred full order size and confidence classification.
        Only confirmed signatures (min_repetitions >= 5) are included in the result.
    """
    if not price_level_trades:
        return []

    signatures: List[IcebergSignature] = []

    for price, trade_list in price_level_trades.items():
        if len(trade_list) < min_repetitions:
            continue

        sizes = [t[0] for t in trade_list]
        indices = [t[1] for t in trade_list]
        sides = set(t[2] for t in trade_list)

        if len(sides) > 1:
            # Mixed buy/sell at same price — could be crossing, not necessarily iceberg
            continue

        side = list(sides)[0]
        avg_size = sum(sizes) / len(sizes)
        variance = sum((s - avg_size) ** 2 for s in sizes) / len(sizes)
        std_dev = variance ** 0.5
        cv = std_dev / max(avg_size, 1)  # Coefficient of variation

        # Low coefficient of variation + high count = strong iceberg signal
        if cv > max_size_variance_pct:
            continue

        # Classify confidence
        execution_count = len(trade_list)
        if execution_count >= min_repetitions * 2:
            confidence = "confirmed"
            replenishment_factor = 4.0
        elif execution_count >= min_repetitions:
            confidence = "probable"
            replenishment_factor = 3.0
        else:
            confidence = "suspected"
            replenishment_factor = 2.5

        total_volume = sum(sizes)
        estimated_total = int(avg_size * replenishment_factor)

        signatures.append(IcebergSignature(
            price=price,
            side=side,
            total_executed_volume=total_volume,
            execution_count=execution_count,
            avg_chunk_size=round(avg_size, 2),
            estimated_total_size=estimated_total,
            confidence=confidence,
            first_seen_index=indices[0],
            last_seen_index=indices[-1],
        ))

    # Sort by confidence (confirmed first) then by total volume descending
    confidence_order = {"confirmed": 0, "probable": 1, "suspected": 2}
    signatures.sort(key=lambda s: (confidence_order[s.confidence], -s.total_executed_volume))
    return signatures


def detect_absorption_zones(
    candle_deltas: Dict[float, PriceLevelVolume],
    avg_candle_volume: float = 10000.0,
    absorption_ratio_threshold: float = 3.0,
) -> List[Tuple[float, str]]:
    """Identify price levels where one side's aggressive volume is being absorbed without price movement.

    Absorption occurs when a large passive limit order absorbs all incoming market orders at a
    specific price, preventing further price movement in that direction despite heavy aggressive
    volume. This is typically an institutional defense level.

    Args:
        candle_deltas: Per-price-level buy/sell volume aggregation across recent candles.
        avg_candle_volume: Average total candle volume for normalization.
        absorption_ratio_threshold: Minimum ratio of dominant-side volume to the other side
                                   to flag as potential absorption (default 3x).

    Returns:
        List of (price_level, absorbing_side) tuples sorted by dominant volume descending.
        Empty list if no absorption zones detected.
    """
    absorptions: List[Tuple[float, str]] = []

    for price, level in candle_deltas.items():
        if level.total_volume < avg_candle_volume * 0.5:
            continue  # Skip levels with too little volume for meaningful analysis

        if level.sell_volume > 0 and level.buy_volume > 0:
            bid_ask_ratio = level.buy_volume / level.sell_volume
            ask_bid_ratio = level.sell_volume / level.buy_volume

            if bid_ask_ratio >= absorption_ratio_threshold:
                absorptions.append((price, "buy_absorption"))
            elif ask_bid_ratio >= absorption_ratio_threshold:
                absorptions.append((price, "sell_absorption"))

    absorptions.sort(key=lambda x: (candle_deltas[x[0]].total_volume), reverse=True)
    return absorptions
```

### Pattern 4: Institutional Accumulation/Distribution Zone Identification

Maps zones where institutional accumulation or distribution is occurring by combining cumulative delta divergence, footprint imbalances, and volume profile context into actionable trade entry signals.

```python
"""
Module: data_pipeline/order_flow/institutional_zones.py
Purpose: Identify institutional accumulation (buying) and distribution (selling) zones by
         synthesizing cumulative delta divergence, footprint imbalance patterns, and volume
         profile context into high-probability trade entry recommendations.

APEX Convention: Under data_pipeline/order_flow/. Tests in tests/test_institutional_zones.py.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class InstitutionalZone:
    """An identified zone where institutional accumulation or distribution is occurring."""
    zone_type: str                       # "accumulation" or "distribution"
    price_range_low: float
    price_range_high: float
    conviction_score: int                # 0-100 from FootprintConvictionScore.total
    supporting_signals: List[str]        # e.g., ["delta_divergence_bullish", "stacked_bid_imbalance"]
    recommended_action: str              # "enter_long", "wait_for_confirmation", "avoid"
    stop_loss_level: Optional[float] = None
    take_profit_levels: List[float] = field(default_factory=list)


def identify_institutional_zones(
    price_range_low: float,
    price_range_high: float,
    current_price: float,
    volume_profile_poc: float,
    volume_profile_val: float,
    volume_profile_vah: float,
    divergence_signals: List["DivergenceSignal"],  # Forward ref to avoid circular import
    footprint_imbalances: List["ImbalanceLevel"],   # From pattern 2
    stacked_imbalances: List["StackedImbalance"],   # From pattern 2
    iceberg_signatures: List["IcebergSignature"],   # From pattern 3
    avg_candle_volume: float = 10000.0,
) -> InstitutionalZone:
    """Synthesize multiple order flow signals into a single institutional zone assessment.

    Combines cumulative delta divergence (Pattern 1), footprint imbalances (Pattern 2), and
    iceberg detections (Pattern 3) with volume profile context to identify the most likely
    accumulation or distribution zone within the specified price range.

    The algorithm assigns points to each signal type, then determines whether the aggregate
    pattern indicates institutional buying (accumulation) or selling (distribution).

    Args:
        price_range_low / high: Search window for the institutional zone.
        current_price: Current market price for context.
        volume_profile_poc: Point of Control from Volume Profile analysis.
        volume_profile_val / vah: Value Area Low and High from Volume Profile analysis.
        divergence_signals: Confirmed cumulative delta divergence signals.
        footprint_imbalances: Single-level imbalances detected in recent candles.
        stacked_imbalances: Multi-level stacked imbalance formations.
        iceberg_signatures: Detected iceberg order patterns.
        avg_candle_volume: Average candle volume for signal weighting normalization.

    Returns:
        InstitutionalZone with type, price range, conviction score, supporting signals,
        and recommended trading action with optional stop-loss and take-profit levels.
    """
    if not divergence_signals and not footprint_imbalances and not stacked_imbalances:
        logger.warning("No order flow signals to synthesize — returning null zone")
        return InstitutionalZone(
            zone_type="accumulation",  # Default neutral
            price_range_low=price_range_low,
            price_range_high=price_range_high,
            conviction_score=0,
            supporting_signals=[],
            recommended_action="wait_for_confirmation",
        )

    score = 0
    signals: List[str] = []

    # Cumulative delta divergence scoring (max 30 points)
    bull_divergences = [d for d in divergence_signals if d.signal_type == "bullish_divergence"]
    bear_divergences = [d for d in divergence_signals if d.signal_type == "bearish_divergence"]

    if bull_divergences:
        best_bull = max(bull_divergences, key=lambda d: d.conviction_score)
        score += min(30, int(best_bull.conviction_score * 0.3))
        signals.append(f"bullish_delta_divergence@{best_bull.second_swing_price:.2f}")

    if bear_divergences:
        best_bear = max(bear_divergences, key=lambda d: d.conviction_score)
        score += min(30, int(best_bear.conviction_score * 0.3))
        signals.append(f"bearish_delta_divergence@{best_bear.second_swing_price:.2f}")

    # Stacked imbalance scoring (max 25 points)
    bid_stacks = [s for s in stacked_imbalances if s.direction == "bid_imbalance"]
    ask_stacks = [s for s in stacked_imbalances if s.direction == "ask_imbalance"]

    if bid_stacks:
        strongest_bid = max(bid_stacks, key=lambda s: s.combined_net_delta)
        bid_pts = min(25, int(len(bid_stacks) * 10))
        score += bid_pts
        signals.append(f"stacked_bid_imbalance@{strongest_bid.min_price:.2f}")

    if ask_stacks:
        strongest_ask = max(ask_stacks, key=lambda s: abs(s.combined_net_delta))
        ask_pts = min(25, int(len(ask_stacks) * 10))
        score += ask_pts
        signals.append(f"stacked_ask_imbalance@{strongest_ask.min_price:.2f}")

    # Iceberg scoring (max 20 points)
    confirmed_icebergs = [i for i in iceberg_signatures if i.is_confirmed]
    if confirmed_icebergs:
        iceberg_pts = min(20, len(confirmed_icebergs) * 5)
        score += iceberg_pts
        signals.append(f"{len(confirmed_icebergs)}_confirmed_iceberg_orders")

    # Determine zone type and action
    buy_score = sum(s for s in signals if any(term in s for term in [
        "bullish_delta_divergence", "stacked_bid_imbalance"
    ]))
    sell_score = sum(s for s in signals if any(term in s for term in [
        "bearish_delta_divergence", "stacked_ask_imbalance"
    ]))

    if score > 0:
        is_accumulation = buy_score >= sell_score
        zone_type = "accumulation" if is_accumulation else "distribution"

        if score >= 70:
            action = "enter_long" if is_accumulation else "enter_short"
            # Stop loss beyond the zone edge (1.5x ATR buffer recommended)
            stop_distance = price_range_high - price_range_low
            stop_loss = (price_range_low - stop_distance * 1.5) if is_accumulation else (price_range_high + stop_distance * 1.5)
            # Take profit at volume profile edges
            take_profit = [volume_profile_vah] if is_accumulation else [volume_profile_val]
        elif score >= 40:
            action = "wait_for_confirmation"
            stop_loss = None
            take_profit = []
        else:
            action = "avoid"
            stop_loss = None
            take_profit = []

        return InstitutionalZone(
            zone_type=zone_type,
            price_range_low=price_range_low,
            price_range_high=price_range_high,
            conviction_score=score,
            supporting_signals=signals,
            recommended_action=action,
            stop_loss_level=stop_loss,
            take_profit_levels=take_profit,
        )

    return InstitutionalZone(
        zone_type="accumulation",
        price_range_low=price_range_low,
        price_range_high=price_range_high,
        conviction_score=0,
        supporting_signals=[],
        recommended_action="wait_for_confirmation",
    )
```

---

## Constraints

### MUST DO
- Require a minimum volume filter on every price level (at least 1% of average candle volume) before flagging any imbalance as a signal — noise at thin levels is not actionable
- Cross-validate every order flow signal with broader price action context — a bullish delta divergence confirmed at a volume profile POC is strong; the same divergence in empty price space is weak
- Log every detected signal with full metadata: timestamp, symbol, price level, signal type, conviction score, and supporting evidence (which patterns contributed)
- Use rolling windows for all cumulative calculations to avoid look-ahead bias — never use future candles when computing current candle's delta or volume profile metrics
- Normalize cumulative delta values relative to the asset's typical daily range before comparing across different instruments

### MUST NOT DO
- Trade on a single-candle footprint imbalance without confirming persistence across at least 3 consecutive candles or corroborating divergence evidence
- Ignore the broader market regime — an accumulation signal during a confirmed bearish trend has lower conviction than one in a ranging or bullish regime
- Use misaligned data sources for delta calculation — tick-level buy/sell classification requires synchronized T&S and L2 book feeds; mismatched timestamps produce phantom divergences
- Override hard risk controls (position size limits, daily loss limits, kill switches) based on order flow signals alone — order flow is a timing tool, not a risk exemption
- Generate entry orders directly from conviction scores above 70 without confirming that the price is within the identified institutional zone — entries should be placed at zone edges with stop-loss protection

---

## Output Template

When analyzing order flow data and generating trade signals, produce the following structured output:

1. **Divergence Signal** — Type (bullish/bearish), first and second swing prices, corresponding delta values, bar offset between inflection points, conviction sub-score, and whether it aligns with a volume profile node or historical support/resistance level.

2. **Imbalance Zones** — Table of detected bid/ask imbalances per price level, showing buy volume, sell volume, imbalance ratio, and strength percentage. Highlight stacked formations with level count, price span, and combined net delta. Flag any that align with value area edges.

3. **Iceberg Detection Summary** — List each confirmed iceberg signature with price level, side (buy/sell), total executed volume, execution count, average chunk size, estimated full order size, and confidence classification (confirmed/probable/suspected).

4. **Execution Recommendation** — Final conviction score (0-100 out of 5 components), zone type (accumulation/distribution), recommended action (enter_long / enter_short / wait_for_confirmation / avoid), suggested stop-loss level, and take-profit targets aligned with volume profile metrics.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `trading-volume-profile` | Provides Volume Profile context (POC, VAH, VAL) essential for validating whether order flow signals align with established value areas |
| `trading-risk-stop-loss` | Defines stop loss placement rules and risk parameters when acting on order flow-driven entries |
| `trading-vwap-execution` | Provides VWAP execution benchmarks to evaluate whether detected accumulation is happening above or below institutional benchmark prices |

> 📖 skill(local cache): trading-volume-profile, trading-risk-stop-loss, trading-vwap-execution
