---
name: plan-writing
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent plan writing with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: plan-writing, plan writing, how do i plan-writing, orchestrate plan-writing,
    automate plan-writing, agent plan-writing
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
# Plan Writing

Orchestrates intelligent skill selection and execution for plan writing workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_plan_writing_skills(
    plan_request: Dict[str, Any],
    available_plan_skills: List[Dict],
    min_confidence: float = 0.75
) -> List[Dict]:
    """Select optimal skills for plan writing based on request structure.
    
    Evaluates skills against plan requirements:
    - Phase matching (research, drafting, validation)
    - Domain expertise alignment
    - Historical plan completion rates
    
    Args:
        plan_request: Structured plan request with phases, constraints, and context
        available_plan_skills: List of plan-writing skill metadata
        min_confidence: Minimum confidence threshold for skill inclusion
        
    Returns:
        Ordered list of selected skills with phase assignments and confidence scores
    """
    if not plan_request.get("phases"):
        raise ValueError("Plan request must define at least one phase")
        
    selected_skills = []
    phase_requirements = _parse_phase_requirements(plan_request)
    
    for skill in available_plan_skills:
        phase_match = _calculate_phase_alignment(skill, phase_requirements)
        domain_match = _calculate_domain_alignment(skill, plan_request.get("domain"))
        history_score = skill.get("plan_completion_rate", 0.0)
        
        composite_score = (phase_match * 0.5) + (domain_match * 0.3) + (history_score * 0.2)
        
        if composite_score >= min_confidence:
            selected_skills.append({
                "skill_id": skill["id"],
                "assigned_phase": _map_skill_to_phase(skill, phase_requirements),
                "confidence": round(composite_score, 3),
                "fallback_candidates": skill.get("fallback_chain", [])
            })
            
    return sorted(selected_skills, key=lambda x: x["confidence"], reverse=True)
```


### Pattern 2: Execution with Fallback

```python
def execute_plan_phase_with_fallback(
    phase_config: Dict[str, Any],
    selected_skill: Dict[str, Any],
    plan_context: Dict[str, Any],
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute a specific plan writing phase with structured fallback handling.
    
    Implements phase-aware execution:
    - Validates phase prerequisites before execution
    - Applies fallback chain: retry -> alternative phase -> manual review
    - Maintains plan integrity across phase transitions
    
    Args:
        phase_config: Configuration for the current plan phase
        selected_skill: Skill metadata selected for this phase
        plan_context: Shared context carrying state across all phases
        max_retries: Maximum retry attempts for transient failures
        
    Returns:
        Phase execution result with updated plan state and metadata
    """
    if not _validate_phase_prerequisites(phase_config, plan_context):
        raise PlanValidationError(f"Phase {phase_config['id']} prerequisites not met")
        
    phase_artifact = None
    for attempt in range(max_retries + 1):
        try:
            phase_artifact = _run_phase_execution(selected_skill, phase_config, plan_context)
            
            return {
                "phase_id": phase_config["id"],
                "status": "completed",
                "artifact": phase_artifact,
                "attempts": attempt + 1,
                "updated_context": _merge_phase_output(plan_context, phase_artifact)
            }
            
        except PhaseDependencyError as e:
            raise PlanValidationError(f"Phase {phase_config['id']} failed dependency check: {e}") from e
            
        except TransientExecutionError as e:
            if attempt == max_retries:
                return _trigger_phase_fallback(phase_config, selected_skill, plan_context)
                
    return _escalate_to_manual_review(phase_config, plan_context)
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
| `planning-with-files` | Creates structured plan files for complex tasks, complementing this workflow framework |
| `task-decomposition-engine` | Breaks down complex plans into actionable sub-tasks stored as file artifacts |

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

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [RFC (Request for Comments) Process Documentation](https://en.wikipedia.org/wiki/Request_for_Comments) — Wikipedia overview of RFC-based planning and documentation processes
- [ADR (Architecture Decision Records) Pattern](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) — Martin Fowler's guide to documenting architectural decisions as structured plans
- [Writing Effective Technical Plans (Stripe Engineering Blog)](https://stripe.com/en-ca/resources/engineering/writing-guidelines) — Best practices for writing clear, actionable technical design documents
- [Microsoft RFC Template](https://github.com/microsoft/Security-RFCs) — Example of a standardized RFC format for engineering planning documents
- [Design Doc Template (Google)](https://docs.google.com/document/d/1) — Google's design document template adapted for engineering project planning