---
name: audit-context-building
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent audit context building with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: audit-context-building, audit context building, how do i audit-context-building,
    orchestrate audit-context-building, automate audit-context-building, agent audit-context-building
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
# Audit Context Building

Orchestrates intelligent skill selection and execution for audit context building workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def build_audit_context(
    request: Dict,
    available_audit_skills: List[Dict],
    compliance_frameworks: List[str] = ["SOC2", "ISO27001", "GDPR"]
) -> Dict:
    """Build structured audit context by scoring and routing to relevant compliance skills.
    
    Applies Law 1 (Early Exit) and Law 2 (Make Illegal States Unrepresentable)
    by validating request structure and framework availability before scoring.
    """
    if not request.get("target_system") or not request.get("audit_scope"):
        raise ValueError("Audit context requires target_system and audit_scope")
        
    if not available_audit_skills:
        raise ValueError("No audit skills registered in registry")
        
    # Extract audit features (Law 2)
    scope_features = _extract_scope_features(request["audit_scope"])
    system_metadata = _fetch_system_metadata(request["target_system"])
    
    scored_candidates = []
    for skill in available_audit_skills:
        # Multi-factor scoring: framework match, historical accuracy, system compatibility
        framework_match = 1.0 if any(f in skill.get("frameworks", []) for f in compliance_frameworks) else 0.0
        historical_accuracy = skill.get("success_rate", 0.5)
        system_compat = 1.0 if system_metadata.get("type") in skill.get("supported_systems", []) else 0.0
        
        weighted_score = (framework_match * 0.4) + (historical_accuracy * 0.4) + (system_compat * 0.2)
        
        if weighted_score >= 0.6:
            scored_candidates.append({
                "skill_id": skill["id"],
                "score": weighted_score,
                "frameworks": skill["frameworks"],
                "estimated_latency_ms": skill.get("latency_ms", 500)
            })
            
    # Law 3: Return new structure, never mutate input
    audit_context = {
        "request_id": request.get("id", str(uuid.uuid4())),
        "target_system": request["target_system"],
        "scope": request["audit_scope"],
        "candidates": sorted(scored_candidates, key=lambda x: x["score"], reverse=True),
        "timestamp": time.time(),
        "frameworks_applied": compliance_frameworks
    }
    return audit_context
```


### Pattern 2: Execution with Fallback

```python
def execute_audit_workflow_with_fallback(
    audit_context: Dict,
    skill_registry: Dict,
    fallback_handlers: Dict[str, Callable]
) -> Dict:
    """Execute audit skill chain with resilience patterns and full audit trail.
    
    Implements Law 4 (Fail Fast, Fail Loud) and Law 5 (Audit Trail) by
    logging every state transition, handling transient compliance check failures,
    and routing to fallback handlers when primary audit steps fail.
    """
    execution_log = []
    results = {}
    
    for candidate in audit_context["candidates"]:
        skill_id = candidate["skill_id"]
        skill = skill_registry.get(skill_id)
        
        if not skill:
            execution_log.append({"step": skill_id, "status": "MISSING", "error": "Skill not in registry"})
            continue
            
        try:
            # Execute primary audit step
            raw_result = skill["handler"](audit_context["target_system"], audit_context["scope"])
            
            # Validate result structure (Law 4)
            if not _validate_audit_result(raw_result):
                raise AuditValidationError(f"Invalid compliance data from {skill_id}")
                
            results[skill_id] = {
                "status": "SUCCESS",
                "data": raw_result,
                "confidence": candidate["score"],
                "latency_ms": raw_result.get("execution_time_ms", 0)
            }
            execution_log.append({"step": skill_id, "status": "SUCCESS", "timestamp": time.time()})
            
        except TransientNetworkError:
            # Fallback chain: retry -> alternative skill -> manual review
            execution_log.append({"step": skill_id, "status": "RETRYING", "timestamp": time.time()})
            try:
                alt_result = fallback_handlers.get("retry", lambda *a, **k: None)(skill_id, audit_context)
                results[skill_id] = {"status": "FALLBACK_RETRY", "data": alt_result}
            except Exception as e:
                results[skill_id] = {"status": "MANUAL_REVIEW", "error": str(e)}
                execution_log.append({"step": skill_id, "status": "MANUAL_REVIEW", "error": str(e)})
                
    # Law 5: Compile final audit context with full trail
    return {
        "audit_context_id": audit_context["request_id"],
        "executed_skills": results,
        "execution_log": execution_log,
        "overall_confidence": sum(r.get("confidence", 0) for r in results.values()) / max(len(results), 1),
        "generated_at": time.time()
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
| `code-correctness-verifier` | Code verification and correctness analysis |

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

- [IIA International Standards for the Professional Practice of Internal Auditing](https://www.theiia.org/en/us/Pages/International-Standards-for-the-Professional-Practice-of-Internal-Auditing.aspx)
- [Wikipedia — Auditing (Overview)](https://en.wikipedia.org/wiki/Auditing)
- [ISO 19011:2018 — Guidelines for Auditing Management Systems](https://www.iso.org/standard/65076.html)
- [COBIT 2019 Framework — IT Governance & Audit](https://isaca.my.site.com/ispaus/s/cobit-2019-overview)
- [NIST SP 800-53 Rev. 5 — Security & Privacy Controls for Audit](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)