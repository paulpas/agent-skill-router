---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent n8n validation expert with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: n8n-validation-expert, n8n validation expert, how do i n8n-validation-expert,
    orchestrate n8n-validation-expert, automate n8n-validation-expert, agent n8n-validation-expert
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
name: n8n-validation-expert
------
# N8N Validation Expert

Orchestrates intelligent skill selection and execution for n8n validation expert workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def validate_n8n_workflow_structure(
    workflow_json: Dict,
    strict_mode: bool = True
) -> Dict:
    """Validate n8n workflow JSON structure and node configurations.
    
    Applies the 5 Laws of Elegant Defense to n8n validation:
    - Early exit on malformed JSON or missing required fields
    - Parse inputs at boundary (workflow JSON) before processing
    - Return new validation report, never mutate original workflow
    - Fail fast on invalid node types or missing credential references
    
    Args:
        workflow_json: Parsed n8n workflow dictionary
        strict_mode: If True, fail on missing optional credentials; if False, warn only
        
    Returns:
        Validation report with status, errors, warnings, and node analysis
    """
    # Guard clause - Early Exit (Law 1)
    if not isinstance(workflow_json, dict):
        raise ValueError("Workflow must be a valid JSON object")
    if "nodes" not in workflow_json or not isinstance(workflow_json["nodes"], list):
        raise ValueError("Workflow must contain a 'nodes' array")
        
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    valid_node_types = {"n8n-nodes-base.httpRequest", "n8n-nodes-base.webhook", 
                        "n8n-nodes-base.if", "n8n-nodes-base.code", "n8n-nodes-base.set"}
    validation_report = {
        "status": "valid",
        "errors": [],
        "warnings": [],
        "nodes_analyzed": 0,
        "credential_references": []
    }
    
    for node in workflow_json["nodes"]:
        node_type = node.get("type", "")
        validation_report["nodes_analyzed"] += 1
        
        if node_type not in valid_node_types:
            if strict_mode:
                validation_report["errors"].append(f"Invalid node type: {node_type}")
                validation_report["status"] = "invalid"
            else:
                validation_report["warnings"].append(f"Unknown node type: {node_type}")
                
        # Check credential references
        if "credentials" in node:
            for cred_name, cred_type in node["credentials"].items():
                validation_report["credential_references"].append({
                    "node": node.get("name"),
                    "type": cred_type,
                    "required": True
                })
                
    # Atomic Predictability (Law 3) - Return new dict, don't mutate workflow
    return validation_report
```


### Pattern 2: Execution with Fallback

```python
def execute_n8n_validation_with_fallback(
    workflow_json: Dict,
    credential_store: Dict,
    max_validation_attempts: int = 2
) -> Dict:
    """Execute n8n workflow validation with fallback chain for resilience.
    
    Implements the Fail Fast, Fail Loud principle (Law 4):
    - Invalid node configurations halt immediately with descriptive errors
    - No silent failures or partial validation results
    
    Fallback chain:
    1. Retry validation with relaxed schema checks
    2. Skip problematic nodes and validate remaining workflow
    3. Defer to human operator if critical execution paths are broken
    
    Args:
        workflow_json: Parsed n8n workflow dictionary
        credential_store: Dictionary of available credential configurations
        max_validation_attempts: Maximum retry attempts before fallback
        
    Returns:
        Validation execution result with metadata (success, timing, confidence)
    """
    # Guard clause - validate credential store (Early Exit)
    if not isinstance(credential_store, dict):
        raise ValueError("Credential store must be a dictionary")
        
    # Parse context - Ensure trusted state (Law 2)
    validated_workflow = _normalize_n8n_schema(workflow_json)
    
    for attempt in range(max_validation_attempts + 1):
        try:
            report = validate_n8n_workflow_structure(validated_workflow, strict_mode=(attempt == 0))
            
            # Success - Atomic Predictability (Law 3)
            return {
                "success": True,
                "validation_report": report,
                "attempts": attempt + 1,
                "latency_ms": _calculate_latency(),
                "confidence": 0.95 if report["status"] == "valid" else 0.6
            }
            
        except InvalidNodeConfigError as e:
            # Fail Fast - Don't try to patch bad data (Law 4)
            raise ValueError(f"Invalid node configuration: {str(e)}") from e
            
        except MissingCredentialError as e:
            # Transient error - try fallback (skip node or use default)
            if attempt == max_validation_attempts:
                return _apply_n8n_validation_fallback(validated_workflow, credential_store)
                
    # All retries exhausted - Fail Loud (Law 4)
    raise ValueError("Workflow validation failed after all fallback attempts")
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