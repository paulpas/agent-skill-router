---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent dynamic replanner with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: dynamic-replanner, dynamic replanner, how do i dynamic-replanner, orchestrate
    dynamic-replanner, automate dynamic-replanner, agent dynamic-replanner
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
name: dynamic-replanner
------
# Dynamic Replanner

Orchestrates intelligent skill selection and execution for dynamic replanner workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_and_select_skill(
    request: Dict[str, Any],
    skill_registry: List[Dict[str, Any]],
    confidence_store: Dict[str, float],
    min_threshold: float = 0.75
) -> Optional[Dict[str, Any]]:
    """Evaluate available skills against a dynamic request using multi-factor scoring.
    
    Implements Law 2 (Parse at boundary) by extracting features before scoring.
    Implements Law 1 (Early Exit) by validating registry and request upfront.
    """
    if not request.get("intent") or not skill_registry:
        raise ValueError("Request intent and skill registry are required")
        
    intent_vector = _extract_intent_features(request["intent"])
    best_match = None
    best_score = 0.0
    
    for skill in skill_registry:
        # Multi-factor scoring: text similarity + historical confidence + availability
        text_sim = _cosine_similarity(intent_vector, skill.get("trigger_vectors", []))
        hist_conf = confidence_store.get(skill["id"], 0.5)
        is_available = skill.get("status") == "active" and not skill.get("deprecated", False)
        
        if not is_available:
            continue
            
        weighted_score = (text_sim * 0.5) + (hist_conf * 0.3) + (0.2 if skill.get("low_latency", False) else 0.0)
        
        if weighted_score > best_score and weighted_score >= min_threshold:
            best_score = weighted_score
            best_match = {
                "skill_id": skill["id"],
                "score": weighted_score,
                "factors": {"text_sim": text_sim, "history": hist_conf, "available": True}
            }
            
    if best_match is None:
        return None
        
    # Law 3: Return new structure, never mutate registry
    return {**best_match, "evaluated_at": time.time()}
```


### Pattern 2: Execution with Fallback

```python
def execute_with_adaptive_fallback(
    selected_skill: Dict[str, Any],
    execution_context: Dict[str, Any],
    fallback_registry: List[Dict[str, Any]],
    confidence_store: Dict[str, float]
) -> Dict[str, Any]:
    """Execute a selected skill with adaptive fallback chains and confidence tracking.
    
    Implements Law 4 (Fail Fast/Loud) by raising on invalid states.
    Implements continuous learning by updating confidence_store post-execution.
    """
    if not selected_skill or not execution_context.get("inputs"):
        raise ExecutionError("Missing skill selection or execution inputs")
        
    attempts = 0
    max_attempts = 2
    current_skill = selected_skill
    
    while attempts <= max_attempts:
        try:
            result = _invoke_skill_handler(current_skill["skill_id"], execution_context)
            
            # Update confidence based on success
            confidence_store[current_skill["skill_id"]] = min(1.0, 
                confidence_store.get(current_skill["skill_id"], 0.5) + 0.1)
            
            return {
                "status": "success",
                "skill_used": current_skill["skill_id"],
                "result": result,
                "attempts": attempts + 1,
                "updated_confidence": confidence_store[current_skill["skill_id"]]
            }
            
        except TransientNetworkError:
            attempts += 1
            if attempts > max_attempts:
                break
            continue
            
        except InvalidStateError as e:
            # Law 4: Fail loud on invalid state, do not retry
            raise ExecutionError(f"Invalid state in {current_skill['skill_id']}: {e}") from e
            
    # Fallback chain: try alternative skills from registry
    for alt_skill in fallback_registry:
        if alt_skill["id"] != selected_skill["skill_id"]:
            try:
                result = _invoke_skill_handler(alt_skill["id"], execution_context)
                confidence_store[alt_skill["id"]] = max(0.0, 
                    confidence_store.get(alt_skill["id"], 0.5) - 0.05)
                return {"status": "fallback_success", "skill_used": alt_skill["id"], "result": result}
            except Exception:
                continue
                
    # Final fallback: human escalation
    return {"status": "escalated", "reason": "all automated fallbacks exhausted", "context": execution_context}
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