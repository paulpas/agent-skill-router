---
name: agent-container-inspector
description: Inspects container configurations, runtime state, logs, and system resources
  for debugging and security analysis.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: debugging
  scope: container
  output-format: analysis
  triggers: container, container inspector, container-inspector, inspects, runtime
  related-skills: agent-add-new-skill, agent-autoscaling-advisor, agent-ci-cd-pipeline-analyzer, agent-confidence-based-selector, agent-diff-quality-analyzer
---


# Container Inspector (Container Runtime Analysis)

> **Load this skill** when designing or modifying container inspection workflows that analyze container configurations, runtime state, logs, and system resources for debugging and security analysis.

## TL;DR Checklist

When inspecting containers:

- [ ] Analyze container configuration and image metadata
- [ ] Check container runtime state and health
- [ ] Inspect logs and stdout/stderr streams
- [ ] Analyze system resources (CPU, memory, disk, network)
- [ ] Verify security configurations and vulnerabilities
- [ ] Check file system integrity and mounted volumes
- [ ] Analyze network connectivity and open ports
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Container Inspector when:

- Debugging container startup or runtime issues
- Inspecting container images for security vulnerabilities
- Analyzing container resource usage and limits
- Investigating log files and application output
- Verifying container configurations match expectations
- Performing security audits of running containers
- Analyzing container filesystem for anomalies

---

## When NOT to Use

Avoid using this skill for:

- Container build issues (use build-inspector)
- Container orchestration issues (use k8s-debugger)
- Real-time container monitoring (use monitoring systems)
- Container development workflow (use development-tools)

---

## Core Concepts

### Container Inspection Layers

```
Container Inspection
├── Image Analysis
│   ├── Metadata (name, tag, digest)
│   ├── Layers (size, digest)
│   ├── Config (environment, commands)
│   └── Vulnerabilities (CVSS scores)
├── Runtime State
│   ├── Status (running, stopped, paused)
│   ├── PID and resources
│   ├── Health checks
│   └── Lifecycle hooks
├── File System
│   ├── Root filesystem
│   ├── Mounted volumes
│   ├── Temporary files
│   └── Configuration files
├── Process Tree
│   ├── Main process
│   ├── Child processes
│   ├── Resource usage
│   └── File descriptors
├── Network
│   ├── Ports exposed
│   ├── Network namespaces
│   ├── DNS configuration
│   └── Traffic analysis
└── Security
    ├── Capabilities
    ├── Privilege level
    ├── SELinux/AppArmor
    └── Read-only filesystem
```

### Container Status Categories

```
┌─────────────────────────────────────────┐
│ Container Status Matrix                 │
├─────────────────────────────────────────┤
│ Running  → Active execution             │
│ Waiting  → Waiting to start             │
│ Stopped  → Execution completed          │
│ Failed   → Execution failed             │
│ Paused   → Suspended execution          │
│ Unknown  → Status undetermined          │
└─────────────────────────────────────────┘
```

### Resource Utilization Patterns

```
┌─────────────────────────────────────────┐
│ Resource Usage Pattern Analysis         │
├─────────────────────────────────────────┤
│ Normal → Steady state usage             │
│ Spike → Temporary high usage            │
│ Leak → Continuous growth                │
│ Burst → Periodic high usage             │
└─────────────────────────────────────────┘
```

---

## Implementation Patterns

### Pattern 1: Container Configuration Analysis

Analyze container configuration from image metadata:

```python
from dataclasses import dataclass
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum


class SecurityRisk(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


@dataclass
class ImageConfig:
    name: str
    tag: str
    digest: str
    created: str
    author: str
    architecture: str
    os: str
    environment: Dict[str, str]
    cmd: List[str]
    entrypoint: List[str]
    volumes: List[str]
    ports: List[int]
    working_dir: str


@dataclass
class SecurityScan:
    vulnerabilities: List[Dict]
    security_warnings: List[str]
    compliance_issues: List[str]
    overall_risk: SecurityRisk


@dataclass
class ContainerConfig:
    image_config: ImageConfig
    runtime_config: Dict
    security_context: Dict
    resource_limits: Dict
    health_check: Dict


def analyze_image_config(image_config: ImageConfig) -> List[Dict]:
    """Analyze container image configuration for issues."""
    issues = []
    
    # Check for common security issues
    if image_config.environment.get("DEBUG", "false").lower() == "true":
        issues.append({
            "type": "debug_enabled",
            "severity": SecurityRisk.MEDIUM,
            "message": "Debug mode is enabled in container environment",
            "recommendation": "Disable debug mode in production"
        })
    
    if image_config.environment.get("DEBUG_PORT"):
        issues.append({
            "type": "debug_port",
            "severity": SecurityRisk.HIGH,
            "message": "Debug port is exposed in container",
            "recommendation": "Remove debug port exposure from production"
        })
    
    # Check for empty or placeholder values
    for key, value in image_config.environment.items():
        if value in ["", "null", "placeholder", "change_me", "TODO"]:
            issues.append({
                "type": "empty_value",
                "severity": SecurityRisk.MEDIUM,
                "message": f"Environment variable {key} has placeholder value",
                "recommendation": "Set proper values for environment variables"
            })
    
    # Check for potentially dangerous configurations
    if image_config.entrypoint and "/bin/sh" in image_config.entrypoint:
        issues.append({
            "type": "shell_entrypoint",
            "severity": SecurityRisk.LOW,
            "message": "Container uses shell as entrypoint",
            "recommendation": "Use direct binary entrypoint for security"
        })
    
    return issues


def analyze_security_context(security_context: Dict) -> List[Dict]:
    """Analyze container security context for issues."""
    issues = []
    
    # Check for privileged container
    if security_context.get("privileged", False):
        issues.append({
            "type": "privileged",
            "severity": SecurityRisk.HIGH,
            "message": "Container is running in privileged mode",
            "recommendation": "Remove privileged flag unless absolutely necessary"
        })
    
    # Check for host namespace access
    if security_context.get("hostNetwork", False):
        issues.append({
            "type": "host_network",
            "severity": SecurityRisk.HIGH,
            "message": "Container has access to host network namespace",
            "recommendation": "Use dedicated network namespace for container"
        })
    
    if security_context.get("hostPID", False):
        issues.append({
            "type": "host_pid",
            "severity": SecurityRisk.HIGH,
            "message": "Container has access to host PID namespace",
            "recommendation": "Use dedicated PID namespace for container"
        })
    
    if security_context.get("hostIPC", False):
        issues.append({
            "type": "host_ipc",
            "severity": SecurityRisk.MEDIUM,
            "message": "Container has access to host IPC namespace",
            "recommendation": "Use dedicated IPC namespace for container"
        })
    
    # Check capabilities
    added_capabilities = security_context.get("capabilities", {}).get("add", [])
    dangerous_capabilities = ["SYS_ADMIN", "NET_RAW", "SYS_PTRACE", "SYS_RAWIO"]
    
    for cap in added_capabilities:
        if cap.upper() in dangerous_capabilities:
            issues.append({
                "type": "dangerous_capability",
                "severity": SecurityRisk.MEDIUM,
                "message": f"Container has dangerous capability: {cap}",
                "recommendation": "Remove unnecessary capabilities"
            })
    
    # Check for root user
    if security_context.get("runAsUser", 0) == 0:
        issues.append({
            "type": "root_user",
            "severity": SecurityRisk.MEDIUM,
            "message": "Container is running as root user",
            "recommendation": "Run as non-root user in production"
        })
    
    return issues
```

### Pattern 2: Container Runtime State Analysis

Analyze runtime state of running containers:

```python
from dataclasses import dataclass
from typing import Dict, List, Optional
from datetime import datetime


@dataclass
class RuntimeMetrics:
    cpu_percent: float
    memory_bytes: int
    memory_limit_bytes: int
    memory_usage_percent: float
    network_bytes_sent: int
    network_bytes_recv: int
    block_read_bytes: int
    block_write_bytes: int


@dataclass
class ProcessInfo:
    pid: int
    name: str
    cpu_percent: float
    memory_bytes: int
    threads: int
    status: str
    parent_pid: Optional[int]


@dataclass
class ContainerRuntimeState:
    name: str
    id: str
    status: str
    pid: int
    uptime_seconds: float
    metrics: RuntimeMetrics
    processes: List[ProcessInfo]
    health_status: str
    restart_count: int
    started_at: datetime
    finished_at: Optional[datetime]


def analyze_runtime_state(state: ContainerRuntimeState) -> List[Dict]:
    """Analyze runtime state for issues."""
    issues = []
    
    # Check health status
    if state.health_status == "unhealthy":
        issues.append({
            "type": "unhealthy",
            "severity": "high",
            "message": "Container health check failed",
            "recommendation": "Check container logs and health check configuration"
        })
    
    # Check restart count
    if state.restart_count > 5:
        issues.append({
            "type": "frequent_restart",
            "severity": "high",
            "message": f"Container has restarted {state.restart_count} times",
            "recommendation": "Investigate cause of crashes"
        })
    
    # Check CPU usage
    if state.metrics.cpu_percent > 90:
        issues.append({
            "type": "high_cpu",
            "severity": "medium",
            "message": f"CPU usage at {state.metrics.cpu_percent:.1f}%",
            "recommendation": "Optimize CPU usage or increase limits"
        })
    
    # Check memory usage
    if state.metrics.memory_usage_percent > 90:
        issues.append({
            "type": "high_memory",
            "severity": "high",
            "message": f"Memory usage at {state.metrics.memory_usage_percent:.1f}%",
            "recommendation": "Optimize memory usage or increase limits"
        })
    
    # Check uptime
    if state.uptime_seconds < 60:  # Less than 1 minute
        issues.append({
            "type": "short_uptime",
            "severity": "medium",
            "message": "Container started very recently",
            "recommendation": "Check for startup issues or crashes"
        })
    
    # Check processes
    for proc in state.processes:
        if proc.status == "Z":  # Zombie process
            issues.append({
                "type": "zombie_process",
                "severity": "medium",
                "message": f"Zombie process detected: {proc.name} (PID: {proc.pid})",
                "recommendation": "Investigate process lifecycle management"
            })
    
    return issues


def analyze_process_tree(state: ContainerRuntimeState) -> Dict:
    """Analyze process tree for issues."""
    analysis = {
        "process_count": len(state.processes),
        "top_processes": [],
        "children_by_parent": {},
        "zombie_count": 0,
        "sleeper_count": 0
    }
    
    # Build parent-child relationships
    process_map = {p.pid: p for p in state.processes}
    
    for proc in state.processes:
        if proc.parent_pid:
            if proc.parent_pid not in analysis["children_by_parent"]:
                analysis["children_by_parent"][proc.parent_pid] = []
            analysis["children_by_parent"][proc.parent_pid].append(proc)
        
        # Count by state
        if proc.status == "Z":
            analysis["zombie_count"] += 1
        elif proc.status == "S":
            analysis["sleeper_count"] += 1
    
    # Find top CPU consumers
    sorted_processes = sorted(state.processes, key=lambda p: p.cpu_percent, reverse=True)
    analysis["top_processes"] = sorted_processes[:5]
    
    return analysis
```

### Pattern 3: Container Log Analysis

Analyze container logs for errors and patterns:

```python
from dataclasses import dataclass
from typing import Dict, List, Optional
from collections import defaultdict
import re


@dataclass
class LogEntry:
    timestamp: str
    level: str
    message: str
    source: str
    file: Optional[str]
    line: Optional[int]


@dataclass
class LogAnalysis:
    total_entries: int
    error_count: int
    warning_count: int
    info_count: int
    level_distribution: Dict[str, int]
    error_patterns: Dict[str, int]
    recent_errors: List[LogEntry]
    error_rate_per_minute: float


def analyze_container_logs(
    logs: List[LogEntry],
    time_window_minutes: int = 5
) -> LogAnalysis:
    """Analyze container logs for issues."""
    
    # Count by level
    level_counts = defaultdict(int)
    for log in logs:
        level_counts[log.level] += 1
    
    # Find error patterns
    error_patterns = defaultdict(int)
    recent_errors = []
    
    for log in logs:
        if log.level in ["ERROR", "CRITICAL", "FATAL"]:
            error_patterns[log.message[:50]] += 1  # Group by first 50 chars
            recent_errors.append(log)
    
    # Calculate error rate
    if time_window_minutes > 0:
        error_rate = len(recent_errors) / time_window_minutes
    else:
        error_rate = 0
    
    return LogAnalysis(
        total_entries=len(logs),
        error_count=level_counts.get("ERROR", 0) + level_counts.get("CRITICAL", 0) + level_counts.get("FATAL", 0),
        warning_count=level_counts.get("WARNING", 0),
        info_count=level_counts.get("INFO", 0),
        level_distribution=dict(level_counts),
        error_patterns=dict(error_patterns),
        recent_errors=recent_errors,
        error_rate_per_minute=error_rate
    )


def detect_error_patterns(logs: List[LogEntry]) -> List[Dict]:
    """Detect recurring error patterns in logs."""
    patterns = []
    
    # Group errors by message
    error_messages = defaultdict(int)
    for log in logs:
        if log.level in ["ERROR", "CRITICAL", "FATAL"]:
            # Normalize message
            normalized = re.sub(r"\d+", "NUM", log.message)
            error_messages[normalized] += 1
    
    # Find recurring patterns
    for message, count in error_messages.items():
        if count >= 3:  # At least 3 occurrences
            patterns.append({
                "pattern": message,
                "count": count,
                "severity": "high" if count >= 10 else "medium"
            })
    
    # Sort by frequency
    patterns.sort(key=lambda x: x["count"], reverse=True)
    
    return patterns


def find_recent_errors(logs: List[LogEntry], minutes: int = 5) -> List[LogEntry]:
    """Find recent errors within time window."""
    recent = []
    now = datetime.now()
    
    for log in logs:
        if log.level in ["ERROR", "CRITICAL", "FATAL"]:
            # Calculate time difference
            log_time = datetime.fromisoformat(log.timestamp.replace("Z", "+00:00"))
            time_diff = (now - log_time).total_seconds() / 60
            
            if time_diff <= minutes:
                recent.append(log)
    
    return recent
```

### Pattern 4: Resource Usage Analysis

Analyze resource usage patterns:

```python
from dataclasses import dataclass
from typing import Dict, List, Tuple
from enum import Enum


class ResourceStatus(Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class ResourceUsage:
    cpu_percent: float
    memory_bytes: int
    memory_limit: int
    memory_usage_percent: float
    disk_bytes: int
    disk_limit: int
    disk_usage_percent: float
    network_rx_bytes: int
    network_tx_bytes: int


def analyze_resource_usage(
    usage: ResourceUsage,
    cpu_limit: float = 100,
    memory_limit: int = 1024 * 1024 * 1024  # 1GB
) -> List[Dict]:
    """Analyze resource usage for issues."""
    issues = []
    
    # CPU analysis
    if usage.cpu_percent > 90:
        issues.append({
            "type": "high_cpu",
            "severity": ResourceStatus.CRITICAL,
            "message": f"CPU usage at {usage.cpu_percent:.1f}%",
            "limit": cpu_limit,
            "recommendation": "Optimize CPU usage or increase limits"
        })
    elif usage.cpu_percent > 75:
        issues.append({
            "type": "elevated_cpu",
            "severity": ResourceStatus.WARNING,
            "message": f"CPU usage at {usage.cpu_percent:.1f}%",
            "recommendation": "Monitor CPU usage trends"
        })
    
    # Memory analysis
    if usage.memory_usage_percent > 95:
        issues.append({
            "type": "high_memory",
            "severity": ResourceStatus.CRITICAL,
            "message": f"Memory usage at {usage.memory_usage_percent:.1f}%",
            "used_bytes": usage.memory_bytes,
            "limit_bytes": usage.memory_limit,
            "recommendation": "Investigate memory leak or increase limits"
        })
    elif usage.memory_usage_percent > 85:
        issues.append({
            "type": "elevated_memory",
            "severity": ResourceStatus.WARNING,
            "message": f"Memory usage at {usage.memory_usage_percent:.1f}%",
            "recommendation": "Monitor memory usage trends"
        })
    
    # Disk analysis
    if usage.disk_usage_percent > 95:
        issues.append({
            "type": "high_disk",
            "severity": ResourceStatus.CRITICAL,
            "message": f"Disk usage at {usage.disk_usage_percent:.1f}%",
            "recommendation": "Clean up disk space or increase capacity"
        })
    
    # Check for OOM risk
    if usage.memory_usage_percent > 80:
        oom_risk = (usage.memory_limit - usage.memory_bytes) / max(usage.memory_bytes, 1)
        if oom_risk < 0.2:  # Less than 20% headroom
            issues.append({
                "type": "oom_risk",
                "severity": ResourceStatus.WARNING,
                "message": "Low memory headroom - OOM risk",
                "recommendation": "Reduce memory usage or increase limits"
            })
    
    return issues


def analyze_resource_trends(
    usage_history: List[ResourceUsage],
    time_window: str = "1h"
) -> Dict:
    """Analyze resource usage trends."""
    trends = {
        "cpu": analyze_trend([u.cpu_percent for u in usage_history]),
        "memory": analyze_trend([u.memory_usage_percent for u in usage_history]),
        "disk": analyze_trend([u.disk_usage_percent for u in usage_history]),
        "network_rx": analyze_trend([u.network_rx_bytes for u in usage_history]),
        "network_tx": analyze_trend([u.network_tx_bytes for u in usage_history])
    }
    
    return trends


def analyze_trend(values: List[float]) -> Dict:
    """Analyze trend in a series of values."""
    if len(values) < 2:
        return {"trend": "insufficient_data"}
    
    # Calculate simple linear regression
    n = len(values)
    x = list(range(n))
    y = values
    
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    
    # Calculate slope
    numerator = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    denominator = sum((x[i] - mean_x) ** 2 for i in range(n))
    
    slope = numerator / denominator if denominator != 0 else 0
    
    # Determine trend
    if slope > 0.01:
        trend = "increasing"
    elif slope < -0.01:
        trend = "decreasing"
    else:
        trend = "stable"
    
    return {
        "trend": trend,
        "slope": slope,
        "current": values[-1],
        "min": min(values),
        "max": max(values),
        "average": mean_y
    }
```

### Pattern 5: Security Analysis

Perform comprehensive security analysis of containers:

```python
def analyze_container_security(container_config: ContainerConfig) -> SecurityScan:
    """Perform comprehensive security analysis."""
    scan_results = {
        "vulnerabilities": [],
        "security_warnings": [],
        "compliance_issues": [],
        "overall_risk": SecurityRisk.NONE
    }
    
    # Analyze image config
    image_issues = analyze_image_config(container_config.image_config)
    for issue in image_issues:
        scan_results["security_warnings"].append({
            "source": "image_config",
            **issue
        })
    
    # Analyze security context
    security_issues = analyze_security_context(container_config.security_context)
    for issue in security_issues:
        scan_results["compliance_issues"].append({
            "source": "security_context",
            **issue
        })
    
    # Check for known vulnerabilities
    vuln_issues = check_image_vulnerabilities(container_config.image_config)
    scan_results["vulnerabilities"].extend(vuln_issues)
    
    # Calculate overall risk
    scan_results["overall_risk"] = calculate_overall_risk(scan_results)
    
    return SecurityScan(**scan_results)


def check_image_vulnerabilities(image_config: ImageConfig) -> List[Dict]:
    """Check for known vulnerabilities in image."""
    # In real implementation, this would query vulnerability database
    vulnerabilities = []
    
    # Check for known dangerous base images
    dangerous_images = ["ubuntu:14.04", "alpine:3.5", "node:8"]
    for dangerous in dangerous_images:
        if dangerous in image_config.name:
            vulnerabilities.append({
                "image": image_config.name,
                "vulnerability": "outdated_base_image",
                "severity": SecurityRisk.HIGH,
                "recommendation": "Update to supported base image"
            })
    
    # Check for deprecated packages (would query package manager)
    # In real implementation, this would scan installed packages
    
    return vulnerabilities


def calculate_overall_risk(scan_results: Dict) -> SecurityRisk:
    """Calculate overall security risk."""
    # Count issues by severity
    high_issues = 0
    medium_issues = 0
    low_issues = 0
    
    for issue in scan_results.get("vulnerabilities", []):
        if issue.get("severity") == SecurityRisk.HIGH:
            high_issues += 1
        elif issue.get("severity") == SecurityRisk.MEDIUM:
            medium_issues += 1
        else:
            low_issues += 1
    
    for issue in scan_results.get("security_warnings", []):
        if issue.get("severity") == SecurityRisk.HIGH:
            high_issues += 1
        elif issue.get("severity") == SecurityRisk.MEDIUM:
            medium_issues += 1
        else:
            low_issues += 1
    
    for issue in scan_results.get("compliance_issues", []):
        if issue.get("severity") == SecurityRisk.HIGH:
            high_issues += 1
        elif issue.get("severity") == SecurityRisk.MEDIUM:
            medium_issues += 1
        else:
            low_issues += 1
    
    # Determine overall risk
    if high_issues > 0:
        return SecurityRisk.HIGH
    elif medium_issues > 2:
        return SecurityRisk.MEDIUM
    elif medium_issues > 0 or low_issues > 5:
        return SecurityRisk.MEDIUM
    elif low_issues > 0:
        return SecurityRisk.LOW
    else:
        return SecurityRisk.NONE
```

---

## Common Patterns

### Pattern 1: Container Health Dashboard

Create a health dashboard for container inspection:

```python
class ContainerHealthDashboard:
    """Dashboard for container health monitoring."""
    
    def __init__(self, container_name: str):
        self.container_name = container_name
        self.checks = {
            "config": [],
            "runtime": [],
            "logs": [],
            "security": []
        }
    
    def add_check(self, category: str, result: Dict):
        """Add a check result to dashboard."""
        self.checks[category].append(result)
    
    def get_overall_health(self) -> str:
        """Get overall container health status."""
        all_issues = []
        for category_issues in self.checks.values():
            all_issues.extend(category_issues)
        
        critical_count = sum(1 for i in all_issues if i.get("severity") in ["critical", "high"])
        warning_count = sum(1 for i in all_issues if i.get("severity") == "medium")
        
        if critical_count > 0:
            return "critical"
        elif warning_count > 2:
            return "warning"
        elif all_issues:
            return "degraded"
        else:
            return "healthy"
    
    def generate_report(self) -> str:
        """Generate human-readable health report."""
        lines = [
            f"Container Health Report: {self.container_name}",
            "=" * 50,
            f"Overall Health: {self.get_overall_health().upper()}",
            ""
        ]
        
        for category, issues in self.checks.items():
            if issues:
                lines.append(f"{category.upper()} Issues:")
                for issue in issues:
                    lines.append(f"  - [{issue.get('severity', 'unknown').upper()}] {issue.get('message')}")
                lines.append("")
        
        return "\n".join(lines)


def inspect_container_health(container_name: str) -> str:
    """Inspect and report on container health."""
    dashboard = ContainerHealthDashboard(container_name)
    
    # Run all checks
    config = get_container_config(container_name)
    state = get_container_state(container_name)
    logs = get_container_logs(container_name, minutes=5)
    
    config_issues = analyze_image_config(config.image_config)
    for issue in config_issues:
        dashboard.add_check("config", issue)
    
    state_issues = analyze_runtime_state(state)
    for issue in state_issues:
        dashboard.add_check("runtime", issue)
    
    log_analysis = analyze_container_logs(logs)
    for pattern in detect_error_patterns(logs):
        dashboard.add_check("logs", pattern)
    
    security = analyze_container_security(config)
    for issue in security.security_warnings:
        dashboard.add_check("security", issue)
    
    return dashboard.generate_report()
```

### Pattern 2: Automated Container Scan

Automated security and configuration scan:

```python
def scan_container(container_name: str) -> Dict:
    """Perform comprehensive container scan."""
    results = {
        "container": container_name,
        "timestamp": datetime.now().isoformat(),
        "checks": {},
        "overall_status": "pass"
    }
    
    # Get container data
    config = get_container_config(container_name)
    state = get_container_state(container_name)
    logs = get_container_logs(container_name, minutes=5)
    
    # Run checks
    config_issues = analyze_image_config(config.image_config)
    results["checks"]["config"] = {
        "total_issues": len(config_issues),
        "critical": sum(1 for i in config_issues if i.get("severity") == SecurityRisk.HIGH),
        "warnings": sum(1 for i in config_issues if i.get("severity") == SecurityRisk.MEDIUM)
    }
    
    state_issues = analyze_runtime_state(state)
    results["checks"]["runtime"] = {
        "total_issues": len(state_issues),
        "critical": sum(1 for i in state_issues if i.get("severity") == "high"),
        "warnings": sum(1 for i in state_issues if i.get("severity") == "medium")
    }
    
    log_analysis = analyze_container_logs(logs)
    error_patterns = detect_error_patterns(logs)
    results["checks"]["logs"] = {
        "total_entries": log_analysis.total_entries,
        "error_count": log_analysis.error_count,
        "error_patterns": len(error_patterns)
    }
    
    security = analyze_container_security(config)
    results["checks"]["security"] = {
        "overall_risk": security.overall_risk.value,
        "vulnerabilities": len(security.vulnerabilities),
        "warnings": len(security.security_warnings),
        "compliance_issues": len(security.compliance_issues)
    }
    
    # Determine overall status
    critical_count = (
        results["checks"]["config"]["critical"] +
        results["checks"]["runtime"]["critical"]
    )
    
    if critical_count > 0:
        results["overall_status"] = "fail"
    elif any(
        results["checks"][cat]["warnings"] > 0 
        for cat in ["config", "runtime", "security"]
    ):
        results["overall_status"] = "warning"
    
    return results
```

---

## Common Mistakes

### Mistake 1: Not Checking Health Status

**Wrong:**
```python
# ❌ Only checking if container is running
if container.status == "running":
    print("Container is healthy")
# Not checking actual health status
```

**Correct:**
```python
# ✅ Check all status aspects
def is_container_healthy(container: ContainerRuntimeState) -> bool:
    return (
        container.status == "running" and
        container.health_status == "healthy" and
        container.restart_count < 5 and
        not any(p.status == "Z" for p in container.processes)
    )
```

### Mistake 2: Ignoring Resource Trends

**Wrong:**
```python
# ❌ Only checking current resource usage
if usage.cpu_percent > 80:
    print("High CPU usage")
# Not tracking if usage is increasing over time
```

**Correct:**
```python
# ✅ Check trends
trends = analyze_trend(usage_history)
if trends["trend"] == "increasing" and trends["current"] > 50:
    print("CPU usage is increasing and trending high")
```

### Mistake 3: Not Analyzing Security Context

**Wrong:**
```python
# ❌ Not checking security configuration
container = get_container("my-app")
print(f"Container status: {container.status}")
# Missing security analysis
```

**Correct:**
```python
# ✅ Check security configuration
config = get_container_config("my-app")
security_issues = analyze_security_context(config.security_context)

for issue in security_issues:
    print(f"[{issue['severity']}] {issue['message']}")
```

### Mistake 4: Not Filtering Log Noise

**Wrong:**
```python
# ❌ Processing all log entries
logs = get_container_logs()
for log in logs:
    process_log(log)
# Including noisy INFO logs
```

**Correct:**
```python
# ✅ Filter for important logs
def get_important_logs(logs: List[LogEntry]) -> List[LogEntry]:
    return [
        log for log in logs
        if log.level in ["ERROR", "CRITICAL", "FATAL", "WARNING"]
    ]

important_logs = get_important_logs(get_container_logs())
```

### Mistake 5: Not Handling Container Lifecycle States

**Wrong:**
```python
# ❌ Assuming all containers are running
state = get_container_state("my-app")
analyze_runtime_state(state)
# Might be stopped or paused
```

**Correct:**
```python
# ✅ Handle all lifecycle states
def analyze_container(container_name: str) -> Dict:
    state = get_container_state(container_name)
    
    if state.status == "running":
        return analyze_runtime_state(state)
    elif state.status == "stopped":
        return {"status": "stopped", "message": "Container is not running"}
    elif state.status == "waiting":
        return {"status": "waiting", "message": "Container is waiting to start"}
    elif state.status == "failed":
        return {"status": "failed", "message": "Container has failed"}
    else:
        return {"status": state.status, "message": "Unknown state"}
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Validation of container state before analysis
- [ ] **Parsed State:** Raw container data parsed into typed structures
- [ ] **Purity:** Analysis functions are stateless
- [ ] **Fail Loud:** Invalid container data throws clear errors
- [ ] **Readability:** Analysis results read like inspection report

### Testing

- [ ] Unit tests for configuration analysis
- [ ] Integration tests for runtime analysis
- [ ] Security analysis tests
- [ ] Log parsing tests
- [ ] Edge case tests (stopped containers, missing data)

### Security

- [ ] Container inspection requires appropriate permissions
- [ ] Sensitive data redacted from reports
- [ ] Audit logging for inspection operations
- [ ] No arbitrary code execution in analysis
- [ ] Access control for container inspection

### Performance

- [ ] Container inspection optimized for speed
- [ ] Logging collection can be disabled
- [ ] Caching for frequently accessed data
- [ ] Parallel inspection for multiple containers

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `k8s-debugger` | Kubernetes cluster debugging |
| `resource-optimizer` | Optimize resource usage |
| `code-philosophy` | Container-aware design patterns |
| `security-analyzer` | General security analysis |
| `network-diagnostics` | Network connectivity analysis |

### Core Dependencies

- **Container Engine Client:** Docker/Podman API client
- **Log Parser:** Parse and analyze log files
- **Security Scanner:** Vulnerability scanning
- **Analyzer:** Analyze container state

### External Resources

- [OCI Image Spec](https://github.com/opencontainers/image-spec) - Image format
- [Container Runtime Interface](https://kubernetes.io/docs/concepts/overview/) - CRI
- [Docker Security](https://docs.docker.com/develop/security-best-practices/) - Security best practices

---

## Implementation Tracking

### Agent Container Inspector - Core Patterns

| Task | Status |
|------|--------|
| Configuration analysis | ✅ Complete |
| Runtime state analysis | ✅ Complete |
| Log analysis | ✅ Complete |
| Resource usage analysis | ✅ Complete |
| Security analysis | ✅ Complete |
| Health dashboard | ✅ Complete |
| Automated scanning | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Configuration analysis
- Runtime state analysis
- Log parsing and analysis
- Resource usage monitoring
- Security context analysis

### 1.1.0 (Planned)
- Image vulnerability scanning
- Process tree analysis
- Network analysis
- Filesystem inspection

### 2.0.0 (Future)
- ML-based anomaly detection
- Automated remediation
- Multi-container analysis
- Real-time inspection

---

## Implementation Prompt (Execution Layer)

When implementing the Container Inspector, use this prompt for code generation:

```
Create a Container Inspector implementation following these requirements:

1. Core Classes:
   - `ContainerConfig`: Container configuration and image metadata
   - `ContainerRuntimeState`: Runtime state and metrics
   - `SecurityScan`: Security analysis results
   - `ContainerHealthDashboard`: Health monitoring dashboard

2. Key Methods:
   - `analyze_image_config(image_config)`: Analyze image configuration
   - `analyze_security_context(security_context)`: Check security settings
   - `analyze_runtime_state(state)`: Analyze running container
   - `analyze_container_logs(logs)`: Parse and analyze logs
   - `analyze_resource_usage(usage)`: Monitor resource utilization
   - `scan_container(container_name)`: Comprehensive security scan

3. Data Structures:
   - ContainerConfig with image metadata, security context, resource limits
   - ContainerRuntimeState with metrics, processes, health status
   - LogEntry with timestamp, level, message, source
   - ResourceUsage with CPU, memory, disk, network metrics

4. Analysis Categories:
   - Image configuration analysis
   - Security context evaluation
   - Runtime state monitoring
   - Log parsing and pattern detection
   - Resource usage tracking and trends
   - Security vulnerability scanning

5. Configuration Options:
   - severity_threshold: Minimum severity to report
   - log_retention: How long to keep logs
   - scan_depth: How thorough to scan
   - timeout: Operation timeouts

6. Output Features:
   - Human-readable health report
   - JSON data for automation
   - Security findings summary
   - Trend analysis for resources
   - Actionable recommendations

7. Integration Points:
   - Container runtime API (Docker/Podman/CRI)
   - Log storage systems
   - Security databases
   - Monitoring systems

8. Error Handling:
   - Graceful degradation for missing data
   - Timeout handling for slow operations
   - Retry logic for transient failures
   - Detailed error messages

Follow the 5 Laws of Elegant Defense:
- Guard clauses for container data validation
- Parse container state into typed structures
- Pure analysis functions
- Fail fast on invalid container state
- Clear names for all components
```
