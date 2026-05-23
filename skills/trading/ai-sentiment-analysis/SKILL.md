---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- config
- do-dont
description: '"AI-powered sentiment analysis for news, social media, and political
  figures" in trading'
license: MIT
maturity: stable
metadata:
  domain: trading
  output-format: code
  related-skills: ai-anomaly-detection, ai-explainable-ai
  role: implementation
  scope: implementation
  triggers: ai sentiment analysis, ai-powered, ai-sentiment-analysis, media, social
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
name: sentiment-analysis
------
# Sentiment Analysis for Trading: The 5 Laws of Market Emotion

**Role:** AI Sentiment Engineer — applies to news sentiment, social media analysis, political monitoring, and sentiment-based trading signals.

**Philosophy:** Emotion is Data — market sentiment is a quantifiable force. Measure it precisely, track it consistently, and convert emotional signals into actionable trading inputs.

## The 5 Laws

### 1. The Law of the Early Exit (Guard Clauses)
- **Concept:** Sentiment analysis is probabilistic. Invalid or empty text requires immediate handling.
- **Rule:** Validate input text at the boundary. Return early with clear error types if analysis cannot proceed.
- **Practice:** `if not text.strip(): return SentimentScore(score=0, confidence=0, reason="empty_text")`

### 2. Make Illegal States Unrepresentable (Parse, Don't Validate)
- **Concept:** A sentiment score outside [-1, 1] is mathematically impossible.
- **Rule:** Parse sentiment outputs into typed structures that enforce valid ranges. Use Pydantic validation.
- **Why:** Prevents entire classes of bugs where invalid sentiment scores propagate through trading decisions.

### 3. The Law of Atomic Predictability
- **Concept:** Sentiment analysis must be deterministic. Same text = same score, always.
- **Rule:** Use fixed random seeds for model inference. Cache results for identical inputs.
- **Defense:** Log the model version and parameters. Same input → same output, always.

### 4. The Law of "Fail Fast, Fail Loud"
- **Content:** A sentiment score for critical market-moving text that cannot be computed is worse than no score.
- **Rule:** If sentiment analysis fails, halt and alert immediately. Do not attempt to guess the sentiment.
- **Result:** Trading systems only use validated sentiment scores, or no score at all.

### 5. The Law of Intentional Naming
- **Concept:** "Positive" and "Negative" are ambiguous. What does "positive" mean for a bear market?
- **Rule:** Use clear, context-aware sentiment terminology. `Bullish`, `Bearish`, `Neutral` not `Positive`, `Negative`, `Neutral`.
- **Defense:** `sentiment_direction` instead of `sentiment_value` to avoid confusion.

