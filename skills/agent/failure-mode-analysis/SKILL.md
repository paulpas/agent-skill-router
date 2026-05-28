---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent failure mode analysis with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: failure-mode-analysis, failure mode analysis, how do i failure-mode-analysis,
    orchestrate failure-mode-analysis, automate failure-mode-analysis, agent failure-mode-analysis
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
name: failure-mode-analysis
------
# Failure Mode Analysis

Orchestrates intelligent skill selection and execution for failure mode analysis workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_failure_analysis_method(
    system_context: Dict,
    failure_report: Dict,
    available_methods: List[Dict]
) -> Dict:
    """Select the optimal failure analysis methodology based on system context and failure characteristics.
    
    Evaluates failure mode complexity, data availability, and historical resolution patterns
    to choose between FMEA, Fault Tree Analysis, or Root Cause Analysis.
    """
    if not failure_report.get("symptoms") or not system_context.get("architecture"):
        raise ValueError("Incomplete failure report or missing system context")
        
    complexity_score = _assess_failure_complexity(failure_report)
    data_availability = _evaluate_data_readiness(system_context)
    
    best_method = None
    best_score = 0.0
    
    for method in available_methods:
        match_score = 0.0
        if method["type"] == "FMEA" and complexity_score < 0.6:
            match_score += 0.8
        elif method["type"] == "Fault Tree" and complexity_score >= 0.6:
            match_score += 0.9
        elif method["type"] == "RCA" and data_availability > 0.7:
            match_score += 0.85
            
        historical_success = method.get("historical_success_rate", 0.0)
        final_score = match_score * 0.6 + historical_success * 0.4
        
        if final_score > best_score:
            best_score = final_score
            best_method = method
            
    if best_score < 0.6:
        return {"method": "manual_review", "confidence": 0.0, "reason": "Insufficient data for automated selection"}
        
    return {
        "method": best_method["type"],
        "confidence": best_score,
        "parameters": _generate_method_parameters(best_method, failure_report),
        "fallback_chain": best_method.get("fallback_methods", [])
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_failure_analysis_pipeline(
    selected_method: Dict,
    failure_context: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute the selected failure analysis methodology with domain-specific fallbacks.
    
    Implements the 5 Laws of Elegant Defense:
    - Fails fast on corrupted telemetry data
    - Returns immutable analysis results
    - Applies structured fallbacks when primary analysis fails
    """
    if not _validate_telemetry_schema(failure_context.get("telemetry", [])):
        raise ValueError("Corrupted or missing telemetry data violates schema constraints")
        
    analysis_results = None
    for attempt in range(max_retries + 1):
        try:
            if selected_method["method"] == "FMEA":
                analysis_results = _run_fmea_analysis(failure_context)
            elif selected_method["method"] == "Fault Tree":
                analysis_results = _run_fault_tree_analysis(failure_context)
            else:
                analysis_results = _run_rca_analysis(failure_context)
                
            return {
                "status": "completed",
                "method_used": selected_method["method"],
                "results": analysis_results,
                "confidence": selected_method["confidence"],
                "attempts": attempt + 1
            }
            
        except DataInsufficiencyError:
            if attempt < max_retries:
                selected_method["method"] = "heuristic_fallback"
                continue
            return _apply_expert_deferral(failure_context, selected_method)
            
        except SchemaValidationError as e:
            raise ValueError(f"Telemetry validation failed at attempt {attempt + 1}: {e}") from e
            
    return _apply_expert_deferral(failure_context, selected_method)
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
- [FMEA Handbook - SAE International](<https://www.sae.org/standards/content/j1739_202205/>)
- [ISO 26262 Functional Safety](<https://en.wikipedia.org/wiki/ISO_26262>)
- [Fault Tree Analysis Guide (NIST)](<https://www.nist.gov/topics/manufacturing-engineering/reliability-and-maintainability-engineering>)
- [Root Cause Analysis Methods (ASQ)](<https://asq.org/quality-resources/root-cause>)
- [Hazard and Operability Study (HAZOP)](<https://en.wikipedia.org/wiki/Hazard_and_operability_study>)
