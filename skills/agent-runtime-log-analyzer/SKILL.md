---
name: agent-runtime-log-analyzer
description: Analyzes runtime logs from agent execution to identify patterns, detect
  anomalies, and extract actionable insights for system optimization.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: monitoring
  scope: log analysis
  output-format: analysis
  triggers: analyzes, logs, patterns, runtime, runtime log analyzer, runtime-log-analyzer
  related-skills: agent-code-correctness-verifier, agent-confidence-based-selector, agent-error-trace-explainer, agent-k8s-debugger, agent-multi-skill-executor
---


# Runtime Log Analyzer (Agent Execution Monitoring)

> **Load this skill** when designing or modifying agent systems that analyze runtime logs from agent execution, identifying patterns, detecting anomalies, and extracting actionable insights for system optimization.

## TL;DR Checklist

When analyzing runtime logs:

- [ ] Parse log format into structured representation
- [ ] Extract timestamps, agent IDs, task IDs, and status
- [ ] Identify execution patterns and trends
- [ ] Detect anomalies and outliers
- [ ] Correlate events across agents and tasks
- [ ] Generate actionable insights and recommendations
- [ ] Support real-time and historical log analysis
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Runtime Log Analyzer when:

- Monitoring agent system health in production
- Analyzing execution patterns for optimization
- Detecting performance anomalies
- Troubleshooting agent failures
- Building real-time monitoring dashboards
- Analyzing historical execution data
- Identifying systemic issues across agent runs

---

## When NOT to Use

Avoid using this skill for:

- Static code analysis (use static analyzer)
- Performance profiling (use profiler)
- Security vulnerability scanning (use security scanner)
- Code correctness verification (use correctness verifier)
- Documentation quality checks (use docs analyzer)

---

## Core Concepts

### Log Analysis Dimensions

Runtime logs are analyzed across multiple dimensions:

```
Runtime Log
├── Temporal Analysis
│   ├── Time Series Patterns: Execution patterns over time
│   ├── Anomaly Detection: Statistical outliers
│   └── Trend Analysis: Long-term trends
├── Agent Analysis
│   ├── Agent Performance: Per-agent metrics
│   ├── Agent Health: Agent status indicators
│   └── Agent Patterns: Common execution patterns
├── Task Analysis
│   ├── Task Duration: Task execution times
│   ├── Task Success Rate: Task completion rates
│   └── Task Dependencies: Task relationships
└── Correlation Analysis
    ├── Event Correlation: Related events
    ├── Error Correlation: Related errors
    └── Performance Correlation: Related metrics
```

### Log Entry Structure

A typical log entry contains:

```python
{
    "timestamp": "2024-01-01T12:00:00Z",
    "agent_id": "agent_123",
    "task_id": "task_456",
    "event_type": "execution_start|execution_end|success|error",
    "status": "pending|running|completed|failed",
    "duration_ms": 1500,
    "memory_mb": 512,
    "cpu_percent": 25,
    "metadata": {...}
}
```

### Analysis Types

1. **Temporal Analysis**: Patterns over time
2. **Agent Analysis**: Per-agent metrics
3. **Task Analysis**: Per-task metrics
4. **Anomaly Detection**: Statistical outliers
5. **Correlation Analysis**: Related events

---

## Implementation Patterns

### Pattern 1: Log Parsing Pipeline

Parse logs from multiple sources:

```python
from apex.agents.log import LogParser
from apex.agents.log.formats import JSONLogFormat, TextLogFormat


def parse_runtime_logs(logs: list[str], format_type: str) -> list[ParsedLog]:
    """Parse runtime logs from multiple sources."""
    
    parser = LogParser()
    
    # Auto-detect format or use provided
    if format_type == "json":
        format_parser = JSONLogFormat()
    elif format_type == "text":
        format_parser = TextLogFormat()
    else:
        format_parser = AutoDetectLogFormat()
    
    parsed_logs = []
    for log_line in logs:
        parsed = parser.parse(log_line, format_parser)
        if parsed:
            parsed_logs.append(parsed)
    
    return parsed_logs
```

### Pattern 2: Temporal Analysis

Analyze execution patterns over time:

```python
class TemporalAnalyzer:
    def __init__(self):
        self.buckets: dict[str, list[ParsedLog]] = {}
    
    def bucket_logs_by_time(self, logs: list[ParsedLog], interval: str):
        """Bucket logs by time interval."""
        for log in logs:
            bucket_key = self._get_bucket_key(log.timestamp, interval)
            if bucket_key not in self.buckets:
                self.buckets[bucket_key] = []
            self.buckets[bucket_key].append(log)
    
    def analyze_temporal_patterns(self) -> TemporalAnalysis:
        """Analyze temporal patterns in logs."""
        
        patterns = {}
        for bucket, logs in self.buckets.items():
            # Calculate metrics for bucket
            metrics = {
                "execution_count": len(logs),
                "avg_duration": sum(l.duration_ms for l in logs) / len(logs) if logs else 0,
                "success_rate": sum(1 for l in logs if l.status == "success") / len(logs) if logs else 0
            }
            patterns[bucket] = metrics
        
        return TemporalAnalysis(
            patterns=patterns,
            trends=self._calculate_trends(patterns)
        )
```

### Pattern 3: Agent Performance Analysis

Analyze agent performance:

```python
def analyze_agent_performance(logs: list[ParsedLog]) -> AgentPerformanceReport:
    """Analyze performance metrics per agent."""
    
    agent_metrics = {}
    
    for log in logs:
        agent_id = log.agent_id
        
        if agent_id not in agent_metrics:
            agent_metrics[agent_id] = {
                "executions": [],
                "success_count": 0,
                "error_count": 0,
                "total_duration": 0
            }
        
        metrics = agent_metrics[agent_id]
        metrics["executions"].append(log)
        
        if log.status == "success":
            metrics["success_count"] += 1
        elif log.status == "failed":
            metrics["error_count"] += 1
        
        metrics["total_duration"] += log.duration_ms
    
    # Calculate summary metrics
    summary = {}
    for agent_id, metrics in agent_metrics.items():
        total = metrics["success_count"] + metrics["error_count"]
        summary[agent_id] = {
            "success_rate": metrics["success_count"] / total if total > 0 else 0,
            "avg_duration": metrics["total_duration"] / len(metrics["executions"]) if metrics["executions"] else 0,
            "execution_count": len(metrics["executions"])
        }
    
    return AgentPerformanceReport(
        by_agent=summary,
        overall={
            "total_executions": sum(m["execution_count"] for m in agent_metrics.values()),
            "avg_success_rate": sum(s["success_rate"] for s in summary.values()) / len(summary) if summary else 0
        }
    )
```

### Pattern 4: Anomaly Detection

Detect anomalies in execution patterns:

```python
def detect_anomalies(logs: list[ParsedLog]) -> list[Anomaly]:
    """Detect anomalies in execution logs."""
    
    anomalies = []
    
    # Calculate baseline metrics
    durations = [log.duration_ms for log in logs]
    mean_duration = sum(durations) / len(durations) if durations else 0
    std_duration = (sum((d - mean_duration) ** 2 for d in durations) / len(durations)) ** 0.5 if durations else 0
    
    # Detect duration anomalies
    for log in logs:
        if std_duration > 0:
            z_score = (log.duration_ms - mean_duration) / std_duration
            
            if abs(z_score) > 3:  # More than 3 standard deviations
                anomalies.append(Anomaly(
                    type="duration",
                    log=log,
                    z_score=z_score,
                    description=f"Duration {log.duration_ms}ms is {z_score:.2f} standard deviations from mean"
                ))
    
    # Detect error rate anomalies
    success_logs = [l for l in logs if l.status == "success"]
    error_logs = [l for l in logs if l.status == "failed"]
    
    if error_logs and len(success_logs) > 0:
        error_rate = len(error_logs) / len(logs)
        
        if error_rate > 0.1:  # More than 10% errors
            anomalies.append(Anomaly(
                type="error_rate",
                log=logs[0],
                error_rate=error_rate,
                description=f"High error rate: {error_rate*100:.1f}%"
            ))
    
    return anomalies
```

### Pattern 5: Correlation Analysis

Correlate events across agents and tasks:

```python
def analyze_correlations(logs: list[ParsedLog]) -> CorrelationAnalysis:
    """Analyze correlations between events."""
    
    correlations = []
    
    # Correlate errors across agents
    error_logs = [log for log in logs if log.status == "failed"]
    
    if len(error_logs) > 1:
        # Group errors by time window
        time_windows = {}
        for log in error_logs:
            window_key = log.timestamp.strftime("%Y-%m-%d %H")  # Hourly windows
            if window_key not in time_windows:
                time_windows[window_key] = []
            time_windows[window_key].append(log)
        
        # Find correlated errors
        for window, errors in time_windows.items():
            if len(errors) > 5:  # Multiple errors in same window
                agent_ids = set(e.agent_id for e in errors)
                if len(agent_ids) > 1:
                    correlations.append(Correlation(
                        type="error_correlation",
                        agents=agent_ids,
                        window=window,
                        error_count=len(errors),
                        description=f"{len(errors)} errors across {len(agent_ids)} agents in {window}"
                    ))
    
    return CorrelationAnalysis(
        correlations=correlations,
        patterns=self._extract_patterns(logs)
    )
```

---

## Common Patterns

### Pattern 1: Log Aggregation Pipeline

Build a log aggregation pipeline:

```python
def build_log_aggregation_pipeline():
    """Build pipeline for log aggregation and analysis."""
    
    pipeline = LogAggregationPipeline()
    
    # Add stages
    pipeline.add_stage(LogParserStage())
    pipeline.add_stage(TemporalAggregatorStage())
    pipeline.add_stage(AgentAnalyzerStage())
    pipeline.add_stage(AnomalyDetectorStage())
    pipeline.add_stage(CorrelationAnalyzerStage())
    
    return pipeline
```

### Pattern 2: Alert Configuration

Configure alerts based on log analysis:

```python
ALERT_CONFIGURATIONS = {
    "high_error_rate": {
        "threshold": 0.1,  # 10% error rate
        "duration": "5m",
        "severity": "high",
        "message": "Error rate exceeds threshold"
    },
    "slow_execution": {
        "threshold": 5000,  # 5 seconds
        "duration": "10m",
        "severity": "medium",
        "message": "Execution time exceeds threshold"
    },
    "agent_failure": {
        "threshold": 3,  # 3 consecutive failures
        "duration": "1m",
        "severity": "critical",
        "message": "Agent experiencing failures"
    }
}
```

---

## Common Mistakes

### Mistake 1: Not Handling Missing Data

**Wrong:**
```python
# ❌ Crashes on missing fields
def analyze_duration(log: ParsedLog) -> float:
    return log.duration_ms  # ❌ Crashes if field missing
```

**Correct:**
```python
# ✅ Handles missing fields gracefully
def analyze_duration(log: ParsedLog) -> float:
    return getattr(log, "duration_ms", None) or 0
```

### Mistake 2: Ignoring Time Zone Differences

**Wrong:**
```python
# ❌ Treating all timestamps as same timezone
def analyze_temporal_patterns(logs: list[ParsedLog]):
    # ❌ No timezone normalization
    for log in logs:
        bucket = get_bucket(log.timestamp)  # Different timezones
```

**Correct:**
```python
# ✅ Normalize to UTC
def analyze_temporal_patterns(logs: list[ParsedLog]):
    # ✅ Normalize all timestamps to UTC
    utc_logs = [normalize_to_utc(log) for log in logs]
    
    for log in utc_logs:
        bucket = get_bucket(log.timestamp)
```

### Mistake 3: Not Accounted for Workload Variations

**Wrong:**
```python
# ❌ Comparing different workloads
def analyze_agent_performance(logs: list[ParsedLog]):
    # ❌ No workload context
    avg_duration = sum(l.duration_ms for l in logs) / len(logs)
```

**Correct:**
```python
# ✅ Consider workload context
def analyze_agent_performance(logs: list[ParsedLog]):
    # ✅ Group by workload
    by_workload = group_by_workload(logs)
    
    results = {}
    for workload, workload_logs in by_workload.items():
        results[workload] = {
            "avg_duration": sum(l.duration_ms for l in workload_logs) / len(workload_logs),
            "success_rate": calculate_success_rate(workload_logs)
        }
```

### Mistake 4: No Statistical Significance

**Wrong:**
```python
# ❌ Flagging outliers without statistical significance
def detect_anomalies(logs: list[ParsedLog]):
    mean = sum(durations) / len(durations)
    
    for log in logs:
        if log.duration_ms > mean * 2:  # ❌ No statistical test
            return True
```

**Correct:**
```python
# ✅ Use statistical tests
def detect_anomalies(logs: list[ParsedLog]):
    mean = sum(durations) / len(durations)
    std = calculate_std(durations)
    
    for log in logs:
        z_score = (log.duration_ms - mean) / std
        if z_score > 3:  # ✅ Statistical significance
            return Anomaly(z_score=z_score)
```

### Mistake 5: Over-Prioritizing Recent Data

**Wrong:**
```python
# ❌ Only analyzing recent data
def analyze_trends(logs: list[ParsedLog]):
    recent = logs[-100:]  # ❌ Ignores historical data
    
    return calculate_trend(recent)
```

**Correct:**
```python
# ✅ Balanced time window analysis
def analyze_trends(logs: list[ParsedLog]):
    # Consider recent and historical data
    recent = logs[-100:]
    historical = logs[:100] if len(logs) > 100 else logs
    
    # Compare trends
    recent_trend = calculate_trend(recent)
    historical_trend = calculate_trend(historical)
    
    return {
        "recent": recent_trend,
        "historical": historical_trend,
        "comparison": compare_trends(recent_trend, historical_trend)
    }
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Validation at top of parsing functions
- [ ] **Parsed State:** Logs parsed into structured format
- [ ] **Purity:** Analysis functions are stateless
- [ ] **Fail Fast:** Invalid log format throws clear errors
- [ ] **Readability:** Analysis logic reads as English

### Testing

- [ ] Unit tests for log parsing
- [ ] Integration tests for multi-format support
- [ ] Edge case tests for malformed logs
- [ ] Anomaly detection tests
- [ ] Correlation analysis tests

### Security

- [ ] Log inputs sanitized before parsing
- [ ] Parser configurations validated
- [ ] Resource limits on analysis runs
- [ ] No arbitrary code execution
- [ ] Input length limits enforced

### Performance

- [ ] Log parsing optimized for large files
- [ ] Analysis optimized for streaming data
- [ ] Caching for repeated analysis
- [ ] Memory usage bounded for large datasets
- [ ] Timeout protection for slow analyses

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `agent-error-trace-explainer` | Explain error traces |
| `agent-stacktrace-root-cause` | Root cause analysis |
| `agent-regression-detector` | Detect regressions |
| `agent-failure-mode-analysis` | Failure mode analysis |
| `code-philosophy` | Core correctness principles |

### Core Dependencies

- **Log Parser:** Parse various log formats
- **Temporal Analyzer:** Analyze time-based patterns
- **Agent Analyzer:** Analyze per-agent metrics
- **Anomaly Detector:** Detect statistical outliers
- **Correlation Engine:** Correlate events

### External Resources

- [Log Analysis Techniques](https://example.com/log-analysis) - Log parsing and analysis
- [Time Series Analysis](https://example.com/time-series) - Temporal patterns
- [Anomaly Detection](https://example.com/anomaly-detection) - Statistical outlier detection

---

## Implementation Tracking

### Agent Runtime Log Analyzer - Core Patterns

| Task | Status |
|------|--------|
| Log parsing pipeline | ✅ Complete |
| Temporal analysis | ✅ Complete |
| Agent performance analysis | ✅ Complete |
| Anomaly detection | ✅ Complete |
| Correlation analysis | ✅ Complete |
| Alert configuration | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Log parsing pipeline
- Temporal analysis
- Agent performance analysis
- Anomaly detection
- Correlation analysis

### 1.1.0 (Planned)
- Multi-format log support
- Performance profiling integration
- ML-based anomaly detection
- Alert customization

### 2.0.0 (Future)
- Real-time log analysis
- Predictive log analysis
- Automated log correlation
- Cross-system log analysis

---

## Implementation Prompt (Execution Layer)

When implementing the Runtime Log Analyzer, use this prompt for code generation:

```
Create a Runtime Log Analyzer implementation following these requirements:

1. Core Class: `RuntimeLogAnalyzer`
   - Parse logs from multiple formats
   - Analyze temporal patterns
   - Analyze agent performance
   - Detect anomalies
   - Analyze correlations

2. Key Methods:
   - `parse_logs(logs, format_type)`: Parse logs into structured format
   - `analyze_temporal_patterns(logs)`: Analyze time-based patterns
   - `analyze_agent_performance(logs)`: Per-agent performance analysis
   - `detect_anomalies(logs)`: Detect statistical outliers
   - `analyze_correlations(logs)`: Correlate events

3. Log Formats:
   - JSON format (structured logs)
   - Text format (unstructured logs)
   - Apache/Nginx format (web server logs)
   - Custom format support
   - Auto-detection support

4. Analysis Dimensions:
   - Temporal: Patterns over time
   - Agent: Per-agent metrics
   - Task: Per-task metrics
   - Anomaly: Statistical outliers
   - Correlation: Related events

5. Output Structure:
   - `analysis_type`: Temporal/agent/task/correlation
   - `metrics`: Calculated metrics
   - `patterns`: Detected patterns
   - `anomalies`: Detected anomalies
   - `recommendations`: Actionable insights

6. Performance Metrics:
   - Execution duration (mean, std, min, max)
   - Success rate
   - Error rate
   - Resource utilization
   - Throughput

7. Anomaly Detection:
   - Z-score based detection
   - Percentile-based detection
   - Moving average anomaly
   - Seasonal anomaly detection
   - Multi-dimensional anomaly

8. Correlation Analysis:
   - Error correlation
   - Performance correlation
   - Temporal correlation
   - Cross-agent correlation
   - Task dependency correlation

Follow the 5 Laws of Elegant Defense:
- Guard clauses for validation
- Parse logs at boundary
- Pure analysis functions
- Fail fast on invalid log
- Clear names for all components
```
