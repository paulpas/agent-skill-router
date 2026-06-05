---




name: andruia-consultant
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent andruia consultant with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: andruia-consultant, andruia consultant, how do i andruia-consultant, orchestrate
    andruia-consultant, automate andruia-consultant, agent andruia-consultant
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




# Andruia Consultant

Orchestrates intelligent skill selection and execution for andruia consultant workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_andruia_consultant_request(
    request: Dict[str, Any],
    consultant_pool: List[Dict[str, Any]],
    compliance_threshold: float = 0.85
) -> Optional[Dict[str, Any]]:
    """Evaluate and route an Andruia consultant request to the optimal specialist.
    
    Applies the 5 Laws of Elegant Defense:
    - Law 1: Early exit on malformed requests
    - Law 2: Parse request into structured domains before scoring
    - Law 3: Return immutable routing decision
    - Law 4: Fail immediately if compliance checks fail
    """
    if not request.get("domain") or not request.get("priority"):
        raise ValueError("Request must include 'domain' and 'priority' fields")
        
    parsed_request = {
        "domain": request["domain"].lower(),
        "priority": request["priority"],
        "risk_level": _assess_risk(request.get("context", "")),
        "compliance_flags": _extract_compliance_flags(request)
    }
    
    best_match = None
    best_score = 0.0
    
    for consultant in consultant_pool:
        if not _is_compliant(consultant, parsed_request["compliance_flags"]):
            continue
            
        domain_match = _calculate_domain_alignment(parsed_request["domain"], consultant["expertise"])
        priority_weight = 1.2 if parsed_request["priority"] == "critical" else 1.0
        score = domain_match * priority_weight * consultant["resolution_rate"]
        
        if score > best_score and score >= compliance_threshold:
            best_score = score
            best_match = consultant
            
    if best_match is None:
        return None
        
    return {
        "assigned_consultant": best_match["id"],
        "routing_score": best_score,
        "estimated_resolution": _estimate_timeline(best_match, parsed_request["priority"]),
        "immutable_decision": True
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_consultant_workflow(
    consultant: Dict[str, Any],
    workflow_context: Dict[str, Any],
    escalation_path: List[str] = None
) -> Dict[str, Any]:
    """Execute an Andruia consultant workflow with domain-specific fallbacks.
    
    Implements Fail Fast, Fail Loud (Law 4) and Atomic Predictability (Law 3).
    Fallback chain: 1. Retry with adjusted scope -> 2. Escalate to senior specialist -> 3. Defer to compliance board
    """
    if not _validate_consultant_credentials(consultant):
        raise ConsultantError(f"Invalid credentials for consultant {consultant['id']}")
        
    validated_context = _normalize_workflow_inputs(workflow_context)
    attempts = 0
    max_attempts = 2
    
    while attempts <= max_attempts:
        try:
            result = _run_consultant_analysis(consultant, validated_context)
            return {
                "status": "resolved",
                "consultant_id": consultant["id"],
                "output": result,
                "attempts": attempts + 1,
                "audit_trail": _log_execution(consultant, result)
            }
        except ComplianceViolationError as e:
            raise ConsultantError(f"Compliance violation in {consultant['id']}: {e}") from e
        except ScopeLimitError as e:
            attempts += 1
            if attempts > max_attempts:
                return _escalate_to_senior(consultant, validated_context, escalation_path)
            validated_context = _adjust_scope_for_retry(validated_context, e)
            
    return _defer_to_compliance_board(workflow_context)
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
| `andruia-skill-smith` | Agent skill creation and design patterns |

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

- [MIT Sloan — AI Consulting: Best Practices for the Digital Age](https://mitsloan.mit.edu/ideas-made-to-matter)
- [McKinsey Global Institute — Notes from AI Frontiers (2024)](https://www.mckinsey.com/mgi/our-research/artificial-intelligence)
- [Gartner Hype Cycle for Artificial Intelligence](https://www.gartner.com/en/articles/gartner-hype-cycle-for-artificial-intelligence)
- [Deloitte AI Institute — Enterprise AI Adoption Framework](https://www2.deloitte.com/us/en/insights/industry/technology/ai-insights.html)
- [Stanford HAI — AI Index Report 2024](https://hai.stanford.edu/news/ai-index-report-2024/)