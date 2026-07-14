---
name: kubernetes-ingress
description: Implements networking.k8s.io/v1 Ingress resources with HTTP/HTTPS routing, TLS termination, path-based routing, and ingress controller configuration.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: http routing, tls termination, ingress class, path-based routing, networking.k8s.io, ingress controller, load balancing
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - pod isolation
    - ingress egress rules
    - network segmentation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: cncf/kubernetes-networkpolicy, cncf/kubernetes-services-management, cncf/cilium
---

# Kubernetes Ingress Manager

Implements networking.k8s.io/v1 Ingress resources for HTTP/HTTPS traffic routing, TLS certificate termination, path-based routing, and ingress controller configuration. When loaded, the model generates production-grade Ingress manifests with proper annotations, TLS configuration, and backend service references.

## TL;DR Checklist

- [ ] Use `networking.k8s.io/v1` API version — never `extensions/v1beta1`
- [ ] Specify `ingressClassName` explicitly — do not rely on the default class annotation
- [ ] Configure TLS with valid certificate secrets for every HTTPS rule
- [ ] Define path-based routing with `pathType: Prefix` or `pathType: Exact` as appropriate
- [ ] Always create a Service for each Ingress backend — never reference a Deployment directly
- [ ] Validate ingress controller compatibility (nginx, contour, istio, envoy) before applying annotations

---

## When to Use

Use this skill when:

- Routing external HTTP/HTTPS traffic to Kubernetes Services based on host or path
- Implementing TLS termination at the Ingress level for multiple services
- Setting up path-based routing to serve multiple applications from a single IP address
- Configuring rewrite rules, redirects, or header modifications at the ingress layer
- Managing SSL certificates from cert-manager for automated HTTPS

---

## When NOT to Use

Avoid this skill for:

- TCP/UDP non-HTTP services — use a regular Service with type LoadBalancer or NodePort
- Internal microservice-to-microservice communication — use ClusterIP Services
- Fine-grained network-level firewall rules — use `kubernetes-networkpolicy` instead
- Service mesh traffic management (canary, circuit breaking, retries) — use `kubernetes-istio` instead
- Non-Kubernetes ingress management — use external load balancers directly

---

## Core Workflow

1. **Select Ingress Controller** — Choose the ingress controller deployment (nginx, contour, istio envoy, envoy gateway) and identify its supported annotations. **Checkpoint:** Each controller uses different annotation syntax — verify controller compatibility before writing annotations.

2. **Define Ingress Resource** — Create an `networking.k8s.io/v1` Ingress with `ingressClassName`, rules for host/path routing, and TLS configuration. **Checkpoint:** Every path rule must reference a valid Service name and port number.

3. **Configure TLS Termination** — Add TLS rules referencing secret names that contain `tls.crt` and `tls.key`. Ensure cert-manager is configured to provision certificates. **Checkpoint:** The TLS secret must exist in the same namespace as the Ingress, or the rule will be ignored.

4. **Set Path Types** — Choose `pathType: Exact` for precise URL matching, `pathType: Prefix` for prefix-based routing, or `pathType: ImplementationSpecific` for controller-dependent behavior. **Checkpoint:** Never mix `Exact` and `Prefix` rules for the same path — the API server will reject conflicting rules.

5. **Apply and Validate** — Apply the Ingress manifest and verify the ingress controller creates the corresponding backend configuration. **Checkpoint:** Run `kubectl describe ingress <name>` and confirm the `Address` field is populated and rules are accepted.

6. **Verify End-to-End Routing** — Test each path and host rule with curl or a browser to confirm correct backend routing. **Checkpoint:** Check the ingress controller's access logs to verify requests reach the expected backend service.

---

## Implementation Patterns

### Pattern 1: Complete Ingress with TLS and Path-Based Routing

A production-grade Ingress routing multiple applications through a single ingress class with TLS termination.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-app-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
        - api.example.com
      secretName: app-tls-cert
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-frontend
                port:
                  number: 80
          - path: /admin
            pathType: Prefix
            backend:
              service:
                name: admin-panel
                port:
                  number: 8080
          - path: /api/v1
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 443
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 443
```

### Pattern 2: Ingress Annotations and Path Types (BAD vs GOOD)

Misusing annotations or path types is the most common Ingress error.

```yaml
# ❌ BAD: Using deprecated extensions/v1beta1 API — removed in Kubernetes 1.22+
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: nginx  # ← Deprecated annotation, use ingressClassName
spec:
  rules:
    - http:
        paths:
          - path: /api
            backend:
              serviceName: api-gateway   # ← Field removed in v1
              servicePort: 443           # ← Field removed in v1

# ❌ BAD: Conflicting path types for the same path
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api
            pathType: Exact            # ← Exact does not cover /api/anything
            backend:
              service:
                name: api-v1
                port:
                  number: 8080
          - path: /api
            pathType: Prefix           # ← Conflicts with the Exact rule above
            backend:
              service:
                name: api-v2
                port:
                  number: 8080

# ✅ GOOD: Explicit ingressClassName, compatible path types, v1 API
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-v2
                port:
                  number: 8080
```

### Pattern 3: TLS and Certificate Management

TLS configuration with cert-manager integration for automated certificate provisioning.

```yaml
# ClusterIssuer for Let's Encrypt (create once per cluster)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx

# Ingress referencing the cert-manager managed TLS secret
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: secure-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - secure.example.com
      secretName: secure-tls-cert
  rules:
    - host: secure.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: secure-backend
                port:
                  number: 80
```

---

## Constraints

### MUST DO
- Always use `networking.k8s.io/v1` API version — never `extensions/v1beta1` (removed in Kubernetes 1.22+)
- Set `ingressClassName` explicitly in the spec — do not rely on the deprecated `kubernetes.io/ingress.class` annotation
- Reference a Service name and port number in every backend path — never reference a Deployment directly
- Configure `tls` with a valid secret name that contains `tls.crt` and `tls.key` certificates
- Set `ssl-redirect: "true"` annotation when TLS is configured to enforce HTTPS
- Use `pathType: Prefix` for general routing and `pathType: Exact` only for specific URL matches
- Match `pathType` rules — no two rules for the same path with different types (Exact vs Prefix)
- Include a `metadata.annotations` block with controller-specific annotations only

### MUST NOT DO
- Never use `extensions/v1beta1` Ingress API — it has been removed and will fail on modern clusters
- Never omit `ingressClassName` — without it, the ingress controller cannot claim the Ingress resource
- Never reference a non-existent Service in the backend — the Ingress rule will be silently ignored
- Never use `pathType: ImplementationSpecific` without documenting the controller-specific behavior
- Never place TLS secrets in a different namespace than the Ingress — TLS will not activate
- Never set `pathType: Exact` for a path that should also match sub-paths — clients will receive 404 errors

---

## Output Template

When implementing a Kubernetes Ingress, produce the following:

1. **Ingress YAML** — Complete `networking.k8s.io/v1` Ingress with `ingressClassName`, TLS rules, and path-based routing rules.
2. **Backend Service List** — All Services referenced by the Ingress rules, with their port configurations.
3. **TLS Configuration** — Certificate secret name, ClusterIssuer reference, and domain names covered.
4. **Path Routing Table** — A table mapping host/path → Service/port for quick reference and debugging.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kubernetes-networkpolicy` | Define network-level firewall rules to complement ingress-layer routing |
| `kubernetes-services-management` | Create the ClusterIP/NodePort Services that serve as Ingress backends |
| `kubernetes-istio` | Implement advanced traffic management (canary, circuit breaking, retries) at the service mesh layer |
| `cncf/contour` | Use Contour as an alternative Ingress controller with Envoy proxy |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Kubernetes Ingress Documentation](https://kubernetes.io/docs/concepts/services-networking/ingress/) — Official guide to Ingress resources, controllers, and concepts
- [Ingress API Reference — networking.k8s.io/v1](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.32/#ingress-v1-networking-k8s-io) — Complete API schema for v1 Ingress resources
- [NGINX Ingress Controller Annotations](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/) — NGINX-specific annotations for routing, SSL, and security
- [Cert-manager Integration](https://cert-manager.io/docs/usage/ingress/) — Automated TLS certificate provisioning with cert-manager
- [Ingress Path Types](https://kubernetes.io/docs/concepts/services-networking/ingress/#path-types) — Prefix, Exact, and ImplementationSpecific path type behavior
- [Multiple Ingress Controllers](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/#multiple-ingress-controllers) — Running multiple ingress controllers in a single cluster
- [Kubernetes Ingress TLS](https://kubernetes.io/docs/concepts/services-networking/ingress/#tls) — TLS termination configuration and secret management
