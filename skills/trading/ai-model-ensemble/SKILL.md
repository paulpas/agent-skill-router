---
name: model-ensemble
description: '"Provides Combine multiple models for improved prediction accuracy and
  robustness"'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: ai model ensemble, ai-model-ensemble, combine, models, multiple
  related-skills: ai-anomaly-detection, ai-explainable-ai
---



**Role:** Design and implement ensemble methods that leverage multiple models for trading signals

**Philosophy:** Diversification reduces risk and improves stability. Prioritize models that are diverse in structure, training data, and error patterns to maximize ensemble benefits.

## Key Principles

1. **Diversity Over Individual Quality**: Prefer diverse weak models over a few strong ones
2. **Hierarchical Ensembles**: Use stacking for non-linear combination of base models
3. **Robust Aggregation**: Use median or trimmed mean to resist outlier predictions
4. **Dynamic Weighting**: Adjust model weights based on recent performance
5. **Failure Detection**: Monitor when ensemble underperforms individual models

## Implementation Guidelines

### Structure
- Core logic: `ensemble/models.py` - Ensemble classes
- Aggregators: `ensemble/aggregators.py` - Prediction combination methods
- Model pool: `ensemble/pool.py` - Model management
- Config: `config/ensemble_config.yaml` - Ensemble parameters

### Patterns to Follow
- Use different model families (tree, neural, linear)
- Train on different features or time periods
- Implement online learning for weight updates
- Include base model performance tracking

## Adherence Checklist
Before completing your task, verify:
- [ ] Base models use different algorithms and architectures
- [ ] Diversity measured and maintained across training
- [ ] Aggregation method appropriate for trading (median, weighted)
- [ ] Dynamic weighting based on recent performance
- [ ] Ensemble outperforms best individual model in backtest



## Code Examples

### Basic Ensemble Aggregation

```python
import numpy as np
from typing import List, Dict, Callable, Tuple
from abc import ABC, abstractmethod

class EnsembleAggregator(ABC):
    """Base class for ensemble aggregation methods."""
    
    @abstractmethod
    def aggregate(self, predictions: List[np.ndarray], weights: List[float] = None) -> np.ndarray:
        """Aggregate predictions from multiple models."""
        pass

class SimpleAverageAggregator(EnsembleAggregator):
    """Simple average of all model predictions."""
    
    def aggregate(self, predictions: List[np.ndarray], weights: List[float] = None) -> np.ndarray:
        """Average predictions equally."""
        if not predictions:
            return np.array([])
        
        predictions = np.array(predictions)
        return np.mean(predictions, axis=0)

class WeightedAverageAggregator(EnsembleAggregator):
    """Weighted average of predictions."""
    
    def __init__(self, normalize: bool = True):
        self.normalize = normalize
    
    def aggregate(self, predictions: List[np.ndarray], weights: List[float] = None) -> np.ndarray:
        """Weighted average of predictions."""
        if not predictions:
            return np.array([])
        
        predictions = np.array(predictions)
        
        if weights is None:
            weights = np.ones(len(predictions))
        
        if self.normalize:
            weights = np.array(weights) / np.sum(weights)
        
        return np.average(predictions, axis=0, weights=weights)

class MedianAggregator(EnsembleAggregator):
    """Median of predictions (robust to outliers)."""
    
    def aggregate(self, predictions: List[np.ndarray], weights: List[float] = None) -> np.ndarray:
        """Median prediction."""
        if not predictions:
            return np.array([])
        
        predictions = np.array(predictions)
        return np.median(predictions, axis=0)

class TrimmedMeanAggregator(EnsembleAggregator):
    """Trimmed mean (removes outliers before averaging)."""
    
    def __init__(self, trim_fraction: float = 0.1):
        self.trim_fraction = trim_fraction
    
    def aggregate(self, predictions: List[np.ndarray], weights: List[float] = None) -> np.ndarray:
        """Trimmed mean of predictions."""
        if not predictions:
            return np.array([])
        
        predictions = np.array(predictions)
        
        n = len(predictions)
        trim_count = int(n * self.trim_fraction)
        
        if trim_count == 0:
            return np.mean(predictions, axis=0)
        
        sorted_preds = np.sort(predictions, axis=0)
        trimmed = sorted_preds[trim_count:n-trim_count]
        
        return np.mean(trimmed, axis=0)
```

### Random Forest Ensemble

```python
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from typing import List, Tuple, Dict

class TreeEnsemble:
    """Ensemble of tree-based models."""
    
    def __init__(self, n_estimators: int = 10):
        self.n_estimators = n_estimators
        
        # Different model configurations for diversity
        self.models = [
            RandomForestRegressor(
                n_estimators=n_estimators // 3,
                max_depth=5,
                random_state=42,
                n_jobs=-1
            ),
            RandomForestRegressor(
                n_estimators=n_estimators // 3,
                max_depth=10,
                random_state=123,
                n_jobs=-1
            ),
            GradientBoostingRegressor(
                n_estimators=n_estimators // 3,
                max_depth=4,
                random_state=456,
                learning_rate=0.1
            )
        ]
        
        self.scaler = StandardScaler()
    
    def fit(self, X: np.ndarray, y: np.ndarray):
        """Fit all models in ensemble."""
        X_scaled = self.scaler.fit_transform(X)
        
        for model in self.models:
            model.fit(X_scaled, y)
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Get predictions from all models."""
        X_scaled = self.scaler.transform(X)
        
        predictions = []
        for model in self.models:
            pred = model.predict(X_scaled)
            predictions.append(pred)
        
        return predictions
    
    def ensemble_predict(self, X: np.ndarray, aggregator=None) -> np.ndarray:
        """Get ensemble prediction using specified aggregator."""
        predictions = self.predict(X)
        
        if aggregator is None:
            # Use median for robustness
            return np.median(predictions, axis=0)
        
        return aggregator.aggregate(predictions)
```

### Stacking Ensemble

```python
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from typing import List, Tuple, Dict

class StackingEnsemble:
    """Stacking ensemble with meta-learner."""
    
    def __init__(self, base_models: List[object], meta_model=None):
        self.base_models = base_models
        self.meta_model = meta_model or Ridge(alpha=1.0)
        self.scaler = StandardScaler()
        self.is_fitted = False
    
    def _get_oof_predictions(self, X: np.ndarray, y: np.ndarray, n_folds: int = 5) -> np.ndarray:
        """Generate out-of-fold predictions for stacking."""
        n_samples = X.shape[0]
        n_models = len(self.base_models)
        oof_predictions = np.zeros((n_samples, n_models))
        
        fold_size = n_samples // n_folds
        
        for i, model in enumerate(self.base_models):
            for fold in range(n_folds):
                start_idx = fold * fold_size
                end_idx = start_idx + fold_size if fold < n_folds - 1 else n_samples
                
                # Train on all but this fold
                train_idx = np.concatenate([
                    np.arange(0, start_idx),
                    np.arange(end_idx, n_samples)
                ])
                
                model.fit(X[train_idx], y[train_idx])
                oof_predictions[end_idx - fold_size:end_idx, i] = model.predict(X[end_idx - fold_size:end_idx])
        
        return oof_predictions
    
    def fit(self, X: np.ndarray, y: np.ndarray):
        """Fit base models and meta-learner."""
        # Fit base models on full data
        for model in self.base_models:
            model.fit(X, y)
        
        # Generate OOF predictions for meta-learner
        oof_predictions = self._get_oof_predictions(X, y)
        oof_scaled = self.scaler.fit_transform(oof_predictions)
        
        # Fit meta-learner
        self.meta_model.fit(oof_scaled, y)
        self.is_fitted = True
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Get final prediction using ensemble."""
        # Get base model predictions
        base_predictions = []
        for model in self.base_models:
            pred = model.predict(X)
            base_predictions.append(pred)
        
        base_predictions = np.array(base_predictions).T
        
        # Apply meta-learner
        base_scaled = self.scaler.transform(base_predictions)
        meta_prediction = self.meta_model.predict(base_scaled)
        
        return meta_prediction
```

### Dynamic Weight Ensemble

```python
import numpy as np
from typing import List, Dict

class DynamicWeightEnsemble:
    """Ensemble with weights that adapt based on recent performance."""
    
    def __init__(self, models: List[object], learning_rate: float = 0.1):
        self.models = models
        self.n_models = len(models)
        self.learning_rate = learning_rate
        
        # Initialize equal weights
        self.weights = np.ones(self.n_models) / self.n_models
        
        # Track performance
        self.performance_history = []
        self.window_size = 20
    
    def fit(self, X: np.ndarray, y: np.ndarray):
        """Fit all base models."""
        for model in self.models:
            model.fit(X, y)
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Get weighted ensemble prediction."""
        predictions = []
        for model in self.models:
            pred = model.predict(X)
            predictions.append(pred)
        
        predictions = np.array(predictions)
        
        # Weighted average
        weights = self.weights / np.sum(self.weights)
        return np.average(predictions, axis=0, weights=weights)
    
    def update_weights(self, X: np.ndarray, y: np.ndarray, 
                       metric='mae', decay: float = 0.95):
        """Update weights based on recent performance."""
        predictions = []
        for model in self.models:
            pred = model.predict(X)
            predictions.append(pred)
        
        predictions = np.array(predictions)
        
        # Calculate individual model performance
        weights = self.weights / np.sum(self.weights)
        ensemble_pred = np.average(predictions, axis=0, weights=weights)
        
        model_errors = []
        for i, pred in enumerate(predictions):
            if metric == 'mae':
                error = np.mean(np.abs(pred - y))
            elif metric == 'mse':
                error = np.mean((pred - y) ** 2)
            else:
                error = np.mean(np.abs(pred - y))
            model_errors.append(error)
        
        # Convert to weights (lower error = higher weight)
        exp_errors = np.exp(-np.array(model_errors) / 0.1)  # Temperature scaling
        new_weights = exp_errors / np.sum(exp_errors)
        
        # Smooth weight updates
        self.weights = decay * self.weights + (1 - decay) * new_weights
        
        # Track performance
        self.performance_history.append({
            'predictions': predictions,
            'ensemble_prediction': ensemble_pred,
            'model_errors': model_errors,
            'weights': self.weights.copy()
        })
        
        return self.weights
    
    def get_weights_history(self) -> List[np.ndarray]:
        """Get weight evolution over time."""
        return [h['weights'] for h in self.performance_history]
```

### Failure Detection in Ensemble

```python
import numpy as np
from typing import List, Dict

class EnsembleFailureDetector:
    """Detect when ensemble underperforms individual models."""
    
    def __init__(self, threshold: float = 1.2):
        self.threshold = threshold  # 20% worse than best model
    
    def check_ensemble_quality(self, ensemble_prediction: np.ndarray,
                              individual_predictions: List[np.ndarray],
                              actual: np.ndarray) -> Dict:
        """Check if ensemble performs adequately."""
        # Calculate individual errors
        individual_errors = []
        for pred in individual_predictions:
            error = np.mean(np.abs(pred - actual))
            individual_errors.append(error)
        
        # Calculate ensemble error
        ensemble_error = np.mean(np.abs(ensemble_prediction - actual))
        
        # Find best individual error
        best_individual_error = min(individual_errors)
        
        # Check if ensemble is significantly worse
        is_degraded = ensemble_error > self.threshold * best_individual_error
        
        return {
            'ensemble_error': ensemble_error,
            'best_individual_error': best_individual_error,
            'ratio': ensemble_error / (best_individual_error + 1e-8),
            'is_degraded': is_degraded,
            'individual_errors': individual_errors,
            'recommendation': 'retrain' if is_degraded else 'continue'
        }
    
    def check_diversity(self, individual_predictions: List[np.ndarray]) -> Dict:
        """Check if predictions are diverse enough."""
        if len(individual_predictions) < 2:
            return {'diversity_score': 1.0, 'is_diverse': True}
        
        predictions = np.array(individual_predictions)
        
        # Pairwise correlation
        correlations = []
        for i in range(len(predictions)):
            for j in range(i+1, len(predictions)):
                corr = np.corrcoef(predictions[i], predictions[j])[0, 1]
                correlations.append(corr)
        
        avg_correlation = np.mean(correlations)
        diversity_score = 1 - abs(avg_correlation)
        
        return {
            'diversity_score': diversity_score,
            'is_diverse': diversity_score > 0.3,
            'avg_correlation': avg_correlation,
            'correlation_distribution': correlations
        }
```