---
name: volatility-prediction
description: '"Implements forecast volatility for risk management and option pricing
  for risk management and algorithmic trading execution."'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: ai volatility prediction, ai-volatility-prediction, forecast, management,
    option
  related-skills: ai-anomaly-detection, ai-explainable-ai
---



**Role:** Predict future volatility to optimize trading strategies and risk exposure

**Philosophy:** Volatility is the primary risk metric in trading. Prioritize accurate conditional volatility forecasting with proper persistence modeling and regime-aware predictions.

## Key Principles

1. **GARCH Family Modeling**: Use GARCH, EGARCH, and GJR-GARCH for volatility clustering
2. **Realized Volatility**: Combine high-frequency data for more accurate estimates
3. **Volatility Persistence**: Model long-memory in volatility (Hurst exponent)
4. **Asymmetry Detection**: Capture leverage effect (volatility spikes on price drops)
5. **Multi-Time Scale Forecasting**: Predict short, medium, and long-term volatility

## Implementation Guidelines

### Structure
- Core logic: `volatility/models.py` - Volatility model implementations
- Estimator: `volatility/estimator.py` - Parameter estimation
- Forecaster: `volatility/forecaster.py` - Volatility predictions
- Config: `config/volatility_config.yaml` - Model parameters

### Patterns to Follow
- Use daily or intraday data depending on horizon
- Include overnight volatility components
- Model volatility of returns, not prices
- Compare multiple models and ensemble predictions

## Adherence Checklist
Before completing your task, verify:
- [ ] GARCH-family models implemented with proper diagnostics
- [ ] Asymmetric volatility (leverage effect) captured
- [ ] Realized volatility computed from high-frequency data
- [ ] Multi-horizon volatility forecasts provided
- [ ] Model diagnostics checked (residual analysis, ARCH effects)



## Code Examples

### GARCH Volatility Model

```python
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from typing import Tuple, Dict, List

class GARCHModel:
    """GARCH(p, q) model for volatility forecasting."""
    
    def __init__(self, p: int = 1, q: int = 1):
        self.p = p  # ARCH order
        self.q = q  # GARCH order
        self.params = None
        self.is_fitted = False
    
    def fit(self, returns: np.ndarray) -> 'GARCHModel':
        """Fit GARCH model using maximum likelihood."""
        returns = np.asarray(returns)
        n = len(returns)
        
        # Initialize variance with unconditional variance
        variance = np.var(returns)
        
        def log_likelihood(params):
            """Compute negative log likelihood for optimization."""
            omega = params[0]
            alpha = params[1:self.p + 1] if self.p > 0 else []
            beta = params[self.p + 1:self.p + self.q + 1] if self.q > 0 else []
            
            # Ensure stationarity
            if self.p + self.q >= 1:
                if sum(alpha) + sum(beta) >= 0.99:
                    return 1e10
            
            variance_path = np.zeros(n)
            variance_path[0] = variance
            
            # Recursively compute conditional variance
            for t in range(1, n):
                variance_path[t] = omega
                
                # ARCH terms
                for i in range(self.p):
                    if t > i:
                        variance_path[t] += alpha[i] * returns[t-i-1]**2
                
                # GARCH terms
                for j in range(self.q):
                    if t > j:
                        variance_path[t] += beta[j] * variance_path[t-j-1]
            
            # Compute log likelihood
            llh = 0.5 * np.sum(np.log(variance_path) + returns**2 / variance_path)
            return llh
        
        # Initial parameter guess
        n_params = 1 + self.p + self.q
        initial_params = np.concatenate([
            [np.var(returns) * 0.1],  # omega
            np.ones(self.p) * 0.05,   # alpha
            np.ones(self.q) * 0.9     # beta
        ])
        
        # Bounds for stationarity
        bounds = [(1e-8, None)] * n_params
        
        result = minimize(
            log_likelihood,
            initial_params,
            method='L-BFGS-B',
            bounds=bounds
        )
        
        self.params = result.x
        self.is_fitted = True
        
        return self
    
    def forecast(self, returns: np.ndarray, steps: int = 1) -> np.ndarray:
        """Forecast future volatility."""
        if not self.is_fitted:
            raise ValueError("Model not fitted")
        
        returns = np.asarray(returns)
        n = len(returns)
        
        omega = self.params[0]
        alpha = self.params[1:self.p + 1] if self.p > 0 else []
        beta = self.params[self.p + 1:self.p + self.q + 1] if self.q > 0 else []
        
        # Compute latest variance
        latest_variance = np.var(returns)
        
        for t in range(1, n):
            var_t = omega
            
            for i in range(self.p):
                if t > i:
                    var_t += alpha[i] * returns[t-i-1]**2
            
            for j in range(self.q):
                if t > j:
                    var_t += beta[j] * var_t
            
            latest_variance = var_t
        
        # Forecast volatility
        forecasts = np.zeros(steps)
        forecasts[0] = latest_variance
        
        for t in range(1, steps):
            forecasts[t] = omega
            
            for i in range(self.p):
                forecasts[t] += alpha[i] * (forecasts[t-i-1] if t-i-1 >= 0 else latest_variance)
            
            for j in range(self.q):
                forecasts[t] += beta[j] * forecasts[t-j-1]
        
        return np.sqrt(forecasts)  # Convert to volatility
    
    def diagnostics(self, returns: np.ndarray) -> Dict:
        """Return model diagnostics."""
        returns = np.asarray(returns)
        
        # Compute residuals
        variance_path = np.zeros(len(returns))
        variance_path[0] = np.var(returns)
        
        omega = self.params[0]
        alpha = self.params[1:self.p + 1] if self.p > 0 else []
        beta = self.params[self.p + 1:self.p + self.q + 1] if self.q > 0 else []
        
        for t in range(1, len(returns)):
            variance_path[t] = omega
            
            for i in range(self.p):
                if t > i:
                    variance_path[t] += alpha[i] * returns[t-i-1]**2
            
            for j in range(self.q):
                if t > j:
                    variance_path[t] += beta[j] * variance_path[t-j-1]
        
        residuals = returns / np.sqrt(variance_path)
        
        # Ljung-Box test for ARCH effects
        from scipy.stats import boxlib
        lb_stat, lb_pvalue = boxlib(residuals**2, lags=10)
        
        return {
            'log_likelihood': -np.sum(0.5 * (np.log(variance_path) + returns**2 / variance_path)),
            'aic': 2 * len(self.params) + 2 * np.sum(0.5 * (np.log(variance_path) + returns**2 / variance_path)),
            'residual_mean': np.mean(residuals),
            'residual_std': np.std(residuals),
            'arch_ljung_box_stat': lb_stat,
            'arch_ljung_box_pvalue': lb_pvalue
        }
```

### Realized Volatility Calculator

```python
import numpy as np
import pandas as pd
from typing import List, Dict

class RealizedVolatilityCalculator:
    """Calculate realized volatility from high-frequency data."""
    
    def __init__(self, frequency: str = '5min'):
        self.frequency = frequency
    
    def calculate_realized_volatility(self, prices: np.ndarray,
                                     returns: np.ndarray = None) -> float:
        """Calculate realized volatility using sum of squared returns."""
        if returns is None:
            returns = np.diff(np.log(prices))
        
        # Realized variance
        rv = np.sum(returns**2)
        
        # Annualize (assuming 252 days, intraday data)
        # For 5min data: 252 * 78 periods per day
        periods_per_year = 252 * (60 / 5) * 6.5  # 6.5 trading hours
        annualized_rv = np.sqrt(rv * periods_per_year)
        
        return annualized_rv
    
    def calculate_bipower_variation(self, returns: np.ndarray) -> float:
        """Calculate bipower variation for robust volatility estimate."""
        n = len(returns)
        
        if n < 2:
            return 0.0
        
        # Absolute returns
        abs_returns = np.abs(returns)
        
        # Bipower variation
        bpv = 0.0
        for i in range(1, n):
            bpv += abs_returns[i] * abs_returns[i-1]
        
        # Scale factor for normality
        scale = np.pi / 2
        bpv = np.sqrt(bpv * scale / (n - 1))
        
        return bpv
    
    def calculate_kernel_realized_volatility(self, prices: np.ndarray,
                                            kernel: str = 'parzen') -> float:
        """Calculate kernel-based realized volatility."""
        returns = np.diff(np.log(prices))
        n = len(returns)
        
        if n < 2:
            return 0.0
        
        # Parzen kernel weights
        j = np.arange(1, n)
        weights = 1 - 6 * (j / n)**2 + 6 * (j / n)**3
        weights[j > n / 2] = 2 * (1 - j[j > n / 2] / n)**3
        
        # Kernel realization
        krv = np.sum(weights * np.abs(returns[1:] * returns[:-1]))
        krv = np.sqrt(krv)
        
        return krv
    
    def calculate_multi_scale_volatility(self, prices: np.ndarray,
                                        scales: List[int] = [5, 15, 30, 60]) -> Dict[str, float]:
        """Calculate volatility at multiple time scales."""
        volatility = {}
        
        for scale in scales:
            # Subsample returns
            subsampled = prices[::scale]
            if len(subsampled) < 2:
                continue
            
            returns = np.diff(np.log(subsampled))
            volatility[f'{scale}min'] = np.std(returns) * np.sqrt(len(prices) / scale)
        
        return volatility
```

### GJR-GARCH (Asymmetric) Model

```python
import numpy as np
from scipy.optimize import minimize
from typing import Tuple

class GJRGARCHModel:
    """GJR-GARCH model for asymmetric volatility (leverage effect)."""
    
    def __init__(self, p: int = 1, q: int = 1):
        self.p = p
        self.q = q
        self.params = None
        self.is_fitted = False
    
    def fit(self, returns: np.ndarray) -> 'GJRGARCHModel':
        """Fit GJR-GARCH model."""
        returns = np.asarray(returns)
        n = len(returns)
        
        def log_likelihood(params):
            omega = params[0]
            alpha = params[1:self.p + 1] if self.p > 0 else []
            gamma = params[self.p + 1:self.p + self.q + 1] if self.q > 0 else []
            beta = params[self.p + self.q + 1:self.p + self.q + self.q + 1] if self.q > 0 else []
            
            # Stationarity check
            if self.p + 2 * self.q >= 1:
                if sum(alpha) + 0.5 * sum(gamma) + sum(beta) >= 0.99:
                    return 1e10
            
            # Initialize variance
            variance = np.var(returns)
            variance_path = np.zeros(n)
            variance_path[0] = variance
            
            # Recursive variance calculation
            for t in range(1, n):
                variance_path[t] = omega
                
                # ARCH terms
                for i in range(self.p):
                    if t > i:
                        variance_path[t] += alpha[i] * returns[t-i-1]**2
                
                # GJR terms (asymmetric)
                for j in range(self.q):
                    if t > j:
                        epsilon = returns[t-j-1]
                        indicator = 1.0 if epsilon < 0 else 0.0
                        variance_path[t] += gamma[j] * indicator * epsilon**2
                
                # GARCH terms
                for k in range(self.q):
                    if t > k:
                        variance_path[t] += beta[k] * variance_path[t-k-1]
            
            # Log likelihood
            llh = 0.5 * np.sum(np.log(variance_path) + returns**2 / variance_path)
            return llh
        
        # Initial parameters
        n_params = 1 + self.p + 2 * self.q
        initial_params = np.concatenate([
            [np.var(returns) * 0.1],  # omega
            np.ones(self.p) * 0.05,   # alpha
            np.ones(self.q) * 0.05,   # gamma
            np.ones(self.q) * 0.9     # beta
        ])
        
        bounds = [(1e-8, None)] * n_params
        
        result = minimize(
            log_likelihood,
            initial_params,
            method='L-BFGS-B',
            bounds=bounds
        )
        
        self.params = result.x
        self.is_fitted = True
        
        return self
    
    def forecast(self, returns: np.ndarray, steps: int = 1) -> np.ndarray:
        """Forecast volatility with leverage effect."""
        if not self.is_fitted:
            raise ValueError("Model not fitted")
        
        returns = np.asarray(returns)
        
        omega = self.params[0]
        alpha = self.params[1:self.p + 1] if self.p > 0 else []
        gamma = self.params[self.p + 1:self.p + self.q + 1] if self.q > 0 else []
        beta = self.params[self.p + self.q + 1:self.p + self.q + self.q + 1] if self.q > 0 else []
        
        # Compute latest variance
        n = len(returns)
        latest_variance = np.var(returns)
        
        for t in range(1, n):
            var_t = omega
            for i in range(self.p):
                if t > i:
                    var_t += alpha[i] * returns[t-i-1]**2
            for j in range(self.q):
                if t > j:
                    eps = returns[t-j-1]
                    indicator = 1.0 if eps < 0 else 0.0
                    var_t += gamma[j] * indicator * eps**2
            for k in range(self.q):
                if t > k:
                    var_t += beta[k] * latest_variance
            latest_variance = var_t
        
        # Forecast
        forecasts = np.zeros(steps)
        forecasts[0] = latest_variance
        
        for t in range(1, steps):
            forecasts[t] = omega
            
            for i in range(self.p):
                forecasts[t] += alpha[i] * (forecasts[t-i-1] if t-i-1 >= 0 else latest_variance)
            
            for j in range(self.q):
                forecasts[t] += gamma[j] * 0.5 * (forecasts[t-j-1] if t-j-1 >= 0 else latest_variance)
            
            for k in range(self.q):
                forecasts[t] += beta[k] * forecasts[t-k-1]
        
        return np.sqrt(forecasts)
```

### Volatility Regime Detector

```python
import numpy as np
import pandas as pd
from typing import List, Dict

class VolatilityRegimeDetector:
    """Detect volatility regimes using Hidden Markov Model."""
    
    def __init__(self, n_regimes: int = 3, min_vol: float = 0.01, max_vol: float = 0.1):
        self.n_regimes = n_regimes
        self.min_vol = min_vol
        self.max_vol = max_vol
        self.regime_probs = None
    
    def fit_hmm(self, returns: np.ndarray, n_iterations: int = 100) -> 'VolatilityRegimeDetector':
        """Fit Hidden Markov Model for volatility regimes."""
        returns = np.asarray(returns)
        n = len(returns)
        
        # Initialize state means (volatility levels)
        state_means = np.linspace(self.min_vol, self.max_vol, self.n_regimes)
        state_vars = state_means ** 2
        
        # Initialize transition matrix
        transition = np.ones((self.n_regimes, self.n_regimes)) / self.n_regimes
        
        # Initialize state probabilities
        state_probs = np.ones((n, self.n_regimes)) / self.n_regimes
        
        for _ in range(n_iterations):
            # E-step: Compute state probabilities
            for t in range(1, n):
                for j in range(self.n_regimes):
                    likelihood = np.exp(-returns[t]**2 / (2 * state_vars[j])) / np.sqrt(2 * np.pi * state_vars[j])
                    for i in range(self.n_regimes):
                        state_probs[t, j] += state_probs[t-1, i] * transition[i, j] * likelihood
            
            # Normalize
            state_probs[t] /= np.sum(state_probs[t]) + 1e-10
        
        self.regime_probs = state_probs
        
        return self
    
    def detect_regimes(self, volatility: np.ndarray) -> np.ndarray:
        """Detect volatility regimes for given volatility series."""
        if self.regime_probs is None:
            # Simple k-means clustering
            from sklearn.cluster import KMeans
            vol_2d = volatility.reshape(-1, 1)
            kmeans = KMeans(n_clusters=self.n_regimes, random_state=42)
            return kmeans.fit_predict(vol_2d)
        
        # Use HMM probabilities
        return np.argmax(self.regime_probs, axis=1)
    
    def get_regime_labels(self, regimes: np.ndarray) -> List[str]:
        """Convert regime indices to labels."""
        labels = []
        for regime in regimes:
            if regime == 0:
                labels.append('low_volatility')
            elif regime == 1:
                labels.append('medium_volatility')
            else:
                labels.append('high_volatility')
        return labels
```