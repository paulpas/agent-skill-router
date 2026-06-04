---
name: data-order-book
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- config
- do-dont
description: '"Order book data handling, spread calculation, liquidity measurement"
  and cross-exchange normalization'
license: MIT
maturity: stable
metadata:
  domain: trading
  output-format: code
  related-skills: ai-order-flow-analysis, exchange-order-execution-api, fundamentals-market-structure,
    technical-market-microstructure
  role: implementation
  scope: implementation
  triggers: calculation, data order book, data-order-book, handling, spread
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
# Order Book Data Pipeline: The 5 Laws of Liquidity Analysis

**Role:** Market Microstructure Engineer — applies to order book data processing, spread analysis, liquidity measurement, and exchange normalization for algorithmic trading.

**Philosophy:** Order is Law — the order book represents the true state of market liquidity. Preserve all levels, validate每一 level's integrity, and make illegal states unrepresentable.

## The 5 Laws

### 1. The Law of the Early Exit (Guard Clauses)
- **Concept:** An order book with misaligned levels or invalid prices is not just "bad data" — it's a corrupted state.
- **Rule:** Validate order book structure at the boundary. Reject books with mismatched bid/ask levels or invalid price/size pairs.
- **Practice:** `if not self._is_valid_order_book(): raise InvalidOrderBookError`

### 2. Make Illegal States Unrepresentable (Parse, Don't Validate)
- **Concept:** A bid price > ask price indicates an arbitrage opportunity that cannot persist in a valid market.
- **Rule:** Parse order book data into structures that cannot represent invalid states. Use dataclasses/Pydantic with validation.
- **Why:** Prevents entire classes of bugs where crossed/locked markets propagate through calculations.

### 3. The Law of Atomic Predictability
- **Concept:** Order book snapshots must be deterministic. Same market state = same book, always.
- **Rule:** Order book processing functions should be pure. No shared state, no side effects.
- **Defense:** Avoid in-place modifications. Return new book structures from any transformations.

### 4. The Law of "Fail Fast, Fail Loud"
- **Concept:** Trading against a crossed/locked market can cause catastrophic losses.
- **Rule:** If order book cannot be validated, halt immediately with a descriptive error. Do not attempt to "fix" invalid orders.
- **Result:** Trading systems only act on validated, consistent order book state.

### 5. The Law of Intentional Naming
- **Concept:** Level 2 vs Level 3 order book terminology is confusing.
- **Rule:** Use clear, consistent terminology. `OrderBookLevel` with explicit `price`, `size`, `order_count` not `bids[0]`, `asks[0]`.
- **Defense:** `order_book_depth` instead of `book_size` to avoid confusion with exchange depth metrics.


---

---

## Core Workflow

1. **Ingest Order Book Data** — Receive order book snapshots via REST API (polling) or incremental updates via WebSocket (push). Normalize all entries to a standard format: side (bid/ask), price, size (total quantity at that level), and optionally order count for depth analysis.
   **Checkpoint:** Verify that the incoming message contains valid side, price > 0, and size >= 0 fields before processing.

2. **Maintain Order Book State** — Keep an in-memory representation of bid and ask levels sorted by price (bids descending, asks ascending). Apply incremental delta updates to the snapshot rather than re-fetching the full book on every update.
   **Checkpoint:** After applying deltas, verify that the book remains consistent: no negative sizes, prices are monotonic within each side.

3. **Calculate Key Metrics** — Compute spread (best ask − best bid), mid price ((best bid + best ask) / 2), and depth profiles (cumulative size at N levels or $X distance from mid). Track these metrics as time-series for later analysis.
   **Checkpoint:** Spread should be non-negative; if negative, the book is crossed/locked and must be flagged immediately.

4. **Handle Invalid States** — When a delta would create an invalid state (e.g., remove a price level that doesn't exist), log the anomaly and discard the malformed update rather than corrupting the book. Implement a periodic full-resync with the exchange to recover from drift.
   **Checkpoint:** Resync interval should not exceed 60 seconds for live trading books; longer gaps risk stale data.

5. **Export for Analysis** — Persist order book snapshots and metric calculations to a time-series database or Parquet files. Include metadata: symbol, exchange, timestamp, spread, mid price, bid_depth_10, ask_depth_10.
   **Checkpoint:** Every snapshot must include a version number and checksum for integrity verification during analysis.

---

## Implementation Patterns

### Pattern 1: Order Book State Management with Incremental Updates

```python
from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class OrderBookLevel:
    """Immutable single price level in an order book."""
    price: float
    size: float
    order_count: int = 0

    @property
    def notional(self) -> float:
        return self.price * self.size


@dataclass(frozen=True)
class OrderBookSnapshot:
    """Immutable snapshot of a complete order book at a point in time."""
    symbol: str
    exchange: str
    timestamp: datetime
    bids: list[OrderBookLevel] = field(default_factory=list)
    asks: list[OrderBookLevel] = field(default_factory=list)

    @property
    def best_bid(self) -> Optional[float]:
        return self.bids[0].price if self.bids else None

    @property
    def best_ask(self) -> Optional[float]:
        return self.asks[0].price if self.asks else None

    @property
    def spread(self) -> Optional[float]:
        if self.best_bid is not None and self.best_ask is not None:
            return self.best_ask - self.best_bid
        return None

    @property
    def mid_price(self) -> Optional[float]:
        if self.best_bid is not None and self.best_ask is not None:
            return (self.best_bid + self.best_ask) / 2.0
        return None

    @property
    def is_crossed(self) -> bool:
        """Check if bids cross above asks (arbitrage opportunity or invalid state)."""
        return self.best_bid is not None and self.best_ask is not None and self.best_bid > self.best_ask


class OrderBookState:
    """In-memory order book with incremental update support."""

    def __init__(self, symbol: str, exchange: str):
        self.symbol = symbol
        self.exchange = exchange
        self._bids: dict[float, float] = {}  # price → total size
        self._asks: dict[float, float] = {}
        self._last_sequence: int = 0

    def apply_snapshot(
        self,
        bids: list[tuple[float, float]],
        asks: list[tuple[float, float]],
        sequence: int,
    ) -> None:
        """Replace the entire book with a full snapshot from the exchange.

        Args:
            bids: List of (price, size) tuples for bid side.
            asks: List of (price, size) tuples for ask side.
            sequence: Sequence number for drift detection.
        """
        self._bids = {p: s for p, s in bids if s > 0}
        self._asks = {p: s for p, s in asks if s > 0}
        self._last_sequence = sequence

        # Validate snapshot integrity
        if not self._is_valid_book():
            logger.error(
                "Invalid order book snapshot received for %s on %s",
                self.symbol, self.exchange,
            )

    def apply_delta(
        self,
        side: str,
        price: float,
        size: float,
        sequence: int,
    ) -> bool:
        """Apply a single order book delta (update or removal).

        Args:
            side: "bid" or "ask".
            price: Price level to update.
            size: New total size at that level (0 = remove).
            sequence: Sequence number for ordering.

        Returns:
            True if the delta was applied successfully, False if rejected.
        """
        # Validate sequence ordering
        if sequence <= self._last_sequence:
            logger.warning("Out-of-sequence delta received: %d <= %d", sequence, self._last_sequence)
            return False

        book = self._bids if side == "bid" else self._asks

        if size <= 0:
            # Removal: remove the price level from the book
            if price in book:
                del book[price]
            else:
                logger.warning(
                    "Delta attempts to remove non-existent price level: %s @ %.6f",
                    side, price,
                )
        else:
            # Update: set the new size at this price level
            book[price] = size

        self._last_sequence = sequence
        return True

    def get_snapshot(self) -> OrderBookSnapshot:
        """Build an OrderBookSnapshot from current state."""
        bids_sorted = sorted(
            [(p, s) for p, s in self._bids.items() if s > 0],
            key=lambda x: -x[0],  # Descending price
        )
        asks_sorted = sorted(
            [(p, s) for p, s in self._asks.items() if s > 0],
            key=lambda x: x[0],  # Ascending price
        )

        return OrderBookSnapshot(
            symbol=self.symbol,
            exchange=self.exchange,
            timestamp=datetime.now(timezone.utc),
            bids=[OrderBookLevel(price=p, size=s) for p, s in bids_sorted[:20]],
            asks=[OrderBookLevel(price=p, size=s) for p, s in asks_sorted[:20]],
        )

    def get_depth(self, levels: int = 10) -> dict[str, float]:
        """Calculate cumulative depth at N best levels on each side."""
        bids = sorted(self._bids.items(), key=lambda x: -x[0])[:levels]
        asks = sorted(self._asks.items(), key=lambda x: x[0])[:levels]

        return {
            "bid_depth_notional": sum(p * s for p, s in bids),
            "ask_depth_notional": sum(p * s for p, s in asks),
            "bid_depth_levels": len(bids),
            "ask_depth_levels": len(asks),
        }

    def _is_valid_book(self) -> bool:
        """Validate internal book state consistency."""
        bid_prices = sorted(self._bids.keys(), reverse=True)
        ask_prices = sorted(self._asks.keys())

        if bid_prices and ask_prices:
            best_bid = bid_prices[0]
            best_ask = ask_prices[0]
            # Crossed market detection
            if best_bid > best_ask:
                logger.warning("Crossed book detected: bid=%.4f > ask=%.4f", best_bid, best_ask)

        return True
```

### Pattern 2: Spread Analysis and Liquidity Scoring

```python
def compute_spread_metrics(
    snapshot: OrderBookSnapshot,
    quote_currency: str = "USDT",
) -> dict:
    """Calculate spread-related metrics for a given order book snapshot.

    Args:
        snapshot: Validated order book snapshot.
        quote_currency: Quote currency for percentage calculations.

    Returns:
        Dict with absolute spread, relative spread, mid price, and liquidity score.
    """
    if snapshot.spread is None or snapshot.mid_price is None:
        return {"error": "insufficient_book_data"}

    spread = snapshot.spread
    mid = snapshot.mid_price

    # Relative spread as a percentage of mid price
    relative_spread = (spread / mid) * 100 if mid > 0 else float("inf")

    # Liquidity score: 0-100 based on spread tightness and depth
    # Tighter spread + deeper book = higher score
    depth_score = min(50, snapshot.get_depth(20)["bid_depth_notional"] / 1_000_000 * 50)
    spread_score = max(0, 50 - (relative_spread * 100))  # Lower spread = higher score

    return {
        "spread_absolute": round(spread, 6),
        "spread_relative_pct": round(relative_spread, 4),
        "mid_price": round(mid, 6),
        "best_bid": snapshot.best_bid,
        "best_ask": snapshot.best_ask,
        "liquidity_score": round(depth_score + spread_score, 1),
        "timestamp": snapshot.timestamp.isoformat(),
    }


def calculate_liquidity_imbalance(
    snapshot: OrderBookSnapshot,
    depth_levels: int = 5,
) -> float:
    """Calculate order book imbalance ratio between bids and asks.

    Returns a value between -1 (all ask pressure) and +1 (all bid pressure).
    A value near 0 indicates balanced liquidity on both sides.

    Formula: (bid_depth - ask_depth) / (bid_depth + ask_depth)

    Args:
        snapshot: Validated order book snapshot.
        depth_levels: Number of best levels to include in the calculation.

    Returns:
        Float between -1.0 and +1.0 representing liquidity imbalance.
    """
    if not snapshot.bids or not snapshot.asks:
        return 0.0

    bid_total = sum(level.notional for level in snapshot.bids[:depth_levels])
    ask_total = sum(level.notional for level in snapshot.asks[:depth_levels])

    total = bid_total + ask_total
    if total == 0:
        return 0.0

    imbalance = (bid_total - ask_total) / total
    return round(max(-1.0, min(1.0, imbalance)), 4)
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

- [Order Book Analysis Tutorial](https://docs.quantconnect.com/tutorials/order-book-analysis)
- [Limit Order Book Dynamics](https://en.wikipedia.org/wiki/Limit_order_book)
- [Order Book Reconstruction Methods](https://arxiv.org/abs/1805.01469)
- [Market Microstructure Data Processing](https://www.investopedia.com/terms/m/market-microstructure.asp)
- [High-Frequency Order Book Data](https://docs.quantconnect.com/dataset/overview)
