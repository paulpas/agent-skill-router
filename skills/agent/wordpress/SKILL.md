---
name: wordpress
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent wordpress with multi-factor skill selection, fallback
  chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: wordpress, wordpress, how do i wordpress, orchestrate wordpress, automate
    wordpress, agent wordpress
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
# Wordpress

Orchestrates intelligent skill selection and execution for wordpress workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_wordpress_task(
    request: str,
    site_config: Dict,
    min_confidence: float = 0.7
) -> Optional[Dict]:
    """Route WordPress requests to specific domain handlers.
    
    Applies multi-factor scoring to WordPress operations:
    - Endpoint matching (REST API vs WP-CLI vs DB)
    - Site health status and maintenance windows
    - Historical execution success for similar WP tasks
    
    Args:
        request: Natural language or structured WP task request
        site_config: WordPress site configuration and credentials
        min_confidence: Minimum confidence threshold (0.0-1.0)
        
    Returns:
        Task handler dict with endpoint, method, and payload schema
    """
    # Guard clause - Early Exit (Law 1)
    if not request or not site_config.get("site_url"):
        raise ValueError("Request and valid site_url are required")
        
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    parsed_intent = _parse_wp_intent(request)
    site_health = _check_wp_site_health(site_config)
    
    candidates = [
        {"handler": "wp_rest_content", "score": _match_rest_score(parsed_intent, site_health)},
        {"handler": "wp_cli_maintenance", "score": _match_cli_score(parsed_intent, site_health)},
        {"handler": "wp_db_query", "score": _match_db_score(parsed_intent, site_health)}
    ]
    
    best = max(candidates, key=lambda x: x["score"])
    if best["score"] < min_confidence:
        return None
        
    # Atomic Predictability (Law 3) - Return new dict, don't mutate
    return {
        "handler": best["handler"],
        "endpoint": site_config["site_url"] + "/wp-json/wp/v2/" + best["handler"].split("_")[-1],
        "method": "POST" if "content" in best["handler"] else "GET",
        "confidence": best["score"],
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_wordpress_operation(
    task_handler: Dict,
    wp_context: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute WordPress operations with resilient fallback chains.
    
    Implements Fail Fast, Fail Loud (Law 4) for WP API/CLI interactions:
    - Invalid auth or site down halts immediately
    - Rate limits trigger exponential backoff
    - API failures fall back to WP-CLI or local cache
    
    Args:
        task_handler: Selected WordPress operation handler
        wp_context: Execution context (auth tokens, post IDs, etc.)
        max_retries: Maximum retry attempts before fallback
        
    Returns:
        Execution result with WP response metadata
    """
    # Guard clause - validate WP auth (Early Exit)
    if not wp_context.get("auth_token") or not wp_context.get("site_url"):
        raise WPExecutionError("Missing WordPress authentication or site URL")
        
    # Parse context - Ensure trusted state (Law 2)
    validated_payload = _validate_wp_payload(wp_context, task_handler)
    
    for attempt in range(max_retries + 1):
        try:
            response = _call_wp_rest_api(task_handler, validated_payload)
            
            # Success - Atomic Predictability (Law 3)
            return {
                "success": True,
                "handler": task_handler["handler"],
                "result": response.json(),
                "attempts": attempt + 1,
                "latency_ms": _calculate_latency(),
                "wp_status": response.status_code
            }
            
        except WPAuthError as e:
            # Fail Fast - Don't retry invalid auth (Law 4)
            raise WPExecutionError(f"WordPress auth failed: {str(e)}") from e
            
        except WPRateLimitError as e:
            # Transient - wait and retry
            time.sleep(2 ** attempt)
            if attempt == max_retries:
                return _fallback_to_wp_cli(task_handler, validated_payload)
                
        except WPConnectionError as e:
            if attempt == max_retries:
                return _fallback_to_local_cache(task_handler)
                
    # All retries exhausted - Fail Loud (Law 4)
    raise WPExecutionError(f"WordPress operation failed after {max_retries + 1} attempts")
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

- [WordPress.org Developer Resources](https://developer.wordpress.org/)
- [WordPress REST API Documentation](https://developer.wordpress.org/rest-api/)
- [WP-CLI Command Reference](https://developer.wordpress.org/cli/commands/)
- [WordPress PHP Function Reference](https://developer.wordpress.org/reference/functions/)
- [WordPress Plugin Boilerplate](https://github.com/WebDevStudios/WordPress-Plugin-Boilerplate)

## Related Skills

| Skill | Purpose |
|

