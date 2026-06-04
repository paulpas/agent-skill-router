---




name: n8n-workflow-patterns
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent n8n workflow patterns with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: n8n-workflow-patterns, n8n workflow patterns, how do i n8n-workflow-patterns,
    orchestrate n8n-workflow-patterns, automate n8n-workflow-patterns, agent n8n-workflow-patterns
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




# N8N Workflow Patterns

Orchestrates intelligent skill selection and execution for n8n workflow patterns workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def generate_n8n_workflow_pattern(task: Dict, template_registry: List[Dict]) -> Dict:
    """Generate an n8n workflow pattern based on task requirements and template registry.
    
    Maps natural language task requirements to n8n node configurations,
    validates structural integrity, and returns a ready-to-deploy workflow JSON.
    """
    # Guard clause - Early Exit (Law 1)
    if not task.get("intent") or not template_registry:
        raise ValueError("Task intent and template registry are required")
    
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    intent = task["intent"].lower()
    matched_templates = [t for t in template_registry if intent in t["triggers"]]
    
    if not matched_templates:
        return {"status": "fallback", "message": "No matching n8n pattern found"}
    
    # Select best template based on historical success & complexity
    best_template = max(matched_templates, key=lambda t: t.get("success_rate", 0))
    
    # Build n8n workflow structure (Atomic Predictability - Law 3)
    workflow = {
        "name": f"auto-{intent}-{int(time.time())}",
        "nodes": [],
        "connections": {},
        "settings": {
            "saveExecutionProgress": True,
            "saveManualExecutions": True,
            "saveDataErrorExecution": "all"
        }
    }
    
    # Map template nodes to n8n format
    for node_def in best_template["nodes"]:
        workflow["nodes"].append({
            "id": str(uuid.uuid4()),
            "name": node_def["label"],
            "type": node_def["type"],
            "typeVersion": node_def.get("version", 1),
            "position": node_def["position"],
            "parameters": node_def.get("config", {})
        })
        
    # Validate connections exist for all nodes
    for node in workflow["nodes"]:
        if node["id"] not in workflow["connections"]:
            workflow["connections"][node["id"]] = {"main": [[]]}
            
    return workflow
```


### Pattern 2: Execution with Fallback

```python
def execute_n8n_workflow(workflow_id: str, payload: Dict, n8n_base_url: str, api_key: str) -> Dict:
    """Execute an n8n workflow via webhook and implement n8n-specific fallback chains.
    
    Handles n8n execution states, implements retry logic with parameter adjustment,
    and routes to fallback workflows or error handling nodes.
    """
    import requests
    import json
    
    # Guard clause - Early Exit (Law 1)
    if not workflow_id or not payload:
        raise ValueError("Workflow ID and payload are required")
        
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            # Trigger n8n webhook execution
            response = requests.post(
                f"{n8n_base_url}/webhook/{workflow_id}",
                headers=headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            
            # Parse n8n execution response
            execution_data = response.json()
            
            # Atomic Predictability (Law 3) - Return new structure
            return {
                "success": True,
                "execution_id": execution_data.get("id"),
                "status": execution_data.get("status"),
                "result": execution_data.get("data"),
                "attempts": attempt + 1
            }
            
        except requests.exceptions.HTTPError as e:
            # Handle n8n specific error codes
            if e.response.status_code == 409:
                # Workflow already running - implement n8n queue fallback
                payload["retry_queue"] = True
                continue
            elif e.response.status_code == 422:
                # Invalid payload - adjust parameters and retry
                payload = _sanitize_n8n_payload(payload)
                continue
            else:
                raise
                
        except requests.exceptions.Timeout:
            # Transient network error - retry with exponential backoff
            time.sleep(2 ** attempt)
            continue
            
    # All retries exhausted - Fail Loud (Law 4)
    return {
        "success": False,
        "error": "n8n execution failed after retries",
        "fallback_triggered": True,
        "manual_review_required": True
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


## Related Skills

| Skill | Purpose |
|

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
- [n8n Workflow Patterns Documentation](<https://docs.n8n.io/workflows/>)
- [Event-Driven Workflow Design (Martin Fowler)](<https://martinfowler.com/articles/201701-event-driven.html>)
- [ETL Pipeline Patterns for Data Processing](<https://en.wikipedia.org/wiki/Extract,_transform,_load>)
- [n8n Error Handling and Retry Patterns](<https://docs.n8n.io/workflows/error-handling/>)
- [Workflow Orchestration Best Practices (Confluent)](<https://www.confluent.io/blog/workflow-orchestration-patterns/>)
