---
name: profiler
description: '"Profiles code execution to identify performance bottlenecks and optimization"
  opportunities across systems.'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: debugging
  scope: analysis
  output-format: analysis
  triggers: bottlenecks, optimization, performance profiler, performance-profiler,
    profiles, performance, speed
  related-skills: add-new-skill, code-correctness-verifier, confidence-based-selector,
    goal-to-milestones
---






# Performance Profiler (Execution Analysis)

> **Load this skill** when designing or modifying performance profiling pipelines that identify execution bottlenecks, measure resource usage, and suggest optimization opportunities.

## TL;DR Checklist

When profiling execution performance:

- [ ] Identify hot paths and critical execution routes
- [ ] Measure CPU, memory, and I/O usage at each stage
- [ ] Calculate performance metrics (latency, throughput, efficiency)
- [ ] Compare against baselines and benchmarks
- [ ] Isolate performance regressions
- [ ] Suggest concrete optimization opportunities
- [ ] Track performance over time and across versions
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Performance Profiler when:

- Identifying bottlenecks in slow-executing code
- Comparing performance across different implementations
- Measuring resource usage for optimization opportunities
- Tracking performance regression after code changes
- Benchmarking against established baselines
- Analyzing execution patterns for optimization hints

---

## When NOT to Use

Avoid using this skill for:

- Real-time profiling (use live monitoring instead)
- Single-line performance checks (use microbenchmarks)
- Profiling already-optimized code without regression detection
- Environments where profiling overhead is unacceptable
- Tasks where correctness is more important than speed

---

## Core Concepts

### Performance Profile Structure

Profiling data is organized as a hierarchical profile:

```
Execution Profile
├── Component A
│   ├── Function A1 (25ms, 100 calls)
│   └── Function A2 (50ms, 50 calls)
├── Component B
│   └── Function B1 (100ms, 25 calls)
└── Component C
    └── Function C1 (75ms, 100 calls)
```

### Key Metrics

#### 1. Time Metrics

```
Total Time = Sum(Execution Times)
Self Time = Total Time - Sum(Child Times)
Calls = Number of invocations
```

#### 2. Memory Metrics

```
Peak Memory = Maximum memory usage
Average Memory = Mean memory usage
Allocations = Total allocations
```

#### 3. Throughput Metrics

```
Throughput = Operations / Time
Efficiency = Work / (Time × Resources)
```

### Profiling Strategies

#### 1. Sampling Profile

 periodic snapshots of execution state:

```
Sample 1: [function_a, function_b]
Sample 2: [function_a, function_c]
Sample 3: [function_d, function_e]
```

#### 2. Instrumentation Profile

instrument every function call:

```
Function A: enter(0ms), exit(25ms)
Function B: enter(5ms), exit(15ms)
Function C: enter(15ms), exit(25ms)
```

#### 3. Resource Profile

track resource usage over time:

```
Time 0ms: CPU 10%, Memory 100MB
Time 10ms: CPU 50%, Memory 200MB
Time 20ms: CPU 80%, Memory 300MB
```

---

## Implementation Patterns

### Pattern 1: Basic Function Profiling

Profile individual functions for performance:

```python
from dataclasses import dataclass
from typing import Callable, Any
import time


@dataclass
class ProfileResult:
    function: str
    total_time: float
    self_time: float
    calls: int
    children: list["ProfileResult"]
    
    def total_execution_time(self) -> float:
        """Calculate total execution time including children."""
        return self.total_time + sum(c.total_execution_time() for c in self.children)


def profile_function(func: Callable, *args, **kwargs) -> tuple[Any, ProfileResult]:
    """Profile a single function call."""
    start_time = time.perf_counter()
    start_memory = get_memory_usage()
    
    result = func(*args, **kwargs)
    
    end_time = time.perf_counter()
    end_memory = get_memory_usage()
    
    profile = ProfileResult(
        function=func.__name__,
        total_time=end_time - start_time,
        self_time=end_time - start_time,  # Will be adjusted for children
        calls=1,
        children=[]
    )
    
    return result, profile
```

### Pattern 2: Hierarchical Profile aggregation

Aggregate profiles into hierarchical structure:

```python
def aggregate_profiles(function_profiles: list[ProfileResult]) -> ProfileResult:
    """Aggregate function profiles into hierarchical structure."""
    # Build call tree
    call_tree = {}
    
    for profile in function_profiles:
        # Group by call stack context
        if profile.function not in call_tree:
            call_tree[profile.function] = {
                "total_time": 0,
                "self_time": 0,
                "calls": 0,
                "children": []
            }
        
        call_tree[profile.function]["total_time"] += profile.total_time
        call_tree[profile.function]["calls"] += profile.calls
    
    # Build hierarchical profile
    root = ProfileResult(
        function="root",
        total_time=sum(p.total_time for p in function_profiles),
        self_time=0,
        calls=1,
        children=[
            ProfileResult(
                function=name,
                total_time=data["total_time"],
                self_time=data["self_time"],
                calls=data["calls"],
                children=[]
            )
            for name, data in call_tree.items()
        ]
    )
    
    return root
```

### Pattern 3: Performance Regression Detection

Detect performance regressions between versions:

```python
def detect_regression(
    baseline: ProfileResult,
    current: ProfileResult,
    threshold: float = 0.1
) -> list[dict]:
    """Detect performance regressions compared to baseline."""
    regressions = []
    
    # Compare each function
    baseline_funcs = {p.function: p for p in collect_all_functions(baseline)}
    current_funcs = {p.function: p for p in collect_all_functions(current)}
    
    for func_name, current_profile in current_funcs.items():
        if func_name not in baseline_funcs:
            regressions.append({
                "function": func_name,
                "type": "new_function",
                "impact": "new function added"
            })
            continue
        
        baseline_profile = baseline_funcs[func_name]
        
        # Calculate time difference
        time_diff = (current_profile.total_time - baseline_profile.total_time) / max(baseline_profile.total_time, 1e-10)
        
        if time_diff > threshold:
            regressions.append({
                "function": func_name,
                "type": "time_regression",
                "impact": f"{time_diff * 100:.1f}% slower",
                "baseline_time": baseline_profile.total_time,
                "current_time": current_profile.total_time
            })
    
    return regressions
```

### Pattern 4: Optimization Suggestions

Generate optimization suggestions based on profile:

```python
def generate_optimization_suggestions(profile: ProfileResult) -> list[dict]:
    """Generate optimization suggestions based on performance profile."""
    suggestions = []
    
    def analyze_node(node: ProfileResult, depth: int = 0):
        # High time consumption
        if node.total_time > 1.0:  # 1 second threshold
            suggestions.append({
                "priority": "high" if node.total_time > 5.0 else "medium",
                "type": "time_reduction",
                "function": node.function,
                "description": f"Function {node.function} takes {node.total_time:.2f}s",
                "suggestion": "Consider caching, parallelization, or algorithm optimization"
            })
        
        # High call count
        if node.calls > 1000:
            suggestions.append({
                "priority": "medium",
                "type": "call_reduction",
                "function": node.function,
                "description": f"Function {node.function} called {node.calls} times",
                "suggestion": "Consider batching, memoization, or call elimination"
            })
        
        # High memory usage (if tracked)
        if hasattr(node, "memory_usage") and node.memory_usage > 100_000_000:  # 100MB
            suggestions.append({
                "priority": "high",
                "type": "memory_optimization",
                "function": node.function,
                "description": f"Function {node.function} uses {node.memory_usage / 1_000_000:.1f}MB",
                "suggestion": "Consider streaming, batching, or memory pooling"
            })
    
    collect_all_functions = lambda p: [p] + [c for child in p.children for c in collect_all_functions(child)]
    
    for child in profile.children:
        analyze_node(child)
    
    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    suggestions.sort(key=lambda x: priority_order.get(x["priority"], 3))
    
    return suggestions
```

### Pattern 5: Real-time Profiling Pipeline

Build a real-time profiling pipeline:

```python
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Optional
import threading


@dataclass
class ProfileState:
    active: bool = False
    profiles: list[ProfileResult] = None
    lock: threading.Lock = None
    
    def __post_init__(self):
        self.profiles = []
        self.lock = threading.Lock()


class RealTimeProfiler:
    """Real-time performance profiler with minimal overhead."""
    
    def __init__(self, sample_interval: float = 0.01):
        self.state = ProfileState()
        self.sample_interval = sample_interval
        self.timer = None
    
    @contextmanager
    def profile_context(self, function_name: str):
        """Context manager for profiling code blocks."""
        start_time = time.perf_counter()
        start_memory = get_memory_usage()
        
        try:
            yield
        finally:
            end_time = time.perf_counter()
            end_memory = get_memory_usage()
            
            profile = ProfileResult(
                function=function_name,
                total_time=end_time - start_time,
                self_time=end_time - start_time,
                calls=1,
                children=[]
            )
            
            with self.state.lock:
                self.state.profiles.append(profile)
    
    def start_profiling(self):
        """Start real-time profiling."""
        self.state.active = True
        self._schedule_sampling()
    
    def stop_profiling(self) -> ProfileResult:
        """Stop profiling and return aggregated profile."""
        self.state.active = False
        if self.timer:
            self.timer.cancel()
        
        return aggregate_profiles(self.state.profiles)
    
    def _schedule_sampling(self):
        """Schedule next sample."""
        if not self.state.active:
            return
        
        self.timer = threading.Timer(self.sample_interval, self._do_sample)
        self.timer.start()
    
    def _do_sample(self):
        """Perform a single sample."""
        if not self.state.active:
            return
        
        # Sample current state
        current_stack = get_current_stack()
        current_memory = get_memory_usage()
        
        with self.state.lock:
            self.state.profiles.append(ProfileResult(
                function=f"sample_{len(self.state.profiles)}",
                total_time=self.sample_interval,
                self_time=self.sample_interval,
                calls=1,
                children=[]
            ))
        
        self._schedule_sampling()
```

---

## Common Patterns

### Pattern 1: Profiling Decorator

Decorator for automatic function profiling:

```python
def profile_decorator(func: Callable) -> Callable:
    """Decorator to automatically profile a function."""
    
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        if not profiling_enabled():
            return func(*args, **kwargs)
        
        result, profile = profile_function(func, *args, **kwargs)
        store_profile(profile)
        
        return result
    
    return wrapper
```

### Pattern 2: Profiling Middleware

Middleware for profiling HTTP requests or other operations:

```python
class ProfilingMiddleware:
    """Middleware for profiling operations."""
    
    def __init__(self, next_handler: Callable):
        self.next_handler = next_handler
        self.profiler = RealTimeProfiler()
    
    async def __call__(self, request: Request) -> Response:
        with self.profiler.profile_context(request.endpoint):
            response = await self.next_handler(request)
        
        return response
    
    def get_profile(self) -> ProfileResult:
        """Get aggregated profile for all handled requests."""
        return self.profiler.get_profile()
```

### Pattern 3: Profiling Report Generation

Generate human-readable profiling reports:

```python
def generate_profiling_report(profile: ProfileResult, format: str = "text") -> str:
    """Generate profiling report in specified format."""
    if format == "text":
        return _text_report(profile)
    elif format == "json":
        return _json_report(profile)
    elif format == "markdown":
        return _markdown_report(profile)
    else:
        raise ValueError(f"Unknown format: {format}")


def _text_report(profile: ProfileResult, indent: int = 0) -> str:
    """Generate text report."""
    lines = []
    
    # Calculate percentages
    total_time = profile.total_execution_time()
    if total_time > 0:
        percentage = (profile.total_time / total_time) * 100
    else:
        percentage = 0
    
    # Current level
    lines.append(f"{'  ' * indent}{profile.function}: {profile.total_time:.2f}s ({percentage:.1f}%) [{profile.calls} calls]")
    
    # Children
    for child in sorted(profile.children, key=lambda c: c.total_time, reverse=True):
        lines.append(_text_report(child, indent + 1))
    
    return "\n".join(lines)
```

---

## Common Mistakes

### Mistake 1: Profiling Overhead Impact

**Wrong:**
```python
# ❌ Profiling overhead dominates execution time
def slow_function():
    start = time.perf_counter()
    result = expensive_operation()
    end = time.perf_counter()
    print(f"Time: {end - start}")  # Profiling overhead included
    return result
```

**Correct:**
```python
# ✅ Separate profiling from execution
def slow_function():
    result = expensive_operation()
    return result

def profile_wrapper():
    start = time.perf_counter()
    result = slow_function()
    end = time.perf_counter()
    print(f"Time: {end - start}")  # Only measuring once
```

### Mistake 2: Not Accounting for Warm-up

**Wrong:**
```python
# ❌ First execution includes JIT compilation, caching overhead
profile = profile_function(rarely_called_function)
# Profile reflects cold start, not steady state
```

**Correct:**
```python
# ✅ Warm up before profiling
for _ in range(10):
    rarely_called_function()  # Warm up

profile = profile_function(rarely_called_function)
# Profile reflects steady state
```

### Mistake 3: Ignoring Multithreading

**Wrong:**
```python
# ❌ Single-threaded profiler on multithreaded code
def multithreaded_function():
    with concurrent.futures.ThreadPoolExecutor() as executor:
        results = executor.map(expensive_operation, range(100))
    return list(results)

profile = profile_function(multithreaded_function)
# Only measures main thread
```

**Correct:**
```python
# ✅ Thread-aware profiling
profiler = RealTimeProfiler()
profiler.start_profiling()

with concurrent.futures.ThreadPoolExecutor() as executor:
    results = executor.map(wrapped_expensive_operation, range(100))

profile = profiler.stop_profiling()
# Measures all threads
```

### Mistake 4: Over-Profiling

**Wrong:**
```python
# ❌ Profiling every function call
@profile_decorator
def function_a(): pass

@profile_decorator
def function_b(): pass

@profile_decorator
def function_c(): pass

# Overhead dominates, data becomes unusable
```

**Correct:**
```python
# ✅ Selective profiling
@profile_decorator
def critical_path_function(): pass

# Only profile functions known to be problematic
```

### Mistake 5: Not Normalizing Results

**Wrong:**
```python
# ❌ Comparing profiles without normalization
profile_v1 = profile_function(algorithm)
profile_v2 = profile_function(algorithm_v2)

# Different input sizes, different hardware
```

**Correct:**
```python
# ✅ Normalize for fair comparison
profile_v1 = profile_function(algorithm, normalize_to=1000)
profile_v2 = profile_function(algorithm_v2, normalize_to=1000)

# Same input size, normalized results
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Profiling validates inputs before measurement
- [ ] **Parsed State:** Raw measurements parsed into profile structures
- [ ] **Purity:** Profiling functions don't mutate measured code
- [ ] **Fail Loud:** Invalid measurement contexts throw clear errors
- [ ] **Readability:** Profile output reads like performance report

### Testing

- [ ] Unit tests for individual profiling functions
- [ ] Integration tests for profile aggregation
- [ ] Regression detection tests
- [ ] Overhead measurement tests
- [ ] Multi-threading tests

### Security

- [ ] Profiling data sanitized before storage
- [ ] No arbitrary code execution in profiling hooks
- [ ] Input validation for custom metrics
- [ ] Profile data access controlled
- [ ] Memory profiling doesn't leak sensitive data

### Performance

- [ ] Profiling overhead measured and documented
- [ ] Profiling can be disabled with minimal overhead
- [ ] Profile data structures memory-efficient
- [ ] Real-time profiling has minimal latency impact

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `hot-path-detector` | Identify critical execution paths |
| `memory-usage-analyzer` | Track memory allocation patterns |
| `code-philosophy` | Performance-aware design patterns |
| `benchmark-runner` | Automated benchmarking framework |
| `latency-analyzer` | Analyze latency distributions |

### Core Dependencies

- **Profiler:** Measures execution metrics
- **Aggregator:** Combines multiple profiles
- **Analyzer:** Extracts insights from profiles
- **Reporter:** Generates human-readable reports

### External Resources

- [Flame Graphs](https://www.brendangregg.com/flamegraphs.html) - Visual profiling
- [Py-Spy](https://github.com/benfred/py-spy) - Python profiling
- [Go pprof](https://pkg.go.dev/net/http/pprof) - Go profiling

---

## Implementation Tracking

### Agent Performance Profiler - Core Patterns

| Task | Status |
|------|--------|
| Function profiling | ✅ Complete |
| Hierarchical aggregation | ✅ Complete |
| Regression detection | ✅ Complete |
| Optimization suggestions | ✅ Complete |
| Real-time profiling | ✅ Complete |
| Report generation | ✅ Complete |
| Thread-aware profiling | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Basic function profiling
- Hierarchical profile aggregation
- Regression detection
- Optimization suggestions
- Text report generation

### 1.1.0 (Planned)
- Flame graph generation
- Thread-aware profiling
- Memory profiling
- Integration with CI/CD

### 2.0.0 (Future)
- ML-based bottleneck detection
- Cross-version analysis
- Real-time alerting
- Distributed profiling

---

## Implementation Prompt (Execution Layer)

When implementing the Performance Profiler, use this prompt for code generation:

```
Create a Performance Profiler implementation following these requirements:

1. Core Classes:
   - `ProfileResult`: Stores profiling data (time, calls, children)
   - `RealTimeProfiler`: Real-time profiling pipeline
   - `ProfileAggregator`: Aggregates multiple profiles

2. Key Methods:
   - `profile_function(func, *args, **kwargs)`: Profile single function
   - `aggregate_profiles(profiles)`: Aggregate into hierarchical profile
   - `detect_regression(baseline, current, threshold)`: Find regressions
   - `generate_optimization_suggestions(profile)`: Get optimization hints
   - `generate_profiling_report(profile, format)`: Human-readable reports

3. Data Structures:
   - ProfileResult with total_time, self_time, calls, children
   - ProfileState for real-time profiling
   - OptimizationSuggestion for improvement recommendations

4. Profiling Strategies:
   - Sampling: Periodic snapshots
   - Instrumentation: Every function call
   - Resource: Track CPU, memory, I/O

5. Configuration Options:
   - sample_interval: For sampling profiler
   - threshold: For regression detection
   - metrics: Which metrics to track
   - output_format: Text, JSON, Markdown

6. Overhead Management:
   - Profiling can be disabled
   - Minimal overhead when disabled
   - Selective profiling support

7. Output Features:
   - Human-readable text report
   - JSON for programmatic access
   - Flame graph support
   - Comparison reports

8. Thread Handling:
   - Thread-aware profiling
   - Per-thread profiles
   - Aggregated cross-thread view

Follow the 5 Laws of Elegant Defense:
- Guard clauses for input validation
- Parse raw measurements into types
- Pure profiling functions
- Fail fast on invalid state
- Clear names for all components
```
