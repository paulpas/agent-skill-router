---




name: kubernetes-deployment-patterns
description: Implements production-grade Kubernetes deployment patterns including resource management, HPA/VPA, pod disruption budgets, health probes, and multi-environment manifest orchestration for reliable service operation.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: kubernetes deployment, k8s manifests, resource management, pod disruption budget, HPA, readiness probe, helm charts, how do i deploy to kubernetes
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - long-form architecture
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: microservices-architecture, observability-patterns, service-mesh-patterns




---





# Kubernetes Deployment Patterns

Implements production-grade Kubernetes deployment patterns for reliable service operation. This skill makes the model configure resource management, auto-scaling, health probes, and multi-environment manifests using proven patterns that prevent common failure modes: OOM kills, split-brain probe conflicts, scale-flapping during traffic spikes, and accidental downtime during deployments.

## TL;DR Checklist

- [ ] Set CPU/memory requests AND limits based on profiling data — never use defaults
- [ ] Configure startup, readiness, and liveness probes with distinct endpoints for each
- [ ] Use maxSurge: 1, maxUnavailable: 0 for zero-downtime rolling deployments in production
- [ ] Add HPA with stabilization windows (30s scale-up, 300s scale-down minimum)
- [ ] Set PDB with minAvailable or maxUnavailable to survive voluntary disruptions
- [ ] Use Kustomize overlays for environment-specific values instead of maintaining separate manifests

---

## When to Use

Use this skill when:

- Deploying a new microservice or stateful application to a Kubernetes cluster and need production-ready configuration from the start
- Adding resource limits and requests and scaling policies to existing deployments that currently lack them — unbounded workloads destabilize clusters
- Implementing health checks (readiness/liveness/startup probes) for graceful traffic management and automatic recovery
- Configuring pod disruption budgets to maintain availability during node maintenance, upgrades, or autoscaling events
- Managing deployment configurations across dev, staging, and production environments without manifest duplication

---

## When NOT to Use

Avoid this skill for:

- Deploying to non-Kubernetes environments — use ECS task definitions, Cloud Run services, or bare-metal patterns instead
- Designing CI/CD pipeline logic itself — use GitOps tools like ArgoCD or Flux for declarative deployment automation (this skill covers the Kubernetes manifests only)
- Configuring cluster-level infrastructure — network policies, ingress controllers, node pools, and cluster autoscaler settings belong in the cncf-kubernetes skill

---

## Core Workflow

1. **Define Resource Specifications** — Set CPU and memory requests based on baseline usage profiling data and limits based on peak observed usage during load testing. Requests determine pod scheduling decisions; limits prevent any single pod from starving the node. **Checkpoint:** Limits are at least 2x requests for bursty workloads to handle traffic spikes without preemption.

2. **Configure Health Probes** — Implement three distinct probes: startup probe for slow-starting containers (DB connections, cache warming), readiness probe for traffic routing control, and liveness probe for automatic container restart on fatal states. Use separate HTTP endpoints for each to avoid masking failure modes. **Checkpoint:** Readiness endpoint returns 404 or 503 during actual startup; liveness endpoint checks only the application's core health, not dependency status.

3. **Set Up Auto-Scaling** — Configure Horizontal Pod Autoscaler (HPA) with CPU utilization targets (60-80%) and custom metrics like QPS or queue depth. Add Vertical Pod Autoscaler (VPA) recommendations for right-sizing requests over time. Configure asymmetric scale-up/scale-down behaviors: aggressive up, conservative down. **Checkpoint:** Scale-up latency stays under 60 seconds under load; scale-down stabilization prevents flapping.

4. **Configure Pod Disruption Budgets** — Set minAvailable or maxUnavailable to ensure a minimum number of pods remain running during voluntary disruptions like node drains, cluster upgrades, and autoscaler scaling events. Use PDB as a safety net even when you think the replica count is high enough. **Checkpoint:** PDB allows at least one pod per replica set minimum; verify with `kubectl get pdb`.

5. **Orchestrate Multi-Environment Manifests** — Use Kustomize overlays or Helm templates for environment-specific configurations (replica counts, image tags, config maps, resource limits). Base manifests must be identical across environments — only values diverge. This prevents configuration drift between staging and production. **Checkpoint:** Running `kustomize build base` produces the same output regardless of which overlay is applied; overlays only modify values, not structure.

---

## Implementation Patterns

### Pattern 1: Production Deployment with Health Probes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
  labels:
    app: order-service
    version: v2.3.1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1             # Allow one extra pod during update
      maxUnavailable: 0       # Zero-downtime: never remove pods before new ones ready
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
        version: v2.3.1
    spec:
      serviceAccountName: order-service
      securityContext:
        runAsNonRoot: true
        fsGroup: 1000
      containers:
      - name: order-service
        image: registry.internal/order-service:v2.3.1
        ports:
        - containerPort: 8080
          protocol: TCP
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        # Startup probe — gives slow-starting service up to 30s warm-up time
        # Uses a lightweight endpoint that only checks the process is running
        startupProbe:
          httpGet:
            path: /healthz/startup
            port: 8080
          failureThreshold: 30
          periodSeconds: 1
          timeoutSeconds: 2
        # Readiness probe — controls whether this pod receives traffic from the Service
        # Returns 4xx/5xx during startup and dependency failures (DB, cache)
        readinessProbe:
          httpGet:
            path: /healthz/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 3
          timeoutSeconds: 2
        # Liveness probe — triggers container restart when the application is in a
        # fatal state (deadlock, corrupted internal state) that cannot self-recover
        livenessProbe:
          httpGet:
            path: /healthz/live
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
          failureThreshold: 3
          timeoutSeconds: 2
```

### Pattern 2: Horizontal Pod Autoscaler with Custom Metrics

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  # Primary scaling signal: CPU utilization target
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  # Secondary scaling signal: custom metric — HTTP request queue depth
  # Requires Prometheus adapter or custom metrics API
  - type: Pods
    pods:
      metric:
        name: http_request_queue_depth
      target:
        type: AverageValue
        averageValue: "50"
  # Tertiary signal: memory utilization (prevent OOM situations)
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30   # Short window — react quickly to traffic spikes
      policies:
      - type: Percent
        value: 100                     # Allow doubling pods within the window
        periodSeconds: 60
      - type: Pods
        value: 5                       # Or add 5 pods, whichever is more aggressive
        periodSeconds: 60
      selectPolicy: Max                # Pick the most aggressive policy
    scaleDown:
      stabilizationWindowSeconds: 300  # Long window — prevent flapping under variable load
      policies:
      - type: Percent
        value: 10                      # Remove only 10% of pods per scaling event
        periodSeconds: 60
```

### Pattern 3: Pod Disruption Budget for High Availability

```yaml
# Option A: minAvailable — ensures at least N pods are always running
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: order-service-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: order-service

---
# Option B: maxUnavailable — limits simultaneous disruptions (useful for even distribution)
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: order-service-pdb-max-unavailable
  namespace: production
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: order-service

# Choosing between minAvailable and maxUnavailable:
# - minAvailable is clearer for capacity planning (e.g., "we need at least 2 pods")
# - maxUnavailable is easier to reason about during rollouts (e.g., "at most 1 pod down")
# - With HPA, minAvailable can conflict if HPA scales below the minimum — coordinate carefully
```

### Pattern 4: Kustomize Multi-Environment Overlay

```yaml
# kustomization.yaml (base directory — shared across all environments)
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - hpa.yaml
  - pdb.yaml

commonLabels:
  managed-by: kustomize
  team: platform

# kustomization-production.yaml (production overlay)
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
  - ../base
namespace: production

# Environment-specific replica counts
replicas:
  - name: order-service
    count: 5

# Patch resource limits for production workload
patches:
  - target:
      kind: Deployment
      name: order-service
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources/limits/memory
        value: "1Gi"

# kustomization-staging.yaml (staging overlay)
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
  - ../base
namespace: staging

replicas:
  - name: order-service
    count: 2

patches:
  - target:
      kind: Deployment
      name: order-service
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources/limits/memory
        value: "512Mi"

# Usage:
#   kustomize build base          # Same output for all environments
#   kustomize build staging       # Applies staging overlay
#   kustomize build production    # Applies production overlay
```

### Pattern 5: Vertical Pod Autoscaler (VPA) for Right-Sizing

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: order-service-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  updatePolicy:
    updateMode: "Auto"   # Auto, Initial, or Off
    # Auto — VPA directly sets resource requests and restarts pods with new values
    # Initial — only sets recommendations on first deployment, then stops
    # Off — only provides recommendations via API without applying them

  resourcePolicy:
    containerPolicies:
    - containerName: order-service
      minAllowed:
        cpu: "100m"
        memory: "128Mi"
      maxAllowed:
        cpu: "2"
        memory: "2Gi"
      controlledResources:
      - cpu
      - memory

# Recommended workflow for VPA adoption:
# 1. Start with updateMode: "Off" to collect recommendations without applying them
# 2. Monitor recommendations over 1-2 weeks of real traffic patterns
# 3. Validate that recommended values are reasonable and won't cause OOM
# 4. Switch to "Initial" mode to set requests once during deployment
# 5. Only use "Auto" for workloads with stable, predictable resource profiles
```

---

## Constraints

### MUST DO

- Always set CPU and memory requests AND limits — omitting either causes scheduler misbehavior or allows unbounded resource consumption leading to OOM kills
- Use separate readiness and liveness probe endpoints to avoid masking the difference between startup slowness and runtime failure states
- Configure startup probes for any service with a warm-up period exceeding 10 seconds (database connections, cache population, TLS handshake chains)
- Set maxUnavailable: 0 for rolling deployments in production environments where zero downtime is required

### MUST NOT DO

- Set resource limits higher than your node's available capacity — this causes cluster-wide scheduling failures and can block pod creation entirely
- Use the same HTTP endpoint for both readiness and liveness probes — identical endpoints mask startup problems as runtime failures or vice versa
- Configure HPA without a stabilization window on scale-down — rapid scale-up followed by immediate scale-down creates flapping that wastes resources and disrupts users

---

## Output Template

When this skill is active, all generated Kubernetes manifests must contain:

1. **Deployment** with `resources.requests`, `resources.limits`, startup/readiness/liveness probes, and rolling update strategy (`maxUnavailable: 0`)
2. **HPA** with at least CPU-based scaling plus one custom metric, asymmetric scale-up/scale-down behavior
3. **PDB** with either `minAvailable` or `maxUnavailable` matching the deployment's label selector
4. **Service** if the deployment exposes endpoints, with appropriate port mapping and selector

---

## Related Skills

| Skill | Purpose |
|---|---|
| `microservices-architecture` | Define service boundaries before designing their individual Kubernetes deployments |
| `observability-patterns` | Add metrics, tracing, and alerting to deployed workloads for operational visibility |
| `service-mesh-patterns` | Configure traffic splitting, mTLS, and circuit breakers across deployments |
