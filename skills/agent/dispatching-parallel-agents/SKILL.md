---




name: dispatching-parallel-agents
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent dispatching parallel agents with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: dispatching-parallel-agents, dispatching parallel agents, how do i dispatching-parallel-agents,
    orchestrate dispatching-parallel-agents, automate dispatching-parallel-agents,
    agent dispatching-parallel-agents
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




# Dispatching Parallel Agents

Orchestrates intelligent skill selection and execution for dispatching parallel agents workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_parallel_subtasks(
    decomposed_task: Dict[str, Any],
    agent_registry: List[Dict],
    min_confidence: float = 0.75
) -> Dict[str, Any]:
    """Routes subtasks to optimal agents for parallel execution.
    
    Applies multi-factor scoring: text similarity, historical success, availability.
    Returns immutable routing plan (Law 3).
    """
    if not decomposed_task.get("subtasks"):
        raise ValueError("Decomposed task must contain subtasks for parallel routing")
    
    if not agent_registry:
        raise RuntimeError("Agent registry is empty; cannot dispatch")

    # Parse & validate at boundary (Law 2)
    subtasks = [
        {"id": st["id"], "skill_req": st["skill"], "payload": st["payload"]}
        for st in decomposed_task["subtasks"]
        if st.get("id") and st.get("skill")
    ]
    
    routing_plan = {"task_id": decomposed_task["id"], "assignments": [], "fallbacks": []}
    
    for subtask in subtasks:
        best_agent = None
        best_score = 0.0
        
        for agent in agent_registry:
            if not agent.get("available"):
                continue
            score = _calculate_dispatch_score(subtask["skill_req"], agent)
            if score > best_score and score >= min_confidence:
                best_score = score
                best_agent = agent
        
        if best_agent:
            routing_plan["assignments"].append({
                "subtask_id": subtask["id"],
                "agent_id": best_agent["id"],
                "confidence": best_score
            })
        else:
            routing_plan["fallbacks"].append(subtask["id"])
            
    return routing_plan
```


### Pattern 2: Execution with Fallback

```python
async def execute_parallel_dispatch(
    routing_plan: Dict[str, Any],
    agent_executor: Dict[str, Callable],
    fallback_handler: Callable
) -> Dict[str, Any]:
    """Executes routed subtasks in parallel with automatic fallback chaining.
    
    Implements Fail Fast (Law 4) and Atomic Predictability (Law 3).
    """
    if not routing_plan.get("assignments"):
        return {"status": "no_assignments", "results": {}}

    async def _run_assignment(assignment: Dict) -> Dict:
        agent_id = assignment["agent_id"]
        subtask_id = assignment["subtask_id"]
        try:
            result = await agent_executor[agent_id](subtask_id)
            return {"id": subtask_id, "status": "success", "data": result}
        except Exception as e:
            return {"id": subtask_id, "status": "failed", "error": str(e)}

    # Parallel execution with concurrency control
    semaphore = asyncio.Semaphore(4)
    async def _bounded(assignment):
        async with semaphore:
            return await _run_assignment(assignment)

    tasks = [_bounded(a) for a in routing_plan["assignments"]]
    raw_results = await asyncio.gather(*tasks, return_exceptions=True)

    # Aggregate & apply fallback chain
    final_results = {}
    fallback_triggered = False
    
    for res in raw_results:
        if isinstance(res, Exception):
            fallback_triggered = True
            continue
        if res["status"] == "success":
            final_results[res["id"]] = res["data"]
        else:
            fallback_triggered = True
            fallback_result = await fallback_handler(res["id"], res.get("error"))
            final_results[res["id"]] = fallback_result

    return {
        "status": "completed_with_fallbacks" if fallback_triggered else "completed",
        "results": final_results,
        "fallback_count": sum(1 for r in raw_results if isinstance(r, Exception) or (isinstance(r, dict) and r["status"] == "failed"))
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
- Implement a dependency graph for all tasks before dispatch — only execute nodes whose dependencies are satisfied
- Use a central coordinator that maintains global state and communicates results between parallel agents via immutable messages
- Set explicit timeouts per task and implement circuit breakers: abort parallel execution if error rate exceeds threshold
- Log all inter-agent communications with timestamps, sender, receiver, payload hash, and outcome for debugging

### MUST NOT DO
- Do not allow parallel agents to modify shared mutable state without locking — use message-passing or per-task snapshots
- Avoid fan-out patterns that spawn more than 20 parallel tasks simultaneously without rate limiting
- Never start dependent tasks before confirming upstream task completion — verify status, don't assume success
- Do not ignore agent failures during parallel execution; aggregate and report all errors together rather than failing fast on first


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [Multi-Agent Systems Design Patterns](<https://www.microsoft.com/en-us/research/uploads/prod/2023/05/multi-agent-design-patterns.pdf>)
- [LangGraph Multi-Agent Orchestration](<https://langchain-ai.github.io/langgraph/concepts/multi_agent/>)
- [CrewAI Documentation](<https://docs.crewai.com/>)
- [AutoGen Multi-Agent Framework](<https://microsoft.github.io/autogen/0.2/>)
- [Multi-Agent Orchestration Survey (arXiv)](<https://arxiv.org/abs/2402.01680>)
