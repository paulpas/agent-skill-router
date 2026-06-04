---
name: closed-loop-delivery
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent closed loop delivery with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: closed-loop-delivery, closed loop delivery, how do i closed-loop-delivery,
    orchestrate closed-loop-delivery, automate closed-loop-delivery, agent closed-loop-delivery
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
# Closed Loop Delivery

Orchestrates intelligent skill selection and execution for closed loop delivery workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def score_and_select_skill(task: str, skill_registry: list[dict], history_db: dict) -> dict | None:
    """Closed-loop skill selection using multi-factor scoring and historical feedback.
    
    Implements Law 1 (Early Exit) and Law 2 (Make Illegal States Unrepresentable).
    Returns immutable selection metadata without mutating the registry.
    """
    if not task or not task.strip():
        raise ValueError("Task description cannot be empty")
    if not skill_registry:
        raise ValueError("No skills available in registry")

    task_vector = _embed_task(task)
    candidates = []
    
    for skill in skill_registry:
        if skill.get("status") != "active":
            continue
        text_sim = cosine_similarity(task_vector, _embed_skill(skill["triggers"]))
        hist_success = history_db.get(skill["id"], {}).get("success_rate", 0.5)
        availability = 1.0 if skill.get("health") == "healthy" else 0.3
        
        weighted_score = (text_sim * 0.5) + (hist_success * 0.3) + (availability * 0.2)
        candidates.append({"skill": skill, "score": weighted_score})

    candidates.sort(key=lambda x: x["score"], reverse=True)
    if not candidates or candidates[0]["score"] < 0.65:
        return None

    selected = candidates[0]
    # Law 3: Atomic Predictability - Return new dict, never mutate registry
    return {
        "skill_id": selected["skill"]["id"],
        "confidence": round(selected["score"], 3),
        "factors": {"text_sim": round(text_sim, 3), "history": hist_success, "avail": availability},
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_closed_loop(skill_meta: dict, context: dict, fallback_graph: dict) -> dict:
    """Execute skill with adaptive fallback and confidence feedback loop.
    
    Implements Law 4 (Fail Fast, Fail Loud) and Law 3 (Immutable Returns).
    Routes through fallback chain only on transient errors, never patches invalid state.
    """
    if not _validate_context(context, skill_meta):
        raise ValueError("Context validation failed - illegal state detected")

    attempts = 0
    max_attempts = 2
    while attempts <= max_attempts:
        try:
            result = _invoke_skill(skill_meta["id"], context)
            # Success path: update confidence and log
            _update_confidence_score(skill_meta["id"], success=True)
            return {"status": "success", "data": result, "attempts": attempts + 1}
        except TransientError as e:
            attempts += 1
            if attempts > max_attempts:
                break
            context = _adjust_context_for_retry(context, e)
        except CriticalError as e:
            # Law 4: Fail fast on invalid state - do not retry
            _update_confidence_score(skill_meta["id"], success=False)
            raise

    # Fallback chain execution
    fallback_candidates = fallback_graph.get(skill_meta["id"], [])
    for fallback_skill in fallback_candidates:
        try:
            result = _invoke_skill(fallback_skill["id"], context)
            _update_confidence_score(fallback_skill["id"], success=True)
            return {"status": "fallback_success", "original": skill_meta["id"], "data": result}
        except Exception:
            continue

    # Exhausted all options - defer to human or return structured error
    _update_confidence_score(skill_meta["id"], success=False)
    return {"status": "failed", "error": "All execution paths exhausted", "requires_human": True}
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
| `acceptance-orchestrator` | Acceptance criteria and delivery validation |

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

- [Closed Loop Delivery — Martin Fowler (Bliki)](https://martinfowler.com/bliki/ClosedLoopDelivery.html)
- [Continuous Delivery Pipeline (Martin Fowler)](https://martinfowler.com/bliki/ContinuousDelivery.html)
- [Google DevOps Research — DORA Metrics](https://www.atlassian.com/devops/frameworks/dora-metrics)
- [AWS — Continuous Integration & Delivery Patterns](https://docs.aws.amazon.com/prescriptive-guidance/latest/ci-cd-patterns/welcome.html)
- [The DevOps Handbook, 2nd Ed. (Gene Kim et al.) — Chapter 4](https://itrevolution.com/the-devops-handbook-2nd-edition/)