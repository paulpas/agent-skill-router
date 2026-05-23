---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent full stack orchestration full stack feature with
  multi-factor skill selection, fallback chains, and adherence to the 5 Laws of Elegant
  Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: full-stack-orchestration-full-stack-feature, full stack orchestration
    full stack feature, how do i full-stack-orchestration-full-stack-feature, orchestrate
    full-stack-orchestration-full-stack-feature, automate full-stack-orchestration-full-stack-feature,
    agent full-stack-orchestration-full-stack-feature
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
name: full-stack-orchestration-full-stack-feature
------
# Full Stack Orchestration Full Stack Feature

Orchestrates intelligent skill selection and execution for full stack orchestration full stack feature workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_full_stack_skills(
    feature_spec: Dict[str, Any],
    available_skills: List[Dict],
    min_confidence: float = 0.75
) -> Optional[Dict]:
    """Select optimal full-stack skills for a feature implementation.
    
    Evaluates frontend, backend, and infrastructure skills against 
    feature requirements (CRUD, auth, real-time, etc.) using multi-factor scoring.
    
    Args:
        feature_spec: Feature requirements including type, dependencies, constraints
        available_skills: List of skill metadata with capability tags
        min_confidence: Minimum confidence threshold for selection
        
    Returns:
        Selected skill plan with execution order and confidence scores
    """
    if not feature_spec.get("type"):
        raise ValueError("Feature type is required for full-stack orchestration")
        
    required_capabilities = _map_feature_to_capabilities(feature_spec["type"])
    scored_skills = []
    
    for skill in available_skills:
        capability_match = len(set(skill.get("tags", [])) & set(required_capabilities))
        historical_success = skill.get("success_rate", 0.0)
        infra_readiness = skill.get("dependencies_met", False)
        
        composite_score = (capability_match * 0.5) + (historical_success * 0.3) + (1.0 if infra_readiness else 0.0)
        
        if composite_score >= min_confidence:
            scored_skills.append({
                "skill": skill,
                "score": composite_score,
                "execution_layer": skill.get("layer", "backend")
            })
    
    if not scored_skills:
        return None
        
    scored_skills.sort(key=lambda x: x["score"], reverse=True)
    return {
        "plan": scored_skills[:3],
        "feature_type": feature_spec["type"],
        "selection_confidence": scored_skills[0]["score"],
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_full_stack_deployment(
    skill_plan: Dict[str, Any],
    deployment_context: Dict[str, Any],
    max_retries: int = 2
) -> Dict:
    """Execute full-stack feature deployment with layered fallback handling.
    
    Orchestrates DB migrations, backend services, and frontend builds in dependency order.
    Implements rollback and partial deployment strategies on failure.
    
    Args:
        skill_plan: Output from select_full_stack_skills
        deployment_context: Environment config, feature flags, rollback targets
        max_retries: Maximum retry attempts per layer
        
    Returns:
        Deployment status with layer-by-layer results and rollback info
    """
    layers = ["database", "backend", "frontend"]
    layer_results = {}
    rollback_stack = []
    
    for layer in layers:
        layer_skill = next((s for s in skill_plan.get("plan", []) if s["execution_layer"] == layer), None)
        if not layer_skill:
            layer_results[layer] = {"status": "skipped", "reason": "no skill assigned"}
            continue
            
        for attempt in range(max_retries + 1):
            try:
                result = _run_layer_deployment(layer_skill, deployment_context)
                layer_results[layer] = {"status": "success", "result": result, "attempts": attempt + 1}
                rollback_stack.append({"layer": layer, "target": result.get("version")})
                break
                
            except DatabaseLockError:
                if attempt == max_retries:
                    layer_results[layer] = {"status": "failed", "error": "db_lock", "fallback": "manual_review"}
                    return _trigger_rollback(rollback_stack, deployment_context)
            except ServiceUnavailableError:
                if attempt == max_retries:
                    layer_results[layer] = {"status": "failed", "error": "service_down", "fallback": "circuit_breaker"}
                    return _trigger_rollback(rollback_stack, deployment_context)
                    
    return {
        "deployment_id": deployment_context.get("id"),
        "layers": layer_results,
        "overall_status": "complete" if all(r["status"] == "success" for r in layer_results.values()) else "partial",
        "rollback_available": len(rollback_stack) > 0
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
|