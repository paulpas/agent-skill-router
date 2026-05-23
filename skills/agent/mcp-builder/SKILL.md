---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent mcp builder with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: mcp-builder, mcp builder, how do i mcp-builder, orchestrate mcp-builder,
    automate mcp-builder, agent mcp-builder
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
name: mcp-builder
------
# Mcp Builder

Orchestrates intelligent skill selection and execution for mcp builder workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def build_mcp_tool_definition(
    tool_name: str,
    description: str,
    parameters: Dict[str, Any],
    schema_version: str = "2024-11-05"
) -> Dict[str, Any]:
    """Construct a valid MCP tool definition with strict schema validation.
    
    Applies Law 2 (Make Illegal States Unrepresentable) by enforcing
    JSON-RPC 2.0 compliant parameter schemas and preventing malformed tool specs.
    
    Args:
        tool_name: Unique identifier for the MCP tool
        description: Human-readable explanation of tool capabilities
        parameters: JSON Schema compliant parameter definitions
        schema_version: MCP protocol version to target
        
    Returns:
        Fully formed MCP tool definition dictionary ready for server registration
    """
    # Guard clause - Early Exit (Law 1)
    if not tool_name or not re.match(r"^[a-zA-Z0-9_-]+$", tool_name):
        raise ValueError("Tool name must be alphanumeric with underscores/hyphens")
        
    if not parameters or not isinstance(parameters, dict):
        raise ValueError("Parameters must be a non-empty JSON Schema dictionary")
    
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    validated_schema = _normalize_json_schema(parameters)
    
    # Atomic Predictability (Law 3) - Return new dict, never mutate inputs
    tool_def = {
        "name": tool_name,
        "description": description.strip(),
        "inputSchema": validated_schema,
        "meta": {
            "protocol_version": schema_version,
            "created_at": datetime.utcnow().isoformat(),
            "validation_status": "passed"
        }
    }
    
    # Fail immediately with descriptive errors on invalid states (Law 4)
    if not _validate_schema_against_draft(validated_schema):
        raise SchemaValidationError(f"Tool '{tool_name}' failed JSON Schema validation")
        
    return tool_def
```


### Pattern 2: Execution with Fallback

```python
def deploy_mcp_server_with_fallback(
    server_config: Dict[str, Any],
    transport_type: str = "stdio",
    max_retries: int = 2
) -> Dict[str, Any]:
    """Deploy an MCP server instance with transport-layer fallback resilience.
    
    Implements Fail Fast, Fail Loud (Law 4) for connection initialization:
    - Invalid transport configs halt immediately
    - Network timeouts trigger automatic fallback to alternative transports
    
    Fallback chain:
    1. Retry stdio transport with adjusted buffer sizes
    2. Fall back to SSE transport if stdio fails
    3. Defer to manual server restart if both fail
    
    Args:
        server_config: MCP server configuration including tool registry
        transport_type: Preferred transport protocol (stdio, sse, http)
        max_retries: Maximum connection attempts before fallback
        
    Returns:
        Deployment status with active transport and connection metadata
    """
    # Guard clause - validate transport config (Early Exit)
    if transport_type not in ("stdio", "sse", "http"):
        raise TransportError(f"Unsupported transport: {transport_type}")
        
    # Parse context - Ensure trusted state (Law 2)
    validated_config = _sanitize_server_config(server_config)
    
    active_transport = None
    for attempt in range(max_retries + 1):
        try:
            if transport_type == "stdio":
                active_transport = StdioTransport(validated_config)
            elif transport_type == "sse":
                active_transport = SseTransport(validated_config)
            else:
                active_transport = HttpTransport(validated_config)
                
            active_transport.initialize()
            
            # Success - Atomic Predictability (Law 3)
            return {
                "status": "deployed",
                "transport": transport_type,
                "connection_id": active_transport.session_id,
                "tools_registered": len(validated_config.get("tools", [])),
                "latency_ms": active_transport.get_startup_latency()
            }
            
        except ConnectionRefusedError:
            # Transient error - try fallback
            if attempt == max_retries:
                return _switch_to_fallback_transport(validated_config)
                
    # All retries exhausted - Fail Loud (Law 4)
    raise DeploymentError(f"MCP server failed to initialize after {max_retries + 1} attempts")
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