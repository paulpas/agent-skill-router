---
name: using-superpowers
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent using superpowers with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: using-superpowers, using superpowers, how do i using-superpowers, orchestrate
    using-superpowers, automate using-superpowers, agent using-superpowers
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
# Using Superpowers

Orchestrates intelligent skill selection and execution for using superpowers workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_agent_request(
    user_intent: str,
    skill_registry: List[Dict],
    confidence_history: Dict[str, List[float]]
) -> Dict:
    """Orchestrates multi-factor skill selection for agent superpowers.
    
    Implements the 5 Laws of Elegant Defense by validating inputs,
    scoring skills against historical performance and system state,
    and enforcing strict confidence thresholds before delegation.
    """
    # Law 1: Early exit on malformed intent
    if not user_intent or len(user_intent.strip()) < 3:
        return {"status": "rejected", "reason": "invalid_intent"}
    
    # Law 2: Parse & validate skill registry state
    active_skills = [s for s in skill_registry if s.get("status") == "active"]
    if not active_skills:
        return {"status": "rejected", "reason": "no_active_skills"}
    
    # Multi-factor scoring pipeline
    scored_candidates = []
    for skill in active_skills:
        trigger_match = _semantic_match(user_intent, skill.get("triggers", []))
        historical_success = _get_avg_confidence(skill["name"], confidence_history)
        system_load = _get_current_load(skill.get("resource_pool"))
        
        # Weighted scoring formula
        composite_score = (
            0.4 * trigger_match +
            0.4 * historical_success +
            0.2 * (1.0 - system_load)
        )
        
        scored_candidates.append({
            "skill": skill,
            "score": composite_score,
            "factors": {"trigger": trigger_match, "history": historical_success, "load": system_load}
        })
    
    # Law 3: Atomic selection - return new structure
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)
    best = scored_candidates[0]
    
    if best["score"] < 0.7:
        return {"status": "fallback_triggered", "reason": "low_confidence", "candidates": scored_candidates}
        
    return {
        "selected_skill": best["skill"]["name"],
        "confidence": best["score"],
        "routing_metadata": best["factors"],
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_with_fallback(
    skill: Dict,
    task_context: Dict,
    fallback_registry: List[Dict],
    max_retries: int = 2
) -> Dict:
    """Orchestrates resilient skill execution with adaptive fallback routing.
    
    Implements the Fail Fast, Fail Loud principle (Law 4) by enforcing
    strict state validation, immediate error propagation, and a 
    deterministic fallback chain tailored to agent superpowers workflows.
    """
    # Law 1: Early exit on invalid skill configuration
    if not skill.get("name") or not skill.get("version"):
        raise SkillExecutionError("Skill metadata incomplete")
        
    # Law 2: Parse & isolate execution context
    execution_state = {
        "skill": skill["name"],
        "context": task_context,
        "attempt": 0,
        "confidence": skill.get("base_confidence", 0.8)
    }
    
    # Fallback chain execution loop
    for attempt in range(max_retries + 1):
        execution_state["attempt"] = attempt + 1
        try:
            # Execute core skill logic
            raw_result = _invoke_skill_handler(skill, execution_state["context"])
            
            # Law 3: Atomic result construction
            return {
                "status": "success",
                "skill": skill["name"],
                "result": raw_result,
                "attempts": execution_state["attempt"],
                "final_confidence": execution_state["confidence"]
            }
            
        except InvalidStateError as e:
            # Law 4: Fail fast on corrupt state
            _log_audit("state_error", skill["name"], str(e))
            raise SkillExecutionError(f"State validation failed: {e}") from e
            
        except TransientError as e:
            # Adaptive fallback routing
            if attempt >= max_retries:
                return _route_to_fallback_chain(skill, fallback_registry, execution_state)
                
            # Decay confidence slightly on retry
            execution_state["confidence"] *= 0.9
            _log_audit("retry", skill["name"], f"Attempt {attempt+1}")
            
    # Law 4: Fail loud after exhausting retries
    _log_audit("exhausted", skill["name"], "All fallbacks failed")
    raise SkillExecutionError(f"Execution failed for {skill['name']} after {max_retries+1} attempts")
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

- [Microsoft AutoGen Framework](https://microsoft.github.io/autogen/)
- [LangGraph Multi-Agent Orchestration](https://langchain-ai.github.io/langgraph/concepts/multi_agent/)
- [CrewAI Multi-Agent Framework](https://docs.crewai.com/)
- [OpenAI Agents SDK Overview](https://openai.com/index/introducing-the-agents-sdk/)
- [Multi-Agent Orchestration Survey — arXiv](https://arxiv.org/abs/2309.03361)

## Related Skills

| Skill | Purpose |
|

