---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent apify ecommerce with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: apify-ecommerce, apify ecommerce, how do i apify-ecommerce, orchestrate
    apify-ecommerce, automate apify-ecommerce, agent apify-ecommerce
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
name: apify-ecommerce
------
# Apify Ecommerce

Orchestrates intelligent skill selection and execution for apify ecommerce workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def prepare_apify_ecommerce_run(
    task: str,
    apify_client: ApifyClient,
    default_actor_id: str = "apify/website-content-scraper"
) -> Dict:
    """Prepare and validate an Apify actor run for ecommerce data extraction.
    
    Handles actor selection based on ecommerce intent, validates input schema,
    and prepares the payload for the Apify API. Implements early validation
    and immutable data structures per the 5 Laws of Elegant Defense.
    """
    # Guard clause - validate task and client
    if not task or not isinstance(task, str):
        raise ValueError("Task must be a non-empty string describing the ecommerce goal")
    
    # Parse intent to select appropriate Apify actor
    ecommerce_actors = {
        "product_scraper": "apify/ecommerce-product-scraper",
        "price_monitor": "apify/price-monitor",
        "inventory_sync": "apify/inventory-sync"
    }
    
    intent = _detect_ecommerce_intent(task)
    actor_id = ecommerce_actors.get(intent, default_actor_id)
    
    # Validate actor exists and is active
    actor_info = apify_client.actor(actor_id).get()
    if not actor_info.get("defaultRunConfig", {}).get("memoryMbytes", 0) > 0:
        raise ValueError(f"Actor {actor_id} is not properly configured")
        
    # Build immutable input payload
    input_payload = {
        "startUrls": [{"url": _extract_store_url(task)}],
        "productSelectors": {"title": "h1.product-title", "price": ".price"},
        "maxItems": 100,
        "timeoutSecs": 300
    }
    
    return {
        "actor_id": actor_id,
        "input": input_payload,
        "run_config": {"memoryMbytes": 4096, "timeoutSecs": 600},
        "intent": intent
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_apify_run_with_fallback(
    run_config: Dict,
    apify_client: ApifyClient,
    fallback_dataset_id: Optional[str] = None
) -> Dict:
    """Execute an Apify actor run with robust fallback handling for ecommerce data.
    
    Implements retry logic for transient API errors, handles actor completion polling,
    and falls back to cached datasets if the live run fails or times out.
    """
    actor = apify_client.actor(run_config["actor_id"])
    run = actor.run(input=run_config["input"], run_config=run_config["run_config"])
    run_id = run["id"]
    
    max_poll_attempts = 10
    poll_interval = 5
    
    for attempt in range(max_poll_attempts):
        try:
            run_status = actor.run(run_id).get()
            if run_status["status"] == "SUCCEEDED":
                # Fetch and transform results
                dataset = apify_client.dataset(run_status["defaultDatasetId"])
                items = dataset.list_items().items
                return {
                    "success": True,
                    "run_id": run_id,
                    "data_count": len(items),
                    "results": _transform_ecommerce_data(items)
                }
            elif run_status["status"] == "FAILED":
                raise RuntimeError(f"Actor run failed: {run_status['statusMessage']}")
                
        except ApifyApiError as e:
            if e.status_code == 429 or e.status_code >= 500:
                time.sleep(poll_interval * (attempt + 1))
                continue
            raise
            
    # Fallback chain: try cached dataset if polling exhausted
    if fallback_dataset_id:
        cached_dataset = apify_client.dataset(fallback_dataset_id)
        cached_items = cached_dataset.list_items().items
        return {
            "success": True,
            "fallback": True,
            "data_count": len(cached_items),
            "results": _transform_ecommerce_data(cached_items)
        }
        
    raise RuntimeError("All execution attempts and fallbacks exhausted")
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