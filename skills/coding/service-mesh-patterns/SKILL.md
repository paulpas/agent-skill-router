---
name: service-mesh-patterns
description: Implements sidecar service mesh patterns including automatic mTLS encryption, canary traffic routing, distributed tracing injection, least-privilege authorization policies, and cross-cluster federation using Istio and Linkerd.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: service mesh, istio, mTLS, sidecar proxy, canary deployment, distributed tracing, traffic management, how do i secure service communication, envoy sidecar, linkerd
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: manifests
  content-types: [code, guidance, config, do-dont]
  related-skills: api-gateway-patterns, system-reliability-architecture, cloud-native-architecture
---

# Service Mesh Patterns

Implements sidecar service mesh infrastructure for transparent inter-service communication — automatic mTLS encryption, canary and weighted traffic routing, distributed tracing auto-injection, least-privilege authorization policies, and cross-cluster federation across Kubernetes-deployed microservices using Istio or Linkerd. Covers only the proxy-layer patterns; application-level resilience logic belongs in system-reliability-architecture.

## TL;DR Checklist

- [ ] Enforce strict mTLS across all namespaces — never allow plaintext in production
- [ ] Configure connection pools per upstream host to prevent resource exhaustion
- [ ] Implement canary deployments with automated traffic shifting and rollback triggers
- [ ] Verify trace context propagation through every service hop
- [ ] Define authorization policies on a least-privilege basis

---

## When to Use

Use this skill when:

- Deploying mutual TLS between microservices without modifying application code — the sidecar proxy handles certificate issuance, rotation, and TLS termination automatically
- Implementing zero-downtime deployments with fine-grained traffic shifting (canary, blue-green), header-based routing (A/B testing), and request mirroring at the proxy layer
- Configuring distributed tracing auto-injection so every service hop emits OpenTelemetry-compatible spans without requiring instrumentation code changes in individual services
- Enforcing least-privilege inter-service authorization — namespace-level deny-by-default with explicit allow rules for each service dependency, managed entirely through mesh policies
- Connecting services across multiple Kubernetes clusters using mesh federation (multi-primary or primary-remote topology) with shared root CA and cross-cluster traffic routing

---

## When NOT to Use

Avoid this skill for:

- API gateway patterns (single client-facing entry point, external request termination) — use `api-gateway-patterns` instead; the service mesh handles east-west traffic, not north-south
- Application-level retry logic, circuit breakers, and bulkhead isolation implemented inside your service code — use `system-reliability-architecture` for those patterns; mesh-level retries are complementary infrastructure concerns
- Simple single-cluster, single-namespace deployments with fewer than 3 services where direct Kubernetes Service discovery suffices without the operational overhead of a mesh control plane

---

## Core Workflow

1. **Deploy Control Plane** — Install Istio via `istioctl install --set profile=demo` or Linkerd via `linkerd install | kubectl apply -f -`. Verify control plane pods are healthy and CRDs are registered.
   **Checkpoint:** Confirm `istiod` (Istio) or `linkerd-controller` (Linkerd) is Running with zero restarts, and all Istio CRDs are present (`kubectl get crd | grep istio`).

2. **Inject Sidecars** — Enable automatic sidecar injection via namespace label: `kubectl label namespace <ns> istio-injection=enabled`. Verify every Pod has both application and proxy containers.
   **Checkpoint:** `kubectl get pods -n <ns> -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*].name}{.}{"\n"}{end}{end}'` — every Pod shows two containers (app + envoy/linkerd-proxy).

3. **Enforce mTLS** — Create a PeerAuthentication resource with STRICT mode at the namespace level. Deploy it before any other mesh policies to prevent connection failures during rollout.
   **Checkpoint:** `istioctl authn tls-check <service>.<namespace>` reports STRICT with valid certificate expiration dates for every service pair.

4. **Define Traffic Policies** — Create DestinationRule resources per service with subsets, connection pool limits, and outlier detection thresholds. Create VirtualService resources referencing the correct subsets for routing rules.
   **Checkpoint:** `istioctl analyze` returns zero warnings before applying to production.

5. **Configure Authorization** — Deploy a deny-by-default AuthorizationPolicy at the namespace level, then add explicit allow rules for each service dependency in order of deployment.
   **Checkpoint:** Verify denied communication attempts are logged (`istioctl x authorize --allow ... --deny ...`).

6. **Verify Observability** — Query `istio_requests_total{response_code="200"}` in Prometheus and confirm trace IDs flow through Jaeger or Tempo for active requests. Validate W3C Trace Context headers propagate across every hop.
   **Checkpoint:** Request a sample transaction end-to-end and verify each service's span appears in the distributed tracing UI with correct parent-child relationships.

---

## Implementation Patterns

### Pattern 1: mTLS with Automatic Certificate Rotation

Istio's built-in certificate authority (Citadel/istiod) issues short-lived X.509 certificates to sidecar proxies automatically. The PeerAuthentication resource controls whether plaintext or mutual TLS is accepted on a per-workload basis. STRICT mode enforces that both sender and receiver present valid certificates signed by the mesh CA. Certificates rotate every 24 hours by default with zero-downtime re-issuance handled transparently by the sidecar.

This pattern shows namespace-wide STRICT mTLS enforcement, service-level PeerAuthentication for exceptions, the Istio-generated certificate lifecycle mechanics, and cert-manager integration for external CA trust domains.

```yaml
# Namespace-level STRICT mutual TLS — rejects all plaintext inter-service traffic
# Apply this first before deploying any services to ensure clean transition
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
---
# Port-level override: allow PERMISSIVE mTLS on specific ports for legacy service migration
# Use this sparingly — only for services that cannot be updated to TLS-aware clients
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: legacy-adapter
  namespace: production
spec:
  selector:
    matchLabels:
      app: legacy-adapter
  portLevelMtls:
    8080:
      mode: PERMISSIVE  # Temporary bridge during migration window
    9090:
      mode: STRICT      # Metrics endpoint stays strictly mTLS
---
# DestinationRule with ISTIO_MUTUAL — sidecar automatically uses mesh-issued certificates
# The tls.mode field tells the outbound proxy how to establish mTLS to this upstream host
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL  # Use Istio-issued client certificate, verify server cert
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 20ms
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 500
        maxRequestsPerConnection: 5
---
# Certificate rotation policy via MeshConfig — controls cert lifetime and minimum key size
# These settings apply cluster-wide to the istiod CA
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: mesh-config
spec:
  values:
    security:
      # Certificates rotate every 24 hours; sidecar handles re-issuance transparently
      tokenExpiration: "24h"
      # Minimum RSA key size for generated certificates
      selfSignedCertMinRSAKeySize: 2048
```

**Certificate lifecycle mechanics:** istiod's Citadel component acts as the root CA. When a sidecar starts, it requests a short-lived certificate (default 24h) from the CA using SPIFFE identity URIs (e.g., `spiffe://cluster.local/ns/production/sa/payment-service`). The proxy validates incoming connections by checking the peer's certificate chain against the mesh trust domain. Certificate rotation happens automatically — when the cert nears expiration (at 80% of lifetime), the sidecar requests a new cert without dropping existing connections.

```
┌─────────────────────────────────────────────────────────────┐
│                    Istio CA (istiod)                        │
│          Root CA → issues intermediate certs                │
│                                                    SPIFFE  │
└──────────┬─────────────────────────────────────── URIs ─────┘
           │  mTLS handshake (cert exchange + verify)
           ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ Sidecar A    │──────▶│ Sidecar B    │       │ Sidecar C    │
│ payment-svc  │◀──────│ checkout-svc │◀──────│ gateway      │
│              │  cert │   verify     │  cert │              │
└──────────────┘       └──────────────┘       └──────────────┘
```

**BAD vs. GOOD — Trust domain configuration:**

```yaml
# ❌ BAD: No trust domain enforcement — any CA-issued cert is accepted
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
---
# ✅ GOOD: Explicit trust domain binding prevents cross-namespace certificate reuse
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
---
# Explicit trust domain annotation on workloads for cross-mesh federation readiness
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    topology.istio.io/network: network-us-east-1
```

---

### Pattern 2: Advanced Traffic Management with Canary Deployments

Istio VirtualService and DestinationRule resources provide zero-downtime deployment strategies through weighted traffic splitting, header-based routing for A/B experiments, and request mirroring for canary analysis. The DestinationRule defines named subsets via pod labels; the VirtualService routes traffic to those subsets by weight or match conditions. Circuit breaking at this layer (outlier detection) protects upstream services from cascading failures when a canary version introduces bugs.

```yaml
# Canary deployment: 90% stable / 10% canary with header-based A/B test routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-service
  namespace: production
spec:
  hosts:
    - checkout-service.production.svc.cluster.local
  http:
    # Header-based routing for A/B experiment — users with "ab-test-group" header go to v3
    - match:
        - headers:
            x-ab-test-group:
              exact: "group-b"
      route:
        - destination:
            host: checkout-service
            subset: v3  # New checkout flow variant
      timeout: 5s
      retries:
        attempts: 2
        perTryTimeout: 2s
        retryOn: gateway-error,connect-failure,retriable-4xx

    # Primary canary split — 90% to stable v1, 10% to v2
    - route:
        - destination:
            host: checkout-service
            subset: v1
          weight: 90
        - destination:
            host: checkout-service
            subset: v2
          weight: 10
      timeout: 5s
      retries:
        attempts: 3
        perTryTimeout: 1.5s
        retryOn: gateway-error,connect-failure,refused-stream,retriable-4xx

    # Request mirroring: send 20% of production traffic to v3 for shadow testing
    # Mirror responses are discarded — only the primary destination response is returned
    - route:
        - destination:
            host: checkout-service
            subset: v1
          weight: 100
      mirror:
        host: checkout-service
        subset: v3
      mirrorPercentage:
        value: 20.0

# DestinationRule defines subsets and connection-level circuit breaker settings
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: checkout-service
  namespace: production
spec:
  host: checkout-service.production.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 30ms
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 70
  subsets:
    - name: v1
      labels:
        app.kubernetes.io/version: "1.2.0"
    - name: v2
      labels:
        app.kubernetes.io/version: "2.0.0-rc1"
    - name: v3
      labels:
        app.kubernetes.io/version: "2.0.0-experiment"

# Rollback VirtualService — instantly revert canary by removing v2/v3 references
# In CI/CD, this is triggered when error rate exceeds the rollback threshold (e.g., >1%)
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-service-rollback
  namespace: production
spec:
  hosts:
    - checkout-service.production.svc.cluster.local
  http:
    - route:
        - destination:
            host: checkout-service
            subset: v1
          weight: 100
```

**Rollout progression strategy:** Begin at 5% canary traffic. Monitor `istio_requests_total{subset="v2",response_code!~"5.."}` and `histogram_quantile(0.99, rate(istio_request_duration_milliseconds_bucket[1m])){subset="v2"}` in Prometheus. If error rates stay below 0.5% and P99 latency doesn't degrade by more than 10%, shift to 10%, then 25%, then 50%. Roll back immediately if either metric exceeds thresholds.

---

### Pattern 3: Distributed Tracing Auto-Integration

The service mesh injects distributed tracing into every request hop automatically — no application code changes required. The Envoy sidecar intercepts each inbound and outbound HTTP/gRPC request, extracts W3C Trace Context headers (`traceparent` / `tracestate`), creates spans with consistent naming conventions (service name + operation), and propagates trace context to downstream calls. Istio's Telemetry API configures sampling rates, trace ID generation, and integration with Jaeger or Tempo backends.

```yaml
# Mesh-wide tracing configuration — applies to all services in the mesh
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  tracing:
    # Sampling rate: 0.1 = sample 10% of requests (adjust for production load)
    # Higher rates in staging (1.0 = 100%) during canary validation
    randomSamplingPercentage: 15.0
    providers:
      - name: jaeger
    custom_tags:
      # Inject Kubernetes pod info into trace context as custom span tags
      - key: k8s.pod.name
        type: POD_NAME
      - key: k8s.namespace.name
        type: NAMESPACE_NAME
---
# Service-specific tracing override — sample 100% for payment-service during PCI audit
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: payment-tracing
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  tracing:
    randomSamplingPercentage: 100.0
    providers:
      - name: jaeger

# Jaeger provider configuration via MeshConfig — where traces are exported
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: mesh-config
spec:
  values:
    tracing:
      sampling: 15
      enable_otel_sink: true
      zipkin:
        address: zipkin.observability.svc.cluster.local:9411
      # W3C Trace Context propagation is enabled by default in Istio 1.10+
      # The sidecar automatically injects/extracts traceparent headers

# Envoy proxy configuration for W3C Trace Context header extraction
# This happens inside the sidecar — no application code changes needed
# The following demonstrates the underlying envoy filter that Istio applies:
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: trace-context-propagation
  namespace: production
spec:
  workloadSelector:
    labels:
      app.kubernetes.io/part-of: payment-stack
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inlineCode: |
              -- Extract traceparent header for correlation ID in application logs
              function envoy_on_response(response_handle)
                local trace_id = response_handle:headers():get("x-b3-traceid")
                if trace_id then
                  response_handle:headers():add("x-correlation-id", trace_id)
                end
              end
```

**Trace context propagation across service boundaries:**

When a request enters the mesh, the first sidecar creates or extracts the `traceparent` header per W3C Trace Context spec (`version-traceid-spanid-traceflags`). Each subsequent sidecar in the chain appends a new span with the same trace ID, linking all spans into a single trace tree. The Istio `Telemetry` resource controls which requests get sampled and where traces are exported (Jaeger, Zipkin, or OpenTelemetry-compatible backends like Tempo).

---

### Pattern 4: Service-to-Service Authorization Policies

AuthorizationPolicy resources enforce least-privilege inter-service communication. Deploy a deny-by-default policy at the namespace level first, then add explicit allow rules for each required service dependency in order of deployment. This creates an explicit authorization matrix that documents every service's network dependencies — useful for audit, compliance, and onboarding new team members.

```yaml
# Deny-all baseline: no service in this namespace can communicate with any other
# Apply this BEFORE adding individual allow rules to ensure clean security posture
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec: {}

# Allow payment-service to receive requests from checkout-service only
# Rule-based authorization with source/destination matching
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: payment-allow-from-checkout
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/production/sa/checkout-service"]
            requesterNamespaces: ["production"]
      to:
        - operation:
            methods: ["POST", "GET"]
            paths: ["/api/v1/payment/*"]

# Allow checkout-service to receive requests from the gateway service only
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: checkout-allow-from-gateway
  namespace: production
spec:
  selector:
    matchLabels:
      app: checkout-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/production/sa/gateway-service"]
      to:
        - operation:
            methods: ["POST", "GET", "PUT", "DELETE"]
            paths: ["/api/v1/checkout/*"]

# Allow all services in production namespace to send metrics to the observability collector
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-metrics-collection
  namespace: production
spec:
  selector:
    matchLabels:
      app: observability-collector
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["production"]

# Permissive mode during migration — allows both old and new traffic patterns
# Use this to gradually migrate from open to strict authorization without downtime
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: legacy-adapter-permissive
  namespace: production
spec:
  selector:
    matchLabels:
      app: legacy-adapter
  action: ALLOW  # PERMISSIVE would accept all traffic but log violations for auditing
  rules:
    - from:
        - source:
            namespaces: ["production", "staging"]
      to:
        - operation:
            methods: ["POST"]
            paths: ["/api/v1/legacy/*"]

# Request-level attribute matching — restrict payment-service by user tier
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: payment-tier-restriction
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/production/sa/checkout-service"]
      when:
        - key: request.auth.claims[tier]
          values: ["premium", "standard"]
```

**Authorization policy resolution order (Istio):**

1. **DENY rules are evaluated first** — if any DENY rule matches, the request is rejected immediately
2. **ALLOW rules are evaluated next** — if at least one ALLOW rule matches, the request is permitted
3. **Default behavior depends on whether any ALLOW rules exist for the target** — if ALLOW rules exist but none match, the request is denied; if no ALLOW rules exist at all and a deny-all policy covers the workload, the request is denied

This means you can safely deploy DENY-before-ALLOW policies without creating gaps: a request must pass both the deny check (not explicitly blocked) and the allow check (explicitly permitted) to succeed.

---

### Pattern 5: Cross-Cluster / Federated Service Mesh

Multi-cluster service mesh enables services in one Kubernetes cluster to discover and communicate with services in another cluster as if they were co-located. Istio supports two topologies: **multi-primary** (each cluster runs its own istiod control plane, sharing the same root CA) and **primary-remote** (one control plane serves both a primary cluster's workloads and remote clusters' workloads). This pattern covers multi-primary with shared root CA, cross-cluster ServiceEntry configuration, and traffic routing between clusters via HBONE or direct networking.

```yaml
# Multi-cluster setup: each cluster shares the same root CA certificate
# The root-cert.pem must be identical across all clusters for cross-cluster mTLS
# Export from primary: kubectl get secret cacerts -n istio-system -o jsonpath='{.data.root-cert\.pem}'

# ServiceEntry in cluster-A to discover the service in cluster-B
# This tells the sidecar in cluster-A that checkout-service also exists remotely
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: checkout-service-remote
  namespace: production
spec:
  hosts:
    - checkout-service.remote-cluster.svc.cluster.local
  location: MESH_INTERNAL
  ports:
    - number: 8080
      name: http
      protocol: HTTP
  resolution: DNS
  endpoints:
    # Cross-cluster endpoint — the sidecar in cluster-A resolves this to the remote cluster's service IP
    - address: checkout-service.remote-cluster.local
      ports:
        http: 8080
      locality: us-central1/cluster-b

# DestinationRule with locality-aware load balancing for cross-cluster failover
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: checkout-service-failover
  namespace: production
spec:
  host: checkout-service.production.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 15s
      baseEjectionTime: 60s
  subsets:
    - name: local
      labels:
        topology.istio.io/network: network-us-east-1  # Same cluster as caller
    - name: remote
      labels:
        topology.istio.io/network: network-us-west-2  # Different cluster

# VirtualService with locality-aware routing — prefer local, failover to remote
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-service-cross-cluster
  namespace: production
spec:
  hosts:
    - checkout-service.production.svc.cluster.local
  http:
    - route:
        # Primary: local subset (same cluster — lowest latency)
        - destination:
            host: checkout-service.production.svc.cluster.local
            subset: local
          weight: 100
      timeout: 5s
---
# VirtualService for explicit remote traffic when primary is degraded
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-service-remote-failover
  namespace: production
spec:
  hosts:
    - checkout-service.remote-cluster.svc.cluster.local
  http:
    - route:
        - destination:
            host: checkout-service.remote-cluster.svc.cluster.local
          weight: 100
      timeout: 8s  # Longer timeout for cross-cluster latency

# MeshConfig on the primary istiod — define network topology for HBONE tunneling
# Each cluster gets a unique network identifier; ztunnel handles inter-network traffic
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: cluster-a-mesh
spec:
  values:
    meshConfig:
      defaultConfig:
        # HBONE port for cross-cluster sidecar-to-sidecar communication
        holdApplicationUntilProxyStarts: true
      networkGateway: ""  # Leave empty for multi-primary without gateway mode
```

**Multi-primary certificate sharing:** The critical requirement for cross-cluster mTLS is that all clusters share the same root CA. When cluster-A's sidecar connects to cluster-B's service, it must trust cluster-B's serving certificate — which requires both clusters to have certificates signed by the same root CA. In Istio, this is achieved by copying the `cacerts` secret from one istiod to another across clusters, or by using an external CA (like cert-manager with a shared issuer) that all clusters reference.

```
Cluster-A (us-east-1)                    Cluster-B (us-west-2)
┌──────────────────────┐                 ┌──────────────────────┐
│ istiod-primary       │◄──CA cert sync──│ istiod-secondary     │
│ ztunnel (HBONE)      │                 │ ztunnel (HBONE)      │
│                      │                 │                      │
│  checkout-svc-pod-A  │──── HBONE ────▶ │  checkout-svc-pod-B  │
│  (sidecar: envoy)    │◀──────────────│  (sidecar: envoy)     │
└──────────────────────┘                 └──────────────────────┘
         Shared Root CA (cacerts secret replicated)
```

---

## Constraints

### MUST DO
- Set PeerAuthentication to STRICT mode in production — no plaintext sidecar communication, ever; PERMISSIVE creates security blind spots that attackers can exploit by sending unencrypted traffic on ports you didn't think to audit
- Configure connection pool settings (max connections, pending requests, connect timeout) for every upstream host in DestinationRules — shared or missing connection pools cause resource exhaustion under high load or cascading failures
- Use Istio labels (version, app.kubernetes.io/version) with gradual weighted traffic shifting rather than deploying entirely new VirtualServices for each rollout step — this preserves routing consistency and simplifies rollback
- Extract traceparent/tracestate headers at every hop for W3C Trace Context compliance — never rely on non-standard B3 headers in production environments that integrate with multi-vendor observability stacks
- Deploy deny-by-default AuthorizationPolicies before adding allow rules — the security baseline must exist first; incremental allow rules then create a precise authorization matrix

### MUST NOT DO
- Disable mTLS for debugging in production — if you need to diagnose traffic issues, use temporary namespace-level PERMISSIVE overrides with audit logging enabled, then revert immediately after investigation
- Route traffic directly to pods bypassing the mesh (e.g., using `kubectl exec` to talk to pod IPs) — this circumvents all mTLS enforcement, authorization policies, and observability injection; always go through the service FQDN so the sidecar intercepts
- Use absolute weight thresholds without automated rollback triggers — canary deployments must have error-rate and latency thresholds defined; traffic should shift back to stable automatically when those thresholds are breached
- Configure sidecar resources too low (memory especially) — under-provisioned sidecars cause OOM kills that take down both the proxy and the application container sharing the same Pod; minimum 100Mi memory, 100m CPU per sidecar is a safe baseline
- Share a single DestinationRule across multiple services — each service has different connection patterns, failure tolerances, and latency requirements that demand individualized circuit breaker configuration

---

## Output Template

When this skill is active, output must include:

1. **PeerAuthentication YAML** — STRICT mode namespace-wide enforcement with any port-level overrides for migration scenarios
2. **DestinationRule YAML per service** — connection pool settings, outlier detection thresholds, named subsets for canary routing, and ISTIO_MUTUAL TLS configuration
3. **VirtualService YAML** — weighted canary splits (starting at ≤10%), header-based routing rules for A/B tests, retry budgets with timeout per route, and rollback configurations
4. **AuthorizationPolicy YAML** — deny-all baseline followed by explicit allow rules using service account principals (`cluster.local/ns/<ns>/sa/<service>`), with optional request-level attribute matching
5. **Telemetry resource for tracing** — sampling rate configuration, W3C Trace Context propagation settings, and custom tag injection for Kubernetes metadata correlation
6. **Cross-cluster ServiceEntry + DestinationRule** (when multi-cluster is requested) — endpoint definitions with locality labels, HBONE tunneling configuration, and failover routing logic

---

## Live References

> Authoritative documentation links for service mesh engineering.

- [Istio Documentation](https://istio.io/latest/docs/)
- [Istio Security — mTLS Authentication](https://istio.io/latest/docs/concepts/security/#mutual-tls)
- [OpenTelemetry Trace Context Propagation](https://opentelemetry.io/docs/specs/otel/trace/context_propagation/)
- [W3C Trace Context Specification](https://www.w3.org/TR/trace-context/)
- [Istio Multi-Cluster Setup](https://istio.io/latest/docs/setup/install/multicluster/)
- [Envoy Proxy HTTP Filters Reference](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http_filters)
- [OWASP Zero Trust Architecture](https://owasp.org/www-project-zero-trust-stack/)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `api-gateway-patterns` | Gateway-level patterns at the client-facing edge — ingress termination, external authentication, rate limiting for north-south traffic; complementary to mesh sidecar patterns handling east-west communication |
| `system-reliability-architecture` | Application-level resilience patterns (retry logic, bulkhead isolation, circuit breakers in code) that work alongside mesh-provided reliability at the proxy layer |
| `cloud-native-architecture` | Kubernetes deployment strategies, GitOps workflows, and Helm chart management for deploying service mesh infrastructure alongside application workloads |
