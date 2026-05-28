---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent antigravity skill orchestrator with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: antigravity-skill-orchestrator, antigravity skill orchestrator, how do
    i antigravity-skill-orchestrator, orchestrate antigravity-skill-orchestrator,
    automate antigravity-skill-orchestrator, agent antigravity-skill-orchestrator
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
name: antigravity-skill-orchestrator
------
# Antigravity Skill Orchestrator

Orchestrates intelligent skill selection and execution for antigravity skill orchestrator workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_antigravity_module(
    payload_mass: float,
    target_altitude: float,
    available_modules: List[Dict],
    stability_threshold: float = 0.85
) -> Optional[Dict]:
    """Select optimal anti-gravity field generator based on mass/altitude constraints.
    
    Evaluates modules by:
    - Thrust-to-weight ratio compatibility
    - Field harmonic stability under current atmospheric pressure
    - Historical uptime for similar payload profiles
    """
    if payload_mass <= 0 or target_altitude < 0:
        raise ValueError("Payload mass and altitude must be positive")
        
    scored_modules = []
    for mod in available_modules:
        if mod.get("status") != "online":
            continue
            
        mass_factor = payload_mass / mod["max_load_kg"]
        altitude_factor = abs(target_altitude - mod["optimal_ceiling_km"]) / mod["ceiling_range_km"]
        stability = mod["harmonic_stability"] * (1.0 - altitude_factor)
        
        if stability >= stability_threshold:
            scored_modules.append({
                "module_id": mod["id"],
                "score": stability * (1.0 - mass_factor),
                "estimated_field_lifetime_hrs": mod["coolant_capacity_l"] / (payload_mass * 0.05)
            })
            
    if not scored_modules:
        return None
        
    scored_modules.sort(key=lambda x: x["score"], reverse=True)
    return scored_modules[0]
```


### Pattern 2: Execution with Fallback

```python
def execute_field_adjustment(
    selected_module: Dict,
    payload_config: Dict,
    max_resonance_cycles: int = 3
) -> Dict:
    """Execute anti-gravity field adjustment with harmonic fallback chain.
    
    Implements field collapse prevention:
    - Monitors gravimetric sensors for resonance spikes
    - Falls back to magnetic suspension if field coherence drops
    - Deploys emergency ballast if altitude deviation exceeds limits
    """
    if not selected_module or not payload_config:
        raise ValueError("Module and payload config required for field generation")
        
    field_params = _initialize_field_params(selected_module, payload_config)
    coherence_history = []
    
    for cycle in range(max_resonance_cycles):
        field_output = _apply_gravitic_field(field_params)
        coherence = _measure_field_coherence(field_output)
        coherence_history.append(coherence)
        
        if coherence >= 0.90:
            return {
                "status": "stable",
                "module_id": selected_module["id"],
                "coherence_peak": max(coherence_history),
                "cycles_used": cycle + 1
            }
            
        if coherence < 0.60:
            return _trigger_magnetic_fallback(payload_config)
            
        field_params["dampening_coeff"] *= 1.1
        
    return _deploy_emergency_ballast(payload_config, coherence_history)
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

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Design Patterns: Orchestrator Pattern](<https://docs.microsoft.com/en-us/azure/architecture/patterns/orchestrator-choreography>)
- [Microservices Orchestration vs Choreography (Martin Fowler)](<https://martinfowler.com/articles/choreographyVsOrchestration.html>)
- [Saga Pattern for Distributed Transactions](<https://docs.microsoft.com/en-us/azure/architecture/reference-architectures/saga/saga>)
- [Distributed Systems Patterns Overview](<https://www.cs.cornell.edu/courses/cs6410/2018sp/patterns.html>)
- [Event-Driven Architecture Patterns](<https://www.enterpriseintegrationpatterns.com/>)

## Related Skills

| Skill | Purpose |
|