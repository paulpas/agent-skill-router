---
name: trading-ai-reinforcement-learning
description: Reinforcement Learning for automated trading agents and policy optimization
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: ai reinforcement learning, ai-reinforcement-learning, automated, trading, agents
---

**Role:** Design and implement RL agents that learn optimal trading strategies through interaction with market environments

**Philosophy:** Trading is a sequential decision-making problem where agents learn from trial and error. Emphasize sample efficiency, stability, and generalization across market regimes.

## Key Principles

1. **Environment Design**: Simulate realistic market conditions including transaction costs, slippage, and latency
2. **State Representation**: Include price features, order book dynamics, and portfolio state
3. **Reward Engineering**: Balance profit with risk constraints and transaction costs
4. **Algorithm Selection**: Prefer stable algorithms (PPO, SAC) over basic DQN for continuous action spaces
5. **Backtesting Integration**: Validate policies in simulated environments before live deployment

## Implementation Guidelines

### Structure
- Core logic: `rl/trading_agent.py` - Agent class with policy network
- Environment: `rl/market_env.py` - Custom gym environment
- Training: `rl/train.py` - Training loop with callbacks
- Config: `config/rl_config.yaml` - Hyperparameters and paths

### Patterns to Follow
- Use Stable Baselines3 or RLlib for production algorithms
- Implement vectorized environments for parallel training
- Add monitoring callbacks for metrics and early stopping
- Save both policy and environment state for reproducibility

## Adherence Checklist
Before completing your task, verify:
- [ ] Environment simulates realistic trading constraints (costs, limits)
- [ ] State space includes both market and portfolio features
- [ ] Reward function penalizes excessive trading and drawdowns
- [ ] Policy uses continuous actions (position size/alpha) not discrete
- [ ] Training includes validation in out-of-sample periods



## Code Examples

### Basic Trading Environment

```python
import gymnasium as gym
import numpy as np
from typing import Dict, Tuple

class TradingEnvironment(gym.Env):
    """Simple trading environment with transaction costs."""
    
    def __init__(self, prices: np.ndarray, initial_capital: float = 10000.0):
        super().__init__()
        self.prices = prices
        self.initial_capital = initial_capital
        self.n_steps = len(prices)
        
        # Action: -1 (sell), 0 (hold), 1 (buy) scaled to position size
        self.action_space = gym.spaces.Box(
            low=-1.0, high=1.0, shape=(1,), dtype=np.float32
        )
        
        # Observation: [price, position, cash, return_1d, return_5d, volatility]
        self.observation_space = gym.spaces.Box(
            low=-np.inf, high=np.inf, shape=(6,), dtype=np.float32
        )
        
        self.current_step = 0
        self.position = 0.0
        self.cash = initial_capital
        self.transaction_cost = 0.001  # 0.1% per trade
        
    def reset(self, seed=None):
        super().reset(seed=seed)
        self.current_step = 0
        self.position = 0.0
        self.cash = self.initial_capital
        return self._get_observation(), {}
    
    def _get_observation(self) -> np.ndarray:
        """Build state vector from market and portfolio data."""
        if self.current_step < 20:
            return np.array([100.0, 0.0, self.cash, 0.0, 0.0, 0.01], dtype=np.float32)
        
        price = self.prices[self.current_step]
        price_1d = self.prices[self.current_step - 1]
        price_5d = self.prices[self.current_step - 5]
        
        return_1d = (price - price_1d) / price_1d
        return_5d = (price - price_5d) / price_5d
        prices_window = self.prices[max(0, self.current_step-20):self.current_step]
        volatility = np.std(np.diff(np.log(prices_window))) if len(prices_window) > 1 else 0.01
        
        return np.array([
            price / 100.0,           # Normalized price
            self.position,           # Current position
            self.cash / self.initial_capital,  # Normalized cash
            return_1d,               # 1-day return
            return_5d,               # 5-day return
            volatility               # Historical volatility
        ], dtype=np.float32)
    
    def step(self, action: np.ndarray) -> Tuple[np.ndarray, float, bool, bool, Dict]:
        """Execute trading action and return new state."""
        action = np.clip(action, -1.0, 1.0)[0]
        
        current_price = self.prices[self.current_step]
        position_change = action - self.position
        
        # Calculate transaction costs
        cost = abs(position_change) * current_price * self.transaction_cost
        
        # Update position and cash
        self.position = action
        self.cash -= position_change * current_price + cost
        
        # Calculate reward: P&L plus risk penalty
        previous_value = self.position * current_price + self.cash
        self.current_step += 1
        
        if self.current_step >= self.n_steps:
            done = True
            reward = (self.cash + self.position * self.prices[-1]) / self.initial_capital - 1.0
        else:
            done = False
            next_price = self.prices[self.current_step]
            reward = self.position * (next_price - current_price) / current_price
            reward -= 0.01 * abs(position_change)  # Penalty for excessive trading
            reward -= 0.001 * np.std([reward]) if hasattr(self, 'rewards') else 0  # Risk aversion
        
        return self._get_observation(), reward, done, False, {}
```

### PPO Trading Agent

```python
from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.callbacks import CheckpointCallback
import numpy as np

class TradingAgent:
    """RL agent for trading using PPO algorithm."""
    
    def __init__(self, environment_params: Dict):
        self.env = make_vec_env(
            lambda: TradingEnvironment(**environment_params),
            n_envs=4
        )
        self.model = PPO(
            "MlpPolicy",
            self.env,
            verbose=1,
            n_steps=2048,
            batch_size=64,
            n_epochs=10,
            gamma=0.99,
            gae_lambda=0.95,
            ent_coef=0.01,
            clip_range=0.2,
            learning_rate=3e-4,
            policy_kwargs=dict(
                net_arch=[256, 128, 64],
                activation_fn=torch.nn.ReLU
            )
        )
    
    def train(self, total_timesteps: int = 100000):
        """Train the agent with checkpointing."""
        checkpoint_callback = CheckpointCallback(
            save_freq=10000,
            save_path="./models/",
            name_prefix="ppo_trading_agent"
        )
        
        self.model.learn(
            total_timesteps=total_timesteps,
            callback=checkpoint_callback
        )
    
    def predict(self, observation: np.ndarray) -> np.ndarray:
        """Get trading action for given state."""
        action, _ = self.model.predict(observation, deterministic=True)
        return action
    
    def save(self, path: str):
        """Save trained model."""
        self.model.save(path)
    
    def load(self, path: str):
        """Load trained model."""
        self.model = PPO.load(path)
```

### Risk-Adjusted Reward Function

```python
def risk_adjusted_reward(
    returns: np.ndarray,
    position: float,
    max_position: float = 1.0,
    risk_aversion: float = 0.5
) -> float:
    """Calculate reward with risk penalties."""
    # Sharp ratio approximation
    if len(returns) > 1 and np.std(returns) > 0:
        sharpe = np.mean(returns) / np.std(returns)
    else:
        sharpe = 0.0
    
    # Position penalty (avoid over-concentration)
    position_penalty = risk_aversion * (abs(position) / max_position) ** 2
    
    # Drawdown penalty
   cumulative_returns = np.cumsum(returns)
    running_max = np.maximum.accumulate(cumulative_returns)
    drawdown = running_max - cumulative_returns
    max_drawdown = np.max(drawdown) if len(drawdown) > 0 else 0.0
    drawdown_penalty = risk_aversion * 0.1 * max_drawdown
    
    return sharpe - position_penalty - drawdown_penalty

def transaction_cost(prices: np.ndarray, positions: np.ndarray, rate: float = 0.001) -> float:
    """Calculate total transaction costs."""
    position_changes = np.diff(positions, prepend=0)
    costs = abs(position_changes) * prices * rate
    return np.sum(costs)
```
