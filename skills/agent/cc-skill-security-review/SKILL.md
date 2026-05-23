---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent cc skill security review with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: cc-skill-security-review, cc skill security review, how do i cc-skill-security-review,
    orchestrate cc-skill-security-review, automate cc-skill-security-review, agent
    cc-skill-security-review, vulnerability scanning, security
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
name: cc-skill-security-review
------
# Cc Skill Security Review

Orchestrates intelligent skill selection and execution for cc skill security review workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_security_rules(
    target_language: str,
    code_context: Dict[str, Any],
    available_rules: List[SecurityRule]
) -> List[SecurityRule]:
    """Select relevant security rules based on target language and code context.
    
    Implements multi-factor scoring for rule selection:
    - Language/framework compatibility
    - Historical vulnerability density for similar codebases
    - Rule coverage vs. performance overhead
    
    Args:
        target_language: Programming language or framework identifier
        code_context: Parsed code structure and configuration metadata
        available_rules: List of available security rule definitions
        
    Returns:
        Filtered and sorted list of applicable security rules
    """
    # Law 1 & 2: Guard clauses and input validation
    if not target_language or not isinstance(target_language, str):
        raise ValueError("Target language must be a non-empty string")
    if not available_rules:
        raise ValueError("At least one security rule must be provided")
        
    selected = []
    for rule in available_rules:
        score = 0.0
        # Factor 1: Language match
        if target_language in rule.supported_languages:
            score += 0.5
        # Factor 2: Context relevance (e.g., detects auth bypass in web frameworks)
        if _matches_context(rule, code_context):
            score += 0.3
        # Factor 3: Historical effectiveness
        score += rule.historical_detection_rate * 0.2
            
        if score >= rule.min_confidence_threshold:
            selected.append(rule)
            
    # Sort by relevance score descending
    selected.sort(key=lambda r: r.historical_detection_rate, reverse=True)
    return selected
```


### Pattern 2: Execution with Fallback

```python
def execute_security_scan(
    target_code: str,
    selected_rules: List[SecurityRule],
    fallback_strategy: str = "dynamic_analysis"
) -> SecurityReport:
    """Execute security scan with fallback chain for resilience.
    
    Implements Fail Fast, Fail Loud (Law 4):
    - Invalid code structures halt immediately
    - Fallback to alternative analysis methods if static analysis fails
    
    Args:
        target_code: Source code or configuration to analyze
        selected_rules: Pre-filtered security rules to apply
        fallback_strategy: Method to use if primary analysis fails
        
    Returns:
        Immutable SecurityReport with findings and risk assessment
    """
    if not target_code or not selected_rules:
        raise ValueError("Code and rules are required for scanning")
        
    findings = []
    scan_attempts = 0
    
    try:
        # Primary: Static Analysis
        static_results = _run_static_analysis(target_code, selected_rules)
        findings.extend(static_results)
        scan_attempts += 1
        
    except ParseError as e:
        # Fallback 1: Dynamic Analysis / Runtime Inspection
        if fallback_strategy == "dynamic_analysis":
            findings.extend(_run_dynamic_analysis(target_code, selected_rules))
            scan_attempts += 1
        else:
            raise ScanExecutionError(f"Static analysis failed: {e}") from e
            
    except TimeoutError:
        # Fallback 2: Rule subset reduction & retry
        findings.extend(_run_reduced_rule_scan(target_code, selected_rules[:5]))
        scan_attempts += 1
        
    # Law 3: Return new data structure, never mutate inputs
    report = SecurityReport(
        findings=findings,
        scan_attempts=scan_attempts,
        status="CRITICAL" if any(f.severity == "HIGH" for f in findings) else "PASS"
    )
    
    # Law 4: Fail loud on critical vulnerabilities
    if report.status == "CRITICAL":
        raise CriticalSecurityViolation(report)
        
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