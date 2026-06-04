---
name: ds-experimental-design
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Provides Designs experiments using design of experiments (DOE), factorial
  designs, randomization, and blocking for efficient learning"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-ab-testing, ds-online-experiments, ds-randomized-experiments
    ds-statistical-power ds-statistical-power
  role: implementation
  scope: implementation
  triggers: experimental design, DOE, factorial design, randomization, blocking, how
    do I design experiments
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
# Experimental Design

Comprehensive guide to experimental design in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world experimentation & a/b testing problems
- Building machine learning pipelines with experimental design
- Implementing best practices for experimental design
- Optimizing model performance using experimental design techniques
- Learning industry-standard approaches to experimental design

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require experimental design rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Experimental Design is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Experimental Design

```python
import pandas as pd
import numpy as np
from scipy import stats

def generate_factorial_design(factor_levels: dict) -> pd.DataFrame:
    """Generate a full factorial design matrix from factor levels."""
    keys = list(factor_levels.keys())
    values = list(factor_levels.values())
    grid = np.meshgrid(*values, indexing='ij')
    design = pd.DataFrame(np.column_stack([g.ravel() for g in grid]), columns=keys)
    return design

def apply_randomization(design: pd.DataFrame, seed: int = 42) -> pd.DataFrame:
    """Randomize the order of experimental runs using a reproducible RNG."""
    rng = np.random.default_rng(seed)
    indices = rng.permutation(len(design))
    return design.iloc[indices].reset_index(drop=True)

def create_blocks(design: pd.DataFrame, n_blocks: int) -> pd.DataFrame:
    """Assign experimental runs to blocks to control for nuisance variables."""
    block_assignments = np.repeat(np.arange(n_blocks), len(design) // n_blocks)
    remainder = len(design) % n_blocks
    if remainder > 0:
        block_assignments = np.append(block_assignments, np.arange(remainder))
    design['block'] = block_assignments
    return design
```

### Pattern 2: Production-Ready Experimental Design

```python
import logging
from typing import Any, Dict, List
import pandas as pd
import numpy as np
from scipy import stats

logger = logging.getLogger(__name__)

class ExperimentalDesign:
    """Production implementation of Experimental Design following ISO 3534 standards."""
    
    def __init__(self, seed: int = 42):
        self.seed = seed
        self.rng = np.random.default_rng(seed)
        
    def execute(self, data: pd.DataFrame, response_col: str, factors: List[str], n_blocks: int = 1) -> Dict[str, Any]:
        """Execute Experimental Design on data with randomization and blocking."""
        if response_col not in data.columns:
            raise ValueError(f"Response column '{response_col}' not found in data")
        if not all(f in data.columns for f in factors):
            raise ValueError(f"All factors must be present in data: {factors}")
            
        design = data[factors].copy()
        design = apply_randomization(design, self.seed)
        design['block'] = np.repeat(np.arange(n_blocks), len(design) // n_blocks)
        remainder = len(design) % n_blocks
        if remainder > 0:
            design.loc[len(design) - remainder:, 'block'] = np.arange(remainder)
            
        design['response'] = data[response_col].values
        
        if n_blocks > 1:
            groups = [group['response'].values for _, group in design.groupby('block')]
            f_stat, p_val = stats.f_oneway(*groups)
        else:
            f_stat, p_val = np.nan, np.nan
            
        results = {
            'status': 'success'
            'design_matrix': design
            'statistics': {'f_statistic': float(f_stat), 'p_value': float(p_val), 'n_runs': len(design)}
            'metadata': {'factors': factors, 'blocks': n_blocks, 'seed': self.seed}
        }
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

- [Design of Experiments — Wikipedia](https://en.wikipedia.org/wiki/Design_of_experiments)
- [NIST Engineering Statistics Handbook](https://www.itl.nist.gov/div898/handbook/index.htm)
- [DOE Guide (Six Sigma)](https://sixsigmadsi.com/design-of-experiments-doepdf/)
- [Randomized Block Design — StatLect](https://www.statlect.com/experimental-design/randomized-block-design)
- [Factorial Experiments (Khan Academy)](https://www.khanacademy.org/math/statistics-probability/design-of-significant-experiments)