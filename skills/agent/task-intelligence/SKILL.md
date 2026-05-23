---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent task intelligence with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: task-intelligence, task intelligence, how do i task-intelligence, orchestrate
    task-intelligence, automate task-intelligence, agent task-intelligence
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
name: task-intelligence
------
# Task Intelligence

Orchestrates intelligent skill selection and execution for task intelligence workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_task_intelligence(
    raw_request: str,
    skill_registry: List[Dict],
    confidence_threshold: float = 0.75
) -> Dict:
    """Route a task through multi-factor intelligence scoring.
    
    Implements Law 2 (Parse at boundary) by extracting intent and entities
    before scoring. Uses weighted scoring for text match, historical success,
    and system health.
    """
    # Law 1: Early exit on malformed input
    if not raw_request or len(raw_request.strip()) < 3:
        return {"status": "rejected", "reason": "insufficient_input"}
    
    # Law 2: Parse and extract features at boundary
    parsed_intent = _extract_intent_entities(raw_request)
    if not parsed_intent.get("primary_entity"):
        return {"status": "rejected", "reason": "unrecognized_domain"}
        
    scored_candidates = []
    for skill in skill_registry:
        # Multi-factor scoring: text similarity (40%), history (40%), health (20%)
        text_match = _cosine_similarity(parsed_intent["query"], skill["triggers"])
        hist_success = skill.get("success_rate", 0.0)
        health_score = 1.0 if skill.get("is_healthy", True) else 0.3
        
        weighted_score = (text_match * 0.4) + (hist_success * 0.4) + (health_score * 0.2)
        
        if weighted_score >= confidence_threshold:
            scored_candidates.append({
                "skill_id": skill["id"],
                "score": round(weighted_score, 3),
                "fallback_chain": skill.get("fallback_ids", [])
            })
    
    # Law 3: Return new structure, never mutate registry
    if not scored_candidates:
        return {"status": "no_match", "fallback_to": "human_operator"}
        
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)
    return {
        "selected_skill": scored_candidates[0],
        "alternatives": scored_candidates[1:],
        "routing_metadata": {
            "intent": parsed_intent["primary_entity"],
            "timestamp": time.time(),
            "confidence": scored_candidates[0]["score"]
        }
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_task_with_adaptive_fallback(
    routing_result: Dict,
    task_context: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute routed task with intelligent fallback chain.
    
    Implements Law 4 (Fail Fast/Loud) by validating state before execution
    and escalating through a predefined fallback hierarchy.
    """
    selected = routing_result["selected_skill"]
    current_skill_id = selected["skill_id"]
    fallback_chain = selected.get("fallback_chain", [])
    
    for attempt in range(max_retries + 1):
        try:
            # Validate context matches skill requirements
            _validate_context_compatibility(task_context, current_skill_id)
            
            # Execute primary skill
            raw_output = _invoke_skill_api(current_skill_id, task_context)
            
            # Law 3: Atomic predictability - return fresh result
            return {
                "status": "success",
                "skill_used": current_skill_id,
                "output": raw_output,
                "attempts": attempt + 1,
                "latency_ms": _measure_duration()
            }
            
        except CriticalValidationError as e:
            # Law 4: Fail immediately on invalid state
            return {"status": "hard_fail", "error": str(e), "escalate": True}
            
        except TransientAPIError as e:
            if attempt < max_retries:
                _log_retry(current_skill_id, attempt, str(e))
                continue
            # Exhausted retries -> traverse fallback chain
            if fallback_chain:
                next_skill_id = fallback_chain[0]
                _log_fallback_triggered(current_skill_id, next_skill_id)
                return execute_task_with_adaptive_fallback(
                    {"selected_skill": {"skill_id": next_skill_id, "fallback_chain": fallback_chain[1:]}, "alternatives": []},
                    task_context,
                    max_retries=0
                )
            
            # Final fallback: human escalation
            return {
                "status": "escalated",
                "original_skill": current_skill_id,
                "error_context": task_context,
                "message": "All automated fallbacks exhausted. Routing to human operator."
            }
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