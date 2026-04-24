---
name: trading-risk-position-sizing
description: Calculating optimal position sizes using Kelly criterion, volatility
  adjustments, and edge-based sizing to maximize long-term growth while managing risk
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: calculating, optimal, risk position sizing, risk-position-sizing, sizes
  related-skills: trading-backtest-drawdown-analysis, trading-backtest-position-sizing
    trading-exchange-order-book-sync, trading-exchange-order-execution-api
---

**Role:** Guide an AI coding assistant to implement mathematically sound position sizing that balances growth optimization with capital preservation across varying market conditions

**Philosophy:** Position sizing is the most important factor in trading success—far more significant than entry timing or strategy selection. Systems must calculate position sizes dynamically based on edge strength, volatility, account drawdown, and market conditions. Static position sizing ignores the probabilistic nature of trading and leads to suboptimal outcomes. Risk should be proportional to opportunity.

## Key Principles

1. **Kelly Criterion as Growth Optimizer**: Full Kelly maximizes long-term growth but is volatile; fractional Kelly provides smoother equity curves. Position size should be a function of edge and odds.

2. **Volatility-Adjusted Sizing**: Higher volatility requires smaller positions to maintain equivalent risk. Sizing should scale inversely with volatility metrics (ATR, standard deviation).

3. **Edge-Weighted Position Sizing**: Position size should scale with the strength of the trading signal. Stronger edges justify larger positions; weaker edges warrant smaller positions or no position at all.

4. **Drawdown-Constrained Sizing**: Position size must be reduced as account drawdown increases. This implements risk aversion and prevents terminal ruin during losing streaks.

5. **Fixed Fractional as Baseline**: Use fixed fractional position sizing as a robust baseline that automatically scales with account equity while maintaining consistent risk profiles.

## Implementation Guidelines

### Structure
- Core logic: `risk_engine/position_sizing.py`
- Kelly calculations: `risk_engine/kelly.py`
- Volatility adjustments: `risk_engine/volatility.py`
- Edge adjustments: `risk_engine/edge.py`
- Tests: `tests/test_position_sizing.py`

### Patterns to Follow
- **Early Exit**: Reject positions when edge or volatility data is unavailable
- **Atomic Predictability**: Position size calculations are deterministic given inputs
- **Fail Fast**: Halt when Kelly fraction is negative or invalid
- **Intentional Naming**: Clear names for sizing methods (fractional_kelly, volatility_adjusted)
- **Parse Don't Validate**: Position sizing data parsed at boundaries, validated internally

## Code Examples

```python
# Example 1: Full and Fractional Kelly Position Sizing
from dataclasses import dataclass
from typing import Optional
from decimal import Decimal


@dataclass
class KellyResult:
    """Result of Kelly calculation"""
    kelly_fraction: float  # Recommended position size (0-1)
    expected_growth: float  # Expected growth rate
    volatility_adjusted: float  # Adjusted for volatility
    is_valid: bool
    reason: str = ""


class KellyCalculator:
    """
    Calculates optimal position sizing using Kelly criterion
    
    Kelly Formula: f = W - [(1-W) / R]
    Where:
        f = Kelly fraction
        W = Win rate (0-1)
        R = Win/Loss ratio (avg_win / abs(avg_loss))
    """
    
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.max_kelly_fraction = self.config.get('max_kelly_fraction', 0.5)
        self.min_trades_required = self.config.get('min_trades_required', 30)
    
    def calculate_full_kelly(
        self,
        win_rate: float,
        avg_win: float,
        avg_loss: float
    ) -> float:
        """
        Calculate full Kelly position size
        
        Args:
            win_rate: Percentage of winning trades (0-1)
            avg_win: Average win amount (positive)
            avg_loss: Average loss amount (negative)
        
        Returns:
            Kelly fraction (0-1), clamped to max_kelly_fraction
        """
        if win_rate <= 0 or win_rate >= 1:
            return 0.0
        
        if avg_win <= 0 or avg_loss >= 0:
            return 0.0
        
        win_loss_ratio = avg_win / abs(avg_loss)
        
        # Handle edge case where win_loss_ratio <= 1
        if win_loss_ratio <= 1 and win_rate <= 0.5:
            return 0.0
        
        kelly = win_rate - ((1 - win_rate) / win_loss_ratio)
        
        # Clamp to valid range
        return max(0.0, min(kelly, self.max_kelly_fraction))
    
    def calculate_fractional_kelly(
        self,
        win_rate: float,
        avg_win: float,
        avg_loss: float,
        kelly_fraction: float = 0.25
    ) -> float:
        """
        Calculate fractional Kelly position size
        
        Fractional Kelly = Kelly * fraction
        Common fractions: 0.25 (quarter Kelly), 0.5 (half Kelly)
        
        Args:
            win_rate: Percentage of winning trades (0-1)
            avg_win: Average win amount (positive)
            avg_loss: Average loss amount (negative)
            kelly_fraction: Fraction of full Kelly to use (default 0.25)
        
        Returns:
            Fractional Kelly fraction (0-1)
        """
        full_kelly = self.calculate_full_kelly(win_rate, avg_win, avg_loss)
        return full_kelly * kelly_fraction
    
    def calculate_kelly_with_edge(
        self,
        win_rate: float,
        avg_win: float,
        avg_loss: float,
        edge_strength: float = 1.0
    ) -> KellyResult:
        """
        Calculate Kelly with edge strength multiplier
        
        Args:
            win_rate: Percentage of winning trades (0-1)
            avg_win: Average win amount (positive)
            avg_loss: Average loss amount (negative)
            edge_strength: Multiplier for Kelly (1.0 = full, >1 = confident, <1 = uncertain)
        
        Returns:
            KellyResult with calculated values
        """
        full_kelly = self.calculate_full_kelly(win_rate, avg_win, avg_loss)
        
        # Apply edge strength
        adjusted_kelly = full_kelly * edge_strength
        
        # Expected growth rate (approximation)
        # G = W * ln(1 + R*f) + (1-W) * ln(1 - f)
        if full_kelly > 0 and full_kelly < 1:
            win_loss_ratio = avg_win / abs(avg_loss)
            growth = (
                win_rate * (1 + win_loss_ratio * adjusted_kelly).bit_length() +
                (1 - win_rate) * (1 - adjusted_kelly).bit_length()
            )
        else:
            growth = 0.0
        
        return KellyResult(
            kelly_fraction=adjusted_kelly,
            expected_growth=growth,
            volatility_adjusted=adjusted_kelly,
            is_valid=adjusted_kelly > 0
        )


# Example 2: Position Sizing Formulas
class PositionSizingCalculator:
    """Implements multiple position sizing formulas"""
    
    def __init__(self, account_balance: float, config: dict = None):
        self.account_balance = account_balance
        self.config = config or {}
    
    def fixed_dollar_sizing(self, dollar_amount: float) -> float:
        """
        Fixed dollar position sizing
        
        Returns number of shares/units for fixed dollar investment
        """
        return dollar_amount / self.account_balance
    
    def fixed_risk_sizing(
        self,
        risk_amount: float,
        stop_loss_pips: float,
        pip_value: float
    ) -> float:
        """
        Size to risk fixed dollar amount
        
        Position Size = Risk Amount / (Stop Loss * Pip Value)
        """
        if stop_loss_pips <= 0 or pip_value <= 0:
            return 0.0
        
        return risk_amount / (stop_loss_pips * pip_value)
    
    def fixed_fractional_sizing(
        self,
        risk_fraction: float,
        stop_loss_pips: float,
        pip_value: float
    ) -> float:
        """
        Fixed fractional position sizing
        
        Position size scales with account balance
        Risk Amount = Account Balance * Risk Fraction
        """
        risk_amount = self.account_balance * risk_fraction
        return self.fixed_risk_sizing(risk_amount, stop_loss_pips, pip_value)
    
    def kelly_sizing(
        self,
        win_rate: float,
        avg_win: float,
        avg_loss: float,
        kelly_fraction: float = 0.25
    ) -> float:
        """
        Kelly-based position sizing
        
        Returns position size as fraction of account
        """
        calculator = KellyCalculator(self.config)
        kelly = calculator.calculate_fractional_kelly(
            win_rate, avg_win, avg_loss, kelly_fraction
        )
        
        # Convert fraction to dollar amount, then to units
        risk_amount = self.account_balance * kelly
        return risk_amount / self.account_balance
    
    def volatility_adjusted_sizing(
        self,
        base_position: float,
        current_volatility: float,
        normalized_volatility: float = 0.02
    ) -> float:
        """
        Adjust position size based on volatility
        
        Higher volatility = smaller positions
        Lower volatility = larger positions
        
        Position Adjustment = Base * (Normalized Vol / Current Vol)
        """
        if current_volatility <= 0:
            return base_position
        
        volatility_ratio = normalized_volatility / current_volatility
        return base_position * volatility_ratio
    
    def drawdown_adjusted_sizing(
        self,
        base_position: float,
        account_balance: float,
        peak_balance: float,
        drawdown_penalty: float = 0.01
    ) -> float:
        """
        Reduce position size as drawdown increases
        
        Args:
            base_position: Base position size
            account_balance: Current account balance
            peak_balance: Highest account balance
            drawdown_penalty: Penalty per percentage of drawdown
        
        Returns:
            Drawdown-adjusted position size
        """
        if peak_balance <= 0:
            return base_position
        
        drawdown = (peak_balance - account_balance) / peak_balance
        
        # Reduce position by penalty * drawdown
        adjustment = 1 - (drawdown_penalty * drawdown * 100)
        
        return max(0.0, base_position * adjustment)


# Example 3: Volatility-Adjusted Position Sizing
class VolatilityPositionSizer:
    """Position sizing that adapts to market volatility"""
    
    def __init__(self, account_balance: float, config: dict = None):
        self.account_balance = account_balance
        self.config = config or {}
        self.base_volatility = self.config.get('base_volatility', 0.02)
        self.max_position_size = self.config.get('max_position_size', 0.5)
    
    def calculate_size(
        self,
        atr: float,
        target_risk_amount: float,
        volatility_threshold: float = 0.05
    ) -> float:
        """
        Calculate position size adjusted for ATR volatility
        
        Args:
            atr: Average True Range
            target_risk_amount: Dollar amount to risk
            volatility_threshold: Volatility level that triggers reduction
        
        Returns:
            Position size (number of units)
        """
        if atr <= 0:
            return 0.0
        
        # Calculate normalizing factor
        if atr > volatility_threshold:
            # High volatility: reduce position
            adjustment = volatility_threshold / atr
        else:
            # Low volatility: can take larger position
            adjustment = 1.0
        
        # Base position size
        base_size = target_risk_amount / atr
        
        # Apply adjustment
        adjusted_size = base_size * adjustment
        
        # Constrain by maximum position size
        max_units = (self.account_balance * self.max_position_size) / atr
        return min(adjusted_size, max_units)
    
    def calculate_position_value(
        self,
        symbol_volatility: float,
        risk_percent: float,
        correlation: float = 1.0
    ) -> float:
        """
        Calculate position value accounting for correlation
        
        Higher correlation between positions requires smaller individual positions
        """
        base_position = self.account_balance * risk_percent
        
        # Reduce for correlation (diversification benefit)
        correlation_adjustment = 1.0 / max(correlation, 0.1)
        
        adjusted_position = base_position * correlation_adjustment
        
        # Volatility adjustment
        vol_adjustment = self.base_volatility / max(symbol_volatility, 0.001)
        
        return adjusted_position * vol_adjustment


# Example 4: Edge-Adjusted Position Sizing
class EdgePositionSizer:
    """Position sizing based on trading signal edge strength"""
    
    def __init__(self, account_balance: float, config: dict = None):
        self.account_balance = account_balance
        self.config = config or {}
        self.min_edge_threshold = self.config.get('min_edge_threshold', 0.05)
        self.max_edge_multiplier = self.config.get('max_edge_multiplier', 3.0)
    
    def calculate_edge_size(
        self,
        base_size: float,
        edge_score: float,
        confidence: float = 1.0
    ) -> float:
        """
        Adjust position size based on edge score and confidence
        
        Args:
            base_size: Base position size without edge adjustment
            edge_score: Trading edge strength (-1 to 1, where 1 is strongest)
            confidence: Confidence in the edge estimate (0-1)
        
        Returns:
            Edge-adjusted position size
        """
        # Filter out weak edges
        if abs(edge_score) < self.min_edge_threshold:
            return 0.0
        
        # Calculate edge multiplier
        # edge_score of 0.5 with confidence 1.0 = 2x position
        base_multiplier = 1.0 + abs(edge_score) * self.max_edge_multiplier
        
        # Apply confidence adjustment
        adjusted_multiplier = base_multiplier * confidence
        
        return base_size * adjusted_multiplier
    
    def calculate_risk_reward_adjusted_size(
        self,
        base_size: float,
        win_rate: float,
        rr_ratio: float,
        confidence: float = 1.0
    ) -> float:
        """
        Size position based on risk-reward profile
        
        Args:
            base_size: Base position size
            win_rate: Probability of winning (0-1)
            rr_ratio: Risk-reward ratio (reward / risk)
            confidence: Confidence in these estimates
        
        Returns:
            Risk-reward adjusted position size
        """
        if win_rate <= 0 or win_rate >= 1 or rr_ratio <= 0:
            return 0.0
        
        # Expected value
        expected_value = win_rate - ((1 - win_rate) / rr_ratio)
        
        if expected_value <= 0:
            return 0.0
        
        # Position multiplier based on expected value
        # EV of 0.1 = 2x position, EV of 0.2 = 3x position, etc.
        multiplier = 1.0 + expected_value * 10
        
        return base_size * multiplier * confidence
    
    def get_position_category(self, edge_score: float) -> str:
        """Categorize position by edge strength"""
        if abs(edge_score) < 0.05:
            return "no_edge"
        elif abs(edge_score) < 0.15:
            return "weak_edge"
        elif abs(edge_score) < 0.30:
            return "moderate_edge"
        elif abs(edge_score) < 0.50:
            return "strong_edge"
        else:
            return "very_strong_edge"


# Example 5: Dynamic Position Sizer (Combines All Factors)
class DynamicPositionSizer:
    """Comprehensive position sizing combining multiple factors"""
    
    def __init__(self, account_balance: float, config: dict = None):
        self.account_balance = account_balance
        self.config = config or {}
        
        self.volatility_sizer = VolatilityPositionSizer(account_balance, config)
        self.edge_sizer = EdgePositionSizer(account_balance, config)
        self.kelly_calculator = KellyCalculator(config)
        
        # Weight factors
        self.volatility_weight = self.config.get('volatility_weight', 0.3)
        self.edge_weight = self.config.get('edge_weight', 0.4)
        self.kelly_weight = self.config.get('kelly_weight', 0.3)
    
    def calculate_position(
        self,
        atr: float,
        target_risk: float,
        win_rate: float,
        avg_win: float,
        avg_loss: float,
        edge_score: float,
        confidence: float = 1.0,
        correlation: float = 1.0
    ) -> dict:
        """
        Calculate comprehensive position size
        
        Returns dict with breakdown of calculations
        """
        base_size = target_risk / self.account_balance
        
        # Calculate各 component sizes
        volatility_size = self.volatility_sizer.calculate_position_value(
            atr, base_size, correlation
        )
        
        edge_size = self.edge_sizer.calculate_edge_size(
            base_size, edge_score, confidence
        )
        
        kelly_size = base_size * self.kelly_calculator.calculate_full_kelly(
            win_rate, avg_win, avg_loss
        )
        
        # Combine using weights
        total_size = (
            self.volatility_weight * volatility_size +
            self.edge_weight * edge_size +
            self.kelly_weight * kelly_size
        )
        
        # Apply maximum position constraint
        max_position = self.config.get('max_position_size', 0.5)
        total_size = min(total_size, max_position)
        
        return {
            'position_size': total_size,
            'position_value': total_size * self.account_balance,
            'risk_amount': total_size * self.account_balance,
            'breakdown': {
                'volatility_adjusted': volatility_size,
                'edge_adjusted': edge_size,
                'kelly_sizing': kelly_size
            },
            'edge_category': self.edge_sizer.get_position_category(edge_score),
            'is_valid': total_size > 0
        }
```

## Adherence Checklist
Before completing your task, verify:
- [ ] Full and fractional Kelly calculations implemented with edge cases
- [ ] Volatility-adjusted sizing scales positions inversely with volatility
- [ ] Edge-adjusted sizing scales with signal strength and confidence
- [ ] Drawdown-constrained sizing reduces positions as equity declines
- [ ] Early exit prevents sizing when edge or volatility data is unavailable
- [ ] All sizing calculations use intentional, descriptive names
- [ ] Position size clamped to reasonable bounds (0-50% typically)

## Common Mistakes to Avoid

1. **Fixed Lot Sizing**: Using the same position size regardless of account balance or market conditions
2. **Over-Betting Kelly**: Using full Kelly without fraction, leading to high volatility and ruin risk
3. **Ignoring Volatility**: Taking the same position size in high and low volatility environments
4. **No Edge Filtering**: Taking positions on weak signals without reducing position size
5. **Static Drawdown Management**: Not adjusting position size as account drawdown increases

## References

- Kelly, J.L. (1956). "A New Interpretation of Information Rate". Bell System Technical Journal.
- Thorp, E.O. (2017). *The Kelly Capital Growth Investment Criterion*. World Scientific.
- Brown, S. (2013). *The Art of Risk Management*. Wiley.
- Ziemba, W.T. (2010). *The Kelly Capital Growth Investment Criterion: Theory and Practice*. World Scientific.
- Position Sizing - Van Tharp Institute

## Base Directory
file:///home/paulpas/git/ideas/trading_bot/skills/risk-engine