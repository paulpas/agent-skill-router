---
name: agent-network-diagnostics
description: Diagnoses network connectivity issues, identifies bottlenecks, and provides actionable resolution strategies for distributed systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: debugging
  scope: analysis
  output-format: analysis
  triggers: network diagnostics, network-diagnostics, connectivity issues, bottlenecks, network analysis
---

# Network Diagnostics (Connectivity Analysis)

> **Load this skill** when designing or modifying network diagnostic pipelines that identify connectivity issues, measure latency distributions, and provide actionable resolution strategies for distributed systems.

## TL;DR Checklist

When diagnosing network connectivity issues:

- [ ] Identify connection failures and timeout patterns
- [ ] Measure latency distributions across service endpoints
- [ ] Analyze bandwidth utilization and throughput constraints
- [ ] Detect packet loss and retransmission patterns
- [ ] Map network topology and identify choke points
- [ ] Correlate network metrics with application performance
- [ ] Generate actionable resolution recommendations
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use Network Diagnostics when:

- Investigating intermittent connection failures
- Analyzing slow response times across service boundaries
- Identifying network bottlenecks in distributed systems
- Troubleshooting timeout issues and retry logic
- Mapping network topology for optimization opportunities
- Correlating network metrics with application performance degradation

---

## When NOT to Use

Avoid using Network Diagnostics for:

- Single-endpoint performance issues (use application profiling)
- Non-network-related latency (use CPU/memory profiling)
- Real-time network monitoring (use dedicated monitoring systems)
- Environments where network access is restricted
- Tasks where network access is not a concern

---

## Core Concepts

### Network Diagnostic Scope

Network diagnostics operate across multiple layers:

```
Network Diagnostic Scope
├── Layer 3: IP Connectivity
│   ├── ICMP Ping Analysis
│   ├── Route Tracing (Traceroute)
│   └── DNS Resolution
├── Layer 4: Transport Layer
│   ├── TCP Connection Analysis
│   ├── Port Availability
│   └── Latency Distribution
├── Layer 7: Application Layer
│   ├── HTTP Request Analysis
│   ├── API Response Times
│   └── Service Mesh Tracing
└── Infrastructure Layer
    ├── Bandwidth Utilization
    ├── Packet Loss Analysis
    └── Network Topology Mapping
```

### Key Metrics

#### 1. Latency Metrics

```
RTT (Round-Trip Time) = Time to First Byte + Time to Last Byte
P50 = Median latency
P95 = 95th percentile latency (acceptable threshold)
P99 = 99th percentile latency (critical threshold)
```

#### 2. Connectivity Metrics

```
Success Rate = (Successes / Attempts) × 100
Timeout Rate = (Timeouts / Attempts) × 100
Connection Failure Rate = (Failures / Attempts) × 100
```

#### 3. Throughput Metrics

```
Bandwidth Utilization = Data Transferred / Time
Packet Retransmission Rate = Retransmissions / Total Packets
Throughput Efficiency = Actual Throughput / Theoretical Max
```

### Diagnostic Strategies

#### 1. Active Probing
```
发起连接测试:
- ICMP Ping: Basic connectivity
- TCP Connect: Port availability
- HTTP GET: Application-level reachability
```

#### 2. Passive Monitoring
```
收集现有流量:
- Packet capture analysis
- Flow record aggregation
- Log correlation
```

#### 3. Topology Analysis
```
映射网络结构:
- Service discovery integration
- Dependency graph construction
- Choke point identification
```

---

## Implementation Patterns

### Pattern 1: Connection Probe

Probe network endpoints for connectivity status:

```python
from dataclasses import dataclass
from typing import Optional
import asyncio
import socket
import time


@dataclass
class ConnectionResult:
    endpoint: str
    port: int
    success: bool
    latency_ms: float
    error: Optional[str] = None


async def probe_endpoint(
    host: str,
    port: int,
    timeout: float = 5.0
) -> ConnectionResult:
    """Probe a network endpoint for connectivity."""
    start_time = time.perf_counter()
    
    try:
        # Try IPv4 first
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        await asyncio.get_event_loop().sock_connect(sock, (host, port))
        sock.close()
        
        latency_ms = (time.perf_counter() - start_time) * 1000
        return ConnectionResult(
            endpoint=f"{host}:{port}",
            port=port,
            success=True,
            latency_ms=latency_ms
        )
        
    except socket.timeout:
        return ConnectionResult(
            endpoint=f"{host}:{port}",
            port=port,
            success=False,
            latency_ms=(time.perf_counter() - start_time) * 1000,
            error="Connection timeout"
        )
        
    except OSError as e:
        return ConnectionResult(
            endpoint=f"{host}:{port}",
            port=port,
            success=False,
            latency_ms=(time.perf_counter() - start_time) * 1000,
            error=str(e)
        )
```

### Pattern 2: Latency Distribution Analysis

Analyze latency patterns across multiple probes:

```python
from dataclasses import dataclass
from typing import List
import statistics


@dataclass
class LatencyDistribution:
    endpoint: str
    samples: List[float]
    p50: float
    p95: float
    p99: float
    max_latency: float
    min_latency: float
    standard_deviation: float
    
    def is_healthy(self, p95_threshold: float = 100.0) -> bool:
        """Check if latency is within acceptable bounds."""
        return self.p95 <= p95_threshold


def analyze_latency_distribution(
    results: List[ConnectionResult],
    endpoint: str
) -> LatencyDistribution:
    """Analyze latency distribution from probe results."""
    latencies = [r.latency_ms for r in results if r.success]
    
    if not latencies:
        return LatencyDistribution(
            endpoint=endpoint,
            samples=[],
            p50=0.0,
            p95=0.0,
            p99=0.0,
            max_latency=0.0,
            min_latency=0.0,
            standard_deviation=0.0
        )
    
    sorted_latencies = sorted(latencies)
    n = len(sorted_latencies)
    
    return LatencyDistribution(
        endpoint=endpoint,
        samples=sorted_latencies,
        p50=sorted_latencies[n // 2],
        p95=sorted_latencies[int(n * 0.95)],
        p99=sorted_latencies[int(n * 0.99)],
        max_latency=max(latencies),
        min_latency=min(latencies),
        standard_deviation=statistics.stdev(latencies) if n > 1 else 0.0
    )
```

### Pattern 3: Connectivity Health Score

Calculate overall network health score:

```python
from dataclasses import dataclass
from typing import List


@dataclass
class ConnectivityHealth:
    overall_score: float
    endpoints_healthy: int
    endpoints_degraded: int
    endpoints_failed: int
    issues: List[dict]
    
    def is_healthy(self) -> bool:
        """Check if network is considered healthy."""
        return (
            self.endpoints_failed == 0 and
            self.endpoints_degraded == 0 and
            self.overall_score >= 95.0
        )


def calculate_health_score(
    results: List[ConnectionResult],
    latency_thresholds: dict = None
) -> ConnectivityHealth:
    """Calculate overall connectivity health score."""
    if latency_thresholds is None:
        latency_thresholds = {
            "warning": 50.0,
            "critical": 200.0
        }
    
    healthy = 0
    degraded = 0
    failed = 0
    issues = []
    
    for result in results:
        if not result.success:
            failed += 1
            issues.append({
                "type": "connection_failed",
                "endpoint": result.endpoint,
                "error": result.error
            })
        elif result.latency_ms <= latency_thresholds["warning"]:
            healthy += 1
        elif result.latency_ms <= latency_thresholds["critical"]:
            degraded += 1
            issues.append({
                "type": "high_latency",
                "endpoint": result.endpoint,
                "latency_ms": result.latency_ms,
                "threshold_ms": latency_thresholds["critical"]
            })
        else:
            failed += 1
            issues.append({
                "type": "critical_latency",
                "endpoint": result.endpoint,
                "latency_ms": result.latency_ms,
                "threshold_ms": latency_thresholds["critical"]
            })
    
    total = len(results)
    if total == 0:
        score = 100.0
    else:
        score = (healthy / total) * 100
    
    return ConnectivityHealth(
        overall_score=score,
        endpoints_healthy=healthy,
        endpoints_degraded=degraded,
        endpoints_failed=failed,
        issues=issues
    )
```

### Pattern 4: Network Topology Mapping

Map service dependencies and network paths:

```python
from dataclasses import dataclass, field
from typing import Dict, List, Set
from collections import defaultdict


@dataclass
class NetworkNode:
    service_name: str
    endpoint: str
    latency_to: Dict[str, float] = field(default_factory=dict)
    dependencies: Set[str] = field(default_factory=set)
    status: str = "unknown"
    
    def add_dependency(self, service: str, latency: float = 0.0):
        self.dependencies.add(service)
        self.latency_to[service] = latency


@dataclass
class TopologyMap:
    nodes: Dict[str, NetworkNode] = field(default_factory=dict)
    
    def add_node(self, node: NetworkNode):
        self.nodes[node.service_name] = node
    
    def find_choke_points(self) -> List[str]:
        """Identify services with highest dependency count."""
        choke_points = []
        for service, node in self.nodes.items():
            if len(node.dependencies) > 3:
                choke_points.append(service)
        return choke_points
    
    def find_bottlenecks(self, threshold_ms: float = 100.0) -> List[dict]:
        """Find high-latency connections."""
        bottlenecks = []
        for service, node in self.nodes.items():
            for dependent, latency in node.latency_to.items():
                if latency > threshold_ms:
                    bottlenecks.append({
                        "from": service,
                        "to": dependent,
                        "latency_ms": latency
                    })
        return bottlenecks
```

### Pattern 5: Diagnostic Report Generation

Generate comprehensive diagnostic reports:

```python
from dataclasses import dataclass
from typing import List, Dict


@dataclass
class DiagnosticReport:
    timestamp: str
    target_services: List[str]
    connectivity_health: ConnectivityHealth
    latency_profiles: Dict[str, LatencyDistribution]
    topology_insights: List[dict]
    recommendations: List[str]
    
    def to_markdown(self) -> str:
        """Generate markdown report."""
        lines = [
            "# Network Diagnostic Report",
            f"**Generated:** {self.timestamp}",
            f"**Services Analyzed:** {len(self.target_services)}",
            "",
            "## Connectivity Health",
            f"- **Overall Score:** {self.connectivity_health.overall_score:.1f}%",
            f"- **Healthy:** {self.connectivity_health.endpoints_healthy}",
            f"- **Degraded:** {self.connectivity_health.endpoints_degraded}",
            f"- **Failed:** {self.connectivity_health.endpoints_failed}",
            ""
        ]
        
        if self.connectivity_health.issues:
            lines.append("## Issues Found")
            for issue in self.connectivity_health.issues:
                lines.append(f"- **{issue['type'].upper()}:** {issue.get('endpoint', 'N/A')} - {issue.get('error', 'N/A')}")
            lines.append("")
        
        if self.recommendations:
            lines.append("## Recommendations")
            for recommendation in self.recommendations:
                lines.append(f"- {recommendation}")
            lines.append("")
        
        return "\n".join(lines)
```

---

## Common Patterns

### Pattern 1: Parallel Endpoint Probing

Probe multiple endpoints concurrently:

```python
import asyncio


async def probe_endpoints_parallel(
    endpoints: List[tuple],
    max_concurrent: int = 10
) -> List[ConnectionResult]:
    """Probe multiple endpoints concurrently."""
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def limited_probe(host: str, port: int):
        async with semaphore:
            return await probe_endpoint(host, port)
    
    tasks = [
        limited_probe(host, port)
        for host, port in endpoints
    ]
    
    return await asyncio.gather(*tasks)
```

### Pattern 2: Retry with Exponential Backoff

Handle transient failures with retry logic:

```python
async def probe_with_retry(
    host: str,
    port: int,
    max_retries: int = 3,
    base_delay: float = 0.1
) -> ConnectionResult:
    """Probe with exponential backoff retry logic."""
    last_result = None
    
    for attempt in range(max_retries):
        result = await probe_endpoint(host, port)
        
        if result.success:
            return result
        
        last_result = result
        
        if attempt < max_retries - 1:
            delay = base_delay * (2 ** attempt)
            await asyncio.sleep(delay)
    
    return last_result
```

### Pattern 3: Latency Threshold Alerting

Alert on latency threshold violations:

```python
def check_latency_thresholds(
    distribution: LatencyDistribution,
    thresholds: dict
) -> List[dict]:
    """Check latency distribution against thresholds."""
    alerts = []
    
    if distribution.p50 > thresholds.get("p50_warning", 50.0):
        alerts.append({
            "level": "warning",
            "metric": "p50_latency",
            "value": distribution.p50,
            "threshold": thresholds["p50_warning"]
        })
    
    if distribution.p95 > thresholds.get("p95_critical", 100.0):
        alerts.append({
            "level": "critical",
            "metric": "p95_latency",
            "value": distribution.p95,
            "threshold": thresholds["p95_critical"]
        })
    
    if distribution.p99 > thresholds.get("p99_critical", 200.0):
        alerts.append({
            "level": "critical",
            "metric": "p99_latency",
            "value": distribution.p99,
            "threshold": thresholds["p99_critical"]
        })
    
    return alerts
```

---

## Common Mistakes

### Mistake 1: Not Accounting for Network Variability

**Wrong:**
```python
# ❌ Single probe doesn't capture network variability
result = probe_endpoint("api.example.com", 443)
if not result.success:
    raise NetworkError("API unreachable")
```

**Correct:**
```python
# ✅ Multiple probes for statistical significance
results = await probe_endpoints_parallel([
    ("api.example.com", 443) for _ in range(10)
])
health = calculate_health_score(results)
if health.endpoints_failed > 3:
    raise NetworkError("API unreachable")
```

### Mistake 2: Ignoring Time-of-Day Effects

**Wrong:**
```python
# ❌ Diagnosing at single point in time
health = diagnose_network()
# Missing nightly backup traffic patterns
```

**Correct:**
```python
# ✅ Time-aware diagnostic window
async def diagnose_over_time(services: List[str], duration: int):
    """Diagnose network over time period."""
    samples = []
    start_time = time.time()
    
    while time.time() - start_time < duration:
        results = await probe_endpoints_parallel([
            (s, 443) for s in services
        ])
        health = calculate_health_score(results)
        samples.append(health)
        await asyncio.sleep(5)  # Sample every 5 seconds
    
    return samples
```

### Mistake 3: Not Correlating with Application Performance

**Wrong:**
```python
# ❌ Network diagnostics in isolation
network_health = diagnose_network()
app_health = check_application_health()
# No correlation between network and app issues
```

**Correct:**
```python
# ✅ Correlate network and application metrics
async def correlated_diagnostic():
    network_start = time.perf_counter()
    network_health = await diagnose_network()
    network_duration = time.perf_counter() - network_start
    
    app_start = time.perf_counter()
    app_health = await check_application_health()
    app_duration = time.perf_counter() - app_start
    
    if network_duration > app_duration * 2:
        return {
            "issue": "network_latency_affecting_app",
            "network_time": network_duration,
            "app_time": app_duration
        }
```

### Mistake 4: Over-Probing and Causing Network Congestion

**Wrong:**
```python
# ❌ Aggressive probing causing issues
async def aggressive_probe():
    while True:
        # Probe every 100ms - too aggressive
        results = await probe_endpoints_parallel(all_endpoints)
        await asyncio.sleep(0.1)
```

**Correct:**
```python
# ✅ Conservative probing with rate limiting
async def conservative_probe(services: List[str]):
    # Probe each service every 30 seconds
    while True:
        for service in services:
            result = await probe_with_retry(service, 443)
            store_result(service, result)
            await asyncio.sleep(30)  # Rate limit
```

### Mistake 5: Not Handling Partial Failures Gracefully

**Wrong:**
```python
# ❌ All-or-nothing approach
results = await probe_endpoints_parallel(all_endpoints)
if any(not r.success for r in results):
    raise NetworkError("Some endpoints failed")
```

**Correct:**
```python
# ✅ Graceful partial failure handling
results = await probe_endpoints_parallel(all_endpoints)
health = calculate_health_score(results)

if health.endpoints_failed == 0:
    return {"status": "healthy", "health": health}

if health.endpoints_failed < len(results) * 0.5:
    return {
        "status": "degraded",
        "health": health,
        "recommendation": "Monitor closely, investigate failing endpoints"
    }

return {
    "status": "critical",
    "health": health,
    "recommendation": "Immediate investigation required"
}
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Validation of network parameters at function start
- [ ] **Parsed State:** Raw probe data parsed into typed ConnectionResult
- [ ] **Purity:** Probe functions don't mutate global state
- [ ] **Fail Loud:** Invalid network states throw descriptive errors
- [ ] **Readability:** Network diagnostics read like troubleshooting guide

### Testing

- [ ] Unit tests for individual probe functions
- [ ] Integration tests for parallel probing
- [ ] Latency distribution analysis tests
- [ ] Health score calculation tests
- [ ] Topology mapping tests

### Security

- [ ] Network probes don't expose sensitive information
- [ ] Connection strings sanitized before logging
- [ ] Rate limiting prevents network abuse
- [ ] Diagnostic data encrypted in transit
- [ ] Access controls on diagnostic endpoints

### Performance

- [ ] Concurrent probing with controlled parallelism
- [ ] Efficient data structures for large topologies
- [ ] Memory profiling for large-scale diagnostics
- [ ] Timeout handling for stuck connections
- [ ] Resource cleanup on cancellation

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `latency-analyzer` | Detailed latency distribution analysis |
| `hot-path-detector` | Identify critical network paths |
| `resource-optimizer` | Optimize network resource usage |
| `ci-cd-pipeline-analyzer` | Diagnose CI/CD pipeline network issues |
| `infra-drift-detector` | Detect infrastructure drift affecting network |

### Core Dependencies

- **Probe:** Network endpoint probing mechanism
- **Analyzer:** Analyzes probe results
- **Topology:** Maps service dependencies
- **Reporter:** Generates diagnostic reports

### External Resources

- [RFC 768 - UDP](https://tools.ietf.org/html/rfc768) - User Datagram Protocol
- [RFC 793 - TCP](https://tools.ietf.org/html/rfc793) - Transmission Control Protocol
- [HTTP/2 Specification](https://http2.github.io) - HTTP/2 Protocol
- [gRPC Documentation](https://grpc.io/docs) - Remote Procedure Call

---

## Implementation Tracking

### Agent Network Diagnostics - Core Patterns

| Task | Status |
|------|--------|
| Connection probe | ✅ Complete |
| Latency distribution analysis | ✅ Complete |
| Health score calculation | ✅ Complete |
| Topology mapping | ✅ Complete |
| Report generation | ✅ Complete |
| Parallel probing | ✅ Complete |
| Retry with backoff | ✅ Complete |
| Threshold alerting | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Basic connection probing
- Latency distribution analysis
- Health score calculation
- Topology mapping
- Report generation

### 1.1.0 (Planned)
- TCP state machine analysis
- TLS handshake diagnostics
- DNS resolution profiling
- Load balancer health checks

### 2.0.0 (Future)
- ML-based anomaly detection
- Predictive capacity planning
- Automated remediation
- Cross-cloud network diagnostics

---

## Implementation Prompt (Execution Layer)

When implementing the Network Diagnostics skill, use this prompt for code generation:

```
Create a Network Diagnostics implementation following these requirements:

1. Core Classes:
   - ConnectionResult: Stores probe results (success, latency, error)
   - LatencyDistribution: Analyzes latency percentiles
   - ConnectivityHealth: Overall network health score
   - NetworkNode: Represents service in topology map
   - TopologyMap: Service dependency graph
   - DiagnosticReport: Comprehensive diagnostic report

2. Key Methods:
   - probe_endpoint(host, port, timeout): Single endpoint probe
   - analyze_latency_distribution(results, endpoint): Latency percentiles
   - calculate_health_score(results, thresholds): Health score 0-100
   - probe_endpoints_parallel(endpoints, max_concurrent): Concurrent probing
   - probe_with_retry(host, port, max_retries, base_delay): Retry logic
   - check_latency_thresholds(distribution, thresholds): Alert thresholds
   - generate_diagnostic_report(...): Markdown report generation

3. Data Structures:
   - ConnectionResult with success, latency_ms, error fields
   - LatencyDistribution with p50, p95, p99 percentiles
   - ConnectivityHealth with score, healthy/degraded/failed counts
   - NetworkNode with dependencies and latency_to map
   - TopologyMap with nodes and choke point detection

4. Probe Strategies:
   - TCP Connect: Port availability
   - HTTP GET: Application-level reachability
   - ICMP Ping: Basic connectivity

5. Configuration Options:
   - timeout: Connection timeout in seconds
   - max_concurrent: Parallel probe limit
   - retry_count: Maximum retry attempts
   - thresholds: Latency thresholds for alerts
   - sample_interval: For continuous monitoring

6. Output Features:
   - Human-readable markdown reports
   - Health score (0-100)
   - Choke point identification
   - Bottleneck detection
   - Actionable recommendations

7. Error Handling:
   - Timeout handling
   - Connection refused detection
   - DNS resolution failures
   - Graceful partial failures

Follow the 5 Laws of Elegant Defense:
- Guard clauses for input validation
- Parse raw probe data into types
- Pure probe functions
- Fail fast on invalid state
- Clear names for all components
```
