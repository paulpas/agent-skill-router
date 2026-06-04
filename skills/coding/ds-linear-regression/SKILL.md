---
name: ds-linear-regression
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Implements linear regression including OLS, ridge regression, lasso
  elastic net, and other regularized linear models for prediction"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-feature-engineering, ds-feature-scaling-normalization, ds-instrumental-variables
    ds-logistic-regression ds-regression-evaluation
  role: implementation
  scope: implementation
  triggers: linear regression, OLS, ridge regression, lasso, elastic net, regularization
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
version: "1.0.0"
---
# Linear Regression

Comprehensive guide to linear regression in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world supervised learning problems
- Building machine learning pipelines with linear regression
- Implementing best practices for linear regression
- Optimizing model performance using linear regression techniques
- Learning industry-standard approaches to linear regression

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require linear regression rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Linear Regression is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Linear Regression

```python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

# Generate synthetic regression data for demonstration
X, y = np.random.randn(500, 5), np.random.randn(500)
df = pd.DataFrame(X, columns=[f'feature_{i}' for i in range(5)])
df['target'] = y

# Split data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(
    df.drop('target', axis=1), df['target'], test_size=0.2, random_state=42
)

# Initialize and train the OLS model
model = LinearRegression()
model.fit(X_train, y_train)

# Generate predictions and compute evaluation metrics
y_pred = model.predict(X_test)
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"Mean Squared Error: {mse:.4f}")
print(f"R² Score: {r2:.4f}")
print(f"Coefficients: {model.coef_}")
print(f"Intercept: {model.intercept_:.4f}")
```

### Pattern 2: Production-Ready Linear Regression

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

class LinearRegressionPipeline:
    """Production-ready linear regression with validation and metrics."""
    
    def __init__(self, random_state: int = 42) -> None:
        self.random_state = random_state
        self.model = LinearRegression()
        self.scaler = StandardScaler()
        self.is_fitted: bool = False
        
    def _validate_input(self, data: pd.DataFrame) -> pd.DataFrame:
        """Validate input DataFrame for numeric compatibility."""
        if data.empty:
            raise ValueError("Input DataFrame cannot be empty.")
        numeric_cols = data.select_dtypes(include='number')
        if numeric_cols.shape[1] == 0:
            raise ValueError("All columns must be numeric for linear regression.")
        return data
        
    def execute(self, data: pd.DataFrame, target_col: str = 'target') -> Dict[str, Any]:
        """Execute linear regression pipeline on provided data."""
        try:
            df = self._validate_input(data)
            X = df.drop(columns=[target_col])
            y = df[target_col]
            
            # Scale features for numerical stability and convergence
            X_scaled = self.scaler.fit_transform(X)
            
            # Train model on scaled data
            self.model.fit(X_scaled, y)
            self.is_fitted = True
            
            # Predict and evaluate performance
            y_pred = self.model.predict(X_scaled)
            mae = mean_absolute_error(y, y_pred)
            r2 = r2_score(y, y_pred)
            
            return {
                'status': 'success'
                'mae': float(mae)
                'r2_score': float(r2)
                'coefficients': self.model.coef_.tolist()
                'intercept': float(self.model.intercept_)
                'feature_names': X.columns.tolist()
            }
        except Exception as e:
            logger.error(f"Regression pipeline failed: {e}")
            return {'status': 'error', 'message': str(e)}
```

### BAD vs GOOD Implementation

```python
# BAD: Hardcoded values, no validation, bypasses error handling, violates DRY
def bad_regression(df):
    X = df.iloc[:, :5]
    y = df.iloc[:, 5]
    model = LinearRegression()
    model.fit(X, y)
    return model.predict(X)

# GOOD: Type hints, validation, modular design, follows SOLID/DRY principles
def good_regression(df: pd.DataFrame, target: str = 'target') -> Dict[str, Any]:
    if df.empty:
        raise ValueError("DataFrame cannot be empty")
    X = df.drop(columns=[target])
    y = df[target]
    model = LinearRegression()
    model.fit(X, y)
    return {'predictions': model.predict(X), 'coefficients': model.coef_}
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
- Validate linearity assumption using residual plots before interpreting coefficients
- Check for multicollinearity using VIF (Variance Inflation Factor) — flag any predictor with VIF > 10
- Standardize or normalize features before regularization (Ridge, Lasso, ElasticNet)
- Report both R-squared and adjusted R-squared, and include confidence intervals for all coefficients

### MUST NOT DO
- Do not interpret correlation as causation from regression output without controlled experiments
- Avoid including dummy variables for all categories without dropping one reference category (dummy variable trap)
- Never use OLS on time series data without checking for stationarity — leads to spurious regression
- Do not report R-squared alone; always include residual diagnostics and cross-validated error metrics


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Linear Regression — Wikipedia](https://en.wikipedia.org/wiki/Linear_regression)
- [Statsmodels OLS Documentation](https://www.statsmodels.org/)
- [Scikit-learn Linear Model](https://scikit-learn.org/stable/modules/linear_model.html#ordinary-least-squares)
- [Simple Linear Regression (Khan Academy)](https://www.khanacademy.org/math/statistics-probability/describing-relationships-quantitative-data/more-on-the-least-squares-regression-line/a/least-squares-regression-review)
- [Linear Regression Assumptions (NIST)](https://www.itl.nist.gov/div898/handbook/eckol/section4/eckol43.htm)