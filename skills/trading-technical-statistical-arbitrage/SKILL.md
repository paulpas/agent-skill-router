---
name: trading-technical-statistical-arbitrage
description: Pair trading and cointegration-based arbitrage strategies
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: cointegration-based, strategies, technical statistical arbitrage, technical-statistical-arbitrage,
    trading
  related-skills: trading-technical-cycle-analysis, trading-technical-false-signal-filtering
    trading-fundamentals-trading-edge, trading-fundamentals-trading-plan
---

**Role:** Identify and trade mean-reverting relationships between securities

**Philosophy:** Statistical arbitrage exploits temporary pricing inefficiencies while maintaining market neutrality

## Key Principles

1. **Cointegration**: Long-term equilibrium relationship between assets
2. **Spread Dynamics**: Mean-reversion of price spreads
3. **Z-Score Trading**: Entry/exit based on statistical deviations
4. **Half-Life**: Mean-reversion speed metric
5. **Correlation Breakdown**: Monitor when relationships fail

## Implementation Guidelines

### Structure
- Core logic: technical_analysis/stat_arb.py
- Helper functions: technical_analysis/cointegration.py
- Tests: tests/test_stat_arb.py

### Patterns to Follow
- Use rolling window cointegration tests
- Track spread z-scores for trading signals
- Monitor pair performance degradation

## Adherence Checklist
Before completing your task, verify:
- [ ] Cointegration tested with rolling windows
- [ ] Z-score thresholds adapt to volatility
- [ ] Half-life calculated for mean-reversion timing
- [ ] Correlation breakdown triggers position closure
- [ ] Transaction cost optimization applied


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from statsmodels.tsa.stattools import coint, adfuller
from statsmodels.regression.rolling import RollingOLS
import statsmodels.api as sm

@dataclass
class CointegratedPair:
    """Cointegrated asset pair."""
    asset1: str
    asset2: str
    hedge_ratio: float
    intercept: float
    p_value: float
    half_life: float

@dataclass
class SpreadState:
    """Current state of the spread."""
    spread: float
    z_score: float
    mean: float
    std: float
    entry_signal: bool
    exit_signal: bool

class StatisticalArbitrage:
    """Identifies and trades statistical arbitrage opportunities."""
    
    def __init__(self, window: int = 252, z_threshold: float = 2.0):
        self.window = window
        self.z_threshold = z_threshold
    
    def test_cointegration(
        self, price1: pd.Series, price2: pd.Series, 
        alpha: float = 0.05
    ) -> Tuple[bool, float, float]:
        """Test for cointegration using Engle-Granger two-step method."""
        # Step 1: Regress price1 on price2
        X = sm.add_constant(price2)
        model = sm.OLS(price1, X).fit()
        
        hedge_ratio = model.params[1]
        intercept = model.params[0]
        
        # Step 2: Test residuals for stationarity
        residuals = price1 - hedge_ratio * price2 - intercept
        
        adf_result = adfuller(residuals)
        p_value = adf_result[1]
        
        is_cointegrated = p_value < alpha
        
        return is_cointegrated, p_value, hedge_ratio
    
    def calculate_half_life(
        self, spread: pd.Series
    ) -> float:
        """Calculate mean reversion half-life."""
        if len(spread) < 50:
            return 100  # Default long half-life
        
        # OLS: spread(t) = a + b * spread(t-1) + epsilon
        spread_lag = spread.shift(1).dropna()
        spread_diff = spread.diff().dropna()
        
        # Align indices
        common_idx = spread_lag.index.intersection(spread_diff.index)
        if len(common_idx) < 50:
            return 100
        
        spread_lag = spread_lag[common_idx]
        spread_diff = spread_diff[common_idx]
        
        X = sm.add_constant(spread_lag)
        model = sm.OLS(spread_diff, X).fit()
        
        # Half-life = log(0.5) / log(1 + beta)
        beta = model.params[1]
        if beta >= 0:
            return 100  # No mean reversion
        
        half_life = np.log(0.5) / np.log(1 + beta)
        
        return max(1, min(252, half_life))  # Cap between 1 and 252 days
    
    def calculate_spread(
        self, price1: pd.Series, price2: pd.Series, 
        hedge_ratio: float, intercept: float = 0
    ) -> pd.Series:
        """Calculate the spread between two assets."""
        return price1 - hedge_ratio * price2 - intercept
    
    def calculate_spread_zscore(
        self, spread: pd.Series, window: int = 50
    ) -> pd.Series:
        """Calculate z-score of spread."""
        mean = spread.rolling(window=window).mean()
        std = spread.rolling(window=window).std()
        
        zscore = (spread - mean) / (std + 1e-8)
        
        return zscore
    
    def detect_entry_exit(
        self, zscore: pd.Series
    ) -> List[Dict]:
        """Detect entry and exit signals based on z-score."""
        signals = []
        
        for i in range(1, len(zscore)):
            prev_z = zscore.iloc[i-1]
            curr_z = zscore.iloc[i]
            
            # Entry signals (when crossing thresholds)
            if abs(prev_z) < self.z_threshold and abs(curr_z) >= self.z_threshold:
                direction = 'short' if curr_z > 0 else 'long'
                signals.append({
                    'type': 'entry',
                    'zscore': curr_z,
                    'direction': direction,
                    'index': i
                })
            
            # Exit signals (when crossing back toward zero)
            if abs(prev_z) >= self.z_threshold and abs(curr_z) < self.z_threshold:
                signals.append({
                    'type': 'exit',
                    'zscore': curr_z,
                    'index': i
                })
        
        return signals
    
    def find_best_pairs(
        self, price_data: pd.DataFrame, top_n: int = 5
    ) -> List[CointegratedPair]:
        """Find best cointegrated pairs from multiple assets."""
        assets = list(price_data.columns)
        pairs = []
        
        for i in range(len(assets)):
            for j in range(i + 1, len(assets)):
                asset1, asset2 = assets[i], assets[j]
                
                is_cointegrated, p_value, hedge_ratio = self.test_cointegration(
                    price_data[asset1], price_data[asset2]
                )
                
                if is_cointegrated and p_value < 0.01:
                    # Calculate half-life
                    spread = self.calculate_spread(
                        price_data[asset1], price_data[asset2], hedge_ratio
                    )
                    half_life = self.calculate_half_life(spread)
                    
                    pairs.append(CointegratedPair(
                        asset1=asset1,
                        asset2=asset2,
                        hedge_ratio=hedge_ratio,
                        intercept=0,
                        p_value=p_value,
                        half_life=half_life
                    ))
        
        # Sort by p-value (most cointegrated first) and half-life (faster mean-reversion preferred)
        pairs.sort(key=lambda x: (x.p_value, x.half_life))
        
        return pairs[:top_n]
    
    def rolling_cointegration_test(
        self, price1: pd.Series, price2: pd.Series, 
        window: int = 100
    ) -> pd.Series:
        """Perform rolling cointegration test."""
        p_values = pd.Series(index=price1.index, dtype=float)
        
        for i in range(window, len(price1)):
            window_price1 = price1.iloc[i-window:i]
            window_price2 = price2.iloc[i-window:i]
            
            _, p_value, _ = self.test_cointegration(window_price1, window_price2)
            p_values.iloc[i] = p_value
        
        return p_values
```