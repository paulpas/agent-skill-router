---




name: skill-seekers
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent skill seekers with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: skill-seekers, skill seekers, how do i skill-seekers, orchestrate skill-seekers,
    automate skill-seekers, agent skill-seekers
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




# Skill Seekers

Orchestrates intelligent skill selection and execution for skill seekers workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def resolve_skill_intent(
    raw_request: str,
    skill_registry: List[Dict],
    confidence_threshold: float = 0.75
) -> Optional[Dict]:
    """Parse request features and score against registered skills.
    
    Implements multi-factor scoring: trigger overlap, historical success rate,
    and current dependency health. Returns the highest-scoring skill or None.
    """
    if not raw_request or not skill_registry:
        raise ValueError("Request and skill registry must be non-empty")
        
    # Extract structured features from natural language request
    features = {
        "intent": _extract_intent(raw_request),
        "entities": _extract_entities(raw_request),
        "constraints": _parse_constraints(raw_request)
    }
    
    scored_skills = []
    for skill in skill_registry:
        trigger_match = _calculate_trigger_overlap(features["intent"], skill.get("triggers", []))
        history_score = skill.get("success_rate", 0.0) * 0.4
        dependency_health = _check_dependency_status(skill.get("requires", []))
        
        composite_score = (trigger_match * 0.5) + (history_score * 0.3) + (dependency_health * 0.2)
        
        if composite_score >= confidence_threshold:
            scored_skills.append({
                "skill_id": skill["id"],
                "score": round(composite_score, 3),
                "breakdown": {"trigger": trigger_match, "history": history_score, "deps": dependency_health}
            })
            
    if not scored_skills:
        return None
        
    scored_skills.sort(key=lambda x: x["score"], reverse=True)
    return scored_skills[0]
```


### Pattern 2: Execution with Fallback

```python
def execute_skill_with_routing(
    selected_skill: Dict,
    execution_context: Dict,
    fallback_registry: List[Dict],
    max_retries: int = 2
) -> Dict:
    """Execute selected skill with concrete fallback routing.
    
    Implements retry logic, alternative skill routing, and human escalation.
    Tracks latency and updates historical success metrics on completion.
    """
    skill_id = selected_skill["skill_id"]
    context = _validate_execution_context(execution_context, skill_id)
    
    for attempt in range(max_retries + 1):
        try:
            result = _invoke_skill_handler(skill_id, context)
            _update_skill_metrics(skill_id, success=True, latency_ms=_now_ms())
            return {"status": "success", "skill": skill_id, "result": result, "attempts": attempt + 1}
        except DependencyError as e:
            _log_error(f"Dependency failure for {skill_id}: {e}")
            if attempt < max_retries:
                _retry_with_backoff(attempt)
                continue
            return _route_to_alternative_skill(skill_id, context, fallback_registry)
        except CriticalFailure as e:
            _log_error(f"Critical failure in {skill_id}: {e}")
            return _escalate_to_human(skill_id, context, str(e))
            
    return {"status": "failed", "skill": skill_id, "error": "Max retries exhausted", "attempts": max_retries + 1}
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
| `skill-router` | The routing system that skill seekers interface with to find and load appropriate skills |
| `intelligent-skill-selection` | Provides selection heuristics that complement the skill seeker's discovery patterns |

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

- [Information Retrieval Fundamentals (Wikipedia)](https://en.wikipedia.org/wiki/Information_retrieval) — Wikipedia overview of information retrieval systems, the foundation of skill search
- [Elasticsearch Search API](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-api.html) — Elasticsearch documentation for full-text search and relevance ranking
- [Semantic Search with LangChain](https://python.langchain.com/docs/modules/data_connection/retrievers/) — LangChain documentation on building semantic search capabilities for document retrieval
- [FAISS Vector Similarity Search](https://github.com/facebookresearch/faiss) — Facebook's FAISS library for efficient similarity search and clustering of dense vectors
- [Reciprocal Rank Fusion (RRF) Ranking](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf/) — Academic paper on reciprocal rank fusion for combining multiple ranking signals