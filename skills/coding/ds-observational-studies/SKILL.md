---
name: ds-observational-studies
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Analyzes observational data using matching methods, propensity scores
  stratification, and adjustment for confounding bias"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-causal-inference, ds-instrumental-variables, ds-intervention-analysis
    ds-randomized-experiments ds-synthetic-control
  role: implementation
  scope: implementation
  triggers: observational studies, propensity score, matching, stratification, observational
    data, adjustment
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
# Observational Studies

Comprehensive guide to observational studies in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world causal inference problems
- Building machine learning pipelines with observational studies
- Implementing best practices for observational studies
- Optimizing model performance using observational studies techniques
- Learning industry-standard approaches to observational studies

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require observational studies rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Observational Studies is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Observational Studies

```python
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score

def compute_propensity_scores(df: pd.DataFrame, treatment_col: str, covariates: list) -> dict:
    """Compute propensity scores and evaluate model performance."""
    if treatment_col not in df.columns:
        raise ValueError(f"Treatment column '{treatment_col}' not found in DataFrame.")
    
    X = df[covariates].dropna()
    y = df.loc[X.index, treatment_col]
    
    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X, y)
    scores = pd.Series(model.predict_proba(X)[:, 1], index=X.index, name='propensity_score')
    
    y_pred = model.predict(X)
    metrics = {
        'accuracy': accuracy_score(y, y_pred)
        'roc_auc': roc_auc_score(y, scores)
    }
    return {'propensity_scores': scores, 'model_metrics': metrics}

# Example usage with synthetic data
if __name__ == "__main__":
    np.random.seed(42)
    n_samples = 500
    data = pd.DataFrame({
        'age': np.random.normal(50, 10, n_samples)
        'income': np.random.normal(60000, 15000, n_samples)
        'treatment': np.random.binomial(1, 0.5, n_samples)
    })
    covariates = ['age', 'income']
    result = compute_propensity_scores(data, 'treatment', covariates)
    print(f"Computed scores for {len(result['propensity_scores'])} samples")
    print(f"Model Metrics: {result['model_metrics']}")
```

### Pattern 2: Production-Ready Observational Studies

```python
import logging
from typing import Any, Dict, List
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import NearestNeighbors

logger = logging.getLogger(__name__)

class ObservationalStudyPipeline:
    """Production implementation for observational study analysis."""
    
    def __init__(self, propensity_model=None, matching_method: str = 'nearest_neighbor'):
        self.propensity_model = propensity_model or LogisticRegression(max_iter=1000, random_state=42)
        self.matching_method = matching_method
        self.results: Dict[str, Any] = {}

    def _compute_propensity(self, df: pd.DataFrame, treatment_col: str, covariates: List[str]) -> pd.Series:
        X = df[covariates].dropna()
        y = df.loc[X.index, treatment_col]
        self.propensity_model.fit(X, y)
        return pd.Series(self.propensity_model.predict_proba(X)[:, 1], index=X.index, name='propensity_score')

    def _match_treatments(self, df: pd.DataFrame, caliper: float = 0.05) -> pd.DataFrame:
        treated = df[df['treatment'] == 1].dropna(subset=['propensity_score'])
        control = df[df['treatment'] == 0].dropna(subset=['propensity_score'])
        
        if len(treated) == 0 or len(control) == 0:
            raise ValueError("No treated or control observations found after dropping NaNs.")
            
        nn = NearestNeighbors(n_neighbors=1)
        nn.fit(control[['propensity_score']])
        distances, indices = nn.kneighbors(treated[['propensity_score']])
        
        mask = distances.flatten() < caliper
        matched_control = control.iloc[indices.flatten()[mask]]
        matched_treated = treated.iloc[mask]
        
        return pd.concat([matched_treated, matched_control], ignore_index=True)

    def execute(self, data: pd.DataFrame, treatment_col: str, covariates: List[str]) -> Dict[str, Any]:
        logger.info("Starting observational study pipeline")
        if data.empty:
            raise ValueError("Input data cannot be empty")
            
        df = data.copy()
        df['propensity_score'] = self._compute_propensity(df, treatment_col, covariates)
        matched_df = self._match_treatments(df)
        
        self.results = {
            'status': 'success'
            'matched_samples': len(matched_df)
            'treated_count': len(matched_df[matched_df['treatment'] == 1])
            'control_count': len(matched_df[matched_df['treatment'] == 0])
            'matched_data': matched_df
        }
        logger.info(f"Pipeline completed. Matched {self.results['matched_samples']} samples.")
        return self.results
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

- [Observational Study — Wikipedia](https://en.wikipedia.org/wiki/Observational_study)
- [Propensity Score Matching (NIST)](https://www.itl.nist.gov/div898/handbook/tq/section4/tq_3.htm)
- [Causal Inference with Observational Data (Harvard Biostats)](https://biostatistics.mdanderson.org/shinysoftware/causaleffect)
- [Matching Methods — Stanford Statistics](https://plato.stanford.edu/archives/fall2021/entries/causal-inference/)
- [Regression Discontinuity Design (MIT OpenCourseWare)](https://ocw.mit.edu/courses/economics-141-econometrics-fall-2008/)