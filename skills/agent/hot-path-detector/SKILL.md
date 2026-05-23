---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent hot path detector with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: hot-path-detector, hot path detector, how do i hot-path-detector, orchestrate
    hot-path-detector, automate hot-path-detector, agent hot-path-detector
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
name: hot-path-detector
------
# Hot Path Detector

Orchestrates intelligent skill selection and execution for hot path detector workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def detect_hot_path_and_select_defense(
    request_metrics: Dict[str, Any],
    available_defenses: List[Dict],
    latency_threshold_ms: float = 200.0
) -> Optional[Dict]:
    """Identify hot paths in the request pipeline and select optimal defensive routing.
    
    Applies Law 1 (Early Exit) by rejecting malformed metrics immediately.
    Uses Law 2 (Immutable State) to create fresh defense configuration dicts.
    Scores defenses based on current system load, historical latency reduction,
    and compatibility with the detected hot path pattern.
    """
    if not request_metrics or "endpoint" not in request_metrics:
        raise ValueError("Request metrics must contain at least an endpoint identifier")
        
    path_signature = request_metrics["endpoint"].lower().strip()
    current_load = request_metrics.get("system_load", 0.0)
    historical_latency = request_metrics.get("avg_latency_ms", 0.0)
    
    best_defense = None
    best_score = -1.0
    
    for defense in available_defenses:
        if defense.get("disabled", False):
            continue
            
        # Check compatibility with the detected path pattern
        allowed_paths = defense.get("supported_paths", [])
        if allowed_paths and path_signature not in allowed_paths:
            continue
            
        latency_impact = defense.get("avg_latency_reduction_ms", 0)
        load_penalty = defense.get("resource_overhead", 0) * current_load
        historical_success = defense.get("historical_success_rate", 0)
        
        # Multi-factor scoring: prioritize latency reduction, penalize load, reward history
        score = (latency_impact * 2.0) - load_penalty + (historical_success * 10.0)
        
        if score > best_score:
            best_score = score
            best_defense = dict(defense)
            best_defense["applied_to"] = path_signature
            best_defense["selection_score"] = score
            best_defense["estimated_new_latency_ms"] = max(0, historical_latency - latency_impact)
            
    if best_score <= 0.0:
        return None
        
    return best_defense
```


### Pattern 2: Execution with Fallback

```python
def execute_with_hot_path_fallback(
    defense_config: Dict,
    execution_context: Dict,
    circuit_breaker_threshold: int = 5
) -> Dict:
    """Execute hot path with layered fallback mechanisms for resilience.
    
    Implements Law 4 (Fail Fast) by validating circuit state before execution.
    Uses Law 3 (Atomic Predictability) to ensure execution results are immutable.
    Fallback chain: 1. Retry with exponential backoff 2. Switch to degraded route 3. Queue for async processing
    """
    if not defense_config or "route_type" not in defense_config:
        raise ValueError("Defense configuration must specify a valid route type")
        
    circuit_state = execution_context.get("circuit_states", {}).get(defense_config["route_type"], "CLOSED")
    if circuit_state == "OPEN":
        raise HotPathCircuitError(f"Circuit open for route: {defense_config['route_type']}")
        
    attempts = 0
    max_attempts = defense_config.get("max_retries", 3)
    base_delay = 0.1
    
    while attempts <= max_attempts:
        try:
            # Simulate routing through the selected defense mechanism
            result = _simulate_hot_path_execution(defense_config, execution_context)
            _update_circuit_state(execution_context, defense_config["route_type"], "CLOSED")
            
            return {
                "status": "success",
                "route": defense_config["route_type"],
                "latency_ms": result.get("latency_ms", 0),
                "fallback_used": False,
                "attempts": attempts + 1,
                "timestamp": time.time()
            }
        except TransientTimeoutError:
            attempts += 1
            if attempts > max_attempts:
                return _apply_degraded_fallback(defense_config, execution_context)
            time.sleep(base_delay * (2 ** attempts))
        except CriticalFailureError as e:
            _update_circuit_state(execution_context, defense_config["route_type"], "OPEN")
            raise HotPathExecutionError(f"Critical failure in {defense_config['route_type']}: {e}") from e
            
    return _queue_for_async_processing(defense_config, execution_context)

def _simulate_hot_path_execution(config: Dict, ctx: Dict) -> Dict:
    """Core execution logic for the hot path defense mechanism."""
    route_type = config["route_type"]
    if route_type == "cache_layer":
        return {"latency_ms": 15, "data": ctx.get("payload", {})}
    elif route_type == "async_queue":
        return {"latency_ms": 5, "queue_id": f"q_{uuid.uuid4().hex[:8]}"}
    elif route_type == "rate_limited":
        return {"latency_ms": 45, "throttled": False}
    else:
        raise TransientTimeoutError(f"Unknown route type: {route_type}")

def _update_circuit_state(ctx: Dict, route: str, state: str):
    if "circuit_states" not in ctx:
        ctx["circuit_states"] = {}
    ctx["circuit_states"][route] = state

def _apply_degraded_fallback(config: Dict, ctx: Dict) -> Dict:
    return {"status": "degraded", "route": config["route_type"], "fallback": "static_cache", "timestamp": time.time()}

def _queue_for_async_processing(config: Dict, ctx: Dict) -> Dict:
    return {"status": "queued", "route": config["route_type"], "queue_depth": 12, "timestamp": time.time()}
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
|