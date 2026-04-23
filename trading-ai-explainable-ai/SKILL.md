---
name: trading-ai-explainable-ai
description: Explainable AI for understanding and trusting trading model decisions
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: ai explainable ai, ai-explainable-ai, understanding, trusting, trading
---

**Role:** Build interpretability systems that make model predictions understandable to traders and risk managers

**Philosophy:** Trading decisions require justification, not just predictions. Prioritize local interpretability, feature importance, and counterfactual explanations for actionable insights.

## Key Principles

1. **Local Interpretability**: Explain individual predictions with SHAP, LIME, or attention weights
2. **Feature Attribution**: Quantify contribution of each feature to predictions
3. **Counterfactual Explanations**: Show what changes would flip predictions
4. **Sensitivity Analysis**: Test prediction robustness to input perturbations
5. **Model Agnostic**: Support explanations for any model type

## Implementation Guidelines

### Structure
- Core logic: `xai/explainers.py` - XAI explanation methods
- Visualizer: `xai/visualizer.py` - Explanation visualization
- Validator: `xai/validator.py` - Explanation quality metrics
- Config: `config/xai_config.yaml` - XAI parameters

### Patterns to Follow
- Use SHAP for tree-based models, LIME for black-box models
- Generate multiple explanation types for robustness
- Include feature interaction effects
- Track explanation stability across similar inputs

## Adherence Checklist
Before completing your task, verify:
- [ ] Local feature attribution calculated for predictions
- [ ] Counterfactual explanations generated
- [ ] Sensitivity analysis performed
- [ ] Explanation quality metrics computed
- [ ] Visualizations for trader-facing interfaces



## Code Examples

### SHAP Feature Importance

```python
import numpy as np
import pandas as pd
import shap
from typing import Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class FeatureImportance:
    """Feature importance for a prediction."""
    feature: str
    importance: float
    direction: str  # 'positive', 'negative'
    contribution: float

class SHAPExplainer:
    """SHAP-based feature importance explanation."""
    
    def __init__(self, model, reference_data: np.ndarray = None):
        self.model = model
        self.reference_data = reference_data
        self.explainer = None
        self.feature_names = None
    
    def fit(self, X: np.ndarray, feature_names: List[str] = None):
        """Fit SHAP explainer on data."""
        self.feature_names = feature_names or [f'feature_{i}' for i in range(X.shape[1])]
        
        # Create SHAP explainer based on model type
        if hasattr(self.model, 'predict_proba'):
            self.explainer = shap.Explainer(self.model.predict_proba, X)
        else:
            self.explainer = shap.Explainer(self.model.predict, X)
    
    def explain(self, X: np.ndarray, n_features: int = 10) -> List[Dict]:
        """Generate SHAP explanations for predictions."""
        X = np.asarray(X)
        
        if len(X.shape) == 1:
            X = X.reshape(1, -1)
        
        # Calculate SHAP values
        shap_values = self.explainer(X)
        
        explanations = []
        
        for i in range(X.shape[0]):
            feature_contributions = []
            
            for j in range(X.shape[1]):
                contribution = shap_values[i, j].base_values + shap_values[i, j].values
                
                feature_contributions.append({
                    'feature': self.feature_names[j],
                    'shap_value': float(shap_values[i, j].values),
                    'feature_value': float(X[i, j]),
                    'contribution': float(contribution)
                })
            
            # Sort by absolute contribution
            feature_contributions.sort(key=lambda x: abs(x['shap_value']), reverse=True)
            
            explanations.append({
                'prediction': float(self.model.predict(X[i].reshape(1, -1))),
                'feature_contributions': feature_contributions[:n_features],
                'expected_value': float(shap_values[i].base_values),
                'total_contribution': sum(c['shap_value'] for c in feature_contributions)
            })
        
        return explanations
    
    def get_feature_importance(self, X: np.ndarray, metric: str = 'abs_mean') -> Dict:
        """Calculate overall feature importance."""
        shap_values = self.explainer(X)
        
        feature_importance = {}
        
        for i, name in enumerate(self.feature_names):
            if metric == 'abs_mean':
                importance = np.mean(np.abs(shap_values[:, i].values))
            elif metric == 'mean':
                importance = np.mean(shap_values[:, i].values)
            elif metric == 'std':
                importance = np.std(shap_values[:, i].values)
            else:
                importance = np.mean(np.abs(shap_values[:, i].values))
            
            feature_importance[name] = float(importance)
        
        # Sort by importance
        sorted_importance = dict(sorted(
            feature_importance.items(),
            key=lambda x: x[1],
            reverse=True
        ))
        
        return sorted_importance
```

### Counterfactual Explanation Generator

```python
import numpy as np
from typing import Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class Counterfactual:
    """Counterfactual explanation."""
    original_features: Dict
    counterfactual_features: Dict
    original_prediction: float
    counterfactual_prediction: float
    change_magnitude: float
    feasibility_score: float

class CounterfactualGenerator:
    """Generate counterfactual explanations."""
    
    def __init__(self, model, training_data: np.ndarray,
                 feature_names: List[str], feature_ranges: Dict[str, Tuple] = None):
        self.model = model
        self.training_data = training_data
        self.feature_names = feature_names
        self.feature_ranges = feature_ranges or {}
        
        # Calculate feature statistics for guidance
        self.feature_stats = self._calculate_stats()
    
    def _calculate_stats(self) -> Dict[str, Dict]:
        """Calculate statistics for each feature."""
        stats = {}
        
        for i, name in enumerate(self.feature_names):
            feature_data = self.training_data[:, i]
            
            stats[name] = {
                'mean': np.mean(feature_data),
                'std': np.std(feature_data),
                'min': np.min(feature_data),
                'max': np.max(feature_data),
                'median': np.median(feature_data)
            }
        
        return stats
    
    def generate_counterfactual(self, features: np.ndarray,
                               target_prediction: float,
                               target_direction: str = 'increase',
                               max_changes: float = 0.5) -> List[Counterfactual]:
        """Generate counterfactual examples."""
        features = np.asarray(features)
        
        if len(features.shape) == 1:
            features = features.reshape(1, -1)
        
        original_pred = float(self.model.predict(features))
        
        counterfactuals = []
        
        # Method 1: Gradient-based (if model supports gradients)
        if hasattr(self.model, 'predict_proba'):
            cf = self._generate_gradient_cf(features, original_pred, target_prediction)
            if cf:
                counterfactuals.append(cf)
        
        # Method 2: Data-driven (find similar instances with different outcomes)
        cf = self._generate_data_cf(features, target_prediction, target_direction)
        if cf:
            counterfactuals.append(cf)
        
        # Method 3: Rule-based (simple feature adjustments)
        cf = self._generate_rule_cf(features, original_pred, target_prediction)
        if cf:
            counterfactuals.append(cf)
        
        return counterfactuals
    
    def _generate_gradient_cf(self, features: np.ndarray,
                             original_pred: float,
                             target_pred: float) -> Counterfactual:
        """Generate counterfactual using gradient-based approach."""
        # Simple numerical gradient approximation
        eps = 1e-4
        cf_features = features.copy()
        
        for i in range(len(features[0])):
            # Compute gradient
            features_plus = features.copy()
            features_minus = features.copy()
            features_plus[0, i] += eps
            features_minus[0, i] -= eps
            
            pred_plus = self.model.predict(features_plus)
            pred_minus = self.model.predict(features_minus)
            
            gradient = (pred_plus - pred_minus) / (2 * eps)
            
            # Adjust feature in gradient direction
            direction = 1 if gradient > 0 else -1
            cf_features[0, i] += direction * 0.1 * abs(self.feature_stats[self.feature_names[i]]['std'])
            
            # Clip to valid range
            if self.feature_names[i] in self.feature_ranges:
                min_val, max_val = self.feature_ranges[self.feature_names[i]]
                cf_features[0, i] = np.clip(cf_features[0, i], min_val, max_val)
        
        cf_pred = float(self.model.predict(cf_features))
        
        # Calculate feasibility
        original_dict = dict(zip(self.feature_names, features[0]))
        cf_dict = dict(zip(self.feature_names, cf_features[0]))
        
        feasibility = 1.0
        for name in self.feature_names:
            change = abs(cf_dict[name] - original_dict[name])
            std = self.feature_stats[name]['std']
            if change > 2 * std:
                feasibility *= 0.8  # Reduce feasibility for large changes
        
        return Counterfactual(
            original_features=original_dict,
            counterfactual_features=cf_dict,
            original_prediction=original_pred,
            counterfactual_prediction=cf_pred,
            change_magnitude=np.sum(np.abs(cf_features - features)),
            feasibility_score=float(feasibility)
        )
    
    def _generate_data_cf(self, features: np.ndarray,
                         target_pred: float,
                         target_direction: str) -> Counterfactual:
        """Generate counterfactual by finding similar instances."""
        original_pred = float(self.model.predict(features))
        
        # Find training instances with different prediction
        predictions = self.model.predict(self.training_data)
        
        if target_direction == 'increase':
            candidates = self.training_data[predictions > original_pred]
        else:
            candidates = self.training_data[predictions < original_pred]
        
        if len(candidates) == 0:
            return None
        
        # Find closest to original features
        distances = np.sqrt(np.sum((candidates - features) ** 2, axis=1))
        nearest_idx = np.argmin(distances)
        
        nearest = candidates[nearest_idx]
        
        original_dict = dict(zip(self.feature_names, features[0]))
        nearest_dict = dict(zip(self.feature_names, nearest))
        
        return Counterfactual(
            original_features=original_dict,
            counterfactual_features=nearest_dict,
            original_prediction=original_pred,
            counterfactual_prediction=float(predictions[nearest_idx]),
            change_magnitude=float(distances[nearest_idx]),
            feasibility_score=0.8
        )
    
    def _generate_rule_cf(self, features: np.ndarray,
                         original_pred: float,
                         target_pred: float) -> Counterfactual:
        """Generate counterfactual using simple rules."""
        cf_features = features.copy()
        
        for i, name in enumerate(self.feature_names):
            # Simple rule: move feature in direction that helps
            if target_pred > original_pred:
                # Want higher prediction
                if self.feature_stats[name]['mean'] < target_pred:
                    cf_features[0, i] *= 1.2  # Increase
                else:
                    cf_features[0, i] *= 0.8  # Decrease
            else:
                # Want lower prediction
                if self.feature_stats[name]['mean'] > target_pred:
                    cf_features[0, i] *= 0.8
                else:
                    cf_features[0, i] *= 1.2
        
        # Clip to valid range
        for i, name in enumerate(self.feature_names):
            if name in self.feature_ranges:
                min_val, max_val = self.feature_ranges[name]
                cf_features[0, i] = np.clip(cf_features[0, i], min_val, max_val)
        
        cf_pred = float(self.model.predict(cf_features))
        
        return Counterfactual(
            original_features=dict(zip(self.feature_names, features[0])),
            counterfactual_features=dict(zip(self.feature_names, cf_features[0])),
            original_prediction=original_pred,
            counterfactual_prediction=cf_pred,
            change_magnitude=float(np.sum(np.abs(cf_features - features))),
            feasibility_score=0.5
        )
```

### Sensitivity Analysis

```python
import numpy as np
from typing import Dict, List
from dataclasses import dataclass

@dataclass
class SensitivityResult:
    """Sensitivity analysis result."""
    feature: str
    feature_value: float
    prediction_change: float
    sensitivity_score: float

class SensitivityAnalyzer:
    """Analyze model sensitivity to input features."""
    
    def __init__(self, model, feature_ranges: Dict[str, Tuple] = None):
        self.model = model
        self.feature_ranges = feature_ranges or {}
    
    def analyze_sensitivity(self, features: np.ndarray,
                           perturbation_size: float = 0.01) -> List[SensitivityResult]:
        """Analyze sensitivity of predictions to each feature."""
        features = np.asarray(features)
        
        if len(features.shape) == 1:
            features = features.reshape(1, -1)
        
        original_pred = float(self.model.predict(features))
        
        results = []
        
        for i in range(features.shape[1]):
            # Perturb feature up
            features_plus = features.copy()
            features_plus[0, i] *= (1 + perturbation_size)
            
            # Perturb feature down
            features_minus = features.copy()
            features_minus[0, i] *= (1 - perturbation_size)
            
            pred_plus = float(self.model.predict(features_plus))
            pred_minus = float(self.model.predict(features_minus))
            
            # Calculate sensitivity
            change_up = pred_plus - original_pred
            change_down = pred_minus - original_pred
            
            # Average sensitivity
            sensitivity = (abs(change_up) + abs(change_down)) / 2
            
            results.append(SensitivityResult(
                feature=f'feature_{i}',
                feature_value=float(features[0, i]),
                prediction_change=sensitivity,
                sensitivity_score=float(sensitivity / (abs(original_pred) + 1e-8))
            ))
        
        return results
    
    def analyze_feature_interactions(self, features: np.ndarray,
                                    feature_pairs: List[Tuple[int, int]] = None) -> Dict:
        """Analyze feature interaction effects."""
        features = np.asarray(features)
        
        if len(features.shape) == 1:
            features = features.reshape(1, -1)
        
        n_features = features.shape[1]
        
        if feature_pairs is None:
            # Check all pairs (can be expensive)
            feature_pairs = [(i, j) for i in range(n_features) for j in range(i+1, n_features)]
        
        original_pred = float(self.model.predict(features))
        
        interaction_effects = {}
        
        for i, j in feature_pairs:
            # Calculate interaction effect
            base = original_pred
            
            # Feature i only
            features_i = features.copy()
            features_i[0, i] *= 1.1
            pred_i = float(self.model.predict(features_i))
            
            # Feature j only
            features_j = features.copy()
            features_j[0, j] *= 1.1
            pred_j = float(self.model.predict(features_j))
            
            # Both features
            features_both = features.copy()
            features_both[0, i] *= 1.1
            features_both[0, j] *= 1.1
            pred_both = float(self.model.predict(features_both))
            
            # Interaction effect
            additive = pred_i + pred_j - base
            interaction = pred_both - additive
            
            interaction_effects[f'{i}_{j}'] = {
                'feature_i': i,
                'feature_j': j,
                'additive_effect': float(additive),
                'interaction_effect': float(interaction),
                'synergy': interaction > 0
            }
        
        return interaction_effects
```

### Model Agnostic Explainer (LIME-inspired)

```python
import numpy as np
from sklearn.linear_model import LinearRegression
from typing import Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class LimeExplanation:
    """LIME explanation for a prediction."""
    feature_weights: Dict[str, float]
    intercept: float
    r_squared: float
    prediction: float

class LIMEExplainer:
    """Local Interpretable Model-agnostic Explanations."""
    
    def __init__(self, model, reference_data: np.ndarray,
                 feature_names: List[str], kernel_width: float = 0.25):
        self.model = model
        self.reference_data = reference_data
        self.feature_names = feature_names
        self.kernel_width = kernel_width
        self.n_samples = 1000
    
    def explain(self, instance: np.ndarray, n_features: int = 5) -> LimeExplanation:
        """Generate LIME explanation for a single instance."""
        instance = np.asarray(instance)
        
        if len(instance.shape) == 1:
            instance = instance.reshape(1, -1)
        
        # Generate perturbed samples
        perturbed_samples = self._generate_perturbations(instance)
        
        # Calculate distances and weights
        distances = np.sqrt(np.sum((perturbed_samples - instance) ** 2, axis=1))
        weights = np.exp(-distances ** 2 / (2 * self.kernel_width ** 2))
        
        # Get predictions for perturbed samples
        predictions = self.model.predict(perturbed_samples)
        
        # Fit weighted linear model
        lr = LinearRegression()
        lr.fit(perturbed_samples, predictions, sample_weight=weights)
        
        # Get feature weights
        feature_weights = {
            name: float(lr.coef_[i])
            for i, name in enumerate(self.feature_names)
        }
        
        return LimeExplanation(
            feature_weights=feature_weights,
            intercept=float(lr.intercept_),
            r_squared=float(lr.score(perturbed_samples, predictions, sample_weight=weights)),
            prediction=float(lr.predict(instance)[0])
        )
    
    def _generate_perturbations(self, instance: np.ndarray) -> np.ndarray:
        """Generate perturbed samples around instance."""
        n_features = instance.shape[1]
        samples = np.zeros((self.n_samples, n_features))
        
        for i in range(n_features):
            feature_data = self.reference_data[:, i]
            mean = np.mean(feature_data)
            std = np.std(feature_data)
            
            # Sample from normal distribution centered at instance value
            samples[:, i] = np.random.normal(instance[0, i], std * 0.5, self.n_samples)
        
        return samples
```

### Explanation Validator

```python
import numpy as np
from typing import Dict, List
from dataclasses import dataclass

@dataclass
class ExplanationQuality:
    """Quality metrics for an explanation."""
    fidelity: float
    simplicity: float
    stability: float
    local_accuracy: float
    overall_score: float

class ExplanationValidator:
    """Validate quality of explanations."""
    
    def __init__(self, n_perturbations: int = 100, perturbation_scale: float = 0.1):
        self.n_perturbations = n_perturbations
        self.perturbation_scale = perturbation_scale
    
    def validate(self, model, features: np.ndarray,
                explanation_features: List[str],
                feature_weights: Dict[str, float]) -> ExplanationQuality:
        """Validate explanation quality."""
        features = np.asarray(features)
        
        if len(features.shape) == 1:
            features = features.reshape(1, -1)
        
        # Fidelity: how well explanation predicts model behavior
        fidelity = self._measure_fidelity(model, features, feature_weights)
        
        # Simplicity: number of non-zero features
        n_nonzero = sum(1 for w in feature_weights.values() if abs(w) > 0.01)
        simplicity = 1.0 / (1 + n_nonzero)
        
        # Stability: explanation consistency across perturbations
        stability = self._measure_stability(model, features, explanation_features, feature_weights)
        
        # Local accuracy: how well explanation matches model prediction
        local_accuracy = self._measure_local_accuracy(model, features, feature_weights)
        
        # Overall score
        overall = 0.4 * fidelity + 0.2 * simplicity + 0.2 * stability + 0.2 * local_accuracy
        
        return ExplanationQuality(
            fidelity=fidelity,
            simplicity=simplicity,
            stability=stability,
            local_accuracy=local_accuracy,
            overall_score=overall
        )
    
    def _measure_fidelity(self, model, features: np.ndarray,
                         feature_weights: Dict[str, float]) -> float:
        """Measure how well explanation predicts model output."""
        # Simple linear prediction using explanation weights
        feature_values = features[0]
        
        # Create mapping from feature name to index
        feature_map = {name: i for i, name in enumerate(feature_weights.keys())}
        
        # Predict using weights
        prediction = sum(
            feature_weights[name] * feature_values[i]
            for i, name in enumerate(feature_weights.keys())
        )
        
        # Get actual model prediction
        actual = float(model.predict(features))
        
        # Fidelity is correlation between prediction and actual
        return 1.0 / (1 + abs(prediction - actual))
    
    def _measure_stability(self, model, features: np.ndarray,
                          explanation_features: List[str],
                          feature_weights: Dict[str, float]) -> float:
        """Measure explanation stability under perturbations."""
        features = np.asarray(features)
        
        weights_stability = []
        
        for _ in range(self.n_perturbations):
            # Perturb features
            perturbed = features + np.random.normal(0, self.perturbation_scale, features.shape)
            
            # Get weights for perturbed features
            perturbed_weights = {name: np.random.normal(0, 1) for name in explanation_features}
            
            # Calculate correlation with original weights
            if len(explanation_features) > 1:
                corr = np.corrcoef(
                    list(feature_weights.values()),
                    list(perturbed_weights.values())
                )[0, 1]
                weights_stability.append(abs(corr))
        
        return np.mean(weights_stability) if weights_stability else 0.5
    
    def _measure_local_accuracy(self, model, features: np.ndarray,
                               feature_weights: Dict[str, float]) -> float:
        """Measure how well explanation matches local model behavior."""
        features = np.asarray(features)
        
        # Get prediction and weights
        prediction = float(model.predict(features))
        
        feature_values = features[0]
        weighted_sum = sum(
            feature_weights[name] * feature_values[i]
            for i, name in enumerate(feature_weights.keys())
        )
        
        # Normalize to [-1, 1] range
        if abs(prediction) > 1e-8:
            prediction_normalized = np.tanh(prediction)
            weighted_normalized = np.tanh(weighted_sum / 10)
            
            return 1.0 / (1 + abs(prediction_normalized - weighted_normalized))
        
        return 1.0
```
