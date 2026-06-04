---
name: zapier-make-patterns
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent zapier make patterns with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: zapier-make-patterns, zapier make patterns, how do i zapier-make-patterns,
    orchestrate zapier-make-patterns, automate zapier-make-patterns, agent zapier-make-patterns
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
# Zapier Make Patterns

Orchestrates intelligent skill selection and execution for zapier make patterns workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_automation_step(
    trigger_payload: Dict,
    workflow_config: Dict,
    fallback_endpoints: List[str]
) -> Dict:
    """Route a trigger payload through a Zapier/Make compatible workflow.
    
    Applies Law 2 (Parse at boundary) by validating webhook payloads before routing.
    Applies Law 1 (Early Exit) by rejecting malformed triggers immediately.
    
    Args:
        trigger_payload: Raw webhook data from external service
        workflow_config: Step definitions with conditions and targets
        fallback_endpoints: List of alternative API endpoints for resilience
        
    Returns:
        Routing decision with target step, transformed payload, and metadata
    """
    # Law 1: Early exit on malformed trigger
    if not trigger_payload.get("event_type") or not trigger_payload.get("timestamp"):
        raise ValueError("Invalid webhook payload: missing event_type or timestamp")
        
    # Law 2: Parse and validate at boundary
    validated_trigger = {
        "event_type": str(trigger_payload["event_type"]).lower(),
        "source": trigger_payload.get("source", "unknown"),
        "payload": trigger_payload.get("data", {}),
        "received_at": trigger_payload["timestamp"]
    }
    
    # Match against workflow conditions
    for step in workflow_config.get("steps", []):
        if step.get("condition") == validated_trigger["event_type"]:
            # Law 3: Return new structure, never mutate original
            return {
                "target_step": step["name"],
                "transformed_payload": _apply_step_transform(validated_trigger, step),
                "confidence": step.get("match_score", 0.85),
                "fallback_chain": fallback_endpoints[:2] if fallback_endpoints else []
            }
            
    # No match found - fail fast with clear error
    raise ValueError(f"No workflow step matched event_type: {validated_trigger['event_type']}")
```


### Pattern 2: Execution with Fallback

```python
def execute_automation_chain(
    step_config: Dict,
    payload: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute a specific automation step with Zapier/Make compatible fallback logic.
    
    Implements Law 4 (Fail Fast/Loud) by immediately raising on invalid step configs.
    Implements fallback chain: retry -> alternative endpoint -> log to fallback channel.
    
    Args:
        step_config: Step definition including HTTP method, URL, headers, body template
        payload: Validated trigger data ready for transformation
        max_retries: Maximum retry attempts for transient failures
        
    Returns:
        Execution result with status, response data, and timing metadata
    """
    # Law 1: Validate step configuration early
    required_keys = {"method", "url", "headers"}
    if not required_keys.issubset(step_config.keys()):
        raise ValueError(f"Invalid step config: missing {required_keys - set(step_config.keys())}")
        
    # Law 2: Parse payload into step-specific format
    step_payload = _render_template(step_config.get("body_template", "{}"), payload)
    
    for attempt in range(max_retries + 1):
        try:
            response = _send_automation_request(
                method=step_config["method"],
                url=step_config["url"],
                headers=step_config["headers"],
                body=step_payload
            )
            
            # Law 3: Return immutable result structure
            return {
                "status": "success",
                "step_executed": step_config["name"],
                "response_data": response.json() if response.status_code == 200 else response.text,
                "attempts": attempt + 1,
                "latency_ms": response.elapsed.total_seconds() * 1000
            }
            
        except requests.exceptions.ConnectionError as e:
            # Transient failure - apply fallback chain
            if attempt == max_retries:
                return _route_to_fallback(step_config, payload)
            continue
            
        except requests.exceptions.HTTPError as e:
            # Law 4: Fail loud on client/server errors
            raise AutomationExecutionError(
                f"Step {step_config['name']} failed with HTTP {e.response.status_code}"
            ) from e
            
    raise AutomationExecutionError(f"Step {step_config['name']} exhausted all retries")
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

- [Zapier Developer Documentation](https://developer.zapier.com/)
- [Make (Integromat) Documentation](https://www.make.com/en/help-center/integrations)
- [Webhooks.io — Webhook Testing & Debugging](https://webhooks.space/)
- [REST API Authentication Best Practices (OWASP)](https://cheatsheetseries.owasp.org/cheatsheets/rest_api_security_cheat_sheet.html)
- [RFC 7231 — Hypertext Transfer Protocol (HTTP/1.1) Semantics](https://datatracker.ietf.org/doc/html/rfc7231)

## Related Skills

| Skill | Purpose |
|

