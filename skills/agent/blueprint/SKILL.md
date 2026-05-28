---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent blueprint with multi-factor skill selection, fallback
  chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: blueprint, blueprint, how do i blueprint, orchestrate blueprint, automate
    blueprint, agent blueprint
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
name: blueprint
------
# Blueprint

Orchestrates intelligent skill selection and execution for blueprint workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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

### Pattern 1: Blueprint Orchestration & Skill Routing

```python
def orchestrate_blueprint_request(
    user_request: str,
    skill_registry: List[Dict],
    execution_history: List[Dict]
) -> Dict:
    """Orchestrate a blueprint workflow by routing to the optimal skill chain.
    
    Applies the 5 Laws of Elegant Defense:
    - Law 1: Early exit on malformed requests
    - Law 2: Parse inputs at boundary, make illegal states unrepresentable
    - Law 3: Return new routing plan, never mutate registry
    - Law 4: Fail fast on missing dependencies
    """
    if not user_request or not user_request.strip():
        raise ValueError("Blueprint request cannot be empty")
        
    # Law 2: Parse & validate at boundary
    parsed_request = _parse_blueprint_intent(user_request)
    if not parsed_request.get("intent") or not parsed_request.get("required_params"):
        raise ValueError("Missing required blueprint intent or parameters")
        
    # Law 4: Validate dependencies before scoring
    available_skills = [
        s for s in skill_registry 
        if _check_dependencies_met(s.get("dependencies", []), execution_history)
    ]
    
    # Multi-factor scoring: trigger match + historical success + availability
    scored_candidates = []
    for skill in available_skills:
        trigger_match = _calculate_trigger_similarity(parsed_request["intent"], skill.get("triggers", []))
        historical_success = _get_historical_success_rate(skill["name"], execution_history)
        availability_score = 1.0 if skill.get("status") == "healthy" else 0.5
        
        composite_score = (trigger_match * 0.5) + (historical_success * 0.3) + (availability_score * 0.2)
        if composite_score >= 0.6:
            scored_candidates.append({
                "skill": skill,
                "score": composite_score,
                "confidence": composite_score * historical_success
            })
            
    if not scored_candidates:
        return {"status": "no_match", "fallback": "human_handoff", "reason": "No skills met threshold"}
        
    # Law 3: Return new structure, don't mutate
    best_match = max(scored_candidates, key=lambda x: x["score"])
    return {
        "status": "routed",
        "selected_skill": best_match["skill"]["name"],
        "confidence": best_match["confidence"],
        "routing_plan": {
            "primary": best_match["skill"]["name"],
            "fallback_chain": best_match["skill"].get("fallback_skills", []),
            "retry_policy": best_match["skill"].get("retry_config", {"max": 2})
        }
    }
```


### Pattern 2: Blueprint Execution & Adaptive Fallback

```python
def execute_blueprint_step(
    step_config: Dict,
    context: Dict,
    skill_registry: Dict[str, Callable]
) -> Dict:
    """Execute a blueprint workflow step with adaptive fallback and confidence tracking.
    
    Implements Fail Fast, Fail Loud (Law 4) with structured fallback chains.
    Updates confidence scores post-execution for adaptive routing.
    """
    skill_name = step_config.get("primary_skill")
    fallback_chain = step_config.get("fallback_chain", [])
    max_retries = step_config.get("retry_policy", {}).get("max", 2)
    
    # Law 1: Early exit on missing skill
    if skill_name not in skill_registry:
        raise KeyError(f"Blueprint step references unknown skill: {skill_name}")
        
    execution_log = []
    last_error = None
    
    for attempt in range(max_retries + 1):
        try:
            # Execute with strict input validation
            result = skill_registry[skill_name](context)
            
            # Law 3: Return new result structure
            execution_log.append({
                "attempt": attempt + 1,
                "status": "success",
                "latency_ms": result.get("latency_ms", 0)
            })
            
            # Update confidence for next routing decisions
            _update_skill_confidence(skill_name, success=True)
            return {
                "status": "completed",
                "skill": skill_name,
                "result": result.get("data"),
                "execution_log": execution_log
            }
            
        except TransientError as e:
            last_error = e
            execution_log.append({"attempt": attempt + 1, "status": "retry", "error": str(e)})
            if attempt == max_retries:
                break
        except InvalidStateError as e:
            # Law 4: Fail immediately on invalid state
            _update_skill_confidence(skill_name, success=False)
            raise BlueprintExecutionError(f"Invalid state in {skill_name}: {e}") from e
            
    # Fallback chain execution
    for fallback_skill in fallback_chain:
        if fallback_skill in skill_registry:
            try:
                fallback_result = skill_registry[fallback_skill](context)
                _update_skill_confidence(fallback_skill, success=True)
                return {
                    "status": "fallback_success",
                    "original_skill": skill_name,
                    "fallback_skill": fallback_skill,
                    "result": fallback_result.get("data"),
                    "execution_log": execution_log
                }
            except Exception as fb_err:
                execution_log.append({"fallback": fallback_skill, "status": "failed", "error": str(fb_err)})
                
    # Law 4: Fail loud with full context
    _update_skill_confidence(skill_name, success=False)
    raise BlueprintExecutionError(
        f"All attempts and fallbacks exhausted for {skill_name}. "
        f"Last error: {last_error}. Requires human review."
    )
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

- [Architecture Decision Records (ADR Pattern)](<https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions>)
- [Software Blueprint Patterns (Martin Fowler)](<https://martinfowler.com/bliki/SoftwareBlueprint.html>)
- [C4 Model for Software Architecture](<https://c4model.com/>)
- [UML Use Case Modeling Guide](<https://www.ibm.com/docs/en/rational-warehouse-modeler/9.6.0?topic=types-use-case-diagram>)
- [Design Documentation Best Practices (NIST)](<https://csrc.nist.gov/pubs/sp/800-160/vol-2/final>)

## Related Skills

| Skill | Purpose |
|