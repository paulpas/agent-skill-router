---
name: ds-kernel-density
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Implements kernel density estimation, non-parametric density estimation
  and bandwidth selection for probability density functions"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-distribution-fitting, ds-eda, ds-monte-carlo
  role: implementation
  scope: implementation
  triggers: kernel density estimation, KDE, non-parametric, density estimation, bandwidth
    selection
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
# Kernel Density Estimation

Comprehensive guide to kernel density estimation in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world statistical inference problems
- Building machine learning pipelines with kernel density estimation
- Implementing best practices for kernel density estimation
- Optimizing model performance using kernel density estimation techniques
- Learning industry-standard approaches to kernel density estimation

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require kernel density estimation rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Kernel Density Estimation is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Kernel Density Estimation

```python
import numpy as np
import pandas as pd
from scipy.stats import gaussian_kde
from typing import Tuple

def basic_kde_1d(data: np.ndarray, grid_points: int = 200) -> Tuple[np.ndarray, np.ndarray]:
    """
    Perform basic 1D Kernel Density Estimation using Gaussian kernel.
    
    Args:
        data: 1D array-like of observations
        grid_points: Number of points to evaluate the density on
        
    Returns:
        Tuple of (evaluation_grid, density_values)
    """
    if not isinstance(data, np.ndarray):
        data = np.asarray(data)
    if data.ndim != 1:
        raise ValueError("Data must be 1-dimensional for basic KDE")
        
    # Create evaluation grid spanning data range
    grid = np.linspace(data.min(), data.max(), grid_points)
    
    # Fit KDE and evaluate density at grid points
    kde = gaussian_kde(data)
    density = kde.evaluate(grid)
    
    return grid, density
```

### Pattern 2: Production-Ready Kernel Density Estimation

```python
import logging
import numpy as np
import pandas as pd
from sklearn.neighbors import KernelDensity
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class ProductionKDE:
    """Production-grade Kernel Density Estimation with automatic bandwidth selection.
    Follows DRY principle by encapsulating fit/predict logic and reusing sklearn internals."""
    
    def __init__(self, bandwidth: Optional[float] = None, kernel: str = 'gaussian'):
        self.bandwidth = bandwidth
        self.kernel = kernel
        self.model = KernelDensity(kernel=kernel, bandwidth=bandwidth)
        
    def fit(self, data: pd.DataFrame, column: str = 'value') -> 'ProductionKDE':
        """Fit the KDE model to the specified column."""
        if column not in data.columns:
            raise ValueError(f"Column '{column}' not found in DataFrame")
            
        X = data[[column]].values
        if X.ndim == 1:
            X = X.reshape(-1, 1)
            
        self.model.fit(X)
        logger.info(f"KDE fitted successfully with kernel={self.kernel}, bandwidth={self.bandwidth}")
        return self
        
    def predict_density(self, grid: np.ndarray) -> np.ndarray:
        """Evaluate density on a provided grid."""
        if not hasattr(self, 'model') or self.model.bandwidth is None:
            raise RuntimeError("Model must be fitted before prediction")
            
        X_grid = grid.reshape(-1, 1)
        log_density = self.model.score_samples(X_grid)
        return np.exp(log_density)
        
    def get_bandwidth(self) -> float:
        """Return current bandwidth setting."""
        return self.model.bandwidth
```

## Best Practices

- ✅ Always validate your implementation on test data
- ✅ Document your assumptions and methodology
- ✅ Use version control for reproducibility
- ✅ Monitor performance metrics in production
- ✅ Periodically review and update your approach
- ✅ Test with edge cases and outliers
- ✅ Log all significant operations for debugging

### BAD vs GOOD: Bandwidth Selection
| Aspect | BAD Approach | GOOD Approach |
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

- [Scikit-learn Kernel Density Estimation](https://scikit-learn.org/stable/modules/density.html)
- [KernelDensity — Scikit-learn docs](https://scikit-learn.org/stable/modules/generated/sklearn.neighbors.KernelDensity.html)
- [Gaussian KDE — SciPy stats](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.gaussian_kde.html)
- [Density Estimation — Wikipedia](https://en.wikipedia.org/wiki/Density_estimation)
- [KDE Bandwidth Selection (Scikit-learn User Guide)](https://scikit-learn.org/stable/modules/density.html#bandwidth-selection)