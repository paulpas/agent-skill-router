---




name: ds-correlation-analysis
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Analyzes correlation, covariance, and multivariate relationships between
  variables using statistical methods and visualization techniques"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-data-visualization, ds-eda, ds-feature-engineering, ds-feature-interaction
  role: implementation
  scope: implementation
  triggers: correlation analysis, covariance, multivariate analysis, correlation
    pearson, spearman, feature relationships
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




# Correlation Analysis

Comprehensive guide to correlation analysis in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world exploratory data analysis problems
- Building machine learning pipelines with correlation analysis
- Implementing best practices for correlation analysis
- Optimizing model performance using correlation analysis techniques
- Learning industry-standard approaches to correlation analysis

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require correlation analysis rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Correlation Analysis is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Correlation Analysis

```python
import pandas as pd
import numpy as np
from sklearn.datasets import make_regression
import matplotlib.pyplot as plt
import seaborn as sns

# Generate sample data for demonstration
X, y = make_regression(n_samples=200, n_features=5, noise=0.1, random_state=42)
df = pd.DataFrame(X, columns=[f'feature_{i}' for i in range(5)])
df['target'] = y

# Compute correlation matrix using Pearson method
corr_matrix = df.corr(method='pearson')

# Visualize the correlation matrix
plt.figure(figsize=(8, 6))
sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', fmt='.2f', linewidths=0.5)
plt.title('Feature Correlation Matrix (Pearson)')
plt.tight_layout()
plt.show()

# Extract strong correlations (absolute value > 0.5)
strong_correlations = corr_matrix[(corr_matrix.abs() > 0.5) & (corr_matrix.abs() < 1.0)]
strong_correlations = strong_correlations[strong_correlations.columns != strong_correlations.index]
print("Strong correlations found:")
print(strong_correlations)
```

### Pattern 2: Production-Ready Correlation Analysis

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List, Optional
from scipy import stats

logger = logging.getLogger(__name__)

class CorrelationAnalysis:
    """Production implementation of Correlation Analysis following SOLID principles"""
    
    def __init__(self, method: str = 'pearson', threshold: float = 0.5) -> None:
        self.method = method
        self.threshold = threshold
        self.corr_matrix: Optional[pd.DataFrame] = None
        self.p_values: Optional[pd.DataFrame] = None
        
    def execute(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Execute Correlation Analysis on data"""
        if data.empty:
            raise ValueError("Input DataFrame cannot be empty")
            
        numeric_cols = data.select_dtypes(include=[np.number])
        if numeric_cols.shape[1] == 0:
            raise ValueError("No numeric columns found in the input data")
            
        try:
            self.corr_matrix = numeric_cols.corr(method=self.method)
            self.p_values = self._compute_p_values(numeric_cols)
            logger.info(f"Correlation analysis completed using {self.method} method.")
            
            return {
                'correlation_matrix': self.corr_matrix
                'p_values': self.p_values
                'significant_pairs': self._get_significant_pairs()
                'metadata': {
                    'method': self.method
                    'threshold': self.threshold
                    'rows': len(data)
                    'numeric_columns': list(numeric_cols.columns)
                }
            }
        except Exception as e:
            logger.error(f"Correlation analysis failed: {str(e)}")
            raise RuntimeError(f"Analysis execution failed: {e}")
            
    def _compute_p_values(self, numeric_cols: pd.DataFrame) -> pd.DataFrame:
        """Compute p-values for correlation significance"""
        if self.method != 'pearson':
            return pd.DataFrame(np.nan, index=numeric_cols.columns, columns=numeric_cols.columns)
            
        n = numeric_cols.shape[0]
        r = self.corr_matrix.values
        t_stats = r * np.sqrt((n - 2) / (1 - r**2 + 1e-10))
        p_values = pd.DataFrame(
            stats.t.sf(np.abs(t_stats), n - 2) * 2
            index=numeric_cols.columns
            columns=numeric_cols.columns
        )
        return p_values.clip(upper=1.0)
        
    def _get_significant_pairs(self) -> List[Dict[str, Any]]:
        """Extract statistically significant correlation pairs"""
        if self.corr_matrix is None or self.p_values is None:
            return []
            
        pairs = []
        for i in range(len(self.corr_matrix)):
            for j in range(i + 1, len(self.corr_matrix)):
                col_i = self.corr_matrix.columns[i]
                col_j = self.corr_matrix.columns[j]
                r = self.corr_matrix.iloc[i, j]
                p = self.p_values.iloc[i, j]
                if not np.isnan(p) and p < 0.05 and abs(r) >= self.threshold:
                    pairs.append({
                        'feature_1': col_i
                        'feature_2': col_j
                        'correlation': r
                        'p_value': p
                    })
        return pairs
```

### BAD vs GOOD Example

```python
# BAD: Ignores data types, uses magic numbers, lacks error handling
def bad_correlation(df):
    matrix = df.corr()
    return matrix * 0.8  # Arbitrary scaling, breaks statistical meaning

# GOOD: Validates input, uses proper methods, returns structured results
def good_correlation(df: pd.DataFrame, method: str = 'pearson') -> Dict[str, Any]:
    if not isinstance(df, pd.DataFrame):
        raise TypeError("Input must be a pandas DataFrame")
    numeric_df = df.select_dtypes(include=[np.number])
    if numeric_df.shape[1] < 2:
        raise ValueError("Requires at least two numeric columns")
    corr = numeric_df.corr(method=method)
    return {'matrix': corr, 'method': method, 'columns': list(numeric_df.columns)}
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

- [Correlation — Wikipedia](https://en.wikipedia.org/wiki/Correlation)
- [Pandas corr() Documentation](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.corr.html)
- [Scipy stats — Correlation Coefficients](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html)
- [Correlation vs Causation (NIST)](https://www.itl.nist.gov/div898/handbook/eda/section3/eda360.htm)
- [Seaborn Correlation Heatmaps](https://seaborn.pydata.org/generated/seaborn.heatmap.html)