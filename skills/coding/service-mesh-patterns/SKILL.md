---
name: service-mesh-patterns
description: Implements service mesh patterns including sidecar deployment, automatic mTLS encryption, canary and weighted traffic routing, fault injection for chaos testing, rate limiting, and distributed tracing across microservice architectures using Istio and Linkerd.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: service mesh, istio, linkerd, mTLS mutual TLS, canary deployment, fault injection, rate limiting, envoy proxy
  archetypes:
    - tactical
    - generation
    - strategic
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
  scope: infrastructure
  output-format: manifests
  content-types:
    - code
    - guidance
    - do-dont
    - examples
    - manifests
  related-skills: microservices-architecture, cloud-native-architecture, system-reliability-architecture
---

# Service Mesh Patterns (Istio / Linkerd)

Implements service mesh infrastructure patterns for transparent inter-service communication, security, traffic management, and observability across Kubernetes-deployed microservices using Istio or Linkerd. Covers sidecar proxy deployment, automatic mTLS mutual TLS encryption, progressive delivery routing, fault injection for chaos testing, rate limiting policies, and distributed tracing integration — all without requiring application code changes.

## TL;DR Checklist

- [ ] Deploy sidecar proxies alongside every service instance — never skip sidecars for production services
- [ ] Enable automatic mTLS in STRICT mode namespace-wide — never allow PERMISSIVE or DISABLE in production
- [ ] Configure traffic management (canary, weighted routing) via VirtualService and DestinationRule resources
- [ ] Enable distributed tracing with a sampling rate appropriate for production (1–5% initially)
- [ ] Set up health checks and circuit breakers at the mesh level to isolate failing services

---

## When to Use

Use this skill when:

- You need transparent mutual TLS encryption between microservices without modifying application code or injecting CA certificate management logic into each service
- You want to implement zero-downtime deployments (canary, blue-green) with fine-grained traffic shifting, header-based routing, and request mirroring capabilities
- You need unified observability (distributed tracing, metrics collection, access logging) across services written in different languages with no instrumentation code changes
- You want to inject faults intentionally for chaos testing — latency injection, HTTP error aborts — to validate resilience patterns without touching service implementations
- You need fine-grained rate limiting, retry budgets, circuit breakers, and connection pooling at the infrastructure level outside of application business logic
- You are managing ingress/egress traffic across multiple services with a unified gateway configuration instead of per-service load balancer rules

---

## When NOT to Use

Avoid this skill for:

- Single-service deployments or monolithic applications — the mesh control plane overhead (CPU, memory, network) is unjustified when there are fewer than 3 services
- Development environments where operational complexity outweighs benefits; use sidecar injection selectively in dev/staging but not every namespace
- Teams with fewer than 5 microservices where direct service calls via Kubernetes Service objects are manageable without a mesh layer
- When your team lacks Kubernetes experience — the mesh adds significant operational burden around cert rotation, proxy debugging, and control plane upgrades
- High-throughput latency-sensitive workloads (sub-millisecond P99) where even the ~1ms overhead of an Envoy sidecar hop is unacceptable

---

## Core Workflow

1. **Deploy Service Mesh Control Plane** — Install Istio control plane using `istioctl install --set profile=demo` or Linkerd using `linkerd install | kubectl apply -f -`. Verify all control plane pods are running and ready.
   **Checkpoint:** Confirm `istiod` (Istio) or `linkerd-controller` (Linkerd) is in Running state with no restarts, and CRDs are registered (`kubectl get crd | grep istio`).

2. **Inject Sidecar Proxies** — Enable automatic sidecar injection via namespace label: `kubectl label namespace <ns> istio-injection=enabled` for Istio or `linkerd inject enable <ns>` for Linkerd. Deploy services and verify each Pod has both the application container and the proxy container in its spec.
   **Checkpoint:** Run `kubectl get pods -n <ns> -o jsonpath='{.items[*].spec.containers[*].name}'` — every Pod should show two containers (application + envoy/linkerd-proxy).

3. **Configure mTLS** — Create a PeerAuthentication resource with STRICT mode at the namespace level. For Istio: `istioctl apply -f peer-authentication.yaml`. Verify all service-to-service traffic uses mutual TLS by checking the control plane certificates.
   **Checkpoint:** `istioctl authn tls-check <service>.<namespace>` should report STRICT mode with valid certificate expiration dates for every service pair.

4. **Define Traffic Policies** — Create DestinationRule resources per service defining subsets, connection pool limits, and outlier detection thresholds. Create VirtualService resources for each routing requirement (canary splits, header-based dispatch, path-based rules) referencing the correct subsets.
   **Checkpoint:** `istioctl analyze` should return zero warnings before applying to production.

5. **Enable Observability** — Configure Istio's built-in Prometheus metrics scraping, integrate with a distributed tracing backend (Jaeger or Zipkin), and set access logging through Envoy's access log filter. Verify traces are flowing in the observability backend.
   **Checkpoint:** Query `istio_requests_total{response_code="200"}` in Prometheus and verify trace IDs appear in Jaeger for active requests.

---

## Implementation Patterns

### Pattern 1: Sidecar Deployment with Automatic mTLS and Circuit Breakers

Complete Kubernetes manifests showing namespace-level STRICT mTLS enforcement, DestinationRule with connection pooling and outlier detection (circuit breaker), and the proxy container configuration that intercepts all inbound and outbound traffic via iptables rules.

```yaml
# Namespace-level STRICT mutual TLS policy — rejects any plaintext service-to-service traffic
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
---
# DestinationRule with circuit breaker, connection pooling, and outlier ejection
# Protects each service from cascading failures when downstream dependencies degrade
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: product-service
  namespace: production
spec:
  host: product-service.production.svc.cluster.local
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
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 70
---
# DestinationRule for payment-service with stricter limits (higher fault tolerance needed)
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
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 20ms
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 500
        maxRequestsPerConnection: 5
    outlierDetection:
      consecutiveGatewayErrors: 3
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 60s
      maxEjectionPercent: 80
      minHealthPercent: 80
---
# DestinationRule with named subsets for progressive delivery (canary / blue-green)
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: checkout-service
  namespace: production
spec:
  host: checkout-service.production.svc.cluster.local
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

### Pattern 2: Canary Deployment with Weighted Traffic Splitting and Request Mirroring

VirtualService showing progressive canary rollout with 95/5 traffic split, per-route retry budgets with timeout policies, and non-disruptive request mirroring for canary analysis. Mirrored traffic is a copy — failures in the mirror destination never affect the primary request path.

```yaml
# Progressive canary deployment: route 95% to stable, 5% to canary version
# Includes retry policy with per-attempt timeout and mirror for shadow testing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-service
  namespace: production
spec:
  hosts:
    - checkout-service.production.svc.cluster.local
  http:
    # Primary routing with weighted canary split and retry policy
    - route:
        - destination:
            host: checkout-service
            subset: v1
          weight: 95
        - destination:
            host: checkout-service
            subset: v2
          weight: 5
      timeout: 5s
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: gateway-error,connect-failure,refused-stream,retriable-4xx

    # Shadow traffic mirroring: sends a copy of production requests to canary
    # Original response always comes from the primary destination — no disruption
    - route:
        - destination:
            host: checkout-service
            subset: v1
          weight: 100
      mirror:
        host: checkout-service
        subset: v2
      mirrorPercentage:
        value: 10  # Mirror only 10% of production traffic to avoid canary overload

# Corresponding DestinationRule with subsets defined for each version label
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
      http:
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
---
# Deployment manifests with version labels for subset targeting
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-service-v1
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: checkout-service
      version: v1
  template:
    metadata:
      labels:
        app: checkout-service
        version: v1
    spec:
      containers:
        - name: checkout-service
          image: registry.example.com/checkout:v1.2.0
          ports:
            - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-service-v2
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: checkout-service
      version: v2
  template:
    metadata:
      labels:
        app: checkout-service
        version: v2
    spec:
      containers:
        - name: checkout-service
          image: registry.example.com/checkout:v2.0.0-rc1
          ports:
            - containerPort: 8080
```

### Pattern 3: Fault Injection for Chaos Testing Service Resilience

VirtualService with deliberate latency injection and HTTP abort faults to validate that upstream services handle downstream failures gracefully. These configurations are applied only in staging environments — never in production without explicit approval. Includes the corresponding DestinationRule for outlier detection thresholds tuned for chaos testing scenarios.

```yaml
# Fault injection configuration for chaos testing service mesh resilience
# Apply ONLY in staging — this intentionally degrades service behavior
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service-staging
  namespace: staging
spec:
  hosts:
    - payment-service.staging.svc.cluster.local
  http:
    # Inject 5-second artificial delay into 20% of requests
    # Tests whether upstream services implement proper timeout and retry logic
    - match:
        - headers:
            x-chaos-test:
              exact: "latency"
      route:
        - destination:
            host: payment-service
            subset: stable
      fault:
        delay:
          percentage:
            value: 20.0
          fixedDelay: 5s

    # Abort 10% of requests with HTTP 503 to simulate partial outages
    # Tests circuit breaker activation and fallback behavior in callers
    - match:
        - headers:
            x-chaos-test:
              exact: "abort"
      route:
        - destination:
            host: payment-service
            subset: stable
      fault:
        abort:
          percentage:
            value: 10.0
          httpStatus: 503

# Outlier detection tuned for chaos testing — eject nodes faster than production
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-staging
  namespace: staging
spec:
  host: payment-service.staging.svc.cluster.local
  subsets:
    - name: stable
      labels:
        version: stable
  trafficPolicy:
    outlierDetection:
      consecutiveGatewayErrors: 3
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 60s
      maxEjectionPercent: 80
```

### Pattern 4: Rate Limiting with External Policy Enforcement (Python)

Rate limiting implemented via Istio's EnvoyFilter for local in-mesh rate limiting, and an external gRPC rate limit service for cross-service quota enforcement. The Python dataclass generates valid Istio EnvoyFilter YAML configurations per service and tier.

```python
"""Service mesh rate limiting configuration generator.

Produces Istio EnvoyFilter resources for per-service token-bucket rate limiting
with configurable tiers (free, standard, premium). Uses local Envoy ratelimit
filter for sub-millisecond quota checks within the proxy data plane.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class RateLimitConfig:
    """Rate limit configuration per service and API tier."""
    service: str
    tier: str  # free, standard, premium
    requests_per_second: int
    burst_size: int

    def to_envoy_filter(self) -> dict:
        """Generate an Istio EnvoyFilter manifest for this rate limit config.

        Creates a local_ratelimit HTTP filter that sits in the Envoy sidecar
        data path. Token bucket provides smooth rate limiting with burst support.

        Returns:
            Complete EnvoyFilter Kubernetes manifest as dict.
        """
        return {
            "apiVersion": "networking.istio.io/v1alpha3",
            "kind": "EnvoyFilter",
            "metadata": {
                "name": f"rate-limit-{self.service}-{self.tier}",
                "namespace": "production",
            },
            "spec": {
                "workloadSelector": {
                    "labels": {"app": self.service},
                },
                "configPatches": [
                    {
                        "applyTo": "HTTP_FILTER",
                        "match": {
                            "context": "SIDECAR_INBOUND",
                            "listener": {
                                "filterChain": {
                                    "filter": {
                                        "name": "envoy.filters.network.http_connection_manager",
                                        "subFilter": {
                                            "name": "envoy.filters.http.router"
                                        }
                                    },
                                },
                            },
                        },
                        "patch": {
                            "operation": "INSERT_BEFORE",
                            "value": {
                                "name": "envoy.filters.http.local_ratelimit",
                                "typed_config": {
                                    "@type": (
                                        "type.googleapis.com/"
                                        "udpa.type.v1.TypedStruct"
                                    ),
                                    "type_url": (
                                        "type.googleapis.com/envoy."
                                        "extensions.filters.http.local_ratelimit."
                                        "v3.LocalRateLimit"
                                    ),
                                    "value": {
                                        "stat_prefix": (
                                            f"local_rate_limit_"
                                            f"{self.service}_{self.tier}"
                                        ),
                                        "token_bucket": {
                                            "max_tokens": self.burst_size,
                                            "tokens_per_fill": (
                                                self.requests_per_second
                                            ),
                                            "fill_interval": "1s",
                                        },
                                        "filter_enabled": {
                                            "runtime_key": (
                                                f"rate_limit."
                                                f"{self.service}.enabled"
                                            ),
                                            "default_value": {
                                                "numerator": 100,
                                                "denominator": "HUNDRED",
                                            },
                                        },
                                        "filter_enforcing": {
                                            "runtime_key": (
                                                f"rate_limit."
                                                f"{self.service}.enforcing"
                                            ),
                                            "default_value": {
                                                "numerator": 100,
                                                "denominator": "HUNDRED",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                ],
            },
        }


@dataclass
class ExternalRateLimitConfig:
    """External gRPC rate limiter configuration for Istio.

    Routes quota decisions to an external rate limit service via the
    envoy.filters.http.ratelimit filter. Useful when rate limits must
    be shared across services or managed centrally.
    """
    domain: str
    descriptor_key: str
    descriptor_value: str
    requests_per_second: int
    burst_size: int
    failure_mode_deny: bool = False  # allow traffic when RL service is down

    def to_envoy_filter(self) -> dict:
        """Generate EnvoyFilter for external rate limit service integration."""
        return {
            "apiVersion": "networking.istio.io/v1alpha3",
            "kind": "EnvoyFilter",
            "metadata": {
                "name": f"external-rate-limit-{self.domain}",
                "namespace": "production",
            },
            "spec": {
                "workloadSelector": {
                    "labels": {"app": self.domain},
                },
                "configPatches": [
                    {
                        "applyTo": "HTTP_FILTER",
                        "match": {
                            "context": "SIDECAR_INBOUND",
                            "listener": {
                                "filterChain": {
                                    "filter": {
                                        "name": (
                                            "envoy.filters.network."
                                            "http_connection_manager"
                                        ),
                                        "subFilter": {
                                            "name": "envoy.filters.http.router"
                                        },
                                    },
                                },
                            },
                        },
                        "patch": {
                            "operation": "INSERT_BEFORE",
                            "value": {
                                "name": "envoy.filters.http.ratelimit",
                                "typed_config": {
                                    "@type": (
                                        "type.googleapis.com/envoy.config."
                                        "filter.http.ratelimit.v3.RateLimit"
                                    ),
                                    "domain": self.domain,
                                    "rate_limit_service": {
                                        "grpc_service": {
                                            "google_grpc": {
                                                "target_uri": (
                                                    "ratelimit.production.svc."
                                                    "cluster.local:8081"
                                                ),
                                                "stat_prefix": (
                                                    "ratelimit_grpc"
                                                ),
                                            },
                                            "timeout": "0.5s",
                                        },
                                        "transport_api_version": (
                                            "V3"
                                        ),
                                    },
                                    "failure_mode_deny": self.failure_mode_deny,
                                },
                            },
                        },
                    },
                ],
            },
        }


# ── Usage ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Generate rate limit configs per service and tier
    configs = [
        RateLimitConfig(
            service="checkout-api",
            tier="free",
            requests_per_second=10,
            burst_size=20,
        ),
        RateLimitConfig(
            service="checkout-api",
            tier="standard",
            requests_per_second=50,
            burst_size=100,
        ),
        RateLimitConfig(
            service="checkout-api",
            tier="premium",
            requests_per_second=200,
            burst_size=400,
        ),
    ]

    for config in configs:
        yaml_manifest = config.to_envoy_filter()
        # Apply with: kubectl apply -f <generated-manifest>
        print(f"Generated EnvoyFilter for {config.service}/{config.tier}")
        print(f"  → {yaml_manifest['metadata']['name']}")

    # External rate limiter for cross-service quota enforcement
    external_rl = ExternalRateLimitConfig(
        domain="checkout-api",
        descriptor_key="user_id",
        descriptor_value="*",
        requests_per_second=100,
        burst_size=200,
        failure_mode_deny=False,  # allow traffic on RL service failure
    )
    print(f"\nGenerated external rate limit for {external_rl.domain}")

```

### Pattern 5: Gateway Configuration for External Ingress with mTLS Termination

Istio Gateway resource that terminates TLS at the mesh perimeter, routes external HTTP/HTTPS traffic into internal services, and enforces mutual TLS for client certificate validation on sensitive endpoints.

```yaml
# Gateway terminates TLS at the mesh edge — certificates managed by Istio cert signing
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: production-gateway
  namespace: production
spec:
  selector:
    istio: ingressgateway
  servers:
    # HTTPS server with mTLS termination
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: ISTIO_MUTUAL  # Istio manages the TLS certificate
        credentialName: production-tls-credential
      hosts:
        - api.example.com
    # HTTP-to-HTTPS redirect server
    - port:
        number: 80
        name: http-redirect
        protocol: HTTP
      tls:
        httpsRedirect: true
      hosts:
        - api.example.com

# VirtualService attached to the gateway for route-level policies
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: production-vs
  namespace: production
spec:
  hosts:
    - api.example.com
  gateways:
    - production-gateway
  http:
    # Checkout endpoint with strict rate limiting and short timeouts
    - match:
        - uri:
            prefix: /api/v1/checkout
      route:
        - destination:
            host: checkout-service.production.svc.cluster.local
            port:
              number: 8080
      timeout: 3s
      retries:
        attempts: 2
        perTryTimeout: 1s
    # Payment endpoint with mTLS client certificate requirement
    - match:
        - uri:
            prefix: /api/v1/payment
      route:
        - destination:
            host: payment-service.production.svc.cluster.local
            port:
              number: 8080
      timeout: 5s
    # Public read endpoints — no retry needed, longer timeout acceptable
    - match:
        - uri:
            prefix: /api/v1/products
      route:
        - destination:
            host: product-service.production.svc.cluster.local
            port:
              number: 8080
      timeout: 10s
```

---

## Constraints

### MUST DO
- Deploy sidecar proxies for ALL production services — never create exceptions for specific services, as partial mesh deployment breaks mTLS connectivity between patched and unpatched pods
- Set PeerAuthentication to STRICT mode namespace-wide in production — PERMISSIVE mode leaks security expectations by accepting both plaintext and TLS, creating inconsistent security postures
- Configure per-service DestinationRules with circuit breaker settings (consecutive5xxErrors, connectTimeout, maxConnections) — shared rules across services prevent fine-grained failure isolation
- Enable distributed tracing at a small sampling rate (1–5%) for production observability — 100% sampling generates excessive trace data and adds measurable overhead to request latency
- Define explicit retry budgets and timeout policies per route using `retryOn` directives — never rely on Envoy defaults in production as they may allow unbounded retries under cascade failure conditions
- Isolate the service mesh control plane in a dedicated namespace (e.g., `istio-system`) separate from application workloads — colocated control plane pods risk competing for resources with business services

### MUST NOT DO
- Use PERMISSIVE mTLS mode in production — it accepts both plaintext and mTLS traffic, creating security blind spots where attackers can exploit the unencrypted path; STRICT is the only acceptable baseline
- Share a single DestinationRule across multiple services — each service has different connection patterns and failure tolerances that require individualized circuit breaker configuration
- Route 100% of traffic to a canary without monitoring metrics first — always start with less than 5% weighted traffic, monitor error rates and latency percentiles for at least one full business cycle, then gradually increase
- Deploy the service mesh control plane in the same namespace as application workloads — resource contention between control plane components and business services creates correlated failure modes during peak load
- Configure rate limits per individual user without considering tier-based policies — use external rate limit services with descriptor-based quota lookups that support subscription tiers; local Envoy filters are insufficient for cross-service enforcement

---

## Implementation Patterns: Linkerd Equivalents

Istio provides the most feature-rich mesh with full traffic management, fault injection, and gateway capabilities. Linkerd offers a lighter-weight alternative optimized for simplicity and performance. When using Linkerd instead of Istio, the equivalent patterns use Linkerd's CRDs (Server, ServerAuthorization, Profile) which are substantially simpler but cover fewer features.

```yaml
# Linkerd: Identity and mTLS — configured at the namespace level via ServiceProfile annotations
# Linkerd handles mutual TLS automatically for all services with identity enabled; no PeerAuthentication needed
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: checkout-service.production.svc.cluster.local
  namespace: production
spec:
  routes:
    - name: POST /api/v1/checkout
      condition:
        method: POST
        pathRegex: /api/v1/checkout.*
      timeout: 5s
    - name: GET /api/v1/products
      condition:
        method: GET
        pathRegex: /api/v1/products.*
      timeout: 10s
---
# Linkerd: Server resource defining how the mesh routes to a service
# Equivalent to Istio's Gateway + VirtualService combination
apiVersion: linkerd.io/v1alpha2
kind: Server
metadata:
  name: checkout-server
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: checkout-service
  port: 8080
---
# Linkerd: ServerAuthorization for mTLS client authentication on sensitive endpoints
apiVersion: linkerd.io/v1alpha2
kind: ServerAuthorization
metadata:
  name: checkout-authz
  namespace: production
spec:
  serverRef:
    name: checkout-server
  client:
    meshTLS:
      serviceAccounts:
        - name: payment-service
          namespace: production
```

---

## Constraints: BAD vs. GOOD Examples

### ❌ BAD — Sharing a single DestinationRule across all services

```yaml
# ❌ BAD: Shared rule prevents per-service circuit breaker tuning
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: shared-destination-rule
  namespace: production
spec:
  host: "*.production.svc.cluster.local"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
      http:
        http2MaxRequests: 5000
    outlierDetection:
      consecutive5xxErrors: 10
      interval: 60s
      baseEjectionTime: 30s
```

### ✅ GOOD — Per-service DestinationRule with tailored circuit breaker thresholds

```yaml
# ✅ GOOD: Each service has its own DestinationRule with connection and failure settings tuned to its characteristics
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        maxRequestsPerConnection: 5       # Payment services are sensitive — limit per-conn reuse
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 3             # Eject faster for payment failures
      interval: 10s                       # Check health frequently
      baseEjectionTime: 60s               # Keep ejected longer than most services
      maxEjectionPercent: 80

apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: product-service
  namespace: production
spec:
  host: product-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        maxRequestsPerConnection: 50      # Product reads are cheap — allow more reuse
        http2MaxRequests: 5000
    outlierDetection:
      consecutive5xxErrors: 10            # More tolerant — product failures are less critical
      interval: 30s
      baseEjectionTime: 20s
```

---

## Output Template

When this skill is active, output must include:

1. **Istio/Linkerd Resource Manifests** — YAML files for PeerAuthentication (or Linkerd identity config), DestinationRule per service, VirtualService with routing rules, Gateway for ingress termination
2. **mTLS Configuration** — STRICT mode policy with namespace-wide enforcement; for Linkerd, confirm identity is enabled on the target namespace via `linkerd install --identity-domain`
3. **Traffic Routing Rules** — Weighted splits for canary/blue-green deployments (start at ≤5%), header-based routing rules, path-based dispatch with explicit retry policies and timeout budgets per route
4. **Observability Setup** — Tracing backend integration configuration (Jaeger endpoint, sampling rate), Prometheus metrics endpoint verification, and access log filter configuration for the proxy data plane

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `microservices-architecture` | Service mesh operates on top of microservice decomposition — understand service boundaries and API contracts first before adding the mesh layer |
| `cloud-native-architecture` | Service mesh is a core cloud-native pattern deployed in Kubernetes environments; understand Helm charts, CRDs, and namespace isolation alongside mesh deployment |
| `system-reliability-architecture` | Circuit breakers, outlier detection, and fault injection from reliability patterns apply at the mesh level — DestinationRules are the mesh implementation of circuit breaker patterns |

---

## Live References

> Authoritative documentation links for service mesh engineering. The model follows markdown links at load time to resolve external references and inline content.

- [Istio Documentation](https://istio.io/latest/docs/)
- [Istio API Reference (networking.istio.io/v1beta1)](https://istio.io/latest/api/doc/networking-istio-io-v1beta1/)
- [Istio Security — mTLS Configuration](https://istio.io/latest/docs/concepts/security/#mutual-tls)
- [Istio Traffic Management Guide](https://istio.io/latest/docs/tasks/traffic-management/)
- [Envoy Proxy Documentation](https://www.envoyproxy.io/docs/envoy/latest/)
- [Linkerd Documentation](https://linkerd.io/2.15/getting-started/)
- [Istioctl CLI Reference](https://istio.io/latest/docs/reference/commands/istioctl/)
