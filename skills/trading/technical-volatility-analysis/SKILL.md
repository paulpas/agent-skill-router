---
name: volatility-analysis
description: '"Implements volatility measurement, forecasting, and risk assessment
  for risk management and algorithmic trading execution."'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: assessment, forecasting, measurement, technical volatility analysis, technical-volatility-analysis
  related-skills: fundamentals-trading-plan, technical-cycle-analysis
---



**Role:** Quantify market volatility for risk management, position sizing, and option pricing

**Philosophy:** Volatility is the price of risk; understanding volatility regimes drives successful trading

## Key Principles

1. **Volatility Regimes**: Normal, elevated, and extreme volatility states
2. **GARCH Modeling**: Conditional heteroskedasticity for volatility forecasting
3. **Volatility Skew**: Option implied volatility differences
4. **Realized vs Implied**: Compare historical to market-expected volatility
5. **Volatility Convergence**: Mean-reversion in volatility levels

## Implementation Guidelines

### Structure
- Core logic: technical_analysis/volatility.py
- Helper functions: technical_analysis/garch.py
- Tests: tests/test_volatility.py

### Patterns to Follow
- Calculate multiple volatility metrics
- Track volatility regime transitions
- Use rolling窗口 for dynamic volatility estimates

## Adherence Checklist
Before completing your task, verify:
- [ ] Multiple volatility metrics calculated (ATR, STD, GARCH)
- [ ] Volatility regime classification triggers alerts
- [ ] GARCH forecasts updated on new data
- [ ] Volatility skew monitored for options
- [ ] Extreme volatility events flagged


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from scipy import optimize
from statsmodels.tsa.api import ExponentialSmoothing

@dataclass
class VolatilityState:
    """Current volatility regime."""
    regime: str  # 'low', 'normal', 'elevated', 'extreme'
    level: float  # Annualized volatility %
    expected_1d: float  # Expected 1-day volatility
    trend: str  # 'increasing', 'decreasing', 'stable'

@dataclass
class GARCHParams:
    """GARCH model parameters."""
    omega: float
    alpha: float
    beta: float
    log_likelihood: float
    aic: float

class VolatilityAnalyzer:
    """Analyzes and forecasts market volatility."""
    
    def __init__(self, window: int = 20):
        self.window = window
    
    def calculate_atr(self, candles: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculate Average True Range."""
        high = candles['high']
        low = candles['low']
        close = candles['close']
        
        tr1 = high - low
        tr2 = abs(high - close.shift())
        tr3 = abs(low - close.shift())
        
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(window=period).mean()
        
        return atr
    
    def calculate_realized_volatility(
        self, returns: pd.Series, period: int = 20
    ) -> pd.Series:
        """Calculate realized (historical) volatility."""
        return returns.rolling(window=period).std() * np.sqrt(252)  # Annualized
    
    def calculate_garch_volatility(
        self, returns: np.ndarray, p: int = 1, q: int = 1
    ) -> Tuple[np.ndarray, GARCHParams]:
        """Estimate GARCH(p,q) volatility model."""
        n = len(returns)
        
        # Initialize arrays
        variance = np.zeros(n)
        epsilon = np.zeros(n)
        
        # Start with sample variance
        variance[0] = np.var(returns)
        epsilon[0] = returns[0]
        
        # Optimize GARCH parameters
        def log_likelihood(params):
            omega, alpha, beta = params
            
            if omega <= 0 or alpha < 0 or beta < 0 or alpha + beta >= 1:
                return np.inf
            
            ll = 0
            var = np.var(returns)
            
            for t in range(1, n):
                var = omega + alpha * epsilon[t-1]**2 + beta * var
                if var <= 0:
                    return np.inf
                ll -= 0.5 * (np.log(2 * np.pi) + np.log(var) + epsilon[t-1]**2 / var)
            
            return -ll
        
        # Find optimal parameters
        result = optimize.minimize(
            log_likelihood,
            [np.var(returns) * 0.1, 0.1, 0.8],
            method='Nelder-Mead'
        )
        
        omega, alpha, beta = result.x
        
        # Re-estimate with optimal params
        variance[0] = np.var(returns)
        for t in range(1, n):
            variance[t] = omega + alpha * epsilon[t-1]**2 + beta * variance[t-1]
            epsilon[t] = returns[t]
        
        volatility = np.sqrt(variance) * np.sqrt(252)  # Annualized
        
        params = GARCHParams(
            omega=omega,
            alpha=alpha,
            beta=beta,
            log_likelihood=-result.fun,
            aic=2 * 3 - 2 * (-result.fun)
        )
        
        return volatility, params
    
    def detect_volatility_regime(
        self, volatility_series: pd.Series
    ) -> VolatilityState:
        """Classify current volatility regime."""
        vol = volatility_series.iloc[-1]
        vol_mean = volatility_series.mean()
        vol_std = volatility_series.std()
        
        # Regime classification
        if vol < vol_mean - vol_std:
            regime = 'low'
        elif vol < vol_mean:
            regime = 'normal'
        elif vol < vol_mean + vol_std:
            regime = 'elevated'
        else:
            regime = 'extreme'
        
        # Direction
        recent_vol = volatility_series.tail(5)
        trend = 'increasing' if recent_vol.iloc[-1] > recent_vol.iloc[-2] else 'decreasing'
        
        return VolatilityState(
            regime=regime,
            level=float(vol * 100),  # Convert to percentage
            expected_1d=float(vol / np.sqrt(252)),
            trend=trend
        )
    
    def forecast_volatility(
        self, returns: pd.Series, horizon: int = 1
    ) -> Dict[str, float]:
        """Forecast future volatility using GARCH."""
        if len(returns) < 50:
            returns = returns.tail(50)
        
        returns_array = returns.values
        
        # Simple GARCH(1,1) forecast
        var = np.var(returns_array)
        
        # Fit simple model
        omega = np.var(returns_array) * 0.1
        alpha = 0.1
        beta = 0.8
        
        # Forecast
        forecast = var
        for _ in range(horizon):
            forecast = omega + alpha * returns_array[-1]**2 + beta * forecast
        
        return {
            'forecast': np.sqrt(forecast) * np.sqrt(252),
            '95_ci_low': np.sqrt(forecast * 0.7) * np.sqrt(252),
            '95_ci_high': np.sqrt(forecast * 1.3) * np.sqrt(252)
        }
    
    def calculate_volatility_skew(
        self, options_data: pd.DataFrame
    ) -> Dict[str, float]:
        """Calculate implied volatility skew."""
        if 'strike' not in options_data.columns or 'iv' not in options_data.columns:
            return {'skew': 0, ' ATM_iv': 0}
        
        atm_mask = (options_data['strike'] - options_data['underlying']).abs().idxmin()
        atm_iv = options_data.loc[atm_mask, 'iv']
        
        # Calculate skew (difference between 25 delta put and call IV)
        puts = options_data[options_data['option_type'] == 'put']
        calls = options_data[options_data['option_type'] == 'call']
        
        if len(puts) < 2 or len(calls) < 2:
            return {'skew': 0, 'ATM_iv': atm_iv}
        
        put_iv_25d = puts.nsmallest(2, 'delta')['iv'].mean()
        call_iv_25d = calls.nlargest(2, 'delta')['iv'].mean()
        
        skew = put_iv_25d - call_iv_25d
        
        return {
            'skew': float(skew),
            'ATM_iv': float(atm_iv)
        }
```