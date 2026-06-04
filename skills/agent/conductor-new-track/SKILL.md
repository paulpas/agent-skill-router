---
name: conductor-new-track
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent conductor new track with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: conductor-new-track, conductor new track, how do i conductor-new-track,
    orchestrate conductor-new-track, automate conductor-new-track, agent conductor-new-track
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
# Conductor New Track

Orchestrates intelligent skill selection and execution for conductor new track workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def conductor_select_skill(
    request: str,
    skill_registry: List[Dict],
    confidence_history: Dict[str, float],
    min_confidence: float = 0.7
) -> Optional[Dict]:
    """Orchestrates multi-factor skill selection for conductor-new-track workflows.
    
    Implements Law 2 (Parse at boundary) by validating request format and extracting
    intent features before scoring. Uses Law 3 (Atomic Predictability) by returning
    a fresh selection context without mutating the registry.
    """
    if not request or not request.strip():
        raise ValueError("Request cannot be empty")
    if not skill_registry:
        raise ValueError("Skill registry is empty")
        
    # Parse request features at boundary
    intent = _extract_intent(request)
    constraints = _parse_constraints(request)
    
    best_match = None
    best_score = 0.0
    
    for skill in skill_registry:
        # Multi-factor scoring: trigger match + historical confidence + availability
        trigger_match = _calculate_trigger_similarity(intent, skill.get("triggers", []))
        historical_conf = confidence_history.get(skill["name"], 0.5)
        availability = 1.0 if skill.get("status") == "active" else 0.0
        
        # Weighted composite score
        composite = (trigger_match * 0.5) + (historical_conf * 0.3) + (availability * 0.2)
        
        if composite > best_score and composite >= min_confidence:
            best_score = composite
            best_match = skill
            
    if best_match is None:
        return None
        
    # Return new structure (Law 3)
    return {
        "selected_skill": best_match["name"],
        "confidence": best_score,
        "intent_matched": intent,
        "constraints_applied": constraints,
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def conductor_execute_with_fallback(
    selected_skill: Dict,
    execution_context: Dict,
    fallback_registry: List[Dict],
    max_retries: int = 2
) -> Dict:
    """Executes the selected skill with a structured fallback chain.
    
    Implements Law 4 (Fail Fast, Fail Loud) by immediately halting on invalid states.
    Implements Law 1 (Early Exit) by validating context before attempting execution.
    """
    if not _validate_context(execution_context, selected_skill):
        raise ConductorError(f"Invalid execution context for {selected_skill['selected_skill']}")
        
    attempts = 0
    last_error = None
    
    while attempts <= max_retries:
        try:
            # Execute actual domain logic
            result = _invoke_skill(selected_skill["selected_skill"], execution_context)
            
            # Update confidence history on success
            _update_confidence(selected_skill["selected_skill"], success=True)
            
            return {
                "status": "success",
                "skill": selected_skill["selected_skill"],
                "result": result,
                "attempts": attempts + 1,
                "latency_ms": time.time() - execution_context.get("start_time", time.time())
            }
        except InvalidStateError as e:
            # Fail fast - do not retry invalid states
            raise ConductorError(f"Invalid state in {selected_skill['selected_skill']}: {e}") from e
        except TransientError as e:
            last_error = e
            attempts += 1
            if attempts > max_retries:
                break
                
    # Fallback chain execution
    for fallback_skill in fallback_registry:
        try:
            result = _invoke_skill(fallback_skill["name"], execution_context)
            _update_confidence(fallback_skill["name"], success=True)
            return {
                "status": "fallback_success",
                "original_skill": selected_skill["selected_skill"],
                "fallback_skill": fallback_skill["name"],
                "result": result
            }
        except Exception:
            continue
            
    # Fail loud - all paths exhausted
    _update_confidence(selected_skill["selected_skill"], success=False)
    raise ConductorError(f"All execution and fallback paths failed for {selected_skill['selected_skill']}")
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
- Validate new-track outputs against expected schema before proceeding to the next orchestration step
- Log every orchestration decision including rationale, selected strategy, and confidence scores for auditability
- Maintain a task queue with priority ordering — critical path items execute first during resource contention

### MUST NOT DO
- Do not allow a single failed agent task to silently terminate the entire workflow — implement per-step fallbacks
- Avoid circular delegation patterns where Agent A delegates to B which delegates back to A without termination condition
- Never bypass the validation step for new-track results even if timing is critical — correctness supersedes speed
- Do not use shared mutable state between parallel agent executions — use message-passing or immutable data transfer
- Avoid hardcoding agent selection rules; parameterize them and load from configuration for runtime flexibility


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Netflix Conductor Workflow Creation](<https://netflix.github.io/conductor/core-concepts/overview/>)
- [REST API Design Best Practices](<https://restfulapi.net/>)
- [Workflow Versioning Strategies](<https://semver.org/>)
- [API Schema Evolution Patterns](<https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design>)
- [Backward Compatible API Design (Google)](<https://cloud.google.com/apis/design/versioning>)

## Related Skills

| Skill | Purpose |
|