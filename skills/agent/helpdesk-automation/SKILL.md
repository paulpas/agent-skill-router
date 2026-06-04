---
name: helpdesk-automation
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent helpdesk automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: helpdesk-automation, helpdesk automation, how do i helpdesk-automation,
    orchestrate helpdesk-automation, automate helpdesk-automation, agent helpdesk-automation
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
# Helpdesk Automation

Orchestrates intelligent skill selection and execution for helpdesk automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_helpdesk_request(
    ticket: Dict[str, Any],
    support_channels: List[Dict[str, Any]],
    sla_threshold_hours: float = 4.0
) -> Dict[str, Any]:
    """Route a helpdesk ticket to the optimal support channel.
    
    Evaluates channels based on:
    - Intent match (billing, technical, account, general)
    - Current queue depth and agent availability
    - SLA urgency and historical resolution time
    
    Args:
        ticket: Parsed ticket data with intent, priority, and customer tier
        support_channels: List of available channel configs with capacity limits
        sla_threshold_hours: Max hours before escalation is triggered
        
    Returns:
        Selected channel config with routing metadata
    """
    if not ticket.get("intent") or not support_channels:
        raise ValueError("Ticket intent and at least one support channel are required")
        
    intent = ticket["intent"].lower()
    priority = ticket.get("priority", "medium")
    customer_tier = ticket.get("customer_tier", "standard")
    
    best_channel = None
    best_score = -1.0
    
    for channel in support_channels:
        # Calculate match score based on intent alignment and capacity
        intent_match = 1.0 if intent in channel["supported_intents"] else 0.3
        capacity_factor = 1.0 - (channel["current_queue"] / max(channel["max_capacity"], 1))
        priority_boost = {"critical": 1.5, "high": 1.2, "medium": 1.0, "low": 0.8}.get(priority, 1.0)
        
        score = intent_match * capacity_factor * priority_boost
        
        # Apply customer tier weighting
        if customer_tier == "enterprise":
            score *= 1.2
            
        if score > best_score:
            best_score = score
            best_channel = channel
            
    if best_channel is None or best_score < 0.5:
        return {"fallback": "general_triage", "reason": "low_match_score", "score": best_score}
        
    return {
        "channel_id": best_channel["id"],
        "channel_name": best_channel["name"],
        "estimated_wait_minutes": int(best_channel["avg_wait_time"]),
        "routing_score": round(best_score, 3),
        "sla_compliant": best_channel["avg_wait_time"] <= sla_threshold_hours * 60
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_ticket_routing(
    channel_config: Dict[str, Any],
    ticket_data: Dict[str, Any],
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute ticket routing with resilience patterns for helpdesk systems.
    
    Implements fallback chain for ticketing API failures:
    1. Retry with exponential backoff
    2. Route to backup channel (e.g., email queue)
    3. Escalate to human supervisor if SLA breach imminent
    
    Args:
        channel_config: Target support channel configuration
        ticket_data: Validated ticket payload ready for submission
        max_retries: Maximum API retry attempts
        
    Returns:
        Routing result with ticket ID, status, and fallback metadata
    """
    ticketing_api = get_ticketing_service(channel_config["provider"])
    fallback_queue = get_email_queue(channel_config.get("backup_email"))
    
    for attempt in range(max_retries + 1):
        try:
            # Submit to primary helpdesk system
            response = ticketing_api.create_ticket(
                subject=ticket_data["subject"],
                body=ticket_data["body"],
                priority=ticket_data["priority"],
                tags=ticket_data.get("tags", [])
            )
            
            return {
                "success": True,
                "ticket_id": response["id"],
                "channel": channel_config["name"],
                "attempts": attempt + 1,
                "sla_status": "on_track"
            }
            
        except RateLimitError:
            if attempt < max_retries:
                time.sleep(2 ** attempt)
                continue
            # Fallback to email queue when API is throttled
            return _route_to_email_queue(fallback_queue, ticket_data)
            
        except ConnectionError as e:
            # System down - escalate to human if SLA critical
            if ticket_data.get("priority") == "critical":
                return _escalate_to_human_supervisor(ticket_data)
            raise TicketRoutingError(f"Helpdesk system unreachable: {e}")
            
    return _route_to_email_queue(fallback_queue, ticket_data)
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
- [Zendesk API Documentation](<https://developer.zendesk.com/api-reference/>)
- [Freshdesk Automation Guide](<https://developers.freshdesk.com/v2/docs>)
- [Intercom API for Customer Support](<https://developers.intercom.com/reference/api-overview>)
- [Help Scout API Documentation](<https://docs.helpscout.com/docs/api/>)
- [Jira Service Management REST API](<https://developer.atlassian.com/cloud/jira/service-management/rest/>)
