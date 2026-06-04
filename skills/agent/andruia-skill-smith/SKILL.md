---




name: andruia-skill-smith
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent andruia skill smith with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: andruia-skill-smith, andruia skill smith, how do i andruia-skill-smith,
    orchestrate andruia-skill-smith, automate andruia-skill-smith, agent andruia-skill-smith
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




# Andruia Skill Smith

Orchestrates intelligent skill selection and execution for andruia skill smith workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def orchestrate_andruia_skill_selection(
    user_intent: str,
    andruia_registry: List[Dict],
    confidence_threshold: float = 0.75
) -> Optional[Dict]:
    """Select optimal Andruia skill based on trigger matching and historical performance.
    
    Parses Andruia-specific intent patterns, validates skill metadata against
    the Andruia registry, and scores candidates using weighted multi-factor logic.
    """
    if not user_intent or not andruia_registry:
        raise ValueError("Intent and registry are required for Andruia skill selection")
        
    # Extract Andruia intent features and normalize triggers
    intent_features = _parse_andruia_intent(user_intent)
    scored_candidates = []
    
    for skill_meta in andruia_registry:
        if not _validate_andruia_metadata(skill_meta):
            continue
            
        trigger_match = _calculate_trigger_overlap(intent_features, skill_meta.get("triggers", []))
        historical_success = skill_meta.get("success_rate", 0.0)
        availability_score = 1.0 if skill_meta.get("status") == "active" else 0.0
        
        weighted_score = (trigger_match * 0.5) + (historical_success * 0.3) + (availability_score * 0.2)
        
        if weighted_score >= confidence_threshold:
            scored_candidates.append({
                "skill_id": skill_meta["id"],
                "name": skill_meta["name"],
                "confidence": weighted_score,
                "metadata": skill_meta
            })
            
    if not scored_candidates:
        return None
        
    scored_candidates.sort(key=lambda x: x["confidence"], reverse=True)
    selected = scored_candidates[0]
    selected["selection_context"] = intent_features
    return selected
```


### Pattern 2: Execution with Fallback

```python
def execute_andruia_skill_with_resilience(
    selected_skill: Dict,
    execution_context: Dict,
    fallback_registry: List[Dict],
    max_retries: int = 2
) -> Dict:
    """Execute an Andruia skill with built-in resilience and fallback routing.
    
    Wraps the core Andruia execution pipeline with retry logic, parameter
    adjustment for transient failures, and automatic fallback to related skills.
    """
    skill_id = selected_skill["skill_id"]
    context = _prepare_andruia_execution_context(execution_context, selected_skill)
    
    for attempt in range(max_retries + 1):
        try:
            result = _invoke_andruia_pipeline(skill_id, context)
            _update_andruia_confidence_score(skill_id, result.get("success", False))
            return {
                "status": "success",
                "skill_id": skill_id,
                "output": result,
                "attempts": attempt + 1,
                "timestamp": time.time()
            }
        except AndruiaTransientError as e:
            if attempt < max_retries:
                context = _adjust_andruia_parameters(context, e)
                continue
            raise AndruiaExecutionError(f"Pipeline failed for {skill_id} after {max_retries + 1} attempts") from e
        except AndruiaInvalidStateError as e:
            raise AndruiaExecutionError(f"Invalid state detected in {skill_id}: {e}") from e
            
    # Fallback routing when retries exhausted
    fallback_candidates = [s for s in fallback_registry if s.get("id") != skill_id]
    if fallback_candidates:
        return execute_andruia_skill_with_resilience(
            fallback_candidates[0], context, fallback_registry[1:], max_retries
        )
        
    return {
        "status": "deferred",
        "skill_id": skill_id,
        "reason": "All fallbacks exhausted, routing to human operator",
        "context": context
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
| `andruia-consultant` | AI consulting and strategic guidance |

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

- [AI Engineering — Skill Design Patterns (Anthropic Research)](https://www.anthropic.com/research)
- [LangChain Documentation — Custom Tool & Agent Design](https://python.langchain.com/docs/modules/agents/)
- [OpenAI Cookbook — Structured Outputs & Function Calling](https://github.com/openai/openai-cookbook)
- [Agent Skill Specification Standards (AutoGen / CrewAI)](https://microsoft.github.io/autogen/)
- [Prompt Engineering Guide — Instruction Design Patterns](https://www.promptingguide.ai/)