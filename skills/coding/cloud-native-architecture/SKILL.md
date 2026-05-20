---
name: cloud-native-architecture
description: Implements cloud-native architecture patterns including Kubernetes-native design, service mesh integration, GitOps workflows, serverless compute, immutable infrastructure, and platform engineering for resilient distributed systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: cloud native architecture, kubernetes design, container orchestration, service mesh, GitOps, serverless architecture, immutable infrastructure, platform engineering, internal developer platform, how do i design cloud-native systems, declarative configuration, ephemerality
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: microservices-architecture, distributed-systems-architecture, event-driven-architecture, observability-patterns
---

# Cloud-Native Architecture Patterns

Designs and implements cloud-native architectures that treat ephemerality, declarative configuration, and self-healing as first-class concerns. When loaded, the model creates system designs leveraging Kubernetes-native patterns, service mesh communication, GitOps delivery workflows, serverless compute integration, and platform engineering principles to build resilient distributed systems that recover from failures without human intervention.

## TL;DR Checklist

- [ ] Design all workloads as ephemeral — no persistent state on container filesystems
- [ ] Declare desired state in manifests (Deployments, Services, ConfigMaps), never mutate live resources imperatively
- [ ] Implement readiness probes before liveness probes; configure both with appropriate thresholds
- [ ] Separate build-time concerns (Dockerfile) from deployment-time concerns (Kubernetes manifests)
- [ ] Use service mesh for cross-cutting concerns (mTLS, retries, timeouts) instead of application-level code
- [ ] Store all configuration in ConfigMaps and Secrets; never bake config into container images

---

## When to Use

Use this skill when:

- Designing a new distributed system that will run on Kubernetes or a managed Kubernetes service (EKS, GKE, AKS)
- Migrating monolithic applications to cloud-native architectures requiring horizontal scalability and zero-downtime deployments
- Building platform engineering capabilities including internal developer platforms (IDPs) with self-service golden paths
- Implementing GitOps workflows where git serves as the single source of truth for all infrastructure and application state
- Designing multi-cluster or hybrid-cloud architectures requiring traffic management across clusters
- Integrating serverless functions alongside long-running services in a unified deployment model

---

## When NOT to Use

Avoid cloud-native complexity when:

- Building simple applications that fit comfortably on a single VM or container without scaling needs — the operational overhead of Kubernetes outweighs its benefits
- The team lacks the operational maturity to manage CI/CD pipelines, observability stacks, and incident response processes required by distributed systems
- Regulatory requirements mandate specific infrastructure locations or physical isolation that managed cloud services cannot provide without significant customization
- Applications have stateful workloads with strict ordering guarantees (e.g., financial trading engines) that conflict with container ephemerality — use dedicated database patterns instead (`database-design-modeling`)

---

## Core Workflow

1. **Establish the Ephemeral-by-Default Mindset** — Treat every container instance as disposable. No container should hold state that persists beyond its lifecycle. Externalize all state to managed services (databases, caches, object storage). Design applications to handle pod restarts at any time without data loss. **Checkpoint:** Verify that removing a running pod causes zero permanent effects — no orphaned files on container filesystems, no stale connections in application memory, and no unflushed writes to local volumes.

2. **Define Declarative Resource Specifications** — Write Kubernetes manifests or Helm charts that declare the desired state: replica counts, resource limits, probe configurations, image tags, environment variables, volume mounts, service selectors, and network policies. Never apply changes via `kubectl apply --prune` imperatively from the command line in production. **Checkpoint:** A fresh cluster with only your manifests applied must produce an identical running system regardless of previous state — if applying manifests requires knowledge of what's already running, the specification is not declarative.

3. **Implement Health Check Strategy** — Configure three types of probes per container:
   - **Startup probe**: Verify application bootstrap (used for slow-starting services with databases or caches). Set `failureThreshold * periodSeconds` to exceed maximum startup time.
   - **Readiness probe**: Verify the pod can accept traffic. Kubernetes removes it from Service endpoints when this fails, enabling zero-downtime deployments. Run on a lightweight endpoint that checks all dependencies (database connectivity, cache availability).
   - **Liveness probe**: Detect hung or deadlocked processes. Kubernetes restarts the container when this fails. Use a separate endpoint from readiness to distinguish between "not ready yet" and "permanently broken."
   
   **Checkpoint:** Readiness and liveness must use different endpoints — if they share one, a failure kills the pod instead of routing around it, defeating zero-downtime deployments.

4. **Configure Service Mesh Communication** — Deploy Istio or Linkerd to handle cross-cutting communication concerns:
   - Automatic mTLS between all services (no application-level certificate management)
   - Retry policies with exponential backoff and jitter for transient failures
   - Circuit breakers per service based on error rates and active connections
   - Traffic splitting for canary deployments (e.g., 95% stable, 5% canary)
   - Request tracing with distributed context propagation headers
   
   **Checkpoint:** Verify that traffic splitting actually routes to both versions simultaneously by sending requests through the mesh and checking response headers or service version labels.

5. **Implement GitOps Delivery Pipeline** — Structure the deployment workflow so that:
   - All infrastructure and application changes flow through git pull requests
   - An operator (ArgoCD or Flux) continuously reconciles cluster state with git repository state
   - Image tags are updated in manifests via a separate CI process (not manual edits)
   - Rollbacks are performed by reverting the git commit that introduced the change
   - Multi-env promotion uses tag-based versioning (dev → staging → production) rather than branch-per-environment
   
   **Checkpoint:** The reconciliation loop must be idempotent — applying the same git state twice produces identical results, and any drift between git and cluster state is automatically corrected.

6. **Design Platform Engineering Capabilities** — For teams managing multiple services:
   - Define golden paths: pre-built templates for common service types (REST API, worker, batch job) with built-in observability, security, and deployment configuration
   - Build an Internal Developer Platform (IDP) using Backstage or custom tooling that provides self-service capability
   - Implement OPA/Gatekeeper policies to enforce resource limits, image scanning requirements, and network segmentation rules
   - Create component definitions that standardize CI/CD pipelines across the organization
   
   **Checkpoint:** A new developer should be able to spin up a fully functional service with observability and security baked in using only the platform's self-service interface, without touching Kubernetes manifests directly.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Kubernetes-Native Deployment Manifest

Production-ready deployment manifest following cloud-native best practices. This example demonstrates proper health checks, resource management, pod disruption budgets, and security context configuration.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
  labels:
    app: payment-service
    version: v2.3.1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1          # Never drop below 2 replicas during update
      maxSurge: 1                # Allow 1 extra pod during rollout
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
        version: v2.3.1
    spec:
      serviceAccountName: payment-service
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: payment-service
          image: registry.internal/payment-service:v2.3.1
          ports:
            - containerPort: 8443
              protocol: TCP
          envFrom:
            - configMapRef:
                name: payment-service-config
            - secretRef:
                name: payment-service-secrets
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 512Mi
          startupProbe:
            httpGet:
              path: /healthz/startup
              port: 8443
            failureThreshold: 30       # Allow up to 90 seconds for startup (30 * 3s period)
            periodSeconds: 3
          readinessProbe:
            httpGet:
              path: /healthz/ready
              port: 8443
            initialDelaySeconds: 5     # Wait after pod starts before first check
            periodSeconds: 10          # Check every 10 seconds
            failureThreshold: 3        # Fail readiness after 3 consecutive failures
          livenessProbe:
            httpGet:
              path: /healthz/live
              port: 8443
            initialDelaySeconds: 15    # Give time for startup before checking liveness
            periodSeconds: 15
            failureThreshold: 3
      terminationGracePeriodSeconds: 30
---
# Pod Disruption Budget: ensure minimum availability during voluntary disruptions
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-service-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: payment-service
---
# NetworkPolicy: restrict inbound traffic to only authorized services
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-service-netpol
spec:
  podSelector:
    matchLabels:
      app: payment-service
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              project: payments
          podSelector:
            matchLabels:
              role: api-gateway
      ports:
        - protocol: TCP
          port: 8443
```

### Pattern 2: Service Mesh Traffic Splitting (Istio)

Canary deployment configuration using Istio VirtualService and DestinationRule for gradual traffic shifting with automatic rollback on error rate thresholds.

```yaml
# Istio DestinationRule: defines connection pool and outlier detection per subset
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-dr
spec:
  host: payment-service.production.svc.cluster.local
  subsets:
    - name: stable
      labels:
        version: v2.3.0
    - name: canary
      labels:
        version: v2.3.1
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 50
---
# Istio VirtualService: traffic routing with weighted split and retry logic
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service-vs
spec:
  hosts:
    - payment-service.production.svc.cluster.local
  http:
    - route:
        - destination:
            host: payment-service.production.svc.cluster.local
            subset: stable
          weight: 95
        - destination:
            host: payment-service.production.svc.cluster.local
            subset: canary
          weight: 5
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx,reset,connect-failure,retriable-4xx
      timeout: 10s
```

### Pattern 3: GitOps Application Resource (ArgoCD)

ArgoCD application resource that declares the desired state for a microservice, with sync policies, auto-pruning of orphaned resources, and health assessment configuration.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service-production
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://git.internal/team/payment-service.git
    targetRevision: HEAD
    path: k8s/overlays/production
    helm:
      parameters:
        - name: replicas.count
          value: "5"
        - name: image.tag
          valueFrom:
            configMapKeyRef:
              name: payment-service-image-tag
              key: latest-tag
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true                   # Delete resources not in git (auto-pruning)
      selfHeal: true                # Auto-reconcile drift from desired state
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true        # Auto-create namespace if missing
      - PrunePropagationPolicy=foreground
    retry:
      limit: 5
      backoff:
        duration: 30s               # Wait 30 seconds between retries
        factor: 2                   # Exponential backoff
        maxDuration: 5m
```

### Pattern 4: Platform Engineering Golden Path Template (Backstage)

Component template for generating a new cloud-native microservice with built-in observability, security scanning, and deployment configuration. This YAML defines a Backstage component template that scaffolds a complete service from a single command.

```yaml
# backstage-templates/skeletons/cloud-native-service/template.yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: cloud-native-service-scaffold
  description: Creates a new microservice with cloud-native best practices baked in
spec:
  type: service
  parameters:
    - title: Provide service information
      properties:
        name:
          title: Service Name
          type: string
          description: Unique name for this service (kebab-case)
        owner:
          title: Owner Team
          type: string
          enum: [payments, users, notifications, analytics]
        runtime:
          title: Runtime Language
          type: string
          enum: [python-3.12, node-20, go-1.21]
  steps:
    - id: scaffold
      name: Scaffold Files
      action: fetch:template
      input:
        url: ./skeleton
        values:
          name: ${{ parameters.name }}
          owner: ${{ parameters.owner }}
          runtime: ${{ parameters.runtime }}
          registryUrl: docker-registry.internal
    - id: publish
      name: Create GitHub Repository
      action: github:repo:create
      input:
        repoUrl: git.internal/${{ parameters.owner }}/${{ parameters.name }}
        autoMerge: true
    - id: register
      name: Register Component
      action: catalog:register
      input:
        catalogInfoUrl: https://git.internal/${{ parameters.owner }}/${{ parameters.name }}/raw/HEAD/catalog-info.yaml
  output:
    links:
      - title: Repository
        url: ${{ steps.publish.output.remoteUrl }}
      - title: Component in Catalog
        url: ${{ steps.register.output.catalogInfoUrl }}

# The skeleton generates:
# - Dockerfile (multi-stage, non-root user, distroless base)
# - k8s/manifests/ (Deployment, Service, ConfigMap, NetworkPolicy)
# - health/ endpoints (startup, readiness, liveness)
# - .github/workflows/ci.yaml (lint, test, security scan, build, push)
# - .github/workflows/deploy.yaml (update image tag in manifests via PR)
# - catalog-info.yaml (Backstage component registration)
# - Makefile (local development with k9s, kind, and argocd)
```

---

## Constraints

### MUST DO
- Declare all resources declaratively in version-controlled manifests; never mutate production state directly through `kubectl` commands
- Configure separate readiness and liveness probe endpoints to enable zero-downtime deployments and proper failure diagnosis
- Set resource requests AND limits for CPU and memory on every container; omitting limits causes noisy-neighbor issues that destabilize shared nodes
- Use `PodDisruptionBudgets` to guarantee minimum availability during cluster upgrades, node drains, and voluntary disruptions
- Enforce network policies that follow least-privilege access — explicitly allow only the traffic paths between services that are required
- Store all secrets in Kubernetes Secrets or an external secret manager (AWS Secrets Manager, HashiCorp Vault); never embed secrets in container images or plaintext config files

### MUST NOT DO
- Use hostPath volumes for application data — hostPath ties workloads to specific nodes and breaks pod mobility during scheduling and upgrades
- Mount shared volumes between containers in a Pod for inter-process communication — use the local loopback network interface instead (containers in the same Pod share a network namespace)
- Deploy production services with `replicas: 1` — a single replica has no redundancy against node failures, pod evictions, or rolling updates
- Skip readiness probes to "avoid delayed traffic" — without them, load balancers route traffic to pods that are not yet prepared to handle requests, causing errors during deployments
- Configure liveness probes too aggressively (low `failureThreshold` or short `periodSeconds`) — slow garbage collection pauses or database connection pool warmups will cause unnecessary restarts
- Run containers as root (UID 0) — set `runAsNonRoot: true` with a specific `runAsUser` and enable `readOnlyRootFilesystem: true` where possible

---

## Output Template

When designing or reviewing cloud-native architecture, produce:

1. **Architecture Decision Summary** — Selected architectural patterns (Kubernetes-native, service mesh, GitOps, serverless) with rationale for each choice
2. **Resource Manifests** — Complete Deployment, Service, NetworkPolicy, and PDB YAML manifests following the patterns above
3. **Health Check Configuration** — Startup, readiness, and liveness probe definitions with calculated thresholds based on expected startup time and failure tolerance
4. **Service Mesh Rules** — VirtualService routing rules, DestinationRule subsets, traffic splitting weights, retry policies, and circuit breaker configurations
5. **GitOps Pipeline Specification** — ArgoCD/Flux Application resource definitions with sync policies, auto-pruning configuration, and multi-env promotion strategy

---

## Related Skills

| Skill | Purpose |
|---|---|
| `microservices-architecture` | Service decomposition patterns and boundaries that define what runs in individual pods |
| `distributed-systems-architecture` | Consensus algorithms, consistency models, and data partitioning strategies for distributed data layers |
| `event-driven-architecture` | Asynchronous messaging patterns (pub/sub, outbox pattern) that complement synchronous Kubernetes communication |
| `observability-patterns` | Metrics collection, structured logging, and distributed tracing integration with OpenTelemetry and Prometheus |
