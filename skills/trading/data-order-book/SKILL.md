---
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
name: order-book
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

