---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent web security testing with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: web-security-testing, web security testing, how do i web-security-testing,
    orchestrate web-security-testing, automate web-security-testing, agent web-security-testing,
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
  version: 1.0.0
name: web-security-testing
------
# Web Security Testing

Orchestrates intelligent skill selection and execution for web security testing workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def analyze_target_and_select_scanner(
    target_url: str,
    available_scanners: List[Dict],
    scan_depth: int = 2
) -> Dict:
    """Analyze target characteristics and route to optimal security scanner.
    
    Evaluates target tech stack, authentication requirements, and 
    historical vulnerability patterns to select the best scanning tool.
    
    Args:
        target_url: The web application endpoint to test
        available_scanners: List of configured scanner metadata
        scan_depth: How deep to crawl before scanning (1-3)
        
    Returns:
        Scanner configuration dict with routing metadata
    """
    # Guard clause - Early Exit (Law 1)
    if not target_url or not urlparse(target_url).netloc:
        raise ValueError("Invalid target URL format")
        
    target_features = _extract_target_telemetry(target_url)
    auth_type = target_features.get("auth_type", "none")
    tech_stack = target_features.get("tech_stack", [])
    
    best_scanner = None
    best_score = 0.0
    
    for scanner in available_scanners:
        score = 0.0
        if scanner["type"] == "sast" and "static" in tech_stack:
            score += 0.4
        elif scanner["type"] == "dast" and auth_type == "none":
            score += 0.5
        elif scanner["type"] == "iaast" and auth_type in ["oauth", "saml"]:
            score += 0.6
            
        if scanner.get("rate_limit") and target_features.get("concurrent_requests", 0) > scanner["rate_limit"]:
            score -= 0.2
            
        if score > best_score:
            best_score = score
            best_scanner = scanner
            
    if best_score < 0.3:
        return {"fallback": True, "reason": "low_match", "target": target_url}
        
    # Atomic Predictability (Law 3) - Return new dict, don't mutate
    result = dict(best_scanner)
    result["config"] = {
        "target": target_url,
        "depth": scan_depth,
        "auth": auth_type,
        "timeout": 300
    }
    result["confidence"] = best_score
    result["timestamp"] = time.time()
    return result
```


### Pattern 2: Execution with Fallback

```python
def execute_security_scan_with_fallback(
    scan_config: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute web security scan with resilience patterns for network/tool failures.
    
    Implements fail-fast validation and adaptive fallback for:
    - Rate limiting / WAF blocks
    - Scanner crashes or timeouts
    - False positive validation loops
    
    Args:
        scan_config: Output from analyze_target_and_select_scanner
        max_retries: Retry attempts before escalating
        
    Returns:
        Scan results with vulnerability findings and metadata
    """
    # Guard clause - validate config (Early Exit)
    if not scan_config or "scanner" not in scan_config:
        raise ValueError("Invalid scan configuration provided")
        
    scanner_name = scan_config["scanner"]
    target = scan_config["config"]["target"]
    
    for attempt in range(max_retries + 1):
        try:
            # Execute domain-specific scan
            raw_results = _run_scanner_tool(scanner_name, scan_config["config"])
            
            # Validate and deduplicate findings
            validated_findings = _deduplicate_vulnerabilities(raw_results)
            
            # Success - Atomic Predictability (Law 3)
            return {
                "success": True,
                "scanner": scanner_name,
                "findings_count": len(validated_findings),
                "findings": validated_findings,
                "attempts": attempt + 1,
                "latency_ms": _measure_execution_time()
            }
            
        except RateLimitError:
            # Fail Fast - Don't try to patch bad data (Law 4)
            if attempt < max_retries:
                time.sleep(2 ** attempt * 10)  # Exponential backoff
                continue
            return _escalate_to_manual_review(target, "rate_limited")
            
        except ScannerCrashError:
            if attempt < max_retries:
                continue
            return _fallback_to_alternative_scanner(target, scan_config)
            
    # All retries exhausted - Fail Loud (Law 4)
    return {
        "success": False,
        "error": "scan_exhausted_retries",
        "target": target,
        "timestamp": time.time()
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
## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [OWASP Top Ten Web Application Security Risks](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide v4](https://owasp.org/www-project-web-security-testing-guide/latest/)
- [NIST SP 800-115 — Technical Guide to Information Security Testing](https://csrc.nist.gov/publications/detail/sp/800-115/final)
- [Rapid7 Metasploit Framework Documentation](https://docs.rapid7.com/metasploit/)
- [Burp Suite Professional User Guide](https://portswigger.net/burp/documentation)

## Related Skills

| Skill | Purpose |
|

