---
name: your-position
description: Implements personal position awareness framework tracking thesis validity,
  bias detection, portfolio impact scoring, and emotional state management for algorithmic
  trading positions.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: trading
  triggers: position management, mental accounting, home bias, disposition effect,
    portfolio impact, position thesis, behavioral bias, sunk cost fallacy, your position
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
  related-skills: risk-position-sizing, risk-stop-loss, risk-kill-switches, backtest-drawdown-analysis
---
# Your Position Framework

Senior trader conducting deep, honest analysis of each position from a personal ownership perspective — going beyond mechanical risk parameters to understand the behavioral, psychological, and portfolio-level dimensions that make your positions truly yours.

Your position is not just a line item in a portfolio. It's the intersection of your research, your conviction, your capital at risk, and your ability to manage it under stress. This framework forces you to see each position through the lens of personal ownership: What do I actually know? What am I assuming? How does this affect my entire book?

## TL;DR Checklist

- [ ] Document the specific thesis for each position (3 sentences max, no hedging language)
- [ ] Calculate portfolio-level impact including correlation with existing positions
- [ ] Identify your mental accounting bias for this position (sunk cost, home bias, disposition effect)
- [ ] Set explicit invalidation criteria before entry (not just stop-loss price)
- [ ] Log the emotional state at entry and exit separately to track behavioral drift
- [ ] Review each position's P&L attributed to specific decisions, not just market movement

---

## When to Use

Use this skill when:

- You are about to enter a new position and need to articulate your thesis honestly
- Your existing positions are drifting and you need to reassess whether they still fit your plan
- You're reviewing a losing trade and need to separate behavioral bias from valid strategy adjustment
- You're building or rebalancing a portfolio and need to understand concentration risk beyond simple position sizing
- You're conducting post-trade analysis and need structured attribution of decisions versus market noise

---

## When NOT to Use

Avoid this skill for:

- High-frequency algorithmic entries where thesis documentation is impractical — use `exchange-order-execution-api` instead
- Portfolio-level asset allocation decisions — use `risk-position-sizing` or `risk-correlation-risk` instead
- Emergency liquidations during market stress — prioritize speed over reflection, then debrief afterward

---

## Core Workflow

### Phase 1: Pre-Entry Position Thesis (Before You Commit Capital)

1. **Write the 3-Sentence Thesis** — State exactly why you're taking this position in plain language. No jargon. No "if/then" hedging. Example: "Bitcoin is undervalued relative to network hash rate and exchange outflows suggest accumulation by long-term holders." **Checkpoint:** If you can't write it in 3 clear sentences, you don't have a thesis — go back to research.

2. **Define Invalidation Criteria** — What specific observation would prove your thesis wrong? This is NOT a price level (that's the stop loss). This is a factual change in conditions. Example: "If daily exchange outflows reverse to sustained net inflows for 14 consecutive days, my accumulation thesis is invalidated." **Checkpoint:** Invalidation criteria must be observable without needing a stop-loss hit to trigger them.

3. **Calculate Portfolio Impact** — Assess this position's impact on your entire book: correlation with existing positions, maximum plausible drawdown contribution, and concentration relative to your edge strength in this domain. Use the `portfolio_impact_score()` function below. **Checkpoint:** No single position should contribute more than 2x your average risk if it has no independent edge validation.

4. **Audit Your Biases** — Run through the bias checklist (see Implementation Patterns). For each identified bias, document what action you'll take to counter it. Example: "Disposition effect detected — will pre-set trailing stop at +2R rather than manually adjusting."

### Phase 2: Active Position Management (During the Trade)

5. **Daily Position Check** — Compare current market reality against your original thesis. Has any invalidation criterion been triggered? Has the environment changed in ways that affect your edge? Use the `position_health_score()` function below. **Checkpoint:** If health score drops below 3/10, you must either reduce size or exit within the same session.

6. **Emotional State Logging** — Record your emotional state at each check-in point (calm, fearful, euphoric, frustrated). Track this against P&L to identify patterns where emotion drives decision quality. **Checkpoint:** Never make a position change when in extreme emotional states (score 1 or 10 on a 1-10 scale). Wait 30 minutes minimum.

7. **Thesis Verification Review** — Every N trading days (configurable by strategy), re-evaluate whether the original thesis still holds with current data. Update your invalidation criteria if new information has emerged. **Checkpoint:** If you've modified your entry criteria more than twice without a valid catalyst, your edge is degrading and this position should be exited.

### Phase 3: Post-Exit Position Attribution (After the Trade)

8. **Decision Attribution** — Separate which outcomes resulted from your specific decisions versus market randomness. Use the `attribution_analysis()` function below to quantify decision quality independently of P&L. **Checkpoint:** A profitable trade with poor process is worse than a losing trade with excellent process. Score both separately.

9. **Bias Audit on Exit** — Specifically examine whether any cognitive biases influenced your entry, management, or exit decisions. Document what you learned about yourself as a trader from this position. **Checkpoint:** If no behavioral insight was gained, the trade failed its educational purpose regardless of P&L.

---

## Implementation Patterns

### Pattern 1: Position Thesis and Invalidation Tracker

```python
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional


class SentimentState(Enum):
    CALM = "calm"
    FEARFUL = "fearful"
    EUPHORIC = "euphoric"
    FRUSTRATED = "frustrated"
    CONFIDENT = "confident"
    UNCERTAIN = "uncertain"


@dataclass
class PositionThesis:
    """Captures the core thesis for a position, not just entry/exit prices."""

    symbol: str
    direction: str  # 'long' or 'short'
    thesis_sentences: List[str]  # Exactly 3 sentences max
    invalidation_criteria: List[str]  # Factual changes that disprove the thesis
    entry_date: datetime
    confidence_level: float  # 0.0 to 1.0
    edge_domain: str  # What specific market knowledge validates this position?
    related_theses: List[str] = field(default_factory=list)


class PositionThesisManager:
    """Manages position thesis documentation and validation lifecycle."""

    def __init__(self):
        self.active_theses: dict[str, PositionThesis] = {}
        self.exited_theses: list[dict] = []

    def document_thesis(
        self,
        symbol: str,
        direction: str,
        thesis_sentences: List[str],
        invalidation_criteria: List[str],
        confidence_level: float,
        edge_domain: str,
        related_theses: Optional[List[str]] = None,
    ) -> PositionThesis:
        """Document a position thesis with strict validation."""
        if len(thesis_sentences) != 3:
            raise ValueError(
                f"Thesis must be exactly 3 sentences. Got {len(thesis_sentences)}."
            )

        # Validate no hedging language in thesis
        hedging_words = ["maybe", "perhaps", "might", "could possibly", "hope"]
        thesis_text = " ".join(thesis_sentences).lower()
        hedge_found = any(h in thesis_text for h in hedging_words)
        if hedge_found:
            raise ValueError(
                f"Hedging language detected in thesis. Remove ambiguous qualifiers."
            )

        # Validate no price-based invalidation (must be factual, not technical)
        price_keywords = ["price reaches", "drops below $", "goes above $"]
        for criterion in invalidation_criteria:
            if any(kw in criterion.lower() for kw in price_keywords):
                raise ValueError(
                    f"Invalidation criteria must be factual changes, not price levels. "
                    f"Got: {criterion}. Use the stop-loss system for price-based exits."
                )

        thesis = PositionThesis(
            symbol=symbol,
            direction=direction,
            thesis_sentences=thesis_sentences,
            invalidation_criteria=invalidation_criteria,
            entry_date=datetime.now(),
            confidence_level=confidence_level,
            edge_domain=edge_domain,
            related_theses=related_theses or [],
        )

        self.active_theses[symbol] = thesis
        return thesis

    def check_invalidation(
        self, symbol: str, observed_changes: List[str]
    ) -> dict:
        """Check whether any invalidation criteria have been triggered."""
        if symbol not in self.active_theses:
            raise ValueError(f"No active thesis for {symbol}")

        thesis = self.active_theses[symbol]
        triggered: list[dict] = []

        for criterion in thesis.invalidation_criteria:
            for observation in observed_changes:
                criterion_lower = criterion.lower()
                observation_lower = observation.lower()

                if any(
                    word in criterion_lower and word in observation_lower
                    for word in criterion.split()[:3]
                ):
                    triggered.append(
                        {
                            "criterion": criterion,
                            "observation": observation,
                            "triggered_at": datetime.now().isoformat(),
                        }
                    )

        return {
            "symbol": symbol,
            "thesis_valid": len(triggered) == 0,
            "triggered_criteria": triggered,
            "recommendation": (
                "EXIT_POSITION" if len(triggered) > 0 else "MONITOR_CLOSELY"
            ),
        }

    def close_thesis(self, symbol: str, exit_pnl: float) -> dict:
        """Archive a position thesis with performance attribution."""
        if symbol not in self.active_theses:
            raise ValueError(f"No active thesis for {symbol}")

        thesis = self.active_theses.pop(symbol)
        record = {
            "thesis": thesis.__dict__,
            "exit_pnl": exit_pnl,
            "exited_at": datetime.now().isoformat(),
            "duration_days": (datetime.now() - thesis.entry_date).days,
        }

        self.exited_theses.append(record)
        return record
```

### Pattern 2: Portfolio Impact and Bias Detection

```python
from dataclasses import dataclass
from typing import List, Dict, Optional


@dataclass
class PortfolioImpactScore:
    """Quantifies how a new position affects the entire portfolio."""

    symbol: str
    standalone_risk_score: float  # 1-10 scale
    correlation_penalty: float  # Additional risk from existing positions
    concentration_adjusted_risk: float  # Final adjusted risk score
    max_plausible_drawdown_contribution: float
    recommendation: str  # "accept", "reduce_size", "reject"


class PortfolioImpactAnalyzer:
    """Analyzes how a candidate position impacts overall portfolio health."""

    def __init__(self):
        self.portfolio_positions: list[dict] = []
        self.correlation_matrix: dict[str, dict[str, float]] = {}
        self.total_portfolio_risk_budget: float = 0.02  # 2% max daily risk
        self.max_single_position_risk: float = 0.01  # 1% per position

    def calculate_impact_score(
        self,
        candidate_symbol: str,
        candidate_direction: str,
        candidate_risk_amount: float,
        existing_correlations: Optional[Dict[str, float]] = None,
    ) -> PortfolioImpactScore:
        """Calculate comprehensive portfolio impact for a new position."""

        # 1. Base standalone risk
        standalone_score = min(10, max(1, candidate_risk_amount / self.max_single_position_risk * 5))

        # 2. Correlation penalty
        correlation_penalty = 0.0
        if existing_correlations:
            avg_correlation = sum(abs(v) for v in existing_correlations.values()) / len(existing_correlations)
            concentration_risk = avg_correlation * (candidate_risk_amount / self.total_portfolio_risk_budget)
            correlation_penalty = min(5.0, concentration_risk * 3)

        # 3. Adjusted total risk
        adjusted_risk = standalone_score + correlation_penalty

        # 4. Determine recommendation
        if adjusted_risk > 8:
            recommendation = "reject"
        elif adjusted_risk > 6:
            recommendation = "reduce_size"
        else:
            recommendation = "accept"

        return PortfolioImpactScore(
            symbol=candidate_symbol,
            standalone_risk_score=standalone_score,
            correlation_penalty=correlation_penalty,
            concentration_adjusted_risk=adjusted_risk,
            max_plausible_drawdown_contribution=candidate_risk_amount * 2.5,
            recommendation=recommendation,
        )

    def detect_behavioral_biases(
        self, position_record: dict
    ) -> List[Dict[str, str]]:
        """Detect common cognitive biases in position management."""
        detected_biases: list[dict] = []

        # Sunk Cost Fallacy
        if position_record.get("days_held", 0) > 30:
            pnl = position_record.get("current_pnl", 0)
            if pnl < -0.03 and position_record.get("thesis_validated", False):
                detected_biases.append(
                    {
                        "bias": "sunk_cost_fallacy",
                        "description": (
                            f"Holding for {position_record['days_held']} days with {pnl*100:.1f}% loss "
                            "despite thesis invalidated. Exit driven by attachment, not analysis."
                        ),
                    }
                )

        # Disposition Effect
        if position_record.get("peak_pnl", 0) > 0:
            current = position_record.get("current_pnl", 0)
            if current < 0 and position_record.get("exit_decision_type") == "manual":
                detected_biases.append(
                    {
                        "bias": "disposition_effect",
                        "description": (
                            f"Position went from +{position_record['peak_pnl']*100:.1f}% peak to "
                            f"{current*100:.1f}%. Manual exit after losing paper profits."
                        ),
                    }
                )

        # Home Bias / Familiarity Bias
        if position_record.get("is_familiar_instrument", True):
            detected_biases.append(
                {
                    "bias": "familiarity_bias",
                    "description": (
                        f"Position in familiar instrument '{position_record['symbol']}'. "
                        "Verify allocation reflects edge quality, not comfort level."
                    ),
                }
            )

        # Confirmation Bias
        if position_record.get("confirmed_only", True) and not position_record.get(
            "contrarian_analysis", False
        ):
            detected_biases.append(
                {
                    "bias": "confirmation_bias",
                    "description": (
                        f"No contrarian analysis documented for '{position_record['symbol']}'. "
                        "Actively seek evidence that disproves your thesis."
                    ),
                }
            )

        return detected_biases


# Bias mitigation strategies
BIAS_MITIGATIONS: dict[str, list[str]] = {
    "sunk_cost_fallacy": [
        "Ask: 'Would I enter this position at its current price with today's information?'",
        "If the answer is no, exit immediately regardless of entry price.",
        "Implement a maximum hold period as an automatic review trigger.",
    ],
    "disposition_effect": [
        "Pre-set trailing stops that execute automatically — remove manual discretion on exits.",
        "Set a minimum profit-taking level (e.g., take 50% at +2R) to create free position.",
        "Log the emotional state before every manual exit decision.",
    ],
    "familiarity_bias": [
        "Cap allocation to familiar instruments at 1.5x your average position size.",
        "Require edge validation score >= 7/10 for unfamiliar instruments you want to trade.",
        "Maintain a challenge position list — small allocations to unfamiliar markets.",
    ],
    "confirmation_bias": [
        "Document at least 2 contrarian arguments for every thesis before entering.",
        "Assign a devil's advocate role when reviewing positions with team members.",
        "Track your hit rate on contrarian calls vs. thesis-consistent calls.",
    ],
}
```

### Pattern 3: Position Health Scoring and Decision Attribution

```python
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class PositionHealthReport:
    """Comprehensive health score for an active position."""

    symbol: str
    overall_score: float  # 0-10 scale
    thesis_health: float  # Does the original thesis still hold?
    market_condition_score: float  # Are conditions favorable?
    risk_level_score: float  # Is risk within acceptable bounds?
    emotional_state_score: float  # Trader's psychological readiness
    actions_required: List[str]  # Concrete next steps


class PositionHealthScorer:
    """Calculates a composite health score for position management decisions."""

    def __init__(self):
        self.score_weights = {
            "thesis_health": 0.35,
            "market_condition": 0.25,
            "risk_level": 0.25,
            "emotional_state": 0.15,
        }

    def score_position_health(
        self,
        symbol: str,
        thesis_valid: bool,
        invalidation_triggered: bool,
        market_trend_healthy: bool,
        current_risk_pct: float,
        max_acceptable_risk_pct: float,
        trader_sentiment: SentimentState,
        consecutive_losses: int,
    ) -> PositionHealthReport:
        """Calculate composite health score with weighted factors."""

        # Thesis health (35% weight) — the most important factor
        if not invalidation_triggered and thesis_valid:
            thesis_score = 8.0 + 1.0  # Bonus for active refinement
        elif not invalidation_triggered:
            thesis_score = 4.0
        else:
            thesis_score = 0.0

        # Market condition health (25% weight)
        market_score = 7.0 if market_trend_healthy else 3.0
        if consecutive_losses > 3:
            market_score -= 1.5

        # Risk level assessment (25% weight)
        risk_ratio = current_risk_pct / max_acceptable_risk_pct if max_acceptable_risk_pct > 0 else 1.0
        if risk_ratio <= 0.5:
            risk_score = 9.0
        elif risk_ratio <= 1.0:
            risk_score = 6.0
        else:
            risk_score = 2.0

        # Emotional state scoring (15% weight)
        sentiment_scores = {
            SentimentState.CALM: 9.0,
            SentimentState.CONFIDENT: 7.0,
            SentimentState.UNCERTAIN: 4.0,
            SentimentState.FRUSTATED: 3.0,
            SentimentState.FEARFUL: 2.0,
            SentimentState.EUPHORIC: 1.0,
        }
        emotional_score = sentiment_scores.get(trader_sentiment, 5.0)

        # Weighted composite
        w = self.score_weights
        overall = (
            thesis_score * w["thesis_health"]
            + market_score * w["market_condition"]
            + risk_score * w["risk_level"]
            + emotional_score * w["emotional_state"]
        )

        # Determine actions
        actions: list[str] = []
        if overall < 3.0:
            actions.extend(["REDUCE_POSITION_SIZE_IMMEDIATELY", "MANDATORY_24H_COOL_OFF_PERIOD"])
        elif overall < 5.0:
            actions.extend(["CONSIDER_REDUCING_SIZE", "INCREASE_MONITORING_FREQUENCY"])
        if invalidation_triggered:
            actions.extend(["EVALUATE_POSITION_EXIT", "DOCUMENT_INVARIANTION_REASONING"])

        return PositionHealthReport(
            symbol=symbol,
            overall_score=round(overall, 1),
            thesis_health=thesis_score,
            market_condition_score=market_score,
            risk_level_score=risk_score,
            emotional_state_score=emotional_score,
            actions_required=actions,
        )

    def attribution_analysis(self, trade_record: dict) -> dict:
        """Separate P&L into decision quality vs. market randomness."""
        pnl = trade_record.get("pnl", 0)
        decision_quality = trade_record.get("decision_quality_score", 5)

        if pnl > 0 and decision_quality >= 7:
            outcome_label = "GOOD_PROCESS_GOOD_RESULT"
        elif pnl < 0 and decision_quality <= 3:
            outcome_label = "BAD_PROCESS_BAD_RESULT"
        elif pnl > 0 and decision_quality <= 3:
            outcome_label = "BAD_PROCESS_GOOD_RESULT_LOTTERY"
        elif pnl < 0 and decision_quality >= 7:
            outcome_label = "GOOD_PROCESS_BAD_RESULT_LEARNING_OPPORTUNITY"
        else:
            outcome_label = "MIXED_SIGNALS_NEED_DEEPER_ANALYSIS"

        return {
            "symbol": trade_record.get("symbol", "unknown"),
            "pnl": pnl,
            "outcome_label": outcome_label,
            "recommendation": (
                "REPLICATE_THIS_PROCESS"
                if outcome_label == "GOOD_PROCESS_GOOD_RESULT"
                else "FIX_THE_PROCESS"
                if "BAD_PROCESS" in outcome_label and pnl < 0
                else "DO_NOT_REPEAT_THE_OUTCOME"
                if "LOTTERY" in outcome_label
                else "PROCEED_WITH_CAUTION"
            ),
        }
```

---

## Constraints

### MUST DO
- Document the thesis in exactly 3 sentences — no hedging, no jargon, no ambiguity
- Define factual invalidation criteria separate from stop-loss price levels
- Calculate portfolio-level correlation impact before entering any position larger than your average
- Log emotional state at every position check-in point and correlate with decision quality
- Score each position's health on a 1-10 composite scale using the weighted framework above
- Conduct a bias audit on every trade exit, regardless of P&L outcome
- Separate decision quality from outcome — a bad process that profits is not success

### MUST NOT DO
- Replace factual invalidation criteria with price-based triggers (that's what stop-losses are for)
- Make position changes when emotional state score is 2 or below
- Hold a losing position longer than your maximum hold period without a documented reason
- Increase position size because "the thesis is still valid" without re-calculating portfolio impact
- Skip the post-trade bias audit — even winning trades teach behavioral lessons
- Use "gut feeling" as a justification for any position change that deviates from the documented plan

---

## Output Template

When using this skill, produce:

1. **Position Thesis** — The 3-sentence thesis with no hedging language
2. **Invalidation Criteria** — Specific factual changes that would disprove the thesis
3. **Portfolio Impact Score** — Standalone risk, correlation penalty, and adjusted recommendation
4. **Bias Detection Report** — Any biases identified with specific mitigation actions
5. **Health Score Breakdown** — Composite score with individual component scores and weights
6. **Required Actions** — Concrete next steps derived from the health assessment
7. **Decision Attribution** (post-exit) — Whether outcome matched process quality

---

## Related Skills

| Skill | Purpose |
|---|---|
| `risk-position-sizing` | Determines how much capital to allocate to your position |
| `risk-stop-loss` | Sets the mechanical stop-loss levels for your position |
| `risk-kill-switches` | Emergency circuit breakers that override your position decisions |
| `backtest-drawdown-analysis` | Understands historical drawdown patterns for positions like yours |

---

## Philosophical Foundation

This framework is built on the principle that **your position is yours alone** — no algorithm, analyst, or model can fully capture the intersection of your knowledge, your emotional state, and your portfolio context. The mechanical rules (stop-losses, position sizing) are necessary but insufficient. True position management requires you to see through your own blind spots and confront the biases that silently degrade decision quality over time.

The three pillars of your-position awareness are:
1. **Honesty** — Your thesis must be falsifiable. If it can't be proven wrong, it's not a thesis; it's hope.
2. **Systems** — Biases are inevitable. The system catches what willpower cannot.
3. **Attribution** — You are responsible for your process, not the market's response to it.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Account Information Tutorial](https://docs.quantconnect.com/tutorials/account-information)
- [Portfolio Position Tracking](https://en.wikipedia.org/wiki/Position_(finance))
- [Long vs Short Positions Explained](https://www.investopedia.com/terms/l/long.asp)
- [Position Sizing and Risk Control](https://www.investopedia.com/terms/p/position-sizing.asp)
- [OpenSource Trading Platforms](https://docs.quantconnect.com/tutorials/algorithms)
