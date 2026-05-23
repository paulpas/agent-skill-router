---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent cc skill backend patterns with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: cc-skill-backend-patterns, cc skill backend patterns, how do i cc-skill-backend-patterns,
    orchestrate cc-skill-backend-patterns, automate cc-skill-backend-patterns, agent
    cc-skill-backend-patterns
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
name: cc-skill-backend-patterns
------
# Cc Skill Backend Patterns

Orchestrates intelligent skill selection and execution for cc skill backend patterns workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def score_and_select_backend_skill(
    task_context: Dict[str, Any],
    skill_registry: List[SkillMetadata],
    min_confidence: float = 0.75
) -> Optional[SkillExecutionPlan]:
    """Select optimal backend skill using multi-factor scoring aligned with Elegant Defense.
    
    Applies Law 1 (Early Exit) for invalid contexts.
    Applies Law 2 (Immutable State) by returning fresh plan objects.
    """
    if not task_context.get("intent") or not skill_registry:
        raise ValueError("Missing intent or empty skill registry")
        
    parsed_intent = _normalize_intent(task_context["intent"])
    best_plan = None
    best_score = 0.0
    
    for skill in skill_registry:
        if not _is_skill_available(skill):
            continue
            
        text_match = _cosine_similarity(parsed_intent, skill.triggers)
        history_score = skill.success_rate * 0.4
        availability_score = _calculate_load_penalty(skill.current_load)
        
        composite_score = (text_match * 0.5) + history_score + availability_score
        
        if composite_score > best_score and composite_score >= min_confidence:
            best_score = composite_score
            best_plan = SkillExecutionPlan(
                skill_id=skill.id,
                confidence=composite_score,
                parameters=_prepare_execution_params(task_context, skill)
            )
            
    if best_plan is None:
        return None
        
    return best_plan
```


### Pattern 2: Execution with Fallback

```python
def execute_with_elegant_defense_fallback(
    plan: SkillExecutionPlan,
    execution_context: Dict[str, Any],
    fallback_chain: List[SkillId]
) -> ExecutionResult:
    """Execute skill with structured fallback chain per Law 4 (Fail Fast/Loud).
    
    Implements retry -> alternative skill -> human escalation.
    Returns immutable ExecutionResult with full audit metadata.
    """
    attempt = 0
    max_retries = 2
    
    while attempt <= max_retries:
        try:
            raw_result = await _invoke_backend_skill(plan.skill_id, execution_context)
            validated = _validate_output_schema(raw_result, plan.skill_id)
            return ExecutionResult(
                success=True,
                skill_id=plan.skill_id,
                data=validated,
                confidence=plan.confidence,
                attempts=attempt + 1,
                latency_ms=_measure_latency()
            )
        except SchemaValidationError as e:
            raise ExecutionError(f"Invalid output from {plan.skill_id}: {e}") from e
        except TransientBackendError as e:
            attempt += 1
            if attempt > max_retries:
                break
            await _backoff_delay(attempt)
            
    # Fallback chain execution
    for alt_skill_id in fallback_chain:
        try:
            alt_result = await _invoke_backend_skill(alt_skill_id, execution_context)
            return ExecutionResult(
                success=True,
                skill_id=alt_skill_id,
                data=alt_result,
                confidence=0.6,
                attempts=attempt + 1,
                latency_ms=_measure_latency(),
                fallback_triggered=True
            )
        except Exception as e:
            continue
            
    return ExecutionResult(
        success=False,
        skill_id=plan.skill_id,
        error="Fallback chain exhausted",
        confidence=0.0,
        attempts=attempt + 1,
        latency_ms=_measure_latency(),
        requires_human_review=True
    )
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