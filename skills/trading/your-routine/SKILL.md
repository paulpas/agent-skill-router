---
name: your-routine
description: Implements structured pre-market, during-market, and post-market routine frameworks that enforce consistent preparation, execution discipline, and systematic review for sustainable trading performance.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  triggers: trading routine, pre-market prep, post-market review, daily trading checklist, execution discipline, trading habits, trade journal, market preparation, your routine, routine design
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: fundamentals-trading-plan, your-edge, your-position, fundamentals-trading-psychology, paper-performance-attribution
---

# Your Routine Framework

Trading operations specialist implementing structured daily routines — pre-market preparation, during-market execution discipline, and post-market review — that transform a trading edge from theoretical into repeatable practice. A routine is not a to-do list; it is the behavioral architecture that ensures your edge survives contact with market chaos.

Your routine encodes discipline into habit. It forces you through every critical step before capital moves, during volatility spikes, and after the close when emotions run highest. Without it, even the best edge decays from inconsistent execution. The framework here provides three distinct routine phases, four design patterns for structuring them, and real Python implementations that can integrate directly into your trading platform.

## TL;DR Checklist

- [ ] Complete pre-market checklist before any order submission (market scan, position review, risk check)
- [ ] Log your emotional state at each phase transition — calm, anxious, euphoric, frustrated
- [ ] Execute during-market rituals (size verification, confirmation pause, slippage awareness)
- [ ] Record post-mortem within 2 hours of market close while memory is fresh
- [ ] Track routine adherence score weekly; below 80% triggers mandatory process review
- [ ] Review and update your routine monthly — routines must evolve with your edge

---

## When to Use

Use this skill when:

- You are building a new trading practice from scratch and need structured daily habits
- Your existing routine feels inconsistent and you suspect execution drift is degrading performance
- A recent string of losses traces back to skipping preparation steps rather than bad signals
- You are scaling from paper trading to live capital and need discipline scaffolding
- Your post-market reviews are haphazard and producing no actionable insights

---

## When NOT to Use

Avoid this skill for:

- High-frequency algorithmic systems that execute sub-second decisions — use `exchange-order-execution-api` instead
- One-off trade analysis without recurring pattern — use `paper-performance-attribution` instead
- Portfolio-level asset allocation strategy — use `risk-position-sizing` or `risk-correlation-risk` instead

---

## Core Workflow

### Phase 1: Pre-Market Routine (Before Market Open)

1. **Data Integrity Check** — Verify all data feeds are connected and within acceptable lag thresholds. Check candle data completeness for your primary symbols. Use `pre_market_checklist()` to generate a pass/fail report. **Checkpoint:** If any critical feed fails the integrity check, do not proceed to active trading until resolved. Log the incident in your daily log.

2. **Economic Calendar Review** — Scan for scheduled events (FOMC, CPI, earnings, economic releases) during your active trading window. Flag any high-impact events that may cause volatility spikes or widen spreads. Use `scan_economic_calendar()` to pull scheduled events and score their impact. **Checkpoint:** If a high-impact event falls within the next 2 hours, reduce position sizing by at least 50% for affected instruments.

3. **Position Portfolio Review** — For each open position, verify: stop-loss is intact, thesis still holds (reference `your-position` skill), and no invalidation criteria have been triggered. Check overnight price gaps against your risk limits. Use `review_open_positions()` to generate a structured report. **Checkpoint:** Any position with a breached stop must be evaluated for immediate exit before any new entries.

4. **Watchlist Scan** — Review pre-market candidates against your entry criteria from `your-edge`. Score each candidate on a 1-10 edge-strength scale. Narrow the list to maximum 3 high-conviction candidates per session to prevent decision fatigue. Use `score_watchlist_candidates()` for systematic evaluation. **Checkpoint:** Never enter based on a candidate that was not on your pre-market watchlist — impulse entries destroy edge consistency.

5. **Risk Budget Allocation** — Determine today's maximum risk exposure based on your daily loss limit, current account drawdown, and routine adherence score from previous days. Use `calculate_daily_risk_budget()` to compute position sizes dynamically. **Checkpoint:** If your routine adherence score dropped below 80% in the previous week, reduce today's total risk budget by 25%.

### Phase 2: During-Market Execution Rituals (Active Hours)

6. **The Confirmation Pause** — Before every new order submission, pause for a minimum of 3 seconds and verbally confirm: symbol, direction, size, entry price, stop-loss level, and take-profit target. This ritual prevents the most common execution errors (fat-finger entries, wrong-side orders). Use `validate_order_submission()` to enforce structured confirmation. **Checkpoint:** If you catch yourself rushing through this step more than twice in a session, step away from the screen for 10 minutes.

7. **Slippage Awareness Check** — For each filled order, record the difference between intended entry/exit price and actual fill price. Track cumulative slippage against your strategy's expected transaction costs. Use `track_slippage()` function below. **Checkpoint:** If cumulative slippage exceeds 150% of your estimated cost budget for the session, reduce trading frequency until market conditions improve or resume after a break.

8. **Emotional State Mid-Check** — At the midpoint of your active session (or after every 3 trades, whichever comes first), pause and log: current emotional state (1-10 scale where 5 is neutral), physical state (fatigued/energized/normal), and focus quality (distracted/concentrated). If any metric falls below acceptable thresholds, reduce trading intensity. Use `mid_session_emotional_check()` function. **Checkpoint:** Do not place any new orders if emotional score drops below 3 — the market will always be there tomorrow; your capital may not survive a bad session.

9. **Trailing Stop Management** — For each open position with unrealized gains, verify that trailing stops have been updated according to your `your-edge` parameters. Check that highest-highest tracking is accurate and stop distances are appropriate for current volatility (ATR-based). Use `manage_trailing_stops()` function below. **Checkpoint:** Never widen a stop-loss — only tighten it as price moves in your favor. A widened stop is a surrender of risk management.

### Phase 3: Post-Market Routine (After Close)

10. **Trade Log Completion** — Record every executed trade with: symbol, direction, entry/exit prices, size, P&L, slippage incurred, emotional state at entry and exit, and which phase of your routine guided the decision. Use `log_trade()` function below to structure this data consistently. **Checkpoint:** Every filled order must have a corresponding journal entry before you close your trading session. Incomplete logs are worse than no logs — they create false confidence.

11. **Performance Attribution** — Separate today's outcomes into: edge-driven P&L (trades that followed your plan), process-driven P&L (good decisions with unfavorable outcomes), and luck-driven P&L (poor decisions with favorable outcomes). Use `attribution_analysis()` function below. **Checkpoint:** A profitable day driven by luck is a warning, not a celebration. Identify the specific trade(s) and note what to do differently next time they arise.

12. **Daily Summary Report** — Generate a structured report covering: routine adherence score (percentage of checklist items completed), total P&L vs. target, number of new entries/exits, slippage analysis, emotional state tracking summary, and key learning for tomorrow. Use `generate_daily_report()` function below. **Checkpoint:** Review your weekly adherence trend. A declining trend is a leading indicator of future performance degradation — address it before it manifests in P&L.

13. **Next-Day Preparation** — Based on today's closing data and overnight market structure, identify 1-3 candidates for tomorrow's watchlist. Note any upcoming catalysts (earnings, economic data, technical levels to watch). Update your pre-market checklist with any process improvements identified from today's post-mortem. **Checkpoint:** Never go into tomorrow's pre-market prep without at least one candidate already scoped — decision-making under time pressure produces inferior entries.

---

## Implementation Patterns

### Pattern 1: Pre-Market Checklist Engine

```python
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional


class FeedStatus(Enum):
    OK = "ok"
    DEGRADED = "degraded"
    OFFLINE = "offline"
    STALE = "stale"


class EventImpact(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    EXTREME = 4


@dataclass
class MarketFeed:
    """Represents a single data feed connection status."""

    symbol: str
    status: FeedStatus
    last_update: datetime
    latency_ms: float
    max_acceptable_latency_ms: float = 500.0

    @property
    def is_healthy(self) -> bool:
        """Check if feed meets minimum health thresholds."""
        if self.status != FeedStatus.OK:
            return False
        if self.latency_ms > self.max_acceptable_latency_ms:
            return False
        age = datetime.now() - self.last_update
        return age < timedelta(minutes=5)


@dataclass
class EconomicEvent:
    """Scheduled economic event with impact scoring."""

    event_name: str
    scheduled_time: datetime
    currency: str
    impact: EventImpact
    previous_value: Optional[str] = None
    forecast_value: Optional[str] = None

    def is_within_window(self, window_hours: int) -> bool:
        """Check if event occurs within specified time window."""
        now = datetime.now()
        return abs((self.scheduled_time - now).total_seconds()) <= window_hours * 3600


@dataclass
class PreMarketReport:
    """Comprehensive pre-market preparation report."""

    timestamp: datetime
    feed_health: Dict[str, bool]
    high_impact_events: List[EconomicEvent]
    positions_requiring_attention: List[str]
    watchlist_candidates: int
    daily_risk_budget_pct: float
    readiness_score: float  # 0.0 to 1.0
    can_trade: bool


class PreMarketRoutine:
    """Implements structured pre-market preparation for trading sessions."""

    def __init__(self):
        self.data_feeds: Dict[str, MarketFeed] = {}
        self.open_positions: List[dict] = []
        self.watchlist: List[dict] = []
        self.daily_loss_limit_pct: float = 0.02  # 2% max daily loss
        self.routine_adherence_score: float = 1.0  # 0.0 to 1.0

    def check_data_integrity(self) -> PreMarketReport:
        """Verify all data feeds are healthy before trading begins."""
        feed_health = {}
        critical_failures = 0

        for symbol, feed in self.data_feeds.items():
            healthy = feed.is_healthy
            feed_health[symbol] = healthy
            if not healthy:
                critical_failures += 1

        can_trade = critical_failures == 0

        return PreMarketReport(
            timestamp=datetime.now(),
            feed_health=feed_health,
            high_impact_events=[],
            positions_requiring_attention=[],
            watchlist_candidates=len(self.watchlist),
            daily_risk_budget_pct=self.daily_loss_limit_pct,
            readiness_score=1.0 if can_trade else 0.0,
            can_trade=can_trade,
        )

    def scan_economic_calendar(
        self, events: List[EconomicEvent], window_hours: int = 4
    ) -> List[EconomicEvent]:
        """Scan for high-impact economic events within trading window."""
        upcoming = [e for e in events if e.is_within_window(window_hours)]
        return sorted(
            [e for e in upcoming if e.impact >= EventImpact.MEDIUM],
            key=lambda x: x.scheduled_time,
        )

    def review_open_positions(self) -> List[dict]:
        """Review all open positions for risk changes during overnight session."""
        attention_needed = []
        for pos in self.open_positions:
            flags: list[str] = []

            if pos.get("stop_breached", False):
                flags.append("STOP_BREACHED")

            overnight_change_pct = pos.get("overnight_change_pct", 0.0)
            if abs(overnight_change_pct) > 3.0:
                flags.append(f"OVERNIGHT_GAP_{overnight_change_pct:+.1f}%")

            if not pos.get("thesis_validated", True):
                flags.append("THESIS_INVALIDATED")

            if flags:
                attention_needed.append(
                    {"symbol": pos["symbol"], "flags": flags, "current_pnl_pct": pos.get("current_pnl_pct", 0.0)}
                )

        return attention_needed

    def score_watchlist_candidates(
        self, candidates: List[dict], max_candidates: int = 3
    ) -> List[dict]:
        """Score and narrow watchlist to highest-conviction entries."""
        scored = sorted(
            candidates,
            key=lambda c: c.get("edge_score", 0),
            reverse=True,
        )

        selected = scored[:max_candidates]

        for candidate in selected:
            if candidate.get("edge_score", 0) < 7:
                raise ValueError(
                    f"Edge score {candidate['edge_score']:.1f} below minimum threshold of 7.0 "
                    f"for symbol {candidate['symbol']}. Reject or gather more data."
                )

        return selected

    def calculate_daily_risk_budget(self, current_drawdown_pct: float) -> float:
        """Calculate today's risk budget based on drawdown and adherence score."""
        base_budget = self.daily_loss_limit_pct

        if current_drawdown_pct > 0.02:
            base_budget *= 0.5
        elif current_drawdown_pct > 0.01:
            base_budget *= 0.75

        adherence_penalty = max(0, (1.0 - self.routine_adherence_score)) * 0.25
        adjusted_budget = base_budget * (1 - adherence_penalty)

        return round(max(0.0025, adjusted_budget), 4)

    def generate_readiness_report(self, current_drawdown_pct: float = 0.0) -> PreMarketReport:
        """Generate complete pre-market readiness report."""
        feed_report = self.check_data_integrity()

        attention = self.review_open_positions()
        feed_report.positions_requiring_attention = [p["symbol"] for p in attention]

        risk_budget = self.calculate_daily_risk_budget(current_drawdown_pct)
        feed_report.daily_risk_budget_pct = risk_budget

        feed_health_score = sum(feed_report.feed_health.values()) / max(1, len(feed_report.feed_health))
        attention_penalty = min(0.3, len(attention) * 0.1)
        feed_report.readiness_score = round(max(0.0, feed_health_score - attention_penalty), 2)

        return feed_report


# Example usage
routine = PreMarketRoutine()
routine.data_feeds["BTC/USD"] = MarketFeed(
    symbol="BTC/USD", status=FeedStatus.OK, last_update=datetime.now(), latency_ms=45.0
)
routine.data_feeds["ETH/USD"] = MarketFeed(
    symbol="ETH/USD", status=FeedStatus.OK, last_update=datetime.now(), latency_ms=52.0
)

report = routine.generate_readiness_report(current_drawdown_pct=0.015)
print(f"Can trade: {report.can_trade}")
print(f"Readiness score: {report.readiness_score}")
print(f"Risk budget today: {report.daily_risk_budget_pct*100:.2f}%")
```

### Pattern 2: During-Market Execution and Slippage Tracking

```python
from dataclasses import dataclass, field
from typing import Optional


class EmotionalState(Enum):
    CALM = "calm"
    FOCUSED = "focused"
    ANXIOUS = "anxious"
    EUPHORIC = "euphoric"
    FRUSTRATED = "frustrated"
    FATIGUED = "fatigued"


@dataclass
class OrderSubmission:
    """Validated order before submission to exchange."""

    symbol: str
    direction: str  # 'buy' or 'sell'
    size: float
    entry_price: float
    stop_loss: float
    take_profit: Optional[float] = None
    confirmation_logged_at: Optional[datetime] = None
    confirmation_rushed: bool = False


@dataclass
class FillRecord:
    """Actual fill from the exchange with slippage analysis."""

    order: OrderSubmission
    filled_price: float
    filled_time: datetime
    commission_paid: float

    @property
    def slippage_pct(self) -> float:
        """Calculate realized slippage as percentage of intended price."""
        if self.order.entry_price == 0:
            return 0.0
        direction_multiplier = 1.0 if self.order.direction == "buy" else -1.0
        return (
            (self.filled_price - self.order.entry_price) * direction_multiplier
            / abs(self.order.entry_price)
        ) * 100


@dataclass
class SessionEmotionalLog:
    """Mid-session emotional and physical state checkpoint."""

    timestamp: datetime
    emotional_score: int  # 1-10, where 5 is neutral/ideal
    physical_state: str  # "fatigued", "normal", "energized"
    focus_quality: str  # "distracted", "moderate", "concentrated"
    trades_since_last_check: int


class ExecutionRitualManager:
    """Manages during-market execution discipline and slippage awareness."""

    def __init__(self):
        self.fill_history: list[FillRecord] = []
        self.emotional_logs: list[SessionEmotionalLog] = []
        self.trades_since_last_emotional_check: int = 0
        self.max_slippage_budget_pct: float = 0.10  # 10 bps session budget

    def validate_order_submission(
        self, symbol: str, direction: str, size: float, entry_price: float, stop_loss: float
    ) -> OrderSubmission:
        """Enforce the Confirmation Pause ritual before order submission."""
        now = datetime.now()

        order = OrderSubmission(
            symbol=symbol,
            direction=direction,
            size=size,
            entry_price=entry_price,
            stop_loss=stop_loss,
            confirmation_logged_at=now,
            confirmation_rushed=False,
        )

        if direction == "buy" and stop_loss >= entry_price:
            raise ValueError(
                f"For BUY order on {symbol}: stop-loss ({stop_loss}) must be below entry ({entry_price})"
            )
        if direction == "sell" and stop_loss <= entry_price:
            raise ValueError(
                f"For SELL order on {symbol}: stop-loss ({stop_loss}) must be above entry ({entry_price})"
            )

        return order

    def record_fill(self, order: OrderSubmission, filled_price: float, commission: float) -> FillRecord:
        """Record a fill with slippage tracking."""
        fill = FillRecord(
            order=order,
            filled_price=filled_price,
            filled_time=datetime.now(),
            commission_paid=commission,
        )

        self.fill_history.append(fill)
        return fill

    def get_cumulative_slippage(self) -> dict:
        """Calculate cumulative slippage for the session."""
        if not self.fill_history:
            return {
                "total_trades": 0,
                "cumulative_slippage_pct": 0.0,
                "avg_slippage_bps": 0.0,
                "exceeds_budget": False,
                "budget_remaining_pct": self.max_slippage_budget_pct,
            }

        total_slippage = sum(abs(f.slippage_pct) for f in self.fill_history)
        avg_slippage_bps = (total_slippage / len(self.fill_history)) * 100

        return {
            "total_trades": len(self.fill_history),
            "cumulative_slippage_pct": round(total_slippage, 4),
            "avg_slippage_bps": round(avg_slippage_bps, 2),
            "exceeds_budget": total_slippage > self.max_slippage_budget_pct * 100,
            "budget_remaining_pct": round(max(0, (self.max_slippage_budget_pct * 100) - total_slippage), 4),
        }

    def mid_session_emotional_check(
        self, emotional_score: int, physical_state: str, focus_quality: str
    ) -> dict:
        """Mid-session check-in for emotional and physical state assessment."""
        log = SessionEmotionalLog(
            timestamp=datetime.now(),
            emotional_score=emotional_score,
            physical_state=physical_state,
            focus_quality=focus_quality,
            trades_since_last_check=self.trades_since_last_emotional_check,
        )

        self.emotional_logs.append(log)
        self.trades_since_last_emotional_check = 0

        acceptable = emotional_score >= 3 and focus_quality != "distracted"
        return {
            "emotional_state": log,
            "can_continue_trading": acceptable,
            "recommendation": (
                "PAUSE_TRADING — step away for 10 minutes" if not acceptable else "CONTINUE_AS_USUAL"
            ),
        }

    def manage_trailing_stops(self, positions: List[dict], current_atr: float, atr_multiplier: float = 2.0) -> List[dict]:
        """Update trailing stops for all open positions with unrealized gains."""
        updated_positions = []

        for pos in positions:
            if not pos.get("unrealized_gain_pct", 0) > 0:
                continue

            current_stop = pos.get("current_stop_loss", pos["entry_price"])
            new_stop = pos["highest_price"] - (current_atr * atr_multiplier)

            if pos["direction"] == "buy":
                if new_stop < current_stop and new_stop > pos["entry_price"]:
                    pos["current_stop_loss"] = new_stop
                    updated_positions.append({"symbol": pos["symbol"], "stop_updated": True, "new_stop": new_stop})
                else:
                    updated_positions.append({"symbol": pos["symbol"], "stop_updated": False, "reason": "no_tightening_needed"})
            elif pos["direction"] == "sell":
                if new_stop > current_stop and new_stop < pos["entry_price"]:
                    pos["current_stop_loss"] = new_stop
                    updated_positions.append({"symbol": pos["symbol"], "stop_updated": True, "new_stop": new_stop})

        return updated_positions


# Example usage: execution ritual flow
manager = ExecutionRitualManager()

order = manager.validate_order_submission(
    symbol="BTC/USD", direction="buy", size=0.5, entry_price=67500.0, stop_loss=66800.0
)
fill = manager.record_fill(order, filled_price=67535.0, commission=12.50)

slippage_info = manager.get_cumulative_slippage()
print(f"Avg slippage: {slippage_info['avg_slippage_bps']} bps")

emotional_result = manager.mid_session_emotional_check(
    emotional_score=7, physical_state="normal", focus_quality="concentrated"
)
print(f"Can continue: {emotional_result['can_continue_trading']}")
```

### Pattern 3: Post-Market Trade Logging and Attribution

```python
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class JournalEntry:
    """Structured post-market journal entry for every trade."""

    symbol: str
    direction: str
    entry_price: float
    exit_price: float
    size: float
    commission: float
    slippage_pct: float
    entry_emotional_state: EmotionalState
    exit_emotional_state: EmotionalState
    followed_routine: bool  # True if all checklist items were completed
    decision_guided_by: str  # "pre_market_watchlist" | "impulse" | "intraday_signal"
    pnl_net: float


@dataclass
class AttributionResult:
    """P&L attribution categorization."""

    symbol: str
    total_pnl: float
    category: str  # "edge_driven" | "process_driven" | "luck_driven"
    edge_score_given: float
    routine_adherence: bool
    description: str


class PostMarketRoutine:
    """Implements structured post-market review and attribution."""

    def __init__(self):
        self.daily_journals: list[JournalEntry] = []
        self.daily_routine_completed_items: int = 0
        self.daily_routine_total_items: int = 7  # Total checklist items for the day

    def log_trade(
        self,
        symbol: str,
        direction: str,
        entry_price: float,
        exit_price: float,
        size: float,
        commission: float,
        slippage_pct: float,
        followed_routine: bool,
        decision_source: str,
    ) -> JournalEntry:
        """Record a trade in the structured journal."""
        entry = JournalEntry(
            symbol=symbol,
            direction=direction,
            entry_price=entry_price,
            exit_price=exit_price,
            size=size,
            commission=commission,
            slippage_pct=slippage_pct,
            entry_emotional_state=EmotionalState.CALM,
            exit_emotional_state=EmotionalState.CALM,
            followed_routine=followed_routine,
            decision_guided_by=decision_source,
            pnl_net=self._calculate_net_pnl(entry_price, exit_price, size, commission),
        )

        self.daily_journals.append(entry)
        return entry

    def _calculate_net_pnl(self, entry: float, exit: float, size: float, commission: float) -> float:
        """Calculate net P&L including commission and slippage costs."""
        gross_pnl = (exit - entry) * size
        return round(gross_pnl - commission, 2)

    def attribution_analysis(self, entries: List[JournalEntry]) -> List[AttributionResult]:
        """Categorize each trade by whether outcome matched process quality."""
        results: list[AttributionResult] = []

        for entry in entries:
            if entry.followed_routine and entry.decision_guided_by == "pre_market_watchlist":
                edge_score = 8.0
                process_quality = "strong"
            elif entry.followed_routine:
                edge_score = 6.0
                process_quality = "adequate"
            else:
                edge_score = 3.0
                process_quality = "weak"

            pnl_positive = entry.pnl_net > 0
            good_process = edge_score >= 7.0

            if pnl_positive and good_process:
                category = "edge_driven"
                desc = f"Good process ({process_quality}) produced positive result. This is repeatable."
            elif not pnl_positive and good_process:
                category = "process_driven"
                desc = f"Strong process but unfavorable outcome. Trust the edge long-term; review specific trade for slippage or timing issues."
            elif pnl_positive and not good_process:
                category = "luck_driven"
                desc = f"Weak process produced positive result — this is dangerous. The market paid you to learn a lesson."
            else:
                category = "process_driven"
                desc = f"Weak process with negative result — expected outcome. Review why routine was bypassed."

            results.append(
                AttributionResult(
                    symbol=entry.symbol,
                    total_pnl=entry.pnl_net,
                    category=category,
                    edge_score_given=edge_score,
                    routine_adherence=entry.followed_routine,
                    description=desc,
                )
            )

        return results

    def generate_daily_report(
        self,
        routine_total_items: int,
        routine_completed_items: int,
        total_pnl: float,
        target_pnl: float,
        slippage_info: dict,
        avg_emotional_score: float,
    ) -> dict:
        """Generate a comprehensive daily summary report for post-market review."""
        adherence_pct = round((routine_completed_items / max(1, routine_total_items)) * 100, 1)

        if adherence_pct >= 95 and total_pnl >= target_pnl * 0.8:
            assessment = "EXCELLENT — Strong process execution with solid results"
        elif adherence_pct >= 80:
            assessment = "GOOD — Routine mostly followed; minor gaps to address"
        elif adherence_pct >= 60:
            assessment = "CONCERNING — Significant routine gaps detected; review required before next session"
        else:
            assessment = "CRITICAL — Routine adherence collapsed; mandatory process review before trading tomorrow"

        return {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "routine_adherence_pct": adherence_pct,
            "total_pnl": round(total_pnl, 2),
            "pnl_vs_target_pct": round((total_pnl / max(0.01, target_pnl)) * 100, 1),
            "total_trades": len(self.daily_journals),
            "avg_slippage_bps": slippage_info.get("avg_slippage_bps", 0),
            "avg_emotional_state": round(avg_emotional_score, 1),
            "assessment": assessment,
            "key_learning": self._extract_key_learning(),
        }

    def _extract_key_learning(self) -> str:
        """Extract the single most important learning from today's journals."""
        if not self.daily_journals:
            return "No trades executed today."

        for entry in reversed(self.daily_journals):
            if not entry.followed_routine and abs(entry.pnl_net) > 0:
                return (
                    f"Impulse decision on {entry.symbol} {'resulted in ' if entry.pnl_net > 0 else 'cost '} "
                    f"{abs(entry.pnl_net):.2f}. Impulse entries destroy edge consistency — "
                    f"add to pre-market watchlist tomorrow or skip entirely."
                )

        return "All trades followed the routine. Review which signals produced the best risk-adjusted outcomes for future reference."


# Example usage: post-market flow
post = PostMarketRoutine()
post.log_trade(
    symbol="ETH/USD", direction="buy", entry_price=3450.0, exit_price=3485.0,
    size=2.0, commission=8.0, slippage_pct=0.12, followed_routine=True,
    decision_source="pre_market_watchlist"
)

attribution = post.attribution_analysis(post.daily_journals)
for attr in attribution:
    print(f"{attr.symbol}: {attr.category} | P&L: {attr.total_pnl:.2f} | {attr.description}")

report = post.generate_daily_report(
    routine_total_items=7,
    routine_completed_items=6,
    total_pnl=61.0,
    target_pnl=50.0,
    slippage_info={"avg_slippage_bps": 4.2},
    avg_emotional_score=7.0,
)
print(f"Daily assessment: {report['assessment']}")
```

---

## Constraints

### MUST DO
- Complete every pre-market checklist item before submitting your first order of the day
- Log your emotional state at each phase transition — this data reveals decision-quality patterns over time
- Use the Confirmation Pause (minimum 3 seconds) before every new entry order
- Record slippage for every fill and compare against your strategy's estimated transaction costs
- Complete post-market journal entries within 2 hours of market close — stale journals are worthless
- Track routine adherence as a percentage score each day; flag any week below 80% for mandatory review
- Never widen a stop-loss on an open position — only tighten it as price moves favorably
- Update your watchlist and risk budget during the pre-market routine, never during active market hours

### MUST NOT DO
- Skip the pre-market checklist even when "the setup looks obvious" — obvious setups are where biases run strongest
- Place orders after an emotional mid-session check-in scores below 3/10 on emotional state
- Base today's watchlist on overnight headlines alone — always score candidates against your documented edge criteria
- Trade a symbol that was not pre-scoped during the pre-market routine unless it triggers a defined intraday signal
- Enter post-market attribution analysis without first completing all individual trade journal entries
- Continue trading through fatigue (physical_state = "fatigued") — schedule rest days proactively

---

## Output Template

When applying this skill, produce:

1. **Pre-Market Readiness Report** — Feed health, high-impact events flagged, position review flags, and daily risk budget
2. **Execution Log** — Every order with confirmation timestamp, fill prices, and realized slippage
3. **Emotional State Timeline** — Chronological log of mid-session checkpoints with can-continue-trading verdicts
4. **Trailing Stop Update Report** — Which stops were tightened and by how much
5. **Journal Entries** — One per trade with emotional states at entry/exit, routine adherence flag, and decision source
6. **Attribution Analysis** — Each trade categorized as edge-driven, process-driven, or luck-driven
7. **Daily Summary** — Adherence score, P&L vs target, slippage metrics, assessment rating, and key learning

---

## Related Skills

| Skill | Purpose |
|---|---|
| `fundamentals-trading-plan` | Your overall trading plan defines what strategies you use; your routine ensures you execute them consistently |
| `your-edge` | Your edge is the statistical advantage; your routine is the behavioral system that captures it reliably |
| `your-position` | Position thesis and bias detection; your routine enforces daily review of open positions against their thesis |
| `fundamentals-trading-psychology` | Broader trading psychology concepts; your routine operationalizes those concepts into daily habits |
| `paper-performance-attribution` | Performance attribution at the portfolio level; your journal feeds the data this skill analyzes |

---

## Philosophical Foundation

Routines are the bridge between **knowing** what to do and **doing** it under pressure. A strategy's edge is irrelevant if you cannot execute it consistently because you skipped pre-market prep, rushed entries without confirmation, or failed to review losses objectively after the close.

The three phases of your routine map to the three states of a trading day:

1. **Pre-Market (Preparation)** — The world is quiet. This is when you build discipline by scanning data, reviewing positions, and allocating risk *before* emotions are triggered by price movement. Rushing past this phase is like loading a gun without checking the chamber.

2. **During-Market (Execution)** — The world is chaotic. Your rituals (confirmation pause, slippage tracking, emotional check-ins) exist to keep mechanical discipline alive amid volatility. They are not suggestions; they are circuit breakers against your worst impulses.

3. **Post-Market (Review)** — The world is still again. This is where you separate luck from skill through attribution analysis and ensure tomorrow's routine improves on today's weaknesses. Skipping post-market review means every mistake gets repeated, compounding over time.

The ultimate goal is not rigid adherence for its own sake — it is building **automatic competence**. When your routine becomes unconscious competence, your conscious mind is freed to focus on edge refinement rather than process maintenance.
