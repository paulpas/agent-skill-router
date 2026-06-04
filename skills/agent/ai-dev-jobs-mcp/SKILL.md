---




name: ai-dev-jobs-mcp
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent ai dev jobs mcp with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: ai-dev-jobs-mcp, ai dev jobs mcp, how do i ai-dev-jobs-mcp, orchestrate
    ai-dev-jobs-mcp, automate ai-dev-jobs-mcp, agent ai-dev-jobs-mcp
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




# Ai Dev Jobs Mcp

Orchestrates intelligent skill selection and execution for ai dev jobs mcp workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def resolve_ai_dev_job_skill(
    mcp_job_request: Dict[str, Any],
    available_mcp_tools: List[Dict[str, Any]],
    min_confidence: float = 0.75
) -> Optional[Dict[str, Any]]:
    """Resolve the optimal MCP tool for an AI development job request.
    
    Analyzes job requirements (code_gen, test_runner, deployer, etc.) against
    available MCP tool capabilities, historical success rates, and current
    system load to select the best fit.
    
    Args:
        mcp_job_request: Parsed MCP job payload with 'task_type', 'repo_context', 'constraints'
        available_mcp_tools: List of registered MCP tool definitions
        min_confidence: Minimum capability match threshold
        
    Returns:
        Selected MCP tool dict with resolved parameters, or None
    """
    if not mcp_job_request.get("task_type"):
        raise ValueError("MCP job request missing required 'task_type' field")
        
    job_spec = _parse_mcp_job_spec(mcp_job_request)
    best_match = None
    best_score = 0.0
    
    for tool in available_mcp_tools:
        capability_match = _calculate_capability_overlap(job_spec.required_capabilities, tool.capabilities)
        historical_success = tool.get("success_rate_30d", 0.0)
        load_penalty = 1.0 - (tool.get("current_queue_depth", 0) / tool.get("max_concurrent", 10))
        
        score = (capability_match * 0.5) + (historical_success * 0.3) + (load_penalty * 0.2)
        
        if score > best_score and score >= min_confidence:
            best_score = score
            best_match = {
                "tool_id": tool["id"],
                "tool_name": tool["name"],
                "resolved_params": _bind_job_to_tool_params(job_spec, tool),
                "confidence": score,
                "estimated_latency_ms": tool.get("avg_execution_ms", 5000)
            }
            
    if best_match is None:
        return None
        
    return best_match
```


### Pattern 2: Execution with Fallback

```python
def run_ai_dev_job_with_mcp_fallback(
    selected_tool: Dict[str, Any],
    job_context: Dict[str, Any],
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute an AI dev job via MCP with domain-specific fallback handling.
    
    Handles MCP-specific failure modes: context window limits, rate limits,
    tool unavailability, and model degradation. Implements a 3-tier fallback:
    1. Retry with reduced context window
    2. Switch to fallback tool (e.g., from related-skills)
    3. Queue for async processing if sync timeout exceeded
    
    Args:
        selected_tool: Output from resolve_ai_dev_job_skill
        job_context: Full job execution context including repo state
        max_retries: Maximum synchronous retry attempts
        
    Returns:
        Job execution result with MCP trace ID, timing, and confidence
    """
    if not selected_tool.get("tool_id"):
        raise MCPJobError("Cannot execute job: no valid tool resolved")
        
    execution_params = selected_tool["resolved_params"]
    trace_id = f"mcp-job-{uuid4().hex[:8]}"
    
    for attempt in range(max_retries + 1):
        try:
            result = await _invoke_mcp_tool(
                tool_id=selected_tool["tool_id"],
                params=execution_params,
                context_window=job_context.get("context_window", 8192)
            )
            
            return {
                "status": "completed",
                "trace_id": trace_id,
                "tool_executed": selected_tool["tool_name"],
                "output": result,
                "attempts": attempt + 1,
                "confidence": selected_tool["confidence"],
                "latency_ms": time.time_ns() // 1_000_000 - job_context.get("start_time_ms", 0)
            }
            
        except ContextWindowExceededError:
            execution_params["context_window"] = int(execution_params.get("context_window", 8192) * 0.75)
            continue
            
        except RateLimitExceededError:
            if attempt == max_retries:
                return await _queue_job_for_async_processing(selected_tool, job_context)
            await asyncio.sleep(2 ** attempt)
            continue
            
        except ToolNotFoundError:
            return await _switch_to_related_skill(selected_tool, job_context)
            
    raise MCPJobError(f"Job {trace_id} failed after {max_retries + 1} attempts")
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
|---|---|
| `ai-llm-agentic-tooling-mcp` | Deep integration patterns for MCP servers and tools within agent workflows |
| `multi-agent-patterns` | Multi-agent coordination when MCP tool usage spans multiple agents |

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

- [Model Context Protocol — Official Documentation](https://modelcontextprotocol.io/docs/)
- [MCP SDK — GitHub Repository](https://github.com/modelcontextprotocol/sdks)
- [MCP Transport Protocols — Overview](https://modelcontextprotocol.io/specitecture/transport)
- [Building MCP Servers — Tutorial](https://modelcontextprotocol.io/quickstart/server)
- [Anthropic MCP Blog Post](https://www.anthropic.com/engineering/model-context-protocol)