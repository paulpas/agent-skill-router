---
name: api-gateway-domain-routing
description: Configures API gateway domain routing patterns (subdomain-based tenant resolution, path-based bounded context dispatch, host-header forwarding) to direct traffic from external domains to the correct internal services.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: API gateway, domain routing, subdomain routing, Kong plugin, NGINX server block, Envoy routing, host header routing, how do i route requests by domain
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
    - code
    - guidance
    - do-dont
    - examples
  related-skills: multi-tenant-domain-isolation, api-gateway-design, domain-driven-design, event-driven-architecture
---

# API Gateway Domain Routing

Configures API gateway domain routing patterns — subdomain-based tenant resolution, path-based bounded context dispatch, host-header forwarding, and domain-aware authentication — to direct traffic from external domains to the correct internal services.

## TL;DR Checklist

- [ ] Subdomain is parsed before any backend routing rule evaluates
- [ ] Each routing rule includes a fallback `return 404` when no tenant/domain matches
- [ ] Rate limiting is configured per-subdomain or per-host, not globally only
- [ ] TLS termination occurs at the gateway with SNI-based certificate selection
- [ ] Cross-domain CORS rules do not use wildcard `*` — specify explicit allowed origins

---

## When to Use

- Deploying a multi-tenant SaaS where each tenant has its own custom domain or subdomain
- Routing requests from different bounded contexts (e.g., `/billing/*`, `/inventory/*`) to separate microservices
- Consolidating multiple backend services behind a single ingress point with domain-aware routing rules
- Implementing rate limits that scale per-tenant based on subscription tier

---

## When NOT to Use

- Single-service deployments without domain segmentation — a simple reverse proxy suffices
- Internal service-to-service communication within a Kubernetes cluster — use Ingress or service mesh sidecars
- Static content delivery — use a CDN with origin shielding instead of an API gateway
- Protocols other than HTTP/HTTPS (gRPC, WebSocket) — use protocol-specific routers like gRPC Gateway

---

## Core Workflow

1. **Define routing topology** — Map each external domain/subdomain to its target backend service. Document the complete set: custom domains (`acme.yourplatform.com`), subdomains (`acme.api.yourplatform.com`), and path-based contexts (`api.yourplatform.com/billing/*`). **Checkpoint:** Verify no two routes can match the same request path.

2. **Configure TLS termination** — Set up SNI-based certificate selection so each domain terminates TLS with its own certificate. Use Let's Encrypt DNS-01 challenge automation or a managed certificate provider. **Checkpoint:** Run `curl -vI https://tenant-domain` and confirm the returned certificate SAN matches the requested host.

3. **Implement subdomain parsing** — Extract the tenant identifier from the incoming request's Host header. For `acme.yourplatform.com`, the tenant is `acme`. For `acme.customdomain.com` (custom domain), look up the mapping in a database or cache layer. **Checkpoint:** Every extracted tenant_id must be validated against an allowlist before being used in routing decisions.

4. **Apply rate limiting per domain** — Configure rate limit plugins that scope by subdomain, host header, or resolved tenant_id. Set different limits per subscription tier (e.g., free: 100 req/min, pro: 1000 req/min, enterprise: 10000 req/min). **Checkpoint:** Verify that a burst of requests from one tenant does not exhaust the global rate limit bucket.

5. **Deploy and verify** — Roll out gateway configuration changes incrementally. Use canary routing to validate new rules against production traffic before full deployment. **Checkpoint:** All existing domains continue to route correctly; new routing rules do not shadow existing ones.

---

## Implementation Patterns / Reference Guide

### Pattern 1: NGINX Subdomain-Based Tenant Routing

NGINX resolves the subdomain from the Host header and uses it as a variable to proxy requests to tenant-specific backend pools or shared services with tenant context injection via HTTP headers.

```nginx
# nginx_tenant_routing.conf — Subdomain-based multi-tenant routing with NGINX

# Map subdomain to tenant_id for downstream services
map $host $tenant_id {
    default         "";
    acme.yourplatform.com  "acme";
    globex.yourplatform.com "globex";
   wayne.yourplatform.com   "wayne";
}

# Rate limit zones per subscription tier (shared across tenants of same tier)
limit_req_zone $binary_remote_addr zone:free_tier:10m rate=5r/s;
limit_req_zone $binary_remote_addr zone:pro_tier:10m rate=50r/s;
limit_req_zone $binary_remote_addr zone:enterprise_tier:10m rate=200r/s;

# Tenant tier lookup (stored in Redis or upstream config service)
upstream tenant_config_service {
    server 127.0.0.1:9090;
}

# --- Default shared backend (no matching subdomain) ---
server {
    listen 80 default_server;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name *.yourplatform.com;

    ssl_certificate     /etc/ssl/certs/yourplatform.com.pem;
    ssl_certificate_key /etc/ssl/private/yourplatform.com.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # Enforce HTTPS-only for all tenants
    if ($host !~ \.(yourplatform)\.com$) {
        return 403;
    }

    # --- Tenant-specific routing ---
    location / {
        # Extract tenant from subdomain
        set $tenant "";
        if ($http_host ~* ^([^\.]+)\.yourplatform\.com) {
            set $tenant $1;
        }

        # Reject requests with no valid tenant
        if ($tenant = "") {
            return 404 "Unknown tenant domain";
        }

        # --- Rate limiting: look up tier for this tenant ---
        # In production, cache the result. Below shows the conceptual flow.
        limit_req zone=pro_tier burst=20 nodelay;

        # Forward tenant context as HTTP headers to backend
        proxy_set_header X-Tenant-ID $tenant;
        proxy_set_header X-Original-Host $host;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Route to tenant-aware application backend
        proxy_pass http://app_backend/;
    }

    # --- Admin panel: only accessible from specific subdomain ---
    location /admin/ {
        if ($http_host !~ ^admin\.yourplatform\.com$) {
            return 403 "Admin access restricted";
        }
        proxy_pass http://admin_backend/;
    }

    # --- Static assets: served directly, no tenant context needed ---
    location /static/ {
        alias /var/www/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # --- Health check endpoint (no tenant validation) ---
    location /health {
        access_log off;
        return 200 '{"status":"ok"}';
        add_header Content-Type application/json;
    }
}

# --- Custom domain support (wildcard mapping via map + upstream lookup) ---
server {
    listen 443 ssl http2;
    server_name ~^(?<custom_domain>.+)$;

    ssl_certificate_by_lua_block {
        local cert = ngx.var.custom_domain .. ".pem"
        if not ngx.ssl then
            return nil
        end
    }

    location / {
        # Resolve custom domain to tenant_id via internal API call
        set_by_lua $tenant_id '
            local http = require "resty.http"
            local client = http.new()
            local res, err = client:request_uri("http://127.0.0.1:9090/resolve-tenant", {
                method = "GET",
                query = "domain=" .. ngx.var.host,
            })
            if res and res.status == 200 then
                return ngx.unescape_uri(res.body) or ""
            end
            return ""
        ';

        if ($tenant_id = "") {
            return 404 "Domain not registered";
        }

        proxy_set_header X-Tenant-ID $tenant_id;
        proxy_set_header Host $http_host;
        proxy_pass http://app_backend/;
    }
}
```

### Pattern 2: Kong Gateway Domain-Based Routing with Plugins

Kong's declarative configuration maps domains directly to services and routes. Combined with the tenant-context plugin, rate-limiting plugin, and JWT authentication, this provides a complete multi-tenant API gateway in Kong 3.x.

```yaml
# kong.yaml — Kong Gateway declarative config for domain-based routing
_format_version: "3.0"
_transform: true

# --- Services (backend microservices) ---
_services:
  - name: user-service
    url: http://user-service.internal:8080
    protocols:
      - https
    connect_timeout: 5000
    write_timeout: 10000
    read_timeout: 10000

  - name: billing-service
    url: http://billing-service.internal:8081
    protocols:
      - https
    connect_timeout: 5000
    write_timeout: 10000
    read_timeout: 10000

  - name: inventory-service
    url: http://inventory-service.internal:8082
    protocols:
      - https
    connect_timeout: 5000
    write_timeout: 10000
    read_timeout: 10000

# --- Routes: domain-based routing to bounded contexts ---
_routes:
  # Tenant subdomain route — all traffic to *.yourplatform.com goes to user-service
  - name: tenant-subdomain-route
    hosts:
      - "*.yourplatform.com"
    paths:
      - /
    methods:
      - GET
      - POST
      - PUT
      - PATCH
      - DELETE
    strip_path: false
    preserve_host: true

  # Billing bounded context — path-based routing
  - name: billing-context-route
    hosts:
      - api.yourplatform.com
    paths:
      - /billing/
    methods:
      - GET
      - POST
      - PUT
      - PATCH
    strip_path: false
    preserve_host: true
    service: billing-service

  # Inventory bounded context
  - name: inventory-context-route
    hosts:
      - api.yourplatform.com
    paths:
      - /inventory/
    methods:
      - GET
      - POST
    strip_path: false
    preserve_host: true
    service: inventory-service

# --- Plugins: authentication, rate limiting, tenant context injection ---
_plugins:
  # JWT authentication for all routes
  - name: jwt
    config:
      claims_to_verify:
        - exp
      key_claim_name: iss
      anonymous: null  # Require auth on all endpoints

  # Rate limiting per tenant (uses X-Tenant-ID header resolved from subdomain)
  - name: rate-limiting
    service: user-service
    config:
      strategy: redis
      redis:
        host: redis.internal
        port: 6379
      limit:
        - minute: 100
          policy: local
      # Per-tenant rate limiting via header
      fault_tolerant: true
      hide_client_headers: false

  # Rate limiting for billing service (stricter limits)
  - name: rate-limiting
    service: billing-service
    config:
      strategy: redis
      limit:
        - minute: 50
          policy: local
      fault_tolerant: true

  # Inject tenant ID into backend requests based on subdomain
  - name: request-transformer
    service: user-service
    config:
      add:
        headers:
          - "X-Tenant-ID:$host"

  # CORS with explicit origins per domain
  - name: cors
    config:
      origins:
        - https://acme.yourplatform.com
        - https://globex.yourplatform.com
      methods:
        - GET
        - POST
        - PUT
        - PATCH
        - DELETE
      headers:
        - Authorization
        - Content-Type
        - X-Tenant-ID
      credentials: true
      max_age: 3600
      preflight_continue: false

  # Request size limit to prevent large payload attacks
  - name: request-size-limiting
    config:
      allowed_payload_size: 10  # MB
      status_code: 413
```

### Pattern 3: Envoy Virtual Host Routing for Service Mesh

Envoy provides host-based routing via VirtualHost definitions. This is ideal when the API gateway runs as a sidecar in a Kubernetes service mesh, with each domain mapped to different cluster configurations.

```yaml
# envoy_routing.yaml — Envoy virtual host configuration for multi-tenant routing
static_resources:
  listeners:
    - name: main_listener
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 8443
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                codec_type: AUTO
                route_config:
                  name: local_route
                  virtual_hosts:
                    # --- Tenant subdomain routing ---
                    - name: tenant_routed_host
                      domains:
                        - "*.yourplatform.com"
                      routes:
                        - match:
                            prefix: "/"
                          route:
                            cluster: user_service_cluster
                            timeout: 10s
                            retry_policy:
                              retry_on: 5xx,reset,connect-failure
                              num_retries: 2

                    # --- Bounded context path routing ---
                    - name: billing_host
                      domains:
                        - "api.yourplatform.com"
                      routes:
                        - match:
                            prefix: "/billing/"
                          route:
                            cluster: billing_service_cluster
                            timeout: 15s

                    # --- Inventory context ---
                    - name: inventory_host
                      domains:
                        - "api.yourplatform.com"
                      routes:
                        - match:
                            prefix: "/inventory/"
                          route:
                            cluster: inventory_service_cluster
                            timeout: 10s

                    # --- Fallback: catch-all for unmatched domains ---
                    - name: default_host
                      domains:
                        - "*"
                      routes:
                        - match:
                            prefix: "/"
                          direct_response:
                            status: 404
                            body: "Unknown domain"

                http_filters:
                  # JWT authentication filter
                  - name: envoy.filters.http.jwt_authn
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.jwt_authn.v3.JwtAuthentication
                      providers:
                        platform_jwt:
                          issuer: "https://auth.yourplatform.com"
                          audiences:
                            - "api.yourplatform.com"
                          local_jwks:
                            uri: "https://auth.yourplatform.com/.well-known/jwks.json"
                      rules:
                        - match:
                            prefix: "/billing/"
                          requires: platform_jwt

                  # Rate limiting filter (per-tenant)
                  - name: envoy.filters.http.ratelimit
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
                      domain: api-gateway-limits
                      failure_mode_deny: false
                      rate_limit_service:
                        grpc_transport:
                          addr_config_source:
                            address:
                              socket_address:
                                address: ratelimit.internal
                                port_value: 8081
                          typed_config:
                            "@type": type.googleapis.com/envoy.config.core.v3.Http2GrpcSettings

                  - name: envoy.filters.http.cors
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.cors.v3.Cors

                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: user_service_cluster
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: user_service_cluster
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: user-service
                      port_value: 8080

    - name: billing_service_cluster
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: billing_service_cluster
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: billing-service
                      port_value: 8081

    - name: inventory_service_cluster
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: inventory_service_cluster
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: inventory-service
                      port_value: 8082
```

---

## Constraints

### MUST DO
- Always parse the subdomain from the `Host` header before any routing rules evaluate — use explicit regex patterns, not wildcard server names
- Configure TLS termination with SNI certificate selection for each domain — never accept raw HTTP in production environments
- Set `preserve_host: true` when proxying to backend services that need to know the original Host header (required for JWT audience validation)
- Add a catch-all route with a 404 response at the end of every routing configuration to prevent silent failures on unknown domains
- Scope rate limits by tenant identifier (subdomain or resolved domain name), not just by client IP, to prevent multi-tenant rate limit exhaustion

### MUST NOT DO
- Never use wildcard `*` in CORS allowed origins — specify each tenant's exact domain to prevent credential leaking
- Never route traffic based solely on subdomain without validating the domain against a registered tenant allowlist (subdomains can be spoofed via Host header)
- Never expose internal service names or ports in routing configuration comments that appear in error messages or logs
- Never use `strip_path: true` when backend services rely on path-based routing to distinguish bounded contexts
- Never configure rate limits that use only the global scope — always add per-tenant buckets for multi-tenant deployments

---

## Output Template

When this skill is active, your output must contain:

1. **Gateway Platform Selection** — State which gateway (NGINX, Kong, Envoy) is most appropriate for the described environment and justify with one sentence on deployment model (standalone, Kubernetes operator, or service mesh).

2. **Complete Configuration** — Provide full, valid configuration files (YAML, nginx conf, or envoy YAML) that implement all requested routing rules. Include TLS setup, rate limiting, and authentication filters. No truncated sections or `[...]` placeholders.

3. **Route Verification Steps** — List the exact `curl` commands or test cases needed to verify each routing rule works correctly, including a negative test for an unmatched domain.

4. **Failure Mode Analysis** — Document one specific failure scenario (e.g., DNS misconfiguration causing all traffic to hit default route) and how the configuration handles it.

---

## Live References

1. [NGINX HTTP Routing Documentation](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
2. [Kong Gateway Declarative Configuration Reference](https://docs.konghq.com/gateway/latest/kong-manager/setting-up/configuration-file/)
3. [Envoy Virtual Host and Route Configuration](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto)
4. [NGINX Subdomain Mapping with map Directive](https://docs.nginx.com/nginx/admin-guide/functions-variables/using-mapping-variables/)
5. [Kong Rate Limiting Plugin Configuration](https://docs.konghq.com/gateway/latest/kong-plugins/rate-limiting/)
6. [Envoy JWT Authentication Filter](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter)
7. [Cloudflare Load Balancing — Host Header Routing Concepts](https://developers.cloudflare.com/load-balancing/understand-basics/host-header-routing/)

---

## Related Skills

| Skill |
|---|
| `multi-tenant-domain-isolation` | Enforces tenant data boundaries after the gateway routes traffic to the correct backend |
| `api-gateway-design` | Broader API gateway patterns including service discovery, load balancing, and circuit breaking |
| `domain-driven-design` | Defines bounded contexts that become the basis for path-based routing rules |
| `event-driven-architecture` | Complements domain routing with asynchronous event distribution across bounded contexts |
