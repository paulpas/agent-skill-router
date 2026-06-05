---




name: your-edge
description: Implements a systematic framework for discovering, documenting, and validating
  your unique trading edge through statistical analysis, walk-forward testing, Monte
  Carlo simulation, and competitive moat assessment.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  triggers: trading edge, edge discovery, alpha generation, edge validation, statistical advantage, walk forward test, monte carlo simulation, performance decay advantage
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
  related-skills: fundamentals-trading-edge, backtest-walk-forward, backtest-sharpe-ratio,
    ai-regime-classification




---




# Your Edge Framework

Quantitative strategist discovering, documenting, and validating your unique trading edge — the statistical advantage that makes your strategy profitable over time. An edge is not a signal; it's a persistent, repeatable mismatch between market behavior and the information available to other participants.

Your edge lives at the intersection of three things: (1) a genuine statistical anomaly you've identified through rigorous testing, (2) an execution advantage that lets you capture the anomaly before it decays, and (3) the psychological discipline to stay in the game long enough for the statistics to play out. This framework ensures every edge claim survives scrutiny before it risks real capital.

## TL;DR Checklist

- [ ] Quantify your edge as a statistical metric (Sharpe, profit factor, or expectancy)
- [ ] Document all three components: signal, execution advantage, market structure exploitation
- [ ] Validate with walk-forward testing — never trust in-sample results alone
- [ ] Run Monte Carlo simulation to assess robustness under randomized trade ordering
- [ ] Track edge decay rate and define explicit triggers for strategy review
- [ ] Map your competitive moat — why can't others replicate this advantage?

---

## When to Use

Use this skill when:

- You believe you've found a statistical pattern in market data and need to validate it rigorously
- Your existing strategy's performance is deteriorating and you suspect edge decay
- You're designing a new strategy and want to ensure its claimed edge is genuine
- A backtest shows promising results and you need to determine if it will hold out of sample
- You're conducting due diligence on another trader's or fund's track record

---

## When NOT to Use

Avoid this skill for:

- Simple trend-following strategies that rely on market beta rather than alpha — use `technical-trend-analysis` instead
- High-frequency arbitrage where edge comes from infrastructure speed, not statistical analysis — use `exchange-order-execution-api` instead
- Regulatory compliance or audit reporting — use `exchange-trade-reporting` instead

---

## Core Workflow

### Phase 1: Edge Discovery (Finding the Anomaly)

1. **Hypothesis Formulation** — State your edge hypothesis as a falsifiable claim. Format: "I expect [signal] to predict [outcome] in [market/timeframe] with [specific metric] exceeding [baseline]." Example: "I expect RSI divergence on the 4-hour chart to predict 3-day directional moves in S&P futures with a profit factor exceeding 1.5." **Checkpoint:** If you can't state it as a falsifiable claim, refine until you can.

2. **Historical Backtesting** — Run your hypothesis against at least 5 years of data (or 2x the longest expected holding period, whichever is longer). Calculate: raw win rate, average win/loss ratio, profit factor, Sharpe ratio, max drawdown, and expectancy per trade. **Checkpoint:** In-sample results must show a positive expectancy with Sharpe >= 0.5 to justify further investigation.

3. **Component Decomposition** — Break your edge into its three components: (a) the signal itself, (b) the execution advantage that captures it, and (c) the market structure feature you exploit. Document each component separately. **Checkpoint:** If any single component is missing or weak, the edge may be illusory.

### Phase 2: Edge Validation (Proving It's Real)

4. **Walk-Forward Testing** — Split your data into training and testing windows that roll forward in time. Each training window should contain at least 500 trades. Test on the subsequent out-of-sample window. Repeat for at least 3 rolling windows. Calculate aggregate out-of-sample performance. **Checkpoint:** Out-of-sample Sharpe ratio must be >= 60% of in-sample Sharpe to pass validation.

5. **Monte Carlo Simulation** — Randomly shuffle your trade sequence 10,000 times. This reveals whether your edge is robust to the order of trades or dependent on a few lucky outliers. Calculate: probability of ruin, expected maximum drawdown under randomized ordering, and percentile ranking vs. random shuffles. **Checkpoint:** If more than 5% of shuffled sequences produce better results than your actual sequence, your edge is statistically insignificant.

6. **Regime Sensitivity Analysis** — Test your edge across different market regimes (trending, ranging, high-volatility, low-volatility). A robust edge maintains positive expectancy across most regimes; a fragile edge only works in one. **Checkpoint:** Your edge must show positive expectancy in at least 3 of 4 tested regimes with no single regime accounting for more than 50% of total profits.

### Phase 3: Edge Defense (Protecting Against Decay)

7. **Decay Rate Tracking** — After deploying, track your edge metrics monthly. Plot the decay curve: how quickly does performance deteriorate from the validated state? Calculate the half-life of your edge (time until expectancy drops to 50% of validated level). **Checkpoint:** If half-life is under 6 months for a strategy expected to run for years, plan for periodic edge refresh or replacement.

8. **Competitive Moat Assessment** — Ask: "What prevents others from discovering and exploiting this same edge?" Your moat comes from one or more of: proprietary data sources, unique execution infrastructure, regulatory access advantages, behavioral edge (willingness to act when others panic), or proprietary research methodology. **Checkpoint:** If your moat is "I thought of it first," you have no moat — market participants converge on profitable anomalies rapidly.

9. **Edge Review Cadence** — Establish a formal review schedule: weekly for performance metrics, monthly for regime changes, quarterly for full edge re-validation with fresh data. When the review triggers are hit, follow the validation workflow (Phase 2) again with current data. **Checkpoint:** Never trade an un-reviewed edge for more than one review cycle without documentation of why it was skipped.

---

## Implementation Patterns

### Pattern 1: Edge Discovery and Quantification Engine

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Tuple
import math


@dataclass
class TradeResult:
    """Individual trade outcome for edge analysis."""

    trade_id: str
    entry_date: datetime
    exit_date: datetime
    entry_price: float
    exit_price: float
    direction: str  # 'long' or 'short'
    size: float
    pnl: float
    pnl_pct: float
    holding_period_days: float


@dataclass
class EdgeProfile:
    """Quantified profile of a trading edge."""

    strategy_name: str
    hypothesis: str
    in_sample_metrics: dict
    out_of_sample_metrics: dict
    total_trades_analyzed: int
    data_start_date: datetime
    data_end_date: datetime
    edge_half_life_months: Optional[float] = None
    moat_strength: str  # "strong", "moderate", "weak", "none"


class EdgeDiscoveryEngine:
    """Discovers and quantifies trading edges from historical trade data."""

    def __init__(self):
        self.edge_profiles: list[EdgeProfile] = []

    def calculate_edge_metrics(self, trades: List[TradeResult]) -> dict:
        """Calculate comprehensive edge metrics from a series of trades."""
        if len(trades) < 30:
            raise ValueError(
                f"Insufficient trades for edge analysis. Need >= 30, got {len(trades)}."
            )

        pnls = [t.pnl_pct for t in trades]
        wins = [p for p in pnls if p > 0]
        losses = [p for p in pnls if p <= 0]

        win_rate = len(wins) / len(pnls)
        avg_win = sum(wins) / len(wins) if wins else 0.0
        avg_loss = abs(sum(losses) / len(losses)) if losses else 1.0
        profit_factor = (
            sum(wins) / abs(sum(losses)) if losses and sum(losses) != 0 else float("inf")
        )

        # Sharpe ratio approximation (annualized)
        mean_pnl = sum(pnls) / len(pnls)
        std_pnl = (sum((p - mean_pnl) ** 2 for p in pnls) / len(pnls)) ** 0.5
        sharpe = (mean_pnl / std_pnl * math.sqrt(252)) if std_pnl > 0 else 0.0

        # Maximum drawdown
        cumulative = [0.0]
        for p in pnls:
            cumulative.append(cumulative[-1] + p)
        peak = cumulative[0]
        max_dd = 0.0
        for val in cumulative:
            if val > peak:
                peak = val
            dd = peak - val
            if dd > max_dd:
                max_dd = dd

        # Expectancy per trade
        expectancy = (win_rate * avg_win) - ((1 - win_rate) * avg_loss)

        # Edge score: composite metric weighting key factors
        edge_score = (
            (sharpe / 3.0) * 0.35  # Sharpe normalized to ~3.0 max weight
            + (profit_factor / 3.0) * 0.30  # Profit factor normalized to ~3.0 max
            + (win_rate / 0.7) * 0.20  # Win rate normalized to 70% max
            + ((max_dd / 0.20) * -1 + 1.0) * 0.15  # Drawdown inverted and normalized
        )

        return {
            "win_rate": round(win_rate, 4),
            "avg_win": round(avg_win, 6),
            "avg_loss": round(avg_loss, 6),
            "profit_factor": round(profit_factor, 4),
            "sharpe_ratio": round(sharpe, 4),
            "max_drawdown": round(max_dd, 6),
            "expectancy_per_trade": round(expectancy, 6),
            "edge_score": round(edge_score, 4),
            "total_trades": len(trades),
            "avg_holding_period_days": round(
                sum(t.holding_period_days for t in trades) / len(trades), 1
            ),
        }

    def decompose_edge_components(
        self, strategy_doc: dict
    ) -> dict:
        """Break down an edge into its three fundamental components."""
        signal_strength = self._assess_signal_component(strategy_doc)
        execution_advantage = self._assess_execution_component(strategy_doc)
        market_structure_exploit = self._assess_structure_component(strategy_doc)

        # Overall edge strength is the minimum of the three components
        # A chain is only as strong as its weakest link
        overall_strength = min(signal_strength, execution_advantage, market_structure_exploit)

        return {
            "signal_component": signal_strength,
            "execution_component": execution_advantage,
            "market_structure_component": market_structure_exploit,
            "overall_edge_strength": overall_strength,
            "weakest_link": (
                "signal"
                if signal_strength == overall_strength
                else "execution"
                if execution_advantage == overall_strength
                else "market_structure"
            ),
            "recommendation": (
                "EDGE_IS_ROBUST"
                if overall_strength >= 7.0
                else "STRENGTHEN_WEAKEst_LINK"
                if overall_strength >= 5.0
                else "EDGE_LIKELY_ILUSORY"
            ),
        }

    def _assess_signal_component(self, doc: dict) -> float:
        """Score the signal quality on a 1-10 scale."""
        score = 3.0  # Base score for any defined signal
        if doc.get("signal_backtest_sharpe", 0) >= 1.0:
            score += 2.0
        if doc.get("signal_consistency_across_instruments", False):
            score += 1.5
        if doc.get("signal_theoretical_rationale", True):
            score += 1.0
        if doc.get("signal_resistance_to_overfitting", True):
            score += 1.5
        return min(10.0, score)

    def _assess_execution_component(self, doc: dict) -> float:
        """Score the execution advantage on a 1-10 scale."""
        score = 2.0  # Base score for basic order execution
        if doc.get("slippage_vs_benchmark", 0) < 0.001:
            score += 2.5
        if doc.get("market_impact_minimization", True):
            score += 1.5
        if doc.get("execution_speed_advantage", False):
            score += 2.0
        if doc.get("fill_rate_improvement", 0) > 0.95:
            score += 2.0
        return min(10.0, score)

    def _assess_structure_component(self, doc: dict) -> float:
        """Score the market structure exploitation on a 1-10 scale."""
        score = 2.0
        if doc.get("exploits_information_asymmetry", False):
            score += 2.5
        if doc.get("exploits_mechanical_disadvantage", False):
            score += 2.0
        if doc.get("exploits_regulatory_constraint", True):
            score += 1.5
        if doc.get("exploits_behavioral_bias_of_other_participants", False):
            score += 2.0
        return min(10.0, score)
```

### Pattern 2: Walk-Forward and Monte Carlo Validation

```python
from dataclasses import dataclass
from typing import List, Optional
import math
import random


@dataclass
class WalkForwardResult:
    """Results from a single walk-forward testing window."""

    training_window_start: str
    training_window_end: str
    testing_window_start: str
    testing_window_end: str
    in_sample_metrics: dict
    out_of_sample_metrics: dict
    os_to_is_sharpe_ratio: float  # Out-of-sample Sharpe / In-sample Sharpe


@dataclass
class MonteCarloResult:
    """Results from Monte Carlo simulation of trade sequence."""

    original_sharpe: float
    shuffled_mean_sharpe: float
    shuffled_std_sharpe: float
    original_percentile_rank: float  # Percentile of original vs. all shuffles
    probability_of_ruin: float
    expected_max_drawdown: float
    trades_better_than_random: int  # Number of shuffled sequences beating original


class EdgeValidator:
    """Validates edge robustness through walk-forward testing and Monte Carlo simulation."""

    def __init__(self, n_windows: int = 5, n_monte_carlo_shuffles: int = 10000):
        self.n_windows = n_windows
        self.n_shuffles = n_monte_carlo_shuffles

    def run_walk_forward_test(
        self, trades: List[TradeResult], engine: EdgeDiscoveryEngine
    ) -> List[WalkForwardResult]:
        """Perform walk-forward testing with rolling training/testing windows."""
        if len(trades) < 150:
            raise ValueError(
                f"Need at least 150 trades for {self.n_windows} walk-forward windows. "
                f"Got {len(trades)}."
            )

        sorted_trades = sorted(trades, key=lambda t: t.entry_date)
        total = len(sorted_trades)
        window_size = total // self.n_windows
        min_training_trades = 500

        results: list[WalkForwardResult] = []

        for i in range(self.n_windows):
            # Define training and testing windows
            train_start_idx = i * window_size
            train_end_idx = train_start_idx + window_size * 2
            test_start_idx = train_end_idx
            test_end_idx = min(test_start_idx + window_size, total)

            if train_end_idx > total or test_end_idx > total:
                break

            training_trades = sorted_trades[train_start_idx:train_end_idx]
            testing_trades = sorted_trades[test_start_idx:test_end_idx]

            # Must have minimum trades in each window
            if len(training_trades) < min_training_trades or len(testing_trades) < 20:
                continue

            # Calculate metrics for both windows
            is_metrics = engine.calculate_edge_metrics(training_trades)
            os_metrics = engine.calculate_edge_metrics(testing_trades)

            # Sharpe ratio comparison (robustness check)
            is_sharpe = is_metrics["sharpe_ratio"]
            os_sharpe = os_metrics["sharpe_ratio"]
            sharpe_ratio = (
                os_sharpe / is_sharpe if is_sharpe != 0 else 0.0
            )

            results.append(
                WalkForwardResult(
                    training_window_start=training_trades[0].entry_date.isoformat(),
                    training_window_end=training_trades[-1].entry_date.isoformat(),
                    testing_window_start=testing_trades[0].entry_date.isoformat(),
                    testing_window_end=testing_trades[-1].entry_date.isoformat(),
                    in_sample_metrics=is_metrics,
                    out_of_sample_metrics=os_metrics,
                    os_to_is_sharpe_ratio=round(sharpe_ratio, 4),
                )
            )

        return results

    def run_monte_carlo_simulation(
        self, trades: List[TradeResult]
    ) -> MonteCarloResult:
        """Run Monte Carlo simulation by shuffling trade order."""
        original_metrics = EdgeDiscoveryEngine().calculate_edge_metrics(trades)
        original_sharpe = original_metrics["sharpe_ratio"]

        pnls = [t.pnl_pct for t in trades]
        shuffled_sharpes: list[float] = []

        # Run shuffles
        random.seed(42)  # Reproducible results
        for _ in range(self.n_shuffles):
            shuffled_pnls = pnls[:]
            random.shuffle(shuffled_pnls)

            mean_pnl = sum(shuffled_pnls) / len(shuffled_pnls)
            std_pnl = (sum((p - mean_pnl) ** 2 for p in shuffled_pnls) / len(shuffled_pnls)) ** 0.5
            if std_pnl > 0:
                shuffled_sharpe = (mean_pnl / std_pnl * math.sqrt(252))
            else:
                shuffled_sharpe = 0.0
            shuffled_sharpes.append(shuffled_sharpe)

        # Calculate statistics
        mean_sharpe = sum(shuffled_sharpes) / len(shuffled_sharpes)
        std_sharpe = (
            sum((s - mean_sharpe) ** 2 for s in shuffled_sharpes) / len(shuffled_sharpes)
        ) ** 0.5

        # Percentile rank of original result
        better_than_original = sum(1 for s in shuffled_sharpes if s > original_sharpe)
        percentile_rank = ((self.n_shuffles - better_than_original) / self.n_shuffles) * 100

        # Probability of ruin (cumulative sum going negative and staying there)
        cumulative = [0.0]
        for p in pnls:
            cumulative.append(cumulative[-1] + p)
        min_cumulative = min(cumulative)
        prob_of_ruin = 0.0 if min_cumulative >= -1.0 else min(1.0, abs(min_cumulative))

        # Expected max drawdown from shuffled sequences
        shuffled_max_dd: list[float] = []
        for shuffle_pnls in [pnls[:] for _ in range(100)]:  # Sample 100 for efficiency
            random.shuffle(shuffle_pnls)
            cum = [0.0]
            for p in shuffle_pnls:
                cum.append(cum[-1] + p)
            peak = cum[0]
            max_dd = 0.0
            for val in cum:
                if val > peak:
                    peak = val
                dd = peak - val
                if dd > max_dd:
                    max_dd = dd
            shuffled_max_dd.append(max_dd)

        expected_max_dd = sum(shuffled_max_dd) / len(shuffled_max_dd) if shuffled_max_dd else 0.0

        return MonteCarloResult(
            original_sharpe=round(original_sharpe, 4),
            shuffled_mean_sharpe=round(mean_sharpe, 4),
            shuffled_std_sharpe=round(std_sharpe, 4),
            original_percentile_rank=round(percentile_rank, 2),
            probability_of_ruin=round(prob_of_ruin, 4),
            expected_max_drawdown=round(expected_max_dd, 6),
            trades_better_than_random=better_than_original,
        )
```

### Pattern 3: Edge Decay Tracking and Moat Assessment

```python
from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime, timedelta


@dataclass
class EdgeDecayRecord:
    """Monthly tracking of edge performance decay."""

    record_date: datetime
    sharpe_ratio_rolling: float
    profit_factor_rolling: float
    win_rate_rolling: float
    expectancy_per_trade_rolling: float
    trades_count_period: int
    deviation_from_validated: float  # % change from validated edge metrics


class EdgeDecayTracker:
    """Tracks how an edge degrades over time and calculates its half-life."""

    def __init__(self, validated_metrics: dict):
        self.validated_metrics = validated_metrics
        self.decay_records: list[EdgeDecayRecord] = []
        self.edge_half_life_months: Optional[float] = None

    def record_monthly_metrics(
        self, month: datetime, metrics: dict
    ) -> EdgeDecayRecord:
        """Record edge performance for a given month."""
        deviation = (metrics["sharpe_ratio"] / self.validated_metrics["sharpe_ratio"] - 1.0) * 100

        record = EdgeDecayRecord(
            record_date=month,
            sharpe_ratio_rolling=metrics["sharpe_ratio"],
            profit_factor_rolling=metrics["profit_factor"],
            win_rate_rolling=metrics["win_rate"],
            expectancy_per_trade_rolling=metrics["expectancy_per_trade"],
            trades_count_period=metrics.get("total_trades", 0),
            deviation_from_validated=round(deviation, 2),
        )

        self.decay_records.append(record)
        return record

    def calculate_half_life(self) -> Optional[float]:
        """Calculate edge half-life (months to 50% decay)."""
        if len(self.decay_records) < 3:
            return None

        # Find when sharpe drops below 50% of validated level
        threshold = self.validated_metrics["sharpe_ratio"] * 0.5
        for i, record in enumerate(self.decay_records):
            if record.sharpe_ratio_rolling <= threshold:
                half_life = (i + 1) / 12.0  # Convert months to years
                self.edge_half_life_months = round(half_life, 2)
                return self.edge_half_life_months

        # Edge hasn't decayed to 50% yet — extrapolate from current trend
        if len(self.decay_records) >= 3:
            sharpe_values = [r.sharpe_ratio_rolling for r in self.decay_records]
            first_sharpe = sharpe_values[0]
            last_sharpe = sharpe_values[-1]

            # Linear decay rate per month
            months_elapsed = len(self.decay_records)
            decay_rate = (first_sharpe - last_sharpe) / months_elapsed if months_elapsed > 0 else 0

            if decay_rate > 0:
                remaining_to_half = first_sharpe - threshold
                projected_months = remaining_to_half / decay_rate
                self.edge_half_life_months = round(projected_months, 2)
                return self.edge_half_life_months

        return None

    def assess_moat_strength(
        self,
        has_proprietary_data: bool,
        has_infrastructure_advantage: bool,
        has_regulatory_access: bool,
        has_behavioral_edge: bool,
        has_research_methodology_advantage: bool,
        competitors_known_to_replicate: int,
    ) -> dict:
        """Assess the competitive moat protecting this edge from replication."""

        moat_score = 0.0
        components: list[str] = []

        if has_proprietary_data:
            moat_score += 3.0
            components.append("proprietary_data_source")

        if has_infrastructure_advantage:
            moat_score += 2.5
            components.append("execution_infrastructure")

        if has_regulatory_access:
            moat_score += 2.0
            components.append("regulatory_access")

        if has_behavioral_edge:
            moat_score += 2.0
            components.append("behavioral_discipline")

        if has_research_methodology_advantage:
            moat_score += 1.5
            components.append("research_methodology")

        # Penalize for known replication attempts
        replication_penalty = competitors_known_to_replicate * 1.0
        moat_score -= replication_penalty

        # Determine strength category
        if moat_score >= 6.0:
            strength = "strong"
        elif moat_score >= 4.0:
            strength = "moderate"
        elif moat_score >= 2.0:
            strength = "weak"
        else:
            strength = "none"

        return {
            "moat_score": round(moat_score, 1),
            "strength_category": strength,
            "components": components,
            "replication_penalty": replication_penalty,
            "recommendation": (
                "EDGE_PROTECTED"
                if strength == "strong"
                else "EDGE_NEEDS_STRENGTHENING"
                if strength in ("moderate", "weak")
                else "EDGE_UNPROTECTED_CONSIDER_EXITING_MARKET"
                if strength == "none"
                else "UNKNOWN_NEED_MORE_DATA"
            ),
        }


# Decision matrix for edge deployment based on validation results
DEPLOYMENT_DECISION_MATRIX: dict[str, dict] = {
    "edge_verified": {
        "condition": "Walk-forward os_sharpe >= 60% of is_sharpe AND MC percentile > 95%",
        "action": "Deploy with full position sizing",
        "risk_level": "validated",
    },
    "edge_degraded": {
        "condition": "os_sharpe between 40-60% of is_sharpe OR MC percentile between 80-95%",
        "action": "Deploy with reduced position sizing (50%) and tighter monitoring",
        "risk_level": "cautious",
    },
    "edge_unvalidated": {
        "condition": "os_sharpe < 40% of is_sharpe OR MC percentile < 80%",
        "action": "Do not deploy. Return to edge discovery phase with refined hypothesis.",
        "risk_level": "rejected",
    },
    "edge_decaying": {
        "condition": "Half-life < 12 months for long-term strategy",
        "action": "Plan edge refresh or replacement strategy development.",
        "risk_level": "transitioning",
    },
}
```

---

## Constraints

### MUST DO
- Quantify every edge claim with at least 3 independent metrics (Sharpe, profit factor, expectancy)
- Never deploy a strategy without walk-forward testing — in-sample results are always misleading
- Run Monte Carlo simulation with minimum 10,000 shuffles before any real capital deployment
- Document all three edge components: signal quality, execution advantage, and market structure exploitation
- Track decay rate continuously; calculate half-life at least quarterly
- Assess competitive moat honestly — if your only defense is "I thought of it first," you have no defense

### MUST NOT DO
- Trust in-sample backtest results without out-of-sample validation (this is how ruin begins)
- Use fewer than 3 walk-forward windows — more windows give better statistical power
- Deploy a strategy where Monte Carlo shows <80th percentile rank against shuffled sequences
- Ignore regime sensitivity — an edge that only works in bull markets is not an edge, it's beta
- Extend your edge half-life without addressing the root cause of decay (data snooping, overfitting, market structure changes)
- Claim edge without specifying which component provides the strongest advantage

---

## Output Template

When using this skill, produce:

1. **Edge Hypothesis** — Falsifiable claim with specific metric targets
2. **In-Sample Metrics** — All 7 key metrics from backtesting
3. **Walk-Forward Results** — Per-window comparison of in-sample vs. out-of-sample Sharpe ratios
4. **Monte Carlo Analysis** — Percentile rank, probability of ruin, and shuffled sequence statistics
5. **Regime Breakdown** — Performance by market regime with minimum viability assessment
6. **Decay Assessment** — Current half-life estimate and trend direction
7. **Moat Evaluation** — Scored components and replication resistance rating

---

## Related Skills

| Skill | Purpose |
|---|---|
| `fundamentals-trading-edge` | Understands the theoretical foundations of what creates market edges |
| `backtest-walk-forward` | Detailed walk-forward testing methodology for strategy validation |
| `backtest-sharpe-ratio` | Sharpe ratio calculation and interpretation for edge assessment |
| `ai-regime-classification` | Classifies market regimes to test edge robustness across environments |

---

## Philosophical Foundation

The central truth of trading edge is this: **markets are adaptive systems**. Every profitable anomaly attracts capital, and capital erodes anomalies. Your edge is not a property of the market; it's a property of the gap between what you know (or can do) and what the aggregate market price reflects. That gap closes over time for everyone — which means your edge has an expiration date.

The only sustainable edges come from one of five sources:
1. **Proprietary data** — You see something others cannot because you collect it yourself
2. **Execution advantage** — You capture the trade faster or cheaper than others
3. **Regulatory asymmetry** — The rules give you an access others don't have
4. **Behavioral discipline** — You act rationally when others panic, and you do so consistently enough that it becomes a structural advantage
5. **Research depth** — Your methodology finds patterns others miss because you look where they won't

If your edge comes from none of these five sources, it is borrowed time at best and self-delusion at worst. The frameworks above exist to force you to identify which source (if any) supports your edge before the market reveals the answer through losses.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Hartmann Cycle Theory](https://www.investopedia.com/articles/trading/08/hartmann_cycle.asp)
- [Finding Alpha in Financial Markets](https://en.wikipedia.org/wiki/Alpha_(investment))
- [Market Inefficiency Identification](https://www.investopedia.com/articles/investing/09/market-efficiency.asp)
- [Sustainable Trading Strategies Research](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2758976)
- [QuantConnect Strategy Development](https://docs.quantconnect.com/tutorials/algorithms)
