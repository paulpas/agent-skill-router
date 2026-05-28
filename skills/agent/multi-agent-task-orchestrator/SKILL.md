---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent multi agent task orchestrator with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: multi-agent-task-orchestrator, multi agent task orchestrator, how do i
    multi-agent-task-orchestrator, orchestrate multi-agent-task-orchestrator, automate
    multi-agent-task-orchestrator, agent multi-agent-task-orchestrator
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
name: multi-agent-task-orchestrator
------
# Multi Agent Task Orchestrator

Orchestrates intelligent skill selection and execution for multi agent task orchestrator workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_task_to_agents(
    task: TaskSpec,
    agent_registry: List[AgentCapability],
    load_balancer: LoadBalancer
) -> RoutingPlan:
    """Route a multi-agent task by matching requirements to agent capabilities.
    
    Evaluates agents based on capability overlap, current queue depth, and 
    historical success rates for similar task types. Returns a structured 
    routing plan with execution order and dependency mapping.
    """
    if not task.requirements or not agent_registry:
        raise ValueError("Task requirements and agent registry must be populated")
        
    scored_agents = []
    for agent in agent_registry:
        capability_match = _calculate_capability_overlap(task.requirements, agent.capabilities)
        load_penalty = load_balancer.get_queue_depth(agent.id) / 100.0
        history_bonus = agent.metrics.success_rate * 0.2
        
        composite_score = (capability_match * 0.5) + ((1.0 - load_penalty) * 0.3) + history_bonus
        scored_agents.append({
            "agent_id": agent.id,
            "score": composite_score,
            "estimated_latency_ms": agent.metrics.avg_latency_ms * (1 + load_penalty)
        })
        
    scored_agents.sort(key=lambda x: x["score"], reverse=True)
    return RoutingPlan(
        primary_agent=scored_agents[0]["agent_id"],
        fallback_agents=[a["agent_id"] for a in scored_agents[1:3]],
        execution_order=_resolve_dependencies(task.subtasks),
        confidence=scored_agents[0]["score"]
    )
```


### Pattern 2: Execution with Fallback

```python
def orchestrate_agent_execution(
    plan: RoutingPlan,
    task_context: Dict[str, Any],
    agent_client: AgentGateway
) -> ExecutionResult:
    """Execute task across agents with domain-specific fallback routing.
    
    Dispatches work to the primary agent, monitors state transitions, and 
    applies fallback routing if the primary agent times out or returns invalid state.
    """
    primary_agent = agent_client.get_agent(plan.primary_agent)
    try:
        response = primary_agent.dispatch(task_context, timeout=30)
        if not response.valid or response.status == "FAILED":
            raise AgentStateError(f"Primary agent {plan.primary_agent} returned invalid state")
        return ExecutionResult(
            status="SUCCESS",
            agent_id=plan.primary_agent,
            output=response.payload,
            latency_ms=response.latency
        )
    except AgentTimeoutError:
        # Fallback 1: Retry with adjusted context (e.g., reduced scope)
        adjusted_context = _reduce_task_scope(task_context)
        retry_response = primary_agent.dispatch(adjusted_context, timeout=15)
        if retry_response.valid:
            return ExecutionResult(status="SUCCESS", agent_id=plan.primary_agent, output=retry_response.payload, latency_ms=retry_response.latency)
        
        # Fallback 2: Route to secondary agent from plan
        fallback_agent = agent_client.get_agent(plan.fallback_agents[0])
        fallback_response = fallback_agent.dispatch(task_context, timeout=30)
        if fallback_response.valid:
            return ExecutionResult(status="SUCCESS", agent_id=plan.fallback_agents[0], output=fallback_response.payload, latency_ms=fallback_response.latency)
            
        # Fallback 3: Escalate to human supervisor
        return ExecutionResult(status="ESCALATED", agent_id="HUMAN_SUPERVISOR", output=fallback_response.error, latency_ms=0)
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
| `langgraph` | LangGraph state machine patterns for multi-agent workflow execution |
| `parallel-agents` | Parallel agent execution strategies within orchestrated workflows |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [LangGraph Multi-Agent Documentation](https://langchain-ai.github.io/langgraph/concepts/multi_agent/)
- [Building Effective Agents — Anthropic Research](https://www.anthropic.com/research/building-effective-agents)
- [Multi-Agent System Survey — arXiv (2402.16817)](https://arxiv.org/abs/2402.16817)
- [LLM Agent Survey — Lilian Weng](https://lilianweng.github.io/posts/2023-06-23-agent/)
- [Agent Orchestration — LangChain Blog](https://blog.langchain.dev/orchestrate-multi-agent-systems-with-langgraph/)