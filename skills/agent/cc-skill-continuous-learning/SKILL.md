---
name: cc-skill-continuous-learning
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent cc skill continuous learning with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: cc-skill-continuous-learning, cc skill continuous learning, how do i cc-skill-continuous-learning,
    orchestrate cc-skill-continuous-learning, automate cc-skill-continuous-learning,
    agent cc-skill-continuous-learning
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
# Cc Skill Continuous Learning

Orchestrates intelligent skill selection and execution for cc skill continuous learning workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def update_skill_learning_metrics(
    skill_id: str,
    execution_outcome: Dict,
    learning_buffer: List[Dict],
    decay_factor: float = 0.95
) -> Dict:
    """Track execution outcomes and update continuous learning state.
    
    Implements Law 3 (Atomic Predictability) by returning new state dicts.
    Implements Law 4 (Fail Fast) by validating outcome structure immediately.
    """
    # Guard clause - validate outcome structure (Law 4)
    required_keys = {"success", "latency_ms", "confidence", "error_type"}
    if not required_keys.issubset(execution_outcome.keys()):
        raise ValueError(f"Invalid execution outcome: missing {required_keys - set(execution_outcome.keys())}")
    
    # Parse input at boundary (Law 2)
    new_record = {
        "skill_id": skill_id,
        "timestamp": time.time(),
        "success": execution_outcome["success"],
        "latency_ms": execution_outcome["latency_ms"],
        "confidence": execution_outcome["confidence"],
        "error_type": execution_outcome.get("error_type", "none")
    }
    
    # Append to learning buffer immutably
    updated_buffer = learning_buffer + [new_record]
    
    # Calculate rolling confidence using exponential decay
    recent_records = [r for r in updated_buffer if time.time() - r["timestamp"] < 3600]
    if not recent_records:
        return {"buffer": updated_buffer, "rolling_confidence": 0.0, "trigger_retrain": False}
        
    success_rate = sum(1 for r in recent_records if r["success"]) / len(recent_records)
    avg_latency = sum(r["latency_ms"] for r in recent_records) / len(recent_records)
    rolling_confidence = success_rate * (1.0 - min(avg_latency / 5000.0, 0.5))
    
    # Determine if continuous learning trigger is met
    trigger_retrain = rolling_confidence < 0.6 or len(recent_records) >= 50
    
    return {
        "buffer": updated_buffer,
        "rolling_confidence": round(rolling_confidence, 3),
        "trigger_retrain": trigger_retrain,
        "recent_sample_size": len(recent_records)
    }
```


### Pattern 2: Execution with Fallback

```python
def orchestrate_learning_fallback(
    skill_state: Dict,
    learning_buffer: List[Dict],
    fallback_skills: List[str],
    human_review_threshold: float = 0.4
) -> Dict:
    """Orchestrate fallback chain based on continuous learning metrics.
    
    Applies Law 1 (Early Exit) and Law 4 (Fail Loud) for degraded skills.
    """
    # Early exit if skill is already in stable state
    if skill_state.get("status") == "stable" and skill_state.get("rolling_confidence", 1.0) > 0.85:
        return {"action": "continue", "next_skill": skill_state["id"], "reason": "stable_performance"}
        
    # Parse buffer immutably (Law 2)
    recent_failures = [r for r in learning_buffer if not r["success"] and time.time() - r["timestamp"] < 1800]
    
    # Fail fast if critical degradation detected
    if len(recent_failures) >= 3:
        return {
            "action": "escalate_to_human",
            "reason": "critical_degradation",
            "failure_count": len(recent_failures),
            "fallback_chain": fallback_skills
        }
        
    # Apply adaptive fallback chain
    if fallback_skills:
        next_candidate = fallback_skills[0]
        return {
            "action": "switch_fallback",
            "target_skill": next_candidate,
            "reason": "confidence_drop",
            "current_confidence": skill_state.get("rolling_confidence", 0.0)
        }
        
    # Default: log and defer with adjusted parameters
    return {
        "action": "retry_with_adjusted_params",
        "reason": "transient_error",
        "adjustments": {"timeout_multiplier": 1.5, "retry_backoff": "exponential"}
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

- [Continuous Learning in ML (Google Research)](<https://research.google/pubs/continuous-learning-a-survey/>)
- [Active Learning Survey Paper (arXiv)](<https://arxiv.org/abs/2302.13898>)
- [Reinforcement Learning Basics (Sutton & Barto)](<http://www.incompleteideas.net/book/the-book-2nd.html>)
- [Online Machine Learning Tutorial](<https://online-learning-course.github.io/>)
- [Model Drift Detection Methods](<https://arxiv.org/abs/1904.02652>)

## Related Skills

| Skill | Purpose |
|