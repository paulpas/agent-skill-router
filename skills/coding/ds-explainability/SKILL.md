---
name: ds-explainability
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Implements explainability and interpretability techniques for model
  transparency, understanding decisions, and building trust"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-model-fairness, ds-model-interpretation, ds-model-robustness
    ds-reproducible-research ds-reproducible-research
  role: implementation
  scope: implementation
  triggers: explainability, interpretability, transparency, understanding models
    how do I explain predictions
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
# Explainability

Comprehensive guide to explainability in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world reproducibility & responsible ai problems
- Building machine learning pipelines with explainability
- Implementing best practices for explainability
- Optimizing model performance using explainability techniques
- Learning industry-standard approaches to explainability

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require explainability rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Explainability is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Explainability

```python
import pandas as pd
import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import shap

# Generate synthetic classification dataset
X, y = make_classification(n_samples=1000, n_features=10, n_informative=5, random_state=42)
feature_names = [f"feature_{i}" for i in range(X.shape[1])]
df = pd.DataFrame(X, columns=feature_names)

# Split and train model
X_train, X_test, y_train, y_test = train_test_split(df, y, test_size=0.2, random_state=42)
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

# Evaluate model performance
acc = accuracy_score(y_test, y_pred)
report = classification_report(y_test, y_pred, output_dict=True)
print(f"Accuracy: {acc:.4f}")

# Compute SHAP values for explainability
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_test)
feature_importance = np.abs(shap_values).mean(axis=0)
importance_df = pd.DataFrame({'feature': feature_names, 'shap_importance': feature_importance})
print(importance_df.sort_values('shap_importance', ascending=False).head())
```

### Pattern 2: Production-Ready Explainability

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import shap

logger = logging.getLogger(__name__)

class ExplainabilityEngine:
    """Production-grade explainability engine for tabular ML models."""
    
    def __init__(self, model=None, feature_names: List[str] = None):
        self.model = model
        self.feature_names = feature_names
        self.explainer = None
        
    def fit_explainer(self, X_train: pd.DataFrame) -> None:
        """Initialize SHAP explainer with training data."""
        if self.model is None:
            raise ValueError("Model must be provided before fitting explainer")
        self.explainer = shap.TreeExplainer(self.model)
        logger.info("SHAP explainer initialized successfully")
        
    def generate_explanations(self, X: pd.DataFrame) -> Dict[str, Any]:
        """Generate and aggregate SHAP explanations for given data."""
        if self.explainer is None:
            raise RuntimeError("Explainer not initialized. Call fit_explainer first.")
        if not isinstance(X, pd.DataFrame):
            raise TypeError("Input data must be a pandas DataFrame")
            
        shap_values = self.explainer.shap_values(X)
        mean_abs_shap = np.abs(shap_values).mean(axis=0)
        
        results = {
            'feature_importance': mean_abs_shap
            'summary_statistics': {
                'mean_importance': float(np.mean(mean_abs_shap))
                'max_importance': float(np.max(mean_abs_shap))
                'min_importance': float(np.min(mean_abs_shap))
            }
        }
        logger.info(f"Generated explanations for {len(X)} samples")
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
- [Explainable AI — Wikipedia](https://en.wikipedia.org/wiki/Explainable_artificial_intelligence)
- [LIME — Local Interpretable Model-Agnostic Explanations](https://lime-ml.readthedocs.io/)
- [InterpretML (Microsoft)](https://interpret.ml/)
- [AI Fairness 360 — Explainability Metrics](https://aif360.res.ibm.com/)