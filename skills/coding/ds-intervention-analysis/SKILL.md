---
name: ds-intervention-analysis
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Estimates treatment effects, conditional average treatment
  effects (CATE), heterogeneous effects, and individual treatment responses"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-causal-inference, ds-observational-studies, ds-randomized-experiments
    ds-synthetic-control ds-synthetic-control
  role: implementation
  scope: implementation
  triggers: treatment effects, intervention analysis, CATE, heterogeneous effects
    treatment response
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
# Intervention Analysis

Comprehensive guide to intervention analysis in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world causal inference problems
- Building machine learning pipelines with intervention analysis
- Implementing best practices for intervention analysis
- Optimizing model performance using intervention analysis techniques
- Learning industry-standard approaches to intervention analysis

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require intervention analysis rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Intervention Analysis is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Intervention Analysis

```python
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from typing import Dict, Any

def estimate_ate_propensity_score(data: pd.DataFrame, treatment_col: str, outcome_col: str) -> Dict[str, Any]:
    """Estimate Average Treatment Effect using Propensity Score Weighting (IPTW)."""
    if treatment_col not in data.columns or outcome_col not in data.columns:
        raise ValueError(f"Columns '{treatment_col}' and '{outcome_col}' must exist in data.")
    
    X = data.drop(columns=[treatment_col, outcome_col])
    y_treatment = data[treatment_col]
    y_outcome = data[outcome_col]
    
    # Step 1: Estimate propensity scores (probability of treatment)
    propensity_model = LogisticRegression(max_iter=1000, random_state=42)
    propensity_model.fit(X, y_treatment)
    propensity_scores = propensity_model.predict_proba(X)[:, 1]
    
    # Step 2: Calculate Inverse Probability of Treatment Weight (IPTW)
    weights = np.where(y_treatment == 1, 1.0 / propensity_scores, 1.0 / (1.0 - propensity_scores))
    
    # Step 3: Weighted outcome estimation for ATE
    treated_mask = y_treatment == 1
    weighted_treated = np.sum(weights[treated_mask] * y_outcome[treated_mask]) / np.sum(weights[treated_mask])
    weighted_control = np.sum(weights[~treated_mask] * y_outcome[~treated_mask]) / np.sum(weights[~treated_mask])
    ate = weighted_treated - weighted_control
    
    return {
        'ate': float(ate)
        'propensity_scores': propensity_scores
        'weights': weights
        'treated_mean': float(weighted_treated)
        'control_mean': float(weighted_control)
    }
```

### Pattern 2: Production-Ready Intervention Analysis

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score

logger = logging.getLogger(__name__)

class InterventionAnalysis:
    """Production implementation of Intervention Analysis using T-Learner CATE estimation."""
    
    def __init__(self, n_estimators: int = 100, random_state: int = 42):
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.treatment_model = None
        self.outcome_model = None
        
    def _validate_input(self, data: pd.DataFrame) -> None:
        required_cols = ['treatment', 'outcome', 'features']
        missing = [col for col in required_cols if col not in data.columns]
        if missing:
            raise ValueError(f"Missing required columns: {missing}")
        if data['treatment'].nunique() != 2:
            raise ValueError("Treatment column must be binary (0 or 1).")
            
    def fit(self, data: pd.DataFrame) -> 'InterventionAnalysis':
        self._validate_input(data)
        X = data['features']
        y_treatment = data['treatment']
        y_outcome = data['outcome']
        
        # T-Learner: Train separate models for treated and control groups
        self.treatment_model = RandomForestRegressor(n_estimators=self.n_estimators, random_state=self.random_state)
        self.outcome_model = RandomForestRegressor(n_estimators=self.n_estimators, random_state=self.random_state)
        
        treated_idx = y_treatment == 1
        control_idx = y_treatment == 0
        
        self.treatment_model.fit(X[treated_idx], y_outcome[treated_idx])
        self.outcome_model.fit(X[control_idx], y_outcome[control_idx])
        
        logger.info("T-Learner models fitted successfully.")
        return self
        
    def predict_cate(self, X: pd.DataFrame) -> np.ndarray:
        if self.treatment_model is None or self.outcome_model is None:
            raise RuntimeError("Model must be fitted before prediction.")
        cate_treated = self.treatment_model.predict(X)
        cate_control = self.outcome_model.predict(X)
        return cate_treated - cate_control
        
    def evaluate(self, data: pd.DataFrame) -> Dict[str, Any]:
        X = data['features']
        cate = self.predict_cate(X)
        mse = np.mean((self.treatment_model.predict(X) - self.outcome_model.predict(X)) ** 2)
        return {'cate_mean': float(np.mean(cate)), 'cate_std': float(np.std(cate)), 'baseline_mse': float(mse)}
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

- [Intervention Analysis — Wikipedia](https://en.wikipedia.org/wiki/Intervention_analysis)
- [statsmodels SARIMAX (Intervention/Dummy Variables)](https://www.statsmodels.org/stable/generated/statsmodels.tsa.statespace.SARIMAX.html)
- [Time Series Intervention Detection (NIST Handbook)](https://www.itl.nist.gov/div898/handbook/tsa/section3/tsa36.htm)
- [CausalImpact — Bayesian Structural Time Series (Google)](https://github.com/google/CausalImpact)
- [Interrupted Time Series Analysis (Journal of Clinical Epidemiology)](https://www.sciencedirect.com/science/article/pii/S0895435617305133)