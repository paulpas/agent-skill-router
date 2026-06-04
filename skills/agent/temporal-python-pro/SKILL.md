---




name: temporal-python-pro
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent temporal python pro with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: temporal-python-pro, temporal python pro, how do i temporal-python-pro,
    orchestrate temporal-python-pro, automate temporal-python-pro, agent temporal-python-pro
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




# Temporal Python Pro

Orchestrates intelligent skill selection and execution for temporal python pro workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_temporal_task(
    task_payload: Dict[str, Any],
    skill_registry: List[Dict[str, Any]],
    confidence_threshold: float = 0.75
) -> Dict[str, Any]:
    """Route a temporal workflow task to the optimal agent skill.
    
    Implements multi-factor scoring: lexical match, historical success rate,
    current system load, and dependency health. Enforces Law 2 (Parse at boundary)
    and Law 1 (Early exit on invalid state).
    """
    if not task_payload.get("intent") or not task_payload.get("temporal_constraints"):
        raise ValueError("Missing required temporal intent or constraints")
        
    intent = task_payload["intent"].lower()
    constraints = task_payload["temporal_constraints"]
    
    scored_candidates = []
    for skill in skill_registry:
        if not skill.get("active"):
            continue
            
        # Factor 1: Lexical/Intent Match
        intent_match = _calculate_semantic_similarity(intent, skill["triggers"])
        
        # Factor 2: Historical Performance
        history_score = skill.get("success_rate", 0.0)
        
        # Factor 3: System Availability & Load
        availability = 1.0 - (skill.get("current_load", 0.0) / 100.0)
        
        # Factor 4: Dependency Health
        deps_healthy = all(
            _check_dependency_health(dep) for dep in skill.get("dependencies", [])
        )
        if not deps_healthy:
            continue
            
        # Weighted Multi-Factor Score
        raw_score = (
            0.4 * intent_match +
            0.3 * history_score +
            0.2 * availability +
            0.1 * (1.0 if deps_healthy else 0.0)
        )
        
        if raw_score >= confidence_threshold:
            scored_candidates.append({
                "skill": skill,
                "score": raw_score,
                "factors": {
                    "intent": intent_match,
                    "history": history_score,
                    "availability": availability
                }
            })
            
    if not scored_candidates:
        return {"status": "no_match", "fallback_required": True}
        
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)
    best = scored_candidates[0]
    
    # Law 3: Return new structure, never mutate registry
    return {
        "status": "selected",
        "skill_id": best["skill"]["id"],
        "confidence": best["score"],
        "routing_metadata": best["factors"],
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_with_temporal_fallback(
    selected_skill: Dict[str, Any],
    task_context: Dict[str, Any],
    fallback_chain: List[Dict[str, Any]],
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute an agent skill with a domain-specific fallback chain.
    
    Enforces Law 4 (Fail Fast/Loud) and Law 1 (Early Exit).
    Implements retry -> alternative skill -> human escalation.
    """
    if not selected_skill or not task_context.get("task_id"):
        raise ValueError("Missing skill metadata or task context")
        
    skill_id = selected_skill["skill_id"]
    context = copy.deepcopy(task_context) # Law 3: Immutable inputs
    
    for attempt in range(max_retries + 1):
        try:
            # Execute with temporal timeout enforcement
            result = _run_skill_with_timeout(
                skill_id, context, timeout_seconds=selected_skill.get("timeout", 30)
            )
            
            return {
                "status": "success",
                "skill_id": skill_id,
                "result": result,
                "attempts": attempt + 1,
                "latency_ms": time.time() * 1000
            }
            
        except TemporalTimeoutError:
            if attempt < max_retries:
                continue # Retry
            raise # Fail Loud on timeout
            
        except AgentExecutionError as e:
            if attempt < max_retries:
                continue # Retry with backoff
            
            # Fallback Chain Execution
            for fallback_skill in fallback_chain:
                try:
                    fallback_result = _run_skill_with_timeout(
                        fallback_skill["skill_id"], context, timeout_seconds=30
                    )
                    return {
                        "status": "fallback_success",
                        "original_skill": skill_id,
                        "fallback_skill": fallback_skill["skill_id"],
                        "result": fallback_result
                    }
                except Exception:
                    continue
                    
            # Final Fallback: Human Escalation
            return {
                "status": "escalated",
                "reason": "All automated fallbacks exhausted",
                "task_context": context,
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
|---|---|
| `temporal-golang-pro` | Go equivalent of the Temporal workflow patterns covered in this Python-focused skill |
| `workflow-patterns` | General workflow orchestration patterns that complement Temporal-specific implementations |

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

- [Temporal.io Python SDK Documentation](https://docs.temporal.io/application-development/sdks#python-sdk) — Official Temporal documentation on building workflows with the Python SDK
- [Temporal Python Client Reference (GitHub)](https://github.com/temporalio/sdk-python) — Official Temporal Python SDK source code and examples
- [Python Async/Await Patterns](https://docs.python.org/3/library/asyncio.html) — Python's asyncio documentation, foundational for Temporal Python worker implementation
- [Durable Execution with Temporal (Temporal Blog)](https://temporal.io/blog) — Temporal's blog on durable execution patterns, retries, and fault tolerance in Python
- [Python Type Hints for Workflow Definitions](https://docs.python.org/3/library/typing.html) — Python typing module documentation for strongly-typed Temporal workflow signatures