---
name: risk-stress-testing
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- config
- do-dont
description: '"Implements stress test scenarios and portfolio resilience analysis
  for risk management and algorithmic trading execution."'
license: MIT
maturity: stable
metadata:
  domain: trading
  output-format: code
  related-skills: backtest-drawdown-analysis, exchange-order-execution-api
  role: implementation
  scope: implementation
  triggers: portfolio, resilience, risk stress testing, risk-stress-testing, scenarios,
    unit tests, testing, test automation
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
**Role:** Evaluate portfolio performance under extreme market conditions

**Philosophy:** Stress testing reveals hidden vulnerabilities; portfolios should survive worst-case scenarios

## Key Principles

1. **Historical Scenarios**: 1929, 1987, 2008, 2020 events
2. **Hypothetical Scenarios**: Custom extreme conditions
3. **Sensitivity Analysis**: Measure exposure to specific factors
4. **Recovery Analysis**: How quickly portfolio recovers
5. **Scenario Probability**: Weight scenarios by likelihood

## Implementation Guidelines

### Structure
- Core logic: risk_engine/stress_test.py
- Helper functions: risk_engine/scenarios.py
- Tests: tests/test_stress_test.py

### Patterns to Follow
- Implement multiple historical scenarios
- Run Monte Carlo stress tests
- Track recovery metrics

## Adherence Checklist
Before completing your task, verify:
- [ ] Multiple stress test scenarios implemented
- [ ] Historical scenario returns calculated
- [ ] Monte Carlo stress tests run
- [ ] Recovery metrics tracked
- [ ] Scenario weighting applied


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class StressTestResult:
    """Result of a stress test scenario."""
    scenario_name: str
    portfolio_return: float
    max_drawdown: float
    recovery_days: int
    survival: bool
    weight: float

class StressTestEngine:
    """Runs stress tests on portfolio configurations."""
    
    def __init__(self, portfolio_value: float = 100000):
        self.portfolio_value = portfolio_value
    
    def historical_scenario(
        self, 
        scenario_name: str,
        returns_data: List[Dict[str, float]]
    ) -> pd.Series:
        """Apply historical scenario to portfolio."""
        returns = pd.Series([d['return'] for d in returns_data])
        cumulative = (1 + returns).cumprod() - 1
        return cumulative
    
    # Historical scenarios
    def get_1929_scenario(self) -> List[Dict[str, float]]:
        """1929 Great Crash scenario (simplified)."""
        # 25% drop over 3 months, then slow recovery
        returns = [-0.08] * 5 + [-0.15] * 3 + [0.02] * 12 + [-0.05] * 4
        return [{'return': r} for r in returns]
    
    def get_1987_scenario(self) -> List[Dict[str, float]]:
        """1987 Black Monday scenario."""
        # 22% single day drop
        returns = [-0.22] + [0.01] * 5 + [-0.05] * 3 + [0.03] * 20
        return [{'return': r} for r in returns]
    
    def get_2008_scenario(self) -> List[Dict[str, float]]:
        """2008 Financial Crisis scenario (simplified)."""
        returns = (
            [-0.04] * 3 + [-0.08] * 4 + [-0.10] * 3 + 
            [-0.15] + [-0.08] * 3 + [0.02] * 6 + [-0.03] * 4 + [0.05] * 8
        )
        return [{'return': r} for r in returns]
    
    def get_2020_scenario(self) -> List[Dict[str, float]]:
        """2020 COVID Crash scenario."""
        returns = (
            [-0.05] * 2 + [-0.12] * 3 + [-0.08] * 2 + 
            [0.08] * 5 + [-0.02] * 3 + [0.06] * 10
        )
        return [{'return': r} for r in returns]
    
    def run_historical_stress_test(
        self, scenario: List[Dict[str, float]]
    ) -> StressTestResult:
        """Run a single historical scenario stress test."""
        returns = pd.Series([d['return'] for d in scenario])
        portfolio_values = self.portfolio_value * (1 + returns).cumprod()
        
        # Calculate metrics
        max_dd = (portfolio_values.max() - portfolio_values.min()) / portfolio_values.max()
        survival = portfolio_values.min() > self.portfolio_value * 0.3  # Survives if >30% remains
        
        # Recovery calculation
        recovery_days = 0
        peak = self.portfolio_value
        for i, value in enumerate(portfolio_values):
            if value > peak:
                peak = value
                recovery_days = 0
            else:
                recovery_days = i
        
        return StressTestResult(
            scenario_name=f"Historical_{len(scenario)}_day",
            portfolio_return=float((portfolio_values.iloc[-1] - self.portfolio_value) / self.portfolio_value),
            max_drawdown=float(max_dd),
            recovery_days=recovery_days,
            survival=survival,
            weight=0.02  # 2% probability weighting
        )
    
    def custom_scenario(
        self, 
        name: str,
        daily_returns: List[float]
    ) -> StressTestResult:
        """Run custom scenario."""
        returns = pd.Series(daily_returns)
        portfolio_values = self.portfolio_value * (1 + returns).cumprod()
        
        max_dd = (portfolio_values.max() - portfolio_values.min()) / portfolio_values.max()
        survival = portfolio_values.min() > self.portfolio_value * 0.3
        
        recovery_days = 0
        peak = self.portfolio_value
        for i, value in enumerate(portfolio_values):
            if value > peak:
                peak = value
                recovery_days = 0
            else:
                recovery_days = i
        
        return StressTestResult(
            scenario_name=name,
            portfolio_return=float((portfolio_values.iloc[-1] - self.portfolio_value) / self.portfolio_value),
            max_drawdown=float(max_dd),
            recovery_days=recovery_days,
            survival=survival,
            weight=0.01
        )
    
    def monte_carlo_stress_test(
        self,
        daily_returns: np.ndarray,
        scenarios: int = 1000,
        horizon_days: int = 60
    ) -> Dict[str, float]:
        """Run Monte Carlo stress test."""
        results = []
        
        for _ in range(scenarios):
            # Sample random returns with extreme events
            sample_returns = np.random.choice(daily_returns, size=horizon_days)
            # Add some extreme days
            if np.random.random() < 0.2:
                sample_returns[np.random.randint(0, horizon_days)] = -0.15
            
            portfolio_values = self.portfolio_value * (1 + sample_returns).cumprod()
            final_value = portfolio_values.iloc[-1] if hasattr(portfolio_values, 'iloc') else portfolio_values[-1]
            results.append(final_value)
        
        results_array = np.array(results)
        
        return {
            'mean_return': float(np.mean(results_array) / self.portfolio_value - 1),
            'p05_return': float(np.percentile(results_array, 5) / self.portfolio_value - 1),
            'p01_return': float(np.percentile(results_array, 1) / self.portfolio_value - 1),
            'survival_rate': float(np.mean(results_array > self.portfolio_value * 0.5))
        }
    
    def sensitivity_analysis(
        self,
        factor_shocks: Dict[str, float],
        portfolio_exposures: Dict[str, float]
    ) -> Dict[str, float]:
        """Analyze sensitivity to various factors."""
        results = {}
        
        for factor, shock in factor_shocks.items():
            if factor in portfolio_exposures:
                impact = portfolio_exposures[factor] * shock
                results[factor] = impact
        
        results['total_impact'] = sum(results.values())
        
        return results
    
    def parallel_stress_test(
        self,
        scenarios: List[List[Dict[str, float]]]
    ) -> List[StressTestResult]:
        """Run multiple stress tests in sequence."""
        results = []
        
        for scenario in scenarios:
            result = self.run_historical_stress_test(scenario)
            results.append(result)
        
        return results
    
    def aggregate_stress_test_results(
        self, results: List[StressTestResult]
    ) -> Dict[str, float]:
        """Aggregate results across multiple scenarios."""
        weights = np.array([r.weight for r in results])
        weights = weights / weights.sum()  # Normalize
        
        weighted_returns = np.array([r.portfolio_return for r in results])
        weighted_dd = np.array([r.max_drawdown for r in results])
        
        return {
            'weighted_average_return': float(np.sum(weights * weighted_returns)),
            'weighted_average_dd': float(np.sum(weights * weighted_dd)),
            'worst_case_return': float(min(r.portfolio_return for r in results)),
            'worst_case_dd': float(max(r.max_drawdown for r in results)),
            'survival_probability': float(np.sum(weights[[r.survival for r in results]]))
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

- [Stress Testing in Finance Overview](https://en.wikipedia.org/wiki/Stress_testing_(finance))
- [Monte Carlo Stress Testing Methods](https://www.investopedia.com/terms/m/monte-carlo-method.asp)
- [Regulatory Stress Testing Frameworks](https://www.federalreserve.gov/supervisionreg/stress-tests.htm)
- [Portfolio Stress Testing Techniques](https://docs.quantconnect.com/tutorials/risk-management)
- [Historical Scenario Analysis](https://en.wikipedia.org/wiki/Stress_testing_(finance))
