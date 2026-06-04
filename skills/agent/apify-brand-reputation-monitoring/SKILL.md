---
name: apify-brand-reputation-monitoring
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent apify brand reputation monitoring with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: apify-brand-reputation-monitoring, apify brand reputation monitoring,
    how do i apify-brand-reputation-monitoring, orchestrate apify-brand-reputation-monitoring,
    automate apify-brand-reputation-monitoring, agent apify-brand-reputation-monitoring
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
# Apify Brand Reputation Monitoring

Orchestrates intelligent skill selection and execution for apify brand reputation monitoring workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def configure_brand_monitor(
    brand_name: str,
    platforms: List[str],
    sentiment_threshold: float = 0.5,
    lookback_days: int = 30
) -> Dict:
    """Configure Apify brand reputation monitoring parameters.
    
    Selects optimal actor configuration based on brand scope and monitoring needs.
    Applies multi-factor scoring: platform coverage, historical mention volume,
    and sentiment volatility.
    
    Args:
        brand_name: Target brand or product name
        platforms: List of platforms to monitor (e.g., ['twitter', 'reddit', 'news'])
        sentiment_threshold: Minimum positive sentiment score to flag as 'healthy'
        lookback_days: Historical window for baseline comparison
        
    Returns:
        Configured actor input dictionary ready for Apify API
    """
    # Guard clause - validate brand and platforms (Law 1)
    if not brand_name or not platforms:
        raise ValueError("Brand name and at least one platform are required")
        
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    normalized_platforms = [p.lower().strip() for p in platforms if p.strip()]
    if not normalized_platforms:
        raise ValueError("No valid platforms provided")
        
    # Calculate monitoring scope score based on platform diversity and lookback
    platform_coverage_score = len(normalized_platforms) / 5.0  # Max 5 common platforms
    historical_weight = min(lookback_days / 90.0, 1.0)
    
    # Atomic Predictability (Law 3) - Return new dict, don't mutate inputs
    actor_config = {
        "actorId": "apify/brand-monitor",
        "input": {
            "brandName": brand_name,
            "platforms": normalized_platforms,
            "startDate": _calculate_start_date(lookback_days),
            "sentimentThreshold": sentiment_threshold,
            "maxResults": 5000,
            "proxyConfiguration": {"useApifyProxy": True}
        },
        "metadata": {
            "scope_score": round(platform_coverage_score * historical_weight, 2),
            "monitoring_window_days": lookback_days,
            "timestamp": time.time()
        }
    }
    return actor_config
```


### Pattern 2: Execution with Fallback

```python
def execute_brand_monitor(
    actor_config: Dict,
    apify_client,
    fallback_source: Optional[str] = None
) -> Dict:
    """Execute Apify brand reputation monitoring with resilience patterns.
    
    Implements Fail Fast, Fail Loud (Law 4):
    - Invalid actor states halt immediately
    - API rate limits trigger exponential backoff
    - Dataset parsing failures trigger fallback to cached/recent data
    
    Args:
        actor_config: Pre-configured actor input from configure_brand_monitor
        apify_client: Initialized ApifyClient instance
        fallback_source: Optional path to cached reputation data
        
    Returns:
        Reputation analysis result with metrics, sentiment breakdown, and alerts
    """
    # Guard clause - validate client and config (Early Exit)
    if not apify_client or not actor_config.get("input"):
        raise ValueError("Invalid Apify client or actor configuration")
        
    run_id = None
    try:
        # Execute actor with timeout protection
        run = apify_client.actor(actor_config["actorId"]).call(
            input=actor_config["input"],
            timeout_secs=1800
        )
        run_id = run["id"]
        
        # Parse dataset results - Atomic Predictability (Law 3)
        dataset = apify_client.dataset(run["defaultDatasetId"])
        mentions = dataset.list_items()
        
        if not mentions:
            raise ValueError("No brand mentions retrieved from Apify dataset")
            
        # Calculate reputation metrics
        total_mentions = len(mentions)
        positive = sum(1 for m in mentions if m.get("sentiment", 0) > 0.5)
        negative = sum(1 for m in mentions if m.get("sentiment", 0) < -0.3)
        
        reputation_score = (positive - negative) / max(total_mentions, 1)
        
        # Success - Return structured result
        return {
            "success": True,
            "run_id": run_id,
            "brand": actor_config["input"]["brandName"],
            "metrics": {
                "total_mentions": total_mentions,
                "positive_ratio": round(positive / max(total_mentions, 1), 3),
                "negative_ratio": round(negative / max(total_mentions, 1), 3),
                "reputation_score": round(reputation_score, 3)
            },
            "alerts": _generate_alerts(mentions, actor_config["input"]["sentimentThreshold"]),
            "latency_ms": _calculate_latency()
        }
        
    except ApifyApiError as e:
        # Fail Fast - Don't retry on auth/config errors (Law 4)
        if e.status_code in [401, 403, 400]:
            raise ValueError(f"Apify API rejected request: {e.message}") from e
        # Transient error - fallback chain
        if fallback_source:
            return _load_cached_reputation(fallback_source)
        raise
    finally:
        if run_id:
            _cleanup_run(apify_client, run_id)
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

- [Brand Monitoring Tools Comparison](<https://www.gartner.com/reviews/market/social-listening-tools>)
- [Sentiment Analysis Methods (Stanford)](<https://web.stanford.edu/class/cs224n/>)
- [Social Listening Best Practices (Nielsen)](<https://www.nielsen.com/us/en/insights/>)
- [Reputation Management Framework (HBR)](<https://hbr.org/topic/reputation-management>)
- [Online Review Analysis Research](<https://arxiv.org/abs/1904.06625>)

## Related Skills

| Skill | Purpose |
|