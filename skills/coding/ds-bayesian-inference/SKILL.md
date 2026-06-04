---
name: ds-bayesian-inference
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Applies Bayesian methods for prior selection, posterior estimation
  and probabilistic inference in machine learning models"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-confidence-intervals, ds-hypothesis-testing, ds-maximum-likelihood
    ds-monte-carlo ds-monte-carlo
  role: implementation
  scope: implementation
  triggers: bayesian inference, bayes, prior, posterior, probabilistic inference
    how do i do bayesian
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
# Bayesian Inference

Comprehensive guide to bayesian inference in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world statistical inference problems
- Building machine learning pipelines with bayesian inference
- Implementing best practices for bayesian inference
- Optimizing model performance using bayesian inference techniques
- Learning industry-standard approaches to bayesian inference

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require bayesian inference rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Bayesian Inference is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Bayesian Inference

```python
import numpy as np
import pandas as pd
from scipy import stats
from typing import Tuple, Dict

def bayesian_linear_regression(
    X: np.ndarray, 
    y: np.ndarray, 
    prior_precision: float = 1.0
) -> Dict[str, np.ndarray]:
    """
    Perform Bayesian Linear Regression using conjugate Normal-Gamma priors.
    Computes posterior distribution over regression weights analytically.
    
    Args:
        X: Feature matrix of shape (n_samples, n_features)
        y: Target vector of shape (n_samples,)
        prior_precision: Precision (inverse variance) of the prior on weights
        
    Returns:
        Dictionary containing posterior mean, covariance, and noise variance
    """
    if X.ndim == 1:
        X = X.reshape(-1, 1)
        
    n_samples, n_features = X.shape
    X_b = np.column_stack([np.ones(n_samples), X])
    
    # Initialize prior covariance matrix
    prior_cov = np.eye(n_features + 1) / prior_precision
    
    # Estimate initial noise variance from data
    beta_mle = np.linalg.lstsq(X_b, y, rcond=None)[0]
    residuals = y - X_b @ beta_mle
    sigma2_init = np.sum(residuals**2) / n_samples
    
    # Compute posterior precision and covariance
    posterior_precision = np.linalg.inv(prior_cov) + (1.0 / sigma2_init) * (X_b.T @ X_b)
    posterior_cov = np.linalg.inv(posterior_precision)
    
    # Compute posterior mean
    posterior_mean = posterior_cov @ (
        np.linalg.inv(prior_cov) @ np.zeros(n_features + 1) + 
        (1.0 / sigma2_init) * (X_b.T @ y)
    )
    
    return {
        'posterior_mean': posterior_mean
        'posterior_cov': posterior_cov
        'noise_variance': sigma2_init
        'n_samples': n_samples
        'n_features': n_features
    }
```

### Pattern 2: Production-Ready Bayesian Inference

```python
import logging
import numpy as np
import pandas as pd
from typing import Any, Dict, Optional
from scipy import stats

logger = logging.getLogger(__name__)

class BayesianInferenceEngine:
    """Production-grade Bayesian Inference engine for regression tasks."""
    
    def __init__(self, prior_precision: float = 1.0, confidence_level: float = 0.95) -> None:
        self.prior_precision = prior_precision
        self.confidence_level = confidence_level
        logger.info("BayesianInferenceEngine initialized with prior_precision=%.2f, confidence=%.2f", 
                    prior_precision, confidence_level)
    
    def _validate_input(self, data: pd.DataFrame) -> None:
        if data is None or data.empty:
            raise ValueError("Input data cannot be None or empty")
        if not isinstance(data, pd.DataFrame):
            raise TypeError("Input must be a pandas DataFrame")
        if data.shape[0] < 2:
            raise ValueError("Insufficient data for inference: requires at least 2 samples")
    
    def execute(self, data: pd.DataFrame, target_col: str = 'y') -> Dict[str, Any]:
        """Execute Bayesian inference on provided data and return structured results."""
        self._validate_input(data)
        logger.info("Running Bayesian inference on %d samples", len(data))
        
        X = data.drop(columns=[target_col]).values
        y = data[target_col].values
        
        n, d = X.shape
        X_b = np.column_stack([np.ones(n), X])
        
        prior_cov = np.eye(d + 1) / self.prior_precision
        sigma2 = np.var(y - np.mean(y))
        
        post_prec = np.linalg.inv(prior_cov) + (1.0 / sigma2) * (X_b.T @ X_b)
        post_cov = np.linalg.inv(post_prec)
        post_mean = post_cov @ (np.linalg.inv(prior_cov) @ np.zeros(d + 1) + 
                                (1.0 / sigma2) * (X_b.T @ y))
        
        y_pred = X_b @ post_mean
        pred_var = sigma2 * (1 + np.sum(X_b * (post_cov @ X_b.T), axis=1))
        ci_half_width = stats.norm.ppf((1 + self.confidence_level) / 2) * np.sqrt(pred_var)
        
        return {
            'posterior_mean': post_mean
            'posterior_cov': post_cov
            'predictions': y_pred
            'lower_bound': y_pred - ci_half_width
            'upper_bound': y_pred + ci_half_width
            'noise_variance': sigma2
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

- [PyMC Documentation](https://docs.pymc.io/)
- [Bayesian Inference — Wikipedia](https://en.wikipedia.org/wiki/Bayesian_inference)
- [Bayesian Methods for Hackers](http://camdavidsonpilon.github.io/Probabilistic-Programming-and-Bayesian-Methods-for-Hackers/)
- [Stan User's Guide](https://mc-stan.org/docs/stan-users-guide/index.html)
- [Bayesian A/B Testing (Optimizely)](https://blog.optimizely.com/a-b-testing-best-practices/), |
- [Statistical Rethinking — Richard McElreath](https://github.com/rmcelreath/rethinking)