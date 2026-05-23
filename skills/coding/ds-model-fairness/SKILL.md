---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Evaluates and mitigates fairness issues including bias detection, fairness
  metrics, and debiasing strategies in machine learning"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-explainability, ds-model-interpretation, ds-model-robustness,
    ds-privacy-ml ds-privacy-ml
  role: implementation
  scope: implementation
  triggers: model fairness, fairness metrics, bias detection, debiasing, fair machine
    learning, how do I check bias
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
name: model-fairness
------
# Model Fairness

Comprehensive guide to model fairness in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world reproducibility & responsible ai problems
- Building machine learning pipelines with model fairness
- Implementing best practices for model fairness
- Optimizing model performance using model fairness techniques
- Learning industry-standard approaches to model fairness

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require model fairness rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Model Fairness is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Model Fairness

```python
import pandas as pd
import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

# Generate synthetic dataset with a sensitive attribute
X, y = make_classification(n_samples=1000, n_features=5, n_informative=3, random_state=42)
sensitive_attr = np.random.randint(0, 2, size=1000)
df = pd.DataFrame(X, columns=[f'feat_{i}' for i in range(5)])
df['target'] = y
df['sensitive'] = sensitive_attr

# Split data
train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)

# Train baseline model
model = LogisticRegression(random_state=42)
model.fit(train_df.drop(columns=['target', 'sensitive']), train_df['target'])

# Predictions
y_pred = model.predict(test_df.drop(columns=['target', 'sensitive']))

# Calculate Demographic Parity Difference
def calc_demographic_parity_diff(y_true, y_pred, sensitive):
    groups = np.unique(sensitive)
    rates = [np.mean(y_pred[sensitive == g]) for g in groups]
    return max(rates) - min(rates)

dp_diff = calc_demographic_parity_diff(test_df['target'], y_pred, test_df['sensitive'])
print(f"Demographic Parity Difference: {dp_diff:.4f}")
```

### Pattern 2: Production-Ready Model Fairness

```python
import logging
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.datasets import make_classification

logger = logging.getLogger(__name__)

class ModelFairnessAuditor:
    """Production-grade fairness auditing and debiasing class"""
    
    def __init__(self, sensitive_features: str, target_col: str, threshold: float = 0.5):
        self.sensitive_features = sensitive_features
        self.target_col = target_col
        self.threshold = threshold
        self.model = None
        self.results: Dict[str, Any] = {}

    def _validate_input(self, df: pd.DataFrame) -> None:
        if df is None or df.empty:
            raise ValueError("Input DataFrame cannot be None or empty")
        required_cols = [self.sensitive_features, self.target_col]
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

    def _calculate_metrics(self, y_true: np.ndarray, y_pred: np.ndarray, sensitive: np.ndarray) -> Dict[str, float]:
        groups = np.unique(sensitive)
        if len(groups) < 2:
            return {"error": "Need at least two groups for fairness metrics"}
        
        group_rates = {g: np.mean(y_pred[sensitive == g]) for g in groups}
        dp_diff = max(group_rates.values()) - min(group_rates.values())
        
        tp_rates = {g: np.mean(y_pred[sensitive == g] & y_true == 1) / max(np.sum(y_true == 1), 1) for g in groups}
        eod = max(tp_rates.values()) - min(tp_rates.values())
        
        return {"demographic_parity_diff": dp_diff, "equal_opportunity_diff": eod}

    def execute(self, data: pd.DataFrame) -> Dict[str, Any]:
        self._validate_input(data)
        try:
            X = data.drop(columns=[self.target_col, self.sensitive_features])
            y = data[self.target_col]
            sensitive = data[self.sensitive_features]
            
            X_train, X_test, y_train, y_test, s_train, s_test = train_test_split(
                X, y, sensitive, test_size=0.2, random_state=42
            )
            
            self.model = RandomForestClassifier(n_estimators=50, random_state=42)
            self.model.fit(X_train, y_train)
            y_pred = self.model.predict(X_test)
            
            metrics = self._calculate_metrics(y_test.values, y_pred, s_test.values)
            self.results = {
                "status": "success",
                "metrics": metrics,
                "predictions": y_pred.tolist(),
                "model_type": "RandomForestClassifier"
            }
            logger.info(f"Fairness audit complete. DP Diff: {metrics['demographic_parity_diff']:.4f}")
            return self.results
        except Exception as e:
            logger.error(f"Audit failed: {str(e)}")
            return {"status": "error", "message": str(e)}
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