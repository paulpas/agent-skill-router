---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Implements support vector machines (SVM) with kernel methods, support
  vectors, and margin maximization for classification and regression"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-hyperparameter-tuning, ds-neural-networks, ds-tree-methods
  role: implementation
  scope: implementation
  triggers: support vector machines, SVM, kernel methods, support vectors, SVM classification
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
name: support-vector-machines
------
# Support Vector Machines

Comprehensive guide to support vector machines in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world supervised learning problems
- Building machine learning pipelines with support vector machines
- Implementing best practices for support vector machines
- Optimizing model performance using support vector machines techniques
- Learning industry-standard approaches to support vector machines

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require support vector machines rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Support Vector Machines is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Support Vector Machines

```python
import numpy as np
import pandas as pd
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report

# Generate synthetic classification dataset
X, y = make_classification(n_samples=500, n_features=10, n_classes=2, random_state=42)
df = pd.DataFrame(X, columns=[f'feature_{i}' for i in range(X.shape[1])])
df['target'] = y

# Split and scale data
X_train, X_test, y_train, y_test = train_test_split(
    df.drop('target', axis=1), df['target'], test_size=0.2, random_state=42
)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train SVM classifier
svm_model = SVC(kernel='rbf', C=1.0, gamma='scale', random_state=42)
svm_model.fit(X_train_scaled, y_train)

# Predict and evaluate
y_pred = svm_model.predict(X_test_scaled)
print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
print(classification_report(y_test, y_pred))
```

### Pattern 2: Production-Ready Support Vector Machines

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, Optional
from sklearn.svm import SVC
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, f1_score

logger = logging.getLogger(__name__)

class SupportVectorMachines:
    """Production-ready SVM wrapper with pipeline and metrics."""
    
    def __init__(self, kernel: str = 'rbf', C: float = 1.0, gamma: str = 'scale') -> None:
        self.kernel = kernel
        self.C = C
        self.gamma = gamma
        self.pipeline: Optional[Pipeline] = None
        
    def fit(self, X: pd.DataFrame, y: pd.Series) -> 'SupportVectorMachines':
        """Train the SVM model with automatic scaling."""
        try:
            self.pipeline = Pipeline([
                ('scaler', StandardScaler())
                ('svm', SVC(kernel=self.kernel, C=self.C, gamma=self.gamma, random_state=42))
            ])
            self.pipeline.fit(X, y)
            logger.info("SVM model trained successfully.")
        except Exception as e:
            logger.error(f"Training failed: {e}")
            raise RuntimeError("SVM training failed") from e
        return self
        
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Generate predictions on new data."""
        if self.pipeline is None:
            raise ValueError("Model must be fitted before prediction.")
        return self.pipeline.predict(X)
        
    def evaluate(self, X: pd.DataFrame, y: pd.Series) -> Dict[str, float]:
        """Compute evaluation metrics."""
        y_pred = self.predict(X)
        return {
            'accuracy': float(accuracy_score(y, y_pred))
            'f1_score': float(f1_score(y, y_pred, average='weighted'))
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
- ✅ Follow the DRY (Don't Repeat Yourself) principle for reusable preprocessing and evaluation logic

### BAD vs GOOD Code Examples

```python
# BAD: Hardcoded values, no scaling, missing error handling, poor structure
def train_svm(data):
    model = SVC()
    model.fit(data[:, :-1], data[:, -1])
    return model.predict(data[:, :-1])

# GOOD: Type hints, scaling, validation, clear separation of concerns
def train_svm_proper(X: pd.DataFrame, y: pd.Series) -> Dict[str, Any]:
    if X.empty or y.empty:
        raise ValueError("Input data cannot be empty")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model = SVC(kernel='rbf', C=1.0, random_state=42)
    model.fit(X_scaled, y)
    return {'model': model, 'scaler': scaler}
```

## Common Pitfalls

| Pitfall | Problem | Solution |
|

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Scikit-learn SVM](https://scikit-learn.org/stable/modules/svm.html)
- [Support Vector Classification — Scikit-learn docs](https://scikit-learn.org/stable/modules/svm.html#support-vector-classification)
- [Kernel Trick Explained (Colah's Blog)](http://colah.github.io/posts/2014-03-ML-Mahalanobis-Kernel-SVM/)
- [LIBSVM Library Documentation](https://www.csie.ntu.edu.tw/~cjlin/libsvm/)
- [SVM Hyperparameter Tuning (Scikit-learn User Guide)](https://scikit-learn.org/stable/modules/svm.html#parameters)
- [SVM Tutorial — Scikit-learn examples](https://scikit-learn.org/stable/auto_examples/svm/plot_svm_rbf_parameters.html), |