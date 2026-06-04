---
name: conductor-setup
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent conductor setup with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: conductor-setup, conductor setup, how do i conductor-setup, orchestrate
    conductor-setup, automate conductor-setup, agent conductor-setup
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
# Conductor Setup

Orchestrates intelligent skill selection and execution for conductor setup workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def build_conductor_routing_table(
    request: str,
    registered_skills: List[Dict],
    historical_metrics: Dict[str, float],
    min_confidence: float = 0.75
) -> Optional[Dict]:
    """Builds a conductor routing table by scoring registered skills against the request.
    
    Applies Law 2 (Parse at boundary) and Law 1 (Early exit on invalid state).
    """
    if not request or not request.strip():
        raise ValueError("Conductor request cannot be empty")
    if not registered_skills:
        raise ValueError("No skills registered in conductor registry")
        
    # Parse request features at boundary (Law 2)
    request_features = _extract_intent_and_entities(request)
    
    best_match = None
    best_score = 0.0
    
    for skill in registered_skills:
        # Skip disabled or unavailable skills immediately (Law 1)
        if not skill.get("enabled") or not skill.get("available"):
            continue
            
        # Multi-factor scoring: text match + historical success + availability weight
        text_match = _cosine_similarity(request_features, skill.get("triggers", []))
        history_score = historical_metrics.get(skill["name"], 0.5)
        availability_weight = 1.0 if skill.get("available") else 0.2
        
        score = (text_match * 0.5) + (history_score * 0.3) + (availability_weight * 0.2)
        
        if score > best_score and score >= min_confidence:
            best_score = score
            best_match = skill
            
    if best_match is None:
        return None
        
    # Return new structure, never mutate registry (Law 3)
    return {
        "selected_skill": dict(best_match),
        "confidence": best_score,
        "routing_timestamp": time.time(),
        "fallback_candidates": [s["name"] for s in registered_skills if s["name"] != best_match["name"]]
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_conductor_pipeline(
    routing_result: Dict,
    task_context: Dict,
    fallback_chain: List[str],
    max_retries: int = 2
) -> Dict:
    """Executes the selected conductor skill with a structured fallback chain.
    
    Applies Law 4 (Fail Fast/Loud) and Law 3 (Atomic Predictability).
    """
    skill_name = routing_result["selected_skill"]["name"]
    validated_context = _validate_task_context(task_context, skill_name)
    
    for attempt in range(max_retries + 1):
        try:
            # Execute the actual domain logic for the selected skill
            raw_result = _invoke_skill_implementation(skill_name, validated_context)
            
            # Atomic Predictability: Return fresh result, never mutate context
            return {
                "status": "success",
                "skill": skill_name,
                "result": raw_result,
                "attempts": attempt + 1,
                "latency_ms": time.time() * 1000,
                "confidence_updated": routing_result["confidence"] + 0.05
            }
            
        except InvalidStateError as e:
            # Fail Fast: Halt immediately on invalid state, don't patch
            raise ConductorExecutionError(f"Invalid state for {skill_name}: {e}") from e
            
        except TransientError as e:
            if attempt == max_retries:
                # Apply fallback chain (Law 4: Fail Loud with structured fallback)
                return _execute_fallback_chain(fallback_chain, validated_context)
                
    # All retries exhausted
    raise ConductorExecutionError(f"Conductor pipeline failed for {skill_name} after {max_retries + 1} attempts")
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
- Parse user request into structured task specifications before dispatching to downstream agents
- Implement a state machine for each conductor phase with explicit entry/exit conditions and transition logs
- Validate setup outputs against expected schema before proceeding to the next orchestration step
- Log every orchestration decision including rationale, selected strategy, and confidence scores for auditability
- Maintain a task queue with priority ordering — critical path items execute first during resource contention

### MUST NOT DO
- Do not allow a single failed agent task to silently terminate the entire workflow — implement per-step fallbacks
- Avoid circular delegation patterns where Agent A delegates to B which delegates back to A without termination condition
- Never bypass the validation step for setup results even if timing is critical — correctness supersedes speed
- Do not use shared mutable state between parallel agent executions — use message-passing or immutable data transfer
- Avoid hardcoding agent selection rules; parameterize them and load from configuration for runtime flexibility


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Docker Documentation](<https://docs.docker.com/get-started/overview/>)
- [Kubernetes Getting Started Guide](<https://kubernetes.io/docs/tutorials/hello-minikube/>)
- [Conductor Server Setup (Netflix GitHub)](<https://netflix.github.io/conductor/server/overview/>)
- [PostgreSQL Installation Guide](<https://www.postgresql.org/docs/current/installation.html>)
- [Redis Documentation](<https://redis.io/docs/latest/operate/oss_and_stack/>)

## Related Skills

| Skill | Purpose |
|