---
name: ds-cross-validation
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Implements k-fold cross-validation, stratified cross-validation, time-series
  cross-validation, and model validation strategies"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-bias-variance-tradeoff, ds-classification-metrics, ds-hyperparameter-tuning
    ds-model-selection ds-regression-evaluation
  role: implementation
  scope: implementation
  triggers: cross-validation, k-fold, stratified cross-validation, time-series cross-validation
    validation
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
# Cross-Validation

Comprehensive guide to cross-validation in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world model evaluation & selection problems
- Building machine learning pipelines with cross-validation
- Implementing best practices for cross-validation
- Optimizing model performance using cross-validation techniques
- Learning industry-standard approaches to cross-validation

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require cross-validation rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Cross-Validation is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Cross-Validation

```python
import numpy as np
import pandas as pd
from sklearn.model_selection import KFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import make_classification
from sklearn.metrics import accuracy_score, classification_report

def basic_kfold_cv(X: np.ndarray, y: np.ndarray, n_splits: int = 5) -> dict:
    """Perform basic k-fold cross-validation and return metrics."""
    if X.shape[0] != y.shape[0]:
        raise ValueError("X and y must have the same number of samples.")
    
    kf = KFold(n_splits=n_splits, shuffle=True, random_state=42)
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    
    scores = cross_val_score(model, X, y, cv=kf, scoring='accuracy')
    
    # Generate predictions for the first fold to demonstrate usage
    train_idx, test_idx = next(kf.split(X))
    model.fit(X[train_idx], y[train_idx])
    y_pred = model.predict(X[test_idx])
    
    return {
        'mean_accuracy': float(np.mean(scores))
        'std_accuracy': float(np.std(scores))
        'fold_scores': scores.tolist()
        'first_fold_report': classification_report(y[test_idx], y_pred, output_dict=True)
    }

# Example usage with synthetic data
if __name__ == "__main__":
    X, y = make_classification(n_samples=500, n_features=10, n_classes=2, random_state=42)
    results = basic_kfold_cv(X, y, n_splits=5)
    print(f"Mean CV Accuracy: {results['mean_accuracy']:.4f} (+/- {results['std_accuracy']:.4f})")
```

### Pattern 2: Production-Ready Cross-Validation

```python
import logging
import numpy as np
import pandas as pd
from typing import Any, Dict, List, Optional
from sklearn.model_selection import StratifiedKFold, TimeSeriesSplit, cross_validate
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.datasets import load_breast_cancer

logger = logging.getLogger(__name__)

class ProductionCrossValidator:
    """Production-grade cross-validation wrapper with logging and error handling."""
    
    def __init__(self, cv_strategy: str = 'stratified', n_splits: int = 5, random_state: int = 42):
        self.cv_strategy = cv_strategy
        self.n_splits = n_splits
        self.random_state = random_state
        self.logger = logging.getLogger(self.__class__.__name__)
        
    def _get_cv_splitter(self, y: np.ndarray) -> Any:
        if self.cv_strategy == 'stratified':
            return StratifiedKFold(n_splits=self.n_splits, shuffle=True, random_state=self.random_state)
        elif self.cv_strategy == 'timeseries':
            return TimeSeriesSplit(n_splits=self.n_splits)
        else:
            raise ValueError(f"Unsupported CV strategy: {self.cv_strategy}")
            
    def execute(self, X: pd.DataFrame, y: pd.Series, model: Any = None) -> Dict[str, Any]:
        """Execute cross-validation on provided data and model."""
        try:
            if X is None or y is None:
                raise ValueError("Input data cannot be None")
            if X.shape[0] != y.shape[0]:
                raise ValueError("X and y must have matching sample counts")
                
            if model is None:
                model = Pipeline([
                    ('scaler', StandardScaler())
                    ('classifier', GradientBoostingClassifier(n_estimators=100, random_state=self.random_state))
                ])
                
            cv_splitter = self._get_cv_splitter(y.values)
            scoring_metrics = ['accuracy', 'precision_weighted', 'recall_weighted', 'f1_weighted']
            
            cv_results = cross_validate(
                model, X, y, cv=cv_splitter, 
                scoring=scoring_metrics, return_train_score=True, n_jobs=-1
            )
            
            self.logger.info(f"CV completed with strategy: {self.cv_strategy}")
            return {
                'status': 'success'
                'cv_strategy': self.cv_strategy
                'n_splits': self.n_splits
                'test_scores': {k: float(np.mean(v)) for k, v in cv_results.items() if k.startswith('test_')}
                'train_scores': {k: float(np.mean(v)) for k, v in cv_results.items() if k.startswith('train_')}
                'fit_times': float(np.mean(cv_results['fit_time']))
                'score_times': float(np.mean(cv_results['score_time']))
            }
        except Exception as e:
            self.logger.error(f"Cross-validation failed: {str(e)}")
            return {'status': 'error', 'message': str(e)}

# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    data = load_breast_cancer()
    X, y = pd.DataFrame(data.data, columns=data.feature_names), pd.Series(data.target)
    validator = ProductionCrossValidator(cv_strategy='stratified', n_splits=5)
    results = validator.execute(X, y)
    print(f"Test F1 Score: {results['test_scores']['f1_weighted']:.4f}")
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

- [Scikit-learn Cross Validation](https://scikit-learn.org/stable/modules/cross_validation.html)
- [Model Selection / Cross-Validation (scikit-learn docs)](https://scikit-learn.org/stable/modules/model_selection.html)
- [Stratified K-Fold — Scikit-learn](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.StratifiedKFold.html)
- [Cross-Validation (Kaggle Learn)](https://www.kaggle.com/learn/cross-validation)
- [Optuna Cross-Validation Integration](https://optuna.readthedocs.io/en/stable/reference/sample.html)