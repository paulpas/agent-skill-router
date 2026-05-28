---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent multi skill executor with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: multi-skill-executor, multi skill executor, how do i multi-skill-executor,
    orchestrate multi-skill-executor, automate multi-skill-executor, agent multi-skill-executor
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
name: multi-skill-executor
------
# Multi Skill Executor

Orchestrates intelligent skill selection and execution for multi skill executor workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_task_to_skill(
    task_payload: Dict[str, Any],
    skill_registry: List[Dict[str, Any]],
    confidence_threshold: float = 0.75
) -> Optional[Dict[str, Any]]:
    """Route an incoming task to the optimal skill using multi-factor scoring.
    
    Evaluates trigger overlap, historical success rates, and current health metrics
    to determine the best execution path. Returns None if no skill meets threshold.
    """
    if not task_payload.get("intent") or not skill_registry:
        raise ValueError("Task intent and skill registry are required for routing")
        
    intent_vector = _hash_intent(task_payload["intent"])
    best_match = None
    top_score = 0.0
    
    for skill in skill_registry:
        if not _is_skill_healthy(skill):
            continue
            
        trigger_overlap = _calculate_trigger_similarity(intent_vector, skill.get("triggers", []))
        historical_success = skill.get("metrics", {}).get("success_rate", 0.0)
        availability_weight = 1.0 if skill.get("status") == "online" else 0.3
        
        weighted_score = (trigger_overlap * 0.5) + (historical_success * 0.3) + (availability_weight * 0.2)
        
        if weighted_score > top_score and weighted_score >= confidence_threshold:
            top_score = weighted_score
            best_match = {
                "skill_id": skill["id"],
                "score": weighted_score,
                "breakdown": {
                    "trigger_match": trigger_overlap,
                    "historical_rate": historical_success,
                    "availability": availability_weight
                }
            }
            
    return best_match
```


### Pattern 2: Execution with Fallback

```python
def execute_with_resilience(
    skill_config: Dict[str, Any],
    execution_context: Dict[str, Any],
    fallback_chain: List[str] = None
) -> Dict[str, Any]:
    """Execute a selected skill with built-in retry and fallback routing.
    
    Wraps the skill invocation in a resilience layer that handles transient failures,
    validates outputs, and routes to fallback skills or human escalation if needed.
    """
    max_attempts = execution_context.get("max_retries", 2)
    current_skill = skill_config["skill_id"]
    
    for attempt in range(max_attempts + 1):
        try:
            # Parse and validate inputs before invocation
            validated_inputs = _normalize_payload(execution_context["inputs"], skill_config.get("schema"))
            result = _invoke_skill(current_skill, validated_inputs)
            
            # Validate output schema to prevent downstream corruption
            _validate_output(result, skill_config.get("output_schema"))
            
            return {
                "status": "success",
                "skill": current_skill,
                "attempts": attempt + 1,
                "data": result,
                "latency_ms": _measure_duration()
            }
            
        except ValidationError as e:
            # Fail fast on structural issues - do not retry
            raise ExecutionError(f"Schema validation failed for {current_skill}: {e}") from e
            
        except TransientFailure as e:
            if attempt == max_attempts:
                return _route_to_fallback(current_skill, fallback_chain, execution_context)
            continue
            
        except CriticalFailure as e:
            # Escalate immediately for non-recoverable states
            return _escalate_to_human(current_skill, execution_context, str(e))
            
    return _route_to_fallback(current_skill, fallback_chain, execution_context)
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

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [Agent Communication Protocols (ACL/FIPA)](<https://en.wikipedia.org/wiki/Agent_Communication_Language>)
- [Distributed Task Queues (Celery)](<https://docs.celeryq.dev/en/stable/getting-started/introduction.html>)
- [Asyncio for Python Concurrency](<https://docs.python.org/3/library/asyncio.html>)
- [Apache Kafka Event Streaming](<https://kafka.apache.org/documentation/>)
- [Message Queue Patterns (Enterprise Integration)](<https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageQueue.html>)
