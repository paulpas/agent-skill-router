---
name: agent-regression-detector
description: Detects performance and behavioral regressions by comparing agent execution
  before and after code changes, identifying performance degradation and behavioral
  changes.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: quality assurance
  scope: regression detection
  output-format: analysis
  triggers: behavioral, detects, optimization, performance, regression detector, regression-detector, regressions, speed
  related-skills: agent-code-correctness-verifier, agent-error-trace-explainer, agent-goal-to-milestones, agent-hot-path-detector, agent-infra-drift-detector
---


# Regression Detector (Agent Change Impact Analysis)

> **Load this skill** when designing or modifying agent systems that detect performance and behavioral regressions by comparing agent execution metrics before and after code changes, identifying performance degradation and behavioral changes.

## TL;DR Checklist

When detecting regressions:

- [ ] Establish baseline metrics for agent execution
- [ ] Capture current execution metrics after changes
- [ ] Compare metrics using statistical significance tests
- [ ] Identify performance regressions (slower execution)
- [ ] Identify behavioral regressions (changed outputs)
- [ ] Generate actionable regression reports
- [ ] Track regression history over time
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Regression Detector when:

- Validating agent performance after code changes
- Analyzing performance impact of refactoring
- Monitoring agent behavior consistency
- Implementing quality gates for agent deployments
- Building regression testing pipelines
- Tracking agent performance trends over time
- Investigating performance degradation reports

---

## When NOT to Use

Avoid using this skill for:

- Single-execution performance profiling (use profiler)
- Memory leak detection (use memory analyzer)
- Security vulnerability scanning (use security scanner)
- Code correctness verification (use correctness verifier)
- Documentation quality checks (use docs analyzer)

---

## Core Concepts

### Regression Detection Dimensions

Regressions are detected across multiple dimensions:

```
Agent Execution
├── Performance Metrics
│   ├── Execution Time: Time to complete tasks
│   ├── Memory Usage: Memory consumption
│   ├── CPU Usage: CPU utilization
│   └── Throughput: Tasks per second
├── Behavioral Metrics
│   ├── Output Consistency: Same outputs for same inputs
│   ├── Decision Patterns: Same decisions made
│   ├── Resource Usage: Resource allocation patterns
│   └── Error Rates: Error frequency and types
└── Quality Metrics
    ├── Coverage: Code coverage maintained
    ├── Accuracy: Output accuracy preserved
    └── Completeness: Output completeness maintained
```

### Regression Types

#### 1. Performance Regression

```python
{
    "type": "performance_regression",
    "category": "execution_time",
    "before": {"mean": 1.5, "std": 0.2},
    "after": {"mean": 3.2, "std": 0.3},
    "regression_factor": 2.13,  # 3.2 / 1.5
    "significance": "high"  # p-value < 0.05
}
```

#### 2. Behavioral Regression

```python
{
    "type": "behavioral_regression",
    "category": "output_change",
    "affected_tasks": ["task_1", "task_2"],
    "change_description": "Output format changed from JSON to XML",
    "impact": "breaking"
}
```

### Comparison Methods

#### Statistical Tests

1. **T-test**: Compare means for performance metrics
2. **Chi-square**: Compare categorical distributions
3. **Kolmogorov-Smirnov**: Compare overall distributions
4. **KL Divergence**: Compare probability distributions

---

## Implementation Patterns

### Pattern 1: Baseline Establishment

Establish baseline metrics:

```python
from apex.agents.regression import RegressionDetector
from apex.agents.metrics import ExecutionMetrics


def establish_baseline(agent: Agent) -> Baseline:
    """Establish baseline metrics for an agent."""
    
    detector = RegressionDetector()
    
    # Run agent multiple times to establish baseline
    metrics_samples = []
    for _ in range(30):  # 30 samples for statistical significance
        metrics = detector.capture_metrics(agent)
        metrics_samples.append(metrics)
    
    # Calculate baseline statistics
    baseline = detector.calculate_baseline(metrics_samples)
    
    return baseline
```

### Pattern 2: Performance Regression Detection

Detect performance regressions:

```python
def detect_performance_regressions(
    baseline: Baseline,
    current_metrics: ExecutionMetrics
) -> list[PerformanceRegression]:
    """Detect performance regressions."""
    
    regressions = []
    
    for metric_name, baseline_stats in baseline.metrics.items():
        current_value = getattr(current_metrics, metric_name)
        
        # Calculate statistics
        diff = current_value - baseline_stats.mean
        z_score = diff / baseline_stats.std if baseline_stats.std > 0 else 0
        
        # Determine significance
        p_value = calculate_p_value(z_score)
        significance = "high" if p_value < 0.05 else "medium" if p_value < 0.1 else "low"
        
        # Calculate regression factor
        regression_factor = current_value / baseline_stats.mean
        
        if regression_factor > 1.2:  # 20% increase is regression
            regressions.append(PerformanceRegression(
                metric=metric_name,
                before=baseline_stats,
                after=current_value,
                regression_factor=regression_factor,
                z_score=z_score,
                p_value=p_value,
                significance=significance
            ))
    
    return regressions
```

### Pattern 3: Behavioral Regression Detection

Detect behavioral regressions:

```python
def detect_behavioral_regressions(
    baseline_outputs: list[TaskOutput],
    current_outputs: list[TaskOutput]
) -> list[BehavioralRegression]:
    """Detect behavioral regressions in task outputs."""
    
    regressions = []
    
    # Compare outputs for same tasks
    baseline_map = {o.task_id: o for o in baseline_outputs}
    
    for current_output in current_outputs:
        baseline_output = baseline_map.get(current_output.task_id)
        
        if baseline_output is None:
            # New task, not a regression
            continue
        
        # Check for output changes
        if not outputs_match(baseline_output, current_output):
            regression = BehavioralRegression(
                task_id=current_output.task_id,
                description=f"Output changed for task {current_output.task_id}",
                impact="breaking" if is_breaking_change(baseline_output, current_output) else "non-breaking"
            )
            regressions.append(regression)
    
    return regressions
```

### Pattern 4: Regression Trend Analysis

Analyze regression trends over time:

```python
class RegressionTrendAnalyzer:
    def __init__(self):
        self.history: list[RegressionReport] = []
    
    def add_report(self, report: RegressionReport):
        """Add regression report to history."""
        self.history.append(report)
    
    def get_regression_trend(self, metric: str) -> str:
        """Get regression trend for a metric."""
        regressions = [
            r for r in self.history
            if any(regression.metric == metric for regression in r.performance_regressions)
        ]
        
        if len(regressions) < 2:
            return "insufficient_data"
        
        # Count regressions over time
        recent = regressions[-3:]
        old = regressions[:3] if len(regressions) > 3 else regressions
        
        if len(recent) > len(old) * 1.2:
            return "increasing"
        elif len(recent) < len(old) * 0.8:
            return "decreasing"
        return "stable"
    
    def get_average_regression_factor(self) -> float:
        """Get average regression factor across all reports."""
        factors = []
        for report in self.history:
            for regression in report.performance_regressions:
                factors.append(regression.regression_factor)
        
        return sum(factors) / len(factors) if factors else 1.0
```

### Pattern 5: Regression Report Generation

Generate comprehensive regression reports:

```python
def generate_regression_report(
    baseline: Baseline,
    current_metrics: ExecutionMetrics,
    current_outputs: list[TaskOutput]
) -> RegressionReport:
    """Generate comprehensive regression report."""
    
    detector = RegressionDetector()
    
    # Detect performance regressions
    performance_regressions = detector.detect_performance_regressions(
        baseline, current_metrics
    )
    
    # Calculate summary statistics
    summary = {
        "total_metrics": len(current_metrics.__dict__),
        "regressed_metrics": len(performance_regressions),
        "regression_rate": len(performance_regressions) / len(current_metrics.__dict__) if current_metrics.__dict__ else 0,
        "worst_regressor": max(performance_regressions, key=lambda r: r.regression_factor) if performance_regressions else None
    }
    
    return RegressionReport(
        baseline=baseline,
        current_metrics=current_metrics,
        performance_regressions=performance_regressions,
        summary=summary,
        timestamp=datetime.now()
    )
```

---

## Common Patterns

### Pattern 1: Regression Threshold Configuration

Configure regression detection thresholds:

```python
REGRESSION_THRESHOLDS = {
    "performance": {
        "min_execution_time": 0.1,  # Minimum execution time to consider
        "max_regression_factor": 2.0,  # Max acceptable increase
        "min_samples": 10,  # Minimum samples for baseline
        "significance_threshold": 0.05  # p-value threshold
    },
    "behavioral": {
        "ignore_whitespace": True,
        "ignore_order": False,  # Order matters for some outputs
        "exact_match_required": False
    }
}
```

### Pattern 2: Regression Notification

Generate regression notifications:

```python
def generate_regression_notification(report: RegressionReport) -> str:
    """Generate human-readable regression notification."""
    
    lines = []
    lines.append("🚀 Regression Detected!")
    lines.append(f"Timestamp: {report.timestamp}")
    lines.append(f"Performance Regressions: {len(report.performance_regressions)}")
    
    if report.performance_regressions:
        lines.append("\n📈 Top Regressions:")
        for regression in report.performance_regressions[:3]:
            lines.append(f"  - {regression.metric}: {regression.regression_factor:.2f}x slower")
    
    lines.append("\n📊 Summary:")
    lines.append(f"  - Regression Rate: {report.summary['regression_rate']*100:.1f}%")
    
    return "\n".join(lines)
```

---

## Common Mistakes

### Mistake 1: Not Establishing Proper Baselines

**Wrong:**
```python
# ❌ Using single execution as baseline
def establish_baseline(agent: Agent):
    metrics = execute(agent)  # ❌ Single sample not representative
    return metrics
```

**Correct:**
```python
# ✅ Multiple samples for statistical significance
def establish_baseline(agent: Agent):
    samples = []
    for _ in range(30):
        metrics = execute(agent)
        samples.append(metrics)
    
    # Calculate mean, std, percentiles
    return calculate_statistics(samples)
```

### Mistake 2: Ignoring Variance

**Wrong:**
```python
# ❌ Comparing means without considering variance
def detect_regression(baseline: float, current: float):
    if current > baseline * 1.2:  # ❌ No variance consideration
        return True
```

**Correct:**
```python
# ✅ Consider variance with statistical tests
def detect_regression(baseline_stats: Stats, current_value: float):
    # Use t-test to account for variance
    p_value = perform_t_test(baseline_stats, current_value)
    return p_value < 0.05 and current_value > baseline_stats.mean * 1.2
```

### Mistake 3: Not Accounting for Workload Differences

**Wrong:**
```python
# ❌ Comparing different workloads
baseline = capture_metrics(agent, workload="small")
current = capture_metrics(agent, workload="large")  # ❌ Different workloads
```

**Correct:**
```python
# ✅ Same workload for fair comparison
def compare_regressions(agent: Agent):
    workload = get_standard_workload()
    
    baseline = capture_metrics(agent, workload=workload)
    current = capture_metrics(agent, workload=workload)  # ✅ Same workload
    
    return detect_regressions(baseline, current)
```

### Mistake 4: No Statistical Significance Testing

**Wrong:**
```python
# ❌ No statistical significance testing
def detect_regressions(baseline: Stats, current: Stats):
    if current.mean > baseline.mean * 1.2:
        return True  # ❌ Could be natural variance
```

**Correct:**
```python
# ✅ Statistical significance testing
def detect_regressions(baseline: Stats, current: Stats):
    # Use t-test for significance
    t_stat, p_value = ttest_ind(baseline.samples, current.samples)
    
    # Check both magnitude and significance
    regression_factor = current.mean / baseline.mean
    return regression_factor > 1.2 and p_value < 0.05
```

### Mistake 5: Not Handling Flaky Tests

**Wrong:**
```python
# ❌ Flagging flaky tests as regressions
def detect_regressions(baseline: Stats, current: Stats):
    if current.mean > baseline.mean * 1.5:
        return True  # ❌ Could be flaky test
```

**Correct:**
```python
# ✅ Detect and handle flaky tests
def detect_regressions(baseline: Stats, current: Stats):
    # Check variance
    if current.std > current.mean * 0.5:  # High variance
        return False  # ❌ Flaky test, not regression
    
    # Apply regression detection
    return calculate_regression_factor(baseline, current) > 1.2
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Validation at top of regression detection
- [ ] **Parsed State:** Metrics parsed into structured format
- [ ] **Purity:** Detection functions are stateless
- [ ] **Fail Fast:** Invalid metrics throw clear errors
- [ ] **Readability:** Detection logic reads as English

### Testing

- [ ] Unit tests for baseline establishment
- [ ] Integration tests for regression detection
- [ ] Edge case tests for boundary conditions
- [ ] Statistical significance tests
- [ ] Performance benchmark tests

### Security

- [ ] Metrics inputs validated
- [ ] No arbitrary code execution
- [ ] Resource limits on analysis runs
- [ ] Input length limits enforced
- [ ] Sensitive data filtered from metrics

### Performance

- [ ] Baseline caching where appropriate
- [ ] Parallel metric capture for multiple agents
- [ ] Memory usage bounded for large datasets
- [ ] Timeout protection for slow comparisons
- [ ] Incremental updates supported

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `agent-diff-quality-analyzer` | Analyze code changes |
| `agent-error-trace-explainer` | Explain error traces |
| `agent-stacktrace-root-cause` | Root cause analysis |
| `agent-failure-mode-analysis` | Failure mode analysis |
| `code-philosophy` | Core correctness principles |

### Core Dependencies

- **Metrics Collector:** Capture execution metrics
- **Baseline Calculator:** Establish baseline statistics
- **Statistical Tester:** Perform significance tests
- **Comparison Engine:** Compare metrics over time
- **Report Generator:** Generate regression reports

### External Resources

- [Statistical Significance](https://example.com/statistical-tests) - T-tests, p-values
- [Performance Regression Detection](https://example.com/perf-regression) - Regression detection
- [Benchmarking Best Practices](https://example.com/benchmarking) - Benchmarking guidelines

---

## Implementation Tracking

### Agent Regression Detector - Core Patterns

| Task | Status |
|------|--------|
| Baseline establishment | ✅ Complete |
| Performance regression detection | ✅ Complete |
| Behavioral regression detection | ✅ Complete |
| Statistical significance testing | ✅ Complete |
| Regression trend analysis | ✅ Complete |
| Report generation | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Baseline establishment with statistical methods
- Performance regression detection
- Behavioral regression detection
- Statistical significance testing
- Regression trend analysis

### 1.1.0 (Planned)
- Custom threshold configuration
- Performance profiling integration
- ML-based regression prediction
- Trend optimization

### 2.0.0 (Future)
- Historical regression correlation
- Predictive regression analysis
- Automated regression fix suggestions
- Cross-agent regression correlation

---

## Implementation Prompt (Execution Layer)

When implementing the Regression Detector, use this prompt for code generation:

```
Create a Regression Detector implementation following these requirements:

1. Core Class: `RegressionDetector`
   - Establish baseline metrics for agents
   - Detect performance regressions
   - Detect behavioral regressions
   - Generate regression reports

2. Key Methods:
   - `establish_baseline(agent)`: Establish baseline metrics
   - `detect_performance_regressions(baseline, current)`: Detect performance issues
   - `detect_behavioral_regressions(baseline, current)`: Detect behavioral changes
   - `calculate_statistics(samples)`: Calculate baseline statistics
   - `generate_report(baseline, current)`: Generate regression report

3. Performance Metrics:
   - Execution time (mean, std, min, max)
   - Memory usage (peak, average)
   - CPU usage (average, peak)
   - Throughput (tasks per second)
   - Resource utilization (memory, CPU, I/O)

4. Statistical Tests:
   - T-test for means comparison
   - Chi-square for distributions
   - Kolmogorov-Smirnov for overall distributions
   - KL divergence for probability distributions

5. Regression Types:
   - Performance regression: Slower execution
   - Behavioral regression: Changed outputs
   - Resource regression: Increased resource usage
   - Error regression: Increased error rates

6. Analysis Features:
   - Statistical significance testing
   - Variance consideration
   - Trend analysis
   - Anomaly detection
   - Flaky test detection

7. Output Structure:
   - `is_regression`: Whether regression detected
   - `regression_type`: Performance/behavioral
   - `regression_factor`: Magnitude of regression
   - `significance`: Statistical significance
   - `recommendations`: Suggested actions

8. Report Components:
   - Summary statistics
   - Detailed regression list
   - Trend analysis
   - Root cause suggestions
   - Fix recommendations

Follow the 5 Laws of Elegant Defense:
- Guard clauses for validation
- Parse metrics at boundary
- Pure detection functions
- Fail fast on invalid metrics
- Clear names for all components
```
