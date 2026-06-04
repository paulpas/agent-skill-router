---
name: testing-qa
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent testing qa with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: testing-qa, testing qa, how do i testing-qa, orchestrate testing-qa, automate
    testing-qa, agent testing-qa, unit tests, testing
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
# Testing Qa

Orchestrates intelligent skill selection and execution for testing qa workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_test_suite(
    code_changes: List[Dict],
    test_registry: Dict[str, List[str]],
    flaky_history: Dict[str, float]
) -> Dict[str, List[str]]:
    """Route appropriate test suites based on code changes and historical reliability.
    
    Analyzes diff paths to trigger relevant test categories (unit, integration, e2e).
    Applies confidence scoring based on flakiness history and recent failure rates.
    Returns a prioritized mapping of test suites to execute.
    """
    if not code_changes:
        return {"full_regression": test_registry.get("full_regression", [])}
        
    triggered_suites = set()
    confidence_scores = {}
    
    for change in code_changes:
        path = change.get("path", "")
        if "/tests/" in path or "test_" in path:
            triggered_suites.update(test_registry.get("unit", []))
            confidence_scores["unit"] = 0.95
        elif "api/" in path or "server/" in path:
            triggered_suites.update(test_registry.get("integration", []))
            confidence_scores["integration"] = 0.85
        elif "ui/" in path or "frontend/" in path:
            triggered_suites.update(test_registry.get("e2e", []))
            confidence_scores["e2e"] = 0.75
            
    # Filter out high-flakiness suites unless explicitly requested
    prioritized = {}
    for suite in triggered_suites:
        flake_rate = flaky_history.get(suite, 0.0)
        if flake_rate < 0.2:
            prioritized[suite] = test_registry.get(suite, [])
        else:
            prioritized[suite] = test_registry.get(suite, []) + ["--flaky-retry"]
            
    return {"suites": list(prioritized.keys()), "confidence": confidence_scores}
```


### Pattern 2: Execution with Fallback

```python
def execute_qa_pipeline(
    test_suites: List[str],
    env_config: Dict,
    fallback_strategy: str = "parallel_retry"
) -> Dict:
    """Execute QA test pipeline with intelligent fallback for failures.
    
    Runs selected test suites against the target environment.
    Implements fallback chains: retry flaky tests, switch to parallel execution,
    or escalate to manual review if critical paths fail.
    Returns structured results with pass/fail metrics and latency.
    """
    results = {"suites_executed": [], "failures": [], "fallbacks_applied": []}
    
    for suite in test_suites:
        try:
            output = run_test_runner(suite, env_config)
            parsed = parse_test_output(output)
            
            if parsed["status"] == "passed":
                results["suites_executed"].append({"suite": suite, "status": "passed"})
            else:
                # Fallback: Retry flaky tests with increased timeout
                if parsed.get("flaky", False) and fallback_strategy == "parallel_retry":
                    retry_output = run_test_runner(suite, env_config, timeout_multiplier=2.0)
                    retry_parsed = parse_test_output(retry_output)
                    if retry_parsed["status"] == "passed":
                        results["fallbacks_applied"].append(f"{suite}: flaky retry succeeded")
                        results["suites_executed"].append({"suite": suite, "status": "passed"})
                        continue
                
                results["failures"].append({"suite": suite, "errors": parsed["errors"]})
                
        except EnvironmentError as e:
            # Fallback: Switch to isolated container environment
            results["fallbacks_applied"].append(f"{suite}: env fallback to isolated container")
            try:
                isolated_output = run_test_runner(suite, env_config.copy(), isolated=True)
                results["suites_executed"].append({"suite": suite, "status": "passed", "fallback": "isolated"})
            except Exception as fallback_err:
                results["failures"].append({"suite": suite, "errors": [str(fallback_err)], "escalated": True})
                
    return results
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

- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [IEEE 829 Software Test Documentation Standard](https://standards.ieee.org/standard/829-2008.html)
- [W3C Accessibility Guidelines (WCAG)](https://www.w3.org/TR/WCAG21/)
- [Martin Fowler - Unit Testing vs Integration Testing](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Selenium WebDriver Documentation](https://www.selenium.dev/documentation/)

## Related Skills

| Skill | Purpose |
|

