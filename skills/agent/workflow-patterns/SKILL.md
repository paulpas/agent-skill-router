---




name: workflow-patterns
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent workflow patterns with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: workflow-patterns, workflow patterns, how do i workflow-patterns, orchestrate
    workflow-patterns, automate workflow-patterns, agent workflow-patterns
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




# Workflow Patterns

Orchestrates intelligent skill selection and execution for workflow patterns workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def score_workflow_candidates(
    request_context: Dict[str, Any],
    available_skills: List[Dict[str, Any]],
    historical_metrics: Dict[str, float]
) -> List[Dict[str, Any]]:
    """Evaluates available skills against a workflow request using multi-factor scoring.
    Implements Law 2 (Parse at boundary) and Law 3 (Immutable returns)."""
    
    # Law 1: Early exit on invalid boundary inputs
    if not request_context.get("intent") or not available_skills:
        return []
    
    # Parse and normalize request features at the boundary
    normalized_query = request_context["intent"].lower().strip()
    required_entities = set(request_context.get("entities", []))
    
    scored_results = []
    for skill in available_skills:
        # Calculate text similarity (simplified cosine approximation)
        skill_triggers = set(skill.get("triggers", []))
        overlap = len(required_entities & skill_triggers)
        text_match = overlap / max(len(required_entities | skill_triggers), 1)
        
        # Weight historical performance and current system health
        hist_success = historical_metrics.get(skill["name"], 0.5)
        system_health = 1.0 if skill.get("status") == "healthy" else 0.0
        
        # Composite score: 50% relevance, 30% history, 20% availability
        composite = (text_match * 0.5) + (hist_success * 0.3) + (system_health * 0.2)
        
        if composite >= 0.65:
            # Law 3: Return new dict, never mutate original skill metadata
            scored_results.append({
                "skill_id": skill["id"],
                "name": skill["name"],
                "confidence": round(composite, 3),
                "breakdown": {"relevance": text_match, "history": hist_success, "health": system_health}
            })
    
    return sorted(scored_results, key=lambda x: x["confidence"], reverse=True)
```


### Pattern 2: Execution with Fallback

```python
def execute_workflow_with_adaptive_fallback(
    selected_skill: Dict[str, Any],
    workflow_context: Dict[str, Any],
    fallback_registry: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Executes a workflow step with a structured fallback chain.
    Implements Law 4 (Fail Fast/Loud) and Law 1 (Early returns)."""
    
    # Law 1: Validate skill contract before execution
    if not selected_skill.get("id") or not workflow_context.get("state"):
        return {"status": "failed", "error": "Missing skill ID or workflow state"}
    
    max_attempts = 2
    for attempt in range(max_attempts):
        try:
            # Execute core workflow logic
            result = _run_skill_pipeline(selected_skill, workflow_context)
            
            # Law 3: Return immutable result snapshot
            return {
                "status": "success",
                "skill": selected_skill["name"],
                "attempt": attempt + 1,
                "result": result,
                "audit": {"timestamp": time.time(), "latency_ms": 120}
            }
        except InvalidWorkflowStateError as e:
            # Law 4: Fail immediately on invalid state, do not patch
            return {"status": "failed", "error": str(e), "deferred": True}
        except TransientDependencyError as e:
            if attempt < max_attempts - 1:
                continue  # Retry with backoff
            # Fallback chain: Try alternative skill from registry
            for alt_skill in fallback_registry:
                if alt_skill["id"] != selected_skill["id"]:
                    return execute_workflow_with_adaptive_fallback(alt_skill, workflow_context, [])
            
            # Final fallback: Defer to human operator
            return {"status": "deferred", "reason": "fallback_exhausted", "requires_human": True}
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

- [Enterprise Integration Patterns — Gregor Hohpe & Bobby Woolf](https://www.enterpriseintegrationpatterns.com/)
- [AWS Step Functions State Machine Documentation](https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html)
- [Temporal Workflow Patterns](https://temporal.io/workflow-orchestration)
- [Apache Airflow Operator Design Patterns](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/operators.html)
- [Saga Pattern — Microsoft Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/saga/saga)

## Related Skills

| Skill | Purpose |
|

