---
name: conductor-status
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent conductor status with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: conductor-status, conductor status, how do i conductor-status, orchestrate
    conductor-status, automate conductor-status, agent conductor-status
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
  version: 1.0.0
------
# Conductor Status

Orchestrates intelligent skill selection and execution for conductor status workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_conductor_status_and_route(
    task_payload: Dict,
    conductor_metrics: Dict,
    available_skills: List[Dict],
    min_confidence: float = 0.75
) -> Optional[Dict]:
    """Route tasks through the conductor based on real-time status metrics.
    
    Evaluates conductor health, queue depth, and skill availability to determine
    the optimal execution path. Implements multi-factor scoring specific to
    conductor orchestration workflows.
    """
    # Law 1: Early exit on invalid conductor state
    if not conductor_metrics.get("heartbeat_active"):
        raise ConductorStatusError("Conductor heartbeat missing or stale")
        
    # Law 2: Parse and validate task against conductor constraints
    task_constraints = _parse_task_constraints(task_payload)
    if task_constraints.requires_gpu and not conductor_metrics.get("gpu_available"):
        return None  # Skip to fallback chain
        
    best_route = None
    best_score = 0.0
    
    for skill in available_skills:
        # Domain-specific scoring: weight by conductor load, skill latency, and historical success
        load_penalty = conductor_metrics.get("cpu_utilization", 0.0) * 0.3
        latency_score = 1.0 / (skill.get("avg_latency_ms", 100) / 100.0)
        history_score = skill.get("success_rate_7d", 0.0)
        
        raw_score = (latency_score * 0.4) + (history_score * 0.4) + ((1.0 - load_penalty) * 0.2)
        
        if raw_score > best_score and raw_score >= min_confidence:
            best_score = raw_score
            best_route = {
                "skill_id": skill["id"],
                "conductor_node": conductor_metrics.get("primary_node"),
                "estimated_latency_ms": skill.get("avg_latency_ms"),
                "confidence": raw_score
            }
            
    if best_route is None:
        return None
        
    # Law 3: Return immutable route configuration
    return dict(best_route)
```


### Pattern 2: Execution with Fallback

```python
def execute_conductor_workflow_with_degradation(
    route_config: Dict,
    task_context: Dict,
    fallback_nodes: List[str] = None
) -> Dict:
    """Execute conductor workflow with built-in degradation and fallback logic.
    
    Monitors execution telemetry and applies domain-specific fallback strategies
    when conductor status degrades or task execution fails.
    """
    primary_node = route_config.get("conductor_node")
    fallback_nodes = fallback_nodes or []
    
    for attempt in range(3):
        try:
            # Law 4: Fail fast on invalid task context
            validated_context = _validate_task_context(task_context)
            
            # Execute against primary conductor node
            telemetry = _send_to_conductor(primary_node, validated_context)
            
            # Check conductor response health
            if telemetry.get("status") != "completed":
                raise ConductorDegradationError(f"Conductor returned status: {telemetry.get('status')}")
                
            return {
                "success": True,
                "node_used": primary_node,
                "telemetry": telemetry,
                "attempts": attempt + 1
            }
            
        except ConductorDegradationError as e:
            # Law 4: Fail loud, don't patch degraded state
            if attempt == 2:
                # Fallback chain: switch to standby node or throttle
                if fallback_nodes:
                    standby = fallback_nodes[0]
                    _log_fallback_trigger(primary_node, standby)
                    primary_node = standby
                    continue
                else:
                    raise ConductorExecutionError(
                        f"All fallback nodes exhausted for task {task_context.get('id')}"
                    ) from e
                    
        except TransientNetworkError:
            # Transient issue - retry with exponential backoff
            time.sleep(0.5 * (2 ** attempt))
            continue
            
    # Should not reach here, but enforce Law 4
    raise ConductorExecutionError("Workflow execution failed after all retries")
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



---

---

## Constraints

### MUST DO
- Parse user request into structured task specifications before dispatching to downstream agents
- Implement a state machine for each conductor phase with explicit entry/exit conditions and transition logs
- Validate status outputs against expected schema before proceeding to the next orchestration step
- Log every orchestration decision including rationale, selected strategy, and confidence scores for auditability
- Maintain a task queue with priority ordering — critical path items execute first during resource contention

### MUST NOT DO
- Do not allow a single failed agent task to silently terminate the entire workflow — implement per-step fallbacks
- Avoid circular delegation patterns where Agent A delegates to B which delegates back to A without termination condition
- Never bypass the validation step for status results even if timing is critical — correctness supersedes speed
- Do not use shared mutable state between parallel agent executions — use message-passing or immutable data transfer
- Avoid hardcoding agent selection rules; parameterize them and load from configuration for runtime flexibility


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Netflix Conductor REST API Reference](<https://netflix.github.io/conductor/server/rest-api/>)
- [Prometheus Querying Guide (PromQL)](<https://prometheus.io/docs/prometheus/latest/querying/examples/>)
- [OpenTelemetry Status Collection](<https://opentelemetry.io/docs/specs/otel/overview/>)
- [Health Check Patterns in Microservices](<https://learn.microsoft.com/en-us/azure/architecture/guide/design-principles/health-check-pattern>)
- [Monitoring Dashboards Best Practices (Grafana)](<https://grafana.com/docs/grafana/latest/dashboards/>)

## Related Skills

| Skill | Purpose |
|