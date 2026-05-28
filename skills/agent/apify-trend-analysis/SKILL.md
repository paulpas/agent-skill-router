---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent apify trend analysis with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: apify-trend-analysis, apify trend analysis, how do i apify-trend-analysis,
    orchestrate apify-trend-analysis, automate apify-trend-analysis, agent apify-trend-analysis
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
name: apify-trend-analysis
------
# Apify Trend Analysis

Orchestrates intelligent skill selection and execution for apify trend analysis workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_apify_actor_for_trend(
    request: Dict,
    available_actors: List[Dict],
    api_key: str
) -> Dict:
    """Select optimal Apify actor for trend analysis based on request parameters.
    
    Evaluates actors by matching data source requirements, timeframe constraints,
    and metric compatibility. Validates API key and actor availability.
    """
    if not request.get("data_source") or not request.get("timeframe"):
        raise ValueError("Request must include 'data_source' and 'timeframe'")
    
    source = request["data_source"].lower()
    timeframe = request["timeframe"]
    target_metrics = request.get("metrics", ["volume", "price"])
    
    best_match = None
    best_score = 0.0
    
    for actor in available_actors:
        score = 0.0
        if actor.get("data_source") == source:
            score += 0.5
        if actor.get("supported_timeframes") and timeframe in actor["supported_timeframes"]:
            score += 0.3
        if set(target_metrics).issubset(set(actor.get("supported_metrics", []))):
            score += 0.2
            
        if score > best_score:
            best_score = score
            best_match = actor
            
    if best_score < 0.7:
        return {"status": "fallback_required", "reason": "insufficient_actor_match"}
        
    return {
        "actor_id": best_match["actor_id"],
        "input_config": {
            "source": source,
            "timeframe": timeframe,
            "metrics": target_metrics,
            "max_items": request.get("max_items", 100)
        },
        "confidence": best_score,
        "validation": "passed"
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_apify_trend_analysis(
    actor_config: Dict,
    apify_client,
    fallback_strategy: str = "cache_or_manual"
) -> Dict:
    """Execute Apify actor and process trend analysis results with fallback handling.
    
    Handles API submission, run monitoring, result parsing, and implements
    Apify-specific fallbacks (cached data, alternative actor, or manual review).
    """
    try:
        # Submit actor run with validated config
        run = apify_client.actor(actor_config["actor_id"]).call_run(
            input=actor_config["input_config"]
        )
        
        # Monitor until completion
        run_info = apify_client.run(run["id"]).get()
        if run_info["status"] != "SUCCEEDED":
            raise RuntimeError(f"Apify run failed: {run_info['status']}")
            
        # Fetch and parse trend data
        dataset = apify_client.dataset(run_info["defaultDatasetId"]).list_items()
        trend_records = [item for item in dataset if item.get("timestamp")]
        
        if not trend_records:
            raise ValueError("No trend data returned from Apify actor")
            
        # Process and aggregate trends
        processed_trends = _aggregate_trend_metrics(trend_records)
        
        return {
            "status": "success",
            "actor_run_id": run["id"],
            "trend_data": processed_trends,
            "record_count": len(trend_records),
            "confidence": 0.95
        }
        
    except apify_client.errors.ApiError as e:
        # Apify-specific fallback chain
        if fallback_strategy == "cache_or_manual":
            return _fallback_to_cached_trends(actor_config)
        elif fallback_strategy == "alternative_actor":
            return _execute_alternative_apify_actor(actor_config)
        else:
            raise RuntimeError(f"Apify API error: {str(e)}") from e
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

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Google Trends API (Google)](<https://trends.google.com/trending>)
- [Trend Analysis Methods (Harvard Business Review)](<https://hbr.org/topic/data-analytics>)
- [Python pandas Documentation](<https://pandas.pydata.org/docs/>)
- [Time Series Forecasting (Prophet by Meta)](<https://facebook.github.io/prophet/>)
- [Trend Detection Algorithms Survey (arXiv)](<https://arxiv.org/abs/1809.05286>)

## Related Skills

| Skill | Purpose |
|