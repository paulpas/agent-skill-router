---




name: dependency-graph-builder
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent dependency graph builder with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: dependency-graph-builder, dependency graph builder, how do i dependency-graph-builder,
    orchestrate dependency-graph-builder, automate dependency-graph-builder, agent
    dependency-graph-builder
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




# Dependency Graph Builder

Orchestrates intelligent skill selection and execution for dependency graph builder workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def build_dependency_graph(
    tasks: List[Dict[str, Any]],
    skill_registry: Dict[str, Dict]
) -> Tuple[Dict[str, List[str]], List[str]]:
    """Construct a directed acyclic graph (DAG) from task definitions and resolve execution order.
    
    Maps task dependencies to available skills, validates the graph structure,
    and performs topological sorting to determine the optimal execution pipeline.
    
    Args:
        tasks: List of task dicts with 'id', 'name', 'depends_on', and 'required_skill'
        skill_registry: Mapping of skill names to their metadata and availability status
        
    Returns:
        Tuple of (adjacency_list, topological_order)
        
    Raises:
        CycleDetectedError: If circular dependencies exist in the task graph
        MissingDependencyError: If a referenced dependency does not exist in tasks
    """
    adjacency: Dict[str, List[str]] = {t["id"]: [] for t in tasks}
    in_degree: Dict[str, int] = {t["id"]: 0 for t in tasks}
    task_map = {t["id"]: t for t in tasks}
    
    for task in tasks:
        for dep_id in task.get("depends_on", []):
            if dep_id not in task_map:
                raise MissingDependencyError(f"Task {task['id']} depends on non-existent {dep_id}")
            adjacency[dep_id].append(task["id"])
            in_degree[task["id"]] += 1
            
    # Kahn's algorithm for topological sort
    queue = [tid for tid, deg in in_degree.items() if deg == 0]
    execution_order = []
    
    while queue:
        current = queue.pop(0)
        execution_order.append(current)
        for neighbor in adjacency[current]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
                
    if len(execution_order) != len(tasks):
        raise CycleDetectedError("Circular dependency detected in task graph")
        
    return adjacency, execution_order
```


### Pattern 2: Execution with Fallback

```python
def resolve_skill_dependencies(
    execution_order: List[str],
    task_map: Dict[str, Dict],
    skill_registry: Dict[str, Dict],
    fallback_strategy: str = "sequential"
) -> List[Dict[str, Any]]:
    """Map topologically sorted tasks to executable skill invocations with dependency resolution.
    
    Validates skill availability for each task, constructs execution nodes with
    dependency payloads, and applies the specified fallback strategy for unavailable skills.
    
    Args:
        execution_order: Topologically sorted list of task IDs
        task_map: Dictionary mapping task IDs to their full definitions
        skill_registry: Available skills with health/status metadata
        fallback_strategy: How to handle missing skills ('sequential', 'parallel', 'defer')
        
    Returns:
        List of execution nodes ready for the orchestrator pipeline
    """
    execution_pipeline = []
    
    for task_id in execution_order:
        task = task_map[task_id]
        required_skill = task.get("required_skill")
        
        if required_skill not in skill_registry:
            if fallback_strategy == "defer":
                execution_pipeline.append({
                    "task_id": task_id,
                    "status": "deferred",
                    "reason": f"Skill {required_skill} unavailable",
                    "fallback": "human_operator"
                })
                continue
            raise SkillUnavailableError(f"Required skill {required_skill} not in registry")
            
        skill_meta = skill_registry[required_skill]
        dep_payloads = [
            task_map[dep_id].get("output_key") 
            for dep_id in task.get("depends_on", [])
            if dep_id in task_map
        ]
        
        execution_pipeline.append({
            "task_id": task_id,
            "skill": required_skill,
            "params": task.get("parameters", {}),
            "dependencies": dep_payloads,
            "confidence": skill_meta.get("base_confidence", 0.8),
            "retry_policy": skill_meta.get("retry_config", {"max": 2, "backoff": "exponential"})
        })
        
    return execution_pipeline
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

- [Graphviz Documentation](<https://graphviz.org/documentation/>)
- [NetworkX Python Library](<https://networkx.org/documentation/stable/>)
- [Dependency Graph Algorithms (Wikipedia)](<https://en.wikipedia.org/wiki/Dependency_graph>)
- [Call Graph Analysis Tools Overview](<https://en.wikipedia.org/wiki/Control-flow_graph>)
- [Cyclomatic Complexity Calculation](<https://www.sonarsource.com/blog/what-is-cyclomatic-complexity-and-how-does-sonarqube-calculates-it/>)

## Related Skills

| Skill | Purpose |
|