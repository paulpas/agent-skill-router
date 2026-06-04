---
name: ds-regression-evaluation
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Evaluates regression models using MSE, RMSE, MAE, MAPE, R-squared
  and other metrics for assessing predictive accuracy"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-cross-validation, ds-linear-regression, ds-metrics-and-kpis
    ds-time-series-forecasting ds-model-selection
  role: implementation
  scope: implementation
  triggers: regression evaluation, MSE, RMSE, MAE, R-squared, regression metrics
    how do i evaluate
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
# Regression Evaluation

Comprehensive guide to regression evaluation in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world supervised learning problems
- Building machine learning pipelines with regression evaluation
- Implementing best practices for regression evaluation
- Optimizing model performance using regression evaluation techniques
- Learning industry-standard approaches to regression evaluation

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require regression evaluation rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Regression Evaluation is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Regression Evaluation

```python
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from typing import Dict, Tuple

def basic_regression_evaluation(X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
    """Train a linear regression model and compute core evaluation metrics."""
    if X.shape[0] != y.shape[0]:
        raise ValueError("X and y must have the same number of samples")
    if X.ndim != 2 or y.ndim != 1:
        raise ValueError("X must be 2D array and y must be 1D array")
        
    test_ratio: float = 0.2
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_ratio, random_state=42
    )
    
    model = LinearRegression()
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    
    metrics: Dict[str, float] = {
        'mse': float(mean_squared_error(y_test, y_pred))
        'rmse': float(np.sqrt(mean_squared_error(y_test, y_pred)))
        'mae': float(mean_absolute_error(y_test, y_pred))
        'r2': float(r2_score(y_test, y_pred))
    }
    return metrics
```

### Pattern 2: Production-Ready Regression Evaluation

```python
import logging
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

class RegressionEvaluator:
    """Production-grade regression evaluation with comprehensive metrics and logging."""
    
    def __init__(self, test_size: float = 0.2, random_state: int = 42) -> None:
        self.test_size: float = test_size
        self.random_state: int = random_state
        self.model: Optional[RandomForestRegressor] = None
        
    def evaluate(self, X: pd.DataFrame, y: pd.Series) -> Dict[str, Any]:
        """Evaluate regression performance on provided data."""
        if X.empty or y.empty:
            raise ValueError("Input data cannot be empty")
        if X.shape[0] != y.shape[0]:
            raise ValueError("X and y must have matching row counts")
            
        logger.info("Starting regression evaluation pipeline")
        
        X_train, X_test, y_train, y_test = self._split_data(X, y)
        self.model = RandomForestRegressor(n_estimators=100, random_state=self.random_state)
        self.model.fit(X_train, y_train)
        y_pred = self.model.predict(X_test)
        
        metrics: Dict[str, Any] = {
            'mse': float(mean_squared_error(y_test, y_pred))
            'rmse': float(np.sqrt(mean_squared_error(y_test, y_pred)))
            'mae': float(mean_absolute_error(y_test, y_pred))
            'r2': float(r2_score(y_test, y_pred))
            'mape': float(np.mean(np.abs((y_test - y_pred) / y_test)) * 100)
        }
        logger.info(f"Evaluation complete. R2: {metrics['r2']:.4f}")
        return metrics
        
    def _split_data(self, X: pd.DataFrame, y: pd.Series) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
        """Split data into training and testing sets."""
        from sklearn.model_selection import train_test_split
        return train_test_split(X, y, test_size=self.test_size, random_state=self.random_state)
```

### Pattern 3: BAD vs GOOD Evaluation Practices

**BAD:** Computing metrics on training data without validation, using hardcoded values, and ignoring dimension checks
```python
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

def bad_evaluation(X: pd.DataFrame, y: pd.Series) -> float:
    """Bad practice: no test split, hardcoded parameters, missing validation."""
    model = LinearRegression()
    model.fit(X, y)
    y_pred = model.predict(X)
    score = r2_score(y, y_pred)
    return score  # Returns overfit metric, no error handling, no type hints
```

**GOOD:** Proper train/test split with comprehensive metric reporting, explicit validation, and type hints
```python
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from typing import Dict, Tuple

def good_evaluation(X: pd.DataFrame, y: pd.Series) -> Dict[str, float]:
    """Good practice: proper split, validation, type hints, and multiple metrics."""
    if X.shape[0] != y.shape[0]:
        raise ValueError("Dimension mismatch between features and targets")
    if X.isnull().any().any() or y.isnull().any():
        raise ValueError("Input data contains missing values")
        
    test_ratio: float = 0.2
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_ratio, random_state=42
    )
    
    model = LinearRegression()
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    
    metrics: Dict[str, float] = {
        'r2': float(r2_score(y_test, y_pred))
        'rmse': float(np.sqrt(mean_squared_error(y_test, y_pred)))
        'mae': float(mean_absolute_error(y_test, y_pred))
    }
    return metrics
```

## Best Practices

- ✅ Always validate your implementation on test data
- ✅ Document your assumptions and methodology
- ✅ Use version control for reproducibility
- ✅ Monitor performance metrics in production
- ✅ Periodically review and update your approach
- ✅ Test with edge cases and outliers
- ✅ Log all significant operations for debugging
- ✅ Adhere to SOLID principles to keep evaluation logic modular, testable, and maintainable

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

- [Scikit-learn Model Evaluation — Regression Metrics](https://scikit-learn.org/stable/modules/model_evaluation.html#regression-metrics)
- [Mean Squared Error, R² — Scikit-learn docs](https://scikit-learn.org/stable/modules/model_evaluation.html#mean-squared-error)
- [Residual Analysis (NIST Handbook)](https://www.itl.nist.gov/div898/handbook/tq/section4/tq_3.htm)
- [Regression Diagnostics — Wikipedia](https://en.wikipedia.org/wiki/Regression_analysis#Diagnostics)
- [Cross-Validation for Regression (Kaggle Learn)](https://www.kaggle.com/learn/cross-validation)