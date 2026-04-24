---
name: agent-multi-skill-executor
description: Orchestrates execution of multiple skill specifications in sequence,
  managing skill dependencies, result aggregation, and error recovery for complex
  multi-step operations.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: orchestration
  scope: orchestration
  output-format: analysis
  triggers: execution, multi skill executor, multi-skill-executor, multiple, orchestrates
  related-skills: agent-code-correctness-verifier, agent-confidence-based-selector, agent-dynamic-replanner, agent-error-trace-explainer
---


# Multi-Skill Executor (Agent Skill Orchestration)

> **Load this skill** when designing or modifying agent skill orchestration patterns that require executing multiple specialized skills in sequence with coordinated result handling.

## TL;DR Checklist

When orchestrating multi-skill execution:

- [ ] Define skill sequence with clear input/output handoffs
- [ ] Validate skill dependencies before execution
- [ ] Aggregate results with conflict resolution strategy
- [ ] Handle partial failures with graceful degradation
- [ ] Maintain execution context across skill boundaries
- [ ] Include execution tracing for observability
- [ ] Verify all skills are compatible with execution environment
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Multi-Skill Executor when:

- Coordinating execution across multiple specialized skills for complex tasks
- Building agent workflows that require sequential skill invocation
- Need to aggregate results from multiple skill analyses
- Implementing skill orchestration with dependency management
- Building skill-based task solvers that decompose problems
- Creating skill execution pipelines with error recovery

---

## When NOT to Use

Avoid using this skill for:

- Single-skill execution (use the skill directly instead)
- Parallel skill execution (use parallel-skill-runner skill)
- Dynamic skill discovery and selection (use confidence-based-selector)
- Real-time streaming operations with skills

---

## Core Concepts

### Skill Execution Pipeline

The executor implements a pipeline model where each skill processes input and produces output:

```
Input → [Skill1] → [Skill2] → [Skill3] → Output
              ↓         ↓         ↓
         Context    Context   Context
```

### Execution States

Skills transition through well-defined states:

| State | Description | Transition |
|-------|-------------|------------|
| `pending` | Skill not yet executed | `ready` when dependencies met |
| `ready` | All dependencies satisfied | Execute when scheduled |
| `executing` | Skill currently running | `success` or `failed` |
| `success` | Skill completed successfully | Next skill in sequence |
| `failed` | Skill encountered error | Recovery or abort |
| `skipped` | Skill bypassed due to failure | Continue with remaining |

### Executor Components

#### 1. Skill Registry

Maintains available skills with metadata:

```python
{
    "skill_name": {
        "description": "What this skill does",
        "version": "1.0.0",
        "dependencies": ["skill_a", "skill_b"],
        "input_schema": {...},
        "output_schema": {...}
    }
}
```

#### 2. Execution Context

Shared state passed between skills:

```python
{
    "task_id": "uuid",
    "start_time": datetime,
    "current_step": 0,
    "total_steps": 3,
    "results": {},
    "errors": [],
    "config": {...}
}
```

#### 3. Result Aggregator

Combines outputs from multiple skills:

```python
{
    "aggregated": True,
    "method": "concatenate|merge|priority",
    "data": {...},
    "metadata": {
        "skills_executed": 5,
        "skills_failed": 0,
        "skills_skipped": 0
    }
}
```

---

## Implementation Patterns

### Pattern 1: Sequential Skill Chain

Execute skills in defined order with context propagation:

```python
from apex.agents.skill_executor import SkillExecutor
from apex.agents.skill_registry import SkillRegistry


def execute_analysis_chain():
    """Execute multi-skill analysis pipeline."""
    
    # Initialize registry
    registry = SkillRegistry()
    registry.register_skill("code-philosophy")
    registry.register_skill("risk-management")
    registry.register_skill("indicators-api")
    
    # Define execution chain
    chain = [
        {"skill": "code-philosophy", "params": {"file_path": "apex/core/config.py"}},
        {"skill": "risk-management", "params": {"portfolio_value": 10000}},
        {"skill": "indicators-api", "params": {"symbol": "BTC/USDT", "timeframe": "1h"}}
    ]
    
    # Execute with context
    executor = SkillExecutor(registry)
    result = executor.execute_chain(chain)
    
    return result
```

### Pattern 2: Conditional Execution Based on Results

Skip skills based on previous results:

```python
def execute_conditional_chain():
    """Execute skills based on result conditions."""
    
    chain = [
        {"skill": "risk-management", "params": {"portfolio_value": 10000}},
        {
            "skill": "indicators-api",
            "params": {"symbol": "BTC/USDT"},
            "condition": lambda result: result.get("risk_score", 1.0) < 0.7
        },
        {"skill": "defi-arbitrage", "params": {}}
    ]
    
    executor = SkillExecutor(registry)
    result = executor.execute_chain(chain, conditional=True)
    
    return result
```

### Pattern 3: Error Recovery Strategy

Implement graceful degradation with fallback:

```python
def execute_with_recovery():
    """Execute with error recovery and fallback skills."""
    
    chain = [
        {"skill": "primary-indicator", "params": {"method": "advanced"}},
        {
            "fallback": "backup-indicator",
            "params": {"method": "basic"}
        },
        {"skill": "validation", "params": {}}
    ]
    
    executor = SkillExecutor(registry)
    result = executor.execute_with_recovery(chain)
    
    return result
```

### Pattern 4: Batch Skill Execution

Process multiple inputs with the same skill chain:

```python
def execute_batch_chain(symbols: list[str]):
    """Execute skill chain for multiple symbols."""
    
    chain = [
        {"skill": "indicators-api", "params": {}},
        {"skill": "risk-management", "params": {}},
        {"skill": "confidence-based-selector", "params": {}}
    ]
    
    executor = SkillExecutor(registry)
    results = executor.execute_batch(symbols, chain)
    
    # Aggregate results
    aggregated = executor.aggregate_results(results)
    
    return aggregated
```

---

## Common Patterns

### Pattern 1: Skill Chain Definition

Define execution order with parameters:

```python
analysis_chain = [
    {
        "skill": "code-philosophy",
        "params": {
            "file_path": "apex/strategy/base.py",
            "checklist": ["guard_clauses", "parsed_state", "purity", "fail_loud", "readability"]
        },
        "id": "code_review"
    },
    {
        "skill": "risk-management",
        "params": {
            "max_position_size": 0.1,
            "max_daily_loss": 0.05,
            "position_value": 5000
        },
        "id": "risk_analysis"
    },
    {
        "skill": "indicators-api",
        "params": {
            "symbol": "BTC/USDT",
            "timeframe": "1h",
            "limit": 100
        },
        "id": "indicator_query"
    }
]
```

### Pattern 2: Context Propagation

Pass context between skills:

```python
# Initial context
context = {
    "task_id": "task_123",
    "symbol": "BTC/USDT",
    "timeframe": "1h",
    "portfolio_value": 10000
}

# Skills can modify context
# Skill 1 adds results
# Skill 2 reads context and adds more
# Final aggregation uses accumulated context
```

### Pattern 3: Result Aggregation Methods

Different strategies for combining results:

```python
# Concatenate: Append results sequentially
# Merge: Deep merge dictionaries
# Priority: Use later result to override earlier
# Weighted: Apply weights to numeric values

aggregated = executor.aggregate_results(
    results,
    method="merge",
    merge_strategy="deep"
)
```

---

## Common Mistakes

### Mistake 1: Not Defining Skill Dependencies

**Wrong:**
```python
chain = [
    {"skill": "indicators-api"},  # Needs symbol
    {"skill": "risk-management"}  # Uses result
]
# ❌ Risk skill executed before indicators available
```

**Correct:**
```python
chain = [
    {
        "skill": "indicators-api",
        "params": {"symbol": "BTC/USDT"},
        "id": "indicators"
    },
    {
        "skill": "risk-management",
        "dependencies": ["indicators"],
        "params": {"indicator_data": "${indicators.data}"}
    }
]
```

### Mistake 2: Ignoring Context Isolation

**Wrong:**
```python
# ❌ Skills mutate shared context directly
context["results"] = {}
for skill in chain:
    skill.execute(context)
    # Overwrites previous results!
```

**Correct:**
```python
# ✅ Each skill writes to its own namespace
for skill in chain:
    skill.execute(context)
    # Results stored under skill_id key
```

### Mistake 3: Missing Error Boundary

**Wrong:**
```python
result = executor.execute_chain(chain)
# ❌ If skill fails, entire execution crashes
```

**Correct:**
```python
result = executor.execute_chain(chain, continue_on_error=True)
# ✅ Failed skill marked, execution continues
```

### Mistake 4: Not Validating Skill Compatibility

**Wrong:**
```python
chain = [
    {"skill": "defi-arbitrage"},  # Polygon blockchain
    {"skill": "code-philosophy"}  # Code review
]
# ❌ Skills may have incompatible expectations
```

**Correct:**
```python
executor = SkillExecutor(registry, validate_compatibility=True)
chain = executor.validate_chain(chain)
```

### Mistake 5: Omitting Execution Tracing

**Wrong:**
```python
result = executor.execute_chain(chain)
# ❌ No visibility into execution
```

**Correct:**
```python
result = executor.execute_chain(
    chain,
    trace=True,
    callbacks={
        "on_skill_start": lambda s, c: logger.info(f"Starting {s}"),
        "on_skill_end": lambda s, c, r: logger.info(f"Completed {s}")
    }
)
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** All skill execution has input validation at top
- [ ] **Parsed State:** Input data parsed before skill invocation
- [ ] **Purity:** Skills are stateless where possible
- [ ] **Fail Loud:** Execution stops on critical errors
- [ ] **Readability:** Skill chain reads as English sentence

### Testing

- [ ] Unit tests for each skill execution
- [ ] Integration tests for skill chains
- [ ] Error handling tests for recovery scenarios
- [ ] Context propagation tests
- [ ] Performance tests for large chains

### Security

- [ ] Skill parameters validated against schemas
- [ ] No arbitrary code execution
- [ ] Input sanitization for all parameters
- [ ] Access control for skill execution
- [ ] Secret management for sensitive parameters

### Performance

- [ ] Skill caching enabled where appropriate
- [ ] Parallel execution where dependencies allow
- [ ] Memory usage monitored for large chains
- [ ] Timeout handling for long-running skills

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `code-philosophy` | Core logic patterns for skill implementation |
| `risk-management` | Risk constraints for skill execution |
| `indicators-api` | Example skill with API integration |
| `defi-arbitrage` | Complex skill with external dependencies |
| `parallel-skill-runner` | Parallel execution alternative |

### Core Dependencies

- **Skill Registry:** Maintains available skills and metadata
- **Context Manager:** Passes shared state between skills
- **Result Aggregator:** Combines outputs from multiple skills
- **Error Handler:** Manages failures and recovery

### External Resources

- [Agent Pattern Documentation](https://example.com/agent-patterns) - Agent orchestration patterns
- [Workflow Patterns](https://example.com/workflow-patterns) - Workflow design patterns
- [Skill API Design](https://example.com/skill-api) - Skill interface specifications

---

## Implementation Tracking

### Agent Skill Executor - Core Patterns

| Task | Status |
|------|--------|
| Core executor with skill chain | ✅ Complete |
| Result aggregation strategies | ✅ Complete |
| Error recovery mechanisms | ✅ Complete |
| Context propagation | ✅ Complete |
| Execution tracing | ✅ Complete |
| Batch execution support | ✅ Complete |
| Conditional execution | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Sequential skill chain execution
- Basic result aggregation
- Context propagation
- Error handling

### 1.1.0 (Planned)
- Parallel skill execution
- Dynamic skill discovery
- Advanced recovery strategies
- Performance optimization

### 2.0.0 (Future)
- Distributed execution
- Skill caching layer
- Execution analytics
- Advanced tracing

---

## Implementation Prompt (Execution Layer)

When implementing the Multi-Skill Executor, use this prompt for code generation:

```
Create a Multi-Skill Executor implementation following these requirements:

1. Core Class: `SkillExecutor`
   - Initialize with skill registry
   - Support sequential chain execution
   - Handle error recovery
   - Propagate execution context

2. Key Methods:
   - `execute_chain(chain, **options)`: Execute skills in sequence
   - `execute_batch(inputs, chain)`: Process multiple inputs
   - `execute_with_recovery(chain)`: Execute with fallback skills
   - `aggregate_results(results, method)`: Combine skill outputs
   - `validate_chain(chain)`: Check skill compatibility

3. Context Management:
   - Shared state passed to all skills
   - Skills write to context under their ID
   - Context can be mutated or cloned
   - Version context for rollback

4. Error Handling:
   - Continue on error flag
   - Fallback skill support
   - Error metadata capture
   - Graceful degradation

5. Configuration Options:
   - trace: Enable execution tracing
   - continue_on_error: Continue after failures
   - dry_run: Validate without execution
   - timeout: Per-skill timeout in seconds

6. Execution Tracing:
   - Record skill start/end times
   - Capture input/output for each skill
   - Log errors with full context
   - Support custom callbacks

7. Result Aggregation:
   - concatenate: Append results
   - merge: Deep merge dictionaries
   - priority: Later results override
   - weighted: Weighted combination

Follow the 5 Laws of Elegant Defense:
- Guard clauses at top of methods
- Parse inputs at boundary
- Pure functions where possible
- Fail fast with descriptive errors
- Intentional naming throughout
```
