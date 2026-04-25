---
name: replanner
description: '"Dynamically adjusts execution plans based on real-time feedback, changing"
  conditions, and emerging information, enabling adaptive problem solving in uncertain
  environments.'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: orchestration
  scope: orchestration
  output-format: analysis
  triggers: adjusts, dynamic replanner, dynamic-replanner, dynamically, execution
  related-skills: code-correctness-verifier, confidence-based-selector, error-trace-explainer,
    multi-skill-executor
---




# Dynamic Replanner (Agent Adaptive Planning)

> **Load this skill** when designing or modifying agent planning systems that require dynamic adjustment of execution strategies based on feedback, changing conditions, and new information.

## TL;DR Checklist

When implementing dynamic replanning:

- [ ] Define planning trigger conditions
- [ ] Monitor execution progress and outcomes
- [ ] Detect deviations from plan
- [ ] Generate alternative plans efficiently
- [ ] Select best alternative based on current state
- [ ] Handle replanning frequency and overhead
- [ ] Support partial replanning for efficiency
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Dynamic Replanner when:

- Execution conditions change unexpectedly (market shifts, resource changes)
- Need to adapt to new information during execution
- Plan execution encounters obstacles or failures
- Building adaptive agents that respond to feedback
- Implementing robust systems that handle uncertainty
- Managing long-running tasks with evolving requirements

---

## When NOT to Use

Avoid using this skill for:

- Stable, predictable execution environments (static plans are sufficient)
- Real-time systems with strict latency requirements (replanning overhead)
- Single-step tasks without uncertainty
- Situations where plan changes are costly or disruptive

---

## Core Concepts

### Replanning Triggers

Replanning is triggered by:

```python
{
    "trigger": "failure|deviation|timeout|new_info|resource_change",
    "timestamp": datetime,
    "details": {...},
    "confidence": 0.85
}
```

### Plan Revision Strategies

#### 1. Local Revision

Modify only affected parts:

```
Original Plan: [A] -> [B] -> [C] -> [D]
                ↓ Failure at B
Revised Plan:  [A] -> [B'] -> [C] -> [D]
```

#### 2. Partial Replanning

Replan from point of failure:

```
Original Plan: [A] -> [B] -> [C] -> [D]
                ↓ Failure at B
Revised Plan:  [A] -> [B'] -> [C'] -> [D']
```

#### 3. Global Replanning

Generate completely new plan:

```
Original Plan: [A] -> [B] -> [C] -> [D]
                ↓ Major deviation
Revised Plan:  [A'] -> [B'] -> [C'] -> [D']
```

#### 4. Fallback Plan

Switch to pre-defined alternative:

```
Original Plan: [A] -> [B] -> [C] -> [D]
                ↓ Failure at B
Revised Plan:  [A] -> [B_fallback] -> [D]
```

### Plan Metrics

Track plan quality with metrics:

```python
{
    "plan_id": "uuid",
    "quality": {
        "estimated_success_rate": 0.85,
        "estimated_completion_time": 3600,
        "resource_cost": 500.00
    },
    "actual": {
        "success_rate": 0.90,
        "completion_time": 4200,
        "resource_cost": 520.00
    },
    "deviation": {
        "time": 600,  # 10 minutes over
        "cost": 20.00,  # $20 over
        "success_rate": 0.05  # 5% better
    }
}
```

### Replanning State Machine

```
Active Plan → Monitor → Detect Issue → Generate Alternatives → Select → Execute New Plan
```

---

## Implementation Patterns

### Pattern 1: Failure-Driven Replanning

Replan when execution fails:

```python
from apex.agents.replanner import DynamicReplanner


def execute_with_replanning(task: Task) -> Result:
    """Execute task with failure-driven replanning."""
    
    replanner = DynamicReplanner(
        max_replans=3,
        fallback_strategies=["local_revision", "fallback_plan"]
    )
    
    # Initial plan
    plan = replanner.generate_plan(task)
    
    while True:
        try:
            result = plan.execute()
            return result
        except ExecutionFailure as e:
            if replanner.should_replan(e, plan):
                plan = replanner.replan(plan, failure_reason=e)
            else:
                raise e
```

### Pattern 2: Deviation-Based Replanning

Replan when metrics deviate:

```python
def monitor_and_replan(plan: Plan) -> Plan:
    """Monitor plan execution and replan on deviation."""
    
    replanner = DynamicReplanner(
        threshold={
            "time_deviation": 0.2,  # 20% over estimate
            "cost_deviation": 0.15,  # 15% over budget
            "success_rate_deviation": 0.1  # 10% drop
        }
    )
    
    # Monitor execution
    while not plan.is_complete():
        progress = plan.get_progress()
        deviation = replanner.calculate_deviation(plan, progress)
        
        if replanner.should_replan(deviation):
            plan = replanner.replan(plan, reason="metric_deviation")
        
        time.sleep(MONITOR_INTERVAL)
    
    return plan
```

### Pattern 3: Context-Aware Replanning

Replan based on changing context:

```python
def context_aware_replanning(
    plan: Plan,
    context_stream: Iterator[Context]
) -> Plan:
    """Replan based on changing external context."""
    
    replanner = DynamicReplanner(
        context_sensitive=True,
        context_weights={
            "market_conditions": 0.4,
            "resource_availability": 0.3,
            "priority_changes": 0.3
        }
    )
    
    for new_context in context_stream:
        if replanner.should_replan_context(plan, new_context):
            plan = replanner.replan_plan(plan, new_context)
    
    return plan
```

### Pattern 4: Partial Replanning

Optimize by replanning only affected sections:

```python
def partial_replanning(
    plan: Plan,
    failed_step: Step,
    step_index: int
) -> Plan:
    """Replan only from failed step onwards."""
    
    replanner = DynamicReplanner(
        strategy="partial",
        preserve_prefix=True
    )
    
    # Preserve steps before failure
    prefix = plan.steps[:step_index]
    
    # Replan from failure
    suffix = replanner.replan_from(plan, step_index)
    
    # Combine
    revised_plan = Plan(
        id=plan.id,
        steps=prefix + suffix,
        context=plan.context
    )
    
    return revised_plan
```

### Pattern 5: Fallback Plan Selection

Switch to pre-defined fallback plans:

```python
def select_fallback_plan(
    failed_plan: Plan,
    failure_type: str
) -> Plan:
    """Select appropriate fallback plan."""
    
    replanner = DynamicReplanner(
        fallback_plans={
            "resource_failure": "resource_aware_plan",
            "data_failure": "robust_data_plan",
            "skill_failure": "fallback_skill_plan",
            "timeout": "optimized_plan"
        },
        fallback_priority=["robustness", "speed", "cost"]
    )
    
    fallback_name = replanner.get_fallback(failure_type)
    fallback_plan = replanner.load_fallback(fallback_name)
    
    # Adapt fallback to current context
    adapted_plan = replanner.adapt_fallback(fallback_plan, failed_plan)
    
    return adapted_plan
```

---

## Common Patterns

### Pattern 1: Replanning Triggers Configuration

Define when replanning should occur:

```python
replanning_triggers = {
    "failure": {
        "any_failure": True,
        "recoverable_failures_only": True,
        "max_consecutive_failures": 3
    },
    "deviation": {
        "time_threshold": 0.2,  # 20% over estimate
        "cost_threshold": 0.15,  # 15% over budget
        "quality_threshold": 0.1  # 10% quality drop
    },
    "external": {
        "new_data_available": True,
        "market_conditions_changed": True,
        "priority_changed": True
    },
    "frequency": {
        "min_interval": 60,  # Seconds between replans
        "max_replans": 5,  # Maximum replans per task
        "cooldown_period": 300  # Seconds after failure
    }
}
```

### Pattern 2: Quality Assessment

Assess plan quality for replanning:

```python
def assess_plan_quality(plan: Plan) -> dict:
    """Assess current plan quality."""
    
    return {
        "success_rate_estimate": calculate_success_rate(plan),
        "completion_time_estimate": estimate_completion_time(plan),
        "resource_cost_estimate": estimate_resource_cost(plan),
        "risk_score": calculate_risk_score(plan),
        "flexibility_score": calculate_flexibility(plan),
        "overall_quality": calculate_overall_quality(plan)
    }
```

### Pattern 3: Alternative Generation

Generate alternative plans efficiently:

```python
def generate_alternatives(plan: Plan) -> list[Plan]:
    """Generate alternative execution plans."""
    
    alternatives = []
    
    # Local revision: Modify single steps
    for i, step in enumerate(plan.steps):
        revised_step = revise_step(step)
        alternatives.append(
            Plan(
                id=f"{plan.id}_alt_{i}",
                steps=plan.steps[:i] + [revised_step] + plan.steps[i+1:],
                context=plan.context
            )
        )
    
    # Fallback: Replace with known alternatives
    for fallback_name, fallback in get_fallback_plans(plan).items():
        alternatives.append(fallback)
    
    # Partial replan: Replan from failure point
    for failure_point in find_failure_points(plan):
        alternatives.append(
            partial_replan(plan, failure_point)
        )
    
    return alternatives
```

---

## Common Mistakes

### Mistake 1: Excessive Replanning

**Wrong:**
```python
# ❌ Replans too frequently, causing overhead
replanner = DynamicReplanner(
    min_replan_interval=0,  # Replan on every observation
    max_replans=100  # Unlimited replans
)
```

**Correct:**
```python
# ✅ Appropriate replanning frequency
replanner = DynamicReplanner(
    min_replan_interval=60,  # Minimum 60s between replans
    max_replans=5,  # Maximum 5 replans per task
    threshold={"deviation": 0.2}  # Only replan on significant deviations
)
```

### Mistake 2: Not Handling Cycle Detection

**Wrong:**
```python
# ❌ Can get stuck in replanning loop
while True:
    result = plan.execute()
    if replanner.should_replan(result):
        plan = replanner.replan(plan)  # May create same plan again
```

**Correct:**
```python
# ✅ Detect and prevent replanning loops
seen_plans = set()
while replanner.should_replan(result):
    plan = replanner.replan(plan)
    plan_hash = hash_plan(plan)
    if plan_hash in seen_plans:
        raise ReplanningCycleDetected("Plan oscillating between states")
    seen_plans.add(plan_hash)
```

### Mistake 3: Ignoring Replanning Cost

**Wrong:**
```python
# ❌ Replanning may be more expensive than original plan
current_cost = plan.estimated_cost
replan_cost = replanner.estimate_replan_cost(plan)
if replan_cost > current_cost * 2:
    # ❌ Continue with poor plan instead of replanning
    pass
```

**Correct:**
```python
# ✅ Consider replanning cost vs benefit
current_cost = plan.estimated_cost
replan_cost = replanner.estimate_replan_cost(plan)
revised_plan = replanner.replan(plan)

expected_improvement = calculate_expected_improvement(revised_plan)
if expected_improvement > replan_cost * REPLAN_THRESHOLD:
    plan = revised_plan
else:
    # Continue with original plan
    pass
```

### Mistake 4: Not Preserving Valid Plan Sections

**Wrong:**
```python
# ❌ Discards valid execution progress
plan = generate_initial_plan()
plan.execute_step(1)  # Step 1 complete
plan.execute_step(2)  # Step 2 fails
plan = replanner.replan(plan)  # ❌ May discard step 1 progress
```

**Correct:**
```python
# ✅ Preserve completed steps
completed = plan.get_completed_steps()
pending = plan.get_pending_steps()
revised_pending = replanner.replan(pending)
plan = Plan(steps=completed + revised_pending)
```

### Mistake 5: Not Handling Partial Success

**Wrong:**
```python
# ❌ Treats partial success as total failure
result = plan.execute()
if not result.success:
    plan = replanner.replan(plan)  # May be unnecessary
```

**Correct:**
```python
# ✅ Handles partial success gracefully
result = plan.execute()
if result.status == "partial":
    plan = replanner.partial_replan(plan, result.completed_steps)
elif result.status == "failed":
    plan = replanner.replan(plan)
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Replanning validates inputs
- [ ] **Parsed State:** Execution data parsed at boundary
- [ ] **Purity:** Replanning logic is stateless where possible
- [ ] **Fail Loud:** Invalid plans throw clear errors
- [ ] **Readability:** Replanning strategy reads clearly

### Testing

- [ ] Unit tests for each replanning strategy
- [ ] Integration tests for execution monitoring
- [ ] Cycle detection tests
- [ ] Cost-benefit tests
- [ ] Performance tests for replanning overhead

### Security

- [ ] Plan parameters validated before replanning
- [ ] No arbitrary code execution in replanning
- [ ] Input sanitization for all execution data
- [ ] Replanning limits enforced
- [ ] Fallback plan validation

### Performance

- [ ] Replanning cached where appropriate
- [ ] Memory usage monitored for complex plans
- [ ] Execution monitoring optimized
- [ ] Alternative generation efficient

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `goal-to-milestones` | Initial goal-to-plan translation |
| `task-decomposition-engine` | Task breakdown for plans |
| `multi-skill-executor` | Sequential plan execution |
| `confidence-based-selector` | Skill selection for plans |
| `code-philosophy` | Core logic patterns |

### Core Dependencies

- **Monitor:** Tracks plan execution
- **Analyzer:** Detects deviations and failures
- **Generator:** Creates alternative plans
- **Selector:** Chooses best alternative
- **Validator:** Ensures plan quality

### External Resources

- [Adaptive Planning](https://example.com/adaptive-planning) - Adaptive planning techniques
- [Reactive Planning](https://example.com/reactive-planning) - Reactive planning systems
- [Plan Repair](https://example.com/plan-repair) - Plan repair algorithms

---

## Implementation Tracking

### Agent Dynamic Replanner - Core Patterns

| Task | Status |
|------|--------|
| Failure-driven replanning | ✅ Complete |
| Deviation-based replanning | ✅ Complete |
| Context-aware replanning | ✅ Complete |
| Partial replanning | ✅ Complete |
| Fallback plan selection | ✅ Complete |
| Cycle detection | ✅ Complete |
| Cost-benefit analysis | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Failure-driven replanning
- Deviation-based replanning
- Partial replanning support
- Fallback plan selection
- Cycle detection

### 1.1.0 (Planned)
- Context-aware replanning
- Partial success handling
- Cost-benefit optimization
- Performance profiling

### 2.0.0 (Future)
- Learning from replanning
- Distributed replanning
- Multi-agent replanning
- Advanced failure prediction

---

## Implementation Prompt (Execution Layer)

When implementing the Dynamic Replanner, use this prompt for code generation:

```
Create a Dynamic Replanner implementation following these requirements:

1. Core Class: `DynamicReplanner`
   - Monitor plan execution and detect issues
   - Generate alternative execution plans
   - Select best alternative based on criteria
   - Handle partial replanning efficiently

2. Key Methods:
   - `should_replan(plan, issue)`: Check if replanning needed
   - `replan(plan, issue)`: Generate revised plan
   - `replan_from(plan, step_index)`: Partial replanning
   - `generate_alternatives(plan)`: Create plan alternatives
   - `assess_plan_quality(plan)`: Evaluate plan quality

3. Replanning Triggers:
   - `failure`: Execution failure detected
   - `deviation`: Metrics deviate from plan
   - `timeout`: Step exceeds time limit
   - `new_info`: New information available
   - `resource_change`: Resources changed

4. Replanning Strategies:
   - `local_revision`: Modify single steps
   - `partial_replan`: Replan from failure point
   - `global_replan`: Generate new plan
   - `fallback_plan`: Use pre-defined alternatives
   - `hybrid`: Combine multiple strategies

5. Configuration Options:
   - `max_replans`: Maximum replans per task
   - `min_replan_interval`: Minimum time between replans
   - `thresholds`: Deviation thresholds for replanning
   - `fallback_plans`: Pre-defined fallback plans
   - `preservation_mode`: Preserve completed steps

6. Plan Quality Assessment:
   - Success rate estimation
   - Completion time estimation
   - Resource cost estimation
   - Risk score calculation
   - Overall quality scoring

7. Alternative Generation:
   - Local step revision
   - Fallback plan adaptation
   - Partial replanning
   - Constraint relaxation
   - Skill substitution

8. Safety Features:
   - Cycle detection
   - Maximum replanning limit
   - Replanning cost estimation
   - Plan versioning
   - Rollback capability

Follow the 5 Laws of Elegant Defense:
- Guard clauses for plan validation
- Parse execution data at boundary
- Pure replanning functions
- Fail fast on invalid plans
- Clear names for all replanning components
```
