---
name: kubernetes-networkpolicy
description: Implements networking.k8s.io/v1 NetworkPolicy resources with ingress and egress rules, pod selector targeting, and network segmentation for microservice isolation.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: pod isolation, ingress egress rules, network segmentation, pod selector, networking.k8s.io, networkpolicy, firewall
  archetypes:
    - tactical
    - enforcement
  anti_triggers:
    - http routing
    - tls termination
    - ingress class
    - path-based routing
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: cncf/kubernetes-ingress, cncf/cilium, cncf/open-policy-agent-opa
---

# Kubernetes NetworkPolicy Manager

Implements networking.k8s.io/v1 NetworkPolicy resources to enforce network segmentation through pod-level ingress and egress rules, pod selector targeting, and default-deny policies for microservice isolation. When loaded, the model generates production-grade NetworkPolicy manifests with precise selector matching, protocol/port restrictions, and namespace-scoped traffic rules.

## TL;DR Checklist

- [ ] Apply a default-deny ingress policy in every namespace before allowing specific traffic
- [ ] Use `podSelector` with `matchLabels` to target specific pods or label groups
- [ ] Define both `ingress` and `egress` rules for zero-trust network segmentation
- [ ] Specify both `protocol` (TCP/UDP) and `port` in each rule — never rely on defaults
- [ ] Use `ipBlock` with CIDR notation for inter-namespace or external IP rules
- [ ] Verify CNI plugin supports NetworkPolicy — calico, cilium, and Romana support it

---

## When to Use

Use this skill when:

- Implementing network-level isolation between microservices in a shared cluster
- Enforcing zero-trust networking where every service must explicitly declare allowed traffic
- Segregating namespaces (production, staging, development) from cross-traffic
- Restricting database access to only the application pods that need it
- Preventing lateral movement in a security-hardened environment

---

## When NOT to Use

Avoid this skill for:

- High-level HTTP routing and load balancing — use `kubernetes-ingress` instead
- Service-to-service discovery and load balancing — use Kubernetes Services (ClusterIP)
- Container runtime-level network setup — that is handled by the CNI plugin configuration
- When the CNI plugin does not support NetworkPolicy (e.g., canal without calico, simple flannel)

---

## Core Workflow

1. **Verify CNI NetworkPolicy Support** — Confirm the cluster's CNI plugin (calico, cilium, Romana) supports NetworkPolicy enforcement. **Checkpoint:** Run `kubectl get pods -n kube-system | grep -E 'calico|cilium|kube-router'` and verify the CNI is active.

2. **Define Default-Deny Policy** — Create a `networkpolicy` with empty `podSelector: {}` and no ingress or egress rules to block all traffic in the namespace. **Checkpoint:** After applying default-deny, verify essential traffic (kubelet, DNS) is still working.

3. **Create Allow-List Policies** — Define NetworkPolicy rules that grant specific ingress or egress access using pod selectors, namespace selectors, and IP blocks. **Checkpoint:** Every allow rule must be explicit — the policy is cumulative, not a whitelist replacement.

4. **Configure Egress Rules** — Add egress rules to control outbound traffic from pods, including DNS (port 53 UDP/TCP), database access, and external API calls. **Checkpoint:** Always allow DNS egress (port 53 to kube-system namespace) — without it, pod DNS resolution fails.

5. **Apply and Test** — Apply policies with `kubectl apply -f networkpolicy.yaml` and verify connectivity using `kubectl exec` from a test pod. **Checkpoint:** Test both allowed and denied paths to confirm the policy is working as intended.

6. **Document Traffic Matrix** — Maintain a reference of which pods can communicate with which, for auditing and troubleshooting. **Checkpoint:** Review the traffic matrix monthly as services are added or modified.

---

## Implementation Patterns

### Pattern 1: Default-Deny and Allow-List Policies

A complete namespace-level network segmentation pattern: default-deny followed by explicit allow rules.

```yaml
# Step 1: Default-deny all ingress traffic in this namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
---
# Step 2: Default-deny all egress traffic in this namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
---
# Step 3: Allow database access only from the API pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-postgres
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - protocol: TCP
          port: 5432
---
# Step 4: Allow DNS egress for all pods in the namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

### Pattern 2: Pod and Namespace Selector Targeting (BAD vs GOOD)

Incorrect selector matching is the #1 NetworkPolicy mistake — rules silently fail when selectors do not match.

```yaml
# ❌ BAD: Empty podSelector with egress rule — applies to NO pods
# This policy matches all pods (empty selector) but only specifies egress,
# so it blocks all outbound traffic. Without a corresponding allow rule,
# the pods become completely unreachable.
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: broken-policy
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: database

# ❌ BAD: Forgetting to specify both protocol AND port
# The port field is required — omitting it matches all ports, which defeats
# the purpose of granular network segmentation.
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: incomplete-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api
      ports:
        - protocol: TCP  # ← Missing port number!
---
# ✅ GOOD: Precise selectors with explicit protocol and port
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-web-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-frontend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
        - namespaceSelector:
            matchLabels:
              purpose: monitoring
      ports:
        - protocol: TCP
          port: 8080
---
# ✅ GOOD: Inter-namespace traffic with IP block for external access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api-gateway
  policyTypes:
    - Ingress
  ingress:
    - from:
        - ipBlock:
            cidr: 10.0.0.0/8
            except:
              - 10.255.0.0/16
      ports:
        - protocol: TCP
          port: 443
```

### Pattern 3: Cross-Namespace Policy with Namespace Selector

```python
def validate_network_policy(policy: dict) -> list[str]:
    """Validate a NetworkPolicy manifest for common configuration errors.

    Checks for missing required fields, invalid selectors, and unsafe rules.

    Args:
        policy: A parsed NetworkPolicy manifest dict.

    Returns:
        List of validation error messages. Empty list means the policy is valid.
    """
    errors: list[str] = []
    api_version = policy.get("apiVersion", "")
    kind = policy.get("kind", "")
    spec = policy.get("spec", {})

    if api_version != "networking.k8s.io/v1":
        errors.append(f"API version must be 'networking.k8s.io/v1', got '{api_version}'")
    if kind != "NetworkPolicy":
        errors.append(f"Kind must be 'NetworkPolicy', got '{kind}'")

    policy_types = spec.get("policyTypes", [])
    if not policy_types:
        errors.append("policyTypes is required — specify Ingress and/or Egress")

    # Check that at least one direction is allowed if policyTypes specifies it
    for ptype in policy_types:
        if ptype == "Ingress":
            ingress = spec.get("ingress")
            if ingress is None and "default-deny" not in spec.get("podSelector", {}).get("matchLabels", {}):
                errors.append("Ingress policyType defined but no ingress rules — ensure this is intentional (default-deny)")
        if ptype == "Egress":
            egress = spec.get("egress")
            if egress is None:
                errors.append("Egress policyType defined but no egress rules — this blocks all outbound traffic")

    # Validate port specifications
    rules = spec.get("ingress", []) + spec.get("egress", [])
    for rule in rules:
        for port_spec in rule.get("ports", []):
            if "port" not in port_spec:
                errors.append("Each port entry must have a 'port' field with a number")
            protocol = port_spec.get("protocol", "TCP")
            if protocol not in ("TCP", "UDP", "SCTP"):
                errors.append(f"Invalid protocol '{protocol}' — must be TCP, UDP, or SCTP")

    return errors
```

---

## Constraints

### MUST DO
- Always create a default-deny ingress policy before adding allow-list policies in any new namespace
- Include both `protocol` and `port` in every ingress/egress rule — never omit either field
- Always allow DNS egress (UDP port 53 and TCP port 53 to kube-system namespace) — pods cannot resolve services without it
- Use `podSelector.matchLabels` to precisely target pods — never use `podSelector: {}` with allow rules (it matches all pods)
- Use `namespaceSelector` for cross-namespace rules and `ipBlock.cidr` for external IP rules
- Set `policyTypes` explicitly to `[Ingress]`, `[Egress]`, or `[Ingress, Egress]` — omitting it creates a partial policy
- Verify CNI plugin supports NetworkPolicy before deploying — calico and cilium are the most widely supported
- Test deny and allow paths with `kubectl exec` after applying each new policy

### MUST NOT DO
- Never apply a default-deny policy without also creating the necessary allow rules — pods become unreachable
- Never omit DNS egress rules — all pods will fail to resolve service DNS names
- Never use `ipBlock` without an `except` list — it opens broad CIDR ranges that defeat network segmentation
- Never assume a NetworkPolicy is enforced — if the CNI does not support it, the policy is silently ignored
- Never use `podSelector: {}` with `policyTypes: [Ingress, Egress]` without corresponding allow rules — it isolates every pod
- Never rely on the `kubernetes.io` namespace for cross-namespace selectors — use `kubernetes.io/metadata.name` instead

---

## Output Template

When implementing Kubernetes NetworkPolicy resources, produce the following:

1. **Default-Deny Policies** — Ingress and egress default-deny NetworkPolicy for the target namespace.
2. **Allow Rules** — Specific NetworkPolicy resources with pod selectors, namespace selectors, and port rules for each allowed communication path.
3. **DNS Egress Policy** — A dedicated policy allowing DNS resolution for all pods.
4. **Traffic Matrix** — A table documenting which pods can send traffic to which pods, with protocol/port pairs.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kubernetes-ingress` | Define external HTTP/HTTPS routing rules that operate above the NetworkPolicy layer |
| `cncf/cilium` | Use Cilium CNI for advanced network policies with L7 (HTTP/gRPC) enforcement |
| `cncf/open-policy-agent-opa` | Apply OPA/Gatekeeper policies for admission-time network configuration validation |
| `kubernetes-services-management` | Create the Services that NetworkPolicies reference in their pod selectors |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Kubernetes NetworkPolicies Documentation](https://kubernetes.io/docs/concepts/services-networking/network-policies/) — Official guide to NetworkPolicy concepts and behavior
- [NetworkPolicy API Reference — networking.k8s.io/v1](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.32/#networkpolicy-v1-networking-k8s-io) — Complete API schema for NetworkPolicy resources
- [Calico NetworkPolicy](https://docs.tigera.io/calico/latest/reference/resources/networkpolicy/) — Calico CNI-specific NetworkPolicy behavior and extended features
- [Cilium Network Policies](https://docs.cilium.io/en/latest/security/policy/) — Cilium's advanced L3/L4/L7 network policy enforcement
- [Default-Deny Patterns](https://kubernetes.io/docs/tasks/administer-cluster/declare-network-policy/#default-deny-all-ingress) — Default-deny pattern with practical examples
- [Egress Traffic Control](https://kubernetes.io/docs/concepts/services-networking/network-policies/#egress-rules) — Egress rule configuration for outbound traffic control
- [Cross-Namespace NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/#cross-namespace-reference) — Using namespaceSelector for inter-namespace rules
