---
name: order-flow-analysis
description: Analyzes tick-level order flow data to compute delta, volume profile,
  footprint patterns, absorption signatures, and conviction scoring for institutional
  activity detection.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  triggers: order flow, footprint charts, delta analysis, cumulative delta, volume
    profile, trade absorption, iceberg orders, order book imbalance
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
  - do-dont
  - examples
  related-skills: risk-stop-loss, risk-position-sizing, signals-module
------

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

