---
name: apify-influencer-discovery
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent apify influencer discovery with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: apify-influencer-discovery, apify influencer discovery, how do i apify-influencer-discovery,
    orchestrate apify-influencer-discovery, automate apify-influencer-discovery, agent
    apify-influencer-discovery
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
# Apify Influencer Discovery

Orchestrates intelligent skill selection and execution for apify influencer discovery workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def configure_apify_influencer_search(
    request: Dict,
    available_actors: List[Dict]
) -> Dict:
    """Map influencer discovery request to optimal Apify actor configuration.
    
    Evaluates platform preference, audience metrics, and niche to select
    the most appropriate Apify actor (e.g., Instagram, TikTok, YouTube).
    Validates constraints against actor input schemas before execution.
    """
    platform = request.get("platform", "instagram").lower()
    niche = request.get("niche", "").strip()
    min_followers = int(request.get("min_followers", 10000))
    max_followers = int(request.get("max_followers", 1000000))
    
    if min_followers > max_followers:
        raise ValueError("min_followers cannot exceed max_followers")
        
    # Map platform to Apify actor ID and validate input schema
    actor_map = {
        "instagram": "apify/instagram-influencer-search",
        "tiktok": "apify/tiktok-influencer-search",
        "youtube": "apify/youtube-influencer-search"
    }
    
    actor_id = actor_map.get(platform)
    if not actor_id:
        raise ValueError(f"Unsupported platform: {platform}")
        
    # Construct validated input payload
    search_config = {
        "actorId": actor_id,
        "input": {
            "searchTerms": [niche] if niche else [],
            "minFollowers": min_followers,
            "maxFollowers": max_followers,
            "maxResults": int(request.get("max_results", 50))
        },
        "metadata": {
            "platform": platform,
            "request_id": request.get("id", "unknown"),
            "timestamp": time.time()
        }
    }
    
    # Verify actor availability and input constraints
    for actor in available_actors:
        if actor["id"] == actor_id:
            if not actor.get("status") == "available":
                raise RuntimeError(f"Actor {actor_id} is currently unavailable")
            break
            
    return search_config
```


### Pattern 2: Execution with Fallback

```python
def run_influencer_discovery_pipeline(
    config: Dict,
    apify_client: ApifyClient,
    fallback_platforms: List[str] = None
) -> Dict:
    """Execute Apify influencer search with platform fallback chain.
    
    Polls Apify run status, fetches dataset results, and applies
    fallback to alternative platforms if the primary search yields
    insufficient results or encounters API errors.
    """
    if fallback_platforms is None:
        fallback_platforms = ["tiktok", "youtube", "twitter"]
        
    current_platform = config["metadata"]["platform"]
    attempts = 0
    max_attempts = len(fallback_platforms) + 1
    
    while attempts < max_attempts:
        try:
            # Start Apify run and poll for completion
            run = apify_client.actor(config["actorId"]).call_run(input=config["input"])
            run_id = run["id"]
            
            # Poll until run finishes or times out
            while True:
                status = apify_client.run(run_id).get()
                if status["status"] in ["SUCCEEDED", "FAILED", "TIMED_OUT"]:
                    break
                time.sleep(5)
                
            if status["status"] != "SUCCEEDED":
                raise RuntimeError(f"Apify run {run_id} failed with status: {status['status']}")
                
            # Fetch and parse results
            dataset = apify_client.dataset(status["defaultDatasetId"]).list_items()
            influencers = list(dataset)
            
            # Validate result quality
            if len(influencers) < 5:
                raise ValueError(f"Insufficient results ({len(influencers)}). Switching platform.")
                
            return {
                "success": True,
                "platform": current_platform,
                "influencer_count": len(influencers),
                "data": influencers,
                "run_id": run_id
            }
            
        except (RuntimeError, ValueError) as e:
            attempts += 1
            if attempts >= max_attempts:
                raise RuntimeError(f"All platforms exhausted. Last error: {str(e)}")
            # Fallback: switch platform and retry
            current_platform = fallback_platforms[attempts - 1]
            config["metadata"]["platform"] = current_platform
            config["actorId"] = _get_actor_for_platform(current_platform)
            config["input"]["searchTerms"] = [config["metadata"].get("fallback_niche", "general")]
            continue
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

- [Influencer Marketing Industry Report (influencermarketinghub)](<https://influencermarketinghub.com/influencer-marketing-rate-card/>)
- [Social Media API Access Guidelines](<https://developers.facebook.com/docs/graph-api>)
- [Audience Authenticity Analysis Methods](<https://www.nielsen.com/us/en/insights/2019/social-media-measurement-influencers/>)
- [Instagram Graph API Reference](<https://developers.facebook.com/docs/instagram-api/>)
- [YouTube Data API v3 Documentation](<https://developers.google.com/youtube/v3>)

## Related Skills

| Skill | Purpose |
|