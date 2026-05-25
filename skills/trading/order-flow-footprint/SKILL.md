---
name: order-flow-footprint
description: Analyzes footprint charts, volume delta, cumulative delta, and bid-ask
  imbalances to detect aggressive buying/selling pressure and identify institutional
  order flow signatures.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  triggers: footprint chart, volume delta, cumulative delta, order flow analysis,
    delta divergence, stacked imbalance, aggressive buying, order flow footprint
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
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - examples
  - do-dont
  related-skills: ai-order-flow-analysis, data-order-book, technical-volume-profile
------
# Footprint Chart & Delta Analysis

Analyzes footprint-level tick data to compute volume delta, cumulative delta, and bid-ask imbalances that reveal aggressive order flow. Detects institutional buying/selling signatures through stacked imbalances, divergence patterns, and absorption at key price levels.

## TL;DR Checklist

- [ ] Classify every trade as buyer-initiated or seller-initiated using tick test logic
- [ ] Aggregate delta per price level within each candle before computing stacked imbalances
- [ ] Require 3+ contiguous price levels with >2x volume ratio for stacked imbalance recognition
- [ ] Validate cumulative delta divergence against at least 2 confirmed swing points over 100+ candles
- [ ] Score footprint patterns on a 0–100 conviction scale combining four weighted factors
- [ ] Flag any trades with unresolved side determination (>5% unresolved = data quality alert)

---

## When to Use

Use this skill when:

- Analyzing footprint chart data from CME, NASDAQ TotalView, or Binance aggregated trade feeds
- Computing volume delta (buy volume minus sell volume) per price level within a candle
- Detecting stacked bid/ask imbalances that signal institutional absorption at a specific price zone
- Identifying cumulative delta divergence where price makes new highs/lows without delta confirmation
- Building algorithmic entry signals based on order flow footprints for futures, equities, or crypto markets
- Auditing trade execution quality by comparing executed side against aggressive vs. passive volume

---

## When NOT to Use

- For high-level technical analysis using only OHLCV data — use `technical-volume-profile` instead (footprint requires tick-level or aggregated-at-price data)
- When you only have 1-minute bar data without internal price-level volume breakdown — the tick test cannot be reliably applied at that granularity
- As a standalone signal source — always combine with price action context, support/resistance levels, and broader market regime analysis

---

## Core Workflow

1. **Ingest Tick Data** — Parse time-and-sales (T&S) data from exchange WebSocket feed or REST API. Each tick must include timestamp, price, size, and optionally side. For markets without explicit side tagging, infer aggressor direction via the uptick/downtick rule. **Checkpoint:** Verify each trade has a valid timestamp within 500ms of exchange clock, price above zero, and size > 0; flag any records that fail validation for manual review.

2. **Classify Each Trade as Aggressor** — Determine if buyer or seller was aggressive (hit the ask or lifted the bid). Apply the tick test: if `trade_price >= prev_trade_price` then mark as buyer-initiated; else mark as seller-initiated. Handle locked markets (`trade_price == prev_trade_price`) by checking against the last visible bid/ask midpoint from the L2 book — if trade price >= mid, buyer-initiated; else seller-initiated. If no L2 data available, mark locked market trades as unresolved. **Checkpoint:** Flag any batch where unresolved trades exceed 5% of total — this indicates missing L2 data or feed issues.

3. **Aggregate Delta per Price Level** — For each candle period (1m, 5m, 15m), bucket every classified trade by its price level and time window. Sum `buy_volume` and `sell_volume` at each distinct price within the candle. Compute `net_delta = buy_volume - sell_volume` for every price level. **Checkpoint:** Verify that the sum of all per-price-level volumes equals the exchange-reported total volume for that candle to within 0.1%; any larger discrepancy indicates missing ticks or double-counting.

4. **Detect Stacked Imbalances** — A stacked imbalance occurs when three or more consecutive price levels show a bid-side volume ratio exceeding the ask-side by a configurable threshold (default 2x). Compute the imbalance ratio at each level: `imbalance_ratio = buy_volume / max(sell_volume, 1)`. A single-level imbalance is flagged when `imbalance_ratio >= threshold`. A stacked imbalance requires 3+ contiguous levels all above threshold. **Checkpoint:** Minimum stacked imbalance requires exactly 3+ contiguous levels and a combined net delta > 10 contracts for the entire stack; weaker stacks are recorded as "weak imbalances" but not used for signal generation.

5. **Compute Cumulative Delta** — Roll `buy_delta - sell_delta` across candles sequentially to build a cumulative delta time series. To detect divergence, identify swing highs and swing lows in price using a lookback of 5–10 bars, then check whether the cumulative delta at each swing point confirms or diverges from the price action. Bullish divergence: price makes a lower low while cumulative delta makes a higher low. Bearish divergence: price makes a higher high while cumulative delta makes a lower high. **Checkpoint:** A confirmed divergence signal requires at least 2 swing highs or lows in both price and cumulative delta over the last 100 candles minimum, with the delta inflection occurring within 5 bars of the price inflection point.

6. **Score Footprint Patterns** — Assign a conviction score from 0–100 combining four weighted factors: stacked imbalance presence (+30 points), delta divergence strength (+25 points), volume-at-single-price vs. average (+25 points, using Z-score > 2.0 at a single price level), and absorption signature (+20 points — repeated imbalances at the same level across multiple candles). **Checkpoint:** Scores >= 70 warrant immediate review and potential signal generation; scores <= 20 indicate weak or absent order flow signal and should be discarded unless corroborated by another independent factor.

---

## Implementation Patterns

### Pattern 1: Volume Delta Calculator (BAD vs. GOOD)

The volume delta is the foundation of all footprint analysis. The BAD example below fails to classify aggressor direction, leading to incorrect delta values that misrepresent market sentiment.

```python
"""
Module: data_pipeline/order_flow/delta_calculator.py
Purpose: Classify tick-level trades as buyer or seller initiated, then compute
         per-price-level delta for footprint chart generation.

APEX Convention: Data pipeline modules live under data_pipeline/ with clear
input/output contracts. Tests go in tests/test_order_flow_delta.py.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import List, Optional

logger = logging.getLogger(__name__)


@dataclass
class Tick:
    """Raw tick record from exchange time-and-sales feed."""
    timestamp: float        # Unix epoch seconds
    price: float            # Trade price
    size: int               # Number of contracts/shares traded
    side: Optional[str]     # 'buy', 'sell', or None (unresolved)

    @property
    def is_valid(self) -> bool:
        """Validate tick record has all required fields with sensible values."""
        return (self.price > 0 and self.size > 0 and
                self.timestamp > 0)


@dataclass
class ClassifiedTrade(Tick):
    """Tick with aggressor direction determined."""
    is_buyer_initiated: bool = False
    is_resolved: bool = True


@dataclass
class PriceLevelDelta:
    """Delta aggregated at a single price level within a candle."""
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
    def imbalance_ratio(self) -> float:
        """Bid-to-ask volume ratio at this price level."""
        if self.sell_volume == 0:
            return float(self.buy_volume) if self.buy_volume > 0 else 1.0
        return self.buy_volume / self.sell_volume


# ❌ BAD: No aggressor classification — delta is meaningless
def bad_compute_delta(ticks: List[Tick]) -> dict[float, int]:
    """Wrong: just sums sizes by price without distinguishing buyer vs seller."""
    delta_map: dict[float, int] = {}
    for tick in ticks:
        if not tick.is_valid:
            continue
        # This treats all volume as positive — no buy/sell distinction
        delta_map[tick.price] = delta_map.get(tick.price, 0) + tick.size
    return delta_map


# ✅ GOOD: Full aggressor classification with tick test and L2 midpoint fallback
def classify_ticks(
    ticks: List[Tick],
    l2_midpoints: Optional[dict[float, float]] = None
) -> list[ClassifiedTrade]:
    """Classify each trade as buyer-initiated or seller-initiated.

    Uses the uptick/downtick tick test as primary method. Falls back to L2
    midpoint comparison when available for locked market situations.

    Args:
        ticks: Raw tick records from exchange feed, ordered chronologically.
        l2_midpoints: Optional mapping of timestamps to bid/ask midpoints.

    Returns:
        List of ClassifiedTrade with is_buyer_initiated flag set.
        Unresolved trades are marked with is_resolved=False.
    """
    if not ticks:
        return []

    classified: list[ClassifiedTrade] = []
    prev_price: Optional[float] = None

    for i, tick in enumerate(ticks):
        if not tick.is_valid:
            logger.warning("Skipping invalid tick at index %d", i)
            continue

        is_buyer_initiated: bool
        is_resolved: bool = True

        if prev_price is None:
            # First tick — cannot determine direction via tick test
            is_buyer_initiated = False
            is_resolved = False
        elif tick.price > prev_price:
            is_buyer_initiated = True
        elif tick.price < prev_price:
            is_buyer_initiated = False
        else:
            # Locked market — use L2 midpoint as fallback
            if l2_midpoints and i in l2_midpoints:
                midpoint = l2_midpoints[i]
                is_buyer_initiated = tick.price >= midpoint
            else:
                is_buyer_initiated = False
                is_resolved = False

        classified.append(ClassifiedTrade(
            timestamp=tick.timestamp,
            price=tick.price,
            size=tick.size,
            side='buy' if is_buyer_initiated else 'sell',
            is_buyer_initiated=is_buyer_initiated,
            is_resolved=is_resolved,
        ))

        prev_price = tick.price

    return classified


def compute_price_level_deltas(
    trades: List[ClassifiedTrade],
    price_tick_size: float = 0.25
) -> dict[float, PriceLevelDelta]:
    """Aggregate buy/sell volume at each price level within the current window.

    Prices are rounded to the nearest tick size for consistent bucketing.

    Args:
        trades: Classifyed tick records with known aggressor direction.
        price_tick_size: Minimum price increment (e.g., 0.25 for ES futures).

    Returns:
        Mapping from rounded price to PriceLevelDelta containing volume breakdown.
    """
    deltas: dict[float, PriceLevelDelta] = {}

    for trade in trades:
        # Round price to tick size for consistent level bucketing
        rounded_price = round(trade.price / price_tick_size) * price_tick_size

        if rounded_price not in deltas:
            deltas[rounded_price] = PriceLevelDelta(price=rounded_price)

        if trade.is_buyer_initiated:
            deltas[rounded_price].buy_volume += trade.size
        else:
            deltas[rounded_price].sell_volume += trade.size

    return deltas


def validate_volume_integrity(
    computed_total: int,
    exchange_reported_total: int,
    tolerance_pct: float = 0.001
) -> bool:
    """Verify aggregated volume matches exchange-reported candle volume.

    Args:
        computed_total: Sum of all tick sizes after classification.
        exchange_reported_total: Total volume reported by the exchange for the candle.
        tolerance_pct: Maximum acceptable discrepancy (default 0.1%).

    Returns:
        True if volumes match within tolerance; False indicates data quality issue.
    """
    if exchange_reported_total == 0:
        return computed_total == 0

    discrepancy = abs(computed_total - exchange_reported_total) / exchange_reported_total
    return discrepancy <= tolerance_pct
```

---

### Pattern 2: Cumulative Delta & Divergence Detection

Cumulative delta tracks the running total of net buy/sell pressure. Divergence between price direction and cumulative delta trend is one of the strongest institutional footprints — it reveals hidden absorption that price alone cannot show.

```python
"""
Module: data_pipeline/order_flow/cumulative_delta.py
Purpose: Compute rolling cumulative delta from per-candle deltas and detect
         bullish/bearish divergence between price action and order flow.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import List, Tuple

logger = logging.getLogger(__name__)


@dataclass
class CandleDelta:
    """Net delta for a single candle at a given price level."""
    timestamp: float
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    buy_volume: int = 0
    sell_volume: int = 0

    @property
    def net_delta(self) -> int:
        return self.buy_volume - self.sell_volume


@dataclass
class CumulativeDeltaPoint:
    """A single point in the cumulative delta series."""
    timestamp: float
    candle_close: float
    cumulative_delta: int
    swing_type: str = "none"  # 'high', 'low', or 'none'

    @property
    def bullish_divergence(self) -> bool:
        """Higher low in delta while price made a lower low."""
        return self.swing_type == "low" and self.cumulative_delta > 0

    @property
    def bearish_divergence(self) -> bool:
        """Lower high in delta while price made a higher high."""
        return self.swing_type == "high" and self.cumulative_delta < 0


def compute_cumulative_delta(
    candles: List[CandleDelta],
) -> List[CumulativeDeltaPoint]:
    """Build cumulative delta time series from per-candle delta data.

    Rolls net_delta across all candles in chronological order to produce a
    single running total that reveals sustained buying or selling pressure.

    Args:
        candles: Ordered list of CandleDelta objects with buy/sell volume.

    Returns:
        List of CumulativeDeltaPoint with timestamp, price close, and
        running cumulative delta value.

    Raises:
        ValueError: If candles list is empty or not chronologically sorted.
    """
    if not candles:
        raise ValueError("Candles list must contain at least one candle")

    # Validate chronological ordering
    for i in range(1, len(candles)):
        if candles[i].timestamp < candles[i - 1].timestamp:
            raise ValueError(
                f"Candles must be sorted by timestamp. "
                f"Index {i} has earlier timestamp than index {i-1}"
            )

    cumulative = 0
    series: List[CumulativeDeltaPoint] = []

    for candle in candles:
        cumulative += candle.net_delta
        series.append(CumulativeDeltaPoint(
            timestamp=candle.timestamp,
            candle_close=candle.close_price,
            cumulative_delta=cumulative,
        ))

    return series


def identify_swings(
    series: List[CumulativeDeltaPoint],
    lookback: int = 5,
    min_candles_for_divergence: int = 100
) -> List[CumulativeDeltaPoint]:
    """Identify swing highs and swing lows in cumulative delta series.

    A swing high occurs when a point's delta is greater than all points in
    the lookback window on both sides. A swing low is the inverse. Only
    candles where the overall series has at least min_candles_for_divergence
    points are considered to ensure statistical significance.

    Args:
        series: Cumulative delta point series from compute_cumulative_delta().
        lookback: Number of bars before and after to check for swing confirmation.
        min_candles_for_divergence: Minimum series length to consider swings valid.

    Returns:
        Filtered list containing only swing high and swing low points with
        swing_type set to 'high' or 'low'.
    """
    if len(series) < min_candles_for_divergence:
        logger.info(
            "Series too short (%d < %d candles) for swing detection",
            len(series), min_candles_for_divergence
        )
        return []

    swings: List[CumulativeDeltaPoint] = []

    for i in range(lookback, len(series) - lookback):
        window_start = max(0, i - lookback)
        window_end = min(len(series), i + lookback + 1)
        window = series[window_start:window_end]

        current_delta = series[i].cumulative_delta
        other_deltas = [p.cumulative_delta for j, p in enumerate(window) if j != lookback]

        if not other_deltas:
            continue

        max_delta = max(other_deltas)
        min_delta = min(other_deltas)

        if current_delta > max_delta:
            series[i].swing_type = "high"
            swings.append(series[i])
        elif current_delta < min_delta:
            series[i].swing_type = "low"
            swings.append(series[i])

    return swings


def detect_divergence(
    price_swings: List[CumulativeDeltaPoint],  # Price swing points (reuse same structure)
    delta_swings: List[CumulativeDeltaPoint],
    max_bar_offset: int = 5,
) -> List[Tuple[CumulativeDeltaPoint, CumulativeDeltaPoint]]:
    """Detect bullish or bearish divergence between price swings and cumulative delta swings.

    Bullish divergence: price makes a lower low while cumulative delta makes a higher low
    within the specified bar offset window. Bearish divergence is the mirror pattern.

    Args:
        price_swings: Swing high/low points derived from price action.
        delta_swings: Swing high/low points from cumulative delta series.
        max_bar_offset: Maximum bars between corresponding price and delta swings.

    Returns:
        List of tuples containing (price_swing, delta_swing) pairs where divergence
        is confirmed. Empty list means no valid divergence detected in the window.
    """
    divergences: List[Tuple[CumulativeDeltaPoint, CumulativeDeltaPoint]] = []

    # Need at least 2 swing points of each type for confirmation
    price_lows = [s for s in price_swings if s.swing_type == "low"]
    delta_lows = [s for s in delta_swings if s.swing_type == "low"]
    price_highs = [s for s in price_swings if s.swing_type == "high"]
    delta_highs = [s for s in delta_swings if s.swing_type == "high"]

    # Bullish divergence: price lower low + delta higher low
    for i in range(1, len(price_lows)):
        prev_price_low = price_lows[i - 1]
        curr_price_low = price_lows[i]

        if (curr_price_low.candle_close < prev_price_low.candle_close and
                len(delta_lows) >= 2):
            # Find matching delta low within bar offset
            for j in range(len(delta_lows) - 1):
                prev_delta_low = delta_lows[j]
                curr_delta_low = delta_lows[j + 1]

                if (curr_delta_low.candle_close > prev_delta_low.candle_close and
                        abs(curr_price_low.timestamp - curr_delta_low.timestamp) <=
                        max_bar_offset * 60):  # Convert bars to seconds approximation
                    divergences.append((prev_price_low, prev_delta_low))

    # Bearish divergence: price higher high + delta lower high
    for i in range(1, len(price_highs)):
        prev_price_high = price_highs[i - 1]
        curr_price_high = price_highs[i]

        if (curr_price_high.candle_close > prev_price_high.candle_close and
                len(delta_highs) >= 2):
            for j in range(len(delta_highs) - 1):
                prev_delta_high = delta_highs[j]
                curr_delta_high = delta_highs[j + 1]

                if (curr_delta_high.candle_close < prev_delta_high.candle_close and
                        abs(curr_price_high.timestamp - curr_delta_high.timestamp) <=
                        max_bar_offset * 60):
                    divergences.append((prev_price_high, prev_delta_high))

    return divergences
```

---

### Pattern 3: Footprint Imbalance Pattern Detector

Stacked imbalances are among the most reliable institutional signatures in footprint data. They occur when aggressive market orders consume liquidity across multiple consecutive price levels in one direction, signaling a large participant accumulating or distributing a position. This pattern requires a minimum of 3 contiguous levels where the bid-to-ask volume ratio exceeds the configured threshold.

```python
"""
Module: data_pipeline/order_flow/imbalance_detector.py
Purpose: Detect single-level and stacked imbalances from footprint chart data,
         track absorption signatures across multiple candles, and score overall
         order flow conviction.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class ImbalanceLevel:
    """A single price level with a confirmed volume imbalance."""
    price: float
    buy_volume: int
    sell_volume: int
    ratio: float  # buy/sell ratio
    direction: str  # 'bid_imbalance' or 'ask_imbalance'

    @property
    def strength(self) -> float:
        """Return imbalance strength as excess volume percentage."""
        total = self.buy_volume + self.sell_volume
        if total == 0:
            return 0.0
        if self.direction == 'bid_imbalance':
            return (self.buy_volume - self.sell_volume) / total
        return (self.sell_volume - self.buy_volume) / total


@dataclass
class StackedImbalance:
    """A stack of contiguous price levels all showing imbalance in same direction."""
    levels: List[ImbalanceLevel] = field(default_factory=list)
    direction: str = "bid_imbalance"
    combined_delta: int = 0
    min_price: float = 0.0
    max_price: float = 0.0

    @property
    def is_valid(self, min_levels: int = 3, min_delta: int = 10) -> bool:
        """Check if stack meets minimum validity criteria."""
        return (len(self.levels) >= min_levels and
                abs(self.combined_delta) >= min_delta)

    @property
    def price_span(self) -> float:
        """Total price range covered by the stack."""
        return self.max_price - self.min_price

    @property
    def avg_ratio(self) -> float:
        """Average imbalance ratio across all levels in stack."""
        if not self.levels:
            return 0.0
        return sum(l.ratio for l in self.levels) / len(self.levels)


@dataclass
class FootprintScore:
    """Composite conviction score for a footprint signal."""
    stacked_imbalance_score: int = 0      # max 30 points
    divergence_score: int = 0             # max 25 points
    volume_concentration_score: int = 0   # max 25 points
    absorption_score: int = 0             # max 20 points
    total: int = 0

    @property
    def is_high_conviction(self) -> bool:
        return self.total >= 70

    @property
    def is_low_conviction(self) -> bool:
        return self.total <= 20

    def summary(self) -> str:
        """Human-readable score breakdown."""
        return (
            f"Footprint Score: {self.total}/100 "
            f"(stacked={self.stacked_imbalance_score}, "
            f"divergence={self.divergence_score}, "
            f"volume_conc={self.volume_concentration_score}, "
            f"absorption={self.absorption_score})"
        )


def detect_single_imbalances(
    price_deltas: Dict[float, Tuple[int, int]],
    threshold: float = 2.0,
) -> List[ImbalanceLevel]:
    """Detect single-level imbalances from per-price-level volume data.

    A bid imbalance exists when buy_volume / sell_volume >= threshold at a level.
    An ask imbalance exists when sell_volume / buy_volume >= threshold at a level.

    Args:
        price_deltas: Mapping from price to (buy_volume, sell_volume) tuple.
        threshold: Minimum bid-to-ask ratio for imbalance classification.

    Returns:
        List of ImbalanceLevel objects sorted by strength descending.
    """
    imbalances: List[ImbalanceLevel] = []

    for price, (buy_vol, sell_vol) in price_deltas.items():
        if buy_vol == 0 and sell_vol == 0:
            continue

        if sell_vol > 0 and buy_vol >= threshold * sell_vol:
            ratio = buy_vol / sell_vol
            imbalances.append(ImbalanceLevel(
                price=price,
                buy_volume=buy_vol,
                sell_volume=sell_vol,
                ratio=ratio,
                direction="bid_imbalance",
            ))
        elif buy_vol > 0 and sell_vol >= threshold * buy_vol:
            ratio = sell_vol / buy_vol
            imbalances.append(ImbalanceLevel(
                price=price,
                buy_volume=buy_vol,
                sell_volume=sell_vol,
                ratio=ratio,
                direction="ask_imbalance",
            ))

    imbalances.sort(key=lambda x: x.strength, reverse=True)
    return imbalances


def detect_stacked_imbalances(
    bid_imbalances: List[ImbalanceLevel],
    price_tick_size: float = 0.25,
    min_contiguous_levels: int = 3,
) -> List[StackedImbalance]:
    """Detect stacks of contiguous imbalance levels from a sorted list.

    Groups consecutive price levels (contiguous within tick size spacing) that
    all share the same imbalance direction into stacked imbalance formations.

    Args:
        bid_imbalances: Sorted list of ImbalanceLevel (bid or ask type).
        price_tick_size: Minimum price increment for contiguity check.
        min_contiguous_levels: Minimum levels required to form a valid stack.

    Returns:
        List of StackedImbalance objects, each containing 3+ contiguous levels.
        Only stacks meeting validity criteria are returned.
    """
    if len(bid_imbalances) < min_contiguous_levels:
        return []

    # Sort by price ascending for contiguity check
    sorted_levels = sorted(bid_imbalances, key=lambda x: x.price)

    stacks: List[StackedImbalance] = []
    current_stack: List[ImbalanceLevel] = [sorted_levels[0]]

    for i in range(1, len(sorted_levels)):
        prev = current_stack[-1]
        curr = sorted_levels[i]

        # Check if levels are contiguous (within expected tick spacing)
        price_gap = abs(curr.price - prev.price)
        expected_gap = price_tick_size

        if (price_gap <= expected_gap * 1.5 and  # Allow slight rounding variance
                curr.direction == current_stack[0].direction):
            current_stack.append(curr)
        else:
            # Finalize current stack if it meets minimums
            if len(current_stack) >= min_contiguous_levels:
                stack = _finalize_stack(current_stack)
                if stack.is_valid:
                    stacks.append(stack)
            current_stack = [curr]

    # Don't forget the final stack
    if len(current_stack) >= min_contiguous_levels:
        stack = _finalize_stack(current_stack)
        if stack.is_valid:
            stacks.append(stack)

    return stacks


def _finalize_stack(levels: List[ImbalanceLevel]) -> StackedImbalance:
    """Build a StackedImbalance from a list of contiguous imbalance levels."""
    direction = levels[0].direction
    buy_total = sum(l.buy_volume for l in levels)
    sell_total = sum(l.sell_volume for l in levels)

    stack = StackedImbalance(
        levels=levels,
        direction=direction,
        combined_delta=buy_total - sell_total,
        min_price=min(l.price for l in levels),
        max_price=max(l.price for l in levels),
    )
    return stack


def score_footprint_patterns(
    stacked_imbalances: List[StackedImbalance],
    divergence_count: int,
    single_price_volume: Optional[int] = None,
    avg_candle_volume: float = 1000.0,
    absorption_levels: Optional[Dict[float, int]] = None,
) -> FootprintScore:
    """Assign conviction score (0-100) from multiple footprint signal factors.

    Combines four weighted components:
      - Stacked imbalance presence (+30): based on number and strength of stacks
      - Delta divergence strength (+25): based on confirmed divergence count
      - Volume concentration (+25): Z-score of volume at single price vs average
      - Absorption signature (+20): repeated imbalances at same level

    Args:
        stacked_imbalances: Detected stacked imbalance formations.
        divergence_count: Number of confirmed bull/bear divergence events.
        single_price_volume: Volume at the highest-concentration price level.
        avg_candle_volume: Average candle volume for Z-score normalization.
        absorption_levels: Mapping of price to number of times imbalances
                          appeared at that level across consecutive candles.

    Returns:
        FootprintScore with component breakdown and total conviction score.
    """
    score = FootprintScore()

    # Stacked imbalance scoring (max 30)
    if stacked_imbalances:
        strong_stacks = [s for s in stacked_imbalances if len(s.levels) >= 4]
        valid_stacks = [s for s in stacked_imbalances if s.is_valid()]
        score.stacked_imbalance_score = min(30, int(len(valid_stacks) * 10 + len(strong_stacks) * 5))

    # Divergence scoring (max 25)
    if divergence_count >= 2:
        score.divergence_score = min(25, divergence_count * 8)

    # Volume concentration scoring (max 25) — Z-score based
    if single_price_volume and avg_candle_volume > 0:
        z_score = (single_price_volume - avg_candle_volume) / max(avg_candle_volume * 0.3, 1)
        if z_score >= 2.0:
            score.volume_concentration_score = min(25, int(z_score * 6))

    # Absorption scoring (max 20) — repeated levels across candles
    if absorption_levels:
        repeat_count = sum(1 for v in absorption_levels.values() if v >= 3)
        score.absorption_score = min(20, repeat_count * 5)

    score.total = (score.stacked_imbalance_score +
                   score.divergence_score +
                   score.volume_concentration_score +
                   score.absorption_score)

    return score
```

---

## Constraints

### MUST DO
- Always classify aggressor direction before computing any delta — never use raw volume without side attribution
- Use the tick test as primary method and L2 midpoint fallback for locked markets; mark unresolved trades explicitly
- Validate that aggregated per-level volumes match exchange-reported candle volume within 0.1% tolerance
- Require minimum 3 contiguous price levels with >2x ratio for any stacked imbalance to be considered a valid signal
- Confirm delta divergence requires at least 2 swing points in both price and cumulative delta over the last 100+ candles
- Score all footprint patterns on a 0–100 scale using the four weighted factors before generating any trade signal
- Log every unresolved tick (>5% of total triggers an alert) and every stacked imbalance detection with full level details

### MUST NOT DO
- Compute cumulative delta from OHLCV-only data without tick-level buy/sell volume — this is mathematically impossible to do correctly
- Count a single price level imbalance as a signal — always require multi-level confirmation (stacked) or corroborating evidence
- Use the same imbalance threshold (2x) across all markets without adjustment — micro-cap equities and crypto spot have different liquidity profiles; futures like CL require different thresholds than ES
- Ignore unresolved trade rates — silently discarding ambiguous trades biases delta toward whichever side happens to be classified more often by the tick test
- Generate signals solely from footprint data — always combine with price action context, known support/resistance, and broader market regime analysis
- Use raw cumulative delta values without normalization — a delta of +500 means very different things for ES futures versus a low-volume small-cap stock

---

## Output Template

When analyzing footprint charts and order flow data, produce:

1. **Aggressor Classification Summary** — Total ticks processed, resolved vs. unresolved counts, unresolved rate percentage (flag if > 5%)
2. **Per-Level Delta Table** — Price level, buy volume, sell volume, net delta, imbalance ratio for all levels with ratio >= threshold
3. **Stacked Imbalance Report** — Direction, number of contiguous levels, price span, combined net delta, average ratio per stack detected
4. **Cumulative Delta Divergence** — Type (bullish/bearish), price swing values, delta swing values, bar offset between inflection points, confirmation count
5. **Conviction Score Breakdown** — Four component scores, total score (0–100), high/low conviction flag, recommended action threshold
6. **Data Quality Notes** — Any volume discrepancies, feed gaps, or anomalies detected during processing

---

## Related Skills

| Skill | Purpose |
|---|---|
| `ai-order-flow-analysis` | AI-powered order flow interpretation combining footprint signals with LLM reasoning for contextual analysis |
| `data-order-book` | Order book (L2/L3) data handling and depth analysis — provides the L2 midpoints needed for locked market resolution |
| `technical-volume-profile` | Volume profile at price levels across multiple timeframes — provides broader context to evaluate whether footprint signals align with established value areas |

> 📖 skill(local cache): order-flow-footprint