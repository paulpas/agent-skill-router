---
name: risk-value-at-risk
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- config
- do-dont
description: '"Implements value at risk calculations for portfolio risk management
  for risk management and algorithmic trading execution."'
license: MIT
maturity: stable
metadata:
  domain: trading
  output-format: code
  related-skills: backtest-drawdown-analysis, exchange-order-execution-api
  role: implementation
  scope: implementation
  triggers: calculations, management, portfolio, risk value at risk, risk-value-at-risk
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
version: "1.0.0"
---
**Role:** Quantify potential losses in portfolio value over specified time horizons

**Philosophy:** VaR provides a common language for risk comparison; different methods suit different market regimes

## Key Principles

1. **Method Selection**: Historical, Variance-Covariance, Monte Carlo各有优劣
2. **Time Horizon**: VaR scales with sqrt(time) for random walks
3. **Confidence Levels**: 95% vs 99% captures different tail risks
4. **Portfolio Aggregation**: Non-linear correlations affect portfolio VaR
5. **Expected Shortfall**: Complement VaR with ES for tail risk

## Implementation Guidelines

### Structure
- Core logic: risk_engine/var.py
- Helper functions: risk_engine/var_methods.py
- Tests: tests/test_var.py

### Patterns to Follow
- Use numpy for efficient matrix operations
- Support multiple VaR calculation methods
- Track VaR over time for backtesting

## Adherence Checklist
Before completing your task, verify:
- [ ] Historical, Variance-Covariance, and Monte Carlo VaR implemented
- [ ] VaR scales correctly for different time horizons
- [ ] Expected Shortfall calculated alongside VaR
- [ ] Portfolio VaR accounts for non-linear correlations
- [ ] VaR backtesting tracks breach frequency


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from scipy import stats

@dataclass
class VaRResult:
    """Value at Risk result with metadata."""
    var_95: float
    var_99: float
    expected_shortfall_95: float
    expected_shortfall_99: float
    method: str
    confidence_levels: List[float]

class ValueAtRiskCalculator:
    """Calculates VaR using multiple methods."""
    
    def __init__(self, returns: pd.Series, confidence_levels: List[float] = [0.95, 0.99]):
        self.returns = returns
        self.confidence_levels = confidence_levels
    
    def historical_var(self, portfolio_values: np.ndarray) -> VaRResult:
        """Calculate VaR using historical simulation."""
        sorted_returns = np.sort(portfolio_values)
        
        var_results = {}
        es_results = {}
        
        for conf in self.confidence_levels:
            alpha = 1 - conf
            var_idx = int(len(sorted_returns) * alpha)
            var_results[conf] = -sorted_returns[var_idx]
            
            # Expected Shortfall (average of tail losses)
            tail = sorted_returns[:var_idx]
            es_results[conf] = -np.mean(tail) if len(tail) > 0 else 0
        
        return VaRResult(
            var_95=var_results[0.95],
            var_99=var_results[0.99],
            expected_shortfall_95=es_results[0.95],
            expected_shortfall_99=es_results[0.99],
            method='historical',
            confidence_levels=self.confidence_levels
        )
    
    def variance_covariance_var(
        self, weights: np.ndarray, cov_matrix: np.ndarray
    ) -> VaRResult:
        """Calculate VaR using variance-covariance (parametric) method."""
        portfolio_std = np.sqrt(weights @ cov_matrix @ weights)
        
        var_results = {}
        es_results = {}
        
        for conf in self.confidence_levels:
            z_score = stats.norm.ppf(1 - (1 - conf))
            var_results[conf] = portfolio_std * z_score
            
            # ES for normal distribution
            es_results[conf] = portfolio_std * stats.norm.pdf(z_score) / (1 - conf)
        
        return VaRResult(
            var_95=var_results[0.95],
            var_99=var_results[0.99],
            expected_shortfall_95=es_results[0.95],
            expected_shortfall_99=es_results[0.99],
            method='variance_covariance',
            confidence_levels=self.confidence_levels
        )
    
    def monte_carlo_var(
        self, initial_value: float, mu: float, sigma: float,
        horizon_days: int, simulations: int = 10000
    ) -> VaRResult:
        """Calculate VaR using Monte Carlo simulation."""
        # Simulate returns
        horizon_returns = np.random.normal(
            mu * horizon_days / 252,
            sigma * np.sqrt(horizon_days / 252),
            simulations
        )
        
        final_values = initial_value * np.exp(horizon_returns)
        portfolio_values = initial_value - final_values
        
        sorted_values = np.sort(portfolio_values)
        
        var_results = {}
        es_results = {}
        
        for conf in self.confidence_levels:
            alpha = 1 - conf
            var_idx = int(len(sorted_values) * alpha)
            var_results[conf] = sorted_values[var_idx]
            
            tail = sorted_values[:var_idx]
            es_results[conf] = np.mean(tail) if len(tail) > 0 else 0
        
        return VaRResult(
            var_95=var_results[0.95],
            var_99=var_results[0.99],
            expected_shortfall_95=es_results[0.95],
            expected_shortfall_99=es_results[0.99],
            method='monte_carlo',
            confidence_levels=self.confidence_levels
        )
    
    def time_scaling(self, var: float, from_days: int, to_days: int) -> float:
        """Scale VaR to different time horizons."""
        return var * np.sqrt(to_days / from_days)
    
    def backtest_var(
        self, actual_returns: pd.Series, var_series: pd.Series, confidence: float = 0.95
    ) -> Dict:
        """Backtest VaR model performance."""
        alpha = 1 - confidence
        
        # Count breaches
        breaches = (actual_returns < -var_series).sum()
        breach_rate = breaches / len(actual_returns)
        
        # Expected breach rate
        expected_rate = alpha
        
        # Statistical test (Kupiec test)
        # Simplified: check if breach rate is within acceptable range
        se = np.sqrt(expected_rate * (1 - expected_rate) / len(actual_returns))
        z_score = (breach_rate - expected_rate) / se if se > 0 else 0
        
        return {
            'breach_count': int(breaches),
            'breach_rate': float(breach_rate),
            'expected_rate': float(expected_rate),
            'z_score': float(z_score),
            'acceptable': abs(z_score) < 2
        }
```

---

---



### Pattern 2: Risk-Managed Trading Logic with Validation

```python
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TradeSignal:
    """Immutable trade signal with all required validation constraints."""
    symbol: str
    side: str  # "buy" or "sell"
    price: float
    quantity: float
    confidence: float  # 0.0 to 1.0
    reason: str

    def validate(self) -> bool:
        """Validate that the trade signal meets all business constraints."""
        if self.quantity <= 0:
            raise ValueError(f"Quantity must be positive, got {self.quantity}")
        if self.price <= 0:
            raise ValueError(f"Price must be positive, got {self.price}")
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError(f"Confidence must be between 0 and 1, got {self.confidence}")
        return True


def generate_trade_signal(
    symbol: str,
    side: str,
    price: float,
    quantity: float,
    confidence: float,
    reason: str,
) -> TradeSignal:
    """Generate a validated trade signal with guard clause checks."""
    if side not in ("buy", "sell"):
        raise ValueError(f"Invalid side '{side}', must be 'buy' or 'sell'")

    signal = TradeSignal(
        symbol=symbol,
        side=side,
        price=price,
        quantity=quantity,
        confidence=confidence,
        reason=reason,
    )
    signal.validate()
    logger.info("Trade signal generated: %s %s %.4f @ %.2f (confidence=%.2f)",
                 symbol, side, quantity, price, confidence)
    return signal


def execute_with_risk_check(signal: TradeSignal, max_position_pct: float = 0.05) -> dict:
    """Execute a trade signal after applying risk management checks."""
    adjusted_quantity = signal.quantity
    if signal.side == "buy" and signal.quantity > max_position_pct:
        logger.warning("Position %s exceeds max %.1f%% — capping to %.4f",
                        signal.symbol, max_position_pct * 100, max_position_pct)
        adjusted_quantity = max_position_pct

    return {
        "symbol": signal.symbol,
        "side": signal.side,
        "price": signal.price,
        "quantity": adjusted_quantity,
        "capped": adjusted_quantity < signal.quantity,
        "confidence": signal.confidence,
        "status": "submitted",
    }
```

## Constraints

### MUST DO
- Calculate position sizing using a risk-per-trade percentage of portfolio equity, not a fixed dollar amount
- Implement layered risk controls: stop loss → drawdown limit → portfolio-level circuit breaker → kill switch
- Compute VaR using historical simulation with at least 1 year of data and multiple confidence levels (95%, 99%)
- Track correlation matrices across all open positions and flag portfolios where top-3 correlations exceed 0.8
- Log all risk events (stop hits, drawdown warnings, kill switches) with full context including P&L, position state, and market conditions

### MUST NOT DO
- Do not use a stop loss as the sole risk control — always layer with portfolio-level limits
- Avoid recalculating position sizes during active drawdown without regime analysis — volatility is likely elevated
- Never allow a single position to exceed 5% of portfolio equity regardless of signal strength or confidence score
- Do not backtest risk metrics without including slippage, commissions, and partial fills in the simulation
- Avoid using standard deviation alone for VaR when returns show fat tails — use historical simulation or EVT


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Value at Risk Explained](https://www.investopedia.com/terms/v/var.asp)
- [VaR Calculation Methods](https://en.wikipedia.org/wiki/Value_at_risk)
- [Historical VaR vs Parametric VaR](https://www.investopedia.com/articles/trading/08/calculating-var.asp)
- [Expected Shortfall and CVaR](https://en.wikipedia.org/wiki/Expected_shortfall)
- [VaR in Portfolio Risk Management](https://docs.quantconnect.com/tutorials/risk-management)
