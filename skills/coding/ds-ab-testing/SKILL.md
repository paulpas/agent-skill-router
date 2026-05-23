---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: Provides Designs and analyzes A/B tests including hypothesis testing,
  power analysis, sample size calculation, and statistical significance evaluation
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-classification-metrics, ds-experimental-design, ds-hypothesis-testing,
    ds-metrics-and-kpis ds-statistical-power
  role: implementation
  scope: implementation
  triggers: A/B testing, A/B test, statistical test, power analysis, sample size,
    how do I design tests, unit tests, testing
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
name: ab-testing
------
# A/B Testing

Comprehensive guide to a/b testing in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world experimentation & a/b testing problems
- Building machine learning pipelines with a/b testing
- Implementing best practices for a/b testing
- Optimizing model performance using a/b testing techniques
- Learning industry-standard approaches to a/b testing

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require a/b testing rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

A/B Testing is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic A/B Testing

```python
import pandas as pd
import numpy as np
from scipy import stats

def run_basic_ab_test(group_a: pd.Series, group_b: pd.Series, alpha: float = 0.05) -> dict:
    """
    Perform a two-sample t-test to compare means between two groups.
    Returns p-value, confidence interval, and effect size.
    """
    if len(group_a) < 2 or len(group_b) < 2:
        raise ValueError("Each group must contain at least 2 observations.")

    t_stat, p_value = stats.ttest_ind(group_a, group_b, equal_var=False)
    mean_diff = group_b.mean() - group_a.mean()
    pooled_std = np.sqrt(((len(group_a) - 1) * group_a.var() + (len(group_b) - 1) * group_b.var()) / (len(group_a) + len(group_b) - 2))
    cohens_d = mean_diff / pooled_std if pooled_std > 0 else 0.0

    se_diff = np.sqrt(group_a.var()/len(group_a) + group_b.var()/len(group_b))
    ci_lower = mean_diff - stats.t.ppf(1 - alpha / 2, df=len(group_a) + len(group_b) - 2) * se_diff
    ci_upper = mean_diff + stats.t.ppf(1 - alpha / 2, df=len(group_a) + len(group_b) - 2) * se_diff

    return {
        "p_value": float(p_value),
        "significant": bool(p_value < alpha),
        "mean_difference": float(mean_diff),
        "confidence_interval": (float(ci_lower), float(ci_upper)),
        "cohens_d": float(cohens_d),
        "group_a_mean": float(group_a.mean()),
        "group_b_mean": float(group_b.mean())
    }
```

### Pattern 2: Production-Ready A/B Testing

```python
import logging
import pandas as pd
import numpy as np
from scipy import stats
from statsmodels.stats.power import TTestIndPower
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

class ABTestAnalyzer:
    """Production-grade A/B test analyzer with power analysis and validation."""
    
    def __init__(self, alpha: float = 0.05, min_effect_size: float = 0.2):
        self.alpha = alpha
        self.min_effect_size = min_effect_size
        
    def validate_data(self, df: pd.DataFrame, group_col: str, metric_col: str) -> None:
        if df.empty:
            raise ValueError("Input DataFrame is empty.")
        if group_col not in df.columns or metric_col not in df.columns:
            raise ValueError(f"Missing required columns: {group_col}, {metric_col}")
        if df[metric_col].dtype not in [np.float64, np.int64]:
            raise ValueError("Metric column must be numeric.")
            
    def analyze(self, df: pd.DataFrame, group_col: str, metric_col: str) -> Dict[str, Any]:
        self.validate_data(df, group_col, metric_col)
        group_a = df.loc[df[group_col] == 0, metric_col].dropna()
        group_b = df.loc[df[group_col] == 1, metric_col].dropna()
        
        if len(group_a) < 30 or len(group_b) < 30:
            logger.warning("Sample sizes below 30. Results may be unreliable.")
            
        t_stat, p_value = stats.ttest_ind(group_a, group_b, equal_var=False)
        mean_diff = group_b.mean() - group_a.mean()
        pooled_std = np.sqrt(((len(group_a) - 1) * group_a.var() + (len(group_b) - 1) * group_b.var()) / (len(group_a) + len(group_b) - 2))
        cohens_d = mean_diff / pooled_std if pooled_std > 0 else 0.0
        
        power_analysis = TTestIndPower()
        required_n = power_analysis.solve_power(effect_size=abs(cohens_d), alpha=self.alpha, power=0.8, ratio=1.0)
        
        return {
            "p_value": float(p_value),
            "significant": bool(p_value < self.alpha),
            "mean_difference": float(mean_diff),
            "effect_size_cohens_d": float(cohens_d),
            "required_sample_size_per_group": int(np.ceil(required_n)),
            "actual_sample_sizes": {"group_a": len(group_a), "group_b": len(group_b)},
            "status": "pass" if p_value < self.alpha and abs(cohens_d) >= self.min_effect_size else "inconclusive"
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