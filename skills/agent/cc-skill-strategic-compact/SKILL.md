---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent cc skill strategic compact with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: cc-skill-strategic-compact, cc skill strategic compact, how do i cc-skill-strategic-compact,
    orchestrate cc-skill-strategic-compact, automate cc-skill-strategic-compact, agent
    cc-skill-strategic-compact
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
name: cc-skill-strategic-compact
------
# Cc Skill Strategic Compact

Orchestrates intelligent skill selection and execution for cc skill strategic compact workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_strategic_compact(
    task_context: Dict[str, Any],
    available_compacts: List[Dict[str, Any]],
    min_confidence: float = 0.75
) -> Optional[Dict[str, Any]]:
    """Evaluate available skill compacts against the current task context.
    
    Implements Law 2 (Make Illegal States Unrepresentable) by validating
    compact schemas before scoring. Uses multi-factor scoring to determine
    the optimal strategic compact for the request.
    """
    if not task_context.get("intent") or not available_compacts:
        raise ValueError("Task intent and available compacts are required")
        
    task_features = _extract_intent_features(task_context["intent"])
    best_compact = None
    best_score = 0.0
    
    for compact in available_compacts:
        # Law 1: Early exit for disabled/deprecated compacts
        if compact.get("status") in ("disabled", "deprecated"):
            continue
            
        match_score = _calculate_text_similarity(task_features, compact.get("triggers", []))
        history_score = compact.get("historical_success_rate", 0.0)
        availability_score = 1.0 if compact.get("health") == "healthy" else 0.5
        
        composite_score = (match_score * 0.5) + (history_score * 0.3) + (availability_score * 0.2)
        
        if composite_score > best_score and composite_score >= min_confidence:
            best_score = composite_score
            best_compact = compact
            
    if best_compact is None:
        return None
        
    # Law 3: Atomic Predictability - return fresh dict
    return {
        "compact_id": best_compact["id"],
        "confidence": best_score,
        "selected_at": time.time(),
        "fallback_chain": best_compact.get("fallbacks", [])
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_compact_with_fallback(
    compact_config: Dict[str, Any],
    execution_context: Dict[str, Any],
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute a strategic compact with built-in resilience patterns.
    
    Follows Law 4 (Fail Fast, Fail Loud) by immediately halting on
    invalid state errors and routing transient failures through the
    configured fallback chain.
    """
    if not compact_config.get("steps"):
        raise CompactExecutionError("Compact must define at least one execution step")
        
    validated_context = _validate_compact_inputs(execution_context, compact_config)
    attempt = 0
    
    while attempt <= max_retries:
        try:
            result = _run_compact_steps(compact_config["steps"], validated_context)
            return {
                "status": "success",
                "compact_id": compact_config["id"],
                "output": result,
                "attempts": attempt + 1,
                "latency_ms": time.time() * 1000
            }
        except InvalidStateError as e:
            # Law 4: Fail immediately on invalid state
            raise CompactExecutionError(f"Invalid state in compact {compact_config['id']}: {e}") from e
        except TransientError as e:
            attempt += 1
            if attempt > max_retries:
                return _apply_compact_fallback(compact_config, validated_context)
                
    # Fallback exhausted
    return {
        "status": "fallback_triggered",
        "compact_id": compact_config["id"],
        "fallback_result": _route_to_human_operator(compact_config, validated_context)
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

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Strategic Management Theory (Porter's Five Forces)](<https://en.wikipedia.org/wiki/Five_Forces_Analysis>)
- [Business Model Canvas (Strategyzer)](<https://www.strategyzer.com/canvas/business-model-canvas>)
- [OKR Framework Guide (Google)](<https://www.atlassian.com/agile/project-management/okrs>)
- [Decision Matrix Methods](<https://en.wikipedia.org/wiki/Multi-criteria_decision_analysis>)
- [SWOT Analysis in Strategic Planning](<https://hbr.org/1985/07/how-to-assess-your-company-strengths-and-weaknesses>)

## Related Skills

| Skill | Purpose |
|