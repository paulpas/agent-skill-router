---
name: ds-feature-engineering
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Creates and transforms features including polynomial features, interactions
  domain-specific features, and feature transformations"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-categorical-encoding, ds-dimensionality-reduction, ds-feature-scaling-normalization
    ds-feature-selection ds-missing-data
  role: implementation
  scope: implementation
  triggers: feature engineering, feature creation, feature transformation, how do
    I engineer features, feature design
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
# Feature Engineering

Comprehensive guide to feature engineering in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world feature engineering problems
- Building machine learning pipelines with feature engineering
- Implementing best practices for feature engineering
- Optimizing model performance using feature engineering techniques
- Learning industry-standard approaches to feature engineering

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require feature engineering rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Feature Engineering is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Feature Engineering

```python
import pandas as pd
import numpy as np
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

def basic_feature_engineering(df: pd.DataFrame, target_col: str, numeric_cols: list) -> tuple:
    """
    Apply basic feature engineering transformations to a DataFrame.
    Handles polynomial features, log transforms, and standard scaling.
    """
    if df.empty:
        raise ValueError("Input DataFrame cannot be empty")
    
    # Separate features and target
    X = df.drop(columns=[target_col])
    y = df[target_col]
    
    # Identify numeric columns for transformation
    numeric_features = [col for col in numeric_cols if col in X.columns]
    
    # Create transformation pipeline
    transformer = ColumnTransformer(
        transformers=[
            ('poly', PolynomialFeatures(degree=2, include_bias=False), numeric_features)
            ('scaler', StandardScaler(), numeric_features)
        ]
        remainder='passthrough'
    )
    
    # Fit and transform data
    X_transformed = transformer.fit_transform(X)
    
    # Create DataFrame with new feature names
    poly_names = transformer.named_transformers_['poly'].get_feature_names_out(numeric_features)
    new_df = pd.DataFrame(X_transformed, columns=poly_names, index=X.index)
    
    return new_df, transformer, y
```

### Pattern 2: Production-Ready Feature Engineering

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List, Optional
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import warnings

logger = logging.getLogger(__name__)
warnings.filterwarnings('ignore')

class FeatureEngineering:
    """Production-grade feature engineering pipeline with validation and logging."""
    
    def __init__(self, numeric_cols: List[str], categorical_cols: List[str], 
                 target_col: str, degree: int = 2, handle_missing: bool = True):
        self.numeric_cols = numeric_cols
        self.categorical_cols = categorical_cols
        self.target_col = target_col
        self.degree = degree
        self.handle_missing = handle_missing
        self.pipeline = None
        self.feature_names = None
        
    def _validate_input(self, data: pd.DataFrame) -> None:
        missing_cols = set(self.numeric_cols + self.categorical_cols + [self.target_col]) - set(data.columns)
        if missing_cols:
            raise ValueError(f"Missing required columns: {missing_cols}")
        if data.isnull().sum().sum() > 0 and not self.handle_missing:
            logger.warning("Data contains missing values but handle_missing is False")
            
    def execute(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Execute feature engineering on data with full validation and logging."""
        self._validate_input(data)
        logger.info(f"Starting feature engineering on {len(data)} rows")
        
        X = data.drop(columns=[self.target_col])
        y = data[self.target_col]
        
        # Build preprocessing pipeline
        numeric_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')) if self.handle_missing else None
            ('scaler', StandardScaler())
        ])
        
        categorical_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='most_frequent')) if self.handle_missing else None
            ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])
        
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', numeric_transformer, self.numeric_cols)
                ('cat', categorical_transformer, self.categorical_cols)
            ]
            remainder='drop'
        )
        
        # Fit and transform
        X_transformed = preprocessor.fit_transform(X)
        self.pipeline = preprocessor
        
        # Get feature names
        num_names = preprocessor.named_transformers_['num'].named_steps['scaler'].get_feature_names_out(self.numeric_cols)
        cat_names = preprocessor.named_transformers_['cat'].named_steps['encoder'].get_feature_names_out(self.categorical_cols)
        self.feature_names = np.concatenate([num_names, cat_names])
        
        logger.info(f"Feature engineering complete. Output shape: {X_transformed.shape}")
        
        return {
            'X_transformed': X_transformed
            'y': y.values
            'feature_names': self.feature_names
            'pipeline': self.pipeline
            'metadata': {'original_shape': data.shape, 'transformed_shape': X_transformed.shape}
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
- Document every engineered feature with its formula, data source, and expected range before adding to model pipeline
- Validate new features against the target variable using mutual information or point-biserial correlation
- Implement feature transformations in a composable pipeline: fit-only on training data, transform on all splits
- Track feature drift over time by monitoring distribution statistics (mean, std, skewness) per batch

### MUST NOT DO
- Do not create features that leak the target variable (e.g., using future values or post-event metrics)
- Avoid creating too many features without dimensionality reduction — aim for 20-50 high-signal features
- Never engineer features using statistics computed over the full dataset including test set — causes data leakage
- Do not use custom feature engineering that cannot be reproduced in production — stick to standard transformations


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Feature Engineering — Scikit-learn docs](https://scikit-learn.org/stable/modules/feature_extraction.html)
- [Feature Engineering Guide (Towards Data Science)](https://towardsdatascience.com/feature-engineering-for-machine-learning-a-guide-a9f9ea4bb30)
- [Featuretools — Automated Feature Engineering](https://docs.featuretools.com/)
- [PyCaret Feature Engineering](https://pycaret.org/features/)
- [Kaggle Feature Engineering Course](https://www.kaggle.com/learn/feature-engineering)