---
# Skill Title: Trading Risk Management

  archetypes: tactical, educational
  anti_triggers: naive assessments, simplistic views on trading, quick solutions
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational


Implements risk management techniques for traders, focusing on position sizing, risk-reward ratios, and drawdown control strategies to safeguard capital and enhance trading performance.

## TL;DR Checklist
- [ ] Calculate position sizes based on risk percentage.
- [ ] Evaluate risk-reward ratios for trades.
- [ ] Implement drawdown control measures.

---

## When to Use

Use this skill when:
- Assessing overall risk exposure in trading portfolios.
- Determining position sizes based on account equity and risk tolerance.
- Evaluating potential reward-to-risk ratios before executing trades.
- Setting drawdown control measures to protect capital.

---

## When NOT to Use

Avoid this skill for:
- Non-trading risk assessments.
- Situations where risk management practices are already established and adhered to.

---

## Core Workflow

1. **Calculate Position Size** — Use risk percentage of account equity for position sizing.
2. **Evaluate Risk-Reward Ratio** — Ensure potential rewards justify the risks taken.
3. **Implement Drawdown Control** — Set limits to prevent significant capital loss.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Position Sizing Calculation

```python
def calculate_position_size(account_equity: float, risk_percentage: float, stop_loss_distance: float) -> float:
    """Calculate the position size based on account equity and risk.
    Args:
        account_equity (float): Total equity in the trading account.
        risk_percentage (float): The percentage of equity you are willing to risk.
        stop_loss_distance (float): The distance from the entry price to the stop-loss price.
    Returns:
        float: The size of the position to take.
    """
    risk_amount = account_equity * (risk_percentage / 100)
    position_size = risk_amount / stop_loss_distance
    return position_size
```

### Pattern 2: Risk-Reward Ratio Evaluation

```python
def evaluate_risk_reward(entry_price: float, stop_loss_price: float, take_profit_price: float) -> float:
    """Calculate the risk-reward ratio.
    Args:
        entry_price (float): The entry price of the trade.
        stop_loss_price (float): The price where you would stop the loss.
        take_profit_price (float): The target price for profit.
    Returns:
        float: The risk-reward ratio.
    """
    risk = entry_price - stop_loss_price
    reward = take_profit_price - entry_price
    return reward / risk if risk != 0 else float('inf')  # Prevent division by zero
```

### Pattern 3: Drawdown Control

```python
def check_drawdown(current_equity: float, peak_equity: float, max_drawdown_percentage: float) -> bool:
    """Check if the drawdown exceeds the maximum allowed.
    Args:
        current_equity (float): Current equity of the account.
        peak_equity (float): Peak equity of the account.
        max_drawdown_percentage (float): The maximum allowed drawdown percentage.
    Returns:
        bool: True if drawdown exceeds the limit, else False.
    """
    drawdown = (peak_equity - current_equity) / peak_equity
    return drawdown > (max_drawdown_percentage / 100)
```

---

## Constraints

### MUST DO
- Calculate position sizes based on the calculated risk per trade.
- Maintain a risk-reward ratio of at least 1:2 for all trades.

### MUST NOT DO
- Exceed risk limits based on account balance.
- Implement high-risk strategies that threaten significant capital loss.
---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Risk Management Tutorial](https://docs.quantconnect.com/tutorials/risk-management)
- [Position Sizing and Risk Control](https://www.investopedia.com/terms/p/position-sizing.asp)
- [Portfolio Risk Metrics](https://en.wikipedia.org/wiki/Value_at_risk)
- [Risk Management Best Practices for Traders](https://www.investopedia.com/articles/trading/05/riskmanagement.asp)
- [Drawdown Control Strategies](https://www.investopedia.com/terms/d/drawdown.asp)
