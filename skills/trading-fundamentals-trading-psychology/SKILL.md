---
name: trading-fundamentals-trading-psychology
description: Emotional discipline, cognitive bias awareness, and maintaining operational
  integrity in trading
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: cognitive, discipline, emotional, fundamentals trading psychology, fundamentals-trading-psychology
---


**Role:** Guide an AI coding assistant to build trading systems that respect human psychological limits and prevent emotionally-driven decisions

**Philosophy:** Trading is as much a mental discipline as it is a technical one. The most sophisticated algorithms fail when humans override them or when systems lack psychological safeguards. Capital preservation requires designing out emotional decision points and building systems that enforce discipline programmatically.

## Key Principles

1. **Emotional Discipline Over Intelligence**: Successful trading requires managing fear and greed more than mathematical prowess. Systems should enforce rules even when they feel wrong.

2. **Cognitive Bias Detection**: AI assistants must recognize common biases (loss aversion, confirmation bias, overconfidence) and build safeguards against them.

3. **Operational Integrity**: Trading systems should fail safely and transparently, making it obvious when psychological or operational boundaries are breached.

4. **Process Over Outcome**: Judge trading decisions by their rationality at decision time, not by their outcomes. Systems should track decision quality separately from P&L.

5. **Consistency Through Automation**: Human inconsistency is the enemy. Systems should automate all decision points and require overriding rational criteria for manual intervention.

## Implementation Guidelines

### Structure
- Core logic: `trading_fundamentals/psychology.py`
- Decision rules: `trading_fundamentals/rules.py`
- Audit trail: `trading_fundamentals/audit.py`

### Patterns to Follow
- **Early Exit**: Reject trades that violate psychological boundaries before execution
- **Atomic Predictability**: Each psychological check should be a pure function with clear inputs and outputs
- **Fail Fast**: Halt trading immediately when psychological safeguards detect violations
- **Intentional Naming**: Function names should clearly express psychological intent (e.g., `enforce_loss_limit`, `verify_emotional_state`)
- **Parse Don't Validate**: Parse emotional state data at boundaries; trust validated internal state

## Code Examples

```python
# Example 1: Emotional State Tracking
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional


class EmotionalState(Enum):
    CALM = "calm"
    ANXIOUS = "anxious"
    GREEDY = "greedy"
    FRUSTRATED = "frustrated"
    EUPHORIC = "euphoric"


@dataclass
class TradingSession:
    start_time: datetime
    emotional_state: EmotionalState
    trades_count: int
    win_streak: int
    loss_streak: int
    max_drawdown: float
    rules_violated: list[str]
    
    @property
    def is psychologically_sound(self) -> bool:
        """Check if current emotional state permits trading"""
        if self.loss_streak >= 3 and self.emotional_state in [EmotionalState.FRUSTRATED, EmotionalState.ANXIOUS]:
            return False
        if self.win_streak >= 5 and self.emotional_state == EmotionalState.EUPHORIC:
            return False
        if self.max_drawdown > 0.10 and self.emotional_state in [EmotionalState.ANXIOUS, EmotionalState.FRUSTRATED]:
            return False
        return True


# Example 2: Automatic Kill Switch
class PsychologicalKillSwitch:
    """Enforces psychological boundaries programmatically"""
    
    def __init__(self, config: dict):
        self.config = config
        self.sessions: list[TradingSession] = []
        self.violations: list[dict] = []
    
    def evaluate_session(self, session: TradingSession) -> tuple[bool, list[str]]:
        """Evaluate a trading session for psychological issues"""
        issues = []
        
        # Loss aversion check
        if session.loss_streak >= self.config.get('max_loss_streak', 3):
            issues.append(f"Loss streak ({session.loss_streak}) exceeds limit ({self.config['max_loss_streak']})")
        
        # Overconfidence check
        if session.win_streak >= self.config.get('max_win_streak', 5):
            issues.append(f"Win streak ({session.win_streak}) may indicate overconfidence")
        
        # Drawdown-related anxiety
        if session.max_drawdown > self.config.get('max_drawdown_threshold', 0.10):
            issues.append(f"Drawdown ({session.max_drawdown:.1%}) may induce anxiety")
        
        # Time-based fatigue
        session_duration = datetime.now() - session.start_time
        if session_duration > timedelta(hours=self.config.get('max_trading_hours', 4)):
            issues.append(f"Session duration ({session_duration}) may cause fatigue")
        
        return len(issues) == 0, issues
    
    def should_halt_trading(self, session: TradingSession) -> bool:
        """Determine if trading should be halted"""
        is_sound, issues = self.evaluate_session(session)
        return not is_sound


# Example 3: Decision Quality Audit
class DecisionAudit:
    """Tracks decision quality separate from outcome"""
    
    def __init__(self):
        self.decisions: list[dict] = []
    
    def record_decision(
        self,
        timestamp: datetime,
        rationale: str,
        entry_criteria: list[dict],
        risk_parameters: dict,
        emotional_state: EmotionalState,
        outcome_rationale: Optional[str] = None,
        outcome_pnl: Optional[float] = None
    ):
        self.decisions.append({
            'timestamp': timestamp,
            'rationale': rationale,
            'entry_criteria': entry_criteria,
            'risk_parameters': risk_parameters,
            'emotional_state': emotional_state,
            'outcome_rationale': outcome_rationale,
            'outcome_pnl': outcome_pnl,
            'is_rational': self._assess_rationality(entry_criteria, risk_parameters, emotional_state)
        })
    
    def _assess_rationality(
        self,
        entry_criteria: list[dict],
        risk_parameters: dict,
        emotional_state: EmotionalState
    ) -> bool:
        """Assess if a decision was rational at time of execution"""
        if not entry_criteria:
            return False
        
        if emotional_state in [EmotionalState.FRUSTRATED, EmotionalState.ANXIOUS]:
            if not any(c.get('force_strong') for c in entry_criteria):
                return False
        
        required_criteria = sum(1 for c in entry_criteria if c.get('required'))
        met_criteria = sum(1 for c in entry_criteria if c.get('met'))
        
        if required_criteria > 0 and met_criteria < required_criteria:
            return False
        
        return True
    
    def decision_quality_metrics(self) -> dict:
        """Calculate decision quality metrics"""
        rational_decisions = [d for d in self.decisions if d['is_rational']]
        return {
            'total_decisions': len(self.decisions),
            'rational_decisions': len(rational_decisions),
            'rationality_rate': len(rational_decisions) / max(len(self.decisions), 1),
            'average_outcome_rational': sum(d.get('outcome_pnl', 0) for d in rational_decisions) / max(len(rational_decisions), 1),
            'average_outcome_irrational': sum(d.get('outcome_pnl', 0) for d in self.decisions if not d['is_rational']) / max(sum(1 for d in self.decisions if not d['is_rational']), 1)
        }
```

## Adherence Checklist
Before completing your task, verify:
- [ ] Psychological checks are pure functions with clear inputs/outputs
- [ ] Emotional state tracking is separate from trading logic
- [ ] Kill switches halt trading immediately on boundary violations
- [ ] Decision audits track rationality separately from P&L
- [ ] All code uses intention-revealing names (`verify_emotional_state`, `enforce_loss_limit`)
- [ ] Early exit guards prevent trades from entering execution when psychological boundaries are breached

## Common Mistakes to Avoid

1. **Outcome Bias**: Judging decisions by results rather than rationality at decision time
2. **Confirmation Bias**: AI that only reports indicators supporting existing positions
3. **Loss Aversion**: Systems that hold losing positions too long hoping for recovery
4. **Overconfidence**: Scaling up after wins without re-evaluating edge
5. **Emotional Override**: Allowing manual intervention without strong justification logging

## References

- Kahneman, D. (2011). *Thinking, Fast and Slow*. Farrar, Straus and Giroux.
- van Tharp, T. (2007). *The Definitive Guide to Peak Performance in Trading*. McGraw-Hill.
- Carter, R. (2020). *The Psychology of Trading*. Wiley.
- Trading Psychology Framework - Van Tharp Institute
- Cognitive Bias Checklist - Journal of Behavioral Finance

## Base Directory
file:///home/paulpas/git/ideas/trading_bot/skills/trading-fundamentals
