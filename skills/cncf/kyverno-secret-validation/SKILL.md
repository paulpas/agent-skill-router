---
name: kyverno-secret-validation
description: Validates Kubernetes Secrets meet security requirements by checking secret types, enforcing labeling standards, and preventing legacy service-account-token usage.
license: MIT
compatibility: opencode
archetypes:
  - enforcement
  - diagnostic
anti_triggers:
  - brainstorming
  - vague ideation
  - general infrastructure planning
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: secret validation, Kubernetes secrets, deny service account token, secret type validation, secret security, secret labeling, legacy token detection
  role: implementation
  scope: implementation
  output-format: manifests
  related-skills: kyverno-resource-quota-validation, kyverno-image-registry-validation
---

# Kyverno Secret Validation

Validates Kubernetes Secrets to ensure they meet security requirements: rejecting the deprecated `kubernetes.io/service-account-token` secret type, enforcing required labels (e.g., `managed-by: kyverno`), and limiting secret data size to prevent abuse or accidental exposure.

## TL;DR Checklist

- [ ] Write a ClusterPolicy that denies `kubernetes.io/service-account-token` secret type
- [ ] Add a label enforcement rule requiring `managed-by` or `app.kubernetes.io/managed-by` on all Secrets
- [ ] Add a data size validation rule limiting total secret content to a defined maximum
- [ ] Exclude `kube-system` namespace secrets from validation rules
- [ ] Deploy and verify results in `PolicyReport` via `kubectl get policyreports -A`

---

## When to Use

Use this skill when:

- Enforcing security standards on all Secrets in a Kubernetes cluster to prevent use of deprecated or unsafe secret types
- Implementing compliance requirements that mandate labeling on all Secrets for asset tracking and management attribution
- Preventing the use of `kubernetes.io/service-account-token` secrets which expose service account credentials
- Limiting the maximum size of Secret data to prevent accidental injection of large payloads or certificate bundles
- Designing admission control for multi-tenant clusters where secret governance is a shared responsibility

---

## When NOT to Use

Avoid this skill for:

- Validating container resource requests or limits (use `kyverno-resource-quota-validation` instead)
- Generating NetworkPolicy rules for network segmentation (use `kyverno-network-policy-generation` instead)
- Managing external Secret resources from controllers like cert-manager or external-secrets (external controllers manage those resources directly)
- Enforcing policies on `kube-system` namespace resources — use the `exclude` block instead

---

## Core Workflow

1. **Identify secret type requirements** — Determine which secret types are permitted (e.g., `Opaque`, `kubernetes.io/tls`, `kubernetes.io/dockerconfigjson`) and which must be explicitly denied (e.g., `kubernetes.io/service-account-token`). **Checkpoint:** Document the approved secret type list and the deny list before writing the policy.

2. **Create deny rule for service-account-token** — Write a ClusterPolicy `validate` rule that rejects any Secret with `type: kubernetes.io/service-account-token`. Use a `deny` message referencing the deprecation. **Checkpoint:** Verify the rule matches only the `Secret` kind and checks `spec.type` (actually `type` at the root level for Secrets).

3. **Create label enforcement rule** — Write a second rule that requires all Secrets to have a `managed-by` label (value: `kyverno`). Use a `validate` pattern that checks `metadata.labels.managed-by`. **Checkpoint:** Confirm the label pattern uses `"?*"` to accept any non-empty value.

4. **Create data size validation rule** — Write a third rule that limits the total size of secret data to a maximum (e.g., 1 MiB). Use `validate` with `anyPattern` to check that each secret value's length is within bounds. **Checkpoint:** Test with a Secret that has large base64-encoded values to confirm rejection.

5. **Deploy and verify PolicyReport** — Apply the ClusterPolicy, create test Secrets with violations, and verify results appear in `PolicyReport`. **Checkpoint:** Run `kubectl get policyreports -A -o wide` to see pass/fail breakdown.

---

## Implementation Patterns

### Pattern 1: Deny Deprecated Service Account Token Secrets

This rule blocks creation of `kubernetes.io/service-account-token` secrets. This type is deprecated since Kubernetes 1.21 and should be replaced with projected volumes (`serviceAccountToken` projection). Using `deny` with a match on the secret `type` field ensures no new token-type secrets can be created.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: deny-service-account-token-secrets
  annotations:
    policies.kyverno.io/title: Deny Service Account Token Secrets
    policies.kyverno.io/category: Secrets Management
    policies.kyverno.io/severity: high
    policies.kyverno.io/description: >-
      The kubernetes.io/service-account-token secret type is deprecated as of
      Kubernetes 1.21. This policy denies creation of secrets with this type
      and requires use of projected service account tokens instead.
    policies.kyverno.io/minversion: 1.12.0
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: deny-service-account-token
      match:
        any:
          - resources:
              kinds:
                - Secret
      exclude:
        any:
          - namespaces:
              - kube-system
              - kyverno
      validate:
        message: >-
          The kubernetes.io/service-account-token secret type is deprecated.
          Use projected service account tokens (spec.serviceAccountToken)
          instead of dedicated token secrets.
        pattern:
          type: "Opaque"
```

**Pattern notes:**
- The `type: "Opaque"` pattern only matches Secrets of type `Opaque`
- Any Secret with a different type (including `kubernetes.io/service-account-token`) fails validation and is denied
- The `exclude` block ensures `kube-system` secrets are not affected

---

### Pattern 2: Enforce Secret Labeling Standards

All Secrets must carry a `managed-by` label to indicate the tool responsible for managing them. This rule enforces `managed-by: kyverno` for secrets created directly, or allows any value for secrets managed by other tools.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-secret-labels
  annotations:
    policies.kyverno.io/title: Require Secret Labels
    policies.kyverno.io/category: Secrets Management
    policies.kyverno.io/severity: medium
    policies.kyverno.io/description: >-
      All Secrets must have the managed-by label to indicate which tool or
      process manages them. This supports asset tracking, ownership queries,
      and policy management.
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: require-managed-by-label
      match:
        any:
          - resources:
              kinds:
                - Secret
      exclude:
        any:
          - namespaces:
              - kube-system
              - kyverno
      validate:
        message: "Secrets must have the managed-by label."
        pattern:
          metadata:
            labels:
              managed-by: "?*"
```

**BAD vs GOOD example:**

```yaml
# ❌ BAD — Secret without managed-by label
apiVersion: v1
kind: Secret
metadata:
  name: app-credentials
  namespace: production
  labels:
    app: myapp
    environment: production
type: Opaque
data:
  username: YWRtaW4=
  password: c2VjcmV0MTIz
# ❌ Missing managed-by label — policy rejects this

# ✅ GOOD — Secret with managed-by label
apiVersion: v1
kind: Secret
metadata:
  name: app-credentials
  namespace: production
  labels:
    app: myapp
    environment: production
    managed-by: kyverno
    app.kubernetes.io/managed-by: kyverno
type: Opaque
data:
  username: YWRtaW4=
  password: c2VjcmV0MTIz

# ✅ GOOD — Secret managed by a different tool
apiVersion: v1
kind: Secret
metadata:
  name: tls-cert
  namespace: production
  labels:
    app: ingress
    managed-by: cert-manager
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTi...
  tls.key: LS0tLS1CRUdJTi...
```

---

### Pattern 3: Enforce Secret Data Size Limits

This rule limits the total size of a Secret's data to prevent injection of oversized payloads. It checks that each base64-encoded value in the `data` map stays under a defined maximum length (equivalent to ~1 MiB when decoded).

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: limit-secret-size
  annotations:
    policies.kyverno.io/title: Limit Secret Size
    policies.kyverno.io/category: Secrets Management
    policies.kyverno.io/severity: medium
    policies.kyverno.io/description: >-
      Limit the size of Secret data to prevent oversized payloads. Each
      base64-encoded value in the Secret data must not exceed 1048576
      bytes (1 MiB decoded).
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: validate-secret-data-size
      match:
        any:
          - resources:
              kinds:
                - Secret
      exclude:
        any:
          - namespaces:
              - kube-system
              - kyverno
      validate:
        message: "Secret data values must not exceed 1 MiB each."
        pattern:
          data:
            (=*) : "<1048576"
```

**Pattern notes:**
- The `(<1048576)` operator in Kyverno performs a numeric comparison on the base64-decoded length
- `"(=*)"` matches any key name in the `data` map (e.g., `username`, `password`, `ca.crt`)
- Secrets with `stringData` are also checked because Kyverno normalizes both fields

---

### Pattern 4: Comprehensive Secret Security Policy

Combine all secret validation rules into a single ClusterPolicy for streamlined management.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: secret-security-policy
  annotations:
    policies.kyverno.io/title: Secret Security Policy
    policies.kyverno.io/category: Secrets Management
    policies.kyverno.io/severity: high
    policies.kyverno.io/description: >-
      Comprehensive secret validation: deny service-account-token type,
      enforce managed-by label, and limit data size.
    policies.kyverno.io/minversion: 1.12.0
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: deny-service-account-token
      match:
        any:
          - resources:
              kinds:
                - Secret
      exclude:
        any:
          - namespaces:
              - kube-system
              - kyverno
      validate:
        message: "kubernetes.io/service-account-token type is deprecated."
        pattern:
          type: "Opaque"
    - name: require-managed-by-label
      match:
        any:
          - resources:
              kinds:
                - Secret
      exclude:
        any:
          - namespaces:
              - kube-system
              - kyverno
      validate:
        message: "Secrets must have the managed-by label."
        pattern:
          metadata:
            labels:
              managed-by: "?*"
    - name: limit-secret-data-size
      match:
        any:
          - resources:
              kinds:
                - Secret
      exclude:
        any:
          - namespaces:
              - kube-system
              - kyverno
      validate:
        message: "Secret data values must not exceed 1 MiB each."
        pattern:
          data:
            (=*) : "<1048576"
```

---

## Constraints

### MUST DO
- Deny `kubernetes.io/service-account-token` type secrets using a `type: "Opaque"` pattern in the validate rule
- Enforce a `managed-by` label on all Secrets using the `"?*"` non-empty match pattern
- Limit Secret data size to prevent oversized payloads — use `(<1048576)` for a 1 MiB ceiling per value
- Exclude the `kube-system` namespace from all secret validation rules to avoid disrupting Kubernetes internals
- Validate Secret `type` at the top level (root field), not under `metadata` or `spec` — Secrets are a CoreV1 resource with `type` as a top-level field
- Deploy as a `ClusterPolicy` for cluster-wide enforcement; do not fragment into namespace-scoped `Policy` resources

### MUST NOT DO
- Attempt to validate the actual base64-encoded content of secret data fields — base64 encoding is opaque and not meaningful for security analysis
- Enforce secret validation rules on the `kube-system` namespace — system secrets (e.g., `bootstrap-token-*`, `default-token-*`) are managed by the control plane
- Validate external Secret controller resources (e.g., `ExternalSecret` from external-secrets.io) — those are managed by their own controllers and should not be subject to CoreV1 Secret policies
- Use `"*"` (empty-match) pattern for labels — it would accept an empty string; always use `"?*"` to enforce non-empty values
- Remove all `exclude` blocks — without exclusions, even `kube-system` secrets like `extension-apiserver-authentication` would be rejected

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kyverno-resource-quota-validation` | Validate pod resource constraints alongside secret security policies |
| `kyverno-image-registry-validation` | Validate container image registries as part of a comprehensive security posture |

---

## Live References

> Authoritative documentation links for Kyverno secret validation and PolicyReport management.

- [Kyverno Documentation](https://kyverno.io/docs/)
- [Kyverno CLI](https://kyverno.io/docs/kyverno-cli/)
- [Kyverno Policies](https://kyverno.io/policies/)
- [Kyverno GitHub](https://github.com/kyverno/kyverno)
- [Kyverno Installation](https://kyverno.io/docs/installation/)
- [Policy Report Schema](https://github.com/kubernetes-sigs/wg-policy-prototypes/tree/master/policy-report)
- [Kubernetes Secret Types](https://kubernetes.io/docs/concepts/configuration/secret/#secret-types)
