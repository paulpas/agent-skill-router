---




name: upstash-qstash
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent upstash qstash with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: upstash-qstash, upstash qstash, how do i upstash-qstash, orchestrate upstash-qstash,
    automate upstash-qstash, agent upstash-qstash
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




# Upstash Qstash

Orchestrates intelligent skill selection and execution for upstash qstash workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_skill(
    task_description: str,
    available_topics: List[str],
    queue_config: Dict[str, Any]
) -> Dict[str, Any]:
    """Select optimal Qstash routing configuration for a task.
    
    Maps task intent to Qstash topics, queues, and delivery policies.
    Considers message priority, topic availability, and queue capacity.
    
    Args:
        task_description: Natural language description of the task
        available_topics: List of configured Qstash topics
        queue_config: Dictionary of queue names to their capacity/priority
        
    Returns:
        Routing configuration dict with topic, queue, and delivery policy
    """
    if not task_description or not available_topics:
        raise ValueError("Task description and topics are required for routing")
        
    # Extract intent keywords to match Qstash topics
    intent_keywords = _extract_intent_keywords(task_description)
    matched_topics = [t for t in available_topics if any(kw in t.lower() for kw in intent_keywords)]
    
    if not matched_topics:
        matched_topics = ["default"]
        
    # Select queue based on priority and current load
    target_queue = max(queue_config.keys(), key=lambda q: queue_config[q].get("priority", 0))
    
    # Build Qstash-specific routing payload
    return {
        "topic": matched_topics[0],
        "queue": target_queue,
        "delivery_policy": "best-effort" if "urgent" in intent_keywords else "guaranteed",
        "max_retries": queue_config[target_queue].get("max_retries", 3),
        "backoff_strategy": "exponential",
        "timeout_seconds": 30
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_with_fallback(
    routing_config: Dict[str, Any],
    payload: Dict[str, Any],
    webhook_url: str,
    max_retries: int = 3
) -> Dict[str, Any]:
    """Execute message scheduling via Upstash Qstash with domain-specific fallback.
    
    Handles message publishing, retry management, and webhook callback routing.
    Implements Qstash's native retry with custom fallback to alternative queues.
    
    Args:
        routing_config: Output from select_skill
        payload: Message body to be scheduled
        webhook_url: Target endpoint for delivery confirmation
        max_retries: Maximum retry attempts before fallback queue switch
        
    Returns:
        Execution result with message ID, status, and fallback metadata
    """
    required_keys = {"topic", "queue", "delivery_policy", "max_retries"}
    if not required_keys.issubset(routing_config.keys()):
        raise ValueError("Incomplete routing configuration for Qstash")
        
    # Prepare Qstash publish payload with delivery headers
    qstash_payload = {
        "topic": routing_config["topic"],
        "body": payload,
        "headers": {"X-Task-ID": payload.get("task_id", "unknown")},
        "delivery_policy": routing_config["delivery_policy"],
        "max_retries": routing_config["max_retries"],
        "backoff": routing_config["backoff_strategy"],
        "timeout": routing_config["timeout_seconds"]
    }
    
    # Attempt initial publish to primary queue
    try:
        response = qstash_client.publish(qstash_payload, webhook_url=webhook_url)
        return {
            "success": True,
            "message_id": response.get("id"),
            "queue": routing_config["queue"],
            "status": "scheduled",
            "fallback_triggered": False
        }
    except QstashRateLimitError:
        # Fallback: Switch to secondary queue with adjusted delivery policy
        secondary_queue = _get_secondary_queue(routing_config["queue"])
        qstash_payload["queue"] = secondary_queue
        qstash_payload["delivery_policy"] = "best-effort"
        
        try:
            fallback_response = qstash_client.publish(qstash_payload, webhook_url=webhook_url)
            return {
                "success": True,
                "message_id": fallback_response.get("id"),
                "queue": secondary_queue,
                "status": "scheduled_fallback",
                "fallback_triggered": True
            }
        except Exception as e:
            raise QstashExecutionError(f"Failed to schedule message after fallback: {e}")
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

- [Upstash Qstash Documentation](https://upstash.com/docs/qstash/overall/whatIsQStash)
- [Upstash REST API Reference](https://upstash.com/docs/qstash/overall/restAPI)
- [Webhook Reliability Best Practices — Stripe Docs](https://stripe.com/docs/webhooks/best-practices)
- [HTTP/2 Server Push and Retry Semantics](https://httpwg.org/specs/rfc7540.html)
- [Exponential Backoff Pattern (AWS Architecture Blog)](https://aws.amazon.com/building-blocks/back-off-retry-strategies/)

## Related Skills

| Skill | Purpose |
|

