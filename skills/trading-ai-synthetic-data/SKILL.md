---
name: trading-ai-synthetic-data
description: Generate synthetic financial data for training and testing trading models
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: ai synthetic data, ai-synthetic-data, financial, generate, training
  related-skills: trading-ai-anomaly-detection, trading-ai-explainable-ai, trading-technical-cycle-analysis,
    trading-technical-false-signal-filtering
---

**Role:** Create realistic synthetic market data when actual data is limited or for augmenting training sets

**Philosophy:** Synthetic data must preserve statistical properties and market structure. Prioritize realism in volatility clustering, correlations, and regime shifts over simple statistical matching.

## Key Principles

1. **Regime-Aware Generation**: Generate data that includes realistic regime shifts and transitions
2. **Stylized Facts Preservation**: Match known market stylized facts (fat tails, volatility clustering)
3. **Cross-Asset Correlations**: Maintain realistic correlations between assets
4. **Microstructure Features**: Include bid-ask spreads, order imbalances, and trade sizes
5. **Controlled Augmentation**: Use synthetic data for augmentation, not replacement, of real data

## Implementation Guidelines

### Structure
- Core logic: `synthetic/generators.py` - Data generation methods
- Augmenter: `synthetic/augmenter.py` - Data augmentation
- Validator: `synthetic/validator.py` - Synthetic data validation
- Config: `config/synthetic_config.yaml` - Generation parameters

### Patterns to Follow
- Use GANs or VAEs for complex synthetic data generation
- Apply regime-aware scaling and transformation
- Validate synthetic data matches key market statistics
- Use synthetic data for edge case augmentation

## Adherence Checklist
Before completing your task, verify:
- [ ] Stylized facts preserved (fat tails, volatility clustering)
- [ ] Cross-asset correlations maintained
- [ ] Regime shifts and transitions included
- [ ] Synthetic data validated against real data statistics
- [ ] Augmentation increases training data diversity



## Code Examples

### GARCH-Based Price Generator

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class PricePath:
    """Generated price path."""
    timestamps: np.ndarray
    prices: np.ndarray
    returns: np.ndarray
    volatility: np.ndarray

class GARCHPriceGenerator:
    """Generate price paths using GARCH models."""
    
    def __init__(self, n_paths: int = 1, n_days: int = 252,
                annual_volatility: float = 0.2, daily_return: float = 0.0003):
        self.n_paths = n_paths
        self.n_days = n_days
        self.annual_vol = annual_volatility
        self.daily_return = daily_return
        
        # GARCH parameters
        self.garch_params = {
            'omega': 0.000001,
            'alpha': 0.1,
            'beta': 0.85
        }
    
    def generate(self, initial_price: float = 100.0) -> PricePath:
        """Generate price path with GARCH volatility."""
        # Time steps
        timestamps = np.arange(self.n_days)
        
        # Daily returns
        returns = np.zeros(self.n_days)
        returns[0] = self.daily_return
        
        # Volatility
        volatility = np.zeros(self.n_days)
        volatility[0] = self.annual_vol / np.sqrt(252)
        
        # Generate path
        for t in range(1, self.n_days):
            # GARCH recursion
            volatility[t] = (
                self.garch_params['omega'] +
                self.garch_params['alpha'] * returns[t-1]**2 +
                self.garch_params['beta'] * volatility[t-1]**2
            )
            volatility[t] = np.sqrt(volatility[t])
            
            # Generate return
            z = np.random.normal()
            returns[t] = self.daily_return + volatility[t] * z
        
        # Convert to prices
        prices = initial_price * np.exp(np.cumsum(returns))
        prices = np.concatenate([[initial_price], prices])
        
        return PricePath(
            timestamps=timestamps,
            prices=prices,
            returns=returns,
            volatility=volatility
        )
    
    def generate_multiple(self, initial_price: float = 100.0) -> List[PricePath]:
        """Generate multiple price paths."""
        return [self.generate(initial_price) for _ in range(self.n_paths)]
```

### Realized Volatility Generator

```python
import numpy as np
from typing import Dict, List

class RealizedVolatilityGenerator:
    """Generate high-frequency data with realistic volatility."""
    
    def __init__(self, tick_size: float = 0.01, min_vol: float = 0.0001, max_vol: float = 0.01):
        self.tick_size = tick_size
        self.min_vol = min_vol
        self.max_vol = max_vol
    
    def generate_ticks(self, n_ticks: int, base_volatility: float = 0.001,
                      volatility_regime: str = 'normal') -> Dict:
        """Generate tick-by-tick data."""
        # Set volatility based on regime
        if volatility_regime == 'calm':
            vol = base_volatility * 0.5
        elif volatility_regime == 'volatile':
            vol = base_volatility * 3.0
        elif volatility_regime == 'crisis':
            vol = base_volatility * 5.0
        else:
            vol = base_volatility
        
        # Generate price changes
        price_changes = np.random.normal(0, vol, n_ticks)
        
        # Add microstructure noise
        price_changes += np.random.choice([-self.tick_size, 0, self.tick_size], n_ticks, p=[0.1, 0.8, 0.1])
        
        # Accumulate prices
        prices = np.cumsum(price_changes)
        prices = np.concatenate([[0], prices])  # Start at 0
        
        # Generate trade sizes (power law)
        trade_sizes = np.random.pareto(2.0, n_ticks) * 10 + 1
        
        # Generate timestamps ( clustered )
        inter_arrival = np.random.exponential(0.5, n_ticks)
        timestamps = np.cumsum(inter_arrival)
        
        return {
            'timestamps': timestamps,
            'prices': prices,
            'returns': price_changes,
            'trade_sizes': trade_sizes,
            'volatility': vol
        }
    
    def generate_candles(self, n_candles: int, candle_size: int = 100,
                        base_volatility: float = 0.001) -> Dict:
        """Generate OHLCV candle data."""
        tick_data = self.generate_ticks(n_candles * candle_size, base_volatility)
        
        candles = {
            'open': [],
            'high': [],
            'low': [],
            'close': [],
            'volume': []
        }
        
        for i in range(n_candles):
            start = i * candle_size
            end = start + candle_size
            
            prices = tick_data['prices'][start:end]
            volumes = tick_data['trade_sizes'][start:end]
            
            candles['open'].append(prices[0])
            candles['high'].append(np.max(prices))
            candles['low'].append(np.min(prices))
            candles['close'].append(prices[-1])
            candles['volume'].append(np.sum(volumes))
        
        return candles
```

### Correlated Asset Generator

```python
import numpy as np
from typing import Dict, List

class CorrelatedAssetGenerator:
    """Generate multiple correlated assets."""
    
    def __init__(self, n_assets: int = 5, n_days: int = 252):
        self.n_assets = n_assets
        self.n_days = n_days
        self.correlation_matrix = None
    
    def generate_correlated_assets(self, initial_prices: List[float],
                                  base_returns: List[float],
                                  base_vols: List[float],
                                  correlation: float = 0.5) -> Dict[str, np.ndarray]:
        """Generate multiple correlated assets."""
        prices = {}
        
        # Create correlation matrix
        corr_matrix = self._create_correlation_matrix(correlation)
        
        # Cholesky decomposition for correlated random variables
        try:
            cholesky = np.linalg.cholesky(corr_matrix)
        except np.linalg.LinAlgError:
            # Use near(pd.pd)
            corr_matrix += np.eye(self.n_assets) * 0.01
            cholesky = np.linalg.cholesky(corr_matrix)
        
        # Generate correlated returns
        for i, (price, ret, vol) in enumerate(zip(initial_prices, base_returns, base_vols)):
            # Independent standard normal
            z = np.random.normal(0, 1, self.n_days)
            
            # Correlate using Cholesky
            correlated_z = cholesky @ z
            
            # Generate returns
            returns = ret + vol * correlated_z
            
            # Convert to prices
            price_path = price * np.exp(np.cumsum(returns))
            prices[f'asset_{i}'] = np.concatenate([[price], price_path])
        
        return prices
    
    def _create_correlation_matrix(self, off_diag: float = 0.5) -> np.ndarray:
        """Create correlation matrix with specified off-diagonal correlation."""
        corr_matrix = np.ones((self.n_assets, self.n_assets)) * off_diag
        np.fill_diagonal(corr_matrix, 1.0)
        return corr_matrix
    
    def generate_market_regimes(self, prices: Dict[str, np.ndarray],
                               regime_probs: Dict[str, float] = None) -> np.ndarray:
        """Assign regime to each time period based on market characteristics."""
        if not prices:
            return np.array([])
        
        # Calculate regime-indicating features
        asset_names = list(prices.keys())
        n_periods = len(prices[asset_names[0]]) - 1
        
        regime_labels = np.zeros(n_periods, dtype=int)
        
        for t in range(n_periods):
            # Calculate features for this period
            features = []
            
            for asset in asset_names:
                prices_list = prices[asset]
                if t > 0:
                    returns = (prices_list[t] - prices_list[t-1]) / prices_list[t-1]
                    features.append(returns)
            
            if not features:
                continue
            
            # Regime decision based on volatility and correlation
            vol = np.std(features)
            correlation = np.corrcoef(np.array([prices[a][t] for a in asset_names]))[0, 1] if len(asset_names) > 1 else 0
            
            # Simple regime assignment
            if vol < 0.001 and abs(correlation) < 0.3:
                regime_labels[t] = 0  # Calm
            elif vol < 0.003 and abs(correlation) < 0.6:
                regime_labels[t] = 1  # Normal
            else:
                regime_labels[t] = 2  # Volatile
        
        return regime_labels
```

### Synthetic Data Augmenter

```python
import numpy as np
import pandas as pd
from typing import Dict, List

class SyntheticAugmenter:
    """Augment real data with synthetic variations."""
    
    def __init__(self, noise_scale: float = 0.01, time_shift_max: int = 5,
                 magnitude_scale: float = 0.1):
        self.noise_scale = noise_scale
        self.time_shift_max = time_shift_max
        self.magnitude_scale = magnitude_scale
    
    def add_noise(self, data: np.ndarray) -> np.ndarray:
        """Add Gaussian noise to data."""
        noise = np.random.normal(0, self.noise_scale, data.shape)
        return data + noise
    
    def time_shift(self, data: np.ndarray, shift: int = None) -> np.ndarray:
        """Apply random time shift to data."""
        if shift is None:
            shift = np.random.randint(-self.time_shift_max, self.time_shift_max + 1)
        
        shifted = np.roll(data, shift)
        
        # Fill with nearest values
        if shift > 0:
            shifted[:shift] = data[0]
        elif shift < 0:
            shifted[shift:] = data[-1]
        
        return shifted
    
    def magnitude_scaling(self, data: np.ndarray, scale: float = None) -> np.ndarray:
        """Apply random magnitude scaling."""
        if scale is None:
            scale = 1.0 + np.random.normal(0, self.magnitude_scale)
        
        return data * scale
    
    def augment(self, data: Dict[str, np.ndarray]) -> Dict[str, np.ndarray]:
        """Generate augmented version of data."""
        augmented = {}
        
        for name, values in data.items():
            values = np.asarray(values)
            
            # Apply transformations
            values = self.add_noise(values)
            values = self.time_shift(values)
            values = self.magnitude_scaling(values)
            
            augmented[name] = values
        
        return augmented
    
    def generate_synthetic_portfolio(self, real_data: Dict[str, np.ndarray],
                                    n_samples: int = 10) -> Dict[str, np.ndarray]:
        """Generate synthetic portfolio by combining real data variations."""
        synthetic = {}
        
        for _ in range(n_samples):
            augmented = self.augment(real_data)
            
            for name, values in augmented.items():
                if name not in synthetic:
                    synthetic[name] = []
                synthetic[name].append(values)
        
        # Stack samples
        for name in synthetic:
            synthetic[name] = np.vstack(synthetic[name])
        
        return synthetic
```

### GAN-Based Price Generator

```python
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from typing import List, Dict

class PriceGAN:
    """Generative Adversarial Network for price generation."""
    
    def __init__(self, input_dim: int = 20, latent_dim: int = 100,
                 hidden_dim: int = 64):
        self.input_dim = input_dim
        self.latent_dim = latent_dim
        
        self.generator = nn.Sequential(
            nn.Linear(latent_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim * 2),
            nn.ReLU(),
            nn.Linear(hidden_dim * 2, hidden_dim * 4),
            nn.ReLU(),
            nn.Linear(hidden_dim * 4, input_dim),
            nn.Tanh()  # Output in [-1, 1]
        )
        
        self.discriminator = nn.Sequential(
            nn.Linear(input_dim, hidden_dim * 4),
            nn.LeakyReLU(0.2),
            nn.Linear(hidden_dim * 4, hidden_dim * 2),
            nn.LeakyReLU(0.2),
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.LeakyReLU(0.2),
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid()
        )
    
    def generate(self, n_samples: int) -> np.ndarray:
        """Generate synthetic price data."""
        self.generator.eval()
        
        with torch.no_grad():
            z = torch.randn(n_samples, self.latent_dim)
            synthetic_data = self.generator(z).numpy()
        
        return synthetic_data
    
    def train(self, real_data: np.ndarray, epochs: int = 100,
             batch_size: int = 32, lr: float = 0.0002):
        """Train GAN on real data."""
        # Prepare data
        data_tensor = torch.FloatTensor(real_data)
        dataset = torch.utils.data.TensorDataset(data_tensor)
        dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
        
        # Loss and optimizers
        criterion = nn.BCELoss()
        optimizer_g = torch.optim.Adam(self.generator.parameters(), lr=lr)
        optimizer_d = torch.optim.Adam(self.discriminator.parameters(), lr=lr)
        
        for epoch in range(epochs):
            for i, (batch,) in enumerate(dataloader):
                batch_size_current = batch.shape[0]
                
                # Train Discriminator
                optimizer_d.zero_grad()
                
                # Real data
                real_labels = torch.ones(batch_size_current, 1)
                real_loss = criterion(self.discriminator(batch), real_labels)
                
                # Fake data
                z = torch.randn(batch_size_current, self.latent_dim)
                fake_data = self.generator(z).detach()
                fake_labels = torch.zeros(batch_size_current, 1)
                fake_loss = criterion(self.discriminator(fake_data), fake_labels)
                
                d_loss = real_loss + fake_loss
                d_loss.backward()
                optimizer_d.step()
                
                # Train Generator
                optimizer_g.zero_grad()
                
                z = torch.randn(batch_size_current, self.latent_dim)
                fake_data = self.generator(z)
                fake_output = self.discriminator(fake_data)
                
                g_loss = criterion(fake_output, torch.ones(batch_size_current, 1))
                g_loss.backward()
                optimizer_g.step()
            
            if epoch % 10 == 0:
                print(f'Epoch {epoch}, D Loss: {d_loss.item():.4f}, G Loss: {g_loss.item():.4f}')
```

### Validation Metrics

```python
import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List

class SyntheticDataValidator:
    """Validate synthetic data matches real data characteristics."""
    
    def __init__(self):
        self.real_stats = {}
    
    def fit(self, real_data: np.ndarray):
        """Fit validator on real data statistics."""
        self.real_stats = {
            'mean': np.mean(real_data),
            'std': np.std(real_data),
            'skewness': stats.skew(real_data),
            'kurtosis': stats.kurtosis(real_data),
            'autocorrelation': np.corrcoef(real_data[:-1], real_data[1:])[0, 1] if len(real_data) > 1 else 0,
            'min': np.min(real_data),
            'max': np.max(real_data)
        }
        
        return self
    
    def validate(self, synthetic_data: np.ndarray) -> Dict:
        """Validate synthetic data against real data."""
        synthetic_stats = {
            'mean': np.mean(synthetic_data),
            'std': np.std(synthetic_data),
            'skewness': stats.skew(synthetic_data),
            'kurtosis': stats.kurtosis(synthetic_data),
            'autocorrelation': np.corrcoef(synthetic_data[:-1], synthetic_data[1:])[0, 1] if len(synthetic_data) > 1 else 0,
            'min': np.min(synthetic_data),
            'max': np.max(synthetic_data)
        }
        
        # Calculate matching scores
        scores = {}
        for key in self.real_stats:
            real_val = self.real_stats[key]
            synth_val = synthetic_stats[key]
            
            if key in ['mean', 'std', 'skewness', 'kurtosis']:
                # Normalized difference
                score = 1.0 / (1.0 + abs(real_val - synth_val) / (abs(real_val) + 1e-8))
            else:
                # Direct comparison
                score = 1.0 / (1.0 + abs(real_val - synth_val))
            
            scores[key] = float(score)
        
        # Overall score
        overall_score = np.mean(list(scores.values()))
        
        return {
            'scores': scores,
            'overall_score': float(overall_score),
            'real_stats': self.real_stats,
            'synthetic_stats': synthetic_stats,
            'passes_threshold': overall_score > 0.7
        }
    
    def validate_returns_distribution(self, real_returns: np.ndarray,
                                     synthetic_returns: np.ndarray) -> Dict:
        """Validate that synthetic returns match key return characteristics."""
        # Stylized facts for financial returns
        facts = {
            'volatility_clustering': self._test_volatility_clustering,
            'fat_tails': self._test_fat_tails,
            'leverage_effect': self._test_leverage_effect,
            'autocorrelation': self._test_autocorrelation
        }
        
        results = {}
        for fact_name, test_func in facts.items():
            results[fact_name] = test_func(real_returns, synthetic_returns)
        
        return results
    
    def _test_volatility_clustering(self, real: np.ndarray, synth: np.ndarray) -> Dict:
        """Test for volatility clustering (GARCH effect)."""
        real_sq = np.diff(real)**2
        synth_sq = np.diff(synth)**2
        
        real_acf = np.corrcoef(real_sq[:-1], real_sq[1:])[0, 1]
        synth_acf = np.corrcoef(synth_sq[:-1], synth_sq[1:])[0, 1]
        
        return {
            'real_autocorr': float(real_acf),
            'synth_autocorr': float(synth_acf),
            'match': abs(real_acf - synth_acf) < 0.2
        }
    
    def _test_fat_tails(self, real: np.ndarray, synth: np.ndarray) -> Dict:
        """Test for fat tails (kurtosis > 3)."""
        real_kurtosis = stats.kurtosis(real)
        synth_kurtosis = stats.kurtosis(synth)
        
        return {
            'real_kurtosis': float(real_kurtosis),
            'synth_kurtosis': float(synth_kurtosis),
            'real_fat_tails': real_kurtosis > 3,
            'synth_fat_tails': synth_kurtosis > 3,
            'match': abs(real_kurtosis - synth_kurtosis) < 5
        }
    
    def _test_leverage_effect(self, real: np.ndarray, synth: np.ndarray) -> Dict:
        """Test for leverage effect (negative correlation between returns and volatility)."""
        real_ret = np.diff(real)
        real_vol = np.abs(real_ret)
        
        synth_ret = np.diff(synth)
        synth_vol = np.abs(synth_ret)
        
        real_corr = np.corrcoef(real_ret[1:], real_vol[:-1])[0, 1]
        synth_corr = np.corrcoef(synth_ret[1:], synth_vol[:-1])[0, 1]
        
        return {
            'real_leverage_corr': float(real_corr),
            'synth_leverage_corr': float(synth_corr),
            'real_leverage': real_corr < -0.1,
            'synth_leverage': synth_corr < -0.1,
            'match': abs(real_corr - synth_corr) < 0.3
        }
    
    def _test_autocorrelation(self, real: np.ndarray, synth: np.ndarray) -> Dict:
        """Test autocorrelation structure."""
        real_acf = np.abs(np.correlate(real, real, mode='full'))
        synth_acf = np.abs(np.correlate(synth, synth, mode='full'))
        
        real_max_acf = np.max(real_acf[1:10])
        synth_max_acf = np.max(synth_acf[1:10])
        
        return {
            'real_max_acf': float(real_max_acf),
            'synth_max_acf': float(synth_max_acf),
            'match': abs(real_max_acf - synth_max_acf) < 0.5
        }
```