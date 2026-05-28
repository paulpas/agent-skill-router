---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Implements deep neural networks, backpropagation, activation functions
  architectures (CNN, RNN, Transformers), and training strategies"'
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: ds-categorical-encoding, ds-ensemble-methods, ds-hyperparameter-tuning
    ds-support-vector-machines ds-tree-methods
  role: implementation
  scope: implementation
  triggers: neural networks, deep learning, backpropagation, CNN, RNN, transformers
    how do i use deep learning, hugging face
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
name: neural-networks
------
# Neural Networks

Comprehensive guide to neural networks in machine learning and data science workflows.

## When to Use This Skill

- Solving real-world supervised learning problems
- Building machine learning pipelines with neural networks
- Implementing best practices for neural networks
- Optimizing model performance using neural networks techniques
- Learning industry-standard approaches to neural networks

## When NOT to Use This Skill

- When using pre-built libraries without understanding underlying concepts
- For toy problems that don't require neural networks rigor
- When domain expertise in specific problem requires different approach
- If your problem doesn't require the complexity this skill provides

## Purpose and Key Concepts

Neural Networks is a critical component of the machine learning workflow. This skill covers:

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

### Pattern 1: Basic Neural Networks

```python
import numpy as np
import pandas as pd
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.datasets import make_classification

def train_basic_neural_network(X: np.ndarray, y: np.ndarray) -> dict:
    """Train a basic Multi-Layer Perceptron classifier on tabular data."""
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    model = MLPClassifier(
        hidden_layer_sizes=(64, 32)
        activation='relu'
        solver='adam'
        max_iter=500
        random_state=42
        early_stopping=True
        validation_fraction=0.1
    )
    
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    
    metrics = {
        'accuracy': accuracy_score(y_test, y_pred)
        'report': classification_report(y_test, y_pred, output_dict=True)
        'n_iterations': model.n_iter_
    }
    return metrics

# Example usage
if __name__ == "__main__":
    X, y = make_classification(n_samples=1000, n_features=20, n_classes=2, random_state=42)
    results = train_basic_neural_network(X, y)
    print(f"Accuracy: {results['accuracy']:.4f}")
    print(f"Iterations: {results['n_iterations']}")
```

### Pattern 2: Production-Ready Neural Networks

```python
import logging
import numpy as np
import pandas as pd
from typing import Any, Dict, Optional
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score
from sklearn.datasets import make_classification

logger = logging.getLogger(__name__)

class NeuralNetworkPipeline:
    """Production-ready neural network pipeline with preprocessing and validation."""
    
    def __init__(self, hidden_layers: tuple = (128, 64), learning_rate: float = 0.001):
        self.hidden_layers = hidden_layers
        self.learning_rate = learning_rate
        self.scaler = StandardScaler()
        self.model = MLPClassifier(
            hidden_layer_sizes=hidden_layers
            learning_rate_init=learning_rate
            solver='adam'
            random_state=42
            early_stopping=True
            validation_fraction=0.15
            max_iter=1000
        )
        self.is_trained = False

    def _validate_input(self, X: pd.DataFrame, y: pd.Series) -> None:
        if X.empty or y.empty:
            raise ValueError("Input data cannot be empty")
        if not np.issubdtype(X.select_dtypes(include='number').dtypes, np.number):
            raise ValueError("Features must be numeric")

    def execute(self, data: pd.DataFrame, target_col: str) -> Dict[str, Any]:
        """Execute neural network training and evaluation on provided data."""
        try:
            self._validate_input(data, data[target_col])
            X = data.drop(columns=[target_col])
            y = data[target_col]
            
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            self.model.fit(X_train_scaled, y_train)
            self.is_trained = True
            
            y_pred = self.model.predict(X_test_scaled)
            metrics = {
                'accuracy': accuracy_score(y_test, y_pred)
                'f1_score': f1_score(y_test, y_pred, average='weighted')
                'model_type': 'MLPClassifier'
                'layers': self.hidden_layers
            }
            logger.info(f"Pipeline completed. Accuracy: {metrics['accuracy']:.4f}")
            return metrics
        except Exception as e:
            logger.error(f"Pipeline execution failed: {str(e)}")
            raise RuntimeError(f"Neural network pipeline failed: {e}") from e
```

### Pattern 3: BAD vs GOOD Implementation

```python
# BAD: Hardcoded values, no scaling, no early stopping, poor error handling
def bad_nn_implementation(X, y):
    model = MLPClassifier(hidden_layer_sizes=(10, 10), max_iter=10)
    model.fit(X, y)
    return model.predict(X)

# GOOD: Follows SOLID/DRY principles, proper scaling, early stopping, type hints
def good_nn_implementation(X: pd.DataFrame, y: pd.Series) -> Dict[str, Any]:
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model = MLPClassifier(
        hidden_layer_sizes=(128, 64)
        early_stopping=True
        validation_fraction=0.2
        max_iter=1000
        random_state=42
    )
    model.fit(X_scaled, y)
    return {'model': model, 'scaler': scaler}
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

- [PyTorch nn Module](https://pytorch.org/docs/stable/nn.html)
- [TensorFlow Keras Overview](https://www.tensorflow.org/guide/keras/overview)
- [Deep Learning — Ian Goodfellow et al. (Free Book)](https://www.deeplearningbook.org/)
- [Fast.ai Practical Deep Learning](https://course.fast.ai/)
- [Neural Network Architectures — Hugging Face Course](https://huggingface.co/course/chapter7/1)