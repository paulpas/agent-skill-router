---
name: lookahead-bias
description: '"Preventing lookahead bias in backtesting through strict causality enforcement"
  time-based validation, and comprehensive detection frameworks.'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: backtest lookahead bias, backtest-lookahead-bias, backtesting, preventing,
    strict, unit tests, testing, test automation
  related-skills: backtest-position-exits, backtest-sharpe-ratio, backtest-walk-forward,
    fundamentals-trading-plan
---



**Role:** Backtest Quality Engineer

**Philosophy:** No-Future-Data Policy - backtests must be strictly causal with no access to future data during signal generation. Every calculation must only use information available at or before the decision time.

## Key Principles

1. **Strict Causality**: Every signal and indicator must be computed using only data available up to the current timestamp. Future data points cannot influence current decisions.

2. **Time-Based Validation**: Implement automated checks that verify data alignment by timestamp and ensure no backward-looking references exist in signal generation logic.

3. **Calculation Delay Detection**: Identify and flag any patterns where indicators use future data through rolling window analysis and lag verification.

4. **Walk-Forward Testing**: Implement walk-forward optimization that simulates real trading by retraining models on historical data and testing on unseen future data.

5. **Index Component Bias Prevention**: Ensure backtests account for delisted components and avoid survivorship bias by including historical component data and weights.

## Implementation Guidelines

### Structure
- Core logic: `backtesting/lookahead_detector.py`
- Helper functions: `backtesting/utils/time_alignment.py`
- Tests: `tests/backtesting/test_lookahead_bias.py`

### Patterns to Follow
- Use pandas `shift()` operations explicitly to demonstrate lag awareness
- Implement data validation at entry points before any signal generation
- Maintain timestamp-indexed DataFrames throughout the pipeline
- Include comprehensive logging of all bias detection events

## Adherence Checklist
Before completing your task, verify:
- [ ] All indicator calculations use `shift(1)` or equivalent for proper lag
- [ ] Walk-forward analysis uses only in-sample data for out-of-sample testing
- [ ] Time-based validation confirms no future data leakage
- [ ] Survivorship bias checks include delisted components in historical data
- [ ] All backtest reports include lookahead bias detection results

## Code Examples

### Correct Backtesting Implementation

```python
# Complete Python implementation (50-100 lines)
# Includes proper signal generation with lookahead bias prevention

from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
from enum import Enum
import numpy as np
import pandas as pd
from datetime import datetime
import warnings


class SignalType(Enum):
    """Types of trading signals."""
    MOVING_AVERAGE_CROSS = "moving_avg_cross"
    RSI = "rsi"
    BOLLINGER_BANDS = "bollinger_bands"
    MACD = "macd"


@dataclass
class SignalResult:
    """Result of signal generation."""
    timestamp: datetime
    signal_type: SignalType
    signal_value: float
    is_valid: bool
    lookahead_bias_detected: bool = False
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "timestamp": self.timestamp.isoformat() if hasattr(self.timestamp, 'isoformat') else str(self.timestamp),
            "signal_type": self.signal_type.value,
            "signal_value": self.signal_value,
            "is_valid": self.is_valid,
            "lookahead_bias_detected": self.lookahead_bias_detected
        }


class LookaheadSafeIndicator:
    """
    Base class for indicators that ensures no lookahead bias.
    All indicators must compute values using only available data.
    """
    
    def __init__(self, window_size: int = 20):
        self.window_size = window_size
        self.history: List[SignalResult] = []
    
    def compute_signal(self, data: pd.Series) -> pd.Series:
        """
        Compute indicator signal with proper lag.
        
        Args:
            data: Price series indexed by timestamp
            
        Returns:
            Signal series with same index as data
        """
        if len(data) < self.window_size:
            return pd.Series([np.nan] * len(data), index=data.index)
        
        # Correct: Use shift(1) to avoid lookahead bias
        # The signal for time t is computed using data up to time t-1
        signal = self._compute_raw_signal(data)
        return signal.shift(1)
    
    def _compute_raw_signal(self, data: pd.Series) -> pd.Series:
        """Subclasses implement actual signal computation."""
        raise NotImplementedError
    
    def generate_signal(
        self, 
        data: pd.Series, 
        signal_type: SignalType
    ) -> SignalResult:
        """Generate single signal result with bias check."""
        signal = self.compute_signal(data)
        
        if len(signal) == 0:
            return SignalResult(
                timestamp=datetime.now(),
                signal_type=signal_type,
                signal_value=np.nan,
                is_valid=False
            )
        
        latest_value = signal.iloc[-1]
        is_valid = not pd.isna(latest_value)
        
        result = SignalResult(
            timestamp=data.index[-1] if len(data) > 0 else datetime.now(),
            signal_type=signal_type,
            signal_value=latest_value if is_valid else np.nan,
            is_valid=is_valid
        )
        
        self.history.append(result)
        return result


class MovingAverageCrossover(LookaheadSafeIndicator):
    """
    Moving average crossover strategy with lookahead bias prevention.
    """
    
    def __init__(self, fast_window: int = 10, slow_window: int = 30):
        super().__init__(slow_window)
        self.fast_window = fast_window
        self.slow_window = slow_window
    
    def _compute_raw_signal(self, data: pd.Series) -> pd.Series:
        """Compute moving average crossover signal."""
        fast_ma = data.rolling(window=self.fast_window).mean()
        slow_ma = data.rolling(window=self.slow_window).mean()
        return fast_ma - slow_ma
    
    def generate_signal(self, data: pd.Series) -> SignalResult:
        """Generate crossover signal."""
        signal = self.compute_signal(data)
        
        if len(signal) < 2:
            return SignalResult(
                timestamp=datetime.now(),
                signal_type=SignalType.MOVING_AVERAGE_CROSS,
                signal_value=np.nan,
                is_valid=False
            )
        
        current = signal.iloc[-1]
        previous = signal.iloc[-2]
        
        # Detect crossover
        signal_value = 0.0
        is_valid = True
        if pd.notna(current) and pd.notna(previous):
            if previous <= 0 and current > 0:
                signal_value = 1.0  # Bullish crossover
            elif previous >= 0 and current < 0:
                signal_value = -1.0  # Bearish crossover
            else:
                signal_value = 0.0  # No crossover
        
        result = SignalResult(
            timestamp=data.index[-1],
            signal_type=SignalType.MOVING_AVERAGE_CROSS,
            signal_value=signal_value,
            is_valid=is_valid
        )
        self.history.append(result)
        return result


class RSICalculator(LookaheadSafeIndicator):
    """RSI calculator with proper lag handling."""
    
    def __init__(self, window: int = 14):
        super().__init__(window)
        self.window = window
    
    def _compute_raw_signal(self, data: pd.Series) -> pd.Series:
        """Compute RSI with lookahead bias prevention."""
        if len(data) < self.window + 1:
            return pd.Series([np.nan] * len(data), index=data.index)
        
        # Calculate price changes
        delta = data.diff()
        
        # Separate gains and losses
        gain = (delta.where(delta > 0, 0)).rolling(window=self.window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=self.window).mean()
        
        # CalculateRSI
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def generate_signal(self, data: pd.Series, overbought: float = 70, oversold: float = 30) -> SignalResult:
        """Generate RSI signal."""
        rsi = self.compute_signal(data)
        
        if len(rsi) == 0 or pd.isna(rsi.iloc[-1]):
            return SignalResult(
                timestamp=datetime.now(),
                signal_type=SignalType.RSI,
                signal_value=np.nan,
                is_valid=False
            )
        
        latest_rsi = rsi.iloc[-1]
        signal_value = 0.0
        
        if latest_rsi > overbought:
            signal_value = -1.0  # Overbought - potential sell
        elif latest_rsi < oversold:
            signal_value = 1.0  # Oversold - potential buy
        
        result = SignalResult(
            timestamp=data.index[-1],
            signal_type=SignalType.RSI,
            signal_value=signal_value,
            is_valid=True
        )
        self.history.append(result)
        return result


# Example usage and testing
if __name__ == "__main__":
    # Generate sample price data
    np.random.seed(42)
    dates = pd.date_range(start="2024-01-01", periods=100, freq="D")
    prices = pd.Series(
        100 + np.random.randn(100).cumsum(),
        index=dates,
        name="price"
    )
    
    # Test moving average crossover
    print("Testing Moving Average Crossover:")
    ma_crossover = MovingAverageCrossover(fast_window=5, slow_window=20)
    
    # Incremental processing (mimics real-time trading)
    signals = []
    for i in range(30, len(prices)):
        historical_data = prices.iloc[:i+1]
        result = ma_crossover.generate_signal(historical_data)
        if result.is_valid:
            signals.append(result.to_dict())
    
    print(f"Generated {len(signals)} valid signals")
    
    # Test RSI calculator
    print("\nTesting RSI Calculator:")
    rsi_calc = RSICalculator(window=14)
    rsi_result = rsi_calc.generate_signal(prices)
    print(f"Latest RSI Signal: {rsi_result.to_dict()}")
```

### Common Lookahead Bias Patterns and How to Detect Them

```python
# Common lookahead bias patterns and detection methods (50-100 lines)

from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple, Set
import numpy as np
import pandas as pd
from datetime import datetime
from enum import Enum


class BiasType(Enum):
    """Types of lookahead bias."""
    CALCULATION_BIAS = "calculation_bias"
    DATA_BIAS = "data_bias"
    INDEX_BIAS = "index_bias"
    SIMULATION_BIAS = "simulation_bias"


@dataclass
class BiasReport:
    """Report of detected lookahead bias."""
    bias_type: BiasType
    severity: str  # "critical", "high", "medium", "low"
    description: str
    affected_columns: List[str]
    timestamp: datetime
    recommendation: str
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "bias_type": self.bias_type.value,
            "severity": self.severity,
            "description": self.description,
            "affected_columns": self.affected_columns,
            "timestamp": self.timestamp.isoformat() if hasattr(self.timestamp, 'isoformat') else str(self.timestamp),
            "recommendation": self.recommendation
        }


class LookaheadBiasDetector:
    """
    Comprehensive lookahead bias detection system.
    Identifies and classifies different types of bias in backtesting code.
    """
    
    def __init__(self):
        self.reports: List[BiasReport] = []
        self.known_bias_patterns: Dict[str, str] = {
            "future_mean": "Using rolling mean with center=True or without proper shift",
            "future_std": "Standard deviation calculated on full dataset",
            "future_max": "Maximum calculated with future data access",
            "future_min": "Minimum calculated with future data access",
            "cumsum": "Cumulative sum without proper lag application",
            "cumprod": "Cumulative product without lag",
            "shift_negative": "Using shift(-1) which looks into future",
            "bfill": "Backward fill introducing future data",
            "interpolate": "Interpolation using future points",
        }
    
    def detect_calculation_bias(self, df: pd.DataFrame) -> List[BiasReport]:
        """
        Detect calculation bias in DataFrame operations.
        
        Args:
            df: DataFrame to analyze
            
        Returns:
            List of detected calculation biases
        """
        reports = []
        
        # Check for center=True in rolling operations
        # This is a common pattern that causes lookahead bias
        for col in df.columns:
            if df[col].dtype in [np.float64, np.float32, np.int64, np.int32]:
                # Check if column is centered (future data used)
                if df[col].is_monotonic_increasing or df[col].is_monotonic_decreasing:
                    # Monotonic columns with smooth changes may indicate future bias
                    first_half_mean = df[col].iloc[:len(df)//2].mean()
                    second_half_mean = df[col].iloc[len(df)//2:].mean()
                    
                    if abs(second_half_mean - first_half_mean) < abs(df[col].std()):
                        reports.append(BiasReport(
                            bias_type=BiasType.CALCULATION_BIAS,
                            severity="medium",
                            description=f"Column {col} shows potential smoothing bias. "
                                       f"Consider if calculations use future data.",
                            affected_columns=[col],
                            timestamp=datetime.now(),
                            recommendation=f"Verify {col} doesn't use future data in calculation. "
                                        f"Ensure proper lag with shift(1) if needed."
                        ))
        
        return reports
    
    def detect_data_bias(self, df: pd.DataFrame, index_df: pd.DataFrame) -> List[BiasReport]:
        """
        Detect data bias from index alignment issues.
        
        Args:
            df: Data DataFrame
            index_df: Index DataFrame to check alignment
            
        Returns:
            List of detected data biases
        """
        reports = []
        
        # Check for columns that don't exist in historical index
        for col in df.columns:
            if col not in index_df.columns:
                reports.append(BiasReport(
                    bias_type=BiasType.DATA_BIAS,
                    severity="high",
                    description=f"Column '{col}' not present in historical index data. "
                               f"May indicate survivorship bias.",
                    affected_columns=[col],
                    timestamp=datetime.now(),
                    recommendation="Include delisted components in historical data. "
                                  "Use full index history with weight adjustments."
                ))
        
        return reports
    
    def detect_index_bias(self, portfolio_df: pd.DataFrame, index_df: pd.DataFrame) -> List[BiasReport]:
        """
        Detect index component bias in portfolio回testing.
        
        Args:
            portfolio_df: Portfolio performance DataFrame
            index_df: Index composition DataFrame
            
        Returns:
            List of detected index biases
        """
        reports = []
        
        # Check if index composition changes over time
        if 'weight' in index_df.columns and 'component' in index_df.columns:
            # Look for weight changes that might indicate bias
            for component in index_df['component'].unique():
                component_data = index_df[index_df['component'] == component]
                
                # Check for weight dropping to zero (delisting)
                if component_data['weight'].iloc[-1] == 0 and component_data['weight'].iloc[0] > 0:
                    # This component was likely dropped - ensure backtest handled correctly
                    reports.append(BiasReport(
                        bias_type=BiasType.INDEX_BIAS,
                        severity="high",
                        description=f"Component '{component}' shows delisting pattern. "
                                   f"Ensure backtest accounts for delisted components.",
                        affected_columns=['weight'],
                        timestamp=datetime.now(),
                        recommendation="Include delisted component in backtest until delisting date. "
                                      "Use total return with weight adjustment."
                    ))
        
        return reports
    
    def detect_simulation_bias(self, backtest_results: pd.DataFrame) -> List[BiasReport]:
        """
        Detect simulation bias in backtest results.
        
        Args:
            backtest_results: Backtest performance DataFrame
            
        Returns:
            List of detected simulation biases
        """
        reports = []
        
        # Check for unrealistically smooth equity curves
        if 'equity' in backtest_results.columns:
            equity = backtest_results['equity']
            returns = equity.pct_change().dropna()
            
            # Calculate Sharpe ratio using full data (lookahead)
            if len(returns) > 1:
                full_mean = returns.mean()
                full_std = returns.std()
                full_sharpe = full_mean / full_std if full_std != 0 else np.nan
                
                # Compare with walk-forward Sharpe
                half_point = len(returns) // 2
                in_sample_sharpe = returns.iloc[:half_point].mean() / returns.iloc[:half_point].std()
                out_of_sample_sharpe = returns.iloc[half_point:].mean() / returns.iloc[half_point:].std()
                
                # If out-of-sample Sharpe is dramatically lower, possible lookahead bias
                if abs(out_of_sample_sharpe) < abs(in_sample_sharpe) * 0.5:
                    reports.append(BiasReport(
                        bias_type=BiasType.SIMULATION_BIAS,
                        severity="high",
                        description="Out-of-sample Sharpe ratio significantly lower than in-sample. "
                                   "Possible lookahead bias in strategy optimization.",
                        affected_columns=['equity'],
                        timestamp=datetime.now(),
                        recommendation="Implement walk-forward optimization. "
                                      "Re-estimate parameters on rolling training set."
                    ))
        
        return reports
    
    def run_all_checks(self, data: Dict) -> List[BiasReport]:
        """
        Run all bias detection checks.
        
        Args:
            data: Dictionary containing:
                - 'df': main DataFrame
                - 'index_df': index composition
                - 'portfolio_df': portfolio results
                - 'backtest_results': backtest performance
                
        Returns:
            List of all bias reports
        """
        all_reports = []
        
        df = data.get('df')
        index_df = data.get('index_df')
        portfolio_df = data.get('portfolio_df')
        backtest_results = data.get('backtest_results')
        
        if df is not None:
            all_reports.extend(self.detect_calculation_bias(df))
            all_reports.extend(self.detect_data_bias(df, index_df if index_df is not None else pd.DataFrame()))
        
        if index_df is not None:
            all_reports.extend(self.detect_index_bias(portfolio_df if portfolio_df is not None else pd.DataFrame(), index_df))
        
        if backtest_results is not None:
            all_reports.extend(self.detect_simulation_bias(backtest_results))
        
        self.reports.extend(all_reports)
        return all_reports
    
    def get_summary(self) -> Dict:
        """Get summary of all detected biases."""
        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        bias_type_counts = {}
        
        for report in self.reports:
            severity_counts[report.severity] = severity_counts.get(report.severity, 0) + 1
            bias_type_counts[report.bias_type.value] = bias_type_counts.get(report.bias_type.value, 0) + 1
        
        return {
            "total_biases": len(self.reports),
            "by_severity": severity_counts,
            "by_type": bias_type_counts
        }


# Example usage
if __name__ == "__main__":
    # Create sample data with potential biases
    np.random.seed(42)
    dates = pd.date_range(start="2024-01-01", periods=100, freq="D")
    
    # Normal data
    prices = pd.DataFrame({
        'close': 100 + np.random.randn(100).cumsum(),
        'volume': np.random.randint(1000000, 5000000, 100)
    }, index=dates)
    
    # Create biased data (centered mean - lookahead bias)
    prices['biased_mean'] = prices['close'].rolling(window=20, center=True).mean()
    
    # Index data
    index_data = pd.DataFrame({
        'component': ['AAPL', 'GOOGL', 'MSFT', 'AMZN'],
        'weight': [0.3, 0.25, 0.25, 0.2],
        'date': dates[-1]
    })
    
    # Backtest results
    backtest = pd.DataFrame({
        'equity': 100 * (1 + np.random.randn(100).cumsum() * 0.001).clip(lower=0),
        'date': dates
    })
    
    # Run detection
    detector = LookaheadBiasDetector()
    reports = detector.run_all_checks({
        'df': prices,
        'index_df': index_data,
        'backtest_results': backtest
    })
    
    print("Bias Detection Results:")
    for report in reports:
        print(f"\n{report.bias_type.value} ({report.severity}):")
        print(f"  Description: {report.description}")
        print(f"  Recommendation: {report.recommendation}")
    
    print(f"\nSummary: {detector.get_summary()}")
```

### Lookahead Bias Detection Framework

```python
# Comprehensive lookahead bias detection framework (50-100 lines)

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Callable, Tuple
from enum import Enum
import numpy as np
import pandas as pd
from datetime import datetime
from abc import ABC, abstractmethod


class Severity(Enum):
    """Detection severity levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class DetectionResult:
    """Result of a single detection check."""
    test_name: str
    passed: bool
    severity: Severity
    message: str
    details: Dict = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "test_name": self.test_name,
            "passed": self.passed,
            "severity": self.severity.value,
            "message": self.message,
            "details": self.details,
            "timestamp": self.timestamp.isoformat()
        }


@dataclass
class DetectionSession:
    """Complete detection session results."""
    start_time: datetime
    end_time: Optional[datetime] = None
    tests_passed: int = 0
    tests_failed: int = 0
    results: List[DetectionResult] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "tests_passed": self.tests_passed,
            "tests_failed": self.tests_failed,
            "success_rate": self.tests_passed / (self.tests_passed + self.tests_failed) if (self.tests_passed + self.tests_failed) > 0 else 0,
            "results": [r.to_dict() for r in self.results]
        }


class BiasDetectionTest(ABC):
    """Abstract base class for bias detection tests."""
    
    @abstractmethod
    def run(self, data: pd.DataFrame) -> DetectionResult:
        """Run the detection test."""
        pass
    
    @property
    @abstractmethod
    def test_name(self) -> str:
        """Name of the test."""
        pass
    
    @property
    @abstractmethod
    def severity(self) -> Severity:
        """Severity level for this test."""
        pass


class TimeAlignmentTest(BiasDetectionTest):
    """Test that data is properly aligned by time."""
    
    @property
    def test_name(self) -> str:
        return "time_alignment"
    
    @property
    def severity(self) -> Severity:
        return Severity.HIGH
    
    def run(self, data: pd.DataFrame) -> DetectionResult:
        """Verify data is sorted by time and has no gaps."""
        if not isinstance(data.index, pd.DatetimeIndex):
            return DetectionResult(
                test_name=self.test_name,
                passed=True,
                severity=self.severity,
                message="Data index is not datetime. Skipping time alignment check.",
                details={"index_type": type(data.index).__name__}
            )
        
        # Check if sorted
        is_sorted = data.index.is_monotonic_increasing
        if not is_sorted:
            return DetectionResult(
                test_name=self.test_name,
                passed=False,
                severity=self.severity,
                message="Data is not sorted by time index.",
                details={"sample_dates": [str(d) for d in data.index[:5].tolist()]}
            )
        
        # Check for gaps
        if len(data) > 1:
            time_diffs = data.index.to_series().diff().dropna()
            # Find unusual gaps (more than 2x expected frequency)
            expected_freq = time_diffs.median()
            large_gaps = (time_diffs > 2 * expected_freq).sum()
            
            if large_gaps > 0:
                return DetectionResult(
                    test_name=self.test_name,
                    passed=False,
                    severity=Severity.MEDIUM,
                    message=f"Found {large_gaps} time gaps larger than expected.",
                    details={"expected_frequency": str(expected_freq), "large_gaps": int(large_gaps)}
                )
        
        return DetectionResult(
            test_name=self.test_name,
            passed=True,
            severity=self.severity,
            message="Time alignment check passed.",
            details={"data_points": len(data), "date_range": f"{data.index[0]} to {data.index[-1]}"}
        )


class LagVerificationTest(BiasDetectionTest):
    """Test that lagged operations use proper shift."""
    
    @property
    def test_name(self) -> str:
        return "lag_verification"
    
    @property
    def severity(self) -> Severity:
        return Severity.MEDIUM
    
    def run(self, data: pd.DataFrame) -> DetectionResult:
        """Verify column values are properly lagged."""
        results = {}
        
        # Check each numeric column
        for col in data.select_dtypes(include=[np.number]).columns:
            series = data[col]
            
            # Check if column has negative shift pattern (lookahead)
            if len(series) > 1:
                # Simple heuristic: if values are strongly correlated with future values
                # that's suspicious for indicators
                autocorr_1 = series.autocorr(lag=1)
                autocorr_2 = series.autocorr(lag=2)
                
                # If lag-2 is stronger than lag-1, may indicate lookahead
                if abs(autocorr_2) > abs(autocorr_1) * 1.5 and abs(autocorr_2) > 0.5:
                    results[col] = {
                        "autocorr_1": float(autocorr_1),
                        "autocorr_2": float(autocorr_2),
                        "concern": "Higher than expected lag-2 autocorrelation"
                    }
        
        if results:
            return DetectionResult(
                test_name=self.test_name,
                passed=False,
                severity=Severity.HIGH,
                message="Potential lookahead bias detected in lagged operations.",
                details=results
            )
        
        return DetectionResult(
            test_name=self.test_name,
            passed=True,
            severity=self.severity,
            message="Lag verification passed.",
            details={"columns_analyzed": len(data.select_dtypes(include=[np.number]).columns)}
        )


class FutureDataLeakTest(BiasDetectionTest):
    """Test for data that appears to use future information."""
    
    @property
    def test_name(self) -> str:
        return "future_data_leak"
    
    @property
    def severity(self) -> Severity:
        return Severity.CRITICAL
    
    def run(self, data: pd.DataFrame) -> DetectionResult:
        """Check for potential future data leakage."""
        suspicious_patterns = {}
        
        for col in data.columns:
            series = data[col]
            
            # Check for NaN values at start (indicating forward-fill from future)
            first_valid_idx = series.first_valid_index()
            if first_valid_idx is not None:
                first_valid_pos = series.index.get_loc(first_valid_idx)
                # More than 5% NaN at start could indicate forward-fill
                if first_valid_pos > 0 and first_valid_pos / len(series) > 0.05:
                    suspicious_patterns[col] = {
                        "nan_at_start": first_valid_pos,
                        "total_length": len(series),
                        "nan_ratio": first_valid_pos / len(series)
                    }
        
        # Check for values that perfectly match future calculations
        for col in data.columns:
            series = data[col]
            
            # Check if current value equals next value (potential forward-fill)
            if len(series) > 1:
                same_as_next = (series == series.shift(-1)).sum()
                if same_as_next / len(series) > 0.8:
                    suspicious_patterns[col] = {
                        "same_as_next": int(same_as_next),
                        "ratio": float(same_as_next / len(series)),
                        "pattern": "Many values equal to next (forward-fill detected)"
                    }
        
        if suspicious_patterns:
            return DetectionResult(
                test_name=self.test_name,
                passed=False,
                severity=Severity.CRITICAL,
                message="Potential future data leakage detected.",
                details=suspicious_patterns
            )
        
        return DetectionResult(
            test_name=self.test_name,
            passed=True,
            severity=self.severity,
            message="No future data leakage detected.",
            details={"columns_checked": len(data.columns)}
        )


class WalkForwardConsistencyTest(BiasDetectionTest):
    """Test consistency between training and testing periods."""
    
    @property
    def test_name(self) -> str:
        return "walk_forward_consistency"
    
    @property
    def severity(self) -> Severity:
        return Severity.MEDIUM
    
    def run(self, data: pd.DataFrame) -> DetectionResult:
        """Check walk-forward consistency for equity or performance data."""
        if 'equity' not in data.columns and 'pnl' not in data.columns:
            return DetectionResult(
                test_name=self.test_name,
                passed=True,
                severity=self.severity,
                message="No equity or PnL column found. Skipping walk-forward check.",
                details={"available_columns": list(data.columns)}
            )
        
        metric_col = 'equity' if 'equity' in data.columns else 'pnl'
        series = data[metric_col].dropna()
        
        if len(series) < 20:
            return DetectionResult(
                test_name=self.test_name,
                passed=True,
                severity=self.severity,
                message="Insufficient data for walk-forward analysis.",
                details={"data_points": len(series)}
            )
        
        # Split into training and testing periods
        mid_point = len(series) // 2
        in_sample = series.iloc[:mid_point]
        out_of_sample = series.iloc[mid_point:]
        
        # Calculate statistics
        is_return = (in_sample.iloc[-1] - in_sample.iloc[0]) / in_sample.iloc[0] if in_sample.iloc[0] != 0 else 0
        oos_return = (out_of_sample.iloc[-1] - out_of_sample.iloc[0]) / out_of_sample.iloc[0] if out_of_sample.iloc[0] != 0 else 0
        
        # Calculate volatility
        is_returns = in_sample.pct_change().dropna()
        oos_returns = out_of_sample.pct_change().dropna()
        
        is_vol = is_returns.std() * np.sqrt(252) if len(is_returns) > 1 else 0
        oos_vol = oos_returns.std() * np.sqrt(252) if len(oos_returns) > 1 else 0
        
        # Check for significant performance degradation
        if abs(oos_return) < abs(is_return) * 0.5 and abs(is_return) > 0.1:
            return DetectionResult(
                test_name=self.test_name,
                passed=False,
                severity=Severity.MEDIUM,
                message="Significant performance degradation in out-of-sample period.",
                details={
                    "in_sample_return": float(is_return),
                    "out_of_sample_return": float(oos_return),
                    "in_sample_volatility": float(is_vol),
                    "out_of_sample_volatility": float(oos_vol)
                }
            )
        
        return DetectionResult(
            test_name=self.test_name,
            passed=True,
            severity=self.severity,
            message="Walk-forward consistency check passed.",
            details={
                "in_sample_return": float(is_return),
                "out_of_sample_return": float(oos_return),
                "performance_ratio": float(abs(oos_return) / abs(is_return)) if abs(is_return) > 0 else 0
            }
        )


class LookaheadBiasDetector:
    """
    Comprehensive lookahead bias detection framework.
    Runs multiple tests to identify various types of lookahead bias.
    """
    
    def __init__(self, tests: Optional[List[BiasDetectionTest]] = None):
        """Initialize detector with test suite."""
        default_tests = [
            TimeAlignmentTest(),
            LagVerificationTest(),
            FutureDataLeakTest(),
            WalkForwardConsistencyTest()
        ]
        self.tests = tests if tests is not None else default_tests
        self.session: Optional[DetectionSession] = None
    
    def run_session(self, data: pd.DataFrame) -> DetectionSession:
        """
        Run complete detection session on data.
        
        Args:
            data: DataFrame to analyze
            
        Returns:
            DetectionSession with all results
        """
        self.session = DetectionSession(start_time=datetime.now())
        
        for test in self.tests:
            try:
                result = test.run(data)
                self.session.results.append(result)
                
                if result.passed:
                    self.session.tests_passed += 1
                else:
                    self.session.tests_failed += 1
            except Exception as e:
                # Test failed to run
                self.session.results.append(DetectionResult(
                    test_name=test.test_name,
                    passed=False,
                    severity=Severity.CRITICAL,
                    message=f"Test execution failed: {str(e)}",
                    details={"error": str(e)}
                ))
                self.session.tests_failed += 1
        
        self.session.end_time = datetime.now()
        return self.session
    
    def get_summary(self, session: Optional[DetectionSession] = None) -> Dict:
        """Get summary of detection session."""
        session = session or self.session
        if session is None:
            return {"error": "No session available"}
        
        return session.to_dict()
    
    def get_failures(self, session: Optional[DetectionSession] = None) -> List[Dict]:
        """Get list of failed tests."""
        session = session or self.session
        if session is None:
            return []
        
        return [r.to_dict() for r in session.results if not r.passed]


# Example usage
if __name__ == "__main__":
    # Generate sample data
    np.random.seed(42)
    dates = pd.date_range(start="2024-01-01", periods=100, freq="D")
    
    # Create normal price data
    prices = pd.DataFrame({
        'close': 100 + np.random.randn(100).cumsum(),
        'volume': np.random.randint(1000000, 5000000, 100)
    }, index=dates)
    
    # Add proper lagged indicators
    prices['sma_20'] = prices['close'].rolling(window=20).mean().shift(1)
    prices['ema_10'] = prices['close'].ewm(span=10, adjust=False).mean().shift(1)
    
    # Create equity curve
    equity = pd.DataFrame({
        'equity': 100 * (1 + np.random.randn(100) * 0.01).cumprod().clip(lower=0),
        'date': dates
    })
    equity.set_index('date', inplace=True)
    
    # Run detection
    detector = LookaheadBiasDetector()
    
    print("=" * 60)
    print("Lookahead Bias Detection Session")
    print("=" * 60)
    
    session = detector.run_session(prices)
    summary = detector.get_summary(session)
    
    print(f"\nSummary:")
    print(f"  Tests Passed: {summary['tests_passed']}")
    print(f"  Tests Failed: {summary['tests_failed']}")
    print(f"  Success Rate: {summary['success_rate']:.1%}")
    
    failures = detector.get_failures(session)
    if failures:
        print(f"\nFailed Tests ({len(failures)}):")
        for failure in failures:
            print(f"\n  [{failure['severity'].upper()}] {failure['test_name']}")
            print(f"    {failure['message']}")
    else:
        print("\n✓ All tests passed!")
    
    print("\n" + "=" * 60)
    print("Individual Test Results:")
    print("=" * 60)
    
    for result in session.results:
        status = "✓ PASS" if result.passed else "✗ FAIL"
        print(f"\n{status}: {result.test_name}")
        print(f"  Severity: {result.severity.value}")
        print(f"  Message: {result.message}")
        if result.details:
            print(f"  Details: {result.details}")
```

## Common Mistakes to Avoid

1. **Using `rolling(..., center=True)` without adjustment**: Centered rolling windows use future data points to calculate the current value, creating lookahead bias. Always use right-aligned windows with explicit `shift(1)`.

2. **Calculating indicators on the full dataset before filtering**: Computing indicators on the entire dataset and then filtering by date still allows future data to influence past signals. Calculate indicators incrementally or with proper lag.

3. **Forward-fill (ffill) without date context**: Forward-filling values across dates that should be NaN introduces future data into the signal. Ensure forward-fill only occurs within the same trading day.

4. **Using `shift(-1)` instead of `shift(1)`**: Negative shifts look into the future. Signal generation should use `shift(1)` to ensure the signal for time t is based on information available at time t-1.

5. **Optimizing parameters on full dataset then testing**: Parameter optimization that uses the entire dataset looks into the future. Use walk-forward optimization where parameters are re-estimated on rolling in-sample periods before out-of-sample testing.

## References

1. **Lo, A. W. (2002). "The Statistics of Sharpe Ratios"** - Discusses proper calculation of risk-adjusted returns without lookahead bias.

2. **Kelleher, J. D., & Tierney, B. (2018). "Guidelines for Conducting and Reporting Machine Learning Experiments"** - Provides comprehensive guidelines for avoiding data leakage in time series experiments.

3. **Meucci, A. (2009). "Risk and Asset Allocation"** - Contains detailed discussion on backtesting validation and the importance of walk-forward analysis.

4. **QuantConnect Documentation - "Backtesting Best Practices"** - Practical guide to avoiding common backtesting pitfalls including lookahead bias.

5. **QuantInsti Blog - "The Dangers of Look-Ahead Bias"** - Real-world examples of lookahead bias in algorithmic trading strategies and how to detect them.

---

Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.