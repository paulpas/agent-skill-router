---
name: ds-time-series-forecasting
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Implements ARIMA, exponential smoothing, state-space models, LSTM networks
  and deep learning methods for temporal prediction"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-feature-engineering, ds-neural-networks, ds-regression-evaluation
  role: implementation
  scope: implementation
  triggers: time series forecasting, ARIMA, exponential smoothing, LSTM, forecasting
    time series prediction
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
------
# Time Series Forecasting

Comprehensive guide to time series forecasting in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world supervised learning problems
- Building machine learning pipelines with time series forecasting
- Implementing best practices for time series forecasting
- Optimizing model performance using time series forecasting techniques
- Learning industry-standard approaches to time series forecasting

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require time series forecasting rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Time Series Forecasting is a critical component of the machine learning workflow. This skill covers:

1. **Theoretical foundations** — Mathematical principles and statistical concepts
2. **Practical implementation** — Working code examples and patterns
3. **Common pitfalls** — Mistakes to avoid and how to recover from them
4. **Best practices** — Industry-standard approaches and optimization techniques

## Core Workflow

1. **Understand the problem** — Clearly define what you're solving for
2. **Select approach** — Choose the right technique for your data and constraints
3. **Implement solution** — Write clean, tested code following best practices
4. **Validate results** — Verify your implementation with tests and validation
5. **Optimize performance** — Improve efficiency and accuracy incrementally

## Implementation Patterns

### Pattern 1: Basic Time Series Forecasting

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from sklearn.metrics import mean_absolute_error, mean_squared_error

def basic_forecasting_pipeline(data: pd.Series, forecast_horizon: int = 10) -> dict:
    """
    Demonstrates a basic time series forecasting pipeline using Exponential Smoothing.
    """
    if data is None or data.empty:
        raise ValueError("Input data cannot be None or empty")
    
    if not isinstance(data.index, pd.DatetimeIndex):
        data.index = pd.date_range(start="2020-01-01", periods=len(data), freq="D")
    
    split_idx = int(len(data) * 0.8)
    train_data = data.iloc[:split_idx]
    test_data = data.iloc[split_idx:]
    
    model = ExponentialSmoothing(
        train_data, 
        trend='add', 
        seasonal='add', 
        seasonal_periods=7
    )
    fitted_model = model.fit(optimized=True)
    
    forecasts = fitted_model.forecast(forecast_horizon)
    test_forecasts = fitted_model.predict(start=test_data.index[0], end=test_data.index[-1])
    mae = mean_absolute_error(test_data, test_forecasts)
    rmse = np.sqrt(mean_squared_error(test_data, test_forecasts))
    
    return {
        'forecasts': forecasts
        'metrics': {'mae': mae, 'rmse': rmse}
        'fitted_model': fitted_model
    }
```

### Pattern 2: Production-Ready Time Series Forecasting

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, Optional
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_absolute_error, mean_squared_error

logger = logging.getLogger(__name__)

class TimeSeriesForecasting:
    """Production-grade time series forecasting class with ARIMA."""
    
    def __init__(self, order: tuple = (1, 1, 1), forecast_steps: int = 10):
        self.order = order
        self.forecast_steps = forecast_steps
        self.model = None
        self.history = None
        
    def _validate_data(self, data: pd.DataFrame) -> pd.Series:
        if data is None or data.empty:
            raise ValueError("Input data cannot be None or empty")
        if not isinstance(data.index, pd.DatetimeIndex):
            raise ValueError("Data index must be a DatetimeIndex")
        return data.squeeze()
        
    def fit(self, data: pd.DataFrame) -> 'TimeSeriesForecasting':
        """Fit the ARIMA model on historical data."""
        self.history = self._validate_data(data)
        try:
            self.model = ARIMA(self.history, order=self.order)
            self.fitted_model = self.model.fit()
            logger.info(f"Model fitted successfully with order {self.order}")
        except Exception as e:
            logger.error(f"Failed to fit model: {e}")
            raise RuntimeError("Model fitting failed") from e
        return self
        
    def predict(self, steps: Optional[int] = None) -> pd.Series:
        """Generate future forecasts."""
        if self.model is None:
            raise RuntimeError("Model must be fitted before prediction")
        horizon = steps or self.forecast_steps
        return self.fitted_model.forecast(steps=horizon)
        
    def evaluate(self, test_data: pd.DataFrame) -> Dict[str, float]:
        """Evaluate model performance on held-out test data."""
        test_series = self._validate_data(test_data)
        test_forecasts = self.fitted_model.predict(
            start=test_series.index[0], 
            end=test_series.index[-1]
        )
        mae = mean_absolute_error(test_series, test_forecasts)
        rmse = np.sqrt(mean_squared_error(test_series, test_forecasts))
        return {'mae': mae, 'rmse': rmse}
```

## Best Practices

- ✅ Always validate your implementation on test data
- ✅ Document your assumptions and methodology
- ✅ Use version control for reproducibility
- ✅ Monitor performance metrics in production
- ✅ Periodically review and update your approach
- ✅ Test with edge cases and outliers
- ✅ Log all significant operations for debugging

## Common Pitfalls

| Pitfall | Problem | Solution |
|

---

---

## Constraints

### MUST DO
- Validate all data preprocessing steps are fit-only on training data, never on validation or test sets
- Implement reproducible pipelines with fixed random seeds and deterministic operations where possible
- Report model performance with confidence intervals via bootstrapping or cross-validation across multiple runs
- Log all experiments with parameters, metrics, and artifacts using MLflow or equivalent tracking system

### MUST NOT DO
- Do not evaluate a model on the same data used for training — always hold out a proper test set
- Avoid overfitting to the validation set by limiting hyperparameter search iterations
- Never use features that can only be computed at inference time (look-ahead bias)
- Do not report single-run accuracy without statistical significance testing or error bars


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Statsmodels Time Series Analysis](https://www.statsmodels.org/stable/tsa.html)
- [What is Time Series Forecasting (Databricks Blog)](https://databricks.com/blog/what-time-series-forecasting)
- [Prophet — Facebook/Meta Documentation](https://facebook.github.io/prophet/)
- [Temporal Fusion Transformers (Google Research)](https://ai.googleblog.com/2021/06/temporal-fusion-transformers-for.html)
- [Time Series Forecasting (Kaggle Learn)](https://www.kaggle.com/learn/time-series)