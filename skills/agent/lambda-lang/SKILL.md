---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent lambda lang with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: lambda-lang, lambda lang, how do i lambda-lang, orchestrate lambda-lang,
    automate lambda-lang, agent lambda-lang, serverless functions, lambda
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
name: lambda-lang
------
# Lambda Lang

Orchestrates intelligent skill selection and execution for lambda lang workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def parse_and_score_lambda_request(
    raw_request: str,
    available_lambdas: List[Dict],
    min_confidence: float = 0.75
) -> Optional[Dict]:
    """Parse a lambda-lang request and score against available serverless functions.
    
    Implements Law 1 (Early Exit) and Law 2 (Immutable State) by validating
    the request structure before attempting any scoring or routing.
    """
    if not raw_request or not isinstance(raw_request, str):
        raise ValueError("Lambda-lang request must be a non-empty string")
        
    # Law 2: Parse at boundary, never mutate raw input
    parsed = _parse_lambda_syntax(raw_request)
    if not parsed.get("intent") or not parsed.get("target_service"):
        raise ValueError("Missing required lambda-lang fields: intent, target_service")
        
    best_match = None
    best_score = 0.0
    
    for func in available_lambdas:
        # Multi-factor scoring: trigger match, historical latency, region health
        trigger_match = _calculate_trigger_similarity(parsed["intent"], func.get("triggers", []))
        latency_penalty = func.get("avg_cold_start_ms", 0) / 1000.0
        region_health = func.get("availability_score", 1.0)
        
        score = (trigger_match * 0.6) + ((1.0 - latency_penalty) * 0.2) + (region_health * 0.2)
        
        if score > best_score and score >= min_confidence:
            best_score = score
            best_match = func
            
    if best_match is None:
        return None
        
    # Law 3: Return new structure, preserve original function metadata
    return {
        "selected_function": best_match["arn"],
        "confidence": best_score,
        "parsed_intent": parsed,
        "routing_metadata": {"timestamp": time.time(), "region": best_match.get("preferred_region")}
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_lambda_with_fallback(
    routing_result: Dict,
    execution_context: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute a selected lambda function with a serverless-aware fallback chain.
    
    Implements Law 4 (Fail Fast) by immediately rejecting invalid execution contexts
    and Law 1 by exiting early on transient network failures before exhausting retries.
    """
    if not routing_result or not execution_context.get("payload"):
        raise ValueError("Missing routing result or execution payload")
        
    target_arn = routing_result["selected_function"]
    payload = execution_context["payload"]
    
    for attempt in range(max_retries + 1):
        try:
            # Law 3: Pass immutable payload copy to avoid side effects
            result = _invoke_lambda(target_arn, payload.copy())
            
            return {
                "status": "success",
                "function_arn": target_arn,
                "output": result.get("Payload"),
                "latency_ms": result.get("ResponseMetadata", {}).get("HTTPHeaders", {}).get("x-amzn-RequestId"),
                "attempts": attempt + 1
            }
            
        except LambdaColdStartError:
            # Law 4: Fail fast on known cold start, trigger fallback immediately
            if attempt == 0:
                return _fallback_to_provisioned_concurrency(target_arn, payload)
            continue
            
        except TransientNetworkError:
            if attempt == max_retries:
                return _fallback_to_edge_function(target_arn, payload)
            continue
            
    # All retries exhausted
    raise LambdaExecutionError(f"Failed to invoke {target_arn} after {max_retries + 1} attempts")
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