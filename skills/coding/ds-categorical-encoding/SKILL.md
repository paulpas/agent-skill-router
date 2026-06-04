---
name: ds-categorical-encoding
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Encodes categorical variables using one-hot encoding, target
  encoding, ordinal encoding, embeddings, and other encoding strategies"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-feature-engineering, ds-feature-scaling-normalization, ds-neural-networks
  role: implementation
  scope: implementation
  triggers: categorical encoding, one-hot encoding, target encoding, ordinal encoding
    categorical variables
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
# Categorical Encoding

Comprehensive guide to categorical encoding in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world feature engineering problems
- Building machine learning pipelines with categorical encoding
- Implementing best practices for categorical encoding
- Optimizing model performance using categorical encoding techniques
- Learning industry-standard approaches to categorical encoding

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require categorical encoding rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Categorical Encoding is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Categorical Encoding

```python
import pandas as pd
import numpy as np
from sklearn.datasets import make_classification
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

def basic_categorical_encoding_demo():
    # BAD: Using pandas get_dummies without handling unknown categories or data leakage
    # df_encoded = pd.get_dummies(df, columns=['category']) 
    
    # GOOD: Using sklearn OneHotEncoder with proper train/test separation and unknown handling
    X_raw, y = make_classification(n_samples=500, n_features=4, n_informative=3, 
                                   n_redundant=1, n_classes=2, random_state=42)
    df = pd.DataFrame(X_raw, columns=['num1', 'num2', 'cat1', 'cat2'])
    df['target'] = y
    
    X = df.drop('target', axis=1)
    y = df['target']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    ohe = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
    X_train_ohe = ohe.fit_transform(X_train[['cat1']])
    X_test_ohe = ohe.transform(X_test[['cat1']])

    oe = OrdinalEncoder()
    X_train_ord = oe.fit_transform(X_train[['cat2']])
    X_test_ord = oe.transform(X_test[['cat2']])

    X_train_combined = np.hstack([X_train_ohe, X_train[['num1', 'num2']].values, X_train_ord])
    X_test_combined = np.hstack([X_test_ohe, X_test[['num1', 'num2']].values, X_test_ord])

    clf = RandomForestClassifier(n_estimators=50, random_state=42)
    clf.fit(X_train_combined, y_train)
    y_pred = clf.predict(X_test_combined)

    print("One-Hot & Ordinal Encoding Demo")
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(classification_report(y_test, y_pred))
    return X_train_combined, X_test_combined
```

### Pattern 2: Production-Ready Categorical Encoding

```python
import logging
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import accuracy_score

logger = logging.getLogger(__name__)

class CategoricalEncodingPipeline:
    """Production-ready categorical encoding with sklearn pipeline integration"""
    
    def __init__(self, nominal_cols: List[str], ordinal_cols: List[str], target_col: str):
        self.nominal_cols = nominal_cols
        self.ordinal_cols = ordinal_cols
        self.target_col = target_col
        self.preprocessor = None
        self.model = None
        self.feature_names = None

    def fit(self, df: pd.DataFrame) -> 'CategoricalEncodingPipeline':
        if df.empty:
            raise ValueError("Input DataFrame cannot be empty")
        
        transformers = []
        if self.nominal_cols:
            transformers.append(('ohe', OneHotEncoder(handle_unknown='ignore', sparse_output=False), self.nominal_cols))
        if self.ordinal_cols:
            transformers.append(('oe', OrdinalEncoder(), self.ordinal_cols))
            
        self.preprocessor = ColumnTransformer(transformers=transformers, remainder='passthrough')
        
        X = df.drop(self.target_col, axis=1)
        y = df[self.target_col]
        X_transformed = self.preprocessor.fit_transform(X, y)
        
        self.feature_names = self.preprocessor.get_feature_names_out()
        logger.info(f"Encoded {len(self.feature_names)} features successfully")
        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        if self.preprocessor is None:
            raise RuntimeError("Pipeline must be fitted before transformation")
        return self.preprocessor.transform(df.drop(self.target_col, axis=1))

    def train_model(self, df: pd.DataFrame) -> Dict[str, Any]:
        X = self.transform(df)
        y = df[self.target_col]
        
        self.model = GradientBoostingClassifier(n_estimators=100, random_state=42)
        self.model.fit(X, y)
        
        y_pred = self.model.predict(X)
        metrics = {
            'accuracy': accuracy_score(y, y_pred)
            'n_features': X.shape[1]
            'n_samples': X.shape[0]
        }
        logger.info(f"Model trained. Accuracy: {metrics['accuracy']:.4f}")
        return metrics
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

- [Scikit-learn Preprocessing of Categorical Features](https://scikit-learn.org/stable/modules/preprocessing_categoricals.html)
- [Feature Engineering — Scikit-learn docs](https://scikit-learn.org/stable/modules/feature_extraction.html#categorical-encoding)
- [Category Encoders Library Documentation](https://contrib.scikit-learn.org/category_encoders/)
- [Encoding Categorical Features (Kaggle Learn)](https://www.kaggle.com/learn/categorical-encoding)
- [One-Hot vs Target Encoding (Towards Data Science)](https://towardsdatascience.com/what-is-the-difference-between-one-hot-and-target-encoding-c45193a07c09)