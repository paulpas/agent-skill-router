---
name: kyverno-network-policy-generation
description: Generates default-deny and allowlist NetworkPolicy resources for Kubernetes namespaces using Kyverno generate rules to enforce network segmentation and zero-trust isolation.
license: MIT
compatibility: opencode
archetypes:
  - enforcement
  - orchestration
anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: kyverno network policy, default deny network policy, generate network policy, network segmentation, podSelector, ingress egress rules, network isolation
  role: implementation
  scope: implementation
  output-format: manifests
  related-skills: kyverno-policy-generation, kyverno-mutate-patterns
---

# Kyverno Network Policy Generation

Generates default-deny and allowlist NetworkPolicy resources for Kubernetes namespaces using Kyverno `generate` rules, enforcing network segmentation and zero-trust isolation across the cluster.

## TL;DR Checklist

- [ ] Write a generate rule that creates a default-deny NetworkPolicy (empty ingress and egress selectors) for every new namespace
- [ ] Add DNS egress exception (UDP port 53) to the default-deny policy to preserve cluster DNS
- [ ] Configure `generate` rule with `synchronize: true` to ensure policies persist on namespace updates
- [ ] Exclude `kube-system` and `kyverno` namespaces from policy generation
- [ ] Verify generated NetworkPolicies appear in `PolicyReport` via `kyverno generate-report`

---

## When to Use

Use this skill when:

- Implementing zero-trust network segmentation across Kubernetes namespaces where no NetworkPolicy exists
- Automating default-deny policies for all newly created namespaces using Kyverno's generate capability
- Enforcing namespace-level network isolation where no explicit allowlist rules are configured
- Migrating an existing cluster from an unsegmented network model to a policy-enforced model
- Setting up a multi-tenant cluster where each namespace must have baseline network isolation by default

---

## When NOT to Use

Avoid this skill for:

- Validating pod resource requests or limits (use `kyverno-resource-quota-validation` instead)
- Validating Kubernetes Secrets security and labeling (use `kyverno-secret-validation` instead)
- Overriding PolicyReport results (use `kyverno-policy-report-override` instead)
- Enforcing label requirements on non-NetworkPolicy resources like Pods or ConfigMaps

---

## Core Workflow

1. **Identify namespace scope** — Determine which namespaces need default-deny NetworkPolicies (e.g., `production`, `staging`, `development`) and which to exclude (`kube-system`, `kyverno`, `istio-system`). **Checkpoint:** List target namespaces and exclusions; confirm the policy will only generate for namespaces in the cluster.

2. **Create default-deny generate rule** — Write a ClusterPolicy with a `generate` rule that creates a NetworkPolicy with empty `ingress` and `egress` arrays for every matching namespace. The policy targets `Namespace` kind and generates `NetworkPolicy` kind. **Checkpoint:** Verify the `data` section produces a valid NetworkPolicy with `podSelector: {}` and empty ingress/egress.

3. **Add DNS egress exception** — Modify the default-deny policy to include an egress rule allowing UDP port 53 to the `kube-system` namespace (required for CoreDNS). Without this, pods cannot resolve service names. **Checkpoint:** Test DNS resolution in a namespace after applying the policy to confirm cluster DNS works.

4. **Enable synchronization** — Set `synchronize: true` in the generate rule so that if the generated NetworkPolicy is deleted, Kyverno recreates it. This prevents accidental removal from breaking network segmentation. **Checkpoint:** Delete a generated NetworkPolicy and confirm Kyverno recreates it within a few seconds.

5. **Verify PolicyReport** — Apply the ClusterPolicy and check that generated NetworkPolicies are tracked in `PolicyReport`. **Checkpoint:** Run `kubectl get policyreports -A` to confirm generate rules show as "pass" with the correct policy status.

---

## Implementation Patterns

### Pattern 1: Default-Deny All Traffic with DNS Exception

This pattern generates a default-deny NetworkPolicy for every namespace. The policy denies all ingress and egress traffic except for DNS (UDP port 53 to kube-system), which is required for cluster operation.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-default-deny-network-policy
  annotations:
    policies.kyverno.io/title: Generate Default Deny Network Policy
    policies.kyverno.io/category: Network Security
    policies.kyverno.io/severity: high
    policies.kyverno.io/description: >-
      Generate a default-deny NetworkPolicy for all namespaces to enforce
      zero-trust networking. All ingress and egress traffic is denied by
      default, with an explicit DNS egress exception for cluster name resolution.
    policies.kyverno.io/minversion: 1.12.0
spec:
  background: false
  rules:
    - name: generate-default-deny
      match:
        any:
          - resources:
              kinds:
                - Namespace
      exclude:
        any:
          - namespaces:
              - kube-system
              - kyverno
              - istio-system
      generate:
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        name: default-deny-all
        namespace: "{{ request.object.metadata.name }}"
        synchronize: true
        data:
          metadata:
            labels:
              kyverno.io/policy-name: generate-default-deny-network-policy
              kyverno.io/rule-name: generate-default-deny
          spec:
            podSelector: {}
            policyTypes:
              - Ingress
              - Egress
            egress:
              - to:
                  - namespaceSelector:
                      matchLabels:
                        kubernetes.io/metadata.name: kube-system
                ports:
                  - protocol: UDP
                    port: 53
```

**Pattern notes:**
- `podSelector: {}` selects all pods in the namespace (the default-deny target)
- Empty `ingress` array denies all inbound traffic
- `egress` array contains only the DNS exception (UDP 53 to kube-system)
- `synchronize: true` ensures Kyverno recreates the policy if manually deleted
- `namespace: "{{ request.object.metadata.name }}"` sets the generated policy's namespace to the triggering namespace

---

### Pattern 2: Namespace-Scoped Allowlist Generation

This pattern generates an allowlist NetworkPolicy for namespaces that have a `network-policy: allowlist` label. It creates policies based on label selectors defined in a ConfigMap.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-allowlist-network-policy
  annotations:
    policies.kyverno.io/title: Generate Allowlist Network Policy
    policies.kyverno.io/category: Network Security
    policies.kyverno.io/severity: high
    policies.kyverno.io/description: >-
      Generate allowlist NetworkPolicies for namespaces labeled with
      network-policy: allowlist. Policies are derived from a ConfigMap
      that defines the allowed traffic rules.
spec:
  background: false
  rules:
    - name: generate-allowlist
      match:
        any:
          - resources:
              kinds:
                - Namespace
              selector:
                matchLabels:
                  network-policy: allowlist
      exclude:
        any:
          - namespaces:
              - kube-system
              - kyverno
      generate:
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        name: allowlist
        namespace: "{{ request.object.metadata.name }}"
        synchronize: true
        data:
          metadata:
            labels:
              kyverno.io/policy-name: generate-allowlist-network-policy
          spec:
            podSelector: {}
            policyTypes:
              - Ingress
              - Egress
            ingress:
              - from:
                  - podSelector: {}
                ports:
                  - protocol: TCP
                    port: 80
                  - protocol: TCP
                    port: 443
            egress:
              - to:
                  - namespaceSelector:
                      matchLabels:
                        kubernetes.io/metadata.name: kube-system
                ports:
                  - protocol: UDP
                    port: 53
              - to:
                  - podSelector:
                      matchLabels:
                        role: database
                ports:
                  - protocol: TCP
                    port: 5432
```

---

### Pattern 3: BAD vs GOOD — Incorrect podSelector Usage

A common mistake in NetworkPolicy generation is using an empty `podSelector` in the wrong context, which can lead to unintended behavior.

```yaml
# ❌ BAD — Empty podSelector in a Policy without namespace specification
# This generates at cluster scope instead of namespace scope, which is invalid
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
# ❌ Missing namespace — NetworkPolicy must be namespaced

# ✅ GOOD — NetworkPolicy with explicit namespace and correct podSelector
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
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
# ✅ Correct: namespaced, podSelector targets all pods in namespace, DNS allowed
```

---

### Pattern 4: PolicyReport for Generated NetworkPolicies

Generate rules are tracked in `PolicyReport` via the `kyverno generate-report` command. Use this to audit which namespaces have generated NetworkPolicies.

```yaml
apiVersion: wgpolicyk8s.io/v1alpha2
kind: PolicyReport
metadata:
  name: network-policy-report
  namespace: production
results:
  - policy: generate-default-deny-network-policy
    rule: generate-default-deny
    result: pass
    severity: high
    message: "Generated NetworkPolicy 'default-deny-all' is present and enforced"
    scored: true
    source: kyverno
    timestamp:
      seconds: 1733501530
  - policy: generate-allowlist-network-policy
    rule: generate-allowlist
    result: skip
    severity: high
    message: "Namespace does not have network-policy: allowlist label"
    scored: false
    source: kyverno
summary:
  error: 0
  fail: 0
  pass: 1
  skip: 1
  warn: 0
```

**Verification command:**
```bash
kubectl get policyreports -A -o wide
kubectl get networkpolicies -A
kyverno generate-report --report-name default-deny-all --report-namespace production
```

---

## Constraints

### MUST DO
- Generate a default-deny NetworkPolicy first before any allowlist policies to establish a zero-trust baseline
- Include DNS egress rules (UDP port 53) in every default-deny policy — without DNS, pods cannot resolve Kubernetes service names and workloads will fail
- Use `podSelector: {}` in the generated NetworkPolicy to target all pods in the namespace — an empty selector matches all pods in the namespace scope
- Set `synchronize: true` in the generate rule to ensure the NetworkPolicy persists if manually deleted or overwritten
- Specify the target namespace in the generate rule using `namespace: "{{ request.object.metadata.name }}"` — this binds the generated NetworkPolicy to the triggering namespace
- Exclude `kube-system`, `kyverno`, and `istio-system` namespaces from generation to avoid disrupting cluster infrastructure

### MUST NOT DO
- Generate NetworkPolicy resources without DNS egress rules — this breaks cluster DNS and causes pod failures for service name resolution across the entire namespace
- Use an incorrect or missing `podSelector` — an empty `podSelector: {}` selects all pods in the namespace; a missing one defaults to the same behavior, but omitting it reduces policy clarity
- Generate default-deny policies on `kube-system` — the control plane components need unrestricted network access to function
- Use `match.any` to match `Pod` kind instead of `Namespace` — the generate rule must be triggered by namespace creation, not pod creation
- Omit the `policyTypes` field — both `Ingress` and `Egress` must be declared for a true default-deny policy
- Generate NetworkPolicies at cluster scope — NetworkPolicy is a namespaced resource and must include a namespace in the `generate` data

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kyverno-policy-generation` | Learn general Kyverno generate rule patterns for other resource types |
| `kyverno-mutate-patterns` | Apply mutations to pods alongside network policies for comprehensive governance |

---

## Live References

> Authoritative documentation links for Kyverno network policy generation and PolicyReport management.

- [Kyverno Documentation](https://kyverno.io/docs/)
- [Kyverno CLI](https://kyverno.io/docs/kyverno-cli/)
- [Kyverno Policies](https://kyverno.io/policies/)
- [Kyverno GitHub](https://github.com/kyverno/kyverno)
- [Kyverno Installation](https://kyverno.io/docs/installation/)
- [Policy Report Schema](https://github.com/kubernetes-sigs/wg-policy-prototypes/tree/master/policy-report)
- [Kubernetes NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
