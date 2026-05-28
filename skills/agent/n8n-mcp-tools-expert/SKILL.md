---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent n8n mcp tools expert with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: n8n-mcp-tools-expert, n8n mcp tools expert, how do i n8n-mcp-tools-expert,
    orchestrate n8n-mcp-tools-expert, automate n8n-mcp-tools-expert, agent n8n-mcp-tools-expert
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
name: n8n-mcp-tools-expert
------
# N8N Mcp Tools Expert

Orchestrates intelligent skill selection and execution for n8n mcp tools expert workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_n8n_mcp_tool(
    task_description: str,
    available_mcp_tools: List[Dict],
    n8n_workflow_registry: Dict[str, Dict]
) -> Dict:
    """Select the optimal n8n MCP tool or workflow node for a task.
    
    Analyzes MCP tool schemas against n8n workflow capabilities to find
    the best execution path. Considers trigger compatibility, parameter mapping,
    and historical execution success rates within the n8n instance.
    """
    if not task_description or not available_mcp_tools:
        raise ValueError("Task description and MCP tools list are required")
        
    # Parse n8n workflow constraints and MCP tool capabilities
    task_intent = _extract_n8n_intent(task_description)
    
    best_match = None
    best_score = 0.0
    
    for tool in available_mcp_tools:
        # Check n8n workflow compatibility
        workflow_id = tool.get("n8n_workflow_id")
        workflow_config = n8n_workflow_registry.get(workflow_id, {})
        
        # Score based on trigger match, parameter overlap, and n8n node health
        trigger_match = _calculate_trigger_compatibility(task_intent, tool.get("triggers", []))
        param_overlap = _calculate_param_overlap(task_intent, tool.get("parameters", {}))
        n8n_health = workflow_config.get("success_rate", 0.0)
        
        score = (trigger_match * 0.4) + (param_overlap * 0.4) + (n8n_health * 0.2)
        
        if score > best_score:
            best_score = score
            best_match = {
                "tool_name": tool["name"],
                "workflow_id": workflow_id,
                "score": score,
                "mapped_params": _map_task_to_n8n_params(task_intent, tool.get("parameters", {}))
            }
            
    if best_score < 0.6:
        return {"status": "no_match", "reason": "Insufficient compatibility score"}
        
    return {**best_match, "status": "selected", "timestamp": time.time()}
```


### Pattern 2: Execution with Fallback

```python
def execute_n8n_mcp_workflow(
    selected_tool: Dict,
    execution_context: Dict,
    n8n_api_client: Any,
    mcp_client: Any,
    max_retries: int = 2
) -> Dict:
    """Execute an n8n workflow via MCP tool with resilient fallback handling.
    
    Manages the lifecycle of n8n workflow execution: triggering via MCP,
    polling n8n execution status, handling node failures, and applying
    fallback strategies when primary execution paths fail.
    """
    tool_name = selected_tool["tool_name"]
    workflow_id = selected_tool["workflow_id"]
    mapped_params = selected_tool["mapped_params"]
    
    for attempt in range(max_retries + 1):
        try:
            # Trigger n8n workflow via MCP tool call
            execution_id = mcp_client.call_tool(
                tool_name, 
                {"workflow_id": workflow_id, "parameters": mapped_params}
            )
            
            # Poll n8n execution status until completion or timeout
            result = _poll_n8n_execution(n8n_api_client, execution_id, timeout=120)
            
            return {
                "status": "success",
                "execution_id": execution_id,
                "result": result,
                "attempts": attempt + 1,
                "latency_ms": time.time() * 1000
            }
            
        except n8n.NodeExecutionError as e:
            # Fail fast on invalid node state or missing credentials
            raise ExecutionError(f"n8n node failed at attempt {attempt + 1}: {e}") from e
            
        except MCPConnectionError as e:
            # Transient MCP/n8n API issue - retry or fallback
            if attempt == max_retries:
                return _fallback_to_alternative_workflow(workflow_id, mapped_params)
                
    raise ExecutionError(f"Exhausted {max_retries + 1} attempts for {tool_name}")
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

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [n8n Documentation and Workflows](<https://docs.n8n.io/>)
- [Model Context Protocol (MCP) Specification](<https://modelcontextprotocol.io/specification/2024/11/05/basic>)
- [n8n MCP Tool Node Integration](<https://docs.n8n.io/integrations/builtin/>)
- [AI Agent Orchestration with n8n](<https://docs.n8n.io/hosting/scaling/microservices/>)
- [MCP Server Protocol Reference](<https://modelcontextprotocol.io/docs/concepts/tools>)
