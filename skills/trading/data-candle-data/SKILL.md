---
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
name: candle-data
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

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Pandas Time Series OHLC Documentation](https://pandas.pydata.org/docs/user_guide/timeseries.html#ohlc-data)
- [Candlestick Pattern Recognition](https://www.investopedia.com/trading/candlestick-patterns-trading/)
- [OHLC Data Processing with Python](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.resample.html)
- [Volume-Weighted OHLC Aggregation](https://pandas.pydata.org/docs/user_guide/timeseries.html#resampling)
- [Candlestick Charting in Python](https://plotly.com/python/candlestick-charts/)
