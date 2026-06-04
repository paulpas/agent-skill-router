---




name: skill-improver
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent skill improver with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: skill-improver, skill improver, how do i skill-improver, orchestrate skill-improver,
    automate skill-improver, agent skill-improver
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




# Skill Improver

Orchestrates intelligent skill selection and execution for skill improver workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def analyze_skill_improvement(
    skill_metadata: Dict,
    usage_metrics: Dict,
    context_gaps: List[str]
) -> Dict:
    """Analyze a skill's current state and calculate improvement potential.
    
    Applies multi-factor scoring to determine if a skill needs optimization,
    and generates a prioritized improvement plan based on the 5 Laws of Elegant Defense.
    
    Args:
        skill_metadata: Current skill definition including triggers, prompts, and constraints
        usage_metrics: Historical performance data (success_rate, avg_latency, error_types)
        context_gaps: Identified missing context or edge cases from recent failures
        
    Returns:
        Improvement plan with priority score, suggested changes, and fallback recommendation
    """
    # Guard clause - Early Exit (Law 1)
    if not skill_metadata or not usage_metrics:
        raise ValueError("Skill metadata and usage metrics are required for analysis")
        
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    success_rate = usage_metrics.get("success_rate", 0.0)
    error_frequency = usage_metrics.get("error_frequency", 0)
    gap_severity = len(context_gaps) * 0.15
    
    # Calculate improvement score (0.0-1.0)
    improvement_score = (1.0 - success_rate) * 0.6 + min(error_frequency / 10, 0.4) + gap_severity
    improvement_score = min(max(improvement_score, 0.0), 1.0)
    
    # Determine optimization strategy
    if improvement_score < 0.3:
        strategy = "MAINTAIN"
        suggested_changes = []
    elif improvement_score < 0.7:
        strategy = "OPTIMIZE"
        suggested_changes = _generate_optimization_suggestions(skill_metadata, context_gaps)
    else:
        strategy = "REWRITE"
        suggested_changes = _generate_rewrite_blueprint(skill_metadata, context_gaps)
        
    # Atomic Predictability (Law 3) - Return new dict, don't mutate inputs
    return {
        "skill_id": skill_metadata.get("id"),
        "improvement_score": round(improvement_score, 3),
        "strategy": strategy,
        "suggested_changes": suggested_changes,
        "fallback_to_static": improvement_score > 0.9,
        "analysis_timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def apply_skill_improvement(
    improvement_plan: Dict,
    skill_template: Dict,
    max_iterations: int = 3
) -> Dict:
    """Execute skill improvement workflow with fallback chain for resilience.
    
    Implements the Fail Fast, Fail Loud principle (Law 4):
    - Invalid improvement plans halt immediately with descriptive errors
    - No silent failures or partial optimizations
    
    Fallback chain:
    1. Apply incremental prompt/config adjustments
    2. Revert to validated static template if optimization degrades performance
    3. Flag for human expert review if improvement score remains critical
    
    Args:
        improvement_plan: Output from analyze_skill_improvement
        skill_template: Base skill definition to apply changes against
        max_iterations: Maximum optimization cycles before fallback
        
    Returns:
        Optimized skill definition with validation results and confidence metrics
    """
    # Guard clause - validate plan (Early Exit)
    if improvement_plan.get("strategy") not in ("OPTIMIZE", "REWRITE"):
        raise ValueError(f"Invalid improvement strategy: {improvement_plan.get('strategy')}")
        
    # Parse context - Ensure trusted state (Law 2)
    validated_template = _validate_skill_template(skill_template)
    
    for iteration in range(max_iterations):
        try:
            # Apply domain-specific improvement logic
            optimized_skill = _apply_optimization_rules(validated_template, improvement_plan)
            
            # Validate against 5 Laws of Elegant Defense
            validation_result = _validate_against_defense_laws(optimized_skill)
            
            if validation_result["passes"]:
                return {
                    "success": True,
                    "skill_id": optimized_skill["id"],
                    "optimized_config": optimized_skill,
                    "iterations_used": iteration + 1,
                    "confidence_delta": validation_result["confidence_score"]
                }
                
        except InvalidStateError as e:
            # Fail Fast - Don't try to patch bad data (Law 4)
            raise SkillImprovementError(
                f"Invalid state during optimization: {str(e)}"
            ) from e
            
        except DegradationError as e:
            # Optimization degraded performance - trigger fallback
            if iteration == max_iterations - 1:
                return _apply_fallback_to_static_template(validated_template)
                
    # All iterations exhausted - Fail Loud (Law 4)
    raise SkillImprovementError(
        f"Failed to improve skill after {max_iterations} optimization cycles"
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
| `skill-creator` | The creation counterpart — after creating skills, use this skill to iteratively improve them |
| `self-critique-engine` | Provides critique methodologies that skill improver applies to evaluate and refine skills |

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

- [Continuous Integration Best Practices (Atlassian)](https://www.atlassian.com/continuous-delivery/principles/continuous-integration-vs-delivery-vs-deployment) — Atlassian's guide to continuous improvement practices applicable to skill iteration
- [Code Refactoring Patterns (Fowler)](https://martinfowler.com/books/refactoring.html) — Martin Fowler's catalog of refactoring patterns applicable to improving existing skills
- [Prompt Iteration and Optimization Techniques](https://www.promptingguide.ai/techniques/iterating) — Research on iterative prompt improvement methods applicable to skill refinement
- [A/B Testing for Documentation (Microsoft)](https://learn.microsoft.com/en-us/azure/devops/project/about-continuous-integration) — Microsoft's guidance on testing documentation changes with measurable quality improvements
- [Technical Writing Iterative Process (Google)](https://developers.google.com/style/editing-your-work) — Google's style guide on iterative editing and refinement processes for technical content