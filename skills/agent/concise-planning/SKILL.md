---
name: concise-planning
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent concise planning with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: concise-planning, concise planning, how do i concise-planning, orchestrate
    concise-planning, automate concise-planning, agent concise-planning
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
# Concise Planning

Orchestrates intelligent skill selection and execution for concise planning workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_planning_strategy(
    task_request: Dict[str, Any],
    available_planners: List[Dict[str, Any]],
    complexity_threshold: float = 0.8
) -> Optional[Dict[str, Any]]:
    """Select optimal planning strategy based on task constraints and historical performance.
    
    Implements Law 1 (Early Exit) and Law 2 (Make Illegal States Unrepresentable):
    - Validates task structure before scoring
    - Filters out deprecated or incompatible planners
    """
    if not task_request.get("objective") or not task_request.get("constraints"):
        raise ValueError("Planning request requires 'objective' and 'constraints'")
        
    parsed_constraints = _normalize_constraints(task_request["constraints"])
    task_complexity = _estimate_complexity(task_request["objective"], parsed_constraints)
    
    best_strategy = None
    best_score = 0.0
    
    for planner in available_planners:
        if planner.get("status") != "active":
            continue
            
        match_score = _calculate_domain_match(task_request["objective"], planner["triggers"])
        history_score = planner.get("success_rate", 0.0) * 0.4
        complexity_fit = 1.0 - abs(task_complexity - planner.get("optimal_complexity", 0.5))
        
        total_score = (match_score * 0.5) + history_score + (complexity_fit * 0.3)
        
        if total_score > best_score and total_score >= complexity_threshold:
            best_score = total_score
            best_strategy = planner
            
    if best_strategy is None:
        return None
        
    return {
        "strategy": best_strategy["name"],
        "confidence": best_score,
        "estimated_steps": best_strategy.get("default_steps", 3),
        "fallback_level": best_strategy.get("fallback_depth", 2)
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_planning_workflow(
    selected_strategy: Dict[str, Any],
    task_context: Dict[str, Any],
    max_fallback_depth: int = 2
) -> Dict[str, Any]:
    """Execute concise planning workflow with domain-specific fallback chains.
    
    Implements Law 4 (Fail Fast, Fail Loud) and Law 3 (Atomic Predictability):
    - Validates context before execution
    - Returns immutable plan structures
    - Applies structured fallbacks when planning constraints are violated
    """
    if not _validate_planning_context(task_context):
        raise PlanningValidationError("Missing required execution context")
        
    current_depth = 0
    plan_state = _initialize_plan_state(selected_strategy, task_context)
    
    while current_depth <= max_fallback_depth:
        try:
            plan_steps = _generate_steps(plan_state)
            validated_plan = _validate_plan_against_constraints(plan_steps, task_context["constraints"])
            
            return {
                "status": "success",
                "plan": validated_plan,
                "confidence": selected_strategy["confidence"],
                "depth_used": current_depth,
                "timestamp": time.time()
            }
            
        except ConstraintViolationError as e:
            if current_depth == max_fallback_depth:
                raise PlanningExecutionError(f"Plan failed after {max_fallback_depth} fallbacks: {e}") from e
            plan_state = _apply_fallback_adjustment(plan_state, e)
            current_depth += 1
            
        except ResourceExhaustionError:
            plan_state = _simplify_scope(plan_state)
            current_depth += 1
            
    return {
        "status": "deferred",
        "reason": "max_fallback_depth_exceeded",
        "pending_context": task_context
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

- [OKR Goal Setting Framework](<https://www.atlassian.com/agile/project-management/okrs>)
- [Agile Estimation Techniques (Planning Poker)](<https://www.agilenutshell.com/planningpoker>)
- [Gantt Chart Methodology (PMI)](<https://www.pmi.org/learning/library/gantt-chart-techniques-project-schedule-5913>)
- [WBS (Work Breakdown Structure) Guide](<https://www.projectsmart.co.uk/work-breakdown-structure.php>)
- [Critical Path Method (CPM)](<https://en.wikipedia.org/wiki/Critical_path_method>)

## Related Skills

| Skill | Purpose |
|