---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent apify lead generation with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: apify-lead-generation, apify lead generation, how do i apify-lead-generation,
    orchestrate apify-lead-generation, automate apify-lead-generation, agent apify-lead-generation
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
name: apify-lead-generation
------
# Apify Lead Generation

Orchestrates intelligent skill selection and execution for apify lead generation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def configure_apify_lead_run(
    target_industry: str,
    location: str,
    max_leads: int,
    apify_api_token: str
) -> Dict:
    """Configure an Apify Actor run for lead generation with domain-specific validation.
    
    Maps user intent to Apify Actor parameters and validates against 
    known lead generation constraints (Law 2: Make Illegal States Unrepresentable).
    """
    # Guard clause - Early Exit (Law 1)
    if not target_industry or not location:
        raise ValueError("Industry and location are required for lead targeting")
    if max_leads <= 0 or max_leads > 5000:
        raise ValueError("Max leads must be between 1 and 5000")
        
    # Domain-specific parameter mapping for Apify Web Scraper
    actor_inputs = {
        "keywords": [f"{target_industry} companies in {location}"],
        "maxItems": max_leads,
        "useGoogleMaps": True,
        "outputFormat": "json",
        "fields": ["name", "website", "email", "phone", "address"]
    }
    
    # Validate against Apify Actor schema constraints
    if not _validate_apify_actor_inputs(actor_inputs):
        raise ValueError("Invalid actor configuration for lead generation")
        
    # Atomic Predictability (Law 3) - Return new dict, don't mutate
    run_config = {
        "actor_id": "apify/website-content-scraper",
        "input": actor_inputs,
        "token": apify_api_token,
        "timeoutSecs": 3600,
        "memoryMbytes": 4096
    }
    return run_config
```


### Pattern 2: Execution with Fallback

```python
def execute_apify_run_with_fallback(
    run_config: Dict,
    fallback_data_source: str = "local_cache"
) -> Dict:
    """Execute Apify lead generation run with domain-specific retry and fallback logic.
    
    Implements Fail Fast, Fail Loud (Law 4) for API errors and rate limits.
    Fallback chain: 1. Retry with exponential backoff 2. Switch to alternative actor 3. Load from cache
    """
    import time
    from apify_client import ApifyClient
    
    client = ApifyClient(run_config["token"])
    actor = client.actor(run_config["actor_id"])
    
    for attempt in range(3):
        try:
            # Start run and poll for completion
            run = actor.run(run_config["input"])
            run_id = run["id"]
            
            # Wait for actor to finish (Law 2: Trusted state)
            result = client.run_get_dataset_items(run_id)
            
            if not result:
                raise ValueError("Apify run completed but returned zero leads")
                
            # Process and validate lead data
            validated_leads = _validate_lead_schema(result)
            return {
                "success": True,
                "leads_count": len(validated_leads),
                "data": validated_leads,
                "source": "apify_live"
            }
            
        except Exception as e:
            # Transient API/Rate limit error - retry with backoff
            if attempt < 2:
                time.sleep(2 ** attempt)
                continue
            # All retries exhausted - Fail Loud (Law 4)
            return _apply_lead_fallback(fallback_data_source, run_config)
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

- [Lead Generation Best Practices (HubSpot)](<https://www.hubspot.com/marketing-statistics>)
- [CRM Integration Patterns (Salesforce)](<https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/>)
- [Data Enrichment Methods Overview](<https://en.wikipedia.org/wiki/Data_enrichment>)
- [B2B Lead Data Sources (ZoomInfo)](<https://www.zoominfo.com/company/blog/b2b-lead-generation-guide>)
- [GDPR Compliance for Lead Generation](<https://gdpr.eu/business/what-is-gdpr-compliance/>)

## Related Skills

| Skill | Purpose |
|