---
name: trading-backtest-drawdown-analysis
description: Maximum Drawdown, Recovery Time, and Value-at-Risk Analysis
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: backtest drawdown analysis, backtest-drawdown-analysis, maximum, recovery,
    value-at-risk
  related-skills: trading-backtest-position-sizing, trading-fundamentals-risk-management-basics,
    trading-exchange-order-book-sync, trading-exchange-order-execution-api
---

**Role:** Risk Analysis Specialist — implements comprehensive drawdown and risk metrics to evaluate strategy drawdown behavior, recovery characteristics, and tail risk exposure.

**Philosophy:** Drawdown-Centric Risk Assessment — strategies should be evaluated by their worst-case behavior, not just expected returns; maximum drawdown and recovery time reveal true stress tolerance.

## Key Principles

1. **Maximum Drawdown Focus**: Maximum drawdown is the single most important risk metric for trading strategies, representing the largest peak-to-trough decline.

2. **Recovery Time Analysis**: A strategy's value is heavily influenced by how quickly it recovers from drawdowns; long recovery periods indicate poor strategy resilience.

3. **Distribution Analysis**: Single-point metrics (max DD) are insufficient; analyze the full distribution of drawdowns to understand frequency and severity patterns.

4. **Value-at-Risk Integration**: Combine drawdown analysis with VaR and CVaR for comprehensive tail risk assessment across different confidence levels.

5. **Stress Testing**: Use historical crisis periods to test drawdown behavior; strategies should be validated under extreme market conditions.

## Implementation Guidelines

### Structure
- Core logic: `skills/backtesting/drawdown_analysis.py`
- Risk metrics module: `skills/backtesting/risk_metrics.py`
- Tests: `skills/tests/test_drawdown_analysis.py`

### Patterns to Follow
- Implement drawdown calculation as a class with multiple analysis methods
- Support both price-based and return-based drawdown analysis
- Include recovery time calculation and statistics
- Provide VaR and CVaR calculations at multiple confidence levels
- Use vectorized operations for efficient large-scale calculations

## Adherence Checklist
Before completing your task, verify:
- [ ] **Maximum Drawdown**: Is maximum drawdown correctly calculated as peak-to-trough percentage decline?
- [ ] **Recovery Time**: Are drawdown recovery times calculated and statistics provided?
- [ ] **VaR/CVaR**: Are Value-at-Risk and Conditional Value-at-Risk calculated at multiple confidence levels?
- [ ] **Drawdown Distribution**: Is the full distribution of drawdowns analyzed, not just the maximum?
- [ ] **Stress Testing**: Are drawdowns evaluated during historical crisis periods?

## Code Examples

### Maximum Drawdown Analysis System

```python
from dataclasses import dataclass
from typing import List, Tuple, Optional, Dict
import numpy as np
import pandas as pd
from scipy import stats
from enum import Enum


@dataclass
class DrawdownEvent:
    """Single drawdown event with full characteristics."""
    peak_date: pd.Timestamp
    peak_value: float
    trough_date: pd.Timestamp
    trough_value: float
    trough_return: float
    recovery_date: Optional[pd.Timestamp]
    recovery_value: Optional[float]
    recovery_return: Optional[float]
    duration_days: int
    recovery_days: Optional[int]
    depth_percentage: float
    severity: float  # Depth × Duration


@dataclass
class DrawdownStats:
    """Comprehensive drawdown statistics."""
    max_drawdown: float
    max_drawdown_date: pd.Timestamp
    max_drawdown_peak: float
    max_drawdown_trough: float
    average_drawdown: float
    median_drawdown: float
    drawdown_std: float
    n_drawdowns: int
    average_recovery_time: Optional[float]
    median_recovery_time: Optional[float]
    max_drawdown_recovery_days: Optional[int]
    underwater_duration_days: int
    time_in_drawdown: float


class DrawdownAnalyzer:
    """
    Comprehensive drawdown analysis system.
    Calculates drawdowns, recovery times, and provides detailed statistics.
    """
    
    def __init__(self, prices: pd.Series, returns: Optional[pd.Series] = None):
        """
        Initialize drawdown analyzer.
        
        Args:
            prices: Price series for drawdown calculation
            returns: Optional return series for additional analysis
        """
        self.prices = prices.dropna()
        self.returns = returns.dropna() if returns is not None else None
        self.running_max = self.prices.cummax()
        self.drawdowns = (self.prices - self.running_max) / self.running_max
        
    def find_drawdown_events(self) -> List[DrawdownEvent]:
        """
        Identify all drawdown events in the time series.
        
        Returns:
            List of DrawdownEvent objects with full characteristics
        """
        events = []
        in_drawdown = False
        peak_date = None
        peak_value = None
        trough_date = None
        trough_value = None
        
        for i, (date, price) in enumerate(self.prices.items()):
            current_max = self.running_max.loc[date]
            dd = self.drawdowns.loc[date]
            
            if dd < 0:  # Currently in drawdown
                if not in_drawdown:
                    # Starting new drawdown
                    peak_date = date
                    peak_value = price
                    in_drawdown = True
                
                # Update trough if deeper
                if dd < (trough_value / peak_value - 1 if trough_value else 0):
                    trough_date = date
                    trough_value = price
                
            elif in_drawdown and dd == 0:
                # Drawdown ended at previous point
                recovery_date = date
                recovery_value = price
                
                # Calculate recovery return
                recovery_return = (recovery_value - trough_value) / trough_value if trough_value else 0
                
                events.append(DrawdownEvent(
                    peak_date=peak_date,
                    peak_value=peak_value,
                    trough_date=trough_date,
                    trough_value=trough_value,
                    trough_return=(trough_value - peak_value) / peak_value,
                    recovery_date=recovery_date,
                    recovery_value=recovery_value,
                    recovery_return=recovery_return,
                    duration_days=(trough_date - peak_date).days if peak_date and trough_date else 0,
                    recovery_days=(recovery_date - trough_date).days if recovery_date and trough_date else 0,
                    depth_percentage=abs((trough_value - peak_value) / peak_value),
                    severity=abs((trough_value - peak_value) / peak_value) * (trough_date - peak_date).days if peak_date and trough_date else 0
                ))
                
                in_drawdown = False
                peak_date = None
                peak_value = None
                trough_date = None
                trough_value = None
        
        # Handle ongoing drawdown
        if in_drawdown and trough_date:
            events.append(DrawdownEvent(
                peak_date=peak_date,
                peak_value=peak_value,
                trough_date=trough_date,
                trough_value=trough_value,
                trough_return=(trough_value - peak_value) / peak_value,
                recovery_date=None,
                recovery_value=None,
                recovery_return=None,
                duration_days=(self.prices.index[-1] - peak_date).days,
                recovery_days=None,
                depth_percentage=abs((trough_value - peak_value) / peak_value),
                severity=abs((trough_value - peak_value) / peak_value) * (self.prices.index[-1] - peak_date).days
            ))
        
        return events
    
    def calculate_max_drawdown(self) -> Tuple[float, pd.Timestamp, pd.Timestamp]:
        """
        Calculate maximum drawdown and locate its dates.
        
        Returns:
            Tuple of (max_dd, peak_date, trough_date)
        """
        # Find the maximum drawdown value
        min_dd_idx = self.drawdowns.idxmin()
        min_dd = self.drawdowns.min()
        
        # Find corresponding peak (running max at that point)
        peak_date = self.running_max.idxmin()
        trough_date = min_dd_idx
        
        return float(min_dd), peak_date, trough_date
    
    def get_drawdown_stats(self) -> DrawdownStats:
        """
        Calculate comprehensive drawdown statistics.
        
        Returns:
            DrawdownStats with all key metrics
        """
        events = self.find_drawdown_events()
        
        if not events:
            return DrawdownStats(
                max_drawdown=0.0,
                max_drawdown_date=self.prices.index[0],
                max_drawdown_peak=0.0,
                max_drawdown_trough=0.0,
                average_drawdown=0.0,
                median_drawdown=0.0,
                drawdown_std=0.0,
                n_drawdowns=0,
                average_recovery_time=None,
                median_recovery_time=None,
                max_drawdown_recovery_days=None,
                underwater_duration_days=0,
                time_in_drawdown=0.0
            )
        
        # Extract metrics
        depths = [e.depth_percentage for e in events]
        durations = [e.duration_days for e in events]
        
        # Recovery times (only for completed drawdowns)
        recovery_times = [e.recovery_days for e in events if e.recovery_days is not None]
        
        # Calculate max drawdown details
        max_dd_idx = self.drawdowns.idxmin()
        max_dd = self.drawdowns.min()
        peak_idx = self.running_max.idxmin()
        
        # Underwater duration
        underwater_idx = self.drawdowns[self.drawdowns < 0].index
        underwater_duration = (underwater_idx[-1] - underwater_idx[0]).days if len(underwater_idx) > 0 else 0
        
        # Time in drawdown (percentage of total)
        time_in_dd = len(underwater_idx) / len(self.drawdowns) if len(self.drawdowns) > 0 else 0
        
        return DrawdownStats(
            max_drawdown=float(max_dd),
            max_drawdown_date=max_dd_idx,
            max_drawdown_peak=float(self.running_max.loc[peak_idx]),
            max_drawdown_trough=float(self.prices.loc[max_dd_idx]),
            average_drawdown=float(np.mean(depths)),
            median_drawdown=float(np.median(depths)),
            drawdown_std=float(np.std(depths)),
            n_drawdowns=len(events),
            average_recovery_time=float(np.mean(recovery_times)) if recovery_times else None,
            median_recovery_time=float(np.median(recovery_times)) if recovery_times else None,
            max_drawdown_recovery_days=max(durations) if durations else None,
            underwater_duration_days=underwater_duration,
            time_in_drawdown=time_in_dd
        )
    
    def calculate_recovery_ratio(self) -> float:
        """
        Calculate average recovery ratio.
        Measures how much of a drawdown is typically recovered.
        """
        events = self.find_drawdown_events()
        
        recovery_ratios = []
        for event in events:
            if event.recovery_return and event.trough_return:
                # Ratio of recovered return to original drawdown
                ratio = event.recovery_return / abs(event.trough_return) if event.trough_return != 0 else 0
                recovery_ratios.append(ratio)
        
        return float(np.mean(recovery_ratios)) if recovery_ratios else 0.0
    
    def calculate_drawdown_severity_index(self) -> float:
        """
        Calculate a composite severity index.
        Combines depth and duration of drawdowns.
        """
        stats = self.get_drawdown_stats()
        
        # Severity = max_dd × average_duration × time_in_dd
        severity = abs(stats.max_drawdown) * stats.median_drawdown * stats.time_in_drawdown
        
        return severity


# Value at Risk and Conditional Value at Risk
class RiskMetricsCalculator:
    """
    Calculate VaR and CVaR (Expected Shortfall) for risk assessment.
    """
    
    def __init__(self, returns: pd.Series, confidence_levels: List[float] = None):
        """
        Initialize risk metrics calculator.
        
        Args:
            returns: Return series
            confidence_levels: List of confidence levels for VaR (default: [0.95, 0.99])
        """
        self.returns = returns.dropna()
        self.confidence_levels = confidence_levels or [0.95, 0.99, 0.995]
    
    def calculate_var_historic(self, confidence: float = 0.95) -> float:
        """
        Calculate historic Value-at-Risk.
        The loss threshold that will not be exceeded with given confidence.
        """
        if confidence <= 0 or confidence >= 1:
            raise ValueError("Confidence must be between 0 and 1 (exclusive)")
        
        # VaR is the quantile of losses (negative of returns quantile)
        var = -np.percentile(self.returns, (1 - confidence) * 100)
        return float(var)
    
    def calculate_var_parametric(self, confidence: float = 0.95) -> float:
        """
        Calculate parametric (variance-covariance) VaR.
        Assumes returns are normally distributed.
        """
        mean_ret = self.returns.mean()
        std_ret = self.returns.std(ddof=1)
        
        # Z-score for confidence level
        z_score = stats.norm.ppf(1 - confidence)
        
        # VaR = -(mean + z * std)
        var = -(mean_ret + z_score * std_ret)
        return float(var)
    
    def calculate_var_historical_simulation(self, 
                                           confidence: float = 0.95,
                                           n_days: int = 1) -> float:
        """
        Calculate multi-day historic VaR using simulation.
        """
        var_single_day = self.calculate_var_historic(confidence)
        
        # Scale to n days (square root of time rule)
        var_n_day = var_single_day * np.sqrt(n_days)
        return float(var_n_day)
    
    def calculate_cvar(self, confidence: float = 0.95) -> float:
        """
        Calculate Conditional Value-at-Risk (Expected Shortfall).
        Expected loss given that the loss exceeds VaR.
        """
        var = self.calculate_var_historic(confidence)
        
        # CVaR is the mean of returns below the VaR threshold
        returns_below_var = self.returns[self.returns <= -var]
        
        if len(returns_below_var) == 0:
            return float(var)
        
        cvar = -returns_below_var.mean()
        return float(cvar)
    
    def calculate_all_risk_metrics(self) -> Dict:
        """
        Calculate all risk metrics at once.
        
        Returns:
            Dictionary with all risk metrics
        """
        results = {}
        
        for conf in self.confidence_levels:
            conf_key = f"{int(conf * 100)}%"
            results[f"var_historic_{conf_key}"] = self.calculate_var_historic(conf)
            results[f"var_parametric_{conf_key}"] = self.calculate_var_parametric(conf)
            results[f"var_1d_historic_{conf_key}"] = self.calculate_var_historic(conf)
            results[f"var_10d_historic_{conf_key}"] = self.calculate_var_historical_simulation(conf, 10)
            results[f"var_20d_historic_{conf_key}"] = self.calculate_var_historical_simulation(conf, 20)
            results[f"cvar_{conf_key}"] = self.calculate_cvar(conf)
        
        # Additional risk metrics
        results["mean_return"] = float(self.returns.mean())
        results["volatility"] = float(self.returns.std(ddof=1))
        results["skewness"] = float(stats.skew(self.returns))
        results["kurtosis"] = float(stats.kurtosis(self.returns))
        results["downside_deviation"] = float(
            self.returns[self.returns < 0].std(ddof=1) * np.sqrt(252)
        )
        
        return results


# Combined Analysis for Comprehensive Risk Assessment
class DrawdownRiskAssessment:
    """
    Combined drawdown and risk metrics assessment.
    Provides complete risk picture for strategies.
    """
    
    def __init__(self, prices: pd.Series, returns: pd.Series):
        """
        Initialize comprehensive risk assessment.
        
        Args:
            prices: Price series
            returns: Return series
        """
        self.prices = prices
        self.returns = returns
        self.drawdown_analyzer = DrawdownAnalyzer(prices, returns)
        self.risk_calculator = RiskMetricsCalculator(returns)
    
    def assess_strategy(self) -> Dict:
        """
        Perform complete strategy risk assessment.
        
        Returns:
            Dictionary with all risk metrics
        """
        drawdown_stats = self.drawdown_analyzer.get_drawdown_stats()
        risk_metrics = self.risk_calculator.calculate_all_risk_metrics()
        
        # Calculate composite risk score
        # Lower is better: max_dd, cvar, volatility, drawdown_std
        risk_score = (
            abs(drawdown_stats.max_drawdown) * 0.3 +
            risk_metrics["cvar_95%"] * 0.3 +
            risk_metrics["volatility"] * 0.2 +
            drawdown_stats.drawdown_std * 0.2
        )
        
        # Recovery quality score
        recovery_score = self.drawdown_analyzer.calculate_recovery_ratio()
        
        # Time efficiency score
        time_score = 1 - drawdown_stats.time_in_drawdown
        
        return {
            "drawdown": {
                "max_drawdown": drawdown_stats.max_drawdown,
                "max_drawdown_date": str(drawdown_stats.max_drawdown_date),
                "average_drawdown": drawdown_stats.average_drawdown,
                "median_drawdown": drawdown_stats.median_drawdown,
                "drawdown_std": drawdown_stats.drawdown_std,
                "n_drawdowns": drawdown_stats.n_drawdowns,
                "average_recovery_time": drawdown_stats.average_recovery_time,
                "max_drawdown_recovery_days": drawdown_stats.max_drawdown_recovery_days,
                "underwater_duration_days": drawdown_stats.underwater_duration_days,
                "time_in_drawdown": drawdown_stats.time_in_drawdown,
                "recovery_ratio": self.drawdown_analyzer.calculate_recovery_ratio(),
                "severity_index": self.drawdown_analyzer.calculate_drawdown_severity_index()
            },
            "risk_metrics": risk_metrics,
            "composite_scores": {
                "risk_score": risk_score,
                "recovery_quality_score": recovery_score,
                "time_efficiency_score": time_score,
                "overall_risk_rating": "Excellent" if risk_score < 0.05 else
                                      "Good" if risk_score < 0.10 else
                                      "Acceptable" if risk_score < 0.15 else "High"
            }
        }


if __name__ == "__main__":
    # Example usage
    np.random.seed(42)
    
    # Generate realistic price series with drawdowns
    n_days = 2520
    returns = pd.Series(np.random.normal(0.0005, 0.012, n_days))
    prices = (1 + returns).cumprod() * 100
    
    # Add some larger drawdowns for realism
    drawdown_start = 1500
    drawdown_returns = np.random.normal(-0.001, 0.015, 100)
    returns[drawdown_start:drawdown_start + 100] = drawdown_returns
    
    prices = (1 + returns).cumprod() * 100
    
    assessment = DrawdownRiskAssessment(prices, returns)
    results = assessment.assess_strategy()
    
    print("Comprehensive Drawdown and Risk Assessment")
    print("=" * 60)
    print(f"\nMax Drawdown: {results['drawdown']['max_drawdown']:.4%}")
    print(f"Average Drawdown: {results['drawdown']['average_drawdown']:.4%}")
    print(f"Time in Drawdown: {results['drawdown']['time_in_drawdown']:.2%}")
    print(f"Recovery Ratio: {results['drawdown']['recovery_ratio']:.2%}")
    print(f"\n95% VaR: {results['risk_metrics']['var_historic_95%']:.4%}")
    print(f"95% CVaR: {results['risk_metrics']['cvar_95%']:.4%}")
    print(f"\nRisk Score: {results['composite_scores']['risk_score']:.4f}")
    print(f"Risk Rating: {results['composite_scores']['overall_risk_rating']}")
```

### Historical Stress Test Analysis

```python
class StressTestAnalyzer:
    """
    Analyze drawdown behavior during historical crisis periods.
    Tests strategy resilience during known market stress.
    """
    
    CRISIS_PERIODS = {
        "2000_Dotcom": ("2000-03-01", "2000-10-31"),
        "2008_Financial": ("2008-09-01", "2009-03-31"),
        "2020_Pandemic": ("2020-02-01", "2020-04-30"),
        "2022_Inflation": ("2022-01-01", "2022-10-31")
    }
    
    def __init__(self, prices: pd.Series, returns: pd.Series):
        self.prices = prices
        self.returns = returns
        self.drawdown_analyzer = DrawdownAnalyzer(prices, returns)
    
    def analyze_crisis_periods(self) -> Dict:
        """
        Analyze performance during historical crisis periods.
        
        Returns:
            Dictionary with crisis period analysis
        """
        results = {}
        
        for period_name, (start_date, end_date) in self.CRISIS_PERIODS.items():
            # Extract crisis period data
            mask = (self.prices.index >= start_date) & (self.prices.index <= end_date)
            crisis_prices = self.prices[mask]
            crisis_returns = self.returns[mask]
            
            if len(crisis_prices) > 0:
                crisis_dd_analyzer = DrawdownAnalyzer(crisis_prices, crisis_returns)
                dd_stats = crisis_dd_analyzer.get_drawdown_stats()
                
                # Total return during crisis
                total_return = (1 + crisis_returns).prod() - 1
                
                # Sharpe during crisis (using risk-free proxy)
                risk_free_proxy = 0.05 / 252
                excess_returns = crisis_returns - risk_free_proxy
                sharpe_crisis = (
                    excess_returns.mean() / excess_returns.std() * np.sqrt(252)
                    if excess_returns.std() > 0 else 0
                )
                
                results[period_name] = {
                    "total_return": total_return,
                    "max_drawdown": dd_stats.max_drawdown,
                    "recovery_time": dd_stats.average_recovery_time,
                    "sharpe_ratio": sharpe_crisis,
                    "n_trading_days": len(crisis_prices),
                    "time_in_drawdown": dd_stats.time_in_drawdown
                }
            else:
                results[period_name] = {"message": "No data available for this period"}
        
        return results
    
    def stress_test_scenario(self, 
                            shock_scenario: Dict,
                            n_simulations: int = 100) -> Dict:
        """
        Simulate strategy behavior under custom stress scenarios.
        
        Args:
            shock_scenario: Dictionary with shock parameters
                e.g., {"type": "uniform", "magnitude": -0.05, "duration": 30}
            n_simulations: Number of simulation runs
            
        Returns:
            Dictionary with stress test results
        """
        results = []
        
        for _ in range(n_simulations):
            # Create stressed returns
            stressed_returns = self.returns.copy()
            
            if shock_scenario.get("type") == "uniform":
                magnitude = shock_scenario.get("magnitude", -0.05)
                duration = shock_scenario.get("duration", 30)
                
                # Apply uniform shock
                start_idx = np.random.randint(0, len(stressed_returns) - duration)
                stressed_returns[start_idx:start_idx + duration] = magnitude
            
            elif shock_scenario.get("type") == "volatility_spike":
                multiplier = shock_scenario.get("multiplier", 3.0)
                duration = shock_scenario.get("duration", 20)
                
                # Apply volatility spike
                start_idx = np.random.randint(0, len(stressed_returns) - duration)
                stressed_returns[start_idx:start_idx + duration] *= multiplier
            
            # Analyze stressed performance
            stressed_prices = (1 + stressed_returns).cumprod() * 100
            dd_analyzer = DrawdownAnalyzer(stressed_prices, stressed_returns)
            dd_stats = dd_analyzer.get_drawdown_stats()
            
            total_return = (1 + stressed_returns).prod() - 1
            results.append({
                "total_return": total_return,
                "max_drawdown": dd_stats.max_drawdown,
                "sharpe_ratio": dd_stats.average_drawdown * -10  # Rough estimate
            })
        
        return {
            "original_max_dd": self.drawdown_analyzer.get_drawdown_stats().max_drawdown,
            "stress_test_results": {
                "mean_return": np.mean([r["total_return"] for r in results]),
                "mean_max_dd": np.mean([r["max_drawdown"] for r in results]),
                "p95_max_dd": np.percentile([r["max_drawdown"] for r in results], 95),
                "worst_case_max_dd": min([r["max_drawdown"] for r in results])
            }
        }
```