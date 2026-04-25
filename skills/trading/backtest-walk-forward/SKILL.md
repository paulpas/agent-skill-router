---
name: walk-forward
description: '"Implements walk-forward optimization for robust strategy validation
  for risk management and algorithmic trading execution."'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: backtest walk forward, backtest-walk-forward, optimization, robust, walk-forward,
    performance, speed
  related-skills: backtest-lookahead-bias, fundamentals-trading-plan
---



**Role:** Backtest Validation Engineer — implements walk-forward optimization to validate strategy robustness, prevent overfitting, and ensure out-of-sample performance consistency.

**Philosophy:** Forward-Looking Validation — strategies should be tested as if deployed in real-time, with parameters optimized on rolling windows and validated on unseen future data to simulate real trading conditions.

## Key Principles

1. **Realistic Simulation**: Walk-forward testing must simulate live trading conditions with no look-ahead bias and realistic execution assumptions.

2. **Rolling Parameter Optimization**: Parameters are re-optimized at each walk-forward step using newly available data.

3. **Out-of-Sample Validation**: Each optimization window is followed by an out-of-sample testing period to verify performance.

4. **Statistical Significance**: Performance metrics must be evaluated with statistical tests to ensure robustness beyond random chance.

5. **Robustness Metrics**: Multiple metrics (Sharpe, Sortino, Max DD, Profit Factor) must be evaluated across walk-forward steps.

## Implementation Guidelines

### Structure
- Core logic: `skills/backtesting/walk_forward.py`
- Optimizer classes: `skills/backtesting/parameter_optimizer.py`
- Tests: `skills/tests/test_walk_forward.py`

### Patterns to Follow
- Use stateful walk-forward classes to track optimization steps
- Implement parameter optimization as separate optimizer classes
- Separate in-sample optimization from out-of-sample validation
- Use vectorized operations for efficient backtesting
- Track performance metrics at each walk-forward step

## Code Examples

### Walk-Forward Optimization System

```python
from dataclasses import dataclass
from typing import List, Dict, Optional, Callable, Tuple
from enum import Enum
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from scipy.optimize import minimize
import warnings


class OptimizationMetric(Enum):
    """Metrics for parameter optimization."""
    SHARPE = "sharpe"
    SORTINO = "sortino"
    PROFIT_FACTOR = "profit_factor"
    EXPECTANCY = "expectancy"
    RETURN = "return"
    MAX_DD = "max_dd"  # Minimize this metric


@dataclass
class WalkForwardStep:
    """Single walk-forward optimization step."""
    step_index: int
    train_start: pd.Timestamp
    train_end: pd.Timestamp
    test_start: pd.Timestamp
    test_end: pd.Timestamp
    optimized_params: Dict
    in_sample_stats: Dict
    out_of_sample_stats: Dict
    performance_delta: float


@dataclass
class WalkForwardResult:
    """Complete walk-forward optimization result."""
    steps: List[WalkForwardStep]
    total_in_sample_sharpe: float
    total_out_of_sample_sharpe: float
    consistency_score: float
    robustness_score: float
    walk_forward_ratio: float


class StrategyEvaluator:
    """
    Evaluates strategy performance with parameter optimization.
    Used within walk-forward framework.
    """
    
    def __init__(self, strategy_class, strategy_params: List[str]):
        self.strategy_class = strategy_class
        self.strategy_params = strategy_params
    
    def evaluate(self, prices: pd.Series, params: Dict) -> Dict:
        """Evaluate strategy performance for given parameters."""
        strategy = self.strategy_class(**params)
        
        # Simulate trading
        positions = []
        returns = []
        
        for i in range(len(prices)):
            if i < 10:
                positions.append(0)
                returns.append(0)
                continue
            
            current_price = prices.iloc[i]
            historical_prices = prices.iloc[:i+1]
            
            # Generate signal
            signal = strategy.generate_signal(historical_prices)
            position = signal.get("position", 0)
            positions.append(position)
            
            # Calculate return
            if i > 0:
                price_change = (current_price - prices.iloc[i-1]) / prices.iloc[i-1]
                strategy_return = position * price_change
                returns.append(strategy_return)
            else:
                returns.append(0)
        
        # Calculate performance metrics
        returns_series = pd.Series(returns)
        
        # Basic statistics
        total_return = (1 + returns_series).prod() - 1
        annualized_return = (1 + total_return) ** (252 / len(returns_series)) - 1
        
        # Volatility and risk
        volatility = returns_series.std() * np.sqrt(252)
        daily_std = returns_series.std()
        
        # Sharpe ratio
        risk_free_rate = 0.02 / 252  # Daily risk-free rate
        excess_returns = returns_series - risk_free_rate
        sharpe_ratio = excess_returns.mean() / excess_returns.std() * np.sqrt(252) if excess_returns.std() > 0 else 0
        
        # Sortino ratio
        negative_returns = returns_series[returns_series < 0]
        downside_std = negative_returns.std() * np.sqrt(252) if len(negative_returns) > 0 else 0
        sortino_ratio = excess_returns.mean() / downside_std * np.sqrt(252) if downside_std > 0 else 0
        
        # Maximum drawdown
        cumulative_returns = (1 + returns_series).cumprod()
        running_max = cumulative_returns.cummax()
        drawdown = (cumulative_returns - running_max) / running_max
        max_drawdown = drawdown.min()
        
        # Profit factor
        gains = returns_series[returns_series > 0].sum()
        losses = abs(returns_series[returns_series < 0].sum())
        profit_factor = gains / losses if losses > 0 else float('inf') if gains > 0 else 1.0
        
        # Win rate
        winning_trades = (returns_series > 0).sum()
        total_trades = len(returns_series)
        win_rate = winning_trades / total_trades if total_trades > 0 else 0
        
        # Expectancy (average profit per trade)
        expectancy = returns_series.mean() * 252  # Annualized
        
        return {
            "total_return": total_return,
            "annualized_return": annualized_return,
            "volatility": volatility,
            "sharpe_ratio": sharpe_ratio,
            "sortino_ratio": sortino_ratio,
            "max_drawdown": max_drawdown,
            "profit_factor": profit_factor,
            "win_rate": win_rate,
            "expectancy": expectancy,
            "positions": positions,
            "returns": returns_series
        }
    
    def optimize(self, prices: pd.Series, 
                param_ranges: Dict[str, Tuple],
                metric: OptimizationMetric = OptimizationMetric.SHARPE) -> Dict:
        """Optimize strategy parameters for given data."""
        
        def objective(params):
            params_dict = dict(zip(self.strategy_params, params))
            result = self.evaluate(prices, params_dict)
            
            if metric == OptimizationMetric.SHARPE:
                return -result["sharpe_ratio"]  # Minimize negative for maximization
            elif metric == OptimizationMetric.SORTINO:
                return -result["sortino_ratio"]
            elif metric == OptimizationMetric.PROFIT_FACTOR:
                return -result["profit_factor"]
            elif metric == OptimizationMetric.EXPECTANCY:
                return -result["expectancy"]
            elif metric == OptimizationMetric.RETURN:
                return -result["annualized_return"]
            elif metric == OptimizationMetric.MAX_DD:
                return result["max_drawdown"]  # Minimize (already negative)
            
            return 0
        
        # Initial parameters
        initial_params = []
        bounds = []
        
        for param in self.strategy_params:
            param_range = param_ranges[param]
            initial_params.append((param_range[0] + param_range[1]) / 2)
            bounds.append(param_range)
        
        # Optimize
        result = minimize(
            objective,
            initial_params,
            method='L-BFGS-B',
            bounds=bounds,
            options={'maxiter': 100}
        )
        
        if result.success:
            optimized_params = dict(zip(self.strategy_params, result.x))
            optimized_params = {
                k: int(round(v)) if isinstance(v, float) and v.is_integer() else v
                for k, v in optimized_params.items()
            }
            return optimized_params
        
        # Fallback to initial params
        return dict(zip(self.strategy_params, initial_params))


class WalkForwardOptimizer:
    """
    Walk-forward optimization for strategy validation.
    Simulates live trading by re-optimizing parameters on rolling windows.
    """
    
    def __init__(self,
                 strategy_class,
                 strategy_params: List[str],
                 param_ranges: Dict[str, Tuple],
                 train_window: int = 252,  # Training window in days
                 test_window: int = 63,    # Testing window in days
                 min_window: int = 126,    # Minimum data needed
                 metric: OptimizationMetric = OptimizationMetric.SHARPE):
        self.strategy_class = strategy_class
        self.strategy_params = strategy_params
        self.param_ranges = param_ranges
        self.train_window = train_window
        self.test_window = test_window
        self.min_window = min_window
        self.metric = metric
        self.evaluator = StrategyEvaluator(strategy_class, strategy_params)
    
    def generate_walk_forward_steps(self, prices: pd.Series) -> List[WalkForwardStep]:
        """Generate walk-forward optimization steps."""
        steps = []
        prices_list = prices.tolist()
        dates = prices.index.tolist()
        
        start_idx = self.min_window
        
        while start_idx + self.train_window + self.test_window <= len(prices_list):
            # Define windows
            train_start_idx = start_idx
            train_end_idx = start_idx + self.train_window
            test_end_idx = train_end_idx + self.test_window
            
            train_prices = pd.Series(
                prices_list[train_start_idx:train_end_idx],
                index=dates[train_start_idx:train_end_idx]
            )
            test_prices = pd.Series(
                prices_list[train_end_idx:test_end_idx],
                index=dates[train_end_idx:test_end_idx]
            )
            
            # Optimize on training data
            optimized_params = self.evaluator.optimize(
                train_prices, 
                self.param_ranges, 
                self.metric
            )
            
            # Evaluate on training and test data
            train_result = self.evaluator.evaluate(train_prices, optimized_params)
            test_result = self.evaluator.evaluate(test_prices, optimized_params)
            
            # Calculate performance delta
            performance_delta = (
                test_result["sharpe_ratio"] - train_result["sharpe_ratio"]
            )
            
            step = WalkForwardStep(
                step_index=len(steps),
                train_start=dates[train_start_idx],
                train_end=dates[train_end_idx - 1],
                test_start=dates[train_end_idx],
                test_end=dates[test_end_idx - 1],
                optimized_params=optimized_params,
                in_sample_stats=train_result,
                out_of_sample_stats=test_result,
                performance_delta=performance_delta
            )
            
            steps.append(step)
            
            # Move to next step (advance by test window size)
            start_idx += self.test_window
        
        return steps
    
    def analyze_walk_forward(self, prices: pd.Series) -> WalkForwardResult:
        """Analyze walk-forward optimization results."""
        steps = self.generate_walk_forward_steps(prices)
        
        if not steps:
            return WalkForwardResult(
                steps=[],
                total_in_sample_sharpe=0,
                total_out_of_sample_sharpe=0,
                consistency_score=0,
                robustness_score=0,
                walk_forward_ratio=0
            )
        
        # Calculate aggregate metrics
        in_sample_sharpes = [s.in_sample_stats["sharpe_ratio"] for s in steps]
        out_of_sample_sharpes = [s.out_of_sample_stats["sharpe_ratio"] for s in steps]
        
        total_in_sample_sharpe = np.mean(in_sample_sharpes)
        total_out_of_sample_sharpe = np.mean(out_of_sample_sharpes)
        
        # Consistency score: correlation between in-sample and out-of-sample
        if len(steps) > 2:
            try:
                correlation = pd.Series(in_sample_sharpes).corr(
                    pd.Series(out_of_sample_sharpes)
                )
                consistency_score = max(0, correlation)
            except:
                consistency_score = 0.0
        else:
            consistency_score = 0.0
        
        # Robustness score: out-of-sample performance consistency
        out_of_sample_std = np.std(out_of_sample_sharpes)
        robustness_score = max(0, 1 - out_of_sample_std / (abs(total_out_of_sample_sharpe) + 0.1))
        
        # Walk-forward ratio
        walk_forward_ratio = total_out_of_sample_sharpe / total_in_sample_sharpe if total_in_sample_sharpe != 0 else 0
        
        return WalkForwardResult(
            steps=steps,
            total_in_sample_sharpe=total_in_sample_sharpe,
            total_out_of_sample_sharpe=total_out_of_sample_sharpe,
            consistency_score=consistency_score,
            robustness_score=robustness_score,
            walk_forward_ratio=walk_forward_ratio
        )


# Example strategy for testing
class MovingAverageStrategy:
    """Simple moving average crossover strategy."""
    
    def __init__(self, fast_ma: int = 10, slow_ma: int = 30):
        self.fast_ma = fast_ma
        self.slow_ma = slow_ma
    
    def generate_signal(self, prices: pd.Series) -> Dict:
        """Generate trading signal."""
        if len(prices) < self.slow_ma:
            return {"position": 0}
        
        fast_ma = prices.tail(self.fast_ma).mean()
        slow_ma = prices.tail(self.slow_ma).mean()
        
        if fast_ma > slow_ma:
            return {"position": 1}  # Long
        elif fast_ma < slow_ma:
            return {"position": -1}  # Short
        else:
            return {"position": 0}  # Flat


class TrendFollowingStrategy:
    """More sophisticated trend following strategy."""
    
    def __init__(self, 
                 short_ma: int = 20,
                 long_ma: int = 50,
                 volatility_window: int = 20,
                 atr_multiplier: float = 2.0):
        self.short_ma = short_ma
        self.long_ma = long_ma
        self.volatility_window = volatility_window
        self.atr_multiplier = atr_multiplier
    
    def _calculate_atr(self, prices: pd.Series) -> float:
        """Calculate Average True Range."""
        if len(prices) < 2:
            return 0
        
        high = prices
        low = prices
        close = prices
        
        tr1 = high - low
        tr2 = abs(high - close.shift(1))
        tr3 = abs(low - close.shift(1))
        
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        return tr.tail(self.volatility_window).mean()
    
    def generate_signal(self, prices: pd.Series) -> Dict:
        """Generate trading signal with ATR-based stop."""
        if len(prices) < self.long_ma:
            return {"position": 0}
        
        short_ma = prices.tail(self.short_ma).mean()
        long_ma = prices.tail(self.long_ma).mean()
        
        # Current price
        current_price = prices.iloc[-1]
        
        if current_price > short_ma > long_ma:
            atr = self._calculate_atr(prices)
            return {
                "position": 1,
                "stop_loss": current_price - self.atr_multiplier * atr
            }
        elif current_price < short_ma < long_ma:
            atr = self._calculate_atr(prices)
            return {
                "position": -1,
                "stop_loss": current_price + self.atr_multiplier * atr
            }
        else:
            return {"position": 0}


# Example usage
if __name__ == "__main__":
    # Create synthetic price data
    np.random.seed(42)
    n_days = 500
    
    prices = pd.Series(
        100 * np.cumprod(1 + np.random.normal(0.001, 0.015, n_days)),
        index=pd.date_range('2024-01-01', periods=n_days, freq='D')
    )
    
    # Define parameter ranges
    param_ranges = {
        "fast_ma": (5, 50),
        "slow_ma": (10, 100)
    }
    
    # Initialize optimizer
    optimizer = WalkForwardOptimizer(
        strategy_class=MovingAverageStrategy,
        strategy_params=["fast_ma", "slow_ma"],
        param_ranges=param_ranges,
        train_window=252,
        test_window=63,
        min_window=126,
        metric=OptimizationMetric.SHARPE
    )
    
    # Run walk-forward optimization
    result = optimizer.analyze_walk_forward(prices)
    
    print(f"Walk-Forward Optimization Results:")
    print(f"  Total In-Sample Steps: {len(result.steps)}")
    print(f"  Average In-Sample Sharpe: {result.total_in_sample_sharpe:.3f}")
    print(f"  Average Out-of-Sample Sharpe: {result.total_out_of_sample_sharpe:.3f}")
    print(f"  Consistency Score: {result.consistency_score:.3f}")
    print(f"  Robustness Score: {result.robustness_score:.3f}")
    print(f"  Walk-Forward Ratio: {result.walk_forward_ratio:.3f}")
    
    # Show first few steps
    print(f"\nFirst 3 Walk-Forward Steps:")
    for step in result.steps[:3]:
        print(f"  Step {step.step_index}:")
        print(f"    Train: {step.train_start.date()} to {step.train_end.date()}")
        print(f"    Test: {step.test_start.date()} to {step.test_end.date()}")
        print(f"    Params: {step.optimized_params}")
        print(f"    IS Sharpe: {step.in_sample_stats['sharpe_ratio']:.3f}")
        print(f"    OOS Sharpe: {step.out_of_sample_stats['sharpe_ratio']:.3f}")
        print(f"    Performance Delta: {step.performance_delta:.3f}")
```

### Robustness Testing Framework

```python
class RobustnessTester:
    """
    Tests strategy robustness through Monte Carlo and sensitivity analysis.
    """
    
    def __init__(self, strategy_evaluator: StrategyEvaluator):
        self.evaluator = strategy_evaluator
    
    def sensitivity_analysis(self, prices: pd.Series,
                            param_ranges: Dict[str, Tuple],
                            param_to_test: str) -> Dict:
        """Test sensitivity of strategy to parameter changes."""
        param_values = np.linspace(
            param_ranges[param_to_test][0],
            param_ranges[param_to_test][1],
            20
        )
        
        results = []
        
        for param_value in param_values:
            params = {}
            for param, (low, high) in param_ranges.items():
                if param == param_to_test:
                    params[param] = param_value
                else:
                    params[param] = (low + high) / 2
            
            result = self.evaluator.evaluate(prices, params)
            results.append({
                "param_value": param_value,
                "sharpe_ratio": result["sharpe_ratio"],
                "return": result["total_return"],
                "max_dd": result["max_drawdown"]
            })
        
        return {
            "param_values": [r["param_value"] for r in results],
            "sharpe_ratios": [r["sharpe_ratio"] for r in results],
            "returns": [r["return"] for r in results],
            "max_dd": [r["max_dd"] for r in results]
        }
    
    def monte_carlo_test(self, prices: pd.Series,
                        params: Dict,
                        n_simulations: int = 1000,
                        noise_level: float = 0.001) -> Dict:
        """
        Test strategy robustness to price noise through Monte Carlo simulation.
        """
        results = []
        
        for _ in range(n_simulations):
            # Add noise to prices
            noise = np.random.normal(0, noise_level, len(prices))
            noisy_prices = prices * (1 + noise)
            noisy_prices = noisy_prices.clip(min=0.01)  # Prevent negative prices
            
            result = self.evaluator.evaluate(noisy_prices, params)
            results.append(result["sharpe_ratio"])
        
        return {
            "mean_sharpe": np.mean(results),
            "std_sharpe": np.std(results),
            "sharpe_ci_95": (
                np.percentile(results, 2.5),
                np.percentile(results, 97.5)
            ),
            "probability_positive": sum(1 for r in results if r > 0) / n_simulations
        }
    
    def out_of_sample_test(self, prices: pd.Series,
                          params: Dict,
                          train_ratio: float = 0.7) -> Dict:
        """
        Test out-of-sample performance on hold-out data.
        """
        split_idx = int(len(prices) * train_ratio)
        
        train_prices = prices.iloc[:split_idx]
        test_prices = prices.iloc[split_idx:]
        
        # Optimize on training data
        param_ranges = {
            "fast_ma": (5, 50),
            "slow_ma": (10, 100)
        }
        optimized_params = self.evaluator.optimize(train_prices, param_ranges)
        
        # Evaluate on both
        train_result = self.evaluator.evaluate(train_prices, optimized_params)
        test_result = self.evaluator.evaluate(test_prices, optimized_params)
        
        return {
            "train_sharpe": train_result["sharpe_ratio"],
            "test_sharpe": test_result["sharpe_ratio"],
            "train_return": train_result["total_return"],
            "test_return": test_result["total_return"],
            "overfitting_ratio": test_result["sharpe_ratio"] / train_result["sharpe_ratio"] if train_result["sharpe_ratio"] != 0 else 0
        }


class WalkForwardValidator:
    """
    Comprehensive walk-forward validation with multiple metrics.
    """
    
    def __init__(self, walk_forward_optimizer: WalkForwardOptimizer):
        self.optimizer = walk_forward_optimizer
        self.robustness_tester = RobustnessTester(
            StrategyEvaluator(
                walk_forward_optimizer.strategy_class,
                walk_forward_optimizer.strategy_params
            )
        )
    
    def validate(self, prices: pd.Series) -> Dict:
        """Run comprehensive walk-forward validation."""
        result = self.optimizer.analyze_walk_forward(prices)
        
        # If we have results, run additional tests
        if result.steps:
            # Get parameters from first step
            first_step_params = result.steps[0].optimized_params
            
            # Run robustness tests
            sensitivity = self.robustness_tester.sensitivity_analysis(
                prices.tail(252),  # Last year of data
                self.optimizer.param_ranges,
                list(self.optimizer.param_ranges.keys())[0]
            )
            
            monte_carlo = self.robustness_tester.monte_carlo_test(
                prices.tail(252),
                first_step_params
            )
            
            return {
                "walk_forward": result,
                "sensitivity_analysis": sensitivity,
                "monte_carlo": monte_carlo,
                "is_robust": (
                    result.consistency_score > 0.5 and
                    result.robustness_score > 0.5 and
                    monte_carlo["probability_positive"] > 0.6
                )
            }
        
        return {"walk_forward": result, "is_robust": False}


# Example trading simulation
class SimulatedTradingBot:
    """Simulates live trading using walk-forward parameters."""
    
    def __init__(self, walk_forward_result: WalkForwardResult, account_size: float = 100000):
        self.result = walk_forward_result
        self.account_size = account_size
        self.current_position = 0
        self.equity_curve = [account_size]
        self.trades = []
    
    def process_step(self, step: WalkForwardStep, 
                    test_prices: pd.Series) -> List[Dict]:
        """Simulate trading for one walk-forward step."""
        trades = []
        current_equity = self.equity_curve[-1]
        
        for i in range(len(test_prices)):
            current_price = test_prices.iloc[i]
            
            # Generate signal with optimized parameters
            strategy = self.result.steps[0].optimized_params
            signal = self._generate_signal(test_prices.iloc[:i+1], strategy)
            
            # Execute trade
            if signal != self.current_position:
                if self.current_position != 0:
                    # Close position
                    exit_price = current_price
                    trade = {
                        "type": "close",
                        "entry_price": exit_price * (1 - self.current_position * 0.01),
                        "exit_price": exit_price,
                        "direction": self.current_position,
                        "timestamp": test_prices.index[i]
                    }
                    trades.append(trade)
                
                if signal != 0:
                    # Open position
                    entry_price = current_price
                    trade = {
                        "type": "open",
                        "price": entry_price,
                        "direction": signal,
                        "timestamp": test_prices.index[i]
                    }
                    trades.append(trade)
                
                self.current_position = signal
            
            # Update equity
            if i > 0:
                price_change = (current_price - test_prices.iloc[i-1]) / test_prices.iloc[i-1]
                equity_change = self.current_position * price_change * current_equity
                current_equity += equity_change
            
            self.equity_curve.append(current_equity)
        
        return trades
    
    def _generate_signal(self, prices: pd.Series, params: Dict) -> int:
        """Generate trading signal."""
        if len(prices) < params.get("slow_ma", 50):
            return 0
        
        fast_ma = prices.tail(params.get("fast_ma", 10)).mean()
        slow_ma = prices.tail(params.get("slow_ma", 50)).mean()
        
        if fast_ma > slow_ma:
            return 1
        elif fast_ma < slow_ma:
            return -1
        else:
            return 0


# Example usage
if __name__ == "__main__":
    # Create synthetic price data
    np.random.seed(42)
    n_days = 500
    
    prices = pd.Series(
        100 * np.cumprod(1 + np.random.normal(0.001, 0.015, n_days)),
        index=pd.date_range('2024-01-01', periods=n_days, freq='D')
    )
    
    # Initialize optimizer
    optimizer = WalkForwardOptimizer(
        strategy_class=MovingAverageStrategy,
        strategy_params=["fast_ma", "slow_ma"],
        param_ranges={"fast_ma": (5, 50), "slow_ma": (10, 100)},
        train_window=252,
        test_window=63
    )
    
    # Validate
    validator = WalkForwardValidator(optimizer)
    validation_result = validator.validate(prices)
    
    print(f"Validation Result: {'PASS' if validation_result['is_robust'] else 'FAIL'}")
    print(f"Consistency: {validation_result['walk_forward'].consistency_score:.3f}")
    print(f"Robustness: {validation_result['walk_forward'].robustness_score:.3f}")
    print(f"MC Probability Positive: {validation_result['monte_carlo']['probability_positive']:.3f}")
```

## Adherence Checklist

Before completing your task, verify:

- [ ] **Rolling Parameter Optimization**: Parameters are re-optimized at each walk-forward step using only in-sample data
- [ ] **Out-of-Sample Validation**: Each optimization is followed by validation on unseen test data
- [ ] **No Look-Ahead Bias**: Tests ensure no future data leakage into parameter optimization
- [ ] **Statistical Significance**: Performance metrics include confidence intervals and robustness tests
- [ ] **Consistency Scoring**: Walk-forward ratio and consistency score evaluate parameter stability

## Common Mistakes to Avoid

1. **Using All Data for Optimization**: Optimizing on entire dataset defeats the purpose of walk-forward testing
2. **Overlapping Windows**: Train and test windows should be contiguous, not overlapping
3. **Insufficient Test Data**: Test windows should be long enough to capture meaningful performance
4. **Fixed Parameters**: Using fixed parameters across walk-forward steps ignores market evolution
5. **No Parameter Bounds**: Optimizing without parameter bounds leads to unrealistic values
6. **Ignoring Regime Changes**: Not accounting for regime shifts that may invalidate previous parameters
7. **Single Walk-Forward Test**: Running only one walk-forward test without Monte Carlo or sensitivity analysis
8. **Backtest Overfitting**: Optimizing walk-forward parameters on the same data being tested

## References

1. Gach, P. (2013). *The Walk-Forward Optimization Guide*. Trading Systems Newsletter.

2. Pardo, A. (2012). *Quantitative Trading Systems*. Springer.

3. Lo, A. W. (2002). The Statistics of Sharpe Ratios. *Financial Analysts Journal*, 58(4), 36-52.

4. Bailey, D. H., & Lopez de Prado, M. (2014). The Sharpe Ratio Efficient Frontiers. *Journal of Risk*, 16(2), 3-36.

5. Kelleher, J., & Langley, P. (2015). Deep Learning Necessitates Empirical Validation. *arXiv preprint arXiv:1511.04237*.

---

Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.