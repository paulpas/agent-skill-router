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

