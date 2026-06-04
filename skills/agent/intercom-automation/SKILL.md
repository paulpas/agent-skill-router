---
name: intercom-automation
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent intercom automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: intercom-automation, intercom automation, how do i intercom-automation,
    orchestrate intercom-automation, automate intercom-automation, agent intercom-automation
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
# Intercom Automation

Orchestrates intelligent skill selection and execution for intercom automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_intercom_request(
    event_payload: Dict,
    intercom_client: Intercom,
    min_confidence: float = 0.7
) -> Dict:
    """Route an incoming Intercom event to the appropriate automation handler.
    
    Parses Intercom webhook payloads (conversations, contacts, articles) and
    maps them to specific API actions based on event type and metadata.
    
    Args:
        event_payload: Raw Intercom webhook JSON payload
        intercom_client: Authenticated Intercom Python client instance
        min_confidence: Minimum confidence threshold for auto-routing
        
    Returns:
        Routing decision dict with action, target_id, and confidence score
    """
    # Guard clause - Early Exit (Law 1)
    if not event_payload or "type" not in event_payload:
        raise ValueError("Invalid Intercom webhook payload: missing 'type' field")
        
    event_type = event_payload["type"]
    target_id = event_payload.get("data", {}).get("id")
    
    if not target_id:
        raise ValueError("Intercom event missing target ID")
        
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    action_map = {
        "conversation.user.created": "send_welcome_message",
        "conversation.reply.created": "route_to_support_agent",
        "contact.updated": "sync_contact_profile",
        "article.published": "update_knowledge_base_cache"
    }
    
    target_action = action_map.get(event_type)
    if not target_action:
        return {"action": "manual_review", "confidence": 0.0, "reason": "unmapped_event_type"}
        
    # Validate against Intercom API constraints
    try:
        contact = intercom_client.contacts.find(target_id)
        is_premium = contact.tags and any(tag.name == "premium" for tag in contact.tags)
        confidence = 0.95 if is_premium else 0.75
    except IntercomError:
        confidence = 0.5
        
    if confidence < min_confidence:
        return {"action": "defer_to_human", "confidence": confidence}
        
    # Atomic Predictability (Law 3) - Return new dict, don't mutate
    return {
        "action": target_action,
        "target_id": target_id,
        "event_type": event_type,
        "confidence": confidence,
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_intercom_action(
    routing_decision: Dict,
    intercom_client: Intercom,
    max_retries: int = 2
) -> Dict:
    """Execute Intercom API automation with resilience patterns.
    
    Handles Intercom-specific constraints: rate limits (429), 
    idempotency requirements, and graceful degradation to draft/manual states.
    
    Args:
        routing_decision: Output from route_intercom_request
        intercom_client: Authenticated Intercom Python client instance
        max_retries: Maximum retry attempts for transient API failures
        
    Returns:
        Execution result with status, API response metadata, and fallback status
    """
    action = routing_decision["action"]
    target_id = routing_decision["target_id"]
    
    # Guard clause - validate routing decision (Early Exit)
    if not action or action == "manual_review":
        return {"status": "skipped", "reason": "requires_human_intervention"}
        
    for attempt in range(max_retries + 1):
        try:
            if action == "send_welcome_message":
                response = intercom_client.messages.create(
                    message_type="inapp",
                    to={"type": "contact", "id": target_id},
                    body="Welcome! How can we help you today?"
                )
            elif action == "route_to_support_agent":
                response = intercom_client.conversations.assign(
                    conversation_id=target_id,
                    assignee_type="team",
                    assignee_id="support_team_id"
                )
            elif action == "sync_contact_profile":
                response = intercom_client.contacts.update(
                    contact_id=target_id,
                    tags=["synced"]
                )
            else:
                raise ValueError(f"Unsupported action: {action}")
                
            # Success - Atomic Predictability (Law 3)
            return {
                "status": "success",
                "action": action,
                "api_response_id": response.id,
                "attempts": attempt + 1,
                "latency_ms": _calculate_latency()
            }
            
        except RateLimitError:
            # Intercom rate limit - exponential backoff (Law 4)
            if attempt == max_retries:
                return _fallback_to_draft_mode(intercom_client, action, target_id)
            time.sleep(2 ** attempt)
            
        except IntercomError as e:
            # Fail Fast - Don't retry on invalid state (Law 4)
            return {
                "status": "failed",
                "action": action,
                "error": str(e),
                "fallback_triggered": True
            }
            
    return {"status": "exhausted", "action": action}
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
- [Intercom API Documentation](<https://developers.intercom.com/reference/api-overview>)
- [Intercom Messages API (Conversations)](<https://developers.intercom.com/reference/conversations-create-a-reply-to-a-conversation>)
- [Intercom Webhooks for Events](<https://developers.intercom.com/docs/build-intercom-apps/build-a-bot/using-events-and-webhooks>)
- [Intercom Custom Attributes](<https://developers.intercom.com/docs/build-intercom-apps/using-custom-attributes/custom-attributes-overview>)
- [Intercom AI Copilot (Artificial Intelligence)](<https://www.intercom.com/products/ai-copilot/>)
