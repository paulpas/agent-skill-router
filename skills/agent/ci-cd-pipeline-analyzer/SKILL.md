---
name: cd-pipeline-analyzer
description: '"Analyzes CI/CD pipelines for optimization opportunities, identifying"
  bottlenecks and improving build throughput.'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: optimization
  scope: ci-cd
  output-format: analysis
  triggers: build bottlenecks, ci-cd analysis, ci-cd analyzer, ci-cd-pipeline-analyzer,
    pipeline optimization
  related-skills: add-new-skill, autoscaling-advisor, confidence-based-selector, container-inspector
---




# CI/CD Pipeline Analyzer (Build Optimization)

> **Load this skill** when designing or modifying CI/CD analysis pipelines that identify bottlenecks, measure build throughput, and optimize pipeline performance.

## TL;DR Checklist

When analyzing CI/CD pipelines:

- [ ] Map pipeline stages and identify execution dependencies
- [ ] Measure build times at each pipeline stage
- [ ] Identify parallelization opportunities
- [ ] Calculate pipeline throughput and efficiency
- [ ] Detect flaky tests and retry patterns
- [ ] Analyze cache utilization and effectiveness
- [ ] Generate optimization recommendations
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use CI/CD Pipeline Analyzer when:

- Investigating slow CI/CD pipeline performance
- Identifying bottlenecks in build and deployment processes
- Optimizing pipeline resource utilization
- Reducing build and deployment times
- Analyzing pipeline health and reliability
- Optimizing test execution strategies

---

## When NOT to Use

Avoid using CI/CD Pipeline Analyzer for:

- Real-time pipeline monitoring (use pipeline dashboards)
- Single-stage pipeline optimization (use manual tuning)
- Environments without pipeline access
- Tasks where pipeline changes are restricted
- Non-CI/CD workflow optimization

---

## Core Concepts

### CI/CD Pipeline Structure

```
CI/CD Pipeline
├── Source Stage
│   ├── Code Checkout
│   ├── Dependency Download
│   └── Cache Restore
├── Build Stage
│   ├── Compilation
│   ├── Static Analysis
│   └── Package Build
├── Test Stage
│   ├── Unit Tests
│   ├── Integration Tests
│   └── E2E Tests
├── Deploy Stage
│   ├── Build Artifact
│   ├── Release Creation
│   └── Deployment
└── Post-Deploy
    ├── Health Checks
    └── Verification
```

### Key Metrics

#### 1. Timing Metrics

```
Build Time = Time from commit to deployment
Stage Time = Time for each pipeline stage
Parallel Time = Time when stages run in parallel
Wait Time = Idle time between stages
```

#### 2. Throughput Metrics

```
Builds Per Day = Total builds / Day
Success Rate = Successful builds / Total builds
Flaky Rate = Flaky tests / Total tests
Cache Hit Rate = Cache hits / Cache attempts
```

#### 3. Efficiency Metrics

```
Parallelization Ratio = Parallel time / Sequential time
Stage Efficiency = Stage time / Total build time
Resource Utilization = Active workers / Total workers
```

### Analysis Strategies

#### 1. Stage Analysis
```
Analyze each pipeline stage independently
Identify slow or flaky stages
```

#### 2. Dependency Analysis
```
Map stage dependencies and parallelization
Identify sequential bottlenecks
```

#### 3. Historical Trend Analysis
```
Track build times over time
Identify regression patterns
```

---

## Implementation Patterns

### Pattern 1: Pipeline Stage Profiler

Profile individual pipeline stages:

```python
from dataclasses import dataclass
from typing import List, Dict
from datetime import datetime


@dataclass
class StageExecution:
    stage_name: str
    start_time: datetime
    end_time: datetime
    duration_seconds: float
    status: str  # success, failure, skipped
    resources_used: Dict[str, float]


@dataclass
class PipelineRun:
    run_id: str
    commit_sha: str
    stages: List[StageExecution]
    total_duration_seconds: float
    status: str


def profile_pipeline_stages(run: PipelineRun) -> Dict[str, dict]:
    """Profile individual pipeline stages."""
    profiles = {}
    
    for stage in run.stages:
        profiles[stage.stage_name] = {
            "duration_seconds": stage.duration_seconds,
            "status": stage.status,
            "resources": stage.resources_used,
            "percentage": stage.duration_seconds / run.total_duration_seconds * 100 if run.total_duration_seconds > 0 else 0
        }
    
    return profiles


def identify_slow_stages(profiles: Dict[str, dict], threshold_seconds: float = 60) -> List[str]:
    """Identify stages exceeding duration threshold."""
    return [
        stage_name
        for stage_name, profile in profiles.items()
        if profile["duration_seconds"] > threshold_seconds
    ]
```

### Pattern 2: Parallelization Analyzer

Analyze pipeline parallelization opportunities:

```python
from dataclasses import dataclass
from typing import List, Set, Dict


@dataclass
class StageDependency:
    stage_name: str
    dependencies: Set[str]
    can_parallel: bool
    parallel_group: str


def analyze_parallelization(
    stages: List[StageExecution],
    dependencies: Dict[str, List[str]]
) -> List[StageDependency]:
    """Analyze parallelization opportunities."""
    dep_map = {}
    
    for stage in stages:
        deps = set(dependencies.get(stage.stage_name, []))
        can_parallel = len(deps) == 0 or all(
            any(d in [s.stage_name for s in stages[:stages.index(stage)]] for d in deps)
        )
        
        # Assign parallel group
        parallel_group = "sequential"
        if can_parallel:
            parallel_group = "parallel"
        
        dep_map[stage.stage_name] = StageDependency(
            stage_name=stage.stage_name,
            dependencies=deps,
            can_parallel=can_parallel,
            parallel_group=parallel_group
        )
    
    return list(dep_map.values())


def calculate_parallelization_ratio(
    stages: List[StageExecution],
    dependencies: Dict[str, List[str]]
) -> float:
    """Calculate parallelization ratio."""
    if not stages:
        return 1.0
    
    sequential_time = sum(s.duration_seconds for s in stages)
    
    # Calculate parallel time (stages that can run together)
    parallel_time = 0
    executed = set()
    
    while len(executed) < len(stages):
        ready = []
        for stage in stages:
            if stage.stage_name in executed:
                continue
            stage_deps = set(dependencies.get(stage.stage_name, []))
            if stage_deps.issubset(executed):
                ready.append(stage)
        
        if not ready:
            break
        
        # Add max parallel stage time for this batch
        batch_time = max(s.duration_seconds for s in ready)
        parallel_time += batch_time
        
        for stage in ready:
            executed.add(stage.stage_name)
    
    return sequential_time / parallel_time if parallel_time > 0 else 1.0
```

### Pattern 3: Build Time Trend Analyzer

Analyze historical build times for trends:

```python
from dataclasses import dataclass
from typing import List, Dict
from datetime import datetime


@dataclass
class BuildTrend:
    stage_name: str
    average_time: float
    p95_time: float
    p99_time: float
    trend: str  # improving, stable, degrading
    change_percentage: float


def analyze_build_trends(
    pipeline_runs: List[PipelineRun],
    window_size: int = 10
) -> Dict[str, BuildTrend]:
    """Analyze build time trends."""
    trends = {}
    
    # Collect stage times from runs
    stage_times = {}
    for run in pipeline_runs:
        for stage in run.stages:
            if stage.stage_name not in stage_times:
                stage_times[stage.stage_name] = []
            stage_times[stage.stage_name].append(stage.duration_seconds)
    
    # Calculate trends for each stage
    for stage_name, times in stage_times.items():
        if len(times) < window_size:
            continue
        
        recent_times = times[-window_size:]
        past_times = times[:-window_size] if len(times) > window_size else times
        
        recent_avg = sum(recent_times) / len(recent_times)
        past_avg = sum(past_times) / len(past_times)
        
        change_pct = ((recent_avg - past_avg) / past_avg * 100) if past_avg > 0 else 0
        
        sorted_times = sorted(recent_times)
        n = len(sorted_times)
        
        trends[stage_name] = BuildTrend(
            stage_name=stage_name,
            average_time=recent_avg,
            p95_time=sorted_times[int(n * 0.95)],
            p99_time=sorted_times[int(n * 0.99)],
            trend="improving" if change_pct < -10 else "degrading" if change_pct > 10 else "stable",
            change_percentage=change_pct
        )
    
    return trends
```

### Pattern 4: Flaky Test Detector

Detect flaky tests in the pipeline:

```python
from dataclasses import dataclass
from typing import List, Dict


@dataclass
class TestResult:
    test_name: str
    passed: bool
    duration_seconds: float
    flaky: bool = False


def detect_flaky_tests(
    test_results: List[List[TestResult]],
    flaky_threshold: float = 0.3
) -> List[TestResult]:
    """Detect flaky tests across multiple runs."""
    test_runs = {}
    
    for run in test_results:
        for test in run:
            if test.test_name not in test_runs:
                test_runs[test.test_name] = []
            test_runs[test.test_name].append(test.passed)
    
    flaky_tests = []
    for test_name, results in test_runs.items():
        passed_count = sum(results)
        failure_rate = 1 - (passed_count / len(results))
        
        if failure_rate >= flaky_threshold:
            flaky_tests.append(TestResult(
                test_name=test_name,
                passed=True,  # Not used for flaky
                duration_seconds=0,
                flaky=True
            ))
    
    return flaky_tests
```

### Pattern 5: Cache Effectiveness Analyzer

Analyze cache utilization and effectiveness:

```python
from dataclasses import dataclass
from typing import List, Dict


@dataclass
class CacheStatistics:
    cache_key: str
    hit_count: int
    miss_count: int
    hit_rate: float
    avg_save_time: float
    avg_restore_time: float


def analyze_cache_effectiveness(
    cache_events: List[dict],
    build_times: List[float]
) -> Dict[str, CacheStatistics]:
    """Analyze cache effectiveness."""
    cache_stats = {}
    
    for event in cache_events:
        cache_key = event.get("cache_key", "unknown")
        event_type = event.get("type", "unknown")
        
        if cache_key not in cache_stats:
            cache_stats[cache_key] = {
                "hit_count": 0,
                "miss_count": 0,
                "save_times": [],
                "restore_times": []
            }
        
        stats = cache_stats[cache_key]
        
        if event_type == "hit":
            stats["hit_count"] += 1
            if "restore_time" in event:
                stats["restore_times"].append(event["restore_time"])
        elif event_type == "miss":
            stats["miss_count"] += 1
            if "save_time" in event:
                stats["save_times"].append(event["save_time"])
    
    results = {}
    for cache_key, stats in cache_stats.items():
        total = stats["hit_count"] + stats["miss_count"]
        hit_rate = stats["hit_count"] / total if total > 0 else 0
        
        results[cache_key] = CacheStatistics(
            cache_key=cache_key,
            hit_count=stats["hit_count"],
            miss_count=stats["miss_count"],
            hit_rate=hit_rate,
            avg_save_time=sum(stats["save_times"]) / len(stats["save_times"]) if stats["save_times"] else 0,
            avg_restore_time=sum(stats["restore_times"]) / len(stats["restore_times"]) if stats["restore_times"] else 0
        )
    
    return results
```

---

## Common Patterns

### Pattern 1: Pipeline Health Score

Calculate overall pipeline health:

```python
def calculate_pipeline_health(
    stages: List[StageExecution],
    trends: Dict[str, BuildTrend],
    flaky_tests: List[TestResult],
    cache_stats: Dict[str, CacheStatistics]
) -> dict:
    """Calculate overall pipeline health score."""
    health = {
        "score": 100,
        "issues": []
    }
    
    # Check for degrading stages
    for stage_name, trend in trends.items():
        if trend.trend == "degrading":
            health["score"] -= 10
            health["issues"].append({
                "type": "degrading_stage",
                "stage": stage_name,
                "impact": f"{trend.change_percentage:.1f}% increase in build time"
            })
    
    # Check for flaky tests
    if len(flaky_tests) > 0:
        health["score"] -= len(flaky_tests) * 5
        health["issues"].append({
            "type": "flaky_tests",
            "count": len(flaky_tests),
            "impact": "Unreliable test results"
        })
    
    # Check cache effectiveness
    for cache_key, stats in cache_stats.items():
        if stats.hit_rate < 0.5:
            health["score"] -= 5
            health["issues"].append({
                "type": "low_cache_hit",
                "cache": cache_key,
                "hit_rate": stats.hit_rate
            })
    
    health["score"] = max(0, health["score"])
    return health
```

### Pattern 2: Optimization Recommendation Engine

Generate optimization recommendations:

```python
def generate_optimization_recommendations(
    stages: List[StageExecution],
    trends: Dict[str, BuildTrend],
    parallelization_ratio: float,
    cache_stats: Dict[str, CacheStatistics]
) -> List[dict]:
    """Generate optimization recommendations."""
    recommendations = []
    
    # Recommend parallelization if ratio is low
    if parallelization_ratio < 2.0:
        recommendations.append({
            "type": "parallelization",
            "description": "Increase pipeline parallelization",
            "estimated_savings": "20-40% build time",
            "priority": "high"
        })
    
    # Recommend cache optimization for low hit rates
    for cache_key, stats in cache_stats.items():
        if stats.hit_rate < 0.7:
            recommendations.append({
                "type": "cache_optimization",
                "cache": cache_key,
                "description": f"Increase cache hit rate from {stats.hit_rate*100:.1f}%",
                "estimated_savings": "10-30% build time",
                "priority": "medium"
            })
    
    # Recommend stage optimization for degrading stages
    for stage_name, trend in trends.items():
        if trend.trend == "degrading" and trend.change_percentage > 20:
            recommendations.append({
                "type": "stage_optimization",
                "stage": stage_name,
                "description": f"Optimize {stage_name} stage - {trend.change_percentage:.1f}% increase",
                "estimated_savings": "15-30% stage time",
                "priority": "high"
            })
    
    return recommendations
```

### Pattern 3: Pipeline Performance Dashboard

Build dashboard data for pipeline performance:

```python
def build_pipeline_dashboard(
    recent_runs: List[PipelineRun],
    stage_profiles: Dict[str, dict],
    trends: Dict[str, BuildTrend],
    parallelization_ratio: float
) -> dict:
    """Build pipeline performance dashboard data."""
    if not recent_runs:
        return {}
    
    total_duration = sum(run.total_duration_seconds for run in recent_runs)
    avg_duration = total_duration / len(recent_runs)
    success_rate = sum(1 for run in recent_runs if run.status == "success") / len(recent_runs)
    
    slow_stages = identify_slow_stages(stage_profiles)
    
    return {
        "summary": {
            "avg_build_duration_seconds": avg_duration,
            "success_rate": success_rate,
            "parallelization_ratio": parallelization_ratio,
            "last_24h_builds": len(recent_runs)
        },
        "stages": stage_profiles,
        "trends": trends,
        "slow_stages": slow_stages,
        "recommendations": generate_optimization_recommendations(
            [], {}, parallelization_ratio, {}
        )
    }
```

---

## Common Mistakes

### Mistake 1: Not Accounting for Pipeline Dependencies

**Wrong:**
```python
# ❌ Measuring stage times without considering dependencies
stage_time = get_stage_time("build")
# Doesn't account for dependencies causing delays
```

**Correct:**
```python
# ✅ Analyze full pipeline flow
pipeline = analyze_pipeline()
stage_time = get_stage_time("build", with_dependencies=True)
# Includes dependency wait times
```

### Mistake 2: Over-Optimizing Single Stages

**Wrong:**
```python
# ❌ Optimizing cache without considering overall impact
optimize_cache("dependencies")  # May not save much time
# Ignoring that dependencies download is already fast
```

**Correct:**
```python
# ✅ Prioritize high-impact optimizations
recommendations = generate_recommendations(
    stage_profiles,
    parallelization_ratio
)
# Focus on slowest stages with biggest impact
```

### Mistake 3: Ignoring Flaky Tests

**Wrong:**
```python
# ❌ Not detecting flaky tests
test_results = run_tests()
# Flaky tests cause unreliable builds
```

**Correct:**
```python
# ✅ Detect and report flaky tests
flaky = detect_flaky_tests(test_results, flaky_threshold=0.3)
if flaky:
    report_issue("Flaky tests detected", flaky)
# Address reliability issues
```

### Mistake 4: Not Comparing Against Baseline

**Wrong:**
```python
# ❌ Measuring without baseline comparison
current_time = get_build_time()
# No context for whether this is good or bad
```

**Correct:**
```python
# ✅ Compare to historical baseline
baseline_time = get_baseline_time()
current_time = get_build_time()
change = (current_time - baseline_time) / baseline_time * 100
if change > 20:
    alert(f"Build time increased by {change:.1f}%")
# Detect regressions early
```

### Mistake 5: Not Testing Optimizations

**Wrong:**
```python
# ❌ Applying optimizations without testing
recommendations = generate_recommendations()
apply_recommendations(recommendations)
# No validation of effectiveness
```

**Correct:**
```python
# ✅ Test optimizations before full deployment
recommendations = generate_recommendations()
for rec in recommendations[:3]:  # Test top 3
    test_result = test_optimization(rec)
    if test_result.effectiveness > 0.1:  # 10% improvement
        apply_recommendation(rec)
# Validate before full deployment
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Input validation for pipeline data
- [ ] **Parsed State:** Raw pipeline data parsed into typed structures
- [ ] **Purity:** Analysis functions are pure
- [ ] **Fail Loud:** Invalid pipeline configurations throw errors
- [ ] **Readability:** Pipeline analysis reads like troubleshooting guide

### Testing

- [ ] Unit tests for stage profiling
- [ ] Integration tests for parallelization analysis
- [ ] Build trend analysis tests
- [ ] Flaky test detection tests
- [ ] Cache effectiveness tests

### Security

- [ ] Pipeline credentials sanitized in logs
- [ ] No unauthorized pipeline modifications
- [ ] Audit trail for all analyses
- [ ] Pipeline data access controlled
- [ ] Build artifact integrity validated

### Performance

- [ ] Efficient pipeline parsing
- [ ] Concurrent analysis for large pipelines
- [ ] Cached build history
- [ ] Incremental analysis updates
- [ ] Memory-efficient streaming for large datasets

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `resource-optimizer` | Optimize CI/CD resource usage |
| `hot-path-detector` | Identify slow pipeline paths |
| `latency-analyzer` | Measure build latencies |
| `autoscaling-advisor` | Optimize CI/CD runner scaling |
| `ci-cd-pipeline-analyzer` | Pipeline health monitoring |

### Core Dependencies

- **Profiler:** Stage timing profiling
- **Analyzer:** Parallelization analysis
- **Trend Analyzer:** Historical build time analysis
- **Flaky Detector:** Flaky test detection
- **Recommendation Engine:** Optimization suggestions

### External Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI/CD](https://docs.gitlab.com/ee/ci/)
- [Jenkins Pipeline](https://www.jenkins.io/doc/pipeline/tour/)

---

## Implementation Tracking

### Agent CI/CD Pipeline Analyzer - Core Patterns

| Task | Status |
|------|--------|
| Stage profiler | ✅ Complete |
| Parallelization analyzer | ✅ Complete |
| Build time trend analyzer | ✅ Complete |
| Flaky test detector | ✅ Complete |
| Cache effectiveness analyzer | ✅ Complete |
| Pipeline health score | ✅ Complete |
| Optimization recommendations | ✅ Complete |
| Dashboard builder | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Stage profiling
- Parallelization analysis
- Build time trend analysis
- Flaky test detection
- Cache effectiveness analysis

### 1.1.0 (Planned)
- Multi-branch analysis
- Cross-pipeline optimization
- Resource utilization analysis
- Cost optimization

### 2.0.0 (Future)
- ML-based optimization
- Predictive build times
- Automated pipeline tuning
- Multi-cloud CI/CD

---

## Implementation Prompt (Execution Layer)

When implementing the CI/CD Pipeline Analyzer skill, use this prompt for code generation:

```
Create a CI/CD Pipeline Analyzer implementation following these requirements:

1. Core Classes:
   - StageExecution: Single stage execution details
   - PipelineRun: Complete pipeline run data
   - StageDependency: Parallelization dependencies
   - BuildTrend: Historical build time trend
   - TestResult: Individual test execution result
   - CacheStatistics: Cache utilization statistics
   - PipelineHealth: Overall pipeline health

2. Key Methods:
   - profile_pipeline_stages(run): Profile all stages
   - identify_slow_stages(profiles, threshold): Find slow stages
   - analyze_parallelization(stages, dependencies): Parallelization analysis
   - calculate_parallelization_ratio(stages, dependencies): Ratio calculation
   - analyze_build_trends(runs, window): Historical trend analysis
   - detect_flaky_tests(test_results, threshold): Flaky test detection
   - analyze_cache_effectiveness(events, build_times): Cache analysis
   - build_pipeline_dashboard(runs, profiles, trends, ratio): Dashboard data

3. Data Structures:
   - StageExecution with start/end times, duration, status, resources
   - PipelineRun with run ID, commit SHA, stages, total duration
   - StageDependency with dependencies and parallelization status
   - BuildTrend with average, p95, p99, trend, change percentage
   - TestResult with test name, passed, duration, flaky flag
   - CacheStatistics with hit count, miss count, hit rate
   - PipelineHealth with overall score and issues list

4. Analysis Strategies:
   - Stage analysis: Individual stage profiling
   - Parallelization analysis: Dependency and parallelization
   - Trend analysis: Historical build time tracking
   - Flaky detection: Test reliability analysis
   - Cache analysis: Cache utilization effectiveness

5. Configuration Options:
   - threshold_seconds: Duration threshold for slow stages
   - flaky_threshold: Flaky test detection threshold
   - window_size: Trend analysis window size
   - parallelization_target: Target parallelization ratio
   - cache_hit_target: Target cache hit rate

6. Output Features:
   - Pipeline stage profiles
   - Parallelization opportunities
   - Build time trends
   - Flaky test reports
   - Cache effectiveness metrics
   - Optimization recommendations
   - Pipeline health dashboard

7. Error Handling:
   - Invalid pipeline configuration
   - Missing stage data
   - Empty pipeline runs
   - Partial failure handling
   - Graceful degradation

Follow the 5 Laws of Elegant Defense:
- Guard clauses for input validation
- Parse raw pipeline data into typed structures
- Pure analysis functions
- Fail fast on invalid state
- Clear names for all components
```
