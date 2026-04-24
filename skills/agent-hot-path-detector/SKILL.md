---
name: agent-hot-path-detector
description: Identifies critical execution paths (hot paths) in code that impact most
  performance, reliability, and resource usage.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: debugging
  scope: analysis
  output-format: analysis
  triggers: critical, execution, hot path detector, hot-path-detector, identifies
  related-skills: agent-code-correctness-verifier, agent-error-trace-explainer, agent-goal-to-milestones, agent-infra-drift-detector, agent-multi-skill-executor
---


# Hot Path Detector (Execution Criticality Analysis)

> **Load this skill** when designing or modifying hot path detection pipelines that identify the most critical execution paths affecting system performance, reliability, and resource consumption.

## TL;DR Checklist

When detecting hot paths in code:

- [ ] Analyze execution traces for frequency and duration
- [ ] Calculate path impact based on time, resources, and failure risk
- [ ] Identify bottleneck paths that affect throughput
- [ ] Map hot paths to business-critical operations
- [ ] Track hot path changes across versions
- [ ] Suggest optimization targets for identified paths
- [ ] Generate visual representations (flame graphs)
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Hot Path Detector when:

- Optimizing system performance by focusing on critical paths
- Identifying which code paths affect most user experience
- Analyzing resource usage patterns for capacity planning
- Prioritizing optimization efforts based on impact
- Detecting unexpected hot paths in production
- Mapping execution flow for debugging complex issues

---

## When NOT to Use

Avoid using this skill for:

- Single-function hot path analysis (use performance-profiler)
- Real-time hot path monitoring (use monitoring systems)
- Analyzing code without execution traces
- Systems where all paths are equally critical

---

## Core Concepts

### Hot Path Identification

Hot paths are identified using execution frequency and duration:

```
Execution Trace
├── Path A: freq=1000/s, duration=10ms, impact=0.5
├── Path B: freq=500/s, duration=100ms, impact=0.3
└── Path C: freq=100/s, duration=500ms, impact=0.2
```

### Impact Calculation

```python
impact = (frequency * duration * weight) / total_throughput

weights = {
    "time": 0.5,
    "resources": 0.3,
    "failure_risk": 0.2
}
```

### Path Classification

#### 1. Critical Path

High frequency, high duration, high impact:

```
┌─────────────────────────────────┐
│  User Request                    │
├─────────────────────────────────┤
│  ├── Authentication (10ms)       │
│  ├── Authorization (5ms)         │
│  ├── Database Query (100ms)      │ ← HOT PATH
│  └── Response Serialization (5ms)│
└─────────────────────────────────┘
```

#### 2. Support Path

Normal frequency and duration:

```
┌─────────────────────────────────┐
│  Background Job                  │
├─────────────────────────────────┤
│  ├── Setup (5ms)                 │
│  ├── Processing (50ms)           │ ← SUPPORT PATH
│  └── Cleanup (5ms)               │
└─────────────────────────────────┘
```

#### 3. Cold Path

Low frequency, high duration:

```
┌─────────────────────────────────┐
│  Admin Operation                 │
├─────────────────────────────────┤
│  ├── Validation (10ms)           │
│  ├── Data Migration (10s)        │ ← COLD PATH
│  └── Notification (5ms)          │
└─────────────────────────────────┘
```

---

## Implementation Patterns

### Pattern 1: Basic Hot Path Detection

Detect hot paths from execution traces:

```python
from dataclasses import dataclass
from typing import List, Dict, Optional
from collections import defaultdict


@dataclass
class PathNode:
    function: str
    frequency: int
    total_duration: float
    max_duration: float
    min_duration: float
    children: List["PathNode"]
    
    def avg_duration(self) -> float:
        return self.total_duration / max(self.frequency, 1)
    
    def impact_score(self, weights: Dict[str, float] = None) -> float:
        """Calculate hot path impact score."""
        if weights is None:
            weights = {"time": 0.5, "resources": 0.3, "failure_risk": 0.2}
        
        # Base impact from frequency and duration
        base_impact = self.frequency * self.avg_duration()
        
        # Failure risk factor (simulated)
        failure_risk = 0.1  # Would be calculated from error rates
        resource_cost = 0.1  # Would be calculated from resource usage
        
        return (
            weights["time"] * base_impact +
            weights["resources"] * resource_cost +
            weights["failure_risk"] * failure_risk
        )


def detect_hot_paths(traces: List[Dict], threshold: float = 0.8) -> List[PathNode]:
    """Detect hot paths from execution traces."""
    
    # Build call frequency map
    call_counts = defaultdict(int)
    call_durations = defaultdict(list)
    
    for trace in traces:
        for call in trace["calls"]:
            call_counts[call["function"]] += 1
            call_durations[call["function"]].append(call["duration"])
    
    # Calculate impact scores
    path_scores = []
    for func, count in call_counts.items():
        durations = call_durations[func]
        path_scores.append(PathNode(
            function=func,
            frequency=count,
            total_duration=sum(durations),
            max_duration=max(durations),
            min_duration=min(durations),
            children=[]
        ))
    
    # Filter by impact threshold
    total_impact = sum(p.impact_score() for p in path_scores)
    hot_paths = [
        p for p in path_scores
        if p.impact_score() / max(total_impact, 1e-10) > threshold
    ]
    
    return sorted(hot_paths, key=lambda p: p.impact_score(), reverse=True)
```

### Pattern 2: Recursive Path Analysis

Analyze paths recursively to identify nested hot paths:

```python
def analyze_path_recursively(
    trace: Dict,
    path: List[str] = None,
    depth: int = 0
) -> List[Dict]:
    """Analyze execution paths recursively."""
    
    if path is None:
        path = []
    
    results = []
    
    for call in trace.get("calls", []):
        current_path = path + [call["function"]]
        
        results.append({
            "path": current_path.copy(),
            "frequency": call.get("frequency", 1),
            "total_duration": call.get("total_duration", 0),
            "depth": depth,
            "impact": call.get("duration", 0) * call.get("frequency", 1)
        })
        
        # Recurse into children
        if "children" in call:
            for child in call["children"]:
                child_trace = {
                    "calls": [child],
                    "duration": child.get("duration", 0)
                }
                results.extend(analyze_path_recursively(child_trace, current_path, depth + 1))
    
    return results


def identify_hot_sub_paths(traces: List[Dict], threshold: float = 0.9) -> List[Dict]:
    """Identify hot sub-paths within execution traces."""
    
    all_paths = []
    for trace in traces:
        paths = analyze_path_recursively(trace)
        all_paths.extend(paths)
    
    # Aggregate by path
    path_aggregates = defaultdict(lambda: {"count": 0, "total_duration": 0})
    for path_data in all_paths:
        path_key = tuple(path_data["path"])
        path_aggregates[path_key]["count"] += path_data["frequency"]
        path_aggregates[path_key]["total_duration"] += path_data["total_duration"]
    
    # Calculate total impact
    total_impact = sum(
        data["count"] * (data["total_duration"] / max(data["count"], 1))
        for data in path_aggregates.values()
    )
    
    # Filter hot paths
    hot_paths = [
        {
            **data,
            "path": list(path_key),
            "avg_duration": data["total_duration"] / max(data["count"], 1),
            "impact": data["count"] * (data["total_duration"] / max(data["count"], 1)),
            "impact_ratio": (data["count"] * (data["total_duration"] / max(data["count"], 1))) / max(total_impact, 1e-10)
        }
        for path_key, data in path_aggregates.items()
        if (data["count"] * (data["total_duration"] / max(data["count"], 1))) / max(total_impact, 1e-10) > threshold
    ]
    
    return sorted(hot_paths, key=lambda x: x["impact_ratio"], reverse=True)
```

### Pattern 3: Path Visualization Generation

Generate visualization data for hot paths:

```python
def generate_flamegraph_data(paths: List[PathNode]) -> Dict:
    """Generate flamegraph-compatible data."""
    
    def node_to_flame(node: PathNode, parent_time: float = 0) -> Dict:
        avg_duration = node.avg_duration()
        
        return {
            "name": node.function,
            "value": node.frequency,  # Frequency represents stack depth
            "time": avg_duration * node.frequency,
            "self": avg_duration * node.frequency,  # Will be adjusted
            "children": [
                node_to_flame(child, avg_duration)
                for child in node.children
            ]
        }
    
    # Calculate self time (total - children)
    def adjust_self_times(node: Dict, parent_time: float = 0) -> Dict:
        children_time = sum(child["time"] for child in node.get("children", []))
        node["self"] = max(parent_time - children_time, 0)
        
        for child in node.get("children", []):
            adjust_self_times(child, node["time"])
        
        return node
    
    # Build flamegraph
    root = {
        "name": "root",
        "value": 1,
        "time": sum(p.impact_score() for p in paths),
        "self": 0,
        "children": [node_to_flame(p) for p in paths]
    }
    
    return adjust_self_times(root)


def generate_timeline_data(traces: List[Dict]) -> List[Dict]:
    """Generate timeline visualization data."""
    
    timeline = []
    
    for trace in traces:
        current_time = 0
        for call in trace.get("calls", []):
            timeline.append({
                "name": call["function"],
                "start": current_time,
                "duration": call.get("duration", 0),
                "depth": call.get("depth", 0)
            })
            current_time += call.get("duration", 0)
    
    return timeline
```

### Pattern 4: Hot Path Comparison

Compare hot paths across different versions:

```python
def compare_hot_paths(
    baseline_paths: List[PathNode],
    current_paths: List[PathNode]
) -> List[Dict]:
    """Compare hot paths between versions."""
    
    baseline_map = {p.function: p for p in baseline_paths}
    current_map = {p.function: p for p in current_paths}
    
    comparisons = []
    
    # Check current hot paths
    for func, current in current_map.items():
        if func in baseline_map:
            baseline = baseline_map[func]
            
            # Calculate changes
            duration_change = (current.avg_duration() - baseline.avg_duration()) / max(baseline.avg_duration(), 1e-10)
            frequency_change = (current.frequency - baseline.frequency) / max(baseline.frequency, 1e-10)
            
            comparisons.append({
                "function": func,
                "baseline_impact": baseline.impact_score(),
                "current_impact": current.impact_score(),
                "impact_change": current.impact_score() - baseline.impact_score(),
                "duration_change_pct": duration_change * 100,
                "frequency_change_pct": frequency_change * 100,
                "regression": duration_change > 0.1  # 10% increase is regression
            })
        else:
            comparisons.append({
                "function": func,
                "baseline_impact": 0,
                "current_impact": current.impact_score(),
                "impact_change": current.impact_score(),
                "duration_change_pct": 0,
                "frequency_change_pct": 0,
                "regression": False,
                "new": True
            })
    
    # Check for removed paths
    for func, baseline in baseline_map.items():
        if func not in current_map:
            comparisons.append({
                "function": func,
                "baseline_impact": baseline.impact_score(),
                "current_impact": 0,
                "impact_change": -baseline.impact_score(),
                "duration_change_pct": 0,
                "frequency_change_pct": 0,
                "removed": True
            })
    
    # Sort by impact change
    comparisons.sort(key=lambda x: abs(x["impact_change"]), reverse=True)
    
    return comparisons
```

### Pattern 5: Hot Path Optimization Suggestions

Generate optimization suggestions for hot paths:

```python
def suggest_hot_path_optimizations(paths: List[PathNode]) -> List[Dict]:
    """Generate optimization suggestions for hot paths."""
    
    suggestions = []
    
    for path in paths:
        # High duration
        if path.avg_duration() > 100:  # 100ms threshold
            suggestions.append({
                "type": "duration_reduction",
                "function": path.function,
                "current_avg": path.avg_duration(),
                "suggestions": [
                    "Consider caching for repeated computations",
                    "Evaluate algorithmic complexity improvements",
                    "Look for I/O optimization opportunities",
                    "Consider parallelization for independent operations"
                ]
            })
        
        # High frequency
        if path.frequency > 10000:  # 10k calls threshold
            suggestions.append({
                "type": "call_reduction",
                "function": path.function,
                "call_count": path.frequency,
                "suggestions": [
                    "Consider batching operations",
                    "Cache results for identical inputs",
                    "Eliminate redundant calls",
                    "Move calculation to event-driven model"
                ]
            })
        
        # High variance
        if path.max_duration > 10 * path.min_duration:  # 10x variance
            suggestions.append({
                "type": "variability_reduction",
                "function": path.function,
                "max_duration": path.max_duration,
                "min_duration": path.min_duration,
                "suggestions": [
                    "Investigate inconsistent execution paths",
                    "Check for external dependencies causing variance",
                    "Add retry logic with exponential backoff",
                    "Consider timeout and circuit breaker patterns"
                ]
            })
    
    # Prioritize by impact
    suggestions.sort(
        key=lambda x: -len(x["suggestions"])  # Simple priority
    )
    
    return suggestions
```

---

## Common Patterns

### Pattern 1: Hot Path Threshold Tuning

Automatically tune hot path detection thresholds:

```python
def tune_hot_path_threshold(traces: List[Dict], target_coverage: float = 0.8) -> float:
    """Automatically tune hot path threshold."""
    
    all_paths = detect_hot_paths(traces, threshold=0.0)
    
    # Binary search for threshold
    low, high = 0.0, 1.0
    best_threshold = 0.5
    
    for _ in range(20):  # Binary search iterations
        threshold = (low + high) / 2
        hot_paths = [p for p in all_paths if p.impact_score() > threshold]
        
        total_impact = sum(p.impact_score() for p in all_paths)
        hot_impact = sum(p.impact_score() for p in hot_paths)
        
        coverage = hot_impact / max(total_impact, 1e-10)
        
        if coverage >= target_coverage:
            best_threshold = threshold
            low = threshold
        else:
            high = threshold
    
    return best_threshold
```

### Pattern 2: Dynamic Hot Path Tracking

Track hot path changes over time:

```python
class HotPathTracker:
    """Track hot path changes across versions."""
    
    def __init__(self):
        self.history: List[Dict] = []
    
    def add_snapshot(self, version: str, paths: List[PathNode]):
        """Add a version snapshot."""
        self.history.append({
            "version": version,
            "paths": paths,
            "timestamp": datetime.now()
        })
    
    def get_hot_path_evolution(self, function: str) -> List[Dict]:
        """Get evolution of a specific path."""
        
        evolution = []
        for snapshot in self.history:
            path = next((p for p in snapshot["paths"] if p.function == function), None)
            if path:
                evolution.append({
                    "version": snapshot["version"],
                    "impact": path.impact_score(),
                    "avg_duration": path.avg_duration(),
                    "frequency": path.frequency
                })
        
        return evolution
    
    def detect_hot_path_regression(self, current_paths: List[PathNode]) -> List[Dict]:
        """Detect hot path regressions vs baseline."""
        
        if len(self.history) < 2:
            return []
        
        baseline = self.history[0]["paths"]
        return compare_hot_paths(baseline, current_paths)
```

---

## Common Mistakes

### Mistake 1: Only Looking at Duration

**Wrong:**
```python
# ❌ Only considering duration, not frequency
hot_paths = sorted(paths, key=lambda p: p.max_duration, reverse=True)
# Misses high-frequency, low-duration paths
```

**Correct:**
```python
# ✅ Consider both frequency and duration
hot_paths = sorted(paths, key=lambda p: p.frequency * p.avg_duration(), reverse=True)
```

### Mistake 2: Ignoring Call Context

**Wrong:**
```python
# ❌ Treating all calls equally
path_impact = path.frequency * path.avg_duration()
# Doesn't account for path depth or nested impact
```

**Correct:**
```python
# ✅ Consider call context
def calculate_contextual_impact(path: PathNode, depth: int = 0) -> float:
    base_impact = path.frequency * path.avg_duration()
    # Deeper paths have higher impact
    return base_impact * (1 + depth * 0.1)
```

### Mistake 3: Not Handling Multithreading

**Wrong:**
```python
# ❌ Single-threaded analysis on multithreaded code
hot_paths = detect_hot_paths(single_trace)
# Misses concurrent paths
```

**Correct:**
```python
# ✅ Thread-aware analysis
def detect_hot_paths_threaded(traces: List[Dict]) -> List[PathNode]:
    all_paths = []
    for trace in traces:
        all_paths.extend(detect_hot_paths([trace]))
    
    # Aggregate across threads
    return aggregate_paths(all_paths)
```

### Mistake 4: Static Thresholds

**Wrong:**
```python
# ❌ Fixed threshold for all systems
HOT_PATH_THRESHOLD = 0.8
hot_paths = [p for p in paths if p.impact_ratio > HOT_PATH_THRESHOLD]
# Doesn't adapt to different system characteristics
```

**Correct:**
```python
# ✅ Adaptive threshold
def adaptive_threshold(paths: List[PathNode]) -> float:
    if not paths:
        return 0.0
    
    impacts = [p.impact_score() for p in paths]
    mean = statistics.mean(impacts)
    std = statistics.stdev(impacts) if len(impacts) > 1 else 0
    
    return mean - std  # Include paths within 1 std of mean
```

### Mistake 5: Not Normalizing Across Runs

**Wrong:**
```python
# ❌ Comparing profiles from different run conditions
baseline = load_profile("production_run_1")
current = load_profile("production_run_2")
# Different traffic patterns, data sizes
```

**Correct:**
```python
# ✅ Normalize for fair comparison
def normalize_for_comparison(profile: PathNode, normalize_to: int = 1000) -> PathNode:
    """Normalize profile to standard throughput."""
    current_frequency = profile.frequency
    
    if current_frequency == 0:
        return profile
    
    scale = normalize_to / current_frequency
    
    return PathNode(
        function=profile.function,
        frequency=normalize_to,
        total_duration=profile.total_duration * scale,
        max_duration=profile.max_duration,
        min_duration=profile.min_duration,
        children=[
            normalize_for_comparison(child, normalize_to)
            for child in profile.children
        ]
    )
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Threshold validation before path analysis
- [ ] **Parsed State:** Raw traces parsed into path structures
- [ ] **Purity:** Impact calculations are deterministic
- [ ] **Fail Loud:** Invalid trace formats throw clear errors
- [ ] **Readability:** Analysis results read like performance report

### Testing

- [ ] Unit tests for hot path detection
- [ ] Integration tests for trace parsing
- [ ] Comparison tests for version changes
- [ ] Edge case tests (empty traces, single calls)
- [ ] Visualization generation tests

### Security

- [ ] Trace data sanitized before processing
- [ ] No arbitrary code execution in trace parsing
- [ ] Access control for sensitive paths
- [ ] Profile data encrypted at rest
- [ ] Audit logging for path analysis

### Performance

- [ ] Profiling overhead measured
- [ ] Hot path analysis optimized for large traces
- [ ] Memory usage monitored for trace accumulation
- [ ] Real-time detection latency acceptable

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `performance-profiler` | Detailed performance measurement |
| `memory-usage-analyzer` | Track memory allocation patterns |
| `latency-analyzer` | Analyze latency distributions |
| `code-philosophy` | Performance-aware design patterns |
| `resource-optimizer` | Optimize resource usage |

### Core Dependencies

- **Trace Parser:** Parses execution traces
- **Path Analyzer:** Identifies hot paths
- **Impact Calculator:** Calculates path impact scores
- **Comparator:** Compares paths across versions

### External Resources

- [Flame Graphs](https://www.brendangregg.com/flamegraphs.html) - Visual profiling
- [Bottleneck Detection](https://example.com/bottleneck) - Performance analysis
- [Path Analysis](https://example.com/path-analysis) - Execution tracing

---

## Implementation Tracking

### Agent Hot Path Detector - Core Patterns

| Task | Status |
|------|--------|
| Basic path detection | ✅ Complete |
| Recursive analysis | ✅ Complete |
| Visualization generation | ✅ Complete |
| Path comparison | ✅ Complete |
| Optimization suggestions | ✅ Complete |
| Threshold tuning | ✅ Complete |
| Multi-threading support | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Basic hot path detection
- Recursive path analysis
- Flame graph generation
- Path comparison across versions
- Optimization suggestions

### 1.1.0 (Planned)
- Dynamic threshold tuning
- Multi-threading support
- Integration with tracing systems
- Real-time hot path monitoring

### 2.0.0 (Future)
- ML-based path prediction
- Predictive hotspot detection
- Cross-service path analysis
- Automated path optimization

---

## Implementation Prompt (Execution Layer)

When implementing the Hot Path Detector, use this prompt for code generation:

```
Create a Hot Path Detector implementation following these requirements:

1. Core Classes:
   - `PathNode`: Stores path data (function, frequency, duration)
   - `HotPathAnalyzer`: Main analysis engine
   - `HotPathTracker`: Track changes across versions

2. Key Methods:
   - `detect_hot_paths(traces, threshold)`: Find hot paths
   - `analyze_path_recursively(trace, path, depth)`: Recursive analysis
   - `generate_flamegraph_data(paths)`: Visualization data
   - `compare_hot_paths(baseline, current)`: Version comparison
   - `suggest_hot_path_optimizations(paths)`: Optimization hints

3. Impact Calculation:
   - Frequency-based scoring
   - Duration weighting
   - Resource cost factors
   - Failure risk factors

4. Path Classification:
   - Critical path (high frequency + high duration)
   - Support path (normal metrics)
   - Cold path (low frequency, high duration)

5. Data Structures:
   - PathNode with impact_score() method
   - Flamegraph data format
   - Timeline visualization data

6. Configuration Options:
   - threshold: Impact threshold for hot paths
   - weights: Relative importance of factors
   - depth_limit: Maximum recursion depth
   - normalization: Target throughput for comparison

7. Output Features:
   - Human-readable hot path report
   - Flame graph data generation
   - Comparison reports across versions
   - Optimization suggestions

8. Thread Handling:
   - Multi-threading support
   - Per-thread path tracking
   - Cross-thread aggregation

Follow the 5 Laws of Elegant Defense:
- Guard clauses for trace validation
- Parse traces into typed structures
- Pure calculation functions
- Fail fast on invalid traces
- Clear names for all components
```
