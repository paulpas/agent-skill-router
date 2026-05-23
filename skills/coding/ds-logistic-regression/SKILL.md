---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Implements logistic regression for binary and multinomial classification
  with probability estimation and odds ratio interpretation"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-classification-metrics, ds-feature-engineering, ds-linear-regression
  role: implementation
  scope: implementation
  triggers: logistic regression, classification, binary classification, multinomial,
    how do i classify
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
name: logistic-regression
------
# Logistic Regression

Comprehensive guide to logistic regression in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world supervised learning problems
- Building machine learning pipelines with logistic regression
- Implementing best practices for logistic regression
- Optimizing model performance using logistic regression techniques
- Learning industry-standard approaches to logistic regression

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require logistic regression rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Logistic Regression is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Logistic Regression

```python
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.datasets import make_classification
from typing import Tuple

def basic_logistic_regression() -> Tuple[pd.DataFrame, LogisticRegression]:
    """Generate synthetic data, train model, and return results."""
    X, y = make_classification(n_samples=500, n_features=10, n_informative=5, random_state=42)
    df = pd.DataFrame(X, columns=[f'feature_{i}' for i in range(X.shape[1])])
    df['target'] = y
    
    X_train, X_test, y_train, y_test = train_test_split(
        df.drop('target', axis=1), df['target'], test_size=0.2, random_state=42
    )
    
    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(classification_report(y_test, y_pred))
    
    return df, model

if __name__ == "__main__":
    basic_logistic_regression()
```

### Pattern 2: Production-Ready Logistic Regression

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

logger = logging.getLogger(__name__)

class LogisticRegressionPipeline:
    """Production-ready logistic regression pipeline with validation and metrics."""
    
    def __init__(self, C: float = 1.0, penalty: str = 'l2', random_state: int = 42) -> None:
        self.C = C
        self.penalty = penalty
        self.random_state = random_state
        self.pipeline: Pipeline | None = None
        self.scaler: StandardScaler | None = None
        self.model: LogisticRegression | None = None

    def execute(self, data: pd.DataFrame, target_col: str = 'target') -> Dict[str, Any]:
        """Execute logistic regression pipeline on provided data."""
        if data is None or data.empty:
            raise ValueError("Input data cannot be None or empty")
        if target_col not in data.columns:
            raise ValueError(f"Target column '{target_col}' not found in data")
        
        X = data.drop(columns=[target_col])
        y = data[target_col]
        
        self.scaler = StandardScaler()
        self.model = LogisticRegression(C=self.C, penalty=self.penalty, random_state=self.random_state, max_iter=1000)
        self.pipeline = Pipeline([('scaler', self.scaler), ('classifier', self.model)])
        
        self.pipeline.fit(X, y)
        predictions = self.pipeline.predict(X)
        probabilities = self.pipeline.predict_proba(X)
        
        logger.info("Pipeline executed successfully")
        return {
            'status': 'success',
            'predictions': predictions.tolist(),
            'probabilities': probabilities.tolist(),
            'model_params': {'C': self.C, 'penalty': self.penalty},
            'feature_names': X.columns.tolist()
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