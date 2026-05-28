---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Implements reproducible research practices including code organization
  environment management, documentation, and experiment tracking"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-data-versioning, ds-explainability, ds-model-robustness, ds-privacy-ml
  role: implementation
  scope: implementation
  triggers: reproducible research, reproducibility, code organization, environment
    notebooks, how do I reproduce
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
name: reproducible-research
------
# Reproducible Research

Comprehensive guide to reproducible research in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world reproducibility & responsible ai problems
- Building machine learning pipelines with reproducible research
- Implementing best practices for reproducible research
- Optimizing model performance using reproducible research techniques
- Learning industry-standard approaches to reproducible research

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require reproducible research rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Reproducible Research is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Reproducible Research

```python
import os
import random
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any

logger = logging.getLogger(__name__)

def setup_reproducible_environment(seed: int = 42) -> Dict[str, Any]:
    """
    Configures deterministic behavior for Python, NumPy, and random modules.
    Follows DRY principles by centralizing seed configuration.
    Returns configuration dictionary for tracking and audit trails.
    """
    os.environ['PYTHONHASHSEED'] = str(seed)
    random.seed(seed)
    np.random.seed(seed)
    
    config = {
        'seed': seed
        'environment': 'reproducible'
        'timestamp': 'setup_complete'
        'libraries': {'numpy': np.__version__, 'pandas': pd.__version__}
    }
    logger.info(f"Reproducible environment configured with seed: {seed}")
    return config
```

### Pattern 2: Production-Ready Reproducible Research

```python
import os
import json
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List
from pathlib import Path

logger = logging.getLogger(__name__)

class ExperimentManager:
    """Manages reproducible experiment workflows with artifact tracking."""
    
    def __init__(self, project_root: str = "./experiments", seed: int = 42):
        self.project_root = Path(project_root)
        self.project_root.mkdir(parents=True, exist_ok=True)
        self.seed = seed
        self.runs: List[Dict[str, Any]] = []
        self._setup_environment()
        
    def _setup_environment(self) -> None:
        os.environ['PYTHONHASHSEED'] = str(self.seed)
        np.random.seed(self.seed)
        
    def execute(self, data: pd.DataFrame, model_params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a reproducible experiment run with validation and logging."""
        if data.empty:
            raise ValueError("Input data cannot be empty")
            
        run_id = f"run_{len(self.runs) + 1:03d}"
        run_dir = self.project_root / run_id
        run_dir.mkdir(exist_ok=True)
        
        # Simulate model training & evaluation
        np.random.shuffle(data.values)
        metrics = {'accuracy': 0.85, 'f1': 0.82, 'seed': self.seed}
        
        # Save artifacts
        metadata = {
            'run_id': run_id
            'params': model_params
            'metrics': metrics
            'data_shape': list(data.shape)
        }
        with open(run_dir / "metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)
            
        self.runs.append(metadata)
        logger.info(f"Experiment {run_id} completed successfully.")
        return metadata
```

## Best Practices

- ✅ Always validate your implementation on test data
- ✅ Document your assumptions and methodology
- ✅ Use version control for reproducibility
- ✅ Monitor performance metrics in production
- ✅ Periodically review and update your approach
- ✅ Test with edge cases and outliers
- ✅ Log all significant operations for debugging

### BAD vs GOOD Practices

```python
# BAD: Hardcoded seeds, no validation, missing logging
def bad_pipeline(data):
    np.random.seed(123)
    return data.mean()

# GOOD: Configurable seeds, input validation, structured logging
def good_pipeline(data: pd.DataFrame, seed: int = 42) -> float:
    if data.empty:
        raise ValueError("Data cannot be empty")
    np.random.seed(seed)
    logger.info(f"Processing {len(data)} rows with seed {seed}")
    return float(data.mean().mean())
```

## Common Pitfalls

| Pitfall | Problem | Solution |
|

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Reproducible Research — Wikipedia](https://en.wikipedia.org/wiki/Reproducible_research)
- [Jupyter Documentation](https://jupyter.org/)
- [DVC (Data Version Control)](https://dvc.org/)
- [MLflow Reproducible Workflows](https://mlflow.org/docs/latest/tracking.html)
- [Computational Reproducibility — Nature Publishing Group](https://www.nature.com/srep/journal-policy/reproducibility)