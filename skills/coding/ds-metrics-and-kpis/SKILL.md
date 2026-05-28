---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Defines, selects, and monitors key performance indicators (KPIs), business
  metrics, and evaluation metrics for decision-making"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-ab-testing, ds-classification-metrics, ds-online-experiments
    ds-regression-evaluation ds-regression-evaluation
  role: implementation
  scope: implementation
  triggers: metrics, KPI, key performance indicator, business metrics, metric definition
    how do I choose metrics, cloudwatch, optimization
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
name: metrics-and-kpis
------
# Metrics and KPIs

Comprehensive guide to metrics and kpis in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world experimentation & a/b testing problems
- Building machine learning pipelines with metrics and kpis
- Implementing best practices for metrics and kpis
- Optimizing model performance using metrics and kpis techniques
- Learning industry-standard approaches to metrics and kpis

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require metrics and kpis rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Metrics and KPIs is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Metrics and KPIs

```python
import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, mean_squared_error, r2_score

def compute_basic_metrics(y_true: pd.Series, y_pred: pd.Series, task_type: str = "classification") -> dict:
    """Compute basic evaluation metrics for classification or regression tasks."""
    if y_true is None or y_pred is None:
        raise ValueError("y_true and y_pred cannot be None")
    if len(y_true) != len(y_pred):
        raise ValueError("y_true and y_pred must have the same length")

    metrics = {}
    if task_type == "classification":
        metrics["accuracy"] = accuracy_score(y_true, y_pred)
        metrics["precision"] = precision_score(y_true, y_pred, average="weighted", zero_division=0)
        metrics["recall"] = recall_score(y_true, y_pred, average="weighted", zero_division=0)
        metrics["f1"] = f1_score(y_true, y_pred, average="weighted", zero_division=0)
    elif task_type == "regression":
        metrics["mse"] = mean_squared_error(y_true, y_pred)
        metrics["rmse"] = np.sqrt(metrics["mse"])
        metrics["mae"] = np.mean(np.abs(y_true - y_pred))
        metrics["r2"] = r2_score(y_true, y_pred)
    else:
        raise ValueError("task_type must be 'classification' or 'regression'")

    metrics["sample_size"] = len(y_true)
    return metrics

# Example usage
if __name__ == "__main__":
    y_true = pd.Series([0, 1, 1, 0, 1, 0, 1, 1, 0, 0])
    y_pred = pd.Series([0, 1, 0, 0, 1, 1, 1, 0, 0, 1])
    results = compute_basic_metrics(y_true, y_pred, task_type="classification")
    print("Classification Metrics:", results)
```

### Pattern 2: Production-Ready Metrics and KPIs

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List
from sklearn.metrics import classification_report, confusion_matrix

logger = logging.getLogger(__name__)

class MetricsAndKPIs:
    """Production-grade metrics and KPIs tracker and calculator."""
    
    def __init__(self, kpi_names: List[str] = None):
        self.kpi_names = kpi_names or ["accuracy", "precision", "recall", "f1", "business_roi"]
        self.history: List[Dict[str, Any]] = []
        logger.info("Initialized MetricsAndKPIs tracker")
    
    def _validate_inputs(self, y_true: pd.Series, y_pred: pd.Series) -> None:
        if not isinstance(y_true, pd.Series) or not isinstance(y_pred, pd.Series):
            raise TypeError("Inputs must be pandas Series")
        if y_true.empty or y_pred.empty:
            raise ValueError("Input Series cannot be empty")
        if len(y_true) != len(y_pred):
            raise ValueError("y_true and y_pred must have matching lengths")
    
    def execute(self, data: pd.DataFrame, target_col: str = "y_true", pred_col: str = "y_pred") -> Dict[str, Any]:
        """Execute metrics calculation on provided DataFrame."""
        try:
            self._validate_inputs(data[target_col], data[pred_col])
            y_true = data[target_col]
            y_pred = data[pred_col]

            report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
            cm = confusion_matrix(y_true, y_pred).tolist()

            f1 = report.get("macro avg", {}).get("f1-score", 0.0)
            business_roi = f1 * 1000

            result = {
                "metrics": {
                    "accuracy": report["accuracy"]
                    "precision_macro": report["macro avg"]["precision"]
                    "recall_macro": report["macro avg"]["recall"]
                    "f1_macro": report["macro avg"]["f1-score"]
                    "confusion_matrix": cm
                    "business_roi": business_roi
                }
                "metadata": {
                    "rows_processed": len(data)
                    "kpi_names": self.kpi_names
                    "timestamp": pd.Timestamp.now().isoformat()
                }
            }
            self.history.append(result)
            logger.info(f"Metrics computed successfully for {len(data)} rows")
            return result
        except Exception as e:
            logger.error(f"Metrics execution failed: {str(e)}")
            raise RuntimeError(f"Failed to compute metrics: {e}") from e
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

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Kaggle Metrics for Machine Learning](https://www.kaggle.com/learn/metrics-for-machine-learning-education)
- [MLflow Metrics Tracking](https://mlflow.org/docs/latest/tracking.html)
- [Scikit-learn Model Evaluation](https://scikit-learn.org/stable/modules/model_evaluation.html)
- [OKR & KPI Best Practices (Gartner)](https://www.gartner.com/en/articles/what-are-kpis)
- [Machine Learning Metrics (Towards Data Science)](https://towardsdatascience.com/machine-learning-metrics-made-simple-a974063a1080)