---




name: ds-distribution-fitting
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Fits statistical distributions to data using goodness-of-fit
  tests, parameter estimation, and distribution selection methods"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-kernel-density, ds-maximum-likelihood, ds-monte-carlo
  role: implementation
  scope: implementation
  triggers: distribution fitting, goodness-of-fit, fitting distributions, distribution
    selection, how do i fit
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




# Distribution Fitting

Comprehensive guide to distribution fitting in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world statistical inference problems
- Building machine learning pipelines with distribution fitting
- Implementing best practices for distribution fitting
- Optimizing model performance using distribution fitting techniques
- Learning industry-standard approaches to distribution fitting

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require distribution fitting rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Distribution Fitting is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Distribution Fitting

```python
import numpy as np
import pandas as pd
from scipy import stats
import matplotlib.pyplot as plt

def basic_distribution_fitting(data: pd.Series) -> dict:
    """Fit a normal distribution to the provided data and return parameters."""
    if data is None or data.empty:
        raise ValueError("Input data cannot be None or empty")

    # Fit a normal distribution using Maximum Likelihood Estimation
    mu, std = stats.norm.fit(data)

    # Perform Kolmogorov-Smirnov test to validate fit
    ks_stat, p_value = stats.kstest(data, 'norm', args=(mu, std))

    # Generate fitted PDF for visualization
    x = np.linspace(data.min(), data.max(), 100)
    pdf = stats.norm.pdf(x, mu, std)

    return {
        "distribution": "normal"
        "parameters": {"mu": mu, "sigma": std}
        "goodness_of_fit": {"ks_statistic": ks_stat, "p_value": p_value}
        "x_values": x
        "pdf_values": pdf
    }

# Example usage with synthetic data
if __name__ == "__main__":
    np.random.seed(42)
    sample_data = pd.Series(np.random.normal(loc=5.0, scale=2.0, size=500))
    results = basic_distribution_fitting(sample_data)
    print(f"Fitted mu: {results['parameters']['mu']:.3f}, sigma: {results['parameters']['sigma']:.3f}")
    print(f"KS Test p-value: {results['goodness_of_fit']['p_value']:.4f}")
```

### Pattern 2: Production-Ready Distribution Fitting

```python
import logging
import numpy as np
import pandas as pd
from scipy import stats
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

class DistributionFitting:
    """Production-grade implementation for fitting and selecting statistical distributions."""

    def __init__(self, distributions: Optional[List[str]] = None):
        self.distributions = distributions or ['norm', 'expon', 'weibull_min', 'gamma']
        self.results: Dict[str, Any] = {}

    def _fit_distribution(self, dist_name: str, data: np.ndarray) -> Dict[str, float]:
        try:
            dist = getattr(stats, dist_name)
            params = dist.fit(data)
            # Calculate AIC for model selection
            n = len(data)
            log_likelihood = np.sum(dist.logpdf(data, *params))
            k = len(params)
            aic = 2 * k - 2 * log_likelihood
            return {"params": params, "aic": aic, "log_likelihood": log_likelihood}
        except Exception as e:
            logger.warning(f"Failed to fit {dist_name}: {e}")
            return {"params": None, "aic": np.inf, "log_likelihood": -np.inf}

    def execute(self, data: pd.DataFrame, target_col: str = "values") -> Dict[str, Any]:
        """Execute distribution fitting on specified column and return best model."""
        if target_col not in data.columns:
            raise ValueError(f"Column '{target_col}' not found in DataFrame")

        series = data[target_col].dropna()
        if series.empty:
            raise ValueError("Target column contains no valid data")

        logger.info(f"Fitting {len(self.distributions)} distributions to {len(series)} samples")
        fit_results = []

        for dist_name in self.distributions:
            res = self._fit_distribution(dist_name, series.values)
            fit_results.append({"distribution": dist_name, **res})

        # Select best distribution based on lowest AIC
        best_fit = min(fit_results, key=lambda x: x["aic"])
        self.results = {
            "status": "success"
            "best_distribution": best_fit["distribution"]
            "best_params": best_fit["params"]
            "aic": best_fit["aic"]
            "all_fits": fit_results
        }
        return self.results
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

- [Scipy Stats — Distribution Fitting](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fit.html)
- [Scipy Statistical Distributions Reference](https://docs.scipy.org/doc/scipy/reference/stats.html)
- [Continuous Probability Distributions (NIST)](https://www.itl.nist.gov/div898/handbook/prc/section1/prc1.htm)
- [Fitting Distributions with Python (SciPy Cookbook)](https://docs.scipy.org/doc/scipy/tutorial/stats/statdist.html)
- [MaxEnt Distribution Fitting (PyMC examples)](https://www.pymc.io/projects/examples/en/latest/generalized-linear-models/GLM-negative-binomial-regression.html)