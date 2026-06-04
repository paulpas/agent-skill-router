---
name: kubernetes-ingress
description: Configures Kubernetes Ingress resources for external HTTP/HTTPS routing,
  TLS termination, host-based and path-based routing, with Nginx and Traefik controller
  integration.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: cncf
  triggers: ingress, kubernetes ingress, ingress controller, host-based routing, path-based
    routing, TLS termination, cert-manager, external access, load balancer, reverse
    proxy
  archetypes:
  - educational
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  role: reference
  scope: infrastructure
  output-format: manifests
  content-types:
  - guidance
  - examples
  - do-dont
  - config
  related-skills: cncf-kubernetes,cncf-cert-manager,cncf-traefik,cncf-network-policies,cncf-service-mesh
---
# Kubernetes Ingress Configuration

Configures Kubernetes Ingress resources to route external HTTP and HTTPS traffic to internal Services. Manages TLS termination, host-based routing, path-based routing, and controller-specific annotations for production-grade external access patterns across Nginx, Traefik, and cloud-provider ingress controllers.

## TL;DR Checklist

- [ ] Define an Ingress class annotation (`kubernetes.io/ingress.class` or `ingressClassName`) to bind your Ingress resource
- [ ] Always specify TLS secrets for HTTPS endpoints — never rely on implicit HTTP-only routing in production
- [ ] Use `pathType: Prefix` for path prefixes and `pathType: Exact` for precise path matching — never omit `pathType` (it is required since Kubernetes 1.19)
- [ ] Set a default backend (`spec.defaultBackend`) to handle unmatched requests gracefully
- [ ] Configure cert-manager annotations for automatic TLS certificate provisioning with Let's Encrypt
- [ ] Use controller-specific annotations for rate limiting, authentication, and custom headers
- [ ] Validate the resulting Ingress object with `kubectl describe ingress <name>` before relying on it

---

## When to Use

Use this skill when:

- Exposing multiple HTTP/HTTPS Services through a single external IP address in a Kubernetes cluster
- Routing traffic to different backend Services based on hostname (e.g., `api.example.com` vs `app.example.com`)
- Terminating TLS at the ingress layer and forwarding plaintext or re-encrypted traffic to backends
- Implementing path-based routing where `/api/*` goes to one Service and `/*` goes to another
- Integrating cert-manager for automated certificate issuance and renewal
- Configuring rate limiting, IP whitelisting, or authentication at the edge before requests reach application pods

---

## When NOT to Use

Avoid this skill for:

- TCP/UDP load balancing — use a Kubernetes `Service` of type `LoadBalancer` or `NodePort` instead
- Non-HTTP protocols (gRPC over HTTP/2 can use Ingress, but raw gRPC should use gRPC-specific annotations or a Service Mesh)
- When you need fine-grained service-to-service communication inside the cluster — use internal `ClusterIP` Services or a Service Mesh instead
- When the Gateway API is preferred by your platform team — consider Gateway API for newer clusters running Kubernetes 1.22+
- As a substitute for NetworkPolicies — Ingress only handles L7 HTTP routing, not network-level access control

---

## Core Workflow

1. **Select the Ingress Controller** — Choose an ingress controller compatible with your cluster's requirements: nginx (most feature-rich with annotations), Traefik (modern, built-in dashboard), cloud-provider LB controllers (AWS ALB, GCP Compute LB, Azure Application Gateway). **Checkpoint:** Verify the controller is installed and running in your cluster before creating Ingress resources — an Ingress resource without a matching controller does nothing.

2. **Define the Ingress Resource** — Create an `Ingress` YAML manifest with: `apiVersion: networking.k8s.io/v1`, an `ingressClassName` field to select the controller, a list of rules mapping hostnames and paths to Services, and TLS configuration referencing secrets containing your certificates. **Checkpoint:** Every rule must specify a `pathType` (`Exact`, `Prefix`, or `ImplementationSpecific`) — this field became required in Kubernetes 1.19.

3. **Configure TLS Termination** — Add TLS entries that map hostnames to Kubernetes Secret names holding the certificate and private key. Certificates can be managed manually (`kubectl create secret tls`) or automatically via cert-manager annotations like `cert-manager.io/cluster-issuer: letsencrypt-prod`. **Checkpoint:** All hosts referenced in rules should also appear in at least one TLS entry to prevent HTTP fallback in production environments.

4. **Apply Controller-Specific Annotations** — Add annotations for your chosen controller: Nginx uses `nginx.ingress.kubernetes.io/*` prefixes (e.g., `rate-limit`, `auth-url`, `rewrite-target`), Traefik uses `traefik.ingress.kubernetes.io/*` or middleware CRDs, cloud providers use provider-specific annotations like `service.beta.kubernetes.io/aws-load-balancer-ssl-cert`. **Checkpoint:** Annotations are controller-specific — applying Nginx annotations on a Traefik-managed Ingress resource has no effect and may cause confusion.

5. **Validate and Test** — Run `kubectl describe ingress <name>` to verify the controller has accepted the resource, check `kubectl get events -n <namespace>` for any warnings or errors, and test routing with `curl -k https://<host>` against the external IP assigned by your controller. **Checkpoint:** If the Ingress shows `<pending>` in the ADDRESS column, the controller is not running or not configured to watch your namespace.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Basic Host-Based Routing with TLS (Nginx)

This is the foundational pattern — routing based on hostname with automatic TLS termination using cert-manager. Every production Ingress should follow this structure.

```yaml
# Complete Nginx Ingress with host-based routing and cert-manager TLS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      add_header X-Content-Type-Options "nosniff" always;
      add_header X-Frame-Options "SAMEORIGIN" always;
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-example-com-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-server
                port:
                  number: 80
```

**Key design decisions in this manifest:**
- `ingressClassName: nginx` explicitly selects the Nginx controller — avoids ambiguity when multiple controllers are installed.
- `ssl-redirect: "true"` ensures all HTTP requests are redirected to HTTPS, a security baseline for production.
- The TLS secret is provisioned by cert-manager's ClusterIssuer, so no manual certificate management is needed.
- `pathType: Prefix` matches the path and all sub-paths — use `Exact` when you need precise path matching.

### Pattern 2: Path-Based Routing with Nginx Annotations (BAD vs. GOOD)

Incorrect path configuration leads to routing conflicts, unexpected request drops, or security bypasses. This pattern demonstrates the correct approach versus common mistakes.

```yaml
# ❌ BAD — multiple Prefix paths at different levels cause routing conflicts;
# missing SSL redirect allows unencrypted traffic; no default backend returns 503 on unmatched requests.
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bad-example
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port: { number: 80 }
          # CONFLICT: this Prefix rule will never match because the above "/" prefix is broader
          - path: /dashboard
            pathType: Prefix
            backend:
              service:
                name: dashboard-service
                port: { number: 80 }

# ✅ GOOD — explicit path ordering with Exact matches for specific routes and Prefix for catch-all;
# includes SSL redirect, default backend, rate limiting, and proper controller annotations.
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-example-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "1.5"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: app-example-com-tls
  defaultBackend:
    service:
      name: maintenance-page
      port:
        number: 80
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api
            pathType: Exact
            backend:
              service:
                name: api-service
                port:
                  number: 8080
          - path: /dashboard
            pathType: Exact
            backend:
              service:
                name: dashboard-service
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80
```

**Why the GOOD example works:**
- `Exact` path types prevent routing conflicts — `/api` matches only that exact path, and `/dashboard` is guaranteed to be handled before the catch-all `/` rule.
- A `defaultBackend` handles requests that don't match any rule, returning a friendly maintenance page instead of a raw 503.
- Rate limiting annotations protect backend services from abuse at the ingress layer.

### Pattern 3: Multi-Host Ingress with cert-manager Integration

For production environments, use cert-manager's ClusterIssuer to automate certificate provisioning across multiple hosts in a single Ingress resource.

```yaml
# cert-manager ClusterIssuer for Let's Encrypt (production profile)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: certs@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx

---
# Ingress resource that references the ClusterIssuer via annotation
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-host-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
        - api.example.com
      secretName: multi-host-tls
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
    - host: api.example.com
      http:
        paths:
          - path: /v1
            pathType: Prefix
            backend:
              service:
                name: api-v1
                port:
                  number: 8080
          - path: /v2
            pathType: Prefix
            backend:
              service:
                name: api-v2
                port:
                  number: 8080
```

**How cert-manager integration works:**
- The `cert-manager.io/cluster-issuer` annotation tells cert-manager to provision a TLS secret for every host listed in the `tls` section.
- cert-manager uses the HTTP-01 challenge by temporarily creating an Ingress resource in the `cert-manager` namespace to prove domain ownership.
- The resulting secret is automatically created and updated — no manual certificate management needed.
- Certificate renewal happens automatically before expiration (typically 60 days before the 90-day Let's Encrypt validity period).

---

## Controller Comparison Matrix

| Feature | nginx-ingress | Traefik | AWS ALB | GCP LB | Azure App Gateway |
|---------|---------------|---------|---------|--------|--------------------|
| **Path-based routing** | Full regex support | Full (middleware) | Basic Prefix/Exact | Full | Basic |
| **TLS termination** | Manual or cert-manager | Manual or cert-manager | Managed via AWS ACM | GCP managed certs | Managed via Azure |
| **Rate limiting** | Built-in annotation | RateLimit middleware | Via WAF | Via Cloud Armor | Built-in policy |
| **Authentication** | Auth snippet annotation | OAuth/Bearer middleware | ALB auth (deprecated) | IAP integration | AAD Pod Identity |
| **HTTP/2 support** | Yes (TLS required) | Yes (TLS required) | Yes | Yes | Yes |
| **WebSocket support** | Automatic | Automatic | Requires annotation | Automatic | Requires annotation |
| **Custom headers** | config-snippet annotation | Middleware chain | Limited | Via annotations | Policy-based |
| **Multi-tenant** | Namespace-aware | Labels/Selectors | Shared cluster | Shared cluster | Namespace-aware |

---

## Constraints

### MUST DO
- Always specify `ingressClassName` to explicitly select the ingress controller — omitting it causes unpredictable behavior when multiple controllers are installed in the same cluster
- Use `pathType: Prefix` for prefix matching and `pathType: Exact` for precise path matching — never omit `pathType` as it is a required field since Kubernetes 1.19
- Configure TLS for all production hostnames — use cert-manager annotations to automate certificate provisioning rather than managing TLS secrets manually
- Set a `defaultBackend` to handle unmatched requests gracefully instead of returning raw HTTP 503 errors from the controller
- Include `nginx.ingress.kubernetes.io/ssl-redirect: "true"` (or equivalent for your controller) in production environments to enforce HTTPS on all routes

### MUST NOT DO
- Never place a broader `Prefix` path (e.g., `/`) above a narrower one (`/dashboard`) — the ingress controller matches rules in order and the broader rule will catch all sub-paths, making the narrower rule unreachable
- Do not rely solely on the deprecated `kubernetes.io/ingress.class` annotation without also specifying `ingressClassName` — the annotation is deprecated as of Kubernetes 1.18 and removed from the core API in 1.25+
- Never expose internal admin panels or debugging endpoints through an Ingress without additional authentication annotations (e.g., Nginx basic-auth, OIDC middleware)
- Do not place sensitive data like passwords or API tokens in Ingress annotations — they are stored in etcd in plain text and visible to anyone with `get ingress` permissions in the namespace
- Avoid mixing controller-specific annotations from different controllers (e.g., both Nginx and Traefik annotations on the same resource) — only one controller can process a given Ingress, and unknown annotations are silently ignored

---

## Output Template

When implementing or reviewing Kubernetes Ingress configurations, produce:

1. **Ingress Manifest** — Complete YAML with `apiVersion: networking.k8s.io/v1`, explicit `ingressClassName`, rules with `pathType`, TLS configuration with secret references, and default backend
2. **Controller Selection Rationale** — Which ingress controller was chosen (nginx, Traefik, cloud-provider) and why it matches the use case requirements
3. **TLS Strategy** — How certificates are provisioned (manual kubectl create secret tls vs. cert-manager ClusterIssuer) and renewal approach
4. **Routing Logic** — Mapping of hostnames and paths to backend Services with `pathType` justification for each rule
5. **Security Configuration** — SSL redirect enforcement, rate limiting settings, authentication requirements, and any custom header injection via controller annotations

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-kubernetes` | Core Kubernetes concepts (Pods, Deployments, Services) that Ingress routes to |
| `cncf-cert-manager` | Automated TLS certificate provisioning and renewal — integrates directly with Ingress annotations |
| `cncf-network-policies` | Network-level access control that complements Ingress L7 routing for defense-in-depth |
| `cncf-service-mesh` | When to use Istio/Linkerd instead of or alongside Ingress for advanced traffic management |
| `coding-kubernetes-ingress` | Application-layer patterns for handling proxied requests behind an ingress controller (headers, timeouts, chunked encoding) |

---

## Live References

> Authoritative documentation links for Kubernetes Ingress. The model follows markdown links at load time to resolve external references and inline content.

- [Kubernetes Ingress Documentation](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [Nginx Ingress Controller Documentation](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager TLS Configuration](https://cert-manager.io/docs/configuration/)
- [Kubernetes Gateway API Specification](https://gateway-api.sigs.k8s.io/reference/spec/)
- [OWASP Kubernetes Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Kubernetes_Security_Cheat_Sheet.html)

---

*This skill covers Ingress configuration patterns for production Kubernetes clusters running 1.19+. For older clusters, replace `networking.k8s.io/v1` with `extensions/v1beta1` and use the `kubernetes.io/ingress.class` annotation instead of `ingressClassName`.*
