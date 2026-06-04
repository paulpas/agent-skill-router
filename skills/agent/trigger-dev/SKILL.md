---




name: trigger-dev
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent trigger dev with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: trigger-dev, trigger dev, how do i trigger-dev, orchestrate trigger-dev,
    automate trigger-dev, agent trigger-dev
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




# Trigger Dev

Orchestrates intelligent skill selection and execution for trigger dev workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_trigger_event(
    event_payload: Dict[str, Any],
    registered_workflows: List[Dict[str, Any]],
    event_schema: Dict[str, Any]
) -> Dict[str, Any]:
    """Route incoming trigger events to the appropriate workflow handler.
    
    Validates event schema, extracts trigger metadata, and matches
    against registered workflow definitions using payload signatures
    and scheduling constraints. Implements early validation and
    immutable routing decisions.
    
    Args:
        event_payload: Raw event data from webhook, schedule, or queue
        registered_workflows: List of available workflow configurations
        event_schema: JSON schema for payload validation
        
    Returns:
        Routing decision with matched workflow, execution context, and priority
    """
    # Guard clause - validate payload structure (Law 1)
    if not event_payload or not isinstance(event_payload, dict):
        raise ValueError("Event payload must be a non-empty dictionary")
        
    # Parse and validate against schema (Law 2)
    try:
        validated_payload = json.loads(json.dumps(event_payload))
        jsonschema.validate(instance=validated_payload, schema=event_schema)
    except jsonschema.ValidationError as e:
        raise ValueError(f"Invalid trigger payload: {e.message}") from e
        
    # Extract trigger signature and metadata
    trigger_type = validated_payload.get("type")
    source = validated_payload.get("source")
    timestamp = validated_payload.get("timestamp", time.time())
    
    # Match against registered workflows
    matched_workflows = []
    for wf in registered_workflows:
        if wf.get("trigger_type") == trigger_type and wf.get("source") == source:
            score = _calculate_workflow_match_score(validated_payload, wf)
            matched_workflows.append({
                "workflow_id": wf["id"],
                "match_score": score,
                "config": wf
            })
            
    if not matched_workflows:
        return {"status": "unrouted", "reason": "no_matching_workflow"}
        
    # Sort by match score and select optimal workflow
    matched_workflows.sort(key=lambda x: x["match_score"], reverse=True)
    selected = matched_workflows[0]
    
    # Return immutable routing decision (Law 3)
    return {
        "status": "routed",
        "workflow_id": selected["workflow_id"],
        "priority": selected["match_score"],
        "execution_context": {
            "payload": validated_payload,
            "trigger_type": trigger_type,
            "timestamp": timestamp,
            "routing_metadata": {
                "matched_count": len(matched_workflows),
                "selected_score": selected["match_score"]
            }
        }
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_trigger_job(
    workflow_config: Dict[str, Any],
    execution_context: Dict[str, Any],
    fallback_handlers: List[Callable],
    max_retries: int = 3
) -> Dict[str, Any]:
    """Execute a trigger-based workflow with built-in retry and fallback routing.
    
    Orchestrates step execution, handles transient failures with exponential
    backoff, and routes to fallback handlers when primary execution fails.
    Implements fail-fast validation and immutable result reporting.
    
    Args:
        workflow_config: Workflow definition with steps and trigger config
        execution_context: Validated payload and routing metadata
        fallback_handlers: List of alternative execution paths or error handlers
        max_retries: Maximum retry attempts for transient failures
        
    Returns:
        Execution result with status, timing, step history, and fallback status
    """
    # Guard clause - validate workflow structure (Law 1)
    required_keys = {"id", "steps", "trigger_type"}
    if not all(key in workflow_config for key in required_keys):
        raise ValueError("Workflow config missing required keys: id, steps, trigger_type")
        
    # Parse execution context immutably (Law 2)
    job_id = f"job_{workflow_config['id']}_{uuid4().hex[:8]}"
    step_history = []
    current_payload = dict(execution_context["payload"])
    
    # Execute workflow steps with retry logic
    for step_idx, step in enumerate(workflow_config["steps"]):
        attempt = 0
        step_success = False
        
        while attempt <= max_retries and not step_success:
            try:
                # Execute step with timeout and validation
                result = _run_step(step, current_payload, timeout=30)
                
                # Validate step output before proceeding
                if not _validate_step_output(result, step.get("output_schema")):
                    raise ValueError(f"Step {step_idx} produced invalid output")
                    
                step_history.append({
                    "step": step["name"],
                    "status": "success",
                    "attempts": attempt + 1,
                    "output": result
                })
                current_payload = result
                step_success = True
                
            except TransientError as e:
                attempt += 1
                if attempt > max_retries:
                    raise
                # Exponential backoff for transient failures
                backoff = min(2 ** attempt * 0.5, 10.0)
                time.sleep(backoff)
                
        if not step_success:
            # Step failed permanently - route to fallback
            fallback_result = _apply_fallback_chain(step, current_payload, fallback_handlers)
            step_history.append({
                "step": step["name"],
                "status": "fallback_applied",
                "fallback_result": fallback_result
            })
            
    # Return immutable execution report (Law 3)
    return {
        "job_id": job_id,
        "status": "completed",
        "steps_executed": len(step_history),
        "step_history": step_history,
        "final_payload": current_payload,
        "timing": {
            "started_at": execution_context["timestamp"],
            "completed_at": time.time(),
            "total_duration_ms": (time.time() - execution_context["timestamp"]) * 1000
        }
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

- [JSON Schema Validation Specification](https://json-schema.org/understanding-json-schema/)
- [CloudEvents Specification — Event Data Format](https://cloudevents.io/)
- [RFC 5424 — The Syslog Protocol](https://datatracker.ietf.org/doc/html/rfc5424)
- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions)
- [Webhook.site Documentation](https://webhook.site/)

## Related Skills

| Skill | Purpose |
|

