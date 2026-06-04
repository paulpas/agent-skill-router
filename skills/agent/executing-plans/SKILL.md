---
name: executing-plans
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent executing plans with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: executing-plans, executing plans, how do i executing-plans, orchestrate
    executing-plans, automate executing-plans, agent executing-plans
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
# Executing Plans

Orchestrates intelligent skill selection and execution for executing plans workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def execute_plan_workflow(plan: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a structured plan with dependency resolution and step-level fallbacks.
    
    Implements the 5 Laws of Elegant Defense:
    - Law 1: Early exit on missing plan steps or invalid context
    - Law 2: Immutable state transitions - each step returns a new state dict
    - Law 3: Atomic step execution - partial failures don't corrupt global state
    - Law 4: Fail fast on invalid step configurations
    - Law 5: Graceful degradation via configured fallback steps
    """
    if not plan.get("steps") or not context.get("user_id"):
        raise PlanValidationError("Plan requires 'steps' and context requires 'user_id'")
    
    execution_state = {
        "plan_id": plan["id"],
        "status": "running",
        "steps_completed": [],
        "step_results": {},
        "confidence_score": 0.0,
        "timestamp": time.time()
    }
    
    for step in plan["steps"]:
        step_id = step["id"]
        if step_id in execution_state["steps_completed"]:
            continue
            
        try:
            # Resolve step dependencies
            if not _dependencies_met(step, execution_state["step_results"]):
                raise DependencyError(f"Unmet dependencies for step {step_id}")
                
            # Execute step with domain-specific handler
            result = _dispatch_step_handler(step, context, execution_state)
            
            # Atomic state update (Law 3)
            execution_state["step_results"][step_id] = result
            execution_state["steps_completed"].append(step_id)
            execution_state["confidence_score"] = _update_confidence(
                execution_state["confidence_score"], result.get("success", False)
            )
            
        except DependencyError as e:
            # Fallback: skip non-critical steps or route to manual review
            if step.get("critical", False):
                raise PlanExecutionError(f"Critical step {step_id} failed dependency check") from e
            execution_state["step_results"][step_id] = {"status": "skipped", "reason": str(e)}
            
    execution_state["status"] = "completed"
    return execution_state
```


### Pattern 2: Execution with Fallback

```python
def resolve_step_fallback_chain(step: Dict[str, Any], failure_context: Dict[str, Any], history: List[Dict]) -> Dict[str, Any]:
    """Determine and execute fallback strategy for a failed plan step.
    
    Uses historical performance and step metadata to select the most resilient
    fallback path, adhering to the Fail Fast, Fail Loud principle.
    """
    step_id = step["id"]
    error_type = failure_context.get("error_type", "unknown")
    historical_success = _get_step_history_rate(step_id, history)
    
    # Law 1: Early exit if no fallbacks configured
    fallbacks = step.get("fallbacks", [])
    if not fallbacks:
        return {"status": "failed", "step_id": step_id, "error": "No fallback configured"}
    
    # Law 2: Immutable fallback selection
    selected_fallback = None
    for fb in fallbacks:
        if fb.get("error_pattern") and re.match(fb["error_pattern"], error_type):
            selected_fallback = fb
            break
    
    if not selected_fallback:
        selected_fallback = fallbacks[0] # Default fallback
        
    # Law 4: Fail loud if fallback also fails after retries
    max_retries = selected_fallback.get("max_retries", 2)
    for attempt in range(max_retries):
        try:
            result = _execute_fallback_step(selected_fallback, failure_context)
            return {
                "status": "fallback_success",
                "step_id": step_id,
                "fallback_used": selected_fallback["id"],
                "attempt": attempt + 1,
                "result": result
            }
        except TransientError:
            continue
            
    # All fallbacks exhausted
    return {
        "status": "fallback_exhausted",
        "step_id": step_id,
        "error": f"All {len(fallbacks)} fallback strategies failed for step {step_id}"
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
- [Project Management Body of Knowledge (PMBOK)](<https://www.pmi.org/pmbok-guide-standards>)
- [Agile Project Management (Scrum Guide)](<https://scrumguides.org/scrum-guide.html>)
- [OKR Planning Framework](<https://www.atlassian.com/agile/project-management/okrs>)
- [WBS Work Breakdown Structure](<https://en.wikipedia.org/wiki/Work_breakdown_structure>)
- [Critical Path Method (CPM)](<https://en.wikipedia.org/wiki/Critical_path_method>)
