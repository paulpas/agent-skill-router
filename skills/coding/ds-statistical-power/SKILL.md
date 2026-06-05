---




name: ds-statistical-power
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Analyzes statistical power, sample size determination, effect size
  estimation, and Type I/Type II error control"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-ab-testing, ds-experimental-design, ds-hypothesis-testing
  role: implementation
  scope: implementation
  triggers: statistical power, power analysis, sample size, effect size, Type I error
    Type II error
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




# Statistical Power

Comprehensive guide to statistical power in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world experimentation & a/b testing problems
- Building machine learning pipelines with statistical power
- Implementing best practices for statistical power
- Optimizing model performance using statistical power techniques
- Learning industry-standard approaches to statistical power

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require statistical power rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Statistical Power is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Statistical Power

```python
import numpy as np
from statsmodels.stats.power import TTestPower

def calculate_basic_power(effect_size: float, sample_size: int, alpha: float = 0.05) -> float:
    """Calculate statistical power for a two-sample t-test."""
    if sample_size <= 0 or alpha <= 0 or alpha >= 1:
        raise ValueError("Invalid parameters: sample_size must be > 0, alpha in (0, 1)")
    
    power_analysis = TTestPower()
    power = power_analysis.power(effect_size=effect_size, nobs=sample_size, alpha=alpha)
    return float(np.clip(power, 0.0, 1.0))

# Example usage
if __name__ == "__main__":
    es: float = 0.5  # Medium effect size (Cohen's d)
    n: int = 50      # Sample size per group
    alpha: float = 0.05
    calculated_power: float = calculate_basic_power(es, n, alpha)
    print(f"Statistical Power: {calculated_power:.4f}")
```

### Pattern 2: Production-Ready Statistical Power

```python
import logging
import numpy as np
import pandas as pd
from typing import Any, Dict, Literal
from statsmodels.stats.power import TTestPower

logger = logging.getLogger(__name__)

class StatisticalPowerAnalyzer:
    """Production-grade statistical power analysis tool."""
    
    def __init__(self, alpha: float = 0.05, alternative: Literal['two-sided', 'larger', 'smaller'] = 'two-sided') -> None:
        self.alpha: float = alpha
        self.alternative: str = alternative
        self.ttest: TTestPower = TTestPower()
        
    def calculate_power(self, effect_size: float, sample_size: int) -> float:
        """Calculate power given effect size and sample size."""
        if sample_size <= 0 or effect_size < 0:
            raise ValueError("Sample size must be positive and effect size non-negative")
        return float(self.ttest.power(effect_size=effect_size, nobs=sample_size, alpha=self.alpha))
        
    def calculate_sample_size(self, effect_size: float, target_power: float) -> int:
        """Calculate required sample size for target power."""
        if target_power <= 0 or target_power >= 1:
            raise ValueError("Target power must be between 0 and 1")
        nobs: float = self.ttest.solve_power(effect_size=effect_size, power=target_power, alpha=self.alpha)
        return int(np.ceil(nobs))
        
    def execute(self, data: pd.DataFrame, target_power: float = 0.8) -> Dict[str, Any]:
        """Execute power analysis on provided data."""
        if data.empty:
            raise ValueError("Input DataFrame cannot be empty")
            
        group_a: pd.Series = data['group_a'].dropna()
        group_b: pd.Series = data['group_b'].dropna()
        pooled_std: float = np.sqrt(((len(group_a) - 1) * group_a.var() + (len(group_b) - 1) * group_b.var()) / (len(group_a) + len(group_b) - 2))
        effect_size: float = abs(group_a.mean() - group_b.mean()) / pooled_std if pooled_std > 0 else 0.0
        
        current_power: float = self.calculate_power(effect_size, len(group_a))
        required_n: int = self.calculate_sample_size(effect_size, target_power)
        
        logger.info(f"Calculated effect size: {effect_size:.4f}, Current power: {current_power:.4f}")
        return {
            'effect_size': float(effect_size)
            'current_power': float(current_power)
            'required_sample_size': required_n
            'target_power': target_power
            'alpha': self.alpha
        }
```

### Pattern 3: BAD vs GOOD Implementation

```python
# BAD: Hardcoded values, no validation, ignores statistical assumptions
def bad_power_calc(data):
    return 0.8  # Magic number, no calculation

# GOOD: Parameterized, validated, uses established statistical library
def good_power_calc(effect_size: float, n: int, alpha: float = 0.05) -> float:
    if n <= 0 or not (0 < alpha < 1):
        raise ValueError("Invalid parameters")
    from statsmodels.stats.power import TTestPower
    return float(TTestPower().power(effect_size=effect_size, nobs=n, alpha=alpha))
```

## Best Practices

- ✅ Always validate your implementation on test data
- ✅ Document your assumptions and methodology
- ✅ Use version control for reproducibility
- ✅ Monitor performance metrics in production
- ✅ Periodically review and update your approach
- ✅ Test with edge cases and outliers
- ✅ Log all significant operations for debugging
- ✅ Follow the DRY (Don't Repeat Yourself) principle to avoid duplicating power calculation logic across projects

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

- [Statistical Power — Wikipedia](https://en.wikipedia.org/wiki/Statistical_power)
- [Statsmodels Power Analysis](https://www.statsmodels.org/)
- [G*Power Documentation (University of Düsseldorf)](https://www.psychologie.hhu.de/arbeitsgruppen/allgemeine-psychologie-und-arbeitspsychologie/gpower)
- [Sample Size Calculation (NIST Handbook)](https://www.itl.nist.gov/div898/handbook/index.htm)
- [Power Analysis with Python (Statsmodels examples)](https://www.statsmodels.org/stable/examples.html)