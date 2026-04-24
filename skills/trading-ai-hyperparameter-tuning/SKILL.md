---
name: trading-ai-hyperparameter-tuning
description: Optimize model configurations for trading applications
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: ai hyperparameter tuning, ai-hyperparameter-tuning, configurations, model,
    optimize
---


**Role:** Systematically find optimal hyperparameters that balance prediction accuracy with trading performance

**Philosophy:** Hyperparameter optimization should respect trading constraints (transaction costs, regime shifts). Prioritize robustness and out-of-sample performance over in-sample optimization.

## Key Principles

1. **Business Metric Optimization**: Optimize for Sharpe ratio, profit, or drawdown, not just accuracy
2. **Time-Aware Validation**: Use walk-forward or rolling window validation
3. **Constraint-Aware Search**: Respect computational limits and trading constraints
4. **Early Stopping**: Prevent overfitting with patience-based stopping
5. **Confidence Intervals**: Report uncertainty in optimal hyperparameters

## Implementation Guidelines

### Structure
- Core logic: `tuning/searchers.py` - Hyperparameter search algorithms
- Optimizer: `tuning/optimizer.py` - Main optimization loop
- Validation: `tuning/validators.py` - Time-aware validation
- Config: `config/tuning_config.yaml` - Search parameters

### Patterns to Follow
- Use Bayesian optimization for expensive evaluations
- Include trading cost simulations in objective function
- Report confidence intervals for best hyperparameters
- Implement warm-starting from previous optimization runs

## Adherence Checklist
Before completing your task, verify:
- [ ] Objective function includes trading metrics (Sharpe, profit, drawdown)
- [ ] Walk-forward or rolling window validation used
- [ ] Computational budget respected (time/iterations)
- [ ] Confidence intervals reported for hyperparameters
- [ ] Results reproducible with fixed random seeds



## Code Examples

### Bayesian Hyperparameter Optimization

```python
import numpy as np
from typing import Dict, List, Tuple, Callable
from dataclasses import dataclass
import GPy
import GPyOpt

@dataclass
class OptimizationResult:
    """Result of hyperparameter optimization."""
    best_params: Dict
    best_score: float
    score_std: float
    all_trials: List[Dict]
    runtimes: List[float]

class BayesianOptimizer:
    """Bayesian optimization for hyperparameter tuning."""
    
    def __init__(self, param_space: Dict, n_iterations: int = 20,
                 n_initial_points: int = 5, random_state: int = 42):
        self.param_space = param_space
        self.n_iterations = n_iterations
        self.n_initial = n_initial_points
        self.random_state = random_state
        
        self.space = self._build_gpyopt_space()
        self.results = []
    
    def _build_gpyopt_space(self) -> List[Dict]:
        """Build parameter space for GPyOpt."""
        space = []
        
        for name, param in self.param_space.items():
            param_type = param['type']
            
            if param_type == 'continuous':
                space.append({
                    'name': name,
                    'type': 'continuous',
                    'domain': (param['min'], param['max'])
                })
            elif param_type == 'discrete':
                space.append({
                    'name': name,
                    'type': 'discrete',
                    'domain': tuple(param['values'])
                })
            elif param_type == 'categorical':
                space.append({
                    'name': name,
                    'type': 'categorical',
                    'domain': tuple(param['values'])
                })
        
        return space
    
    def optimize(self, objective_fn: Callable) -> OptimizationResult:
        """Run Bayesian optimization."""
        np.random.seed(self.random_state)
        
        # Build acquisition function
        model = GPyOpt.models.GPModel(
            exact_feval=True,
            optimize_restarts=5
        )
        
        acquisition = GPyOpt.acquisitions.AcquisitionEI(
            model,
            GPyOpt.optimization.AcquisitionOptimizer(self.space)
        )
        
        # Initial random points
        X_initial = []
        y_initial = []
        
        for _ in range(self.n_initial):
            x = self._sample_random_point()
            X_initial.append(x)
            score = objective_fn(x)
            y_initial.append(score)
        
        # Bayesian optimization loop
        X_all = X_initial.copy()
        y_all = y_initial.copy()
        
        for iteration in range(self.n_iterations - self.n_initial):
            # Update model
            model.update(X_all, y_all)
            
            # Find next point
            next_x = acquisition.optimize()[0]
            
            # Evaluate
            score = objective_fn(next_x)
            
            X_all.append(next_x)
            y_all.append(score)
            
            self.results.append({
                'iteration': iteration,
                'params': next_x,
                'score': score
            })
        
        # Find best result
        best_idx = np.argmax(y_all)
        best_params = X_all[best_idx]
        best_score = y_all[best_idx]
        
        return OptimizationResult(
            best_params=best_params,
            best_score=best_score,
            score_std=np.std(y_all[-5:]),  # Std of last 5 iterations
            all_trials=[
                {'params': x, 'score': y} for x, y in zip(X_all, y_all)
            ],
            runtimes=[0.1] * len(X_all)  # Placeholder
        )
    
    def _sample_random_point(self) -> Dict:
        """Sample a random point from parameter space."""
        point = {}
        
        for name, param in self.param_space.items():
            param_type = param['type']
            
            if param_type == 'continuous':
                point[name] = np.random.uniform(param['min'], param['max'])
            elif param_type == 'discrete':
                point[name] = np.random.choice(param['values'])
            elif param_type == 'categorical':
                point[name] = np.random.choice(param['values'])
        
        return point
```

### Trading-Objective Objective Function

```python
import numpy as np
from typing import Dict, Callable
from backtest import run_backtest

def create_trading_objective(data: np.ndarray, costs: Dict) -> Callable:
    """Create objective function optimized for trading performance."""
    
    def objective_function(params: Dict) -> float:
        """Objective that maximizes risk-adjusted return."""
        try:
            # Convert params to model config
            model_config = {
                'learning_rate': params.get('learning_rate', 0.001),
                'n_estimators': int(params.get('n_estimators', 100)),
                'max_depth': int(params.get('max_depth', 5)),
                'transaction_cost': costs.get('per_trade', 0.001)
            }
            
            # Run backtest
            results = run_backtest(data, model_config)
            
            # Calculate trading metrics
            total_return = results['total_return']
            volatility = results['volatility']
            max_drawdown = results['max_drawdown']
            sharpe = results['sharpe_ratio']
            
            # Composite objective: maximize Sharpe, penalize drawdown
            objective = sharpe - 0.1 * max_drawdown
            
            # Penalize extreme hyperparameters
            if model_config['n_estimators'] > 500:
                objective -= 0.5
            if model_config['learning_rate'] > 0.1:
                objective -= 0.3
            
            # Penalize if negative return
            if total_return < 0:
                objective -= 1.0
            
            return -objective  # Minimize (negative for maximization)
            
        except Exception as e:
            # High penalty for failures
            return 100.0
    
    return objective_function
```

### Walk-Forward Hyperparameter Optimization

```python
import numpy as np
from typing import List, Dict, Callable
from sklearn.model_selection import TimeSeriesSplit

class WalkForwardOptimizer:
    """Hyperparameter optimization with walk-forward validation."""
    
    def __init__(self, param_space: Dict, n_splits: int = 5,
                 test_size: int = 100, random_state: int = 42):
        self.param_space = param_space
        self.n_splits = n_splits
        self.test_size = test_size
        self.random_state = random_state
        self.tscv = TimeSeriesSplit(n_splits=n_splits)
    
    def optimize(self, model_class, objective_metric: str = 'sharpe') -> Dict:
        """Find optimal hyperparameters using walk-forward."""
        np.random.seed(self.random_state)
        
        best_params = None
        best_score = -np.inf
        
        # Grid search over hyperparameters
        param_grid = self._generate_param_grid()
        
        for params in param_grid:
            scores = []
            
            for train_idx, test_idx in self.tscv.split(np.arange(len(self.training_data))):
                train_data = self.training_data[train_idx]
                test_data = self.training_data[test_idx]
                
                # Train model
                model = model_class(**params)
                model.fit(train_data)
                
                # Evaluate
                pred = model.predict(test_data)
                score = self._calculate_metric(pred, test_data, objective_metric)
                scores.append(score)
            
            avg_score = np.mean(scores)
            
            if avg_score > best_score:
                best_score = avg_score
                best_params = params.copy()
        
        return {
            'best_params': best_params,
            'best_score': best_score,
            'cv_scores': scores
        }
    
    def _generate_param_grid(self) -> List[Dict]:
        """Generate parameter grid from space definition."""
        param_values = []
        
        for name, param in self.param_space.items():
            if param['type'] == 'discrete':
                param_values.append(param['values'])
            elif param['type'] == 'continuous':
                # Sample points from continuous space
                samples = np.linspace(param['min'], param['max'], 5)
                param_values.append(samples)
            else:
                param_values.append(param['values'])
        
        # Cartesian product
        param_grid = []
        
        def product_recursive(values, index, current):
            if index == len(values):
                param_grid.append(current.copy())
                return
            
            for val in values[index]:
                current[sorted(self.param_space.keys())[index]] = val
                product_recursive(values, index + 1, current)
        
        product_recursive(param_values, 0, {})
        
        return param_grid
    
    def _calculate_metric(self, predictions: np.ndarray, actual: np.ndarray,
                         metric: str) -> float:
        """Calculate evaluation metric."""
        if metric == 'mse':
            return -np.mean((predictions - actual) ** 2)
        elif metric == 'mae':
            return -np.mean(np.abs(predictions - actual))
        elif metric == 'sharpe':
            returns = np.diff(np.log(actual))
            if len(returns) > 1:
                return np.mean(returns) / (np.std(returns) + 1e-8)
            return 0.0
        else:
            return -np.mean((predictions - actual) ** 2)
```

### Multi-Start Optimization with Warm Starting

```python
import numpy as np
from typing import Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class HyperparameterHistory:
    """History of hyperparameter evaluations."""
    params: Dict
    score: float
    fold_scores: List[float]
    fold: int
    timestamp: float

class MultiStartOptimizer:
    """Multi-start optimization with warm starting from previous runs."""
    
    def __init__(self, param_space: Dict, n_starts: int = 3,
                 n_iterations_per_start: int = 10):
        self.param_space = param_space
        self.n_starts = n_starts
        self.n_iterations = n_iterations_per_start
        self.history: List[HyperparameterHistory] = []
    
    def optimize(self, objective_fn: Callable, previous_runs: List[Dict] = None):
        """Run multi-start optimization with warm starting."""
        np.random.seed(42)
        
        best_params = None
        best_score = -np.inf
        
        # If previous runs provided, use them to initialize
        if previous_runs:
            # Fit Gaussian process to previous results
            self._fit surrogate_model(previous_runs)
        
        for start in range(self.n_starts):
            # Sample initial point (possibly informed by previous runs)
            if previous_runs and hasattr(self, 'gp_model'):
                next_point = self._sample_from_acquisition()
            else:
                next_point = self._sample_random_point()
            
            # Local optimization from this point
            local_best, local_score = self._local_optimize(
                next_point, objective_fn
            )
            
            self.history.append(HyperparameterHistory(
                params=local_best,
                score=local_score,
                fold_scores=[local_score],
                fold=start,
                timestamp=0.0  # Placeholder
            ))
            
            if local_score > best_score:
                best_score = local_score
                best_params = local_best.copy()
        
        return {
            'best_params': best_params,
            'best_score': best_score,
            'history': self.history
        }
    
    def _sample_random_point(self) -> Dict:
        """Sample random point from parameter space."""
        point = {}
        for name, param in self.param_space.items():
            if param['type'] == 'continuous':
                point[name] = np.random.uniform(param['min'], param['max'])
            else:
                point[name] = np.random.choice(param['values'])
        return point
    
    def _local_optimize(self, start_point: Dict, objective_fn: Callable,
                       max_iter: int = 5) -> Tuple[Dict, float]:
        """Local optimization from starting point."""
        best_point = start_point.copy()
        best_score = objective_fn(start_point)
        
        for _ in range(max_iter):
            # Small perturbation
            new_point = self._perturb(best_point)
            new_score = objective_fn(new_point)
            
            if new_score > best_score:
                best_score = new_score
                best_point = new_point
        
        return best_point, best_score
    
    def _perturb(self, point: Dict, noise_scale: float = 0.1) -> Dict:
        """Perturb point slightly."""
        new_point = point.copy()
        
        for name, value in point.items():
            if isinstance(value, (int, float)):
                if self.param_space[name]['type'] == 'continuous':
                    new_point[name] = value + np.random.normal(0, noise_scale)
                    new_point[name] = np.clip(
                        new_point[name],
                        self.param_space[name]['min'],
                        self.param_space[name]['max']
                    )
                else:
                    # Discrete: randomly select from nearby values
                    values = self.param_space[name]['values']
                    if len(values) > 1:
                        idx = values.index(value)
                        new_idx = min(max(idx + np.random.randint(-1, 2), 0), len(values)-1)
                        new_point[name] = values[new_idx]
        
        return new_point
```
