---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent zoom automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: zoom-automation, zoom automation, how do i zoom-automation, orchestrate
    zoom-automation, automate zoom-automation, agent zoom-automation
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
name: zoom-automation
------
# Zoom Automation

Orchestrates intelligent skill selection and execution for zoom automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_zoom_request(
    user_intent: str,
    zoom_client: ZoomClient,
    calendar_service: CalendarService
) -> Dict[str, Any]:
    """Route a natural language request to specific Zoom API operations.
    
    Extracts Zoom-specific entities (meeting_type, duration, participants, recording)
    and maps them to the appropriate SDK method. Implements early validation
    for required Zoom parameters before API dispatch.
    """
    # Early exit: validate required context
    if not user_intent or not zoom_client.is_authenticated():
        raise ValueError("Missing intent or Zoom authentication context")
        
    # Parse Zoom-specific parameters
    parsed_params = _extract_zoom_entities(user_intent)
    
    # Validate against Zoom API constraints
    if parsed_params.get("duration", 0) > 240:
        raise ValueError("Zoom meetings cannot exceed 240 minutes")
        
    # Route to specific Zoom operation
    operation_map = {
        "schedule": zoom_client.schedule_meeting,
        "join": zoom_client.generate_join_url,
        "record": zoom_client.start_recording,
        "invite": calendar_service.send_calendar_invite
    }
    
    target_op = operation_map.get(parsed_params["action"])
    if not target_op:
        raise ValueError(f"No matching Zoom operation for intent: {parsed_params['action']}")
        
    # Return structured execution plan (immutable)
    return {
        "operation": parsed_params["action"],
        "params": dict(parsed_params),
        "target_method": target_op.__name__,
        "requires_calendar_sync": parsed_params.get("send_invite", False)
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_zoom_operation(
    operation_plan: Dict[str, Any],
    zoom_client: ZoomClient,
    fallback_handler: FallbackHandler
) -> Dict[str, Any]:
    """Execute a mapped Zoom API operation with domain-specific fallback chains.
    
    Handles Zoom rate limits (429), token expiration (401), and meeting state conflicts.
    Implements graceful degradation: e.g., if cloud recording fails, falls back to 
    local recording or notifies participants via email.
    """
    params = operation_plan["params"]
    method = operation_plan["target_method"]
    
    try:
        # Execute primary Zoom API call
        result = method(**params)
        
        # Handle Zoom-specific success states
        if operation_plan["operation"] == "record":
            return {"status": "recording_started", "recording_id": result.get("id")}
        elif operation_plan["operation"] == "schedule":
            return {"status": "meeting_scheduled", "meeting_url": result.get("join_url")}
            
        return {"status": "success", "zoom_response": result}
        
    except RateLimitError as e:
        # Fallback 1: Exponential backoff retry for Zoom API throttling
        return fallback_handler.retry_with_backoff(method, params, max_retries=3)
        
    except MeetingConflictError as e:
        # Fallback 2: Auto-reschedule to next available slot
        return fallback_handler.reschedule_meeting(zoom_client, params, e.conflicting_meeting_id)
        
    except CloudRecordingUnavailableError:
        # Fallback 3: Graceful degradation to local recording
        return fallback_handler.enable_local_recording(params.get("meeting_id"))
        
    except AuthenticationError:
        # Fallback 4: Refresh OAuth token and retry once
        return fallback_handler.refresh_zoom_token_and_retry(method, params)
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