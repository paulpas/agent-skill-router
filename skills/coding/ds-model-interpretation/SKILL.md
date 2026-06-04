---
name: ds-model-interpretation
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Interprets models using SHAP values, LIME, feature importance
  permutation importance, and other explainability techniques"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-explainability, ds-feature-selection, ds-model-fairness
  role: implementation
  scope: implementation
  triggers: model interpretation, SHAP, LIME, feature importance, explainability
    how do I explain models
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
# Model Interpretation

Comprehensive guide to model interpretation in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world model evaluation & selection problems
- Building machine learning pipelines with model interpretation
- Implementing best practices for model interpretation
- Optimizing model performance using model interpretation techniques
- Learning industry-standard approaches to model interpretation

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require model interpretation rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Model Interpretation is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Model Interpretation

```python
import pandas as pd
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import matplotlib.pyplot as plt

def basic_model_interpretation():
    # Load dataset and split into train/test sets
    data = load_breast_cancer()
    X_train, X_test, y_train, y_test = train_test_split(
        data.data, data.target, test_size=0.2, random_state=42
    )
    feature_names = data.feature_names

    # Train a tree-based model for intrinsic feature importance
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Extract and sort feature importances
    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1]

    # Visualize results
    plt.figure(figsize=(10, 6))
    plt.title("Feature Importances")
    plt.bar(range(X_train.shape[1]), importances[indices], align="center")
    plt.xticks(range(X_train.shape[1]), [feature_names[i] for i in indices], rotation=90)
    plt.tight_layout()
    plt.show()

    return {
        "feature_importances": dict(zip(feature_names, importances))
        "top_features": [feature_names[i] for i in indices[:5]]
    }

if __name__ == "__main__":
    results = basic_model_interpretation()
    print("Top 5 features:", results["top_features"])
```

### Pattern 2: Production-Ready Model Interpretation

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.datasets import load_wine

logger = logging.getLogger(__name__)

class ModelInterpretation:
    """Production implementation of Model Interpretation"""
    
    def __init__(self, n_repeats: int = 10, random_state: int = 42):
        self.n_repeats = n_repeats
        self.random_state = random_state
        self.model = None
        self.feature_names: List[str] = []
        
    def execute(self, data: pd.DataFrame, target_col: str) -> Dict[str, Any]:
        """Execute Model Interpretation on data"""
        try:
            if data is None or data.empty:
                raise ValueError("Input data cannot be None or empty")
            if target_col not in data.columns:
                raise ValueError(f"Target column '{target_col}' not found in data")
            
            X = data.drop(columns=[target_col])
            y = data[target_col]
            self.feature_names = list(X.columns)
            
            self.model = GradientBoostingClassifier(n_estimators=50, random_state=self.random_state)
            self.model.fit(X, y)
            
            result = permutation_importance(
                self.model, X, y, n_repeats=self.n_repeats, 
                random_state=self.random_state, scoring="accuracy"
            )
            
            importance_df = pd.DataFrame({
                "feature": self.feature_names
                "importance_mean": result.importances_mean
                "importance_std": result.importances_std
            }).sort_values(by="importance_mean", ascending=False)
            
            logger.info(f"Interpretation complete. Top feature: {importance_df.iloc[0]['feature']}")
            return {"importance_results": importance_df.to_dict(orient="records")}
            
        except Exception as e:
            logger.error(f"Interpretation failed: {str(e)}")
            raise RuntimeError(f"Model interpretation execution failed: {e}") from e

if __name__ == "__main__":
    wine = load_wine()
    df = pd.DataFrame(wine.data, columns=wine.feature_names)
    df["target"] = wine.target
    interpreter = ModelInterpretation()
    results = interpreter.execute(df, "target")
    print("Production interpretation results:", results["importance_results"][:3])
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

- [SHAP Documentation](https://shap.readthedocs.io/)
- [LIME Documentation](https://lime-ml.readthedocs.io/)
- [InterpretML — Microsoft](https://interpret.ml/)
- [ELI5 Library](https://eli5.readthedocs.io/)
- [Model Interpretation (Kaggle Learn)](https://www.kaggle.com/learn/machine-learning-explainability)