---
name: order-flow-toxicity
description: Detects toxic (informed) order flow using VPIN, PIN models, and adverse
  selection metrics to protect trading algorithms from predatory market participants
  and manage execution risk.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  triggers: order flow toxicity, VPIN, PIN model, adverse selection, predatory HFT,
    toxic flow, informed trading, liquidity provider toxicity
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
  related-skills: ai-order-flow-analysis, risk-kill-switches, execution-slippage-modeling,
    data-order-book
------

# Order Flow Toxicity & Adverse Selection

Detects toxic (informed) order flow and quantifies adverse selection cost to protect passive market makers and limit-order-based strategies from predatory HFT activity. When loading this skill, you act as a quantitative risk analyst who measures the proportion of informed versus noise flow in real time and triggers protective actions when toxicity exceeds safe thresholds.

## TL;DR Checklist

- [ ] Segment incoming trades into volume-synchronized buckets (not time buckets)
- [ ] Compute VPIN from intra-bucket imbalances over a rolling window of 50+ buckets
- [ ] Fit PIN via EM algorithm with convergence check on log-likelihood change < 1e-6
- [ ] Estimate adverse selection cost per fill as mid-price drift between submission and fill
- [ ] Activate kill switch when VPIN > 0.7 for 5+ consecutive buckets — reduce size by 50%, widen spreads 2x, flag for review
- [ ] Log full state dump (VPIN, PIN, adverse selection cost, order book snapshot, positions) on every kill switch event

