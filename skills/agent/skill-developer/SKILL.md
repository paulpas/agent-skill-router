---
name: skill-developer
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent skill developer with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: skill-developer, skill developer, how do i skill-developer, orchestrate
    skill-developer, automate skill-developer, agent skill-developer
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
# Skill Developer

Orchestrates intelligent skill selection and execution for skill developer workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_and_select_skill(task_description: str, skill_registry: dict, execution_history: list) -> dict:
    """Evaluate available skills against task triggers and historical performance.
    
    Implements Law 2 (Parse at boundary) and Law 1 (Early exit on invalid state).
    Returns a scored candidate list with dependency validation.
    """
    if not task_description or not isinstance(skill_registry, dict):
        raise ValueError("Task description and valid registry required")
        
    candidates = []
    task_tokens = set(_normalize_triggers(task_description))
    
    for skill_name, metadata in skill_registry.items():
        # Parse triggers and calculate semantic overlap
        skill_triggers = set(metadata.get("triggers", []))
        trigger_overlap = len(task_tokens & skill_triggers) / max(len(task_tokens), len(skill_triggers))
        
        # Fetch historical success rate from execution history
        historical_success = _calculate_success_rate(skill_name, execution_history)
        
        # Validate dependencies are currently healthy
        deps_healthy = all(_check_dependency_status(dep) for dep in metadata.get("dependencies", []))
        if not deps_healthy:
            continue
            
        # Multi-factor scoring: 50% trigger match, 30% history, 20% system load
        system_load = _get_current_system_load()
        load_penalty = 0.1 if system_load > 0.8 else 0.0
        
        score = (trigger_overlap * 0.5) + (historical_success * 0.3) + ((1.0 - load_penalty) * 0.2)
        
        if score >= 0.65:
            candidates.append({
                "name": skill_name,
                "score": round(score, 3),
                "confidence": round(score * historical_success, 3),
                "dependencies": metadata.get("dependencies", []),
                "metadata": metadata
            })
            
    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates[0] if candidates else None
```


### Pattern 2: Execution with Fallback

```python
def execute_with_domain_fallback(selected_skill: dict, task_context: dict, fallback_registry: dict) -> dict:
    """Execute the selected skill with a structured fallback chain.
    
    Implements Law 4 (Fail fast, fail loud) and maintains audit trails.
    Handles dependency resolution, retry logic, and confidence updates.
    """
    if not selected_skill or not task_context:
        raise SkillOrchestrationError("Missing skill selection or task context")
        
    attempt_count = 0
    max_attempts = 2
    current_skill = selected_skill
    
    while attempt_count <= max_attempts:
        try:
            # Validate context against skill requirements
            validated_context = _enforce_context_schema(task_context, current_skill["metadata"])
            
            # Execute domain-specific logic
            result = _invoke_skill_runtime(current_skill["name"], validated_context)
            
            # Update confidence scores and log audit trail
            _record_execution_log(current_skill["name"], success=True, latency_ms=_measure_latency())
            _update_confidence_score(current_skill["name"], delta=0.05)
            
            return {
                "status": "success",
                "skill": current_skill["name"],
                "result": result,
                "attempts": attempt_count + 1,
                "audit_id": str(uuid.uuid4())
            }
            
        except DependencyError as e:
            _record_execution_log(current_skill["name"], success=False, error=str(e))
            if attempt_count < max_attempts:
                attempt_count += 1
                continue
        except TransientRuntimeError:
            if attempt_count < max_attempts:
                attempt_count += 1
                continue
            # Exhausted retries - trigger fallback chain
            fallback_candidates = _find_related_skills(current_skill["name"], fallback_registry)
            if fallback_candidates:
                current_skill = fallback_candidates[0]
                attempt_count = 0
                continue
            
        # Fail loud: all retries and fallbacks exhausted
        raise SkillOrchestrationError(
            f"Execution failed for {current_skill['name']} after {attempt_count} attempts. "
            f"No viable fallbacks available."
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
| `skill-creator` | The creation counterpart — use this when building new skills, load creator for the full workflow |
| `skill-testing-methodology` | Ensures created skills are tested through systematic validation before deployment |

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

- [Semantic Versioning 2.0.0](https://semver.org/) — The semantic versioning specification used for tracking skill versions
- [Software Testing Principles (ISTQB)](https://www.istqb.org/get-certified/ foundations.html) — ISTQB foundational testing principles applicable to skill quality assurance
- [Agent Framework Evaluation Metrics](https://arxiv.org/abs/2401.12954) — Academic framework for evaluating LLM-based agent systems including skills
- [CI/CD for Documentation (GitHub Actions)](https://docs.github.com/en/actions/use-cases-and-examples/publishing-packages/publishing-markdown-documentation) — GitHub Actions patterns for automating documentation and skill validation workflows
- [Developer Experience (DX) Best Practices](https://www.getdx.com/resources/) — Developer experience research and best practices for building effective developer tools