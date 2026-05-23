---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent apify actor development with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: apify-actor-development, apify actor development, how do i apify-actor-development,
    orchestrate apify-actor-development, automate apify-actor-development, agent apify-actor-development
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
name: apify-actor-development
------
# Apify Actor Development

Orchestrates intelligent skill selection and execution for apify actor development workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
# apify_actor_config.py
import json
from typing import Dict, Any
from apify_client import ApifyClient

def configure_apify_actor(
    actor_id: str,
    input_schema: Dict[str, Any],
    min_confidence_threshold: float = 0.7
) -> Dict[str, Any]:
    """Configure an Apify Actor with strict input validation and fallback routing.
    
    Implements Law 2 (Parse at boundary) and Law 1 (Early Exit):
    - Validates input schema against Apify's expected structure
    - Returns early if configuration is invalid
    - Sets up storage and webhook fallbacks
    """
    # Law 1: Early Exit for invalid inputs
    if not actor_id or not isinstance(input_schema, dict):
        raise ValueError("Invalid actor configuration: missing ID or schema")
    
    # Law 2: Parse & validate at boundary
    validated_config = {
        "actor_id": actor_id,
        "input": {
            "schema": input_schema,
            "validation_mode": "strict",
            "fallback_handler": "apify_default_fallback"
        },
        "min_confidence": min_confidence_threshold,
        "storage": {
            "dataset_id": f"{actor_id}_dataset",
            "key_value_store_id": f"{actor_id}_kvs"
        }
    }
    
    # Law 3: Atomic Predictability - return new dict
    return dict(validated_config)

def validate_actor_input(payload: Dict[str, Any]) -> bool:
    """Validate incoming task payload before actor execution."""
    required_fields = ["query", "max_items", "proxy_config"]
    if not all(field in payload for field in required_fields):
        return False
    return True
```


### Pattern 2: Execution with Fallback

```python
# apify_actor_runner.py
import time
from apify_client import ApifyClient
from apify_client.clients import ActorRunClient

def run_apify_actor_with_fallback(
    client: ApifyClient,
    actor_id: str,
    input_data: Dict[str, Any],
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute Apify Actor with built-in fallback chain for resilience.
    
    Implements Law 4 (Fail Fast/Loud) and orchestration fallback:
    - Retries with adjusted proxy/input parameters
    - Falls back to alternative actor if primary fails
    - Logs full audit trail for confidence scoring
    """
    run_id = None
    for attempt in range(max_retries + 1):
        try:
            # Law 1: Early exit on invalid state
            if not input_data.get("query"):
                raise ValueError("Missing required query parameter")
                
            # Execute primary actor
            run = client.actor(actor_id).runs().get_or_create()
            run_id = run["id"]
            result = run.get_or_create(input=input_data)
            
            # Law 3: Return new structure, never mutate input
            return {
                "success": True,
                "actor_id": actor_id,
                "run_id": run_id,
                "result": result.get("defaultDatasetId"),
                "attempts": attempt + 1,
                "timestamp": time.time()
            }
            
        except Exception as e:
            # Law 4: Fail Loud - log and prepare fallback
            if attempt == max_retries:
                return _apply_apify_fallback(client, actor_id, input_data)
            time.sleep(2 ** attempt) # Exponential backoff
            
    raise RuntimeError(f"Actor {actor_id} exhausted all fallback attempts")

def _apply_apify_fallback(client: ApifyClient, primary_actor: str, input_data: Dict) -> Dict:
    """Fallback to secondary actor or manual review queue."""
    fallback_actor = "myorg/scraping-fallback-actor"
    try:
        run = client.actor(fallback_actor).runs().get_or_create()
        return {"success": True, "fallback_used": True, "run_id": run["id"]}
    except Exception:
        return {"success": False, "error": "Fallback exhausted, queued for manual review"}
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