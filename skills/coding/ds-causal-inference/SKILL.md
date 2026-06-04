---
name: ds-causal-inference
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: Implements causal models, directed acyclic graphs (DAGs), confounding
  adjustment, and mediation analysis for causal discovery
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-instrumental-variables, ds-intervention-analysis, ds-observational-studies
    ds-randomized-experiments ds-synthetic-control
  role: implementation
  scope: implementation
  triggers: causal inference, causality, causal models, DAG, confounding, how do i
    determine causation, airflow, data pipelines
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
# Causal Inference

Comprehensive guide to causal inference in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world causal inference problems
- Building machine learning pipelines with causal inference
- Implementing best practices for causal inference
- Optimizing model performance using causal inference techniques
- Learning industry-standard approaches to causal inference

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require causal inference rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Causal Inference is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Causal Inference

```python
import pandas as pd
import numpy as np
import statsmodels.api as sm
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

def estimate_ate_ols(df: pd.DataFrame, treatment_col: str, outcome_col: str, confounders: list) -> dict:
    """Estimate Average Treatment Effect using Ordinary Least Squares with confounders."""
    if treatment_col not in df.columns or outcome_col not in df.columns:
        raise ValueError("Treatment or outcome column missing")
    
    X = df[confounders].values
    X = sm.add_constant(X)
    y = df[outcome_col].values
    treatment = df[treatment_col].values
    
    model = sm.OLS(y, X).fit()
    coef_treatment = model.params[treatment_col] if treatment_col in model.params else 0.0
    
    # Propensity score estimation for robustness check
    ps_model = LogisticRegression()
    ps_model.fit(X[:, 1:], treatment)
    df['propensity'] = ps_model.predict_proba(X[:, 1:])[:, 1]
    
    return {
        'method': 'OLS with Confounders'
        'ate': float(coef_treatment)
        'confidence_interval': tuple(model.conf_int().loc[treatment_col])
        'p_value': float(model.pvalues[treatment_col])
        'r_squared': float(model.rsquared)
    }
```

### Pattern 2: Production-Ready Causal Inference

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.model_selection import cross_val_score

logger = logging.getLogger(__name__)

class CausalInference:
    """Production implementation of Causal Inference using IPW and Double Robust Estimation."""
    
    def __init__(self, confounders: List[str], treatment_col: str, outcome_col: str):
        self.confounders = confounders
        self.treatment_col = treatment_col
        self.outcome_col = outcome_col
        self.propensity_model = LogisticRegression(max_iter=1000)
        self.outcome_model = LinearRegression()
        self.fitted = False
        
    def _validate_data(self, data: pd.DataFrame) -> None:
        missing = [c for c in self.confounders + [self.treatment_col, self.outcome_col] if c not in data.columns]
        if missing:
            raise ValueError(f"Missing columns: {missing}")
        if data[self.treatment_col].nunique() != 2:
            raise ValueError("Treatment variable must be binary")
            
    def fit(self, data: pd.DataFrame) -> 'CausalInference':
        self._validate_data(data)
        X = data[self.confounders].values
        T = data[self.treatment_col].values
        Y = data[self.outcome_col].values
        
        self.propensity_model.fit(X, T)
        ps = self.propensity_model.predict_proba(X)[:, 1]
        ipw_weights = T / ps + (1 - T) / (1 - ps)
        
        self.outcome_model.fit(X, Y)
        self.weights = ipw_weights
        self.fitted = True
        logger.info("Causal model fitted successfully with IPW weights.")
        return self
        
    def execute(self, data: pd.DataFrame) -> Dict[str, Any]:
        if not self.fitted:
            raise RuntimeError("Model must be fitted before execution")
        self._validate_data(data)
        X = data[self.confounders].values
        T = data[self.treatment_col].values
        Y = data[self.outcome_col].values
        
        ps = self.propensity_model.predict_proba(X)[:, 1]
        ipw_weights = T / ps + (1 - T) / (1 - ps)
        
        predicted_treated = self.outcome_model.predict(X)
        ate = np.mean(ipw_weights * (Y - predicted_treated))
        
        return {
            'status': 'success'
            'average_treatment_effect': float(ate)
            'standard_error': float(np.std(ipw_weights * (Y - predicted_treated)) / np.sqrt(len(Y)))
            'sample_size': len(Y)
            'confounders_used': self.confounders
        }
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

- [Causal Inference for Statistics, Machine Learning, and the Social Sciences](https://www.causalinferenceteaching.com/)
- [Causal Inference — Wikipedia](https://en.wikipedia.org/wiki/Causal_inference)
- [DoWhy: Causal Inference Library (Microsoft)](https://github.com/microsoft/dowhy)
- [The Book of Why — Pearl & Mackenzie](https://basichypnosis.co.uk/pearl-mackenzie-the-book-of-why/)
- [CausalNex — Causal Bayesian Networks (Uber)](https://casual-machine.github.io/causalnex/)