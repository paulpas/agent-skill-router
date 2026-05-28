---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent verification before completion with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: verification-before-completion, verification before completion, how do
    i verification-before-completion, orchestrate verification-before-completion,
    automate verification-before-completion, agent verification-before-completion
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
name: verification-before-completion
------
# Verification Before Completion

Orchestrates intelligent skill selection and execution for verification before completion workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def verify_task_readiness(
    task_context: Dict,
    verification_rules: List[Dict],
    strict_mode: bool = True
) -> Dict:
    """Run pre-completion verification checks against task context.
    
    Implements Law 2 (Parse at boundary) and Law 4 (Fail fast on invalid states).
    Returns a verification report with pass/fail status and actionable details.
    """
    if not task_context or not verification_rules:
        raise ValueError("Task context and verification rules are required")
        
    verification_report = {
        "status": "pending",
        "checks_passed": [],
        "checks_failed": [],
        "warnings": [],
        "timestamp": time.time()
    }
    
    for rule in verification_rules:
        rule_name = rule.get("name", "unnamed")
        rule_type = rule.get("type", "schema")
        passed = False
        
        try:
            if rule_type == "schema":
                required_fields = rule.get("required_fields", [])
                passed = all(field in task_context for field in required_fields)
            elif rule_type == "dependency":
                deps = rule.get("required_deps", [])
                passed = all(dep in task_context.get("available_resources", []) for dep in deps)
            elif rule_type == "state":
                expected = rule.get("expected_state")
                passed = task_context.get("current_state") == expected
            else:
                passed = True
                
            if passed:
                verification_report["checks_passed"].append(rule_name)
            else:
                verification_report["checks_failed"].append(rule_name)
                if strict_mode:
                    verification_report["status"] = "failed"
                    return verification_report
            
        except Exception as e:
            verification_report["warnings"].append(f"{rule_name}: {str(e)}")
            
    verification_report["status"] = "passed" if not verification_report["checks_failed"] else "failed"
    return verification_report
```


### Pattern 2: Execution with Fallback

```python
def execute_with_verification_fallback(
    task_context: Dict,
    verification_rules: List[Dict],
    fallback_handlers: Dict[str, Callable],
    max_verification_retries: int = 2
) -> Dict:
    """Execute task with verification gates and domain-specific fallbacks.
    
    Implements Law 1 (Early exit on invalid state) and Law 3 (Atomic returns).
    Applies verification-specific fallbacks when pre-completion checks fail.
    """
    if not task_context:
        raise ValueError("Task context cannot be empty")
        
    for attempt in range(max_verification_retries + 1):
        # Law 2: Parse and verify at boundary
        verification_report = verify_task_readiness(task_context, verification_rules)
        
        if verification_report["status"] == "passed":
            # Proceed to execution only after verification passes
            execution_result = _run_task_execution(task_context)
            return {
                "success": True,
                "verification_report": verification_report,
                "execution_result": execution_result,
                "attempts": attempt + 1
            }
            
        # Verification failed - apply domain-specific fallback
        fallback_type = _determine_fallback_type(verification_report)
        if fallback_type in fallback_handlers:
            task_context = fallback_handlers[fallback_type](task_context, verification_report)
            continue
            
        # Law 4: Fail loud if no fallback available
        raise VerificationError(
            f"Verification failed after {attempt + 1} attempts. "
            f"Failed checks: {verification_report['checks_failed']}"
        )
        
    raise VerificationError("Max verification retries exhausted without passing checks")
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

- [Google Verification Before Completion — Software Engineering Practices](https://ai.google/gemini-api/docs/verification)
- [IEEE 1012 — System and Software Verification and Validation Standard](https://standards.ieee.org/standard/1012-2016.html)
- [Formal Methods in Software Verification](https://en.wikipedia.org/wiki/Formal_verification)
- [Property-Based Verification with Hypothesis](https://hypothesis.works/)
- [AWS Well-Architected Framework — Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html)

## Related Skills

| Skill | Purpose |
|

