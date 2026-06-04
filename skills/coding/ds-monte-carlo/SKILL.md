---
name: ds-monte-carlo
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Implements Monte Carlo sampling, simulation methods, and stochastic
  approximation for uncertainty estimation and numerical integration"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-bayesian-inference, ds-confidence-intervals, ds-distribution-fitting
    ds-kernel-density ds-kernel-density
  role: implementation
  scope: implementation
  triggers: monte carlo, sampling, simulation, stochastic, markov chain, mcmc, how
    do i simulate
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
# Monte Carlo Methods

Comprehensive guide to monte carlo methods in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world statistical inference problems
- Building machine learning pipelines with monte carlo methods
- Implementing best practices for monte carlo methods
- Optimizing model performance using monte carlo methods techniques
- Learning industry-standard approaches to monte carlo methods

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require monte carlo methods rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Monte Carlo Methods is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Monte Carlo Methods

```python
import numpy as np
import matplotlib.pyplot as plt

def estimate_pi(num_samples: int = 100000) -> float:
    """Estimate the value of pi using Monte Carlo sampling."""
    if num_samples <= 0:
        raise ValueError("Number of samples must be positive")
    
    # Generate random points in a unit square [0,1] x [0,1]
    x = np.random.uniform(0, 1, num_samples)
    y = np.random.uniform(0, 1, num_samples)
    
    # Check which points fall inside the quarter circle
    inside_circle = (x**2 + y**2) <= 1.0
    pi_estimate = 4.0 * np.sum(inside_circle) / num_samples
    
    return float(pi_estimate)

if __name__ == "__main__":
    pi_val = estimate_pi()
    print(f"Estimated Pi: {pi_val:.5f}")
    print(f"Actual Pi: {np.pi:.5f}")
    print(f"Error: {abs(pi_val - np.pi):.5f}")
```

### Pattern 2: Production-Ready Monte Carlo Methods

```python
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple

class MonteCarloSimulator:
    """Production-grade Monte Carlo simulator for uncertainty estimation."""
    
    def __init__(self, n_simulations: int = 10000, seed: int = 42):
        self.n_simulations = n_simulations
        self.seed = seed
        np.random.seed(seed)
        
    def simulate_returns(self, mean: float, std: float, 
                         n_periods: int = 252) -> np.ndarray:
        """Simulate asset returns over multiple periods."""
        if std <= 0:
            raise ValueError("Standard deviation must be positive")
        if n_periods <= 0:
            raise ValueError("Number of periods must be positive")
            
        # Vectorized simulation of daily returns
        daily_returns = np.random.normal(mean / n_periods, std / np.sqrt(n_periods), 
                                        (self.n_simulations, n_periods))
        # Compound returns
        cumulative_returns = np.prod(1 + daily_returns, axis=1) - 1
        return cumulative_returns
    
    def get_statistics(self, returns: np.ndarray) -> Dict[str, Any]:
        """Calculate summary statistics from simulation results."""
        stats = {
            'mean': float(np.mean(returns))
            'std': float(np.std(returns))
            'median': float(np.median(returns))
            'percentile_5': float(np.percentile(returns, 5))
            'percentile_95': float(np.percentile(returns, 95))
            'skewness': float(np.mean(((returns - np.mean(returns)) / np.std(returns))**3))
            'kurtosis': float(np.mean(((returns - np.mean(returns)) / np.std(returns))**4) - 3)
        }
        return stats

if __name__ == "__main__":
    sim = MonteCarloSimulator(n_simulations=50000)
    returns = sim.simulate_returns(mean=0.05, std=0.15, n_periods=252)
    stats = sim.get_statistics(returns)
    print("Simulation Statistics:")
    for k, v in stats.items():
        print(f"  {k}: {v:.4f}")
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

- [Monte Carlo Method — Wikipedia](https://en.wikipedia.org/wiki/Monte_Carlo_method)
- [Python random Module Documentation](https://docs.python.org/3/library/random.html)
- [NumPy Random Generator](https://numpy.org/doc/stable/reference/random/)
- [Monte Carlo Simulation (MIT OpenCourseWare)](https://ocw.mit.edu/courses/mathematics/18-s096-topics-in-mathematics-with-applications-in-finance-fall-2013/)
- [Uncertainty Quantification — Stanford CEIV](https://ceiv.stanford.edu/research/uncertainty-quantification/)