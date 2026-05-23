---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent regression detector with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: regression-detector, regression detector, how do i regression-detector,
    orchestrate regression-detector, automate regression-detector, agent regression-detector
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
name: regression-detector
------
# Regression Detector

Orchestrates intelligent skill selection and execution for regression detector workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def analyze_regression_risk(
    diff_content: str,
    test_registry: Dict[str, List[str]],
    historical_metrics: Dict[str, float]
) -> Dict:
    """Analyze code changes to predict regression risk and select appropriate test suites.
    
    Extracts modified files, maps them to relevant tests, and calculates a composite
    risk score based on change severity, test coverage gaps, and historical flakiness.
    
    Args:
        diff_content: Unified diff string of the proposed changes
        test_registry: Mapping of file paths to their associated test modules
        historical_metrics: Dict of test names with avg_runtime and failure_rate
        
    Returns:
        Risk assessment dict with prioritized test suites and confidence score
    """
    changed_files = _parse_diff_files(diff_content)
    if not changed_files:
        return {"risk_score": 0.0, "test_suites": [], "confidence": 0.0}
        
    targeted_tests = set()
    for file_path in changed_files:
        targeted_tests.update(test_registry.get(file_path, []))
        
    risk_score = 0.0
    for test_name in targeted_tests:
        history = historical_metrics.get(test_name, {"failure_rate": 0.0, "avg_runtime": 0.0})
        # Weight by historical failure rate and runtime impact
        risk_score += history["failure_rate"] * 0.6 + (history["avg_runtime"] / 100.0) * 0.4
        
    # Normalize score to 0-1 range
    normalized_risk = min(risk_score / max(len(targeted_tests), 1), 1.0)
    
    return {
        "risk_score": round(normalized_risk, 3),
        "test_suites": sorted(list(targeted_tests), key=lambda t: historical_metrics.get(t, {}).get("failure_rate", 0), reverse=True),
        "confidence": 0.85 if len(changed_files) > 0 else 0.0,
        "changed_files": changed_files
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_regression_scan(
    test_suites: List[str],
    baseline_metrics: Dict[str, Any],
    max_retries: int = 2
) -> Dict:
    """Execute targeted regression tests and compare results against baseline.
    
    Runs the prioritized test suites, captures execution metrics and output diffs,
    and identifies regressions by comparing against stored baseline performance.
    Implements retry logic for flaky tests and generates a structured report.
    
    Args:
        test_suites: Ordered list of test modules to execute
        baseline_metrics: Historical performance baselines for comparison
        max_retries: Maximum retry attempts for transient test failures
        
    Returns:
        Regression report with pass/fail status, metric deltas, and flagged regressions
    """
    report = {"regressions": [], "metrics": {}, "status": "pending"}
    executed_tests = []
    
    for test_suite in test_suites:
        attempts = 0
        while attempts <= max_retries:
            try:
                result = _run_test_suite(test_suite)
                # Compare against baseline
                delta = _calculate_metric_delta(result, baseline_metrics.get(test_suite, {}))
                
                if delta["runtime_increase"] > 0.20 or delta["error_rate"] > 0.05:
                    report["regressions"].append({
                        "test": test_suite,
                        "type": "performance" if delta["runtime_increase"] > 0.20 else "functional",
                        "delta": delta
                    })
                    
                report["metrics"][test_suite] = result
                executed_tests.append(test_suite)
                break  # Success, move to next
                
            except FlakyTestError:
                attempts += 1
                if attempts > max_retries:
                    report["regressions"].append({"test": test_suite, "type": "flaky_timeout", "delta": {}})
                    break
                    
    report["status"] = "regression_detected" if report["regressions"] else "clean"
    return report
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