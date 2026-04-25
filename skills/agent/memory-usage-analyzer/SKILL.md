---
name: usage-analyzer
description: '"Analyzes memory allocation patterns, identifies memory leaks, and provides"
  optimization guidance for memory-efficient code.'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: debugging
  scope: analysis
  output-format: analysis
  triggers: analyzes, leaks, memory, memory usage analyzer, memory-usage-analyzer
  related-skills: add-new-skill, autoscaling-advisor, ci-cd-pipeline-analyzer, confidence-based-selector
---




# Memory Usage Analyzer (Allocation Pattern Analysis)

> **Load this skill** when designing or modifying memory analysis pipelines that track allocation patterns, detect memory leaks, and optimize memory usage.

## TL;DR Checklist

When analyzing memory usage:

- [ ] Track allocation patterns across execution lifecycles
- [ ] Identify memory hot spots and leak candidates
- [ ] Measure peak, average, and growth rates
- [ ] Correlate allocations with code paths
- [ ] Detect memory leaks via growth patterns
- [ ] Suggest optimization strategies
- [ ] Generate memory profiling reports
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Memory Usage Analyzer when:

- Debugging memory leaks and excessive memory usage
- Optimizing memory allocation patterns
- Identifying memory hot spots for targeted optimization
- Analyzing memory growth over time
- Comparing memory usage across versions
- Planning capacity and resource allocation

---

## When NOT to Use

Avoid using this skill for:

- Real-time memory monitoring (use dedicated monitoring)
- Single-allocation analysis (use microbenchmarks)
- Environments where allocation tracking is disabled
- Tasks where memory isn't a concern (constant memory operations)

---

## Core Concepts

### Memory Profile Structure

Memory usage is tracked across time and allocation contexts:

```
Memory Profile
├── Allocation Context A
│   ├── Type: list
│   ├── Count: 10000
│   ├── Total: 8MB
│   ├── Peak: 12MB
│   └── Growth: 2MB/s
├── Allocation Context B
│   ├── Type: dict
│   ├── Count: 5000
│   ├── Total: 4MB
│   ├── Peak: 6MB
│   └── Growth: 1MB/s
└── Total Memory: 14MB
```

### Memory Metrics

#### 1. Allocation Metrics

```
Total Allocated = Sum(all allocations)
Current Usage = Active allocations
Peak Usage = Maximum ever usage
Leak Candidates = Allocations that never freed
```

#### 2. Growth Metrics

```
Linear Growth = Steady allocation rate
Exponential Growth = Unbounded growth
Periodic Spikes = Intermittent allocations
```

#### 3. Type Distribution

```
Object Types: list(40%), dict(30%), str(20%), custom(10%)
Size Distribution: small(60%), medium(30%), large(10%)
```

### Leak Detection Patterns

#### 1. Steady Growth

```
Time 0: 100MB
Time 10: 150MB
Time 20: 200MB
Time 30: 250MB  ← Linear growth indicates leak
```

#### 2. Unbounded Growth

```
Time 0: 100MB
Time 10: 200MB
Time 20: 400MB
Time 30: 800MB  ← Exponential growth indicates bug
```

#### 3. Periodic Spike Without Recovery

```
Time 0: 100MB
Time 10: 200MB (spike)
Time 20: 200MB (no recovery)  ← Leak
```

---

## Implementation Patterns

### Pattern 1: Basic Memory Tracking

Track memory allocations over time:

```python
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from collections import defaultdict
import sys
import gc


@dataclass
class AllocationRecord:
    function: str
    type_name: str
    size: int
    timestamp: float
    stack_trace: List[str]
    freed: bool = False
    freed_timestamp: Optional[float] = None
    
    @property
    def duration(self) -> Optional[float]:
        if not self.freed:
            return None
        return self.freed_timestamp - self.timestamp


@dataclass
class MemorySnapshot:
    timestamp: float
    total_allocated: int
    total_active: int
    peak_usage: int
    allocations: List[AllocationRecord]
    
    @property
    def growth_rate(self) -> float:
        """Calculate growth rate in bytes per second."""
        if len(self.allocations) < 2:
            return 0.0
        return self.total_active / max(self.allocations[-1].timestamp - self.allocations[0].timestamp, 1e-10)


class MemoryTracker:
    """Track memory allocations over time."""
    
    def __init__(self):
        self.snapshots: List[MemorySnapshot] = []
        self.current_allocations: Dict[int, AllocationRecord] = {}
        self.peak_usage = 0
    
    def record_allocation(self, size: int, function: str, type_name: str, stack_trace: List[str]):
        """Record a memory allocation."""
        timestamp = self._get_timestamp()
        record = AllocationRecord(
            function=function,
            type_name=type_name,
            size=size,
            timestamp=timestamp,
            stack_trace=stack_trace,
            freed=False
        )
        
        self.current_allocations[id(record)] = record
        self.peak_usage = max(self.peak_usage, self._total_active())
        
        # Take snapshot
        self.snapshots.append(MemorySnapshot(
            timestamp=timestamp,
            total_allocated=self._total_allocated(),
            total_active=self._total_active(),
            peak_usage=self.peak_usage,
            allocations=list(self.current_allocations.values())
        ))
    
    def record_free(self, record_id: int):
        """Record a memory deallocation."""
        if record_id in self.current_allocations:
            record = self.current_allocations[record_id]
            record.freed = True
            record.freed_timestamp = self._get_timestamp()
            del self.current_allocations[record_id]
    
    def take_snapshot(self) -> MemorySnapshot:
        """Take a memory snapshot."""
        return MemorySnapshot(
            timestamp=self._get_timestamp(),
            total_allocated=self._total_allocated(),
            total_active=self._total_active(),
            peak_usage=self.peak_usage,
            allocations=list(self.current_allocations.values())
        )
    
    def _total_allocated(self) -> int:
        return sum(r.size for r in self.current_allocations.values())
    
    def _total_active(self) -> int:
        return sum(r.size for r in self.current_allocations.values())
    
    def _get_timestamp(self) -> float:
        return sys.time()  # Replace with actual timestamp source


def track_memory(func):
    """Decorator to track memory usage of a function."""
    tracker = MemoryTracker()
    
    def wrapper(*args, **kwargs):
        tracker.record_allocation(0, func.__name__, "start", [])
        result = func(*args, **kwargs)
        tracker.take_snapshot()
        return result
    
    return wrapper, tracker
```

### Pattern 2: Leak Detection

Detect memory leaks using growth pattern analysis:

```python
def detect_memory_leaks(snapshots: List[MemorySnapshot], threshold: float = 1.0) -> List[Dict]:
    """Detect memory leaks from snapshots."""
    leaks = []
    
    if len(snapshots) < 2:
        return leaks
    
    # Analyze growth patterns
    for i in range(1, len(snapshots)):
        prev = snapshots[i - 1]
        curr = snapshots[i]
        
        # Calculate growth
        growth = curr.total_active - prev.total_active
        growth_rate = growth / max(curr.timestamp - prev.timestamp, 1e-10)
        
        if growth > 0 and growth_rate > threshold:
            # Check for leak patterns
            leak_pattern = _analyze_leak_pattern(snapshots[:i + 1])
            
            leaks.append({
                "start_snapshot": i - 1,
                "growth_bytes": growth,
                "growth_rate_bytes_per_s": growth_rate,
                "pattern": leak_pattern,
                "current_usage": curr.total_active,
                "peak_usage": curr.peak_usage,
                "suspicious_types": _analyze_type_growth(snapshots[:i + 1])
            })
    
    return leaks


def _analyze_leak_pattern(snapshots: List[MemorySnapshot]) -> str:
    """Analyze leak growth pattern."""
    if len(snapshots) < 2:
        return "insufficient_data"
    
    # Calculate growth rates
    growth_rates = []
    for i in range(1, len(snapshots)):
        growth = snapshots[i].total_active - snapshots[i - 1].total_active
        time_diff = snapshots[i].timestamp - snapshots[i - 1].timestamp
        if time_diff > 0:
            growth_rates.append(growth / time_diff)
    
    if not growth_rates:
        return "insufficient_data"
    
    # Determine pattern
    avg_growth = sum(growth_rates) / len(growth_rates)
    
    if avg_growth > 0:
        # Check for linear vs exponential
        variance = sum((r - avg_growth) ** 2 for r in growth_rates) / len(growth_rates)
        if variance > avg_growth * 0.5:
            return "exponential"
        else:
            return "linear"
    else:
        return "stable"


def _analyze_type_growth(snapshots: List[MemorySnapshot]) -> Dict[str, float]:
    """Analyze growth by type."""
    type_growth = defaultdict(float)
    
    for i in range(1, len(snapshots)):
        curr_types = _aggregate_by_type(snapshots[i])
        prev_types = _aggregate_by_type(snapshots[i - 1])
        
        for type_name, count in curr_types.items():
            type_growth[type_name] += count - prev_types.get(type_name, 0)
    
    return dict(type_growth)


def _aggregate_by_type(snapshot: MemorySnapshot) -> Dict[str, int]:
    """Aggregate allocations by type."""
    aggregation = defaultdict(int)
    for record in snapshot.allocations:
        if not record.freed:
            aggregation[record.type_name] += record.size
    return aggregation
```

### Pattern 3: Memory Hot Spot Detection

Identify memory hot spots based on allocation patterns:

```python
def detect_memory_hot_spots(
    snapshots: List[MemorySnapshot],
    threshold_percent: float = 10.0
) -> List[Dict]:
    """Detect memory hot spots that contribute most to usage."""
    
    if not snapshots:
        return []
    
    # Aggregate allocations by context
    context_usage = defaultdict(lambda: {"total": 0, "count": 0, "sizes": []})
    
    for snapshot in snapshots:
        for record in snapshot.allocations:
            if not record.freed:
                context_usage[record.function]["total"] += record.size
                context_usage[record.function]["count"] += 1
                context_usage[record.function]["sizes"].append(record.size)
    
    # Calculate total usage
    total_usage = sum(data["total"] for data in context_usage.values())
    
    # Find hot spots
    hot_spots = []
    for context, data in context_usage.items():
        percentage = (data["total"] / total_usage) * 100 if total_usage > 0 else 0
        
        if percentage >= threshold_percent:
            hot_spots.append({
                "context": context,
                "total_bytes": data["total"],
                "percentage": percentage,
                "allocation_count": data["count"],
                "avg_size": data["total"] / max(data["count"], 1),
                "max_size": max(data["sizes"]),
                "min_size": min(data["sizes"]),
                "recommendation": _generate_hot_spot_recommendation(data)
            })
    
    # Sort by usage
    hot_spots.sort(key=lambda x: x["total_bytes"], reverse=True)
    
    return hot_spots


def _generate_hot_spot_recommendation(data: Dict) -> str:
    """Generate optimization recommendation for hot spot."""
    if data["count"] > 10000:
        return "Consider batching operations or using object pooling"
    elif data["total"] > 100_000_000:  # 100MB
        return "Consider streaming or lazy loading"
    elif data["avg_size"] > 1_000_000:  # 1MB avg
        return "Consider chunking large allocations"
    else:
        return "Consider caching or reuse"
```

### Pattern 4: Allocation Timeline Analysis

Analyze allocation patterns over time:

```python
def analyze_allocation_timeline(
    snapshots: List[MemorySnapshot],
    window_size: int = 10
) -> Dict:
    """Analyze allocation patterns over time windows."""
    
    if len(snapshots) < window_size * 2:
        return {"error": "Insufficient snapshots"}
    
    results = {
        "windows": [],
        "trends": {},
        "patterns": []
    }
    
    # Split into windows
    for i in range(0, len(snapshots) - window_size, window_size):
        window = snapshots[i:i + window_size]
        
        window_data = {
            "start_snapshot": i,
            "end_snapshot": i + window_size,
            "start_usage": window[0].total_active,
            "end_usage": window[-1].total_active,
            "peak_usage": max(s.peak_usage for s in window),
            "growth": window[-1].total_active - window[0].total_active,
            "growth_rate": (window[-1].total_active - window[0].total_active) / max(
                window[-1].timestamp - window[0].timestamp, 1e-10
            )
        }
        
        results["windows"].append(window_data)
    
    # Calculate trends
    growth_rates = [w["growth_rate"] for w in results["windows"]]
    results["trends"] = {
        "average_growth_rate": sum(growth_rates) / len(growth_rates) if growth_rates else 0,
        "growth_variance": sum((r - sum(growth_rates)/len(growth_rates))**2 for r in growth_rates) / len(growth_rates) if growth_rates else 0,
        "stable": abs(sum(growth_rates) / len(growth_rates)) < 1_000_000  # < 1MB/s
    }
    
    # Detect patterns
    if results["trends"]["growth_variance"] > 0:
        results["patterns"].append("variable_growth")
    
    if results["trends"]["average_growth_rate"] > 10_000_000:  # > 10MB/s
        results["patterns"].append("high_growth_rate")
    
    return results
```

### Pattern 5: Memory Optimization Suggestions

Generate memory optimization suggestions:

```python
def suggest_memory_optimizations(
    hot_spots: List[Dict],
    leak_candidates: List[Dict],
    type_analysis: Dict
) -> List[Dict]:
    """Generate memory optimization suggestions."""
    
    suggestions = []
    
    # Hot spot suggestions
    for spot in hot_spots:
        if spot["allocation_count"] > 10000:
            suggestions.append({
                "priority": "high",
                "type": "batching",
                "function": spot["context"],
                "description": f"High allocation count: {spot['allocation_count']}",
                "suggestion": "Consider batching operations or using object pooling"
            })
        
        if spot["max_size"] > 10_000_000:  # > 10MB
            suggestions.append({
                "priority": "high",
                "type": "chunking",
                "function": spot["context"],
                "description": f"Large allocations: {spot['max_size'] / 1_000_000:.1f}MB max",
                "suggestion": "Consider chunking or streaming large data"
            })
        
        if spot["avg_size"] > 1_000_000:  # > 1MB avg
            suggestions.append({
                "priority": "medium",
                "type": "reuse",
                "function": spot["context"],
                "description": f"Large average size: {spot['avg_size'] / 1_000_000:.1f}MB",
                "suggestion": "Consider object reuse patterns"
            })
    
    # Leak suggestions
    for leak in leak_candidates:
        if leak["pattern"] == "linear":
            suggestions.append({
                "priority": "critical",
                "type": "leak_fix",
                "growth_rate": f"{leak['growth_rate'] / 1_000_000:.1f}MB/s",
                "description": "Linear memory growth indicates potential leak",
                "suggestion": "Review unbounded data structures and resource cleanup"
            })
    
    # Type-based suggestions
    for type_name, usage in type_analysis.items():
        if type_name in ["list", "dict"] and usage > 50_000_000:  # > 50MB
            suggestions.append({
                "priority": "medium",
                "type": "type_optimization",
                "type": type_name,
                "description": f"High usage: {usage / 1_000_000:.1f}MB",
                "suggestion": "Consider specialized data structures or typed arrays"
            })
    
    # Sort by priority
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    suggestions.sort(key=lambda x: priority_order.get(x["priority"], 4))
    
    return suggestions
```

---

## Common Patterns

### Pattern 1: Memory Profiling Decorator

Decorator for automatic memory tracking:

```python
def memory_profile(func):
    """Decorator to profile memory usage of a function."""
    
    def wrapper(*args, **kwargs):
        tracker = MemoryTracker()
        
        # Pre-execution snapshot
        tracker.take_snapshot()
        
        # Execute function
        result = func(*args, **kwargs)
        
        # Post-execution snapshot
        snapshot = tracker.take_snapshot()
        
        # Generate report
        hot_spots = detect_memory_hot_spots(tracker.snapshots)
        leaks = detect_memory_leaks(tracker.snapshots)
        
        return result, {
            "snapshot": snapshot,
            "hot_spots": hot_spots,
            "leaks": leaks
        }
    
    return wrapper
```

### Pattern 2: Memory Usage Report

Generate comprehensive memory usage reports:

```python
def generate_memory_report(
    snapshots: List[MemorySnapshot],
    hot_spots: List[Dict],
    leaks: List[Dict]
) -> str:
    """Generate human-readable memory report."""
    
    if not snapshots:
        return "No memory data available"
    
    latest = snapshots[-1]
    
    lines = [
        "=== Memory Usage Report ===",
        f"Peak Usage: {latest.peak_usage / 1_000_000:.1f}MB",
        f"Current Usage: {latest.total_active / 1_000_000:.1f}MB",
        f"Total Allocated: {latest.total_allocated / 1_000_000:.1f}MB",
        "",
        "=== Hot Spots ==="
    ]
    
    for spot in hot_spots[:5]:  # Top 5
        lines.append(f"- {spot['context']}: {spot['total_bytes'] / 1_000_000:.1f}MB ({spot['percentage']:.1f}%)")
    
    lines.append("")
    lines.append("=== Leak Candidates ===")
    
    if leaks:
        for leak in leaks:
            lines.append(f"- Growth: {leak['growth_bytes'] / 1_000_000:.1f}MB ({leak['growth_rate'] / 1_000_000:.1f}MB/s)")
            lines.append(f"  Pattern: {leak['pattern']}")
    else:
        lines.append("No memory leaks detected")
    
    lines.append("")
    lines.append("=== Type Distribution ===")
    type_dist = _calculate_type_distribution(snapshots)
    for type_name, usage in type_dist.items():
        lines.append(f"- {type_name}: {usage / 1_000_000:.1f}MB")
    
    return "\n".join(lines)


def _calculate_type_distribution(snapshots: List[MemorySnapshot]) -> Dict[str, int]:
    """Calculate memory usage by type."""
    distribution = defaultdict(int)
    for snapshot in snapshots:
        for record in snapshot.allocations:
            if not record.freed:
                distribution[record.type_name] += record.size
    return dict(distribution)
```

---

## Common Mistakes

### Mistake 1: Not Accounting for GC

**Wrong:**
```python
# ❌ Not accounting for garbage collector
allocation = allocate_large_object()
tracker.record_allocation(sys.getsizeof(allocation))
# GC may collect this later, but tracker thinks it's still allocated
```

**Correct:**
```python
# ✅ Track references, not just allocations
allocation = allocate_large_object()
tracker.record_allocation(sys.getsizeof(allocation))
# Track when object is actually freed or GC collects
weakref.finalize(allocation, lambda: tracker.record_free(id(allocation)))
```

### Mistake 2: Only Tracking Total Memory

**Wrong:**
```python
# ❌ Only tracking total memory
current = sys.memory_usage()
if current > threshold:
    raise MemoryError()
# Doesn't identify which allocations are problematic
```

**Correct:**
```python
# ✅ Track allocation patterns
hot_spots = detect_memory_hot_spots(tracker.snapshots)
leaks = detect_memory_leaks(tracker.snapshots)

if leaks or hot_spots:
    print(f"Memory issues found: {len(leaks)} leaks, {len(hot_spots)} hot spots")
```

### Mistake 3: Ignoring Memory Fragmentation

**Wrong:**
```python
# ❌ Only tracking total allocated memory
total_allocated = sum(record.size for record in records)
# Doesn't account for fragmentation
```

**Correct:**
```python
# ✅ Track fragmentation
def calculate_fragmentation(snapshots: List[MemorySnapshot]) -> float:
    """Calculate memory fragmentation ratio."""
    if not snapshots:
        return 0.0
    
    # Check for non-contiguous allocations
    largest_free = 0
    total_free = 0
    
    for snapshot in snapshots:
        # Analyze free memory patterns
        pass  # Implementation depends on memory allocator
    
    return largest_free / max(total_free, 1e-10)
```

### Mistake 4: Not Normalizing for Workload

**Wrong:**
```python
# ❌ Comparing memory usage across different workloads
baseline = run_workload_a()
current = run_workload_b()
# Different inputs, different memory patterns
```

**Correct:**
```python
# ✅ Normalize for fair comparison
def normalize_for_comparison(memory_profile: Dict, normalize_to: int = 1000) -> Dict:
    """Normalize memory profile to standard workload size."""
    current_size = memory_profile["total_active"]
    
    if current_size == 0:
        return memory_profile
    
    scale = normalize_to / current_size
    
    return {
        "total_active": memory_profile["total_active"] * scale,
        "peak_usage": memory_profile["peak_usage"] * scale,
        "allocations": memory_profile["allocations"] * scale
    }
```

### Mistake 5: Not Tracking Allocation Context

**Wrong:**
```python
# ❌ Not tracking where allocations happen
tracker.record_allocation(size, "unknown", "unknown", [])
# Cannot identify which functions are causing high memory usage
```

**Correct:**
```python
# ✅ Track allocation context
import traceback

def track_allocation_with_context(size: int):
    stack_trace = traceback.format_stack()[:-1]  # Exclude this function
    tracker.record_allocation(
        size,
        function=get_calling_function(),
        type_name=get_type_name(),
        stack_trace=stack_trace
    )
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Memory tracking validates inputs
- [ ] **Parsed State:** Raw memory data parsed into structured records
- [ ] **Purity:** Leak detection functions are stateless
- [ ] **Fail Loud:** Invalid memory data throws clear errors
- [ ] **Readability:** Memory report reads like analysis

### Testing

- [ ] Unit tests for allocation tracking
- [ ] Leak detection tests with known leak patterns
- [ ] Hot spot detection tests
- [ ] Type distribution tests
- [ ] Memory report generation tests

### Security

- [ ] Memory data sanitized before storage
- [ ] No arbitrary code execution in allocation hooks
- [ ] Access control for sensitive memory data
- [ ] Allocation limits enforced
- [ ] Memory profiling overhead controlled

### Performance

- [ ] Tracking overhead measured and documented
- [ ] Overhead minimized for production use
- [ ] Sampling available for high-frequency allocation
- [ ] Memory usage monitored for profiler itself

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `performance-profiler` | CPU and execution profiling |
| `hot-path-detector` | Identify critical execution paths |
| `resource-optimizer` | Optimize resource usage |
| `code-philosophy` | Memory-aware design patterns |
| `latency-analyzer` | Analyze latency patterns |

### Core Dependencies

- **Memory Tracker:** Records allocations
- **Leak Detector:** Identifies memory leaks
- **Hot Spot Analyzer:** Identifies high-usage areas
- **Reporter:** Generates analysis reports

### External Resources

- [Memory Profiling in Python](https://pympler.readthedocs.io) - Python memory tools
- [Valgrind](https://valgrind.org) - Memory analysis
- [Heap Analysis](https://example.com/heap-analysis) - Memory pattern analysis

---

## Implementation Tracking

### Agent Memory Usage Analyzer - Core Patterns

| Task | Status |
|------|--------|
| Allocation tracking | ✅ Complete |
| Leak detection | ✅ Complete |
| Hot spot detection | ✅ Complete |
| Timeline analysis | ✅ Complete |
| Optimization suggestions | ✅ Complete |
| Report generation | ✅ Complete |
| GC-aware tracking | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Basic allocation tracking
- Leak detection algorithms
- Hot spot identification
- Timeline analysis
- Optimization suggestions

### 1.1.0 (Planned)
- GC-aware tracking
- Fragmentation analysis
- Cross-version comparison
- Integration with tracing systems

### 2.0.0 (Future)
- ML-based leak prediction
- Predictive memory optimization
- Distributed memory profiling
- Real-time memory alerts

---

## Implementation Prompt (Execution Layer)

When implementing the Memory Usage Analyzer, use this prompt for code generation:

```
Create a Memory Usage Analyzer implementation following these requirements:

1. Core Classes:
   - `AllocationRecord`: Track individual allocations
   - `MemoryTracker`: Track allocations over time
   - `MemorySnapshot`: Capture memory state at point in time

2. Key Methods:
   - `detect_leaks(snapshots, threshold)`: Find memory leaks
   - `detect_hot_spots(snapshots, threshold_percent)`: Find memory hot spots
   - `suggest_optimizations(hot_spots, leaks)`: Get optimization ideas
   - `analyze_timeline(snapshots, window_size)`: Pattern analysis
   - `generate_report(snapshots, hot_spots, leaks)`: Human-readable report

3. Data Structures:
   - AllocationRecord with size, timestamp, type, stack trace
   - MemorySnapshot with timestamp, usage, allocations
   - LeakReport with growth pattern, rate, suspicious types

4. Leak Detection:
   - Linear growth detection
   - Exponential growth detection
   - Pattern analysis (variable, stable, high growth)
   - Type-specific growth analysis

5. Hot Spot Detection:
   - Allocation count thresholds
   - Size thresholds (small, medium, large)
   - Percentage of total usage
   - Context-based analysis

6. Configuration Options:
   - threshold: Leak detection threshold
   - threshold_percent: Hot spot percentage
   - window_size: Timeline analysis window
   - sampling_rate: For high-frequency tracking

7. Output Features:
   - Human-readable report
   - JSON data for programmatic access
   - Timeline visualization data
   - Optimization suggestions with priority

8. GC Handling:
   - Track reference counting
   - Handle GC collection
   - Weak reference support
   - Finalization callbacks

Follow the 5 Laws of Elegant Defense:
- Guard clauses for memory data validation
- Parse raw memory data into types
- Pure analysis functions
- Fail fast on invalid memory data
- Clear names for all components
```
