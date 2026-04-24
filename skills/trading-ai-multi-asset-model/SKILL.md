---
name: trading-ai-multi-asset-model
description: Model inter-asset relationships for portfolio and cross-asset strategies
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: ai multi asset model, ai-multi-asset-model, inter-asset, portfolio, relationships
  related-skills: trading-risk-correlation-risk, trading-backtest-drawdown-analysis,
    trading-backtest-position-sizing, trading-fundamentals-risk-management-basics
---

**Role:** Capture and exploit relationships between multiple assets for diversified trading

**Philosophy:** Assets move in correlated patterns influenced by common factors. Prioritize dynamic correlations, regime-aware relationships, and factor-based modeling for robust multi-asset signals.

## Key Principles

1. **Dynamic Correlation**: Track correlation changes over time and regime shifts
2. **Factor Exposure**: Model assets through common risk factors (value, momentum, volatility)
3. **Spread Modeling**: Model mean-reverting spreads between cointegrated assets
4. **Regime-Specific Relationships**: Capture different relationships in different market regimes
5. **Portfolio Optimization**: Integrate relationships into optimal portfolio construction

## Implementation Guidelines

### Structure
- Core logic: `multiasset/correlation.py` - Correlation analysis
- Cointegration: `multiasset/cointegration.py` - Cointegration detection
- Factor model: `multiasset/factors.py` - Factor exposure modeling
- Portfolio: `multiasset/portfolio.py` - Portfolio construction
- Config: `config/multiasset_config.yaml` - Multi-asset parameters

### Patterns to Follow
- Use rolling window correlation estimation
- Apply regime filters to relationship models
- Track cointegration breakdowns
- Include transaction costs in portfolio optimization

## Adherence Checklist
Before completing your task, verify:
- [ ] Dynamic correlations estimated with rolling windows
- [ ] Cointegration relationships identified and monitored
- [ ] Factor loadings calculated for each asset
- [ ] Relationships validated across regimes
- [ ] Portfolio optimization includes transaction costs



## Code Examples

### Dynamic Correlation Calculator

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class CorrelationResult:
    """Correlation result for a pair of assets."""
    asset1: str
    asset2: str
    correlation: float
    p_value: float
    window_start: int
    window_end: int

class DynamicCorrelationCalculator:
    """Calculate dynamic pairwise correlations between assets."""
    
    def __init__(self, window: int = 60, min_periods: int = 30):
        self.window = window
        self.min_periods = min_periods
    
    def calculate_rolling_correlation(self, returns1: np.ndarray,
                                      returns2: np.ndarray) -> np.ndarray:
        """Calculate rolling correlation over time."""
        returns1 = np.asarray(returns1)
        returns2 = np.asarray(returns2)
        
        # Calculate rolling statistics
        corr = pd.Series(returns1).rolling(self.window).corr(
            pd.Series(returns2)
        ).fillna(0).values
        
        return corr
    
    def calculate_pair_correlations(self, returns_dict: Dict[str, np.ndarray],
                                    threshold: float = 0.7) -> List[Dict]:
        """Calculate correlations between all asset pairs."""
        assets = list(returns_dict.keys())
        n_assets = len(assets)
        
        correlations = []
        
        for i in range(n_assets):
            for j in range(i+1, n_assets):
                asset1 = assets[i]
                asset2 = assets[j]
                
                returns1 = returns_dict[asset1]
                returns2 = returns_dict[asset2]
                
                # Calculate correlation
                corr_matrix = np.corrcoef(returns1, returns2)
                correlation = corr_matrix[0, 1]
                
                # Calculate p-value
                n = len(returns1)
                t_stat = correlation * np.sqrt(n-2) / np.sqrt(1 - correlation**2 + 1e-8)
                from scipy.stats import t as t_dist
                p_value = 2 * (1 - t_dist.cdf(abs(t_stat), n-2))
                
                if abs(correlation) >= threshold:
                    correlations.append({
                        'asset1': asset1,
                        'asset2': asset2,
                        'correlation': correlation,
                        'p_value': p_value,
                        'significance': p_value < 0.05
                    })
        
        return correlations
    
    def get_regime_correlations(self, returns_dict: Dict[str, np.ndarray],
                               regime_labels: np.ndarray) -> Dict[str, Dict]:
        """Calculate correlations within different regimes."""
        regimes = np.unique(regime_labels)
        
        regime_correlations = {}
        
        for regime in regimes:
            regime_mask = regime_labels == regime
            
            regime_returns = {
                asset: returns[mask] 
                for asset, returns in returns_dict.items()
                if len(returns) > 0
            }
            
            regime_correlations[f'regime_{regime}'] = {
                'correlations': self.calculate_pair_correlations(regime_returns),
                'n_observations': int(np.sum(regime_mask))
            }
        
        return regime_correlations
    
    def calculate_correlation_matrix(self, returns_dict: Dict[str, np.ndarray]) -> Tuple[np.ndarray, List[str]]:
        """Calculate full correlation matrix."""
        assets = list(returns_dict.keys())
        n_assets = len(assets)
        
        returns_matrix = np.zeros((n_assets, len(list(returns_dict.values())[0])))
        for i, asset in enumerate(assets):
            returns_matrix[i] = returns_dict[asset]
        
        # Calculate correlation matrix
        corr_matrix = np.corrcoef(returns_matrix)
        
        return corr_matrix, assets
```

### Cointegration Analyzer

```python
import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.tsa.stattools import coint, adfuller
from typing import Dict, List, Tuple

class CointegrationAnalyzer:
    """Find and analyze cointegrated asset pairs for pair trading."""
    
    def __init__(self, p_value_threshold: float = 0.05):
        self.p_value_threshold = p_value_threshold
    
    def test_cointegration(self, prices1: np.ndarray,
                           prices2: np.ndarray) -> Dict:
        """Test for cointegration using Engle-Granger two-step method."""
        prices1 = np.asarray(prices1)
        prices2 = np.asarray(prices2)
        
        # Step 1: Regress prices1 on prices2
        X = np.column_stack([np.ones(len(prices2)), prices2])
        beta, _, _, _ = np.linalg.lstsq(X, prices1, rcond=None)
        
        # Get residuals
        residuals = prices1 - (beta[0] + beta[1] * prices2)
        
        # Step 2: Test residuals for stationarity
        adf_result = adfuller(residuals)
        
        return {
            'cointegrated': adf_result[1] < self.p_value_threshold,
            'p_value': adf_result[1],
            'adf_statistic': adf_result[0],
            'critical_values': adf_result[4],
            'spread_mean': np.mean(residuals),
            'spread_std': np.std(residuals),
            'beta': beta[1],  # Hedge ratio
            'alpha': beta[0],  # Intercept
            'residuals': residuals
        }
    
    def find_cointegrated_pairs(self, prices_dict: Dict[str, np.ndarray]) -> List[Dict]:
        """Find all cointegrated asset pairs."""
        assets = list(prices_dict.keys())
        n_assets = len(assets)
        
        cointegrated_pairs = []
        
        for i in range(n_assets):
            for j in range(i+1, n_assets):
                asset1 = assets[i]
                asset2 = assets[j]
                
                result = self.test_cointegration(prices_dict[asset1], prices_dict[asset2])
                
                if result['cointegrated']:
                    cointegrated_pairs.append({
                        'asset1': asset1,
                        'asset2': asset2,
                        'p_value': result['p_value'],
                        'hedge_ratio': result['beta'],
                        'intercept': result['alpha'],
                        'mean_reversion_speed': self._estimate_speed(result['residuals'])
                    })
        
        # Sort by p-value (most cointegrated first)
        cointegrated_pairs.sort(key=lambda x: x['p_value'])
        
        return cointegrated_pairs
    
    def _estimate_speed(self, residuals: np.ndarray) -> float:
        """Estimate mean reversion speed using AR(1) coefficient."""
        if len(residuals) < 2:
            return 0.0
        
        # AR(1): residual[t] = phi * residual[t-1] + error
        lagged = residuals[:-1]
        current = residuals[1:]
        
        phi = np.dot(lagged, current) / (np.dot(lagged, lagged) + 1e-8)
        
        return 1 - phi  # Speed of mean reversion
    
    def calculate_spread(self, prices1: np.ndarray, prices2: np.ndarray,
                        hedge_ratio: float) -> np.ndarray:
        """Calculate cointegration spread."""
        return prices1 - hedge_ratio * prices2
    
    def calculate_zscore(self, spread: np.ndarray, window: int = 60) -> np.ndarray:
        """Calculate z-score of spread."""
        spread_series = pd.Series(spread)
        mean = spread_series.rolling(window).mean()
        std = spread_series.rolling(window).std()
        
        zscore = (spread - mean) / (std + 1e-8)
        
        return zscore.values
```

### Multi-Asset Factor Model

```python
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Tuple

class MultiAssetFactorModel:
    """Model asset returns through common factors."""
    
    def __init__(self, factors: List[str] = None):
        self.factors = factors or ['market', 'value', 'momentum', 'volatility']
        self.model = LinearRegression()
        self.scaler = StandardScaler()
        self.is_fitted = False
        self.factor_loadings = None
    
    def fit(self, asset_returns: np.ndarray,
            factor_returns: np.ndarray) -> 'MultiAssetFactorModel':
        """Fit factor model to asset returns."""
        asset_returns = np.asarray(asset_returns)
        factor_returns = np.asarray(factor_returns)
        
        # Standardize returns
        asset_returns_scaled = self.scaler.fit_transform(asset_returns.reshape(-1, 1)).flatten()
        factor_returns_scaled = self.scaler.fit_transform(factor_returns)
        
        # Fit linear model
        self.model.fit(factor_returns_scaled, asset_returns_scaled)
        
        # Calculate factor loadings (regression coefficients)
        self.factor_loadings = self.model.coef_
        
        self.is_fitted = True
        
        return self
    
    def predict(self, factor_returns: np.ndarray) -> np.ndarray:
        """Predict asset returns from factors."""
        if not self.is_fitted:
            raise ValueError("Model not fitted")
        
        factor_returns = np.asarray(factor_returns)
        
        if len(factor_returns.shape) == 1:
            factor_returns = factor_returns.reshape(-1, 1)
        
        return self.model.predict(factor_returns)
    
    def calculate_r_squared(self, asset_returns: np.ndarray,
                           factor_returns: np.ndarray) -> float:
        """Calculate R-squared of factor model."""
        if not self.is_fitted:
            raise ValueError("Model not fitted")
        
        predicted = self.predict(factor_returns)
        asset_returns = np.asarray(asset_returns)
        
        ss_res = np.sum((asset_returns - predicted) ** 2)
        ss_tot = np.sum((asset_returns - np.mean(asset_returns)) ** 2)
        
        return 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
    
    def decompose_return(self, asset_return: float,
                        factor_return: np.ndarray) -> Dict:
        """Decompose return into factor and specific components."""
        if not self.is_fitted:
            raise ValueError("Model not fitted")
        
        factor_return = np.asarray(factor_return)
        
        # Predicted return
        predicted = self.predict(factor_return.reshape(1, -1))[0]
        
        # Specific (idiosyncratic) return
        specific = asset_return - predicted
        
        # Factor contribution
        factor_contrib = predicted
        
        return {
            'total_return': asset_return,
            'factor_return': factor_contrib,
            'specific_return': specific,
            'r_squared': self.calculate_r_squared(np.array([asset_return]), factor_return.reshape(1, -1))
        }
```

### Portfolio Optimizer with Constraints

```python
import numpy as np
from scipy.optimize import minimize
from typing import Dict, List, Tuple

class MeanVarianceOptimizer:
    """Optimize portfolio weights based on mean-variance criterion."""
    
    def __init__(self, risk_aversion: float = 1.0,
                 max_positions: int = None,
                 min_weight: float = 0.0,
                 max_weight: float = 0.2):
        self.risk_aversion = risk_aversion
        self.max_positions = max_positions
        self.min_weight = min_weight
        self.max_weight = max_weight
    
    def optimize(self, expected_returns: np.ndarray,
                covariance: np.ndarray,
                transaction_costs: np.ndarray = None,
                current_weights: np.ndarray = None) -> np.ndarray:
        """Optimize portfolio weights."""
        n_assets = len(expected_returns)
        
        def objective(weights):
            """Minimize negative utility: return - risk."""
            portfolio_return = np.dot(weights, expected_returns)
            portfolio_variance = np.dot(weights.T, np.dot(covariance, weights))
            
            utility = portfolio_return - 0.5 * self.risk_aversion * portfolio_variance
            
            # Add transaction cost penalty if current weights provided
            if transaction_costs is not None and current_weights is not None:
                turnover = np.sum(np.abs(weights - current_weights))
                utility -= np.dot(weights, transaction_costs) * turnover
            
            return -utility  # Minimize negative utility
        
        # Constraints: weights sum to 1
        constraints = [{'type': 'eq', 'fun': lambda w: np.sum(w) - 1}]
        
        # Bounds for each weight
        bounds = [(self.min_weight, self.max_weight) for _ in range(n_assets)]
        
        # Initial guess: equal weights
        initial_weights = np.ones(n_assets) / n_assets
        
        # Optimize
        result = minimize(
            objective,
            initial_weights,
            method='SLSQP',
            bounds=bounds,
            constraints=constraints,
            options={'maxiter': 1000}
        )
        
        if not result.success:
            # Fallback to equal weights if optimization fails
            return initial_weights
        
        return result.x
    
    def optimize_with_turnover(self, expected_returns: np.ndarray,
                              covariance: np.ndarray,
                              current_weights: np.ndarray,
                              turnover_limit: float = 0.3,
                              turnover_cost: float = 0.001) -> np.ndarray:
        """Optimize with turnover constraints."""
        n_assets = len(expected_returns)
        
        def objective(weights):
            # Portfolio utility
            portfolio_return = np.dot(weights, expected_returns)
            portfolio_variance = np.dot(weights.T, np.dot(covariance, weights))
            
            utility = portfolio_return - 0.5 * self.risk_aversion * portfolio_variance
            
            # Turnover constraint
            turnover = np.sum(np.abs(weights - current_weights))
            turnover_penalty = turnover_cost * turnover
            
            return -(utility - turnover_penalty)
        
        constraints = [
            {'type': 'eq', 'fun': lambda w: np.sum(w) - 1},
            {'type': 'ineq', 'fun': lambda w: turnover_limit - np.sum(np.abs(w - current_weights))}
        ]
        
        bounds = [(self.min_weight, self.max_weight) for _ in range(n_assets)]
        initial_weights = current_weights.copy()
        
        result = minimize(
            objective,
            initial_weights,
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )
        
        if not result.success:
            return initial_weights
        
        return result.x
```

### Regime-Aware Correlation Model

```python
import numpy as np
import pandas as pd
from typing import Dict, List

class RegimeAwareCorrelationModel:
    """Model correlations that change with market regime."""
    
    def __init__(self, regime_classifier):
        self.regime_classifier = regime_classifier
        self.regime_correlations = {}
    
    def fit(self, returns_dict: Dict[str, np.ndarray],
            regime_labels: np.ndarray):
        """Fit correlation model for each regime."""
        regimes = np.unique(regime_labels)
        
        for regime in regimes:
            regime_mask = regime_labels == regime
            
            regime_returns = {
                asset: returns[mask] 
                for asset, returns in returns_dict.items()
            }
            
            # Calculate correlations for this regime
            self.regime_correlations[regime] = self._calculate_correlations(regime_returns)
    
    def _calculate_correlations(self, returns_dict: Dict[str, np.ndarray]) -> Dict:
        """Calculate correlations for a subset of assets."""
        assets = list(returns_dict.keys())
        n = len(assets)
        
        correlations = {}
        
        for i in range(n):
            for j in range(i+1, n):
                asset1 = assets[i]
                asset2 = assets[j]
                
                returns1 = returns_dict[asset1]
                returns2 = returns_dict[asset2]
                
                corr = np.corrcoef(returns1, returns2)[0, 1]
                correlations[(asset1, asset2)] = corr
        
        return correlations
    
    def get_correlation(self, asset1: str, asset2: str,
                       regime: int = None) -> float:
        """Get correlation for given regime or average across regimes."""
        if regime is None:
            # Average correlation across all regimes
            correlations = [
                correlations.get((asset1, asset2))
                for correlations in self.regime_correlations.values()
                if (asset1, asset2) in correlations
            ]
            return np.mean(correlations) if correlations else 0.0
        
        if regime in self.regime_correlations:
            return self.regime_correlations[regime].get((asset1, asset2), 0.0)
        
        return 0.0
    
    def detect_regime_shift_effect(self, asset1: str, asset2: str) -> Dict:
        """Detect how correlation changes between regimes."""
        if len(self.regime_correlations) < 2:
            return {'message': 'Insufficient regimes'}
        
        correlations = {}
        for regime, regime_corrs in self.regime_correlations.items():
            corr = regime_corrs.get((asset1, asset2), 0.0)
            correlations[regime] = corr
        
        if len(correlations) < 2:
            return {'message': 'No regime variation'}
        
        return {
            'asset1': asset1,
            'asset2': asset2,
            'correlations_by_regime': correlations,
            'correlation_range': max(correlations.values()) - min(correlations.values()),
            'most_stable_regime': min(correlations, key=lambda k: correlations[k]),
            'most_dynamic_regime': max(correlations, key=lambda k: correlations[k])
        }
```