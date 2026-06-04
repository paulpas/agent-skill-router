---
name: notion-automation
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent notion automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: notion-automation, notion automation, how do i notion-automation, orchestrate
    notion-automation, automate notion-automation, agent notion-automation
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
# Notion Automation

Orchestrates intelligent skill selection and execution for notion automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def resolve_notion_action(
    user_intent: str,
    available_notion_ops: List[Dict],
    min_confidence: float = 0.75
) -> Optional[Dict]:
    """Map user intent to a specific Notion API operation.
    
    Evaluates triggers against Notion's resource types (pages, databases, blocks)
    and applies multi-factor scoring based on historical success and API health.
    """
    if not user_intent or not user_intent.strip():
        raise ValueError("User intent cannot be empty")
        
    if not available_notion_ops:
        raise ValueError("No Notion operations registered")
        
    # Parse intent into Notion-specific features (resource type, action verb, target ID)
    intent_features = _parse_notion_intent(user_intent)
    
    best_op = None
    best_score = 0.0
    
    for op in available_notion_ops:
        # Score based on resource match, verb alignment, and API availability
        score = _calculate_notion_match_score(intent_features, op)
        
        if score > best_score and score >= min_confidence:
            best_score = score
            best_op = op
            
    if best_op is None:
        return None
        
    # Return immutable operation config (Law 3: Atomic Predictability)
    return {
        "operation": best_op["name"],
        "resource_type": best_op["resource"],
        "confidence": best_score,
        "params": best_op.get("default_params", {}),
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_notion_operation_with_retry(
    operation: Dict,
    notion_client: Any,
    max_retries: int = 2
) -> Dict:
    """Execute a Notion API operation with resilience patterns.
    
    Implements Fail Fast, Fail Loud for invalid Notion states:
    - Missing page/database IDs halt immediately
    - Rate limits trigger exponential backoff
    - Fallback chain handles transient API failures
    """
    if not operation or "operation" not in operation:
        raise ValueError("Invalid operation configuration")
        
    resource_type = operation.get("resource_type")
    params = operation.get("params", {})
    
    for attempt in range(max_retries + 1):
        try:
            # Route to specific Notion API endpoint based on operation type
            if resource_type == "page":
                result = notion_client.pages.create(**params)
            elif resource_type == "database":
                result = notion_client.databases.query(**params)
            elif resource_type == "block":
                result = notion_client.blocks.children.append(**params)
            else:
                raise ValueError(f"Unsupported Notion resource: {resource_type}")
                
            return {
                "success": True,
                "operation": operation["operation"],
                "result": result,
                "attempts": attempt + 1,
                "latency_ms": _measure_latency()
            }
            
        except RateLimitError as e:
            if attempt == max_retries:
                return _apply_notion_fallback(operation, e)
            time.sleep(2 ** attempt) # Exponential backoff for 429s
            
        except InvalidStateError as e:
            # Fail Fast - Notion IDs or schemas are invalid (Law 4)
            raise ValueError(f"Notion state invalid: {str(e)}") from e
            
    raise ValueError(f"Notion operation failed after {max_retries + 1} attempts")
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

---

---

## Constraints

### MUST DO
- Implement idempotent automation triggers: running the same automation twice should not create duplicate resources or actions
- Validate all trigger conditions with explicit allowlists before executing automated actions
- Include rollback procedures in every automation workflow — every CREATE should have a corresponding DELETE capability
- Log all automation executions with input state, output state, duration, and any errors for monitoring and debugging

### MUST NOT DO
- Do not create circular automation loops where trigger A causes action B which triggers A again
- Avoid using automations that modify production data without explicit human approval gates
- Never embed API keys or credentials directly in automation workflows — use vaulted secrets with rotation
- Do not assume external service availability; implement retry logic with exponential backoff and dead-letter queues


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [Notion API Documentation](<https://developers.notion.com/reference/intro>)
- [Notion Database API Operations](<https://developers.notion.com/reference/post-database-query-filter>)
- [Notion Block-Level Content Manipulation](<https://developers.notion.com/reference/patch-block-children>)
- [Notion Webhooks and Sync Events](<https://developers.notion.com/reference/create-a-webhook>)
- [Notion SDK for Python (notion-sdk-py)](<https://github.com/ramnes/notion-sdk-py>)
