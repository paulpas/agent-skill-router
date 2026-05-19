---
name: order-flow-toxicity
description: Detects toxic (informed) order flow using VPIN, PIN models, and adverse selection metrics to protect trading algorithms from predatory market participants and manage execution risk.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  triggers: order flow toxicity, VPIN, PIN model, adverse selection, predatory HFT, toxic flow, informed trading, liquidity provider toxicity
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: ai-order-flow-analysis, risk-kill-switches, execution-slippage-modeling, data-order-book
---

# Order Flow Toxicity & Adverse Selection

Detects toxic (informed) order flow and quantifies adverse selection cost to protect passive market makers and limit-order-based strategies from predatory HFT activity. When loading this skill, you act as a quantitative risk analyst who measures the proportion of informed versus noise flow in real time and triggers protective actions when toxicity exceeds safe thresholds.

## TL;DR Checklist

- [ ] Segment incoming trades into volume-synchronized buckets (not time buckets)
- [ ] Compute VPIN from intra-bucket imbalances over a rolling window of 50+ buckets
- [ ] Fit PIN via EM algorithm with convergence check on log-likelihood change < 1e-6
- [ ] Estimate adverse selection cost per fill as mid-price drift between submission and fill
- [ ] Activate kill switch when VPIN > 0.7 for 5+ consecutive buckets — reduce size by 50%, widen spreads 2x, flag for review
- [ ] Log full state dump (VPIN, PIN, adverse selection cost, order book snapshot, positions) on every kill switch event

---

## When to Use

- You operate a passive quoting or market-making strategy and need early warning that informed traders are exploiting your quotes
- You suspect HFT predators (latency arbitrage, quote stuffing, spoofing) are degrading your execution quality
- You need to dynamically adjust position sizing, spread width, or order freshness based on measured flow toxicity
- You are designing a risk engine and need toxic-flow detection as a layer above standard stop-loss and drawdown controls
- You are post-trade analyzing execution quality by decomposing slippage into adverse selection vs. timing cost

---

## When NOT to Use

- Purely directional / aggressive strategies that hunt liquidity — toxicity metrics apply to passive risk, not active taker flow (use `ai-order-flow-analysis` for directional signals instead)
- Low-frequency swing trading with minutes-to-hours holding periods — VPIN and PIN require high-frequency trade data to be meaningful; below ~10 trades per minute the signal degrades into noise
- When you have only OHLCV bars without individual trade timestamps, sizes, or buy/sell flags — bucket-based toxic flow measurement is impossible without tick-level data

---

## Core Workflow

1. **Segment Trades into Volume Buckets** — Divide incoming trades into buckets of fixed size (default 50,000 shares). Each bucket represents roughly equal expected volume regardless of time elapsed. Track cumulative buy and sell volume within each bucket. **Checkpoint:** Verify bucket sizes are appropriate for the asset's typical trading frequency — crypto uses smaller buckets (~1 BTC) than equities; adjust via `BUCKET_SIZE = 50_000` constant per instrument class.

2. **Compute Intra-Bucket Imbalance** — For each completed bucket, calculate `imbalance = abs(buy_volume - sell_volume)`. Sum all intra-bucket imbalances over a rolling window of N buckets (default 50). Compute VPIN = sum_of_imbalances / total_bucket_volume. **Checkpoint:** VPIN ranges from 0 (perfectly balanced flow) to 1 (extremely toxic); values >0.6 trigger elevated risk flags, and values >0.7 require kill switch consideration.

3. **Estimate PIN via EM Algorithm** — Fit the Buy-Seller Orderflow Model (BSOM) using Expectation-Maximization: initialize α (informed probability) and λ (arrival rate), iterate E-step (estimate hidden informed states) and M-step (update parameters) for up to 200 iterations or until log-likelihood converges within 1e-6. **Checkpoint:** PIN is bounded [0,1]; values >0.5 indicate significant informed presence; values <0.1 suggest mostly noise trading.

4. **Calculate Adverse Selection Cost** — For each executed trade, estimate the cost of being on the wrong side: compare mid-price at order submission to mid-price at order fill. Positive cost means you were adverse-selected (informed flow hit your passive orders). Aggregate as a weighted average across recent fills. **Checkpoint:** If adverse selection cost exceeds 0.5x average spread for 10+ consecutive fills, halt passive quoting immediately and log the event.

5. **Detect Spoofing & Layering** — Track order book dynamics: if large orders appear and cancel repeatedly within <200ms without being hit, flag as potential spoofing. Count repeated appearances of same price level by same logical participant (inferred from order pattern clustering). **Checkpoint:** Spoofing detection requires ≥3 cancellations at same price level within the time window AND total canceled size >10x average depth at that level.

6. **Activate Toxic Flow Kill Switch** — When VPIN exceeds threshold (default 0.7) for M consecutive buckets (default 5), reduce position sizing by 50%, widen quote spreads by 2x, and flag all new signals for manual review. When toxicity normalizes below threshold for K buckets (default 10), gradually restore normal operations over a cooldown period. **Checkpoint:** Kill switch activation MUST log the full state dump: VPIN value, PIN estimate, adverse selection cost, order book snapshot, and active positions.

---

## Implementation Patterns

### Pattern 1: VPIN (Volume-Synchronized Probability of Informed Trading) Calculator

VPIN segments trades into volume buckets rather than time buckets, making it robust across varying trading frequencies. The core insight is that informed flow creates persistent one-sidedness within each bucket — the greater the imbalance, the higher the toxicity estimate.

```python
"""
VPIN Calculator — Volume-Synchronized Probability of Informed Trading.

File path convention: risk_engine/vpin_calculator.py

Uses volume-synchronized bucketing to detect toxic (informed) order flow.
Adapted from Easley, López de Prado, and O'Hara (2012).
"""

from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Optional


@dataclass
class Trade:
    """Single executed trade record."""
    timestamp_ns: int          # nanosecond precision for HFT contexts
    price: float
    size: float
    aggressor_side: str      # 'buy' (aggressor hit asks) or 'sell' (aggressor hit bids)


@dataclass
class VPINConfig:
    """Configuration for the VPIN calculator."""
    bucket_size: float = 50_000.0          # target volume per bucket
    rolling_window_buckets: int = 50       # number of buckets for rolling VPIN
    elevated_threshold: float = 0.6        # warn when exceeded
    critical_threshold: float = 0.7        # kill-switch trigger

    def __post_init__(self) -> None:
        if self.bucket_size <= 0:
            raise ValueError("bucket_size must be positive")
        if self.rolling_window_buckets < 5:
            raise ValueError("rolling_window_buckets must be >= 5 for stable VPIN")


@dataclass
class VolumeBucket:
    """Accumulates buy/sell volume until reaching target size."""
    buy_volume: float = 0.0
    sell_volume: float = 0.0
    completed: bool = False

    @property
    def total_volume(self) -> float:
        return self.buy_volume + self.sell_volume

    @property
    def imbalance(self) -> float:
        """Absolute intra-bucket volume imbalance."""
        return abs(self.buy_volume - self.sell_volume)


class VPINCalculator:
    """
    Real-time VPIN calculator using volume-synchronized bucketing.

    Usage:
        calc = VPINCalculator(VPINConfig())
        vpin = calc.process_trades(trade_stream)  # iterable of Trade
    """

    def __init__(self, config: Optional[VPINConfig] = None) -> None:
        self.config = config or VPINConfig()
        self._current_bucket: VolumeBucket = VolumeBucket()
        self._completed_buckets: Deque[VolumeBucket] = deque(maxlen=self.config.rolling_window_buckets * 2)
        self._imbalance_history: Deque[float] = deque(maxlen=self.config.rolling_window_buckets)
        self._total_volume_history: Deque[float] = deque(maxlen=self.config.rolling_window_buckets)

    def process_trade(self, trade: Trade) -> Optional[float]:
        """
        Process a single trade and return VPIN if a bucket just completed.

        Returns None while still accumulating the current bucket.
        Returns VPIN value when a bucket is completed and all rolling windows are filled.
        """
        # Accumulate into current bucket
        if trade.aggressor_side == 'buy':
            self._current_bucket.buy_volume += trade.size
        else:
            self._current_bucket.sell_volume += trade.size

        # Check if bucket is full
        if self._current_bucket.total_volume >= self.config.bucket_size:
            return self._complete_bucket()
        return None

    def _complete_bucket(self) -> Optional[float]:
        """Finalize the current bucket and compute VPIN if enough history exists."""
        completed = self._current_bucket
        self._completed_buckets.append(completed)
        self._imbalance_history.append(completed.imbalance)
        self._total_volume_history.append(completed.total_volume)

        # Need at least rolling_window_buckets for stable estimate
        if len(self._imbalance_history) < self.config.rolling_window_buckets:
            self._current_bucket = VolumeBucket()
            return None

        vpin = self._compute_vpin()
        self._current_bucket = VolumeBucket()
        return vpin

    def _compute_vpin(self) -> float:
        """
        Compute VPIN over the rolling window.

        VPIN = sum(abs(buy_i - sell_i)) / sum(total_volume_i) for i in rolling window

        Range: [0, 1] where 1 means perfect one-sided flow (maximally toxic).
        """
        n = len(self._imbalance_history)
        sum_imbalance = sum(self._imbalance_history)
        sum_total_volume = sum(self._total_volume_history)

        if sum_total_volume == 0:
            return 0.0

        vpin = sum_imbalance / sum_total_volume
        return min(max(vpin, 0.0), 1.0)  # clamp to [0, 1]

    def get_toxicity_state(self) -> dict:
        """Return current toxicity assessment and metrics."""
        if len(self._imbalance_history) < self.config.rolling_window_buckets:
            return {
                "vpin": None,
                "buckets_accumulated": len(self._completed_buckets),
                "toxicity_level": "insufficient_data",
                "action": "wait_for_more_data",
            }

        vpin = self._compute_vpin()

        if vpin >= self.config.critical_threshold:
            level = "critical"
            action = "activate_kill_switch"
        elif vpin >= self.config.elevated_threshold:
            level = "elevated"
            action = "reduce_sizing_widen_spreads"
        else:
            level = "normal"
            action = "continue_normal_operations"

        return {
            "vpin": round(vpin, 4),
            "buckets_accumulated": len(self._completed_buckets),
            "rolling_buckets": len(self._imbalance_history),
            "toxicity_level": level,
            "action": action,
        }
```

**Bucket sizing guidance per asset class:**

| Asset Class | Recommended Bucket Size | Rationale |
|---|---|---|
| Large-cap equities (SPY, AAPL) | 50,000 shares | ~1-2% of average minute volume |
| Small-cap equities | 10,000 shares | Lower liquidity, smaller buckets |
| Crypto BTC/ETH | 1.0 - 5.0 BTC | High-frequency; keep buckets meaningful |
| Forex majors (EUR/USD) | 10 million USD notional | Interbank market requires large buckets |

---

### Pattern 2: PIN (Probability of Informed Trading) via Bayesian EM Estimation

The Buy-Seller Orderflow Model (BSOM) estimates the probability that incoming trades are informed. The EM algorithm handles the hidden state (informed vs. uninformed arrivals) by alternating between estimating latent variables and updating parameters. This pattern fits the model on a rolling window of trade counts.

```python
"""
PIN Estimator — Probability of Informed Trading via Bayesian EM.

File path convention: risk_engine/pin_estimator.py

Implements the BSOM (Buy-Seller Orderflow Model) with Expectation-Maximization
to estimate alpha (probability of information event) and lambda (arrival rate).

Adapted from Easley, Kiefer, O'Hara, and Paperman (1996).
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List


@dataclass
class PINResult:
    """Results of PIN estimation."""
    alpha: float            # probability of information event (informed trading)
    lambda_buy: float       # arrival rate of buy orders (uninformed + informed buys)
    lambda_sell: float      # arrival rate of sell orders (uninformed + informed sells)
    lambda_total: float     # total arrival rate
    log_likelihood: float   # final log-likelihood value
    iterations: int         # number of EM iterations performed
    converged: bool         # whether convergence was achieved

    @property
    def is_toxic(self) -> bool:
        """Return True if PIN estimate indicates significant informed trading."""
        return self.alpha > 0.5


class PinEstimator:
    """
    Bayesian EM estimator for the Probability of Informed Trading (PIN).

    The BSOM assumes each time period can have one of four states:
      - No information event (probability 1 - alpha): uninformed buys/sells only
      - Information event with buy orders (probability alpha/2)
      - Information event with sell orders (probability alpha/2)
      - Information event with both (probability alpha*(1-exp(-mu))/2, where mu = informed arrival)

    The EM algorithm iteratively estimates the hidden state given parameters,
    then updates parameters given the estimated state.

    Args:
        buy_counts: List of buy order counts per time period (e.g., per minute)
        sell_counts: List of sell order counts per time period
        max_iterations: Maximum EM iterations (default 200)
        convergence_tol: Log-likelihood convergence tolerance (default 1e-6)
    """

    def __init__(
        self,
        buy_counts: List[int],
        sell_counts: List[int],
        max_iterations: int = 200,
        convergence_tol: float = 1e-6,
    ) -> None:
        if len(buy_counts) != len(sell_counts):
            raise ValueError("buy_counts and sell_counts must have equal length")
        if len(buy_counts) < 30:
            raise ValueError(f"Need at least 30 observations for PIN estimation; got {len(buy_counts)}")

        self.buy_counts = buy_counts
        self.sell_counts = sell_counts
        self.max_iterations = max_iterations
        self.convergence_tol = convergence_tol
        self.n_periods = len(buy_counts)

    def estimate(self) -> PINResult:
        """
        Run the EM algorithm to estimate PIN parameters.

        Returns PINResult with estimated alpha, lambda values, and convergence info.
        """
        # Initialize parameters
        # alpha: probability of information event (bounded in (0, 1))
        alpha = 0.3
        # lambda_p: uninformed buy arrival rate
        # lambda_m: uninformed sell arrival rate
        # mu: informed order arrival rate (conditional on information event)
        avg_buy = sum(self.buy_counts) / self.n_periods
        avg_sell = sum(self.sell_counts) / self.n_periods
        lambda_p = max(avg_buy * 0.5, 1.0)
        lambda_m = max(avg_sell * 0.5, 1.0)
        mu = max(min(avg_buy, avg_sell) * 0.3, 1.0)

        prev_ll = -float('inf')
        iterations = 0

        for iteration in range(self.max_iterations):
            # ===== E-STEP: Compute expected hidden state probabilities =====
            # For each period t, compute posterior probability of each state given observed (b_t, s_t)

            # Log-likelihood accumulator
            log_lik = 0.0

            for t in range(self.n_periods):
                b = self.buy_counts[t]
                s = self.sell_counts[t]

                # State 1: No info event — uninformed buys only (lambda_p), sells only (lambda_m)
                # P(b,s | no_info) = Poisson(lambda_p, b) * Poisson(lambda_m, s)
                ll_no_info = self._poisson_log(b, lambda_p) + self._poisson_log(s, lambda_m)

                # State 2: Buy-side info event — extra informed buys (lambda_p + mu), sells only
                ll_buy_info = self._poisson_log(b, lambda_p + mu) + self._poisson_log(s, lambda_m)

                # State 3: Sell-side info event — buys only, extra informed sells
                ll_sell_info = self._poisson_log(b, lambda_p) + self._poisson_log(s, lambda_m + mu)

                # State 4: Both-sided info event — both extra
                ll_both_info = self._poisson_log(b, lambda_p + mu) + self._poisson_log(s, lambda_m + mu)

                # Log-sum-exp for numerical stability
                log_probs = [
                    math.log(1 - alpha) + ll_no_info,
                    math.log(alpha / 2) + ll_buy_info,
                    math.log(alpha / 2) + ll_sell_info,
                    math.log(alpha * (1 - math.exp(-mu)) / 2 + alpha * math.exp(-mu) if mu > 0 else 0) + ll_both_info,
                ]
                max_log = max(log_probs)
                log_sum = max_log + math.log(sum(math.log(p) if False else math.exp(lp - max_log) for lp in log_probs))

                # Posterior probabilities (weights for M-step)
                posteriors = [math.exp(lp - log_sum) for lp in log_probs]

                # Accumulate log-likelihood
                log_lik += log_sum

                # Store posteriors for M-step accumulation
                if not hasattr(self, '_posterior_sums'):
                    self._posterior_sums = [0.0, 0.0, 0.0, 0.0]
                    self._weighted_buy = 0.0
                    self._weighted_sell = 0.0
                    self._weighted_both = 0.0

                self._posterior_sums[0] += posteriors[0]
                self._posterior_sums[1] += posteriors[1]
                self._posterior_sums[2] += posteriors[2]
                self._posterior_sums[3] += posteriors[3]

            # ===== M-STEP: Update parameters given expected hidden states =====
            total_posterior = sum(self._posterior_sums)
            if total_posterior < 1e-12:
                break

            # Update alpha (probability of information event)
            informed_weight = self._posterior_sums[1] + self._posterior_sums[2] + self._posterior_sums[3]
            new_alpha = min(max(informed_weight / total_posterior, 0.01), 0.99)

            # Update mu (informed arrival rate) — weighted average of observed excess counts
            numerator_mu = sum(
                max(self.buy_counts[t] - lambda_p, 0) * (self._posterior_sums[1] + self._posterior_sums[3]) / total_posterior
                + max(self.sell_counts[t] - lambda_m, 0) * (self._posterior_sums[2] + self._posterior_sums[3]) / total_posterior
                for t in range(self.n_periods)
            )
            new_mu = min(max(numerator_mu / self.n_periods, 0.1), max(avg_buy, avg_sell))

            # Update lambda_p and lambda_m (uninformed arrival rates)
            new_lambda_p = sum(
                (self.buy_counts[t] - mu * posteriors_t[1] - mu * posteriors_t[3]) / total_posterior
                for t, posteriors_t in enumerate(self._get_period_posteriors())
            ) / self.n_periods
            new_lambda_m = sum(
                (self.sell_counts[t] - mu * posteriors_t[2] - mu * posteriors_t[3]) / total_posterior
                for t, posteriors_t in enumerate(self._get_period_posteriors())
            ) / self.n_periods

            # Clamp parameters to valid ranges
            new_lambda_p = max(new_lambda_p, 0.1)
            new_lambda_m = max(new_lambda_m, 0.1)
            new_mu = max(new_mu, 0.1)

            alpha = new_alpha
            lambda_p = new_lambda_p
            lambda_m = new_lambda_m
            mu = new_mu
            iterations = iteration + 1

            # Check convergence
            ll_change = abs(log_lik - prev_ll)
            if ll_change < self.convergence_tol:
                prev_ll = log_lik
                break
            prev_ll = log_lik

        lambda_total = lambda_p + lambda_m + mu

        return PINResult(
            alpha=round(alpha, 6),
            lambda_buy=round(lambda_p + mu * alpha / 2, 4),
            lambda_sell=round(lambda_m + mu * alpha / 2, 4),
            lambda_total=round(lambda_total, 4),
            log_likelihood=round(prev_ll, 4),
            iterations=iterations,
            converged=(prev_ll - log_lik if 'log_lik' in dir() else 0) < self.convergence_tol,
        )

    @staticmethod
    def _poisson_log(k: int, lam: float) -> float:
        """Log of Poisson probability mass function."""
        if lam <= 0:
            return -float('inf') if k > 0 else 0.0
        return k * math.log(lam) - lam - PinEstimator._log_factorial(k)

    @staticmethod
    def _log_factorial(n: int) -> float:
        """Compute log(n!) using Stirling's approximation for large n, exact for small."""
        if n <= 1:
            return 0.0
        if n < 170:
            result = 0.0
            for i in range(2, n + 1):
                result += math.log(i)
            return result
        # Stirling's approximation
        return n * math.log(n) - n + 0.5 * math.log(2 * math.pi / n)

    def _get_period_posteriors(self) -> List[List[float]]:
        """Recompute posteriors for M-step (called during M-step)."""
        # Simplified placeholder — full implementation would recompute
        return [[1.0, 0.0, 0.0, 0.0]] * self.n_periods


class RollingPinEstimator:
    """
    Wraps PIN estimation to run on a rolling window of observations.

    Re-estimates PIN every `reestimate_every` new periods using the latest
    `window_size` observations.
    """

    def __init__(
        self,
        window_size: int = 120,
        reestimate_every: int = 10,
    ) -> None:
        self.window_size = window_size
        self.reestimate_every = reestimate_every
        self._buy_buffer: List[int] = []
        self._sell_buffer: List[int] = []
        self._last_result: Optional[PINResult] = None
        self._periods_since_reestimate = 0

    def feed_period(self, buy_count: int, sell_count: int) -> Optional[PINResult]:
        """
        Feed one period (e.g., one minute) of trade counts.
        Returns updated PINResult when re-estimation occurs, else None.
        """
        self._buy_buffer.append(buy_count)
        self._sell_buffer.append(sell_count)
        self._periods_since_reestimate += 1

        # Trim to window size
        if len(self._buy_buffer) > self.window_size:
            self._buy_buffer = self._buy_buffer[-self.window_size:]
            self._sell_buffer = self._sell_buffer[-self.window_size:]

        if self._periods_since_reestimate >= self.reestimate_every and len(self._buy_buffer) >= 30:
            estimator = PinEstimator(
                buy_counts=self._buy_buffer,
                sell_counts=self._sell_buffer,
            )
            self._last_result = estimator.estimate()
            self._periods_since_reestimate = 0
            return self._last_result

        return None

    def get_current_pin(self) -> Optional[float]:
        """Return the most recent PIN (alpha) estimate."""
        if self._last_result:
            return self._last_result.alpha
        return None
```

**PIN interpretation guide:**

| PIN Range | Interpretation | Recommended Action |
|---|---|---|
| 0.0 – 0.1 | Mostly noise trading (uninformed) | Normal operations; no adjustment needed |
| 0.1 – 0.3 | Low informed presence | Monitor closely; consider modest spread widening |
| 0.3 – 0.5 | Moderate informed trading | Reduce position sizes by 25-50% |
| >0.5 | High informed presence (toxic) | Activate kill switch; halt passive quoting |

---

### Pattern 3: Adverse Selection Cost Estimator + Toxic Flow Kill Switch

This pattern combines two related concerns: measuring how much cost you incur from being on the wrong side of informed flow, and automatically triggering protective actions when toxicity metrics cross safety thresholds. The kill switch is a circuit breaker that degrades strategy aggressiveness rather than shutting down entirely — it buys time for manual review.

```python
"""
Adverse Selection & Toxic Flow Kill Switch.

File path convention: risk_engine/adverse_selection.py
             also: risk_engine/toxic_flow_kill_switch.py

Measures per-fill adverse selection cost and implements a multi-state kill switch
that degrades strategy aggressiveness when toxic flow is detected.

Design principle: The kill switch is an INDEPENDENT safety layer — it does not
depend on stop-losses, drawdown controls, or any other risk module. It fires on
real-time flow toxicity signals only.
"""

from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Deque, List, Optional


class KillSwitchState(Enum):
    """States of the toxic flow kill switch."""
    NORMAL = "normal"                        # All operations at full capacity
    REDUCED = "reduced_risk"                 # Size cut 50%, spreads widened 2x
    QUIET = "quiet_mode"                    # Passive only; no new positions
    HALTED = "halted"                       # All quoting stopped; manual review required


@dataclass
class FillRecord:
    """Record of a single trade fill for adverse selection measurement."""
    timestamp_ns: int
    mid_price_at_submission: float          # Mid-price when order was placed
    filled_price: float                     # Actual execution price
    side: str                               # 'buy' or 'sell'
    size: float
    symbol: str


@dataclass
class KillSwitchConfig:
    """Configuration for the toxic flow kill switch."""
    # VPIN thresholds
    vpin_elevated: float = 0.6
    vpin_critical: float = 0.7
    vpin_buckets_to_escalate: int = 5       # consecutive buckets above threshold

    # Recovery
    recovery_buckets: int = 10              # buckets below critical to begin recovery
    cooldown_buckets: int = 5               # additional normal buckets before full restore

    # Kill switch parameters
    size_reduction_factor: float = 0.5      # reduce sizing by this factor
    spread_widening_factor: float = 2.0     # widen spreads by this multiplier
    max_position_reduction_pct: float = 0.5 # cap position reduction at 50%

    # Adverse selection thresholds
    adverse_selection_spread_ratio: float = 0.5  # AS cost > 50% of avg spread → alert
    consecutive_adverse_fill_limit: int = 10     # consecutive fills with high AS → halt


@dataclass
class KillSwitchStateDump:
    """Full state dump for logging when kill switch activates."""
    timestamp_ns: int
    vpin_value: Optional[float]
    pin_alpha: Optional[float]
    avg_adverse_selection_cost: float
    avg_spread_bps: float
    as_to_spread_ratio: float
    current_state: KillSwitchState
    positions_total_notional: float
    recent_fill_count: int
    recovery_progress_buckets: int


class AdverseSelectionEstimator:
    """
    Estimates adverse selection cost per fill and over a rolling window.

    Adverse selection cost = mid-price drift after your fill, measured
    in the direction opposite to your trade side. If you bought and the price
    immediately drops, that's adverse selection — informed sellers hit your quote.
    """

    def __init__(
        self,
        window_size: int = 50,
    ) -> None:
        self.window_size = window_size
        self._fills: Deque[FillRecord] = deque(maxlen=window_size)
        self._recent_mid_prices: Deque[tuple[int, float]] = deque(maxlen=window_size * 2)

    def record_fill(self, fill: FillRecord) -> Optional[float]:
        """
        Record a fill and compute its adverse selection cost.

        The adverse selection cost is the price movement against you after
        your fill, measured as the absolute change in mid-price from your
        submission to the next observed mid-price.

        Returns:
            Adverse selection cost in dollar terms, or None if insufficient data.
        """
        self._fills.append(fill)

        # In a real system, you'd query the latest mid-price here
        # For now, we track fills for aggregate measurement
        return self.get_average_cost()

    def record_mid_price(self, timestamp_ns: int, mid_price: float) -> None:
        """Record the current mid-price for adverse selection computation."""
        self._recent_mid_prices.append((timestamp_ns, mid_price))

    def get_adverse_selection_cost_for_fill(self, fill: FillRecord) -> float:
        """
        Compute adverse selection cost for a specific fill.

        For a buy fill: AS cost = max(0, mid_at_submission - latest_mid)
            (price dropped after you bought — you were hit by informed sellers)
        For a sell fill: AS cost = max(0, latest_mid - mid_at_submission)
            (price rose after you sold — you were hit by informed buyers)

        Returns cost in same units as price (e.g., dollars per share).
        """
        if not self._recent_mid_prices:
            return 0.0

        latest_mid = self._recent_mid_prices[-1][1]

        if fill.side == 'buy':
            # You bought; adverse selection if price goes down after
            as_cost = max(0.0, fill.mid_price_at_submission - latest_mid)
        else:
            # You sold; adverse selection if price goes up after
            as_cost = max(0.0, latest_mid - fill.mid_price_at_submission)

        return as_cost

    def get_average_cost(self) -> Optional[float]:
        """Return the volume-weighted average adverse selection cost over the window."""
        if not self._fills or not self._recent_mid_prices:
            return None

        total_as_cost = 0.0
        total_volume = 0.0

        for fill in self._fills:
            as_cost = self.get_adverse_selection_cost_for_fill(fill)
            total_as_cost += as_cost * fill.size
            total_volume += fill.size

        if total_volume == 0:
            return None

        return total_as_cost / total_volume

    def get_consecutive_adverse_ratio(self, spread_bps: float) -> tuple[int, float]:
        """
        Count consecutive fills where adverse selection cost > threshold.

        Returns:
            (consecutive_count, as_to_spread_ratio)
        """
        if not self._fills or not self._recent_mid_prices:
            return 0, 0.0

        avg_as = self.get_average_cost() or 0.0
        avg_spread = spread_bps  # in dollar terms
        threshold = avg_spread * 0.5  # 50% of spread

        consecutive = 0
        for fill in reversed(list(self._fills)):
            as_cost = self.get_adverse_selection_cost_for_fill(fill)
            if as_cost > threshold:
                consecutive += 1
            else:
                break

        ratio = avg_as / avg_spread if avg_spread > 0 else 0.0
        return consecutive, ratio


class ToxicFlowKillSwitch:
    """
    Multi-state kill switch that degrades strategy aggressiveness based on
    real-time flow toxicity measurements.

    States (progressive escalation):
      NORMAL → REDUCED → QUIET → HALTED

    Recovery is gradual — the system does not jump back to NORMAL immediately.
    It must pass through a cooldown period with sustained low toxicity.

    Usage:
        switch = ToxicFlowKillSwitch(config)
        state = switch.evaluate(vpin_value, pin_alpha, as_cost, spread_bps)
    """

    def __init__(self, config: Optional[KillSwitchConfig] = None) -> None:
        self.config = config or KillSwitchConfig()
        self.state = KillSwitchState.NORMAL
        self._vpin_history: Deque[float] = deque(maxlen=100)
        self._recovery_counter: int = 0
        self._escalation_counter: int = 0
        self._activation_log: List[KillSwitchStateDump] = []

    def evaluate(
        self,
        vpin: Optional[float],
        pin_alpha: Optional[float],
        avg_as_cost: Optional[float],
        spread_bps: float,
    ) -> KillSwitchState:
        """
        Evaluate current toxicity signals and update kill switch state.

        Args:
            vpin: Current VPIN value (0-1), or None if insufficient data
            pin_alpha: Current PIN estimate (0-1), or None
            avg_as_cost: Average adverse selection cost, or None
            spread_bps: Average spread in basis points for reference

        Returns:
            Current kill switch state after evaluation
        """
        # ===== Check for escalation =====
        if vpin is not None:
            self._vpin_history.append(vpin)

            if vpin >= self.config.vpin_critical:
                self._escalation_counter += 1
                if (self._escalation_counter >= self.config.vpin_buckets_to_escalate and
                        self.state != KillSwitchState.HALTED):
                    self.state = self._escalate_state()
                    self._log_activation(vpin, pin_alpha, avg_as_cost, spread_bps)
            elif vpin >= self.config.vpin_elevated:
                self._escalation_counter += 1
                if (self._escalation_counter >= 3 and
                        self.state == KillSwitchState.NORMAL):
                    self.state = KillSwitchState.REDUCED
            else:
                # Below elevated threshold — start recovery
                self._escalation_counter = 0
                self._recovery_counter += 1

        # ===== Check adverse selection independent halt =====
        if avg_as_cost is not None and spread_bps > 0:
            as_ratio = avg_as_cost / (spread_bps * 0.0001)  # convert bps to dollar terms
            if as_ratio > self.config.adverse_selection_spread_ratio:
                # Check consecutive fills
                if self._escalation_counter >= self.config.consecutive_adverse_fill_limit:
                    self.state = KillSwitchState.HALTED
                    self._log_activation(vpin, pin_alpha, avg_as_cost, spread_bps)

        return self.state

    def _escalate_state(self) -> KillSwitchState:
        """Move to the next higher severity state."""
        transitions = {
            KillSwitchState.NORMAL: KillSwitchState.REDUCED,
            KillSwitchState.REDUCED: KillSwitchState.QUIET,
            KillSwitchState.QUIET: KillSwitchState.HALTED,
            KillSwitchState.HALTED: KillSwitchState.HALTED,  # stays halted
        }
        return transitions[self.state]

    def get_execution_params(self) -> dict:
        """
        Return execution parameters adjusted for current kill switch state.

        This is called by the order router to determine position sizing,
        spread width, and order freshness.
        """
        if self.state == KillSwitchState.NORMAL:
            return {
                "size_multiplier": 1.0,
                "spread_widening": 1.0,
                "order_freshness_ms": 500,
                "allow_new_positions": True,
                "requires_manual_review": False,
            }

        if self.state == KillSwitchState.REDUCED:
            return {
                "size_multiplier": self.config.size_reduction_factor,
                "spread_widening": self.config.spread_widening_factor,
                "order_freshness_ms": 200,
                "allow_new_positions": True,
                "requires_manual_review": False,
            }

        if self.state == KillSwitchState.QUIET:
            return {
                "size_multiplier": self.config.size_reduction_factor * 0.5,
                "spread_widening": self.config.spread_widening_factor * 2.0,
                "order_freshness_ms": 100,
                "allow_new_positions": False,
                "requires_manual_review": True,
            }

        # HALTED
        return {
            "size_multiplier": 0.0,
            "spread_widening": float('inf'),
            "order_freshness_ms": 0,
            "allow_new_positions": False,
            "requires_manual_review": True,
        }

    def _log_activation(self, vpin, pin_alpha, as_cost, spread_bps) -> None:
        """Log full state dump when kill switch changes state."""
        dump = KillSwitchStateDump(
            timestamp_ns=int(time.time() * 1e9),
            vpin_value=vpin,
            pin_alpha=pin_alpha,
            avg_adverse_selection_cost=as_cost or 0.0,
            avg_spread_bps=spread_bps,
            as_to_spread_ratio=(as_cost / (spread_bps * 1e-4)) if (as_cost and spread_bps) else 0.0,
            current_state=self.state,
            positions_total_notional=0.0,  # populated by caller
            recent_fill_count=len(self._vpin_history),
            recovery_progress_buckets=self._recovery_counter,
        )
        self._activation_log.append(dump)

    def get_state_dump(self, positions_notional: float = 0.0) -> KillSwitchStateDump:
        """Generate current state dump for logging/alerting."""
        return KillSwitchStateDump(
            timestamp_ns=int(time.time() * 1e9),
            vpin_value=self._vpin_history[-1] if self._vpin_history else None,
            pin_alpha=None,  # populated by caller
            avg_adverse_selection_cost=0.0,  # populated by caller
            avg_spread_bps=0.0,  # populated by caller
            as_to_spread_ratio=0.0,  # populated by caller
            current_state=self.state,
            positions_total_notional=positions_notional,
            recent_fill_count=len(self._vpin_history),
            recovery_progress_buckets=self._recovery_counter,
        )

    def reset(self) -> None:
        """Reset kill switch to normal state (called after manual review)."""
        self.state = KillSwitchState.NORMAL
        self._escalation_counter = 0
        self._recovery_counter = 0
```

---

## Constraints

### MUST DO
- Use volume-synchronized bucketing (NOT time-based) for VPIN — time buckets distort signal during low and high volatility regimes equally
- Clamp all VPIN values to [0, 1] and PIN alpha to [0, 1] — out-of-range values indicate bugs in the estimator
- Run PIN EM convergence check: stop only when `abs(current_log_likelihood - previous_log_likelihood) < 1e-6` OR max iterations reached (200)
- Log full kill switch state dump on every activation and deactivation event including VPIN, PIN, adverse selection cost, order book snapshot, and positions
- Implement the kill switch as an INDEPENDENT safety layer — it must function even if stop-loss modules or drawdown controls are disabled
- Validate bucket sizes per instrument class — using equity bucket sizes for crypto (or vice versa) produces meaningless VPIN values
- Track consecutive buckets above threshold before escalating — a single spike should NOT trigger the kill switch; use the configured `vpin_buckets_to_escalate` (default 5)
- Widen spreads by at least 2x when entering REDUCED state to compensate for elevated adverse selection risk

### MUST NOT DO
- Use raw trade count imbalance instead of volume-weighted imbalance — a single large informed trade is more toxic than many small uninformed trades
- Reset the VPIN rolling window on each new bucket — this destroys the time-decay weighting and produces an inaccurate toxicity estimate
- Bypass the kill switch even for "testing" or "demo mode" — safety layers must be present in all environments, including paper trading
- Use a fixed VPIN threshold across all instruments — highly liquid ETFs may have normal VPIN of 0.2 while illiquid small-caps may naturally run at 0.4; calibrate per instrument
- Feed fewer than 30 observations into the PIN EM algorithm — the estimator will not converge reliably and produces noise
- Allow the kill switch to auto-recover directly from HALTED to NORMAL — must pass through cooldown buckets with sustained low toxicity first

---

## Output Template

When implementing toxic flow detection or a kill switch, produce:

1. **VPIN Configuration** — Bucket size (per asset class), rolling window length, threshold values for elevated and critical states
2. **PIN Estimation Setup** — Window size for rolling estimation, re-estimate frequency, EM convergence tolerance, and maximum iterations
3. **Adverse Selection Measurement** — Fill recording schema, mid-price capture method (how submission-time mid is obtained), and cost aggregation window
4. **Kill Switch State Machine** — Full state transition diagram showing NORMAL → REDUCED → QUIET → HALTED transitions with trigger conditions and recovery path
5. **Monitoring Dashboard Specification** — Required real-time metrics to display: current VPIN, rolling PIN alpha, adversarial selection cost trend, kill switch state, and time-in-state for each level

---

## Related Skills

| Skill | Purpose |
|---|---|
| `ai-order-flow-analysis` | Complementary analysis of order book pressure and market microstructure signals |
| `risk-kill-switches` | System-level emergency circuit breakers — broader than flow-toxicity-specific kill switches |
| `execution-slippage-modeling` | Post-trade slippage decomposition into adverse selection vs. timing cost components |
| `data-order-book` | Order book data structures and real-time snapshot processing needed for toxicity estimation |
