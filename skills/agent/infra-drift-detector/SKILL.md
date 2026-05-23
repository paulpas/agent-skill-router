---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent infra drift detector with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: infra-drift-detector, infra drift detector, how do i infra-drift-detector,
    orchestrate infra-drift-detector, automate infra-drift-detector, agent infra-drift-detector
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
name: infra-drift-detector
------
# Infra Drift Detector

Orchestrates intelligent skill selection and execution for infra drift detector workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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

### Pattern 1: Drift State Comparison & Scoring

```python
def evaluate_drift_state(
    desired_state: Dict[str, Any],
    current_state: Dict[str, Any],
    drift_threshold: float = 0.85
) -> Dict[str, Any]:
    """Evaluate infrastructure drift between desired and current state.
    
    Implements Law 2 (Parse at boundary) by validating IaC formats before diffing.
    Implements Law 1 (Early Exit) by returning immediately on schema mismatches.
    
    Args:
        desired_state: Parsed Terraform/CloudFormation/Policy state
        current_state: Live cloud provider state or last known snapshot
        drift_threshold: Minimum confidence to trigger auto-remediation
        
    Returns:
        Drift analysis dict with severity, affected resources, and confidence
    """
    # Law 1: Early exit on invalid state formats
    if not _validate_state_schema(desired_state) or not _validate_state_schema(current_state):
        raise ValueError("Invalid state format: expected Terraform/CloudFormation schema")
        
    # Law 2: Parse inputs at boundary - extract resource IDs and attributes
    desired_resources = _extract_resources(desired_state)
    current_resources = _extract_resources(current_state)
    
    drift_report = {
        "total_resources": len(desired_resources),
        "drifted_resources": [],
        "confidence_score": 0.0,
        "severity": "low"
    }
    
    for res_id, desired_attrs in desired_resources.items():
        current_attrs = current_resources.get(res_id, {})
        match_ratio = _calculate_attribute_similarity(desired_attrs, current_attrs)
        
        if match_ratio < drift_threshold:
            drift_report["drifted_resources"].append({
                "resource_id": res_id,
                "match_ratio": match_ratio,
                "missing_attrs": set(desired_attrs.keys()) - set(current_attrs.keys())
            })
            
    # Law 3: Atomic predictability - return new structure
    drift_report["confidence_score"] = _compute_overall_confidence(drift_report["drifted_resources"])
    drift_report["severity"] = "critical" if len(drift_report["drifted_resources"]) > 5 else "moderate"
    return drift_report
```


### Pattern 2: Drift Execution & Remediation Routing

```python
def execute_drift_response(
    drift_report: Dict[str, Any],
    routing_config: Dict[str, Any],
    fallback_handlers: List[str] = None
) -> Dict[str, Any]:
    """Execute response workflow for detected infrastructure drift.
    
    Implements Law 4 (Fail Fast/Loud) by halting on missing remediation configs.
    Implements fallback chain: auto-remediate -> alert -> defer to human.
    
    Args:
        drift_report: Output from evaluate_drift_state
        routing_config: Maps severity levels to execution pipelines
        fallback_handlers: Ordered list of fallback skill names
        
    Returns:
        Execution result with applied actions and audit trail
    """
    # Law 1: Early exit if no drift detected
    if not drift_report.get("drifted_resources"):
        return {"status": "clean", "actions_taken": [], "audit_log": []}
        
    # Law 2: Parse routing config at boundary
    pipeline = routing_config.get(drift_report["severity"], routing_config.get("default"))
    if not pipeline:
        raise ValueError(f"No execution pipeline configured for severity: {drift_report['severity']}")
        
    audit_log = []
    actions_taken = []
    
    for step in pipeline.get("steps", []):
        try:
            # Law 4: Fail immediately on invalid step config
            if not _validate_step_config(step):
                raise ValueError(f"Invalid step configuration: {step.get('id')}")
                
            result = _execute_drift_step(step, drift_report)
            actions_taken.append(result)
            audit_log.append({"step": step["id"], "status": "success", "timestamp": time.time()})
            
        except TransientAPIError:
            # Fallback chain: retry -> alternative handler -> human
            if fallback_handlers:
                audit_log.append({"step": step["id"], "status": "fallback_triggered", "timestamp": time.time()})
                return _apply_drift_fallback(fallback_handlers, drift_report, audit_log)
            raise
            
    # Law 3: Return immutable result structure
    return {
        "status": "completed",
        "actions_taken": actions_taken,
        "audit_log": audit_log,
        "drift_resolved": len(actions_taken) == len(drift_report["drifted_resources"])
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
|