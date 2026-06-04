---
name: ds-dimensionality-reduction
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Reduces data dimensionality using PCA, t-SNE, UMAP, autoencoders
  and other feature extraction methods for visualization and efficiency"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-clustering, ds-community-detection, ds-eda, ds-feature-engineering
  role: implementation
  scope: implementation
  triggers: dimensionality reduction, PCA, t-SNE, UMAP, feature extraction, how do
    i reduce dimensions
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
# Dimensionality Reduction

Comprehensive guide to dimensionality reduction in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world unsupervised learning problems
- Building machine learning pipelines with dimensionality reduction
- Implementing best practices for dimensionality reduction
- Optimizing model performance using dimensionality reduction techniques
- Learning industry-standard approaches to dimensionality reduction

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require dimensionality reduction rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Dimensionality Reduction is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Dimensionality Reduction

```python
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.datasets import load_iris

def basic_dimensionality_reduction(data: pd.DataFrame, n_components: int = 2) -> pd.DataFrame:
    """Apply PCA for basic dimensionality reduction with proper scaling."""
    if data.empty:
        raise ValueError("Input DataFrame cannot be empty")
    
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(data)
    
    pca = PCA(n_components=n_components)
    reduced_data = pca.fit_transform(scaled_data)
    
    component_names = [f"PC{i+1}" for i in range(n_components)]
    reduced_df = pd.DataFrame(reduced_data, columns=component_names, index=data.index)
    
    explained_variance = pca.explained_variance_ratio_
    print(f"Explained variance ratio: {explained_variance}")
    print(f"Total variance explained: {sum(explained_variance):.2%}")
    
    return reduced_df

# Example usage
if __name__ == "__main__":
    iris = load_iris()
    df = pd.DataFrame(iris.data, columns=iris.feature_names)
    result = basic_dimensionality_reduction(df, n_components=2)
    print(result.head())
```

### Pattern 2: Production-Ready Dimensionality Reduction

```python
import logging
import numpy as np
import pandas as pd
from typing import Any, Dict, Optional
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import umap

logger = logging.getLogger(__name__)

class ProductionDimensionalityReduction:
    """Production-grade dimensionality reduction pipeline with method switching."""
    
    def __init__(self, method: str = "pca", n_components: int = 2, random_state: int = 42):
        self.method = method
        self.n_components = n_components
        self.random_state = random_state
        self.scaler = StandardScaler()
        self.reducer = None
        self.is_fitted = False

    def _initialize_reducer(self) -> None:
        if self.method == "pca":
            self.reducer = PCA(n_components=self.n_components, random_state=self.random_state)
        elif self.method == "umap":
            self.reducer = umap.UMAP(n_components=self.n_components, random_state=self.random_state)
        else:
            raise ValueError(f"Unsupported method: {self.method}")

    def execute(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Execute dimensionality reduction on input data with full validation."""
        if data.empty:
            raise ValueError("Input data cannot be empty")
        
        self._initialize_reducer()
        scaled_data = self.scaler.fit_transform(data)
        reduced_data = self.reducer.fit_transform(scaled_data)
        self.is_fitted = True
        
        result = {
            "reduced_data": reduced_data
            "method": self.method
            "n_components": self.n_components
            "explained_variance": getattr(self.reducer, "explained_variance_ratio_", None)
            "shape": reduced_data.shape
        }
        logger.info(f"Successfully reduced {data.shape[1]} dimensions to {self.n_components}")
        return result

# Example usage
if __name__ == "__main__":
    df = pd.DataFrame(np.random.randn(100, 10), columns=[f"feat_{i}" for i in range(10)])
    pipeline = ProductionDimensionalityReduction(method="pca", n_components=2)
    output = pipeline.execute(df)
    print(f"Reduced shape: {output['shape']}")
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

- [Scikit-learn Decomposition Methods](https://scikit-learn.org/stable/modules/decomposition.html)
- [PCA — Scikit-learn docs](https://scikit-learn.org/stable/modules/decomposition.html#pca)
- [t-SNE Visualization (Jupyter Notebook by Christopher Olah)](http://colah.github.io/posts/2014-10-Visualising-MNIST/)
- [UMAP — Manifold Learning](https://umap-learn.readthedocs.io/)
- [Feature Extraction & Selection (Kaggle Learn)](https://www.kaggle.com/learn/machine-learning-intermediate)
- [PCA vs t-SNE Comparison (Distill.pub)](https://distill.pub/2016/misread-tsne/)