---
name: ds-feature-selection
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Selects relevant features using univariate selection, recursive elimination
  stability selection, and importance-based methods"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-feature-engineering, ds-feature-interaction, ds-hyperparameter-tuning
    ds-model-interpretation ds-model-interpretation
  role: implementation
  scope: implementation
  triggers: feature selection, feature importance, recursive elimination, univariate
    selection, feature selection methods
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
# Feature Selection

Comprehensive guide to feature selection in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world feature engineering problems
- Building machine learning pipelines with feature selection
- Implementing best practices for feature selection
- Optimizing model performance using feature selection techniques
- Learning industry-standard approaches to feature selection

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require feature selection rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Feature Selection is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Feature Selection

```python
# BAD: Fitting selector on full dataset before splitting causes data leakage
import pandas as pd
import numpy as np
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.model_selection import train_test_split

X = pd.DataFrame(np.random.randn(100, 10), columns=[f"feat_{i}" for i in range(10)])
y = np.random.randint(0, 2, 100)
selector = SelectKBest(f_classif, k=5)
X_selected = selector.fit_transform(X, y)  # Data leakage: information from test set leaks into training
X_train, X_test, y_train, y_test = train_test_split(X_selected, y, random_state=42)

# GOOD: Using Pipeline ensures proper train/test separation and prevents leakage
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score

pipeline = Pipeline([
    ('selector', SelectKBest(f_classif, k=5))
    ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
])
scores = cross_val_score(pipeline, X, y, cv=5, scoring='accuracy')
print(f"Cross-validated accuracy: {scores.mean():.3f} (+/- {scores.std() * 2:.3f})")
```

### Pattern 2: Production-Ready Feature Selection

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List
from sklearn.feature_selection import SelectFromModel
from sklearn.ensemble import RandomForestClassifier
from sklearn.exceptions import ConvergenceWarning
import warnings

logger = logging.getLogger(__name__)
warnings.filterwarnings("ignore", category=ConvergenceWarning)

class FeatureSelectionPipeline:
    """Production-grade feature selection with importance-based filtering.
    Follows SOLID principles for maintainability and testability."""
    
    def __init__(self, threshold: float = 0.01, max_features: int = None) -> None:
        self.threshold = threshold
        self.max_features = max_features
        self.selector = SelectFromModel(
            RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
            threshold=threshold
        )
        self.selected_features: List[str] = []
        
    def execute(self, data: pd.DataFrame, target_col: str) -> Dict[str, Any]:
        """Execute feature selection and return structured results."""
        if target_col not in data.columns:
            raise ValueError(f"Target column '{target_col}' not found in data.")
            
        X = data.drop(columns=[target_col])
        y = data[target_col]
        
        if X.shape[1] == 0:
            raise ValueError("No features available for selection.")
            
        self.selector.fit(X, y)
        self.selected_features = X.columns[self.selector.get_support()].tolist()
        
        X_selected = self.selector.transform(X)
        
        result = {
            'status': 'success'
            'original_features': X.shape[1]
            'selected_features': len(self.selected_features)
            'feature_names': self.selected_features
            'transformed_data': X_selected
            'importance_scores': dict(zip(X.columns, self.selector.estimator_.feature_importances_))
        }
        logger.info(f"Selected {len(self.selected_features)} features from {X.shape[1]}")
        return result
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

- [Scikit-learn Feature Selection](https://scikit-learn.org/stable/modules/feature_selection.html)
- [SelectKBest, RFE — Scikit-learn docs](https://scikit-learn.org/stable/modules/feature_selection.html#feature-selection)
- [Mutual Information Classifier (Scikit-learn)](https://scikit-learn.org/stable/modules/generated/sklearn.feature_selection.mutual_info_classif.html)
- [Feature Importance with Tree Ensembles](https://scikit-learn.org/stable/modules/tree.html#decisions-and-feature-importance)
- [Recursive Feature Elimination Tutorial (Kaggle)](https://www.kaggle.com/code/leandro0421/feature-selection-with-recursive-feature-elimination)