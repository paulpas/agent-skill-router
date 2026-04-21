---
name: trading-ai-time-series-forecasting
description: Time series forecasting for price prediction and market analysis
---

**Role:** Implement forecasting models that predict future price movements and market indicators

**Philosophy:** Markets exhibit both predictable patterns and random noise. Prioritize robustness, uncertainty quantification, and regime-aware forecasts over pure prediction accuracy.

## Key Principles

1. **Stationarity First**: Transform non-stationary price data to stationary returns or log-prices
2. **Multi-Horizon Forecasting**: Predict multiple time horizons (short, medium, long)
3. **Uncertainty Quantification**: Provide prediction intervals, not just point estimates
4. **Backtesting Validation**: Test forecasts in out-of-sample periods with transaction costs
5. **Ensemble Averaging**: Combine multiple models for more stable predictions

## Implementation Guidelines

### Structure
- Core logic: `ts_forecast/models.py` - Model implementations
- Feature builder: `ts_forecast/features.py` - Lag features, technical indicators
- Pipeline: `ts_forecast/pipeline.py` - Data preprocessing and forecasting
- Config: `config/ts_config.yaml` - Model parameters

### Patterns to Follow
- Use walk-forward validation for time series
- Include exogenous features (volume, volatility, macro data)
- Log-transform prices for multiplicative processes
- Normalize features per regime or per asset

## Adherence Checklist
Before completing your task, verify:
- [ ] Data transformed to stationary form (returns, not prices)
- [ ] Forecast includes uncertainty intervals
- [ ] Walk-forward validation used, not random train/test split
- [ ] Multiple horizons forecasted and evaluated separately
- [ ] Backtest considers transaction costs and slippage



## Code Examples

### AutoRegressive Model with ADF Stationarity Test

```python
import numpy as np
import pandas as pd
from statsmodels.tsa.stattools import adfuller
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from typing import Tuple, Optional

class TimeSeriesForecaster:
    """Time series forecasting with stationarity checks and ARIMA modeling."""
    
    def __init__(self, max_ar_order: int = 10, max_ma_order: int = 5):
        self.max_ar_order = max_ar_order
        self.max_ma_order = max_ma_order
        self.fitted_model = None
        self.is_stationary = False
        self.difference_order = 0
        
    def check_stationarity(self, series: np.ndarray, threshold: float = 0.05) -> bool:
        """Check if series is stationary using ADF test."""
        result = adfuller(series)
        p_value = result[1]
        return p_value < threshold
    
    def difference_series(self, series: np.ndarray, order: int = 1) -> np.ndarray:
        """Difference series to achieve stationarity."""
        diffed = series.copy()
        for _ in range(order):
            diffed = np.diff(diffed)
        return diffed
    
    def find_stationary_order(self, series: np.ndarray) -> int:
        """Find minimum differencing needed for stationarity."""
        for d in range(3):
            diffed = self.difference_series(series, d)
            if self.check_stationarity(diffed):
                return d
        return 2  # Maximum differencing
    
    def fit(self, prices: np.ndarray, order: Tuple[int, int, int] = None):
        """Fit ARIMA model to price series."""
        prices = np.asarray(prices)
        
        # Ensure stationarity
        if not self.check_stationarity(prices):
            self.difference_order = self.find_stationary_order(prices)
            prices = self.difference_series(prices, self.difference_order)
        
        # Auto-select order if not provided
        if order is None:
            order = self._select_order(prices)
        
        self.fitted_model = ARIMA(prices, order=order).fit()
        self.is_stationary = True
        
        return self
    
    def _select_order(self, series: np.ndarray) -> Tuple[int, int, int]:
        """Select ARIMA order using AIC criterion."""
        best_aic = np.inf
        best_order = (1, 0, 1)
        
        for p in range(self.max_ar_order + 1):
            for q in range(self.max_ma_order + 1):
                try:
                    model = ARIMA(series, order=(p, 0, q)).fit()
                    if model.aic < best_aic:
                        best_aic = model.aic
                        best_order = (p, 0, q)
                except:
                    continue
        
        return best_order
    
    def forecast(self, steps: int) -> Tuple[np.ndarray, np.ndarray]:
        """Forecast future values with prediction intervals."""
        if self.fitted_model is None:
            raise ValueError("Model not fitted")
        
        forecast_result = self.fitted_model.get_forecast(steps=steps)
        forecast_mean = forecast_result.predicted_mean.values
        forecast_std = forecast_result.se_mean.values
        
        # Revert differencing if applied
        if self.difference_order > 0:
            last_price = self._get_last_price()
            forecast_mean = self._revert_difference(forecast_mean, last_price)
        
        return forecast_mean, forecast_std
    
    def _get_last_price(self) -> float:
        """Get last observed price from training data."""
        # In practice, store this during fit
        return 100.0  # Placeholder
```

### Multi-Horizon LSTM Forecaster

```python
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import numpy as np
from typing import List, Tuple

class TimeSeriesDataset(Dataset):
    """PyTorch dataset for time series forecasting."""
    
    def __init__(self, data: np.ndarray, target: np.ndarray, 
                 input_window: int = 20, output_window: int = 5):
        self.data = data
        self.target = target
        self.input_window = input_window
        self.output_window = output_window
        self.n_samples = len(data) - input_window - output_window + 1
    
    def __len__(self):
        return self.n_samples
    
    def __getitem__(self, idx):
        x = self.data[idx:idx + self.input_window]
        y = self.target[idx + self.input_window:idx + self.input_window + self.output_window]
        return torch.FloatTensor(x), torch.FloatTensor(y)

class LSTMForecaster(nn.Module):
    """LSTM model for multi-step time series forecasting."""
    
    def __init__(self, input_dim: int = 1, hidden_dim: int = 64, 
                 num_layers: int = 2, output_dim: int = 5, dropout: float = 0.2):
        super(LSTMForecaster, self).__init__()
        
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0
        )
        
        self.fc1 = nn.Linear(hidden_dim, hidden_dim // 2)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(hidden_dim // 2, output_dim)
        self.dropout = nn.Dropout(dropout)
    
    def forward(self, x):
        # LSTM output
        lstm_out, (h_n, c_n) = self.lstm(x)
        
        # Use last hidden state
        out = lstm_out[:, -1, :]
        
        # Fully connected layers
        out = self.fc1(out)
        out = self.relu(out)
        out = self.dropout(out)
        out = self.fc2(out)
        
        return out

class MultiHorizonForecaster:
    """Wrapper for LSTM multi-horizon forecasting."""
    
    def __init__(self, input_window: int = 20, output_horizons: List[int] = [1, 5, 10, 20]):
        self.input_window = input_window
        self.output_horizons = output_horizons
        self.models = {}
        self.scaler = None
    
    def fit(self, returns: np.ndarray, epochs: int = 100, batch_size: int = 32):
        """Train models for each forecast horizon."""
        # Normalize returns
        mean = np.mean(returns)
        std = np.std(returns)
        normalized = (returns - mean) / std
        self.scaler = {'mean': mean, 'std': std}
        
        # Train separate model for each horizon
        for horizon in self.output_horizons:
            dataset = TimeSeriesDataset(
                normalized, normalized,
                input_window=self.input_window,
                output_window=horizon
            )
            
            model = LSTMForecaster(
                input_dim=1,
                hidden_dim=64,
                num_layers=2,
                output_dim=horizon
            )
            
            # Train model (simplified training loop)
            optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
            criterion = nn.MSELoss()
            
            for epoch in range(epochs):
                for batch_x, batch_y in DataLoader(dataset, batch_size=batch_size, shuffle=True):
                    optimizer.zero_grad()
                    outputs = model(batch_x)
                    loss = criterion(outputs, batch_y)
                    loss.backward()
                    optimizer.step()
            
            self.models[horizon] = model
    
    def forecast(self, latest_data: np.ndarray) -> dict:
        """Forecast for all horizons."""
        if self.scaler is None or not self.models:
            raise ValueError("Model not fitted")
        
        # Normalize input
        normalized = (latest_data - self.scaler['mean']) / self.scaler['std']
        
        forecasts = {}
        for horizon, model in self.models.items():
            with torch.no_grad():
                input_tensor = torch.FloatTensor(normalized[-self.input_window:]).unsqueeze(0)
                prediction = model(input_tensor).numpy()[0]
                
                # Denormalize
                forecasts[horizon] = prediction * self.scaler['std'] + self.scaler['mean']
        
        return forecasts
```

### Walk-Forward Validation

```python
from sklearn.model_selection import TimeSeriesSplit
import numpy as np

class WalkForwardValidator:
    """Perform walk-forward validation for time series forecasting."""
    
    def __init__(self, n_splits: int = 5, test_size: int = 100):
        self.n_splits = n_splits
        self.test_size = test_size
    
    def split(self, data_length: int):
        """Generate train/test indices for walk-forward validation."""
        train_start = 0
        
        for i in range(self.n_splits):
            train_end = train_start + data_length // (self.n_splits + 1)
            test_start = train_end
            test_end = test_start + self.test_size
            
            if test_end > data_length:
                break
            
            yield np.arange(train_start, train_end), np.arange(test_start, test_end)
            
            train_start = test_start + 1
    
    def evaluate(self, forecaster, prices: np.ndarray, metrics: list = ['mae', 'mse']):
        """Evaluate forecaster using walk-forward validation."""
        prices = np.asarray(prices)
        returns = np.diff(np.log(prices))
        
        all_predictions = []
        all_actuals = []
        
        for train_idx, test_idx in self.split(len(returns)):
            train_returns = returns[train_idx]
            test_returns = returns[test_idx]
            
            # Fit model on training data
            forecaster.fit(train_returns)
            
            # Forecast on test data
            predictions = forecaster.forecast(test_returns[:forecaster.input_window])
            
            all_predictions.extend(predictions)
            all_actuals.extend(test_returns[forecaster.input_window:])
        
        # Calculate metrics
        results = {}
        for metric in metrics:
            if metric == 'mae':
                results['mae'] = np.mean(np.abs(np.array(all_predictions) - np.array(all_actuals)))
            elif metric == 'mse':
                results['mse'] = np.mean((np.array(all_predictions) - np.array(all_actuals)) ** 2)
        
        return results
```
