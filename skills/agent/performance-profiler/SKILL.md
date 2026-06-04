---
name: performance-profiler
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent performance profiler with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: performance-profiler, performance profiler, how do i performance-profiler,
    orchestrate performance-profiler, automate performance-profiler, agent performance-profiler,
    optimization, performance
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
# Performance Profiler

Orchestrates intelligent skill selection and execution for performance profiler workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def analyze_performance_metrics(
    raw_metrics: List[Dict],
    baseline_thresholds: Dict[str, float],
    target_function: str = None
) -> Dict:
    """Analyze raw profiling data to identify performance bottlenecks.
    
    Implements Law 1 (Early Exit) by validating metric structure immediately.
    Implements Law 3 (Atomic Predictability) by returning a new analysis dict.
    
    Args:
        raw_metrics: List of profiling samples (timestamp, function, duration, cpu_percent)
        baseline_thresholds: Dict of acceptable limits per metric type
        target_function: Optional filter to focus on a specific code path
        
    Returns:
        Structured analysis with bottleneck rankings, severity scores, and recommendations
    """
    if not raw_metrics:
        raise ValueError("Profiling data cannot be empty")
        
    # Law 2: Parse & validate at boundary
    validated_samples = []
    for sample in raw_metrics:
        if not all(k in sample for k in ("timestamp", "function", "duration_ms")):
            continue # Skip malformed samples gracefully
        validated_samples.append(sample)
        
    if not validated_samples:
        return {"status": "no_data", "bottlenecks": [], "recommendations": []}
        
    # Law 4: Fail fast on invalid thresholds
    for metric, limit in baseline_thresholds.items():
        if limit <= 0:
            raise ValueError(f"Invalid threshold for {metric}: must be positive")
            
    # Domain logic: Calculate impact scores and rank bottlenecks
    function_stats = {}
    for sample in validated_samples:
        func = sample["function"]
        if target_function and func != target_function:
            continue
        if func not in function_stats:
            function_stats[func] = {"total_duration": 0, "call_count": 0, "max_duration": 0}
        stats = function_stats[func]
        stats["total_duration"] += sample["duration_ms"]
        stats["call_count"] += 1
        stats["max_duration"] = max(stats["max_duration"], sample["duration_ms"])
        
    bottlenecks = []
    for func, stats in function_stats.items():
        avg_duration = stats["total_duration"] / stats["call_count"]
        impact_score = (avg_duration * stats["call_count"]) / 1000.0
        severity = "critical" if impact_score > baseline_thresholds.get("max_impact", 100) else "warning"
        bottlenecks.append({
            "function": func,
            "avg_duration_ms": round(avg_duration, 2),
            "impact_score": round(impact_score, 2),
            "severity": severity,
            "recommendation": f"Optimize {func} or reduce call frequency"
        })
        
    bottlenecks.sort(key=lambda x: x["impact_score"], reverse=True)
    
    return {
        "status": "analyzed",
        "total_samples": len(validated_samples),
        "bottlenecks": bottlenecks,
        "recommendations": [b["recommendation"] for b in bottlenecks[:3]]
    }
```


### Pattern 2: Execution with Fallback

```python
def run_profiling_cycle(
    target_process: str,
    profiler_config: Dict,
    fallback_strategy: str = "static_analysis"
) -> Dict:
    """Execute a performance profiling cycle with resilience patterns.
    
    Implements Law 4 (Fail Fast) by validating process state before profiling.
    Implements fallback chain for transient profiling failures.
    
    Args:
        target_process: Name or PID of the process to profile
        profiler_config: Dict containing duration, sampling_rate, and output_format
        fallback_strategy: Method to use if live profiling fails (e.g., static_analysis, cache)
        
    Returns:
        Profiling results with metadata, timing, and fallback status
    """
    # Law 1: Early exit on invalid config
    if not target_process or not profiler_config.get("duration"):
        raise ValueError("Target process and duration are required for profiling")
        
    # Law 2: Parse & validate profiler state
    if profiler_config["sampling_rate"] <= 0:
        raise ValueError("Sampling rate must be positive")
        
    attempts = 0
    max_attempts = profiler_config.get("max_attempts", 2)
    
    while attempts < max_attempts:
        try:
            # Domain logic: Initiate live profiling session
            profiler_session = _init_profiler(target_process, profiler_config)
            profiler_session.start()
            time.sleep(profiler_config["duration"])
            raw_data = profiler_session.stop()
            
            # Law 3: Return new data structure, never mutate session
            return {
                "status": "success",
                "profiler": target_process,
                "data": raw_data,
                "attempts": attempts + 1,
                "fallback_used": False,
                "timestamp": time.time()
            }
            
        except ProcessUnresponsiveError as e:
            # Law 4: Fail fast on invalid process state
            raise ProfilingError(f"Target process {target_process} is unresponsive: {e}") from e
            
        except TransientProfilerError as e:
            attempts += 1
            if attempts >= max_attempts:
                # Fallback chain: Switch to static analysis or cached metrics
                return _apply_fallback_profiling(target_process, fallback_strategy)
                
    # Should not reach here, but Law 4 compliance
    raise ProfilingError(f"Profiling failed after {max_attempts} attempts")
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
| `debugging-performance-optimization` | Uses profiler output to identify and fix performance bottlenecks |
| `systematic-debugging-methodology` | Applies structured debugging after profiling identifies hotspots |

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

- [Linux perf Documentation](https://perf.wiki.kernel.org/index.php/Main) — Comprehensive guide to the Linux performance analysis toolkit
- [Python cProfile Module](https://docs.python.org/3/library/profile.html#module-cProfile) — Official Python documentation for built-in code profiling
- [py-spy Production Profiler](https://github.com/benfred/py-spy) — Sampling profiler for Python programs, zero-overhead production profiling
- [Google Performance Tools (gperftools)](https://github.com/gperftools/gperftools) — High-performance libraries including heap and CPU profilers
- [OpenTelemetry Profiling](https://opentelemetry.io/docs/specs/otel/profiling/) — Official OpenTelemetry specification for distributed profiling