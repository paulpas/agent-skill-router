---
name: ds-instrumental-variables
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Uses instrumental variables (IV), two-stage least squares
  (2SLS), and IV estimation to identify causal effects in observational data"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-causal-inference, ds-linear-regression, ds-observational-studies
  role: implementation
  scope: implementation
  triggers: instrumental variables, IV, 2SLS, endogeneity, causal effect, how do i
    handle endogeneity
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
# Instrumental Variables

Comprehensive guide to instrumental variables in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world causal inference problems
- Building machine learning pipelines with instrumental variables
- Implementing best practices for instrumental variables
- Optimizing model performance using instrumental variables techniques
- Learning industry-standard approaches to instrumental variables

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require instrumental variables rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Instrumental Variables is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Instrumental Variables

```python
import pandas as pd
import numpy as np
import statsmodels.api as sm

def basic_iv_2sls(X: pd.DataFrame, Z: pd.DataFrame, y: pd.Series) -> dict:
    """
    Perform Two-Stage Least Squares (2SLS) estimation.
    X: Endogenous regressors (n, k)
    Z: Instruments (n, l) including exogenous variables
    y: Dependent variable (n,)
    """
    if X.shape[0] != Z.shape[0] or X.shape[0] != y.shape[0]:
        raise ValueError("Sample sizes must match")
    
    # Stage 1: Regress X on Z to get predicted values
    X_with_const = sm.add_constant(X)
    Z_with_const = sm.add_constant(Z)
    
    stage1_results = sm.OLS(X_with_const, Z_with_const).fit()
    X_hat = stage1_results.fittedvalues
    
    # Stage 2: Regress y on predicted X_hat
    stage2_results = sm.OLS(y, X_hat).fit()
    
    return {
        'coefficients': stage2_results.params.values
        'standard_errors': stage2_results.bse.values
        'r_squared': stage2_results.rsquared
        'f_statistic': stage2_results.fvalue
        'stage1_f_statistic': stage1_results.fvalue
    }

# Generate synthetic data with endogeneity
np.random.seed(42)
n = 500
Z = np.random.randn(n, 2)  # Instruments
X = 0.5 * Z[:, 0] + 0.3 * Z[:, 1] + np.random.randn(n) * 0.5  # Endogenous
u = np.random.randn(n) * 0.5
y = 2.0 * X + 1.5 * Z[:, 0] + u  # True model with endogeneity bias in OLS
df_X = pd.DataFrame(X, columns=['x1'])
df_Z = pd.DataFrame(Z, columns=['z1', 'z2'])
series_y = pd.Series(y, name='y')

results = basic_iv_2sls(df_X, df_Z, series_y)
print(f"IV Coefficients: {results['coefficients']}")
print(f"Stage 1 F-stat: {results['stage1_f_statistic']:.2f}")
```

### Pattern 2: Production-Ready Instrumental Variables

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List, Union
import statsmodels.api as sm

logger = logging.getLogger(__name__)

class InstrumentalVariables:
    """Production implementation of Instrumental Variables (2SLS)"""
    
    def __init__(self, instrument_cols: List[str], endog_cols: List[str], 
                 exog_cols: List[str] = None, alpha: float = 0.05):
        self.instrument_cols = instrument_cols
        self.endog_cols = endog_cols
        self.exog_cols = exog_cols or []
        self.alpha = alpha
        self.model = None
        self.results = None
        
    def _validate_data(self, data: pd.DataFrame) -> None:
        required = self.instrument_cols + self.endog_cols + self.exog_cols
        missing = [col for col in required if col not in data.columns]
        if missing:
            raise ValueError(f"Missing columns: {missing}")
        if data.isnull().any().any():
            raise ValueError("Input data contains NaN values")
            
    def fit(self, data: pd.DataFrame) -> 'InstrumentalVariables':
        self._validate_data(data)
        X = data[self.endog_cols + self.exog_cols]
        Z = data[self.instrument_cols + self.exog_cols]
        y = data['target']
        
        X_const = sm.add_constant(X)
        Z_const = sm.add_constant(Z)
        
        stage1 = sm.OLS(X_const, Z_const).fit()
        X_hat = stage1.fittedvalues
        
        self.results = sm.OLS(y, X_hat).fit()
        self.model = self.results
        logger.info(f"IV model fitted. R-squared: {self.results.rsquared:.4f}")
        return self
        
    def predict(self, data: pd.DataFrame) -> np.ndarray:
        if self.results is None:
            raise RuntimeError("Model must be fitted before prediction")
        X = data[self.endog_cols + self.exog_cols]
        Z = data[self.instrument_cols + self.exog_cols]
        X_const = sm.add_constant(X)
        Z_const = sm.add_constant(Z)
        stage1 = sm.OLS(X_const, Z_const).fit()
        X_hat = stage1.fittedvalues
        return self.results.predict(X_hat)
        
    def execute(self, data: pd.DataFrame) -> Dict[str, Any]:
        self.fit(data)
        predictions = self.predict(data)
        return {
            'status': 'success'
            'coefficients': self.results.params.to_dict()
            'p_values': self.results.pvalues.to_dict()
            'confidence_intervals': self.results.conf_int(self.alpha).to_dict()
            'predictions': predictions.tolist()
            'r_squared': self.results.rsquared
            'aic': self.results.aic
            'bic': self.results.bic
        }
```

### Pattern 3: Anti-Patterns vs Best Practices (BAD vs GOOD)

```python
# BAD: Hardcoded values, no validation, ignores instrument relevance
def bad_iv_implementation(df):
    X = df['x']
    Z = df['z']
    y = df['y']
    # Assumes perfect correlation, no stage 1 check
    beta = np.sum(y * Z) / np.sum(X * Z)
    return beta

# GOOD: Validates assumptions, checks first-stage strength, returns structured output
def good_iv_implementation(df: pd.DataFrame, z_col: str, x_col: str, y_col: str) -> Dict[str, Any]:
    if df[z_col].corr(df[x_col]) < 0.3:
        raise ValueError("Weak instrument detected: correlation < 0.3")
    # Proper 2SLS with constant and error handling
    X_const = sm.add_constant(df[x_col])
    Z_const = sm.add_constant(df[z_col])
    stage1 = sm.OLS(X_const, Z_const).fit()
    if stage1.fvalue < 10:
        logger.warning("Weak instrument warning: First-stage F-stat < 10")
    X_hat = stage1.fittedvalues
    iv_res = sm.OLS(df[y_col], X_hat).fit()
    return {'coefficient': iv_res.params.iloc[1], 'p_value': iv_res.pvalues.iloc[1]}
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

- [Instrumental Variables Estimation — Wikipedia](https://en.wikipedia.org/wiki/Instrumental_variables_estimation)
- [Statsmodels IV2SLS Documentation](https://www.statsmodels.org/stable/regression.html#instrumental-variable-regression)
- [Causal Inference with IV (MIT OpenCourseWare)](https://ocw.mit.edu/courses/economics-141-econometrics-fall-2008/)
- [LIML and IV Estimation (Econometrics Academy)](https://www.econometrics-with-r.org/6.2-instrumental-regression.html)
- [Two-Stage Least Squares — Khan Academy](https://www.khanacademy.org/economics-finance-domain/microeconomics/supply-demand-curves/a/two-stage-least-squares)