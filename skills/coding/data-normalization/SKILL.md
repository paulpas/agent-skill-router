---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '''Provides Exchange data normalization layer: typed dataclasses for
  ticker/trade/orderbook, exchange-specific parsing, and symbol format standardization'''
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: null
  role: implementation
  scope: implementation
  triggers: data normalization, data-normalization, exchange, layer, typed
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
name: normalization
------
# Skill: coding-data-normalization

# Exchange data normalization layer: typed dataclasses for ticker/trade/orderbook, exchange-specific parsing, and symbol format standardization

## Role / Purpose

This skill covers how to normalize raw exchange data — arriving in wildly different shapes from Binance, Coinbase, Kraken, etc. — into a single canonical format. Normalization happens at the I/O boundary. Once inside the system, all code works with `NormalizedTicker`, `NormalizedTrade`, or `NormalizedOrderBook` and never reads exchange-specific field names.

