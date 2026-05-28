---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent ai agents architect with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: ai-agents-architect, ai agents architect, how do i ai-agents-architect,
    orchestrate ai-agents-architect, automate ai-agents-architect, agent ai-agents-architect
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
name: ai-agents-architect
------
# Ai Agents Architect

Orchestrates intelligent skill selection and execution for ai agents architect workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def architect_agent_routing(
    task_spec: Dict[str, Any],
    agent_registry: List[Dict[str, Any]],
    capability_threshold: float = 0.75
) -> Optional[Dict[str, Any]]:
    """Architect routing for a task by matching against agent capabilities and tool constraints.
    
    Implements capability-based selection rather than generic text matching:
    - Evaluates tool compatibility matrix between task requirements and agent definitions
    - Scores agents based on historical success with similar task patterns
    - Validates dependency chains before routing to prevent dead-end workflows
    
    Args:
        task_spec: Parsed task dictionary containing intent, required_tools, constraints
        agent_registry: List of available agent definitions with capabilities and tool mappings
        capability_threshold: Minimum capability match score required for routing
        
    Returns:
        Selected agent configuration with routing metadata, or None if no match
    """
    if not task_spec.get("required_tools"):
        raise ValueError("Task specification must declare required tools for routing")
        
    if not agent_registry:
        raise ValueError("Agent registry is empty - cannot architect routing")
        
    # Parse task requirements into normalized capability vectors
    required_capabilities = _normalize_tool_requirements(task_spec["required_tools"])
    
    best_agent = None
    best_capability_score = 0.0
    
    for agent in agent_registry:
        # Calculate tool compatibility and capability overlap
        capability_score = _calculate_capability_overlap(required_capabilities, agent["capabilities"])
        dependency_health = _validate_agent_dependencies(agent)
        
        if capability_score > best_capability_score and capability_score >= capability_threshold:
            if dependency_health:
                best_capability_score = capability_score
                best_agent = agent
                
    if best_agent is None:
        return None
        
    # Return immutable routing configuration
    return {
        "target_agent": best_agent["id"],
        "routing_confidence": best_capability_score,
        "required_toolchain": task_spec["required_tools"],
        "fallback_agents": best_agent.get("fallback_chain", []),
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def orchestrate_agent_workflow(
    target_agent: Dict[str, Any],
    task_context: Dict[str, Any],
    fallback_agents: List[Dict[str, Any]],
    max_execution_attempts: int = 2
) -> Dict[str, Any]:
    """Orchestrate agent execution with capability-aware fallback routing.
    
    Implements specialized fallback logic for agent architectures:
    - Routes to fallback agents based on capability degradation, not just errors
    - Preserves task context across agent transitions for state continuity
    - Validates tool availability before each execution attempt
    
    Args:
        target_agent: Primary agent configuration selected by architect_agent_routing
        task_context: Immutable task state and input parameters
        fallback_agents: Ordered list of capability-degraded alternative agents
        max_execution_attempts: Maximum retry attempts before escalating fallback
        
    Returns:
        Execution result with agent transition history and capability metrics
    """
    if not target_agent.get("id"):
        raise ValueError("Target agent must have a valid identifier")
        
    validated_context = _enforce_task_context_schema(task_context)
    
    execution_chain = [target_agent] + fallback_agents
    
    for attempt_idx, agent in enumerate(execution_chain):
        if attempt_idx > max_execution_attempts:
            break
            
        try:
            # Validate tool availability for current agent
            if not _verify_tool_availability(agent["capabilities"]):
                continue
                
            # Execute agent with context preservation
            result = _run_agent_pipeline(agent, validated_context)
            
            return {
                "success": True,
                "agent_executed": agent["id"],
                "execution_path": [a["id"] for a in execution_chain[:attempt_idx+1]],
                "result": result,
                "capability_score": _calculate_current_capability(agent)
            }
            
        except ToolUnavailableError as e:
            # Capability mismatch - route to next agent in chain
            continue
            
        except CriticalStateError as e:
            # Invalid state - halt immediately, do not retry same agent
            raise WorkflowExecutionError(
                f"Critical state failure in {agent['id']}: {str(e)}"
            ) from e
            
    raise WorkflowExecutionError(
        f"Agent workflow exhausted all {len(execution_chain)} capability tiers"
    )
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
| `agent-reliability-engineering` | Fault tolerance mechanisms for agent architectures under failure conditions |
| `agent-architecture-patterns` | Foundational architecture topologies (hub-and-spoke, event-driven) as building blocks |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Building Effective Agents — Anthropic Research](https://www.anthropic.com/research/building-effective-agents)
- [LLM Agents Survey — Lilian Weng](https://lilianweng.github.io/posts/2023-06-23-agent/)
- [Microsoft AI Agent Frameworks Overview](https://www.microsoft.com/en-us/research/project/language-models-for-agents/)
- [Multi-Agent Systems — Stanford CS324](https://web.stanford.edu/class/cs324/)
- [Survey of LLM-Based Agents — arXiv](https://arxiv.org/abs/2308.11432)