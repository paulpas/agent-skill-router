---
name: trading-risk-drawdown-control
description: Maximum drawdown control and equity preservation
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: equity, maximum, preservation, risk drawdown control, risk-drawdown-control
  related-skills: trading-backtest-drawdown-analysis, trading-backtest-position-sizing
    trading-exchange-order-book-sync, trading-exchange-order-execution-api
---

**Role:** Implement drawdown protection mechanisms to preserve capital during losing streaks

**Philosophy:** Drawdown control prevents catastrophic losses; a 50% drawdown requires 100% return to recover

## Key Principles

1. **Drawdown Metrics**: Peak-to-trough decline in equity
2. **Drawdown Limits**: Set max acceptable drawdown thresholds
3. **Automatic Scaling**: Reduce position size as drawdown increases
4. **Halt Conditions**: Pause trading after severe drawdowns
5. **Recovery Phases**: Gradually increase sizing after drawdown recovery

## Implementation Guidelines

### Structure
- Core logic: risk_engine/drawdown.py
- Helper functions: risk_engine/equity_curve.py
- Tests: tests/test_drawdown.py

### Patterns to Follow
- Track equity curve continuously
- Calculate peak-to-trough drawdown
- Implement drawdown-based position scaling

## Adherence Checklist
Before completing your task, verify:
- [ ] Drawdown calculated from equity curve
- [ ] Position size scales inversely with drawdown
- [ ] Halt conditions trigger at predefined drawdown levels
- [ ] Recovery phase logic implemented
- [ ] Drawdown backtesting validates strategy robustness


Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.

## Python Implementation

```python
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class DrawdownState:
    """Current drawdown state."""
    current_drawdown: float
    max_drawdown: float
    peak_value: float
    trough_value: float
    in_recovery: bool
    days_since_peak: int

class DrawdownController:
    """Manages drawdown control and position scaling."""
    
    def __init__(
        self,
        max_drawdown_pct: float = 0.10,
        halting_drawdown_pct: float = 0.15,
        recovery_drawdown_pct: float = 0.05
    ):
        self.max_drawdown_pct = max_drawdown_pct
        self.halting_drawdown_pct = halting_drawdown_pct
        self.recovery_drawdown_pct = recovery_drawdown_pct
    
    def calculate_drawdown(self, equity_curve: pd.Series) -> Tuple[float, float, float]:
        """Calculate drawdown from equity curve."""
        running_max = equity_curve.cummax()
        drawdown = (equity_curve - running_max) / (running_max + 1e-8)
        
        max_dd = drawdown.min()
        current_dd = drawdown.iloc[-1] if len(drawdown) > 0 else 0
        peak = running_max.iloc[-1] if len(running_max) > 0 else 0
        
        return float(current_dd), float(max_dd), float(peak)
    
    def calculate_drawdown_stats(
        self, equity_curve: pd.Series
    ) -> Dict:
        """Calculate comprehensive drawdown statistics."""
        running_max = equity_curve.cummax()
        drawdown = (equity_curve - running_max) / (running_max + 1e-8)
        
        # Maximum drawdown
        max_dd = drawdown.min()
        
        # Current drawdown
        current_dd = drawdown.iloc[-1] if len(drawdown) > 0 else 0
        
        # Average drawdown
        avg_dd = drawdown.mean()
        
        # Drawdown duration (max consecutive negative periods)
        dd_series = drawdown < 0
        durations = []
        current_duration = 0
        
        for is_dd in dd_series:
            if is_dd:
                current_duration += 1
            else:
                if current_duration > 0:
                    durations.append(current_duration)
                current_duration = 0
        
        if current_duration > 0:
            durations.append(current_duration)
        
        max_duration = max(durations) if durations else 0
        avg_duration = np.mean(durations) if durations else 0
        
        # Recovery metrics
        if max_dd < 0:
            recovery_ratio = abs(current_dd / max_dd) if max_dd < 0 else 0
        else:
            recovery_ratio = 1.0
        
        return {
            'max_drawdown': float(max_dd),
            'current_drawdown': float(current_dd),
            'average_drawdown': float(avg_dd),
            'max_drawdown_duration': max_duration,
            'avg_drawdown_duration': float(avg_duration),
            'recovery_ratio': float(recovery_ratio)
        }
    
    def get_position_scaling(
        self, current_dd: float, base_size: float
    ) -> float:
        """Calculate position size adjustment based on drawdown."""
        if current_dd >= 0:
            return base_size
        
        # Linear scaling: 0% at max drawdown, 100% at 0% drawdown
        scale = 1.0 - (abs(current_dd) / self.max_drawdown_pct)
        
        return max(0.0, base_size * scale)
    
    def check_halt_conditions(
        self, current_dd: float
    ) -> Tuple[bool, str]:
        """Check if trading should be halted."""
        if current_dd <= -self.halting_drawdown_pct:
            return True, f"Drawdown {current_dd:.2%} exceeds halt threshold"
        
        if current_dd <= -self.max_drawdown_pct:
            return True, f"Catastrophic drawdown {current_dd:.2%}"
        
        return False, ""
    
    def check_recovery_conditions(
        self, current_dd: float, prev_dd: float
    ) -> str:
        """Determine recovery phase status."""
        if current_dd > -self.recovery_drawdown_pct and prev_dd <= -self.recovery_drawdown_pct:
            return "entered_recovery"
        elif current_dd > -self.recovery_drawdown_pct:
            return "in_recovery"
        elif current_dd <= -self.recovery_drawdown_pct:
            return "in_drawdown"
        
        return "neutral"
    
    def calculate_recovery_trajectory(
        self, initial_dd: float, recovery_pct: float
    ) -> pd.Series:
        """Simulate recovery trajectory."""
        # Logarithmic recovery curve
        days = int(1 / recovery_pct * 252)
        days = min(days, 252)  # Cap at 1 year
        
        recovery = pd.Series(index=range(days))
        
        for i in range(days):
            # Exponential decay of drawdown
            recovery.iloc[i] = initial_dd * np.exp(-i / (days / 3))
        
        return recovery
    
    def adaptive_position_sizing(
        self, equity_curve: pd.Series, base_size: float
    ) -> pd.Series:
        """Apply dynamic position sizing based on drawdown."""
        running_max = equity_curve.cummax()
        drawdown = (equity_curve - running_max) / (running_max + 1e-8)
        
        scaling = pd.Series(index=equity_curve.index)
        
        for i, dd in enumerate(drawdown):
            if dd >= 0:
                scaling.iloc[i] = 1.0
            else:
                scale = 1.0 - (abs(dd) / self.max_drawdown_pct)
                scaling.iloc[i] = max(0.5, scale)  # Minimum 50% size
        
        return scaling * base_size
```