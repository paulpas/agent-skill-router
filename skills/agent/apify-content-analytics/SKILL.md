---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent apify content analytics with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: apify-content-analytics, apify content analytics, how do i apify-content-analytics,
    orchestrate apify-content-analytics, automate apify-content-analytics, agent apify-content-analytics
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
name: apify-content-analytics
------
# Apify Content Analytics

Orchestrates intelligent skill selection and execution for apify content analytics workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def analyze_apify_content_metrics(
    actor_id: str,
    run_id: str,
    api_token: str,
    metrics_config: Dict[str, Any]
) -> Dict[str, Any]:
    """Fetch and analyze content metrics from an Apify actor run.
    
    Implements Law 2 (Parse at boundary) by validating Apify API inputs
    and Law 3 (Atomic Predictability) by returning fresh metric objects.
    """
    # Guard clause - Early Exit (Law 1)
    if not actor_id or not run_id:
        raise ValueError("actor_id and run_id are required for content analysis")
        
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    client = ApifyClient(api_token)
    run = client.actor(actor_id).run(run_id)
    
    # Fetch dataset items with pagination handling
    items = []
    cursor = None
    while True:
        page = run.dataset().list_items(limit=100, cursor=cursor)
        items.extend(page.get("items", []))
        if not page.get("hasMore"):
            break
        cursor = page.get("cursor")
        
    # Calculate domain-specific metrics
    content_metrics = {
        "total_items": len(items),
        "avg_readability": _calculate_readability(items),
        "sentiment_distribution": _compute_sentiment(items),
        "engagement_score": _compute_engagement(items, metrics_config)
    }
    
    # Atomic Predictability (Law 3) - Return new structure
    return {
        "actor_id": actor_id,
        "run_id": run_id,
        "metrics": content_metrics,
        "analysis_timestamp": datetime.utcnow().isoformat(),
        "confidence": 0.95 if len(items) > 50 else 0.75
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_content_analysis_with_fallback(
    actor_id: str,
    input_params: Dict[str, Any],
    fallback_actors: List[str],
    api_token: str
) -> Dict[str, Any]:
    """Execute Apify content analysis with domain-specific fallback chain.
    
    Implements Fail Fast, Fail Loud (Law 4) for Apify API errors.
    Fallback chain: 1. Retry run 2. Try alternative actor 3. Return cached metrics
    """
    # Guard clause - validate actor exists (Early Exit)
    if not _validate_actor_availability(actor_id, api_token):
        raise ValueError(f"Actor {actor_id} is unavailable or invalid")
        
    client = ApifyClient(api_token)
    actor = client.actor(actor_id)
    
    for attempt in range(3):
        try:
            # Execute actor with input parameters
            run = actor.run(input_params)
            run.wait_for_finish(timeout=300)
            
            # Parse output - Ensure trusted state (Law 2)
            dataset_items = run.dataset().list_items().get("items", [])
            if not dataset_items:
                raise ValueError("Actor returned empty dataset")
                
            # Success - Atomic Predictability (Law 3)
            return {
                "success": True,
                "actor_executed": actor_id,
                "run_id": run.id,
                "metrics": _compute_analytics(dataset_items),
                "attempts": attempt + 1,
                "latency_ms": run.metrics.get("ACTOR_RUN_DURATION_MILLIS", 0)
            }
            
        except ApifyApiError as e:
            # Fail Fast - Don't retry on auth/permission errors (Law 4)
            if e.status_code in (401, 403, 404):
                raise ValueError(f"Apify API error: {e.message}") from e
                
            # Transient error (rate limit, timeout) - retry
            if attempt == 2:
                return _apply_apify_fallback(actor_id, fallback_actors, input_params, api_token)
                
    # All retries exhausted - Fail Loud (Law 4)
    raise ValueError(f"Content analysis failed after 3 attempts for {actor_id}")
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