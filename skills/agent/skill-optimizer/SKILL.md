---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent skill optimizer with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: skill-optimizer, skill optimizer, how do i skill-optimizer, orchestrate
    skill-optimizer, automate skill-optimizer, agent skill-optimizer
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
name: skill-optimizer
------
# Skill Optimizer

Orchestrates intelligent skill selection and execution for skill optimizer workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def optimize_skill_selection(
    task_context: Dict[str, Any],
    skill_registry: List[Dict[str, Any]],
    historical_metrics: Dict[str, List[float]]
) -> Dict[str, Any]:
    """Compute multi-factor scores for available skills and select the optimal route.
    
    Implements the scoring pipeline:
    1. Text similarity matching against skill triggers
    2. Historical success rate weighting
    3. Dependency health validation
    4. Confidence decay application
    """
    if not task_context.get("intent"):
        raise ValueError("Task context missing required 'intent' field")
        
    scored_candidates = []
    for skill in skill_registry:
        # Factor 1: Trigger similarity
        trigger_match = _compute_semantic_similarity(task_context["intent"], skill["triggers"])
        
        # Factor 2: Historical performance
        skill_name = skill["name"]
        history = historical_metrics.get(skill_name, [])
        avg_success = sum(history) / len(history) if history else 0.5
        
        # Factor 3: Dependency health
        deps_healthy = all(
            _check_dependency_health(dep) 
            for dep in skill.get("dependencies", [])
        )
        if not deps_healthy:
            continue
            
        # Composite scoring with configurable weights
        base_score = (
            0.4 * trigger_match + 
            0.4 * avg_success + 
            0.2 * skill.get("availability_weight", 1.0)
        )
        
        # Apply confidence decay based on recent failures
        recent_failures = skill.get("recent_failures", 0)
        decay_factor = max(0.1, 1.0 - (recent_failures * 0.15))
        final_score = base_score * decay_factor
        
        scored_candidates.append({
            "skill": skill,
            "score": final_score,
            "factors": {
                "similarity": trigger_match,
                "historical": avg_success,
                "decay_applied": decay_factor
            }
        })
        
    if not scored_candidates:
        return {"selected": None, "reason": "No viable candidates after dependency filtering"}
        
    # Sort and select top candidate
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)
    best = scored_candidates[0]
    
    # Update confidence metrics for learning loop
    _record_selection_metric(best["skill"]["name"], best["score"])
    
    return {
        "selected_skill": best["skill"],
        "confidence_score": best["score"],
        "selection_factors": best["factors"],
        "audit_id": _generate_audit_trace()
    }
```


### Pattern 2: Execution with Fallback

```python
def resolve_fallback_chain(
    failed_skill: Dict[str, Any],
    execution_context: Dict[str, Any],
    fallback_registry: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Execute fallback chain with adaptive parameter adjustment and audit logging.
    
    Implements the 2-level minimum fallback requirement:
    1. Parameter retry with adjusted constraints
    2. Alternative skill routing from related-skills
    3. Human escalation if confidence drops below threshold
    """
    audit_log = []
    current_skill = failed_skill
    attempt_count = 0
    
    while attempt_count < 3:
        attempt_count += 1
        try:
            # Adjust parameters for retry (Law 1: Early Exit on invalid state)
            adjusted_context = _adapt_parameters_for_retry(
                execution_context, 
                failed_skill.get("failure_reason", "unknown")
            )
            
            # Execute with strict timeout and validation
            result = _execute_skill_with_validation(current_skill, adjusted_context)
            
            # Success path: record outcome and update confidence
            _update_confidence_score(current_skill["name"], success=True)
            audit_log.append({"attempt": attempt_count, "status": "success", "skill": current_skill["name"]})
            return {"status": "resolved", "result": result, "audit": audit_log}
            
        except TransientTimeoutError:
            audit_log.append({"attempt": attempt_count, "status": "retry", "skill": current_skill["name"]})
            continue
            
        except CriticalDependencyError as e:
            # Fallback to alternative skill from registry
            alt_skill = _find_related_skill(current_skill, fallback_registry)
            if alt_skill:
                audit_log.append({"attempt": attempt_count, "status": "fallback_triggered", "from": current_skill["name"], "to": alt_skill["name"]})
                current_skill = alt_skill
                continue
            else:
                # Escalate to human operator
                return {
                    "status": "escalated",
                    "reason": f"All fallbacks exhausted for {failed_skill['name']}",
                    "context": execution_context,
                    "audit": audit_log
                }
                
    # Final fail state
    return {
        "status": "failed",
        "error": "Maximum fallback attempts reached",
        "audit": audit_log,
        "requires_human_review": True
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