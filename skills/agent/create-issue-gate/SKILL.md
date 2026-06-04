---
name: create-issue-gate
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent create issue gate with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: create-issue-gate, create issue gate, how do i create-issue-gate, orchestrate
    create-issue-gate, automate create-issue-gate, agent create-issue-gate
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
# Create Issue Gate

Orchestrates intelligent skill selection and execution for create issue gate workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_issue_gate(
    request: Dict[str, Any],
    gate_rules: List[Dict],
    available_trackers: List[Dict]
) -> Optional[Dict]:
    """Gate evaluation for issue creation requests.
    
    Validates request against gate rules, scores available issue trackers,
    and selects the optimal routing path based on project mapping and reliability.
    """
    # Law 1: Early exit on malformed request
    if not request.get("title") or not request.get("project_key"):
        raise ValueError("Issue gate requires 'title' and 'project_key'")
        
    # Law 2: Parse & validate against gate rules
    validated_request = _parse_issue_request(request)
    for rule in gate_rules:
        if not _check_gate_rule(validated_request, rule):
            return {"status": "blocked", "reason": f"Failed gate rule: {rule['id']}"}
            
    # Score trackers based on project mapping & historical success
    best_tracker = None
    best_score = 0.0
    for tracker in available_trackers:
        score = _calculate_tracker_match(validated_request, tracker)
        if score > best_score and score >= 0.75:
            best_score = score
            best_tracker = tracker
            
    if not best_tracker:
        return {"status": "unroutable", "reason": "No tracker meets minimum gate threshold"}
        
    # Law 3: Return new structure, don't mutate inputs
    return {
        "status": "routed",
        "selected_tracker": dict(best_tracker),
        "confidence": best_score,
        "validated_request": validated_request
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_issue_creation_with_fallback(
    tracker_skill: Dict,
    validated_request: Dict,
    fallback_trackers: List[Dict]
) -> Dict:
    """Execute issue creation with multi-level fallback chain.
    
    Implements resilient issue submission: primary tracker -> alternative -> manual queue.
    """
    max_retries = 2
    attempt = 0
    
    while attempt <= max_retries:
        try:
            # Law 4: Fail fast on auth/config errors
            if not _validate_tracker_config(tracker_skill):
                raise ConfigurationError(f"Tracker {tracker_skill['id']} misconfigured")
                
            result = _call_tracker_api(tracker_skill, validated_request)
            return {
                "success": True,
                "issue_id": result.get("id"),
                "url": result.get("url"),
                "tracker": tracker_skill["id"],
                "attempts": attempt + 1
            }
            
        except RateLimitError:
            attempt += 1
            if attempt > max_retries:
                break
            time.sleep(2 ** attempt)
            
    # Fallback chain exhausted -> try alternative trackers
    for alt in fallback_trackers:
        try:
            result = _call_tracker_api(alt, validated_request)
            return {
                "success": True,
                "issue_id": result.get("id"),
                "url": result.get("url"),
                "tracker": alt["id"],
                "fallback_used": True
            }
        except Exception:
            continue
            
    # Final fallback: queue for manual review
    return {
        "success": False,
        "status": "queued_for_manual_review",
        "reason": "All automated trackers failed",
        "request": validated_request
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

- [GitHub Issues API Reference](<https://docs.github.com/en/rest/issues>)
- [Issue Templates (GitHub Docs)](<https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms>)
- [Jira Issue Management Guide](<https://www.atlassian.com/agile/project-management/issues>)
- [Issue Triage Best Practices (GitHub)](<https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects>)
- [Project Board Automation Rules](<https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-sticky-sheets/automating-your-project>)

## Related Skills

| Skill | Purpose |
|