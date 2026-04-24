---
name: trading-risk-tail-risk
description: Tail risk management and extreme event protection
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: event, extreme, management, risk tail risk, risk-tail-risk
  related-skills: trading-backtest-drawdown-analysis, trading-backtest-position-sizing
    trading-exchange-order-book-sync, trading-exchange-order-execution-api
---

**Role:** Identify and protect against tail risk events

**Philosophy:** Tail events are rare but devastating; portfolios should be designed for survival, not just growth

## Key Principles

1. **Tail Risk Metrics**: Skewness, kurtosis, VaR, ES
2. **Stress Testing**: Simulate extreme market moves
3. **Tail Hedging**: Options, inverse ETFs for protection
4. **Dynamic Adjustment**: Increase protection as market rises
5. **Correlation in Crisis**: Assets correlate during tail events

## Implementation Guidelines

### Structure
- Core logic: risk_engine/tail_risk.py
- Helper functions: risk_engine/extreme_events.py
- Tests: tests/test_tail_risk.py

### Patterns to Follow
- Calculate higher moments of returns distribution
- Implement tail risk indicators
- Monitor correlation changes during stress

## Adherence Checklist
Before completing your task, verify:
- [ ] Tail risk metrics calculated (skew, kurtosis, ES)
- [ ] Stress test scenarios implemented
- [ ] Tail hedging allocation tracked
- [ ] Dynamic adjustment logic for changing conditions
- [ ] Stress correlation matrix monitored


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from scipy import stats

@dataclass
class TailRiskMetrics:
    """Tail risk assessment metrics."""
    skewness: float
    kurtosis: float
    expected_shortfall_99: float
    max_drawdown: float
    tail_correlation: float
    risk_score: float

class TailRiskManager:
    """Manages tail risk exposure."""
    
    def __init__(
        self,
        var_threshold: float = 0.05,
        es_confidence: float = 0.99
    ):
        self.var_threshold = var_threshold
        self.es_confidence = es_confidence
    
    def calculate_skewness(self, returns: np.ndarray) -> float:
        """Calculate skewness of returns distribution."""
        return float(stats.skew(returns))
    
    def calculate_kurtosis(self, returns: np.ndarray) -> float:
        """Calculate kurtosis of returns distribution."""
        return float(stats.kurtosis(returns))
    
    def calculate_expected_shortfall(
        self, returns: np.ndarray, confidence: float = 0.99
    ) -> float:
        """Calculate Expected Shortfall (CVaR)."""
        VaR = np.percentile(returns, (1 - confidence) * 100)
        tail_returns = returns[returns <= VaR]
        return float(-np.mean(tail_returns)) if len(tail_returns) > 0 else 0
    
    def calculate_tail_correlation(
        self, returns1: pd.Series, returns2: pd.Series, threshold: float = -0.03
    ) -> float:
        """Calculate correlation during tail events."""
        tail_mask = (returns1 <= threshold) | (returns2 <= threshold)
        
        if tail_mask.sum() < 10:
            return 0.0
        
        tail_returns1 = returns1[tail_mask]
        tail_returns2 = returns2[tail_mask]
        
        correlation = tail_returns1.corr(tail_returns2)
        return float(correlation) if not pd.isna(correlation) else 0.0
    
    def tail_risk_score(
        self, returns: np.ndarray, market_returns: np.ndarray
    ) -> float:
        """Calculate composite tail risk score."""
        skew = self.calculate_skewness(returns)
        kurt = self.calculate_kurtosis(returns)
        es = self.calculate_expected_shortfall(returns)
        tail_corr = self.calculate_tail_correlation(
            pd.Series(returns), pd.Series(market_returns)
        )
        
        # Higher kurtosis, negative skew, higher ES = higher risk
        risk_score = (
            0.3 * min(abs(kurt) / 10, 1.0) +
            0.3 * max(0, -skew) +
            0.2 * min(es / 0.1, 1.0) +
            0.2 * tail_corr
        )
        
        return float(risk_score)
    
    def stress_test_scenarios(
        self, current_prices: Dict[str, float], scenarios: List[Dict]
    ) -> Dict[str, float]:
        """Run stress test scenarios on portfolio."""
        results = {}
        
        for scenario in scenarios:
            scenario_name = scenario.get('name', 'unknown')
            price_changes = scenario.get('price_changes', {})
            
            portfolio_change = 0
            for symbol, pct_change in price_changes.items():
                if symbol in current_prices:
                    portfolio_change += current_prices[symbol] * pct_change / 100
            
            results[scenario_name] = portfolio_change
        
        return results
    
    def dynamic_tail_protection(
        self, market_state: str, portfolio_value: float
    ) -> float:
        """Adjust tail protection based on market conditions."""
        # Protection scales with market state
        if market_state == 'extreme_froth':
            return portfolio_value * 0.10  # 10% protection
        elif market_state == 'froth':
            return portfolio_value * 0.05  # 5% protection
        elif market_state == 'normal':
            return portfolio_value * 0.02  # 2% protection
        else:
            return 0.0  # No protection needed
    
    def drawdown_at_risk(
        self, equity_curve: pd.Series, confidence: float = 0.99
    ) -> float:
        """Calculate drawdown at risk (analogous to VaR)."""
        running_max = equity_curve.cummax()
        drawdown = (equity_curve - running_max) / (running_max + 1e-8)
        
        # Sort drawdowns
        sorted_dd = np.sort(drawdown.values)
        
        # Get DD at confidence level
        dd_index = int(len(sorted_dd) * (1 - confidence))
        dd_at_risk = -sorted_dd[dd_index]
        
        return float(dd_at_risk)
    
    def correlation_breakdown_warning(
        self, normal_corr: float, stress_corr: float, threshold: float = 0.3
    ) -> Tuple[bool, str]:
        """Detect when correlations break down in stress scenarios."""
        correlation_increase = stress_corr - normal_corr
        
        if correlation_increase > threshold:
            return True, f"Correlation breakdown detected: +{correlation_increase:.2%}"
        
        return False, ""
```