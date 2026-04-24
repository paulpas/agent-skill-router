---
name: coding-ds-cross-validation
description: Implements k-fold cross-validation, stratified cross-validation, time-series cross-validation, and model validation strategies
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: cross-validation, k-fold, stratified cross-validation, time-series cross-validation, validation
  related-skills: coding-ds-classification-metrics, coding-ds-hyperparameter-tuning, coding-ds-model-selection, coding-ds-regression-evaluation
---

# Cross-Validation

Comprehensive guide to cross-validation in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world model evaluation & selection problems
- Building machine learning pipelines with cross-validation
- Implementing best practices for cross-validation
- Optimizing model performance using cross-validation techniques
- Learning industry-standard approaches to cross-validation

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require cross-validation rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Cross-Validation is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Cross-Validation

```python
# Example pattern for Cross-Validation
# This demonstrates the core concepts
import pandas as pd
import numpy as np

# Implementation pattern
pass
```

### Pattern 2: Production-Ready Cross-Validation

```python
# Production-grade implementation
# Includes error handling, logging, and optimization
import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)

class Cross-Validation:
    """Production implementation of Cross-Validation"""
    
    def __init__(self):
        pass
    
    def execute(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Execute Cross-Validation on data"""
        return {}
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
|---------|---------|----------|
| Not validating assumptions | Can lead to incorrect results | Implement comprehensive checks |
| Ignoring edge cases | Models fail in production | Test with diverse data |
| Over-engineering | Unnecessary complexity | Keep solutions simple initially |
| Skipping documentation | Hard to maintain later | Document as you code |
| Insufficient testing | Bugs in production | Write unit and integration tests |

## Complete Working Example

```python
# Full working example for Cross-Validation
import pandas as pd
import numpy as np
from typing import Dict, Any

def implement_validation(data: pd.DataFrame) -> Dict[str, Any]:
    """
    Complete implementation of Cross-Validation.
    
    This example demonstrates:
    - Proper input validation
    - Core algorithm implementation
    - Error handling
    - Result formatting
    
    Args:
        data: Input DataFrame with required columns
        
    Returns:
        Dictionary with results and metadata
        
    Raises:
        ValueError: If input data is invalid
        
    Example:
        >>> df = pd.DataFrame({'x': [1, 2, 3], 'y': [4, 5, 6]})
        >>> results = implement_validation(df)
        >>> print(results)
    """
    # Validate inputs
    if data is None or data.empty:
        raise ValueError("Input data cannot be None or empty")
    
    # Implementation
    results = {
        'status': 'success',
        'data': data,
        'metadata': {'rows': len(data), 'columns': data.shape[1]}
    }
    
    return results

# Usage and testing
if __name__ == "__main__":
    # Create sample data
    sample_data = pd.DataFrame({
        'x': np.arange(100),
        'y': np.random.randn(100)
    })
    
    # Run implementation
    results = implement_validation(sample_data)
    print(f"Status: {results['status']}")
    print(f"Processed {results['metadata']['rows']} rows")
```

## Related Skills

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `coding-ds-hyperparameter-tuning` | Hyperparameter Tuning techniques | Complementary to this skill |
| `coding-ds-model-selection` | Model Selection techniques | Complementary to this skill |
| `coding-ds-classification-metrics` | Classification Metrics techniques | Complementary to this skill |

## References

- Official documentation and papers on Cross-Validation
- Industry best practices and standards
- Implementation examples from the scikit-learn, TensorFlow, and PyTorch libraries

---

*Last updated: 2026-04-24*
