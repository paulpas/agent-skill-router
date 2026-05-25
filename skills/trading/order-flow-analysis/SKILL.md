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
  triggers: order flow, order book, liquidity analysis, market microstructure, footprint charts, cumulative delta, volume profile, level 2 data, tape reading, imbalance detection
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: risk-stop-loss, trading-execution-twap-slw, signals-module
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

### Pattern 3: Footprint Imbalance Scanner

Scans per-price-level trade data to identify aggressive one-sided execution within a candle.

```python
def scan_footprint_imbalances(
    candle_data: List[dict],
    imbalance_ratio: float = 0.7,
    stack_count: int = 3
) -> List[dict]:
    """Detect stacked imbalances in footprint data indicating institutional aggression.
    
    Args:
        candle_data: List of dicts with 'price_level', 'bid_vol', 'ask_vol' per tick
        imbalance_ratio: Minimum one-sided volume ratio to flag imbalance
        stack_count: Consequent levels required for stacked imbalance
        
    Returns:
        List of detected imbalance events with price location and strength
    """
    imbalances = []
    consecutive_count = 0
    stack_start_price = None
    
    for tick in candle_data:
        total_vol = tick['bid_vol'] + tick['ask_vol']
        if total_vol == 0:
            continue
            
        ask_ratio = tick['ask_vol'] / total_vol
        
        if ask_ratio >= imbalance_ratio:
            consecutive_count += 1
            if stack_start_price is None:
                stack_start_price = tick['price_level']
                
            if consecutive_count == stack_count:
                imbalances.append({
                    "type": "bid_stacked_imbalance",
                    "price_range": (stack_start_price, tick['price_level']),
                    "strength": ask_ratio
                })
                consecutive_count = 0
                stack_start_price = None
        else:
            consecutive_count = 0
            stack_start_price = None
            
    return imbalances
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
| `risk-stop-loss` | Layer execution-invalidation stops over order flow signals |
| `trading-execution-twap-slw` | Route to traditional time/volume algorithms when flow signal is low-conviction |
| `signals-module` | Aggregate order flow conviction scores with AI prediction engine |

---

## Live References

> Authoritative documentation and research for order flow analysis and market microstructure. The model follows markdown links at load time to resolve external references.

- [NASDAQ Market Microstructure Overview](https://www.nasdaq.com/community/articles/market-microstructure-explained)
- [CME Group Footprint & Order Flow Guide](https://www.cmegroup.com/education/courses/market-microstructure.html)
- [Algorithmic Execution Best Practices (IIA)](https://www.theiia.org/guidance/execution-algorithms)
- [Order Book Dynamics Research Papers](https://arxiv.org/search/?query=order+book+dynamics&searchtype=all)
- [TradingView Footprint Chart Documentation](https://www.tradingview.com/support/solutions/43000502310-footprint-charts/)

---
