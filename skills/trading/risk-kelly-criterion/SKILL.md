---
name: risk-kelly-criterion
description: Calculates optimal position sizing using Kelly Criterion and Fractional Kelly formulas to maximize geometric growth while controlling drawdown risk in algorithmic trading systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  triggers: kelly criterion, fractional kelly, position sizing, optimal f, bet sizing, geometric growth, edge calculation, bankroll management
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  archetypes: [tactical]
  anti_triggers: [vague ideation, long-form architecture, brainstorming]
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: risk-stop-loss, risk-position-sizing, risk-kill-switches
---

# Kelly Criterion & Optimal Position Sizing

Implements Kelly Criterion calculations to determine mathematically optimal position sizes based on win rate, reward-to-risk ratio, and account equity. Converts theoretical edge into practical trading execution using Fractional Kelly to mitigate volatility drag and estimation error risk.

## TL;DR Checklist

- [ ] Calculate historical win rate (W) and average reward-to-risk ratio (R) from backtest or live log
- [ ] Compute full Kelly percentage: K = W - ((1-W) / R)
- [ ] Apply fractional multiplier (0.25 to 0.5) for production safety
- [ ] Validate Kelly output against maximum position size and margin limits
- [ ] Recalculate only when performance statistics drift >10% from baseline

---

## When to Use

Use this skill when:

- Determining mathematically optimal trade size for a strategy with verified statistical edge
- Scaling a proven algorithm into live markets while preserving geometric growth potential
- Comparing multiple strategies by their theoretical maximum compound growth rates
- Adjusting position sizing dynamically during drawdown phases to minimize ruin probability

---

## When NOT to Use

Avoid this skill for:

- Strategies without backtested or live performance data (unknown W and R produce garbage outputs)
- Fixed-lot or manual trading workflows where dynamic sizing is not supported
- Regulatory environments requiring static position caps regardless of edge
- As a standalone risk control — always pair with `risk-stop-loss` and `risk-kill-switches`

---

## Core Workflow

1. **Collect Performance Statistics** — Extract historical win rate (W) and average reward-to-risk ratio (R). Use trade logs spanning at least 100 trades across multiple market regimes. Exclude outliers caused by infrastructure failures or data feed errors.
   **Checkpoint:** Verify sample size ≥ 100 and calculate standard error for W. If confidence interval width exceeds ±15%, defer Kelly sizing until more data is collected.

2. **Calculate Full Kelly Percentage** — Apply the classic formula: `K = W - ((1 - W) / R)`. Convert result to decimal (e.g., 0.12 = 12% of bankroll). If K ≤ 0, the strategy has no mathematical edge under current conditions.
   **Checkpoint:** Reject sizing if K < 0 or if input parameters rely on fewer than 50 confirmed closed trades.

3. **Apply Fractional Scaling** — Multiply full K by a fractional coefficient `f` (typically 0.25 to 0.5). Fractional Kelly reduces volatility drag, lowers maximum drawdown, and cushions against parameter estimation error.
   **Checkpoint:** Use `f = 0.25` for high-variance strategies or limited live-track history. Use `f = 0.5` only after 6+ months of stable execution with verified edge persistence.

4. **Compute Actual Position Size** — Convert the fractional Kelly percentage into contracts, lots, or shares based on current account equity and per-unit risk exposure (e.g., stop distance in price terms).
   **Checkpoint:** Ensure calculated size respects exchange tick sizes, minimum lot requirements, margin thresholds, and portfolio-wide allocation caps.

5. **Monitor and Adjust Dynamically** — Track rolling win rate and R:R using exponentially weighted moving average (EWMA) or fixed rolling windows. Recalculate Kelly only when metrics drift beyond a configured tolerance band (default ±10%).
   **Checkpoint:** Never recalculate Kelly after a single trade outcome. Strategy edge is a statistical property, not a per-trade variable. Log every recalculation with inputs, fraction applied, and resulting allocation.

---

## Implementation Patterns

### Pattern 1: Kelly Input Model (Pydantic v2)

Structured data model for collecting and validating performance statistics before computation. Ensures type safety and automatic range checking.

```python
from pydantic import BaseModel, Field, field_validator
from typing import Optional

class TradeStatistics(BaseModel):
    """Validated trade performance statistics for Kelly calculation."""
    
    win_rate: float = Field(ge=0.0, le=1.0, description="Historical win rate (0.0 to 1.0)")
    avg_reward_to_risk: float = Field(gt=0.0, description="Average profit factor / R:R ratio")
    total_trades: int = Field(ge=30, description="Minimum sample size for statistical validity")
    max_drawdown_pct: float = Field(ge=0.0, description="Peak-to-trough drawdown percentage")
    
    @field_validator("avg_reward_to_risk")
    @classmethod
    def validate_rr_ratio(cls, v: float) -> float:
        if v < 0.5:
            raise ValueError("R:R below 0.5 indicates negative or negligible edge — Kelly sizing inappropriate")
        return v
    
    @field_validator("total_trades")
    @classmethod
    def validate_sample_size(cls, v: int) -> int:
        if v < 30:
            raise ValueError(f"Sample size {v} is below minimum threshold for reliable Kelly estimation")
        return v
```

### Pattern 2: Fractional Kelly Calculator with APEX Layout Conventions

Core computation module following the APEX platform `risk_engine/` path structure. Includes production-grade safety caps and logging hooks.

```python
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class KellyParameters:
    """Immutable configuration for Kelly-based position sizing."""
    
    base_kelly_pct: float
    fractional_multiplier: float = 0.5
    max_position_cap_pct: float = 10.0
    min_position_size: int = 1
    
    @property
    def effective_kelly_pct(self) -> float:
        """Apply fractional scaling and hard caps."""
        raw_size = self.base_kelly_pct * self.fractional_multiplier
        return min(raw_size, self.max_position_cap_pct)

def calculate_kelly_size(
    win_rate: float,
    reward_to_risk: float,
    account_equity: float,
    stop_distance: float,
    asset_price: float,
    params: Optional[KellyParameters] = None
) -> dict:
    """Compute optimal position size using Fractional Kelly Criterion.
    
    Args:
        win_rate: Historical probability of winning trades (0.0-1.0)
        reward_to_risk: Average profit per winning trade / average loss per losing trade
        account_equity: Current available trading capital
        stop_distance: Price distance to stop loss level
        asset_price: Current market price of the asset
        params: Optional Kelly configuration overrides
    
    Returns:
        Dictionary with calculated position size, risk allocation, and metadata.
    """
    if params is None:
        params = KellyParameters(fractional_multiplier=0.25)  # Conservative default
    
    # Full Kelly calculation
    full_kelly = win_rate - ((1 - win_rate) / reward_to_risk)
    
    if full_kelly <= 0:
        logger.warning("Kelly output ≤ 0 — strategy edge not statistically validated")
        return {"position_size": params.min_position_size, "allocation_pct": 0.0, "kelly_raw": 0.0}
    
    safe_params = KellyParameters(
        base_kelly_pct=full_kelly,
        fractional_multiplier=params.fractional_multiplier,
        max_position_cap_pct=params.max_position_cap_pct
    )
    
    effective_pct = safe_params.effective_kelly_pct
    risk_amount = account_equity * (effective_pct / 100)
    shares_or_contracts = int(risk_amount / stop_distance) if stop_distance > 0 else params.min_position_size
    
    actual_allocation = (shares_or_contracts * asset_price) / account_equity * 100
    
    logger.info(
        "Kelly sizing computed: W=%.2f R:R=%.2f K_full=%.3f K_frac=%.3f Size=%d",
        win_rate, reward_to_risk, full_kelly, effective_pct, shares_or_contracts
    )
    
    return {
        "position_size": max(shares_or_contracts, params.min_position_size),
        "allocation_pct": round(effective_pct, 3),
        "kelly_raw": round(full_kelly, 4),
        "risk_amount": round(risk_amount, 2)
    }
```

### Pattern 3: Naive vs. Production-Ready Kelly (BAD vs. GOOD)

```python
# ❌ BAD: Full Kelly with no fractional scaling, no validation, no caps
def naive_kelly(win_rate, rr):
    k = win_rate - ((1 - win_rate) / rr)
    return int(account * k / stop_dist)  # Will overallocate during drawdowns, ignores sample size

# ✅ GOOD: Validated fractional Kelly with parameter bounds and logging
def production_kelly(stats: TradeStatistics, equity: float, price: float, distance: float):
    raw = stats.win_rate - ((1 - stats.win_rate) / stats.avg_reward_to_risk)
    if raw <= 0:
        return {"position_size": 0}  # No edge detected
    
    frac = 0.25 if stats.total_trades < 200 else 0.5
    effective = min(raw * frac, 0.10)  # Hard cap at 10% of bankroll
    size = max(1, int(equity * effective / distance))
    
    return {"position_size": size, "allocation_pct": round(effective * 100, 2)}
```

---

## Constraints

### MUST DO
- Always apply fractional Kelly (≤50%) in production — full Kelly doubles geometric variance and causes severe drawdowns during inevitable losing streaks
- Validate all input statistics over minimum 100 trades with regime diversity before computing K
- Cap maximum position size to prevent margin calls, liquidation cascades, or exchange limit breaches
- Log every Kelly recalculation including inputs (W, R), fraction applied, and resulting allocation for audit trails
- Use Pydantic or equivalent validation models to enforce bounds on win rate (0-1) and R:R (>0.5)

### MUST NOT DO
- Deploy full Kelly (K = 1.0 equivalent) without explicit risk committee approval and simulated stress testing
- Recalculate Kelly after single-trade wins or losses — statistical edge drifts violently with noise
- Ignore transaction costs, slippage, and funding rates when computing W and R — they artificially inflate theoretical K
- Override Kelly outputs with arbitrary fixed percentages during drawdowns — emotional sizing destroys mathematical advantage
- Use Kelly sizing for mean-reversion strategies with unlimited loss potential (e.g., martingale grids)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `risk-stop-loss` | Layer adaptive stop losses on top of Kelly-sized positions to cap downside risk |
| `risk-position-sizing` | Alternative sizing methods (fixed fractional, volatility-adjusted) for comparison |
| `risk-kill-switches` | Emergency circuit breakers that override Kelly sizing during extreme market stress |

---

## Live References

> Authoritative documentation and mathematical foundations for Kelly Criterion in algorithmic trading.

- [Kelly Criterion Wikipedia — Mathematical Foundation](https://en.wikipedia.org/wiki/Kelly_criterion)
- [Optimal Growth Rate of Compound Investments — Sidey (1956)](https://www.jstor.org/stable/2332730)
- [Position Sizing and Kelly Criterion — QuantConnect Documentation](https://www.quantconnect.com/tutorials/position-sizing/kelly-criterion)
- [Fractional Kelly in Trading — Investopedia](https://www.investopedia.com/terms/f/fractional-kelly.asp)
- [Risk Management for Algorithmic Traders — APEX Platform Docs](https://docs.apex-trading.example/risk-engine)
- [Volatility Drag and Geometric Growth — Quantitative Finance Papers](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=tr_kelly_drag)
