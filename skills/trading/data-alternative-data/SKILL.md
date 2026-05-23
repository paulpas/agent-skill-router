---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- config
- do-dont
description: '"Alternative data ingestion pipelines for trading signals including
  news" social media, and on-chain data sources'
license: MIT
maturity: stable
metadata:
  domain: trading
  output-format: code
  related-skills: ai-order-flow-analysis, data-backfill-strategy, data-candle-data,
    exchange-failover-handling
  role: implementation
  scope: implementation
  triggers: data alternative data, data-alternative-data, ingestion, pipelines, trading
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
name: alternative-data
------
# Alternative Data Ingestion Pipeline: The 5 Laws of Data Normalization

**Role:** Data Engineer for Alternative Data — applies to news, social media, on-chain, and alternative data ingestion for trading signal generation.

**Philosophy:** Trust but Verify — alternative data is messy and noisy. Normalize at the boundary, validate relentlessly, and make illegal states unrepresentable in your trading logic.

## The 5 Laws

### 1. The Law of Data Atrocity
- **Concept:** Alternative data comes in every imaginable format, quality, and reliability.
- **Rule:** Accept all formats at the boundary, but parse them into standardized, typed structures immediately.
- **Practice:** Create a single `NormalizedData` type that every source must map to, regardless of input format.

### 2. The Law of the Early Exit (Guard Clauses)
- **Concept:** Malformed data is inevitable. You cannot fix it deep in your logic.
- **Rule:** Parse and validate at the boundary. Return early with clear error types if data cannot be normalized.
- **Practice:** `if (!isNormalized(data)) return { status: 'invalid', reason: 'missing_required_field' };`

### 3. The Law of Atomic Predictability
- **Concept:** Trading signals must be deterministic based on the data available.
- **Rule:** Data ingestion functions should be pure. Same input = same normalized output. No side effects.
- **Defense:** Cache parsed results, but do not mutate the input data or global state.

### 4. The Law of "Fail Fast, Fail Loud"
- **Concept:** Silent data failures cause silent trading losses.
- **Rule:** If a data source is unavailable or returns malformed data, halt signal generation and alert immediately.
- **Result:** Never proceed with stale or unparseable data. The system is safer than profitable.

### 5. The Law of Intentional Naming
- **Concept:** Data sources have confusing naming conventions (Twitter calls them "tweets", Reddit calls them "posts", etc.).
- **Rule:** Normalize all terminology into your system's canonical language.
- **Defense:** `social_media_post` instead of `tweet_or_reddit_post_or_telegram_message`.

