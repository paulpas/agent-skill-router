---
name: agent-failure-mode-analysis
description: Performs failure mode analysis by identifying potential failure points in agent systems, assessing failure impact, and generating mitigation strategies.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: reliability
  scope: failure analysis
  output-format: analysis
  triggers: failure mode analysis, failure-mode-analysis, analyzes, failures, risk, mitigation
---

# Failure Mode Analysis (Agent System Reliability)

> **Load this skill** when designing or modifying agent systems that perform failure mode analysis, identifying potential failure points, assessing their impact, and generating mitigation strategies for agent architectures.

## TL;DR Checklist

When performing failure mode analysis:

- [ ] Identify all potential failure modes for each agent component
- [ ] Assess failure severity, occurrence, and detectability
- [ ] Calculate Risk Priority Numbers (RPN)
- [ ] Generate mitigation strategies for high-RPN failures
- [ ] Validate mitigation effectiveness
- [ ] Track failure mode history across executions
- [ ] Support dynamic failure mode updates
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Failure Mode Analysis when:

- Designing new agent systems and identifying reliability risks
- Reviewing existing agent architectures for failure points
- Building resilience into agent workflows
- Creating failure recovery strategies
- Implementing proactive monitoring and alerting
- Validating agent system reliability before deployment
- Analyzing past failures to prevent recurrence

---

## When NOT to Use

Avoid using this skill for:

- Runtime error handling (use error handler)
- Performance optimization (use profiler)
- Security vulnerability analysis (use security scanner)
- Code correctness verification (use correctness verifier)
- Documentation quality checks (use docs analyzer)

---

## Core Concepts

### Failure Mode Analysis Framework

Failure modes are analyzed using the FMEA (Failure Mode and Effects Analysis) approach:

```
Agent System
├── Component 1 (Agent)
│   ├── Failure Mode 1: Task timeout
│   ├── Failure Mode 2: Memory exhaustion
│   └── Failure Mode 3: Unhandled exception
├── Component 2 (Skill)
│   ├── Failure Mode 1: Skill not found
│   └── Failure Mode 2: Skill execution failed
└── Component 3 (Orchestrator)
    ├── Failure Mode 1: Task routing failure
    └── Failure Mode 2: State corruption
```

### FMEA Analysis Dimensions

For each failure mode, analyze:

1. **Severity (S)**: Impact of failure on system
2. **Occurrence (O)**: Likelihood of failure occurring
3. **Detectability (D)**: Ease of detecting failure before it occurs
4. **RPN = S × O × D**: Risk Priority Number

### Failure Mode Categories

#### 1. Input Failures

```python
{
    "category": "input_failure",
    "modes": [
        {
            "name": "invalid_task_format",
            "description": "Task received with invalid JSON structure"
        },
        {
            "name": "missing_required_field",
            "description": "Task missing required fields"
        }
    ],
    "severity": 5,
    "occurrence": 3,
    "detectability": 8
}
```

#### 2. Resource Failures

```python
{
    "category": "resource_failure",
    "modes": [
        {
            "name": "memory_exhaustion",
            "description": "Agent exceeds memory allocation"
        },
        {
            "name": "timeout_exceeded",
            "description": "Task execution exceeds timeout"
        }
    ],
    "severity": 8,
    "occurrence": 2,
    "detectability": 6
}
```

#### 3. External Failures

```python
{
    "category": "external_failure",
    "modes": [
        {
            "name": "dependency_unavailable",
            "description": "External service dependency unavailable"
        },
        {
            "name": "rate_limit_exceeded",
            "description": "External API rate limit exceeded"
        }
    ],
    "severity": 7,
    "occurrence": 3,
    "detectability": 5
}
```

---

## Implementation Patterns

### Pattern 1: Basic Failure Mode Identification

Identify failure modes for agent components:

```python
from apex.agents.failure import FailureModeAnalyzer
from apex.agents.failure.models import FailureMode, Component


def identify_failure_modes(agent: Agent) -> list[FailureMode]:
    """Identify all failure modes for an agent."""
    
    analyzer = FailureModeAnalyzer()
    failure_modes = []
    
    # Analyze each component
    for component in agent.components:
        modes = analyzer.analyze_component(component)
        failure_modes.extend(modes)
    
    # Analyze component interactions
    for interaction in agent.interactions:
        modes = analyzer.analyze_interaction(interaction)
        failure_modes.extend(modes)
    
    return failure_modes
```

### Pattern 2: Risk Priority Calculation

Calculate RPN for failure modes:

```python
def calculate_rpn(
    severity: float,
    occurrence: float,
    detectability: float
) -> float:
    """Calculate Risk Priority Number."""
    
    # Normalize inputs to 1-10 scale
    severity_norm = max(1, min(10, severity))
    occurrence_norm = max(1, min(10, occurrence))
    detectability_norm = max(1, min(10, detectability))
    
    # RPN formula
    rpn = severity_norm * occurrence_norm * detectability_norm
    
    return round(rpn, 2)


def prioritize_failure_modes(modes: list[FailureMode]) -> list[FailureMode]:
    """Prioritize failure modes by RPN."""
    
    for mode in modes:
        mode.rpn = calculate_rpn(
            mode.severity,
            mode.occurrence,
            mode.detectability
        )
    
    # Sort by RPN descending
    return sorted(modes, key=lambda m: m.rpn, reverse=True)
```

### Pattern 3: Mitigation Strategy Generation

Generate mitigation strategies:

```python
def generate_mitigation_strategies(
    failure_mode: FailureMode,
    available_mitigations: list[Mitigation]
) -> list[MitigationStrategy]:
    """Generate mitigation strategies for a failure mode."""
    
    strategies = []
    
    # Match failure mode to available mitigations
    for mitigation in available_mitigations:
        if mitigation.applies_to(failure_mode.category):
            strategy = MitigationStrategy(
                failure_mode=failure_mode,
                mitigation=mitigation,
                effectiveness=calculate_effectiveness(
                    failure_mode,
                    mitigation
                )
            )
            strategies.append(strategy)
    
    # Add custom mitigation if no matches
    if not strategies:
        custom = MitigationStrategy(
            failure_mode=failure_mode,
            mitigation=Mitigation(
                name="generic_fallback",
                description="Implement generic fallback mechanism",
                type="fallback"
            ),
            effectiveness=0.5
        )
        strategies.append(custom)
    
    # Sort by effectiveness
    return sorted(strategies, key=lambda s: s.effectiveness, reverse=True)
```

### Pattern 4: Failure Mode History Tracking

Track failure modes across executions:

```python
class FailureModeHistory:
    def __init__(self):
        self.history: dict[str, list[FailureEvent]] = {}
    
    def record_failure(self, failure_mode: FailureMode, event: FailureEvent):
        """Record a failure event."""
        key = failure_mode.id
        if key not in self.history:
            self.history[key] = []
        self.history[key].append(event)
    
    def get_failure_frequency(self, failure_mode: FailureMode) -> int:
        """Get frequency of a failure mode."""
        key = failure_mode.id
        return len(self.history.get(key, []))
    
    def get_occurrence_trend(self, failure_mode: FailureMode) -> str:
        """Get occurrence trend for failure mode."""
        key = failure_mode.id
        events = self.history.get(key, [])
        
        if len(events) < 2:
            return "insufficient_data"
        
        # Calculate trend
        recent = events[-3:]
        old = events[:3] if len(events) > 3 else events
        
        if len(recent) > len(old):
            return "increasing"
        elif len(recent) < len(old):
            return "decreasing"
        return "stable"
```

### Pattern 5: Failure Mode Dashboard

Build a failure mode dashboard:

```python
def generate_failure_dashboard(
    failure_modes: list[FailureMode],
    history: FailureModeHistory
) -> FailureDashboard:
    """Generate failure mode dashboard."""
    
    # Calculate statistics
    total_modes = len(failure_modes)
    high_rpn_modes = [m for m in failure_modes if m.rpn > 100]
    medium_rpn_modes = [m for m in failure_modes if 50 <= m.rpn <= 100]
    low_rpn_modes = [m for m in failure_modes if m.rpn < 50]
    
    # Calculate frequency statistics
    frequency_distribution = {}
    for mode in failure_modes:
        freq = history.get_failure_frequency(mode)
        if freq not in frequency_distribution:
            frequency_distribution[freq] = 0
        frequency_distribution[freq] += 1
    
    return FailureDashboard(
        total_modes=total_modes,
        by_rpn={
            "high": len(high_rpn_modes),
            "medium": len(medium_rpn_modes),
            "low": len(low_rpn_modes)
        },
        frequency_distribution=frequency_distribution,
        top_rpn_modes=high_rpn_modes[:5]
    )
```

---

## Common Patterns

### Pattern 1: Failure Mode Catalog

Create a catalog of common failure modes:

```python
FAILURE_MODE_CATALOG = {
    "agent_execution": [
        {
            "id": "agent_timeout",
            "name": "Agent Execution Timeout",
            "category": "resource",
            "description": "Agent takes too long to execute task"
        },
        {
            "id": "agent_memory_exhaustion",
            "name": "Agent Memory Exhaustion",
            "category": "resource",
            "description": "Agent exceeds memory limit"
        }
    ],
    "skill_execution": [
        {
            "id": "skill_not_found",
            "name": "Skill Not Found",
            "category": "input",
            "description": "Requested skill does not exist"
        },
        {
            "id": "skill_execution_error",
            "name": "Skill Execution Error",
            "category": "external",
            "description": "Skill failed during execution"
        }
    ]
}
```

### Pattern 2: Mitigation Pattern Library

Create a library of mitigation patterns:

```python
MITIGATION_PATTERNS = {
    "timeout": [
        {
            "id": "timeout_retry",
            "name": "Timeout Retry",
            "description": "Retry operation after timeout",
            "effectiveness": 0.7,
            "complexity": 2
        },
        {
            "id": "timeout_circuit_breaker",
            "name": "Circuit Breaker",
            "description": "Stop retrying after repeated timeouts",
            "effectiveness": 0.9,
            "complexity": 4
        }
    ],
    "memory": [
        {
            "id": "memory_limit",
            "name": "Memory Limit",
            "description": "Enforce memory limits on agent",
            "effectiveness": 0.8,
            "complexity": 3
        },
        {
            "id": "memory_cleanup",
            "name": "Memory Cleanup",
            "description": "Clean up memory before execution",
            "effectiveness": 0.6,
            "complexity": 2
        }
    ]
}
```

---

## Common Mistakes

### Mistake 1: Not Considering Component Interactions

**Wrong:**
```python
# ❌ Only analyzes individual components in isolation
def analyze_failure_modes(agents: list[Agent]):
    for agent in agents:
        modes = analyze_agent(agent)  # ❌ Ignores agent interactions
        failure_modes.extend(modes)
```

**Correct:**
```python
# ✅ Analyzes component interactions
def analyze_failure_modes(agents: list[Agent]):
    failure_modes = []
    
    # Analyze individual components
    for agent in agents:
        modes = analyze_agent(agent)
        failure_modes.extend(modes)
    
    # Analyze interactions between agents
    for i, agent1 in enumerate(agents):
        for agent2 in agents[i+1:]:
            modes = analyze_interaction(agent1, agent2)
            failure_modes.extend(modes)
```

### Mistake 2: Using Fixed Severity Values

**Wrong:**
```python
# ❌ Using fixed severity values without context
def calculate_severity(mode: FailureMode) -> float:
    return 5.0  # ❌ Always the same severity
```

**Correct:**
```python
# ✅ Context-aware severity calculation
def calculate_severity(mode: FailureMode, context: AnalysisContext) -> float:
    severity = mode.base_severity
    
    # Adjust based on context
    if context.environment == "production":
        severity *= 1.5  # Higher severity in production
    
    if context.affected_users > 1000:
        severity *= 1.2
    
    return min(10.0, severity)
```

### Mistake 3: Not Updating Failure Modes Over Time

**Wrong:**
```python
# ❌ Static failure mode catalog
FAILURE_MODES = [
    {"id": "agent_timeout", "severity": 5},
    {"id": "memory_exhaustion", "severity": 6}
]  # ❌ Never updated based on new data
```

**Correct:**
```python
# ✅ Dynamic failure mode updates
def update_failure_modes_from_history(
    history: FailureModeHistory,
    catalog: dict[str, FailureMode]
) -> dict[str, FailureMode]:
    """Update failure modes based on historical data."""
    
    for mode_id, mode in catalog.items():
        freq = history.get_failure_frequency(mode)
        
        # Increase occurrence based on frequency
        if freq > 10:
            mode.occurrence = min(10, mode.occurrence + 2)
        elif freq > 5:
            mode.occurrence = min(10, mode.occurrence + 1)
    
    return catalog
```

### Mistake 4: Ignoring Mitigation Effectiveness

**Wrong:**
```python
# ❌ Generating mitigations without effectiveness assessment
def generate_mitigations(mode: FailureMode):
    return [
        Mitigation(name="retry", description="Retry operation"),
        Mitigation(name="fallback", description="Use fallback")
    ]  # ❌ No effectiveness scores
```

**Correct:**
```python
# ✅ Assess mitigation effectiveness
def generate_mitigations(mode: FailureMode) -> list[Mitigation]:
    mitigations = [
        Mitigation(name="retry", description="Retry operation"),
        Mitigation(name="fallback", description="Use fallback")
    ]
    
    for mitigation in mitigations:
        mitigation.effectiveness = calculate_effectiveness(mode, mitigation)
        mitigation.complexity = estimate_complexity(mitigation)
    
    return sorted(mitigations, key=lambda m: m.effectiveness, reverse=True)
```

### Mistake 5: No Prioritization of Analysis Efforts

**Wrong:**
```python
# ❌ Analyzing all failure modes equally
def analyze_all_modes(modes: list[FailureMode]):
    for mode in modes:
        mode.severity = calculate_severity(mode)
        mode.occurrence = calculate_occurrence(mode)
        mode.detectability = calculate_detectability(mode)
        mode.rpn = calculate_rpn(mode.severity, mode.occurrence, mode.detectability)
    # ❌ All modes analyzed with same effort
```

**Correct:**
```python
# ✅ Prioritize based on risk
def analyze_all_modes(modes: list[FailureMode]):
    # Pre-filter high-risk modes
    high_risk = [m for m in modes if m.severity > 7]
    medium_risk = [m for m in modes if 5 <= m.severity <= 7]
    low_risk = [m for m in modes if m.severity < 5]
    
    # Deep analysis for high-risk
    for mode in high_risk:
        mode.severity = deep_severity_analysis(mode)
        mode.occurrence = deep_occurrence_analysis(mode)
        mode.detectability = deep_detectability_analysis(mode)
    
    # Light analysis for low-risk
    for mode in low_risk:
        mode.severity = mode.base_severity
        mode.occurrence = mode.base_occurrence
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Validation at top of analysis functions
- [ ] **Parsed State:** Failure modes parsed into structured format
- [ ] **Purity:** Analysis functions are stateless
- [ ] **Fail Fast:** Invalid failure mode format throws clear errors
- [ ] **Readability:** Analysis logic reads as English

### Testing

- [ ] Unit tests for failure mode identification
- [ ] Integration tests for RPN calculation
- [ ] Edge case tests for boundary conditions
- [ ] Mitigation effectiveness tests
- [ ] Dashboard generation tests

### Security

- [ ] Failure mode inputs validated
- [ ] No arbitrary code execution
- [ ] Resource limits on analysis runs
- [ ] Input length limits enforced
- [ ] Sensitive data filtered from failure modes

### Performance

- [ ] Failure mode analysis cached where appropriate
- [ ] Parallel analysis for multiple agents
- [ ] Memory usage bounded for large catalogs
- [ ] Timeout protection for slow analyses
- [ ] Incremental updates supported

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `agent-error-trace-explainer` | Explain error traces |
| `agent-stacktrace-root-cause` | Root cause analysis |
| `agent-diff-quality-analyzer` | Analyze code quality changes |
| `risk-management` | Risk management patterns |
| `code-philosophy` | Core correctness principles |

### Core Dependencies

- **Failure Mode Catalog:** Known failure modes
- **RPN Calculator:** Calculate risk priority
- **Mitigation Matcher:** Match mitigations to failures
- **History Tracker:** Track failure history
- **Dashboard Generator:** Generate analysis dashboards

### External Resources

- [FMEA Methodology](https://example.com/fmea-methodology) - Failure Mode and Effects Analysis
- [Reliability Engineering](https://example.com/reliability) - System reliability
- [Risk Assessment](https://example.com/risk-assessment) - Risk analysis

---

## Implementation Tracking

### Agent Failure Mode Analysis - Core Patterns

| Task | Status |
|------|--------|
| Failure mode identification | ✅ Complete |
| RPN calculation | ✅ Complete |
| Mitigation strategy generation | ✅ Complete |
| Failure mode history tracking | ✅ Complete |
| Dashboard generation | ✅ Complete |
| Pattern catalog management | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Failure mode identification
- RPN calculation
- Mitigation strategy generation
- Failure mode history tracking
- Dashboard generation

### 1.1.0 (Planned)
- Custom failure mode definitions
- Performance profiling
- ML-based failure prediction
- Mitigation effectiveness optimization

### 2.0.0 (Future)
- Historical failure correlation
- Predictive failure analysis
- Automated mitigation implementation
- Cross-system failure correlation

---

## Implementation Prompt (Execution Layer)

When implementing the Failure Mode Analysis, use this prompt for code generation:

```
Create a Failure Mode Analysis implementation following these requirements:

1. Core Class: `FailureModeAnalyzer`
   - Identify failure modes for agent components
   - Calculate Risk Priority Numbers
   - Generate mitigation strategies
   - Track failure mode history

2. Key Methods:
   - `analyze_component(component)`: Identify failure modes
   - `calculate_rpn(severity, occurrence, detectability)`: Calculate RPN
   - `generate_mitigations(mode)`: Generate mitigation strategies
   - `record_failure(mode, event)`: Record failure event
   - `generate_dashboard(modes, history)`: Generate analysis dashboard

3. Failure Mode Properties:
   - `id`: Unique identifier
   - `name`: Human-readable name
   - `category`: Input, resource, external, logic
   - `description`: Detailed description
   - `severity`: Impact (1-10)
   - `occurrence`: Likelihood (1-10)
   - `detectability`: Detect ease (1-10)
   - `rpn`: Risk Priority Number

4. RPN Categories:
   - High: RPN > 100
   - Medium: 50 <= RPN <= 100
   - Low: RPN < 50

5. Mitigation Categories:
   - Retry: Automatic retry mechanism
   - Fallback: Alternative execution path
   - Circuit Breaker: Stop retrying after failures
   - Timeout: Limit execution duration
   - Input Validation: Validate inputs early

6. Analysis Dimensions:
   - Component-level analysis
   - Interaction-level analysis
   - Cross-system analysis
   - Historical analysis
   - Predictive analysis

7. Dashboard Metrics:
   - Total failure modes
   - High/medium/low RPN distribution
   - Failure frequency distribution
   - Top RPN modes
   - Mitigation coverage

8. History Tracking:
   - Failure event logging
   - Occurrence trend calculation
   - Effectiveness tracking
   - Pattern recognition

Follow the 5 Laws of Elegant Defense:
- Guard clauses for validation
- Parse failure modes at boundary
- Pure analysis functions
- Fail fast on invalid mode
- Clear names for all components
```
