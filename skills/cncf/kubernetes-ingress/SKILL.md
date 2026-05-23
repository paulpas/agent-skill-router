---
name: kubernetes-ingress
description: Configures Kubernetes Ingress resources for external HTTP/HTTPS routing,
  TLS termination, host-based and path-based routing, with Nginx and Traefik controller
  integration.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
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
------

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

