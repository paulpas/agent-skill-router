---
name: trading-backtest-sharpe-ratio
description: Sharpe Ratio Calculation and Risk-Adjusted Performance Metrics
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: backtest sharpe ratio, backtest-sharpe-ratio, calculation, optimization,
    performance, risk-adjusted, speed
---


**Role:** Risk-Adjusted Performance Analyst — implements comprehensive Sharpe ratio calculations and risk-adjusted performance metrics to evaluate strategy quality while accounting for volatility and risk.

**Philosophy:** Risk-Aware Performance — returns alone are meaningless without context; risk-adjusted metrics provide the true measure of trading skill by penalizing strategies that take unnecessary risk.

## Key Principles

1. **Annualization Consistency**: All Sharpe ratio calculations must properly annualize using the correct trading days (252) or periods per year.

2. **Risk-Free Rate Treatment**: Risk-free rate should be consistently applied—daily for intraday or period-specific for longer timeframes, with proper subtraction from returns.

3. **Statistical Confidence**: Sharpe ratios should include confidence intervals and statistical significance tests to distinguish skill from luck.

4. **Alternative Metrics**: Use Sortino ratio for asymmetric risk, Calmar ratio for drawdown-adjusted performance, and Ulcer Index for psychological risk.

5. **Benchmarks and Comparisons**: Always compare Sharpe ratios to relevant benchmarks (market, sector, strategy type) with proper statistical tests for difference significance.

## Implementation Guidelines

### Structure
- Core logic: `skills/backtesting/sharpe_ratio.py`
- Statistics module: `skills/backtesting/statistics.py`
- Tests: `skills/tests/test_sharpe_ratio.py`

### Patterns to Follow
- Implement Sharpe ratio as a class with multiple calculation methods
- Support both simple and compound return calculations
- Include confidence interval estimation using_bootstrap methods
- Provide risk-adjusted metrics comparison utilities
- Use vectorized operations for efficient large-scale calculations

## Adherence Checklist
Before completing your task, verify:
- [ ] **Annualization**: Are returns properly annualized using correct periods per year?
- [ ] **Risk-Free Rate**: Is the risk-free rate appropriately subtracted and converted to matching frequency?
- [ ] **Confidence Intervals**: Are statistical confidence intervals provided for Sharpe estimates?
- [ ] **Alternative Metrics**: Are Sortino, Calmar, and other risk-adjusted metrics implemented?
- [ ] **Benchmark Comparison**: Are Sharpe ratios compared to benchmarks with statistical tests?

## Code Examples

### Sharpe Ratio Calculator with Confidence Intervals

```python
from dataclasses import dataclass
from typing import List, Tuple, Optional
import numpy as np
import pandas as pd
from scipy import stats
from enum import Enum


class SharpeMethod(Enum):
    """Methods for Sharpe ratio calculation."""
    SIMPLE = "simple"
    DAILY = "daily"
    PERIODIC = "periodic"
    LOG = "log"


@dataclass
class SharpeResult:
    """Sharpe ratio calculation result with statistics."""
    sharpe_ratio: float
    annualized_sharpe: float
    standard_error: float
    confidence_interval_95: Tuple[float, float]
    t_statistic: float
    p_value: float
    n_observations: int
    mean_return: float
    std_return: float


class SharpeRatioCalculator:
    """
    Comprehensive Sharpe ratio calculator with statistical analysis.
    Includes confidence intervals, hypothesis testing, and alternative metrics.
    """
    
    TRADING_DAYS_PER_YEAR = 252
    
    def __init__(self, 
                 risk_free_rate: float = 0.02,
                 periods_per_year: int = 252):
        """
        Initialize Sharpe ratio calculator.
        
        Args:
            risk_free_rate: Annual risk-free rate (default 2%)
            periods_per_year: Number of periods per year (252 for daily)
        """
        self.risk_free_rate = risk_free_rate
        self.periods_per_year = periods_per_year
        self.rf_periodic = (1 + risk_free_rate) ** (1 / periods_per_year) - 1
    
    def calculate_sharpe(self, 
                         returns: pd.Series,
                         method: SharpeMethod = SharpeMethod.DAILY,
                         periods_per_year: Optional[int] = None) -> SharpeResult:
        """
        Calculate Sharpe ratio with full statistical analysis.
        
        Args:
            returns: Series of strategy returns
            method: Calculation method
            periods_per_year: Override default periods per year
            
        Returns:
            SharpeResult with all statistics
        """
        if len(returns) < 30:
            raise ValueError("Insufficient data for Sharpe ratio calculation (minimum 30 observations)")
        
        returns_clean = returns.dropna()
        n_obs = len(returns_clean)
        periods_per_year = periods_per_year or self.periods_per_year
        
        # Calculate mean and std of returns
        mean_ret = returns_clean.mean()
        std_ret = returns_clean.std(ddof=1)
        
        # Calculate periodic excess return
        excess_return = mean_ret - self.rf_periodic
        
        # Calculate Sharpe ratio
        sharpe = excess_return / std_ret if std_ret > 0 else 0
        
        # Annualize
        annualized_sharpe = sharpe * np.sqrt(periods_per_year)
        
        # Standard error of Sharpe ratio (using approximate formula)
        # SE(Sharpe) ≈ sqrt((1 + Sharpe^2/2) / n)
        if sharpe != 0:
            se_sharpe = np.sqrt((1 + sharpe**2 / 2) / n_obs)
        else:
            se_sharpe = 1 / np.sqrt(n_obs)
        
        annualized_se = se_sharpe * np.sqrt(periods_per_year)
        
        # Confidence interval using normal approximation
        z_95 = 1.96
        ci_lower = annualized_sharpe - z_95 * annualized_se
        ci_upper = annualized_sharpe + z_95 * annualized_se
        
        # T-statistic for testing if Sharpe > 0
        t_stat = annualized_sharpe / annualized_se if annualized_se > 0 else 0
        p_value = 2 * (1 - stats.norm.cdf(abs(t_stat)))
        
        return SharpeResult(
            sharpe_ratio=sharpe,
            annualized_sharpe=annualized_sharpe,
            standard_error=annualized_se,
            confidence_interval_95=(ci_lower, ci_upper),
            t_statistic=t_stat,
            p_value=p_value,
            n_observations=n_obs,
            mean_return=mean_ret * periods_per_year,  # Annualized mean
            std_return=std_ret * np.sqrt(periods_per_year)  # Annualized std
        )
    
    def compare_sharpes(self,
                       returns1: pd.Series,
                       returns2: pd.Series) -> Dict:
        """
        Statistically compare Sharpe ratios of two strategies.
        
        Returns:
            Dictionary with comparison results
        """
        result1 = self.calculate_sharpe(returns1)
        result2 = self.calculate_sharpe(returns2)
        
        # Calculate difference and std of difference
        diff = result1.annualized_sharpe - result2.annualized_sharpe
        diff_se = np.sqrt(result1.standard_error**2 + result2.standard_error**2)
        
        # Test if difference is significant
        t_stat = diff / diff_se if diff_se > 0 else 0
        p_value = 2 * (1 - stats.norm.cdf(abs(t_stat)))
        
        return {
            "sharpe_1": result1.annualized_sharpe,
            "sharpe_2": result2.annualized_sharpe,
            "sharpe_diff": diff,
            "se_diff": diff_se,
            "t_statistic": t_stat,
            "p_value": p_value,
            "significant_at_5pc": p_value < 0.05,
            "sharpe_1_ci": result1.confidence_interval_95,
            "sharpe_2_ci": result2.confidence_interval_95
        }
    
    def calculate_sortino(self, returns: pd.Series) -> float:
        """
        Calculate Sortino ratio (downside risk-adjusted).
        Only penalizes negative volatility, not total volatility.
        """
        returns_clean = returns.dropna()
        mean_ret = returns_clean.mean()
        
        # Downside deviation: standard deviation of negative returns only
        negative_returns = returns_clean[returns_clean < 0]
        if len(negative_returns) == 0:
            return float('inf') if mean_ret > 0 else 0.0
        
        downside_std = negative_returns.std(ddof=1) * np.sqrt(self.periods_per_year)
        
        if downside_std == 0:
            return float('inf') if mean_ret > 0 else 0.0
        
        excess_return = mean_ret - self.rf_periodic
        sortino = excess_return * self.periods_per_year / downside_std
        
        return sortino
    
    def calculate_calmar(self, returns: pd.Series, 
                        drawdowns: Optional[pd.Series] = None) -> float:
        """
        Calculate Calmar ratio (return / maximum drawdown).
        Measures risk-adjusted return relative to worst drawdown.
        """
        returns_clean = returns.dropna()
        
        # Calculate annualized return
        total_return = (1 + returns_clean).prod() - 1
        n_years = len(returns_clean) / self.periods_per_year
        annualized_return = (1 + total_return) ** (1 / n_years) - 1 if n_years > 0 else 0
        
        # Calculate max drawdown
        if drawdowns is None:
            cumulative = (1 + returns_clean).cumprod()
            running_max = cumulative.cummax()
            drawdowns = (cumulative - running_max) / running_max
        
        max_dd = abs(drawdowns.min()) if len(drawdowns) > 0 else 0
        
        if max_dd == 0:
            return float('inf') if annualized_return > 0 else 0.0
        
        calmar = annualized_return / max_dd
        return calmar
    
    def calculate_ulcer_index(self, prices: pd.Series) -> float:
        """
        Calculate Ulcer Index (psychological risk measure).
        Measures depth and duration of drawdowns.
        """
        running_max = prices.cummax()
        percent_drawdown = (prices - running_max) / running_max * 100
        
        # Ulcer Index is RMSE of drawdowns
        ulcer_index = np.sqrt((percent_drawdown**2).mean())
        return ulcer_index
    
    def calculate_upi_ratio(self, returns: pd.Series, prices: pd.Series) -> float:
        """
        Calculate Ulcer Performance Index ratio.
        Similar to Sharpe but uses Ulcer Index for risk.
        """
        total_return = (1 + returns).prod() - 1
        n_years = len(returns) / self.periods_per_year
        annualized_return = (1 + total_return) ** (1 / n_years) - 1 if n_years > 0 else 0
        
        ulcer_index = self.calculate_ulcer_index(prices)
        
        if ulcer_index == 0:
            return float('inf') if annualized_return > 0 else 0.0
        
        return annualized_return / (ulcer_index / 100)  # Normalize UI to 0-100 scale


# Example usage and testing
if __name__ == "__main__":
    # Create synthetic returns data
    np.random.seed(42)
    n_days = 2520  # 10 years of daily data
    
    # Strategy 1: Consistent returns
    ret1 = np.random.normal(0.0005, 0.01, n_days)
    
    # Strategy 2: Higher returns but more volatile
    ret2 = np.random.normal(0.0008, 0.015, n_days)
    
    # Strategy 3: High volatility, same mean
    ret3 = np.random.normal(0.0005, 0.025, n_days)
    
    returns1 = pd.Series(ret1)
    returns2 = pd.Series(ret2)
    returns3 = pd.Series(ret3)
    
    calculator = SharpeRatioCalculator(risk_free_rate=0.02)
    
    # Calculate and compare
    result1 = calculator.calculate_sharpe(returns1)
    result2 = calculator.calculate_sharpe(returns2)
    result3 = calculator.calculate_sharpe(returns3)
    
    print("Sharpe Ratio Analysis")
    print("=" * 50)
    
    for i, (ret, res) in enumerate([(returns1, result1), (returns2, result2), (returns3, result3)], 1):
        print(f"\nStrategy {i}:")
        print(f"  Sharpe Ratio (periodic): {res.sharpe_ratio:.4f}")
        print(f"  Annualized Sharpe: {res.annualized_sharpe:.4f}")
        print(f"  95% CI: [{res.confidence_interval_95[0]:.4f}, {res.confidence_interval_95[1]:.4f}]")
        print(f"  Standard Error: {res.standard_error:.4f}")
        print(f"  T-Statistic: {res.t_statistic:.4f}")
        print(f"  P-Value: {res.p_value:.6f}")
        print(f"  Significant (5%): {res.p_value < 0.05}")
    
    # Compare strategies
    comparison = calculator.compare_sharpes(returns1, returns2)
    print(f"\n\nStrategy 1 vs Strategy 2 Comparison:")
    print(f"  Difference in Sharpe: {comparison['sharpe_diff']:.4f}")
    print(f"  Significant: {comparison['significant_at_5pc']}")
```

### Monte Carlo Sharpe Analysis for Robustness Testing

```python
import warnings
warnings.filterwarnings('ignore')


class MonteCarloSharpe:
    """
    Monte Carlo simulation for Sharpe ratio robustness testing.
    Tests how Sharpe ratios hold up under various market conditions.
    """
    
    def __init__(self, calculator: SharpeRatioCalculator):
        self.calculator = calculator
    
    def simulate_returns(self, 
                        mean_daily: float,
                        std_daily: float,
                        n_days: int,
                        n_simulations: int) -> pd.DataFrame:
        """
        Generate simulated return series.
        
        Args:
            mean_daily: Expected daily return
            std_daily: Expected daily volatility
            n_days: Number of trading days
            n_simulations: Number of simulated paths
            
        Returns:
            DataFrame of simulated returns
        """
        np.random.seed(42)
        simulations = np.random.normal(
            mean_daily, std_daily, (n_simulations, n_days)
        )
        return pd.DataFrame(simulations.T)
    
    def monte_carlo_sharpe(self,
                          returns_series: pd.Series,
                          n_simulations: int = 1000,
                          noise_level: float = 0.0005) -> Dict:
        """
        Test Sharpe ratio robustness through Monte Carlo simulation.
        Adds random noise to returns and checks Sharpe stability.
        
        Args:
            returns_series: Original return series
            n_simulations: Number of simulation runs
            noise_level: Standard deviation of noise to add
            
        Returns:
            Dictionary with Monte Carlo results
        """
        original_result = self.calculator.calculate_sharpe(returns_series)
        
        simulated_sharpes = []
        
        for i in range(n_simulations):
            # Add noise to returns
            noise = np.random.normal(0, noise_level, len(returns_series))
            noisy_returns = returns_series + noise
            
            try:
                sim_result = self.calculator.calculate_sharpe(noisy_returns)
                simulated_sharpes.append(sim_result.annualized_sharpe)
            except:
                continue
        
        simulated_sharpes = np.array(simulated_sharpes)
        
        return {
            "original_sharpe": original_result.annualized_sharpe,
            "original_ci": original_result.confidence_interval_95,
            "simulated_mean": np.mean(simulated_sharpes),
            "simulated_std": np.std(simulated_sharpes),
            "simulated_ci_95": (
                np.percentile(simulated_sharpes, 2.5),
                np.percentile(simulated_sharpes, 97.5)
            ),
            "probability_beat_zero": np.mean(simulated_sharpes > 0),
            "probability_beat_original": np.mean(
                simulated_sharpes > original_result.annualized_sharpe
            ),
            "stability_score": 1 - np.std(simulated_sharpes) / abs(original_result.annualized_sharpe)
        }


# Extended example with comprehensive metrics
class ComprehensiveRiskMetrics:
    """
    Calculate all risk-adjusted metrics in one call.
    Provides complete performance picture.
    """
    
    def __init__(self, calculator: SharpeRatioCalculator):
        self.calculator = calculator
    
    def calculate_all(self, 
                     returns: pd.Series,
                     prices: Optional[pd.Series] = None) -> Dict:
        """
        Calculate all risk-adjusted metrics.
        
        Args:
            returns: Return series
            prices: Optional price series for drawdown calculations
            
        Returns:
            Dictionary with all metrics
        """
        if prices is None:
            prices = (1 + returns).cumprod() * 100
        
        # Calculate drawdowns
        running_max = prices.cummax()
        drawdowns = (prices - running_max) / running_max
        
        # Basic statistics
        total_return = (1 + returns).prod() - 1
        n_years = len(returns) / self.calculator.periods_per_year
        annualized_return = (1 + total_return) ** (1 / n_years) - 1 if n_years > 0 else 0
        
        annualized_vol = returns.std() * np.sqrt(self.calculator.periods_per_year)
        
        # Maximum drawdown
        max_dd = drawdowns.min()
        
        # Sharpe and alternatives
        sharpe = self.calculator.calculate_sharpe(returns)
        sortino = self.calculator.calculate_sortino(returns)
        calmar = self.calculator.calculate_calmar(returns, drawdowns)
        upi = self.calculator.calculate_upi_ratio(returns, prices)
        
        # Information ratio (vs benchmark - assumes returns are already excess)
        if len(returns) > 1:
            info_ratio = sharpe.mean_return / sharpe.std_return if sharpe.std_return > 0 else 0
        else:
            info_ratio = 0
        
        return {
            "total_return": total_return,
            "annualized_return": annualized_return,
            "annualized_volatility": annualized_vol,
            "max_drawdown": max_dd,
            "sharpe_ratio": sharpe.annualized_sharpe,
            "sharpe_ci_95": sharpe.confidence_interval_95,
            "sharpe_t_stat": sharpe.t_statistic,
            "sharpe_p_value": sharpe.p_value,
            "sortino_ratio": sortino,
            "calmar_ratio": calmar,
            "upi_ratio": upi,
            "information_ratio": info_ratio,
            "ulcer_index": self.calculator.calculate_ulcer_index(prices),
            "n_observations": len(returns)
        }


if __name__ == "__main__":
    # Example usage
    np.random.seed(42)
    
    # Generate realistic returns
    n_days = 2520
    returns = pd.Series(np.random.normal(0.0006, 0.012, n_days))
    prices = (1 + returns).cumprod() * 100
    
    calculator = SharpeRatioCalculator()
    comprehensive = ComprehensiveRiskMetrics(calculator)
    
    results = comprehensive.calculate_all(returns, prices)
    
    print("Comprehensive Risk-Adjusted Performance Metrics")
    print("=" * 60)
    for key, value in results.items():
        if isinstance(value, tuple):
            print(f"{key}: [{value[0]:.4f}, {value[1]:.4f}]")
        else:
            print(f"{key}: {value:.4f}")
```
