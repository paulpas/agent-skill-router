---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent cc skill project guidelines example with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: cc-skill-project-guidelines-example, cc skill project guidelines example,
    how do i cc-skill-project-guidelines-example, orchestrate cc-skill-project-guidelines-example,
    automate cc-skill-project-guidelines-example, agent cc-skill-project-guidelines-example
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
name: cc-skill-project-guidelines-example
------
# Cc Skill Project Guidelines Example

Orchestrates intelligent skill selection and execution for cc skill project guidelines example workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def build_execution_plan(
    user_request: str,
    skill_registry: Dict[str, Dict],
    confidence_threshold: float = 0.75
) -> Dict:
    """Construct an ordered execution plan by scoring skills against request features.
    
    Applies Law 2 (Parse at boundary) and Law 1 (Early Exit) to ensure
    only valid, high-confidence skills enter the pipeline.
    """
    if not user_request or not skill_registry:
        raise ValueError("Request and registry must be non-empty")
        
    # Parse request into structured features at boundary
    features = parse_request_features(user_request)
    
    scored_candidates = []
    for skill_id, metadata in skill_registry.items():
        # Calculate multi-factor score
        text_match = cosine_similarity(features["intent"], metadata["triggers"])
        history_score = metadata.get("success_rate", 0.5)
        availability = 1.0 if metadata.get("status") == "healthy" else 0.0
        
        composite_score = (text_match * 0.5) + (history_score * 0.3) + (availability * 0.2)
        
        if composite_score >= confidence_threshold:
            scored_candidates.append({
                "skill_id": skill_id,
                "score": composite_score,
                "dependencies": metadata.get("requires", []),
                "fallback_targets": metadata.get("fallback_chain", [])
            })
            
    # Sort by score descending and validate dependency graph
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)
    validated_plan = validate_dependency_chain(scored_candidates)
    
    return {
        "plan_id": generate_uuid(),
        "steps": validated_plan,
        "timestamp": time.time(),
        "confidence_threshold_applied": confidence_threshold
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_step_with_resilience(
    step: Dict,
    execution_context: Dict,
    max_retries: int = 2,
    fallback_registry: Dict[str, List[str]] = None
) -> Dict:
    """Execute a single orchestration step with automatic retry and fallback routing.
    
    Implements Law 4 (Fail Fast/Loud) and Law 3 (Atomic Predictability) by
    ensuring state transitions are clean and failures are explicitly handled.
    """
    step_id = step["skill_id"]
    context = validate_context(execution_context, step)
    
    for attempt in range(max_retries + 1):
        try:
            # Invoke the actual skill implementation
            result = invoke_skill(step_id, context)
            
            # Update confidence metrics atomically
            update_skill_metrics(step_id, success=True, latency=result["latency_ms"])
            
            return {
                "step_id": step_id,
                "status": "completed",
                "result": result["output"],
                "attempts": attempt + 1,
                "confidence_updated": True
            }
            
        except DependencyError as e:
            # Fail fast on missing dependencies
            raise OrchestratorError(f"Dependency failure for {step_id}: {e}") from e
            
        except TransientFailure as e:
            if attempt < max_retries:
                continue
            # Apply fallback chain
            fallback_targets = step.get("fallback_targets", [])
            if fallback_targets:
                return execute_step_with_resilience(
                    {"skill_id": fallback_targets[0], "score": 0.0},
                    context,
                    max_retries=0
                )
            
    # All retries exhausted - Fail loud
    update_skill_metrics(step_id, success=False)
    raise OrchestratorError(f"Step {step_id} exhausted all retries and fallbacks")
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

- [Software Project Management (PMI)](<https://www.pmi.org/about/what-is-pmi>)
- [Agile Manifesto Principles](<https://agilemanifesto.org/>)
- [Conventional Commits Specification](<https://www.conventionalcommits.org/>)
- [Trunk-Based Development (Martin Fowler)](<https://martinfowler.com/articles/onpa/trunkbaseddevelopment.html>)
- [Git Flow vs Trunk-Based Comparison](<https://www.atlassian.com/git/tutorials/comparing-workflows>)

## Related Skills

| Skill | Purpose |
|