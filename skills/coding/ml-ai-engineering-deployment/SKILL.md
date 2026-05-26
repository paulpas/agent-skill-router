---
name: ml-ai-engineering-deployment
description: Implements MLOps deployment patterns including model serving with ONNX/TensorRT, drift detection, feature stores, model registries, and A/B testing for production AI systems.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: MLOps, model deployment, model serving, ML pipeline, drift detection, feature store, ONNX, TensorRT, model registry, A/B testing ML, AI engineering, how do i deploy a machine learning model, scikit-serve, Triton inference server, batch inference, online inference, model versioning, experiment tracking
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: production-readiness, engineering-api-design, data-engineering-architecture
---

# ML/AI Engineering Deployment

Implements MLOps deployment patterns for production AI systems including model serving optimization with ONNX and TensorRT, drift detection, feature stores, model registries, and A/B testing frameworks. When loaded, the model acts as a senior ML engineer deploying models from notebook experiments to reliable production inference services with full observability.

## TL;DR Checklist

- [ ] Convert trained models to ONNX format before any deployment — never serve raw PyTorch/TensorFlow checkpoints
- [ ] Implement drift detection on every prediction batch — track PSI, KS test, and feature distribution shifts
- [ ] Version all models in a registry with explicit promotion stages (dev → staging → production)
- [ ] Deploy models behind an API gateway with request rate limiting and response timeout guards
- [ ] Set up A/B testing infrastructure before deploying new model versions to production traffic
- [ ] Implement feature stores for consistent offline-to-online feature serving

---

## When to Use

Use this skill when:

- Deploying a trained ML model to production inference service (real-time or batch)
- Converting models between frameworks (PyTorch → ONNX, TensorFlow → TensorRT) for optimized serving
- Setting up drift detection pipelines that monitor production model performance and input distributions
- Building feature stores that provide consistent feature values across training and inference
- Implementing A/B testing or canary deployments for ML model versions in production
- Creating MLOps CI/CD pipelines that automate model registration, validation, and promotion

---

## When NOT to Use

Avoid this skill for:

- Selecting ML algorithms or architectures — model selection is a research/training concern, not a deployment concern
- Hyperparameter tuning — use experiment tracking tools (MLflow, Weights & Biases) for that workflow
- Building data pipelines for training data preparation — use `data-engineering-architecture` instead
- Real-time application API design — use `engineering-api-design` for the surrounding service architecture

---

## Core Workflow

1. **Validate Model Before Serving** — Run pre-deployment checks on the trained model artifact:
   - Verify input schema matches the serving endpoint's expected format
   - Confirm output types and ranges are within expected bounds (no NaN/infinite outputs)
   - Validate model size and memory footprint against target deployment environment
   **Checkpoint:** If validation fails, block promotion to staging — never deploy a broken model even temporarily.

2. **Optimize Model for Serving** — Convert the trained model to a serving-optimized format:
   - Export to ONNX as a universal intermediate representation
   - Apply quantization (FP32 → INT8) for edge/deployment environments with memory constraints
   - Use TensorRT or OpenVINO for GPU/CPU inference acceleration where applicable
   **Checkpoint:** After optimization, verify accuracy loss is within acceptable bounds (< 1% degradation for classification, < 0.5x RMSE increase for regression).

3. **Deploy Model Server** — Configure the inference serving infrastructure:
   - Use a dedicated model server (Triton Inference Server, TorchServe, BentoML) rather than raw Flask/FastAPI with model loaded in-process
   - Configure dynamic batching to improve throughput on batch prediction endpoints
   - Set up health check endpoints that return model loading status and latency percentiles
   **Checkpoint:** Every model endpoint must have a `/health` endpoint that returns `{"status": "healthy", "model_version": "x.y.z"}`.

4. **Implement Drift Detection** — Set up continuous monitoring for input and prediction drift:
   - Track Population Stability Index (PSI) on input features against the baseline training distribution
   - Monitor prediction distribution shifts using KS tests or chi-squared tests
   - Alert when drift exceeds thresholds that indicate model degradation
   **Checkpoint:** Baseline distributions must be computed from a held-out validation set, not the full training set (which would mask real-world shifts).

5. **Set Up A/B Testing** — Configure traffic splitting between model versions:
   - Route a percentage of production traffic to new model candidates using feature flags or service mesh routing
   - Compare key business metrics (conversion rate, precision at k) across variants
   - Implement automatic rollback if the new model degrades performance below threshold
   **Checkpoint:** A/B tests must run for a statistically significant period (use power analysis to determine minimum sample size).

6. **Manage Model Registry** — Establish version control for deployed models:
   - Every registered model has metadata: training dataset version, feature set version, metrics, author, promotion stage
   - Promotion requires explicit approval gates with metric validation
   - Rollback is a single click — no retraining needed from the registry
   **Checkpoint:** Never deploy directly to production — all models must pass through staging first.

---

## Implementation Patterns

### Pattern 1: ONNX Export and Validation Pipeline

```python
"""ONNX model export pipeline with validation gates.

Converts trained PyTorch/TensorFlow models to ONNX format for deployment.
Includes validation against the original model to ensure no accuracy loss
from the export process.
"""

import io
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import onnx
import onnxruntime as ort
import torch


logger = logging.getLogger(__name__)


@dataclass
class ExportResult:
    """Result of an ONNX export operation with validation metrics."""
    model_path: str
    input_shape: tuple[int, ...]
    output_shape: tuple[int, ...]
    original_accuracy: float
    onnx_accuracy: float
    accuracy_delta: float
    model_size_bytes: int
    is_valid: bool = False


def export_pytorch_to_onnx(
    model: torch.nn.Module,
    example_input: torch.Tensor,
    output_path: str,
    opset_version: int = 15,
) -> ExportResult:
    """Export a PyTorch model to ONNX format with validation.
    
    The exported ONNX model is validated by comparing its outputs against
    the original PyTorch model on the same inputs. If accuracy delta exceeds
    tolerance, the export is flagged as invalid.
    
    Args:
        model: Trained PyTorch model in eval mode
        example_input: Tensor matching expected input shape
        output_path: File path for the exported .onnx file
        opset_version: ONNX operator set version (15 recommended for broad compatibility)
        
    Returns:
        ExportResult with validation metrics
        
    Raises:
        RuntimeError: If model fails validation or export
    """
    if not model.training:
        model.eval()
    
    # Ensure deterministic inference for validation
    torch.manual_seed(42)
    
    # Run original model to get baseline outputs
    with torch.no_grad():
        original_output = model(example_input).cpu().numpy()
    
    # Export to ONNX
    f = io.BytesIO()
    input_names = ["input"]
    output_names = ["output"]
    
    torch.onnx.export(
        model,
        example_input,
        f,
        opset_version=opset_version,
        input_names=input_names,
        output_names=output_names,
        dynamic_axes={
            "input": {0: "batch_size"},
            "output": {0: "batch_size"},
        },
        do_constant_folding=True,
    )
    
    f.seek(0)
    onnx_bytes = f.read()
    
    # Save to disk and validate model structure
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    Path(output_path).write_bytes(onnx_bytes)
    
    # Validate ONNX model is parseable
    try:
        onnx_model = onnx.load_from_buffer(onnx_bytes)
        onnx.checker.check_model(onnx_model)
    except Exception as e:
        raise RuntimeError(f"ONNX validation failed: {e}")
    
    # Run ONNX Runtime inference and compare outputs
    session = ort.InferenceSession(onnx_bytes, providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    
    with torch.no_grad():
        onnx_input = example_input.cpu().numpy()
    
    onnx_output = session.run(None, {input_name: onnx_input})[0]
    
    # Calculate accuracy delta
    accuracy_delta = float(np.mean(np.abs(original_output - onnx_output)))
    
    model_size_bytes = len(onnx_bytes)
    
    result = ExportResult(
        model_path=output_path,
        input_shape=tuple(session.get_inputs()[0].shape),
        output_shape=tuple(session.get_outputs()[0].shape),
        original_accuracy=float(np.mean(original_output)),
        onnx_accuracy=float(np.mean(onnx_output)),
        accuracy_delta=accuracy_delta,
        model_size_bytes=model_size_bytes,
    )
    
    # Validate: accuracy delta must be below tolerance
    result.is_valid = accuracy_delta < 1e-5
    
    if not result.is_valid:
        logger.warning(
            "ONNX export has significant accuracy deviation: %s", result.accuracy_delta
        )
    else:
        logger.info("ONNX export valid. Size: %d bytes, Accuracy delta: %s",
                     model_size_bytes, accuracy_delta)
    
    return result


def quantize_onnx_model(
    onnx_path: str,
    output_path: str,
    calibration_data: list[np.ndarray],
) -> Path:
    """Quantize an ONNX model from FP32 to INT8 for faster inference.
    
    Uses post-training static quantization with calibration data to determine
    optimal activation ranges. Expected speedup: 2-4x on CPU with < 1% accuracy loss.
    
    Args:
        onnx_path: Path to the original FP32 ONNX model
        output_path: Path for the quantized INT8 ONNX model
        calibration_data: List of representative input samples for range calibration
        
    Returns:
        Path to the quantized model file
    """
    from onnxruntime.quantization import (
        quantize_static,
        QuantType,
        read_config,
    )
    
    # Run FP32 inference on first calibration sample to verify baseline
    original_session = ort.InferenceSession(onnx_path)
    original_output = original_session.run(
        None, {original_session.get_inputs()[0].name: calibration_data[0]}
    )[0]
    
    # Quantize the model
    quantize_static(
        onnx_path,
        output_path,
        calibration_data,  # Calibration samples for INT8 range determination
        weight_type=QuantType.QUInt8,
        activation_type=QuantType.QUInt8,
        nodes_to_exclude=[],  # Keep certain layers (e.g., first/last) in FP32
    )
    
    # Verify quantized model accuracy against original
    quantized_session = ort.InferenceSession(output_path)
    quantized_output = quantized_session.run(
        None, {quantized_session.get_inputs()[0].name: calibration_data[0]}
    )[0]
    
    accuracy_loss = float(np.mean(np.abs(original_output - quantized_output)))
    
    if accuracy_loss > 0.01:
        raise RuntimeError(
            f"Quantization accuracy loss too high: {accuracy_loss} (threshold: 0.01)"
        )
    
    logger.info("INT8 quantization complete. Accuracy loss: %s", accuracy_loss)
    return Path(output_path)
```

### Pattern 2: Model Registry with Promotion Stages (BAD vs. GOOD)

```python
# ❌ BAD: No registry — models deployed directly from local filesystem
import os
from pathlib import Path


def bad_model_deployment(model_path: str, environment: str):
    """Deploys a model file directly without version tracking or approval gates.
    
    Problems:
    - No record of which model was deployed to which environment
    - No audit trail for who deployed it and when
    - Rollback requires manual file replacement
    - No metadata about training data, features, or metrics
    - No promotion gating — dev models can go directly to production
    """
    # Just copy a file — no validation, no tracking
    if environment == "production":
        os.system(f"cp {model_path} /opt/models/production/")  # ⚠️ Shell out for deployment
    # No accuracy check, no metadata, no version number


# ✅ GOOD: Model registry with staged promotion and metadata tracking
import json
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional


class ModelStage(str, Enum):
    """Promotion stages for the model lifecycle.
    
    Models must progress through stages sequentially:
    DEV → STAGING → PRODUCTION → (rollback to previous stage)
    """
    DEV = "dev"
    STAGING = "staging"
    PRODUCTION = "production"


@dataclass
class ModelMetadata:
    """Comprehensive metadata for a registered model version.
    
    Tracks the complete lineage of every deployed model including
    training artifacts, evaluation metrics, and promotion history.
    """
    model_id: str  # UUID
    version: int
    name: str
    stage: ModelStage = ModelStage.DEV
    framework: str = ""  # e.g., "pytorch", "tensorflow"
    artifact_path: str = ""  # Path to the ONNX/pickled model file
    
    # Training lineage
    training_dataset_version: str = ""
    feature_set_version: str = ""
    hyperparameters: dict[str, Any] = field(default_factory=dict)
    
    # Evaluation metrics from validation set
    metrics: dict[str, float] = field(default_factory=dict)
    
    # Promotion tracking
    registered_by: str = ""
    registered_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    promoted_to_staging_by: Optional[str] = None
    promoted_to_production_by: Optional[str] = None
    
    # Performance validation for promotion
    accuracy_minimum: float = 0.90
    latency_p99_max_ms: float = 50.0


class ModelRegistryError(Exception):
    """Raised when registry operations fail."""
    pass


class ModelNotFoundError(ModelRegistryError):
    pass


class PromotionValidationError(ModelRegistryError):
    """Raised when a model fails validation for stage promotion."""
    def __init__(self, model_id: str, stage: str, reason: str) -> None:
        self.model_id = model_id
        self.stage = stage
        self.reason = reason
        super().__init__(f"Model {model_id} failed promotion to {stage}: {reason}")


class ModelRegistry:
    """In-memory model registry with staged promotion and metadata tracking.
    
    In production, this would be backed by a database (PostgreSQL) or 
    dedicated model registry service (MLflow Model Registry, Kubeflow Models).
    """
    
    def __init__(self) -> None:
        self._models: dict[str, list[ModelMetadata]] = {}
    
    def register_model(
        self,
        name: str,
        framework: str,
        artifact_path: str,
        training_dataset_version: str,
        feature_set_version: str,
        metrics: dict[str, float],
        hyperparameters: dict[str, Any] | None = None,
        registered_by: str = "",
        accuracy_minimum: float = 0.90,
    ) -> ModelMetadata:
        """Register a new model version in the registry.
        
        Creates a new version entry with full metadata. The model starts
        at the DEV stage and must be explicitly promoted.
        
        Args:
            name: Logical model name (e.g., "fraud_detection_v2")
            framework: Model framework ("pytorch", "tensorflow", etc.)
            artifact_path: Filesystem or S3 path to the trained model artifact
            training_dataset_version: Version identifier for the training dataset
            feature_set_version: Version identifier for the feature engineering pipeline
            metrics: Evaluation metrics from validation set (e.g., {"precision": 0.95, "recall": 0.88})
            hyperparameters: Training hyperparameters for reproducibility
            registered_by: Identity of the person/automated process registering
            accuracy_minimum: Minimum accuracy required to promote to production
            
        Returns:
            The newly created ModelMetadata object
        """
        if name not in self._models:
            self._models[name] = []
        
        versions = self._models[name]
        new_version = len(versions) + 1
        
        metadata = ModelMetadata(
            model_id=f"{name}-{new_version}",
            version=new_version,
            name=name,
            framework=framework,
            artifact_path=artifact_path,
            training_dataset_version=training_dataset_version,
            feature_set_version=feature_set_version,
            metrics=metrics,
            hyperparameters=hyperparameters or {},
            registered_by=registered_by,
            accuracy_minimum=accuracy_minimum,
        )
        
        versions.append(metadata)
        logger.info("Registered model %s v%d at stage %s", name, new_version, metadata.stage.value)
        return metadata
    
    def get_model(
        self, 
        name: str, 
        version: int | None = None,
        stage: ModelStage | None = None
    ) -> ModelMetadata:
        """Get a specific model by name and optional version or stage.
        
        If version is None, returns the latest version of the model.
        If stage is specified, filters to models at that promotion stage.
        
        Args:
            name: Logical model name
            version: Specific version number (default: latest)
            stage: Filter by promotion stage
            
        Returns:
            ModelMetadata for the requested version
        """
        if name not in self._models:
            raise ModelNotFoundError(f"Model '{name}' not found in registry")
        
        versions = self._models[name]
        
        if stage:
            versions = [v for v in versions if v.stage == stage]
            if not versions:
                raise ModelNotFoundError(f"No {stage.value} version of model '{name}'")
        
        target_version = version or max(v.version for v in versions)
        matching = [v for v in versions if v.version == target_version]
        
        if not matching:
            raise ModelNotFoundError(
                f"Version {target_version} of model '{name}' not found"
            )
        
        return matching[0]
    
    def promote_to_staging(self, name: str, version: int) -> ModelMetadata:
        """Promote a dev model to staging for integration testing.
        
        Requires that the model has accuracy metrics recorded and meets
        the minimum accuracy threshold.
        """
        model = self.get_model(name, version=version)
        
        if model.stage != ModelStage.DEV:
            raise PromotionValidationError(
                name, "staging",
                f"Model is already at stage {model.stage.value}"
            )
        
        # Validate metrics before promoting to staging
        precision = model.metrics.get("precision", 0.0)
        recall = model.metrics.get("recall", 0.0)
        
        if precision < 0.5:
            raise PromotionValidationError(
                name, "staging",
                f"Precision {precision:.3f} below minimum threshold 0.5"
            )
        
        model.stage = ModelStage.STAGING
        model.promoted_to_staging_by = model.registered_by
        logger.info("Promoted %s v%d to staging", name, version)
        return model
    
    def promote_to_production(
        self, 
        name: str, 
        version: int,
        approver: str,
        latency_p99_ms: float,
    ) -> ModelMetadata:
        """Promote a staging model to production.
        
        Requires explicit approval with accuracy validation and latency checks.
        This is the gate that prevents broken models from reaching users.
        
        Args:
            name: Model name
            version: Version number at staging
            approver: Identity of the person approving production deployment
            latency_p99_ms: Measured P99 inference latency in ms
            
        Raises:
            PromotionValidationError: If accuracy or latency thresholds are not met
        """
        model = self.get_model(name, version=version)
        
        if model.stage != ModelStage.STAGING:
            raise PromotionValidationError(
                name, "production",
                f"Model is at stage {model.stage.value}, must be staging to promote to production"
            )
        
        # Gate 1: Accuracy threshold
        accuracy = model.metrics.get("accuracy", 0.0)
        if accuracy < model.accuracy_minimum:
            raise PromotionValidationError(
                name, "production",
                f"Accuracy {accuracy:.3f} below required minimum {model.accuracy_minimum}"
            )
        
        # Gate 2: Latency threshold
        if latency_p99_ms > model.latency_p99_max_ms:
            raise PromotionValidationError(
                name, "production",
                f"P99 latency {latency_p99_ms}ms exceeds limit {model.latency_p99_max_ms}ms"
            )
        
        # Gate 3: Only one production model at a time (no overlapping versions)
        prod_versions = [
            v for v in self._models.get(name, []) 
            if v.stage == ModelStage.PRODUCTION
        ]
        if prod_versions:
            logger.warning(
                "Model %s already has production version %d. "
                "New version will become active on next rollout.",
                name, prod_versions[0].version
            )
        
        model.stage = ModelStage.PRODUCTION
        model.promoted_to_production_by = approver
        logger.info("Promoted %s v%d to production by %s", name, version, approver)
        return model
    
    def rollback_model(self, name: str, target_version: int) -> ModelMetadata:
        """Rollback a model deployment by switching production traffic to a previous version.
        
        This is the emergency button — used when drift detection or A/B test
        results indicate a production model needs to be reverted.
        """
        if name not in self._models:
            raise ModelNotFoundError(f"Model '{name}' not found")
        
        # Deactivate all current production models
        for version_obj in self._models[name]:
            if version_obj.stage == ModelStage.PRODUCTION:
                version_obj.stage = ModelStage.STAGING
        
        # Activate the target version
        rollback_model = self.get_model(name, version=target_version)
        rollback_model.stage = ModelStage.PRODUCTION
        logger.info("Rolled back %s to version %d", name, target_version)
        return rollback_model
    
    def list_production_models(self, name: str | None = None) -> list[ModelMetadata]:
        """List all models currently serving in production.
        
        Args:
            name: Optional model name filter
            
        Returns:
            List of ModelMetadata objects for active production models
        """
        results = []
        for model_name, versions in self._models.items():
            if name and model_name != name:
                continue
            prod_versions = [v for v in versions if v.stage == ModelStage.PRODUCTION]
            results.extend(prod_versions)
        return results


# ❌ BAD: No validation of latency or accuracy before production promotion
def bad_promotion(registry, name, version):
    """Promotes directly to production with no gates."""
    model = registry.get_model(name, version)
    model.stage = "production"  # ⚠️ Any stage value accepted
    return model


# ✅ GOOD: Full validation pipeline before production deployment
def good_production_promotion(
    registry: ModelRegistry,
    model_name: str,
    version: int,
    approver: str,
    performance_results: dict[str, float],
) -> ModelMetadata:
    """Complete production promotion with all gates enforced.
    
    Validates accuracy, latency, and resource constraints before allowing
    a model to be promoted from staging to production. Each gate is a 
    non-negotiable requirement that blocks the deployment if unmet.
    """
    # Gate 1: Model exists and is at staging stage
    try:
        registry.promote_to_production(
            name=model_name,
            version=version,
            approver=approver,
            latency_p99_ms=performance_results.get("latency_p99_ms", 999),
        )
    except PromotionValidationError as e:
        logger.error("Production promotion blocked for %s v%d: %s", 
                      model_name, version, e.reason)
        raise
    
    # Gate 2: Log the promotion event for audit trail
    logger.info(
        "Model %s v%d promoted to production by %s at %s",
        model_name, version, approver,
        datetime.now(timezone.utc).isoformat()
    )
    
    return registry.get_model(model_name, version)
```

### Pattern 3: Drift Detection Pipeline

```python
"""Drift detection pipeline for monitoring production ML model quality.

Tracks statistical drift in both input features and prediction outputs.
Uses PSI (Population Stability Index) for feature distributions and KS tests
for continuous variable shifts. Alerts when drift exceeds predefined thresholds.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

import numpy as np
from scipy import stats


logger = logging.getLogger(__name__)


@dataclass
class DriftAlert:
    """Represents a drift detection alert for downstream processing."""
    timestamp: str
    drift_type: str  # "feature_drift", "prediction_drift", "concept_drift"
    severity: str  # "warning", "critical"
    metric_name: str
    metric_value: float
    threshold: float
    description: str


class DriftDetector:
    """Detects statistical drift in production ML model inputs and outputs.
    
    Monitors two categories of drift:
    - Feature drift: Changes in the distribution of input features compared to
      the training baseline (using PSI and KS tests)
    - Prediction drift: Changes in the distribution of model predictions
      indicating potential degradation
    
    Baseline distributions must be established during deployment and are 
    updated only through explicit re-baselining, not automatically.
    """
    
    def __init__(
        self,
        feature_names: list[str],
        baseline_distribution: dict[str, np.ndarray],
        psi_threshold: float = 0.2,
        ks_significance_level: float = 0.01,
        min_sample_size: int = 1000,
    ) -> None:
        """Initialize the drift detector with baseline distributions.
        
        Args:
            feature_names: Names of input features to monitor
            baseline_distribution: Dictionary mapping feature names to 
                numpy arrays from the training/validation set
            psi_threshold: PSI threshold for triggering alerts (0.2 = significant)
            ks_significance_level: P-value threshold for KS test significance
            min_sample_size: Minimum production samples required before detecting drift
        """
        self.feature_names = feature_names
        self.baseline_distribution = baseline_distribution
        self.psi_threshold = psi_threshold
        self.ks_significance_level = ks_significance_level
        self.min_sample_size = min_sample_size
        
        # Track sample counts per monitoring period
        self._sample_counts: dict[str, int] = {}

    def detect_feature_drift(
        self, 
        production_features: np.ndarray,
        feature_names: list[str],
    ) -> list[DriftAlert]:
        """Detect feature drift between production and baseline distributions.
        
        Uses Population Stability Index (PSI) for categorical features and
        Kolmogorov-Smirnov test for continuous features. PSI is preferred 
        because it provides an interpretable magnitude, not just a binary decision.
        
        Args:
            production_features: 2D array of shape (n_samples, n_features) from production
            feature_names: Names corresponding to each column in production_features
            
        Returns:
            List of DriftAlert objects for features exceeding thresholds
        """
        if len(production_features) < self.min_sample_size:
            logger.info(
                "Insufficient samples (%d < %d) — skipping drift detection",
                len(production_features), self.min_sample_size
            )
            return []
        
        alerts = []
        
        for i, feature_name in enumerate(feature_names):
            if i >= len(self.feature_names):
                continue
                
            baseline_data = self.baseline_distribution.get(feature_name)
            if baseline_data is None:
                logger.warning("No baseline for feature %s — skipping", feature_name)
                continue
            
            production_col = production_features[:, i]
            
            # Determine if feature is categorical or continuous
            unique_count = len(np.unique(production_col))
            total_count = len(production_col)
            is_categorical = unique_count / total_count < 0.1 and unique_count < 50
            
            if is_categorical:
                alert = self._check_psi_drift(baseline_data, production_col, feature_name)
            else:
                alert = self._check_ks_drift(baseline_data, production_col, feature_name)
            
            if alert:
                alerts.append(alert)
        
        return alerts

    def detect_prediction_drift(
        self, 
        baseline_predictions: np.ndarray,
        production_predictions: np.ndarray,
    ) -> list[DriftAlert]:
        """Detect drift in model prediction distributions.
        
        Monitors whether the distribution of predictions has shifted significantly
        from the training-time distribution. A large shift can indicate input
        data changes or concept drift (the relationship between inputs and outputs 
        has fundamentally changed).
        
        Args:
            baseline_predictions: Predictions from the validation/test set during training
            production_predictions: Current production model predictions
            
        Returns:
            List of DriftAlert objects for prediction distribution shifts
        """
        if len(production_predictions) < self.min_sample_size:
            return []
        
        alerts = []
        
        # Overall prediction distribution shift (KS test)
        ks_statistic, ks_pvalue = stats.ks_2samp(
            baseline_predictions.flatten(),
            production_predictions.flatten()
        )
        
        if ks_pvalue < self.ks_significance_level:
            severity = "critical" if ks_statistic > 0.3 else "warning"
            
            alert = DriftAlert(
                timestamp=datetime.now(timezone.utc).isoformat(),
                drift_type="prediction_drift",
                severity=severity,
                metric_name="predictions_ks_test",
                metric_value=float(ks_statistic),
                threshold=self.ks_significance_level,
                description=(
                    f"KS statistic {ks_statistic:.4f} (p={ks_pvalue:.6e}) "
                    f"exceeds significance level {self.ks_significance_level}"
                ),
            )
            alerts.append(alert)
        
        return alerts

    def _check_psi_drift(
        self, 
        baseline: np.ndarray, 
        production: np.ndarray, 
        feature_name: str
    ) -> DriftAlert | None:
        """Calculate PSI and return alert if threshold exceeded."""
        psi = self._calculate_psi(baseline, production)
        
        if psi > self.psi_threshold:
            severity = "critical" if psi > 0.25 else "warning"
            
            return DriftAlert(
                timestamp=datetime.now(timezone.utc).isoformat(),
                drift_type="feature_drift",
                severity=severity,
                metric_name=f"{feature_name}_psi",
                metric_value=float(psi),
                threshold=self.psi_threshold,
                description=f"PSI={psi:.4f} for feature {feature_name} exceeds threshold",
            )
        
        return None

    def _check_ks_drift(
        self, 
        baseline: np.ndarray, 
        production: np.ndarray, 
        feature_name: str
    ) -> DriftAlert | None:
        """Kolmogorov-Smirnov test for continuous feature drift."""
        ks_stat, ks_pvalue = stats.ks_2samp(baseline.flatten(), production.flatten())
        
        if ks_pvalue < self.ks_significance_level and ks_stat > 0.1:
            severity = "critical" if ks_stat > 0.3 else "warning"
            
            return DriftAlert(
                timestamp=datetime.now(timezone.utc).isoformat(),
                drift_type="feature_drift",
                severity=severity,
                metric_name=f"{feature_name}_ks_test",
                metric_value=float(ks_stat),
                threshold=self.ks_significance_level,
                description=(
                    f"KS statistic={ks_stat:.4f}, p-value={ks_pvalue:.6e} "
                    f"for feature {feature_name}"
                ),
            )
        
        return None

    @staticmethod
    def _calculate_psi(baseline: np.ndarray, production: np.ndarray, bins: int = 10) -> float:
        """Calculate Population Stability Index between two distributions.
        
        PSI measures the percentage change in distribution between baseline 
        and current populations. Interpretation:
        - PSI < 0.1: Little to no drift
        - 0.1 <= PSI < 0.25: Moderate drift — investigate
        - PSI >= 0.25: Significant drift — action required
        
        Args:
            baseline: Reference distribution (training data)
            production: Current distribution (production data)
            bins: Number of histogram bins for discretization
            
        Returns:
            PSI value as a float
        """
        # Create histogram bins from the combined range
        all_data = np.concatenate([baseline.flatten(), production.flatten()])
        min_val, max_val = np.min(all_data), np.max(all_data)
        
        if min_val == max_val:
            return 0.0
        
        bin_edges = np.linspace(min_val, max_val, bins + 1)
        
        # Calculate proportions for each bin
        baseline_counts, _ = np.histogram(baseline.flatten(), bins=bin_edges)
        production_counts, _ = np.histogram(production.flatten(), bins=bin_edges)
        
        baseline_prop = (baseline_counts + 1) / len(baseline)  # Laplace smoothing
        production_prop = (production_counts + 1) / len(production)  # Laplace smoothing
        
        # Calculate PSI
        psi = float(np.sum(
            (production_prop - baseline_prop) * np.log(production_prop / baseline_prop)
        ))
        
        return round(psi, 6)


# ❌ BAD: No drift detection — models deployed to production and forgotten
def bad_deployment(model, feature_extractor):
    """Deploys a model with zero monitoring infrastructure."""
    def predict(request):
        features = feature_extractor.extract(request)
        prediction = model.predict(features)
        return {"prediction": prediction.tolist()}  # ⚠️ No validation, no monitoring
    
    return predict


# ✅ GOOD: Deployment with drift detection, performance tracking, and rollback support
def good_deployment_with_monitoring(
    model_server_url: str,
    drift_detector: DriftDetector,
    baseline_predictions: np.ndarray,
) -> dict:
    """Production deployment configuration with complete monitoring.
    
    Returns a deployment configuration that includes the model serving endpoint,
    drift detection settings, alerting thresholds, and rollback procedure.
    
    This function would be called by the CI/CD pipeline to configure the 
    production deployment. All monitoring parameters are versioned alongside 
    the model in the registry.
    """
    deployment_config = {
        "model_server": {
            "url": model_server_url,
            "health_check_endpoint": "/health",
            "prediction_endpoint": "/predict",
            "timeout_seconds": 30,
            "max_retries": 3,
        },
        "drift_monitoring": {
            "check_interval_hours": 6,
            "min_sample_size_for_detection": drift_detector.min_sample_size,
            "psi_threshold": drift_detector.psi_threshold,
            "ks_significance_level": drift_detector.ks_significance_level,
            "monitored_features": drift_detector.feature_names,
        },
        "alerting": {
            "warning_severity": "feature_drift" if True else None,
            "critical_alert_channels": ["pagerduty", "slack-ml-team"],
            "warning_alert_channels": ["slack-ml-team"],
        },
        "rollback": {
            "auto_rollback_on_critical_drift": False,  # Requires human approval
            "previous_model_version": "production_v1",
            "rollback_command": f"registry rollback model-name --version 1",
        },
        "deployment_timestamp": datetime.now(timezone.utc).isoformat(),
    }
    
    logger.info("Deployment configured with drift monitoring for %d features", 
                len(drift_detector.feature_names))
    
    return deployment_config
```

### Pattern 4: A/B Testing Framework for Model Versions

```python
"""A/B testing framework for ML model deployments.

Routes production traffic across model versions using feature flags,
collects metrics per variant, and provides statistical analysis for
determining the winning model.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

import numpy as np


class VariantStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    WINNER = "winner"
    LOSER = "loser"


@dataclass
class ABTestVariant:
    """Represents a single model variant in an A/B test."""
    variant_id: str
    model_name: str
    model_version: int
    traffic_percentage: float  # 0.0 to 1.0
    status: VariantStatus = VariantStatus.ACTIVE
    
    # Metrics collected during the test
    total_requests: int = 0
    successful_predictions: int = 0
    failures: int = 0
    avg_latency_ms: float = 0.0
    business_metric_value: float = 0.0  # e.g., conversion rate


@dataclass
class ABTestResult:
    """Statistical result from an A/B test between model variants."""
    test_id: str
    start_time: str
    end_time: str | None = None
    winner_variant_id: str | None = None
    statistical_significance: float = 0.0
    variant_improvements: dict[str, float] = field(default_factory=dict)
    recommended_action: str = ""


class ABTestManager:
    """Manages A/B tests for ML model versions in production.
    
    Routes a configurable percentage of traffic to each variant,
    collects performance and business metrics, and provides 
    statistical analysis for determining the winning model.
    """
    
    def __init__(self, test_id: str) -> None:
        self.test_id = test_id
        self.variants: dict[str, ABTestVariant] = {}
        self._start_time = datetime.now(timezone.utc).isoformat()

    def add_variant(
        self,
        variant_id: str,
        model_name: str,
        model_version: int,
        traffic_percentage: float,
    ) -> None:
        """Add a model variant to the A/B test.
        
        Args:
            variant_id: Unique identifier for this variant (e.g., "control", "model_v2")
            model_name: Logical name of the ML model
            model_version: Version number in the registry
            traffic_percentage: Fraction of total traffic routed to this variant (0.0-1.0)
            
        Raises:
            ValueError: If total traffic percentage exceeds 1.0 or is negative
        """
        if traffic_percentage < 0 or traffic_percentage > 1.0:
            raise ValueError(f"Traffic percentage must be between 0 and 1, got {traffic_percentage}")
        
        total_traffic = sum(v.traffic_percentage for v in self.variants.values()) + traffic_percentage
        if total_traffic > 1.0:
            raise ValueError(
                f"Total traffic would exceed 100%: {total_traffic * 100:.1f}%"
            )
        
        self.variants[variant_id] = ABTestVariant(
            variant_id=variant_id,
            model_name=model_name,
            model_version=model_version,
            traffic_percentage=traffic_percentage,
        )
    
    def select_variant(self, request_id: str) -> str:
        """Select which model variant should serve a given request.
        
        Uses deterministic hash-based routing to ensure the same user
        always sees the same variant within a session (consistency).
        
        Args:
            request_id: Unique identifier for this request/user session
            
        Returns:
            The variant_id selected for this request
        """
        if not self.variants:
            raise RuntimeError("No variants configured for A/B test")
        
        # Calculate cumulative weights for routing
        cumulative_weights = []
        running_total = 0.0
        
        for vid, variant in self.variants.items():
            if variant.status == VariantStatus.ACTIVE:
                running_total += variant.traffic_percentage
                cumulative_weights.append((vid, running_total))
        
        # Deterministic routing based on request hash
        request_hash = int(hash(request_id) % 10000) / 10000.0
        
        for vid, threshold in cumulative_weights:
            if request_hash < threshold:
                return vid
        
        # Fallback to last active variant
        for vid, variant in self.variants.items():
            if variant.status == VariantStatus.ACTIVE:
                return vid
        
        raise RuntimeError("No active variants available")
    
    def record_metric(
        self,
        variant_id: str,
        success: bool,
        latency_ms: float,
        business_metric: float = 0.0,
    ) -> None:
        """Record a prediction outcome for metrics collection.
        
        Args:
            variant_id: Which variant served this request
            success: Whether the prediction succeeded
            latency_ms: Inference latency in milliseconds
            business_metric: Business metric value (e.g., 1.0 if user converted, 0.0 otherwise)
        """
        if variant_id not in self.variants:
            raise ValueError(f"Unknown variant: {variant_id}")
        
        variant = self.variants[variant_id]
        variant.total_requests += 1
        
        if success:
            variant.successful_predictions += 1
        else:
            variant.failures += 1
        
        # Exponential moving average for latency tracking
        alpha = 0.1
        variant.avg_latency_ms = (
            (1 - alpha) * variant.avg_latency_ms + alpha * latency_ms
        )
        
        variant.business_metric_value = business_metric
    
    def analyze_results(
        self, 
        confidence_level: float = 0.95,
        minimum_lift: float = 0.01,
    ) -> ABTestResult:
        """Analyze A/B test results with statistical significance testing.
        
        Performs a two-proportion z-test comparing business metrics (e.g., 
        conversion rates) between all variants against the control. Also 
        evaluates latency differences using t-tests.
        
        Args:
            confidence_level: Statistical confidence level (0.95 = 95%)
            minimum_lift: Minimum improvement required to declare a winner
            
        Returns:
            ABTestResult with statistical analysis and recommendation
        """
        if not self.variants:
            return ABTestResult(
                test_id=self.test_id,
                start_time=self._start_time,
                recommended_action="No variants to analyze",
            )
        
        # Sort by traffic — first variant is typically the control
        sorted_variants = sorted(
            self.variants.values(), 
            key=lambda v: (-v.traffic_percentage, v.variant_id)
        )
        control_variant = sorted_variants[0]
        
        if control_variant.total_requests < 1000:
            return ABTestResult(
                test_id=self.test_id,
                start_time=self._start_time,
                recommended_action="Insufficient traffic — minimum 1000 requests required per variant",
            )
        
        # Statistical analysis: compare each variant to control
        improvements = {}
        has_significant_winner = False
        
        for variant in sorted_variants[1:]:
            if variant.status == VariantStatus.LOSER:
                continue
            
            improvement = self._compute_lift(control_variant, variant)
            p_value = self._compute_p_value(control_variant, variant)
            
            improvements[variant.variant_id] = {
                "lift": float(improvement),
                "p_value": float(p_value),
                "significant": p_value < (1 - confidence_level),
            }
            
            # Check if this variant is a statistically significant winner
            if (improvement >= minimum_lift and 
                p_value < (1 - confidence_level) and 
                variant.status != VariantStatus.LOSER):
                has_significant_winner = True
                sorted_variants.remove(variant)
        
        # Determine action
        if has_significant_winner:
            winner = next(
                v for v in sorted_variants[1:]
                if improvements.get(v.variant_id, {}).get("significant", False)
            )
            
            return ABTestResult(
                test_id=self.test_id,
                start_time=self._start_time,
                end_time=datetime.now(timezone.utc).isoformat(),
                winner_variant_id=winner.variant_id,
                statistical_significance=float(
                    improvements.get(winner.variant_id, {}).get("p_value", 1.0)
                ),
                variant_improvements=improvements,
                recommended_action=f"Promote {winner.model_name} v{winner.model_version} to production",
            )
        
        return ABTestResult(
            test_id=self.test_id,
            start_time=self._start_time,
            recommended_action="Continue test — no statistically significant winner yet",
        )

    def _compute_lift(self, control: ABTestVariant, variant: ABTestVariant) -> float:
        """Compute relative lift of a variant over the control."""
        if control.business_metric_value == 0:
            return 0.0
        
        control_rate = control.business_metric_value / max(control.total_requests, 1)
        variant_rate = variant.business_metric_value / max(variant.total_requests, 1)
        
        lift = (variant_rate - control_rate) / max(control_rate, 1e-10)
        return lift
    
    def _compute_p_value(self, control: ABTestVariant, variant: ABTestVariant) -> float:
        """Two-proportion z-test p-value for business metric comparison."""
        n1 = max(control.total_requests, 1)
        n2 = max(variant.total_requests, 1)
        
        p1 = control.business_metric_value / n1 if n1 > 0 else 0
        p2 = variant.business_metric_value / n2 if n2 > 0 else 0
        
        # Pooled proportion
        p_pool = (control.business_metric_value + variant.business_metric_value) / (n1 + n2)
        
        if p_pool == 0 or p_pool == 1:
            return 1.0
        
        # Standard error
        se = np.sqrt(
            p_pool * (1 - p_pool) * (1/n1 + 1/n2)
        )
        
        if se == 0:
            return 1.0
        
        z_score = abs(p2 - p1) / se
        
        # Two-tailed p-value from z-score
        p_value = 2 * (1 - _norm_cdf(z_score))
        return p_value


def _norm_cdf(x: float) -> float:
    """Standard normal CDF approximation."""
    return float(0.5 * (1 + np.math.erf(x / np.sqrt(2))))
```

---

## Constraints

### MUST DO
- Export all models to ONNX format before serving — raw framework checkpoints are not production artifacts
- Implement drift detection on every prediction batch — track PSI for feature distributions and KS test for predictions
- Use a dedicated model server (Triton, TorchServe, BentoML) — never load models in application process memory without version management
- Version all models in a registry with explicit promotion stages (dev → staging → production) before any deployment
- Set up A/B testing infrastructure BEFORE deploying new model versions — never deploy directly to 100% traffic
- Implement health check endpoints on every serving endpoint returning status, model version, and latency percentiles
- Log all prediction requests with input fingerprint for post-hoc drift analysis

### MUST NOT DO
- Deploy a raw PyTorch `.pth` or TensorFlow `.pb` file directly to production — always convert to ONNX first
- Skip staging validation — models must be tested in staging before reaching production traffic
- Use automatic re-baselining of drift thresholds — baseline distributions are set once and only changed through explicit review
- Serve models without input validation — unvalidated inputs cause crashes and mask real drift signals
- Run A/B tests for fewer than the calculated minimum sample size — underpowered tests produce false conclusions
- Mix training data preparation with serving code — feature engineering in training must match inference exactly (use a feature store)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `production-readiness` | General production deployment concerns (monitoring, capacity planning, SLA definitions) — use alongside this skill for full infrastructure readiness |
| `engineering-api-design` | API design for serving model endpoints and feature store APIs — use when designing the REST/gRPC interfaces around ML models |
| `data-engineering-architecture` | Data pipeline architecture for training data ingestion and feature pipelines — use when building the data foundation that feeds ML models |

---

## Live References

> Authoritative documentation links for this skill's domain.

- [ONNX Runtime Documentation](https://onnxruntime.ai/docs/)
- [NVIDIA Triton Inference Server](https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/index.html)
- [MLflow Model Registry](https://mlflow.org/docs/latest/model-registry.html)
- [Scikit-learn Drift Detection (scikit-posthocs)](https://github.com/samet-opt/scikit-posthocs)
- [KServe Model Serving on Kubernetes](https://kserve.github.io/website/master/)
- [BentoML Model Serving Framework](https://docs.bentoml.org/en/latest/)
- [TorchScript and JIT Compilation](https://pytorch.org/docs/stable/jit.html)
