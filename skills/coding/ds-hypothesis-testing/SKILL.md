---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: Implements hypothesis testing including t-tests, chi-square tests, p-values,
  and statistical significance evaluation for data-driven decisions
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-ab-testing, ds-bayesian-inference, ds-confidence-intervals, ds-maximum-likelihood
  role: implementation
  scope: implementation
  triggers: hypothesis testing, t-test, chi-square, p-value, statistical significance,
    how do i test hypotheses, unit tests, testing
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
name: hypothesis-testing
------
# Hypothesis Testing

Comprehensive guide to hypothesis testing in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world statistical inference problems
- Building machine learning pipelines with hypothesis testing
- Implementing best practices for hypothesis testing
- Optimizing model performance using hypothesis testing techniques
- Learning industry-standard approaches to hypothesis testing

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require hypothesis testing rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Hypothesis Testing is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Hypothesis Testing

```python
import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, Any, Tuple

def perform_independent_t_test(
    group_a: np.ndarray, 
    group_b: np.ndarray, 
    alpha: float = 0.05
) -> Dict[str, Any]:
    """
    Perform an independent two-sample t-test to compare means.
    
    Args:
        group_a: Array of values for the first group
        group_b: Array of values for the second group
        alpha: Significance level for the test
        
    Returns:
        Dictionary containing t-statistic, p-value, and conclusion
    """
    if len(group_a) < 2 or len(group_b) < 2:
        raise ValueError("Each group must contain at least two observations")
        
    t_stat, p_value = stats.ttest_ind(group_a, group_b, equal_var=False)
    is_significant = p_value < alpha
    
    return {
        "t_statistic": float(t_stat),
        "p_value": float(p_value),
        "significant": bool(is_significant),
        "alpha": alpha,
        "conclusion": "Reject null hypothesis" if is_significant else "Fail to reject null hypothesis"
    }
```

### Pattern 2: Production-Ready Hypothesis Testing

```python
import logging
import numpy as np
import pandas as pd
from scipy import stats
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

class HypothesisTestingEngine:
    """Production-grade engine for statistical hypothesis testing."""
    
    def __init__(self, alpha: float = 0.05, verbose: bool = False):
        self.alpha = alpha
        self.verbose = verbose
        self.results_log: List[Dict[str, Any]] = []
        
    def run_chi_square(self, observed: List[int], expected: List[int]) -> Dict[str, Any]:
        """Execute chi-square goodness of fit test."""
        if len(observed) != len(expected):
            raise ValueError("Observed and expected arrays must have the same length")
        if any(x < 0 for x in observed) or any(x < 0 for x in expected):
            raise ValueError("Counts cannot be negative")
            
        chi2_stat, p_value = stats.chisquare(f_obs=observed, f_exp=expected)
        result = {
            "test": "chi_square",
            "statistic": float(chi2_stat),
            "p_value": float(p_value),
            "significant": bool(p_value < self.alpha),
            "timestamp": pd.Timestamp.now().isoformat()
        }
        self.results_log.append(result)
        if self.verbose:
            logger.info(f"Chi-square test completed: p={p_value:.4f}")
        return result
        
    def run_all_tests(self, data: pd.DataFrame, target_col: str, feature_col: str) -> Dict[str, Any]:
        """Run appropriate tests based on data types."""
        if target_col not in data.columns or feature_col not in data.columns:
            raise KeyError(f"Columns '{target_col}' and '{feature_col}' must exist in data")
            
        results = {}
        if data[feature_col].dtype in ['float64', 'int64']:
            groups = data.groupby(feature_col)[target_col].apply(list)
            if len(groups) >= 2:
                results['anova'] = stats.f_oneway(*groups.values())._asdict()
        else:
            contingency = pd.crosstab(data[target_col], data[feature_col])
            results['chi2'] = stats.chi2_contingency(contingency)._asdict()
            
        return results
```

## Best Practices

- ✅ Always validate your implementation on test data
- ✅ Document your assumptions and methodology
- ✅ Use version control for reproducibility
- ✅ Monitor performance metrics in production
- ✅ Periodically review and update your approach
- ✅ Test with edge cases and outliers
- ✅ Log all significant operations for debugging

### BAD vs GOOD Example

```python
# BAD: Bypassing error handling, using magic numbers, and missing type hints
def bad_test(data):
    t, p = stats.ttest_ind(data['a'], data['b'])
    return p < 0.05  # Hardcoded threshold, no validation

# GOOD: Proper validation, type hints, configurable alpha, and clear return structure
def good_test(group_a: np.ndarray, group_b: np.ndarray, alpha: float = 0.05) -> Dict[str, Any]:
    if len(group_a) < 2 or len(group_b) < 2:
        raise ValueError("Insufficient samples for statistical testing")
    _, p_value = stats.ttest_ind(group_a, group_b, equal_var=False)
    return {
        "p_value": float(p_value),
        "significant": bool(p_value < alpha),
        "alpha_used": alpha
    }
```

## Common Pitfalls

| Pitfall | Problem | Solution |
|