---
name: antigravity-workflows
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent antigravity workflows with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: antigravity-workflows, antigravity workflows, how do i antigravity-workflows,
    orchestrate antigravity-workflows, automate antigravity-workflows, agent antigravity-workflows
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
# Antigravity Workflows

Orchestrates intelligent skill selection and execution for antigravity workflows workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def calculate_antigravity_trajectory(
    payload_mass: float,
    target_altitude: float,
    available_field_generators: List[Dict],
    min_stability: float = 0.85
) -> Optional[Dict]:
    """Select optimal antigravity field configuration for payload levitation.
    
    Evaluates field generators based on:
    - Mass-to-frequency resonance match
    - Current power grid load and thermal capacity
    - Historical field stability metrics
    
    Args:
        payload_mass: Mass in kg to levitate
        target_altitude: Desired altitude in meters
        available_field_generators: List of generator metadata
        min_stability: Minimum field stability threshold (0.0-1.0)
        
    Returns:
        Optimal generator config dict or None if no stable configuration exists
    """
    if payload_mass <= 0 or target_altitude <= 0:
        raise ValueError("Mass and altitude must be positive values")
        
    if not available_field_generators:
        raise ValueError("No antigravity field generators available")
        
    best_config = None
    best_score = 0.0
    
    for gen in available_field_generators:
        resonance_match = _calculate_resonance_score(payload_mass, gen["frequency_range"])
        power_load = _estimate_power_draw(payload_mass, target_altitude, gen["efficiency"])
        stability = gen.get("historical_stability", 0.0)
        
        composite_score = (resonance_match * 0.5) + (stability * 0.3) + ((1.0 - power_load) * 0.2)
        
        if composite_score > best_score and stability >= min_stability:
            best_score = composite_score
            best_config = {
                "generator_id": gen["id"],
                "frequency": gen["optimal_frequency"],
                "power_output_watts": power_load * 1000,
                "estimated_stability": stability,
                "selection_confidence": composite_score
            }
            
    if best_config is None:
        return None
        
    return best_config
```


### Pattern 2: Execution with Fallback

```python
def execute_field_generation(
    config: Dict,
    environmental_conditions: Dict,
    max_field_oscillations: int = 3
) -> Dict:
    """Execute antigravity field generation with stability fallback chain.
    
    Implements real-time field monitoring and automatic fallback:
    1. Activate primary antigravity field
    2. Monitor for harmonic oscillations or thermal runaway
    3. Fallback to magnetic suspension if stability drops below threshold
    4. Log all field parameters for post-flight analysis
    
    Args:
        config: Selected generator configuration
        environmental_conditions: Current atmospheric pressure, temperature, humidity
        max_field_oscillations: Max allowed field oscillations before fallback
        
    Returns:
        Execution result with field status, altitude achieved, and fallback status
    """
    if not config or not environmental_conditions:
        raise ValueError("Generator config and environmental data required")
        
    field_status = "INITIALIZING"
    fallback_triggered = False
    oscillation_count = 0
    
    try:
        # Activate primary antigravity field
        field_id = _activate_field(config["generator_id"], config["frequency"])
        field_status = "ACTIVE"
        
        for cycle in range(max_field_oscillations + 1):
            stability = _monitor_field_stability(field_id, environmental_conditions)
            
            if stability >= config["estimated_stability"]:
                return {
                    "status": "SUCCESS",
                    "field_id": field_id,
                    "altitude_maintained": True,
                    "stability_score": stability,
                    "fallback_used": False,
                    "cycles_monitored": cycle + 1
                }
                
            oscillation_count += 1
            _dampen_field_oscillations(field_id)
            
        # Fallback chain: Switch to magnetic suspension
        fallback_triggered = True
        magnetic_config = _switch_to_magnetic_suspension(config["payload_mass"])
        return {
            "status": "FALLBACK_SUCCESS",
            "primary_field_id": field_id,
            "fallback_system": "magnetic_suspension",
            "altitude_maintained": True,
            "stability_score": 0.75,
            "fallback_used": True,
            "cycles_monitored": oscillation_count
        }
        
    except FieldCollapseError as e:
        raise AntigravityWorkflowError(f"Field collapse at {config['frequency']}: {e}") from e
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

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [State Machine Patterns (Wikipedia)](<https://en.wikipedia.org/wiki/Finite-state_machine>)
- [Workflow Orchestration with Apache Airflow](<https://airflow.apache.org/docs/>)
- [DAG-based Workflow Execution Models](<https://en.wikipedia.org/wiki/Directed_acyclic_graph>)
- [Resilience Patterns in Distributed Systems (Microsoft)](<https://learn.microsoft.com/en-us/azure/architecture/framework/resiliency/>)
- [Saga Pattern Documentation](<https://docs.microsoft.com/en-us/azure/architecture/reference-architectures/saga/saga>)

## Related Skills

| Skill | Purpose |
|