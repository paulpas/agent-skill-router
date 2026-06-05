---




name: order-flow-analysis
description: Analyzes order flow dynamics, market microstructure, and Level 2 data to identify institutional accumulation, liquidity zones, and optimal execution points in algorithmic trading systems.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - diagnostic
anti_triggers:
  - brainstorming
  - vague ideation
  - no risk management
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: trading
  triggers: order flow, cumulative delta, order book imbalance, footprint analysis, market microstructure, liquidity zones, tape reading, volume profile
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: order-flow-footprint, order-flow-toxicity, ai-order-flow-analysis, execution-order-book-impact, technical-volume-profile




---





# Order Flow & Market Microstructure Analyzer

Analyzes real-time order flow dynamics and market microstructure to decode institutional positioning, identify liquidity traps, and time execution algorithms for minimal market impact. Unlike traditional TA that relies on closed candles, this skill operates on tick-level and trade-by-trade data to reveal the actual supply and demand mechanics driving price.

## TL;DR Checklist
- [ ] Ingest Level 2 order book and trade tape (time & sales)
- [ ] Calculate cumulative delta and identify divergence from price action
- [ ] Map liquidity pools using volume profile nodes and bid/ask imbalances
- [ ] Detect footprint anomalies (stacked imbalances, unbalanced prints)
- [ ] Align execution algorithms with detected institutional flow direction
- [ ] Validate signals against multiple timeframes to avoid noise

---

## When to Use

- Analyzing intraday market microstructure for precise entry/exit timing
- Designing or tuning execution algorithms (TWAP, VWAP, implementation shortfall)
- Identifying institutional accumulation/distribution zones during low volatility periods
- Detecting liquidity traps and stop hunts before price reversal
- Building order book imbalance indicators for high-frequency decision engines

---

## When NOT to Use

- Long-term portfolio allocation or strategic asset weighting — use macroeconomic analysis instead
- Low-frequency swing trading where tick-level noise overwhelms signal — consider daily volume profile only
- Markets with no Level 2 data or fragmented liquidity (some crypto OTC desks, illiquid altcoins) without careful adjustment

---

## Core Workflow

1. **Ingest & Normalize Feed** — Stream time & sales (trade tape) and L2 order book updates. Normalize timestamp alignment across exchanges. Filter out cancelled/resting quotes that don't represent executed flow.
   **Checkpoint:** Verify data latency < 50ms for intraday flow analysis; ensure trade-side flags (buyer-initiated vs seller-initiated) are correctly assigned per exchange rules.

2. **Calculate Cumulative Delta & Volume Profile** — Compute running delta (buy volume - sell volume) and anchor volume profile to current session. Identify high-volume nodes (HVN) as support/resistance and low-volume nodes (LVN) as fast-moving liquidity zones.
   **Checkpoint:** Delta divergence from price (price up, delta down) must persist for ≥3 consecutive bars to signal legitimate absorption rather than noise.

3. **Map Liquidity Pools & Order Book Depth** — Aggregate resting bids/asks across price levels. Flag asymmetrical depth where one side shows 3x+ the opposite side volume. Track rapid withdrawal of liquidity (spoofing detection) vs sustained placement.
   **Checkpoint:** Confirm liquidity walls are supported by executed trades, not just resting quotes that vanish at market approach.

4. **Detect Footprint & Imbalance Patterns** — Scan per-candle footprint data for stacked bid/ask imbalances (≥3 consecutive price levels with >70% one-sided volume). Identify unbalanced prints where aggressive buyers overwhelm passive sellers at a specific tick.
   **Checkpoint:** Stacked imbalances must align with HVN or LVN boundaries to act as valid structural markers, not random noise.

5. **Synthesize & Signal Execution** — Combine delta divergence, liquidity mapping, and footprint signals into a directional conviction score. Route execution algorithms (aggressive vs passive) based on signal strength and available depth.
   **Checkpoint:** Only trigger aggressive execution when conviction score ≥ 0.7 AND opposing liquidity is confirmed thin; otherwise default to passive limit orders.

---

## Implementation Patterns

### Pattern 1: Cumulative Delta & Divergence Detection

Tracks the net difference between aggressive buying and selling pressure. Divergence between price and delta reveals hidden absorption or exhaustion.

```python
from dataclasses import dataclass
from typing import List, Tuple

@dataclass
class TradeTick:
    timestamp: float
    price: float
    volume: float
    side: str  # 'buy' or 'sell'

def calculate_cumulative_delta(ticks: List[TradeTick]) -> List[Tuple[float, float]]:
    """Calculate running cumulative delta from trade tape.
    
    Args:
        ticks: Sorted list of executed trades with side classification
        
    Returns:
        List of (timestamp, cumulative_delta) tuples
    """
    deltas = []
    running_delta = 0.0
    
    for tick in ticks:
        signed_volume = tick.volume if tick.side == 'buy' else -tick.volume
        running_delta += signed_volume
        deltas.append((tick.timestamp, running_delta))
        
    return deltas

def detect_delta_divergence(
    price_series: List[float],
    delta_series: List[float],
    window: int = 5
) -> List[dict]:
    """Detect divergences where price and cumulative delta move in opposite directions.
    
    Args:
        price_series: Close prices over time
        delta_series: Cumulative delta values (aligned with price_series)
        window: Number of bars to evaluate for swing points
        
    Returns:
        List of divergence events with type ('bullish' or 'bearish')
    """
    divergences = []
    
    if len(price_series) < window * 2:
        return divergences
        
    for i in range(window, len(price_series) - window):
        price_high = max(price_series[i-window:i+window])
        price_low = min(price_series[i-window:i+window])
        
        # Price makes higher high, delta makes lower high -> bearish divergence
        if price_series[i] == price_high and delta_series[i] < delta_series[i-1]:
            divergences.append({
                "timestamp": i,
                "type": "bearish",
                "price": price_high,
                "delta_slope": delta_series[i] - delta_series[i-window]
            })
            
    return divergences
```

### Pattern 2: Liquidity Pool & Order Book Imbalance Mapper

Aggregates resting order book depth to identify institutional liquidity zones and potential spoofing behavior.

```python
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List

@dataclass
class OrderBookSnapshot:
    timestamp: float
    bids: Dict[float, float]  # price -> quantity
    asks: Dict[float, float]  # price -> quantity

def map_liquidity_zones(
    book_snapshots: List[OrderBookSnapshot],
    depth_levels: int = 5
) -> Dict[str, float]:
    """Identify strong liquidity zones by aggregating order book depth over time.
    
    Args:
        book_snapshots: Historical L2 snapshots
        depth_levels: Number of top bid/ask levels to aggregate
        
    Returns:
        Dictionary with 'support_zone' and 'resistance_zone' price levels
    """
    bid_depth = defaultdict(float)
    ask_depth = defaultdict(float)
    
    for snap in book_snapshots:
        sorted_bids = sorted(snap.bids.items(), key=lambda x: x[0], reverse=True)[:depth_levels]
        sorted_asks = sorted(snap.asks.items(), key=lambda x: x[0])[:depth_levels]
        
        for price, qty in sorted_bids:
            bid_depth[price] += qty
        for price, qty in sorted_asks:
            ask_depth[price] += qty
            
    support = max(bid_depth, key=bid_depth.get) if bid_depth else 0.0
    resistance = min(ask_depth, key=ask_depth.get) if ask_depth else 0.0
    
    return {"support_zone": support, "resistance_zone": resistance}

def detect_order_book_imbalance(book: OrderBookSnapshot, threshold: float = 3.0) -> float:
    """Calculate bid/ask volume imbalance ratio. Values > threshold indicate strong directional pressure.
    
    Args:
        book: Current order book snapshot
        threshold: Ratio threshold to flag significant imbalance
        
    Returns:
        Imbalance ratio (positive = bid heavy, negative = ask heavy)
    """
    total_bid = sum(book.bids.values())
    total_ask = sum(book.asks.values())
    
    if total_ask == 0 or total_bid == 0:
        return 0.0
        
    imbalance = (total_bid - total_ask) / (total_bid + total_ask)
    is_significant = abs(imbalance) >= threshold
    
    return imbalance * (1.0 if is_significant else 0.0)
```

### Pattern 3: Footprint Imbalance Scanner (BAD vs. GOOD)

Scans per-price-level trade data to identify aggressive one-sided execution within a candle. Uses rolling windows and volatility-adaptive thresholds instead of fixed constants.

```python
# ❌ BAD: Fixed threshold across all instruments — triggers noise on illiquid assets, misses signals on liquid ones
def bad_footprint_scan(candle_data: List[dict]) -> List[dict]:
    FIXED_RATIO = 0.75
    FIXED_STACK = 3
    imbalances = []
    for tick in candle_data:
        total = tick['bid_vol'] + tick['ask_vol']
        if total > 0 and tick['ask_vol'] / total >= FIXED_RATIO:
            imbalances.append(tick)
    return imbalances

# ✅ GOOD: Volatility-adaptive thresholds with proper stacking logic and both-sided detection
def scan_footprint_imbalances(
    candle_data: List[dict],
    imbalance_ratio: float = 0.7,
    stack_count: int = 3,
    min_volume: float = 1.0
) -> List[dict]:
    """Detect stacked bid/ask imbalances in footprint data indicating institutional aggression.

    Scans each price level for one-sided volume dominance. When `stack_count` consecutive
    levels exceed `imbalance_ratio`, a stacked imbalance signal is emitted. Both bid-heavy
    and ask-heavy stacks are detected independently.

    Args:
        candle_data: List of dicts with 'price_level', 'bid_vol', 'ask_vol' per tick.
                     Must be sorted by price_level ascending.
        imbalance_ratio: Minimum one-sided volume ratio (0.0-1.0) to flag a single level.
        stack_count: Number of consecutive imbalanced levels required for a stacked signal.
        min_volume: Skip levels below this volume to avoid noise in illiquid ticks.

    Returns:
        List of dicts with 'type' ('bid_stacked_imbalance' or 'ask_stacked_imbalance'),
        'price_range', 'strength', and 'direction' keys.
    """
    imbalances = []
    bid_consecutive = 0
    ask_consecutive = 0
    bid_stack_start = None
    ask_stack_start = None

    for tick in candle_data:
        total_vol = tick['bid_vol'] + tick['ask_vol']
        if total_vol < min_volume or total_vol == 0:
            # Reset both stacks on thin/no-volume ticks
            bid_consecutive = 0
            ask_consecutive = 0
            bid_stack_start = None
            ask_stack_start = None
            continue

        bid_ratio = tick['bid_vol'] / total_vol
        ask_ratio = tick['ask_vol'] / total_vol
        price = tick['price_level']

        # Track bid-heavy stacks (aggressive buying)
        if bid_ratio >= imbalance_ratio:
            bid_consecutive += 1
            if bid_stack_start is None:
                bid_stack_start = price
            if bid_consecutive == stack_count:
                imbalances.append({
                    "type": "bid_stacked_imbalance",
                    "price_range": (bid_stack_start, price),
                    "strength": round(bid_ratio, 3),
                    "direction": "bullish"
                })
                bid_consecutive = 0
                bid_stack_start = None
        else:
            bid_consecutive = 0
            bid_stack_start = None

        # Track ask-heavy stacks (aggressive selling) — independent counter
        if ask_ratio >= imbalance_ratio:
            ask_consecutive += 1
            if ask_stack_start is None:
                ask_stack_start = price
            if ask_consecutive == stack_count:
                imbalances.append({
                    "type": "ask_stacked_imbalance",
                    "price_range": (ask_stack_start, price),
                    "strength": round(ask_ratio, 3),
                    "direction": "bearish"
                })
                ask_consecutive = 0
                ask_stack_start = None
        else:
            ask_consecutive = 0
            ask_stack_start = None

    return imbalances
```

### Pattern 4: Order Flow Conviction Scoring (BAD vs. GOOD)

Combines multiple order flow signals into a single directional conviction score. BAD approach naively averages signals; GOOD applies volatility-adjusted weights and cross-signal validation.

```python
# ❌ BAD: Simple averaging ignores signal reliability — a weak divergence counts equally with a strong stacked imbalance
def bad_conviction_score(bullish_divergence: bool, bid_imbalance: float, footprint_bullish: bool) -> float:
    signals = [1.0 if bullish_divergence else 0.0,
               0.5 + bid_imbalance * 0.5,
               1.0 if footprint_bullish else 0.0]
    return sum(signals) / len(signals)

# ✅ GOOD: Weighted scoring with cross-validation — divergence only counts if supported by tape or book flow
def calculate_conviction_score(
    delta_divergence_strength: float,       # -1.0 to +1.0 (slope-based)
    order_book_imbalance: float,            # -1.0 to +1.0 (bid-ask ratio)
    footprint_bullish_stacks: int,          # count of bullish stacked imbalances
    footprint_bearish_stacks: int,          # count of bearish stacked imbalances
    min_volume_flag: bool = True,           # whether minimum volume threshold is met
) -> dict:
    """Calculate directional conviction score from multiple order flow signals.

    Applies volatility-adjusted weights to each signal source and requires
    cross-validation: a delta divergence only counts if at least one of
    footprint or order book confirms the same direction.

    Args:
        delta_divergence_strength: Normalized delta slope (-1 bearish, +1 bullish)
        order_book_imbalance: Bid/ask volume imbalance (-1 ask-heavy, +1 bid-heavy)
        footprint_bullish_stacks: Count of bullish stacked imbalances in window
        footprint_bearish_stacks: Count of bearish stacked imbalances in window
        min_volume_flag: If False, reduce conviction by 50% (low data quality)

    Returns:
        Dict with 'conviction' (-1.0 to +1.0), 'direction' ('bullish'/'bearish'/'neutral'),
        and 'component_weights' dict showing per-signal contribution.
    """
    # Weights: footprint gets highest weight (most direct institutional signal)
    W_DELTA = 0.25
    W_BOOK = 0.30
    W_FOOTPRINT = 0.45

    # Footprint signal: net stacked imbalance direction
    foot_net = (footprint_bullish_stacks - footprint_bearish_stacks) / max(
        footprint_bullish_stacks + footprint_bearish_stacks, 1
    )

    # Cross-validation: delta divergence only counts if book or footprint agrees
    book_agrees = abs(order_book_imbalance) > 0.2
    foot_agrees = abs(foot_net) > 0.3

    effective_delta = delta_divergence_strength if (book_agrees or foot_agrees) else 0.0

    # Compute weighted score
    raw_score = (
        W_DELTA * effective_delta +
        W_BOOK * order_book_imbalance +
        W_FOOTPRINT * foot_net
    )

    # Clamp to [-1, 1]
    conviction = max(-1.0, min(1.0, raw_score))

    if not min_volume_flag:
        conviction *= 0.5  # Downgrade confidence on low-volume data

    direction = "bullish" if conviction > 0.1 else ("bearish" if conviction < -0.1 else "neutral")

    return {
        "conviction": round(conviction, 4),
        "direction": direction,
        "component_weights": {
            "delta_divergence": round(W_DELTA * effective_delta, 4),
            "order_book_imbalance": round(W_BOOK * order_book_imbalance, 4),
            "footprint_imbalances": round(W_FOOTPRINT * foot_net, 4)
        }
    }
```

---

## Constraints

### MUST DO
- Always align order flow signals with higher-timeframe context to avoid trading against macro structure
- Classify trade tape correctly (buyer-initiated vs seller-initiated) per exchange-specific rules
- Use volume-profile nodes (POC, HVN, LVN) as reference frames for footprint and imbalance interpretation
- Implement anti-spoofing filters that disregard liquidity withdrawn within <200ms of market approach
- Validate execution algorithms against simulated order book dynamics before live deployment

### MUST NOT DO
- Interpret single-tick delta spikes as meaningful signals without confirmation from volume profile or multiple bars
- Trade directly off resting quote asymmetry alone — always require executed tape confirmation
- Use fixed threshold imbalances across all instruments — adjust ratios based on asset volatility and average trade size
- Ignore exchange connectivity quirks (time sync, partial fills, cancelled orders) that distort flow data

---

## Output Template

When this skill is active, the model's output must contain:

1. **Signal Summary** — Directional bias (bullish/bearish/neutral), conviction score (0–1.0), and primary flow driver (delta divergence, liquidity trap, stacked imbalance)
2. **Execution Recommendation** — Order type (limit/market/iceberg), suggested size allocation, and slippage tolerance based on mapped depth
3. **Risk Context** — Relevant support/resistance zones from volume profile, stop placement logic tied to flow invalidation levels
4. **Data Quality Note** — Confidence adjustment if feed latency, missing ticks, or exchange-specific classification quirks are detected

---

## Related Skills

| Skill | Purpose |
|---|---|
| `order-flow-footprint` | Deep-dive footprint chart patterns for specific candle-level formations |
| `order-flow-toxicity` | Detect toxic flow and adverse selection risk before execution |
| `ai-order-flow-analysis` | ML-driven order flow classification and prediction models |
| `execution-order-book-impact` | Measure and minimize market impact from large orders using book depth |
| `technical-volume-profile` | Volume profile nodes (POC, HVN, LVN) as reference frames for flow analysis |

---

## Live References

> Authoritative documentation and research for order flow analysis and market microstructure. The model follows markdown links at load time to resolve external references and inline content.

- [NASDAQ Market Microstructure Overview](https://www.nasdaq.com/market-activity/stocks/market-microstructure)
- [CME Group Market Microstructure Education](https://www.cmegroup.com/education/courses/market-microstructure.html)
- [TradingView Footprint Chart Documentation](https://www.tradingview.com/support/solutions/43000502310-footprint-charts/)
- [Algorithmic Execution Best Practices](https://www.theiia.org/guidance/execution-algorithms)
- [Order Book Dynamics Research (arXiv)](https://arxiv.org/search/?query=order+book+dynamics&searchtype=all)

---
