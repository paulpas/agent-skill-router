---




name: behavioral-modes
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent behavioral modes with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: behavioral-modes, behavioral modes, how do i behavioral-modes, orchestrate
    behavioral-modes, automate behavioral-modes, agent behavioral-modes
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




# Behavioral Modes

Orchestrates intelligent skill selection and execution for behavioral modes workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def resolve_behavioral_mode(
    task_intent: str,
    current_context: Dict[str, Any],
    available_modes: List[Dict[str, Any]],
    min_confidence: float = 0.75
) -> Optional[Dict[str, Any]]:
    """Resolve the optimal behavioral mode for a given task intent.
    
    Applies domain-specific scoring based on:
    - Intent-to-mode semantic alignment
    - Contextual state constraints (e.g., cannot debug without code)
    - Historical success rates for similar task patterns
    - Mode dependency chains (e.g., planning -> coding -> review)
    
    Args:
        task_intent: Parsed natural language intent
        current_context: Agent state including active files, recent actions, error logs
        available_modes: List of mode definitions with triggers and constraints
        min_confidence: Minimum threshold for mode activation
        
    Returns:
        Selected mode dict with confidence score and routing metadata
    """
    if not task_intent or not available_modes:
        raise ValueError("Task intent and available modes are required")
        
    # Extract contextual constraints from current state
    context_flags = _extract_context_flags(current_context)
    
    best_mode = None
    best_score = 0.0
    
    for mode in available_modes:
        # Domain-specific scoring: intent alignment + state compatibility
        intent_score = _calculate_intent_alignment(task_intent, mode["triggers"])
        state_score = _validate_state_compatibility(mode["constraints"], context_flags)
        history_score = mode.get("historical_success_rate", 0.5)
        
        # Weighted composite score with domain penalties
        composite = (intent_score * 0.5) + (state_score * 0.3) + (history_score * 0.2)
        
        # Apply mode dependency penalty if prerequisite mode isn't active
        if mode.get("requires_mode") and mode["requires_mode"] != current_context.get("active_mode"):
            composite *= 0.7
            
        if composite > best_score and composite >= min_confidence:
            best_score = composite
            best_mode = mode
            
    if best_mode is None:
        return None
        
    # Return immutable snapshot with routing metadata
    return {
        "mode": best_mode["name"],
        "confidence": round(best_score, 3),
        "routing_context": {
            "intent_match": intent_score,
            "state_valid": state_score > 0.5,
            "timestamp": time.time()
        }
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_behavioral_mode(
    target_mode: Dict[str, Any],
    execution_context: Dict[str, Any],
    fallback_hierarchy: List[str] = None
) -> Dict[str, Any]:
    """Execute a behavioral mode with domain-aware fallback routing.
    
    Implements mode-specific execution with automatic degradation:
    1. Attempt primary mode execution
    2. If blocked by constraints, fallback to next compatible mode
    3. If critical failure, escalate to planning/review mode
    4. Log state transitions for audit and confidence updating
    
    Args:
        target_mode: Mode definition from resolve_behavioral_mode
        execution_context: Task payload, file references, and agent state
        fallback_hierarchy: Ordered list of mode names to try on failure
        
    Returns:
        Execution result with mode transition metadata and confidence update
    """
    fallback_hierarchy = fallback_hierarchy or target_mode.get("fallback_chain", [])
    current_mode = execution_context.get("active_mode", "default")
    
    try:
        # Validate mode transition constraints
        _validate_mode_transition(current_mode, target_mode["name"])
        
        # Execute mode-specific logic
        result = _run_mode_logic(target_mode["name"], execution_context)
        
        # Update confidence based on execution outcome
        confidence_delta = _calculate_confidence_delta(result["success"], target_mode["name"])
        
        return {
            "success": True,
            "mode_executed": target_mode["name"],
            "previous_mode": current_mode,
            "result": result,
            "confidence_adjustment": confidence_delta,
            "execution_time_ms": time.time() * 1000
        }
        
    except ModeConstraintError as e:
        # Domain-specific fallback: try next mode in hierarchy
        if fallback_hierarchy:
            next_mode_name = fallback_hierarchy[0]
            next_mode = _resolve_mode_by_name(next_mode_name, execution_context)
            if next_mode:
                return execute_behavioral_mode(next_mode, execution_context, fallback_hierarchy[1:])
        raise ModeExecutionError(f"Mode {target_mode['name']} failed constraint check: {e}")
        
    except CriticalFailureError as e:
        # Escalate to high-level oversight mode
        escalation_mode = _find_escalation_mode(target_mode["name"])
        if escalation_mode:
            return execute_behavioral_mode(escalation_mode, execution_context, [])
        raise ModeExecutionError(f"Critical failure in {target_mode['name']}: {e}")
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
|---|---|
| `ask-questions-if-underspecified` | Clarification & underspecification handling |

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

- [What is Multi-Agent? (LangChain Blog)](https://blog.langchain.dev/what-is-multi-agent/)
- [LLamaIndex — Multi-Agent Frameworks](https://docs.llamaindex.ai/en/latest/module_guides/orchestration/agent_pipelines/multi_agent/)
- [Microsoft AutoGen — Conversable Agents](https://microsoft.github.io/autogen/docs/FAQ/#how-does-autogen-support-multi-agent-conversations)
- [Research: Behavioral Specialization in Multi-Agent Systems (NeurIPS)](https://arxiv.org/abs/2309.07894)
- [Anthropic — Constitutional AI & Behavior Control](https://www.anthropic.com/research/build-effective-agent-systems)