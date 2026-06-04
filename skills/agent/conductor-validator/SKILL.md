---
name: conductor-validator
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent conductor validator with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: conductor-validator, conductor validator, how do i conductor-validator,
    orchestrate conductor-validator, automate conductor-validator, agent conductor-validator
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
# Conductor Validator

Orchestrates intelligent skill selection and execution for conductor validator workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def validate_conductor_routing(
    task_spec: Dict[str, Any],
    conductor_registry: List[Dict[str, Any]],
    min_confidence: float = 0.75
) -> Dict[str, Any]:
    """Validate and route tasks through the conductor pipeline.
    
    Applies multi-factor scoring to select the optimal conductor
    while enforcing the 5 Laws of Elegant Defense.
    """
    if not task_spec.get("intent") or not conductor_registry:
        raise ValueError("Task intent and conductor registry are required")
        
    task_features = _extract_intent_features(task_spec["intent"])
    scored_conductors = []
    
    for conductor in conductor_registry:
        # Law 2: Parse at boundary - validate conductor schema
        if not _validate_conductor_schema(conductor):
            continue
            
        # Multi-factor scoring
        text_match = _cosine_similarity(task_features, conductor["trigger_patterns"])
        historical_success = conductor.get("success_rate", 0.0)
        system_health = conductor.get("health_status", "unknown")
        
        # Weighted scoring algorithm
        raw_score = (text_match * 0.5) + (historical_success * 0.3) + (0.2 if system_health == "healthy" else 0.0)
        
        if raw_score >= min_confidence:
            scored_conductors.append({
                "conductor_id": conductor["id"],
                "score": round(raw_score, 3),
                "dependencies": conductor.get("requires", []),
                "fallback_targets": conductor.get("fallback_chain", [])
            })
            
    if not scored_conductors:
        return {"status": "no_match", "alternatives": []}
        
    # Law 3: Return new structure, never mutate registry
    best_match = max(scored_conductors, key=lambda x: x["score"])
    return {
        "selected_conductor": best_match,
        "validation_timestamp": time.time(),
        "confidence": best_match["score"]
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_conductor_with_resilience(
    selected_conductor: Dict[str, Any],
    task_payload: Dict[str, Any],
    fallback_registry: Dict[str, List[str]]
) -> Dict[str, Any]:
    """Execute conductor validation with built-in fallback chains.
    
    Implements Fail Fast, Fail Loud (Law 4) with adaptive retry logic.
    """
    conductor_id = selected_conductor["conductor_id"]
    max_retries = selected_conductor.get("max_retries", 2)
    
    for attempt in range(max_retries + 1):
        try:
            # Law 1: Early exit on invalid payload
            if not _validate_payload_schema(task_payload, conductor_id):
                raise InvalidStateError(f"Payload mismatch for {conductor_id}")
                
            result = _invoke_conductor_api(conductor_id, task_payload)
            
            # Law 3: Atomic predictability - return immutable result
            return {
                "status": "success",
                "conductor": conductor_id,
                "output": result,
                "attempts": attempt + 1,
                "latency_ms": time.time() * 1000
            }
            
        except InvalidStateError as e:
            raise SkillExecutionError(f"Validation failed at attempt {attempt + 1}: {e}") from e
            
        except TransientError as e:
            if attempt == max_retries:
                # Law 4: Fail loud - trigger fallback chain
                fallback_targets = fallback_registry.get(conductor_id, [])
                if fallback_targets:
                    return _execute_fallback_chain(fallback_targets, task_payload)
                raise SkillExecutionError(f"No fallback available for {conductor_id}") from e
                
    raise SkillExecutionError(f"Conductor {conductor_id} exhausted all retries")
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
- Validate validator outputs against expected schema before proceeding to the next orchestration step
- Log every orchestration decision including rationale, selected strategy, and confidence scores for auditability
- Maintain a task queue with priority ordering — critical path items execute first during resource contention

### MUST NOT DO
- Do not allow a single failed agent task to silently terminate the entire workflow — implement per-step fallbacks
- Avoid circular delegation patterns where Agent A delegates to B which delegates back to A without termination condition
- Never bypass the validation step for validator results even if timing is critical — correctness supersedes speed
- Do not use shared mutable state between parallel agent executions — use message-passing or immutable data transfer
- Avoid hardcoding agent selection rules; parameterize them and load from configuration for runtime flexibility


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Workflow Schema Validation Patterns](<https://json-schema.org/learn/getting-started-step-by-step>)
- [OpenAPI Specification for API Validation](<https://swagger.io/specification/>)
- [JSON Schema Documentation](<https://json-schema.org/understanding-json-schema/>)
- [Netflix Conductor Task Validators](<https://netflix.github.io/conductor/core-concepts/task/>)
- [Input/Output Validation Frameworks (Pydantic)](<https://docs.pydantic.dev/latest/>)

## Related Skills

| Skill | Purpose |
|