---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent skill sentinel with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: skill-sentinel, skill sentinel, how do i skill-sentinel, orchestrate skill-sentinel,
    automate skill-sentinel, agent skill-sentinel
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
name: skill-sentinel
------
# Skill Sentinel

Orchestrates intelligent skill selection and execution for skill sentinel workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_skill_candidates(
    task_intent: str,
    skill_registry: List[Dict],
    historical_metrics: Dict[str, float],
    system_health: Dict[str, bool]
) -> Optional[Dict]:
    """Score and rank skills based on intent matching, historical success, and system health.
    
    Implements Law 2 (Parse at boundary) by validating inputs upfront.
    Implements Law 3 (Atomic Predictability) by returning a fresh scored candidate dict.
    """
    if not task_intent or not skill_registry:
        raise ValueError("Task intent and skill registry must be non-empty")
        
    scored_candidates = []
    for skill in skill_registry:
        # Calculate multi-factor score
        intent_match = _compute_semantic_similarity(task_intent, skill.get("triggers", []))
        historical_success = historical_metrics.get(skill["id"], 0.5)
        availability = 1.0 if system_health.get(skill["id"], False) else 0.0
        
        # Weighted scoring formula
        composite_score = (0.4 * intent_match) + (0.4 * historical_success) + (0.2 * availability)
        
        if composite_score >= 0.7:
            scored_candidates.append({
                "skill_id": skill["id"],
                "name": skill["name"],
                "composite_score": round(composite_score, 3),
                "factors": {"intent": intent_match, "history": historical_success, "health": availability}
            })
            
    if not scored_candidates:
        return None
        
    # Return highest scoring candidate without mutating registry
    return max(scored_candidates, key=lambda x: x["composite_score"])
```


### Pattern 2: Execution with Fallback

```python
def execute_with_adaptive_fallback(
    selected_skill: Dict,
    execution_context: Dict,
    fallback_registry: List[Dict],
    confidence_store: Dict[str, float]
) -> Dict:
    """Execute skill with a structured fallback chain and dynamic confidence updates.
    
    Implements Law 4 (Fail Fast, Fail Loud) by raising on invalid states.
    Implements Law 1 (Early Exit) for guard clauses.
    """
    if not selected_skill or not execution_context.get("inputs"):
        raise SkillOrchestrationError("Missing required skill or execution inputs")
        
    fallback_steps = [
        {"type": "retry", "params": {"backoff": "exponential"}},
        {"type": "alternative_skill", "candidates": fallback_registry},
        {"type": "human_escalation", "priority": "high"}
    ]
    
    for step_idx, fallback_step in enumerate(fallback_steps):
        try:
            if fallback_step["type"] == "retry":
                result = _run_skill_with_backoff(selected_skill, execution_context)
            elif fallback_step["type"] == "alternative_skill":
                result = _try_alternative_skills(fallback_step["candidates"], execution_context)
            else:
                result = _escalate_to_human(selected_skill, execution_context)
                
            # Update confidence based on execution outcome
            new_confidence = _calculate_execution_confidence(result)
            confidence_store[selected_skill["id"]] = new_confidence
            
            return {
                "status": "success",
                "skill_id": selected_skill["id"],
                "fallback_level": step_idx,
                "confidence": new_confidence,
                "result": result
            }
            
        except InvalidStateError as e:
            raise SkillOrchestrationError(f"Invalid state at fallback step {step_idx}: {e}") from e
        except TransientFailure as e:
            if step_idx == len(fallback_steps) - 1:
                raise SkillOrchestrationError(f"All fallbacks exhausted for {selected_skill['id']}") from e
                
    return {"status": "failed", "skill_id": selected_skill["id"], "fallback_level": len(fallback_steps)}
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
| `skill-scanner` | Scans for skill issues; sentinel monitors runtime behavior and enforces quality gates |
| `security-audit` | Security-focused sentinel patterns that complement general skill quality monitoring |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [SentinelOne Endpoint Protection Documentation](https://support.sentinelone.com/hc/en-us) — Enterprise security sentinel platform documentation (conceptual reference for sentinel architecture patterns)
- [Open Policy Agent (OPA)](https://www.openpolicyagent.org/docs/) — OPA documentation for policy enforcement and runtime guardrails in distributed systems
- [Kubernetes Admission Controllers](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/admission-control-controllers/) — Kubernetes admission controller patterns for runtime enforcement of policies
- [AWS GuardDuty Threat Detection](https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html) — AWS documentation on threat detection and anomaly monitoring as sentinel patterns
- [Falco Runtime Security Monitoring](https://falco.org/docs/) — Sysdig Falco documentation for runtime security monitoring and anomaly detection in containers