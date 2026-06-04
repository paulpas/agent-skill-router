---
name: ds-clustering
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Implements clustering algorithms including K-means, hierarchical clustering
  DBSCAN, Gaussian mixture models, and spectral clustering"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-anomaly-detection, ds-association-rules, ds-community-detection
    ds-dimensionality-reduction ds-dimensionality-reduction
  role: implementation
  scope: implementation
  triggers: clustering, k-means, hierarchical clustering, DBSCAN, mixture models
    how do I cluster data
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
# Clustering

Comprehensive guide to clustering in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world unsupervised learning problems
- Building machine learning pipelines with clustering
- Implementing best practices for clustering
- Optimizing model performance using clustering techniques
- Learning industry-standard approaches to clustering

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require clustering rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Clustering is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Clustering

```python
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.datasets import make_blobs
from sklearn.preprocessing import StandardScaler
from typing import Dict, Any

def basic_clustering_workflow(
    n_samples: int = 300, 
    n_clusters: int = 3
) -> Dict[str, Any]:
    """
    Demonstrates a basic clustering workflow with validation, scaling, 
    and evaluation metrics. Follows PEP 8 and scikit-learn API standards.
    """
    if n_samples < n_clusters:
        raise ValueError("Number of samples must exceed number of clusters")
        
    X, y_true = make_blobs(n_samples=n_samples, centers=n_clusters, random_state=42)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(X_scaled)
    
    silhouette_avg = silhouette_score(X_scaled, cluster_labels)
    inertia = kmeans.inertia_
    
    return {
        "labels": cluster_labels
        "silhouette_score": float(silhouette_avg)
        "inertia": float(inertia)
        "centers": kmeans.cluster_centers_
    }
```

### Pattern 2: Production-Ready Clustering

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, Literal
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler
import warnings

logger = logging.getLogger(__name__)

class ProductionClustering:
    """Production-ready clustering implementation with validation and metrics."""
    
    def __init__(self, algorithm: Literal["kmeans", "dbscan"] = "kmeans", **kwargs: Any):
        self.algorithm = algorithm
        self.kwargs = kwargs
        self.scaler = StandardScaler()
        self.model = None
        
    def _validate_input(self, data: pd.DataFrame) -> pd.DataFrame:
        if data.empty:
            raise ValueError("Input DataFrame cannot be empty")
        if not np.isfinite(data.values).all():
            raise ValueError("Input data contains non-finite values")
        return data.dropna()
        
    def execute(self, data: pd.DataFrame) -> Dict[str, Any]:
        try:
            clean_data = self._validate_input(data)
            X_scaled = self.scaler.fit_transform(clean_data)
            
            if self.algorithm == "kmeans":
                self.model = KMeans(random_state=42, n_init=10, **self.kwargs)
            elif self.algorithm == "dbscan":
                self.model = DBSCAN(**self.kwargs)
            else:
                raise ValueError(f"Unsupported algorithm: {self.algorithm}")
                
            labels = self.model.fit_predict(X_scaled)
            
            result = {
                "status": "success"
                "labels": labels
                "n_clusters": len(np.unique(labels)) if self.algorithm == "kmeans" else "variable"
                "inertia": getattr(self.model, 'inertia_', None)
                "metadata": {"rows_processed": len(clean_data), "algorithm": self.algorithm}
            }
            logger.info("Clustering completed successfully.")
            return result
        except Exception as e:
            logger.error(f"Clustering failed: {str(e)}")
            return {"status": "failed", "error": str(e)}
```

### Pattern 3: BAD vs GOOD Implementation

```python
# BAD: Hardcoded values, no validation, ignores scaling, bypasses error handling
def bad_clustering(data: pd.DataFrame) -> np.ndarray:
    model = KMeans(n_clusters=3)
    return model.fit_predict(data)

# GOOD: Validates input, scales data, checks convergence, returns structured results
def good_clustering(data: pd.DataFrame, n_clusters: int = 3) -> Dict[str, Any]:
    if data.empty or data.shape[0] < n_clusters:
        raise ValueError("Insufficient data for clustering")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(data)
    model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = model.fit_predict(X_scaled)
    return {"labels": labels, "inertia": model.inertia_, "scaler": scaler}
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

- [Scikit-learn Clustering](https://scikit-learn.org/stable/modules/clustering.html)
- [K-Means Guide — Scikit-learn](https://scikit-learn.org/stable/modules/clustering.html#k-means)
- [DBSCAN Clustering — Scikit-learn docs](https://scikit-learn.org/stable/modules/clustering.html#dbscan)
- [Hierarchical Clustering — Scipy documentation](https://docs.scipy.org/doc/scipy/reference/cluster.hierarchy.html)
- [Unsupervised Learning (Kaggle Learn)](https://www.kaggle.com/learn/unsupervised-learning)