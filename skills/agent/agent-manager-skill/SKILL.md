---




name: agent-manager-skill
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent agent manager skill with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: agent-manager-skill, agent manager skill, how do i agent-manager-skill,
    orchestrate agent-manager-skill, automate agent-manager-skill, agent agent-manager-skill
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




# Agent Manager Skill

Orchestrates intelligent skill selection and execution for agent manager skill workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_task_to_agent(
    task: TaskRequest,
    agent_registry: List[AgentMetadata],
    min_capability_score: float = 0.75
) -> Optional[AgentMetadata]:
    """Route a task to the most capable available agent based on domain expertise and current load.
    
    Domain logic: Matches task domain tags against agent capabilities, 
    applies load balancing, and validates agent state before selection.
    """
    if not task.domain or not task.payload:
        raise ValueError("Task must specify a domain and contain a payload")
        
    # Parse task requirements into normalized capability vectors
    required_capabilities = _normalize_domain_tags(task.domain)
    
    scored_agents = []
    for agent in agent_registry:
        if agent.status != "AVAILABLE":
            continue
            
        capability_match = _calculate_capability_overlap(required_capabilities, agent.capabilities)
        load_penalty = agent.current_load / agent.max_capacity
        adjusted_score = capability_match * (1.0 - load_penalty)
        
        if adjusted_score >= min_capability_score:
            scored_agents.append({
                "agent_id": agent.id,
                "score": adjusted_score,
                "domain_match": capability_match,
                "estimated_latency_ms": agent.avg_response_time * (1 + load_penalty)
            })
            
    if not scored_agents:
        return None
        
    # Sort by score descending, then by latency ascending
    scored_agents.sort(key=lambda x: (-x["score"], x["estimated_latency_ms"]))
    return scored_agents[0]
```


### Pattern 2: Execution with Fallback

```python
def execute_agent_task_with_routing(
    task: TaskRequest,
    selected_agent: AgentMetadata,
    fallback_agents: List[AgentMetadata],
    max_routing_attempts: int = 2
) -> ExecutionResult:
    """Execute task on selected agent with domain-aware fallback routing.
    
    Domain logic: Handles agent-specific execution protocols, 
    implements tiered fallback routing (specialist -> generalist -> human),
    and captures execution telemetry for confidence scoring.
    """
    execution_context = _build_execution_context(task, selected_agent)
    attempts = 0
    
    while attempts <= max_routing_attempts:
        try:
            # Execute using agent-specific protocol
            response = yield_to_agent(selected_agent, execution_context)
            
            # Validate response structure and domain compliance
            validated_result = _validate_agent_response(response, task.domain)
            
            return ExecutionResult(
                success=True,
                agent_id=selected_agent.id,
                payload=validated_result,
                confidence=validated_result.confidence_score,
                routing_attempts=attempts
            )
            
        except AgentTimeoutError:
            attempts += 1
            if attempts > max_routing_attempts:
                break
            # Fallback: route to next available agent in tier
            selected_agent = _get_next_fallback_agent(selected_agent, fallback_agents, attempts)
            if not selected_agent:
                break
            execution_context = _update_context_for_agent(execution_context, selected_agent)
            
        except DomainValidationError as e:
            # Fail fast on invalid domain state
            raise ExecutionError(f"Domain validation failed: {e}") from e
            
    # All routing attempts exhausted
    return ExecutionResult(
        success=False,
        agent_id=selected_agent.id if selected_agent else None,
        error="Routing chain exhausted",
        confidence=0.0,
        routing_attempts=attempts
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
| `agent-architecture-patterns` | Foundational architecture patterns that an agent manager orchestrates |
| `multi-agent-task-orchestrator` | Multi-agent task decomposition and coordination strategies |

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

- [Azure AI Agent Service — Microsoft Docs](https://learn.microsoft.com/en-us/azure/ai-services/agent-service/overview)
- [Building Effective Agents — Anthropic Research](https://www.anthropic.com/research/building-effective-agents)
- [Multi-Agent Systems — Wikipedia Overview](https://en.wikipedia.org/wiki/Multi-agent_system)
- [Agent Orchestration Patterns — LangChain Docs](https://langchain-ai.github.io/langgraph/concepts/)
- [LLM Agent Survey — Lilian Weng](https://lilianweng.github.io/posts/2023-06-23-agent/)