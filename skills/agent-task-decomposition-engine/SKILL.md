---
name: agent-task-decomposition-engine
description: Decomposes complex tasks into smaller, manageable subtasks that can be
  executed by appropriate specialized skills, enabling problem-solving for complex
  multi-step operations.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: orchestration
  scope: orchestration
  output-format: analysis
  triggers: complex, decomposes, task decomposition engine, task-decomposition-engine, tasks
  related-skills: agent-code-correctness-verifier, agent-confidence-based-selector, agent-dynamic-replanner, agent-error-trace-explainer, agent-multi-skill-executor
---


# Task Decomposition Engine (Agent Problem Solving)

> **Load this skill** when designing or modifying agent task decomposition patterns that break down complex problems into smaller, solvable subtasks for specialized skills.

## TL;DR Checklist

When decomposing complex tasks:

- [ ] Identify task boundaries and dependencies
- [ ] Select appropriate skills for each subtask
- [ ] Maintain task context across decomposition
- [ ] Validate subtask completeness and coverage
- [ ] Handle recursive decomposition when needed
- [ ] Optimize subtask order for efficiency
- [ ] Support incremental decomposition refinement
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Task Decomposition Engine when:

- Breaking down complex tasks that exceed single-skill capabilities
- Solving problems requiring multiple domain experts
- Building hierarchical task solvers with layered decomposition
- Implementing divide-and-conquer strategies for problem solving
- Creating multi-step workflows from high-level goals
- Building agent systems that reason about task structure

---

## When NOT to Use

Avoid using this skill for:

- Simple single-skill tasks (direct execution)
- Real-time tasks with strict latency requirements
- Tasks with unknown or unpredictable structure
- Tasks requiring dynamic re-planning (use dynamic-replanner)

---

## Core Concepts

### Task Decomposition Tree

Complex tasks are decomposed into a tree structure:

```
Problem
├── Subtask 1 (Skill A)
├── Subtask 2 (Skill B)
│   ├── Subtask 2.1 (Skill C)
│   └── Subtask 2.2 (Skill D)
└── Subtask 3 (Skill A)
```

### Decomposition Strategies

#### 1. Top-Down Decomposition

Start with problem, recursively break down:

```
Problem → Subtasks → Atomic Tasks
```

#### 2. Bottom-Up Synthesis

Combine known patterns into solution:

```
Atomic Tasks → Patterns → Solution
```

#### 3. Goal-Backward Planning

Start from goal, find required subtasks:

```
Goal → Preconditions → Subtasks
```

#### 4. Example-Based Decomposition

Learn from similar tasks:

```
Similar Task → Decomposition → Adapt → New Decomposition
```

### Decomposition Components

#### 1. Decomposer

Selects decomposition strategy and skills:

```python
{
    "strategy": "top_down|bottom_up|goal_backward|example_based",
    "skills": ["skill_a", "skill_b"],
    "max_depth": 5,
    "min_subtask_size": 100
}
```

#### 2. Validator

Ensures decomposition quality:

```python
{
    "completeness": True,  # All task requirements covered
    "consistency": True,   # No contradictory subtasks
    "feasibility": True,   # All subtasks achievable
    "efficiency": 0.85     # Estimated efficiency score
}
```

#### 3. Context Manager

Maintains task state:

```python
{
    "task_id": "uuid",
    "parent_task": None,
    "children": [],
    "input": {...},
    "output": None,
    "status": "pending|decomposing|executing|completed|failed"
}
```

---

## Implementation Patterns

### Pattern 1: Basic Top-Down Decomposition

Decompose task using top-down approach:

```python
from apex.agents.decomposer import TaskDecomposer


def decompose_analysis_task(task: Task) -> list[Task]:
    """Decompose analysis task into subtasks."""
    
    decomposer = TaskDecomposer(
        strategy="top_down",
        max_depth=4,
        min_subtask_size=50
    )
    
    # Define domain skills
    domain_skills = [
        "code-philosophy",
        "risk-management", 
        "indicators-api",
        "defi-arbitrage"
    ]
    
    # Perform decomposition
    subtasks = decomposer.decompose(
        task,
        domain_skills
    )
    
    return subtasks
```

### Pattern 2: Recursive Decomposition

Handle complex problems with nested decomposition:

```python
def recursive_decompose(task: Task, depth: int = 0) -> TaskTree:
    """Decompose recursively with depth limiting."""
    
    if depth > MAX_DEPTH:
        return TaskTree(task=task, is_leaf=True)
    
    decomposer = TaskDecomposer()
    subtasks = decomposer.decompose(task, domain_skills)
    
    # Check if subtasks need further decomposition
    children = []
    for subtask in subtasks:
        if decomposer.requires_decomposition(subtask):
            child = recursive_decompose(subtask, depth + 1)
            children.append(child)
        else:
            children.append(TaskTree(task=subtask, is_leaf=True))
    
    return TaskTree(task=task, children=children, is_leaf=False)
```

### Pattern 3: Goal-Backward Planning

Plan from goal to prerequisites:

```python
def plan_from_goal(goal: str) -> list[Task]:
    """Plan tasks to achieve goal."""
    
    decomposer = TaskDecomposer(strategy="goal_backward")
    
    # Define goal and required outcomes
    goal_task = Task(
        id="goal_1",
        description=goal,
        output_schema={"success": bool, "details": dict}
    )
    
    # Decompose to prerequisites
    prerequisites = decomposer.plan(goal_task)
    
    return prerequisites
```

### Pattern 4: Incremental Refinement

Refine decomposition based on feedback:

```python
def refine_decomposition(
    initial: TaskTree,
    feedback: dict,
    iterations: int = 3
) -> TaskTree:
    """Refine decomposition based on execution feedback."""
    
    decomposer = TaskDecomposer(refinement=True)
    
    current = initial
    for i in range(iterations):
        # Execute and collect feedback
        results = execute(current)
        errors = analyze_errors(results, feedback)
        
        # Refine decomposition
        current = decomposer.refine(current, errors)
        
        # Check for convergence
        if decomposer.converged(current, errors):
            break
    
    return current
```

### Pattern 5: Parallel Decomposition

Optimize for parallel execution:

```python
def parallelizable_decomposition(task: Task) -> TaskTree:
    """Decompose with parallel execution in mind."""
    
    decomposer = TaskDecomposer(
        strategy="top_down",
        optimize_for="parallelism"
    )
    
    # Decompose task
    tree = decomposer.decompose(task, domain_skills)
    
    # Identify independent branches for parallel execution
    independent_branches = decomposer.find_independent_branches(tree)
    
    # Mark for parallel execution
    for branch in independent_branches:
        branch.metadata["parallel"] = True
        branch.metadata["worker_count"] = 1
    
    return tree
```

---

## Common Patterns

### Pattern 1: Decomposition Rules Engine

Define decomposition rules:

```python
decomposition_rules = {
    "complex_analysis": [
        {"rule": "split_by_dimension", "params": {"dimension": "timeframe"}},
        {"rule": "split_by_symbol", "params": {"max_symbols": 5}},
        {"rule": "add_validation", "params": {"validator": "quality_check"}}
    ],
    "trading_strategy": [
        {"rule": "split_by_phase", "params": {"phases": ["entry", "exit", "exit"]}},
        {"rule": "split_by_risk_level", "params": {"levels": [0.01, 0.02, 0.05]}}
    ]
}
```

### Pattern 2: Task Validation

Validate decomposition quality:

```python
def validate_decomposition(tree: TaskTree) -> dict:
    """Validate task decomposition quality."""
    
    checks = {
        "completeness": check_completeness(tree),
        "consistency": check_consistency(tree),
        "feasibility": check_feasibility(tree),
        "efficiency": calculate_efficiency(tree),
        "parallelism": calculate_parallelism_potential(tree)
    }
    
    return {
        "valid": all(checks.values()),
        "scores": checks
    }
```

### Pattern 3: Execution Order Optimization

Optimize task execution order:

```python
def optimize_execution_order(tree: TaskTree) -> TaskTree:
    """Optimize task execution order for efficiency."""
    
    # Topological sort by dependencies
    sorted_tasks = topological_sort(tree)
    
    # Group independent tasks for parallelism
    groups = group_independent_tasks(sorted_tasks)
    
    # Add execution hints
    for i, group in enumerate(groups):
        for task in group:
            task.metadata["execution_group"] = i
            task.metadata["should_parallelize"] = len(group) > 1
    
    return tree
```

---

## Common Mistakes

### Mistake 1: Over-Decomposition

**Wrong:**
```python
# ❌ Breaking task into too many tiny subtasks
decomposer.decompose(task, max_depth=100)
# Overhead exceeds benefit of decomposition
```

**Correct:**
```python
# ✅ Appropriate decomposition depth
decomposer = TaskDecomposer(max_depth=5, min_subtask_size=100)
```

### Mistake 2: Missing Subtask Dependencies

**Wrong:**
```python
# ❌ Subtasks can't access results from previous subtasks
subtasks = [
    {"skill": "analysis", "params": {}},  # Needs previous results
    {"skill": "validation", "params": {}}  # Missing data
]
```

**Correct:**
```python
# ✅ Dependencies explicitly defined
subtasks = [
    {"skill": "analysis", "id": "analysis"},
    {"skill": "validation", "dependencies": ["analysis"]}
]
```

### Mistake 3: Not Handling Edge Cases

**Wrong:**
```python
# ❌ No handling for decomposition failure
try:
    subtasks = decomposer.decompose(task)
except Exception as e:
    # ❌ Crashes instead of graceful fallback
    raise e
```

**Correct:**
```python
try:
    subtasks = decomposer.decompose(task)
except DecompositionFailed as e:
    # ✅ Fallback to simpler approach
    return TaskTree(task=task, is_leaf=True)
```

### Mistake 4: Ignoring Skill Limitations

**Wrong:**
```python
# ❌ Decomposing task beyond skill capabilities
subtasks = decomposer.decompose(task, skills=["basic_skill"])
# Skill can't handle the subtasks
```

**Correct:**
```python
# ✅ Decompose based on skill capabilities
available_skills = get_skills_by_capability(task.complexity)
subtasks = decomposer.decompose(task, available_skills)
```

### Mistake 5: No Decomposition Validation

**Wrong:**
```python
# ❌ No validation of decomposition quality
subtasks = decomposer.decompose(task)
for subtask in subtasks:
    execute(subtask)  # May fail due to poor decomposition
```

**Correct:**
```python
# ✅ Validate before execution
subtasks = decomposer.decompose(task)
validation = decomposer.validate(subtasks)
if not validation.valid:
    subtasks = decomposer.refine(subtasks, validation.errors)
execute(subtasks)
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Decomposition validates inputs
- [ ] **Parsed State:** Task features parsed at boundary
- [ ] **Purity:** Decomposition rules are stateless
- [ ] **Fail Loud:** Invalid tasks throw clear errors
- [ ] **Readability:** Decomposition strategy reads clearly

### Testing

- [ ] Unit tests for each decomposition strategy
- [ ] Integration tests for complex task decomposition
- [ ] Validation tests for decomposition quality
- [ ] Edge case tests for boundary conditions
- [ ] Performance tests for large task trees

### Security

- [ ] Task parameters validated before decomposition
- [ ] No arbitrary code execution in decomposition rules
- [ ] Input sanitization for all task features
- [ ] Decomposition depth limits enforced
- [ ] Recursive decomposition protection

### Performance

- [ ] Decomposition cached where appropriate
- [ ] Memory usage monitored for large trees
- [ ] Parallel decomposition optimized
- [ ] Execution order optimized for efficiency

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `multi-skill-executor` | Sequential execution of decomposed tasks |
| `parallel-skill-runner` | Parallel execution of independent subtasks |
| `confidence-based-selector` | Skill selection for decomposed tasks |
| `dynamic-replanner` | Re-planning during execution |
| `code-philosophy` | Core logic patterns |

### Core Dependencies

- **Decomposer:** Implements decomposition strategies
- **Validator:** Ensures decomposition quality
- **Optimizer:** Optimizes execution order
- **Executor:** Executes decomposed tasks

### External Resources

- [Divide and Conquer Algorithms](https://example.com/divide-conquer) - Algorithmic decomposition
- [Task Decomposition in AI](https://example.com/ai-decomposition) - AI task decomposition
- [Planning Algorithms](https://example.com/planning) - Goal-directed planning

---

## Implementation Tracking

### Agent Task Decomposition Engine - Core Patterns

| Task | Status |
|------|--------|
| Top-down decomposition | ✅ Complete |
| Recursive decomposition | ✅ Complete |
| Goal-backward planning | ✅ Complete |
| Example-based decomposition | ✅ Complete |
| Decomposition validation | ✅ Complete |
| Parallel optimization | ✅ Complete |
| Incremental refinement | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Top-down decomposition
- Recursive decomposition
- Basic validation
- Execution order optimization
- Parallel decomposition support

### 1.1.0 (Planned)
- Goal-backward planning
- Example-based learning
- Advanced optimization
- Dynamic depth adjustment

### 2.0.0 (Future)
- Learning from execution
- Distributed decomposition
- Cross-domain decomposition
- Adaptive decomposition strategies

---

## Implementation Prompt (Execution Layer)

When implementing the Task Decomposition Engine, use this prompt for code generation:

```
Create a Task Decomposition Engine implementation following these requirements:

1. Core Class: `TaskDecomposer`
   - Implement multiple decomposition strategies
   - Manage task decomposition trees
   - Validate decomposition quality
   - Optimize execution order

2. Key Methods:
   - `decompose(task, skills)`: Decompose task into subtasks
   - `requires_decomposition(task)`: Check if task needs decomposition
   - `validate(tree)`: Validate decomposition quality
   - `refine(tree, feedback)`: Refine decomposition
   - `optimize_order(tree)`: Optimize execution order

3. Decomposition Strategies:
   - `top_down`: Break problem into subproblems
   - `bottom_up`: Build solution from atomic tasks
   - `goal_backward`: Plan from goal to prerequisites
   - `example_based`: Learn from similar tasks
   - `hybrid`: Combine multiple strategies

4. Configuration Options:
   - `max_depth`: Maximum recursion depth
   - `min_subtask_size`: Minimum task complexity
   - `strategy`: Decomposition strategy to use
   - `skills`: Available skills for decomposition
   - `validation_threshold`: Minimum quality score

5. Task Tree Structure:
   - `TaskNode`: Representation of task in tree
   - `children`: List of subtasks
   - `parent`: Reference to parent task
   - `metadata`: Task metadata and hints
   - `is_leaf`: Whether task is atomic

6. Validation Rules:
   - Completeness: All task requirements covered
   - Consistency: No contradictory subtasks
   - Feasibility: All subtasks achievable
   - Efficiency: Estimated efficiency score
   - Coverage: All input/output validated

7. Optimization Features:
   - Topological sort by dependencies
   - Parallel group identification
   - Resource-aware ordering
   - Performance estimation
   - Execution hints

8. Feedback Loop:
   - Record execution results
   - Learn from failures
   - Adapt decomposition rules
   - Update skill recommendations
   - Optimize thresholds

Follow the 5 Laws of Elegant Defense:
- Guard clauses for task validation
- Parse task features at boundary
- Pure decomposition functions
- Fail fast on invalid decomposition
- Clear names for all decomposition components
```
