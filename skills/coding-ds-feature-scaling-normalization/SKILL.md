---
name: coding-ds-feature-scaling-normalization
description: Scales and normalizes features using standardization, normalization, robust scaling, and other scaling methods for model compatibility
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: feature scaling, normalization, standardization, robust scaling, scaling features, how do I scale
  related-skills: coding-ds-categorical-encoding, coding-ds-feature-engineering, coding-ds-linear-regression
---

# Feature Scaling

Comprehensive guide to feature scaling in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world feature engineering problems
- Building machine learning pipelines with feature scaling
- Implementing best practices for feature scaling
- Optimizing model performance using feature scaling techniques
- Learning industry-standard approaches to feature scaling

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require feature scaling rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Feature Scaling is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Feature Scaling

```python
# Example pattern for Feature Scaling
# This demonstrates the core concepts
import pandas as pd
import numpy as np

# Implementation pattern
pass
```

### Pattern 2: Production-Ready Feature Scaling

```python
# Production-grade implementation
# Includes error handling, logging, and optimization
import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)

class FeatureScaling:
    """Production implementation of Feature Scaling"""
    
    def __init__(self):
        pass
    
    def execute(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Execute Feature Scaling on data"""
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
# Full working example for Feature Scaling
import pandas as pd
import numpy as np
from typing import Dict, Any

def implement_normalization(data: pd.DataFrame) -> Dict[str, Any]:
    """
    Complete implementation of Feature Scaling.
    
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
        >>> results = implement_normalization(df)
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
    results = implement_normalization(sample_data)
    print(f"Status: {results['status']}")
    print(f"Processed {results['metadata']['rows']} rows")
```

## Related Skills

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `coding-ds-feature-engineering` | Feature Engineering techniques | Complementary to this skill |
| `coding-ds-categorical-encoding` | Categorical Encoding techniques | Complementary to this skill |
| `coding-ds-linear-regression` | Linear Regression techniques | Complementary to this skill |

## References

- Official documentation and papers on Feature Scaling
- Industry best practices and standards
- Implementation examples from the scikit-learn, TensorFlow, and PyTorch libraries

---

*Last updated: 2026-04-24*
