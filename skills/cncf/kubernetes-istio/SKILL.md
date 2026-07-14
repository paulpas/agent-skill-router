---
name: kubernetes-istio
description: Implements Istio service mesh patterns (sidecar injection, traffic splitting, circuit breaking, retries, and mTLS) for advanced traffic management and zero-downtime deployments in Kubernetes.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: service mesh, istio, sidecar injection, traffic splitting, canary deployment, circuit breaker, zero-downtime deployment, envoy proxy
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - ingress routing
    - service discovery
    - pod scheduling
    - persistent storage
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: cncf/kubernetes-ingress, cncf/kubernetes-deployment, cncf/kubernetes-statefulset, cncf/kubernetes-networkpolicy, cncf/kubernetes-services-management
---

# Kubernetes Istio Service Mesh Manager

Implements Istio service mesh patterns for advanced traffic management, security, and observability in Kubernetes clusters. When loaded, the model generates Istio CRDs (VirtualService, DestinationRule, ServiceEntry, PeerAuthentication, AuthorizationPolicy) for traffic splitting, circuit breaking, retries, and mutual TLS enforcement.

## TL;DR Checklist

- [ ] Apply Istio control plane (Istiod) via Helm or Istio Operator before creating any mesh resources
- [ ] Enable sidecar injection with `sidecar.istio.io/inject: "true"` annotation or namespace-level default
- [ ] Always define a `DestinationRule` alongside every `VirtualService` for traffic policies
- [ ] Use `trafficPolicy.tls.mode: ISTIO_MUTUAL` for mTLS — never plaintext in production
- [ ] Configure circuit breaker thresholds (`maxConnections`, `httpMaxPendingRequests`, `consecutive5xxErrors`) in DestinationRules
- [ ] Validate mesh connectivity with `istioctl analyze` before deploying traffic rules

---

## When to Use

Use this skill when:

- Implementing canary or blue-green deployments with precise traffic splitting (e.g., 90% stable, 10% canary)
- Configuring circuit breaking to prevent cascade failures across microservices
- Enabling automatic retries with exponential backoff for transient failures
- Implementing mutual TLS (mTLS) between services for zero-trust security
- Adding request timeouts, rate limiting, or fault injection for resilience testing
- Routing traffic based on headers, weights, or source identities (not just host/path)

---

## When NOT to Use

Avoid this skill for:

- Simple HTTP routing at the edge — use `kubernetes-ingress` instead
- Basic service discovery and load balancing within Kubernetes — use native ClusterIP Services
- Pod-level networking policies — use `kubernetes-networkpolicy` for L3/L4 rules
- Applications that cannot run sidecar containers — Istio requires the Istio proxy sidecar on every pod
- Clusters without Istio control plane installed — VirtualService and DestinationRule CRDs will not be recognized
- Stateful workloads needing stable network identities — use `kubernetes-statefulset` for that concern

---

## Core Workflow

1. **Verify Istio Control Plane** — Confirm Istiod is running and sidecar injection is enabled in the target namespace. **Checkpoint:** Run `kubectl get pods -n istio-system` and verify `istiod` is Running. Run `kubectl get namespace -L istio-injection` to verify injection labels.

2. **Define DestinationRule** — Create a `DestinationRule` that sets the subset labels, connection pool limits, and TLS mode for the target service. **Checkpoint:** The `trafficPolicy.tls.mode` must be `ISTIO_MUTUAL` for mTLS or `DISABLE` for unencrypted — never use `SIMPLE` (deprecated in Istio 1.7+).

3. **Define VirtualService** — Create a `VirtualService` that routes traffic to subsets defined in the DestinationRule, using weight-based splitting, header matching, or fault injection. **Checkpoint:** Every route destination must reference a valid subset name defined in a corresponding DestinationRule.

4. **Apply PeerAuthentication** — Configure namespace-wide or global mTLS policy (STRICT for production, PERMISSIVE for transition periods). **Checkpoint:** `STRICT` mode rejects all non-mTLS traffic; verify no services are broken by the policy before applying cluster-wide.

5. **Apply and Validate** — Apply all manifests and run `istioctl analyze` to detect misconfigurations. **Checkpoint:** Confirm `istioctl analyze` reports zero warnings and that `istioctl proxy-config` shows the expected routes.

6. **Verify Traffic Splitting** — Send test requests to the ingress point and confirm the expected distribution across subsets. **Checkpoint:** Use `curl` or a load generator to send enough requests to verify the weight split matches the VirtualService configuration.

---

## Implementation Patterns

### Pattern 1: Canary Deployment with 10% Traffic Split

A VirtualService and DestinationRule for routing 10% of traffic to a canary subset and 90% to stable.

```yaml
# DestinationRule: defines subsets for stable and canary versions
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: frontend-destination
  namespace: production
spec:
  host: frontend.production.svc.cluster.local
  subsets:
    - name: stable
      labels:
        version: v1
    - name: canary
      labels:
        version: v2
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
# VirtualService: splits traffic 90/10 between stable and canary
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: frontend-routing
  namespace: production
spec:
  hosts:
    - frontend.production.svc.cluster.local
  http:
    - route:
        - destination:
            host: frontend.production.svc.cluster.local
            subset: stable
          weight: 90
        - destination:
            host: frontend.production.svc.cluster.local
            subset: canary
          weight: 10
```

### Pattern 2: Circuit Breaking and Retry Configuration (BAD vs GOOD)

Improper circuit breaker and retry settings can either mask failures or cause excessive backpressure.

```yaml
# ❌ BAD — No circuit breaker; cascading failures will propagate unbounded
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-dr-bad
  namespace: production
spec:
  host: backend.production.svc.cluster.local
  subsets:
    - name: default
      labels:
        app: backend
  # No trafficPolicy at all — no connection limits, no outlier detection
  # ❌ No retries configured in VirtualService — transient failures are fatal

# ✅ GOOD — Circuit breaker prevents cascade, retries handle transient failures
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-dr-good
  namespace: production
spec:
  host: backend.production.svc.cluster.local
  subsets:
    - name: default
      labels:
        app: backend
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100          # Hard cap on connections to the upstream
      http:
        http1MaxPendingRequests: 100  # Buffer for queued HTTP requests
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 3         # Eject after 3 consecutive 5xx responses
      interval: 10s                   # Check every 10 seconds
      baseEjectionTime: 30s           # Eject for 30 seconds
      maxEjectionPercent: 50          # Eject at most half the hosts

---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: backend-routing
  namespace: production
spec:
  hosts:
    - backend.production.svc.cluster.local
  http:
    - route:
        - destination:
            host: backend.production.svc.cluster.local
            subset: default
      retries:
        attempts: 3                   # Retry up to 3 times
        perTryTimeout: 2s            # Each retry attempt has a 2s timeout
        retryOn: gateway-error,connect-failure,refused-stream
```

### Pattern 3: mTLS Enforcement with Peer and Authorization Policies

```yaml
# PeerAuthentication: enforce mTLS namespace-wide
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: production-mtls
  namespace: production
spec:
  mtls:
    mode: STRICT    # Reject all plaintext traffic

---
# AuthorizationPolicy: allow frontend to call backend on /api/* only
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: backend-authz
  namespace: production
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/production/sa/frontend"]
      to:
        - operation:
            paths: ["/api/*"]
            methods: ["GET", "POST"]

---
# ServiceEntry: allow outbound traffic to external payment API
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-payment-api
  namespace: production
spec:
  hosts:
    - api.payment-provider.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
```

### Pattern 4: Header-Based Routing for A/B Testing

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ab-test-routing
  namespace: production
spec:
  hosts:
    - checkout.production.svc.cluster.local
  http:
    - match:
        - headers:
            x-ab-group:
              exact: group-b
      route:
        - destination:
            host: checkout.production.svc.cluster.local
            subset: group-b
          weight: 100
    - route:
        - destination:
            host: checkout.production.svc.cluster.local
            subset: group-a
          weight: 100
```

---

## Constraints

### MUST DO
- Always create a `DestinationRule` for every service that will receive routed traffic — VirtualService subsets must be defined in a corresponding DestinationRule
- Set `trafficPolicy.tls.mode: ISTIO_MUTUAL` in DestinationRules for mTLS between mesh services
- Configure `outlierDetection` with `consecutive5xxErrors` (3–5) and `baseEjectionTime` (30–60s) in DestinationRules for circuit breaking
- Set `retries.attempts` to 1–3 and `retries.perTryTimeout` to 1–5s in VirtualService for retry policies
- Use `PeerAuthentication` with `mode: STRICT` in production namespaces to enforce mTLS
- Label pods with `version` or `release` labels so subsets can match them accurately
- Run `istioctl analyze -A` after applying any Istio CRD to catch configuration errors
- Set `connectionPool.tcp.maxConnections` and `connectionPool.http.http1MaxPendingRequests` to cap backpressure

### MUST NOT DO
- Never set `PeerAuthentication` mode to `STRICT` without verifying all services can use mTLS first — it will cut off plaintext communication instantly
- Never create a VirtualService route to a subset that is not defined in a DestinationRule — Istio will reject the configuration
- Never omit `outlierDetection` from production DestinationRules — services without circuit breaking will cascade failures
- Never set `retries.attempts` higher than 3 — excessive retries amplify load spikes during incidents
- Never use `retries.retryOn: 5xx` as the only retry condition — 503 from circuit breakers should not trigger more retries
- Never use `mode: DISABLE` on PeerAuthentication in production — it allows unencrypted communication between services
- Never apply Istio CRDs to the `kube-system` or `istio-system` namespaces without explicit justification

---

## Output Template

When implementing an Istio service mesh configuration, produce the following:

1. **DestinationRule YAML** — Complete DestinationRule with subset definitions, connection pool limits, outlier detection, and TLS mode.
2. **VirtualService YAML** — Complete VirtualService with route rules, weight splits, header matches, retries, and fault injection as required.
3. **Security Policies** — PeerAuthentication (mTLS mode) and AuthorizationPolicy (access control) if mesh security is needed.
4. **Traffic Matrix** — A table mapping each route rule to its subset, weight, and matching criteria for operational reference.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kubernetes-ingress` | Route external HTTP/HTTPS traffic into the mesh at the ingress gateway |
| `kubernetes-deployment` | Deploy stateless workloads with version labels that Istio subsets can target |
| `kubernetes-statefulset` | Deploy stateful workloads — Istio can still manage traffic for StatefulSet pods |
| `kubernetes-networkpolicy` | Apply L3/L4 network policies as a defense-in-depth layer alongside Istio |
| `kubernetes-services-management` | Create the Kubernetes Services that Istio routes traffic to |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Istio VirtualService Documentation](https://istio.io/latest/docs/reference/config/networking/virtual-service/) — VirtualService routing rules, weights, retries, and fault injection
- [Istio DestinationRule Documentation](https://istio.io/latest/docs/reference/config/networking/destination-rule/) — Subset definitions, connection pools, outlier detection, and TLS
- [Istio Traffic Management](https://istio.io/latest/docs/concepts/traffic-management/) — Overview of traffic management concepts and the service mesh data plane
- [Istio PeerAuthentication](https://istio.io/latest/docs/reference/config/security/peer-authentication/) — mTLS enforcement modes (PERMISSIVE, STRICT, DISABLE)
- [Istio AuthorizationPolicy](https://istio.io/latest/docs/reference/config/security/authorization-policy/) — Fine-grained access control within the mesh
- [Istio ServiceEntry](https://istio.io/latest/docs/reference/config/networking/service-entry/) — Configuring outbound traffic to external services
- [Istio Sidecar Injection](https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/) — How sidecar injection works and how to control it
- [Istio Outlier Detection](https://istio.io/latest/docs/reference/config/networking/destination-rule/#OutlierDetection) — Circuit breaker configuration and ejection behavior
