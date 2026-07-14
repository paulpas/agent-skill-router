---
name: kyverno-pod-security-restricted
description: Enforces Kubernetes Pod Security Standards restricted profile using Kyverno podSecurity rules to prevent privileged containers, enforce runAsNonRoot, and require capability drops.
license: MIT
compatibility: opencode
archetypes:
  - enforcement
  - tactical
anti_triggers:
  - brainstorming
  - vague ideation
  - non-security policy work
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: pod security restricted, PSS restricted, runAsNonRoot, capabilities drop, privileged pod prevention, restricted profile, hardening pod
  role: implementation
  scope: implementation
  output-format: manifests
  related-skills: kyverno-pod-security-baseline, kyverno-exemptions-management
---

# Kyverno Pod Security Standards — Restricted Profile

Enforces the Kubernetes Pod Security Standards (PSS) restricted profile using Kyverno `podSecurity` rules. This skill makes the model configure `ClusterPolicy` objects that deny pods violating restricted-level restrictions — such as requiring `runAsNonRoot`, dropping all capabilities, enforcing seccomp profiles, and preventing privilege escalation. The restricted profile is the most hardened PSS level, intended for sensitive workloads that process untrusted data or require strong isolation.

## TL;DR Checklist

- [ ] Create ClusterPolicy with podSecurity rule at restricted level and pinned version
- [ ] Require runAsNonRoot=true for all containers and init containers
- [ ] Set capabilities drop to ["ALL"] and deny privilege escalation
- [ ] Configure allowHostPaths=false and requiredDropCapabilities=[ALL]
- [ ] Exclude kube-system and apply to sensitive namespaces only
- [ ] Verify with PolicyReport showing pass/fail for restricted rules

---

## When to Use

- Hardening production namespaces that handle sensitive or untrusted workloads
- Enforcing the most restrictive Pod Security Standards level for compliance (e.g., PCI-DSS, SOC2)
- Preventing privilege escalation in multi-tenant clusters where workload isolation is critical
- Migrating workloads from the baseline profile to restricted as part of a security hardening roadmap
- Securing namespaces running stateful applications with sensitive data (databases, key stores)

---

## When NOT to Use

- For `kube-system` or other core infrastructure namespaces — restricted blocks DNS, CNI, and scheduler components; use `kyverno-exemptions-management` instead
- When workloads require `hostNetwork` or `hostIPC` for legitimate operational reasons (e.g., node-level monitoring agents)
- On legacy Kubernetes clusters < 1.21 that lack restricted profile support
- For workloads running in restricted mode already — this skill is for enforcement, not discovery

---

## Core Workflow

1. **Define the restricted ClusterPolicy** — Create a `ClusterPolicy` with a `podSecurity` rule. Set `spec.rules[].podSecurity` with `level: restricted`, `version` pinned to your cluster's minor version (e.g., `"1.28"`), and apply `enforce`, `audit`, and `warn` modes. Use `match` to target specific namespaces. **Checkpoint:** Confirm the pinned `version` matches your cluster's Kubernetes minor version and that `kubectl get clusterpolicy pod-security-restricted` shows `True` status.

2. **Configure namespace targeting and exclusions** — Use `match` to select application namespaces (e.g., `production-*`, `staging-*`). Add `exclude` rules for `kube-system`, `kube-public`, `openshift-*`, and any namespace running privileged infrastructure (node-exporter, Cilium, kube-proxy). Use label-based matching instead of wildcard to avoid accidental over-enforcement. **Checkpoint:** Run `kubectl get ns --show-labels` and verify only intended namespaces carry the security label before deployment.

3. **Deploy, test, and monitor enforcement** — Apply the ClusterPolicy. Create a test pod with `privileged: true`, `runAsUser: 0`, and missing capability drops. Confirm the pod is denied at admission. Review `PolicyReport` and Kubernetes `Events` for enforcement details. Then create a compliant pod and verify it passes. **Checkpoint:** The non-compliant pod must show `denied` in event messages, and the compliant pod must reach `Running` phase.

---

## Implementation Patterns

### Pattern 1: Cluster-wide Restricted Enforcement with Targeted Namespaces

This pattern enforces the restricted profile on application namespaces while excluding all system namespaces. It uses label-based targeting for precision.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: pod-security-restricted
  annotations:
    policies.kyverno.io/title: Pod Security Standards — Restricted
    policies.kyverno.io/category: Pod Security
    policies.kyverno.io/description: >-
      Enforces the restricted Pod Security Standards profile on namespaces
      labeled with security-level=restricted. Requires runAsNonRoot, drops
      all capabilities, enforces seccomp profiles, and blocks privilege escalation.
spec:
  validationFailureAction: Enforce
  rules:
    - name: enforce-restricted
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - namespaces:
              - kube-system
              - kube-public
              - kube-node-lease
              - local-path-storage
              - cert-manager
              - istio-system
      podSecurity:
        level: restricted
        version: "1.28"
        enforce: "1.28"
        audit: "1.28"
        warn: "1.28"
      auditAnnotations:
        - key: pod-security.kyverno.io/enforced
          value: "restricted-1.28"
          annotation: pss-enforcement
    - name: audit-restricted
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - namespaces:
              - kube-system
              - kube-public
              - kube-node-lease
      podSecurity:
        level: restricted
        version: "1.28"
        audit: "1.28"
    - name: warn-restricted
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - namespaces:
              - kube-system
              - kube-public
              - kube-node-lease
      podSecurity:
        level: restricted
        version: "1.28"
        warn: "1.28"
```

**Label Namespaces for Targeting:**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production-payments
  labels:
    security-level: restricted
    team: payments
---
apiVersion: v1
kind: Namespace
metadata:
  name: staging-payments
  labels:
    security-level: restricted
    team: payments
```

### Pattern 2: BAD vs GOOD — Restricted Pod Compliance

This pattern shows the difference between a pod that violates the restricted profile and one that complies. Every security context field is explicitly set.

```yaml
# ❌ BAD — Pod violating restricted profile on multiple counts
apiVersion: v1
kind: Pod
metadata:
  name: bad-restricted-pod
  namespace: production-payments
spec:
  containers:
    - name: app
      image: myregistry.com/payments-app:1.2.3
      securityContext:
        privileged: true                  # ❌ BLOCKED: privileged must be false
        allowPrivilegeEscalation: true    # ❌ BLOCKED: must be false
        runAsUser: 0                     # ❌ BLOCKED: root not allowed
        runAsNonRoot: false              # ❌ BLOCKED: must be true
        capabilities:
          add:
            - NET_ADMIN                  # ❌ BLOCKED: no capabilities may be added
```

```yaml
# ✅ GOOD — Pod fully compliant with restricted profile
apiVersion: v1
kind: Pod
metadata:
  name: good-hardened-pod
  namespace: production-payments
spec:
  securityContext:
    runAsNonRoot: true                # ✅ Required: prevents root execution
    runAsUser: 1000                   # ✅ Recommended: explicit non-root UID
    runAsGroup: 3000                  # ✅ Recommended: explicit non-root GID
    fsGroup: 2000                     # ✅ Recommended: file system group
  containers:
    - name: app
      image: myregistry.com/payments-app:1.2.3
      securityContext:
        privileged: false             # ✅ Required: no privileged mode
        allowPrivilegeEscalation: false  # ✅ Required: no escalation
        readOnlyRootFilesystem: true  # ✅ Recommended: immutable filesystem
        runAsNonRoot: true            # ✅ Required: non-root user
        capabilities:
          drop:
            - ALL                     # ✅ Required: drop all capabilities
          add: []                     # ✅ Explicit: no additions
        seccompProfile:
          type: RuntimeDefault        # ✅ Required: default seccomp profile
      resources:
        limits:
          memory: "256Mi"
          cpu: "500m"
        requests:
          memory: "128Mi"
          cpu: "250m"
```

**PolicyReport Example for Restricted Violations:**

```yaml
apiVersion: wgpolicyk8s.io/v1alpha2
kind: PolicyReport
metadata:
  name: pod-security-restricted-report
  namespace: production-payments
results:
  - policy: pod-security-restricted
    rule: enforce-restricted
    result: fail
    severity: high
    message: "Pod violates restricted profile: runAsNonRoot not set, capabilities not dropped, privileged container"
    scored: true
    source: kyverno
    timestamp:
      seconds: 1733501530
    details:
      restricted:
        - "container: app must set runAsNonRoot: true"
        - "container: app must drop capabilities ALL"
        - "container: app must set seccompProfile to RuntimeDefault"
  - policy: pod-security-restricted
    rule: enforce-restricted
    result: pass
    severity: high
    message: "Pod passes restricted profile validation"
    scored: true
    source: kyverno
    timestamp:
      seconds: 1733501531
summary:
  error: 0
  fail: 1
  pass: 1
  skip: 0
  warn: 0
```

### Pattern 3: Namespace-Scoped Enforcement with Label Selector

When you need per-namespace granularity (e.g., restrict production but leave staging at baseline), use a Kyverno ClusterPolicy with label-based matching instead of namespace lists. This pattern scales better than maintaining namespace exclusions.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: pod-security-restricted-label
  annotations:
    policies.kyverno.io/title: Pod Security — Restricted (Label-Based)
    policies.kyverno.io/category: Pod Security
    policies.kyverno.io/description: >-
      Enforces restricted PSS only on namespaces labeled with security-level=restricted.
      Uses matchExpressions for scalable label-based targeting.
spec:
  validationFailureAction: Enforce
  rules:
    - name: enforce-restricted-label
      match:
        any:
          - resources:
              kinds:
                - Pod
          - namespaces:
              - production-*
      exclude:
        any:
          - namespaces:
              - kube-system
              - kube-public
              - kube-node-lease
      podSecurity:
        level: restricted
        version: "1.28"
        enforce: "1.28"
        audit: "1.28"
        warn: "1.28"
```

---

## Constraints

### MUST DO
- Pin the `version` field to your cluster's exact minor version (e.g., `"1.28"`) — do not use `"latest"` for enforcement rules
- Require `runAsNonRoot: true` for all containers including init containers — the restricted profile does this automatically via `podSecurity` rule
- Set `capabilities.drop` to `["ALL"]` as a mandatory check — this is the single most impactful restricted-level control
- Configure `seccompProfile.type: RuntimeDefault` or `Localhost` — restricted profile requires seccomp compliance
- Include `auditAnnotations` to enable visibility into enforcement events for operators monitoring PSS compliance
- Always exclude `kube-system`, `kube-public`, and `kube-node-lease` — restricted blocks critical system pods

### MUST NOT DO
- Apply restricted profile enforcement to `kube-system` without an exemption via `kyverno-exemptions-management` — it breaks CoreDNS, CNI, and kubelet
- Use `enforce: "latest"` without verifying your cluster supports that PSS version — mismatched versions cause false positives
- Skip the `audit` mode — enforcement-only without audit feedback produces no visibility into pre-compliance workloads
- Hardcode specific UIDs (e.g., `runAsUser: 1000`) when `runAsNonRoot: true` alone satisfies the restricted profile — the profile accepts any non-root UID
- Apply restricted enforcement before testing in `warn` or `audit` mode in your staging environment — production breakage is the most common error
- Use wildcard namespace matching (`- "*"` in match) without explicit `exclude` blocks for system namespaces

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kyverno-pod-security-baseline` | Less restrictive; use when restricted is too heavy for your workload |
| `kyverno-exemptions-management` | Manage exemptions for system workloads that cannot meet restricted requirements |

---

## Live References

> Authoritative documentation links for Kyverno pod security policies and restricted profile enforcement.

- [Kyverno Documentation](https://kyverno.io/docs/)
- [Kyverno CLI](https://kyverno.io/docs/kyverno-cli/)
- [Kyverno podSecurity Rule](https://kyverno.io/policies/best-practices/podsecurity/pod-security/pod-security/)
- [Kyverno GitHub](https://github.com/kyverno/kyverno)
- [Kyverno Installation](https://kyverno.io/docs/installation/)
- [Policy Report Schema](https://github.com/kubernetes-sigs/wg-policy-prototypes/tree/master/policy-report)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Restricted Profile Requirements](https://kubernetes.io/docs/concepts/security/pod-security-standards/#restricted)
- [Kyverno ClusterPolicy Reference](https://kyverno.io/docs/writing-policies/)
