---
name: hubspot-automation
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent hubspot automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: hubspot-automation, hubspot automation, how do i hubspot-automation, orchestrate
    hubspot-automation, automate hubspot-automation, agent hubspot-automation
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
# Hubspot Automation

Orchestrates intelligent skill selection and execution for hubspot automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_skill(
    task_description: str,
    available_skills: List[Dict],
    min_confidence: float = 0.7
) -> Optional[Dict]:
    """Route HubSpot automation requests to the correct CRM endpoint.
    
    Validates input against HubSpot schema requirements and selects
    the optimal API endpoint (contacts, deals, companies, tickets)
    based on entity type, required properties, and rate limit status.
    
    Args:
        task_description: Natural language description of the CRM task
        available_skills: List of HubSpot endpoint skill metadata
        min_confidence: Minimum confidence threshold (0.0-1.0)
        
    Returns:
        Selected endpoint skill dictionary or None if no match meets threshold
    """
    if not task_description or not task_description.strip():
        raise ValueError("Task description cannot be empty")
        
    if not available_skills:
        raise ValueError("No HubSpot endpoints available for selection")
    
    # Parse HubSpot entity type and required properties
    entity_type = _extract_hubspot_entity(task_description)
    required_props = _parse_property_requirements(task_description)
    
    best_endpoint = None
    best_score = 0.0
    
    for skill in available_skills:
        if skill.get("endpoint_type") != entity_type:
            continue
            
        # Score based on property coverage and current API health
        prop_match = _calculate_property_coverage(required_props, skill.get("supported_properties", []))
        api_health = skill.get("health_status", 1.0)
        score = prop_match * 0.7 + api_health * 0.3
        
        if score > best_score and score >= min_confidence:
            best_score = score
            best_endpoint = skill
    
    if best_endpoint is None:
        return None
        
    # Return immutable routing config
    return {
        "endpoint": best_endpoint["name"],
        "entity_type": entity_type,
        "confidence": best_score,
        "property_schema": required_props,
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_with_fallback(
    skill: Dict,
    task_context: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute HubSpot API request with rate-limit aware fallback chain.
    
    Implements resilient CRM operations by handling HubSpot's 10 req/s
    rate limits, transient network errors, and schema validation failures.
    Falls back to batch API or async webhook queuing when single-object
    endpoints are throttled or fail.
    
    Args:
        skill: Selected HubSpot endpoint metadata
        task_context: Execution context including CRM object data
        max_retries: Maximum retry attempts before fallback
        
    Returns:
        Execution result with metadata (success, timing, confidence)
    """
    if not _is_skill_valid(skill):
        raise SkillExecutionError(f"Invalid HubSpot endpoint: {skill.get('name', 'unknown')}")
    
    validated_object = _validate_hubspot_object(task_context.get("object_data", {}), skill.get("schema", {}))
    
    for attempt in range(max_retries + 1):
        try:
            # Direct API call with HubSpot-specific headers
            response = requests.post(
                f"https://api.hubapi.com/crm/v3/objects/{skill['entity_type']}",
                headers={
                    "Authorization": f"Bearer {task_context['api_key']}",
                    "Content-Type": "application/json"
                },
                json={"properties": validated_object},
                timeout=10
            )
            
            if response.status_code == 429:
                # Rate limited - backoff and retry
                time.sleep(response.headers.get("Retry-After", 1))
                continue
                
            response.raise_for_status()
            
            return {
                "success": True,
                "endpoint": skill["name"],
                "result": response.json(),
                "attempts": attempt + 1,
                "latency_ms": _calculate_latency()
            }
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 400:
                raise SkillExecutionError(f"HubSpot validation failed: {e.response.json()}") from e
            if attempt == max_retries:
                return _apply_hubspot_fallback(skill, validated_object)
                
    raise SkillExecutionError(f"HubSpot API failed after {max_retries + 1} attempts")
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
- Implement idempotent automation triggers: running the same automation twice should not create duplicate resources or actions
- Validate all trigger conditions with explicit allowlists before executing automated actions
- Include rollback procedures in every automation workflow — every CREATE should have a corresponding DELETE capability
- Log all automation executions with input state, output state, duration, and any errors for monitoring and debugging

### MUST NOT DO
- Do not create circular automation loops where trigger A causes action B which triggers A again
- Avoid using automations that modify production data without explicit human approval gates
- Never embed API keys or credentials directly in automation workflows — use vaulted secrets with rotation
- Do not assume external service availability; implement retry logic with exponential backoff and dead-letter queues


## Related Skills

| Skill | Purpose |
|