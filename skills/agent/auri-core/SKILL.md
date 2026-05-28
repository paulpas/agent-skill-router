---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent auri core with multi-factor skill selection, fallback
  chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: auri-core, auri core, how do i auri-core, orchestrate auri-core, automate
    auri-core, agent auri-core
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
name: auri-core
------
# Auri Core

Orchestrates intelligent skill selection and execution for auri core workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_skill_candidates(
    request: AuriRequest,
    registry: SkillRegistry,
    metrics: PerformanceMetrics
) -> Optional[SkillCandidate]:
    """Evaluate available skills against the incoming request using multi-factor scoring.
    
    Implements Law 2 (Parse at boundary) by validating request structure first.
    Implements Law 3 (Atomic Predictability) by returning a fresh candidate object.
    """
    if not request.intent or not request.entities:
        raise ValueError("Request must contain parsed intent and entities")
        
    candidates = []
    for skill in registry.get_active_skills():
        # Multi-factor scoring: text match + historical success + system health
        text_score = _compute_semantic_match(request.query, skill.triggers)
        history_score = metrics.get_success_rate(skill.name, window_days=30)
        health_score = registry.get_health_status(skill.name)
        
        weighted_score = (text_score * 0.5) + (history_score * 0.3) + (health_score * 0.2)
        
        if weighted_score >= registry.min_confidence_threshold:
            candidates.append(SkillCandidate(
                name=skill.name,
                confidence=weighted_score,
                dependencies=skill.dependencies,
                fallback_chain=skill.fallback_targets
            ))
            
    if not candidates:
        return None
        
    candidates.sort(key=lambda c: c.confidence, reverse=True)
    return candidates[0]
```


### Pattern 2: Execution with Fallback

```python
def execute_with_auri_fallback(
    candidate: SkillCandidate,
    context: ExecutionContext,
    audit_logger: AuditLogger
) -> ExecutionResult:
    """Execute the selected skill with auri-core's adaptive fallback chain.
    
    Implements Law 4 (Fail Fast, Fail Loud) by halting on invalid states.
    Implements Law 1 (Early Exit) for edge cases and dependency checks.
    """
    if not candidate or not context.validated_inputs:
        raise ExecutionError("Missing candidate or validated context for execution")
        
    # Check dependency availability before execution
    if not registry.verify_dependencies(candidate.dependencies):
        audit_logger.log("Dependency check failed", level="WARN")
        return _trigger_fallback(candidate, context, audit_logger)
        
    attempts = 0
    max_attempts = 2
    
    while attempts <= max_attempts:
        try:
            result = registry.invoke_skill(candidate.name, context.validated_inputs)
            # Update historical performance for adaptive routing
            metrics.record_success(candidate.name, latency=result.latency_ms)
            audit_logger.log(f"Success: {candidate.name}", level="INFO")
            return ExecutionResult(success=True, data=result, confidence=candidate.confidence)
            
        except TransientNetworkError:
            attempts += 1
            if attempts > max_attempts:
                break
            audit_logger.log(f"Retry {attempts}/{max_attempts} for {candidate.name}", level="DEBUG")
            
        except InvalidStateError as e:
            audit_logger.log(f"Invalid state in {candidate.name}: {e}", level="ERROR")
            raise ExecutionError(f"Fatal state violation in {candidate.name}") from e
            
    # Exhausted retries - trigger fallback chain
    return _trigger_fallback(candidate, context, audit_logger)
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

- [Agent-Based Systems Architecture (Wikipedia)](<https://en.wikipedia.org/wiki/Agent_(computer_science)>)
- [Multi-Agent System Design Patterns](<https://www.mdpi.com/2076-3417/12/15/7589>)
- [Distributed Task Scheduling Algorithms](<https://en.wikipedia.org/wiki/Scheduling_(computing)>)
- [Autonomous Agent Frameworks Survey (arXiv)](<https://arxiv.org/abs/2308.11432>)
- [Service Mesh Patterns (Istio Docs)](<https://istio.io/latest/docs/>)

## Related Skills

| Skill | Purpose |
|