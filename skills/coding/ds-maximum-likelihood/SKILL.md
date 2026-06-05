---




name: ds-maximum-likelihood
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: Implements maximum likelihood estimation, likelihood functions, and optimization
  methods for parameter estimation in probabilistic models
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-bayesian-inference, ds-distribution-fitting, ds-hypothesis-testing
    ds-linear-regression ds-monte-carlo
  role: implementation
  scope: implementation
  triggers: maximum likelihood, MLE, likelihood estimation, likelihood function, optimization
    performance, speed
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




# Maximum Likelihood Estimation

Comprehensive guide to maximum likelihood estimation in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world statistical inference problems
- Building machine learning pipelines with maximum likelihood estimation
- Implementing best practices for maximum likelihood estimation
- Optimizing model performance using maximum likelihood estimation techniques
- Learning industry-standard approaches to maximum likelihood estimation

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require maximum likelihood estimation rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Maximum Likelihood Estimation is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Maximum Likelihood Estimation

```python
import numpy as np
from scipy.optimize import minimize
from scipy.stats import norm

def negative_log_likelihood(params: np.ndarray, data: np.ndarray) -> float:
    """Calculate negative log-likelihood for Gaussian distribution."""
    mu, sigma = params
    if sigma <= 0:
        return np.inf
    return -np.sum(norm.logpdf(data, loc=mu, scale=sigma))

def basic_mle(data: np.ndarray) -> dict:
    """
    Perform basic Maximum Likelihood Estimation for Gaussian parameters.
    
    Args:
        data: 1D array of observations
        
    Returns:
        Dictionary containing estimated parameters and optimization status
    """
    if data is None or len(data) == 0:
        raise ValueError("Input data cannot be empty")
        
    initial_guess = np.array([np.mean(data), np.std(data)])
    result = minimize(
        negative_log_likelihood, 
        initial_guess, 
        args=(data,), 
        method='Nelder-Mead'
    )
    
    if not result.success:
        raise RuntimeError(f"MLE optimization failed: {result.message}")
        
    return {
        'mu': result.x[0]
        'sigma': result.x[1]
        'log_likelihood': -result.fun
        'converged': result.success
    }

# Generate sample data and run estimation
np.random.seed(42)
sample_data = np.random.normal(loc=5.0, scale=2.0, size=1000)
mle_results = basic_mle(sample_data)
print(f"Estimated mu: {mle_results['mu']:.4f}, sigma: {mle_results['sigma']:.4f}")
```

### Pattern 2: Production-Ready Maximum Likelihood Estimation

```python
import logging
import pandas as pd
import numpy as np
from scipy.optimize import minimize
from scipy.stats import norm
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

class MaximumLikelihoodEstimator:
    """Production implementation of Maximum Likelihood Estimation for Gaussian distributions."""
    
    def __init__(self, method: str = 'Nelder-Mead', tol: float = 1e-6):
        self.method = method
        self.tol = tol
        self.results_: Dict[str, Any] = {}
        
    def _negative_log_likelihood(self, params: List[float], data: np.ndarray) -> float:
        mu, sigma = params
        if sigma <= 0:
            return np.inf
        return -np.sum(np.log(norm.pdf(data, loc=mu, scale=sigma)))
        
    def fit(self, data: pd.DataFrame, column: str) -> 'MaximumLikelihoodEstimator':
        if column not in data.columns:
            raise ValueError(f"Column '{column}' not found in DataFrame")
        values = data[column].dropna().values
        if len(values) == 0:
            raise ValueError("No valid data points found in specified column")
            
        initial_guess = [np.mean(values), np.std(values)]
        result = minimize(
            self._negative_log_likelihood, 
            initial_guess, 
            args=(values,), 
            method=self.method
            tol=self.tol
        )
        
        if not result.success:
            logger.warning(f"MLE optimization did not converge: {result.message}")
            
        self.results_ = {
            'parameters': {'mu': result.x[0], 'sigma': result.x[1]}
            'log_likelihood': -result.fun
            'converged': result.success
            'iterations': result.nit
        }
        return self
        
    def execute(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Return the fitted results. Requires fit() to be called first."""
        if not self.results_:
            raise RuntimeError("Model has not been fitted. Call fit() first.")
        return self.results_
```

### Pattern 3: BAD vs GOOD Implementation (DRY Principle)

```python
# BAD: Repeated likelihood calculations, no error handling, magic numbers
def bad_mle(data):
    mu = sum(data) / len(data)
    sigma = sum((x - mu)**2 for x in data) / len(data)
    return mu, sigma  # Ignores optimization, uses MLE closed-form incorrectly for small samples

# GOOD: Modular, validated, uses scipy optimizer, follows DRY principle
def good_mle(data: np.ndarray) -> Dict[str, float]:
    if len(data) < 2:
        raise ValueError("Need at least 2 points for reliable estimation")
    def nll(p):
        return -np.sum(norm.logpdf(data, loc=p[0], scale=p[1]))
    res = minimize(nll, [np.mean(data), np.std(data)], method='L-BFGS-B')
    return {'mu': res.x[0], 'sigma': res.x[1], 'll': -res.fun}
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

- [Maximum Likelihood Estimation — Wikipedia](https://en.wikipedia.org/wiki/Maximum_likelihood_estimation)
- [MLE with SciPy Optimization](https://docs.scipy.org/doc/scipy/tutorial/stats/mle.html)
- [Statistical Inference — Coursera (Johns Hopkins)](https://www.coursera.org/learn/statistical-inference)
- [MLE Guide (Stanford Statistics 312)](https://web.stanford.edu/class/stats312/)
- [Optimization Methods in SciPy](https://docs.scipy.org/doc/scipy/tutorial/optimize.html#maximum-likelihood-estimation)