---
name: mcp-builder-ms
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent mcp builder ms with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: mcp-builder-ms, mcp builder ms, how do i mcp-builder-ms, orchestrate mcp-builder-ms,
    automate mcp-builder-ms, agent mcp-builder-ms
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
# Mcp Builder Ms

Orchestrates intelligent skill selection and execution for mcp builder ms workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_mcp_tool_request(
    user_query: str,
    available_tools: List[McpToolSchema],
    min_confidence: float = 0.75
) -> Optional[ToolRoutingResult]:
    """Route a user query to the optimal MCP tool using multi-factor scoring.
    
    Applies Law 1 (Early Exit) and Law 2 (Immutable State) to ensure
    only valid, high-confidence tool matches proceed to execution.
    """
    if not user_query or not available_tools:
        raise ValueError("Query and tool registry must be non-empty")
        
    query_vector = _embed_query(user_query)
    best_match = None
    best_score = 0.0
    
    for tool in available_tools:
        if not tool.is_available:
            continue
            
        name_similarity = _cosine_similarity(query_vector, tool.name_vector)
        desc_similarity = _cosine_similarity(query_vector, tool.description_vector)
        historical_success = tool.metrics.success_rate_30d
        
        composite_score = (name_similarity * 0.4) + (desc_similarity * 0.4) + (historical_success * 0.2)
        
        if composite_score > best_score and composite_score >= min_confidence:
            best_score = composite_score
            best_match = tool
            
    if best_match is None:
        return None
        
    return ToolRoutingResult(
        tool_name=best_match.name,
        confidence=best_score,
        parameters=best_match.extract_params(user_query),
        timestamp=time.time()
    )
```


### Pattern 2: Execution with Fallback

```python
def execute_mcp_tool_with_resilience(
    routing_result: ToolRoutingResult,
    mcp_client: McpClient,
    fallback_tools: List[str] = None
) -> ExecutionOutcome:
    """Execute an MCP tool call with a structured fallback chain.
    
    Implements Law 4 (Fail Fast/Loud) by immediately halting on schema mismatches
    and Law 3 (Atomic Predictability) by returning immutable result objects.
    """
    if not routing_result or not mcp_client:
        raise ExecutionError("Missing routing result or MCP client connection")
        
    tool_name = routing_result.tool_name
    params = routing_result.parameters
    attempts = 0
    max_attempts = 2
    
    while attempts <= max_attempts:
        try:
            # Validate parameters against tool schema before sending
            validated_params = _validate_against_schema(params, tool_name)
            raw_response = mcp_client.call_tool(tool_name, validated_params)
            
            return ExecutionOutcome(
                success=True,
                tool=tool_name,
                data=raw_response,
                confidence=routing_result.confidence,
                latency_ms=_elapsed_ms(),
                attempts=attempts + 1
            )
            
        except SchemaValidationError as e:
            raise ExecutionError(f"Schema mismatch for {tool_name}: {e}") from e
            
        except TransientMcpError as e:
            attempts += 1
            if attempts > max_attempts:
                break
            time.sleep(0.5 * attempts)
            
    # Fallback Chain: Try alternative tools if primary fails
    if fallback_tools:
        for alt_tool in fallback_tools:
            try:
                alt_result = mcp_client.call_tool(alt_tool, params)
                return ExecutionOutcome(
                    success=True,
                    tool=alt_tool,
                    data=alt_result,
                    confidence=0.6,
                    latency_ms=_elapsed_ms(),
                    attempts=attempts + 1,
                    fallback_triggered=True
                )
            except Exception:
                continue
                
    raise ExecutionError(f"All attempts and fallbacks exhausted for {tool_name}")
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
- [Model Context Protocol (MCP) Specification](<https://modelcontextprotocol.io/specification/2024/11/05/basic>)
- [Anthropic MCP SDK Documentation](<https://github.com/modelcontextprotocol/typescript-sdk>)
- [MCP Server Development Guide](<https://modelcontextprotocol.io/docs/concepts/tools>)
- [MCP Transport Protocols (stdio, SSE, HTTP)](<https://modelcontextprotocol.io/docs/concepts/transports>)
- [Cline MCP Integration for AI Agents](<https://github.com/cline/cline/wiki/MCP-Setup-Guide>)
