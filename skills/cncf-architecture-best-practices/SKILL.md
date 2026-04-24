---
name: cncf-architecture-best-practices
description: Cloud Native Computing Foundation (CNCF) architecture best practices
  for production-grade Kubernetes deployments. Covers service mesh, CNI, GitOps, CI/CD,
  observability, security, networking, and scaling patterns across the CNCF landscape.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: architecture best practices, architecture-best-practices, cdn, computing,
    infrastructure as code, monitoring, native, cloudformation
---



# CNCF Architecture Best Practices

> **Load this skill** when designing, implementing, or reviewing cloud-native architectures using CNCF projects (Kubernetes, Istio, CNI, Argo, Tekton, Prometheus, etc.). This skill provides production-ready patterns for scalable, secure, and maintainable cloud-native systems.

---

## TL;DR Checklist

When implementing cloud-native architectures:

- [ ] **Kubernetes First**: Design for pods, not nodes; use labels/selectors, not IPs
- [ ] **Service Mesh**: Istio/Linkerd for mTLS, observability, traffic control
- [ ] **CNI Choice**: Cilium for eBPF-based policies; Calico for BGP routing
- [ ] **GitOps**: Argo CD or Flux for declarative deployment and drift detection
- [ ] **CI/CD**: Tekton or Argo Workflows for Kubernetes-native pipelines
- [ ] **Observability Stack**: Prometheus (metrics), Grafana (dashboard), Loki (logs), Jaeger (tracing)
- [ ] **Security**: NetworkPolicy, PodSecurity, mTLS, secret management
- [ ] **Scaling**: Horizontal Pod Autoscaler + Cluster Autoscaler + VPA
- [ ] **Fail Fast**: Early exit on health checks; readiness/liveness probes
- [ ] **5 Laws**: Early Exit, Parse Don't Validate, Atomic Predictability, Fail Fast, Intentional Naming

---

## 1. Purpose and Use Cases

### Why Architecture Patterns Matter for CNCF Projects

Cloud-native architecture is not just about running containers in Kubernetes—it's about designing systems that leverage the full power of the CNCF ecosystem while avoiding common pitfalls. Proper architecture patterns provide:

| Benefit | Description |
|---------|-------------|
| **Scalability** | Systems grow horizontally without architectural changes |
| **Resilience** | Automatic failover, self-healing, and graceful degradation |
| **Observability** | Built-in metrics, logs, and traces for production visibility |
| **Security** | Zero-trust architecture with service-to-service authentication |
| **Maintainability** | Declarative configuration, GitOps workflows, version control |
| **Cost Efficiency** | Right-sizing, auto-scaling, and resource optimization |

### Common Use Cases

1. **Microservices Architecture** - Decoupled services communicating via gRPC/HTTP with service mesh

2. **Data Pipeline Processing** - Event-driven architectures with Kafka, Prometheus metrics, and Argo Workflows

3. **Multi-tenant SaaS** - Namespace isolation, network policies, and resource quotas per tenant

4. **Hybrid Multi-Cloud** - Cluster API, KubeSphere, or K3s for consistent management across clouds

5. **Edge Computing** - KubeEdge or K3s for IoT and edge device management

6. **Serverless Applications** - Knative for event-driven, scale-to-zero workloads

7. **Legacy Migration** - Gradual refactoring from monolith to microservices with service mesh

### When This Skill Is Appropriate

- Designing new cloud-native applications
- Migrating existing applications to Kubernetes
- Reviewing production architecture for best practices
- Implementing GitOps pipelines with Argo CD or Flux
- Setting up observability with Prometheus/Grafana/Loki/Jaeger
- Configuring security controls and network policies

---

## 2. Design Pattern Overview

### Service Mesh Patterns

Service mesh provides non-functional capabilities to services without code changes.

#### Pattern: Sidecar Injection

**Description**: Each pod has a proxy container (Envoy) injected alongside the application container.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
        version: v1
        tier: backend
        env: production
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: payment-service
        image: myregistry/payment-service:v1.2.3
        ports:
        - containerPort: 8080
        env:
        - name: SERVICE_PORT
          value: "8080"
        - name: LOG_LEVEL
          value: "info"
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
      # Istio sidecar injection happens automatically via namespace label
```

**Configuration**:
```bash
# Enable automatic sidecar injection in namespace
kubectl label namespace production istio-injection=enabled

# Verify sidecar injection
kubectl get pods -n production -l app=payment-service -o wide
```

#### Pattern: Traffic Management

**Description**: Route traffic between service versions with canary deployments.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service
  namespace: production
spec:
  hosts:
  - payment-service.production.svc.cluster.local
  http:
  - match:
    - headers:
        x-version:
          exact: canary
    route:
    - destination:
        host: payment-service
        subset: canary
        port:
          number: 8080
      weight: 100
  - route:
    - destination:
        host: payment-service
        subset: stable
        port:
          number: 8080
      weight: 90
    - destination:
        host: payment-service
        subset: canary
        port:
          number: 8080
      weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: UPGRADE
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    loadBalancer:
      simple: ROUND_ROBIN
  subsets:
  - name: stable
    labels:
      version: v1.2.0
  - name: canary
    labels:
      version: v1.2.1
```

### CNI (Container Network Interface) Patterns

#### Pattern: Network Policy Enforcement

**Description**: Define allowed traffic between namespaces and pods.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-service-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: payment-service
      tier: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: frontend
    - podSelector:
        matchLabels:
          app: api-gateway
    ports:
    - protocol: TCP
      port: 8080
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-service-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: payment-service
      tier: backend
  policyTypes:
  - Egress
  egress:
  # Allow DNS
  - to:
    - namespaceSelector: {}
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
  # Allow database access
  - to:
    - podSelector:
        matchLabels:
          app: postgres
          tier: data
    ports:
    - protocol: TCP
      port: 5432
  # Allow external HTTPS
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 10.0.0.0/8
        - 172.16.0.0/12
        - 192.168.0.0/16
    ports:
    - protocol: TCP
      port: 443
```

#### Pattern: Cilium eBPF Network Policies

**Description**: Advanced network policies using eBPF for performance.

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: payment-service-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: payment-service
  ingress:
  - fromEntities:
    - cluster
    - world
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
      rules:
        http:
        - method: "POST"
          path: "/api/v1/payments"
        - method: "GET"
          path: "/api/v1/payments/.*"
  egress:
  - toEntities:
    - cluster
    toPorts:
    - ports:
      - port: "5432"
        protocol: TCP
      rules:
        http:
        - method: "ALL"
```

### GitOps Patterns

#### Pattern: Argo CD ApplicationSet

**Description**: Manage multiple applications declaratively.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: multi-tenant-applications
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - tenant: marketing
        repo: https://github.com/myorg/tenant-marketing.git
        path: k8s
        destination: marketing-namespace
      - tenant: sales
        repo: https://github.com/myorg/tenant-sales.git
        path: k8s
        destination: sales-namespace
  template:
    metadata:
      name: '{{tenant}}-application'
    spec:
      project: default
      source:
        repoURL: '{{repo}}'
        targetRevision: HEAD
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{destination}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
        - CreateNamespace=true
        - PrunePropagationPolicy=foreground
        - PruneLast=true
```

#### Pattern: Flux KustomizeReconciliation

**Description**: Continuous reconciliation with Flux v2.

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1beta2
kind: Kustomization
metadata:
  name: production-applications
  namespace: flux-system
spec:
  interval: 10m0s
  path: ./clusters/production
  prune: true
  validation: client
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
  postBuild:
    substitute:
      ENV: production
      REGION: us-west-2
    substituteFrom:
    - kind: ConfigMap
      name: production-overrides
```

### CI/CD Pipeline Patterns

#### Pattern: Tekton Task Pipeline

**Description**: Kubernetes-native CI/CD with Tekton.

```yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  name: build-deploy-payment-service
spec:
  pipelineRef:
    name: build-deploy-pipeline
  serviceAccountName: tekton-bot
  workspaces:
  - name: git-source
    persistentVolumeClaim:
      claimName: build-pvc
  - name: docker-config
    secret:
      secretName: docker-config
  params:
  - name: git-url
    value: https://github.com/myorg/payment-service.git
  - name: git-revision
    value: HEAD
  - name: image-url
    value: gcr.io/my-project/payment-service
  - name: namespace
    value: production
---
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: build-deploy-pipeline
spec:
  workspaces:
  - name: git-source
  - name: docker-config
  params:
  - name: git-url
  - name: git-revision
  - name: image-url
  - name: namespace
  tasks:
  - name: fetch-repository
    taskRef:
      name: git-clone
    workspaces:
    - name: output
      workspace: git-source
    params:
    - name: url
      value: $(params.git-url)
    - name: revision
      value: $(params.git-revision)
  
  - name: build-image
    taskRef:
      name: kaniko
    workspaces:
    - name: dockerconfig
      workspace: docker-config
    params:
    - name: IMAGE
      value: $(params.image-url)
    - name: CONTEXT
      value: src
    runAfter:
    - fetch-repository
  
  - name: deploy
    taskRef:
      name: kubectl-apply
    params:
    - name: namespace
      value: $(params.namespace)
    - name: manifest
      value: |
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: payment-service
          namespace: $(params.namespace)
        spec:
          replicas: 3
          selector:
            matchLabels:
              app: payment-service
          template:
            metadata:
              labels:
                app: payment-service
            spec:
              containers:
              - name: payment-service
                image: $(params.image-url):$(context.pipelineRun.uid)
                ports:
                - containerPort: 8080
    runAfter:
    - build-image
```

---

## 3. Legacy vs Modern Approaches

### Infrastructure Management

| Legacy Approach | Modern CNCF Approach |
|----------------|---------------------|
| Manual VM provisioning | Cluster API / Kubespray |
| Shell scripts for deployment | Argo CD / Flux GitOps |
| Direct `kubectl apply` | CI/CD pipelines with validation |
| Per-cluster configuration | Git-based configuration management |
| On-prem-only | Multi-cloud / Hybrid-cloud |

### Networking

| Legacy Approach | Modern CNCF Approach |
|----------------|---------------------|
| Host networking | CNI with Calico/Cilium |
| Manual iptables rules | NetworkPolicy with eBPF enforcement |
| Service discovery via DNS only | Service mesh with mTLS |
| External load balancer | Ingress Controller with Istio |
| Static routes | Dynamic service mesh routing |

### Application Deployment

| Legacy Approach | Modern CNCF Approach |
|----------------|---------------------|
| Manual deployments | Argo CD automatic sync |
| No drift detection | GitOps automatic reconciliation |
| Patch deployments | Immutable container images |
| Environment-specific configs | Kustomize overlays |
| No rollback strategy | Git-based rollback |

### Observability

| Legacy Approach | Modern CNCF Approach |
|----------------|---------------------|
| Log files on disk | Loki with Prometheus metrics |
| Manual monitoring setup | Prometheus Operator |
| Separate tools | Unified observability stack |
| Alert on metrics only | Logs + Metrics + Traces correlation |
| On-prem grafana | Grafana Cloud / Managed stacks |

### Security

| Legacy Approach | Modern CNCF Approach |
|----------------|---------------------|
| Firewall rules | NetworkPolicy with Cilium |
| Static credentials | Kubernetes Secrets + Vault |
| No service authentication | mTLS with Istio/Linkerd |
| Perimeter security | Zero-trust architecture |
| Manual RBAC | RBAC with Kustomize |

### Scaling

| Legacy Approach | Modern CNCF Approach |
|----------------|---------------------|
| Manual scaling | HPA + Cluster Autoscaler |
| Vertical scaling only | Horizontal + Vertical scaling |
| No resource limits | Resource requests/limits |
| No health checks | Liveness/Readiness probes |
| Static capacity planning | Predictive scaling with VPA |

---

## 4. Tool Combinations

### Service Mesh (Istio/Linkerd with Kubernetes)

#### Full Service Mesh Architecture

```yaml
# Istio Installation with addon mesh
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-control-plane
  namespace: istio-system
spec:
  profile: default
  hub: gcr.io/istio-release
  tag: 1.19.0
  values:
    global:
      meshID: mesh-1
      multiCluster:
        clusterName: primary
      network: network1
    pilot:
      env:
        ENABLE_AUTO_MESH_HOSTNAME: true
    gateways:
      istio-ingressgateway:
        autoscaling:
          enabled: true
          minReplicas: 2
          maxReplicas: 10
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 1000m
            memory: 1024Mi
    addOns:
      grafana:
        enabled: true
      kiali:
        enabled: true
      prometheus:
        enabled: true
      tracing:
        enabled: true
        jaeger:
          enabled: true
```

#### Production Service Mesh Patterns

```yaml
# Circuit breaker configuration
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-circuit-breaker
  namespace: production
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: UPGRADE
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 30

# Rate limiting
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service-ratelimit
  namespace: production
spec:
  hosts:
  - payment-service
  http:
  - match:
    - headers:
        x-rate-limit:
          exact: "true"
    route:
    - destination:
        host: payment-service
      headers:
        request:
          add:
            x-ratelimit: "limited"
  - route:
    - destination:
        host: payment-service
```

### CNI (Calico/Cilium for Networking)

#### Calico Configuration

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  # Use CNI plugin
  cni:
    type: Calico
  # Calico configuration
  calico:
    version: v3.25.0
    # Enable BGP routing
    bgp: Enabled
    # IPAM configuration
    ipam:
      type: Calico
      # Pod CIDR
      blockSize: 26
  # Kubernetes provider
  kubernetesProvider: EKS
  # Variant
  variant: Calico
---
apiVersion: operator.tigera.io/v1
kind: APIServer
metadata:
  name: default
spec: {}
```

#### Cilium Configuration with Hubble

```yaml
apiVersion: helm.cni.cncf.io/v1
kind: CiliumInstall
metadata:
  name: cilium
  namespace: kube-system
spec:
  values:
    # Enable Hubble for observability
    hubble:
      enabled: true
      relay:
        enabled: true
      ui:
        enabled: true
    # Enable eBPF dataplane
    operator:
      replicas: 2
    # Enable mesh encryption
    encryption:
      enabled: true
      type: wireguard
    # Enable network policies
    networkPolicy:
      enabled: true
    # Enable Cilium CNI
    cni:
      enabled: true
    # Metrics
    metrics:
      enabled: true
      serviceMonitor:
        enabled: true
```

### GitOps (Argo CD/Flux for Deployment)

#### Argo CD Configuration

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: argocd-secret
  namespace: argocd
type: Opaque
stringData:
  admin.password: $2a$10$1234567890abcdef
  admin.passwordMtime: "2024-01-01T00:00:00Z"
---
apiVersion: argoproj.io/v1beta1
kind: ArgoCD
metadata:
  name: argocd
  namespace: argocd
spec:
  server:
    autoscaling:
      enabled: true
      minReplicas: 2
      maxReplicas: 10
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
  repos:
  - url: https://github.com/myorg/infrastructure
    name: infrastructure
  - url: https://github.com/myorg/apps
    name: apps
  configManagementPlugins: |
    - name: kustomize-plugin
      init:
        command: ["sh", "-c", "kustomize build"]
      generate:
        command: ["sh", "-c", "kustomize build ."]
```

#### Flux Configuration

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: GitRepository
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 5m0s
  url: https://github.com/myorg/infrastructure
  ref:
    branch: main
  secretRef:
    name: github-token
---
apiVersion: kustomize.toolkit.fluxcd.io/v1beta2
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m0s
  path: ./clusters/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: infrastructure
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

### CI/CD (Tekton/Argo Workflows for Pipelines)

#### Tekton Pipeline with Quality Gates

```yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  name: ci-cd-payment-service
spec:
  pipelineRef:
    name: ci-cd-pipeline
  params:
  - name: image-url
    value: gcr.io/my-project/payment-service
  - name: namespace
    value: production
  - name: git-url
    value: https://github.com/myorg/payment-service.git
  - name: git-revision
    value: HEAD
---
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: ci-cd-pipeline
spec:
  params:
  - name: image-url
  - name: namespace
  - name: git-url
  - name: git-revision
  workspaces:
  - name: source
  tasks:
  # 1. Clone source code
  - name: clone
    taskRef:
      name: git-clone
    workspaces:
    - name: output
      workspace: source
    params:
    - name: url
      value: $(params.git-url)
    - name: revision
      value: $(params.git-revision)
  
  # 2. Run unit tests
  - name: unit-tests
    taskRef:
      name: pytest
    params:
    - name: path
      value: tests/unit
    runAfter:
    - clone
  
  # 3. Run integration tests
  - name: integration-tests
    taskRef:
      name: pytest
    params:
    - name: path
      value: tests/integration
    runAfter:
    - unit-tests
  
  # 4. Build container image
  - name: build
    taskRef:
      name: kaniko
    workspaces:
    - name: dockerconfig
      workspace: docker-config
    params:
    - name: IMAGE
      value: $(params.image-url):$(context.pipelineRun.uid)
    runAfter:
    - integration-tests
  
  # 5. Run security scan
  - name: security-scan
    taskRef:
      name: trivy
    params:
    - name: image-ref
      value: $(params.image-url):$(context.pipelineRun.uid)
    runAfter:
    - build
  
  # 6. Deploy to staging
  - name: deploy-staging
    taskRef:
      name: kubectl-apply
    params:
    - name: namespace
      value: staging
    runAfter:
    - security-scan
  
  # 7. Smoke tests
  - name: smoke-tests
    taskRef:
      name: pytest
    params:
    - name: path
      value: tests/smoke
    runAfter:
    - deploy-staging
  
  # 8. Promote to production (manual approval)
  - name: promote-production
    taskRef:
      name: manual-approval
    params:
    - name: message
      value: "Deploy to production?"
    - name: namespace
      value: production
    - name: image
      value: $(params.image-url):$(context.pipelineRun.uid)
    runAfter:
    - smoke-tests
```

### Observability (Prometheus/Grafana/Loki/Jaeger)

#### Complete Observability Stack

```yaml
# Prometheus Operator
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
  namespace: monitoring
spec:
  replicas: 2
  retention: 30d
  storage:
    volumeClaimTemplate:
      spec:
        storageClassName: standard
        resources:
          requests:
            storage: 100Gi
  ruleSelector:
    matchLabels:
      prometheus: rules
  serviceAccount:
    create: true
  podMonitorSelector:
    matchLabels:
      prometheus: podmon
  serviceMonitorSelector:
    matchLabels:
      prometheus: servicemon
---
# Grafana with dashboards
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:10.0.0
        ports:
        - containerPort: 3000
        volumeMounts:
        - name: grafana-data
          mountPath: /var/lib/grafana
        - name: grafana-datasources
          mountPath: /etc/grafana/provisioning/datasources
          readOnly: true
        - name: grafana-dashboards
          mountPath: /etc/grafana/provisioning/dashboards
          readOnly: true
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 1Gi
      volumes:
      - name: grafana-data
        emptyDir: {}
      - name: grafana-datasources
        configMap:
          name: grafana-datasources
      - name: grafana-dashboards
        configMap:
          name: grafana-dashboards
---
# Loki for logs
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
  namespace: monitoring
data:
  config.yaml: |
    auth_enabled: false
    server:
      http_listen_port: 3100
    ingester:
      wal:
        dir: /data/loki/wal
      chunk_idle_period: 5m
      chunk_block_size: 262144
      chunk_encoding: snappy
      chunk_retain_period: 1m
      max_transfer_retries: 0
    schema_config:
      configs:
      - from: "2020-10-24"
        store: boltdb-shipper
        object_store: filesystem
        schema: v11
        index:
          prefix: index_
          period: 24h
    storage_config:
      filesystem:
        directory: /data/loki/chunks
    query_range:
      results_cache:
        enabled: true
        cache_ttl: 1h
    querier:
      max_concurrent: 20
---
# Jaeger for traces
apiVersion: v1
kind: ConfigMap
metadata:
  name: jaeger-config
  namespace: monitoring
data:
  jaeger.yaml: |
    query:
      ui:
        url: http://jaeger-query:16686
    collector:
      max-queue-size: 10000
      baggage:
        restrictions:
        - key: user_id
          max-value-length: 100
    storage:
      type: memory
      options:
        memory:
          max-traces: 100000
---
# Prometheus Rules for alerting
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kubernetes-prometheus-rules
  namespace: monitoring
  labels:
    prometheus: rules
spec:
  groups:
  - name: kubernetes-alerts
    rules:
    - alert: HighPodRestartRate
      expr: rate(kube_pod_container_status_restarts_total[15m]) > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High pod restart rate detected"
        description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} is restarting frequently"
    
    - alert: HighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "High error rate detected"
        description: "Service {{ $labels.service }} has error rate above 5%"
    
    - alert: LowResourceMemory
      expr: (kube_pod_container_status_ready * kube_pod_container_resource_limits_memory_bytes) / kube_pod_container_resource_requests_memory_bytes < 0.9
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Low memory resource margin"
        description: "Pod {{ $labels.pod }} has less than 10% memory margin"
    
    - alert: HighLatency
      expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High latency detected"
        description: "Service {{ $labels.service }} has p99 latency above 2 seconds"
```

### Edge Computing (KubeEdge/K3s)

#### KubeEdge Configuration

```yaml
# KubeEdge Cloud Core
apiVersion: v1
kind: ConfigMap
metadata:
  name: edgecore-config
  namespace: kubeedge
data:
  edgecore.yaml: |
    apiVersion: edgecore.config.kubeedge.io/v1alpha2
    kind: EdgeCore
    modules:
      edgeHub:
        enable: true
        enableTLS: true
        mqttMode: 2
        servers: https://0.0.0.0:10002
        upstream: kubernetes://https://127.0.0.1:6443
        downstream: mqtt://127.0.0.1:1883
      edgecontroller:
        enable: true
        syncPod: true
        syncNodeTime: true
---
# KubeEdge Edge Core
apiVersion: v1
kind: ConfigMap
metadata:
  name: edgecore-config
  namespace: kubeedge
data:
  edgecore.yaml: |
    apiVersion: edgecore.config.kubeedge.io/v1alpha2
    kind: EdgeCore
    modules:
      edgeHub:
        enable: true
        enableTLS: true
        servers: https://cloud.kubeedge.io:10002
        certpath: /etc/kubeedge/certs
        keypath: /etc/kubeedge/certs
      edgecontroller:
        enable: true
      deviceController:
        enable: true
      metaManager:
        enable: true
        metaServer:
          enable: true
          listen: unix:///var/lib/kubeedge/kubeedge.sock
```

### Serverless (Knative/OpenFaaS)

#### Knative Service

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: payment-notifier
  namespace: production
spec:
  template:
    metadata:
      labels:
        app: payment-notifier
        version: v1
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "10"
        autoscaling.knative.dev/target: "70"
        autoscaling.knative.dev/targetBurstCapacity: "100"
    spec:
      containerConcurrency: 80
      timeoutSeconds: 300
      containers:
      - image: gcr.io/my-project/payment-notifier:v1.0.0
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        env:
        - name: NODE_ENV
          value: "production"
        - name: LOG_LEVEL
          value: "info"
        ports:
        - containerPort: 8080
          protocol: TCP
        startupProbe:
          httpGet:
            path: /
            port: 8080
          failureThreshold: 30
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 20
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### OpenFaaS Function

```yaml
version: 1.0
provider:
  name: openfaas
  gateway: http://gateway.openfaas:8080
functions:
  payment-notifier:
    lang: python3-http
    handler: ./func
    image: myregistry/payment-notifier:latest
    labels:
      com.openfaas.scale.min: "1"
      com.openfaas.scale.max: "10"
      com.openfaas.scale.target: "70"
    environment:
      NODE_ENV: production
      LOG_LEVEL: info
      NOTIFIER_URL: http://notifier-service:8080
    annotations:
      prometheus.io/scrape: "true"
      prometheus.io/port: "8082"
    limits:
      cpu: "500m"
      memory: "512Mi"
    requests:
      cpu: "100m"
      memory: "128Mi"
```

---

## 5. Scaling Patterns

### Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment-service-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-service
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
      - type: Pods
        value: 4
        periodSeconds: 60
      selectPolicy: Min
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
      selectPolicy: Max
```

### Cluster Autoscaling

```yaml
# GKE Cluster Autoscaler
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-status
  namespace: kube-system
data:
  status: |
    {
      "current": {
        "nodes": 10,
        "ready": 8,
        "notReady": 2
      },
      "lastScaleUp": {
        "timestamp": "2024-01-15T10:00:00Z",
        "replicas": 8
      },
      "pendingPods": [
        {
          "name": "payment-service-abc123",
          "namespace": "production",
          "resources": {
            "cpu": "500m",
            "memory": "512Mi"
          }
        }
      ]
    }
```

### Load Balancing Patterns

#### Ingress with Istio Gateway

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: payment-gateway
  namespace: production
  annotations:
    kubernetes.io/ingress.class: istio
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.payments.example.com
    secretName: payments-tls
  rules:
  - host: api.payments.example.com
    http:
      paths:
      - path: /api/v1
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80
      - path: /api/v2
        pathType: Prefix
        backend:
          service:
            name: api-gateway-v2
            port:
              number: 80
---
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: payments-gateway
  namespace: production
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: payments-tls
    hosts:
    - api.payments.example.com
```

#### Service Mesh Traffic Splitting

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-gateway-canary
  namespace: production
spec:
  hosts:
  - api-gateway
  gateways:
  - payments-gateway
  http:
  - match:
    - headers:
        x-env:
          exact: canary
    route:
    - destination:
        host: api-gateway-canary
        port:
          number: 80
      weight: 100
  - route:
    - destination:
        host: api-gateway
        port:
          number: 80
      weight: 90
    - destination:
        host: api-gateway-canary
        port:
          number: 80
      weight: 10
```

### CDN Integration

```yaml
# Cloudflare Tunnel for internal services
apiVersion: v1
kind: ConfigMap
metadata:
  name: cloudflare-tunnel-config
  namespace: production
data:
  config.yaml: |
    tunnel: abc123-tunnel-id
    credentials-file: /etc/cloudflare/credentials.json
    ingress:
    - hostname: api.payments.example.com
      service: http://api-gateway.production.svc.cluster.local:80
    - hostname: dashboard.payments.example.com
      service: http://dashboard.production.svc.cluster.local:3000
    - service: http_status:404
---
# Kubernetes Service exposed via tunnel
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: production
spec:
  selector:
    app: api-gateway
  ports:
  - name: http
    port: 80
    targetPort: 8080
  type: ClusterIP
```

---

## 6. Security Architecture

### Zero Trust Network

#### Network Policy with Micro-Segmentation

```yaml
# Default deny all traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
# Allow ingress from api-gateway
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-service-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: payment-service
      tier: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: frontend
    - podSelector:
        matchLabels:
          app: api-gateway
    ports:
    - protocol: TCP
      port: 8080
---
# Allow egress to database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-service-egress-db
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: payment-service
      tier: backend
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
          tier: data
    ports:
    - protocol: TCP
      port: 5432
---
# Allow DNS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-service-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector: {}
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
```

### Pod Security Standards

```yaml
# Pod Security Admission
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
---
# Pod Security Example - compliant pod
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-payment-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure-payment-service
  template:
    metadata:
      labels:
        app: secure-payment-service
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: payment-service
        image: gcr.io/my-project/payment-service:v1.0.0
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: config
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: tmp
        emptyDir: {}
      - name: config
        configMap:
          name: payment-service-config
```

### Secret Management

```yaml
# Kubernetes Secrets
apiVersion: v1
kind: Secret
metadata:
  name: payment-service-secrets
  namespace: production
type: Opaque
stringData:
  database-password: "secure-password-here"
  api-key: "secure-api-key-here"
---
# External Secret with Vault
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: payment-service-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: payment-service-secrets
    creationPolicy: Owner
  data:
  - secretKey: database-password
    remoteRef:
      key: secrets/payment-service/database
      property: password
  - secretKey: api-key
    remoteRef:
      key: secrets/payment-service/api
      property: key
---
# Vault Backend SecretStore
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: production
spec:
  provider:
    vault:
      server: "https://vault.example.com:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          path: kubernetes
          role: payment-service-role
          serviceAccountRef:
            name: payment-service-sa
```

### mTLS with Istio

```yaml
# Destination Rule with mTLS
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-mtls
  namespace: production
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
      clientCertificate: /etc/certs/cert-chain.pem
      privateKey: /etc/certs/key.pem
      caCertificates: /etc/certs/root-cert.pem
---
# Peer Authentication for namespace
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
---
# Authorization Policy
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: payment-service-authz
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - cluster.local/ns/frontend/sa/api-gateway
        namespaces:
        - frontend
        ips:
        - 10.0.0.0/8
    to:
    - operation:
        methods:
        - POST
        - GET
        paths:
        - /api/v1/payments
        - /api/v1/payments/*
```

---

## 7. Networking Architecture

### Multi-Cluster Service Mesh

#### Istio Multi-Cluster Mesh

```yaml
# Primary cluster
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-primary
  namespace: istio-system
spec:
  profile: default
  values:
    global:
      meshID: mesh-primary
      multiCluster:
        clusterName: primary
        enabled: true
      network: network1
    pilot:
      env:
        ENABLE_MULTI_CLUSTER_MESH_DISCOVERY: "true"
        ENABLE_AUTO_MESH_HOSTNAME: "true"
---
# Secondary cluster
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-secondary
  namespace: istio-system
spec:
  profile: default
  values:
    global:
      meshID: mesh-secondary
      multiCluster:
        clusterName: secondary
        enabled: true
      network: network2
    pilot:
      env:
        ENABLE_MULTI_CLUSTER_MESH_DISCOVERY: "true"
        ENABLE_AUTO_MESH_HOSTNAME: "true"
---
# Shared root CA
apiVersion: v1
kind: Secret
metadata:
  name: istio-root-ca
  namespace: istio-system
type: Opaque
stringData:
  root-cert.pem: |
    -----BEGIN CERTIFICATE-----
    ... shared root CA certificate ...
    -----END CERTIFICATE-----
```

### CNI Configuration

#### Cilium BGP Configuration

```yaml
apiVersion: cilium.io/v2
kind: CiliumBGPCPeerConfig
metadata:
  name: peer-aws
spec:
  nodeSelector:
    matchLabels:
      kubernetes.io/os: linux
  peerASNumber: 64512
  peerAddresses:
  - 10.0.0.1
  - 10.0.0.2
  holdTime: 90s
  keepAliveTime: 30s
  password: "bgp-secret-key"
---
apiVersion: cilium.io/v2
kind: CiliumBGPClusterConfig
metadata:
  name: cluster-config
spec:
  nodeSelector:
    matchLabels:
      kubernetes.io/os: linux
  localAS: 64513
  advertisement:
    enableNodeCIDR: true
    enablePodCIDR: true
    enableService: ClusterIP
    connectTimeout: 60s
```

### Service Mesh Networking

```yaml
# Service Entry for external services
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: payment-gateway-external
  namespace: production
spec:
  hosts:
  - payments.example.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
---
# Sidecar configuration
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: payment-service-sidecar
  namespace: production
spec:
  egress:
  - hosts:
    - "./*.production.svc.cluster.local"
    - "istio-system/*.istio-system.svc.cluster.local"
    - "*/payment-gateway-external"
---
# Gateway configuration
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: internal-gateway
  namespace: production
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 8080
      name: http
      protocol: HTTP
    hosts:
    - "*.internal.example.com"
    tls:
      httpsRedirect: true
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "*.internal.example.com"
    tls:
      mode: SIMPLE
      credentialName: internal-tls
```

---

## 8. Best Practices

### Production-Ready Deployment Patterns

#### Blue-Green Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service-green
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payment-service
      version: v2.0.0
  template:
    metadata:
      labels:
        app: payment-service
        version: v2.0.0
        deployment: green
    spec:
      containers:
      - name: payment-service
        image: gcr.io/my-project/payment-service:v2.0.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: production
spec:
  selector:
    app: payment-service
    deployment: green
  ports:
  - name: http
    port: 80
    targetPort: 8080
  type: ClusterIP
```

#### Canary Deployment with Argo Rollouts

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 10
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
      - name: payment-service
        image: gcr.io/my-project/payment-service:v1.0.0
        ports:
        - containerPort: 8080
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: {duration: 5m}
      - setWeight: 25
      - pause: {duration: 5m}
      - setWeight: 50
      - pause: {duration: 5m}
      - setWeight: 100
      - pause: {duration: 1h}
```

### Resource Management

#### Resource Requests and Limits

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
      - name: payment-service
        image: gcr.io/my-project/payment-service:v1.0.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: payment-service-config
---
# Vertical Pod Autoscaler
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: payment-service-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-service
  updatePolicy:
    updateMode: Auto
```

### Health Checks

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
      - name: payment-service
        image: gcr.io/my-project/payment-service:v1.0.0
        ports:
        - containerPort: 8080
        # Liveness probe - restart unhealthy containers
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        # Readiness probe - remove from service load balancer
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
        # Startup probe - give container time to start
        startupProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 30
```

### Logging and Monitoring

#### Logging Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
      - name: payment-service
        image: gcr.io/my-project/payment-service:v1.0.0
        env:
        - name: LOG_LEVEL
          value: "info"
        - name: LOG_FORMAT
          value: "json"
        # Metrics endpoint
        - name: PROMETHEUS_METRICS_PORT
          value: "9090"
        ports:
        - containerPort: 8080
        - containerPort: 9090
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
        - name: logs
          mountPath: /var/log/app
      volumes:
      - name: config
        configMap:
          name: payment-service-config
      - name: logs
        emptyDir: {}
---
# Fluentd sidecar for log collection
      - name: fluentd
        image: fluentd:latest
        volumeMounts:
        - name: logs
          mountPath: /var/log/app
        - name: fluentd-config
          mountPath: /fluentd/etc
        resources:
          requests:
            cpu: "50m"
            memory: "64Mi"
          limits:
            cpu: "200m"
            memory: "256Mi"
---
# ConfigMap for Fluentd
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: production
data:
  fluentd.conf: |
    <source>
      @type tail
      path /var/log/app/*.log
      pos_file /var/log/app/fluentd.pos
      tag app.*
      read_from_head true
      <parse>
        @type json
      </parse>
    </source>
    
    <match app.**>
      @type forward
      <server>
        host loki-gateway
        port 3100
      </server>
    </match>
```

#### Prometheus ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: payment-service
  namespace: production
  labels:
    prometheus: servicemon
spec:
  selector:
    matchLabels:
      app: payment-service
  namespaceSelector:
    matchNames:
    - production
  endpoints:
  - port: http
    interval: 15s
    path: /metrics
    scheme: http
    scrapeTimeout: 10s
    metricRelabelings:
    - sourceLabels: [__name__]
      regex: go_.*
      action: drop
    - sourceLabels: [pod]
      targetLabel: instance
```

---

## 9. Common Pitfalls

### Anti-Pattern #1: Node-Affinity Overuse

**Problem**: Hard-coding pods to specific nodes defeats Kubernetes scheduling.

```yaml
# ❌ WRONG: Hard-coded node affinity
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/hostname
                operator: In
                values:
                - node-1
                - node-2
```

**Fix**: Use pod anti-affinity for spreading.

```yaml
# ✅ CORRECT: Pod anti-affinity for spreading
spec:
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: payment-service
              topologyKey: kubernetes.io/hostname
```

### Anti-Pattern #2: Missing Resource Limits

**Problem**: Pods without resource limits can consume unlimited resources.

```yaml
# ❌ WRONG: No resource limits
spec:
  template:
    spec:
      containers:
      - name: app
        image: app:latest
        # Missing resources block
```

**Fix**: Always set requests and limits.

```yaml
# ✅ CORRECT: Resource requests and limits
spec:
  template:
    spec:
      containers:
      - name: app
        image: app:latest
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
```

### Anti-Pattern #3: Single Replica Deployments

**Problem**: Single replicas provide no high availability.

```yaml
# ❌ WRONG: Single replica
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 1  # ❌ Single point of failure
```

**Fix**: Minimum 3 replicas for production.

```yaml
# ✅ CORRECT: High availability
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 3  # ✅ Multiple replicas
```

### Anti-Pattern #4: Hardcoded Secrets

**Problem**: Secrets in deployment manifests.

```yaml
# ❌ WRONG: Hardcoded secrets
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: DB_PASSWORD
          value: "super-secret-password"
```

**Fix**: Use Kubernetes Secrets or External Secrets.

```yaml
# ✅ CORRECT: Secret reference
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: password
```

### Anti-Pattern #5: Missing Health Checks

**Problem**: No liveness or readiness probes.

```yaml
# ❌ WRONG: No health checks
spec:
  template:
    spec:
      containers:
      - name: app
        image: app:latest
        # No probes
```

**Fix**: Always add health checks.

```yaml
# ✅ CORRECT: Health checks
spec:
  template:
    spec:
      containers:
      - name: app
        image: app:latest
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Anti-Pattern #6: Not Using ConfigMaps

**Problem**: Configuration hardcoded in containers.

```yaml
# ❌ WRONG: Hardcoded configuration
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: ENVIRONMENT
          value: "production"
        - name: API_URL
          value: "https://api.example.com"
```

**Fix**: Use ConfigMaps for configuration.

```yaml
# ✅ CORRECT: ConfigMap reference
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  environment: "production"
  api_url: "https://api.example.com"
---
spec:
  template:
    spec:
      containers:
      - name: app
        envFrom:
        - configMapRef:
            name: app-config
```

### Anti-Pattern #7: Ignoring Network Policies

**Problem**: No network segmentation.

```yaml
# ❌ WRONG: No network policies
# All pods can communicate with all other pods
```

**Fix**: Implement network policies.

```yaml
# ✅ CORRECT: Network policies
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

### Anti-Pattern #8: Not Using Pod Disruption Budgets

**Problem**: No PDB during node drains.

```yaml
# ❌ WRONG: No PodDisruptionBudget
# Cluster autoscaler can drain nodes without limit
```

**Fix**: Add PodDisruptionBudgets.

```yaml
# ✅ CORRECT: PodDisruptionBudget
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-service-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: payment-service
```

### Anti-Pattern #9: Not Using Service Mesh for mTLS

**Problem**: Services communicating without encryption.

```yaml
# ❌ WRONG: No mTLS
# Services communicate in plaintext
```

**Fix**: Use service mesh for mTLS.

```yaml
# ✅ CORRECT: Service mesh mTLS
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
```

### Anti-Pattern #10: Ignoring Observability

**Problem**: No metrics, logs, or traces.

```yaml
# ❌ WRONG: No observability
# Impossible to debug in production
```

**Fix**: Implement observability stack.

```yaml
# ✅ CORRECT: Observability
# Metrics, logs, and traces configured
# Monitoring alerts set up
```

---

## 10. References

### Core CNCF Projects

| Project | Description | Documentation |
|---------|-------------|---------------|
| Kubernetes | Container orchestration | https://kubernetes.io/docs |
| Istio | Service mesh | https://istio.io/latest/docs |
| Envoy | Service proxy | https://www.envoyproxy.io/docs |
| Linkerd | Lightweight service mesh | https://linkerd.io/learn/ |
| Cilium | eBPF-based CNI | https://docs.cilium.io/ |
| Calico | BGP-based CNI | https://docs.tigera.io/calico/latest/ |
| Argo CD | GitOps for Kubernetes | https://argo-cd.readthedocs.io/ |
| Flux | GitOps operator | https://fluxcd.io/ |
| Tekton | Kubernetes CI/CD | https://tekton.dev/docs/ |
| Knative | Serverless on Kubernetes | https://knative.dev/docs/ |
| Prometheus | Metrics monitoring | https://prometheus.io/docs/introduction/overview/ |
| Grafana | Visualization | https://grafana.com/docs/ |
| Loki | Log aggregation | https://grafana.com/docs/loki/latest/ |
| Jaeger | Distributed tracing | https://www.jaegertracing.io/docs/ |
| OpenTelemetry | Observability signals | https://opentelemetry.io/docs/ |

### Architecture Guides

| Guide | Description |
|-------|-------------|
| [CNCF Landscape](https://landscape.cncf.io/) | Complete CNCF ecosystem map |
| [Kubernetes Best Practices](https://cloud.google.com/kubernetes-engine/docs/best-practices) | GKE best practices |
| [GitOps Patterns](https://opengitops.dev/) | GitOps implementation patterns |
| [Service Mesh Interface](https://smi-spec.io/) | Service mesh API standards |
| [Cilium Network Policy](https://docs.cilium.io/en/latest/network/policy/kubernetes/) | eBPF network policies |

### Community Resources

| Resource | Description |
|----------|-------------|
| [CNCF Slack](https://slack.cncf.io/) | Community support |
| [CNCF Mailing Lists](https://lists.cncf.io/g/main/groups) | Project updates |
| [CNCF Webinars](https://www.cncf.io/webinars/) | Technical webinars |
| [CNCF Blog](https://www.cncf.io/blog/) | Community posts |

### Tools

| Tool | Description |
|------|-------------|
| [kubernetes-policy-controller](https://github.com/kyverno/kyverno) | Policy enforcement |
| [kube-score](https://kube-score.io/) | Kubernetes health checks |
| [kubeaudit](https://github.com/Shopify/kubeaudit) | Security auditing |
| [kubeconform](https://kubeconform.dev/) | Kubernetes manifest validation |
| [kubeval](https://kubeval.com/) | Manifest validation |

---

## Implementation Checklist

Before deploying to production:

### Architecture
- [ ] Service mesh configured with mTLS
- [ ] Network policies implemented
- [ ] Resource requests/limits set
- [ ] Pod anti-affinity for HA
- [ ] PodDisruptionBudget configured
- [ ] Ingress/Gateway configured
- [ ] CDN integration for static assets

### Security
- [ ] Secrets managed externally (Vault)
- [ ] RBAC configured
- [ ] PodSecurityPolicies enforced
- [ ] Network policies implemented
- [ ] mTLS enabled for all services
- [ ] Service account tokens mounted only where needed

### Observability
- [ ] Metrics endpoint configured
- [ ] ServiceMonitor/PodMonitor created
- [ ] Grafana dashboards imported
- [ ] Alert rules configured
- [ ] Logs flowing to Loki
- [ ] Traces flowing to Jaeger
- [ ] Hubble enabled for Cilium visibility

### GitOps
- [ ] Argo CD/Flux deployed
- [ ] Repository configured
- [ ] Applications defined
- [ ] Auto-sync enabled
- [ ] Drift detection active

### CI/CD
- [ ] Tekton/Argo Workflows configured
- [ ] Quality gates in pipeline
- [ ] Security scanning configured
- [ ] Automated deployments working

### Scaling
- [ ] HPA configured
- [ ] Cluster autoscaler enabled
- [ ] VPA configured
- [ ] Load testing completed

### Testing
- [ ] Chaos engineering tests
- [ ] Disaster recovery演练
- [ ] Security audit passed
- [ ] Performance testing completed

---

*End of CNCF Architecture Best Practices Skill File*
