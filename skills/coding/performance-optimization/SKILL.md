---
name: performance-optimization
description: Identifies and eliminates performance bottlenecks through systematic
  profiling (cProfile, py-spy, memory_profiler), Big-O complexity analysis, algorithmic
  optimization, and benchmark-driven validation to reduce latency and resource usage.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: performance optimization, code profiling, bottleneck analysis, cProfile,
    py-spy, Big O complexity, memory leak detection, slow code, latency reduction,
    how do i make my code faster, benchmarking, time complexity, p95 latency
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: framework-performance-tuning, performance-testing, systematic-debugging,
    memoization-cache-patterns
------
# Performance Optimization Framework

Identifies and eliminates performance bottlenecks through systematic profiling, Big-O complexity analysis, algorithmic optimization techniques, and benchmark-driven validation. When loaded, this skill makes the model act as a senior performance engineer — measuring before optimizing, isolating hot paths with CPU and memory profilers, analyzing algorithmic complexity, applying targeted optimizations, and proving improvement with controlled benchmarks. This skill applies the 5 Laws of Elegant Defense: validate inputs before processing, make illegal states unrepresentable, fail fast with descriptive errors, return new data structures where applicable, and guide data naturally through optimization pipelines.

## TL;DR Checklist

- [ ] Measure current performance baseline — record p50/p95/p99 latencies, CPU usage, memory footprint before touching any code
- [ ] Profile the actual hot path with cProfile (CPU) and memory_profiler (memory), not guesswork
- [ ] Identify top 1–3 bottlenecks consuming >80% of execution time using profiler output sorted by cumulative time
- [ ] Analyze Big-O complexity per function — identify functions that scale worse than O(n log n) in tight loops
- [ ] Apply the least invasive optimization first (O(n) → O(log n) before rewriting to C extensions)
- [ ] Benchmark the optimized code against the baseline under identical load conditions
- [ ] Verify no regression in correctness — run all existing tests after each optimization

---

## When to Use

Use this skill when:

- A specific function or endpoint consistently exceeds its latency target (e.g., p95 > 200ms)
- Memory usage grows monotonically over time, suggesting a leak or unbounded cache
- Batch processing jobs are taking hours instead of minutes and need algorithmic improvement
- The system is CPU-bound and profiling confirms specific functions consume disproportionate time
- Code review reveals O(n²) or worse algorithms operating on large datasets in inner loops

---

## When NOT to Use

Avoid this skill for:

- **Infrastructure bottlenecks** — if the profiler shows database connections, network I/O, or lock contention as the bottleneck, fix the infrastructure layer first (use `distributed-systems-architecture` for distributed patterns)
- **One-off requests** — optimizing single isolated requests rarely justifies complexity (optimize throughput at scale, not single cases)
- **Before measuring** — never optimize without a baseline measurement; you cannot improve what you cannot measure
- **General code refactoring** — use `monolith-refactoring` or `refactoring-techniques` for structural improvements unrelated to performance

---

## Core Workflow

1. **Establish Performance Baseline** — Measure current performance under realistic load using production-equivalent data. Record p50, p95, and p99 latencies per critical path, total request throughput (req/s), peak memory usage (RSS via `/proc/self/status` or `psutil`), and resource utilization (CPU %). Use appropriate tools: `time` for wall-clock measurements, `cProfile` for CPU hot paths, `tracemalloc` for in-process memory allocation tracking. **Checkpoint:** Every metric must have a numeric value with units and the exact code path being measured. If you cannot measure it, you cannot prove improvement.

2. **Profile to Identify Hot Paths** — Run the profiler against the critical code path. For CPU profiling: `python -m cProfile -s cumulative <script>.py`. For memory profiling: use `memory_profiler` with `@profile` decorators on suspected functions. For sampling-based profiling in production or when cProfile overhead is too high: use `py-spy record -o profile.svg -- python app.py`. Analyze the top 3 functions by cumulative time — these consume ~80% of execution time (Pareto principle). **Checkpoint:** The identified hot path must account for >50% of total execution time. If not, the wrong code path is being profiled or multiple bottlenecks exist across different call paths.

3. **Analyze Algorithmic Complexity** — For each hot function, determine its Big-O time and space complexity by tracing data structures and loop nesting depth. Functions with O(n²) or worse in inner loops are primary candidates for optimization. Identify whether the bottleneck is: CPU-bound (computationally intensive), memory-bound (excessive allocations/GC pressure), I/O-bound (database queries, network calls), or lock contention (thread blocking). **Checkpoint:** Complexity analysis must reference specific operations — e.g., "this function has O(n²) because it performs a nested list comprehension with linear search inside."

4. **Apply Targeted Optimization** — Select the optimization technique matching the bottleneck type:
   - CPU-bound: Replace O(n²) algorithms with O(n log n) or O(n) alternatives; use vectorized operations (NumPy); reduce function call overhead by inlining hot paths
   - Memory-bound: Switch from lists to sets for membership testing (O(1) vs O(n)); use generators instead of materializing large lists; implement LRU caches with `functools.lru_cache` or `cachetools.TTLCache`
   - I/O-bound: Batch database queries using `IN` clauses; implement connection pooling; parallelize independent I/O operations with `asyncio` or `concurrent.futures`
   - Lock contention: Reduce critical section scope; use lock-free data structures (e.g., `queue.Queue`) for producer-consumer patterns
   **Checkpoint:** Each optimization must target the specific bottleneck identified in profiling — never optimize a function that does not appear in the top-3 profiler results.

5. **Validate with Controlled Benchmark** — Re-run the same measurement setup from Step 1 on the optimized code. Compare p50/p95/p99 latencies, peak memory usage, and throughput against the baseline. Use `pytest-benchmark` for unit-level benchmarks or a load testing tool (k6, locust) for system-level validation. The optimization is only successful if: latency decreased by at least 10%, all existing tests pass, and no correctness regressions were introduced. **Checkpoint:** Both baseline and optimized runs must use identical hardware, data sets, warm-up periods, and measurement methodology. Without controlled conditions, perceived improvements may be noise.

6. **Document Optimization Rationale** — Record the before/after metrics, the algorithmic change made, and why it was effective. Add inline comments to optimized code explaining the optimization intent for future maintainers. If the optimization introduces complexity (e.g., trade-off between readability and performance), document this explicitly with a `# NOTE:` comment linking to this benchmark result. **Checkpoint:** Every optimized function must have an inline comment stating what was optimized, why, and the measured improvement. Code without documentation becomes technical debt on the next maintainer.

---

## Implementation Patterns

### Pattern 1: Systematic CPU Profiling with cProfile

Use `cProfile` for accurate (but slower) profiling of Python code. The key is isolating the specific function under test rather than profiling the entire application.

```python
import cProfile
import pstats
import io


def profile_function(
    func,
    *args,
    label: str = "unnamed",
    sort_key: str = "cumulative",
    top_n: int = 20
) -> None:
    """Profile a specific function and print results sorted by cumulative time.

    Args:
        func: The callable to profile.
        *args: Positional arguments passed to the callable.
        label: Human-readable name for this profiling run (used in output).
        sort_key: cProfile sorting criterion — 'cumulative', 'time', or 'calls'.
        top_n: Number of top functions to display in summary.
    """
    profiler = cProfile.Profile()
    profiler.enable()
    result = func(*args)
    profiler.disable()

    # Output results
    stream = io.StringIO()
    stats = pstats.Stats(profiler, stream=stream)
    stats.sort_stats(sort_key)
    stats.print_stats(top_n)

    print(f"\n=== Profiling Results: {label} ===")
    print(stream.getvalue())
    return result


# Usage: isolate and profile only the hot function
if __name__ == "__main__":
    # Simulate a real scenario: process 100k records through aggregation logic
    def process_records(records: list[dict]) -> dict:
        """Process a batch of records — simulating the actual hot path."""
        grouped = {}
        for rec in records:
            key = rec["category"]
            if key not in grouped:
                grouped[key] = {"count": 0, "total_value": 0.0}
            grouped[key]["count"] += 1
            grouped[key]["total_value"] += rec["value"]
        return grouped

    sample_data = [{"category": f"cat_{i % 50}", "value": i * 0.1} for i in range(100_000)]
    profile_function(process_records, sample_data, label="record_aggregation")
```

### Pattern 2: Memory Leak Detection with tracemalloc

Detect and diagnose memory leaks by tracking allocation stacks over time using Python's built-in `tracemalloc` module.

```python
import tracemalloc
import gc


def analyze_memory_growth(
    func,
    *args,
    iterations: int = 100,
    snapshot_interval: int = 10
) -> dict:
    """Track memory allocation across multiple function invocations to detect leaks.

    Args:
        func: Callable that may allocate memory on each invocation.
        *args: Arguments for the callable.
        iterations: Number of times to invoke the function (more = better signal).
        snapshot_interval: Take a memory snapshot every N iterations.

    Returns:
        Dictionary with peak allocations, growth rate, and top allocation sources.
    """
    tracemalloc.start()
    snapshots = []

    for i in range(1, iterations + 1):
        func(*args)

        if i % snapshot_interval == 0 or i == iterations:
            current, peak = tracemalloc.get_traced_memory()
            gc.collect()  # Force garbage collection before snapshot
            snapshots.append({
                "iteration": i,
                "current_bytes": current,
                "peak_bytes": peak,
                "growth_since_last": (current - snapshots[-1]["current_bytes"])
                    if snapshots else 0,
            })

    current_mem, peak_mem = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    # Analyze top allocation sources at peak
    tracemalloc.start()
    func(*args)  # Trigger one more allocation cycle for analysis
    snapshot = tracemalloc.take_snapshot()
    top_stats = snapshot.statistics("lineno")[:10]  # Top 10 allocation sites

    return {
        "peak_memory_bytes": peak_mem,
        "current_memory_bytes": current_mem,
        "growth_per_iteration": (snapshots[-1]["growth_since_last"] / len(snapshots)) if snapshots else 0,
        "has_leak": snapshots and snapshots[-1]["current_bytes"] > snapshots[0]["current_bytes"] * 1.5,
        "top_allocation_sites": [str(stat) for stat in top_stats],
    }


# Usage: detect if a function leaks memory over repeated calls
if __name__ == "__main__":
    def leaking_function(data: list[int]) -> list[int]:
        """A function that accumulates state without cleanup."""
        cache = {}  # Grows unboundedly — potential leak
        result = []
        for val in data:
            key = hash(val) % 10000
            if key not in cache:
                cache[key] = val * 2  # Never evicted
            result.append(cache[key])
        return result

    import random
    test_data = [random.randint(0, 1_000_000) for _ in range(500)]
    results = analyze_memory_growth(leaking_function, test_data, iterations=200, snapshot_interval=20)
    print(f"Has leak: {results['has_leak']}")
    print(f"Top allocation sites:\n" + "\n".join(results["top_allocation_sites"]))
```

### Pattern 3: Algorithmic Optimization — BAD vs. GOOD

Replace inefficient algorithmic patterns with optimized alternatives. The most common optimization opportunity is reducing time complexity in inner loops.

```python
# ❌ BAD: O(n²) nested loop with linear search inside
def find_duplicates_bad(items: list[int]) -> dict[int, int]:
    """Count duplicate items — O(n²) because 'in' check on a list is O(n)."""
    counts: dict[int, int] = {}
    for item in items:
        if item not in counts:  # This creates O(n) lookup per item
            counts[item] = 1
        else:
            counts[item] += 1
    return {k: v for k, v in counts.items() if v > 1}


# ✅ GOOD: O(n) using dict membership testing (hash-based O(1) lookups)
def find_duplicates_good(items: list[int]) -> dict[int, int]:
    """Count duplicate items — O(n) using hash-based dictionary lookups."""
    counts: dict[int, int] = {}
    for item in items:
        counts[item] = counts.get(item, 0) + 1  # Dict 'in' check is O(1) amortized
    return {k: v for k, v in counts.items() if v > 1}


# ❌ BAD: O(n * m) nested search for cross-referencing two lists
def find_matching_orders_bad(order_ids: list[str], customer_names: list[str]) -> dict[str, str]:
    """Find customers by order ID — O(n*m) linear scan per lookup."""
    result = {}
    for order_id in order_ids:
        for i, name in enumerate(customer_names):  # Linear scan each time
            if name.startswith(order_id[:4]):
                result[order_id] = name
                break
    return result


# ✅ GOOD: O(n + m) — build a reverse lookup index once, then do O(1) lookups
def find_matching_orders_good(order_ids: list[str], customer_names: list[str]) -> dict[str, str]:
    """Find customers by order ID — O(n+m) with pre-built prefix index."""
    # Build index: first 4 chars of name -> full name (amortized O(m))
    name_prefix_index: dict[str, str] = {}
    for name in customer_names:
        prefix = name[:4].lower()
        if prefix not in name_prefix_index:
            name_prefix_index[prefix] = name

    result = {}
    for order_id in order_ids:  # O(1) per lookup (amortized)
        prefix = order_id[:4].lower()
        if prefix in name_prefix_index:
            result[order_id] = name_prefix_index[prefix]
    return result
```

### Pattern 4: Memory-Efficient Generators for Large Data Processing

Replace list materialization with generators when processing large datasets sequentially. This reduces peak memory from O(n) to O(1).

```python
import csv


def process_large_csv_bad(filepath: str) -> list[dict]:
    """Read and process a CSV — materializes entire file into memory (O(n) space)."""
    rows = []  # Entire file in memory at once
    with open(filepath, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            filtered_value = float(row["amount"]) if float(row["amount"]) > 100 else 0.0
            rows.append({
                "date": row["date"],
                "category": row["category"],
                "value": filtered_value,
            })
    return [r for r in rows if r["value"] > 0]


def process_large_csv_generator(filepath: str):
    """Read and yield processed CSV rows one at a time (O(1) space)."""
    with open(filepath, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            amount = float(row["amount"])
            if amount > 100:
                yield {
                    "date": row["date"],
                    "category": row["category"],
                    "value": round(amount, 2),
                }


# Usage: streaming aggregation without materializing the full result set
def compute_category_totals_generator(filepath: str) -> dict[str, float]:
    """Compute per-category totals using a generator — O(1) peak memory."""
    totals: dict[str, float] = {}
    for row in process_large_csv_generator(filepath):
        category = row["category"]
        totals[category] = totals.get(category, 0.0) + row["value"]
    return {k: round(v, 2) for k, v in sorted(totals.items(), key=lambda x: -x[1])}
```

---

## Constraints

### MUST DO
- Always establish a measurable baseline before making any code changes — record specific numbers (latency in ms, memory in MB, throughput in req/s) with the exact measurement method
- Profile the actual production or realistic load path, not a toy example — use data volumes and patterns matching real usage
- Use `cProfile` for CPU profiling when accuracy matters; use `py-spy` for sampling-based profiling when overhead must be minimal (<5% vs cProfile's ~10x slowdown)
- Analyze Big-O complexity per hot function before optimizing — know whether the bottleneck is O(n), O(n log n), O(n²), or worse
- Apply the least invasive optimization first: algorithmic improvements (O(n²) → O(n)) before caching, before parallelization, before language changes
- Validate every optimization with controlled benchmark against the baseline under identical conditions
- Track memory growth with `tracemalloc` when diagnosing leaks; capture allocation snapshots at intervals to identify growing patterns
- Use generators for sequential processing of large datasets instead of materializing entire collections in memory

### MUST NOT DO
- Never optimize code without first profiling it — guessing which function is slow produces no improvement or makes things worse
- Optimize inner loops before outer loops — profile the entire call tree and target functions consuming cumulative time, not just functions with high per-call time but low invocation frequency
- Replace well-understood O(n²) algorithms with complex O(n log n) alternatives without verifying the input size justifies it — for small datasets (n < 100), the constant factors of complex structures often make them slower
- Use `lru_cache` or memoization on functions called once per request — this wastes memory storing results that will never be reused; cache only when the same arguments repeat within the cache TTL window
- Profile with `cProfile` in production or high-throughput scenarios — its ~10x overhead skews results; use `py-spy` (sampling-based, <5% overhead) instead
- Optimize database queries by adding application-level caching without first confirming the query is actually slow — profile the database layer directly with EXPLAIN ANALYZE before applying app-side fixes
- Let memory optimization introduce correctness bugs — replacing lists with generators means you cannot re-iterate; ensure downstream consumers don't need random access

---

## Output Template

When analyzing or optimizing code, produce:

1. **Baseline Metrics** — Before-optimization measurements: p50/p95/p99 latency, peak memory (MB), throughput (req/s), CPU % with exact measurement methodology
2. **Profiler Output Analysis** — Top 3 functions by cumulative time with their percentage of total execution time, including the cProfile/py-spy output summary
3. **Complexity Assessment** — Big-O analysis for each hot function with reasoning (loop nesting depth, data structure operations per iteration)
4. **Optimization Plan** — Specific technique per bottleneck: algorithmic replacement, caching strategy, generator adoption, or parallelization — with estimated complexity improvement and implementation risk
5. **Benchmark Results** — After-optimization measurements compared to baseline with delta percentages for each metric; include pass/fail status against the 10% minimum improvement threshold
6. **Correctness Verification** — Confirmation that all existing tests pass and no regression in behavior was introduced

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-performance-tuning` | Framework-specific optimization (Django, FastAPI, Flask) — this skill handles general-purpose algorithmic profiling that applies regardless of framework |
| `performance-testing` | Load and stress testing at the system level; this skill drills into individual function-level CPU/memory bottlenecks |
| `memoization-cache-patterns` | Advanced caching strategies (LRU, TTL, write-through); this skill covers when to apply caching vs. algorithmic fixes |
| `systematic-debugging` | General debugging methodology; use this first for correctness issues, then this skill when the bug is purely performance-related |
