---
name: agent-dependency-graph-builder
description: Builds and maintains dependency graphs for task execution, enabling visualization of task relationships, identification of bottlenecks, and optimization of execution order.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: orchestration
  scope: orchestration
  output-format: analysis
  triggers: dependency graph builder, dependency-graph-builder, builds, maintains, graphs
---

# Dependency Graph Builder (Agent Task Relationships)

> **Load this skill** when designing or modifying agent task dependency management patterns that model relationships between tasks for optimized execution planning and scheduling.

## TL;DR Checklist

When building dependency graphs:

- [ ] Identify all tasks and their dependencies
- [ ] Build directed acyclic graph (DAG) structure
- [ ] Detect cycles in dependency graph
- [ ] Calculate critical path for execution
- [ ] Optimize execution order using topological sort
- [ ] Visualize graph for human understanding
- [ ] Support incremental graph updates
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Dependency Graph Builder when:

- Modeling complex task execution with dependencies
- Scheduling tasks to minimize total execution time
- Visualizing task relationships for team understanding
- Identifying critical path and bottlenecks
- Implementing workflow engines with dependency resolution
- Building CI/CD pipelines with task ordering

---

## When NOT to Use

Avoid using this skill for:

- Simple sequential task execution (direct ordering)
- Tasks with no dependencies (graph overhead)
- Real-time systems with immediate execution requirements
- Single-task operations

---

## Core Concepts

### Dependency Graph Structure

Tasks and their dependencies form a DAG:

```
    A
   / \
  B   C
  |   |
  D   E
   \ /
    F
```

### Graph Components

```python
{
    "nodes": [
        {"id": "A", "task": Task(...), "dependencies": []},
        {"id": "B", "task": Task(...), "dependencies": ["A"]},
        {"id": "C", "task": Task(...), "dependencies": ["A"]},
        {"id": "D", "task": Task(...), "dependencies": ["B"]},
        {"id": "E", "task": Task(...), "dependencies": ["C"]},
        {"id": "F", "task": Task(...), "dependencies": ["D", "E"]}
    ],
    "edges": [
        {"from": "A", "to": "B"},
        {"from": "A", "to": "C"},
        {"from": "B", "to": "D"},
        {"from": "C", "to": "E"},
        {"from": "D", "to": "F"},
        {"from": "E", "to": "F"}
    ]
}
```

### Critical Path

The critical path determines minimum execution time:

```
Critical Path: A -> B -> D -> F (or A -> C -> E -> F)
Critical Path Length: 4 tasks (or time units)
```

### Graph Properties

| Property | Description |
|----------|-------------|
| `nodes` | Tasks in the graph |
| `edges` | Dependencies between tasks |
| `roots` | Tasks with no dependencies |
| `leaves` | Tasks with no dependents |
| `depth` | Maximum dependency depth |
| `width` | Maximum tasks at any level |
| `cycles` | Any circular dependencies |

---

## Implementation Patterns

### Pattern 1: Basic Graph Construction

Build dependency graph from tasks:

```python
from apex.agents.dependency_graph import DependencyGraphBuilder


def build_dependency_graph(tasks: list[Task]) -> DependencyGraph:
    """Build dependency graph from task list."""
    
    builder = DependencyGraphBuilder()
    
    # Build graph from tasks
    graph = builder.build(tasks)
    
    # Validate graph properties
    assert not graph.has_cycles(), "Graph contains cycles"
    assert graph.is_dag(), "Graph is not a DAG"
    
    return graph
```

### Pattern 2: Cycle Detection

Detect and handle cycles in graph:

```python
def build_graph_with_cycle_detection(tasks: list[Task]) -> DependencyGraph:
    """Build graph with cycle detection."""
    
    builder = DependencyGraphBuilder(
        detect_cycles=True,
        cycle_detection_algorithm="tarjan"
    )
    
    try:
        graph = builder.build(tasks)
    except CycleDetectedError as e:
        # Handle cycle - remove dependency or restructure
        print(f"Cycle detected: {e.cycle}")
        graph = builder.fix_cycle(tasks, e.cycle)
    
    return graph
```

### Pattern 3: Critical Path Analysis

Find critical path for execution:

```python
def analyze_critical_path(graph: DependencyGraph) -> list[str]:
    """Analyze and return critical path."""
    
    builder = DependencyGraphBuilder()
    
    # Calculate path lengths
    path_lengths = builder.calculate_path_lengths(graph)
    
    # Find critical path
    critical_path = builder.find_critical_path(
        graph,
        path_lengths
    )
    
    # Estimate total time
    total_time = sum(
        graph.nodes[node_id].task.estimated_duration
        for node_id in critical_path
    )
    
    return {
        "path": critical_path,
        "total_time": total_time,
        "bottlenecks": builder.find_bottlenecks(graph)
    }
```

### Pattern 4: Parallel Execution Optimization

Optimize for parallel execution:

```python
def optimize_for_parallel_execution(graph: DependencyGraph) -> list[list[str]]:
    """Return execution groups for parallel execution."""
    
    builder = DependencyGraphBuilder(
        optimization="parallelism"
    )
    
    # Group independent tasks
    execution_groups = builder.create_execution_groups(graph)
    
    return execution_groups
```

### Pattern 5: Incremental Graph Updates

Update graph as tasks change:

```python
def update_graph_incrementally(
    graph: DependencyGraph,
    new_task: Task,
    existing_tasks: dict[str, Task]
) -> DependencyGraph:
    """Update graph with new task."""
    
    builder = DependencyGraphBuilder()
    
    # Find dependencies for new task
    dependencies = builder.find_dependencies(
        new_task,
        existing_tasks.values()
    )
    
    # Add task to graph
    graph = builder.add_node(
        graph,
        new_task.id,
        new_task,
        dependencies
    )
    
    # Revalidate graph
    assert not graph.has_cycles(), "New task created cycle"
    
    return graph
```

---

## Common Patterns

### Pattern 1: Graph Serialization

Serialize graph for storage/transmission:

```python
def serialize_graph(graph: DependencyGraph) -> dict:
    """Serialize graph to dictionary."""
    
    return {
        "nodes": [
            {
                "id": node.id,
                "task": node.task.to_dict(),
                "dependencies": node.dependencies
            }
            for node in graph.nodes.values()
        ],
        "edges": [
            {"from": edge.from_node, "to": edge.to_node}
            for edge in graph.edges
        ],
        "metadata": {
            "created_at": graph.created_at,
            "version": graph.version
        }
    }
```

### Pattern 2: Graph Visualization

Generate visualization data:

```python
def generate_visualization_data(graph: DependencyGraph) -> dict:
    """Generate data for graph visualization."""
    
    return {
        "nodes": [
            {
                "id": node.id,
                "label": node.task.description[:30],
                "group": get_task_group(node.task),
                "status": node.status,
                "estimated_duration": node.task.estimated_duration,
                "x": 0,  # Layout will position
                "y": 0
            }
            for node in graph.nodes.values()
        ],
        "links": [
            {
                "source": link.from_node,
                "target": link.to_node,
                "type": "dependency"
            }
            for link in graph.edges
        ]
    }
```

### Pattern 3: Dependency Analysis

Analyze graph properties:

```python
def analyze_graph_properties(graph: DependencyGraph) -> dict:
    """Analyze and return graph properties."""
    
    builder = DependencyGraphBuilder()
    
    return {
        "node_count": len(graph.nodes),
        "edge_count": len(graph.edges),
        "depth": builder.calculate_depth(graph),
        "width": builder.calculate_width(graph),
        "roots": builder.find_roots(graph),
        "leaves": builder.find_leaves(graph),
        "has_cycles": graph.has_cycles(),
        "is_dag": graph.is_dag(),
        "connectivity": builder.calculate_connectivity(graph)
    }
```

### Pattern 4: Execution Order

Generate optimized execution order:

```python
def generate_execution_order(graph: DependencyGraph) -> list[str]:
    """Generate optimized task execution order."""
    
    builder = DependencyGraphBuilder()
    
    # Topological sort for valid order
    execution_order = builder.topological_sort(graph)
    
    # Additional optimization for parallelism
    execution_order = builder.optimize_for_parallelism(
        graph,
        execution_order
    )
    
    return execution_order
```

---

## Common Mistakes

### Mistake 1: Allowing Cycles

**Wrong:**
```python
# ❌ Can create cycles accidentally
tasks = [
    Task(id="A", dependencies=["C"]),
    Task(id="B", dependencies=["A"]),
    Task(id="C", dependencies=["B"])  # Cycle: A->B->C->A
]
# Graph building doesn't validate
```

**Correct:**
```python
# ✅ Cycle detection built-in
tasks = [
    Task(id="A", dependencies=["C"]),
    Task(id="B", dependencies=["A"]),
    Task(id="C", dependencies=["B"])
]
builder = DependencyGraphBuilder(detect_cycles=True)
try:
    graph = builder.build(tasks)
except CycleDetectedError:
    # Handle cycle - remove dependency
    tasks[2].dependencies = []  # Remove C->B
    graph = builder.build(tasks)
```

### Mistake 2: Not Handling Unreachable Tasks

**Wrong:**
```python
# ❌ Tasks with missing dependencies
tasks = [
    Task(id="A", dependencies=[]),
    Task(id="B", dependencies=["C"])  # C not defined!
]
```

**Correct:**
```python
# ✅ Validate all dependencies exist
tasks = [
    Task(id="A", dependencies=[]),
    Task(id="B", dependencies=["C"])
]
graph = builder.build(tasks, validate_dependencies=True)
# Raises error if C not in tasks
```

### Mistake 3: Ignoring Execution Time

**Wrong:**
```python
# ❌ All tasks treated equally
graph = builder.build(tasks)
# No consideration for task duration
```

**Correct:**
```python
# ✅ Consider execution times for optimization
graph = builder.build(tasks)
path_lengths = builder.calculate_path_lengths(graph, use_duration=True)
# Uses estimated_duration for critical path
```

### Mistake 4: Not Supporting Incremental Updates

**Wrong:**
```python
# ❌ Must rebuild entire graph for new task
graph = build_graph(initial_tasks)
new_tasks = get_new_tasks()
graph = build_graph(initial_tasks + new_tasks)  # Inefficient
```

**Correct:**
```python
# ✅ Incremental updates
graph = build_graph(initial_tasks)
for task in new_tasks:
    graph = builder.add_task(graph, task)
```

### Mistake 5: Omitting Graph Validation

**Wrong:**
```python
# ❌ No validation after modifications
graph = builder.build(tasks)
# Manual modifications to graph
graph.nodes["A"].dependencies.append("Z")  # Z may not exist
```

**Correct:**
```python
# ✅ Validate after each modification
graph = builder.build(tasks)
graph = builder.add_dependency(graph, "A", "Z")
assert graph.is_valid(), "Graph invalid after modification"
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Graph validation at top of methods
- [ ] **Parsed State:** Task features parsed at boundary
- [ ] **Purity:** Graph building is stateless where possible
- [ ] **Fail Loud:** Invalid graphs throw clear errors
- [ ] **Readability:** Graph structure reads clearly

### Testing

- [ ] Unit tests for graph building
- [ ] Cycle detection tests
- [ ] Topological sort tests
- [ ] Critical path analysis tests
- [ ] Incremental update tests

### Security

- [ ] Task parameters validated before graph building
- [ ] No arbitrary code execution in graph operations
- [ ] Input sanitization for all task features
- [ ] Graph size limits enforced
- [ ] Dependency validation

### Performance

- [ ] Graph building optimized for large graphs
- [ ] Cycle detection efficient (O(V+E))
- [ ] Topological sort optimized
- [ ] Memory usage monitored for large graphs

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `task-decomposition-engine` | Task breakdown for graph building |
| `multi-skill-executor` | Sequential graph execution |
| `parallel-skill-runner` | Parallel graph execution |
| `dynamic-replanner` | Graph modification during execution |
| `code-philosophy` | Core logic patterns |

### Core Dependencies

- **Builder:** Constructs dependency graphs
- **Analyzer:** Analyzes graph properties
- **Validator:** Ensures graph validity
- **Optimizer:** Optimizes graph structure
- **Visualizer:** Generates visualization data

### External Resources

- [DAG Algorithms](https://example.com/dag-algorithms) - Directed acyclic graph algorithms
- [Topological Sorting](https://example.com/topological-sort) - Topological sort algorithms
- [Critical Path Method](https://example.com/critical-path) - Project management technique

---

## Implementation Tracking

### Agent Dependency Graph Builder - Core Patterns

| Task | Status |
|------|--------|
| Graph construction | ✅ Complete |
| Cycle detection | ✅ Complete |
| Critical path analysis | ✅ Complete |
| Topological sorting | ✅ Complete |
| Parallel execution optimization | ✅ Complete |
| Incremental updates | ✅ Complete |
| Graph serialization | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Basic graph construction
- Cycle detection
- Critical path analysis
- Topological sorting
- Graph serialization

### 1.1.0 (Planned)
- Incremental graph updates
- Parallel execution optimization
- Advanced visualization
- Performance profiling

### 2.0.0 (Future)
- Distributed graph processing
- Learning from graph structure
- Adaptive graph modification
- Real-time graph updates

---

## Implementation Prompt (Execution Layer)

When implementing the Dependency Graph Builder, use this prompt for code generation:

```
Create a Dependency Graph Builder implementation following these requirements:

1. Core Class: `DependencyGraphBuilder`
   - Build dependency graphs from task lists
   - Detect cycles in graph structure
   - Calculate critical path for execution
   - Optimize graph for execution efficiency

2. Key Methods:
   - `build(tasks)`: Build graph from tasks
   - `detect_cycles(graph)`: Detect circular dependencies
   - `topological_sort(graph)`: Generate execution order
   - `calculate_critical_path(graph)`: Find critical path
   - `add_node(graph, node_id, task, dependencies)`: Add task to graph

3. Graph Structure:
   - `nodes`: Dictionary of node_id -> Node
   - `edges`: List of (from_id, to_id) tuples
   - `adjacency_list`: Forward adjacency for traversal
   - `reverse_adjacency`: Reverse adjacency for dependency lookup
   - `metadata`: Graph metadata (created_at, version, etc.)

4. Node Properties:
   - `id`: Unique identifier
   - `task`: Task object
   - `dependencies`: List of parent node IDs
   - `dependents`: List of child node IDs
   - `status`: pending/running/completed/failed
   - `estimated_duration`: Expected execution time

5. Graph Validation:
   - `is_dag()`: Check if graph is directed acyclic
   - `has_cycles()`: Detect any cycles
   - `is_valid()`: Full validation including dependencies
   - `validate_dependencies()`: Check dependency existence

6. Analysis Methods:
   - `calculate_depth(graph)`: Maximum dependency depth
   - `calculate_width(graph)`: Maximum tasks at any level
   - `find_roots(graph)`: Tasks with no dependencies
   - `find_leaves(graph)`: Tasks with no dependents
   - `calculate_path_lengths(graph)`: Length to each node

7. Optimization Features:
   - Topological sorting for valid order
   - Critical path calculation
   - Parallel execution group creation
   - Execution time optimization
   - Resource-aware scheduling

8. Incremental Updates:
   - `add_node()`: Add new task to graph
   - `remove_node()`: Remove task from graph
   - `add_dependency()`: Add dependency between tasks
   - `update_task()`: Update task properties
   - `merge_graphs()`: Merge multiple graphs

Follow the 5 Laws of Elegant Defense:
- Guard clauses for graph validation
- Parse task features at boundary
- Pure graph building functions
- Fail fast on invalid graphs
- Clear names for all graph operations
```
