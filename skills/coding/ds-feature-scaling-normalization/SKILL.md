---
name: ds-feature-scaling-normalization
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Scales and normalizes features using standardization, normalization
  robust scaling, and other scaling methods for model compatibility"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-categorical-encoding, ds-feature-engineering, ds-linear-regression
  role: implementation
  scope: implementation
  triggers: feature scaling, normalization, standardization, robust scaling, scaling
    features, how do I scale
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
# Feature Scaling

Comprehensive guide to feature scaling in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world feature engineering problems
- Building machine learning pipelines with feature scaling
- Implementing best practices for feature scaling
- Optimizing model performance using feature scaling techniques
- Learning industry-standard approaches to feature scaling

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require feature scaling rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Feature Scaling is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Feature Scaling

```python
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler

# Generate sample data with different scales and distributions
np.random.seed(42)
data = pd.DataFrame({
    'feature_A': np.random.normal(loc=100, scale=10, size=100)
    'feature_B': np.random.uniform(low=0, high=1, size=100)
    'feature_C': np.random.exponential(scale=5, size=100)
})

# Standardization (Z-score normalization)
scaler_std = StandardScaler()
data_scaled_std = scaler_std.fit_transform(data)

# Min-Max Normalization
scaler_minmax = MinMaxScaler(feature_range=(0, 1))
data_scaled_minmax = scaler_minmax.fit_transform(data)

print("Original Data Shape:", data.shape)
print("Standardized Mean:", np.mean(data_scaled_std, axis=0))
print("Standardized Std:", np.std(data_scaled_std, axis=0))
print("Min-Max Range:", np.min(data_scaled_minmax, axis=0), np.max(data_scaled_minmax, axis=0))
```

### Pattern 2: Production-Ready Feature Scaling

```python
import logging
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, RobustScaler
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class FeatureScaling:
    """Production implementation of Feature Scaling following scikit-learn API conventions."""
    
    def __init__(self, method: str = "standard", columns: List[str] = None):
        self.method = method
        self.columns = columns
        self.scaler = None
        
    def _validate_input(self, data: pd.DataFrame) -> None:
        if not isinstance(data, pd.DataFrame):
            raise TypeError("Input data must be a pandas DataFrame")
        if data.empty:
            raise ValueError("Input DataFrame cannot be empty")
        if self.columns:
            missing = set(self.columns) - set(data.columns)
            if missing:
                raise ValueError(f"Missing columns: {missing}")
                
    def execute(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Execute Feature Scaling on data with proper error handling and logging."""
        self._validate_input(data)
        target_cols = self.columns if self.columns else data.select_dtypes(include=[np.number]).columns.tolist()
        
        if not target_cols:
            raise ValueError("No numeric columns found for scaling")
            
        try:
            if self.method == "standard":
                self.scaler = StandardScaler()
            elif self.method == "robust":
                self.scaler = RobustScaler()
            else:
                raise ValueError(f"Unsupported scaling method: {self.method}")
                
            scaled_data = self.scaler.fit_transform(data[target_cols])
            result_df = data.copy()
            result_df[target_cols] = scaled_data
            
            logger.info(f"Successfully scaled {len(target_cols)} columns using {self.method}")
            
            return {
                'status': 'success'
                'scaled_data': result_df
                'metadata': {
                    'method': self.method
                    'columns_scaled': target_cols
                    'original_shape': data.shape
                    'scaled_shape': result_df.shape
                }
            }
        except Exception as e:
            logger.error(f"Scaling failed: {str(e)}")
            return {'status': 'error', 'message': str(e)}
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

- [Scikit-learn Preprocessing](https://scikit-learn.org/stable/modules/preprocessing.html)
- [StandardScaler, MinMaxScaler, RobustScaler — Scikit-learn docs](https://scikit-learn.org/stable/modules/preprocessing.html)
- [Feature Scaling (Kaggle Learn)](https://www.kaggle.com/learn/pandas)
- [Normalization vs Standardization (Towards Data Science)](https://towardsdatascience.com/normalization-vs-standardization-66282a250611)
- [Feature Scaling — MLflow preprocessing](https://mlflow.org/docs/latest/python_api/mlflow.sklearn.html)