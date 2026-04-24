---
name: trading-technical-intermarket-analysis
description: Cross-market relationships and asset class correlations
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: asset, cross-market, relationships, technical intermarket analysis, technical-intermarket-analysis
  related-skills: trading-technical-cycle-analysis, trading-technical-false-signal-filtering,
    trading-fundamentals-trading-edge, trading-fundamentals-trading-plan
---

**Role:** Analyze relationships between markets to identify divergences and arbitrage opportunities

**Philosophy:** Markets move in concert; intermarket analysis reveals hidden correlations and regime shifts

## Key Principles

1. **Correlation Analysis**: Asset classes exhibit stable and transient correlations
2. **Relative Strength**: Compare performance across markets
3. **Cross-Asset Arbs**: Exploit pricing discrepancies between related markets
4. **Regime Detection**: Market regimes shift correlation structures
5. **Macro Signals**: Bond yields, FX rates predict equity moves

## Implementation Guidelines

### Structure
- Core logic: technical_analysis/intermarket.py
- Helper functions: technical_analysis/correlation_engine.py
- Tests: tests/test_intermarket.py

### Patterns to Follow
- Use rolling correlations withLookback windows
- Track cross-market ratios and spreads
- Monitor correlation breakdowns as risk signals

## Adherence Checklist
Before completing your task, verify:
- [ ] Rolling correlations update on new data with minimum window
- [ ] Correlation breakdowns trigger alerts
- [ ] Cross-market ratios normalized for volatility
- [ ] Latent factor analysis identifies shared drivers
- [ ] Regime shifts detected using change-point detection


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from scipy import stats
from scipy.stats import zscore
from statsmodels.tsa.stattools import coint

@dataclass
class CorrelationPair:
    """Correlation relationship between two assets."""
    asset1: str
    asset2: str
    correlation: float
    p_value: float
    lookback_period: int
    trend: str  # 'increasing', 'decreasing', 'stable'

@dataclass
class IntermarketSpread:
    """Spread relationship between markets."""
    asset1: str
    asset2: str
    spread: float
    z_score: float
    mean: float
    std: float

class IntermarketAnalyzer:
    """Analyzes relationships across multiple asset classes."""
    
    def __init__(self, correlation_windows: List[int] = [20, 50, 100]):
        self.windows = correlation_windows
    
    def calculate_rolling_correlation(
        self, returns1: pd.Series, returns2: pd.Series, window: int = 20
    ) -> pd.Series:
        """Calculate rolling correlation between two asset returns."""
        return returns1.rolling(window=window).corr(returns2)
    
    def analyze_correlation_regime(
        self, returns_df: pd.DataFrame, assets: List[str], window: int = 50
    ) -> Dict[str, Dict]:
        """Analyze correlation regime across multiple assets."""
        results = {}
        
        for i, asset1 in enumerate(assets):
            for asset2 in assets[i+1:]:
                returns1 = returns_df[asset1]
                returns2 = returns_df[asset2]
                
                # Short-term correlation
                short_corr = self.calculate_rolling_correlation(returns1, returns2, 20)
                # Long-term correlation
                long_corr = self.calculate_rolling_correlation(returns1, returns2, 100)
                
                # Calculate regime
                short_mean = short_corr.mean()
                short_vol = short_corr.std()
                long_mean = long_corr.mean()
                
                if short_vol > long_mean * 0.5:
                    regime = 'high_volatility'
                elif abs(short_mean) < 0.2:
                    regime = 'weak_correlation'
                else:
                    regime = 'stable'
                
                results[f"{asset1}_{asset2}"] = {
                    'correlation': short_corr.iloc[-1] if len(short_corr) > 0 else 0,
                    'regime': regime,
                    'regime_change': bool(abs(short_corr.iloc[-1] - long_mean) > short_vol)
                }
        
        return results
    
    def calculate_cross_market_ratio(
        self, price1: pd.Series, price2: pd.Series, normalize: bool = True
    ) -> pd.Series:
        """Calculate price ratio between two markets."""
        ratio = price1 / (price2 + 1e-8)
        
        if normalize:
            # Z-score normalize the ratio
            return zscore(ratio)
        
        return ratio
    
    def detect_intermarket_divergence(
        self, prices: Dict[str, pd.Series], base_asset: str
    ) -> List[Dict]:
        """Detect divergences between markets."""
        divergences = []
        base_prices = prices[base_asset]
        
        for asset, prices_df in prices.items():
            if asset == base_asset:
                continue
            
            # Calculate returns correlation over different periods
            base_returns = base_prices.pct_change()
            asset_returns = prices_df.pct_change()
            
            for window in [20, 50, 100]:
                base_rolling = base_returns.rolling(window).mean()
                asset_rolling = asset_returns.rolling(window).mean()
                
                if len(base_rolling) < window:
                    continue
                
                # Check for divergence
                base_z = zscore(base_rolling)[-1]
                asset_z = zscore(asset_rolling)[-1]
                
                if base_z * asset_z < 0 and abs(base_z - asset_z) > 2:
                    divergences.append({
                        'asset': asset,
                        'window': window,
                        'base_z': base_z,
                        'asset_z': asset_z,
                        'strength': abs(base_z - asset_z)
                    })
        
        return divergences
    
    def calculate_cointegration_spread(
        self, price1: pd.Series, price2: pd.Series
    ) -> Tuple[float, float, float]:
        """Calculate cointegration spread for pairs trading."""
        # Engle-Granger two-step method
        # Step 1: Regress price1 on price2
        X = sm.add_constant(price2)
        model = sm.OLS(price1, X).fit()
        
        hedge_ratio = model.params[1]
        spread = price1 - hedge_ratio * price2
        
        # Step 2: Test for stationarity
        from statsmodels.tsa.stattools import adfuller
        adf_result = adfuller(spread)
        
        return spread.mean(), spread.std(), adf_result[1]  # p-value
    
    def intermarket_arb_opportunity(
        self, spreads: Dict[str, pd.Series], z_threshold: float = 2.0
    ) -> List[Dict]:
        """Identify intermarket arbitrage opportunities."""
        opportunities = []
        
        for pair, spread in spreads.items():
            if len(spread) < 20:
                continue
            
            mean = spread.mean()
            std = spread.std()
            current_z = (spread.iloc[-1] - mean) / std if std > 0 else 0
            
            if abs(current_z) > z_threshold:
                direction = 'short' if current_z > 0 else 'long'
                opportunities.append({
                    'pair': pair,
                    'z_score': current_z,
                    'direction': direction,
                    'expected_reversion': abs(current_z) / 2  # Expected z-score decay
                })
        
        return opportunities
    
    def macro_signal_analysis(
        self, market_indices: Dict[str, pd.Series], macro_series: pd.Series
    ) -> Dict[str, float]:
        """Analyze how macro indicators drive market movements."""
        signals = {}
        
        for name, prices in market_indices.items():
            returns = prices.pct_change()
            
            # Calculate sensitivity to macro factor
            combined = pd.concat([returns, macro_series], axis=1).dropna()
            
            if len(combined) < 50:
                continue
            
            X = sm.add_constant(combined.iloc[:, 1])
            y = combined.iloc[:, 0]
            model = sm.OLS(y, X).fit()
            
            signals[name] = model.params[1]  # Beta coefficient
        
        return signals
```