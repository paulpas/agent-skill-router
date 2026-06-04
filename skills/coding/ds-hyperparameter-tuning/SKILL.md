---
name: ds-hyperparameter-tuning
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Optimizes hyperparameters using grid search, random search, Bayesian
  optimization, and evolutionary methods for model improvement"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-bias-variance-tradeoff, ds-cross-validation, ds-model-selection
    ds-support-vector-machines ds-tree-methods
  role: implementation
  scope: implementation
  triggers: hyperparameter tuning, grid search, random search, bayesian optimization
    how do I tune parameters
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
# Hyperparameter Tuning

Comprehensive guide to hyperparameter tuning in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world model evaluation & selection problems
- Building machine learning pipelines with hyperparameter tuning
- Implementing best practices for hyperparameter tuning
- Optimizing model performance using hyperparameter tuning techniques
- Learning industry-standard approaches to hyperparameter tuning

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require hyperparameter tuning rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Hyperparameter Tuning is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Hyperparameter Tuning

```python
import pandas as pd
import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import GridSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

# Generate reproducible sample dataset
X, y = make_classification(n_samples=500, n_features=10, random_state=42)

# Define base estimator and parameter search space
model = RandomForestClassifier(random_state=42)
param_grid: dict[str, list[int]] = {
    'n_estimators': [50, 100, 200]
    'max_depth': [None, 10, 20]
    'min_samples_split': [2, 5, 10]
}

# Initialize GridSearchCV with stratified cross-validation
grid_search: GridSearchCV = GridSearchCV(
    estimator=model
    param_grid=param_grid
    cv=5
    scoring='accuracy'
    n_jobs=-1
    verbose=1
)

# Fit the model to the data
grid_search.fit(X, y)

# Extract and display optimal configuration
best_params: dict[str, int | None] = grid_search.best_params_
best_score: float = grid_search.best_score_
print(f"Best Parameters: {best_params}")
print(f"Best CV Score: {best_score:.4f}")
```

### Pattern 2: Production-Ready Hyperparameter Tuning

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List, Tuple
from sklearn.model_selection import RandomizedSearchCV
from sklearn.base import BaseEstimator
from sklearn.metrics import make_scorer, accuracy_score

logger = logging.getLogger(__name__)

class HyperparameterTuning:
    """Production implementation of Hyperparameter Tuning"""
    
    def __init__(self, model: BaseEstimator, param_distributions: Dict[str, List], cv: int = 5):
        self.model = model
        self.param_distributions = param_distributions
        self.cv = cv
        self.results: Dict[str, Any] = {}
        
    def execute(self, X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
        """Execute Hyperparameter Tuning on data"""
        try:
            logger.info("Starting hyperparameter tuning...")
            search = RandomizedSearchCV(
                estimator=self.model
                param_distributions=self.param_distributions
                n_iter=20
                cv=self.cv
                scoring=make_scorer(accuracy_score)
                random_state=42
                n_jobs=-1
            )
            search.fit(X, y)
            
            self.results = {
                'best_params': search.best_params_
                'best_score': float(search.best_score_)
                'cv_results_mean': search.cv_results_['mean_test_score'].tolist()
                'status': 'success'
            }
            logger.info(f"Tuning completed. Best score: {self.results['best_score']:.4f}")
            return self.results
        except Exception as e:
            logger.error(f"Tuning failed: {str(e)}")
            return {'status': 'failed', 'error': str(e)}
```

## Best Practices

- ✅ Always validate your implementation on test data
- ✅ Document your assumptions and methodology
- ✅ Use version control for reproducibility
- ✅ Monitor performance metrics in production
- ✅ Periodically review and update your approach
- ✅ Test with edge cases and outliers
- ✅ Log all significant operations for debugging
- ✅ Follow SOLID principles to keep tuning logic modular and testable
- ✅ Adhere to DRY principles by abstracting repeated search configurations

## Common Pitfalls

| Pitfall | Problem | Solution |
|

---

---

## Constraints

### MUST DO
- Use cross-validation with stratified splits for classification, group-aware splits when data has natural groups
- Implement early stopping for iterative methods (XGBoost, neural nets) based on validation loss, not training loss
- Search log-scale for parameters like learning_rate, C, and gamma using log-uniform distributions
- Report the best configuration along with its cross-validated standard deviation to quantify result stability

### MUST NOT DO
- Do not optimize hyperparameters on a single train/validation split — always use k-fold or repeated CV
- Avoid exhaustive grid search when random search or Bayesian optimization would be more efficient
- Never set patience too low for early stopping — 50-100 epochs minimum to allow models to learn complex patterns
- Do not ignore the interaction between learning rate and batch size — they are coupled parameters


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Scikit-learn Grid Search](https://scikit-learn.org/stable/modules/grid_search.html)
- [Optuna Documentation](https://optuna.org/)
- [Hyperopt — Distributed Algorithm Optimization](https://github.com/hyperopt/hyperopt/wiki/FMin)
- [Bayesian Hyperparameter Optimization (Artur's Blog)](https://nikhilsood.github.io/bayesian_optimization/)
- [Ray Tune Documentation](https://docs.ray.io/en/latest/tune/index.html)