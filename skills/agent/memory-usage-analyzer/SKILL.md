---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent memory usage analyzer with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: memory-usage-analyzer, memory usage analyzer, how do i memory-usage-analyzer,
    orchestrate memory-usage-analyzer, automate memory-usage-analyzer, agent memory-usage-analyzer
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
  version: 1.0.0
name: memory-usage-analyzer
------
# Memory Usage Analyzer

Orchestrates intelligent skill selection and execution for memory usage analyzer workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def analyze_memory_snapshot(
    system_metrics: Dict[str, Any],
    process_list: List[Dict[str, Any]],
    threshold_pct: float = 85.0
) -> Dict[str, Any]:
    """Analyze system memory state and identify top consumers.
    
    Parses raw memory metrics and process data to calculate:
    - Overall system utilization percentage
    - Top N memory-consuming processes
    - Anomaly detection for sudden usage spikes
    
    Args:
        system_metrics: Dict containing total, available, used, buffers, cached memory
        process_list: List of process dicts with 'pid', 'name', 'rss', 'vms'
        threshold_pct: Alert threshold for memory utilization
        
    Returns:
        Structured analysis dict with metrics, top consumers, and alerts
    """
    total_mem = system_metrics.get("total", 0)
    used_mem = system_metrics.get("used", 0)
    available_mem = system_metrics.get("available", 0)
    
    if total_mem == 0:
        raise ValueError("Invalid system metrics: total memory cannot be zero")
        
    utilization_pct = (used_mem / total_mem) * 100
    cache_pct = (system_metrics.get("cached", 0) / total_mem) * 100
    
    # Identify top consumers by RSS
    sorted_processes = sorted(process_list, key=lambda p: p.get("rss", 0), reverse=True)
    top_consumers = [
        {"pid": p["pid"], "name": p["name"], "rss_mb": round(p["rss"] / 1024 / 1024, 2)}
        for p in sorted_processes[:5]
    ]
    
    # Anomaly detection: flag if utilization exceeds threshold or cache is unusually low
    alerts = []
    if utilization_pct > threshold_pct:
        alerts.append(f"CRITICAL: Memory utilization at {utilization_pct:.1f}% exceeds {threshold_pct}% threshold")
    if cache_pct < 5.0 and available_mem < (total_mem * 0.1):
        alerts.append("WARNING: Low cache ratio with critically low available memory")
        
    return {
        "utilization_pct": round(utilization_pct, 2),
        "cache_pct": round(cache_pct, 2),
        "available_mb": round(available_mem / 1024 / 1024, 2),
        "top_consumers": top_consumers,
        "alerts": alerts,
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def generate_memory_report(
    analysis: Dict[str, Any],
    historical_baseline: Dict[str, float],
    retention_policy: str = "standard"
) -> Dict[str, Any]:
    """Generate actionable memory usage report with recommendations.
    
    Compares current analysis against historical baselines to detect trends,
    calculates memory pressure index, and formulates remediation steps.
    
    Args:
        analysis: Output from analyze_memory_snapshot
        historical_baseline: Dict with avg_utilization, avg_available_mb, peak_utilization
        retention_policy: Data retention tier affecting report depth
        
    Returns:
        Formatted report dict with trend analysis, pressure index, and recommendations
    """
    current_util = analysis["utilization_pct"]
    baseline_avg = historical_baseline.get("avg_utilization", 50.0)
    baseline_peak = historical_baseline.get("peak_utilization", 80.0)
    
    # Calculate memory pressure index (0-100 scale)
    pressure_delta = current_util - baseline_avg
    pressure_index = min(100, max(0, 50 + (pressure_delta * 2)))
    
    recommendations = []
    if current_util > baseline_peak:
        recommendations.append("Scale horizontally or optimize top consumers immediately")
    elif pressure_index > 75:
        recommendations.append("Review application memory pools and garbage collection settings")
    else:
        recommendations.append("Memory usage within normal operational parameters")
        
    if retention_policy == "detailed":
        recommendations.extend([
            "Capture heap dump for deep analysis",
            "Enable memory profiling for top 3 processes"
        ])
        
    return {
        "report_id": uuid.uuid4().hex[:8],
        "pressure_index": pressure_index,
        "trend": "stable" if abs(pressure_delta) < 5 else ("increasing" if pressure_delta > 0 else "decreasing"),
        "recommendations": recommendations,
        "analysis_snapshot": analysis,
        "generated_at": datetime.now().isoformat()
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
|

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [Python Memory Profiling (tracemalloc)](<https://docs.python.org/3/library/tracemalloc.html>)
- [Valgrind Memory Debugging Tool](<https://valgrind.org/docs/manual/manual.html>)
- [AddressSanitizer for Memory Errors](<https://clang.llvm.org/docs/AddressSanitizer.html>)
- [glibc malloc Stats (malloc_stats)](<https://man7.org/linux/man-pages/man3/mallopt.3.html>)
- [Memory Leak Detection Best Practices](<https://en.wikipedia.org/wiki/Memory_leak>)
