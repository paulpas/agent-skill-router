---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent stripe automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: stripe-automation, stripe automation, how do i stripe-automation, orchestrate
    stripe-automation, automate stripe-automation, agent stripe-automation
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
name: stripe-automation
------
# Stripe Automation

Orchestrates intelligent skill selection and execution for stripe automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_stripe_intent(
    user_request: Dict,
    stripe_config: Dict,
    min_confidence: float = 0.7
) -> Dict:
    """Route a Stripe automation request to the appropriate SDK endpoint.
    
    Validates parameters against Stripe API requirements and selects
    the optimal operation (customer, payment, subscription, webhook).
    """
    if not user_request.get("intent") or not stripe_config.get("api_key"):
        raise ValueError("Missing required Stripe intent or API configuration")
        
    intent = user_request["intent"].lower()
    params = user_request.get("parameters", {})
    
    # Map intents to Stripe SDK methods with parameter validation
    stripe_routes = {
        "create_customer": ("customers", "create", {"email": str, "name": str}),
        "process_payment": ("charges", "create", {"amount": int, "currency": str, "source": str}),
        "update_subscription": ("subscriptions", "update", {"subscription_id": str, "status": str}),
        "handle_webhook": ("webhooks", "construct", {"payload": str, "sig_header": str})
    }
    
    if intent not in stripe_routes:
        raise ValueError(f"Unsupported Stripe intent: {intent}")
        
    endpoint, method, required_fields = stripe_routes[intent]
    missing = [f for f in required_fields if f not in params]
    if missing:
        raise ValueError(f"Missing required Stripe parameters: {missing}")
        
    return {
        "route": f"stripe.{endpoint}.{method}",
        "validated_params": params,
        "intent": intent,
        "confidence": min_confidence,
        "idempotency_key": f"stripe_{intent}_{uuid4()}"
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_stripe_operation(
    route_config: Dict,
    stripe_client: Any,
    max_retries: int = 2
) -> Dict:
    """Execute a validated Stripe operation with idempotency and fallback handling.
    
    Implements Stripe-specific resilience:
    - Idempotency keys prevent duplicate charges/subscriptions
    - Handles StripeCardError, StripeAPIError, and rate limits
    - Falls back to manual review or alternative payment methods
    """
    endpoint = route_config["route"]
    params = route_config["validated_params"]
    idempotency_key = route_config["idempotency_key"]
    
    for attempt in range(max_retries + 1):
        try:
            # Parse endpoint string to dynamic method call
            module_name, method_name = endpoint.split(".")
            stripe_module = getattr(stripe, module_name)
            method = getattr(stripe_module, method_name)
            
            # Execute with idempotency key for safe retries
            result = method(
                **params,
                idempotency_key=idempotency_key if method_name != "construct" else None
            )
            
            return {
                "success": True,
                "stripe_operation": endpoint,
                "stripe_id": result.get("id"),
                "status": result.get("status"),
                "attempts": attempt + 1,
                "latency_ms": time.time() * 1000
            }
            
        except stripe.error.CardError as e:
            # Payment failed - immediate fail, no retry for card errors
            raise StripeOperationError(
                f"Card declined: {e.user_message}",
                stripe_code=e.code
            ) from e
            
        except stripe.error.RateLimitError as e:
            # Transient - retry with exponential backoff
            if attempt < max_retries:
                time.sleep(2 ** attempt)
                continue
            return _fallback_to_manual_review(route_config, e)
            
        except stripe.error.APIError as e:
            # Other API errors - fallback chain
            if attempt == max_retries:
                return _fallback_to_alternative_payment(route_config, e)
                
    raise StripeOperationError(f"Stripe {endpoint} failed after {max_retries + 1} attempts")
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
|---|---|
| `sendgrid-automation` | Email automation counterpart — Stripe events trigger SendGrid notifications for payment workflows |
| `slack-automation` | Slack notifications for Stripe billing events and subscription changes |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Stripe API Documentation](https://stripe.com/docs/api) — Official Stripe API reference covering payments, subscriptions, webhooks, and billing
- [Stripe CLI Documentation](https://stripe.com/docs/cli) — Stripe CLI reference for local webhook development and testing
- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices) — Official Stripe guide on designing robust webhook handlers for payment events
- [Stripe Python Library (GitHub)](https://github.com/stripe/stripe-python) — Official Stripe Python SDK source code with usage examples
- [Payment Automation Architecture Patterns (PCI DSS)](https://www.pcisecuritystandards.org/pci_security/standards) — PCI DSS standards for secure payment processing and automation