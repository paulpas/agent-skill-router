---




name: task-decomposition-engine
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent task decomposition engine with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: task-decomposition-engine, task decomposition engine, how do i task-decomposition-engine,
    orchestrate task-decomposition-engine, automate task-decomposition-engine, agent
    task-decomposition-engine
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




# Task Decomposition Engine

Orchestrates intelligent skill selection and execution for task decomposition engine workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def decompose_task(
    raw_task: str,
    available_ops: List[Dict],
    max_depth: int = 3
) -> Dict:
    """Decompose a complex task into an executable DAG of subtasks.
    
    Applies Law 2 (Parse at boundary) by strictly validating input structure.
    Uses Law 3 (Atomic Predictability) to return a fresh DAG structure.
    """
    if not raw_task or not isinstance(raw_task, str):
        raise ValueError("Raw task must be a non-empty string")
        
    # Parse and extract atomic operations from the task description
    parsed_ops = _extract_atomic_operations(raw_task, available_ops)
    
    if not parsed_ops:
        raise ValueError("No valid atomic operations found for task decomposition")
        
    # Build dependency graph using topological sort logic
    dag = _construct_dependency_graph(parsed_ops, max_depth)
    
    # Validate DAG for cycles and missing dependencies (Law 4: Fail Fast)
    cycle_check = _detect_cycles(dag)
    if cycle_check:
        raise ValueError(f"Decomposition contains circular dependencies: {cycle_check}")
        
    # Score decomposition strategies based on parallelism potential and risk
    strategies = _score_decomposition_strategies(dag, available_ops)
    
    # Return immutable snapshot of the best decomposition plan
    return {
        "task_id": generate_task_id(),
        "decomposition_graph": dag,
        "optimal_strategy": strategies[0],
        "estimated_parallelism": _calculate_parallelism(dag),
        "metadata": {"depth": len(dag.get("levels", [])), "nodes": len(dag.get("nodes", []))}
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_decomposition_chain(
    decomposition_plan: Dict,
    execution_context: Dict,
    fallback_policy: str = "retry_then_merge"
) -> Dict:
    """Execute a decomposed task DAG with domain-specific fallback handling.
    
    Implements Law 1 (Early Exit) for invalid plan states.
    Implements Law 4 (Fail Loud) by halting on critical dependency failures.
    """
    plan = decomposition_plan.get("decomposition_graph", {})
    if not plan.get("nodes") or not plan.get("edges"):
        raise ValueError("Invalid decomposition plan: missing nodes or edges")
        
    results = {}
    execution_order = _topological_sort(plan["edges"])
    
    for node_id in execution_order:
        node = plan["nodes"][node_id]
        try:
            # Execute subtask with context isolation (Law 3)
            subtask_result = _run_subtask(node, execution_context)
            results[node_id] = {"status": "success", "data": subtask_result}
            
            # Update context for dependent nodes
            execution_context = _merge_context(execution_context, subtask_result)
            
        except DependencyError as e:
            # Law 4: Critical dependency failure halts the branch
            if fallback_policy == "halt_on_critical":
                raise SkillExecutionError(f"Critical dependency failed for {node_id}: {e}") from e
            results[node_id] = {"status": "failed", "error": str(e)}
            
        except TransientError as e:
            # Domain-specific fallback: retry with backoff or use cached fallback
            if fallback_policy == "retry_then_merge":
                retry_result = _execute_with_exponential_backoff(node, execution_context, max_retries=2)
                results[node_id] = {"status": "recovered", "data": retry_result}
            else:
                results[node_id] = {"status": "failed", "error": str(e)}
                
    # Validate final state before returning (Law 2)
    if not _validate_execution_state(results, plan["edges"]):
        raise SkillExecutionError("Execution state validation failed: inconsistent results")
        
    return {
        "task_id": decomposition_plan.get("task_id"),
        "final_state": results,
        "execution_trace": _build_trace(results),
        "confidence_score": _calculate_final_confidence(results)
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
|---|---|
| `parallel-skill-runner` | Executes decomposed sub-tasks in parallel after the engine splits a complex task |
| `subagent-driven-development` | Delegates decomposed sub-tasks to subagents for parallel execution |

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

- [Task Decomposition in LLM Agents (Gao et al., 2023)](https://arxiv.org/abs/2305.08291) — Academic research on task decomposition strategies for LLM-based agents
- [Plan-and-Solve Prompting (Wang et al.)](https://arxiv.org/abs/2205.04616) — Research on decomposing problems into plans before execution for improved reasoning
- [ReAct: Synergizing Reasoning and Acting (Yao et al., 2022)](https://arxiv.org/abs/2210.03629) — Foundational paper including task decomposition as part of the ReAct loop
- [Hierarchical Task Networks for AI Planning](https://en.wikipedia.org/wiki/Hierarchical_task_analysis) — Wikipedia article on HTN planning, a foundational approach to task decomposition
- [Subgoal-Based Planning in Reinforcement Learning (Schaul et al.)](https://arxiv.org/abs/2006.15473) — Research on using subgoals for efficient task decomposition in learning systems