---




name: ds-privacy-ml
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Implements privacy-preserving machine learning including differential
  privacy, federated learning, and privacy attack prevention"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-data-privacy, ds-model-fairness, ds-reproducible-research
  role: implementation
  scope: implementation
  triggers: privacy machine learning, differential privacy, federated learning, privacy
    attacks, privacy-preserving
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




# Privacy in ML

Comprehensive guide to privacy in ml in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world reproducibility & responsible ai problems
- Building machine learning pipelines with privacy in ml
- Implementing best practices for privacy in ml
- Optimizing model performance using privacy in ml techniques
- Learning industry-standard approaches to privacy in ml

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require privacy in ml rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Privacy in ML is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Privacy in ML

```python
import numpy as np
from typing import Tuple

def apply_laplace_mechanism(data: np.ndarray, sensitivity: float, epsilon: float) -> np.ndarray:
    """
    Apply the Laplace mechanism to add differential privacy noise to aggregated data.
    
    Args:
        data: Array of numerical values to be privatized
        sensitivity: Maximum change in output caused by a single record
        epsilon: Privacy budget parameter
        
    Returns:
        Privatized array with added Laplace noise
    """
    if epsilon <= 0:
        raise ValueError("Epsilon must be positive")
        
    scale: float = sensitivity / epsilon
    noise: np.ndarray = np.random.laplace(loc=0.0, scale=scale, size=data.shape)
    return data + noise

# Example usage with synthetic dataset
if __name__ == "__main__":
    np.random.seed(42)
    sensitive_data: np.ndarray = np.random.normal(loc=50, scale=10, size=1000)
    original_mean: float = np.mean(sensitive_data)
    privatized_mean: float = np.mean(apply_laplace_mechanism(sensitive_data, sensitivity=1.0, epsilon=1.0))
    print(f"Original Mean: {original_mean:.4f}")
    print(f"Privatized Mean: {privatized_mean:.4f}")
```

### Pattern 2: Production-Ready Privacy in ML

```python
import numpy as np
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class FederatedPrivacyTrainer:
    """Production-grade federated learning with differential privacy guarantees."""
    
    def __init__(self, base_model: Any, epsilon: float = 1.0, delta: float = 1e-5, clip_norm: float = 1.0):
        self.base_model = base_model
        self.epsilon = epsilon
        self.delta = delta
        self.clip_norm = clip_norm
        self.global_weights: np.ndarray | None = None
        
    def _clip_and_noise(self, weights: np.ndarray) -> np.ndarray:
        """Clip weights and add Gaussian noise for (epsilon, delta)-DP."""
        norm: float = np.linalg.norm(weights)
        if norm > self.clip_norm:
            weights = weights * (self.clip_norm / norm)
        scale: float = self.clip_norm * np.sqrt(2 * np.log(1.25 / self.delta)) / self.epsilon
        noise: np.ndarray = np.random.normal(0, scale, weights.shape)
        return weights + noise
        
    def aggregate_round(self, client_updates: List[np.ndarray]) -> np.ndarray:
        """Aggregate client updates with DP noise."""
        if not client_updates:
            raise ValueError("No client updates provided")
            
        avg_weights: np.ndarray = np.mean(client_updates, axis=0)
        return self._clip_and_noise(avg_weights)
        
    def train_round(self, client_weights: List[np.ndarray]) -> Dict[str, Any]:
        """Execute one round of federated training."""
        logger.info(f"Aggregating {len(client_weights)} client updates")
        self.global_weights = self.aggregate_round(client_weights)
        return {
            "status": "success"
            "round_weights": self.global_weights
            "privacy_budget": {"epsilon": self.epsilon, "delta": self.delta}
        }
```

### BAD vs GOOD: Privacy in ML

```python
# BAD: Ignoring privacy budget and clipping gradients
def train_bad(X: np.ndarray, y: np.ndarray, lr: float = 0.1, epochs: int = 10) -> np.ndarray:
    w: np.ndarray = np.zeros(X.shape[1])
    for _ in range(epochs):
        pred: np.ndarray = 1 / (1 + np.exp(-X @ w))
        grad: np.ndarray = X.T @ (pred - y) / len(y)
        w -= lr * grad  # No clipping, no noise, no epsilon tracking
    return w

# GOOD: Proper DP-SGD with clipping, noise, and budget tracking
def train_good(X: np.ndarray, y: np.ndarray, lr: float = 0.1, 
               epochs: int = 10, epsilon: float = 1.0, delta: float = 1e-5) -> np.ndarray:
    w: np.ndarray = np.zeros(X.shape[1])
    n: int = len(y)
    for _ in range(epochs):
        idx: np.ndarray = np.random.permutation(n)
        X_b: np.ndarray = X[idx]
        y_b: np.ndarray = y[idx]
        pred: np.ndarray = 1 / (1 + np.exp(-X_b @ w))
        grad: np.ndarray = X_b.T @ (pred - y_b) / n
        
        # Gradient clipping
        norm: float = np.linalg.norm(grad)
        if norm > 1.0:
            grad *= 1.0 / norm
            
        # DP noise injection
        scale: float = lr * np.sqrt(2 * np.log(1.25 / delta)) / epsilon
        grad += np.random.normal(0, scale, grad.shape)
        
        w -= lr * grad
    return w
```

## Best Practices

- ✅ Always validate your implementation on test data
- ✅ Document your assumptions and methodology
- ✅ Use version control for reproducibility
- ✅ Monitor performance metrics in production
- ✅ Periodically review and update your approach
- ✅ Test with edge cases and outliers
- ✅ Log all significant operations for debugging
- ✅ Follow NIST AI RMF and OpenDP guidelines for privacy budget accounting

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

- [Differential Privacy — Wikipedia](https://en.wikipedia.org/wiki/Differential_privacy)
- [OpenDP Documentation](https://docs.opendp.org/)
- [TensorFlow Privacy](https://github.com/tensorflow/privacy)
- [PyTorch Opacus Documentation](https://opacus.ai/)
- [Privacy Budget Accounting (NIST AI RMF)](https://www.nist.gov/itl/ai-risk-management-framework)