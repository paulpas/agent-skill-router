---




name: apify-actorization
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent apify actorization with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: apify-actorization, apify actorization, how do i apify-actorization, orchestrate
    apify-actorization, automate apify-actorization, agent apify-actorization
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




# Apify Actorization

Orchestrates intelligent skill selection and execution for apify actorization workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def validate_and_prepare_actor_config(
    actor_id: str,
    input_data: Dict[str, Any],
    api_token: str,
    min_memory_mb: int = 256
) -> Dict[str, Any]:
    """Prepare and validate configuration for an Apify actor run.
    
    Implements Law 2 (Parse at boundary) by validating Apify-specific
    input schemas and memory constraints before API submission.
    
    Args:
        actor_id: Target Apify actor ID
        input_data: User-provided input payload
        api_token: Apify API token for authentication
        min_memory_mb: Minimum memory requirement for the actor
        
    Returns:
        Validated configuration payload ready for Apify API
        
    Raises:
        ConfigurationError: If input violates Apify schema or constraints
    """
    # Law 1: Early exit on invalid inputs
    if not actor_id or not re.match(r'^[a-zA-Z0-9_-]+$', actor_id):
        raise ConfigurationError(f"Invalid actor ID format: {actor_id}")
    if not api_token or len(api_token) < 20:
        raise ConfigurationError("Apify API token is missing or malformed")
        
    # Law 2: Parse & validate input schema
    validated_input = {}
    for key, value in input_data.items():
        if isinstance(value, str) and len(value) > 10000:
            raise ConfigurationError(f"Input field '{key}' exceeds 10KB limit")
        validated_input[key] = value
        
    # Construct Apify-specific run configuration
    config = {
        "actorId": actor_id,
        "input": validated_input,
        "memoryMbytes": max(min_memory_mb, 256),
        "timeoutSecs": 3600,
        "waitSecs": 30
    }
    
    # Law 3: Return new structure, never mutate original input_data
    return {
        "config": config,
        "validation_timestamp": time.time(),
        "schema_version": "v1"
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_apify_run_with_resilience(
    config: Dict[str, Any],
    api_client: ApifyClient,
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute an Apify actor run with domain-specific fallback chains.
    
    Implements Law 4 (Fail Fast/Loud) by immediately surfacing
    Apify API errors, timeouts, and crawler failures.
    
    Fallback chain:
    1. Retry with exponential backoff on transient API errors
    2. Switch to alternative actor if configured in metadata
    3. Export partial results to storage bucket
    4. Raise structured error for human review
    
    Args:
        config: Validated actor configuration from Pattern 1
        api_client: Initialized ApifyClient instance
        max_retries: Maximum retry attempts for transient failures
        
    Returns:
        Run result with status, output dataset URL, and timing metadata
    """
    actor_id = config["actorId"]
    run_id = None
    
    for attempt in range(max_retries + 1):
        try:
            # Initiate run and poll for completion
            run = api_client.actor(actor_id).call(
                input=config["input"],
                memory=config["memoryMbytes"],
                timeoutSecs=config["timeoutSecs"]
            )
            run_id = run["id"]
            
            # Wait for actor to finish
            api_client.run(run_id).waitForFinish(timeoutSecs=3600)
            
            # Law 3: Atomic result construction
            result = {
                "run_id": run_id,
                "status": run["status"],
                "dataset_url": f"https://api.apify.com/v2/datasets/{run['defaultDatasetId']}/items",
                "attempts": attempt + 1,
                "completed_at": time.time()
            }
            return result
            
        except ApifyApiError as e:
            # Law 4: Fail loud on API errors
            if e.status_code in (429, 500, 503):
                if attempt == max_retries:
                    return _fallback_to_alternative_actor(config, api_client)
                time.sleep(2 ** attempt)
            else:
                raise ExecutionError(f"Apify API error: {e.message}") from e
                
        except CrawlerError as e:
            # Actor failed during execution - export partial data
            return _export_partial_results(run_id, api_client)
            
    raise ExecutionError(f"Actor {actor_id} failed after {max_retries + 1} attempts")
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