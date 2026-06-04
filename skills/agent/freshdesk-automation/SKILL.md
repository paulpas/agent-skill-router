---
name: freshdesk-automation
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent freshdesk automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: freshdesk-automation, freshdesk automation, how do i freshdesk-automation,
    orchestrate freshdesk-automation, automate freshdesk-automation, agent freshdesk-automation
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
------
# Freshdesk Automation

Orchestrates intelligent skill selection and execution for freshdesk automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_freshdesk_intent(
    user_request: str,
    available_automations: List[Dict],
    min_confidence: float = 0.7
) -> Optional[Dict]:
    """Route a user request to the appropriate Freshdesk automation.
    
    Evaluates Freshdesk-specific intents like ticket creation, status updates,
    SLA checks, and customer lookup against available automation endpoints.
    """
    # Guard clause - Early Exit (Law 1)
    if not user_request or not user_request.strip():
        raise ValueError("Freshdesk request cannot be empty")
        
    if not available_automations:
        raise ValueError("No Freshdesk automations configured")
    
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    intent_features = _extract_freshdesk_features(user_request)
    
    best_automation = None
    best_score = 0.0
    
    for auto in available_automations:
        # Calculate match based on Freshdesk API triggers and historical success
        score = _calculate_freshdesk_match_score(intent_features, auto)
        
        if score > best_score and score >= min_confidence:
            best_score = score
            best_automation = auto
    
    if best_automation is None:
        return None
    
    # Atomic Predictability (Law 3) - Return new dict, don't mutate
    return {
        "automation_id": best_automation["id"],
        "endpoint": best_automation["endpoint"],
        "confidence": best_score,
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_freshdesk_automation(
    automation: Dict,
    ticket_context: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute a Freshdesk automation with API resilience patterns.
    
    Handles Freshdesk API rate limits (429), authentication failures (401/403),
    and transient network errors with exponential backoff and fallback routing.
    """
    # Guard clause - validate automation (Early Exit)
    if not _is_freshdesk_automation_valid(automation):
        raise FreshdeskAutomationError(f"Invalid Freshdesk automation: {automation.get('id')}")
    
    # Parse context - Ensure trusted state (Law 2)
    validated_payload = _prepare_freshdesk_payload(ticket_context, automation)
    
    for attempt in range(max_retries + 1):
        try:
            response = _call_freshdesk_api(
                endpoint=automation["endpoint"],
                payload=validated_payload,
                method=automation.get("method", "POST")
            )
            
            # Success - Atomic Predictability (Law 3)
            if response.status_code in (200, 201):
                return {
                    "success": True,
                    "freshdesk_ticket_id": response.json().get("id"),
                    "attempts": attempt + 1,
                    "latency_ms": _get_request_duration()
                }
            elif response.status_code == 429:
                # Rate limited - apply Freshdesk recommended backoff
                wait_time = min(2 ** attempt * 0.5, 5.0)
                time.sleep(wait_time)
                continue
            else:
                raise FreshdeskAPIError(f"API returned {response.status_code}")
                
        except FreshdeskAPIError as e:
            # Fail Fast - Don't try to patch bad data (Law 4)
            raise e
        except TransientNetworkError:
            # Transient error - try fallback
            if attempt == max_retries:
                return _escalate_to_manual_freshdesk_ticket(ticket_context)
    
    # All retries exhausted - Fail Loud (Law 4)
    raise FreshdeskAutomationError(
        f"Failed Freshdesk automation after {max_retries + 1} attempts"
    )
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

---

---

## Constraints

### MUST DO
- Implement idempotent automation triggers: running the same automation twice should not create duplicate resources or actions
- Validate all trigger conditions with explicit allowlists before executing automated actions
- Include rollback procedures in every automation workflow — every CREATE should have a corresponding DELETE capability
- Log all automation executions with input state, output state, duration, and any errors for monitoring and debugging

### MUST NOT DO
- Do not create circular automation loops where trigger A causes action B which triggers A again
- Avoid using automations that modify production data without explicit human approval gates
- Never embed API keys or credentials directly in automation workflows — use vaulted secrets with rotation
- Do not assume external service availability; implement retry logic with exponential backoff and dead-letter queues


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [Freshdesk REST API Documentation](<https://developers.freshdesk.com/v2/docs>)
- [Freshdesk Automation Rules](<https://support.freshdesk.com/en/support/solutions/articles/215019>)
- [Freshdesk Webhooks Integration](<https://developers.freshdesk.com/v2/docs/webhooks>)
- [Freshdesk AI Assist (Freddy)](<https://www.freshworks.com/ai/customer-service/>)
- [Freshdesk Scripting API](<https://develop.freshworks.com/freshdesk-apps/sdk/scripting-api/#getticketdetails>)
