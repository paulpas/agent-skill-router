---




name: api-security-testing
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent api security testing with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: api-security-testing, api security testing, how do i api-security-testing,
    orchestrate api-security-testing, automate api-security-testing, agent api-security-testing,
    unit tests, vulnerability scanning
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




# Api Security Testing

Orchestrates intelligent skill selection and execution for api security testing workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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

### Pattern 1: API Security Test Execution

```python
def run_api_security_scan(
    endpoint: str,
    method: str,
    auth_token: Optional[str],
    test_suite: List[Dict],
    fallback_strategy: str = "fuzz_override"
) -> Dict:
    """Execute API security tests with domain-specific fallback logic.
    
    Implements Law 1 (Early Exit) and Law 4 (Fail Fast) by validating
    endpoint structure and auth state before running payloads.
    Falls back to alternative test vectors when initial checks fail.
    """
    # Law 1: Early exit on invalid endpoint/auth
    if not endpoint or not method.upper() in ("GET", "POST", "PUT", "DELETE", "PATCH"):
        raise ValueError("Invalid endpoint or HTTP method")
        
    if not auth_token and method.upper() in ("POST", "PUT", "DELETE"):
        raise ValueError("Authenticated methods require valid token")
        
    results = []
    for test_case in test_suite:
        try:
            # Execute security payload against endpoint
            response = _execute_security_payload(endpoint, method, auth_token, test_case)
            
            # Law 3: Return new structure, never mutate test_case
            result_entry = {
                "test_id": test_case["id"],
                "status": response.status_code,
                "vulnerability_detected": _analyze_response_for_vulns(response),
                "payload_hash": hashlib.sha256(test_case["payload"].encode()).hexdigest()
            }
            results.append(result_entry)
            
        except ConnectionTimeoutError:
            # Law 4: Fail fast, don't retry indefinitely
            if fallback_strategy == "fuzz_override":
                result_entry = _run_fallback_fuzz_test(endpoint, method, test_case)
                results.append(result_entry)
            else:
                results.append({"test_id": test_case["id"], "status": "SKIPPED", "reason": "Fallback disabled"})
                
    return {
        "scan_id": uuid4().hex,
        "endpoint": endpoint,
        "tests_executed": len(results),
        "vulnerabilities_found": sum(1 for r in results if r.get("vulnerability_detected")),
        "results": results
    }
```


### Pattern 2: Security Confidence & Adaptive Routing

```python
def calculate_security_confidence(
    scan_results: Dict,
    historical_vuln_db: Dict[str, float],
    min_confidence_threshold: float = 0.75
) -> Dict:
    """Calculate confidence score for API security scan results.
    
    Uses historical vulnerability data and test coverage to determine
    if the scan is reliable or requires adaptive re-routing.
    Implements Law 2 (Make illegal states unrepresentable) by validating
    result structure before scoring.
    """
    # Law 2: Validate state
    if not scan_results.get("results"):
        return {"confidence": 0.0, "action": "RESCAN_REQUIRED", "reason": "No test results"}
        
    total_tests = len(scan_results["results"])
    passed_tests = sum(1 for r in scan_results["results"] if r.get("status") == 200)
    vuln_tests = sum(1 for r in scan_results["results"] if r.get("vulnerability_detected"))
    
    # Calculate coverage and historical alignment
    coverage_score = passed_tests / total_tests if total_tests > 0 else 0.0
    historical_match = historical_vuln_db.get(scan_results["endpoint"], 0.5)
    
    # Adaptive confidence calculation
    raw_confidence = (coverage_score * 0.6) + (historical_match * 0.4)
    
    if raw_confidence < min_confidence_threshold:
        return {
            "confidence": round(raw_confidence, 2),
            "action": "ADAPT_ROUTING",
            "next_steps": [
                "Increase payload diversity",
                "Enable authenticated fuzzing",
                "Switch to dynamic analysis engine"
            ]
        }
        
    return {
        "confidence": round(raw_confidence, 2),
        "action": "REPORT_READY",
        "vulnerability_summary": vuln_tests,
        "recommendation": "Deploy with monitoring" if vuln_tests == 0 else "Patch critical endpoints"
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
|---|---|
| `api-documentation` | API documentation and specification workflows |

---

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

- [OWASP Web Security Testing Guide v4](https://owasp.org/www-project-web-security-testing-guide/latest/)
- [Portswigger Web Security Academy](https://portswigger.net/web-security)
- [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/)
- [NIST SP 800-115 — Technical Guide to Information Security Testing](https://csrc.nist.gov/publications/detail/sp/800-115/final)
- [OWASP Testing Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Testing_Cheat_Sheet.html)