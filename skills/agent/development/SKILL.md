---
name: development
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent development with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: development, development, how do i development, orchestrate development,
    automate development, agent development
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
# Development

Orchestrates intelligent skill selection and execution for development workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_development_skill(
    dev_task: Dict[str, Any],
    codebase_context: Dict[str, Any],
    registry: List[Dict[str, Any]],
    min_confidence: float = 0.75
) -> Optional[Dict[str, Any]]:
    """Orchestrate skill selection for development workflows.
    
    Evaluates available dev tools (linters, test runners, refactors, API generators)
    against the task spec and codebase state using multi-factor scoring.
    """
    # Guard clause - Early Exit (Law 1)
    if not dev_task.get("type") or not codebase_context.get("repo_root"):
        raise ValueError("Incomplete development context provided")
        
    task_features = _extract_dev_features(dev_task, codebase_context)
    scored_candidates = []
    
    for skill in registry:
        if skill.get("status") != "active":
            continue
            
        match_score = _calculate_dev_match(task_features, skill)
        history_score = _get_historical_dev_success_rate(skill["id"])
        availability_score = _check_dev_tool_health(skill["id"])
        
        composite = (match_score * 0.5) + (history_score * 0.3) + (availability_score * 0.2)
        
        if composite >= min_confidence:
            scored_candidates.append({
                "skill": skill,
                "score": composite,
                "factors": {"match": match_score, "history": history_score, "health": availability_score}
            })
            
    if not scored_candidates:
        return None
        
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)
    selected = scored_candidates[0]
    
    # Atomic Predictability (Law 3) - Return fresh context, never mutate inputs
    return {
        "selected_skill": selected["skill"],
        "confidence": selected["score"],
        "execution_context": {**codebase_context, "task_id": dev_task.get("id")},
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_dev_workflow(
    selection: Dict[str, Any],
    task_spec: Dict[str, Any],
    fallback_registry: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Execute development task with domain-specific fallback chains.
    
    Implements resilient execution for code generation, testing, and refactoring.
    Falls back to alternative tools or manual review gates on failure.
    """
    skill_meta = selection["selected_skill"]
    context = selection["execution_context"]
    
    # Parse context - Ensure trusted state (Law 2)
    if not _validate_dev_prerequisites(skill_meta, context):
        raise DevOrchestrationError(f"Missing prerequisites for {skill_meta['name']}")
        
    attempts = 0
    max_attempts = 2
    
    while attempts <= max_attempts:
        try:
            result = _run_dev_tool(skill_meta, context, task_spec)
            
            # Validate output before returning
            if not _validate_dev_output(result, skill_meta["output_schema"]):
                raise DevOrchestrationError("Tool produced invalid output schema")
                
            return {
                "status": "success",
                "skill": skill_meta["name"],
                "artifacts": result.get("artifacts", []),
                "metrics": {"attempts": attempts + 1, "latency_ms": time.time() - selection["timestamp"]}
            }
            
        except DevToolTimeoutError:
            attempts += 1
            if attempts > max_attempts:
                break
            continue
            
        except DevValidationError as e:
            # Fail Fast - Don't try to patch corrupted code state (Law 4)
            raise DevOrchestrationError(f"Validation failed at attempt {attempts}: {e}") from e
            
    # Fallback Chain: Try alternative dev tool, then manual review gate
    fallback_skill = _find_alternative_dev_tool(skill_meta, fallback_registry)
    if fallback_skill:
        return execute_dev_workflow({
            "selected_skill": fallback_skill,
            "execution_context": context,
            "timestamp": time.time()
        }, task_spec, fallback_registry)
        
    # Critical path fallback: Defer to human developer
    return {
        "status": "deferred",
        "reason": "All automated dev tools exhausted",
        "ticket": _create_dev_ticket(task_spec, context),
        "assigned_to": "human_review"
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

- [PyCharm Documentation](<https://www.jetbrains.com/help/pycharm/>)
- [VS Code Documentation](<https://code.visualstudio.com/docs>)
- [Django Web Framework Docs](<https://docs.djangoproject.com/>)
- [Flask Quickstart (Pallets Projects)](<https://flask.palletsprojects.com/en/latest/quickstart/>)
- [Node.js Documentation](<https://nodejs.org/en/docs/>)

## Related Skills

| Skill | Purpose |
|