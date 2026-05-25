---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Implements comprehensive Kubernetes debugging workflow with pod inspection,
  log analysis, resource debugging, network troubleshooting, and common failure pattern
  diagnosis using kubectl commands.
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: agent-docker-debugging, agent-network-troubleshooting, cncf-prometheus
  role: implementation
  scope: implementation
  triggers: kubernetes debugging, k8s troubleshooting, pod crashes, node failures,
    cluster debugging, kubectl debug, container logs, k8s errors
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
name: kubernetes-debugging
------
# Kubernetes Cluster Debugging

Implements systematic debugging workflows for Kubernetes clusters using kubectl commands to diagnose pod issues, node failures, network problems, resource constraints, and common failure patterns.

## TL;DR Checklist

- [ ] **Step 1:** Check pod status and events with `kubectl get pods -A -o wide` and `kubectl describe pod <pod> -n <namespace>`
- [ ] **Step 2:** Retrieve container logs with `kubectl logs <pod> -n <namespace> --tail=100 --previous`
- [ ] **Step 3:** Exec into container for interactive debugging with `kubectl exec -it <pod> -n <namespace> -- /bin/sh`
- [ ] **Step 4:** Inspect node conditions and resource usage with `kubectl get nodes` and `kubectl describe node <node>`
- [ ] **Step 5:** Test network connectivity between pods with `kubectl run test-pod --rm -it --image=busybox -- ping <service>`
- [ ] **Step 6:** Check resource constraints (OOM, CPU throttling) with `kubectl top pods` and `kubectl describe pod <pod>`
- [ ] **Step 7:** Use kubectl debug for temporary containers with `kubectl debug -it <pod> --image=busybox -- sh`
- [ ] **Step 8:** Diagnose cluster components with `kubectl get --raw=/readyz` and `kubectl logs -n kube-system <component-pod>`

---

## When to Use

Use this skill when:

- Pods are stuck in `Pending`, `CrashLoopBackOff`, `ImagePullBackOff`, or `ErrImagePull` states
- Applications are failing but logs show no obvious errors
- Network connectivity issues between services (service-to-service, pod-to-pod)
- Resource constraints causing OOMKilled or CPU throttling
- Nodes showing `NotReady` or resource pressure conditions
- Cluster components (api-server, controller-manager, scheduler) showing issues

---

## When NOT to Use

Avoid this skill for:

- **Application logic debugging** — Use application-specific debugging skills instead of Kubernetes-level debugging
- **Code-level performance profiling** — Use dedicated profiling tools (pprof, flame graphs) rather than kubectl commands
- **CI/CD pipeline failures** — Use agent-docker-debugging skill for build container issues
- **Cloud provider infrastructure issues** — Use cloud-specific debugging skills (AWS, GCP, Azure)
- **Security incident response** — Use dedicated security auditing skills instead of general debugging

---

## Core Workflow

### Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Kubernetes Debugging Flow                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│  1. Pod Status Check → 2. Log Analysis → 3. Resource Debugging →               │
│         ↓                            ↓                              ↓           │
│  4. Network Troubleshooting → 5. Node Debugging → 6. Cluster Debugging         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

1. **Assess Pod Health** — Check pod status, restart counts, and recent events. **Checkpoint:** Identify the exact failure state (Pending, CrashLoopBackOff, ImagePullBackOff, etc.) before proceeding.

2. **Extract Logs** — Retrieve container logs including previous crash dumps. **Checkpoint:** Confirm whether logs exist and show clear error messages before moving to resource debugging.

3. **Check Resource Constraints** — Inspect OOMKilled events, CPU throttling, and resource limits. **Checkpoint:** Verify if resource exhaustion is causing failures before investigating network issues.

4. **Test Network Connectivity** — Verify pod-to-pod, service-to-service, and external connectivity. **Checkpoint:** Confirm network policies and DNS resolution are working before checking node-level issues.

5. **Inspect Node Health** — Check node conditions, resource availability, and system processes. **Checkpoint:** Verify nodes are `Ready` and have sufficient resources before diagnosing cluster components.

6. **Diagnose Cluster Components** — Examine api-server, controller-manager, scheduler, and etcd logs. **Checkpoint:** Confirm cluster control plane is healthy before escalating to infrastructure team.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Pod Status and Event Analysis

**Description:** Diagnose pod issues by examining status, events, and restart counts.

**Step-by-Step:**
1. List all pods across namespaces
2. Describe specific pod for detailed events
3. Check restart counts and exit codes

```bash
# List all pods with extended columns
kubectl get pods -A -o wide --sort-by='.status.startTime'

# Describe specific pod to see events and conditions
kubectl describe pod nginx-deployment-7d9c5d9f8c-abc12 -n production

# Filter pods by status
kubectl get pods --field-selector=status.phase=Running -A
kubectl get pods --field-selector=status.phase=Pending -A

# Check restart history
kubectl get pods -n production -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].restartCount}{"\n"}{end}'
```

**Example Output Analysis:**

```bash
$ kubectl describe pod nginx-deployment-7d9c5d9f8c-abc12 -n production
Name:         nginx-deployment-7d9c5d9f8c-abc12
Namespace:    production
Priority:     0
Node:         worker-node-1/10.0.0.11
Start Time:   Mon, 04 May 2026 10:30:00 +0000
Labels:       app=nginx
              pod-template-hash=7d9c5d9f8c
Status:       Running
Containers:
  nginx:
    Container ID:   containerd://abc123def456
    Image:          nginx:1.21
    State:          Running
      Started:      Mon, 04 May 2026 10:30:05 +0000
    Ready:          True
    Restart Count:  0
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  2m    default-scheduler  Successfully assigned production/nginx-deployment-7d9c5d9f8c-abc12 to worker-node-1
  Normal  Pulled     2m    kubelet            Container image "nginx:1.21" already present on machine
  Normal  Created    2m    kubelet            Created container nginx
  Normal  Started    2m    kubelet            Started container nginx
```

**BAD vs GOOD**

```bash
# ❌ BAD — Only checking running pods, missing failed pods
kubectl get pods -n production

# ✅ GOOD — Checking all pods including failed ones with wide output
kubectl get pods -A -o wide --field-selector=status.phase!=Running
```

---

### Pattern 2: Container Log Analysis

**Description:** Retrieve and analyze container logs including historical logs from previous crashes.

**Step-by-Step:**
1. Get logs from current container
2. Get logs from previous container instance (if restarted)
3. Follow logs in real-time for debugging
4. Search logs for specific patterns

```bash
# Get last 100 lines of logs
kubectl logs nginx-deployment-7d9c5d9f8c-abc12 -n production --tail=100

# Get logs from previous container instance (after crash/restart)
kubectl logs nginx-deployment-7d9c5d9f8c-abc12 -n production --previous

# Follow logs in real-time
kubectl logs -f nginx-deployment-7d9c5d9f8c-abc12 -n production

# Get logs from specific container in multi-container pod
kubectl logs nginx-deployment-7d9c5d9f8c-abc12 -n production -c sidecar

# Search logs for error pattern
kubectl logs nginx-deployment-7d9c5d9f8c-abc12 -n production | grep -i "error"

# Get logs with timestamps
kubectl logs nginx-deployment-7d9c5d9f8c-abc12 -n production --timestamps
```

**Example Output with Previous Instance:**

```bash
$ kubectl logs myapp-6b8f9c7d4-x9j2p -n default --previous
2026-05-04T08:15:23.456Z INFO  Starting application...
2026-05-04T08:15:24.123Z ERROR Failed to connect to database: connection refused
2026-05-04T08:15:24.456Z ERROR Stack trace: java.sql.SQLException: Connection refused
2026-05-04T08:15:24.789Z FATAL Application crashed - exiting with code 1
```

**BAD vs GOOD**

```bash
# ❌ BAD — No context, just dumps raw logs
kubectl logs mypod -n default

# ✅ GOOD — With timestamps, tail limit, and container specification
kubectl logs mypod -n default -c main --timestamps --tail=200
```

---

### Pattern 3: Interactive Debugging with kubectl exec

**Description:** Exec into running containers for interactive debugging and inspection.

**Step-by-Step:**
1. Execute into running container
2. Install debugging tools if needed
3. Check environment variables and configurations
4. Test local connectivity from within pod

```bash
# Execute into container with bash shell
kubectl exec -it nginx-deployment-7d9c5d9f8c-abc12 -n production -- /bin/bash

# Execute with specific user (if container supports it)
kubectl exec -it nginx-deployment-7d9c5f8c-abc12 -n production -- whoami

# Run single command without interactive shell
kubectl exec nginx-deployment-7d9c5d9f8c-abc12 -n production -- df -h

# Check environment variables
kubectl exec nginx-deployment-7d9c5d9f8c-abc12 -n production -- env | grep DB_

# Copy files from pod to local
kubectl cp production/nginx-deployment-7d9c5d9f8c-abc12:/app/logs /tmp/nginx-logs

# Copy files to pod
kubectl cp /tmp/config.yaml production/nginx-deployment-7d9c5d9f8c-abc12:/app/config.yaml
```

**Debugging Inside Pod:**

```bash
# Exec into pod and check network tools
$ kubectl exec -it nginx-deployment-7d9c5d9f8c-abc12 -n production -- sh
/ # which curl wget nc ping
/ # apk add --no-cache curl
/ # curl -v http://service:8080/health
/ # cat /etc/resolv.conf
/ # cat /etc/hosts
/ # netstat -tlnp
```

**BAD vs GOOD**

```bash
# ❌ BAD — Exec into wrong namespace
kubectl exec -it mypod -- bash

# ✅ GOOD — With namespace specified and shell check
kubectl exec -it mypod -n production -- /bin/bash || kubectl exec -it mypod -n production -- /bin/sh
```

---

### Pattern 4: Node Health and Resource Inspection

**Description:** Diagnose node-level issues including resource pressure, disk space, and node conditions.

**Step-by-Step:**
1. List all nodes with status
2. Describe specific node for conditions
3. Check node resource usage
4. Inspect node events

```bash
# List all nodes with status
kubectl get nodes -o wide

# Describe specific node for detailed conditions
kubectl describe node worker-node-1

# Check node resource usage
kubectl top nodes

# Get node resource capacity and allocatable
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{.status.capacity}{"\n"}{end}'

# Check node events
kubectl get events -n kube-system --field-selector involvedObject.kind=Node --sort-by='.lastTimestamp'
```

**Example Node Description:**

```bash
$ kubectl describe node worker-node-1
Name:         worker-node-1
Roles:        <none>
Labels:       kubernetes.io/hostname=worker-node-1
              node.kubernetes.io/instance-type=m5.large
Annotations:  node.alpha.kubernetes.io/ttl: 0
              volumes.kubernetes.io/controller-managed-attach-detach: true
CreationTimestamp:  Mon, 01 May 2026 00:00:00 +0000
Conditions:
  Type             Status  Reason                       Message
  ----             ------  ------                       -------
  MemoryPressure   False   KubeletHasSufficientMemory   kubelet has sufficient memory available
  DiskPressure     False   KubeletHasNoDiskPressure     kubelet has no disk pressure
  PIDPressure      False   KubeletHasSufficientPID      kubelet has sufficient PID available
  Ready            True    KubeletReady                 kubelet is posting ready status
Addresses:
  InternalIP:  10.0.0.11
  Hostname:    worker-node-1
Capacity:
  cpu:                2
  ephemeral-storage:  100Gi
  memory:             4Gi
Allocatable:
  cpu:                1900m
  ephemeral-storage:  92Gi
  memory:             3800Mi
```

**BAD vs GOOD**

```bash
# ❌ BAD — Only listing nodes without status check
kubectl get nodes

# ✅ GOOD — With conditions and resource usage
kubectl get nodes -o wide && kubectl describe nodes | grep -A 10 "Conditions"
```

---

### Pattern 5: Network Troubleshooting

**Description:** Test network connectivity between pods, services, and external endpoints.

**Step-by-Step:**
1. Test DNS resolution within cluster
2. Test pod-to-pod connectivity
3. Test service-to-service connectivity
4. Check network policies

```bash
# Test DNS resolution from within a pod
kubectl run test-dns --rm -it --image=busybox -- sh
# Inside pod: nslookup kubernetes.default.svc.cluster.local

# Test connectivity to a service
kubectl run test-connectivity --rm -it --image=busybox -- sh
# Inside pod: wget -qO- http://my-service:8080/health

# Run temporary debug pod with network tools
kubectl debug -it debug-pod --image=nicolaka/netshoot -- sh

# Test from within a specific pod namespace
kubectl exec -it myapp-abc123 -n production -- wget -qO- http://database-service:5432

# Check network policies
kubectl get networkpolicies -A
kubectl describe networkpolicy myapp-network-policy -n production

# Test external connectivity
kubectl run test-external --rm -it --image=busybox -- sh
# Inside pod: wget -qO- https://google.com
```

**Network Test in Action:**

```bash
# Create temporary debug pod with full network tools
$ kubectl debug -it network-test --image=nicolaka/netshoot -- sh
/ # nslookup kubernetes.default.svc.cluster.local
Server:    10.96.0.10
Address 1: 10.96.0.10 kube-dns.kube-system.svc.cluster.local

Name:      kubernetes.default.svc.cluster.local
Address 1: 10.96.0.1 kubernetes.default.svc.cluster.local

/ # curl -v http://my-service:8080/health
*   Trying 10.96.123.45:8080...
* Connected (0) for 8080

/ # tcpdump -i eth0 host 10.0.0.5
```

**BAD vs GOOD**

```bash
# ❌ BAD — Testing from local machine instead of cluster
ping my-service.default.svc.cluster.local

# ✅ GOOD — Testing from within cluster with proper DNS
kubectl run test --rm -it --image=busybox -- nslookup my-service.default.svc.cluster.local
```

---

### Pattern 6: Resource Debugging (OOM, CPU Throttling)

**Description:** Diagnose resource constraints including OOMKilled events and CPU throttling.

**Step-by-Step:**
1. Check pod resource usage
2. Inspect OOMKilled events
3. Check CPU throttling metrics
4. Review resource requests and limits

```bash
# Check pod resource usage
kubectl top pods -n production

# Check node resource usage
kubectl top nodes

# Get pod resource details
kubectl describe pod myapp-abc123 -n production | grep -A 10 "Limits\|Requests"

# Check for OOMKilled events
kubectl get events -n production --field-selector reason=OOMKilled

# Get pod restart reason
kubectl get pods -n production -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].state.waiting.reason}{"\n"}{end}'

# Check for CPU throttling (requires metrics-server)
kubectl top pods -n production --sort-by='cpu'
```

**Resource Analysis Example:**

```bash
$ kubectl describe pod myapp-6b8f9c7d4-x9j2p -n production
Name:         myapp-6b8f9c7d4-x9j2p
Namespace:    production
Priority:     0
Containers:
  myapp:
    Container ID:   containerd://abc123
    Image:          myapp:1.0.0
    Limits:
      cpu:     500m
      memory:  512Mi
    Requests:
      cpu:     250m
      memory:  256Mi
    State:          Waiting
      Reason:       CrashLoopBackOff
    Last State:     Terminated
      Exit Code:    137    # 137 = 128 + 9 (SIGKILL from OOM)
      Reason:       OOMKilled
      Memory:       512Mi
```

**BAD vs GOOD**

```bash
# ❌ BAD — Not checking resource limits
kubectl get pods

# ✅ GOOD — With resource usage and limit comparison
kubectl top pods && kubectl describe pods | grep -A 5 "Limits"
```

---

### Pattern 7: kubectl debug for Temporary Containers

**Description:** Use kubectl debug command to create temporary containers for debugging without modifying existing deployments.

**Step-by-Step:**
1. Create temporary debug container
2. Add debugging tools to existing pod
3. Use ephemeral debug pods
4. Share process namespace for debugging

```bash
# Create temporary debug container in existing pod
kubectl debug -it myapp-abc123 -n production --image=busybox -- sh

# Create new ephemeral debug pod
kubectl debug myapp-abc123 -n production --image=busybox --target=main-container

# Copy pod specification for debugging
kubectl debug myapp-abc123 -n production --image=nicolaka/netshoot --copy --rm -it

# Create debug pod from deployment
kubectl debug myapp-deployment -n production --image=busybox --target=myapp

# Share process namespace for debugging
kubectl debug myapp-abc123 -n production --copy --share-processes --target=myapp

# Create debug pod with custom command
kubectl run debug-pod --rm -it --image=ubuntu -- bash -c "apt update && apt install -y curl netcat"
```

**Debug Container Example:**

```bash
$ kubectl debug myapp-abc123 -n production --image=nicolaka/netshoot -- sh
Creating debug container [myapp-debug] in pod myapp-abc123.
/ # ps aux
/ # netstat -tlnp
/ # curl http://localhost:8080/debug/vars
/ # strace -p 1 -e trace=network
```

**BAD vs GOOD**

```bash
# ❌ BAD — Modifying existing deployment for debugging
kubectl edit deployment myapp  # Don't do this!

# ✅ GOOD — Using kubectl debug without modifying deployment
kubectl debug myapp-abc123 -n production --image=busybox -- sh
```

---

### Pattern 8: Cluster Component Debugging

**Description:** Diagnose cluster control plane components including api-server, controller-manager, scheduler, and etcd.

**Step-by-Step:**
1. Check cluster health endpoint
2. Examine control plane component logs
3. Check etcd status
4. Inspect controller manager and scheduler

```bash
# Check cluster health
kubectl get --raw=/readyz
kubectl get --raw=/healthz

# Get control plane component pods
kubectl get pods -n kube-system -l component=kube-apiserver
kubectl get pods -n kube-system -l component=kube-controller-manager
kubectl get pods -n kube-system -l component=kube-scheduler

# Get etcd pods
kubectl get pods -n kube-system -l component=etcd

# Get logs from api-server
kubectl logs -n kube-system kube-apiserver-<node-name>

# Get logs from controller-manager
kubectl logs -n kube-system kube-controller-manager-<node-name>

# Get logs from scheduler
kubectl logs -n kube-system kube-scheduler-<node-name>

# Check etcd status
kubectl exec -n kube-system etcd-<node-name> -- etcdctl endpoint status --endpoints=http://127.0.0.1:2379
kubectl exec -n kube-system etcd-<node-name> -- etcdctl member list --endpoints=http://127.0.0.1:2379

# Check component health details
kubectl get --raw=/livez?verbose
kubectl get --raw=/waitforready?verbose
```

**Cluster Component Example:**

```bash
# Get api-server logs
$ kubectl logs -n kube-system kube-apiserver-worker-node-1 --tail=100
I0504 10:30:00.123456       1 wrap.go:47] GET /api/v1/namespaces/default/pods: (2.345ms) 200
I0504 10:30:01.234567       1 trace.go:205] Trace[123456789]: "Get" url:/api/v1/namespaces/default/pods (04-May-2026 10:30:01.234)
I0504 10:30:02.345678       1 wrap.go:47] LIST /api/v1/pods: (1.234ms) 200

# Check cluster health
$ kubectl get --raw=/readyz
ok

$ kubectl get --raw=/livez?verbose
livez check passed
```

**BAD vs GOOD**

```bash
# ❌ BAD — Accessing components directly without checking health
kubectl exec -n kube-system etcd-xxx -- etcdctl

# ✅ GOOD — First checking health, then accessing
kubectl get --raw=/readyz && kubectl logs -n kube-system etcd-xxx
```

---

## Constraints

### MUST DO

- **Always check pod status before logs** — Use `kubectl get pods` with status filters before diving into logs
- **Include namespace in all commands** — Never assume default namespace; always specify `-n <namespace>`
- **Use `--previous` flag for crashed containers** — Crash logs are only available from previous instance
- **Check events for context** — `kubectl describe pod` shows relevant events that explain failures
- **Test from within cluster for network issues** — External connectivity tests don't reflect internal network policies
- **Check resource limits before scaling** — OOMKilled often indicates insufficient memory limits
- **Use kubectl debug for temporary changes** — Never modify deployments just for debugging
- **Verify cluster health before troubleshooting apps** — Run `kubectl get --raw=/readyz` first

### MUST NOT DO

- **Don't debug production directly without backup** — Use kubectl debug or copy pods instead of modifying
- **Don't ignore restart counts** — High restart counts indicate fundamental issues, not transient problems
- **Don't assume namespace is default** — Always verify namespace with `-n` flag
- **Don't use `--force` or `--grace-period=0` for normal debugging** — These are emergency kill switches
- **Don't disable network policies for debugging** — This creates security vulnerabilities; use temporary policy exceptions
- **Don't ignore node conditions** — `NotReady` nodes indicate infrastructure issues requiring escalation
- **Don't use debug pods for long-term solutions** — They're temporary; fix the root cause in deployments
- **Don't access etcd directly without training** — Direct etcd access can corrupt the cluster

---

## Output Template

When debugging a Kubernetes cluster issue, the output must contain:

1. **Initial Assessment** — Pod status, restart counts, and immediate failure indicators
   - Pod name and namespace
   - Current phase and container states
   - Restart counts and last exit codes
   - Relevant events from `kubectl describe`

2. **Log Analysis Summary** — Container logs and error patterns
   - Recent log output with timestamps
   - Any error messages or stack traces
   - Previous crash logs if applicable
   - Log search results for common error patterns

3. **Resource Check Results** — Memory and CPU constraints
   - Resource requests vs limits
   - OOMKilled status and memory usage
   - CPU throttling metrics if available
   - Node resource availability

4. **Network Test Results** — Connectivity verification
   - DNS resolution test results
   - Service connectivity tests
   - Network policy evaluation
   - External connectivity status

5. **Node Status** — Infrastructure health
   - Node conditions (Ready, MemoryPressure, etc.)
   - Node resource usage
   - Events on the node
   - Pod scheduling information

6. **Recommended Action** — Clear next steps
   - Immediate fix if identified
   - Further investigation needed
   - Escalation requirements
   - Monitoring recommendations

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-docker-debugging` | For debugging container issues at the Docker level before Kubernetes abstraction |
| `agent-network-troubleshooting` | For advanced network topology analysis beyond Kubernetes network policies |
| `cncf-prometheus` | For metrics-based debugging with Prometheus metrics and alerting |
| `cncf-helm` | For debugging Helm deployment issues and chart template rendering |
| `cncf-coredns` | For DNS-specific troubleshooting within Kubernetes cluster |

---

## References

- [Kubernetes Documentation - Debugging](https://kubernetes.io/docs/tasks/debug/)
- [Kubernetes Commands - kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Kubernetes Debugging Blog Series](https://kubernetes.io/blog/2018/07/18/11-ways-not-to-get-hacked/)
- [kubectl debug Command Documentation](https://kubernetes.io/docs/reference/kubectl/generated/kubectl/kubectl_debug/)
- [Understanding Kubernetes Logging](https://kubernetes.io/docs/concepts/cluster-administration/logging/)
- [Network Policies Tutorial](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Troubleshooting Cluster DNS](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [Kubernetes Errors Reference](https://kubernetes.io/docs/reference/kubectl/)

---

## Quick Reference: Common Failure Patterns

| Error | Cause | Quick Fix |
|---|---|---|
| `Pending` | Insufficient resources, unschedulable | `kubectl describe pod` to see scheduling failure reason |
| `CrashLoopBackOff` | Container repeatedly crashes | Check logs with `--previous`, verify application health |
| `ImagePullBackOff` | Can't pull image | Verify image name, credentials, registry access |
| `ErrImagePull` | Network/image issues | Check network connectivity, image availability |
| `OOMKilled` | Memory limit exceeded | Increase memory limit, optimize application memory |
| `NotReady` | Node issues | `kubectl describe node` to see node conditions |
| `Connection refused` | Service not running | Check pod logs, service endpoints |
| `404/503 errors` | Backend unavailable | Check pod readiness, service endpoints |
| `DNS lookup failed` | DNS issues | Test from within cluster, check coredns pods |

---

*This skill provides comprehensive Kubernetes debugging workflows. Always start with the TL;DR Checklist for systematic debugging.*

---

## Live References

> **These links are resolved at load time** — content is fetched and inlined to provide the latest documentation.

- [Kubernetes Debugging Guide](https://kubernetes.io/docs/tasks/debug/)
- [kubectl Debug Command](https://kubernetes.io/docs/reference/kubectl/generated/kubectl/kubectl_debug/)
- [Debug Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Debug Init Containers](https://kubernetes.io/docs/tasks/debug/debug-application/debug-init-container/)
- [Debug Services](https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/)
- [Kubernetes Events](https://kubernetes.io/docs/tasks/debug/debug-application/determine-reason-pod-failure/)
