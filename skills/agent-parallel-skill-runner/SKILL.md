---
name: agent-parallel-skill-runner
description: Executes multiple skill specifications concurrently, managing parallel
  workers, synchronization, and result collection for performance-optimized multi-skill
  operations.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: orchestration
  scope: orchestration
  output-format: analysis
  triggers: executes, multiple, parallel skill runner, parallel-skill-runner, specifications
---


# Parallel Skill Runner (Agent Skill Concurrency)

> **Load this skill** when designing or modifying agent skill orchestration patterns that require executing multiple skills concurrently with proper synchronization and result coordination.

## TL;DR Checklist

When executing parallel skill operations:

- [ ] Define parallel groups with independent tasks
- [ ] Ensure skill independence to avoid race conditions
- [ ] Implement result collection with proper aggregation
- [ ] Handle partial failures in parallel execution
- [ ] Configure worker pool size based on resource constraints
- [ ] Implement timeouts for parallel operations
- [ ] Validate skills are idempotent and stateless
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Parallel Skill Runner when:

- Executing independent skills that don't depend on each other's results
- Need to optimize execution time through concurrent processing
- Processing multiple inputs with the same skill chain
- Building distributed skill execution across multiple workers
- Implementing map-reduce patterns for skill execution
- Need to scale skill execution across available resources

---

## When NOT to Use

Avoid using this skill for:

- Sequential skill dependencies (use multi-skill-executor instead)
- Skills that share mutable state
- Real-time operations requiring strict ordering
- Single-skill execution (direct invocation is faster)

---

## Core Concepts

### Parallel Execution Model

The runner implements a map-reduce pattern for parallel skill execution:

```
Inputs → [Map Phase: Parallel Skills] → [Reduce Phase: Aggregate Results]
               ↓         ↓         ↓
           Skill1  Skill2  Skill3
```

### Execution Strategies

#### 1. Unbounded Parallelism

All skills execute simultaneously:

```python
runner = ParallelSkillRunner(max_workers=None)
results = runner.execute(parallel_tasks)
```

#### 2. Bounded Parallelism

Fixed number of concurrent workers:

```python
runner = ParallelSkillRunner(max_workers=4)
results = runner.execute(parallel_tasks)
```

#### 3. Grouped Execution

Execute skills in batches:

```python
runner = ParallelSkillRunner(group_size=3)
results = runner.execute_with_groups(tasks)
```

### Worker Pool Management

The runner maintains a pool of worker threads/processes:

```python
{
    "worker_id": {
        "status": "idle|running|completed|failed",
        "current_task": None,
        "result": None,
        "execution_time": None
    }
}
```

### Result Collection Patterns

#### 1. List Aggregation

Collect results in order:

```python
results = [
    {"skill": "skill_a", "result": {...}},
    {"skill": "skill_b", "result": {...}},
    ...
]
```

#### 2. Dictionary Aggregation

Group by skill name:

```python
results = {
    "skill_a": {...},
    "skill_b": {...},
    ...
}
```

#### 3. Map Aggregation

Key results by input:

```python
results = {
    "input_a": {"skill": "...", "result": {...}},
    "input_b": {"skill": "...", "result": {...}},
    ...
}
```

---

## Implementation Patterns

### Pattern 1: Basic Parallel Execution

Execute multiple skills concurrently:

```python
from apex.agents.parallel_runner import ParallelSkillRunner
from apex.agents.skill_registry import SkillRegistry


def execute_parallel_skills():
    """Execute multiple skills in parallel."""
    
    registry = SkillRegistry()
    registry.register_skill("code-philosophy")
    registry.register_skill("risk-management")
    registry.register_skill("indicators-api")
    
    # Define parallel tasks
    tasks = [
        {
            "skill": "code-philosophy",
            "params": {"file_path": "apex/core/config.py"},
            "id": "config_review"
        },
        {
            "skill": "code-philosophy", 
            "params": {"file_path": "apex/strategy/base.py"},
            "id": "strategy_review"
        },
        {
            "skill": "risk-management",
            "params": {"portfolio_value": 10000, "symbol": "BTC/USDT"},
            "id": "risk_analysis"
        },
        {
            "skill": "indicators-api",
            "params": {"symbol": "BTC/USDT", "timeframe": "1h"},
            "id": "indicator_query"
        }
    ]
    
    # Execute with 4 workers
    runner = ParallelSkillRunner(max_workers=4)
    results = runner.execute(tasks)
    
    return results
```

### Pattern 2: Parallel Batch Processing

Process multiple inputs with same skill:

```python
def execute_parallel_batch(symbols: list[str]):
    """Execute indicator query in parallel for multiple symbols."""
    
    tasks = [
        {
            "skill": "indicators-api",
            "params": {"symbol": symbol, "timeframe": "1h", "limit": 100},
            "id": f"indicator_{symbol.replace('/', '_')}"
        }
        for symbol in symbols
    ]
    
    runner = ParallelSkillRunner(max_workers=8)
    results = runner.execute(tasks)
    
    # Aggregate by symbol
    by_symbol = {t["id"]: r for t, r in zip(tasks, results)}
    
    return by_symbol
```

### Pattern 3: Grouped Parallel Execution

Execute skills in coordinated groups:

```python
def execute_with_groups():
    """Execute skills in groups with synchronization."""
    
    # Group 1: Analysis skills (can run in parallel)
    group1 = [
        {"skill": "indicators-api", "params": {"symbol": "BTC/USDT"}},
        {"skill": "indicators-api", "params": {"symbol": "ETH/USDT"}},
        {"skill": "indicators-api", "params": {"symbol": "SOL/USDT"}}
    ]
    
    # Group 2: Risk analysis (depends on group 1 results)
    group2 = [
        {"skill": "risk-management", "params": {"symbol": "BTC/USDT"}},
        {"skill": "risk-management", "params": {"symbol": "ETH/USDT"}},
        {"skill": "risk-management", "params": {"symbol": "SOL/USDT"}}
    ]
    
    runner = ParallelSkillRunner(max_workers=4)
    
    # Execute groups sequentially
    results1 = runner.execute(group1)
    results2 = runner.execute(group2, context={"indicators": results1})
    
    return {"group1": results1, "group2": results2}
```

### Pattern 4: Map-Reduce Pattern

Distribute work and aggregate results:

```python
def execute_map_reduce(symbols: list[str], indicators: list[str]):
    """Execute map-reduce across symbols and indicators."""
    
    # Map phase: Generate tasks
    tasks = []
    for symbol in symbols:
        for indicator in indicators:
            tasks.append({
                "skill": "indicators-api",
                "params": {"symbol": symbol, "indicator_name": indicator},
                "id": f"{symbol}_{indicator}"
            })
    
    # Execute in parallel
    runner = ParallelSkillRunner(max_workers=16)
    map_results = runner.execute(tasks)
    
    # Reduce phase: Aggregate by symbol
    aggregated = {}
    for task, result in zip(tasks, map_results):
        symbol = task["id"].split("_")[0]
        if symbol not in aggregated:
            aggregated[symbol] = {}
        indicator = "_".join(task["id"].split("_")[1:])
        aggregated[symbol][indicator] = result
    
    return aggregated
```

### Pattern 5: Fault Tolerant Execution

Handle partial failures in parallel execution:

```python
def execute_with_fault_tolerance():
    """Execute with fault tolerance for individual tasks."""
    
    tasks = [
        {"skill": "indicators-api", "params": {"symbol": "BTC/USDT"}},
        {"skill": "indicators-api", "params": {"symbol": "ETH/USDT"}},
        {"skill": "indicators-api", "params": {"symbol": "INVALID_SYMBOL"}},  # Will fail
        {"skill": "indicators-api", "params": {"symbol": "SOL/USDT"}}
    ]
    
    runner = ParallelSkillRunner(
        max_workers=4,
        continue_on_error=True,
        retry_attempts=2,
        timeout=30
    )
    
    results = runner.execute(tasks)
    
    # Results contain both success and error information
    success_count = sum(1 for r in results if not r.get("error"))
    failure_count = len(results) - success_count
    
    return {
        "total": len(results),
        "success": success_count,
        "failed": failure_count,
        "details": results
    }
```

---

## Common Patterns

### Pattern 1: Worker Pool Configuration

Configure worker pool based on workload:

```python
# I/O bound tasks: More workers
runner = ParallelSkillRunner(max_workers=os.cpu_count() * 2)

# CPU bound tasks: Fewer workers
runner = ParallelSkillRunner(max_workers=os.cpu_count() - 1)

# Memory constrained: Limit concurrent tasks
runner = ParallelSkillRunner(max_workers=2)
```

### Pattern 2: Result Aggregation Strategies

Different aggregation methods for different use cases:

```python
# Method 1: List (preserves order)
results = runner.execute(tasks, aggregate="list")

# Method 2: Dict (access by skill ID)
results = runner.execute(tasks, aggregate="dict", key="id")

# Method 3: Grouped by skill type
results = runner.execute(tasks, aggregate="grouped", group_by="skill")

# Method 4: Custom aggregation function
results = runner.execute(tasks, aggregate="custom", aggregator=my_aggregator)
```

### Pattern 3: Progress Monitoring

Track parallel execution progress:

```python
def execute_with_progress(tasks):
    """Execute with progress tracking."""
    
    total = len(tasks)
    completed = 0
    
    def progress_callback(result, task):
        nonlocal completed
        completed += 1
        progress = (completed / total) * 100
        print(f"Progress: {progress:.1f}% ({completed}/{total})")
    
    runner = ParallelSkillRunner(
        max_workers=4,
        callbacks={"on_result": progress_callback}
    )
    
    results = runner.execute(tasks)
    return results
```

---

## Common Mistakes

### Mistake 1: Sharing Mutable State Between Skills

**Wrong:**
```python
shared_data = {"count": 0}

def shared_state_skill(params):
    # ❌ Race condition on shared_data
    shared_data["count"] += 1
    return shared_data

tasks = [{"skill": shared_state_skill} for _ in range(10)]
# Results will be unpredictable
```

**Correct:**
```python
def stateless_skill(params):
    # ✅ Returns new data, no shared state
    return {"count": 1}

tasks = [{"skill": stateless_skill} for _ in range(10)]
# Each task independent, results predictable
```

### Mistake 2: Not Configuring Worker Pool Appropriately

**Wrong:**
```python
# ❌ Too few workers for I/O bound tasks
runner = ParallelSkillRunner(max_workers=1)
# ❌ Too many workers for CPU bound tasks
runner = ParallelSkillRunner(max_workers=100)
```

**Correct:**
```python
import os
import multiprocessing

# I/O bound: More workers than CPUs
if is_io_bound():
    workers = os.cpu_count() * 2
# CPU bound: One worker per CPU
else:
    workers = os.cpu_count() - 1

runner = ParallelSkillRunner(max_workers=workers)
```

### Mistake 3: Ignoring Skill Dependencies

**Wrong:**
```python
tasks = [
    {"skill": "skill_a", "params": {"x": "${skill_b.result}"}},  # Depends on B
    {"skill": "skill_b", "params": {}}
]
# ❌ A may execute before B
```

**Correct:**
```python
# Use multi-skill-executor for dependencies
from apex.agents.skill_executor import SkillExecutor

chain = [
    {"skill": "skill_b", "id": "b"},
    {"skill": "skill_a", "params": {"x": "${b.result}"}, "dependencies": ["b"]}
]
```

### Mistake 4: Omitting Timeout Handling

**Wrong:**
```python
tasks = [
    {"skill": "slow_skill", "params": {"timeout": 60}}
]
runner = ParallelSkillRunner(max_workers=4)
results = runner.execute(tasks)
# ❌ May hang indefinitely
```

**Correct:**
```python
runner = ParallelSkillRunner(
    max_workers=4,
    default_timeout=30,
    continue_on_timeout=True
)
results = runner.execute(tasks)
# ✅ Tasks timeout after 30s
```

### Mistake 5: Not Validating Skill Compatibility

**Wrong:**
```python
tasks = [
    {"skill": "code-philosophy"},
    {"skill": "defi-arbitrage"},  # Different context requirements
    {"skill": "indicators-api"}
]
# ❌ Skills may conflict on shared context
```

**Correct:**
```python
runner = ParallelSkillRunner(validate_compatibility=True)
# Checks for shared context conflicts
runner.execute(tasks)
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Worker pool management validates inputs
- [ ] **Parsed State:** Task definitions parsed and validated
- [ ] **Purity:** Skills executed in isolation, no shared mutations
- [ ] **Fail Loud:** Worker failures halt execution with descriptive errors
- [ ] **Readability:** Parallel execution flow reads clearly

### Testing

- [ ] Unit tests for worker pool management
- [ ] Integration tests for parallel execution
- [ ] Race condition tests for shared resources
- [ ] Timeout tests for slow skills
- [ ] Fault tolerance tests for partial failures

### Security

- [ ] Task parameters validated against schemas
- [ ] No arbitrary code execution
- [ ] Input sanitization for all parameters
- [ ] Resource limits enforced
- [ ] Worker isolation verified

### Performance

- [ ] Worker pool sized appropriately for workload
- [ ] Memory usage monitored for parallel operations
- [ ] CPU utilization balanced across workers
- [ ] Network I/O optimized for distributed execution

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `multi-skill-executor` | Sequential skill execution |
| `code-philosophy` | Core logic patterns for skill implementation |
| `risk-management` | Risk constraints for skill execution |
| `indicators-api` | Example skill with API integration |
| `confidence-based-selector` | Dynamic skill selection |

### Core Dependencies

- **Worker Pool Manager:** Manages thread/process pool
- **Task Scheduler:** Distributes tasks to workers
- **Result Collector:** Aggregates results from workers
- **Error Handler:** Manages worker failures

### External Resources

- [Python ThreadPoolExecutor](https://docs.python.org/3/library/concurrent.futures.html) - Thread-based parallelism
- [Process Pool](https://docs.python.org/3/library/multiprocessing.html) - Process-based parallelism
- [Map-Reduce Pattern](https://example.com/map-reduce) - Distributed processing pattern

---

## Implementation Tracking

### Agent Parallel Skill Runner - Core Patterns

| Task | Status |
|------|--------|
| Worker pool management | ✅ Complete |
| Parallel task execution | ✅ Complete |
| Result aggregation | ✅ Complete |
| Fault tolerance | ✅ Complete |
| Progress tracking | ✅ Complete |
| Timeout handling | ✅ Complete |
| Grouped execution | ✅ Complete |
| Map-reduce pattern | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Basic parallel execution
- Worker pool management
- Result aggregation
- Fault tolerance
- Timeout handling

### 1.1.0 (Planned)
- Grouped parallel execution
- Dynamic worker scaling
- Advanced result aggregation
- Performance metrics

### 2.0.0 (Future)
- Distributed execution
- Cross-node task distribution
- Load balancing
- Execution analytics

---

## Implementation Prompt (Execution Layer)

When implementing the Parallel Skill Runner, use this prompt for code generation:

```
Create a Parallel Skill Runner implementation following these requirements:

1. Core Class: `ParallelSkillRunner`
   - Initialize with skill registry and worker configuration
   - Execute skills in parallel with configurable worker count
   - Handle result aggregation with multiple strategies
   - Support fault-tolerant execution

2. Key Methods:
   - `execute(tasks, **options)`: Execute tasks in parallel
   - `execute_with_groups(task_groups)`: Execute in coordinated groups
   - `execute_batch(inputs, skill)`: Map skill across inputs
   - `execute_with_progress(tasks, callbacks)`: Execute with progress tracking
   - `aggregate_results(results, method)`: Combine results

3. Worker Pool Configuration:
   - `max_workers`: Maximum concurrent workers (None = unbounded)
   - `timeout`: Default timeout for each task
   - `continue_on_error`: Whether to continue after failures
   - `retry_attempts`: Number of retries for failed tasks
   - `retry_delay`: Delay between retries in seconds

4. Result Aggregation Strategies:
   - `list`: Return results in order of task list
   - `dict`: Group by task ID or skill name
   - `grouped`: Group by skill type or provided key
   - `custom`: Apply custom aggregation function

5. Fault Tolerance:
   - Continue execution on individual task failures
   - Retry failed tasks with configurable attempts
   - Timeout handling with graceful termination
   - Error metadata capture for debugging

6. Progress Tracking:
   - Callback on task completion
   - Progress percentage tracking
   - Estimated time remaining
   - Custom monitoring hooks

7. Configuration Options:
   - `validate_compatibility`: Check skill compatibility
   - `preserve_order`: Maintain input order in results
   - `chunk_size`: Group tasks for batch processing
   - `log_level`: Verbosity of execution logging

8. Worker Management:
   - Thread-based workers for I/O bound tasks
   - Process-based workers for CPU bound tasks
   - Worker lifecycle management
   - Graceful shutdown handling

Follow the 5 Laws of Elegant Defense:
- Guard clauses for worker pool configuration
- Parse task definitions at boundary
- Pure function execution for skills
- Fail fast on worker failures
- Intentional naming for all methods and options
```
