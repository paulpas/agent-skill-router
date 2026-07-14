---
name: kyverno-pod-security-baseline
description: Implements Kyverno podSecurity rules to enforce the Kubernetes Pod Security Standards baseline profile across namespaces in a cluster.
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
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: pod security baseline, PSS baseline, kubernetes pod security, container runtime policies, privileged container prevention, baseline profile enforcement, kubelet pod security
  role: implementation
  scope: implementation
  output-format: manifests
  related-skills: kyverno-pod-security-baseline, kyverno-pod-security-restricted
---

# Kyverno Pod Security Standards — Baseline Profile

Implements Kyverno `podSecurity` rules to enforce the Kubernetes Pod Security Standards (PSS) baseline profile. This skill makes the model configure `ClusterPolicy` objects that deny pods violating baseline-level restrictions — such as privileged containers, host namespaces, and volume type restrictions — while allowing all other pod configurations. The baseline profile sits between unrestricted and restricted in the PSS hierarchy.

## TL;DR Checklist

- [ ] Create ClusterPolicy with podSecurity rule at baseline level
- [ ] Set enforce mode on matching namespaces
- [ ] Add auditAnnotations for logging enforcement events
- [ ] Exclude kube-system and monitoring namespaces from enforcement
- [ ] Verify with PolicyReport showing pass/fail results

---

## When to Use

- Enforcing baseline Pod Security Standards across all application namespaces
- Preventing privileged container execution in production environments
- Blocking host namespace sharing (hostNetwork, hostPID, hostIPC)
- Restricting dangerous volume types like hostPath, secret, and configMap
- Complying with organizational security policies that mandate minimum pod hardening
- Setting up progressive enforcement: baseline in production, restricted in staging

---

## When NOT to Use

- When you need the restricted profile (hardened security for sensitive workloads) — use `kyverno-pod-security-restricted` instead
- For the `kube-system` namespace — baseline blocks many system components (use exemptions via `kyverno-exemptions-management`)
- When using legacy Kubernetes versions < 1.23 that lack built-in PSS support

---

## Core Workflow

1. **Define the podSecurity ClusterPolicy** — Create a `ClusterPolicy` with a `podSecurity` rule. Set `spec.rules[].podSecurity` with `level: baseline`, `version: "latest"`, `enforce`, `audit`, and `warn` modes. Apply the policy to matching namespaces via the `match` block. **Checkpoint:** Confirm the `version` field matches your cluster's Kubernetes minor version (e.g., `"1.28"` for K8s 1.28).

2. **Configure namespace selection and exclusions** — Use `match` to select all namespaces, then add `exclude` rules for critical system namespaces (`kube-system`, `kube-public`, `openshift-*`). This prevents Kyverno from blocking essential cluster operations. **Checkpoint:** Verify that `kubectl get policyreport -A` does not show failures for excluded namespaces.

3. **Deploy, verify, and monitor** — Apply the ClusterPolicy. Create a test pod that violates the baseline (e.g., `privileged: true`). Confirm the pod is denied at admission time. Check `PolicyReport` and `Events` for enforcement logs. **Checkpoint:** The violating pod should show `Failed to create pod` with a Kyverno enforcement message.

---

## Implementation Patterns

### Pattern 1: Cluster-wide Baseline Enforcement

This pattern enforces the PSS baseline profile on all namespaces except explicitly excluded system namespaces.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: pod-security-baseline
  annotations:
    policies.kyverno.io/title: Pod Security Standards — Baseline
    policies.kyverno.io/category: Pod Security
    policies.kyverno.io/description: >-
      Enforces the Pod Security Standards baseline profile on all
      non-system namespaces. Prevents privileged containers, host
      namespace sharing, and dangerous volume types.
spec:
  rules:
    - name: enforce-baseline
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
      podSecurity:
        level: baseline
        version: latest
        enforce: "latest"
        audit: "latest"
        warn: "latest"
    - name: audit-baseline
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
      podSecurity:
        level: baseline
        version: latest
        audit: "latest"
    - name: warn-baseline
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
      podSecurity:
        level: baseline
        version: latest
        warn: "latest"
```

### Pattern 2: Namespace-scoped Baseline via Labels

Apply the baseline profile per-namespace using labels instead of a ClusterPolicy. This allows different namespaces to have different security levels.

```yaml
# Label namespaces with baseline enforcement
apiVersion: v1
kind: Namespace
metadata:
  name: production-apps
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: baseline
    pod-security.kubernetes.io/warn-version: latest
```

**Kyverno PolicyReport Example:**

```yaml
apiVersion: wgpolicyk8s.io/v1alpha2
kind: PolicyReport
metadata:
  name: pod-security-baseline-report
  namespace: production-apps
results:
  - policy: pod-security-baseline
    rule: enforce-baseline
    result: fail
    severity: high
    message: "Pod violates baseline: container 'app' allows privilege escalation"
    scored: true
    source: kyverno
    timestamp:
      seconds: 1733501530
summary:
  error: 0
  fail: 1
  pass: 0
  skip: 0
  warn: 0
```

### Pattern 3: BAD vs GOOD — Privileged Container Prevention

```yaml
# ❌ BAD — Pod with privileged container that baseline rejects
apiVersion: v1
kind: Pod
metadata:
  name: bad-privileged-pod
  namespace: production-apps
spec:
  containers:
    - name: app
      image: nginx:latest
      securityContext:
        privileged: true           # baseline blocks this
        allowPrivilegeEscalation: true  # baseline blocks this
---
# ✅ GOOD — Pod that passes baseline enforcement
apiVersion: v1
kind: Pod
metadata:
  name: good-hardened-pod
  namespace: production-apps
spec:
  containers:
    - name: app
      image: nginx:latest
      securityContext:
        privileged: false
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
```

---

## Constraints

### MUST DO
- Always include exclude rules for `kube-system`, `kube-public`, and `kube-node-lease` to avoid blocking cluster operations
- Set all three enforcement modes (enforce, audit, warn) to progressively tighten security over time
- Use `version: latest` to stay current with Kubernetes PSS version updates
- Verify `PolicyReport` shows results for each namespace to confirm enforcement is active
- Use `podSecurity` rule type rather than `validate` — it is purpose-built for PSS and handles versioning

### MUST NOT DO
- Apply baseline enforcement to `kube-system` without an exemption strategy — it breaks DNS, metrics, and system pods
- Use `enforce` mode without first testing in `audit` or `warn` mode — this will block existing deployments
- Omit the `exclude` block — without it, system components will be blocked and the cluster will become unusable
- Set `version` to a specific minor version without correlating to your cluster's Kubernetes version
- Skip `warn` mode — audit-only enforcement produces no immediate feedback for developers

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kyverno-pod-security-restricted` | For stricter hardening when baseline is insufficient |
| `kyverno-exemptions-management` | For managing namespace exemptions when baseline blocks valid system workloads |

---

## Live References

> Authoritative documentation links for Kyverno pod security policies.

- [Kyverno Documentation](https://kyverno.io/docs/)
- [Kyverno CLI](https://kyverno.io/docs/kyverno-cli/)
- [Kyverno Policies](https://kyverno.io/policies/)
- [Kyverno GitHub](https://github.com/kyverno/kyverno)
- [Kyverno Installation](https://kyverno.io/docs/installation/)
- [Policy Report Schema](https://github.com/kubernetes-sigs/wg-policy-prototypes/tree/master/policy-report)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kyverno podSecurity Rule](https://kyverno.io/policies/best-practices/podsecurity/pod-security/pod-security/)
