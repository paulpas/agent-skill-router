---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent workflow orchestration patterns with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: workflow-orchestration-patterns, workflow orchestration patterns, how
    do i workflow-orchestration-patterns, orchestrate workflow-orchestration-patterns,
    automate workflow-orchestration-patterns, agent workflow-orchestration-patterns
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
name: workflow-orchestration-patterns
------
# Workflow Orchestration Patterns

Orchestrates intelligent skill selection and execution for workflow orchestration patterns workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def resolve_orchestration_pattern(
    workflow_request: Dict[str, Any],
    available_patterns: List[Dict[str, Any]],
    min_confidence: float = 0.75
) -> Optional[Dict[str, Any]]:
    """Map a raw workflow request to the optimal orchestration pattern.
    
    Evaluates request structure against known patterns (fan-out, fan-in, 
    sequential, parallel) using trigger matching, historical success rates,
    and current executor availability.
    """
    if not workflow_request.get("steps"):
        raise ValueError("Workflow request must contain at least one step")
    
    request_features = _extract_workflow_features(workflow_request)
    best_match = None
    best_score = 0.0
    
    for pattern in available_patterns:
        # Calculate composite score based on trigger overlap, historical success, and load
        trigger_match = _calculate_trigger_overlap(request_features, pattern["triggers"])
        historical_success = pattern.get("success_rate", 0.0)
        current_load = 1.0 - (pattern.get("active_executions", 0) / pattern.get("max_capacity", 10))
        
        score = (trigger_match * 0.5) + (historical_success * 0.3) + (current_load * 0.2)
        
        if score > best_score and score >= min_confidence:
            best_score = score
            best_match = pattern
            
    if best_match is None:
        return None
        
    # Return immutable snapshot with selection metadata
    return {
        "pattern_id": best_match["id"],
        "pattern_name": best_match["name"],
        "confidence": best_score,
        "selected_at": time.time(),
        "required_resources": best_match.get("resources", [])
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_workflow_step_with_resilience(
    step_config: Dict[str, Any],
    workflow_context: Dict[str, Any],
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute a specific workflow step with domain-aware fallback routing.
    
    Handles transient failures by adjusting concurrency, switching to 
    fallback executors, or escalating to manual review based on step criticality.
    """
    step_id = step_config.get("id", "unknown")
    criticality = step_config.get("criticality", "standard")
    
    if not _validate_step_prerequisites(step_config, workflow_context):
        raise WorkflowValidationError(f"Prerequisites not met for step {step_id}")
        
    for attempt in range(max_retries + 1):
        try:
            # Execute step with domain-specific timeout and resource allocation
            result = _run_step_executor(step_config, workflow_context)
            
            return {
                "step_id": step_id,
                "status": "completed",
                "output": result,
                "attempts": attempt + 1,
                "latency_ms": time.time() * 1000
            }
            
        except TransientExecutorError as e:
            if attempt < max_retries:
                # Adjust concurrency and retry
                workflow_context["concurrency"] = max(1, workflow_context.get("concurrency", 1) - 1)
                continue
            else:
                # Apply fallback chain based on criticality
                if criticality == "high":
                    return _route_to_manual_review(step_config, workflow_context)
                else:
                    return _execute_fallback_step(step_config, workflow_context)
                    
        except InvalidStateError as e:
            # Fail fast on corrupt state
            raise WorkflowValidationError(f"Invalid state in {step_id}: {e}") from e
            
    raise WorkflowExecutionError(f"All retries exhausted for step {step_id}")
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