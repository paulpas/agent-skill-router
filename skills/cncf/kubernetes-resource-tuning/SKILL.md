---




name: kubernetes-resource-tuning
description: Implements Kubernetes resource tuning — HPA scaling policies, VPA right-sizing, cluster autoscaler configuration, and resource limits/requests optimization for production container workloads.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: kubernetes resource tuning, HPA scaling, VPA right-sizing, cluster autoscaler, resource limits, pod requests, how do i scale kubernetes workloads, k8s performance tuning
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, examples]
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: kubernetes-deployment-patterns, cncf-cost-optimization




---





# Kubernetes Resource Tuning

Configures and optimizes Kubernetes resource management across scaling layers — HPA, VPA, cluster autoscaler, and pod resource requests/limits — to ensure production workloads run efficiently without over-provisioning or under-provisioning.

## TL;DR Checklist

- [ ] Profile each workload's CPU/memory usage over at least 7 days before setting limits
- [ ] Set HPA with both CPU and custom metrics (Prometheus adapter or KEDA) for non-CPU-bound workloads
- [ ] Configure VPA in Initial mode first, review recommendations, then progress to Auto
- [ ] Ensure cluster autoscaler node-pool scale-down-delay is at least 10 minutes for production
- [ ] Verify QoS class matches workload criticality (Guaranteed for SLO-critical, Burstable for best-effort)
- [ ] Test HPA scale-down stabilization with minReplicas to prevent thrash during traffic dips
- [ ] Confirm cluster autoscaler handles spot/preemptible instances with appropriate tolerations

---

## When to Use

Use this skill when:

- A production workload is hitting OOMKilled errors or CPU throttling consistently
- HPA is not scaling appropriately — either too slow (stale metrics) or thrashing (oscillating replicas)
- Pods are repeatedly restarted after VPA recommendations are applied due to sudden resource jumps
- Node pool capacity is insufficient during traffic spikes, causing pod scheduling failures
- Infrastructure costs are high and there is suspected over-provisioning across deployments
- Setting up a new cluster and need to establish baseline resource requests/limits for all workloads
- Migrating from static replica counts to dynamic scaling with HPA/VPA/cluster autoscaler

---

## When NOT to Use

Avoid this skill for:

- Debugging application-level bugs (use `kubernetes-debugging` instead)
- Designing ingress rules or service mesh topology (use `kubernetes-ingress` or `cncf-service-mesh`)
- Setting up CI/CD deployment strategies (use `blue-green-deployment` or `canary-deployment` instead)
- One-off manual scaling — this skill is for persistent, automated resource management

---

## Core Workflow

1. **Profile Workloads** — Collect CPU and memory usage data across a representative time window (minimum 7 days, covering peak and off-peak periods). Use Prometheus metrics (`container_cpu_usage_seconds_total`, `container_memory_working_set_bytes`) or eBPF-based tools like Cilium Hubble for deeper insight. **Checkpoint:** You need both p50 and p95 percentiles — requests should be set at p50, limits at p95 + headroom (15–25%).

2. **Set Resource Requests & Limits** — For each deployment, calculate baseline CPU/memory from profiling data. Apply QoS class based on SLO criticality: Guaranteed for payment/core services, Burstable for web frontends and batch jobs. **Checkpoint:** Verify that every container in a pod has both requests and limits set; pods with only limits (no requests) receive BestEffort QoS and are first to be evicted under node pressure.

3. **Configure HPA** — Create HorizontalPodAutoscaler resources with behavior policies tuned for your workload's traffic pattern. Include custom metrics (Prometheus adapter or KEDA) for non-CPU-driven scaling triggers like queue depth or request latency. **Checkpoint:** Set both `scaleUp stabilizationWindowSeconds` and `scaleDown stabilizationWindowSeconds` to prevent thrash — typically 60–300s for scale-down.

4. **Adopt VPA Progressively** — Deploy VerticalPodAutopilot in Initial mode first, collect recommendations without enforcing them, review for reasonableness, then graduate to Auto mode with carefully bounded resource policies. **Checkpoint:** Never jump straight to Auto mode — unbounded VPA Auto mode can trigger cascading pod restarts during traffic surges, causing availability degradation.

5. **Tune Cluster Autoscaler** — Configure node pools (ASG on AWS, managed instance groups on GCP/Azure) with appropriate min/max sizes, spot/preemptible handling, and scale-down delay thresholds. **Checkpoint:** Verify that scale-down proceeds only after `scale-down-delay-after-add` has elapsed for all nodes; this prevents the CA from immediately removing nodes you just added to accommodate pending pods.

6. **Validate End-to-End** — Run a load test (e.g., with `k6`, `locust`, or `vegeta`) and observe HPA scale-up, cluster autoscaler node addition, and VPA recommendations in action. **Checkpoint:** Confirm that scaling completes within your SLO time window (e.g., HPA reaches target replicas within 3 minutes under load).

---

## Implementation Patterns

### Pattern 1: HPA with Custom Metrics and Behavior Policies

This pattern covers a production-grade HPA configuration for a stateless web service. It combines CPU-based scaling with custom Prometheus metrics (HTTP request rate per pod) and explicit scale-up/scale-down behavior policies to prevent thrashing.

The `scaleDown.stabilizationWindowSeconds` is critical — without it, HPA aggressively scales down during brief traffic dips, causing constant replica churn that wastes cluster resources and increases cold-start latency.

```yaml
# hpa-with-custom-metrics.yaml
# Production HPA for a stateless web service
# Combines CPU scaling with Prometheus HTTP request-rate metric
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 50
  metrics:
    # Standard CPU-based scaling
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60   # Scale up at 60% CPU to maintain headroom

    # Custom metric: HTTP requests per second per pod (from Prometheus Adapter)
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "100"      # Target 100 RPS per pod

    # Custom metric: P99 latency from Prometheus (Kubernetes Object metric)
    - type: Object
      object:
        describedObject:
          apiVersion: v1
          name: api-gateway-slo
        metric:
          name: p99_latency_ms
        target:
          type: Value
          value: "500"             # Scale up if P99 > 500ms
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300   # Wait 5 minutes before scaling down — prevents thrash
      policies:
        - type: Percent
          value: 10                       # Never remove more than 10% of replicas per period
          periodSeconds: 60
        - type: Pods
          value: 2                        # Hard cap: max 2 pods removed per 60s window
      selectPolicy: Min                 # Use the most restrictive policy

    scaleUp:
      stabilizationWindowSeconds: 0     # No delay on scale-up — react immediately to load
      policies:
        - type: Percent
          value: 100                      # Can double replicas quickly for traffic spikes
          periodSeconds: 60
        - type: Pods
          value: 10                       # Also allow adding up to 10 pods per 60s
      selectPolicy: Max                   # Use the most aggressive policy
```

**Key tuning decisions:**
- `averageUtilization: 60` on CPU provides a safety buffer — scaling happens before contention
- Multiple metric types provide redundant triggers; HPA picks the one requesting the **most replicas**
- Scale-down is deliberately slow (300s stabilization + 10% limit) because scaling up costs more than temporary over-provisioning
- `selectPolicy: Max` for scale-up and `Min` for scale-down creates asymmetric behavior appropriate for production workloads

---

### Pattern 2: VPA for Right-Sizing (Progressive Adoption Workflow)

VPA must be adopted incrementally. Jumping directly to Auto mode applies recommendations immediately, causing pods to restart with new resource bounds — which can trigger cascading failures if the recommendation is a large jump from current values. The three-phase adoption workflow mitigates this risk.

```yaml
# vpa-initial-mode.yaml
# Phase 1: Initial mode — makes recommendations but does NOT apply them
# Run for 7+ days to collect baseline data without affecting workloads
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutopilot
metadata:
  name: api-gateway-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  updatePolicy:
    updateMode: "Initial"       # Phase 1: Recommend only, never enforce

  resourcePolicy:
    containerPolicies:
      - containerName: "*"
        minAllowed:
          cpu: 50m              # Absolute floor — never recommend below 50m CPU
          memory: 64Mi           # Absolute floor for memory
        maxAllowed:
          cpu: "2"               # Absolute ceiling — prevents runaway recommendations
          memory: 2Gi
        controlledResources: ["cpu", "memory"]
        mode: "Auto"             # VPA actively monitors and recommends

---
# Phase 2: Switch to Auto mode after validating recommendations are reasonable
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutopilot
metadata:
  name: api-gateway-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  updatePolicy:
    updateMode: "Auto"          # Phase 2: Enforce recommendations automatically

  # IMPORTANT: Add PodRestartPolicy to prevent mass restarts
  podRestartPolicy: "Always"     # Always restart pods when VPA changes resources
```

**Handling OOM kills during VPA updates:**

When VPA increases memory limits, the new container may still OOM if the workload has unbounded memory usage (e.g., growing caches). Set explicit `maxAllowed` and monitor `container_memory_working_set_bytes` against the new limit:

```yaml
# vpa-with-oom-protection.yaml
# Additional VPA configuration to guard against OOM kills during right-sizing
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutopilot
metadata:
  name: cache-service-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cache-service
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
      - containerName: "*"
        # Set maxAllowed slightly above observed peak to prevent VPA from recommending dangerous values
        maxAllowed:
          cpu: "1"
          memory: 4Gi
        # Recommended minimum — ensures a baseline of resources even for batch workloads
        minAllowed:
          cpu: 200m
          memory: 256Mi
```

**After Phase 2**, continuously review VPA recommendations via `kubectl get vpa <name> -o yaml` and check the `status.recommendation` field. If recommendations suggest consistently increasing resources beyond your planned capacity, investigate whether the workload has a true memory leak versus just needing more headroom for growth.

---

### Pattern 3: Cluster Autoscaler Configuration for Multi-Zone Production

The cluster autoscaler must be configured with node pool settings that account for multi-zone redundancy, spot instance handling, and safe scale-down behavior. Below is a comprehensive configuration using the Kubernetes Cluster Autoscaler with AWS Auto Scaling Groups (ASGs).

```yaml
# cluster-autoscaler-config.yaml
# Cluster Autoscaler deployment with production-safe settings
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
        - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.30.0
          name: cluster-autoscaler
          resources:
            requests:
              cpu: 100m
              memory: 300Mi
          command:
            - ./cluster-autoscaler
            # Core settings
            - --cloud-provider=aws
            - --balance-similar-node-groups=true    # Balance node groups across availability zones
            - --skip-nodes-with-local-storage=false # Allow CA to evaluate nodes with local storage
            - --skip-nodes-with-system-pods=false   # Include system pods in capacity calculations

            # Scale-down safety thresholds
            - --scale-down-delay-after-add=10m      # Wait 10 min after adding a node before considering removal
            - --scale-down-delay-after-delete=0s    # No delay after explicit CA-triggered deletes
            - --scale-down-delay-after-failure=3m   # Wait 3 min before retrying scale-down for failed nodes
            - --scale-down-unneeded-time=10m        # Node must be unneeded for 10 min before removal
            - --scale-down-utilization-threshold=0.5 # Only consider nodes with <50% utilization for removal

            # Health and monitoring
            - --max-node-total-percent=0.9          # Never let cluster exceed 90% total capacity usage
            - --node-group-limit=5                  # Max concurrent node group changes
            - --stderrthreshold=info
          env:
            - name: AWS_REGION
              valueFrom:
                configMapKeyRef:
                  name: cluster-autoscaler-status
                  key: region
      tolerations:
        - operator: Exists   # Allow scheduling on any node for reliability
```

**Spot/Preemptible Instance Handling:**

Cluster autoscaler works best with spot instances when combined with proper tolerations and mixed-instance policies. On AWS, configure ASG instance types to include both on-demand and spot capacity:

```yaml
# Mixed instance type policy for cluster autoscaler node pool (AWS example)
# This is an ASG configuration concept — apply via Terraform or AWS console
# Key principle: use spot instances for stateless workloads with graceful degradation capability

NodePoolConfig:
  minSize: 2
  maxSize: 20
  desiredCapacity: 8
  launchTemplate:
    # Use mixed instances policy for cost savings
    mixedInstancesPolicy:
      instancesDistribution:
        onDemandBaseCapacity: 1              # Maintain at least 1 on-demand node per AZ
        onDemandPercentageAboveBaseCapacity: 30  # 30% of remaining capacity as on-demand
        spotInstancePools: 4                 # Spread across 4 spot instance pools for diversity
        spotMaxPrice: "0.05"                 # Cap spot price (example in USD/hour)

  # Apply tolerations to workloads that can run on spot instances
  labels:
    node.kubernetes.io/lifecycle: spot
  taints:
    - key: node.kubernetes.io/lifecycle
      value: spot
      effect: NoSchedule

  # Ensure deployments that use this pool have matching tolerations
  # In the deployment spec:
  #   tolerations:
  #     - operator: Exists
```

**Multi-zone considerations:**
- Set `--balance-similar-node-groups=true` so CA distributes nodes evenly across availability zones
- Configure each node group's subnets across all AZs in your region
- For GKE/AKS, use the built-in node pool multi-zone configuration with zone-aware scheduling

---

### Pattern 4: Resource Limits and Quality of Service Classes

Kubernetes assigns QoS classes based on how resource requests and limits are configured. This directly impacts pod eviction priority under node pressure. Understanding these classes is essential for ensuring SLO-critical workloads survive until last.

**QoS Class Rules:**
| QoS Class | Condition | Eviction Priority |
|---|---|---|
| **Guaranteed** | `requests == limits` for all containers, all resources | Lowest (survives longest) |
| **Burstable** | At least one container has `requests != limits`, or some have requests without limits | Medium |
| **BestEffort** | No requests or limits set on any container | Highest (evicted first) |

```yaml
# qos-examples.yaml
# Example 1: Guaranteed QoS — SLO-critical payment service
# All containers have identical requests and limits → Guaranteed class
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
        - name: payment-api
          image: registry.internal/payment-api:v2.4.1
          resources:
            requests:
              cpu: "500m"
              memory: 512Mi
            limits:
              cpu: "500m"       # Same as request → Guaranteed QoS
              memory: 512Mi
          # Add readiness/liveness probes (critical for guaranteed workloads)
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10

---
# Example 2: Burstable QoS — Web frontend with burst capability
# Requests are lower than limits to allow bursts during traffic spikes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
    spec:
      containers:
        - name: frontend
          image: registry.internal/web-frontend:v3.1.0
          resources:
            requests:
              cpu: "100m"           # Baseline CPU reservation
              memory: 128Mi          # Baseline memory reservation
            limits:
              cpu: "500m"            # Allow bursting to 5x baseline under load
              memory: 512Mi          # Allow memory bursts (e.g., during asset compilation)

---
# Example 3: Multi-container pod — all containers must meet QoS requirements
# If any container lacks matching requests/limits, the entire pod becomes Burstable
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sidecar-enabled-service
  namespace: production
spec:
  template:
    spec:
      containers:
        - name: main-app
          image: registry.internal/app:v1.0.0
          resources:
            requests:
              cpu: "250m"
              memory: 256Mi
            limits:
              # ❌ MISMATCH — different from request → pod becomes Burstable
              cpu: "250m"
              memory: 512Mi   # Different from request, so Guaranteed is not achieved

        - name: log-sidecar
          image: fluentd:v1.16
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 50m
              memory: 64Mi    # ❌ Sidecar matches, but main-app mismatch makes entire pod Burstable
```

```yaml
# ✅ GOOD — Same multi-container pod with matching requests and limits for Guaranteed QoS
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sidecar-enabled-service-fixed
  namespace: production
spec:
  template:
    spec:
      containers:
        - name: main-app
          image: registry.internal/app:v1.0.0
          resources:
            requests:
              cpu: "250m"
              memory: 256Mi
            limits:
              cpu: "250m"     # ✅ Matches request — contributes to Guaranteed QoS
              memory: 256Mi   # ✅ Matches request — pod achieves Guaranteed class

        - name: log-sidecar
          image: fluentd:v1.16
          resources:
            requests:
              cpu: "250m"
              memory: 256Mi
            limits:
              cpu: "250m"     # ✅ Also matches — all containers have requests==limits
              memory: 256Mi
```

**Calculating optimal resource values from profiling data:**

For CPU, set requests at p50 and limits at p95 + 20% headroom. For memory, set requests at p75 (memory usage is less volatile) and limits at p99 + 15%:

```bash
# Query Prometheus for CPU/memory percentiles over the last 7 days
# CPU p50 (for requests):
# avg(container_cpu_usage_seconds_total{namespace="production",pod=~"api-*"}) by (pod) * 100

# Memory p99 + headroom (for limits):
# max_over_time(max(container_memory_working_set_bytes{namespace="production",pod=~"api-*"}) by (pod) [7d]) * 1.15
```

---

## Constraints

### MUST DO
- Always set both requests AND limits for CPU and memory on every container — pods without limits are BestEffort and will be the first killed under node pressure
- Set HPA `scaleDown.stabilizationWindowSeconds` to at least 60s; use 300s+ for services with cold-start overhead or expensive replica initialization
- Configure VPA in Initial mode before switching to Auto — validate recommendations cover at least 7 days of varied load patterns
- Use QoS class as a signal: Guaranteed for payment/core SLO workloads, Burstable for web frontends and batch jobs
- Set cluster autoscaler `--scale-down-delay-after-add` to at least 10 minutes to prevent removing nodes that are still being populated by pending pods
- Include both CPU and custom metrics in HPA configurations for non-CPU-bound services (HTTP RPS, queue depth, latency)
- Bound VPA resource policies with explicit `minAllowed` and `maxAllowed` values to prevent runaway recommendations
- Balance node groups across availability zones using `--balance-similar-node-groups=true` for multi-zone resilience

### MUST NOT DO
- Never set HPA `maxReplicas` equal to the total number of nodes in the cluster — leaves no headroom for system pods and can cause scheduling deadlock
- Do not use VPA Auto mode without first running Initial mode for at least 7 days — sudden resource jumps trigger cascading OOM kills
- Do not set memory limits lower than the observed p95 working set — this guarantees eventual OOMKilled events under normal load
- Do not skip `minReplicas` on HPA — setting it too low (e.g., 1) means a single pod failure during scale-down leaves your service with zero availability
- Do not let cluster autoscaler run with `--scale-down-unneeded-time=0s` — this causes immediate node removal when any pod reschedules, leading to scale thrash
- Never rely solely on VPA for right-sizing without also setting HPA — vertical scaling alone cannot handle sudden traffic spikes or provide high availability
- Do not mix spot and on-demand pods in the same deployment without proper tolerations and anti-affinity rules — node termination on spot interruption will disrupt consistent workloads

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kubernetes-deployment-patterns` | Deployment manifests, health probes, rolling updates, and pod disruption budgets — the deployment layer this resource tuning skill builds on top of |
| `cncf-cost-optimization` | Cost analysis and optimization after resources are tuned — identifies remaining waste like unused persistent volumes or idle namespaces |

---

## Live References

> Authoritative documentation links for Kubernetes resource management. The model follows markdown links at load time to resolve external references and inline content.

- [Kubernetes Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Kubernetes Vertical Pod Autoscaler](https://kubernetes.io/docs/tasks/administer-cluster/vertical-pod-autoscaler/)
- [Cluster Autoscaler Documentation](https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler)
- [Kubernetes Quality of Service Classes](https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/)
- [Prometheus Adapter for Kubernetes Metrics API](https://github.com/kubernetes-sigs/prometheus-adapter)
- [KEDA (Kubernetes Event-driven Autoscaling)](https://keda.sh/docs/)
- [Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
