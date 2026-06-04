---
name: ds-model-robustness
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: Improves model robustness including adversarial robustness, out-of-distribution
  detection, and uncertainty quantification
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-anomaly-detection, ds-explainability, ds-model-fairness, ds-reproducible-research
  role: implementation
  scope: implementation
  triggers: model robustness, adversarial robustness, out-of-distribution, OOD detection
    robustness testing, unit tests, testing, test automation
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
# Model Robustness

Comprehensive guide to model robustness in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world reproducibility & responsible ai problems
- Building machine learning pipelines with model robustness
- Implementing best practices for model robustness
- Optimizing model performance using model robustness techniques
- Learning industry-standard approaches to model robustness

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require model robustness rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Model Robustness is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Model Robustness

```python
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

# Generate synthetic dataset with in-distribution and out-of-distribution samples
X_in, y_in = make_classification(n_samples=800, n_features=10, n_classes=2, random_state=42)
X_ood = np.random.uniform(low=-3, high=3, size=(200, 10))
y_ood = np.full(200, -1)  # Label for OOD samples

X = np.vstack([X_in, X_ood])
y = np.concatenate([y_in, y_ood])

# Split into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train a robust ensemble classifier
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Predictions and probability estimates
y_pred = model.predict(X_test)
y_proba = model.predict_proba(X_test)

# Calculate predictive entropy for uncertainty quantification
entropy = -np.sum(y_proba * np.log(y_proba + 1e-10), axis=1)

# OOD detection using Mahalanobis distance approximation via feature variance
train_mean = np.mean(X_train, axis=0)
train_cov = np.cov(X_train.T)
cov_inv = np.linalg.inv(train_cov + 1e-6 * np.eye(train_cov.shape[0]))

mahal_dist = np.array([
    (x - train_mean) @ cov_inv @ (x - train_mean).T for x in X_test
])

# Threshold for OOD detection (95th percentile of training distances)
train_mahal = np.array([
    (x - train_mean) @ cov_inv @ (x - train_mean).T for x in X_train
])
ood_threshold = np.percentile(train_mahal, 95)

results = {
    'accuracy': accuracy_score(y_test, y_pred)
    'mean_uncertainty': float(np.mean(entropy))
    'ood_samples_detected': int(np.sum(mahal_dist > ood_threshold))
    'classification_report': classification_report(y_test, y_pred, zero_division=0)
}
```

### Pattern 2: Production-Ready Model Robustness

```python
import logging
from typing import Any, Dict, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import f1_score

logger = logging.getLogger(__name__)

class ModelRobustness:
    """Production implementation of Model Robustness with OOD detection and uncertainty."""
    
    def __init__(self, ood_percentile: float = 0.95, random_state: int = 42):
        self.ood_percentile = ood_percentile
        self.random_state = random_state
        self.model: Optional[GradientBoostingClassifier] = None
        self.scaler: Optional[StandardScaler] = None
        self.train_stats: Optional[Dict[str, np.ndarray]] = None

    def execute(self, data: pd.DataFrame, labels: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """Execute Model Robustness on data"""
        if data is None or data.empty:
            raise ValueError("Input data cannot be None or empty")
        
        X = data.values
        y = labels if labels is not None else None

        # Initialize scaler and model if not already fitted
        if self.scaler is None:
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)
        else:
            X_scaled = self.scaler.transform(X)

        if self.model is None:
            self.model = GradientBoostingClassifier(n_estimators=50, random_state=self.random_state)
            if y is not None:
                self.model.fit(X_scaled, y)
                self.train_stats = {
                    'mean': np.mean(X_scaled, axis=0)
                    'cov_inv': np.linalg.inv(np.cov(X_scaled.T) + 1e-6 * np.eye(X_scaled.shape[1]))
                }
            else:
                logger.warning("No labels provided for training. Model remains uninitialized.")
                return {'status': 'skipped_training', 'data_shape': X.shape}

        # Predictions and uncertainty
        y_pred = self.model.predict(X_scaled)
        y_proba = self.model.predict_proba(X_scaled)
        uncertainty = -np.sum(y_proba * np.log(y_proba + 1e-10), axis=1)

        # OOD scoring
        mahal_dist = np.array([
            (x - self.train_stats['mean']) @ self.train_stats['cov_inv'] @ (x - self.train_stats['mean']).T 
            for x in X_scaled
        ])
        is_ood = mahal_dist > np.percentile(mahal_dist, self.ood_percentile * 100)

        metrics = {
            'f1_score': float(f1_score(y, y_pred, average='weighted', zero_division=0))
            'mean_uncertainty': float(np.mean(uncertainty))
            'ood_ratio': float(np.mean(is_ood))
            'predictions': y_pred.tolist()
        }
        return metrics
```

### Pattern 3: BAD vs GOOD Uncertainty Handling

```python
# BAD: Ignoring uncertainty thresholds and blindly trusting low-confidence predictions
def bad_predict(model, X_test):
    predictions = model.predict(X_test)
    return predictions  # Fails silently on OOD or high-entropy samples

# GOOD: Explicit uncertainty gating and OOD rejection per OWASP ML Security Top 10
def good_predict_with_robustness(model, X_test, scaler, threshold: float = 0.85):
    if X_test is None or X_test.size == 0:
        raise ValueError("Input tensor cannot be empty")
        
    X_scaled = scaler.transform(X_test)
    y_proba = model.predict_proba(X_scaled)
    confidence = np.max(y_proba, axis=1)
    entropy = -np.sum(y_proba * np.log(y_proba + 1e-10), axis=1)
    
    # Reject samples below confidence threshold or above entropy threshold
    mask = (confidence >= threshold) & (entropy <= np.percentile(entropy, 90))
    safe_predictions = model.predict(X_scaled[mask])
    rejected_count = int(np.sum(~mask))
    
    return safe_predictions, rejected_count
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

- [Robust Statistics — Wikipedia](https://en.wikipedia.org/wiki/Robust_statistics)
- [Scikit-learn Robust Scaling](https://scikit-learn.org/stable/modules/preprocessing.html#preprocessing-robust-scaling)
- [Outlier Detection Methods (NIST Handbook)](https://www.itl.nist.gov/div898/handbook/tq/section4/tq_4_2.htm)
- [M-Estimators — Statistical Learning Theory](https://en.wikipedia.org/wiki/M-estimator)
- [Robust Machine Learning — MIT 6.S191](https://www.youtube.com/watch?v=9w6y7prKjE8)