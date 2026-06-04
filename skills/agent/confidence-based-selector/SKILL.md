---
name: confidence-based-selector
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent confidence based selector with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: confidence-based-selector, confidence based selector, how do i confidence-based-selector,
    orchestrate confidence-based-selector, automate confidence-based-selector, agent
    confidence-based-selector
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
# Confidence Based Selector

Orchestrates intelligent skill selection and execution for confidence based selector workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_skill_confidence(
    task_embedding: List[float],
    skill_registry: List[Dict],
    historical_db: Dict[str, float],
    min_confidence: float = 0.75
) -> Optional[Dict]:
    """Evaluate skills using multi-factor confidence scoring.
    
    Applies Law 2 (Parse at boundary) by validating embeddings and registry.
    Uses Law 3 (Atomic Predictability) by returning fresh score dicts.
    """
    if not task_embedding or len(task_embedding) != 768:
        raise ValueError("Invalid task embedding dimensions")
    if not skill_registry:
        return None

    scored_candidates = []
    for skill in skill_registry:
        # Law 1: Early exit for disabled/deprecated skills
        if skill.get("status") in ("disabled", "deprecated"):
            continue
            
        # Multi-factor scoring: Cosine similarity + historical win rate + availability
        text_match = cosine_similarity(task_embedding, skill["trigger_embedding"])
        history_score = historical_db.get(skill["id"], 0.5)
        availability_score = 1.0 if skill.get("health") == "healthy" else 0.3
        
        # Weighted confidence calculation
        confidence = (0.5 * text_match) + (0.3 * history_score) + (0.2 * availability_score)
        
        if confidence >= min_confidence:
            scored_candidates.append({
                "skill_id": skill["id"],
                "confidence": round(confidence, 4),
                "breakdown": {"text": text_match, "history": history_score, "avail": availability_score}
            })
    
    # Law 3: Return new structure, sorted by confidence
    scored_candidates.sort(key=lambda x: x["confidence"], reverse=True)
    return scored_candidates[0] if scored_candidates else None
```


### Pattern 2: Execution with Fallback

```python
def execute_with_adaptive_fallback(
    selected_skill: Dict,
    task_context: Dict,
    fallback_registry: List[Dict],
    max_retries: int = 2
) -> Dict:
    """Execute skill with confidence-aware fallback chain.
    
    Implements Law 4 (Fail Fast/Loud) by halting on invalid states.
    Applies Law 1 (Early Exit) for retry exhaustion.
    """
    if not selected_skill or "skill_id" not in selected_skill:
        raise ValueError("Missing required skill metadata")
        
    execution_log = []
    current_skill = selected_skill
    
    for attempt in range(max_retries + 1):
        try:
            # Validate context against skill requirements (Law 2)
            validated_inputs = _validate_inputs_for_skill(task_context, current_skill["requirements"])
            result = _invoke_skill_api(current_skill["endpoint"], validated_inputs)
            
            # Update historical performance for learning (Law 3)
            _update_confidence_score(current_skill["skill_id"], success=True)
            
            return {
                "status": "success",
                "skill_used": current_skill["skill_id"],
                "result": result,
                "attempts": attempt + 1,
                "confidence_updated": True
            }
            
        except InvalidStateError as e:
            _update_confidence_score(current_skill["skill_id"], success=False)
            raise SkillExecutionError(f"Invalid state for {current_skill['skill_id']}: {e}") from e
            
        except TransientError as e:
            execution_log.append({"attempt": attempt, "error": str(e)})
            if attempt == max_retries:
                break
                
            # Law 1: Early exit if no fallbacks available
            if not fallback_registry:
                raise SkillExecutionError("Exhausted retries with no fallbacks available")
                
            # Select next fallback based on historical reliability
            current_skill = _pick_next_fallback(fallback_registry, current_skill["skill_id"])
            
    # Law 4: Fail loud with full audit trail
    raise SkillExecutionError(
        f"Execution failed after {max_retries + 1} attempts. "
        f"Log: {execution_log}"
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
|---|---|
| `behavioral-modes` | Behavioral specialization for agent routing decisions |

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

- [Agent Selection via Confidence Estimation (arXiv:2308.11432)](https://arxiv.org/abs/2308.11432)
- [LLM Self-Confidence & Calibration Survey](https://arxiv.org/abs/2209.07523)
- [LangChain — Agent Selection Patterns](https://python.langchain.com/docs/modules/agents/)
- [Uncertainty Quantification in Large Language Models (Nature)](https://www.nature.com/articles/s42256-024-00839-2)
- [Mixture of Agents: Confidence-Based Routing (OpenAI Research)](https://openai.com/research/mixture-of-agents)