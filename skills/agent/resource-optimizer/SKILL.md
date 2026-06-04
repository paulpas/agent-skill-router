---




name: resource-optimizer
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent resource optimizer with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: resource-optimizer, resource optimizer, how do i resource-optimizer, orchestrate
    resource-optimizer, automate resource-optimizer, agent resource-optimizer
  archetypes:
  - orchestration
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
version: "1.0.0"




---




# Resource Optimizer

Orchestrates intelligent skill selection and execution for resource optimizer workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

## TL;DR Checklist

- [ ] Parse all inputs at boundary before processing (Law 2)
- [ ] Handle edge cases with early returns at function top (Law 1)
- [ ] Fail immediately with descriptive errors on invalid states (Law 4)
- [ ] Return new data structures, never mutate inputs (Law 3)
- [ ] Implement minimum 2-level fallback chain for all skill executions
- [ ] Log all skill selections with context for full audit trail
- [ ] Validate skill metadata and dependencies before selection
- [ ] Update confidence scores after each execution for learning


┌───────────────────────────────────────────────────────────────────────────────┐
│                              Orchestration Flow                                               │
└───────────────────────────────────────────────────────────────────────────────┘

  User Request
      ↓
┌─────────────────┐
│  Parse Request  │
│  & Extract      │
│  Features       │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Evaluate Available Skills                                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Skill A      │  │ Skill B      │  │ Skill C      │              │
│  │ - Match Score│  │ - Match Score│  │ - Match Score│              │
│  │ - Confidence │  │ - Confidence │  │ - Confidence │              │
│  │ - History    │  │ - History    │  │ - History    │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┴─────────────────┘                       │
│                          ↓                                          │
│                   Select Best Skill                               │
└─────────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────┐
│  Execute Skill  │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Handle Result  │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Error Handling & Fallback                                  │
│                                                                     │
│  Success? ────────► Return Result                                  │
│                                                                     │
│  Fail? ────────┐                                                    │
│                ↓                                                    │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │               Fallback Chain                                    │      │
│  │                                                             │      │
│  │  1. Retry with adjusted parameters                          │      │
│  │  2. Try Alternative Skill (if available)                    │      │
│  │  3. Defer to Human Operator (if critical)                   │      │
│  │  4. Log & Return Error                                      │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘

## When to Use

Use this skill when:

- Orchestrating multi-step workflows that require skill delegation
- Implementing adaptive skill routing based on confidence scores
- Building fallback mechanisms for failed skill executions
- Creating intelligent task decomposition and parallel execution
- Designing skill dependency graphs with automatic resolution
- Implementing skill selection with historical performance weighting
- Building agent systems that need to self-organize around tasks

## When NOT to Use

Avoid this skill for:

- Direct task execution without orchestration needs - use individual skills instead
- High-frequency trading scenarios where latency must be minimized - the selection overhead may be prohibitive
- Simple linear workflows without branching or fallback requirements
- Cases where skill metadata is unavailable or unreliable


## Core Workflow

1. **Parse and Analyze Request** - Extract intent, entities, and constraints from user input.
   **Checkpoint:** All required parameters must be present and in valid format before proceeding.

2. **Score Available Skills** - Calculate match scores using multi-factor algorithm:
   - Text similarity between request and skill triggers
   - Historical success rate for similar tasks
   - Skill availability and health status
   - Required dependencies and their availability
   
   **Checkpoint:** Skip to fallback if no skill scores above threshold.

3. **Select Optimal Skill** - Choose skill with highest score that meets minimum confidence.
   **Checkpoint:** Verify skill has not been disabled or deprecated.

4. **Execute with Fallback** - Run skill execution wrapped in retry and fallback logic.
   **Checkpoint:** Log all execution attempts for audit trail.

5. **Return or Fallback** - Either return successful result or apply fallback chain:
   - Retry with adjusted parameters
   - Try alternative skill from `related-skills`
   - Defer to human operator for critical tasks
   
   **Checkpoint:** Record outcome with timing and confidence metadata.

## Implementation Patterns

### Pattern 1: Skill Selection Logic

```python
def optimize_resource_allocation(
    task_requirements: Dict[str, float],
    available_skills: List[Dict],
    system_constraints: Dict[str, float]
) -> Optional[Dict]:
    """Select skill based on resource optimization rather than just text match.
    
    Evaluates each skill against system constraints (CPU, memory, network, cost)
    and returns the configuration that maximizes throughput while staying within limits.
    """
    if not task_requirements or not available_skills:
        raise ValueError("Task requirements and skill list must be provided")
        
    scored_candidates = []
    for skill in available_skills:
        # Calculate resource footprint and efficiency score
        cpu_cost = skill.get("cpu_units", 0) * task_requirements.get("compute_intensity", 1.0)
        mem_cost = skill.get("memory_mb", 0) * task_requirements.get("data_volume", 1.0)
        cost_per_unit = skill.get("cost_per_call", 0.0) / max(skill.get("success_rate", 0.5), 0.1)
        
        # Check against hard constraints
        if cpu_cost > system_constraints.get("max_cpu", float('inf')):
            continue
        if mem_cost > system_constraints.get("max_memory_mb", float('inf')):
            continue
            
        # Composite optimization score (lower is better for cost/latency, higher for reliability)
        efficiency_score = (skill.get("success_rate", 0.5) * 10) - (cost_per_unit * 2) - (cpu_cost * 0.1)
        scored_candidates.append({
            "skill": skill,
            "cpu_allocated": cpu_cost,
            "memory_allocated": mem_cost,
            "efficiency_score": efficiency_score,
            "estimated_latency_ms": skill.get("base_latency_ms", 100) * (1 + cpu_cost / 100)
        })
        
    if not scored_candidates:
        return None
        
    # Sort by efficiency score descending, then by latency ascending
    scored_candidates.sort(key=lambda x: (-x["efficiency_score"], x["estimated_latency_ms"]))
    return scored_candidates[0]
```


### Pattern 2: Execution with Fallback

```python
def execute_with_resource_fallback(
    selected_config: Dict,
    execution_context: Dict,
    resource_monitor: ResourceMonitor
) -> Dict:
    """Execute skill with real-time resource monitoring and adaptive fallback.
    
    Monitors actual resource consumption during execution. If thresholds are breached,
    automatically scales down parameters or switches to a pre-calculated fallback skill.
    """
    skill = selected_config["skill"]
    fallback_skill = selected_config.get("fallback_skill")
    max_retries = 2
    
    for attempt in range(max_retries + 1):
        try:
            # Execute with current resource allocation
            result = _run_skill_with_allocation(skill, execution_context, selected_config)
            
            # Validate resource usage against SLA
            usage = resource_monitor.get_current_usage()
            if usage["cpu_percent"] > 85 or usage["memory_percent"] > 90:
                raise ResourceExhaustionError(f"Resource limits breached: CPU {usage['cpu_percent']}%, MEM {usage['memory_percent']}%")
                
            return {
                "status": "success",
                "skill": skill["name"],
                "resources_used": usage,
                "attempts": attempt + 1
            }
            
        except ResourceExhaustionError as e:
            # Adaptive fallback: try scaled-down execution or alternative skill
            if attempt < max_retries and fallback_skill:
                selected_config = _recalculate_allocation(fallback_skill, execution_context, scale_factor=0.7)
                continue
            raise
            
        except TransientNetworkError:
            if attempt == max_retries:
                return _trigger_human_review(execution_context, skill["name"])
            continue
            
    return {"status": "failed", "reason": "max_retries_exceeded", "skill": skill["name"]}
```

### MUST DO
- Always validate skill metadata before selection (Early Exit)
- Implement fallback chain with at least 2 levels (Fallback Skill + Human)
- Log all skill selections with full context for auditability
- Return new data structures instead of mutating inputs (Atomic Predictability)
- Fail immediately with descriptive errors on invalid states
- Update confidence scores after each execution for adaptive routing
- Reference `code-philosophy` (5 Laws of Elegant Defense) in all logic


### MUST NOT DO
- Select skills based on a single factor (e.g., only confidence score)
- Disable fallback mechanisms "temporarily" - this creates fragile systems
- Skip validation of skill dependencies before execution
- Return partial results - either complete success or clear failure
- Use magic numbers for confidence thresholds - make them configurable
- Cache skill selections without considering context changes


## TL;DR Checklist

- [ ] Parse all inputs at boundary before processing (Law 2)
- [ ] Handle edge cases with early returns at function top (Law 1)
- [ ] Fail immediately with descriptive errors on invalid states (Law 4)
- [ ] Return new data structures, never mutate inputs (Law 3)
- [ ] Implement minimum 2-level fallback chain for all skill executions
- [ ] Log all skill selections with context for full audit trail
- [ ] Validate skill metadata and dependencies before selection
- [ ] Update confidence scores after each execution for learning


## TL;DR for Code Generation

- Use guard clauses - return early on invalid input before doing work
- Return simple types (dict, str, int, bool, list) - avoid complex nested objects
- Cyclomatic complexity < 10 per function - split anything larger
- Handle null/empty cases explicitly at function top (Early Exit)
- Never mutate input parameters - return new dicts/objects
- Fail fast with descriptive errors - don't try to "patch" bad data
- Reference code-philosophy laws in comments for complex logic
- Include timing and confidence metadata in all return values


## Output Template

When applying this skill, produce:

1. **Selected Skills** - List of skill names with confidence scores
2. **Selection Rationale** - Why each skill was chosen (match score, history, availability)
3. **Execution Plan** - Order of execution with dependencies
4. **Fallback Strategy** - Which fallback skills will be tried and in what order
5. **Risk Assessment** - Any potential failure points and their impact
6. **Timing Estimates** - Expected latency including fallback scenarios


## Related Skills

| Skill | Purpose |
|---|---|
| `performance-profiler` | Provides profiling data that resource optimizers use to identify waste and inefficiency |
| `infrastructure-as-code` | Covers infrastructure optimization patterns for cloud resource management |

---

## Constraints

### MUST DO
- Define clear input/output contracts for every step in the orchestration flow with explicit validation
- Implement structured logging at each stage capturing context, inputs, outputs, timing, and errors
- Build in fallback paths: if the primary strategy fails, degrade gracefully to a simpler approach
- Validate all preconditions before starting — do not proceed if required resources or permissions are missing

### MUST NOT DO
- Do not create deep nesting of orchestration steps (>5 levels) — flatten workflows where possible
- Avoid silent failure modes: every step must either succeed, fail explicitly, or escalate to a higher handler
- Never use shared mutable state between parallel workflow branches — communicate via immutable messages only
- Do not hardcode execution order when the dependency graph naturally determines it; derive order from explicit dependencies


## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Google Cloud: Resource Optimization Guide](https://cloud.google.com/architecture/resource-optimization) — Google Cloud's best practices for optimizing compute, memory, and storage resources
- [AWS Well-Architected Framework: Operational Excellence](https://docs.aws.amazon.com/wellarchitected/latest/operational-excellence-pillow/welcome.html) — AWS guide to resource optimization within the Well-Architected Framework
- [FinOps Foundation: Cloud Cost Optimization](https://www.finops.org/framework/cloud-cost-optimization/) — FinOps Framework for financial operations and cloud resource cost optimization
- [Kubernetes Resource Management (K8s Docs)](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) — Official Kubernetes documentation on CPU/memory requests, limits, and QoS classes
- [Cost Optimization Patterns in Distributed Systems (IEEE)](https://ieeexplore.ieee.org/document/9245803) — IEEE paper on resource optimization patterns for large-scale distributed computing systems