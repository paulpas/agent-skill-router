---




name: ds-model-selection
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Compares and selects models using AIC, BIC, validation curves
  learning curves, and model comparison techniques"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-bias-variance-tradeoff, ds-cross-validation, ds-ensemble-methods
    ds-hyperparameter-tuning ds-regression-evaluation
  role: implementation
  scope: implementation
  triggers: model selection, AIC, BIC, validation curves, learning curves, model comparison
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




# Model Selection

Comprehensive guide to model selection in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world model evaluation & selection problems
- Building machine learning pipelines with model selection
- Implementing best practices for model selection
- Optimizing model performance using model selection techniques
- Learning industry-standard approaches to model selection

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require model selection rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Model Selection is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Model Selection

```python
import numpy as np
import pandas as pd
from typing import Dict, Any
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.datasets import make_regression

def basic_model_selection() -> Dict[str, Any]:
    """
    Demonstrates basic model selection by comparing Linear and Ridge regression.
    Follows DRY principle by centralizing evaluation logic.
    """
    X, y = make_regression(n_samples=500, n_features=10, noise=0.1, random_state=42)
    df = pd.DataFrame(X, columns=[f'feature_{i}' for i in range(X.shape[1])])
    df['target'] = y

    X_train, X_test, y_train, y_test = train_test_split(
        df.drop('target', axis=1), df['target'], test_size=0.2, random_state=42
    )

    models: Dict[str, Any] = {
        'Linear Regression': LinearRegression()
        'Ridge Regression': Ridge(alpha=1.0)
    }

    results: Dict[str, Any] = {}
    for name, model in models.items():
        cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='r2')
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        r2 = r2_score(y_test, y_pred)
        mse = mean_squared_error(y_test, y_pred)

        results[name] = {
            'cv_r2_mean': float(np.mean(cv_scores))
            'cv_r2_std': float(np.std(cv_scores))
            'test_r2': float(r2)
            'test_mse': float(mse)
        }
        print(f"{name} - CV R2: {np.mean(cv_scores):.4f} (+/- {np.std(cv_scores):.4f}), Test R2: {r2:.4f}")

    return results

if __name__ == "__main__":
    basic_model_selection()
```

### Pattern 2: Production-Ready Model Selection

```python
import logging
import numpy as np
import pandas as pd
from typing import Any, Dict, List
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report
from sklearn.datasets import make_classification

logger = logging.getLogger(__name__)

class ModelSelector:
    """Production implementation of Model Selection following SOLID principles."""
    
    def __init__(self, cv_folds: int = 5, random_state: int = 42) -> None:
        self.cv_folds = cv_folds
        self.random_state = random_state
        self.selected_model: Any = None
        self.results: Dict[str, Any] = {}
    
    def _prepare_data(self, data: pd.DataFrame, target_col: str) -> tuple:
        if target_col not in data.columns:
            raise ValueError(f"Target column '{target_col}' not found in data")
        X = data.drop(columns=[target_col])
        y = data[target_col]
        if X.isnull().any().any() or y.isnull().any():
            logger.warning("Data contains missing values. Dropping rows with NaN.")
            X, y = X.dropna(), y.dropna()
        return train_test_split(X, y, test_size=0.2, random_state=self.random_state, stratify=y)
    
    def execute(self, data: pd.DataFrame, target_col: str = 'target') -> Dict[str, Any]:
        """Execute Model Selection on data"""
        try:
            X_train, X_test, y_train, y_test = self._prepare_data(data, target_col)
            models = {
                'Logistic Regression': LogisticRegression(max_iter=1000, random_state=self.random_state)
                'Random Forest': RandomForestClassifier(n_estimators=100, random_state=self.random_state)
                'SVM': SVC(kernel='rbf', probability=True, random_state=self.random_state)
            }

            best_score = -np.inf
            best_name = None

            for name, model in models.items():
                cv_scores = cross_val_score(model, X_train, y_train, cv=self.cv_folds, scoring='accuracy')
                model.fit(X_train, y_train)
                y_pred = model.predict(X_test)
                acc = accuracy_score(y_test, y_pred)
                report = classification_report(y_test, y_pred, output_dict=True)

                self.results[name] = {
                    'cv_accuracy_mean': float(np.mean(cv_scores))
                    'cv_accuracy_std': float(np.std(cv_scores))
                    'test_accuracy': float(acc)
                    'classification_report': report
                }

                if np.mean(cv_scores) > best_score:
                    best_score = np.mean(cv_scores)
                    best_name = name
                    self.selected_model = model

            logger.info(f"Selected model: {best_name} with CV accuracy: {best_score:.4f}")
            return self.results
        except Exception as e:
            logger.error(f"Model selection failed: {str(e)}")
            raise

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    X, y = make_classification(n_samples=1000, n_features=20, n_classes=2, random_state=42)
    df = pd.DataFrame(X, columns=[f'feat_{i}' for i in range(X.shape[1])])
    df['target'] = y
    selector = ModelSelector(cv_folds=5)
    results = selector.execute(df, target_col='target')
    print(f"Best model selected: {selector.selected_model}")
```

### BAD vs GOOD Example

```python
# BAD: Hardcoded values, no error handling, mixes data prep and evaluation
def bad_selection(data):
    model = LinearRegression()
    model.fit(data[:, :-1], data[:, -1])
    return model.score(data[:, :-1], data[:, -1])

# GOOD: Type hints, validation, separation of concerns, proper metrics
def good_selection(X: np.ndarray, y: np.ndarray) -> float:
    if X.shape[0] != y.shape[0]:
        raise ValueError("X and y must have the same number of samples")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = LinearRegression()
    model.fit(X_train, y_train)
    return float(r2_score(y_test, model.predict(X_test)))
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

- [Scikit-learn Model Evaluation](https://scikit-learn.org/stable/modules/model_evaluation.html)
- [Model Selection — Scikit-learn docs](https://scikit-learn.org/stable/modules/model_selection.html)
- [Cross-Validation (Kaggle Learn)](https://www.kaggle.com/learn/cross-validation)
- [AIC vs BIC (NIST Handbook)](https://www.itl.nist.gov/div898/handbook/tq/section4/tq_2.htm)
- [Model Selection and Regularization (ESL Chapter 7)](https://web.stanford.edu/~hastie/ElemStatLearn/)