---




name: acceptance-orchestrator
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent acceptance orchestrator with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: acceptance-orchestrator, acceptance orchestrator, how do i acceptance-orchestrator,
    orchestrate acceptance-orchestrator, automate acceptance-orchestrator, agent acceptance-orchestrator
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




# Acceptance Orchestrator

Orchestrates intelligent skill selection and execution for acceptance orchestrator workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_and_select_skill(task_context: dict, skill_registry: list) -> dict:
    """Multi-factor scoring for acceptance orchestrator selection.
    
    Implements Law 2 (Make Illegal States Unrepresentable) by validating
    context boundaries before scoring. Returns immutable selection metadata.
    """
    if not task_context.get("intent"):
        raise ValueError("Missing intent in task context")
        
    scored_candidates = []
    for skill in skill_registry:
        semantic_score = _compute_semantic_similarity(task_context["intent"], skill["triggers"])
        history_score = skill.get("success_rate", 0.0)
        availability_score = 1.0 if _check_dependencies(skill["deps"]) else 0.0
        
        composite_score = (0.5 * semantic_score) + (0.3 * history_score) + (0.2 * availability_score)
        
        if composite_score >= 0.7:
            scored_candidates.append({
                "skill_id": skill["id"],
                "composite_score": round(composite_score, 3),
                "factors": {"semantic": semantic_score, "history": history_score, "availability": availability_score}
            })
    
    if not scored_candidates:
        return {"status": "no_match", "fallback_triggered": True}
        
    scored_candidates.sort(key=lambda x: x["composite_score"], reverse=True)
    selected = scored_candidates[0]
    
    _log_selection_audit(task_context["request_id"], selected)
    return {"status": "selected", "skill": selected}
```


### Pattern 2: Execution with Fallback

```python
def execute_with_resilience_chain(skill_config: dict, execution_context: dict) -> dict:
    """Orchestrates execution with a strict fallback chain and confidence tracking.
    
    Enforces Law 4 (Fail Fast, Fail Loud) by halting on acceptance violations.
    Implements Law 3 (Atomic Predictability) by returning new result structures.
    """
    max_retries = execution_context.get("max_retries", 2)
    current_attempt = 0
    
    while current_attempt <= max_retries:
        try:
            result = _invoke_skill_endpoint(skill_config["endpoint"], execution_context)
            
            if not _validate_acceptance_criteria(result, skill_config["acceptance_rules"]):
                raise AcceptanceValidationError("Result failed acceptance criteria")
                
            confidence = _calculate_execution_confidence(result["latency_ms"], current_attempt)
            _update_skill_confidence(skill_config["id"], confidence)
            
            return {
                "status": "success",
                "result": result,
                "confidence": confidence,
                "attempts": current_attempt + 1
            }
            
        except AcceptanceValidationError as e:
            _log_failure(skill_config["id"], "acceptance_violation", str(e))
            raise
            
        except TransientNetworkError as e:
            current_attempt += 1
            if current_attempt > max_retries:
                alt_skill = _resolve_fallback_skill(skill_config["related_skills"])
                if alt_skill:
                    skill_config = alt_skill
                    current_attempt = 0
                    continue
                else:
                    return _escalate_to_human(execution_context, skill_config["id"])
                    
        except Exception as e:
            _log_failure(skill_config["id"], "unexpected", str(e))
            raise OrchestratorExecutionError(f"Failed after {current_attempt} attempts") from e
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
| `closed-loop-delivery` | End-to-end delivery pipeline with feedback loops |

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

- [Practical Agile — Martin Fowler](https://martinfowler.com/articles/practicalAgile.html)
- [Acceptance Criteria Patterns (BDD/SpecByExample)](https://www.cucumber.io/bdd/)
- [Definition of Done — Scrum Guide 2020](https://scrumguides.org/scrum-guide.html)
- [Behavior-Driven Development with Gherkin Syntax](https://cucumber.io/docs/gherkin/reference/)
- [Acceptance Test-Driven Development (ATDD) Practices](https://www.agilealliance.org/glossary/atdd/)