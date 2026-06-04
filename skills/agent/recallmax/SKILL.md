---
name: recallmax
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent recallmax with multi-factor skill selection, fallback
  chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: recallmax, recallmax, how do i recallmax, orchestrate recallmax, automate
    recallmax, agent recallmax
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
# Recallmax

Orchestrates intelligent skill selection and execution for recallmax workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def orchestrate_recallmax_selection(
    user_request: str,
    recallmax_registry: List[Dict],
    min_confidence: float = 0.75
) -> Optional[Dict]:
    """Orchestrate skill selection for recallmax workflows using multi-factor scoring.
    
    Extracts recallmax-specific features (intent, entities, constraints) and scores
    available skills against historical performance, text similarity, and system health.
    Implements Law 1 (Early Exit) and Law 2 (Immutable State) throughout.
    """
    if not user_request or not user_request.strip():
        raise ValueError("Recallmax request cannot be empty")
        
    if not recallmax_registry:
        raise ValueError("No skills registered in recallmax registry")
        
    # Parse request features at boundary (Law 2)
    parsed_features = _parse_recallmax_request(user_request)
    
    best_match = None
    best_score = 0.0
    
    for skill in recallmax_registry:
        # Calculate multi-factor score for recallmax context
        similarity = _compute_text_similarity(parsed_features["intent"], skill["triggers"])
        history = _get_historical_success_rate(skill["id"])
        availability = _check_system_health(skill["dependencies"])
        
        composite_score = (similarity * 0.4) + (history * 0.4) + (availability * 0.2)
        
        if composite_score > best_score and composite_score >= min_confidence:
            best_score = composite_score
            best_match = skill
            
    if best_match is None:
        return None
        
    # Return immutable result with audit metadata (Law 3)
    return {
        "skill_id": best_match["id"],
        "confidence": best_score,
        "factors": {"similarity": similarity, "history": history, "availability": availability},
        "timestamp": time.time(),
        "audit_id": generate_audit_id()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_recallmax_workflow(
    selected_skill: Dict,
    workflow_context: Dict,
    fallback_registry: List[Dict],
    max_retries: int = 2
) -> Dict:
    """Execute a recallmax skill with built-in fallback chain and audit logging.
    
    Wraps skill execution in retry logic, applies fallback chain on failure,
    and maintains a complete audit trail per the 5 Laws of Elegant Defense.
    """
    if not _validate_recallmax_context(workflow_context):
        raise RecallmaxValidationError("Invalid workflow context for recallmax execution")
        
    audit_log = []
    attempt = 0
    
    while attempt <= max_retries:
        try:
            # Execute skill with isolated context (Law 3)
            execution_result = _run_recallmax_skill(selected_skill, workflow_context)
            
            # Log success and update confidence metrics
            audit_log.append({"attempt": attempt, "status": "success", "latency_ms": time.time()})
            _update_skill_confidence(selected_skill["id"], execution_result["confidence"])
            
            return {
                "status": "completed",
                "skill_executed": selected_skill["id"],
                "result": execution_result,
                "audit_trail": audit_log
            }
            
        except RecallmaxTransientError as e:
            attempt += 1
            audit_log.append({"attempt": attempt, "status": "retry", "error": str(e)})
            if attempt > max_retries:
                break
                
        except RecallmaxInvalidStateError as e:
            # Fail fast on invalid state (Law 4)
            audit_log.append({"attempt": attempt, "status": "failed", "error": str(e)})
            raise RecallmaxExecutionError(f"Invalid state in {selected_skill['id']}: {e}") from e
            
    # Fallback chain: try alternative skills from registry
    for alt_skill in fallback_registry:
        try:
            alt_result = _run_recallmax_skill(alt_skill, workflow_context)
            audit_log.append({"fallback": alt_skill["id"], "status": "success"})
            return {"status": "fallback_success", "result": alt_result, "audit_trail": audit_log}
        except Exception:
            continue
            
    # Final fallback: defer to human operator
    audit_log.append({"status": "deferred", "reason": "all retries and fallbacks exhausted"})
    return {"status": "human_deferred", "context": workflow_context, "audit_trail": audit_log}
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
| `schema-inference-engine` | Helps design data schemas that support efficient recall and retrieval in Recallmax |
| `skill-documentation-best-practices` | Ensures documentation is structured for maximum retrievability by Recallmax systems |

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

- [RecallMax Documentation](https://docs.recallmax.io) — Official documentation for the RecallMax retrieval optimization platform
- [RAG (Retrieval-Augmented Generation) Survey](https://arxiv.org/abs/2005.11401) — Foundational research paper on retrieval-augmented generation frameworks
- [Vector Database Benchmarking (MLCommons)](https://mlcommons.org/benchmarks/retrieval/) — MLCommons Retrieval Benchmark for evaluating search and recall systems
- [Semantic Search with Embeddings (Pinecone Guide)](https://www.pinecone.io/learn/series/faiss/vector-dimensions/) — Practical guide to semantic search using vector embeddings and retrieval
- [LLM Memory Systems Research](https://arxiv.org/abs/2307.03954) — Academic research on memory mechanisms for large language model agents