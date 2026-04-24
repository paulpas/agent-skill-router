---
name: trading-fundamentals-trading-edge
description: Finding and maintaining competitive advantage in trading systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: competitive, finding, fundamentals trading edge, fundamentals-trading-edge,
    maintaining
---


**Role:** Identify, quantify, test, and optimize sources of edge in trading strategies to ensure long-term profitability.

**Philosophy:** Edge is the foundation of profitable trading. Without it, trading is gambling. Edge represents a statistical advantage that produces positive expected value over time. The philosophy emphasizes scientific rigor in edge discovery, rigorous statistical validation, continuous monitoring for edge decay, and systematic adaptation when edge deteriorates. Trading systems must be built on proven edge, not hope or superstition.

## Key Principles

1. **Expected Value First**: Every edge must produce positive expected value over a large sample
2. **Statistical Rigor**: Edge claims require statistical significance testing, not just backtest results
3. **Robustness Over Peak Performance**: Optimize for consistency across market conditions, not best-case scenarios
4. **Edge Decay Monitoring**: Actively monitor for edge degradation and implement automatic alerts
5. **Transaction Cost Integration**: Edge must survive real-world transaction costs (slippage, fees, spreads)

## Implementation Guidelines

### Structure
- Core logic: `trading_system/edge/edge_analyzer.py`
- Helper functions: `trading_system/edge/statistics.py`
- Tests: `tests/edge/`

### Patterns to Follow
- Use hypothesis testing for edge validation
- Separate edge discovery from edge validation
- Implement edge tracking with decay alerts
- Include transaction cost modeling in edge calculations

## Adherence Checklist
Before completing your task, verify:
- [ ] Edge analysis includes statistical significance testing (p-value < 0.05)
- [ ] Transaction costs (slippage, fees, spreads) are integrated into all edge calculations
- [ ] Edge decay is monitored with configurable alert thresholds
- [ ] Edge analysis uses out-of-sample validation data
- [ ] Confidence intervals are reported for all edge metrics

## Code Examples

### Core Edge Analyzer Implementation

```python
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
import numpy as np
import pandas as pd
from scipy import stats
from datetime import datetime
from enum import Enum


class EdgeStatus(Enum):
    """Status of an identified edge."""
    VALID = "valid"
    DEGRADING = "degrading"
    INVALID = "invalid"
    UNKNOWN = "unknown"


@dataclass
class EdgeMetrics:
    """Metrics for trading edge."""
    expected_value: float  # Expected profit per trade
    win_rate: float  # Percentage of winning trades
    profit_factor: float  # Gross profits / Gross losses
    sharpe_ratio: float  # Risk-adjusted return
    sortino_ratio: float  # Downside risk-adjusted return
    maximum_drawdown: float  # Maximum drawdown
    trades: int  # Number of trades


@dataclass
class EdgeValidation:
    """Statistical validation of edge."""
    p_value: float
    confidence_level: float
    is_statistically_significant: bool
    required_trades_for_significance: int
    edge_decay_rate: float  # Annualized decay rate


@dataclass 
class TransactionCosts:
    """Cost structure for trading."""
    commission_per_trade: float = 0.0
    spread_cost_pct: float = 0.0
    slippage_pct: float = 0.0
    funding_rate: float = 0.0  # For leveraged instruments
    
    def total_cost_pct(self) -> float:
        """Total cost per trade as percentage."""
        return self.commission_per_trade + self.spread_cost_pct + self.slippage_pct


class EdgeAnalyzer:
    """
    Analyzes and validates trading edge using statistical methods.
    
    Key features:
    - Statistical significance testing
    - Transaction cost integration
    - Edge decay monitoring
    - Out-of-sample validation
    """
    
    def __init__(
        self,
        transaction_costs: TransactionCosts = TransactionCosts(),
        min_trades_for_significance: int = 30,
        significance_level: float = 0.05,
        rolling_window: int = 50
    ):
        self.transaction_costs = transaction_costs
        self.min_trades = min_trades_for_significance
        self.significance_level = significance_level
        self.rolling_window = rolling_window
        self.edge_history: List[Tuple[datetime, EdgeMetrics]] = []
    
    def calculate_raw_metrics(self, returns: pd.Series) -> Dict:
        """Calculate basic performance metrics from returns."""
        if len(returns) == 0:
            return {
                "expected_value": 0.0,
                "win_rate": 0.0,
                "profit_factor": 0.0,
                "sharpe_ratio": 0.0,
                "sortino_ratio": 0.0,
                "maximum_drawdown": 0.0
            }
        
        # Expected value (mean return)
        expected_value = returns.mean()
        
        # Win rate
        wins = (returns > 0).sum()
        win_rate = wins / len(returns) if len(returns) > 0 else 0.0
        
        # Profit factor
        gross_profit = returns[returns > 0].sum()
        gross_loss = abs(returns[returns < 0].sum())
        profit_factor = gross_profit / (gross_loss + 1e-8)
        
        # Risk metrics
        std_dev = returns.std()
        sharpe_ratio = (returns.mean() / std_dev * np.sqrt(252)) if std_dev > 0 else 0.0
        
        # Sortino ratio (downside deviation)
        negative_returns = returns[returns < 0]
        downside_std = negative_returns.std() if len(negative_returns) > 0 else 0
        sortino_ratio = (returns.mean() / downside_std * np.sqrt(252)) if downside_std > 0 else 0.0
        
        # Maximum drawdown
        cum_returns = (1 + returns).cumprod()
        running_max = cum_returns.cummax()
        drawdown = (cum_returns - running_max) / running_max
        max_drawdown = drawdown.min()
        
        return {
            "expected_value": expected_value,
            "win_rate": win_rate,
            "profit_factor": profit_factor,
            "sharpe_ratio": sharpe_ratio,
            "sortino_ratio": sortino_ratio,
            "maximum_drawdown": max_drawdown
        }
    
    def adjust_for_transaction_costs(self, raw_metrics: Dict) -> Dict:
        """Adjust metrics for transaction costs."""
        adjusted = raw_metrics.copy()
        
        # Adjust expected value for costs
        # Assume costs apply per trade, scale by average trade size
        avg_trade_size = abs(raw_metrics["expected_value"]) / max(raw_metrics["win_rate"], 0.01)
        cost_adjustment = -self.transaction_costs.total_cost_pct() * avg_trade_size
        
        adjusted["expected_value"] = raw_metrics["expected_value"] + cost_adjustment
        
        return adjusted
    
    def validate_statistical_significance(
        self, 
        returns: pd.Series,
        expected_value: float
    ) -> EdgeValidation:
        """
        Validate if observed edge is statistically significant.
        
        Uses t-test against null hypothesis of zero edge.
        """
        if len(returns) < self.min_trades:
            return EdgeValidation(
                p_value=1.0,
                confidence_level=0.0,
                is_statistically_significant=False,
                required_trades_for_significance=self.min_trades,
                edge_decay_rate=0.0
            )
        
        # One-sample t-test against zero
        t_statistic, p_value = stats.ttest_1samp(returns, 0)
        
        # Calculate confidence level
        confidence_level = 1 - p_value
        
        # Calculate required sample size for significance
        if expected_value > 0 and returns.std() > 0:
            # Power analysis approximation
            effect_size = expected_value / returns.std()
            required_trades = int((1.96 / effect_size) ** 2 * 4)  # Rough estimate
        else:
            required_trades = self.min_trades * 2
        
        # Estimate edge decay (simplified)
        if len(returns) > 100:
            first_half = returns.iloc[:len(returns)//2].mean()
            second_half = returns.iloc[len(returns)//2:].mean()
            decay_rate = (second_half - first_half) / first_half if first_half != 0 else 0.0
        else:
            decay_rate = 0.0
        
        return EdgeValidation(
            p_value=p_value,
            confidence_level=confidence_level,
            is_statistically_significant=p_value < self.significance_level,
            required_trades_for_significance=required_trades,
            edge_decay_rate=decay_rate
        )
    
    def analyze_rolling_edge(self, returns: pd.Series) -> pd.DataFrame:
        """Calculate rolling edge metrics."""
        if len(returns) < self.rolling_window:
            return pd.DataFrame()
        
        rolling_metrics = []
        
        for i in range(self.rolling_window, len(returns)):
            window_returns = returns.iloc[i-self.rolling_window:i]
            metrics = self.calculate_raw_metrics(window_returns)
            metrics["date"] = returns.index[i]
            rolling_metrics.append(metrics)
        
        return pd.DataFrame(rolling_metrics).set_index("date")
    
    def get_edge_summary(
        self,
        returns: pd.Series,
        validate: bool = True
    ) -> Tuple[EdgeMetrics, EdgeValidation]:
        """
        Get comprehensive edge analysis summary.
        
        Args:
            returns: Series of trade returns
            validate: Whether to perform statistical validation
            
        Returns:
            Tuple of (metrics, validation)
        """
        # Calculate raw metrics
        raw_metrics = self.calculate_raw_metrics(returns)
        
        # Adjust for transaction costs
        adjusted_metrics = self.adjust_for_transaction_costs(raw_metrics)
        
        # Build metrics object
        metrics = EdgeMetrics(
            expected_value=adjusted_metrics["expected_value"],
            win_rate=adjusted_metrics["win_rate"],
            profit_factor=adjusted_metrics["profit_factor"],
            sharpe_ratio=adjusted_metrics["sharpe_ratio"],
            sortino_ratio=adjusted_metrics["sortino_ratio"],
            maximum_drawdown=adjusted_metrics["maximum_drawdown"],
            trades=len(returns)
        )
        
        # Validate if requested
        if validate:
            validation = self.validate_statistical_significance(
                returns, adjusted_metrics["expected_value"]
            )
        else:
            validation = EdgeValidation(
                p_value=1.0,
                confidence_level=0.0,
                is_statistically_significant=False,
                required_trades_for_significance=len(returns) * 2,
                edge_decay_rate=0.0
            )
        
        return metrics, validation
    
    def check_edge_decay(self, returns: pd.Series) -> Dict:
        """
        Check for edge decay in recent periods.
        
        Returns decay analysis with alert status.
        """
        if len(returns) < self.rolling_window * 2:
            return {
                "status": "insufficient_data",
                "recent_edge": 0.0,
                "historical_edge": 0.0,
                "decay_pct": 0.0
            }
        
        # Split into recent and historical periods
        recent_window = returns.iloc[-self.rolling_window:]
        historical_window = returns.iloc[:-self.rolling_window]
        
        recent_edge = recent_window.mean()
        historical_edge = historical_window.mean()
        
        decay_pct = (recent_edge - historical_edge) / (abs(historical_edge) + 1e-8)
        
        # Determine status
        if decay_pct < -0.3:
            status = "critical_decay"
        elif decay_pct < -0.15:
            status = "degrading"
        elif decay_pct < -0.05:
            status = "slight_decay"
        else:
            status = "stable"
        
        return {
            "status": status,
            "recent_edge": recent_edge,
            "historical_edge": historical_edge,
            "decay_pct": decay_pct,
            "alert": decay_pct < -0.1  # Alert if >10% decay
        }
    
    def update_history(self, returns: pd.Series, timestamp: datetime):
        """Update edge history for tracking."""
        metrics, _ = self.get_edge_summary(returns)
        self.edge_history.append((timestamp, metrics))
        
        # Keep only recent history
        if len(self.edge_history) > 1000:
            self.edge_history = self.edge_history[-1000:]


class EdgeTracker:
    """
    Tracks edge across multiple time periods and strategies.
    
    Provides comprehensive edge monitoring and alerting.
    """
    
    def __init__(self, analyzer: EdgeAnalyzer):
        self.analyzer = analyzer
        self.strategy_edges: Dict[str, pd.Series] = {}
        self.alerts: List[Dict] = []
    
    def add_strategy(self, strategy_id: str, returns: pd.Series):
        """Add a strategy for edge tracking."""
        self.strategy_edges[strategy_id] = returns
    
    def analyze_all_strategies(self) -> Dict[str, Tuple[EdgeMetrics, EdgeValidation]]:
        """Analyze edge for all tracked strategies."""
        results = {}
        for strategy_id, returns in self.strategy_edges.items():
            metrics, validation = self.analyzer.get_edge_summary(returns)
            results[strategy_id] = (metrics, validation)
        return results
    
    def check_all_edges(self) -> List[Dict]:
        """Check all strategies for edge decay and generate alerts."""
        all_alerts = []
        
        for strategy_id, returns in self.strategy_edges.items():
            decay_analysis = self.analyzer.check_edge_decay(returns)
            
            if decay_analysis["alert"]:
                alert = {
                    "strategy_id": strategy_id,
                    "timestamp": datetime.now(),
                    "status": decay_analysis["status"],
                    "decay_pct": decay_analysis["decay_pct"]
                }
                all_alerts.append(alert)
        
        self.alerts.extend(all_alerts)
        return all_alerts
    
    def get_edge_ranking(self) -> pd.DataFrame:
        """Get ranking of strategies by edge quality."""
        results = self.analyze_all_strategies()
        
        ranking_data = []
        for strategy_id, (metrics, validation) in results.items():
            ranking_data.append({
                "strategy_id": strategy_id,
                "expected_value": metrics.expected_value,
                "win_rate": metrics.win_rate,
                "profit_factor": metrics.profit_factor,
                "sharpe_ratio": metrics.sharpe_ratio,
                "statistically_significant": validation.is_statistically_significant,
                "confidence": validation.confidence_level
            })
        
        df = pd.DataFrame(ranking_data)
        df = df.sort_values("expected_value", ascending=False)
        return df


# Example usage
if __name__ == "__main__":
    # Create sample returns data
    np.random.seed(42)
    
    # Strategy A: Good edge with slight decay
    returns_a = np.concatenate([
        np.random.randn(100) * 0.02 + 0.005,  # Good edge
        np.random.randn(50) * 0.02 + 0.003   # Slight decay
    ])
    
    # Strategy B: Edge that degraded
    returns_b = np.concatenate([
        np.random.randn(100) * 0.015 + 0.004,
        np.random.randn(50) * 0.02 - 0.001   # Edge disappeared
    ])
    
    # Strategy C: No edge
    returns_c = np.random.randn(150) * 0.02
    
    returns_a = pd.Series(returns_a)
    returns_b = pd.Series(returns_b)
    returns_c = pd.Series(returns_c)
    
    # Initialize analyzer
    transaction_costs = TransactionCosts(
        commission_per_trade=0.0,
        spread_cost_pct=0.0005,
        slippage_pct=0.0005
    )
    
    analyzer = EdgeAnalyzer(transaction_costs=transaction_costs)
    
    # Analyze strategies
    strategies = [
        ("Strategy A", returns_a),
        ("Strategy B", returns_b),
        ("Strategy C", returns_c)
    ]
    
    print("Edge Analysis Results:")
    print("-" * 60)
    
    for name, returns in strategies:
        metrics, validation = analyzer.get_edge_summary(returns)
        
        print(f"\n{name}:")
        print(f"  Expected Value: {metrics.expected_value:.4%}")
        print(f"  Win Rate: {metrics.win_rate:.2%}")
        print(f"  Profit Factor: {metrics.profit_factor:.2f}")
        print(f"  Sharpe Ratio: {metrics.sharpe_ratio:.2f}")
        print(f"  Statistically Significant: {validation.is_statistically_significant} "
              f"(p={validation.p_value:.4f})")
        
        decay = analyzer.check_edge_decay(returns)
        print(f"  Edge Decay Status: {decay['status']} ({decay['decay_pct']:.2%})")
```

### Out-of-Sample Edge Validation

```python
from typing import Tuple
import numpy as np
import pandas as pd


class OutOfSampleValidator:
    """
    Validates edge using out-of-sample data and walk-forward analysis.
    
    Implements:
    - Train/test split validation
    - Walk-forward optimization
    - Cross-validation for robustness
    """
    
    def __init__(
        self,
        train_ratio: float = 0.7,
        walk_forward_window: int = 50,
        test_window: int = 20
    ):
        self.train_ratio = train_ratio
        self.walk_forward_window = walk_forward_window
        self.test_window = test_window
    
    def train_test_split(self, returns: pd.Series) -> Tuple[pd.Series, pd.Series]:
        """Split returns into train and test sets."""
        split_idx = int(len(returns) * self.train_ratio)
        train = returns.iloc[:split_idx]
        test = returns.iloc[split_idx:]
        return train, test
    
    def walk_forward_validation(
        self, 
        returns: pd.Series,
        strategy_function
    ) -> Dict:
        """
        Perform walk-forward validation.
        
        Args:
            returns: Historical returns
            strategy_function: Function that generates signals and returns metrics
            
        Returns:
            Dictionary with walk-forward results
        """
        results = []
        
        for i in range(self.walk_forward_window, len(returns) - self.test_window, self.test_window):
            # Training window
            train_start = max(0, i - self.walk_forward_window)
            train_returns = returns.iloc[train_start:i]
            
            # Testing window
            test_returns = returns.iloc[i:i + self.test_window]
            
            # Optimize strategy on training data
            best_params = strategy_function(train_returns)
            
            # Validate on testing data
            if best_params:
                test_metrics = self._evaluate_strategy(test_returns, best_params)
                results.append({
                    "train_start": train_returns.index[0],
                    "train_end": train_returns.index[-1],
                    "test_start": test_returns.index[0],
                    "test_end": test_returns.index[-1],
                    "params": best_params,
                    "test_metrics": test_metrics
                })
        
        return results
    
    def _evaluate_strategy(self, returns: pd.Series, params: Dict) -> Dict:
        """Evaluate strategy metrics for given parameters."""
        # This is a simplified example
        # In practice, this would run the actual strategy
        expected_value = returns.mean()
        win_rate = (returns > 0).mean()
        
        return {
            "expected_value": expected_value,
            "win_rate": win_rate,
            "sharpe": expected_value / returns.std() * np.sqrt(252)
        }
    
    def cross_validate(
        self,
        returns: pd.Series,
        n_folds: int = 5
    ) -> Dict:
        """
        Perform k-fold cross-validation.
        
        Args:
            returns: Historical returns
            n_folds: Number of cross-validation folds
            
        Returns:
            Dictionary with cross-validation statistics
        """
        fold_size = len(returns) // n_folds
        fold_metrics = []
        
        for i in range(n_folds):
            # Create fold indices
            test_start = i * fold_size
            test_end = (i + 1) * fold_size if i < n_folds - 1 else len(returns)
            
            test_returns = returns.iloc[test_start:test_end]
            train_returns = returns.drop(test_returns.index)
            
            # Evaluate
            expected_value = test_returns.mean()
            fold_metrics.append(expected_value)
        
        return {
            "mean": np.mean(fold_metrics),
            "std": np.std(fold_metrics),
            "min": np.min(fold_metrics),
            "max": np.max(fold_metrics),
            "fold_values": fold_metrics
        }
    
    def bootstrap_confidence(
        self,
        returns: pd.Series,
        n_iterations: int = 1000
    ) -> Dict:
        """
        Calculate confidence intervals using bootstrap.
        
        Args:
            returns: Historical returns
            n_iterations: Number of bootstrap iterations
            
        Returns:
            Dictionary with confidence interval
        """
        bootstrap_means = []
        
        for _ in range(n_iterations):
            # Resample with replacement
            resample = returns.sample(n=len(returns), replace=True)
            bootstrap_means.append(resample.mean())
        
        bootstrap_means = np.array(bootstrap_means)
        
        return {
            "mean": np.mean(bootstrap_means),
            "std": np.std(bootstrap_means),
            "ci_95_low": np.percentile(bootstrap_means, 2.5),
            "ci_95_high": np.percentile(bootstrap_means, 97.5),
            "ci_99_low": np.percentile(bootstrap_means, 0.5),
            "ci_99_high": np.percentile(bootstrap_means, 99.5)
        }


# Example usage
if __name__ == "__main__":
    # Create sample returns
    np.random.seed(42)
    returns = pd.Series(np.random.randn(200) * 0.02 + 0.003)
    
    validator = OutOfSampleValidator(train_ratio=0.7)
    
    # Train/test split
    train, test = validator.train_test_split(returns)
    print(f"Train size: {len(train)}, Test size: {len(test)}")
    
    # Out-of-sample validation
    wf_results = validator.walk_forward_validation(
        returns,
        lambda x: {"threshold": x.mean()}  # Dummy strategy
    )
    print(f"Walk-forward iterations: {len(wf_results)}")
    
    # Cross-validation
    cv_results = validator.cross_validate(returns, n_folds=5)
    print(f"CV mean: {cv_results['mean']:.4%}, CV std: {cv_results['std']:.4%}")
    
    # Bootstrap confidence
    bootstrap = validator.bootstrap_confidence(returns, n_iterations=500)
    print(f"95% CI: [{bootstrap['ci_95_low']:.4%}, {bootstrap['ci_95_high']:.4%}]")
```

## Common Mistakes to Avoid

1. **Cherry-Picking Results**: Only reporting backtests that show positive edge while hiding losing configurations. Always report all tested configurations with proper multiple comparisons correction.

2. **Ignoring Transaction Costs**: Claiming edge without factoring in realistic transaction costs. Slippage and commissions can easily erase small edges.

3. **No Out-of-Sample Validation**: Claiming edge based solely on in-sample backtest results. Always validate on truly out-of-sample data.

4. **Overfitting to Historical Data**: Tuning parameters until backtest looks perfect but fails in live trading. Use regularization and cross-validation.

5. **Not Monitoring Edge Decay**: Continuing to trade a strategy after its edge has deteriorated. Implement automated monitoring and alert systems.

## References

1. Press, W. H. (2007). *Numerical Recipes in C: The Art of Scientific Computing*. Cambridge University Press. - Statistical validation techniques.
2. LeCun, Y., Bengio, Y., & Hinton, G. (2015). *Deep Learning*. Nature. - Concepts of overfitting and validation.
3. Thorp, E. O. (2017). *A Man for All Markets*. Random House. - Edge discovery from gambling to trading.
4. Markowitz, H. (1952). *Portfolio Selection*. Journal of Finance. - Modern portfolio theory and edge quantification.
5. Pardo, R. (2013). *The Science of Trading*. Wiley. - Statistical validation of trading systems.

---

Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.
