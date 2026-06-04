---
name: ds-randomized-experiments
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Designs and analyzes randomized controlled trials (RCTs)
  A/B tests, experimental blocking, and sample size calculations"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-ab-testing, ds-causal-inference, ds-intervention-analysis, ds-observational-studies
  role: implementation
  scope: implementation
  triggers: randomized experiments, RCT, experimental design, randomization, blocking
    sample size
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
# Randomized Experiments

Comprehensive guide to randomized experiments in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world causal inference problems
- Building machine learning pipelines with randomized experiments
- Implementing best practices for randomized experiments
- Optimizing model performance using randomized experiments techniques
- Learning industry-standard approaches to randomized experiments

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require randomized experiments rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Randomized Experiments is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Randomized Experiments

```python
import pandas as pd
import numpy as np
from scipy import stats
from typing import Dict, Optional

def basic_rct_analysis(
    data: pd.DataFrame, 
    treatment_col: str, 
    outcome_col: str, 
    block_col: Optional[str] = None
) -> Dict[str, float]:
    """
    Perform basic two-sample analysis on randomized experiment data.
    Handles optional blocking and returns statistical results.
    """
    if outcome_col not in data.columns or treatment_col not in data.columns:
        raise ValueError("Missing required columns in data")
        
    treatment_data = data[data[treatment_col] == 1][outcome_col]
    control_data = data[data[treatment_col] == 0][outcome_col]
    
    if len(treatment_data) < 2 or len(control_data) < 2:
        raise ValueError("Insufficient samples in treatment or control groups")
        
    t_stat, p_value = stats.ttest_ind(treatment_data, control_data, equal_var=False)
    effect_size = float(np.mean(treatment_data) - np.mean(control_data))
    
    results: Dict[str, float] = {
        "t_statistic": float(t_stat)
        "p_value": float(p_value)
        "effect_size": effect_size
        "significant": float(1.0 if p_value < 0.05 else 0.0)
    }
    
    if block_col and block_col in data.columns:
        blocked_means: Dict[str, float] = {}
        for block in data[block_col].unique():
            block_data = data[data[block_col] == block]
            t_b, p_b = stats.ttest_ind(
                block_data[block_data[treatment_col] == 1][outcome_col]
                block_data[block_data[treatment_col] == 0][outcome_col]
                equal_var=False
            )
            blocked_means[f"block_{block}_p"] = float(p_b)
        results["blocked_analysis"] = blocked_means
        
    return results
```

### Pattern 2: Production-Ready Randomized Experiments

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List
from scipy import stats
from statsmodels.stats.power import TTestIndPower

logger = logging.getLogger(__name__)

class RandomizedExperiment:
    """Production-grade implementation for designing and analyzing randomized experiments."""
    
    def __init__(self, alpha: float = 0.05, power: float = 0.8, effect_size: float = 0.5) -> None:
        self.alpha = alpha
        self.power = power
        self.effect_size = effect_size
        self._analysis_results: Dict[str, Any] = {}
        
    def calculate_sample_size(self, n_control: int = 100) -> int:
        """Calculate required treatment group size for desired power."""
        analysis = TTestIndPower()
        n_treatment = analysis.solve_power(
            effect_size=self.effect_size, 
            power=self.power, 
            alpha=self.alpha, 
            nobs1=n_control, 
            ratio=1.0
        )
        logger.info(f"Calculated required treatment size: {int(np.ceil(n_treatment))}")
        return int(np.ceil(n_treatment))
        
    def assign_treatment(self, data: pd.DataFrame, block_col: str = None) -> pd.DataFrame:
        """Randomly assign treatment/control with optional blocking."""
        if block_col is None:
            data = data.copy()
            data['treatment'] = np.random.binomial(1, 0.5, size=len(data))
        else:
            data = data.copy()
            data['treatment'] = 0
            for block in data[block_col].unique():
                mask = data[block_col] == block
                block_size = mask.sum()
                data.loc[mask, 'treatment'] = np.random.binomial(1, 0.5, size=block_size)
        return data
        
    def analyze(self, data: pd.DataFrame, outcome_col: str) -> Dict[str, Any]:
        """Run statistical analysis on assigned experiment data."""
        if 'treatment' not in data.columns:
            raise ValueError("Treatment assignment missing. Run assign_treatment first.")
            
        treatment = data[data['treatment'] == 1][outcome_col]
        control = data[data['treatment'] == 0][outcome_col]
        
        t_stat, p_value = stats.ttest_ind(treatment, control, equal_var=False)
        ci = stats.t.interval(0.95, len(treatment) + len(control) - 2, 
                              loc=np.mean(treatment) - np.mean(control)
                              scale=np.sqrt(np.var(treatment)/len(treatment) + np.var(control)/len(control)))
        
        self._analysis_results = {
            "t_statistic": float(t_stat)
            "p_value": float(p_value)
            "confidence_interval": [float(ci[0]), float(ci[1])]
            "significant": bool(p_value < self.alpha)
            "n_treatment": len(treatment)
            "n_control": len(control)
        }
        return self._analysis_results
```

### Pattern 3: Anti-Patterns and Best Practices

```python
# BAD: Magic numbers, no error handling, violates DRY principle
def bad_experiment(data):
    t = data[data['group'] == 1]['value']
    c = data[data['group'] == 0]['value']
    return np.mean(t) - np.mean(c)  # No significance testing, hardcoded assumptions

# GOOD: Validated inputs, statistical rigor, follows DRY and SOLID principles
def good_experiment(data: pd.DataFrame, group_col: str, value_col: str) -> Dict[str, float]:
    """Analyze experiment with proper validation and statistical testing."""
    if group_col not in data.columns or value_col not in data.columns:
        raise ValueError("Invalid column names provided")
        
    groups = data[group_col].unique()
    if len(groups) != 2:
        raise ValueError("Exactly two groups required for comparison")
        
    t_stat, p_val = stats.ttest_ind(
        data[data[group_col] == groups[0]][value_col]
        data[data[group_col] == groups[1]][value_col]
        equal_var=False
    )
    
    return {
        "effect_size": float(np.mean(data[data[group_col] == groups[1]][value_col]) - 
                             np.mean(data[data[group_col] == groups[0]][value_col]))
        "p_value": float(p_val)
        "significant": bool(p_val < 0.05)
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

- [Randomized Experiment — Wikipedia](https://en.wikipedia.org/wiki/Randomized_experiment)
- [Causal Inference & Control Experiments (Microsoft)](https://www.microsoft.com/en-us/research/uploads/prod/2018/03/online-a-b-testing.pdf)
- [Experimental Design — NIST Engineering Handbook](https://www.itl.nist.gov/div898/handbook/index.htm)
- [A/B Testing Best Practices (Google Analytics)](https://marketingplatform.google.com/about/analytics/)
- [Randomization in Clinical Trials (FDA Guidance)](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/statistical-guidance-clinical-trials)