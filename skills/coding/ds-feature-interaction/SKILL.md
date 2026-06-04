---
name: ds-feature-interaction
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Discovers and engineers feature interactions including polynomial
  interactions, cross-features, and interaction detection methods"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-correlation-analysis, ds-feature-engineering, ds-feature-selection
  role: implementation
  scope: implementation
  triggers: feature interaction, interaction terms, polynomial features, cross-features
    feature interactions
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
# Feature Interaction

Comprehensive guide to feature interaction in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world feature engineering problems
- Building machine learning pipelines with feature interaction
- Implementing best practices for feature interaction
- Optimizing model performance using feature interaction techniques
- Learning industry-standard approaches to feature interaction

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require feature interaction rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Feature Interaction is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Feature Interaction

```python
import pandas as pd
import numpy as np
from sklearn.preprocessing import PolynomialFeatures
from typing import List, Tuple

def generate_basic_interactions(df: pd.DataFrame, feature_pairs: List[Tuple[str, str]] = None, degree: int = 2) -> pd.DataFrame:
    """
    Generate basic feature interactions including polynomial terms and cross-features.
    
    Args:
        df: Input DataFrame containing numerical features
        feature_pairs: Optional list of specific column pairs to interact
        degree: Degree for polynomial features (default 2)
        
    Returns:
        DataFrame with original features plus interaction terms
    """
    if df.empty:
        raise ValueError("Input DataFrame cannot be empty")
        
    numerical_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if len(numerical_cols) < 2:
        raise ValueError("At least two numerical columns are required for interactions")
        
    # Create polynomial features for all numerical columns
    poly = PolynomialFeatures(degree=degree, include_bias=False, interaction_only=False)
    poly_features = poly.fit_transform(df[numerical_cols])
    poly_col_names = poly.get_feature_names_out(numerical_cols)
    
    # Create specific cross-features if provided
    cross_features = {}
    if feature_pairs:
        for col1, col2 in feature_pairs:
            if col1 in df.columns and col2 in df.columns:
                cross_features[f'{col1}_x_{col2}'] = df[col1] * df[col2]
                cross_features[f'{col1}_plus_{col2}'] = df[col1] + df[col2]
                
    # Combine original data with polynomial features
    result_df = pd.DataFrame(poly_features, columns=poly_col_names, index=df.index)
    
    # Add cross-features if any
    if cross_features:
        cross_df = pd.DataFrame(cross_features, index=df.index)
        result_df = pd.concat([result_df, cross_df], axis=1)
        
    return result_df

# Self-contained test
if __name__ == "__main__":
    test_df = pd.DataFrame({
        'A': np.random.randn(50)
        'B': np.random.randn(50)
        'C': np.random.randn(50)
    })
    result = generate_basic_interactions(test_df, feature_pairs=[('A', 'B')])
    print(f"Generated {result.shape[1]} features from {test_df.shape[1]} original columns")
```

### Pattern 2: Production-Ready Feature Interaction

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List
from sklearn.preprocessing import PolynomialFeatures

logger = logging.getLogger(__name__)

class FeatureInteractionEngine:
    """Production-grade feature interaction engine with validation and logging."""
    
    def __init__(self, degree: int = 2, interaction_pairs: List[List[str]] = None):
        self.degree = degree
        self.interaction_pairs = interaction_pairs or []
        self.poly_transformer = PolynomialFeatures(degree=degree, include_bias=False)
        logger.info(f"Initialized FeatureInteractionEngine with degree={degree}")
    
    def execute(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Execute feature interaction pipeline on input data."""
        try:
            if data is None or data.empty:
                raise ValueError("Input data cannot be None or empty")
                
            numerical_cols = data.select_dtypes(include=[np.number]).columns.tolist()
            if len(numerical_cols) < 2:
                raise ValueError("Requires at least two numerical columns")
                
            logger.info(f"Processing {len(numerical_cols)} numerical columns")
            
            # Generate polynomial interactions
            poly_features = self.poly_transformer.fit_transform(data[numerical_cols])
            poly_names = self.poly_transformer.get_feature_names_out(numerical_cols)
            transformed_df = pd.DataFrame(poly_features, columns=poly_names, index=data.index)
            
            # Add custom cross-features
            for pair in self.interaction_pairs:
                if len(pair) == 2 and pair[0] in data.columns and pair[1] in data.columns:
                    col_name = f"{pair[0]}_x_{pair[1]}"
                    transformed_df[col_name] = data[pair[0]] * data[pair[1]]
                    logger.info(f"Added cross-feature: {col_name}")
                    
            result = {
                'status': 'success'
                'transformed_data': transformed_df
                'metadata': {
                    'original_columns': len(data.columns)
                    'new_columns': len(transformed_df.columns)
                    'interaction_degree': self.degree
                    'rows_processed': len(data)
                }
            }
            logger.info("Feature interaction completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Feature interaction failed: {str(e)}")
            return {'status': 'error', 'message': str(e)}

# Self-contained test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    test_df = pd.DataFrame({
        'x1': np.random.randn(100)
        'x2': np.random.randn(100)
        'x3': np.random.randn(100)
    })
    engine = FeatureInteractionEngine(degree=2, interaction_pairs=[['x1', 'x2']])
    output = engine.execute(test_df)
    print(f"Status: {output['status']}, New columns: {output['metadata']['new_columns']}")
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

- [Feature Engineering — Interaction Terms (Wikipedia)](https://en.wikipedia.org/wiki/Feature_engineering#Interaction_terms)
- [PolynomialFeatures — Scikit-learn](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.PolynomialFeatures.html)
- [Feature Interactions in Tree Models (XGBoost docs)](https://xgboost.readthedocs.io/en/latest/tutorial/feature_interactions.html)
- [Feature Interaction Selection (PyCaret)](https://pycaret.org/interactions/)
- [Automated Feature Engineering with Featuretools](https://docs.featuretools.com/deep_feature_synthesis/description.html)