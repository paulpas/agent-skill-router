---
name: zendesk-automation
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent zendesk automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: zendesk-automation, zendesk automation, how do i zendesk-automation, orchestrate
    zendesk-automation, automate zendesk-automation, agent zendesk-automation
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
# Zendesk Automation

Orchestrates intelligent skill selection and execution for zendesk automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_zendesk_request(
    event_payload: Dict,
    automation_rules: List[Dict],
    min_confidence: float = 0.7
) -> Optional[Dict]:
    """Route incoming Zendesk webhook/event to the optimal automation rule.
    
    Analyzes ticket context, tags, and request type to match against
    configured automation workflows. Uses text similarity and historical
    execution success rates to score rules.
    
    Args:
        event_payload: Raw Zendesk webhook payload (ticket, comment, or trigger event)
        automation_rules: List of configured automation rule metadata
        min_confidence: Minimum confidence threshold for rule selection
        
    Returns:
        Selected automation rule with confidence score and execution context
    """
    if not event_payload or "ticket" not in event_payload:
        raise ValueError("Invalid Zendesk event payload: missing ticket data")
        
    ticket = event_payload["ticket"]
    ticket_features = {
        "subject": ticket.get("subject", ""),
        "tags": ticket.get("tags", []),
        "requester_type": ticket.get("requester", {}).get("role", ""),
        "priority": ticket.get("priority", ""),
        "status": ticket.get("status", "")
    }
    
    best_rule = None
    best_score = 0.0
    
    for rule in automation_rules:
        match_score = _calculate_rule_match(ticket_features, rule)
        historical_success = rule.get("historical_success_rate", 0.0)
        combined_score = (match_score * 0.6) + (historical_success * 0.4)
        
        if combined_score > best_score and combined_score >= min_confidence:
            best_score = combined_score
            best_rule = rule
            
    if best_rule is None:
        return None
        
    return {
        "rule_id": best_rule["id"],
        "rule_name": best_rule["name"],
        "confidence": best_score,
        "context": ticket_features,
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_zendesk_automation(
    selected_rule: Dict,
    zendesk_client: ZendeskAPI,
    max_retries: int = 2
) -> Dict:
    """Execute a Zendesk automation rule with resilience patterns.
    
    Handles API rate limits, transient network errors, and invalid ticket states.
    Implements fallback chain: retry -> alternative action -> manual review queue.
    
    Args:
        selected_rule: Output from route_zendesk_request
        zendesk_client: Authenticated Zendesk API client instance
        max_retries: Maximum retry attempts for transient failures
        
    Returns:
        Execution result with status, updated ticket ID, and audit metadata
    """
    ticket_id = selected_rule["context"].get("ticket_id")
    if not ticket_id:
        raise ValueError("Missing ticket_id in automation context")
        
    for attempt in range(max_retries + 1):
        try:
            # Map rule actions to specific Zendesk API endpoints
            updates = {}
            if selected_rule.get("actions", {}).get("update_status"):
                updates["status"] = selected_rule["actions"]["update_status"]
            if selected_rule.get("actions", {}).get("add_tags"):
                current_tags = zendesk_client.get_ticket_tags(ticket_id)
                updates["tags"] = list(set(current_tags + selected_rule["actions"]["add_tags"]))
                
            zendesk_client.update_ticket(ticket_id, updates)
            
            # Post automation execution comment for audit trail
            zendesk_client.post_comment(ticket_id, {
                "body": f"[Automation] Executed rule: {selected_rule['rule_name']}",
                "public": False
            })
            
            return {
                "success": True,
                "rule_executed": selected_rule["rule_name"],
                "ticket_id": ticket_id,
                "attempts": attempt + 1,
                "latency_ms": _calculate_latency()
            }
            
        except ZendeskRateLimitError as e:
            if attempt == max_retries:
                return _fallback_to_manual_review(ticket_id, selected_rule)
            time.sleep(2 ** attempt)
            
        except ZendeskInvalidStateError as e:
            raise ZendeskAutomationError(f"Invalid ticket state: {str(e)}") from e
            
    return _fallback_to_alternative_rule(selected_rule)
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

- [Zendesk REST API Documentation](https://developer.zendesk.com/api-reference/)
- [Zendesk Triggers & Automation](https://www.zendesk.com/blog/automate-ticket-workflows/)
- [Zendesk Webhooks Guide](https://developer.zendesk.com/documentation/troubleshooting/webhooks/introduction-to-webhooks/)
- [Ticketing System Design Patterns — Atlassian](https://www.atlassian.com/agile/project-management/tickets)
- [OAuth 2.0 RFC 6749 — Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)

## Related Skills

| Skill | Purpose |
|

