---
name: performance-attribution
description: '"Provides Performance Attribution Systems for Trading Strategy Decomposition"'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: optimization, paper performance attribution, paper-performance-attribution,
    strategy, systems, trading, performance, speed
  related-skills: backtest-lookahead-bias, fundamentals-trading-plan
---



**Role:** Performance Analyst — implements systems to decompose portfolio returns into signal, execution, and market components to understand sources of alpha and identify areas for improvement.

**Philosophy:** Causal Understanding — performance attribution separates skill from luck by attributing returns to specific decision points: market selection, entry timing, position sizing, exit timing, and execution quality.

## Key Principles

1. **Multi-Layer Attribution**: Decompose returns across decision layers (position selection, timing, sizing, execution).

2. **Market-Neutral Analysis**: Isolate alpha from beta by comparing to market benchmark and risk factors.

3. **Time-Based Attribution**: Analyze performance over different time horizons (intraday, daily, weekly).

4. **Contribution Metrics**: Calculate contribution of each trade/decision to overall performance.

5. **Risk-Adjusted Attribution**: Consider risk-adjusted returns rather than raw P&L in attribution.

## Implementation Guidelines

### Structure
- Core logic: `skills/paper-trading/attribution.py`
- Contribution calculators: `skills/paper-trading/contributions.py`
- Tests: `skills/tests/test_performance_attribution.py`

### Patterns to Follow
- Use contribution-based attribution for additive decomposition
- Implement multiple attribution frameworks (Brinson, Brinson-Hood-Beebower, Brinson-Link)
- Track attribution at trade level and portfolio level
- Separate market effects from skill effects
- Use regression-based attribution for factor analysis

## Code Examples

### Multi-Layer Performance Attribution

```python
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
from enum import Enum
import numpy as np
import pandas as pd
from scipy import stats
from datetime import datetime


class AttributionLayer(Enum):
    """Layers of performance attribution."""
    POSITION_SELECTION = "position_selection"
    ENTRY_TIMING = "entry_timing"
    POSITION_SIZING = "position_sizing"
    EXIT_TIMING = "exit_timing"
    EXECUTION = "execution"
    MARKET = "market"


@dataclass
class TradeAttribution:
    """Attribution breakdown for a single trade."""
    trade_id: int
    trade: Dict
    position_selection_contribution: float
    entry_timing_contribution: float
    position_sizing_contribution: float
    exit_timing_contribution: float
    execution_contribution: float
    market_contribution: float
    total_contribution: float


@dataclass
class AttributionResult:
    """Complete attribution result."""
    attribution_by_layer: Dict[str, float]
    attribution_by_time: Dict[str, float]
    attribution_by_trade: List[TradeAttribution]
    alpha: float
    beta: float
    information_ratio: float
    contribution_summary: Dict


class PerformanceAttribution:
    """
    Comprehensive performance attribution system.
    Decomposes returns into skill and market components.
    """
    
    def __init__(self,
                 benchmark_returns: pd.Series = None,
                 risk_free_rate: float = 0.02):
        self.benchmark_returns = benchmark_returns
        self.risk_free_rate = risk_free_rate
        self.trades: List[Dict] = []
        self.portfolio_values: Dict[pd.Timestamp, float] = {}
    
    def add_trade(self, trade: Dict):
        """Add a trade to the attribution analysis."""
        self.trades.append(trade)
    
    def add_portfolio_value(self, timestamp: pd.Timestamp, value: float):
        """Record portfolio value at timestamp."""
        self.portfolio_values[timestamp] = value
    
    def calculate_position_selection_attribution(self, 
                                                  returns: pd.Series,
                                                  positions: pd.Series) -> float:
        """
        Calculate contribution from position selection.
        Measures how well positions are chosen relative to market.
        """
        if len(returns) < 2:
            return 0.0
        
        # Calculate excess returns for each position
        position_returns = returns * positions
        
        # Compare to equal-weighted benchmark
        equal_weighted_return = returns.mean()
        
        # Position selection attribution
        attribution = (position_returns.mean() - equal_weighted_return) * positions.mean()
        
        return attribution
    
    def calculate_entry_timing_attribution(self,
                                           prices: pd.Series,
                                           entry_prices: List[Tuple[pd.Timestamp, float]]) -> float:
        """
        Calculate contribution from entry timing.
        Measures timing relative to optimal entry points.
        """
        if not entry_prices:
            return 0.0
        
        total_timing_attribution = 0.0
        
        for entry_time, entry_price in entry_prices:
            # Find subsequent price movements
            future_prices = prices[prices.index > entry_time]
            
            if len(future_prices) < 2:
                continue
            
            # Calculate optimal entry (minimum price for long positions)
            optimal_entry = future_prices.min()
            actual_entry = entry_price
            
            # Timing attribution (simplified)
            if actual_entry < optimal_entry * 1.01:  # Within 1% of optimal
                timing_attribution = 0.02  # 2% contribution
            else:
                timing_attribution = -0.01  # Negative contribution
            
            total_timing_attribution += timing_attribution
        
        return total_timing_attribution
    
    def calculate_exit_timing_attribution(self,
                                          prices: pd.Series,
                                          exit_prices: List[Tuple[pd.Timestamp, float]]) -> float:
        """
        Calculate contribution from exit timing.
        Measures timing relative to optimal exit points.
        """
        if not exit_prices:
            return 0.0
        
        total_timing_attribution = 0.0
        
        for exit_time, exit_price in exit_prices:
            # Find prior price movements
            past_prices = prices[prices.index < exit_time].tail(20)
            
            if len(past_prices) < 2:
                continue
            
            # Calculate optimal exit (maximum price for long positions)
            optimal_exit = past_prices.max()
            actual_exit = exit_price
            
            # Timing attribution
            if actual_exit > optimal_exit * 0.99:  # Within 1% of optimal
                timing_attribution = 0.02
            else:
                timing_attribution = -0.01
            
            total_timing_attribution += timing_attribution
        
        return total_timing_attribution
    
    def calculate_position_sizing_attribution(self,
                                              positions: pd.Series,
                                              returns: pd.Series,
                                              volatility: pd.Series) -> float:
        """
        Calculate contribution from position sizing.
        Measures optimal sizing relative to risk and conviction.
        """
        if len(positions) < 2:
            return 0.0
        
        # Calculate risk-adjusted position sizing
        risk_adjusted_positions = positions / (volatility + 1e-6)
        
        # Optimal sizing (proportional to signal strength)
        signal_strength = np.abs(returns) / returns.std()
        optimal_positions = signal_strength * np.sign(returns)
        
        # Sizing attribution
        sizing_deviation = np.abs(risk_adjusted_positions - optimal_positions)
        attribution = -sizing_deviation.mean() * 0.1  # Penalty for deviation
        
        return attribution
    
    def calculate_execution_attribution(self,
                                        fill_prices: List[Tuple[pd.Timestamp, float]],
                                        market_prices: List[Tuple[pd.Timestamp, float]]) -> float:
        """
        Calculate contribution from execution quality.
        Measures slippage and fill quality.
        """
        if len(fill_prices) < 1 or len(market_prices) < 1:
            return 0.0
        
        total_slippage = 0.0
        
        for fill_time, fill_price in fill_prices:
            # Find closest market price
            time_diffs = [abs((fill_time - market_time).total_seconds()) 
                         for market_time, _ in market_prices]
            closest_idx = np.argmin(time_diffs)
            market_price = market_prices[closest_idx][1]
            
            # Calculate slippage
            slippage = (fill_price - market_price) / market_price
            total_slippage += slippage
        
        # Execution attribution (negative for bad execution)
        avg_slippage = total_slippage / len(fill_prices) if fill_prices else 0
        
        return -avg_slippage * 10  # Scale up for visibility
    
    def calculate_market_attribution(self,
                                     portfolio_returns: pd.Series,
                                     benchmark_returns: pd.Series) -> float:
        """
        Calculate contribution from market exposure.
        Beta-adjusted return attribution.
        """
        if len(portfolio_returns) < 2 or benchmark_returns is None:
            return 0.0
        
        # Calculate beta
        covariance = portfolio_returns.cov(benchmark_returns)
        variance = benchmark_returns.var()
        beta = covariance / variance if variance > 0 else 1.0
        
        # Calculate market attribution
        market_return = benchmark_returns.mean()
        risk_free = self.risk_free_rate / 252  # Daily risk-free rate
        
        alpha = portfolio_returns.mean() - risk_free - beta * (market_return - risk_free)
        
        return alpha
    
    def full Attribution(self, 
                         prices: pd.Series,
                         returns: pd.Series,
                         positions: pd.Series,
                         volatility: pd.Series = None,
                         entry_times: List[Tuple[pd.Timestamp, float]] = None,
                         exit_times: List[Tuple[pd.Timestamp, float]] = None,
                         fill_prices: List[Tuple[pd.Timestamp, float]] = None,
                         market_prices: List[Tuple[pd.Timestamp, float]] = None) -> AttributionResult:
        """
        Perform complete attribution analysis.
        """
        if volatility is None:
            volatility = returns.rolling(20).std()
        
        if entry_times is None:
            entry_times = []
        
        if exit_times is None:
            exit_times = []
        
        if fill_prices is None:
            fill_prices = []
        
        if market_prices is None:
            market_prices = [(prices.index[0], prices.iloc[0])]
        
        # Calculate contributions
        position_selection = self.calculate_position_selection_attribution(returns, positions)
        entry_timing = self.calculate_entry_timing_attribution(prices, entry_times)
        exit_timing = self.calculate_exit_timing_attribution(prices, exit_times)
        sizing = self.calculate_position_sizing_attribution(positions, returns, volatility)
        execution = self.calculate_execution_attribution(fill_prices, market_prices)
        market = self.calculate_market_attribution(returns, self.benchmark_returns)
        
        # Total attribution
        total = position_selection + entry_timing + exit_timing + sizing + execution + market
        
        # Calculate alpha and beta
        if len(returns) >= 2 and self.benchmark_returns is not None:
            covariance = returns.cov(self.benchmark_returns)
            variance = self.benchmark_returns.var()
            beta = covariance / variance if variance > 0 else 1.0
            
            alpha = returns.mean() - (self.risk_free_rate / 252) - beta * (
                self.benchmark_returns.mean() - (self.risk_free_rate / 252)
            )
            
            # Information ratio
            excess_returns = returns - (self.benchmark_returns * beta)
            information_ratio = excess_returns.mean() / excess_returns.std() * np.sqrt(252) if excess_returns.std() > 0 else 0
        else:
            beta = 1.0
            alpha = returns.mean()
            information_ratio = 0.0
        
        # Create attribution result
        attribution_by_layer = {
            AttributionLayer.POSITION_SELECTION.value: position_selection,
            AttributionLayer.ENTRY_TIMING.value: entry_timing,
            AttributionLayer.EXIT_TIMING.value: exit_timing,
            AttributionLayer.POSITION_SIZING.value: sizing,
            AttributionLayer.EXECUTION.value: execution,
            AttributionLayer.MARKET.value: market
        }
        
        attribution_by_time = {
            "long": sum(1 for t in entry_times if t[0].dayofweek < 3),  # Monday-Wednesday
            "short": sum(1 for t in entry_times if t[0].dayofweek >= 3),  # Thursday-Friday
            "weekend": 0,
            "hourly": {}  # Would need more detailed data
        }
        
        return AttributionResult(
            attribution_by_layer=attribution_by_layer,
            attribution_by_time=attribution_by_time,
            attribution_by_trade=[],  # Would need per-trade analysis
            alpha=alpha,
            beta=beta,
            information_ratio=information_ratio,
            contribution_summary={
                "total_return": returns.sum(),
                "total_attribution": total,
                "alpha_contribution": alpha,
                "beta_contribution": total - alpha,
                "skill_contribution": alpha,
                "luck_contribution": total - alpha - beta
            }
        )


# Example usage
if __name__ == "__main__":
    # Create synthetic data
    np.random.seed(42)
    n_days = 252
    
    prices = pd.Series(
        100 * np.cumprod(1 + np.random.normal(0.001, 0.015, n_days)),
        index=pd.date_range('2024-01-01', periods=n_days, freq='D')
    )
    
    # Simulate positions
    positions = pd.Series(
        np.random.choice([-1, 0, 1], n_days, p=[0.2, 0.6, 0.2]),
        index=prices.index
    )
    
    # Calculate returns
    returns = prices.pct_change().fillna(0)
    
    # Entry/exit times
    entry_times = [
        (prices.index[i], prices.iloc[i])
        for i in range(1, n_days)
        if positions.iloc[i] != positions.iloc[i-1] and positions.iloc[i] != 0
    ][:20]  # Limit to first 20 entries
    
    exit_times = [
        (prices.index[i], prices.iloc[i])
        for i in range(1, n_days)
        if positions.iloc[i] != positions.iloc[i-1] and positions.iloc[i-1] != 0
    ][:20]
    
    # Initialize attribution
    attribution = PerformanceAttribution()
    
    # Run full attribution
    result = attribution.full Attribution(
        prices=prices,
        returns=returns,
        positions=positions,
        entry_times=entry_times,
        exit_times=exit_times
    )
    
    print("Performance Attribution Results:")
    print("\nBy Layer:")
    for layer, contribution in result.attribution_by_layer.items():
        print(f"  {layer}: {contribution:.4f}")
    
    print(f"\nAlpha: {result.alpha:.4f}")
    print(f"Beta: {result.beta:.4f}")
    print(f"Information Ratio: {result.information_ratio:.4f}")
    
    print("\nContribution Summary:")
    for key, value in result.contribution_summary.items():
        print(f"  {key}: {value:.4f}")
```

### Brinson-Hood-Beebower Attribution

```python
class Brinson Attribution:
    """
    Implements Brinson-Hood-Beebower (BHB) attribution.
    Decomposes portfolio returns into asset allocation, security selection, and interaction effects.
    """
    
    def __init__(self,
                 benchmark_weights: pd.Series = None,
                 benchmark_returns: pd.Series = None):
        self.benchmark_weights = benchmark_weights
        self.benchmark_returns = benchmark_returns
    
    def calculate_bhb_attribution(self,
                                  portfolio_weights: pd.Series,
                                  portfolio_returns: pd.Series,
                                  benchmark_weights: pd.Series,
                                  benchmark_returns: pd.Series) -> Dict:
        """
        Calculate BHB attribution decomposition.
        
        Total Return = Weighted Benchmark Return
                      + Allocation Effect
                      + Selection Effect
                      + Interaction Effect
        """
        # Weighted returns
        portfolio_weighted_return = (portfolio_weights * portfolio_returns).sum()
        benchmark_weighted_return = (benchmark_weights * benchmark_returns).sum()
        
        # Allocation effect: how much of return is from sector allocation
        allocation_effect = 0.0
        for asset in portfolio_weights.index:
            if asset in benchmark_weights.index:
                weight_diff = portfolio_weights[asset] - benchmark_weights[asset]
                benchmark_return = benchmark_returns[asset]
                allocation_effect += weight_diff * benchmark_return
        
        # Selection effect: how much of return is from security selection within sectors
        selection_effect = 0.0
        for asset in portfolio_weights.index:
            if asset in benchmark_weights.index:
                weight = benchmark_weights[asset]
                return_diff = portfolio_returns[asset] - benchmark_returns[asset]
                selection_effect += weight * return_diff
        
        # Interaction effect: combined allocation and selection
        interaction_effect = 0.0
        for asset in portfolio_weights.index:
            if asset in benchmark_weights.index:
                weight_diff = portfolio_weights[asset] - benchmark_weights[asset]
                return_diff = portfolio_returns[asset] - benchmark_returns[asset]
                interaction_effect += weight_diff * return_diff
        
        total = allocation_effect + selection_effect + interaction_effect
        
        return {
            "portfolio_return": portfolio_weighted_return,
            "benchmark_return": benchmark_weighted_return,
            "allocation_effect": allocation_effect,
            "selection_effect": selection_effect,
            "interaction_effect": interaction_effect,
            "total_excess_return": total,
            "total_return": portfolio_weighted_return - benchmark_weighted_return
        }


# Example usage
if __name__ == "__main__":
    # Create sector data
    sectors = ["Tech", "Finance", "Healthcare", "Energy", "Consumer"]
    
    portfolio_weights = pd.Series([0.30, 0.20, 0.15, 0.20, 0.15], index=sectors)
    benchmark_weights = pd.Series([0.25, 0.25, 0.15, 0.20, 0.15], index=sectors)
    
    portfolio_returns = pd.Series([0.15, 0.08, 0.12, 0.05, 0.10], index=sectors)
    benchmark_returns = pd.Series([0.12, 0.10, 0.10, 0.08, 0.08], index=sectors)
    
    # Calculate BHB attribution
    bhb = Brinson Attribution()
    result = bhb.calculate_bhb_attribution(
        portfolio_weights, portfolio_returns,
        benchmark_weights, benchmark_returns
    )
    
    print("Brinson-Hood-Beebower Attribution:")
    print(f"Portfolio Return: {result['portfolio_return']:.2%}")
    print(f"Benchmark Return: {result['benchmark_return']:.2%}")
    print(f"\nExcess Return: {result['total_excess_return']:.2%}")
    print(f"  Allocation Effect: {result['allocation_effect']:.2%}")
    print(f"  Selection Effect: {result['selection_effect']:.2%}")
    print(f"  Interaction Effect: {result['interaction_effect']:.2%}")
```

### Regression-Based Attribution

```python
class Regression Attribution:
    """
    Uses regression analysis for factor-based attribution.
    Decomposes returns into risk factor contributions.
    """
    
    def __init__(self,
                 risk_factors: pd.DataFrame = None):
        self.risk_factors = risk_factors
        self.model = None
    
    def fit_model(self, returns: pd.Series, factors: pd.DataFrame) -> Dict:
        """
        Fit regression model to estimate factor contributions.
        
        Returns: y = alpha + beta1*factor1 + beta2*factor2 + ... + epsilon
        """
        # Add constant for intercept (alpha)
        X = factors.copy()
        X.insert(0, 'constant', 1)
        
        # Fit regression
        model = statsmodels.api.OLS(returns, X).fit()
        
        # Extract coefficients
        coefficients = model.params
        alpha = coefficients['constant']
        factor_loadings = coefficients.drop('constant')
        
        # Calculate R-squared
        r_squared = model.rsquared
        
        # Calculate factor contributions
        factor_contributions = {}
        for factor in factor_loadings.index:
            contribution = factor_loadings[factor] * factors[factor].mean()
            factor_contributions[factor] = contribution
        
        return {
            "alpha": alpha,
            "r_squared": r_squared,
            "factor_loadings": factor_loadings.to_dict(),
            "factor_contributions": factor_contributions,
            "model": model
        }
    
    def get_factor_attribution(self, returns: pd.Series,
                              factors: pd.DataFrame) -> Dict:
        """
        Get contribution of each factor to portfolio returns.
        """
        result = self.fit_model(returns, factors)
        
        # Normalize contributions as percentages
        total_contribution = sum(result['factor_contributions'].values())
        normalized_contributions = {
            k: v / total_contribution if total_contribution != 0 else 0
            for k, v in result['factor_contributions'].items()
        }
        
        return {
            "alpha_contribution": result['alpha'],
            "total_r_squared": result['r_squared'],
            "factor_loadings": result['factor_loadings'],
            "raw_contributions": result['factor_contributions'],
            "normalized_contributions": normalized_contributions
        }


# Example usage with Fama-French factors
if __name__ == "__main__":
    # Create synthetic factor data (simplified Fama-French 3-factor)
    np.random.seed(42)
    n_days = 252
    
    # Market factor (MKT)
    market_factor = pd.Series(np.random.normal(0.0005, 0.015, n_days))
    
    # Size factor (SMB)
    size_factor = pd.Series(np.random.normal(0.0002, 0.005, n_days))
    
    # Value factor (HML)
    value_factor = pd.Series(np.random.normal(0.0003, 0.006, n_days))
    
    factors = pd.DataFrame({
        'MKT': market_factor,
        'SMB': size_factor,
        'HML': value_factor
    }, index=pd.date_range('2024-01-01', periods=n_days, freq='D'))
    
    # Portfolio returns with known factor loadings
    beta_mkt = 1.1
    beta_smb = -0.3
    beta_hml = 0.5
    
    portfolio_returns = (0.0003 +  # Alpha
                        beta_mkt * market_factor +
                        beta_smb * size_factor +
                        beta_hml * value_factor)
    
    # Calculate attribution
    attr = Regression Attribution()
    result = attr.get_factor_attribution(portfolio_returns, factors)
    
    print("Regression-Based Factor Attribution:")
    print(f"Alpha (Jensen's Alpha): {result['alpha_contribution']:.4f} ({result['alpha_contribution']*252:.2%} annualized)")
    print(f"R-Squared: {result['total_r_squared']:.4f}")
    print("\nFactor Loadings:")
    for factor, loading in result['factor_loadings'].items():
        print(f"  {factor}: {loading:.4f}")
    print("\nFactor Contributions:")
    for factor, contribution in result['raw_contributions'].items():
        print(f"  {factor}: {contribution:.4f} ({contribution*252:.2%} annualized)")
```

## Adherence Checklist

Before completing your task, verify:

- [ ] **Multi-Layer Attribution**: Decomposes returns across position selection, timing, sizing, execution, and market components
- [ ] **Market-Neutral Analysis**: Isolates alpha from beta using benchmark comparison and factor analysis
- [ ] **Time-Based Attribution**: Analyzes performance over different time horizons
- [ ] **Contribution Metrics**: Calculates contribution of each decision point to overall performance
- [ ] **Risk-Adjusted Attribution**: Considers risk-adjusted returns in attribution analysis

## Common Mistakes to Avoid

1. **Single-Layer Attribution**: Only looking at total P&L without decomposition
2. **Ignores Market Effects**: Not separating skill from market exposure
3. **No Benchmark Comparison**: Not attributing to market benchmarks or risk factors
4. **Fixed Time Windows**: Using static time periods instead of event-based attribution
5. **No Risk Adjustment**: Attributing raw returns without considering risk taken
6. **Backward-Looking Only**: Not using attribution for forward-looking improvement
7. **Single Metric Focus**: Over-emphasizing one attribution component
8. **No Confidence Intervals**: Not providing statistical confidence in attribution estimates

## References

1. Brinson, G. P., Hood, L. R., & Beebower, G. D. (1986). Determinants of Portfolio Performance. *Financial Analysts Journal*, 42(4), 39-44.

2. Brinson, G. P., & Fachler, N. (1985). Measuring Non-U.S. Equity Portfolio Performance. *Financial Analysts Journal*, 41(5), 73-76.

3. Sharpe, W. F. (1998). Asset Allocation: Management Style and Performance Measurement. *The Journal of Portfolio Management*, 24(2), 7-19.

4. Grinold, R. C., & Kahn, R. N. (2000). *Active Portfolio Management*. McGraw-Hill.

5. Menchero, J. (2010). The Characteristics of Successful Active Management. *Journal of Investment Management*, 8(2), 1-15.

---

Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.