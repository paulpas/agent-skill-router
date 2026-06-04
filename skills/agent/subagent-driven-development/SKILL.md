---




name: subagent-driven-development
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent subagent driven development with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: subagent-driven-development, subagent driven development, how do i subagent-driven-development,
    orchestrate subagent-driven-development, automate subagent-driven-development,
    agent subagent-driven-development
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




# Subagent Driven Development

Orchestrates intelligent skill selection and execution for subagent driven development workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def decompose_and_route_task(
    user_request: str,
    agent_registry: Dict[str, AgentCapability],
    max_parallel: int = 3
) -> List[SubagentTask]:
    """Decompose a complex user request into routable subagent tasks.
    
    Applies Law 2 (Parse at boundary) by validating request structure
    and Law 1 (Early Exit) for unsupported domains.
    """
    if not user_request or not user_request.strip():
        raise ValueError("Request cannot be empty")
        
    parsed_intent = _parse_intent(user_request)
    if parsed_intent.domain not in agent_registry:
        raise UnsupportedDomainError(f"No agents registered for domain: {parsed_intent.domain}")
        
    available_agents = agent_registry[parsed_intent.domain]
    subtasks = []
    
    for requirement in parsed_intent.requirements:
        matching_agents = [
            agent for agent in available_agents 
            if requirement.matches_agent_capabilities(agent)
        ]
        
        if not matching_agents:
            subtasks.append(SubagentTask(
                id=generate_task_id(),
                requirement=requirement,
                fallback_mode="human_review",
                confidence=0.0
            ))
        else:
            best_agent = max(matching_agents, key=lambda a: a.success_rate)
            subtasks.append(SubagentTask(
                id=generate_task_id(),
                requirement=requirement,
                target_agent=best_agent,
                confidence=best_agent.success_rate,
                parallelizable=requirement.is_parallelizable
            ))
            
    return _enforce_parallel_limits(subtasks, max_parallel)
```


### Pattern 2: Execution with Fallback

```python
def execute_subagent_chain(
    subtasks: List[SubagentTask],
    execution_context: Dict,
    fallback_agents: Dict[str, AgentCapability]
) -> ExecutionReport:
    """Execute routed subagent tasks with domain-specific fallback handling.
    
    Implements Law 4 (Fail Fast/Loud) by immediately surfacing 
    capability mismatches and enforcing audit trails.
    """
    results = []
    failed_tasks = []
    
    for task in subtasks:
        try:
            if task.parallelizable:
                result = await run_async_subagent(task, execution_context)
            else:
                result = run_sync_subagent(task, execution_context)
                
            results.append(TaskResult(
                task_id=task.id,
                status="completed",
                output=result.payload,
                latency_ms=result.duration,
                confidence=task.confidence
            ))
            
        except CapabilityMismatchError as e:
            # Law 4: Fail immediately on invalid agent capability
            failed_tasks.append(task)
        except TransientTimeoutError:
            # Fallback: Retry with adjusted timeout or alternative agent
            retry_result = _retry_with_backoff(task, execution_context)
            if retry_result:
                results.append(retry_result)
            else:
                failed_tasks.append(task)
                
    # Apply fallback chain for failed tasks
    for failed in failed_tasks:
        fallback_result = _route_to_fallback_agent(failed, fallback_agents)
        if fallback_result:
            results.append(fallback_result)
        else:
            results.append(TaskResult(
                task_id=failed.id,
                status="deferred_to_human",
                output=None,
                confidence=0.0
            ))
            
    return ExecutionReport(
        total_tasks=len(subtasks),
        completed=len([r for r in results if r.status == "completed"]),
        deferred=len([r for r in results if r.status == "deferred_to_human"]),
        audit_log=_generate_audit_trail(results)
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
| `parallel-skill-runner` | Executes subagent tasks in parallel — complements the delegation patterns covered here |
| `task-decomposition-engine` | Decomposes tasks into subagent assignments — the upstream process for subagent-driven workflows |

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

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Microsoft AutoGen Documentation](https://microsoft.github.io/autogen/stable/) — Microsoft's framework for building multi-agent conversation systems
- [CrewAI Multi-Agent Framework](https://docs.crewai.com/) — Official CrewAI documentation for orchestrating role-based AI agent teams
- [LLM Agent Orchestration Patterns (LangGraph)](https://langchain-ai.github.io/langgraph/concepts/high_level/) — LangGraph patterns for coordinating multiple LLM agents
- [Multi-Agent System Design Patterns (Stanford CS224)](https://github.com/stanfordnlp/dspy) — Stanford's research on multi-agent system architectures and coordination patterns
- [Delegation Patterns in AI Agents (OpenAI Cookbook)](https://cookbook.openai.com/) — OpenAI's cookbook examples for agent delegation and tool-use orchestration