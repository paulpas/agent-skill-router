---




name: apify-audience-analysis
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent apify audience analysis with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing, apify-xquik-x-research
  role: orchestration
  scope: orchestration
  triggers: apify-audience-analysis, apify audience analysis, how do i apify-audience-analysis,
    orchestrate apify-audience-analysis, automate apify-audience-analysis, agent apify-audience-analysis
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




# Apify Audience Analysis

Orchestrates intelligent skill selection and execution for apify audience analysis workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def configure_apify_audience_analysis(
    target_demographics: Dict[str, Any],
    data_sources: List[str],
    min_confidence: float = 0.7
) -> Dict[str, Any]:
    """Configure and validate Apify audience analysis parameters.
    
    Applies Law 1 (Early Exit) and Law 2 (Make illegal states unrepresentable)
    to ensure only valid audience analysis configurations are submitted.
    """
    # Law 1: Early exit on invalid inputs
    if not target_demographics or not data_sources:
        raise ValueError("Demographics and data sources are required for audience analysis")
        
    # Law 2: Validate and normalize inputs
    normalized_sources = [src.lower().strip() for src in data_sources if src]
    if not normalized_sources:
        raise ValueError("At least one valid data source must be provided")
        
    # Law 3: Return new structure, never mutate inputs
    config = {
        "actorId": "apify/audience-insights",
        "input": {
            "demographics": target_demographics,
            "data_sources": normalized_sources,
            "confidence_threshold": min_confidence,
            "output_format": "structured_json"
        },
        "meta": {
            "created_at": datetime.utcnow().isoformat(),
            "priority": "high" if min_confidence > 0.85 else "normal"
        }
    }
    
    # Validate against Apify API schema expectations
    _validate_apify_input_schema(config["input"])
    return config
```


### Pattern 2: Execution with Fallback

```python
def execute_apify_analysis_with_fallback(
    config: Dict[str, Any],
    apify_client: Any,
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute Apify audience analysis with domain-specific fallback chain.
    
    Implements Law 4 (Fail Fast, Fail Loud) and resilient execution patterns.
    """
    actor_run_id = None
    last_error = None
    
    for attempt in range(max_retries + 1):
        try:
            # Launch Apify actor run
            run = apify_client.actor(config["actorId"]).call_run(input=config["input"])
            actor_run_id = run["id"]
            
            # Wait for completion with timeout
            result = apify_client.actor_run(actor_run_id).get()
            if result["status"] != "SUCCEEDED":
                raise RuntimeError(f"Actor run failed: {result.get('status', 'unknown')}")
                
            # Law 3: Return new data structure
            return {
                "success": True,
                "actor_run_id": actor_run_id,
                "audience_segments": result.get("output", {}).get("segments", []),
                "confidence_score": result.get("output", {}).get("avg_confidence", 0.0),
                "attempts": attempt + 1
            }
            
        except RateLimitError:
            last_error = "Apify API rate limit exceeded"
            if attempt < max_retries:
                time.sleep(2 ** attempt)  # Exponential backoff
                continue
        except ActorFailedError as e:
            last_error = str(e)
            # Law 4: Fail fast on invalid actor state
            raise RuntimeError(f"Apify actor failed at attempt {attempt + 1}: {e}") from e
            
    # Fallback chain: Retry exhausted
    if actor_run_id:
        # Attempt fallback to cached/simplified analysis
        return _fallback_to_cached_analysis(config["input"]["demographics"])
        
    raise RuntimeError(f"Audience analysis failed after {max_retries + 1} attempts: {last_error}")
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

- [Audience Segmentation Methods (Wikipedia)](<https://en.wikipedia.org/wiki/Audience_segmentation>)
- [Demographic Data Analysis Best Practices](<https://www.surveymonkey.com/mp/demographic-data/>)
- [Market Research Methodologies Guide](<https://www.investopedia.com/terms/m/marketresearch.asp>)
- [Data Privacy (GDPR Overview)](<https://gdpr.eu/what-is-gdpr/>)
- [Sentiment Analysis in Social Media Analytics](<https://arxiv.org/abs/2010.13749>)

## Related Skills

| Skill | Purpose |
|
