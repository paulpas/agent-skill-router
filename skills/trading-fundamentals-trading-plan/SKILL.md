---
name: trading-fundamentals-trading-plan
description: Trading Plan Structure and Risk Management Framework
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: cloud infrastructure, framework, fundamentals trading plan, fundamentals-trading-plan,
    management, structure
  related-skills: trading-fundamentals-trading-edge, trading-fundamentals-trading-psychology
    trading-ai-multi-asset-model, trading-risk-correlation-risk
---

**Role:** Trading Strategy Developer — builds comprehensive trading plans that define rules, risk parameters, and execution guidelines for systematic trading operations.

**Philosophy:** Risk-First Planning — trading plans should be designed around risk constraints and exit criteria before entry rules, ensuring survival and long-term viability regardless of market conditions.

## Key Principles

1. **Pre-Defined Risk Parameters**: Every trade must have pre-calculated risk limits, position sizes, and maximum drawdown thresholds defined before entry.

2. **Clear Entry/Exit Criteria**: Trading signals must have objective, measurable entry and exit conditions with no discretionary overrides.

3. **Risk-Reward Ratio Enforcement**: All trades must meet minimum risk-reward thresholds (typically 1:2 or better) before execution.

4. **Trade Journaling**: Every trade must be documented with rationale, expected outcome, and actual result for continuous improvement.

5. **Adaptive Position Sizing**: Position sizes should scale with confidence levels, account size, and volatility to maintain consistent risk exposure.

## Implementation Guidelines

### Structure
- Core logic: `skills/trading-fundamentals/trading_plan.py`
- Risk calculator: `skills/trading-fundamentals/risk_manager.py`
- Trade journal: `skills/trading-fundamentals/trade_journal.py`

### Patterns to Follow
- Use dataclasses for immutable trade records
- Implement risk calculations with early exit for invalid inputs
- Separate trading plan (static rules) from execution (dynamic decisions)
- Use type hints throughout for clear data contracts

## Code Examples

### Trading Plan Structure

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Optional
from enum import Enum
import numpy as np


class TradeDirection(Enum):
    LONG = "long"
    SHORT = "short"
    NEUTRAL = "neutral"


@dataclass
class TradingPlan:
    """Comprehensive trading plan for a single strategy."""
    
    # Strategy Identification
    strategy_name: str
    strategy_id: str
    created_at: datetime = field(default_factory=datetime.now)
    
    # Market Scope
    instruments: List[str]
    timeframes: List[str]  # e.g., '1m', '15m', '1h', '4h', '1d'
    trading_sessions: List[str]  # e.g., 'NYSE', 'NASDAQ', 'FOREX', 'CRYPTO'
    
    # Entry Criteria
    entry_conditions: Dict[str, any]  # Technical, fundamental, sentiment signals
    entry_thresholds: Dict[str, float]  # Minimum confidence scores
    
    # Exit Criteria
    stop_loss_types: List[str]  # 'ATR', 'fixed', 'trailing', 'time_based'
    take_profit_types: List[str]  # 'fixed', 'target', 'trailing', 'break_even'
    
    # Risk Parameters
    max_position_size: float  # Maximum % of portfolio per position
    max_daily_loss: float     # Maximum daily loss as % of portfolio
    max_drawdown: float       # Maximum portfolio drawdown before halting
    risk_per_trade: float     # Risk amount per trade
    
    # Position Sizing
    position_sizing_method: str  # 'fixed', 'volatility', 'kelly', 'risk_parity'
    confidence_scaling: bool    # Scale position with signal confidence
    
    # Performance Targets
    minimum_win_rate: float     # Target win rate for profitability
    minimum_profit_factor: float  # Target profit factor (gross_profits/gross_losses)
    minimum_sharpe_ratio: float  # Target risk-adjusted return
    
    # Review Parameters
    review_frequency: str  # 'daily', 'weekly', 'monthly'
    minimum_trades_for_review: int = 30
    confidence_threshold: float = 0.7  # For strategy performance assessment


class TradingPlanBuilder:
    """
    Builder pattern for constructing trading plans.
    Ensures all required components are defined.
    """
    
    def __init__(self):
        self._plan = TradingPlan(
            strategy_name="",
            strategy_id="",
            instruments=[],
            timeframes=[],
            trading_sessions=[],
            entry_conditions={},
            entry_thresholds={},
            stop_loss_types=[],
            take_profit_types=[],
            max_position_size=0.0,
            max_daily_loss=0.0,
            max_drawdown=0.0,
            risk_per_trade=0.0,
            position_sizing_method="fixed",
            confidence_scaling=False,
            minimum_win_rate=0.5,
            minimum_profit_factor=1.5,
            minimum_sharpe_ratio=1.0,
            review_frequency="weekly",
            minimum_trades_for_review=30,
            confidence_threshold=0.7
        )
    
    def set_strategy_info(self, name: str, strategy_id: str) -> 'TradingPlanBuilder':
        self._plan.strategy_name = name
        self._plan.strategy_id = strategy_id
        return self
    
    def set_markets(self, 
                    instruments: List[str],
                    timeframes: List[str],
                    sessions: List[str]) -> 'TradingPlanBuilder':
        self._plan.instruments = instruments
        self._plan.timeframes = timeframes
        self._plan.trading_sessions = sessions
        return self
    
    def set_entry_criteria(self,
                           conditions: Dict[str, any],
                           thresholds: Dict[str, float]) -> 'TradingPlanBuilder':
        self._plan.entry_conditions = conditions
        self._plan.entry_thresholds = thresholds
        return self
    
    def set_exit_criteria(self,
                          stop_loss_types: List[str],
                          take_profit_types: List[str]) -> 'TradingPlanBuilder':
        self._plan.stop_loss_types = stop_loss_types
        self._plan.take_profit_types = take_profit_types
        return self
    
    def set_risk_parameters(self,
                            max_position: float,
                            max_daily_loss: float,
                            max_drawdown: float,
                            risk_per_trade: float) -> 'TradingPlanBuilder':
        self._plan.max_position_size = max_position
        self._plan.max_daily_loss = max_daily_loss
        self._plan.max_drawdown = max_drawdown
        self._plan.risk_per_trade = risk_per_trade
        return self
    
    def set_position_sizing(self,
                            method: str,
                            confidence_scaling: bool = False) -> 'TradingPlanBuilder':
        self._plan.position_sizing_method = method
        self._plan.confidence_scaling = confidence_scaling
        return self
    
    def set_performance_targets(self,
                                win_rate: float,
                                profit_factor: float,
                                sharpe_ratio: float) -> 'TradingPlanBuilder':
        self._plan.minimum_win_rate = win_rate
        self._plan.minimum_profit_factor = profit_factor
        self._plan.minimum_sharpe_ratio = sharpe_ratio
        return self
    
    def set_review_parameters(self,
                              frequency: str,
                              min_trades: int = 30,
                              confidence: float = 0.7) -> 'TradingPlanBuilder':
        self._plan.review_frequency = frequency
        self._plan.minimum_trades_for_review = min_trades
        self._plan.confidence_threshold = confidence
        return self
    
    def build(self) -> TradingPlan:
        """Build the trading plan with validation."""
        plan = self._validate()
        return plan
    
    def _validate(self) -> TradingPlan:
        """Validate trading plan components."""
        # Validate risk parameters
        if self._plan.max_position_size <= 0 or self._plan.max_position_size > 1.0:
            raise ValueError("max_position_size must be between 0 and 1")
        
        if self._plan.max_daily_loss <= 0 or self._plan.max_daily_loss > 1.0:
            raise ValueError("max_daily_loss must be between 0 and 1")
        
        if self._plan.max_drawdown <= 0 or self._plan.max_drawdown > 1.0:
            raise ValueError("max_drawdown must be between 0 and 1")
        
        # Validate risk/reward
        if self._plan.risk_per_trade <= 0:
            raise ValueError("risk_per_trade must be positive")
        
        # Validate entry/exit criteria exist
        if not self._plan.entry_conditions:
            raise ValueError("Entry conditions must be defined")
        
        if not self._plan.stop_loss_types:
            raise ValueError("Stop loss types must be defined")
        
        if not self._plan.take_profit_types:
            raise ValueError("Take profit types must be defined")
        
        # Validate timeframes are valid
        valid_timeframes = {'1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '1w'}
        for tf in self._plan.timeframes:
            if tf not in valid_timeframes:
                raise ValueError(f"Invalid timeframe: {tf}")
        
        # Validate position sizing method
        valid_methods = {'fixed', 'volatility', 'kelly', 'risk_parity'}
        if self._plan.position_sizing_method not in valid_methods:
            raise ValueError(f"Invalid position sizing method: {self._plan.position_sizing_method}")
        
        # Validate confidence threshold
        if self._plan.confidence_threshold <= 0 or self._plan.confidence_threshold > 1.0:
            raise ValueError("confidence_threshold must be between 0 and 1")
        
        return self._plan


class TradingPlanValidator:
    """
    Validates trading plans against quality standards.
    Ensures plans are complete, consistent, and viable.
    """
    
    def __init__(self):
        self.errors = []
        self.warnings = []
    
    def validate(self, plan: TradingPlan) -> bool:
        """Run all validations and return pass/fail status."""
        self.errors = []
        self.warnings = []
        
        self._validate_risk_parameters(plan)
        self._validate_entry_exit_logic(plan)
        self._validate_performance_targets(plan)
        self._validate_position_sizing(plan)
        self._validate_timeframe_coherence(plan)
        
        return len(self.errors) == 0
    
    def _validate_risk_parameters(self, plan: TradingPlan):
        """Validate risk parameter consistency."""
        # Check that risk per trade aligns with max daily loss
        if plan.max_position_size > 0:
            max_trades_without_stop = int(plan.max_daily_loss / plan.risk_per_trade)
            if max_trades_without_stop < 3:
                self.warnings.append(
                    f"High risk per trade relative to daily limit. "
                    f"Only {max_trades_without_stop} losses would trigger daily stop."
                )
        
        # Check that max drawdown is larger than max daily loss
        if plan.max_drawdown <= plan.max_daily_loss:
            self.errors.append(
                "max_drawdown must be greater than max_daily_loss"
            )
        
        # Check that position sizing allows for diversification
        if plan.max_position_size > 0.2:
            self.warnings.append(
                "Position size above 20%. Consider diversification."
            )
    
    def _validate_entry_exit_logic(self, plan: TradingPlan):
        """Validate entry and exit criteria compatibility."""
        # Check that exit types match entry direction
        if plan.stop_loss_types and plan.take_profit_types:
            # All combinations should be valid
            pass
    
    def _validate_performance_targets(self, plan: TradingPlan):
        """Validate performance targets are achievable."""
        # Rule of thumb: win_rate * profit_factor >= 0.5
        target_product = plan.minimum_win_rate * plan.minimum_profit_factor
        if target_product < 0.5:
            self.warnings.append(
                "Performance targets may be too conservative. "
                "Consider revising win rate or profit factor requirements."
            )
    
    def _validate_position_sizing(self, plan: TradingPlan):
        """Validate position sizing method consistency."""
        if plan.position_sizing_method == 'kelly':
            # Kelly requires return estimates
            if not plan.entry_thresholds.get('expected_return'):
                self.errors.append(
                    "Kelly sizing requires expected_return in entry_thresholds"
                )
        
        if plan.position_sizing_method == 'risk_parity':
            # Risk parity requires multiple assets
            if len(plan.instruments) < 3:
                self.warnings.append(
                    "Risk parity strategy benefits from more instruments. "
                    f"Current: {len(plan.instruments)}"
                )
    
    def _validate_timeframe_coherence(self, plan: TradingPlan):
        """Validate timeframe selection coherence."""
        # Check for proper multi-timeframe analysis
        if len(plan.timeframes) >= 3:
            # Should have entry, confirmation, and trend timeframes
            pass
    
    def get_report(self) -> dict:
        """Get validation report."""
        return {
            'valid': len(self.errors) == 0,
            'errors': self.errors,
            'warnings': self.warnings,
            'total_issues': len(self.errors) + len(self.warnings)
        }
```

### Risk Parameters Definition

```python
from dataclasses import dataclass
from typing import List, Dict, Optional
from enum import Enum
import numpy as np


class RiskModel(Enum):
    """Risk calculation models."""
    FIXED = "fixed"  # Fixed dollar amount
    PERCENTAGE = "percentage"  # Percentage of account
    VOLATILITY = "volatility"  # Volatility-based (ATR)
    KELLY = "kelly"  # Kelly criterion
    RISK_PARITY = "risk_parity"  # Equal risk contribution


@dataclass
class RiskParameters:
    """Complete risk parameters for a trading system."""
    
    # Account-level limits
    account_size: float
    max_daily_loss: float  # Dollar amount or percentage
    max_drawdown: float    # Dollar amount or percentage
    max_positions: int
    
    # Position-level limits
    max_position_size: float  # Percentage of account
    max_sector_exposure: float  # For multi-asset strategies
    
    # Stop loss configuration
    stop_loss_method: str  # 'ATR', 'fixed', 'trailing', 'support'
    stop_loss_distance: float  # ATR multiplier or fixed amount
    min_profit_target: float  # Minimum R-multiple
    
    # Position sizing
    risk_per_trade: float  # Dollar risk per trade
    risk_model: RiskModel = RiskModel.FIXED
    volatility_window: int = 20  # For ATR calculation
    kelly_fraction: float = 0.25  # Fraction of Kelly to use (conservative)
    
    # Exposure limits
    max_leverage: float = 2.0
    max_correlation: float = 0.7  # Max correlation between positions


class RiskCalculator:
    """
    Calculate risk parameters for positions.
    Supports multiple risk models and calculates position sizes.
    """
    
    def __init__(self, params: RiskParameters):
        self.params = params
    
    def calculate_position_size(self,
                                entry_price: float,
                                stop_price: float,
                                signal_confidence: float = 1.0,
                                account_size: float = None) -> float:
        """
        Calculate position size based on risk parameters.
        
        Args:
            entry_price: Entry price for the trade
            stop_price: Stop loss price
            signal_confidence: Confidence in the signal (0-1)
            account_size: Current account size (uses params if None)
            
        Returns:
            Number of shares/contracts to trade
        """
        if account_size is None:
            account_size = self.params.account_size
        
        # Calculate risk amount
        risk_amount = self._calculate_risk_amount(account_size)
        
        # Calculate position size based on risk
        price_risk = abs(entry_price - stop_price)
        
        if price_risk <= 0:
            raise ValueError("Stop price must differ from entry price")
        
        # Base position size
        position_size = risk_amount / price_risk
        
        # Apply confidence scaling if enabled
        if self.params.confidence_scaling:
            position_size = position_size * signal_confidence
        
        # Apply position size limit
        max_position = (self.params.max_position_size * account_size) / entry_price
        position_size = min(position_size, max_position)
        
        # Apply maximum positions limit
        if self.params.max_positions > 0:
            max_from_positions = account_size / (entry_price * self.params.max_positions)
            position_size = min(position_size, max_from_positions)
        
        return position_size
    
    def _calculate_risk_amount(self, account_size: float) -> float:
        """Calculate dollar risk amount based on risk model."""
        if self.params.risk_model == RiskModel.FIXED:
            return self.params.risk_per_trade
        
        elif self.params.risk_model == RiskModel.PERCENTAGE:
            return account_size * self.params.risk_per_trade
        
        elif self.params.risk_model == RiskModel.VOLATILITY:
            # ATR-based sizing
            atr = self._estimate_atr()
            risk_atr_multiple = self.params.stop_loss_distance
            return account_size * self.params.risk_per_trade * atr * risk_atr_multiple
        
        elif self.params.risk_model == RiskModel.KELLY:
            return self._kelly_sizing(account_size)
        
        elif self.params.risk_model == RiskModel.RISK_PARITY:
            return self._risk_parity_sizing(account_size)
        
        return self.params.risk_per_trade
    
    def _estimate_atr(self, historical_prices: List[float] = None) -> float:
        """Estimate ATR from historical prices."""
        if historical_prices is None or len(historical_prices) < self.params.volatility_window:
            # Use default ATR estimate based on typical volatility
            return 0.02  # 2% typical daily volatility
        
        prices = np.array(historical_prices[-self.params.volatility_window:])
        
        # Calculate True Range
        high = prices * 1.01  # Approximate high
        low = prices * 0.99   # Approximate low
        close = prices
        
        tr1 = high[:-1] - low[:-1]
        tr2 = np.abs(high[:-1] - close[1:])
        tr3 = np.abs(low[:-1] - close[1:])
        true_range = np.maximum(tr1, np.maximum(tr2, tr3))
        
        atr = np.mean(true_range)
        return atr
    
    def _kelly_sizing(self, account_size: float) -> float:
        """
        Calculate Kelly position sizing.
        Kelly = WinRate - [(1-WinRate) / RewardRatio]
        """
        # Get expected win rate and reward ratio from strategy
        win_rate = 0.6  # Default assumption
        reward_ratio = 2.0  # Default 1:2 R:R
        
        # Calculate Kelly fraction
        kelly_fraction = win_rate - ((1 - win_rate) / reward_ratio)
        kelly_fraction = max(0, min(1, kelly_fraction))  # Clamp to [0, 1]
        
        # Apply fractional Kelly
        effective_kelly = kelly_fraction * self.params.kelly_fraction
        
        return account_size * effective_kelly
    
    def _risk_parity_sizing(self, account_size: float) -> float:
        """Calculate equal risk contribution sizing."""
        if self.params.max_positions <= 0:
            return account_size * self.params.max_position_size
        
        # Equal risk to each position
        per_position_risk = account_size * self.params.max_position_size / self.params.max_positions
        
        # Adjust based on volatility
        vol_adjustment = 1.0 / (1.0 + self.params.max_correlation)
        
        return per_position_risk * vol_adjustment
    
    def calculate_drawdown(self, 
                           equity_curve: List[float]) -> Dict:
        """Calculate drawdown metrics from equity curve."""
        if not equity_curve:
            return {
                'max_drawdown': 0.0,
                'max_drawdown_pct': 0.0,
                'drawdown_duration': 0,
                'recovery_time': 0
            }
        
        equity = np.array(equity_curve)
        running_max = np.maximum.accumulate(equity)
        drawdown = (running_max - equity) / running_max
        
        max_dd_idx = np.argmax(drawdown)
        max_dd_start = running_max[:max_dd_idx + 1].argmax()
        
        # Find recovery point
        recovery_idx = None
        for i in range(max_dd_idx, len(equity)):
            if equity[i] >= running_max[max_dd_idx]:
                recovery_idx = i
                break
        
        return {
            'max_drawdown': float(equity[max_dd_idx] - running_max[max_dd_idx]),
            'max_drawdown_pct': float(drawdown[max_dd_idx]),
            'drawdown_duration': max_dd_idx - max_dd_start,
            'recovery_time': (recovery_idx - max_dd_idx) if recovery_idx else None
        }


class RiskEnforcer:
    """
    Enforces risk limits during trading operations.
    Prevents violations of defined risk parameters.
    """
    
    def __init__(self, params: RiskParameters):
        self.params = params
        self.daily_pnl = 0.0
        self.daily_trades = 0
        self.max_equity = 0.0
    
    def check_daily_limit(self, pnl_change: float) -> bool:
        """Check if daily loss limit would be exceeded."""
        if self.params.max_daily_loss <= 0:
            return True  # No limit
        
        new_daily_pnl = self.daily_pnl + pnl_change
        return new_daily_pnl >= -self.params.max_daily_loss
    
    def check_drawdown_limit(self, current_equity: float) -> bool:
        """Check if drawdown limit would be exceeded."""
        if self.params.max_drawdown <= 0:
            return True  # No limit
        
        self.max_equity = max(self.max_equity, current_equity)
        drawdown = (self.max_equity - current_equity) / self.max_equity if self.max_equity > 0 else 0
        
        return drawdown <= self.params.max_drawdown
    
    def check_position_limit(self, position_count: int) -> bool:
        """Check if position limit would be exceeded."""
        return position_count < self.params.max_positions
    
    def check_sector_limit(self,
                           sector_exposure: float,
                           new_position: float) -> bool:
        """Check if sector exposure limit would be exceeded."""
        return sector_exposure + new_position <= self.params.max_sector_exposure
    
    def record_trade(self, pnl: float):
        """Record trade result."""
        self.daily_pnl += pnl
        self.daily_trades += 1
    
    def reset_daily(self):
        """Reset daily counters."""
        self.daily_pnl = 0.0
        self.daily_trades = 0
    
    def get_risk_status(self, current_equity: float) -> dict:
        """Get current risk status."""
        return {
            'daily_pnl': self.daily_pnl,
            'daily_trades': self.daily_trades,
            'drawdown_pct': (
                (self.max_equity - current_equity) / self.max_equity
                if self.max_equity > 0 else 0.0
            ),
            'max_equity': self.max_equity,
            'daily_limit_remaining': (
                self.params.max_daily_loss + self.daily_pnl
                if self.params.max_daily_loss > 0 else float('inf')
            ),
            'drawdown_limit_remaining': (
                self.params.max_drawdown -
                ((self.max_equity - current_equity) / self.max_equity
                 if self.max_equity > 0 else 0.0)
                if self.params.max_drawdown > 0 else float('inf')
            )
        }
```

### Entry/Exit Criteria

```python
from dataclasses import dataclass
from typing import List, Dict, Optional, Callable
from enum import Enum
import numpy as np


class SignalType(Enum):
    """Types of trading signals."""
    TREND = "trend"  # Momentum/trend following
    MEAN_REVERSION = "mean_reversion"  # Reverse to mean
    BREAKOUT = "breakout"  # Price breaking structures
    MEANINGFUL_MOVE = "meaningful_move"  # Significant moves
    CONTRARIAN = "contrarian"  # Counter-trend


@dataclass
class EntryCriteria:
    """Entry signal criteria."""
    signal_type: SignalType
    confidence_threshold: float  # Minimum confidence to enter
    minimum_risk_reward: float = 2.0  # Minimum R:R ratio
    confirmation_required: bool = False  # Require confirmation signal
    confirmation_delay: int = 0  # Bars to wait for confirmation


@dataclass
class ExitCriteria:
    """Exit signal criteria."""
    stop_loss_type: str  # 'ATR', 'fixed', 'trailing', 'break_even'
    stop_loss_value: float  # ATR multiplier or fixed amount
    take_profit_type: str  # 'fixed', 'target', 'trailing', 'time_based'
    take_profit_value: float  # Target R-multiple or time in bars
    trail_after_profit: bool = False  # Trail after reaching profit threshold
    trail_distance: float = 0.5  # Trail distance as % or ATR multiple


class SignalEngine:
    """
    Evaluate entry and exit signals according to trading plan.
    """
    
    def __init__(self, 
                 entry_criteria: EntryCriteria,
                 exit_criteria: ExitCriteria,
                 indicator_calculator: callable = None):
        self.entry = entry_criteria
        self.exit = exit_criteria
        self.indicator_calc = indicator_calculator or self._default_indicators
    
    def evaluate_entry(self,
                       price_data: Dict,
                       current_position: Optional[dict] = None) -> Dict:
        """
        Evaluate if entry signal is valid.
        
        Args:
            price_data: Dict with price indicators (RSI, MACD, etc.)
            current_position: Existing position if any
            
        Returns:
            Dict with entry decision and confidence
        """
        # Check if we already have a position
        if current_position is not None:
            return {
                'should_enter': False,
                'reason': 'Position already held'
            }
        
        # Calculate signal strength
        signal_strength = self._calculate_signal_strength(price_data)
        confidence = self._calculate_confidence(signal_strength)
        
        # Check confidence threshold
        if confidence < self.entry.confidence_threshold:
            return {
                'should_enter': False,
                'confidence': confidence,
                'reason': f'Confidence {confidence:.2%} below threshold'
            }
        
        # Check risk-reward
        risk_reward = self._estimate_risk_reward(price_data)
        if risk_reward < self.entry.minimum_risk_reward:
            return {
                'should_enter': False,
                'confidence': confidence,
                'risk_reward': risk_reward,
                'reason': f'R:R {risk_reward:.2f} below minimum {self.entry.minimum_risk_reward}'
            }
        
        return {
            'should_enter': True,
            'confidence': confidence,
            'risk_reward': risk_reward,
            'signal_strength': signal_strength,
            'direction': 'long' if signal_strength > 0 else 'short'
        }
    
    def evaluate_exit(self,
                      position: Dict,
                      current_price_data: Dict,
                      current_price: float) -> Dict:
        """
        Evaluate if exit signal is valid.
        
        Args:
            position: Current position info
            current_price_data: Current price indicators
            current_price: Current market price
            
        Returns:
            Dict with exit decision and target
        """
        if position is None:
            return {
                'should_exit': False,
                'reason': 'No position to exit'
            }
        
        # Check stop loss
        stop_loss_hit = self._check_stop_loss(position, current_price)
        if stop_loss_hit:
            return {
                'should_exit': True,
                'exit_type': 'stop_loss',
                'reason': 'Stop loss hit'
            }
        
        # Check take profit
        take_profit_hit = self._check_take_profit(position, current_price)
        if take_profit_hit:
            return {
                'should_exit': True,
                'exit_type': 'take_profit',
                'reason': 'Take profit hit'
            }
        
        # Check time-based exit
        time_based_exit = self._check_time_based_exit(position, current_price_data)
        if time_based_exit:
            return {
                'should_exit': True,
                'exit_type': 'time_based',
                'reason': 'Time-based exit triggered'
            }
        
        return {
            'should_exit': False,
            'reason': 'No exit condition met'
        }
    
    def _calculate_signal_strength(self, price_data: Dict) -> float:
        """Calculate overall signal strength from indicators."""
        strength = 0.0
        weights = {
            'trend': 0.4,
            'momentum': 0.3,
            'volatility': 0.2,
            'volume': 0.1
        }
        
        if 'trend' in price_data:
            strength += price_data['trend'] * weights['trend']
        if 'momentum' in price_data:
            strength += price_data['momentum'] * weights['momentum']
        if 'volatility' in price_data:
            strength += price_data['volatility'] * weights['volatility']
        if 'volume' in price_data:
            strength += price_data['volume'] * weights['volume']
        
        return strength
    
    def _calculate_confidence(self, signal_strength: float) -> float:
        """Convert signal strength to confidence score."""
        # Use sigmoid transformation
        return 1.0 / (1.0 + np.exp(-5 * signal_strength))
    
    def _estimate_risk_reward(self, price_data: Dict) -> float:
        """Estimate risk-reward ratio for entry."""
        entry_price = price_data.get('entry_price', 100)
        
        # Get stop and target from price_data
        stop_price = price_data.get('stop_price', entry_price * 0.95)
        target_price = price_data.get('target_price', entry_price * 1.10)
        
        # Calculate R-multiple
        risk = abs(entry_price - stop_price)
        reward = abs(target_price - entry_price)
        
        return reward / risk if risk > 0 else 0
    
    def _check_stop_loss(self, position: Dict, current_price: float) -> bool:
        """Check if stop loss has been hit."""
        entry_price = position['entry_price']
        stop_price = position['stop_price']
        
        if position['direction'] == 'long':
            return current_price <= stop_price
        else:  # short
            return current_price >= stop_price
    
    def _check_take_profit(self, position: Dict, current_price: float) -> bool:
        """Check if take profit has been hit."""
        entry_price = position['entry_price']
        target_price = position['target_price']
        
        if position['direction'] == 'long':
            return current_price >= target_price
        else:  # short
            return current_price <= target_price
    
    def _check_time_based_exit(self, 
                                position: Dict,
                                current_price_data: Dict) -> bool:
        """Check if time-based exit condition is met."""
        if 'bars_held' not in position:
            return False
        
        max_bars = position.get('max_bars', 20)
        return position['bars_held'] >= max_bars
    
    def _default_indicators(self, prices: np.ndarray) -> Dict:
        """Default indicator calculations."""
        # Simple RSI calculation
        if len(prices) < 14:
            return {}
        
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        avg_gain = np.mean(gains[-14:])
        avg_loss = np.mean(losses[-14:])
        
        rs = avg_gain / avg_loss if avg_loss != 0 else 100
        rsi = 100 - (100 / (1 + rs))
        
        return {
            'rsi': rsi,
            'trend': 1.0 if prices[-1] > np.mean(prices[-5:]) else -1.0,
            'momentum': deltas[-1] / prices[-2] if prices[-2] != 0 else 0,
            'volatility': np.std(deltas[-14:]) / prices[-1],
            'volume': 1.0  # Placeholder
        }


class TradeJournalEntry:
    """Individual trade journal entry."""
    
    def __init__(self,
                 trade_id: str,
                 instrument: str,
                 direction: str,
                 entry_price: float,
                 exit_price: float,
                 quantity: float,
                 entry_reason: str,
                 exit_reason: str,
                 entry_confidence: float,
                 risk_amount: float,
                 pnl: float,
                 pnl_pct: float,
                 duration_bars: int,
                 timestamp: datetime):
        self.trade_id = trade_id
        self.instrument = instrument
        self.direction = direction
        self.entry_price = entry_price
        self.exit_price = exit_price
        self.quantity = quantity
        self.entry_reason = entry_reason
        self.exit_reason = exit_reason
        self.entry_confidence = entry_confidence
        self.risk_amount = risk_amount
        self.pnl = pnl
        self.pnl_pct = pnl_pct
        self.duration_bars = duration_bars
        self.timestamp = timestamp
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for storage."""
        return {
            'trade_id': self.trade_id,
            'instrument': self.instrument,
            'direction': self.direction,
            'entry_price': self.entry_price,
            'exit_price': self.exit_price,
            'quantity': self.quantity,
            'entry_reason': self.entry_reason,
            'exit_reason': self.exit_reason,
            'entry_confidence': self.entry_confidence,
            'risk_amount': self.risk_amount,
            'pnl': self.pnl,
            'pnl_pct': self.pnl_pct,
            'duration_bars': self.duration_bars,
            'timestamp': self.timestamp.isoformat()
        }
```

### Trade Journaling

```python
from dataclasses import dataclass
from typing import List, Dict, Optional
from datetime import datetime
import json
import os


@dataclass
class TradeSummary:
    """Summary statistics for a set of trades."""
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    gross_profit: float
    gross_loss: float
    profit_factor: float
    total_pnl: float
    avg_win: float
    avg_loss: float
    avg_win_loss_ratio: float
    avg_trade_duration: float
    sharpe_ratio: float


class TradeJournal:
    """
    Comprehensive trade journal for strategy evaluation.
    Records all trades with full details and calculates performance metrics.
    """
    
    def __init__(self, strategy_id: str, base_path: str = "trading_data"):
        self.strategy_id = strategy_id
        self.base_path = base_path
        self.trades: List[Dict] = []
        self.current_trades: Dict[str, Dict] = {}  # Active positions
    
    def record_entry(self,
                     trade_id: str,
                     instrument: str,
                     direction: str,
                     entry_price: float,
                     quantity: float,
                     stop_price: float,
                     target_price: float,
                     entry_reason: str,
                     entry_confidence: float,
                     risk_amount: float,
                     timestamp: datetime = None):
        """Record trade entry."""
        if timestamp is None:
            timestamp = datetime.now()
        
        trade_record = {
            'trade_id': trade_id,
            'instrument': instrument,
            'direction': direction,
            'entry_price': entry_price,
            'quantity': quantity,
            'stop_price': stop_price,
            'target_price': target_price,
            'entry_reason': entry_reason,
            'entry_confidence': entry_confidence,
            'risk_amount': risk_amount,
            'entry_time': timestamp.isoformat(),
            'exit_price': None,
            'exit_reason': None,
            'exit_time': None,
            'pnl': None,
            'pnl_pct': None,
            'duration_bars': None
        }
        
        self.trades.append(trade_record)
        self.current_trades[trade_id] = trade_record
    
    def record_exit(self,
                    trade_id: str,
                    exit_price: float,
                    exit_reason: str,
                    timestamp: datetime = None):
        """Record trade exit and calculate PnL."""
        if timestamp is None:
            timestamp = datetime.now()
        
        trade = self.current_trades.get(trade_id)
        if trade is None:
            raise ValueError(f"Trade {trade_id} not found")
        
        # Calculate PnL
        entry_price = trade['entry_price']
        quantity = trade['quantity']
        
        if trade['direction'] == 'long':
            trade['pnl'] = (exit_price - entry_price) * quantity
        else:
            trade['pnl'] = (entry_price - exit_price) * quantity
        
        trade['pnl_pct'] = trade['pnl'] / (entry_price * quantity) if entry_price * quantity != 0 else 0
        trade['exit_price'] = exit_price
        trade['exit_reason'] = exit_reason
        trade['exit_time'] = timestamp.isoformat()
        
        # Calculate duration (in bars, assuming 1 bar = 1 minute for now)
        entry_time = datetime.fromisoformat(trade['entry_time'])
        trade['duration_bars'] = int((timestamp - entry_time).total_seconds() / 60)
        
        del self.current_trades[trade_id]
    
    def get_summary(self, 
                    start_date: datetime = None,
                    end_date: datetime = None) -> TradeSummary:
        """Calculate trade journal summary statistics."""
        # Filter trades by date if specified
        filtered_trades = self.trades
        
        if start_date:
            filtered_trades = [
                t for t in filtered_trades
                if datetime.fromisoformat(t['entry_time']) >= start_date
            ]
        
        if end_date:
            filtered_trades = [
                t for t in filtered_trades
                if datetime.fromisoformat(t['entry_time']) <= end_date
            ]
        
        # Filter to completed trades only
        completed = [t for t in filtered_trades if t['pnl'] is not None]
        
        if not completed:
            return TradeSummary(
                total_trades=0,
                winning_trades=0,
                losing_trades=0,
                win_rate=0.0,
                gross_profit=0.0,
                gross_loss=0.0,
                profit_factor=0.0,
                total_pnl=0.0,
                avg_win=0.0,
                avg_loss=0.0,
                avg_win_loss_ratio=0.0,
                avg_trade_duration=0.0,
                sharpe_ratio=0.0
            )
        
        # Calculate statistics
        wins = [t for t in completed if t['pnl'] > 0]
        losses = [t for t in completed if t['pnl'] <= 0]
        
        total_pnl = sum(t['pnl'] for t in completed)
        gross_profit = sum(t['pnl'] for t in wins)
        gross_loss = abs(sum(t['pnl'] for t in losses))
        
        win_rate = len(wins) / len(completed) if completed else 0
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')
        
        avg_win = sum(t['pnl'] for t in wins) / len(wins) if wins else 0
        avg_loss = sum(t['pnl'] for t in losses) / len(losses) if losses else 0
        avg_win_loss_ratio = avg_win / abs(avg_loss) if avg_loss != 0 else float('inf')
        
        avg_duration = sum(t.get('duration_bars', 0) or 0 for t in completed) / len(completed)
        
        # Calculate Sharpe ratio (simplified)
        pnl_series = [t['pnl'] for t in completed]
        if len(pnl_series) > 1:
            mean_pnl = sum(pnl_series) / len(pnl_series)
            std_pnl = (sum((x - mean_pnl) ** 2 for x in pnl_series) / len(pnl_series)) ** 0.5
            sharpe_ratio = (mean_pnl / std_pnl) * (252 ** 0.5) if std_pnl != 0 else 0
        else:
            sharpe_ratio = 0.0
        
        return TradeSummary(
            total_trades=len(completed),
            winning_trades=len(wins),
            losing_trades=len(losses),
            win_rate=win_rate,
            gross_profit=gross_profit,
            gross_loss=gross_loss,
            profit_factor=profit_factor,
            total_pnl=total_pnl,
            avg_win=avg_win,
            avg_loss=avg_loss,
            avg_win_loss_ratio=avg_win_loss_ratio,
            avg_trade_duration=avg_duration,
            sharpe_ratio=sharpe_ratio
        )
    
    def save(self, filename: str = None):
        """Save journal to JSON file."""
        if filename is None:
            filename = f"{self.strategy_id}_journal_{datetime.now().strftime('%Y%m%d')}.json"
        
        filepath = os.path.join(self.base_path, filename)
        
        os.makedirs(self.base_path, exist_ok=True)
        
        with open(filepath, 'w') as f:
            json.dump({
                'strategy_id': self.strategy_id,
                'created_at': datetime.now().isoformat(),
                'total_trades': len(self.trades),
                'trades': self.trades
            }, f, indent=2)
    
    def load(self, filename: str):
        """Load journal from JSON file."""
        filepath = os.path.join(self.base_path, filename)
        
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        self.strategy_id = data['strategy_id']
        self.trades = data['trades']
        
        # Restore active trades
        for trade in self.trades:
            if trade['pnl'] is None:
                self.current_trades[trade['trade_id']] = trade
    
    def get_trades_by_instrument(self, instrument: str) -> List[Dict]:
        """Get all trades for a specific instrument."""
        return [t for t in self.trades if t['instrument'] == instrument]
    
    def get_trades_by_period(self, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Get trades within date range."""
        return [
            t for t in self.trades
            if start_date <= datetime.fromisoformat(t['entry_time']) <= end_date
        ]
```

## Adherence Checklist

Before completing your task, verify:
- [ ] **Guard Clauses**: All risk calculations check for zero/negative values; all trade journals validate entry/exit pairs
- [ ] **Parsed State**: Configuration data parsed into structured types; no raw dicts in core logic
- [ ] **Atomic Predictability**: Trading plan rules are deterministic; only timing of execution involves randomness
- [ ] **Fail Fast**: Invalid trading plan parameters throw descriptive error immediately
- [ ] **Intentional Naming**: Classes and methods use clear names (`TradingPlanBuilder`, `RiskCalculator`, `TradeJournal`)

## Common Mistakes to Avoid

1. **Post-Entry Risk Definition**: Risk parameters must be defined before entry, not after. Planning for exit should drive entry decisions.

2. **Discretionary Overrides**: Entry/exit criteria must be objective. Discretionary "exceptions" erode consistency and create hidden risk.

3. **Ignoring Position Sizing**: Fixed position sizes regardless of account size or volatility can lead to over/under-leverage.

4. **Incomplete Trade Journaling**: Journaling every trade is essential for continuous improvement. Missing data prevents analysis.

5. **Not Rebalancing Risk**: Risk parameters should be reviewed and adjusted based on performance and market conditions.

## References

1. Van Tharp Institute. "Trade Your Way to Financial Freedom" (2026).
2. Hull, J. C. "Options, Futures, and Other Derivatives" (10th Edition, 2026).
3. Van K. Tharp Institute. "Position Sizing" (2026).
4. Trading Psychology Engine. "Risk Management Framework" (2026).


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.