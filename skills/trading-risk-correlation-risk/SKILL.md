---
name: trading-risk-correlation-risk
description: Correlation breakdown and portfolio diversification risk
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: breakdown, diversification, portfolio, risk correlation risk, risk-correlation-risk
---


**Role:** Monitor and manage correlation risk in multi-asset portfolios

**Philosophy:** Correlations break down in crises; true diversification requires assets with stable low correlations

## Key Principles

1. **Correlation Stability**: Correlations change over time and regime
2. **Regime-Specific Correlations**: Low volatility vs high volatility regimes
3. **Diversification Benefit**: Portfolio risk reduction from low correlations
4. **Breakdown Detection**: Alerts when correlations approach 1.0
5. **Effective Correlation**: Actual portfolio correlation vs nominal

## Implementation Guidelines

### Structure
- Core logic: risk_engine/correlation.py
- Helper functions: risk_engine/risk_decomposition.py
- Tests: tests/test_correlation.py

### Patterns to Follow
- Track rolling correlations with multiple windows
- Identify correlation clusters
- Calculate effective correlation for risk

## Adherence Checklist
Before completing your task, verify:
- [ ] Rolling correlations calculated for multiple windows
- [ ] Correlation breakdown alerts triggered
- [ ] Regime-specific correlations tracked
- [ ] Diversification benefit quantified
- [ ] Effective correlation used for portfolio VaR


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from scipy import stats

@dataclass
class CorrelationRegime:
    """Current correlation regime."""
    regime: str  # 'low', 'normal', 'high', 'breakdown'
    avg_correlation: float
    correlation_vol: float
    detected_breakdown: bool

class CorrelationRiskManager:
    """Manages correlation risk in multi-asset portfolios."""
    
    def __init__(self, windows: List[int] = [20, 50, 100]):
        self.windows = windows
    
    def calculate_rolling_correlation(
        self, returns1: pd.Series, returns2: pd.Series, window: int = 20
    ) -> pd.Series:
        """Calculate rolling correlation between two assets."""
        return returns1.rolling(window=window).corr(returns2)
    
    def calculate_correlation_matrix(
        self, returns_df: pd.DataFrame, window: int = 50
    ) -> pd.DataFrame:
        """Calculate rolling correlation matrix."""
        return returns_df.rolling(window=window).corr()
    
    def detect_correlation_breakdown(
        self, correlation_series: pd.Series, threshold: float = 0.8
    ) -> Dict:
        """Detect when correlations approach breakdown levels."""
        current_corr = correlation_series.iloc[-1] if len(correlation_series) > 0 else 0
        
        # Check for breakdown
        breakdown_detected = current_corr > threshold
        
        # Calculate time since last significant change
        diff = correlation_series.diff()
        change_points = (diff.abs() > 0.1).sum()
        
        return {
            'current_correlation': float(current_corr),
            'breakdown_detected': breakdown_detected,
            'threshold': threshold,
            'change_points': int(change_points),
            'warning': 'High correlation detected' if breakdown_detected else ''
        }
    
    def calculate_effective_correlation(
        self, weights: np.ndarray, correlation_matrix: np.ndarray
    ) -> float:
        """Calculate effective correlation of portfolio."""
        if len(weights) != correlation_matrix.shape[0]:
            return 0.0
        
        portfolio_var = weights @ correlation_matrix @ weights
        weighted_var = np.sum(weights ** 2)
        
        if weighted_var == 0:
            return 0.0
        
        # Effective correlation
        eff_corr = (portfolio_var - weighted_var) / (2 * np.sum(
            np.outer(weights, weights) * (1 - np.eye(len(weights)))
        ) + 1e-8)
        
        return float(eff_corr)
    
    def calculate_diversification_benefit(
        self, individual_vols: np.ndarray, portfolio_vol: float
    ) -> float:
        """Calculate diversification benefit from correlations."""
        if portfolio_vol <= 0:
            return 1.0
        
        # Unweighted average volatility
        avg_vol = np.mean(individual_vols)
        
        if avg_vol <= 0:
            return 1.0
        
        # Diversification benefit = avg vol / portfolio vol
        return avg_vol / portfolio_vol
    
    def regime_correlation_analysis(
        self, returns_df: pd.DataFrame, volatility_series: pd.Series
    ) -> Dict:
        """Analyze correlations in different volatility regimes."""
        # Split by volatility regime
        vol_mean = volatility_series.mean()
        vol_std = volatility_series.std()
        
        low_vol_mask = volatility_series < vol_mean - vol_std
        high_vol_mask = volatility_series > vol_mean + vol_std
        
        low_vol_corr = returns_df[low_vol_mask].corr()
        high_vol_corr = returns_df[high_vol_mask].corr()
        
        # Compare
        diff = high_vol_corr - low_vol_corr
        avg_diff = diff.values[np.triu_indices_from(diff.values, k=1)].mean()
        
        return {
            'low_vol_correlation': float(low_vol_corr.values[np.triu_indices_from(low_vol_corr.values, k=1)].mean()),
            'high_vol_correlation': float(high_vol_corr.values[np.triu_indices_from(high_vol_corr.values, k=1)].mean()),
            'correlation_change': float(avg_diff),
            'breakdown_warning': avg_diff > 0.3  # Large increase indicates breakdown
        }
    
    def cluster_correlations(
        self, correlation_matrix: pd.DataFrame, n_clusters: int = 3
    ) -> Dict:
        """Cluster assets by correlation similarity."""
        # Convert to distance matrix
        dist_matrix = 1 - correlation_matrix.values
        np.fill_diagonal(dist_matrix, 0)
        
        # Simple clustering based on correlation similarity
        assets = correlation_matrix.columns.tolist()
        
        # Sort assets by correlation to first asset
        sorted_assets = [assets[0]]
        remaining = assets[1:]
        
        while remaining:
            last = sorted_assets[-1]
            last_idx = assets.index(last)
            
            # Find most correlated to last added
            correlations = correlation_matrix.iloc[last_idx, remaining]
            next_asset = correlations.idxmax()
            sorted_assets.append(next_asset)
            remaining.remove(next_asset)
        
        # Divide into clusters
        cluster_size = len(sorted_assets) // n_clusters
        clusters = {}
        
        for i in range(n_clusters):
            start = i * cluster_size
            end = start + cluster_size if i < n_clusters - 1 else len(sorted_assets)
            clusters[f'cluster_{i}'] = sorted_assets[start:end]
        
        return clusters
    
    def correlation_shock_scenarios(
        self, correlation_matrix: pd.DataFrame, shock_amount: float = 0.3
    ) -> Dict[str, float]:
        """Simulate correlation shock scenarios."""
        # Increase all correlations by shock amount
        new_corr = correlation_matrix + shock_amount
        new_corr = new_corr.clip(upper=1.0)
        
        # Calculate new portfolio risk metrics
        return {
            'shock_amount': shock_amount,
            'avg_correlation_increase': float(shock_amount),
            'max_correlation': float(new_corr.max().max())
        }
```
