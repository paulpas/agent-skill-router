---
name: kyverno-policy-generation
description: Implements Kyverno generate rules to automatically create or modify Kubernetes resources (ResourceQuota, LimitRange, NetworkPolicy) on namespace creation.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - orchestration
anti_triggers:
  - brainstorming
  - vague ideation
  - manual resource creation
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: kyverno generate rules, resource generation, generatePresence, generationKey, clusterpolicy generate, automatic resource provisioning, kyverno sync rules
  role: implementation
  scope: implementation
  output-format: manifests
  related-skills: kyverno-policy-generation, kyverno-resource-quota-validation
---

# Kyverno Policy Generation Engine

Implements generate rules that automatically create dependent resources (ResourceQuota, LimitRange, NetworkPolicy, ConfigMaps, Secrets) whenever new Kubernetes namespaces or other target resources are created. This skill makes the model configure `ClusterPolicy` objects with `generate` rules, set `synchronize: true` to keep generated resources in sync, and monitor `PolicyReport` outcomes for generation success or failure.

## TL;DR Checklist

- [ ] Create ClusterPolicy with generate rule targeting Namespace kind
- [ ] Configure generate section with template and synchronize: true
- [ ] Set generateExisting: true for backfilling existing namespaces
- [ ] Verify generated resources appear in target namespace via PolicyReport
- [ ] Test with a dry-run namespace to confirm behavior

---

## When to Use

- Automating ResourceQuota and LimitRange assignment to every new namespace
- Generating NetworkPolicy objects to enforce default-deny networking on namespace creation
- Provisioning ConfigMaps or Secrets with standard configuration for application namespaces
- Enforcing standard annotations, labels, or ownerReferences on generated resources
- Backfilling missing resources on existing namespaces using `generateExisting: true`

---

## When NOT to Use

- One-time resource creation (use `kubectl apply` or a Helm chart instead)
- Resources that require user input or interactive confirmation before creation
- Cross-cluster resource generation (use a GitOps operator like Flux or ArgoCD instead)

---

## Core Workflow

1. **Define the ClusterPolicy manifest** — Create a `ClusterPolicy` resource with a generate rule. Set `spec.rules[].generate` with a `ResourceTemplate` that includes the target resource kind, apiVersion, metadata (using `{{request.object.metadata.name}}` as namespace), and the full spec block. **Checkpoint:** Confirm the template matches the target resource schema (e.g., `quota.spec.hard` for ResourceQuota).

2. **Configure synchronization and backfill** — Set `synchronize: true` on the generate rule to ensure Kyverno reconciles the generated resource with the template whenever changes occur. Set `generateExisting: true` to backfill all currently existing matching resources. **Checkpoint:** Verify `PolicyReport` shows `pass` for the `generate-existing` rule on existing namespaces.

3. **Deploy and monitor PolicyReport** — Apply the ClusterPolicy to the cluster with `kubectl apply -f policy.yaml`. Watch for the `ClusterPolicy` to become active (check `kyverno` pod logs). Query `kubectl get policyreport -A` to confirm generation results. **Checkpoint:** Each target namespace should show a `pass` result for the generation rule.

---

## Implementation Patterns

### Pattern 1: ResourceQuota + LimitRange Generation on Namespace

This pattern generates a ResourceQuota and LimitRange for every namespace created. The template references the new namespace name using the Kyverno variable `{{request.object.metadata.name}}`.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-resource-quota
  annotations:
    policies.kyverno.io/title: Generate ResourceQuota and LimitRange
    policies.kyverno.io/category: Best Practices
    policies.kyverno.io/description: >-
      Creates a ResourceQuota and LimitRange for every namespace to
      ensure proper resource allocation and prevent resource exhaustion.
spec:
  rules:
    - name: generate-resourcequota
      match:
        any:
          - resources:
              kinds:
                - Namespace
      generate:
        apiVersion: v1
        kind: ResourceQuota
        metadata:
          name: default-quota
          namespace: "{{request.object.metadata.name}}"
        spec:
          hard:
            requests.cpu: "4"
            requests.memory: "8Gi"
            limits.cpu: "8"
            limits.memory: "16Gi"
            pods: "100"
        synchronize: true
        generateExisting: true
    - name: generate-limitrange
      match:
        any:
          - resources:
              kinds:
                - Namespace
      generate:
        apiVersion: v1
        kind: LimitRange
        metadata:
          name: default-limits
          namespace: "{{request.object.metadata.name}}"
        spec:
          limits:
            - default:
                cpu: "500m"
                memory: "512Mi"
              defaultRequest:
                cpu: "100m"
                memory: "128Mi"
              type: Container
        synchronize: true
        generateExisting: true
```

**Verification Command:**

```bash
# Create a test namespace and watch for generated resources
kubectl create namespace test-ns

# Wait a few seconds, then check for ResourceQuota
kubectl -n test-ns get resourcequota
# Expected output: NAME           QUOTED   REQUEST   LIMIT
#                 default-quota  0/100    0/4       0/8

# Check the PolicyReport
kubectl get policyreport -n test-ns
```

### Pattern 2: NetworkPolicy Default-Deny Generation

This pattern generates a default-deny NetworkPolicy for every namespace.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-default-deny-networkpolicy
  annotations:
    policies.kyverno.io/title: Generate Default-Deny NetworkPolicy
    policies.kyverno.io/category: Network Security
    policies.kyverno.io/description: >-
      Creates a default-deny NetworkPolicy in every namespace to block
      all ingress and egress traffic until explicitly allowed.
spec:
  rules:
    - name: generate-netpol-default-deny
      match:
        any:
          - resources:
              kinds:
                - Namespace
      generate:
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        metadata:
          name: default-deny-all
          namespace: "{{request.object.metadata.name}}"
        spec:
          podSelector: {}
          policyTypes:
            - Ingress
            - Egress
        synchronize: true
        generateExisting: true
```

**PolicyReport Example:**

```yaml
apiVersion: wgpolicyk8s.io/v1alpha2
kind: PolicyReport
metadata:
  name: policy-report-default-quota
  namespace: test-ns
results:
  - policy: generate-resource-quota
    rule: generate-resourcequota
    result: pass
    severity: low
    message: "Generated ResourceQuota/default-quota in namespace test-ns"
    scored: true
    source: kyverno
    timestamp:
      seconds: 1733501530
      nanos: 123456789
  - policy: generate-resource-quota
    rule: generate-limitrange
    result: pass
    severity: low
    message: "Generated LimitRange/default-limits in namespace test-ns"
    scored: true
    source: kyverno
    timestamp:
      seconds: 1733501530
      nanos: 123456789
summary:
  error: 0
  fail: 0
  pass: 2
  skip: 0
  warn: 0
```

### Pattern 3: generatePresence for Simple Resource Existence

Use `generatePresence` when you only need a resource to exist without specifying a full template. This is lighter-weight than a full `generate` template.

```yaml
# ❌ BAD — Using generate for a simple ConfigMap that only needs to exist
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: bad-configmap-generation
spec:
  rules:
    - name: generate-configmap
      match:
        any:
          - resources:
              kinds:
                - Namespace
      generate:
        # Overkill — full template for a resource that just needs to exist
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: namespace-info
          namespace: "{{request.object.metadata.name}}"
        data:
          info: "This namespace was created at {{request.time}}"
        # Problem: this is more complex than needed for simple presence checks

# ✅ GOOD — Using generatePresence for simple existence requirement
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: good-namespace-feature-flag
spec:
  rules:
    - name: ensure-namespace-feature-flag
      match:
        any:
          - resources:
              kinds:
                - Namespace
      generate:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: namespace-features
          namespace: "{{request.object.metadata.name}}"
        data:
          features: enabled
        synchronize: true
```

---

## Constraints

### MUST DO
- Always set `synchronize: true` on generate rules so generated resources stay in sync with template changes
- Set `generateExisting: true` when you need backfilling for pre-existing namespaces
- Use `{{request.object.metadata.name}}` variable for namespace-aware metadata in generated resources
- Specify `apiVersion`, `kind`, and `metadata` explicitly in every generate template
- Monitor `PolicyReport` outcomes to verify generation succeeded for each target namespace

### MUST NOT DO
- Generate resources without `generateExisting: true` if you have existing namespaces that need them
- Omit the `namespace` field in generated resource metadata — always use the request object variable
- Use the same `name` for both the ClusterPolicy rule and the generated resource (causes ambiguity in reports)
- Generate without specifying `apiVersion` and `kind` — Kyverno cannot validate incomplete templates
- Apply generate rules to the `kube-system` namespace without explicit exclusions

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kyverno-resource-quota-validation` | Validates that ResourceQuotas are properly configured and not exceeded |
| `kyverno-network-policy-enforcement` | Enforces NetworkPolicy rules across the cluster for admission control |

---

## Live References

> Authoritative documentation links for Kyverno policy generation.

- [Kyverno Documentation](https://kyverno.io/docs/)
- [Kyverno CLI](https://kyverno.io/docs/kyverno-cli/)
- [Kyverno Policies](https://kyverno.io/policies/)
- [Kyverno GitHub](https://github.com/kyverno/kyverno)
- [Kyverno Installation](https://kyverno.io/docs/installation/)
- [Policy Report Schema](https://github.com/kubernetes-sigs/wg-policy-prototypes/tree/master/policy-report)
- [Kyverno Variables Reference](https://kyverno.io/policies/variables/)
- [Kyverno Generate Rules](https://kyverno.io/docs/writing-policies/generate/)
