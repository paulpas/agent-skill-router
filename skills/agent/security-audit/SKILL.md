---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent security audit with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: security-audit, security audit, how do i security-audit, orchestrate security-audit,
    automate security-audit, agent security-audit, vulnerability scanning, security
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
name: security-audit
------
# Security Audit

Orchestrates intelligent skill selection and execution for security audit workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def build_security_audit_plan(
    target_url: str,
    scan_type: str,
    available_tools: List[Dict],
    compliance_frameworks: List[str] = ["OWASP", "NIST"]
) -> Dict:
    """Construct a security audit execution plan based on target and compliance requirements.
    
    Maps security requirements to specific scanning tools and configurations.
    Implements Law 2: Parse inputs at boundary to ensure valid audit targets.
    """
    if not target_url or not scan_type:
        raise ValueError("Target URL and scan type are required for security audit")
        
    # Validate target against allowed protocols and domains
    parsed_target = _validate_security_target(target_url)
    
    # Map scan type to compatible tools (Law 3: Return new structures)
    tool_candidates = [
        tool for tool in available_tools 
        if tool["type"] == scan_type and tool["status"] == "healthy"
    ]
    
    if not tool_candidates:
        return {
            "plan_status": "incomplete",
            "reason": f"No healthy {scan_type} tools available",
            "fallback_tools": [t["name"] for t in available_tools if t["status"] == "maintenance"]
        }
        
    # Build audit configuration with compliance mappings
    audit_config = {
        "target": parsed_target,
        "scan_type": scan_type,
        "selected_tool": tool_candidates[0]["name"],
        "compliance_checks": compliance_frameworks,
        "timeout_seconds": 3600,
        "output_format": "json"
    }
    
    return audit_config
```


### Pattern 2: Execution with Fallback

```python
def execute_security_scan(
    audit_plan: Dict,
    scan_credentials: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute a security scan with domain-specific error handling and result parsing.
    
    Implements Law 4: Fail fast on credential/auth failures, don't retry blindly.
    Handles transient network issues common in external vulnerability scanners.
    """
    tool_name = audit_plan["selected_tool"]
    target = audit_plan["target"]
    
    for attempt in range(max_retries + 1):
        try:
            # Execute domain-specific scan command
            scan_output = _run_security_tool(
                tool=tool_name,
                target=target,
                credentials=scan_credentials,
                config=audit_plan
            )
            
            # Parse and validate scan results (Law 2: Ensure trusted state)
            parsed_vulns = _parse_vulnerability_report(scan_output)
            
            return {
                "status": "completed",
                "tool_used": tool_name,
                "vulnerabilities_found": len(parsed_vulns),
                "critical_count": sum(1 for v in parsed_vulns if v["severity"] == "critical"),
                "report_path": _save_audit_report(parsed_vulns),
                "attempts": attempt + 1
            }
            
        except AuthFailureError:
            # Law 4: Fail immediately on auth issues, no retries
            raise SecurityAuditError("Authentication failed for security scan. Verify credentials.")
            
        except TimeoutError:
            # Transient network/tool timeout - retry with adjusted timeout
            if attempt == max_retries:
                return {
                    "status": "fallback_triggered",
                    "reason": "Scan timeout exceeded",
                    "fallback_action": "delegate_to_manual_penetration_test"
                }
                
    raise SecurityAuditError(f"Scan failed for {tool_name} after {max_retries + 1} attempts")
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