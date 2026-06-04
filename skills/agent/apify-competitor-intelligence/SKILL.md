---
name: apify-competitor-intelligence
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent apify competitor intelligence with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: apify-competitor-intelligence, apify competitor intelligence, how do i
    apify-competitor-intelligence, orchestrate apify-competitor-intelligence, automate
    apify-competitor-intelligence, agent apify-competitor-intelligence
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
# Apify Competitor Intelligence

Orchestrates intelligent skill selection and execution for apify competitor intelligence workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def evaluate_apify_actors_for_competitor(
    competitor_url: str,
    available_actors: List[Dict],
    min_confidence: float = 0.7
) -> Optional[Dict]:
    """Evaluate Apify actors to find the best fit for competitor intelligence.
    
    Scores actors based on URL compatibility, historical success rate,
    and current actor status (active/deprecated).
    """
    # Guard clause - Early Exit (Law 1)
    if not competitor_url or not available_actors:
        raise ValueError("Competitor URL and actor list are required")
        
    parsed_domain = urlparse(competitor_url).netloc
    best_actor = None
    best_score = 0.0
    
    for actor in available_actors:
        # Parse input - Make Illegal States Unrepresentable (Law 2)
        domain_match = _check_domain_compatibility(parsed_domain, actor.get("supported_domains", []))
        success_rate = actor.get("stats", {}).get("success_rate", 0.0)
        status = actor.get("status", "ACTIVE")
        
        if status != "ACTIVE":
            continue
            
        score = (domain_match * 0.6) + (success_rate * 0.4)
        if score > best_score and score >= min_confidence:
            best_score = score
            best_actor = actor
    
    if best_actor is None:
        return None
    
    # Atomic Predictability (Law 3) - Return new dict, don't mutate
    return {
        "actor_id": best_actor["id"],
        "actor_name": best_actor["name"],
        "confidence": best_score,
        "input_config": _build_default_input(competitor_url, best_actor),
        "fallback_actors": [a["id"] for a in available_actors if a["id"] != best_actor["id"]][:2]
    }
```


### Pattern 2: Execution with Fallback

```python
def run_apify_actor_with_fallback(
    actor_config: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute an Apify actor with domain-specific fallback handling.
    
    Implements Fail Fast, Fail Loud (Law 4):
    - Invalid inputs halt immediately with descriptive errors
    - Rate limits trigger exponential backoff
    - Actor failures cascade to fallback actors
    
    Args:
        actor_config: Selected actor metadata and input configuration
        max_retries: Maximum retry attempts before fallback
        
    Returns:
        Execution result with metadata (success, timing, confidence)
    """
    actor_id = actor_config["actor_id"]
    input_config = actor_config["input_config"]
    fallback_actors = actor_config.get("fallback_actors", [])
    
    for attempt in range(max_retries + 1):
        try:
            # Execute via Apify API client
            run = apify_client.actor(actor_id).call(input=input_config)
            result = apify_client.dataset(run["defaultDatasetId"]).get_items()
            
            # Success - Atomic Predictability (Law 3)
            return {
                "success": True,
                "actor_executed": actor_config["actor_name"],
                "data_count": len(result),
                "attempts": attempt + 1,
                "latency_ms": run.get("stats", {}).get("actuatorSecondsTotal", 0) * 1000
            }
            
        except apify.ApiError as e:
            if e.status_code == 429:
                time.sleep(2 ** attempt) # Exponential backoff
                continue
            elif e.status_code == 400:
                # Invalid input - sanitize and retry
                input_config = _sanitize_input_for_actor(actor_id, input_config)
                continue
            else:
                # Fail Fast - Don't try to patch bad data (Law 4)
                raise ApifyExecutionError(f"Actor {actor_id} failed: {e}") from e
    
    # All retries exhausted - Fail Loud (Law 4)
    if fallback_actors:
        return run_apify_actor_with_fallback({
            **actor_config,
            "actor_id": fallback_actors[0],
            "input_config": input_config
        }, max_retries=1)
        
    raise ApifyExecutionError(f"All fallback actors exhausted for {actor_id}")
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

- [Competitive Intelligence Best Practices (CIPC)](<https://www.cipc.com/resources/best-practices/>)
- [Web Scraping for Market Research](<https://scrapingbee.com/blog/web-scraping-market-research/>)
- [Gartner Competitive Intelligence Framework](<https://www.gartner.com/en/research/methodologies/competitive-intelligence>)
- [OSINT Methodologies Overview](<https://en.wikipedia.org/wiki/Open-source_intelligence>)
- [Pricing Intelligence Methods](<https://pricemonitor.io/blog/pricing-strategies-for-ecommerce/>)

## Related Skills

| Skill | Purpose |
|