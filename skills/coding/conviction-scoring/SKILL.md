---
name: scoring
description: '"Multi-factor conviction scoring engine combining technical, momentum"
  trend, volatility, and volume signals with configurable weights'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: combining, conviction scoring, conviction-scoring, engine, multi-factor
  related-skills: null
---




# Skill: coding-conviction-scoring

# Multi-factor conviction scoring engine combining technical, momentum, trend, volatility, and volume signals with configurable weights

## Role / Purpose

This skill covers the pattern for turning raw indicator scores into a single, actionable conviction score for trading decisions. The `ConvictionEngine` is initialized with configurable factor weights, validates those weights at construction, and exposes pure functions for scoring individual signals or batches of signal events.

---

## Key Patterns

### 1. Weight Validation at Construction — Fail Fast

All four weights must be non-negative and must sum to 1.0 (within 0.01 tolerance). These checks run in `__init__` before any weights are stored. A `ConvictionEngine` with bad weights cannot be created.

```python
class ConvictionEngine:
    def __init__(
        self,
        minimum_entry: float = 0.7,
        minimum_exit: float = 0.5,
        momentum_weight: float = 0.3,
        trend_weight: float = 0.3,
        volatility_weight: float = 0.2,
        volume_weight: float = 0.2,
    ):
        """Initialize conviction engine - fail fast on invalid params."""
        # Guard clause - early exit for invalid inputs
        if minimum_entry <= 0 or minimum_entry > 1:
            raise ValueError("Minimum entry conviction must be in (0, 1]")
        if minimum_exit <= 0 or minimum_exit > 1:
            raise ValueError("Minimum exit conviction must be in (0, 1]")
        if (
            momentum_weight < 0
            or trend_weight < 0
            or volatility_weight < 0
            or volume_weight < 0
        ):
            raise ValueError("Factor weights cannot be negative")
        total = momentum_weight + trend_weight + volatility_weight + volume_weight
        if abs(total - 1.0) > 0.01:
            raise ValueError("Factor weights must sum to 1.0")

        self.minimum_entry = minimum_entry
        self.minimum_exit = minimum_exit
        self.momentum_weight = momentum_weight
        self.trend_weight = trend_weight
        self.volatility_weight = volatility_weight
        self.volume_weight = volume_weight
```

---

### 2. `calculate_conviction()` — Pure Function

All five input scores are validated to be in `[0, 1]` before any calculation. The technical score is the weighted average of the four factor scores. The function returns an immutable `ConvictionScore` model.

```python
    def calculate_conviction(
        self,
        technical_score: float,
        momentum_score: float,
        trend_score: float,
        volatility_score: float,
        volume_score: float,
    ) -> ConvictionScore:
        """Calculate conviction score from component scores - pure function."""
        # Guard clause - early exit for invalid inputs
        for score in [technical_score, momentum_score, trend_score, volatility_score, volume_score]:
            if score < 0 or score > 1:
                raise ValueError(f"All scores must be in [0, 1], got {score}")

        # Weighted average formula for technical score
        technical = (
            self.momentum_weight * momentum_score
            + self.trend_weight * trend_score
            + self.volatility_weight * volatility_score
            + self.volume_weight * volume_score
        )

        overall = technical

        return ConvictionScore(
            overall=overall,
            technical=technical,
            momentum=momentum_score,
            trend=trend_score,
            volatility=volatility_score,
            volume=volume_score,
        )
```

---

### 3. `should_enter()` / `should_exit()` — Threshold Checks

Pure boolean functions. No side effects, no mutations. Callers get a clear decision without knowing the threshold values.

```python
    def should_enter(self, conviction_score: ConvictionScore) -> bool:
        """Determine if position should be entered - pure function."""
        return conviction_score.overall >= self.minimum_entry

    def should_exit(self, conviction_score: ConvictionScore) -> bool:
        """Determine if position should be exited - pure function."""
        return conviction_score.overall <= self.minimum_exit
```

---

### 4. Scoring from Signal Events — Batch and Single

`score_signal_event()` scores a single `SignalEvent` using `signal.confidence` as the technical score and extracting factor scores from the signal's metadata. `calculate_conviction_from_signals()` aggregates a list of signals by averaging each factor across all signals.

```python
    def score_signal_event(self, signal: SignalEvent) -> ConvictionScore:
        """Score a single signal event - pure function."""
        if not signal:
            raise ValueError("Signal cannot be None")

        metadata = signal.metadata or {}

        return self.calculate_conviction(
            technical_score=signal.confidence,
            momentum_score=metadata.get("momentum_score", 0.5),
            trend_score=metadata.get("trend_score", 0.5),
            volatility_score=metadata.get("volatility_score", 0.5),
            volume_score=metadata.get("volume_score", 0.5),
        )

    def calculate_conviction_from_signals(
        self,
        signal_events: list[SignalEvent],
    ) -> ConvictionScore:
        """Calculate conviction from list of signal events - pure function."""
        if not signal_events:
            raise ValueError("Signal events list cannot be empty")

        momentum_scores = []
        trend_scores = []
        volatility_scores = []
        volume_scores = []

        for signal in signal_events:
            metadata = signal.metadata or {}
            momentum_scores.append(metadata.get("momentum_score", 0.5))
            trend_scores.append(metadata.get("trend_score", 0.5))
            volatility_scores.append(metadata.get("volatility_score", 0.5))
            volume_scores.append(metadata.get("volume_score", 0.5))

        import numpy as np
        momentum_score = np.mean(momentum_scores)
        trend_score = np.mean(trend_scores)
        volatility_score = np.mean(volatility_scores)
        volume_score = np.mean(volume_scores)
        technical_score = np.mean([s.confidence for s in signal_events])

        return self.calculate_conviction(
            technical_score=technical_score,
            momentum_score=momentum_score,
            trend_score=trend_score,
            volatility_score=volatility_score,
            volume_score=volume_score,
        )
```

---

### 5. Module-Level Pure Function

A standalone function wraps the engine for callers who have a pre-built engine instance.

```python
def calculate_conviction_score(
    technical: float,
    momentum: float,
    trend: float,
    volatility: float,
    volume: float,
    engine: ConvictionEngine,
) -> ConvictionScore:
    """Calculate conviction score using provided engine - pure function."""
    return engine.calculate_conviction(
        technical_score=technical,
        momentum_score=momentum,
        trend_score=trend,
        volatility_score=volatility,
        volume_score=volume,
    )
```

---

## Code Examples

### Engine Setup and Single Signal Scoring

```python
from apex.signals.conviction import ConvictionEngine
from apex.core.models import SignalEvent, SignalType

# Create engine - raises immediately if weights don't sum to 1.0
engine = ConvictionEngine(
    minimum_entry=0.7,
    minimum_exit=0.5,
    momentum_weight=0.3,
    trend_weight=0.3,
    volatility_weight=0.2,
    volume_weight=0.2,
)

# Signal with metadata scores
signal = SignalEvent(
    symbol="BTC/USDT",
    signal_type=SignalType.LONG,
    confidence=0.82,
    price=65_000.0,
    timeframe="1h",
    metadata={
        "momentum_score": 0.75,
        "trend_score": 0.80,
        "volatility_score": 0.60,
        "volume_score": 0.70,
    },
)

score = engine.score_signal_event(signal)

# Decision gate
if engine.should_enter(score):
    print(f"Enter long — conviction: {score.overall:.2f}")
else:
    print(f"Skip — conviction too low: {score.overall:.2f}")
```

### Direct Score Calculation

```python
score = engine.calculate_conviction(
    technical_score=0.80,
    momentum_score=0.75,
    trend_score=0.80,
    volatility_score=0.60,
    volume_score=0.70,
)

# technical = 0.3*0.75 + 0.3*0.80 + 0.2*0.60 + 0.2*0.70
#           = 0.225 + 0.24 + 0.12 + 0.14 = 0.725
print(score.overall)    # 0.725
print(score.technical)  # 0.725
```

### Batch Scoring from Multiple Signals

```python
signals = [signal_1, signal_2, signal_3]  # Each with metadata scores
combined_score = engine.calculate_conviction_from_signals(signals)
print(f"Aggregate conviction: {combined_score.overall:.3f}")
```

---

## When to Use Conviction vs Raw Signals

| Use case | Recommendation |
|---|---|
| Single indicator trigger | Raw signal confidence |
| Multi-indicator confluence | Conviction scoring |
| Entry/exit threshold decisions | `should_enter()` / `should_exit()` |
| Comparing signals across strategies | Normalized conviction score |
| Backtesting entry quality | Record conviction at entry |

---

## Philosophy Checklist

- **Early Exit**: Weight validation and score range validation run at the top of their respective methods
- **Parse Don't Validate**: Scores in `[0, 1]` are checked once at `calculate_conviction()`; `ConvictionScore` model then trusts them
- **Atomic Predictability**: All scoring functions are pure — same inputs always produce the same `ConvictionScore`
- **Fail Fast**: Invalid weights halt engine construction; out-of-range scores halt calculation; empty signal list raises
- **Intentional Naming**: `should_enter`, `should_exit`, `score_signal_event`, `calculate_conviction_from_signals` — reads like a decision flow
