---
name: trading-ai-live-model-monitoring
description: Monitor production ML models for drift, decay, and performance degradation
---

**Role:** Ensure deployed trading models maintain performance through continuous monitoring and alerting

**Philosophy:** Models decay as market conditions change. Prioritize real-time monitoring, early warning systems, and automated retraining triggers to maintain model reliability.

## Key Principles

1. **Multi-Metric Monitoring**: Track prediction quality, calibration, and statistical drift
2. **Early Warning Signals**: Detect degradation before it impacts trading performance
3. **Statistical Drift Detection**: Monitor input distribution shifts with KS tests
4. **Performance Baselines**: Compare current vs. historical performance with confidence intervals
5. **Automated Retraining**: Trigger retraining when performance drops below thresholds

## Implementation Guidelines

### Structure
- Core logic: `monitoring/monitor.py` - Model monitoring
- Alerting: `monitoring/alerts.py` - Alert system
- Drift detection: `monitoring/drift.py` - Distribution drift detection
- Retraining: `monitoring/retrain.py` - Retraining triggers
- Config: `config/monitoring_config.yaml` - Monitoring parameters

### Patterns to Follow
- Use rolling window statistics for live metrics
- Implement significance testing for performance changes
- Log all monitoring events for audit trail
- Separate prediction monitoring from input monitoring

## Adherence Checklist
Before completing your task, verify:
- [ ] Prediction error tracked with rolling window
- [ ] Input distribution drift monitored (KS tests, PSR)
- [ ] Performance baseline with confidence intervals
- [ ] Early warning alerts configured
- [ ] Automated retraining triggers defined



## Code Examples

### Model Performance Monitor

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from dataclasses import dataclass
from datetime import datetime
from collections import deque

@dataclass
class PerformanceMetrics:
    """Model performance metrics."""
    timestamp: datetime
    mse: float
    mae: float
    rmse: float
    mape: float
    sharpe: float
    profit: float

class ModelPerformanceMonitor:
    """Monitor model performance over time."""
    
    def __init__(self, window_size: int = 100, baseline_window: int = 500):
        self.window_size = window_size
        self.baseline_window = baseline_window
        
        self.metrics = deque(maxlen=baseline_window)
        self.predictions = deque(maxlen=baseline_window)
        self.actuals = deque(maxlen=baseline_window)
        
        self.performance_history = []
    
    def update(self, predictions: np.ndarray, actuals: np.ndarray,
              timestamps: List[datetime] = None):
        """Update monitor with new predictions."""
        predictions = np.asarray(predictions)
        actuals = np.asarray(actuals)
        
        # Calculate metrics
        mse = np.mean((predictions - actuals) ** 2)
        mae = np.mean(np.abs(predictions - actuals))
        rmse = np.sqrt(mse)
        mape = np.mean(np.abs((actuals - predictions) / (actuals + 1e-8)))
        
        # Calculate trading metrics if returns data
        returns = actuals  # Assuming actuals are returns
        sharpe = np.mean(returns) / (np.std(returns) + 1e-8)
        
        profit = np.sum(np.where(predictions * actuals > 0, actuals, 0))
        
        metrics = PerformanceMetrics(
            timestamp=timestamps[0] if timestamps else datetime.now(),
            mse=mse,
            mae=mae,
            rmse=rmse,
            mape=mape,
            sharpe=sharpe,
            profit=profit
        )
        
        self.metrics.append(metrics)
        self.predictions.extend(predictions)
        self.actuals.extend(actuals)
        
        self.performance_history.append(metrics)
    
    def get_performance(self) -> Dict:
        """Get latest performance metrics."""
        if not self.metrics:
            return {}
        
        return {
            'mse': self.metrics[-1].mse,
            'mae': self.metrics[-1].mae,
            'rmse': self.metrics[-1].rmse,
            'mape': self.metrics[-1].mape,
            'sharpe': self.metrics[-1].sharpe,
            'profit': self.metrics[-1].profit,
            'window_size': len(self.metrics)
        }
    
    def get_baseline_performance(self) -> Dict:
        """Get baseline performance metrics."""
        if len(self.metrics) < self.baseline_window:
            return self.get_performance()
        
        baseline = list(self.metrics)[-self.baseline_window:]
        
        return {
            'mse': np.mean([m.mse for m in baseline]),
            'mae': np.mean([m.mae for m in baseline]),
            'rmse': np.mean([m.rmse for m in baseline]),
            'mape': np.mean([m.mape for m in baseline]),
            'sharpe': np.mean([m.sharpe for m in baseline]),
            'profit': np.mean([m.profit for m in baseline]),
            'std_mse': np.std([m.mse for m in baseline]),
            'std_sharpe': np.std([m.sharpe for m in baseline])
        }
    
    def detect_performance_degradation(self, threshold: float = 1.5) -> Dict:
        """Detect if performance has degraded significantly."""
        if len(self.metrics) < self.window_size:
            return {'status': 'insufficient_data', 'degraded': False}
        
        recent_metrics = list(self.metrics)[-self.window_size:]
        baseline_metrics = list(self.metrics)[-self.baseline_window:-self.window_size]
        
        if not baseline_metrics:
            return {'status': 'no_baseline', 'degraded': False}
        
        # Compare recent vs baseline
        recent_sharpe = np.mean([m.sharpe for m in recent_metrics])
        baseline_sharpe = np.mean([m.sharpe for m in baseline_metrics])
        
        degradation_ratio = baseline_sharpe / (recent_sharpe + 1e-8)
        
        degraded = degradation_ratio > threshold
        
        return {
            'status': 'degraded' if degraded else 'healthy',
            'degraded': degraded,
            'baseline_sharpe': baseline_sharpe,
            'recent_sharpe': recent_sharpe,
            'degradation_ratio': degradation_ratio,
            'threshold': threshold,
            'recommendation': 'retrain' if degraded else 'continue'
        }
```

### Input Distribution Drift Detector

```python
import numpy as np
import pandas as pd
from scipy import stats
from typing import List, Dict

class InputDriftDetector:
    """Detect drift in input feature distributions."""
    
    def __init__(self, baseline_window: int = 1000, test_window: int = 100):
        self.baseline_window = baseline_window
        self.test_window = test_window
    
    def kolmogorov_smirnov_test(self, baseline: np.ndarray,
                               current: np.ndarray) -> Tuple[float, float]:
        """Perform KS test for distribution drift."""
        baseline = np.asarray(baseline)
        current = np.asarray(current)
        
        # KS test
        statistic, p_value = stats.ks_2samp(baseline, current)
        
        return statistic, p_value
    
    def calculate_psr(self, baseline: np.ndarray, current: np.ndarray) -> float:
        """Calculate Population Stability Index (PSI)."""
        baseline = np.asarray(baseline)
        current = np.asarray(current)
        
        # Create bins
        bins = np.linspace(min(baseline.min(), current.min()),
                          max(baseline.max(), current.max()), 10)
        
        baseline_hist, _ = np.histogram(baseline, bins=bins)
        current_hist, _ = np.histogram(current, bins=bins)
        
        # Normalize
        baseline_pct = baseline_hist / len(baseline)
        current_pct = current_hist / len(current)
        
        # PSI calculation
        psi = np.sum((current_pct - baseline_pct) * np.log((current_pct + 1e-8) / (baseline_pct + 1e-8)))
        
        return psi
    
    def detect_drift(self, features: np.ndarray,
                    baseline_features: np.ndarray = None) -> Dict:
        """Detect drift across all features."""
        n_features = features.shape[1] if len(features.shape) > 1 else 1
        
        drift_results = []
        
        for i in range(n_features):
            if len(features.shape) > 1:
                current = features[:, i]
                baseline = baseline_features[:, i] if baseline_features is not None else None
            else:
                current = features
                baseline = baseline_features
            
            if baseline is None:
                continue
            
            # KS test
            ks_stat, ks_pvalue = self.kolmogorov_smirnov_test(baseline, current)
            
            # PSI
            psi = self.calculate_psr(baseline, current)
            
            # Drift indicators
            mean_shift = np.abs(np.mean(current) - np.mean(baseline)) / (np.std(baseline) + 1e-8)
            
            drift_results.append({
                'feature_index': i,
                'ks_statistic': ks_stat,
                'ks_pvalue': ks_pvalue,
                'psi': psi,
                'mean_shift_zscore': mean_shift,
                'current_mean': np.mean(current),
                'baseline_mean': np.mean(baseline),
                'drift_detected': psi > 0.1 or mean_shift > 2.0
            })
        
        return {
            'feature_results': drift_results,
            'overall_drift_detected': any(r['drift_detected'] for r in drift_results),
            'n_drifted_features': sum(r['drift_detected'] for r in drift_results),
            'avg_psi': np.mean([r['psi'] for r in drift_results]),
            'avg_mean_shift': np.mean([r['mean_shift_zscore'] for r in drift_results])
        }
```

### Alert System

```python
import numpy as np
from typing import Dict, List
from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class Alert:
    """Alert from model monitoring."""
    timestamp: datetime
    alert_type: str
    severity: str  # 'low', 'medium', 'high', 'critical'
    message: str
    details: Dict
    acknowledged: bool = False

class MonitoringAlertSystem:
    """Generate and manage monitoring alerts."""
    
    def __init__(self, severity_thresholds: Dict = None):
        self.alerts: List[Alert] = []
        self.active_alerts: List[Alert] = []
        
        self.severity_thresholds = severity_thresholds or {
            'mse_degradation': {'medium': 1.2, 'high': 1.5, 'critical': 2.0},
            'sharpe_degradation': {'medium': 0.8, 'high': 0.6, 'critical': 0.4},
            'drift_psi': {'medium': 0.15, 'high': 0.25, 'critical': 0.4},
            'drift_mean_shift': {'medium': 1.5, 'high': 2.0, 'critical': 3.0}
        }
    
    def create_alert(self, alert_type: str, severity: str,
                    message: str, details: Dict) -> Alert:
        """Create a new alert."""
        alert = Alert(
            timestamp=datetime.now(),
            alert_type=alert_type,
            severity=severity,
            message=message,
            details=details
        )
        
        self.alerts.append(alert)
        self.active_alerts.append(alert)
        
        return alert
    
    def generate_performance_alerts(self, performance: Dict,
                                   baseline: Dict) -> List[Alert]:
        """Generate alerts based on performance metrics."""
        alerts = []
        
        # MSE degradation
        if performance.get('mse') and baseline.get('mse'):
            mse_ratio = baseline['mse'] / (performance['mse'] + 1e-8)
            
            if mse_ratio > self.severity_thresholds['mse_degradation']['medium']:
                severity = self._get_severity(mse_ratio, self.severity_thresholds['mse_degradation'])
                alerts.append(self.create_alert(
                    'mse_degradation',
                    severity,
                    f'MSE degraded by {mse_ratio:.2f}x',
                    {'baseline_mse': baseline['mse'], 'current_mse': performance['mse']}
                ))
        
        # Sharpe ratio degradation
        if performance.get('sharpe') and baseline.get('sharpe'):
            if baseline['sharpe'] > 0:  # Avoid division by zero
                sharpe_ratio = performance['sharpe'] / baseline['sharpe']
                
                if sharpe_ratio < self.severity_thresholds['sharpe_degradation']['medium']:
                    severity = self._get_sharpe_severity(sharpe_ratio)
                    alerts.append(self.create_alert(
                        'sharpe_degradation',
                        severity,
                        f'Sharpe ratio degraded to {sharpe_ratio:.2f}x baseline',
                        {'baseline_sharpe': baseline['sharpe'], 'current_sharpe': performance['sharpe']}
                    ))
        
        self.active_alerts = [a for a in self.active_alerts if not a.acknowledged]
        
        return alerts
    
    def generate_drift_alerts(self, drift_results: Dict) -> List[Alert]:
        """Generate alerts based on drift detection."""
        alerts = []
        
        if drift_results.get('overall_drift_detected'):
            avg_psi = drift_results.get('avg_psi', 0)
            
            if avg_psi > self.severity_thresholds['drift_psi']['medium']:
                severity = self._get_severity(avg_psi, self.severity_thresholds['drift_psi'])
                alerts.append(self.create_alert(
                    'input_drift',
                    severity,
                    f'Input drift detected with average PSI of {avg_psi:.3f}',
                    {
                        'n_drifted_features': drift_results.get('n_drifted_features', 0),
                        'avg_mean_shift': drift_results.get('avg_mean_shift', 0)
                    }
                ))
        
        self.active_alerts = [a for a in self.active_alerts if not a.acknowledged]
        
        return alerts
    
    def _get_severity(self, ratio: float, thresholds: Dict) -> str:
        """Determine severity based on threshold ratios."""
        if ratio > thresholds['critical']:
            return 'critical'
        elif ratio > thresholds['high']:
            return 'high'
        elif ratio > thresholds['medium']:
            return 'medium'
        return 'low'
    
    def _get_sharpe_severity(self, ratio: float) -> str:
        """Determine severity for Sharpe ratio degradation."""
        if ratio < self.severity_thresholds['sharpe_degradation']['critical']:
            return 'critical'
        elif ratio < self.severity_thresholds['sharpe_degradation']['high']:
            return 'high'
        elif ratio < self.severity_thresholds['sharpe_degradation']['medium']:
            return 'medium'
        return 'low'
    
    def get_active_alerts(self) -> List[Alert]:
        """Get active (unacknowledged) alerts."""
        return [a for a in self.active_alerts if not a.acknowledged]
    
    def acknowledge_alert(self, alert: Alert):
        """Acknowledge an alert."""
        alert.acknowledged = True
        if alert in self.active_alerts:
            self.active_alerts.remove(alert)
```

### Retraining Trigger

```python
import numpy as np
from typing import Dict, List
from dataclasses import dataclass

@dataclass
class RetrainingTrigger:
    """Trigger for model retraining."""
    condition: str
    timestamp: str
    severity: str
    trigger_reason: str
    confidence: float

class RetrainingTriggerSystem:
    """Determine when model should be retrained."""
    
    def __init__(self, degradation_threshold: float = 1.5,
                drift_threshold: float = 0.25,
                min_samples: int = 100):
        self.degradation_threshold = degradation_threshold
        self.drift_threshold = drift_threshold
        self.min_samples = min_samples
    
    def check_performance_trigger(self, performance: Dict,
                                 baseline: Dict) -> List[RetrainingTrigger]:
        """Check if performance degradation triggers retraining."""
        triggers = []
        
        if not performance or not baseline:
            return triggers
        
        # Check MSE degradation
        if performance.get('mse') and baseline.get('mse'):
            mse_ratio = baseline['mse'] / (performance['mse'] + 1e-8)
            
            if mse_ratio > self.degradation_threshold:
                triggers.append(RetrainingTrigger(
                    condition='mse_degradation',
                    timestamp=str(datetime.now()),
                    severity='high',
                    trigger_reason=f'MSE degraded {mse_ratio:.2f}x',
                    confidence=min(mse_ratio / 2.0, 1.0)
                ))
        
        # Check Sharpe degradation
        if performance.get('sharpe') and baseline.get('sharpe'):
            if baseline['sharpe'] > 0:
                sharpe_ratio = performance['sharpe'] / baseline['sharpe']
                
                if sharpe_ratio < 0.5:  # 50% of baseline Sharpe
                    triggers.append(RetrainingTrigger(
                        condition='sharpe_degradation',
                        timestamp=str(datetime.now()),
                        severity='high',
                        trigger_reason=f'Sharpe ratio at {sharpe_ratio:.2f}x baseline',
                        confidence=min(2 - sharpe_ratio * 2, 1.0)
                    ))
        
        return triggers
    
    def check_drift_trigger(self, drift_results: Dict) -> List[RetrainingTrigger]:
        """Check if input drift triggers retraining."""
        triggers = []
        
        if not drift_results:
            return triggers
        
        avg_psi = drift_results.get('avg_psi', 0)
        n_drifted = drift_results.get('n_drifted_features', 0)
        
        if avg_psi > self.drift_threshold:
            triggers.append(RetrainingTrigger(
                condition='input_drift',
                timestamp=str(datetime.now()),
                severity='medium',
                trigger_reason=f'Average PSI: {avg_psi:.3f}, {n_drifted} features drifted',
                confidence=min(avg_psi / 0.4, 1.0)
            ))
        
        return triggers
    
    def check_data_volume_trigger(self, sample_count: int) -> List[RetrainingTrigger]:
        """Check if sufficient data for retraining."""
        triggers = []
        
        if sample_count < self.min_samples:
            return triggers  # Not enough data
        
        # Check data age
        if sample_count > 1000:  # Example threshold
            triggers.append(RetrainingTrigger(
                condition='sufficient_data',
                timestamp=str(datetime.now()),
                severity='low',
                trigger_reason=f'{sample_count} samples available for retraining',
                confidence=0.5  # Data available but not necessarily urgent
            ))
        
        return triggers
    
    def get_retraining_recommendation(self, performance: Dict = None,
                                     drift_results: Dict = None,
                                     sample_count: int = 0) -> Dict:
        """Get overall retraining recommendation."""
        all_triggers = []
        
        if performance:
            all_triggers.extend(self.check_performance_trigger(performance, {}))
        
        if drift_results:
            all_triggers.extend(self.check_drift_trigger(drift_results))
        
        all_triggers.extend(self.check_data_volume_trigger(sample_count))
        
        if not all_triggers:
            return {
                'retrain': False,
                'reason': 'No triggers activated',
                'triggers': []
            }
        
        # Calculate overall confidence
        confidence = np.mean([t.confidence for t in all_triggers])
        
        # Determine if should retrain
        should_retrain = any(t.severity in ['high', 'critical'] for t in all_triggers)
        
        return {
            'retrain': should_retrain,
            'reason': 'High severity trigger' if should_retrain else 'Multiple medium triggers',
            'triggers': [t.trigger_reason for t in all_triggers],
            'confidence': float(confidence),
            'n_triggers': len(all_triggers)
        }
```

### Calibration Monitor

```python
import numpy as np
from typing import List, Dict

class CalibrationMonitor:
    """Monitor model prediction calibration."""
    
    def __init__(self, n_bins: int = 10):
        self.n_bins = n_bins
    
    def calculate_calibration(self, predictions: np.ndarray,
                             actuals: np.ndarray) -> Dict:
        """Calculate calibration metrics."""
        predictions = np.asarray(predictions)
        actuals = np.asarray(actuals)
        
        # Bin predictions
        bins = np.linspace(0, 1, self.n_bins + 1)
        bin_indices = np.digitize(predictions, bins) - 1
        bin_indices = np.clip(bin_indices, 0, self.n_bins - 1)
        
        # Calculate calibration per bin
        bin_stats = []
        for i in range(self.n_bins):
            mask = bin_indices == i
            if np.sum(mask) > 0:
                bin_avg_pred = np.mean(predictions[mask])
                bin_avg_actual = np.mean(actuals[mask])
                bin_count = np.sum(mask)
                
                bin_stats.append({
                    'bin': i,
                    'avg_prediction': bin_avg_pred,
                    'avg_actual': bin_avg_actual,
                    'count': int(bin_count),
                    'bin_width': bins[i+1] - bins[i]
                })
        
        # Calculate Expected Calibration Error (ECE)
        ece = 0.0
        total_samples = len(predictions)
        
        for stat in bin_stats:
            calibration_error = abs(stat['avg_prediction'] - stat['avg_actual'])
            ece += (stat['count'] / total_samples) * calibration_error
        
        # Calculate Maximum Calibration Error (MCE)
        mce = max(abs(s['avg_prediction'] - s['avg_actual']) for s in bin_stats)
        
        return {
            'bin_stats': bin_stats,
            'ece': ece,
            'mce': mce,
            'calibration_error': ece + 0.5 * mce  # Combined metric
        }
    
    def detect_calibration_drift(self, current_calibration: Dict,
                                baseline_calibration: Dict) -> Dict:
        """Detect calibration drift."""
        current_ece = current_calibration.get('ece', 0)
        baseline_ece = baseline_calibration.get('ece', 0)
        
        if baseline_ece == 0:
            return {'drifted': False, 'reason': 'No baseline'}
        
        calibration_ratio = current_ece / baseline_ece
        
        return {
            'drifted': calibration_ratio > 1.5,
            'baseline_ece': baseline_ece,
            'current_ece': current_ece,
            'calibration_ratio': calibration_ratio,
            'mce_baseline': baseline_calibration.get('mce', 0),
            'mce_current': current_calibration.get('mce', 0)
        }
```
