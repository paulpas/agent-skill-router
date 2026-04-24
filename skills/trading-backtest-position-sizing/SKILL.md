---
name: trading-backtest-position-sizing
description: "Position Sizing Algorithms: Fixed Fractional, Kelly Criterion, and Volatility Adjustment"
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: backtest position sizing, backtest-position-sizing, algorithms, fixed, fractional
---

**Role:** Risk Management Specialist — implements dynamic position sizing algorithms to optimize capital allocation while controlling risk exposure and maximizing long-term growth.

**Philosophy:** Capital Preservation First — position sizing is not about maximizing returns but about surviving to trade another day; proper sizing ensures that a few losing trades don't jeopardize the entire account.

## Key Principles

1. **Risk-Based Sizing**: Position size should be inversely proportional to risk; higher risk trades receive smaller positions to maintain consistent risk exposure.

2. **Kelly Criterion Balance**: While Kelly provides optimal growth, most traders use fractional Kelly to avoid overbetting and improve drawdown characteristics.

3. **Volatility Adjustment**: Position sizes should be adjusted for volatility to maintain consistent dollar risk regardless of market conditions.

4. **Portfolio Integration**: Position sizing should consider correlations with existing positions to avoid concentration risk.

5. **Dynamic Rebalancing**: Position sizes should be recalculated regularly as account equity and market conditions change.

## Implementation Guidelines

### Structure
- Core logic: `skills/backtesting/position_sizing.py`
- Sizing strategies: `skills/backtesting/sizing_strategies.py`
- Tests: `skills/tests/test_position_sizing.py`

### Patterns to Follow
- Implement position sizing as strategy classes for easy composition
- Support both percentage-based and fixed-dollar sizing
- Include volatility normalization for consistent risk targeting
- Provide portfolio-level sizing with correlation adjustments
- Use vectorized operations for efficient batch calculations

## Adherence Checklist
Before completing your task, verify:
- [ ] **Risk Consistency**: Are positions sized to maintain consistent dollar risk across trades?
- [ ] **Kelly Fraction**: Is fractional Kelly used rather than full Kelly to avoid overbetting?
- [ ] **Volatility Normalization**: Are positions adjusted for volatility to target consistent risk?
- [ ] **Correlation Consideration**: Are portfolio-level correlations considered in sizing?
- [ ] **Dynamic Updates**: Are position sizes recalculated as conditions change?

## Code Examples

### Position Sizing Calculator Framework

```python
from dataclasses import dataclass
from typing import List, Tuple, Optional, Dict
import numpy as np
import pandas as pd
from enum import Enum


class PositionSizeMethod(Enum):
    """Available position sizing methods."""
    FIXED_FRACTIONAL = "fixed_fractional"
    FIXED_RISK = "fixed_risk"
    KELLY = "kelly"
    KELLY_FRACTIONAL = "kelly_fractional"
    VOLATILITY_ADJUSTED = "volatility_adjusted"
    RISK_PARITY = "risk_parity"
    EQUAL_WEIGHT = "equal_weight"


@dataclass
class PositionSizeResult:
    """Result of position size calculation."""
    position_size: float  # Number of units (shares, contracts, etc.)
    dollar_risk: float
    portfolio_weight: float
    risk_percentage: float
    volatility_adjusted: bool


class PositionSizingCalculator:
    """
    Comprehensive position sizing calculator supporting multiple algorithms.
    """
    
    def __init__(self, 
                 account_balance: float,
                 risk_per_trade: float = 0.01,  # 1% of account
                 max_position_size: float = 0.10,  # 10% max
                 kelly_fraction: float = 0.25):  # 25% of Kelly
        """
        Initialize position sizing calculator.
        
        Args:
            account_balance: Current account balance
            risk_per_trade: Risk per trade as fraction of account
            max_position_size: Maximum position as fraction of account
            kelly_fraction: Fraction of Kelly to use (0.0 to 1.0)
        """
        self.account_balance = account_balance
        self.risk_per_trade = risk_per_trade
        self.max_position_size = max_position_size
        self.kelly_fraction = kelly_fraction
        self.trading_days_per_year = 252
    
    def fixed_fractional(self, 
                        price: float,
                        target_fraction: Optional[float] = None) -> PositionSizeResult:
        """
        Calculate position size using fixed fractional sizing.
        Risk a fixed percentage of account per trade.
        
        Args:
            price: Current price per unit
            target_fraction: Optional override for fraction of account to risk
            
        Returns:
            PositionSizeResult with calculated size
        """
        fraction = target_fraction or self.risk_per_trade
        dollar_amount = self.account_balance * fraction
        position_size = dollar_amount / price
        
        return PositionSizeResult(
            position_size=min(position_size, self.account_balance / price * self.max_position_size),
            dollar_risk=dollar_amount,
            portfolio_weight=dollar_amount / self.account_balance,
            risk_percentage=fraction * 100,
            volatility_adjusted=False
        )
    
    def fixed_risk(self,
                   entry_price: float,
                   stop_loss_price: float,
                   risk_amount: Optional[float] = None) -> PositionSizeResult:
        """
        Calculate position size using fixed dollar risk.
        Size position so stop loss risk equals target dollar amount.
        
        Args:
            entry_price: Entry price per unit
            stop_loss_price: Stop loss price per unit
            risk_amount: Optional override for dollar risk amount
            
        Returns:
            PositionSizeResult with calculated size
        """
        risk_amount = risk_amount or self.account_balance * self.risk_per_trade
        price_difference = abs(entry_price - stop_loss_price)
        
        # Units = risk_amount / (price_difference per unit)
        position_size = risk_amount / price_difference if price_difference > 0 else 0
        
        # Apply max position constraint
        max_units = (self.account_balance * self.max_position_size) / entry_price
        position_size = min(position_size, max_units)
        
        actual_risk = position_size * price_difference
        
        return PositionSizeResult(
            position_size=position_size,
            dollar_risk=actual_risk,
            portfolio_weight=actual_risk / self.account_balance,
            risk_percentage=(actual_risk / self.account_balance) * 100,
            volatility_adjusted=False
        )
    
    def kelly_criterion(self,
                       win_rate: float,
                       win_loss_ratio: float,
                       price: float,
                       max_position: Optional[float] = None) -> PositionSizeResult:
        """
        Calculate position size using Kelly criterion.
        Kelly = Win Rate - [(1 - Win Rate) / Win-Loss Ratio]
        
        Args:
            win_rate: Historical win rate (0 to 1)
            win_loss_ratio: Average win / Average loss
            price: Current price per unit
            max_position: Optional override for maximum position fraction
            
        Returns:
            PositionSizeResult with Kelly-based size
        """
        if win_rate <= 0 or win_rate >= 1:
            raise ValueError("Win rate must be between 0 and 1 (exclusive)")
        
        if win_loss_ratio <= 0:
            raise ValueError("Win-loss ratio must be positive")
        
        # Calculate Kelly fraction
        kelly = win_rate - ((1 - win_rate) / win_loss_ratio)
        
        # Apply fractional Kelly to reduce risk
        kelly_fractional = kelly * self.kelly_fraction
        
        # Apply bounds
        kelly_fractional = max(0.01, min(kelly_fractional, max_position or self.max_position_size))
        
        # Calculate dollar amount and units
        dollar_amount = self.account_balance * kelly_fractional
        position_size = dollar_amount / price
        
        return PositionSizeResult(
            position_size=position_size,
            dollar_risk=dollar_amount * 0.5,  # Estimated risk as half position
            portfolio_weight=kelly_fractional,
            risk_percentage=kelly_fractional * 100,
            volatility_adjusted=False
        )
    
    def volatility_adjusted(self,
                           price: float,
                           volatility: float,
                           target_volatility: float = 0.15) -> PositionSizeResult:
        """
        Calculate position size adjusted for volatility.
        Positions are scaled inversely to volatility to target constant risk.
        
        Args:
            price: Current price per unit
            volatility: Current volatility (annualized, decimal)
            target_volatility: Target annualized volatility
            
        Returns:
            PositionSizeResult with volatility-adjusted size
        """
        # Scaling factor = target_vol / current_vol
        volatility_factor = target_volatility / volatility if volatility > 0 else 1.0
        
        # Base position without volatility adjustment
        base_result = self.fixed_fractional(price)
        
        # Apply volatility adjustment
        adjusted_position = base_result.position_size * volatility_factor
        
        # Apply maximum position constraint
        max_position_units = (self.account_balance * self.max_position_size) / price
        adjusted_position = min(adjusted_position, max_position_units)
        
        adjusted_dollar_risk = adjusted_position * price * base_result.risk_percentage / 100
        
        return PositionSizeResult(
            position_size=adjusted_position,
            dollar_risk=adjusted_dollar_risk,
            portfolio_weight=(adjusted_position * price) / self.account_balance,
            risk_percentage=base_result.risk_percentage,
            volatility_adjusted=True
        )
```

### Portfolio-Level Position Sizing with Correlation Adjustment

```python
class PortfolioPositionSizer:
    """
    Portfolio-level position sizing considering correlations between positions.
    Implements risk parity and mean-variance optimization approaches.
    """
    
    def __init__(self, 
                 account_balance: float,
                 risk_per_trade: float = 0.01,
                 max_position_size: float = 0.10):
        self.account_balance = account_balance
        self.risk_per_trade = risk_per_trade
        self.max_position_size = max_position_size
        self.trading_days_per_year = 252
    
    def calculate_volatility(self, prices: pd.DataFrame) -> pd.Series:
        """
        Calculate annualized volatility for each asset.
        
        Args:
            prices: DataFrame with prices for each asset
            
        Returns:
            Series of annualized volatilities
        """
        returns = prices.pct_change().dropna()
        volatility = returns.std() * np.sqrt(self.trading_days_per_year)
        return volatility
    
    def calculate_correlation_matrix(self, prices: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate correlation matrix between assets.
        
        Args:
            prices: DataFrame with prices for each asset
            
        Returns:
            Correlation matrix DataFrame
        """
        returns = prices.pct_change().dropna()
        return returns.corr()
    
    def risk_parity_sizing(self,
                          prices: pd.DataFrame,
                          target_volatility: float = 0.15) -> Dict[str, PositionSizeResult]:
        """
        Calculate position sizes using risk parity approach.
        All positions contribute equally to portfolio volatility.
        
        Args:
            prices: DataFrame with price series for each asset
            target_volatility: Target portfolio volatility
            
        Returns:
            Dictionary mapping asset names to PositionSizeResult
        """
        if len(prices.columns) < 2:
            return {col: self._calculate_single_asset_size(col, prices[col], target_volatility) 
                   for col in prices.columns}
        
        # Calculate volatilities and correlations
        volatilities = self.calculate_volatility(prices)
        corr_matrix = self.calculate_correlation_matrix(prices)
        
        # Inverse volatility weighting as starting point
        ivol_weights = 1 / volatilities
        ivol_weights = ivol_weights / ivol_weights.sum()
        
        # Iterate to find risk parity weights
        # Simplified approach: scale each position to have equal risk contribution
        
        # Initial weights based on inverse volatility
        weights = ivol_weights.copy()
        
        # Iteratively adjust for risk parity
        for _ in range(10):
            # Portfolio volatility contribution for each asset
            portfolio_vol = np.sqrt((weights * volatilities).sum() ** 2)
            
            # Risk contribution ratio
            risk_contributions = weights * volatilities / portfolio_vol if portfolio_vol > 0 else weights
            
            # Adjust weights to equalize risk contributions
            target_contribution = 1 / len(weights)
            adjustment = target_contribution / (risk_contributions + 1e-10)
            weights = weights * adjustment
        
        # Normalize and apply constraints
        weights = weights / weights.sum()
        weights = weights.clip(0, self.max_position_size)
        weights = weights / weights.sum()
        
        # Scale to account balance
        dollar_amounts = weights * self.account_balance
        
        # Calculate positions
        results = {}
        for asset in prices.columns:
            price = prices[asset].iloc[-1]
            position_size = dollar_amounts[asset] / price
            
            results[asset] = PositionSizeResult(
                position_size=position_size,
                dollar_risk=dollar_amounts[asset] * volatilities[asset] / target_volatility,
                portfolio_weight=weights[asset],
                risk_percentage=(weights[asset] * volatilities[asset] / target_volatility) * 100,
                volatility_adjusted=True
            )
        
        return results
    
    def mean_variance_optimization(self,
                                  prices: pd.DataFrame,
                                  risk_aversion: float = 2.0) -> Dict[str, PositionSizeResult]:
        """
        Calculate position sizes using mean-variance optimization.
        
        Args:
            prices: DataFrame with price series for each asset
            risk_aversion: Risk aversion parameter
            
        Returns:
            Dictionary mapping asset names to PositionSizeResult
        """
        returns = prices.pct_change().dropna()
        n_assets = len(returns.columns)
        
        if n_assets < 2:
            return {col: self._calculate_single_asset_size(col, prices[col], 0.15) 
                   for col in prices.columns}
        
        # Calculate expected returns (simple historical mean)
        expected_returns = returns.mean() * self.trading_days_per_year
        
        # Calculate covariance matrix
        cov_matrix = returns.cov() * self.trading_days_per_year
        
        # Solve mean-variance optimization
        # Minimize: -expected_returns @ weights + risk_aversion * weights @ cov @ weights
        # Subject to: sum(weights) = 1, weights >= 0
        
        from scipy.optimize import minimize
        
        def objective(weights):
            port_return = expected_returns.dot(weights)
            port_variance = weights.dot(cov_matrix).dot(weights)
            return -port_return + risk_aversion * port_variance
        
        # Constraints
        constraints = [{'type': 'eq', 'fun': lambda w: np.sum(w) - 1}]
        
        # Bounds: non-negative weights with max constraint
        bounds = [(0, self.max_position_size) for _ in range(n_assets)]
        
        # Initial guess: equal weights
        initial_weights = np.ones(n_assets) / n_assets
        
        # Optimize
        result = minimize(
            objective,
            initial_weights,
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )
        
        if not result.success:
            # Fallback to inverse volatility weighting
            volatilities = returns.std() * np.sqrt(self.trading_days_per_year)
            weights = 1 / volatilities
            weights = weights / weights.sum()
        else:
            weights = result.x
        
        # Scale to account balance
        dollar_amounts = weights * self.account_balance
        
        # Calculate positions
        results = {}
        for i, asset in enumerate(prices.columns):
            price = prices[asset].iloc[-1]
            position_size = dollar_amounts[i] / price
            
            results[asset] = PositionSizeResult(
                position_size=position_size,
                dollar_risk=dollar_amounts[i] * (cov_matrix.iloc[i, i] ** 0.5) / 0.15,
                portfolio_weight=weights[i],
                risk_percentage=(weights[i] * (cov_matrix.iloc[i, i] ** 0.5) / 0.15) * 100,
                volatility_adjusted=True
            )
        
        return results
    
    def _calculate_single_asset_size(self,
                                     asset: str,
                                     prices: pd.Series,
                                     target_volatility: float) -> PositionSizeResult:
        """Helper to calculate position for single asset."""
        price = prices.iloc[-1]
        return self.fixed_fractional(price)
    
    def dynamic_rebalance(self,
                         current_positions: Dict[str, float],
                         new_prices: pd.DataFrame,
                         target_weights: Optional[Dict[str, float]] = None) -> Dict[str, float]:
        """
        Calculate rebalancing trades needed to reach target weights.
        
        Args:
            current_positions: Current position sizes per asset
            new_prices: New price data
            target_weights: Optional target weights (default: equal or risk parity)
            
        Returns:
            Dictionary of trade sizes per asset (positive = buy, negative = sell)
        """
        current_values = {asset: size * new_prices[asset].iloc[-1] 
                        for asset, size in current_positions.items()}
        current_total = sum(current_values.values())
        
        if target_weights is None:
            # Calculate risk parity weights
            volatilities = self.calculate_volatility(new_prices)
            target_weights = {asset: 1 / vol for asset, vol in volatilities.items()}
            total_inv_vol = sum(target_weights.values())
            target_weights = {asset: weight / total_inv_vol 
                            for asset, weight in target_weights.items()}
        
        # Calculate target values
        target_values = {asset: current_total * weight 
                        for asset, weight in target_weights.items()}
        
        # Calculate trades
        trades = {}
        for asset in current_positions.keys():
            current_value = current_values.get(asset, 0)
            target_value = target_values.get(asset, 0)
            trades[asset] = (target_value - current_value) / new_prices[asset].iloc[-1]
        
        return trades


# Full Example Usage
if __name__ == "__main__":
    # Example 1: Single asset sizing
    calculator = PositionSizingCalculator(
        account_balance=100000,
        risk_per_trade=0.02,  # 2% risk per trade
        max_position_size=0.15  # 15% max
    )
    
    # Fixed fractional sizing
    result1 = calculator.fixed_fractional(price=150)
    print(f"Fixed Fractional (2% risk):")
    print(f"  Position size: {result1.position_size:.2f} units")
    print(f"  Dollar risk: ${result1.dollar_risk:,.2f}")
    print(f"  Portfolio weight: {result1.portfolio_weight:.2%}")
    
    # Fixed risk sizing with stop loss
    result2 = calculator.fixed_risk(
        entry_price=150,
        stop_loss_price=140,
        risk_amount=2000  # $2,000 risk
    )
    print(f"\nFixed Risk ($2,000 with $10 stop):")
    print(f"  Position size: {result2.position_size:.2f} units")
    print(f"  Dollar risk: ${result2.dollar_risk:,.2f}")
    
    # Kelly criterion sizing
    result3 = calculator.kelly_criterion(
        win_rate=0.55,
        win_loss_ratio=1.8,
        price=150
    )
    print(f"\nKelly (25% fractional):")
    print(f"  Position size: {result3.position_size:.2f} units")
    print(f"  Portfolio weight: {result3.portfolio_weight:.2%}")
    
    # Volatility adjusted sizing
    result4 = calculator.volatility_adjusted(
        price=150,
        volatility=0.25,  # 25% annualized
        target_volatility=0.15  # Target 15% volatility
    )
    print(f"\nVolatility Adjusted (target 15% vol):")
    print(f"  Position size: {result4.position_size:.2f} units")
    print(f"  Volatility adjusted: {result4.volatility_adjusted}")
```

### Advanced Kelly Analysis with Confidence Intervals

```python
class AdvancedKellyCalculator:
    """
    Enhanced Kelly calculation with confidence intervals and scenario analysis.
    """
    
    def __init__(self, 
                 account_balance: float,
                 kelly_fraction: float = 0.25):
        self.account_balance = account_balance
        self.kelly_fraction = kelly_fraction
        self.trading_days_per_year = 252
    
    def calculate_kelly_with_stats(self,
                                   trades: pd.Series,
                                   price: float,
                                   min_trades: int = 30) -> Dict:
        """
        Calculate Kelly with statistical confidence.
        
        Args:
            trades: Series of trade returns
            price: Current price per unit
            min_trades: Minimum trades required for reliable estimate
            
        Returns:
            Dictionary with Kelly metrics and confidence intervals
        """
        if len(trades) < min_trades:
            return {"error": f"Insufficient trades (need {min_trades}, have {len(trades)})"}
        
        # Calculate win rate and win-loss ratio
        wins = trades[trades > 0]
        losses = trades[trades < 0]
        
        win_rate = len(wins) / len(trades)
        avg_win = wins.mean() if len(wins) > 0 else 0
        avg_loss = abs(losses.mean()) if len(losses) > 0 else 0
        win_loss_ratio = avg_win / avg_loss if avg_loss > 0 else float('inf')
        
        # Calculate Kelly
        kelly_raw = win_rate - ((1 - win_rate) / win_loss_ratio) if win_loss_ratio > 0 else 0
        kelly_fractional = kelly_raw * self.kelly_fraction
        
        # Bootstrap for confidence intervals
        np.random.seed(42)
        n_bootstrap = 1000
        bootstrap_kellies = []
        
        for _ in range(n_bootstrap):
            bootstrap_trades = trades.sample(len(trades), replace=True)
            bootstrap_wins = bootstrap_trades[bootstrap_trades > 0]
            bootstrap_losses = bootstrap_trades[bootstrap_trades < 0]
            
            bootstrap_win_rate = len(bootstrap_wins) / len(bootstrap_trades)
            bootstrap_avg_win = bootstrap_wins.mean() if len(bootstrap_wins) > 0 else 0
            bootstrap_avg_loss = abs(bootstrap_losses.mean()) if len(bootstrap_losses) > 0 else 0
            bootstrap_wlr = bootstrap_avg_win / bootstrap_avg_loss if bootstrap_avg_loss > 0 else 0
            
            bootstrap_kelly = bootstrap_win_rate - ((1 - bootstrap_win_rate) / bootstrap_wlr) if bootstrap_wlr > 0 else 0
            bootstrap_kellies.append(bootstrap_kelly * self.kelly_fraction)
        
        bootstrap_kellies = np.array(bootstrap_kellies)
        
        # Calculate dollar position
        dollar_amount = self.account_balance * kelly_fractional
        position_size = dollar_amount / price
        
        return {
            "win_rate": win_rate,
            "win_loss_ratio": win_loss_ratio,
            "kelly_raw": kelly_raw,
            "kelly_fractional": kelly_fractional,
            "kelly_ci_95": tuple(np.percentile(bootstrap_kellies, [2.5, 97.5])),
            "kelly_mean": np.mean(bootstrap_kellies),
            "kelly_std": np.std(bootstrap_kellies),
            "dollar_position": dollar_amount,
            "position_size": position_size,
            "expected_growth_rate": kelly_fractional * (win_loss_ratio * win_rate + (1 - win_rate)),
            "recommended_fraction": kelly_fractional
        }
    
    def simulate_kelly_growth(self,
                             trades: pd.Series,
                             price: float,
                             n_years: int = 10,
                             n_simulations: int = 1000) -> Dict:
        """
        Simulate growth trajectories using Kelly sizing.
        
        Args:
            trades: Historical trade returns
            price: Current price
            n_years: Number of years to simulate
            n_simulations: Number of simulation paths
            
        Returns:
            Dictionary with simulation results
        """
        kelly_stats = self.calculate_kelly_with_stats(trades, price)
        
        if "error" in kelly_stats:
            return kelly_stats
        
        # Calculate daily parameters
        daily_trades_per_year = 252
        daily_win_rate = kelly_stats["win_rate"]
        daily_win_loss_ratio = kelly_stats["win_loss_ratio"]
        daily_kelly = kelly_stats["kelly_fractional"]
        
        # Calculate expected daily return and volatility
        daily_return = daily_kelly * daily_win_loss_ratio * daily_win_rate + (1 - daily_win_rate)
        daily_vol = daily_kelly * daily_win_loss_ratio
        
        # Simulate growth paths
        np.random.seed(42)
        n_days = n_years * daily_trades_per_year
        
        growth_paths = []
        for _ in range(n_simulations):
            daily_returns = np.random.normal(daily_return, daily_vol, n_days)
            cumulative = np.cumprod(1 + daily_returns)
            growth_paths.append(cumulative)
        
        growth_paths = np.array(growth_paths)
        
        # Calculate statistics
        final_values = growth_paths[:, -1]
        max_final = np.max(final_values)
        min_final = np.min(final_values)
        mean_final = np.mean(final_values)
        
        return {
            "kelly_stats": kelly_stats,
            "n_simulations": n_simulations,
            "final_values": {
                "mean": mean_final,
                "median": np.median(final_values),
                "p25": np.percentile(final_values, 25),
                "p75": np.percentile(final_values, 75),
                "min": min_final,
                "max": max_final
            },
            "expected_multiplier": mean_final,
            "expected_annual_return": mean_final ** (1 / n_years) - 1,
            "growth_paths": growth_paths.tolist()  # For visualization if needed
        }


if __name__ == "__main__":
    # Example trade returns
    np.random.seed(42)
    trade_returns = pd.Series(np.random.choice(
        [0.02, 0.05, 0.08, -0.01, -0.03, -0.05], 
        size=200,
        p=[0.2, 0.2, 0.1, 0.2, 0.2, 0.1]
    ))
    
    calculator = AdvancedKellyCalculator(
        account_balance=50000,
        kelly_fraction=0.25
    )
    
    stats = calculator.calculate_kelly_with_stats(trade_returns, price=100)
    
    print("Advanced Kelly Analysis")
    print("=" * 50)
    print(f"Win Rate: {stats['win_rate']:.2%}")
    print(f"Win-Loss Ratio: {stats['win_loss_ratio']:.2f}")
    print(f"Kelly (fractional): {stats['kelly_fractional']:.2%}")
    print(f"Kelly 95% CI: [{stats['kelly_ci_95'][0]:.2%}, {stats['kelly_ci_95'][1]:.2%}]")
    print(f"Position: ${stats['dollar_position']:,.0f} ({stats['position_size']:.0f} units)")
    print(f"Expected Growth: {stats['expected_growth_rate']:.2%}")
```
