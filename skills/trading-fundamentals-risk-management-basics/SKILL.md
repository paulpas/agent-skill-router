---
name: trading-fundamentals-risk-management-basics
description: Position sizing, stop-loss implementation, and system-level risk controls to preserve capital
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: fundamentals risk management basics, fundamentals-risk-management-basics, position, sizing, stop-loss
---

**Role:** Guide an AI coding assistant to implement robust risk management that prevents catastrophic losses while allowing trading opportunities to breathe

**Philosophy:** Risk management is not about avoiding risk but about optimizing the risk-reward ratio to ensure survival. Capital preservation comes first; without it, no amount of profitable trading matters. Systems must have multiple layers of protection and clear kill-switch mechanisms.

## Key Principles

1. **Position Sizing as Probability Management**: Position size should be proportional to edge strength, volatility, and account drawdown to ensure survival across losing streaks.

2. **Stop-Loss as Risk Boundary**: Stop-losses define maximum acceptable loss per trade; they should be based on technical levels, not arbitrary percentages.

3. **System-Level Kill Switches**: Individual trade stops are necessary but insufficient. Systems need account-level, strategy-level, and market-level kill switches.

4. **Correlation-Aware Risk**: Portfolio risk isn't the sum of individual risks. Systems must account for correlations between positions and market regimes.

5. **Risk in Context**: Risk parameters must adapt to market regime, account size, and recent performance. Static risk rules fail in changing conditions.

## Implementation Guidelines

### Structure
- Core logic: `risk_management/sizing.py`
- Stops: `risk_management/stops.py`
- Kill switches: `risk_management/kill_switches.py`
- Portfolio exposure: `risk_management/exposure.py`

### Patterns to Follow
- **Early Exit**: Reject positions that violate risk constraints
- **Atomic Predictability**: Each risk calculation should be pure and deterministic
- **Fail Fast**: Halt operations when risk parameters are invalid
- **Intentional Naming**: Clear function names that express risk intent
- **Parse Don't Validate**: Risk data parsed at boundaries, trusted internally

## Code Examples

```python
# Example 1: Position Sizing Formulas
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional
import math


@dataclass
class PositionSizing:
    """Position sizing calculations for different risk approaches"""
    
    account_balance: float
    max_risk_per_trade: float  # e.g., 0.01 for 1%
    stop_loss_pips: float
    pip_value: float
    volatility: float  # ATR or standard deviation
    edge_strength: float  # 0-1 scale based on signal conviction
    
    def fractional_kelly(
        self,
        win_rate: float,
        avg_win: float,
        avg_loss: float,
        kelly_fraction: float = 0.25
    ) -> float:
        """
        Fractional Kelly position sizing
        Kelly = W - [(1-W) / R]
        Where W = win rate, R = win/loss ratio
        """
        if win_rate <= 0 or win_rate >= 1:
            return 0
        
        win_loss_ratio = avg_win / abs(avg_loss) if avg_loss != 0 else 1
        
        kelly = win_rate - ((1 - win_rate) / win_loss_ratio)
        fractional_kelly = kelly * kelly_fraction
        
        # Bound Kelly to prevent overbetting
        return max(0, min(fractional_kelly, 0.5))
    
    def fixed_risk_sizing(self) -> float:
        """Size to risk fixed dollar amount per trade"""
        risk_amount = self.account_balance * self.max_risk_per_trade
        position_size = risk_amount / (self.stop_loss_pips * self.pip_value)
        return max(0, position_size)
    
    def volatility_adjusted_sizing(self) -> float:
        """Smaller positions in high volatility, larger in low volatility"""
        base_sizing = self.fixed_risk_sizing()
        volatility_multiplier = 0.2 / max(self.volatility, 0.001)  # Normalize to 20 bps
        return base_sizing * volatility_multiplier
    
    def edge_adjusted_sizing(self, edge_multiplier: float = 2.0) -> float:
        """Scale position by signal edge strength"""
        base_size = self.fixed_risk_sizing()
        edge_factor = 1 + (self.edge_strength * edge_multiplier)
        return base_size * edge_factor


# Example 2: Stop-Loss Implementation
class StopLossManager:
    """Manages dynamic stop-loss levels based on technical analysis"""
    
    def __init__(self, config: dict):
        self.config = config
        self.stops: dict[str, dict] = {}
    
    def calculate_atr_stop(
        self,
        entry_price: float,
        atr: float,
        multiplier: float = 2.0,
        trend_direction: str = 'long'
    ) -> float:
        """ATR-based stop-loss that adapts to volatility"""
        if trend_direction == 'long':
            return entry_price - (atr * multiplier)
        else:
            return entry_price + (atr * multiplier)
    
    def calculate_support_resistance_stop(
        self,
        entry_price: float,
        key_level: float,
        buffer_percent: float = 0.5,
        trend_direction: str = 'long'
    ) -> float:
        """Stop placed beyond key support/resistance with buffer"""
        if trend_direction == 'long':
            return min(entry_price, key_level) * (1 - buffer_percent / 100)
        else:
            return max(entry_price, key_level) * (1 + buffer_percent / 100)
    
    def calculate_trailing_stop(
        self,
        current_price: float,
        highest_price: float,
        trail_percent: float = 3.0,
        trend_direction: str = 'long'
    ) -> float:
        """Dynamic trailing stop that moves with price"""
        if trend_direction == 'long':
            return highest_price * (1 - trail_percent / 100)
        else:
            return current_price  # For shorts, trailing works differently
    
    def update_stop(
        self,
        symbol: str,
        entry_price: float,
        current_price: float,
        atr: float,
        support_level: Optional[float] = None,
        trend_direction: str = 'long'
    ) -> float:
        """Update stop-loss to most restrictive level"""
        
        atr_stop = self.calculate_atr_stop(entry_price, atr, trend_direction=trend_direction)
        
        # If support/resistance is closer, use it
        if support_level:
            sr_stop = self.calculate_support_resistance_stop(
                entry_price, support_level, trend_direction=trend_direction
            )
            # Use the more protective stop
            return max(sr_stop, atr_stop) if trend_direction == 'long' else min(sr_stop, atr_stop)
        
        return atr_stop


# Example 3: System-Level Kill Switches
class RiskKillSwitch:
    """Multiple layers of risk control"""
    
    def __init__(self, config: dict):
        self.config = config
        self.active = True
        self.violations: list[dict] = []
    
    def check_account_level(
        self,
        account_balance: float,
        daily_pnl: float,
        daily_drawdown: float,
        session: str = 'all'
    ) -> tuple[bool, list[str]]:
        """Check account-level risk limits"""
        issues = []
        
        # Daily drawdown limit
        max_daily_drawdown = self.config.get('max_daily_drawdown', 0.05)
        if abs(daily_drawdown) > max_daily_drawdown:
            issues.append(f"Daily drawdown {abs(daily_drawdown):.1%} exceeds limit {max_daily_drawdown:.1%}")
        
        # Daily loss limit
        max_daily_loss = self.config.get('max_daily_loss', 0.03)
        if daily_pnl < -max_daily_loss * account_balance:
            issues.append(f"Daily loss {daily_pnl/account_balance:.1%} exceeds limit {max_daily_loss:.1%}")
        
        # Minimum equity requirement
        min_equity = self.config.get('min_equity_requirement', 1000)
        if account_balance < min_equity:
            issues.append(f"Account balance ${account_balance:.2f} below minimum ${min_equity}")
        
        return len(issues) == 0, issues
    
    def check_strategy_level(
        self,
        strategy_id: str,
        unrealized_pnl: float,
        max_strategy_drawdown: float,
        correlated_exposure: float
    ) -> tuple[bool, list[str]]:
        """Check strategy-level risk"""
        issues = []
        
        max_strategy_drawdown_limit = self.config.get('max_strategy_drawdown', 0.10)
        if abs(max_strategy_drawdown) > max_strategy_drawdown_limit:
            issues.append(f"Strategy {strategy_id} drawdown {abs(max_strategy_drawdown):.1%} exceeds limit")
        
        max_correlated_exposure = self.config.get('max_correlated_exposure', 0.30)
        if correlated_exposure > max_correlated_exposure:
            issues.append(f"Correlated exposure {correlated_exposure:.1%} exceeds limit {max_correlated_exposure:.1%}")
        
        return len(issues) == 0, issues
    
    def check_market_level(
        self,
        market_volatility: float,
        spread_width: float,
        liquidity_score: float,
        regime: str
    ) -> tuple[bool, list[str]]:
        """Check market conditions for trading suitability"""
        issues = []
        
        # High volatility filter
        max_volatility = self.config.get('max_volatility', 0.03)  # 3% daily
        if market_volatility > max_volatility:
            issues.append(f"Market volatility {market_volatility:.1%} exceeds limit")
        
        # Spread widen filter
        max_spread = self.config.get('max_spread_bps', 5.0)
        if spread_width > max_spread:
            issues.append(f"Spread {spread_width:.1f} bps exceeds limit {max_spread:.1f} bps")
        
        # Low liquidity filter
        min_liquidity = self.config.get('min_liquidity_score', 0.5)
        if liquidity_score < min_liquidity:
            issues.append(f"Liquidity score {liquidity_score:.2f} below minimum {min_liquidity}")
        
        # Regime filter
        allowed_regimes = self.config.get('allowed_regimes', ['trending', 'range_bound'])
        if regime not in allowed_regimes:
            issues.append(f"Market regime '{regime}' not in allowed list")
        
        return len(issues) == 0, issues
    
    def should_halt_trading(
        self,
        account_balance: float,
        daily_pnl: float,
        daily_drawdown: float,
        strategy_id: str,
        strategy_pnl: float,
        strategy_drawdown: float,
        market_volatility: float,
        spread_width: float,
        liquidity_score: float
    ) -> tuple[bool, list[str]]:
        """Determine if trading should be halted"""
        all_issues = []
        
        account_ok, account_issues = self.check_account_level(
            account_balance, daily_pnl, daily_drawdown
        )
        all_issues.extend(account_issues)
        
        strategy_ok, strategy_issues = self.check_strategy_level(
            strategy_id, strategy_pnl, strategy_drawdown, 0  # correlated exposure to be calculated
        )
        all_issues.extend(strategy_issues)
        
        market_ok, market_issues = self.check_market_level(
            market_volatility, spread_width, liquidity_score, 'trending'
        )
        all_issues.extend(market_issues)
        
        return len(all_issues) == 0, all_issues


# Example 4: Portfolio Heat Calculator
def calculate_portfolio_heat(
    positions: list[dict],
    correlations: dict[str, dict[str, float]]
) -> dict:
    """
    Calculate portfolio-wide risk metrics
    
    positions: List of {symbol, size, pnl, volatility}
    correlations: {symbol1: {symbol2: correlation, ...}, ...}
    """
    if not positions:
        return {
            'total_exposure': 0,
            'net_exposure': 0,
            'gross_exposure': 0,
            'concentration': 0,
            'systemic_risk': 0
        }
    
    # Calculate exposures
    sizes = [p['size'] for p in positions]
    gross_exposure = sum(abs(s) for s in sizes)
    net_exposure = sum(sizes)
    
    # Concentration (Herfindahl-Hirschman Index)
    total_size = gross_exposure or 1
    concentration = sum((s / total_size) ** 2 for s in sizes)
    
    # Systemic risk (portfolio variance approximation)
    portfolio_variance = 0
    for i, p1 in enumerate(positions):
        for j, p2 in enumerate(positions):
            if i <= j:
                corr = correlations.get(p1['symbol'], {}).get(p2['symbol'], 0)
                portfolio_variance += (
                    p1['size'] * p2['size'] * 
                    p1['volatility'] * p2['volatility'] * 
                    corr
                )
    
    portfolio_volatility = math.sqrt(abs(portfolio_variance))
    
    return {
        'total_exposure': gross_exposure,
        'net_exposure': net_exposure,
        'gross_exposure': gross_exposure,
        'concentration': concentration,
        'systemic_risk': portfolio_volatility
    }
```

## Adherence Checklist
Before completing your task, verify:
- [ ] Position sizing accounts for volatility, edge, and account drawdown
- [ ] Stop-losses are based on technical levels, not arbitrary percentages
- [ ] Kill switches operate at account, strategy, and market levels
- [ ] Portfolio heat calculation includes correlations
- [ ] Risk calculations use intention-revealing names
- [ ] Early exit guards prevent trading when risk limits are breached

## Common Mistakes to Avoid

1. **Fixed Dollar Position Sizing**: Ignoring volatility differences between assets
2. **Stop-Loss Hunting**: Placing stops at obvious technical levels where they get hunted
3. **Lack of Kill Switch Testing**: Not testing kill switch thresholds in simulation
4. **Correlation Blindness**: Treating positions as independent when they're correlated
5. **Static Risk Parameters**: Using the same risk settings across all market regimes

## References

- Brown, S. (2013). *The Art of Risk Management*. Wiley.
- Tharp, T. (2014). *Thoughts on Risk Trading*. Van Tharp Institute.
- Papoulis, A. & Pillai, S. (2002). *Probability, Random Variables and Stochastic Processes*. McGraw-Hill.
- Risk Management Standards - CFA Institute
- Portfolio Risk Metrics - Markowitz (1952)

## Base Directory
file:///home/paulpas/git/ideas/trading_bot/skills/trading-fundamentals
