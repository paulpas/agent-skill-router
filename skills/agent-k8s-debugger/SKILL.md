---
name: agent-k8s-debugger
description: Diagnoses Kubernetes cluster issues, debug pods, deployments, and cluster
  components using structured debugging workflows.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: debugging
  scope: kubernetes
  output-format: analysis
  triggers: container orchestration, diagnoses, k8s, k8s debugger, k8s-debugger, kubernetes-debugger, kubernetes
  related-skills: agent-code-correctness-verifier, agent-confidence-based-selector, agent-error-trace-explainer, agent-multi-skill-executor
---



# Kubernetes Debugger (Cluster Issue Diagnosis)

> **Load this skill** when designing or modifying Kubernetes debugging workflows that diagnose cluster issues, debug pods and deployments, and analyze cluster health.

## TL;DR Checklist

When debugging Kubernetes issues:

- [ ] Identify cluster, node, pod, and container issues
- [ ] Check resource limits, requests, and utilization
- [ ] Analyze pod logs, events, and status
- [ ] Verify configurations: deployments, services, ingress
- [ ] Diagnose networking issues between components
- [ ] Check storage volumes and claims
- [ ] Analyze cluster resource usage and scheduling
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Kubernetes Debugger when:

- Pods are not running or failing to start
- Services are not reachable or returning errors
- Cluster resources are exhausted or misconfigured
- Deployments are not updating correctly
- Network connectivity issues between components
- Persistent storage problems or volume mount failures
- Cluster-wide performance or scheduling issues

---

## When NOT to Use

Avoid using this skill for:

- Simple configuration changes (use kubectl apply)
- Direct code debugging (use code-philosophy)
- Real-time monitoring (use Kubernetes monitoring tools)
- Security incident response (use security-specialist)

---

## Core Concepts

### Kubernetes Debugging Hierarchy

```
Cluster
├── Nodes
│   ├── kubelet status
│   ├── container runtime
│   ├── network plugins
│   └── resource usage
├── Namespaces
│   ├── Pod Disruption Budgets
│   ├── Resource Quotas
│   └── Network Policies
├── Deployments
│   ├── ReplicaSet status
│   ├── Pod templates
│   └── Update strategy
├── Pods
│   ├── Containers
│   ├── Init containers
│   └── Ephemeral storage
└── Services
    ├── ClusterIP, NodePort, LoadBalancer
    ├── Endpoints
    └── Service mesh integration
```

### Common Issue Categories

#### 1. Pod Issues

```
┌─────────────────────────────────────┐
│ Pod Status Analysis                 │
├─────────────────────────────────────┤
│ Pending  → Scheduling failures     │
│ ImagePullBackOff → Image issues    │
│ CrashLoopBackOff → Container failures│
│ Evicted  → Resource pressure       │
│ OOMKilled → Memory exhaustion      │
└─────────────────────────────────────┘
```

#### 2. Service Issues

```
┌─────────────────────────────────────┐
│ Service Connectivity Analysis       │
├─────────────────────────────────────┤
│ ClusterIP → Internal networking    │
│ NodePort → Node-level accessibility│
│ LoadBalancer → External accessibility│
│ Ingress → HTTP routing             │
└─────────────────────────────────────┘
```

#### 3. Resource Issues

```
┌─────────────────────────────────────┐
│ Resource Utilization Analysis       │
├─────────────────────────────────────┤
│ CPU Throttling → Insufficient CPU  │
│ OOM → Insufficient memory          │
│ Pending → Insufficient cluster resources│
│ Evicted → Node resource pressure   │
└─────────────────────────────────────┘
```

---

## Implementation Patterns

### Pattern 1: Pod Status Diagnosis

Diagnose pod issues from status information:

```python
from dataclasses import dataclass
from enum import Enum
from typing import List, Dict, Optional
from datetime import datetime


class PodPhase(str, Enum):
    PENDING = "Pending"
    RUNNING = "Running"
    SUCCEEDED = "Succeeded"
    FAILED = "Failed"
    UNKNOWN = "Unknown"


class ContainerState(str, Enum):
    WAITING = "Waiting"
    RUNNING = "Running"
    TERMINATED = "Terminated"


@dataclass
class ContainerStatus:
    name: str
    state: ContainerState
    ready: bool
    restart_count: int
    image: str
    reasons: List[str]
    
    @property
    def is_healthy(self) -> bool:
        return self.ready and self.state == ContainerState.RUNNING


@dataclass
class PodInfo:
    name: str
    namespace: str
    phase: PodPhase
    ready_containers: int
    total_containers: int
    container_statuses: List[ContainerStatus]
    restart_count: int
    age: str
    node_name: Optional[str]
    conditions: List[Dict]
    events: List[Dict]


def diagnose_pod_status(pod: PodInfo) -> List[Dict]:
    """Diagnose issues from pod status."""
    diagnostics = []
    
    # Phase-based diagnostics
    if pod.phase == PodPhase.PENDING:
        diagnostics.append({
            "type": "scheduling",
            "severity": "high",
            "message": "Pod is pending, checking scheduling constraints",
            "suggestion": "Check resource quotas, node selectors, and taints"
        })
        
        # Check scheduling failures
        for condition in pod.conditions:
            if condition.get("type") == "PodScheduled" and condition.get("status") == "False":
                diagnostics.append({
                    "type": "scheduling_failure",
                    "severity": "critical",
                    "message": f"Scheduling failed: {condition.get('message', 'Unknown reason')}",
                    "suggestion": "Check node resources and pod affinity rules"
                })
    
    elif pod.phase == PodPhase.FAILED:
        for container in pod.container_statuses:
            if container.state == ContainerState.TERMINATED:
                diagnostics.append({
                    "type": "container_crash",
                    "severity": "critical",
                    "message": f"Container {container.name} terminated",
                    "reason": container.reasons[0] if container.reasons else "Unknown",
                    "suggestion": "Check container logs and exit codes"
                })
    
    elif pod.phase == PodPhase.RUNNING:
        # Check container readiness
        for container in pod.container_statuses:
            if not container.is_healthy:
                diagnostics.append({
                    "type": "container_not_ready",
                    "severity": "high",
                    "message": f"Container {container.name} is not ready",
                    "reason": container.reasons[0] if container.reasons else "Unknown",
                    "suggestion": "Check container logs and health checks"
                })
    
    # Check restart counts
    if pod.restart_count > 10:
        diagnostics.append({
            "type": "频繁重启",
            "severity": "medium",
            "message": f"Pod has restarted {pod.restart_count} times",
            "suggestion": "Investigate root cause of crashes"
        })
    
    return sorted(diagnostics, key=lambda x: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(x["severity"], 4))
```

### Pattern 2: Resource Issue Diagnosis

Diagnose resource-related issues:

```python
def diagnose_resource_issues(
    pod: PodInfo,
    node_info: Dict,
    cluster_resources: Dict
) -> List[Dict]:
    """Diagnose resource-related issues."""
    diagnostics = []
    
    # Check OOM (Out of Memory)
    oom_events = [e for e in pod.events if e.get("reason") == "OOMKilling"]
    if oom_events:
        diagnostics.append({
            "type": "oom",
            "severity": "critical",
            "message": "Pod was OOM killed",
            "suggestion": "Increase memory limits or optimize memory usage"
        })
    
    # Check CPU throttling
    if pod.phase == PodPhase.RUNNING:
        # Check if CPU requests exceed limits
        for container in pod.container_statuses:
            if container.state == ContainerState.RUNNING:
                # Would check actual metrics in real implementation
                pass
    
    # Check scheduling issues due to resources
    if pod.phase == PodPhase.PENDING:
        unschedulable_reasons = [
            condition for condition in pod.conditions
            if condition.get("type") == "PodScheduled" 
            and condition.get("status") == "False"
        ]
        
        for reason in unschedulable_reasons:
            reason_msg = reason.get("message", "")
            if "insufficient cpu" in reason_msg.lower():
                diagnostics.append({
                    "type": "cpu_resource",
                    "severity": "high",
                    "message": "Insufficient CPU resources",
                    "suggestion": "Reduce CPU requests or add cluster capacity"
                })
            elif "insufficient memory" in reason_msg.lower():
                diagnostics.append({
                    "type": "memory_resource",
                    "severity": "high",
                    "message": "Insufficient memory resources",
                    "suggestion": "Reduce memory requests or add cluster capacity"
                })
    
    return diagnostics


def analyze_resource_utilization(
    pod: PodInfo,
    metrics: Dict
) -> List[Dict]:
    """Analyze resource utilization efficiency."""
    diagnostics = []
    
    # Check CPU
    if "cpu_usage" in metrics:
        cpu_request = pod.total_containers * 100  # Example request
        cpu_limit = pod.total_containers * 200  # Example limit
        
        if metrics["cpu_usage"] > cpu_limit * 0.9:
            diagnostics.append({
                "type": "cpu_limit",
                "severity": "high",
                "message": "CPU usage near limit",
                "suggestion": "Increase CPU limits or optimize CPU usage"
            })
        
        if metrics["cpu_usage"] < cpu_request * 0.3:
            diagnostics.append({
                "type": "cpu_overprovisioned",
                "severity": "low",
                "message": "CPU underutilized",
                "suggestion": "Consider reducing CPU requests"
            })
    
    # Check memory
    if "memory_usage" in metrics:
        memory_request = pod.total_containers * 256 * 1024 * 1024  # 256MB per container
        
        if metrics["memory_usage"] > memory_request * 0.9:
            diagnostics.append({
                "type": "memory_limit",
                "severity": "high",
                "message": "Memory usage near limit",
                "suggestion": "Increase memory limits or optimize memory usage"
            })
    
    return diagnostics
```

### Pattern 3: Service Connectivity Diagnosis

Diagnose service connectivity issues:

```python
def diagnose_service_connectivity(
    service: Dict,
    endpoints: List[Dict],
    pods: List[PodInfo],
    ingress: Optional[Dict] = None
) -> List[Dict]:
    """Diagnose service connectivity issues."""
    diagnostics = []
    
    # Check endpoint availability
    if not endpoints:
        diagnostics.append({
            "type": "no_endpoints",
            "severity": "critical",
            "message": "Service has no endpoints",
            "suggestion": "Check pod selectors and pod status"
        })
    
    # Check endpoint health
    unhealthy_endpoints = [
        ep for ep in endpoints
        if not ep.get("addresses") or not ep.get("ports")
    ]
    if unhealthy_endpoints:
        diagnostics.append({
            "type": "unhealthy_endpoints",
            "severity": "high",
            "message": f"{len(unhealthy_endpoints)} endpoints are unhealthy",
            "suggestion": "Check endpoint readiness and service port configuration"
        })
    
    # Check port configuration
    service_ports = {p["name"] for p in service.get("spec", {}).get("ports", [])}
    endpoint_ports = {
        ep.get("name") 
        for ep in endpoints 
        for ep_ports in ep.get("ports", [])
    }
    
    if not service_ports.issubset(endpoint_ports):
        diagnostics.append({
            "type": "port_mismatch",
            "severity": "high",
            "message": "Service ports not available in endpoints",
            "suggestion": "Check service port configuration and pod container ports"
        })
    
    # Check ingress configuration
    if ingress:
        ingress_rules = ingress.get("spec", {}).get("rules", [])
        for rule in ingress_rules:
            http_rules = rule.get("http", {}).get("paths", [])
            for path in http_rules:
                backend_service = path.get("backend", {}).get("service", {})
                if backend_service.get("name") == service.get("metadata", {}).get("name"):
                    # Ingress points to this service
                    if not backend_service.get("port", {}).get("name") in service_ports:
                        diagnostics.append({
                            "type": "ingress_port_mismatch",
                            "severity": "high",
                            "message": "Ingress backend port not found in service",
                            "suggestion": "Check ingress and service port configurations"
                        })
    
    return diagnostics
```

### Pattern 4: Deployment Update Diagnosis

Diagnose deployment update issues:

```python
def diagnose_deployment_updates(
    deployment: Dict,
    replicaset: Dict,
    pods: List[PodInfo]
) -> List[Dict]:
    """Diagnose deployment update issues."""
    diagnostics = []
    
    # Check replica count
    desired_replicas = deployment.get("spec", {}).get("replicas", 0)
    ready_replicas = deployment.get("status", {}).get("readyReplicas", 0)
    
    if ready_replicas < desired_replicas:
        diagnostics.append({
            "type": "replica_shortfall",
            "severity": "high",
            "message": f"Desired: {desired_replicas}, Ready: {ready_replicas}",
            "suggestion": "Check pod status and resource availability"
        })
    
    # Check update status
    update_progress = deployment.get("status", {}).get("updatedReplicas", 0)
    revision = deployment.get("status", {}).get("collisionCount", 0)
    
    if update_progress < desired_replicas:
        conditions = deployment.get("status", {}).get("conditions", [])
        for condition in conditions:
            if condition.get("type") == "Progressing":
                if condition.get("status") == "False":
                    diagnostics.append({
                        "type": "update_stalled",
                        "severity": "critical",
                        "message": f"Update stalled: {condition.get('message', 'Unknown')}",
                        "suggestion": "Check for resource issues and pod failures"
                    })
    
    # Check for failed pods in deployment
    failed_pods = [p for p in pods if p.phase == PodPhase.FAILED]
    if failed_pods:
        diagnostics.append({
            "type": "failed_pods",
            "severity": "high",
            "message": f"{len(failed_pods)} pods are failing",
            "suggestion": "Check pod logs and restart policies"
        })
    
    # Check revision
    if revision > 1:
        diagnostics.append({
            "type": "revision_conflict",
            "severity": "medium",
            "message": f"Deployment has {revision} collisions",
            "suggestion": "Review deployment strategy and update frequency"
        })
    
    return diagnostics
```

### Pattern 5: Cluster Health Diagnosis

Diagnose cluster-wide health issues:

```python
def diagnose_cluster_health(
    nodes: List[Dict],
    pods: List[PodInfo],
    system_components: List[Dict]
) -> List[Dict]:
    """Diagnose cluster-wide health issues."""
    diagnostics = []
    
    # Check node health
    not_ready_nodes = [
        node for node in nodes
        if node.get("status", {}).get("conditions", [])
        and not any(
            c.get("type") == "Ready" and c.get("status") == "True"
            for c in node.get("status", {}).get("conditions", [])
        )
    ]
    
    if not_ready_nodes:
        diagnostics.append({
            "type": "unhealthy_nodes",
            "severity": "critical",
            "message": f"{len(not_ready_nodes)} nodes are not ready",
            "details": [n.get("metadata", {}).get("name") for n in not_ready_nodes],
            "suggestion": "Check node conditions and kubelet status"
        })
    
    # Check resource exhaustion
    total_cpu_request = sum(
        int(p.get("spec", {}).get("containers", [{}])[0].get("resources", {}).get("requests", {}).get("cpu", "0").rstrip("m"))
        for p in pods
    )
    total_cpu_capacity = sum(
        int(node.get("status", {}).get("allocatable", {}).get("cpu", "0").rstrip("m"))
        for node in nodes
    )
    
    if total_cpu_request > total_cpu_capacity * 0.9:
        diagnostics.append({
            "type": "cpu_exhausted",
            "severity": "high",
            "message": f"CPU requests ({total_cpu_request}m) near capacity ({total_cpu_capacity}m)",
            "suggestion": "Reduce resource requests or add nodes"
        })
    
    # Check system component health
    unhealthy_components = [
        comp for comp in system_components
        if not comp.get("healthy", True)
    ]
    
    if unhealthy_components:
        diagnostics.append({
            "type": "unhealthy_system_components",
            "severity": "critical",
            "message": f"{len(unhealthy_components)} system components are unhealthy",
            "details": [comp.get("name") for comp in unhealthy_components],
            "suggestion": "Check component logs and status"
        })
    
    # Check pod disruption
    eviction_quota = 10  # Example
    current_evictions = sum(1 for p in pods if p.phase == PodPhase.PENDING)
    
    if current_evictions > eviction_quota:
        diagnostics.append({
            "type": "eviction_pressure",
            "severity": "high",
            "message": f"{current_evictions} pods pending eviction",
            "suggestion": "Check PDBs and node resources"
        })
    
    return diagnostics
```

---

## Common Patterns

### Pattern 1: Debugging Workflow

Standard debugging workflow for common issues:

```python
class KubernetesDebugWorkflow:
    """Standard Kubernetes debugging workflow."""
    
    def __init__(self):
        self.steps = [
            self.check_pod_status,
            self.check_resource_usage,
            self.check_service_connectivity,
            self.check_deployment_health,
            self.check_cluster_health
        ]
    
    def run_debug(self, cluster_info: Dict) -> List[Dict]:
        """Run full debugging workflow."""
        all_diagnostics = []
        
        for step in self.steps:
            diagnostics = step(cluster_info)
            all_diagnostics.extend(diagnostics)
        
        # Sort by severity
        all_diagnostics.sort(
            key=lambda x: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(x["severity"], 4)
        )
        
        return all_diagnostics
    
    def check_pod_status(self, cluster_info: Dict) -> List[Dict]:
        """Check pod status diagnostics."""
        pods = cluster_info.get("pods", [])
        diagnostics = []
        
        for pod in pods:
            pod_diags = diagnose_pod_status(PodInfo(**pod))
            for diag in pod_diags:
                diag["pod"] = pod.get("metadata", {}).get("name")
            diagnostics.extend(pod_diags)
        
        return diagnostics
    
    # Other check methods...
```

### Pattern 2: Automated Debug Report

Generate automated debug reports:

```python
def generate_debug_report(cluster_info: Dict) -> str:
    """Generate comprehensive debug report."""
    lines = [
        "=" * 60,
        "Kubernetes Debug Report",
        "=" * 60,
        f"Generated: {datetime.now().isoformat()}",
        ""
    ]
    
    # Run all diagnostics
    workflow = KubernetesDebugWorkflow()
    diagnostics = workflow.run_debug(cluster_info)
    
    # Summary
    severity_counts = {}
    for diag in diagnostics:
        severity = diag.get("severity", "unknown")
        severity_counts[severity] = severity_counts.get(severity, 0) + 1
    
    lines.append("Summary:")
    for severity in ["critical", "high", "medium", "low"]:
        count = severity_counts.get(severity, 0)
        lines.append(f"  {severity.upper()}: {count}")
    lines.append("")
    
    # Detailed diagnostics
    if diagnostics:
        lines.append("Detailed Diagnostics:")
        lines.append("-" * 60)
        
        for i, diag in enumerate(diagnostics[:20], 1):  # Top 20
            lines.append(f"{i}. [{diag['severity'].upper()}] {diag['type']}")
            lines.append(f"   Message: {diag['message']}")
            if "suggestion" in diag:
                lines.append(f"   Suggestion: {diag['suggestion']}")
            if "pod" in diag:
                lines.append(f"   Pod: {diag['pod']}")
            lines.append("")
    else:
        lines.append("No issues detected")
    
    return "\n".join(lines)
```

---

## Common Mistakes

### Mistake 1: Not Checking Pod Conditions

**Wrong:**
```python
# ❌ Only checking pod phase
if pod.phase == PodPhase.PENDING:
    print("Pod is pending")
# Missing scheduling failures, resource issues
```

**Correct:**
```python
# ✅ Check all pod conditions
def get_pod_issues(pod: PodInfo) -> List[str]:
    issues = []
    
    for condition in pod.conditions:
        if condition.get("status") == "False":
            issues.append(f"{condition.get('type')}: {condition.get('message', 'Unknown')}")
    
    return issues
```

### Mistake 2: Ignoring Event History

**Wrong:**
```python
# ❌ Not analyzing events
events = k8s_client.get_events(namespace)
# Just showing events without analysis
```

**Correct:**
```python
# ✅ Analyze events for patterns
def analyze_events(events: List[Dict]) -> Dict[str, int]:
    """Analyze events for frequency and types."""
    event_counts = defaultdict(int)
    
    for event in events:
        event_counts[event.get("reason", "unknown")] += 1
    
    return dict(event_counts)

# Check for repeated errors
frequent_errors = {k: v for k, v in counts.items() if v > 5}
```

### Mistake 3: Not Correlating Across Resources

**Wrong:**
```python
# ❌ Checking deployment without checking pods
deployment = get_deployment("my-app")
replicas = deployment.spec.replicas
# Not checking if pods are actually running
```

**Correct:**
```python
# ✅ Correlate deployment with pods
def verify_deployment_health(deployment: Dict, pods: List[PodInfo]) -> bool:
    """Verify deployment is healthy by checking pods."""
    deployment_name = deployment.get("metadata", {}).get("name")
    
    # Get pods belonging to this deployment
    deployment_pods = [
        p for p in pods
        if deployment_name in p.name
    ]
    
    # Check ready replicas
    ready_count = sum(1 for p in deployment_pods if p.phase == PodPhase.RUNNING)
    desired_count = deployment.get("spec", {}).get("replicas", 0)
    
    return ready_count >= desired_count * 0.8  # 80% threshold
```

### Mistake 4: Not Checking Network Policies

**Wrong:**
```python
# ❌ Not considering network policies
service = get_service("my-service")
endpoint = get_endpoints("my-service")
# Assuming connectivity without checking network policies
```

**Correct:**
```python
# ✅ Check network policies
def verify_connectivity_with_network_policies(
    service: Dict,
    pods: List[PodInfo]
) -> List[Dict]:
    """Verify connectivity considering network policies."""
    diagnostics = []
    
    # Get network policies affecting the namespace
    namespace = service.get("metadata", {}).get("namespace")
    policies = network_policy_client.list(namespace=namespace)
    
    # Check if policies allow traffic
    for policy in policies:
        if policy.affects(service):
            if not policy.allows_traffic_from(pods):
                diagnostics.append({
                    "type": "network_policy_blocked",
                    "message": "Traffic blocked by network policy",
                    "policy": policy.name
                })
    
    return diagnostics
```

### Mistake 5: Not Validating Cluster Configuration

**Wrong:**
```python
# ❌ Assuming cluster configuration is correct
config = load_kubeconfig()
client = K8sClient(config)
# Not validating the configuration
```

**Correct:**
```python
# ✅ Validate cluster configuration
def validate_cluster_config(config: Dict) -> List[Dict]:
    """Validate Kubernetes cluster configuration."""
    diagnostics = []
    
    # Check server connectivity
    try:
        server_version = get_server_version(config)
    except ConnectionError:
        diagnostics.append({
            "type": "server_connectivity",
            "severity": "critical",
            "message": "Cannot connect to Kubernetes API server",
            "suggestion": "Check network connectivity and API server status"
        })
        return diagnostics
    
    # Check authentication
    try:
        validate_permissions(config)
    except PermissionError:
        diagnostics.append({
            "type": "authentication",
            "severity": "critical",
            "message": "Authentication failed",
            "suggestion": "Check credentials and RBAC configuration"
        })
    
    # Check required components
    required_components = ["kube-apiserver", "kube-controller-manager", "etcd"]
    for component in required_components:
        if not is_component_running(config, component):
            diagnostics.append({
                "type": "component_missing",
                "severity": "critical",
                "message": f"Required component {component} is not running",
                "suggestion": "Check component status and logs"
            })
    
    return diagnostics
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Diagnosis handles empty inputs
- [ ] **Parsed State:** Raw Kubernetes data parsed into structured types
- [ ] **Purity:** Diagnosis functions are stateless
- [ ] **Fail Loud:** Invalid Kubernetes data throws clear errors
- [ ] **Readability:** Diagnostics read like debugging guide

### Testing

- [ ] Unit tests for pod diagnostics
- [ ] Integration tests for service connectivity
- [ ] End-to-end tests for cluster health
- [ ] Edge case tests (empty clusters, missing resources)
- [ ] Error handling tests

### Security

- [ ] Kubernetes credentials properly secured
- [ ] RBAC permissions checked before operations
- [ ] Audit logging for debugging operations
- [ ] Sensitive data redacted from logs
- [ ] Access control for cluster resources

### Performance

- [ ] API calls batched where possible
- [ ] Caching for frequently accessed resources
- [ ] Parallel checking for independent resources
- [ ] Timeout handling for slow operations

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `container-inspector` | Inspect individual containers |
| `resource-optimizer` | Optimize resource usage |
| `network-diagnostics` | Network connectivity analysis |
| `code-philosophy` | Kubernetes-aware design patterns |
| `performance-profiler` | Performance profiling in clusters |

### Core Dependencies

- **K8s Client:** Kubernetes API client
- **Diagnostic Engine:** Run diagnostics
- **Reporter:** Generate human-readable reports
- **Analyzer:** Analyze cluster state

### External Resources

- [Kubernetes Debugging](https://kubernetes.io/docs/tasks/debug/) - Official docs
- [kubectl-debug](https://github.com/AliyunContainerService/kubectl-debug) - Debug plugin
- [Kubevious](https://kubevious.io) - Kubernetes validation

---

## Implementation Tracking

### Agent Kubernetes Debugger - Core Patterns

| Task | Status |
|------|--------|
| Pod diagnosis | ✅ Complete |
| Resource diagnosis | ✅ Complete |
| Service connectivity | ✅ Complete |
| Deployment updates | ✅ Complete |
| Cluster health | ✅ Complete |
| Workflow implementation | ✅ Complete |
| Report generation | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Pod status diagnosis
- Resource issue diagnosis
- Service connectivity analysis
- Deployment update analysis
- Cluster health checks

### 1.1.0 (Planned)
- Network policy diagnosis
- Ingress routing analysis
- Persistent volume issues
- StatefulSet diagnostics

### 2.0.0 (Future)
- ML-based issue prediction
- Automated remediation
- Multi-cluster诊断
- Real-time monitoring integration

---

## Implementation Prompt (Execution Layer)

When implementing the Kubernetes Debugger, use this prompt for code generation:

```
Create a Kubernetes Debugger implementation following these requirements:

1. Core Classes:
   - `PodInfo`: Pod status and container information
   - `ContainerStatus`: Individual container state
   - `KubernetesDebugWorkflow`: Standard debugging workflow
   - `DebugReportGenerator`: Generate human-readable reports

2. Key Methods:
   - `diagnose_pod_status(pod)`: Diagnose pod issues
   - `diagnose_resource_issues(pod, node_info, cluster_resources)`: Resource problems
   - `diagnose_service_connectivity(service, endpoints, pods)`: Service issues
   - `diagnose_deployment_updates(deployment, replicaset, pods)`: Deployment issues
   - `diagnose_cluster_health(nodes, pods, system_components)`: Cluster-wide issues

3. Data Structures:
   - PodInfo with phase, container_statuses, conditions, events
   - ContainerStatus with state, ready, restart_count, reasons
   - DebugReport with summary, detailed diagnostics, suggestions

4. Diagnosis Categories:
   - Pod status (pending, running, failed)
   - Resource issues (OOM, throttling, scheduling)
   - Service connectivity (endpoints, ports, ingress)
   - Deployment updates (replicas, progress, collisions)
   - Cluster health (nodes, components, eviction)

5. Configuration Options:
   - severity_threshold: Minimum severity to include
   - timeout: API call timeouts
   - cache_duration: Caching duration
   - parallel_threads: Parallel checking threads

6. Output Features:
   - Human-readable debug report
   - JSON data for automation
   - Actionable suggestions
   - Severity-based filtering

7. Kubernetes Integration:
   - API client integration
   - kubectl command generation
   - Log fetching
   - Exec into pods support

8. Error Handling:
   - Graceful degradation
   - Retry logic for transient failures
   - Timeout handling
   - Detailed error messages

Follow the 5 Laws of Elegant Defense:
- Guard clauses for K8s data validation
- Parse K8s resources into typed structures
- Pure diagnosis functions
- Fail fast on invalid K8s state
- Clear names for all components
```
