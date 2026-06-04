---
name: apify-ultimate-scraper
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent apify ultimate scraper with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: apify-ultimate-scraper, apify ultimate scraper, how do i apify-ultimate-scraper,
    orchestrate apify-ultimate-scraper, automate apify-ultimate-scraper, agent apify-ultimate-scraper
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
# Apify Ultimate Scraper

Orchestrates intelligent skill selection and execution for apify ultimate scraper workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def configure_apify_actor(
    task_requirements: Dict,
    available_actors: List[Dict],
    api_key: str
) -> Dict:
    """Select and configure the optimal Apify actor for web scraping tasks.
    
    Evaluates actors based on:
    - Target platform compatibility (e.g., e-commerce, social media, search)
    - Rate limiting and proxy requirements
    - Historical success rates for similar domains
    - Current actor version stability
    
    Args:
        task_requirements: Dict containing target_url, data_type, pagination, etc.
        available_actors: List of Apify actor metadata from marketplace
        api_key: Apify API token for authentication
        
    Returns:
        Configured actor dict with input parameters and execution settings
    """
    if not api_key or not task_requirements.get("target_url"):
        raise ValueError("Apify API key and target URL are required")
        
    best_match = None
    best_score = 0.0
    
    for actor in available_actors:
        score = _evaluate_actor_fit(task_requirements, actor)
        if score > best_score and score >= 0.75:
            best_score = score
            best_match = actor
            
    if not best_match:
        raise ValueError("No compatible Apify actor found for target requirements")
        
    # Construct Apify input payload
    input_config = {
        "startUrls": [{"url": task_requirements["target_url"]}],
        "maxItems": task_requirements.get("max_items", 1000),
        "proxyConfiguration": {"useApifyProxy": True},
        "customData": {"task_id": task_requirements.get("task_id")}
    }
    
    return {
        "actor_id": best_match["defaultActorId"],
        "actor_name": best_match["name"],
        "input": input_config,
        "memory_mbytes": task_requirements.get("memory_mb", 4096),
        "timeout_secs": task_requirements.get("timeout", 3600)
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_apify_run(
    actor_config: Dict,
    api_key: str,
    fallback_actors: List[str] = None
) -> Dict:
    """Execute an Apify actor run with dataset polling and fallback handling.
    
    Implements resilient scraping workflow:
    - Starts actor run with configured input parameters
    - Polls run status until completion or timeout
    - Fetches results from Apify dataset storage
    - Falls back to alternative actors or cached data on failure
    
    Args:
        actor_config: Output from configure_apify_actor
        api_key: Apify API token
        fallback_actors: List of alternative actor IDs to try on failure
        
    Returns:
        Dict containing scraped data, run metadata, and success status
    """
    import requests
    from time import sleep
    
    run_url = f"https://api.apify.com/v2/actor-runs"
    headers = {"Authorization": f"Bearer {api_key}"}
    
    # Start the actor run
    start_response = requests.post(
        run_url, 
        headers=headers, 
        json={"actorId": actor_config["actor_id"], "buildType": "latest", "memoryMbytes": actor_config["memory_mbytes"]}
    )
    start_response.raise_for_status()
    run_id = start_response.json()["id"]
    
    # Poll until completion
    status_url = f"https://api.apify.com/v2/actor-runs/{run_id}/pollForExit"
    sleep(5)
    status_resp = requests.get(status_url, headers=headers)
    status_resp.raise_for_status()
    run_status = status_resp.json()
    
    if run_status.get("status") != "SUCCEEDED":
        # Fallback chain: try alternative actors
        if fallback_actors:
            for alt_actor in fallback_actors:
                alt_config = dict(actor_config)
                alt_config["actor_id"] = alt_actor
                return execute_apify_run(alt_config, api_key, fallback_actors=[])
        raise RuntimeError(f"Apify run {run_id} failed with status: {run_status.get('status')}")
        
    # Fetch dataset results
    dataset_url = f"https://api.apify.com/v2/datasets/{run_status['defaultDatasetId']}/items"
    data_resp = requests.get(dataset_url, headers=headers)
    data_resp.raise_for_status()
    
    return {
        "success": True,
        "run_id": run_id,
        "actor_used": actor_config["actor_name"],
        "items_scraped": len(data_resp.json()),
        "data": data_resp.json()
    }
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


## Related Skills

| Skill | Purpose |
|