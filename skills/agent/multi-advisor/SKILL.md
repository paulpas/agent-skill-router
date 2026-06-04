---
name: multi-advisor
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent multi advisor with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: multi-advisor, multi advisor, how do i multi-advisor, orchestrate multi-advisor,
    automate multi-advisor, agent multi-advisor
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
# Multi Advisor

Orchestrates intelligent skill selection and execution for multi advisor workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_to_best_advisor(
    task_context: Dict[str, Any],
    advisor_registry: List[Dict[str, Any]],
    min_confidence: float = 0.75
) -> Optional[Dict[str, Any]]:
    """Route a task to the most suitable advisor using multi-factor scoring.
    
    Implements Law 1 (Early Exit) and Law 2 (Parse at boundary):
    - Validates task context and registry upfront
    - Computes weighted scores without mutating inputs
    """
    if not task_context.get("intent") or not advisor_registry:
        raise ValueError("Task intent and advisor registry are required")
        
    task_features = _extract_intent_features(task_context["intent"])
    scored_advisors = []
    
    for advisor in advisor_registry:
        if not advisor.get("active"):
            continue
            
        similarity = _cosine_similarity(task_features, advisor["trigger_vectors"])
        historical_success = advisor.get("success_rate", 0.0)
        availability_score = 1.0 if advisor.get("health") == "healthy" else 0.3
        
        # Multi-factor weighted scoring
        composite_score = (
            0.4 * similarity +
            0.35 * historical_success +
            0.25 * availability_score
        )
        
        if composite_score >= min_confidence:
            scored_advisors.append({
                "advisor_id": advisor["id"],
                "name": advisor["name"],
                "confidence": round(composite_score, 3),
                "factors": {"similarity": similarity, "history": historical_success, "availability": availability_score}
            })
            
    if not scored_advisors:
        return None
        
    # Atomic Predictability (Law 3) - Return new sorted list
    scored_advisors.sort(key=lambda x: x["confidence"], reverse=True)
    return scored_advisors[0]
```


### Pattern 2: Execution with Fallback

```python
def execute_advisor_with_resilience(
    selected_advisor: Dict[str, Any],
    task_payload: Dict[str, Any],
    fallback_advisors: List[Dict[str, Any]],
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute the selected advisor with automatic fallback chaining.
    
    Implements Law 4 (Fail Fast/Loud) and fallback orchestration:
    - Validates payload before dispatch
    - Retries on transient failures, falls back to secondary advisors
    - Returns structured execution metadata
    """
    if not _validate_payload(task_payload, selected_advisor["schema"]):
        raise ExecutionError(f"Payload validation failed for {selected_advisor['name']}")
        
    execution_log = []
    current_advisor = selected_advisor
    
    for attempt in range(max_retries + 1):
        try:
            response = _dispatch_to_advisor(current_advisor, task_payload)
            
            # Success path - Atomic result construction
            return {
                "status": "success",
                "advisor_used": current_advisor["name"],
                "result": response["data"],
                "confidence": current_advisor["confidence"],
                "attempts": attempt + 1,
                "latency_ms": response["latency_ms"],
                "log": execution_log
            }
            
        except TransientNetworkError as e:
            execution_log.append(f"Attempt {attempt+1} failed: {str(e)}")
            if attempt == max_retries:
                break
            continue
            
        except AdvisorSpecificError as e:
            # Fail fast on invalid state - do not retry
            raise ExecutionError(f"Invalid state in {current_advisor['name']}: {e}") from e
            
    # Fallback chain execution
    for fallback in fallback_advisors:
        try:
            execution_log.append(f"Falling back to {fallback['name']}")
            response = _dispatch_to_advisor(fallback, task_payload)
            return {
                "status": "fallback_success",
                "advisor_used": fallback["name"],
                "result": response["data"],
                "confidence": fallback["confidence"],
                "attempts": max_retries + 1,
                "latency_ms": response["latency_ms"],
                "log": execution_log
            }
        except Exception as e:
            execution_log.append(f"Fallback {fallback['name']} failed: {str(e)}")
            
    raise ExecutionError(f"All advisors and fallbacks exhausted for task: {task_payload.get('id')}")
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
| `multi-agent-patterns` | Higher-level multi-agent orchestration and coordination patterns |
| `agent-evaluation` | Evaluating advisor quality and cross-advisor consensus |

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

- [What Is Multi-Agent — LangChain Blog](https://blog.langchain.dev/what-is-multi-agent/)
- [Building Effective Agents — Anthropic Research](https://www.anthropic.com/research/building-effective-agents)
- [Multi-Agent System Survey — arXiv (2402.16817)](https://arxiv.org/abs/2402.16817)
- [LLM Agent Survey — Lilian Weng](https://lilianweng.github.io/posts/2023-06-23-agent/)
- [Expert Ensembling for LLMs — arXiv Paper](https://arxiv.org/abs/2305.14798)