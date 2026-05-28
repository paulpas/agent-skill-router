---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Applies privacy-preserving techniques including anonymization, differential
  privacy, encryption, and GDPR compliance for sensitive data"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-data-versioning, ds-privacy-ml
  role: implementation
  scope: implementation
  triggers: data privacy, anonymization, differential privacy, GDPR, PII protection
    privacy-preserving, sensitive data
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
name: data-privacy
------
# Data Privacy

Comprehensive guide to data privacy in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world data collection & ingestion problems
- Building machine learning pipelines with data privacy
- Implementing best practices for data privacy
- Optimizing model performance using data privacy techniques
- Learning industry-standard approaches to data privacy

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require data privacy rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Data Privacy is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Data Privacy

```python
import pandas as pd
import numpy as np
from typing import Dict, Any

TOKEN_SPACE_SIZE: int = 10000

def apply_basic_privacy(data: pd.DataFrame, epsilon: float = 1.0) -> Dict[str, Any]:
    """
    Apply basic privacy-preserving transformations.
    Implements tokenization for categorical PII and Laplace noise for numerical data.
    """
    if data.empty:
        raise ValueError("Input DataFrame cannot be empty")

    protected_data = data.copy()
    metrics: Dict[str, int] = {"columns_anonymized": 0, "noise_added": 0}

    for col in protected_data.columns:
        if protected_data[col].dtype == "object":
            protected_data[col] = protected_data[col].apply(
                lambda x: f"token_{abs(hash(str(x))) % TOKEN_SPACE_SIZE}" if pd.notna(x) else x
            )
            metrics["columns_anonymized"] += 1
        elif np.issubdtype(protected_data[col].dtype, np.number):
            sensitivity: float = protected_data[col].max() - protected_data[col].min()
            scale: float = sensitivity / epsilon
            noise: np.ndarray = np.random.laplace(0, scale, size=protected_data[col].shape)
            protected_data[col] = protected_data[col] + noise
            metrics["noise_added"] += 1

    return {"protected_data": protected_data, "metrics": metrics}
```

### Pattern 2: Production-Ready Data Privacy

```python
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

class DataPrivacyEngine:
    """Production-grade privacy engine implementing GDPR-compliant anonymization."""

    def __init__(self, epsilon: float = 1.0, k_anonymity: int = 5) -> None:
        self.epsilon: float = epsilon
        self.k_anonymity: int = k_anonymity
        self._log: logging.Logger = logging.getLogger(self.__class__.__name__)

    def execute(self, data: pd.DataFrame, sensitive_cols: List[str]) -> Dict[str, Any]:
        """Execute privacy transformations on sensitive columns."""
        if not isinstance(data, pd.DataFrame):
            raise TypeError("Expected pandas DataFrame")
        if data.empty:
            raise ValueError("Input data cannot be empty")

        protected: pd.DataFrame = data.copy()
        results: Dict[str, Any] = {"status": "success", "transformations_applied": []}

        for col in sensitive_cols:
            if col not in protected.columns:
                self._log.warning(f"Column {col} not found, skipping.")
                continue

            if protected[col].dtype == "object":
                protected[col] = protected[col].apply(
                    lambda x: f"cat_{abs(hash(str(x))) % 100}" if pd.notna(x) else x
                )
                results["transformations_applied"].append(f"tokenized_{col}")
            else:
                col_min: float = protected[col].min()
                col_max: float = protected[col].max()
                sensitivity: float = col_max - col_min
                scale: float = sensitivity / self.epsilon
                noise: np.ndarray = np.random.laplace(0, scale, size=len(protected))
                protected[col] = protected[col] + noise
                results["transformations_applied"].append(f"dp_noised_{col}")

        results["protected_data"] = protected
        self._log.info(f"Privacy engine completed. Applied {len(results['transformations_applied'])} transformations.")
        return results
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

- [Data Privacy — Wikipedia](https://en.wikipedia.org/wiki/Data_privacy)
- [NIST Privacy Framework](https://www.nist.gov/privacy)
- [GDPR Official Text (europa.eu)](https://gdpr.eu/)
- [HIPAA Privacy Rule (HHS)](https://www.hhs.gov/hipaa/for-professionals/privacy/index.html)
- [Data Protection Impact Assessment Guide (EDPB)](https://edpb.europa.eu/)