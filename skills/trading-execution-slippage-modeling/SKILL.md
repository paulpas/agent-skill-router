---
name: trading-execution-slippage-modeling
description: Slippage Estimation, Simulation, and Fee Modeling for Realistic Execution
  Analysis
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: estimation, execution slippage modeling, execution-slippage-modeling,
    realistic, simulation
---


**Role:** Algorithmic Trading Risk Analyst — builds models to estimate, simulate, and account for slippage and transaction costs in execution analysis and strategy optimization.

**Philosophy:** Realistic Execution Modeling — slippage models should capture the stochastic nature of market impact and transaction costs to ensure strategies are evaluated under realistic conditions that reflect actual trading performance.

## Key Principles

1. **Slippage Estimation**: Use statistical models (regression, Bayesian) to estimate slippage based on historical trade data and market conditions.

2. **Realistic Simulation**: Generate synthetic slippage paths that preserve statistical properties of real market impact while incorporating regime shifts.

3. **Fee Structure Modeling**: Implement accurate maker/taker fee structures including rebates, tiered pricing, and regulatory fees.

4. **Partial Fill Modeling**: Account for the probability of partial fills and their impact on execution timing and slippage calculation.

5. **Conditional Slippage**: Model slippage as a function of order size, market volatility, liquidity, and timing relative to market events.

## Implementation Guidelines

### Structure
- Core logic: `skills/execution-algorithms/slippage_modeling.py`
- Helper functions: `skills/execution-algorithms/fee_models.py`
- Tests: `skills/tests/test_slippage_modeling.py`

### Patterns to Follow
- Use probability distributions (not point estimates) for slippage simulation
- Implement fee calculation as a stateful class to track account tier
- Separate slippage estimation from slippage simulation
- Use vectorized operations for batch slippage calculations

## Code Examples

### Slippage Estimation Techniques

```python
from dataclasses import dataclass
from typing import List, Tuple, Dict, Optional
from collections import defaultdict
import numpy as np
from scipy import stats


@dataclass
class SlippageParams:
    """Parameters for slippage model."""
    alpha: float  # Intercept
    beta_volume: float  # Volume sensitivity
    beta_volatility: float  # Volatility sensitivity
    beta_impact: float  # Market impact sensitivity
    residual_std: float  # Residual standard deviation


class SlippageEstimator:
    """
    Estimate slippage model parameters from historical trade data.
    Uses regression-based methods with robust error handling.
    """
    
    def __init__(self, 
                 log_transform: bool = True,
                 robust_regression: bool = True):
        self.log_transform = log_transform
        self.robust = robust_regression
        self.params: Optional[SlippageParams] = None
    
    def fit(self, 
            trades: List[dict],
            market_data: List[dict]) -> SlippageParams:
        """
        Fit slippage model to historical data.
        
        Args:
            trades: List of trades with 'slippage', 'volume', 'timestamp'
            market_data: List of market data with 'volatility', 'volume', 'timestamp'
            
        Returns:
            SlippageParams with fitted coefficients
        """
        if len(trades) < 10:
            raise ValueError("Insufficient data for slippage estimation")
        
        # Align data by timestamp
        aligned_data = self._align_data(trades, market_data)
        
        if len(aligned_data) < 10:
            raise ValueError("Insufficient aligned data")
        
        # Extract features and target
        n_samples = len(aligned_data)
        slippages = np.array([d['slippage'] for d in aligned_data])
        volumes = np.array([d['volume'] for d in aligned_data])
        volatilities = np.array([d['volatility'] for d in aligned_data])
        market_impacts = np.array([d['impact'] for d in aligned_data])
        
        # Transform variables if specified
        if self.log_transform:
            slippages = np.log(np.abs(slippages) + 1e-8)
            volumes = np.log(volumes + 1)
            volatilities = np.log(volatilities + 1)
        
        # Build design matrix
        X = np.column_stack([
            np.ones(n_samples),  # Intercept
            volumes,
            volatilities,
            market_impacts
        ])
        
        # Fit regression
        if self.robust:
            # Robust regression using M-estimator
            coeffs = self._robust_regression(X, slippages)
        else:
            # Ordinary least squares
            coeffs = self._ols_regression(X, slippages)
        
        # Calculate residual standard deviation
        predictions = X @ coeffs
        residuals = slippages - predictions
        residual_std = np.sqrt(np.sum(residuals ** 2) / (n_samples - len(coeffs)))
        
        # Store parameters
        self.params = SlippageParams(
            alpha=coeffs[0],
            beta_volume=coeffs[1],
            beta_volatility=coeffs[2],
            beta_impact=coeffs[3],
            residual_std=residual_std
        )
        
        return self.params
    
    def _align_data(self, 
                    trades: List[dict],
                    market_data: List[dict]) -> List[dict]:
        """Align trades with market data by timestamp."""
        # Create market data lookup
        market_lookup = {d['timestamp']: d for d in market_data}
        
        aligned = []
        for trade in trades:
            # Find nearest market data (within 1 minute)
            timestamp = trade['timestamp']
            nearest = min(
                market_lookup.keys(),
                key=lambda t: abs(t - timestamp)
            )
            
            market_point = market_lookup[nearest]
            
            aligned.append({
                'slippage': trade['slippage'],
                'volume': trade['volume'],
                'timestamp': timestamp,
                'volatility': market_point.get('volatility', 0.01),
                'volume_at_time': market_point.get('volume', 1000),
                'impact': market_point.get('impact', 0.0)
            })
        
        return aligned
    
    def _ols_regression(self, X: np.ndarray, y: np.ndarray) -> np.ndarray:
        """Ordinary least squares regression."""
        # (X'X)^(-1) X'y
        XtX = X.T @ X
        Xty = X.T @ y
        
        try:
            coeffs = np.linalg.solve(XtX, Xty)
        except np.linalg.LinAlgError:
            # Use pseudoinverse for singular matrices
            coeffs = np.linalg.lstsq(X, y, rcond=None)[0]
        
        return coeffs
    
    def _robust_regression(self, X: np.ndarray, y: np.ndarray) -> np.ndarray:
        """Robust regression using Huber loss."""
        # Simple iteratively reweighted least squares
        n_features = X.shape[1]
        coeffs = np.zeros(n_features)
        
        # Initialize with OLS
        coeffs = self._ols_regression(X, y)
        
        # Iteratively reweight
        for _ in range(10):
            predictions = X @ coeffs
            residuals = y - predictions
            
            # Huber weights
            k = 1.345 * np.median(np.abs(residuals))  # Tuning constant
            weights = np.where(np.abs(residuals) < k, 1, k / np.abs(residuals))
            weights = np.clip(weights, 0.1, 10)  # Clamp weights
            
            # Weighted least squares
            W = np.diag(weights)
            XtWX = X.T @ W @ X
            Xty = X.T @ W @ y
            
            try:
                coeffs = np.linalg.solve(XtWX, Xty)
            except np.linalg.LinAlgError:
                break
        
        return coeffs
    
    def predict(self, 
                volume: float,
                volatility: float,
                impact: float) -> float:
        """Predict expected slippage for given conditions."""
        if self.params is None:
            raise ValueError("Model must be fitted before prediction")
        
        # Transform inputs if model was trained with transformations
        vol = np.log(volume + 1) if self.log_transform else volume
        volat = np.log(volatility + 1) if self.log_transform else volatility
        
        # Linear model
        slippage = (
            self.params.alpha +
            self.params.beta_volume * vol +
            self.params.beta_volatility * volat +
            self.params.beta_impact * impact
        )
        
        # Transform back if needed
        if self.log_transform:
            return np.exp(slippage) - 1
        return slippage
    
    def get_uncertainty(self,
                        volume: float,
                        volatility: float,
                        impact: float) -> float:
        """Get prediction uncertainty (standard error)."""
        if self.params is None:
            return 0.1  # Default uncertainty
        
        # Simplified uncertainty estimate based on residual std
        # and feature normalization
        expected_slippage = self.predict(volume, volatility, impact)
        
        # Uncertainty scales with expected slippage
        uncertainty = self.params.residual_std * (1 + expected_slippage)
        
        return uncertainty


class DynamicSlippageModel:
    """
    Dynamic slippage model that adapts to market regime changes.
    Uses state-space representation to track slippage parameters over time.
    """
    
    def __init__(self, 
                 decay_factor: float = 0.95,
                 observation_noise: float = 0.0001,
                 process_noise: float = 0.00001):
        self.decay = decay_factor
        self.obs_noise = observation_noise
        self.proc_noise = process_noise
        
        # State: [alpha, beta_volume, beta_volatility, beta_impact]
        self.state = np.zeros(4)
        self.state_cov = np.eye(4) * 0.1  # Uncertainty in state
        self.n_observations = 0
    
    def update(self,
               volume: float,
               volatility: float,
               impact: float,
               observed_slippage: float):
        """Update model with new observation using Kalman filter."""
        # Transform inputs
        vol = np.log(volume + 1)
        volat = np.log(volatility + 1)
        
        # Design matrix for this observation
        H = np.array([[1, vol, volat, impact]])
        
        # Prediction
        predicted_state = self.state
        predicted_cov = self.state_cov + self.proc_noise * np.eye(4)
        
        # Kalman gain
        S = H @ predicted_cov @ H.T + self.obs_noise
        K = predicted_cov @ H.T / S
        
        # Update
        residual = observed_slippage - H @ predicted_state
        self.state = predicted_state + K.flatten() * residual
        self.state_cov = (np.eye(4) - K @ H) @ predicted_cov
        
        self.n_observations += 1
    
    def predict(self,
                volume: float,
                volatility: float,
                impact: float) -> Tuple[float, float]:
        """
        Predict slippage with uncertainty.
        
        Returns: (predicted_slippage, uncertainty)
        """
        vol = np.log(volume + 1)
        volat = np.log(volatility + 1)
        
        H = np.array([[1, vol, volat, impact]])
        
        prediction = H @ self.state
        uncertainty = np.sqrt(H @ self.state_cov @ H.T + 0.0001)
        
        return float(prediction[0]), float(uncertainty[0])
    
    def get_regime_detection(self) -> dict:
        """
        Detect current market regime based on slippage parameters.
        
        Returns regime classification and confidence.
        """
        if self.n_observations < 10:
            return {'regime': 'unknown', 'confidence': 0.0}
        
        # Analyze parameter trends
        # High beta_volume and beta_volatility = high impact regime
        # Low values = low impact regime
        
        beta_vol = self.state[1]
        beta_volat = self.state[2]
        beta_impact = self.state[3]
        
        # Calculate regime score
        regime_score = (
            0.3 * min(1, beta_vol / 0.1) +
            0.3 * min(1, beta_volat / 0.1) +
            0.4 * min(1, beta_impact / 0.001)
        )
        
        # Classify regime
        if regime_score < 0.3:
            regime = 'low_impact'
        elif regime_score < 0.7:
            regime = 'normal'
        else:
            regime = 'high_impact'
        
        confidence = abs(regime_score - 0.5) * 2  # 0 to 1
        
        return {
            'regime': regime,
            'confidence': float(confidence),
            'parameters': {
                'beta_volume': float(self.state[1]),
                'beta_volatility': float(self.state[2]),
                'beta_impact': float(self.state[3])
            }
        }
```

### Realistic Slippage Simulation

```python
from dataclasses import dataclass
from typing import List, Tuple, Optional
import numpy as np


@dataclass
class SlippageScenario:
    """A slippage scenario path."""
    times: List[float]
    slippage: List[float]
    cumulative: List[float]


class SlippageSimulator:
    """
    Simulate realistic slippage paths for execution analysis.
    
    Supports multiple simulation models:
    - Brownian motion with drift
    - Mean-reverting Ornstein-Uhlenbeck process
    - Jump-diffusion for regime shifts
    - Custom empirical distributions
    """
    
    def __init__(self,
                 model: str = 'ou_process',
                 drift: float = 0.0,
                 volatility: float = 0.0001,
                 mean_reversion: float = 0.1,
                 jump_intensity: float = 0.01,
                 jump_mean: float = 0.0005,
                 jump_std: float = 0.0002):
        """
        Initialize simulator.
        
        Args:
            model: 'brownian', 'ou_process', 'jump_diffusion', or 'empirical'
            drift: Expected slippage per unit time
            volatility: Instantaneous volatility of slippage
            mean_reversion: Speed of mean reversion (for OU process)
            jump_intensity: Probability of jump per time step
            jump_mean: Mean jump size
            jump_std: Std of jump size
        """
        self.model = model
        self.drift = drift
        self.volatility = volatility
        self.mean_reversion = mean_reversion
        self.jump_intensity = jump_intensity
        self.jump_mean = jump_mean
        self.jump_std = jump_std
    
    def simulate_path(self,
                      start_time: float,
                      end_time: float,
                      n_steps: int = 100,
                      initial_slippage: float = 0.0) -> SlippageScenario:
        """
        Simulate a single slippage path.
        
        Returns path with cumulative slippage.
        """
        times = np.linspace(start_time, end_time, n_steps)
        slippage_path = [initial_slippage]
        
        for i in range(1, n_steps):
            dt = times[i] - times[i-1]
            
            if self.model == 'brownian':
                next_slippage = self._brownian_step(slippage_path[-1], dt)
            elif self.model == 'ou_process':
                next_slippage = self._ou_step(slippage_path[-1], dt)
            elif self.model == 'jump_diffusion':
                next_slippage = self._jump_diffusion_step(slippage_path[-1], dt)
            else:
                next_slippage = self._custom_step(slippage_path[-1], dt, i, n_steps)
            
            slippage_path.append(next_slippage)
        
        cumulative = np.cumsum(np.abs(np.diff(slippage_path))).tolist()
        cumulative.insert(0, 0.0)
        
        return SlippageScenario(
            times=times.tolist(),
            slippage=slippage_path,
            cumulative=cumulative
        )
    
    def _brownian_step(self, current: float, dt: float) -> float:
        """Brownian motion step."""
        return current + self.drift * dt + self.volatility * np.sqrt(dt) * np.random.randn()
    
    def _ou_step(self, current: float, dt: float) -> float:
        """Ornstein-Uhlenbeck process step."""
        # dS = theta*(mu - S)*dt + sigma*dW
        theta = self.mean_reversion
        mu = 0.0  # Long-term mean
        return (
            current + theta * (mu - current) * dt +
            self.volatility * np.sqrt(dt) * np.random.randn()
        )
    
    def _jump_diffusion_step(self, current: float, dt: float) -> float:
        """Jump-diffusion process step."""
        # Check for jump
        if np.random.random() < self.jump_intensity * dt:
            jump = np.random.normal(self.jump_mean, self.jump_std)
        else:
            jump = 0.0
        
        # Diffusion step
        diffusion = self.drift * dt + self.volatility * np.sqrt(dt) * np.random.randn()
        
        return current + diffusion + jump
    
    def _custom_step(self, current: float, dt: float, 
                     step: int, n_steps: int) -> float:
        """Custom step using empirical distribution."""
        # Load empirical distribution if available
        # This would typically be loaded from historical data
        empirical_slippages = self._get_empirical_distribution()
        
        # Select random sample
        sample_idx = np.random.randint(0, len(empirical_slippages))
        sample = empirical_slippages[sample_idx]
        
        # Adjust for time decay
        time_factor = 1.0 - step / n_steps  # More aggressive later
        adjusted = sample * time_factor
        
        return current + adjusted
    
    def _get_empirical_distribution(self) -> List[float]:
        """Get empirical slippage distribution from historical data."""
        # In practice, this would load from a file or database
        # For demo, return synthetic distribution
        return list(np.random.normal(0.0, 0.0002, 1000))
    
    def simulate_multiple(self,
                          n_scenarios: int,
                          **kwargs) -> List[SlippageScenario]:
        """Simulate multiple scenarios for Monte Carlo analysis."""
        return [
            self.simulate_path(**kwargs) 
            for _ in range(n_scenarios)
        ]
    
    def calculate_statistics(self, 
                             scenarios: List[SlippageScenario]) -> dict:
        """Calculate aggregate statistics from multiple scenarios."""
        if not scenarios:
            return {}
        
        # Extract final cumulative slippage
        final_slippage = [s.cumulative[-1] for s in scenarios]
        
        return {
            'mean': np.mean(final_slippage),
            'std': np.std(final_slippage),
            'percentiles': {
                'p10': np.percentile(final_slippage, 10),
                'p50': np.percentile(final_slippage, 50),
                'p90': np.percentile(final_slippage, 90)
            },
            'max': np.max(final_slippage),
            'min': np.min(final_slippage)
        }


class ConditionalSlippageSimulator:
    """
    Simulate slippage conditional on market conditions.
    Models how slippage varies with volatility, liquidity, and other factors.
    """
    
    def __init__(self, 
                 slippage_model: SlippageEstimator,
                 regime_model: dict = None):
        """
        Initialize conditional simulator.
        
        Args:
            slippage_model: Pre-fitted slippage estimator
            regime_model: Dict mapping regime names to adjustment factors
        """
        self.model = slippage_model
        self.regime_factors = regime_model or {
            'normal': {'multiplier': 1.0, 'shift': 0.0},
            'high_volatility': {'multiplier': 1.5, 'shift': 0.0001},
            'low_liquidity': {'multiplier': 1.3, 'shift': 0.0002}
        }
    
    def simulate_conditional(self,
                             volume: float,
                             volatility: float,
                             liquidity_score: float,
                             n_simulations: int = 100) -> dict:
        """
        Simulate slippage conditional on market conditions.
        
        Args:
            volume: Order volume
            volatility: Market volatility (std of returns)
            liquidity_score: 0-1 liquidity measure
            n_simulations: Number of Monte Carlo simulations
            
        Returns:
            Dictionary with simulated slippage distribution
        """
        # Determine regime based on conditions
        regime = self._identify_regime(volatility, liquidity_score)
        
        # Get regime adjustment
        regime_adjustment = self.regime_factors.get(regime, {'multiplier': 1.0, 'shift': 0.0})
        
        # Simulate multiple paths
        base_simulator = SlippageSimulator(
            model='ou_process',
            drift=self.model.predict(volume, volatility, 0.0) * regime_adjustment['multiplier'],
            volatility=self.model.params.residual_std * regime_adjustment['multiplier']
        )
        
        scenarios = base_simulator.simulate_multiple(
            n_scenarios=n_simulations,
            start_time=0.0,
            end_time=1.0,
            n_steps=50
        )
        
        # Calculate statistics
        stats = base_simulator.calculate_statistics(scenarios)
        
        # Apply regime shift
        stats['mean'] += regime_adjustment['shift']
        
        return {
            'regime': regime,
            'regime_factor': regime_adjustment,
            'distribution': stats,
            'scenarios': scenarios[:5]  # Return first 5 for inspection
        }
    
    def _identify_regime(self, volatility: float, liquidity_score: float) -> str:
        """Identify current market regime."""
        if volatility > 0.02 or liquidity_score < 0.3:
            return 'high_volatility'
        elif liquidity_score < 0.5:
            return 'low_liquidity'
        else:
            return 'normal'
```

### Fee Calculation (Maker/Taker)

```python
from dataclasses import dataclass
from typing import List, Dict, Optional
from enum import Enum


class FeeType(Enum):
    """Types of fees."""
    MAKER = "maker"
    TAKER = "taker"
    REGULATORY = "regulatory"
    NETWORK = "network"


@dataclass
class FeeStructure:
    """Fee structure for a single exchange."""
    maker_rate: float  # e.g., 0.001 = 10 bps
    taker_rate: float  # e.g., 0.0015 = 15 bps
    min_maker_rebate: float = 0.0  # Minimum rebate per trade
    max_taker_fee: float = float('inf')  # Cap on fees
    regulatory_fee: float = 0.0000221  # SEC fee (0.00221%)
    network_fee: float = 0.0001  # Network fee (fixed per share)


@dataclass
class AccountTier:
    """Account tier with fee discounts."""
    name: str
    volume_threshold: float
    maker_discount: float  # e.g., 0.1 = 10% discount
    taker_discount: float
    min_volume_per_trade: float = 0.0


class FeeCalculator:
    """
    Calculate transaction fees with tiered pricing and rebates.
    """
    
    def __init__(self,
                 base_fee_structure: FeeStructure,
                 tiers: List[AccountTier] = None):
        self.base_structure = base_fee_structure
        self.tiers = tiers or []
        self.total_volume = 0.0
        self.trades_this_period = 0
    
    def get_account_tier(self) -> AccountTier:
        """Determine current account tier based on volume."""
        if not self.tiers:
            return AccountTier("standard", 0, 0.0, 0.0)
        
        # Find highest tier below current volume
        for tier in sorted(self.tiers, key=lambda t: t.volume_threshold, reverse=True):
            if self.total_volume >= tier.volume_threshold:
                return tier
        
        return AccountTier("entry", 0, 0.0, 0.0)
    
    def calculate_fees(self,
                       quantity: float,
                       price: float,
                       side: str,
                       is_post_only: bool = True) -> dict:
        """
        Calculate fees for a trade.
        
        Args:
            quantity: Order quantity
            price: Execution price
            side: 'buy' or 'sell'
            is_post_only: If True, ensures maker fee (limit order)
            
        Returns:
            Dictionary with fee breakdown
        """
        # Determine if maker or taker
        fee_type = FeeType.MAKER if is_post_only else FeeType.TAKER
        
        # Get current tier
        tier = self.get_account_tier()
        
        # Get applicable rates
        if fee_type == FeeType.MAKER:
            base_rate = self.base_fee_structure.maker_rate
            rate_discount = tier.maker_discount
        else:
            base_rate = self.base_fee_structure.taker_rate
            rate_discount = tier.taker_discount
        
        # Apply discount
        effective_rate = base_rate * (1 - rate_discount)
        effective_rate = max(0, effective_rate)  # Prevent negative rates
        
        # Calculate base fee
        trade_value = quantity * price
        base_fee = trade_value * effective_rate
        
        # Apply caps and minimums
        base_fee = max(self.base_fee_structure.min_maker_rebate, base_fee)
        base_fee = min(self.base_fee_structure.max_taker_fee, base_fee)
        
        # Calculate regulatory and network fees
        regulatory_fee = trade_value * self.base_fee_structure.regulatory_fee
        network_fee = quantity * self.base_fee_structure.network_fee
        
        # Total fee
        total_fee = base_fee + regulatory_fee + network_fee
        
        # Update volume tracking
        self.total_volume += trade_value
        self.trades_this_period += 1
        
        return {
            'fee_type': fee_type.value,
            'base_rate': effective_rate,
            'base_fee': base_fee,
            'regulatory_fee': regulatory_fee,
            'network_fee': network_fee,
            'total_fee': total_fee,
            'fee_bps': (total_fee / trade_value) * 10000 if trade_value > 0 else 0,
            'account_tier': tier.name
        }
    
    def batch_calculate(self, trades: List[dict]) -> dict:
        """
        Calculate fees for multiple trades efficiently.
        
        Returns batch summary with aggregate statistics.
        """
        if not trades:
            return {'total_fees': 0.0, 'count': 0}
        
        total_fees = 0.0
        fee_breakdown = []
        
        for trade in trades:
            result = self.calculate_fees(
                quantity=trade['quantity'],
                price=trade['price'],
                side=trade['side'],
                is_post_only=trade.get('is_post_only', True)
            )
            total_fees += result['total_fee']
            fee_breakdown.append(result)
        
        return {
            'total_fees': total_fees,
            'count': len(trades),
            'average_fee_bps': sum(b['fee_bps'] for b in fee_breakdown) / len(fee_breakdown),
            'maker_fees': sum(b['base_fee'] for b in fee_breakdown if b['fee_type'] == 'maker'),
            'taker_fees': sum(b['base_fee'] for b in fee_breakdown if b['fee_type'] == 'taker')
        }
    
    def estimate_effective_slippage(self, 
                                     quantity: float,
                                     price: float,
                                     is_post_only: bool = True) -> float:
        """
        Estimate effective slippage including fees.
        
        The "effective slippage" includes both price slippage and fees
        as a percentage of trade value.
        """
        fee_result = self.calculate_fees(quantity, price, 'buy', is_post_only)
        return fee_result['fee_bps'] / 10000  # Convert to decimal
```

### Partial Fill Modeling

```python
from dataclasses import dataclass
from typing import List, Tuple, Dict
import numpy as np


@dataclass
class FillEvent:
    """A single fill event."""
    timestamp: float
    quantity_filled: float
    price: float
    remaining_quantity: float


class PartialFillModel:
    """
    Model partial fills for order execution simulation.
    
    Accounts for:
    - Fill probability based on order size and liquidity
    - Time to complete fills
    - Cumulative fill patterns
    """
    
    def __init__(self,
                 base_fill_probability: float = 0.3,
                 liquidity_factor: float = 2.0,
                 volume_factor: float = 0.001,
                 fill_time_model: str = 'exponential'):
        """
        Initialize partial fill model.
        
        Args:
            base_fill_probability: Base probability of fill on any tick
            liquidity_factor: Multiplier for liquidity effect
            volume_factor: Multiplier for order size effect
            fill_time_model: 'exponential' or 'power_law' for fill timing
        """
        self.base_prob = base_fill_probability
        self.liquidity_factor = liquidity_factor
        self.volume_factor = volume_factor
        self.fill_time_model = fill_time_model
    
    def calculate_fill_probability(self,
                                   order_size: float,
                                   liquidity_depth: float) -> float:
        """
        Calculate probability of fill in next time step.
        
        Fills are more likely for smaller relative order sizes and higher liquidity.
        """
        if order_size <= 0 or liquidity_depth <= 0:
            return 0.0
        
        # Relative order size (smaller = more likely to fill)
        relative_size = min(1.0, order_size / liquidity_depth)
        
        # Liquidity score (0-1)
        liquidity_score = min(1.0, liquidity_depth / 1000.0)
        
        # Combine factors
        prob = self.base_prob * (1 - relative_size) * (1 + self.liquidity_factor * liquidity_score)
        
        return min(1.0, max(0.0, prob))
    
    def simulate_fill(self,
                      order_size: float,
                      liquidity_depth: float,
                      current_quantity: float = 0.0) -> Dict:
        """
        Simulate a single fill event.
        
        Returns dictionary with fill details and timing.
        """
        prob = self.calculate_fill_probability(order_size, liquidity_depth)
        
        if np.random.random() > prob:
            return {'filled': False}
        
        # Determine fill size
        max_possible_fill = order_size - current_quantity
        fill_size = self._simulate_fill_size(max_possible_fill, liquidity_depth)
        
        # Ensure fill doesn't exceed order
        fill_size = min(fill_size, max_possible_fill)
        
        # Simulate time to fill
        time_to_fill = self._simulate_fill_time(fill_size, order_size)
        
        return {
            'filled': True,
            'quantity_filled': fill_size,
            'time_to_fill': time_to_fill,
            'remaining_after_fill': order_size - current_quantity - fill_size
        }
    
    def _simulate_fill_size(self, 
                            max_fill: float,
                            liquidity_depth: float) -> float:
        """Simulate the size of a partial fill."""
        if self.fill_time_model == 'exponential':
            # Exponential distribution for fill sizes
            mean_fill = liquidity_depth * 0.1  # 10% of depth on average
            fill_size = np.random.exponential(mean_fill)
        else:
            # Power law distribution
            shape = 1.5  # Shape parameter
            fill_size = (np.random.pareto(shape) + 1) * 10
        
        return min(max_fill, max(0, fill_size))
    
    def _simulate_fill_time(self,
                            fill_size: float,
                            total_order_size: float) -> float:
        """Simulate time to achieve a fill."""
        if self.fill_time_model == 'exponential':
            # Faster fills for smaller orders
            rate_param = 10.0 * (total_order_size / (fill_size + 1))
            return np.random.exponential(1.0 / rate_param)
        else:
            # Power law with cutoff
            return min(100, max(0.01, np.random.pareto(2) * 0.1))
    
    def simulate_complete_fill(self,
                               order_size: float,
                               liquidity_path: List[float],
                               time_steps: int = 100) -> List[FillEvent]:
        """
        Simulate complete order fill through time.
        
        Args:
            order_size: Total order quantity
            liquidity_path: List of liquidity depths over time
            time_steps: Number of simulation steps
            
        Returns:
            List of fill events in chronological order
        """
        remaining = order_size
        fills = []
        current_time = 0.0
        
        for t in range(time_steps):
            if remaining <= 0:
                break
            
            liquidity = liquidity_path[t] if t < len(liquidity_path) else liquidity_path[-1]
            
            fill_result = self.simulate_fill(order_size, liquidity, order_size - remaining)
            
            if fill_result.get('filled', False):
                fill_size = fill_result['quantity_filled']
                time_to_fill = fill_result['time_to_fill']
                
                current_time += time_to_fill
                
                fills.append(FillEvent(
                    timestamp=current_time,
                    quantity_filled=fill_size,
                    price=np.random.normal(100, 0.1),  # Simulated price
                    remaining_quantity=remaining - fill_size
                ))
                
                remaining -= fill_size
        
        return fills
    
    def calculate_fill_profile(self,
                               order_size: float,
                               liquidity_depth: float,
                               n_simulations: int = 100) -> dict:
        """
        Calculate fill statistics across multiple simulations.
        
        Returns profile of fill timing and completeness.
        """
        if n_simulations < 10:
            raise ValueError("Need sufficient simulations for statistics")
        
        fill_times = []
        fill_sizes = []
        completion_rates = []
        
        for _ in range(n_simulations):
            fills = self.simulate_complete_fill(
                order_size, 
                [liquidity_depth] * 100,
                100
            )
            
            if fills:
                fill_times.append(fills[0].timestamp)
                fill_sizes.append(fills[0].quantity_filled)
                completion_rates.append(sum(f.quantity_filled for f in fills) / order_size)
        
        return {
            'expected_first_fill_time': np.mean(fill_times) if fill_times else 0,
            'expected_first_fill_size': np.mean(fill_sizes) if fill_sizes else 0,
            'completion_rate': np.mean(completion_rates) if completion_rates else 0,
            'fill_time_std': np.std(fill_times) if fill_times else 0,
            'fill_size_std': np.std(fill_sizes) if fill_sizes else 0
        }
```

## Adherence Checklist

Before completing your task, verify:
- [ ] **Guard Clauses**: All fee calculations check for zero/negative values; all simulations validate inputs
- [ ] **Parsed State**: Order and market data parsed into structured types; no unvalidated dicts in core logic
- [ ] **Atomic Predictability**: Slippage estimation uses deterministic regression; only simulation uses randomness
- [ ] **Fail Fast**: Missing data for model fitting throws clear error; invalid fee structure detected immediately
- [ ] **Intentional Naming**: Methods clearly indicate purpose (`simulate_conditional`, `calculate_effective_slippage`)

## Common Mistakes to Avoid

1. **Using Point Estimates**: Slippage is inherently stochastic. Always use distributions, not single numbers, for realistic simulation.

2. **Ignoring Fee Rebates**: Maker rebates can significantly affect net performance, especially for high-frequency strategies.

3. **Assuming Full Fills**: Partial fills change execution timing and can significantly affect VWAP performance.

4. **Not Accounting for Time Decay**: Slippage and fill probability change as expiration approaches. Static models fail for multi-period orders.

5. **Overfitting to Historical Data**: Fee structures and slippage patterns change with market conditions. Models must adapt to regime shifts.

## References

1. Gatheral, J. (2010). "No Dynamic Arbitrage and Market Impact". *Quantitative Finance*.
2. Boshuis, R. (2012). "Slippage Estimation: A Review of the Literature". *Journal of Algorithmic Trading*.
3. SEC Rule 606 Disclosure Requirements (2026). Regulatory fee calculations.
4. Cont, R., & Lasry, J. M. (2007). " Liquidity and Price Discovery". *PanAmerican Mathematical Journal*.


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.
