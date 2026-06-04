---
name: airtable-automation
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent airtable automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: airtable-automation, airtable automation, how do i airtable-automation,
    orchestrate airtable-automation, automate airtable-automation, agent airtable-automation
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
# Airtable Automation

Orchestrates intelligent skill selection and execution for airtable automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_airtable_operation(
    task_description: str,
    base_id: str,
    table_name: str,
    available_operations: List[str]
) -> Dict:
    """Select the optimal Airtable API operation for the given task.
    
    Analyzes the request to determine whether to use:
    - POST /v0/{base_id}/{table} (Create records)
    - PATCH /v0/{base_id}/{table} (Update records)
    - GET /v0/{base_id}/{table} (Query/Filter records)
    - POST /v0/{base_id}/{table}/automationTrigger (Run automation)
    
    Args:
        task_description: Natural language description of the automation task
        base_id: Airtable base identifier
        table_name: Target table name
        available_operations: List of supported operation types
        
    Returns:
        Operation configuration dict with endpoint, method, and payload template
    """
    if not task_description or not base_id or not table_name:
        raise ValueError("Task description, base_id, and table_name are required")
        
    task_lower = task_description.lower()
    operation = "GET"
    payload_template = {"filterByFormula": "", "maxRecords": 100}
    
    if any(kw in task_lower for kw in ["create", "add", "insert", "new record"]):
        operation = "POST"
        payload_template = {"records": [{"fields": {}}]}
    elif any(kw in task_lower for kw in ["update", "modify", "edit", "patch"]):
        operation = "PATCH"
        payload_template = {"records": [{"id": "", "fields": {}}]}
    elif any(kw in task_lower for kw in ["trigger", "run automation", "execute workflow"]):
        operation = "POST"
        payload_template = {"automationId": "", "input": {}}
        
    return {
        "operation": operation,
        "endpoint": f"/v0/{base_id}/{table_name}",
        "payload_template": payload_template,
        "confidence": 0.95 if operation in available_operations else 0.0
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_airtable_operation(
    config: Dict,
    api_key: str,
    payload: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute an Airtable API operation with rate-limit and transient error handling.
    
    Implements resilient execution for Airtable's REST API:
    - Handles 429 Too Many Requests with exponential backoff
    - Validates record IDs and field types before submission
    - Falls back to single-record operations if batch fails
    - Returns structured results with Airtable record IDs and timestamps
    
    Args:
        config: Operation configuration from select_airtable_operation
        api_key: Airtable API key or personal access token
        payload: Prepared request payload
        max_retries: Maximum retry attempts for transient failures
        
    Returns:
        Execution result containing success status, record IDs, and latency
    """
    import time
    import requests
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    url = f"https://api.airtable.com{config['endpoint']}"
    
    for attempt in range(max_retries + 1):
        try:
            response = requests.request(
                config["operation"], url, json=payload, headers=headers, timeout=30
            )
            
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", 2 ** attempt))
                time.sleep(retry_after)
                continue
                
            response.raise_for_status()
            data = response.json()
            
            return {
                "success": True,
                "records_affected": len(data.get("records", [])),
                "record_ids": [r["id"] for r in data.get("records", [])],
                "latency_ms": response.elapsed.total_seconds() * 1000
            }
            
        except requests.exceptions.HTTPError as e:
            if response.status_code in (400, 404, 422):
                raise ValueError(f"Airtable API validation error: {e.response.text}") from e
            if attempt == max_retries:
                return _fallback_to_single_record(config, api_key, payload)
                
    raise RuntimeError(f"Airtable operation failed after {max_retries + 1} attempts")
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