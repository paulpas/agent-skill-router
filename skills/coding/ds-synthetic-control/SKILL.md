---
name: ds-synthetic-control
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Implements synthetic control methods, difference-in-differences estimation
  and quasi-experimental designs for impact evaluation"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-causal-inference, ds-intervention-analysis, ds-observational-studies
  role: implementation
  scope: implementation
  triggers: synthetic control, difference-in-differences, DiD, quasi-experiment, impact
    evaluation
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
# Synthetic Control Methods

Comprehensive guide to synthetic control methods in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world causal inference problems
- Building machine learning pipelines with synthetic control methods
- Implementing best practices for synthetic control methods
- Optimizing model performance using synthetic control methods techniques
- Learning industry-standard approaches to synthetic control methods

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require synthetic control methods rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Synthetic Control Methods is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Synthetic Control Methods

```python
import numpy as np
from scipy.optimize import minimize
from typing import Tuple

def compute_synthetic_weights(
    X_donor: np.ndarray, 
    X_treated: np.ndarray, 
    regularization: float = 1e-4
) -> np.ndarray:
    """
    Compute optimal donor weights for synthetic control using constrained optimization.
    
    Args:
        X_donor: (n_donors, n_features) matrix of donor pre-treatment data
        X_treated: (n_features,) vector of treated unit pre-treatment data
        regularization: L2 penalty to prevent overfitting weights
        
    Returns:
        Optimal non-negative weights summing to 1.0
        
    Raises:
        ValueError: If input dimensions are incompatible
    """
    if X_donor.shape[1] != X_treated.shape[0]:
        raise ValueError("Donor features must match treated feature dimensions")
        
    def objective(w: np.ndarray) -> float:
        prediction = X_donor @ w
        residual = X_treated - prediction
        return float(np.sum(residual**2) + regularization * np.sum(w**2))
        
    constraints = (
        {'type': 'eq', 'fun': lambda w: np.sum(w) - 1.0}
        {'type': 'ineq', 'fun': lambda w: w}
    )
    
    n_donors = X_donor.shape[0]
    initial_weights = np.ones(n_donors) / n_donors
    
    result = minimize(
        objective, 
        initial_weights, 
        constraints=constraints, 
        method='SLSQP'
        options={'maxiter': 1000, 'ftol': 1e-9}
    )
    
    if not result.success:
        raise RuntimeError(f"Weight optimization failed: {result.message}")
        
    return result.x
```

### Pattern 2: Production-Ready Synthetic Control Methods

```python
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
from scipy.optimize import minimize

logger = logging.getLogger(__name__)

class SyntheticControlEstimator:
    """Production-grade Synthetic Control Method estimator with DiD support."""
    
    def __init__(self, regularization: float = 1e-4, max_iter: int = 1000) -> None:
        self.regularization = regularization
        self.max_iter = max_iter
        self.weights_: Optional[np.ndarray] = None
        self.pre_error_: Optional[float] = None
        self.post_error_: Optional[float] = None
        
    def _optimize_weights(self, X_donor: np.ndarray, X_treated: np.ndarray) -> np.ndarray:
        """Find non-negative weights summing to 1 that minimize pre-treatment error."""
        def loss(w: np.ndarray) -> float:
            pred = X_donor @ w
            error = X_treated - pred
            return float(np.sum(error**2) + self.regularization * np.sum(w**2))
            
        constraints = (
            {'type': 'eq', 'fun': lambda w: np.sum(w) - 1.0}
            {'type': 'ineq', 'fun': lambda w: w}
        )
        
        n_donors = X_donor.shape[0]
        w0 = np.ones(n_donors) / n_donors
        
        res = minimize(
            loss, w0, constraints=constraints, method='SLSQP'
            options={'maxiter': self.max_iter}
        )
        if not res.success:
            logger.warning(f"Weight optimization did not converge: {res.message}")
        return res.x
        
    def fit_predict(
        self, 
        donor_data: pd.DataFrame, 
        treated_data: pd.DataFrame, 
        period_col: str = 'period', 
        treated_unit_id: str = 'treated'
    ) -> Dict[str, Any]:
        """Fit SCM and predict counterfactual outcomes."""
        if donor_data.empty or treated_data.empty:
            raise ValueError("Input DataFrames cannot be empty")
            
        donor_pre = donor_data[donor_data[period_col] < 0].drop(columns=[treated_unit_id])
        treated_pre = treated_data[treated_data[period_col] < 0].drop(columns=[treated_unit_id])
        
        X_donor = donor_pre.values
        X_treated = treated_pre.values.flatten()
        
        self.weights_ = self._optimize_weights(X_donor, X_treated)
        self.pre_error_ = float(np.mean((X_treated - X_donor @ self.weights_)**2))
        
        donor_post = donor_data[donor_data[period_col] >= 0].drop(columns=[treated_unit_id])
        counterfactual = donor_post.values @ self.weights_
        
        return {
            'weights': self.weights_
            'pre_mse': self.pre_error_
            'counterfactual': counterfactual
            'status': 'success'
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

```python
# BAD: Hardcoded values, no validation, violates DRY principle
def bad_scm(data):
    w = [0.1, 0.2, 0.3, 0.4]  # Magic numbers
    return sum(w) * data['y']

# GOOD: Type hints, validation, configurable parameters, follows SOLID/DRY
def good_scm(
    donor_matrix: np.ndarray, 
    target_vector: np.ndarray, 
    reg_lambda: float = 1e-3
) -> np.ndarray:
    if donor_matrix.shape[1] != target_vector.shape[0]:
        raise ValueError("Dimension mismatch")
    weights = compute_synthetic_weights(donor_matrix, target_vector, reg_lambda)
    return weights
```

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

- [Synthetic Control Method — Wikipedia](https://en.wikipedia.org/wiki/Synthetic_control_method)
- [CausalImpact — Bayesian Structural Time Series (Google)](https://github.com/google/CausalImpact)
- [Synthetic Controls for Policy Evaluation (NBER Paper)](https://www.nber.org/papers/w13519)
- [Double Machine Learning for Causal Inference](https://github.com/PythonRegressionsML/doubleml)
- [Time Series Counterfactuals — Microsoft DoWhy](https://microsoft.github.io/dowy/)