---
name: wordpress-woocommerce-development
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent wordpress woocommerce development with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: wordpress-woocommerce-development, wordpress woocommerce development,
    how do i wordpress-woocommerce-development, orchestrate wordpress-woocommerce-development,
    automate wordpress-woocommerce-development, agent wordpress-woocommerce-development
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
# Wordpress Woocommerce Development

Orchestrates intelligent skill selection and execution for wordpress woocommerce development workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def process_woocommerce_product_sync(
    product_id: int,
    sync_config: Dict,
    api_credentials: Dict,
    max_retries: int = 3
) -> Dict:
    """Synchronize a WooCommerce product with external inventory systems.
    
    Demonstrates WC REST API interaction, rate limit handling, and 
    atomic state updates following the 5 Laws of Elegant Defense.
    """
    import time
    from requests import Session, HTTPError
    
    if not product_id or not isinstance(product_id, int):
        raise ValueError("Invalid product ID provided")
        
    session = Session()
    session.headers.update({
        "Authorization": f"Basic {api_credentials['key']}:{api_credentials['secret']}",
        "Content-Type": "application/json"
    })
    
    base_url = f"{api_credentials['site_url']}/wp-json/wc/v3/products/{product_id}"
    
    for attempt in range(max_retries):
        try:
            response = session.get(base_url)
            response.raise_for_status()
            product_data = response.json()
            
            # Apply sync configuration without mutating original
            updated_data = {
                "regular_price": sync_config.get("price"),
                "stock_quantity": sync_config.get("quantity"),
                "manage_stock": sync_config.get("manage_stock", True)
            }
            
            # Atomic update - return new state representation
            update_response = session.put(base_url, json=updated_data)
            update_response.raise_for_status()
            
            return {
                "success": True,
                "product_id": product_id,
                "updated_fields": list(updated_data.keys()),
                "timestamp": time.time()
            }
            
        except HTTPError as e:
            if e.response.status_code == 429:
                wait_time = int(e.response.headers.get("Retry-After", 2 ** attempt))
                time.sleep(wait_time)
                continue
            raise
            
    return {"success": False, "error": "Sync exhausted retries"}
```


### Pattern 2: Execution with Fallback

```python
def handle_woocommerce_payment_processing(
    order_id: int,
    payment_method: str,
    gateway_config: Dict,
    fallback_gateways: List[str] = None
) -> Dict:
    """Process WooCommerce order payment with automatic gateway fallback.
    
    Implements fail-fast validation, atomic transaction state, and 
    graceful degradation across payment providers.
    """
    import time
    from requests import Session, HTTPError
    
    if not order_id or not payment_method:
        raise ValueError("Order ID and payment method are required")
        
    session = Session()
    session.headers.update({
        "Authorization": f"Basic {gateway_config['key']}:{gateway_config['secret']}",
        "Content-Type": "application/json"
    })
    
    base_url = f"{gateway_config['site_url']}/wp-json/wc/v3/orders/{order_id}/meta"
    
    # Validate payment method against allowed list (Early Exit)
    allowed_methods = gateway_config.get("allowed_methods", ["stripe", "paypal"])
    if payment_method not in allowed_methods:
        raise ValueError(f"Unsupported payment method: {payment_method}")
        
    # Attempt primary gateway
    try:
        payload = {"payment_method": payment_method, "status": "processing"}
        response = session.post(base_url, json=payload)
        response.raise_for_status()
        return {"success": True, "method": payment_method, "order_id": order_id}
        
    except HTTPError as e:
        if e.response.status_code == 400:
            # Invalid state - fail fast, don't patch
            raise ValueError(f"Payment validation failed: {e.response.json().get('message')}")
            
        # Fallback chain for transient gateway failures
        if fallback_gateways:
            for fallback in fallback_gateways:
                try:
                    payload["payment_method"] = fallback
                    response = session.post(base_url, json=payload)
                    response.raise_for_status()
                    return {"success": True, "method": fallback, "order_id": order_id, "fallback_used": True}
                except HTTPError:
                    continue
                    
        return {"success": False, "error": "All payment gateways failed", "order_id": order_id}
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

- [WooCommerce REST API Documentation](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [WooCommerce Developer Docs](https://developer.woocommerce.com/docs/)
- [WordPress Plugin Development — Hooks & Filters](https://developer.wordpress.org/plugins/)
- [RESTful API Design — Richardson Maturity Model](https://martinfowler.com/articles/richardsonMaturityModel.html)
- [PHP Session Security Best Practices (OWASP)](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

## Related Skills

| Skill | Purpose |
|

