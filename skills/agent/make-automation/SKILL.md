---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent make automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: make-automation, make automation, how do i make-automation, orchestrate
    make-automation, automate make-automation, agent make-automation
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
name: make-automation
------
# Make Automation

Orchestrates intelligent skill selection and execution for make automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def resolve_make_automation_trigger(
    request_payload: Dict[str, Any],
    registered_automations: List[Dict[str, Any]],
    min_trigger_match: float = 0.75
) -> Optional[Dict[str, Any]]:
    """Resolve the optimal Make.com automation blueprint for a given request.
    
    Matches incoming payloads against registered automation triggers using
    event-type compatibility, historical success rates, and dependency health.
    """
    if not request_payload or not registered_automations:
        raise ValueError("Request payload and registered automations are required")
        
    trigger_type = request_payload.get("trigger_type", "webhook")
    event_data = request_payload.get("event", {})
    
    best_automation = None
    best_score = 0.0
    
    for automation in registered_automations:
        # Calculate trigger compatibility score
        trigger_match = _calculate_trigger_compatibility(trigger_type, automation["triggers"])
        history_score = automation.get("success_rate", 0.0) * 0.4
        dependency_health = _check_dependency_health(automation.get("dependencies", []))
        
        composite_score = (trigger_match * 0.5) + (history_score * 0.3) + (dependency_health * 0.2)
        
        if composite_score > best_score and composite_score >= min_trigger_match:
            best_score = composite_score
            best_automation = automation
            
    if best_automation is None:
        return None
        
    # Return immutable snapshot with execution metadata
    return {
        "automation_id": best_automation["id"],
        "trigger_config": best_automation["triggers"],
        "estimated_steps": len(best_automation["steps"]),
        "confidence": best_score,
        "resolved_at": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def run_make_automation_pipeline(
    automation_blueprint: Dict[str, Any],
    execution_context: Dict[str, Any],
    max_step_retries: int = 3
) -> Dict[str, Any]:
    """Execute a resolved Make automation pipeline with domain-specific fallback routing.
    
    Handles step-by-step execution, transient API failures, and fallback to 
    alternative automation routes or manual intervention when critical steps fail.
    """
    steps = automation_blueprint.get("steps", [])
    if not steps:
        raise ValueError("Automation blueprint contains no executable steps")
        
    execution_log = []
    current_context = dict(execution_context)
    
    for step_idx, step in enumerate(steps):
        step_name = step.get("name", f"step_{step_idx}")
        attempt = 0
        step_success = False
        
        while attempt < max_step_retries:
            try:
                # Execute step with domain-specific validation
                result = _execute_automation_step(step, current_context)
                current_context = _merge_step_output(current_context, result)
                step_success = True
                execution_log.append({"step": step_name, "status": "success", "attempt": attempt})
                break
                
            except RateLimitError:
                attempt += 1
                if attempt < max_step_retries:
                    time.sleep(2 ** attempt)  # Exponential backoff
                continue
                
            except CriticalDependencyError:
                # Fallback: Route to alternative automation or manual review
                fallback_route = _resolve_fallback_route(automation_blueprint, step)
                if fallback_route:
                    current_context = _execute_fallback_step(fallback_route, current_context)
                    execution_log.append({"step": step_name, "status": "fallback", "route": fallback_route["id"]})
                    step_success = True
                    break
                else:
                    raise PipelineExecutionError(f"Critical failure in {step_name} with no fallback")
                    
        if not step_success:
            raise PipelineExecutionError(f"Step {step_name} exhausted retries")
            
    # Update confidence based on execution metrics
    success_rate = len([l for l in execution_log if l["status"] == "success"]) / len(steps)
    return {
        "pipeline_id": automation_blueprint["automation_id"],
        "steps_executed": len(execution_log),
        "final_context": current_context,
        "confidence_delta": success_rate - automation_blueprint.get("confidence", 0.0),
        "execution_timestamp": time.time()
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