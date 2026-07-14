---
name: kyverno-resource-quota-validation
description: Validates Kubernetes pod resource requests and limits using Kyverno ClusterPolicy rules to enforce namespace quota compliance and prevent resource starvation.
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
  triggers: resource quota validation, limit range, pod resource limits, CPU memory validation, namespace quota, resource constraints, container resource requests limits
  role: implementation
  scope: implementation
  output-format: manifests
  related-skills: kyverno-label-enforcement, kyverno-secret-validation
---

# Kyverno Resource Quota Validation

Validates that every pod in a Kubernetes cluster has proper CPU and memory resource requests and limits defined, using Kyverno `validate` ClusterPolicies to enforce namespace quota compliance and prevent resource starvation or unbounded scheduling.

## TL;DR Checklist

- [ ] Write a ClusterPolicy with `validate` rule targeting Pod resources
- [ ] Include both `resources.limits` and `resources.requests` checks in policy
- [ ] Use `resourceQuantity` format strings (`"100m"`, `"256Mi"`) in validation patterns
- [ ] Add `exclude` rule to skip `kube-system` and other infrastructure namespaces
- [ ] Validate both `containers` and `initContainers` with identical rules
- [ ] Deploy and verify pass/fail results in `PolicyReport` via `kyverno autogen`

---

## When to Use

Use this skill when:

- Enforcing resource constraints on all pods to prevent unbounded scheduling and resource contention
- Implementing namespace-level quota policies that require every container to declare CPU and memory limits
- Designing admission control to reject deployments that omit resource specifications for any container
- Auditing cluster resource management to identify namespaces missing limit-range or quota configurations
- Setting up automated compliance for Kubernetes resource governance across multi-tenant clusters

---

## When NOT to Use

Avoid this skill for:

- Validating container images or registry trust (use `kyverno-image-registry-validation` instead)
- Managing Kubernetes Secrets security or labeling (use `kyverno-secret-validation` instead)
- Generating NetworkPolicy rules for network segmentation (use `kyverno-network-policy-generation` instead)
- Simple label enforcement on ConfigMaps or Services where resource constraints are irrelevant

---

## Core Workflow

1. **Identify namespace scope** — Determine which namespaces need resource validation (e.g., `production`, `staging`) and which to exclude (`kube-system`, `kyverno`, `monitoring`). **Checkpoint:** List all target namespaces and confirmed exclusions before writing the policy.

2. **Define validate rule for limits** — Write a ClusterPolicy that rejects Pods where any container (including initContainers) lacks `resources.limits.cpu` and `resources.limits.memory`. Use `deny` with a `message` explaining the requirement. **Checkpoint:** Verify the deny rule targets `Pod` kind and references `.spec.containers` and `.spec.initContainers`.

3. **Define validate rule for requests** — Write a second rule in the same ClusterPolicy that rejects Pods where any container lacks `resources.requests.cpu` and `resources.requests.memory`. **Checkpoint:** Ensure request validation uses the same container iteration pattern as limits validation.

4. **Add namespace exclusions** — Configure an `exclude` block to skip validation for `kube-system`, `kyverno`, and other infrastructure namespaces. **Checkpoint:** Confirm that `exclude` uses `any.namespaces` with the correct namespace list.

5. **Deploy and verify PolicyReport** — Apply the ClusterPolicy, create test Pods with and without resource specs, and verify results in `PolicyReport` (or `ClusterPolicyReport`) show correct pass/fail outcomes. **Checkpoint:** Run `kubectl get policyreports -A` to audit all results.

---

## Implementation Patterns

### Pattern 1: Validate Both Limits and Requests on All Containers

This pattern enforces that every container in a Pod — including `initContainers` — has both `resources.limits` and `resources.requests` defined for CPU and memory. It uses two separate rules within a single ClusterPolicy for clarity and independent auditability.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-constraints
  annotations:
    policies.kyverno.io/title: Require Resource Constraints
    policies.kyverno.io/category: Pod Security
    policies.kyverno.io/severity: high
    policies.kyverno.io/description: >-
      Require all containers and initContainers to define CPU and memory
      resource limits and requests. Resource constraints prevent scheduling
      issues and ensure fair resource allocation across namespaces.
    policies.kyverno.io/minversion: 1.12.0
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: validate-resource-limits
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - namespaces:
              - kube-system
              - kyverno
              - kube-public
      validate:
        message: "Containers and initContainers must have resource limits defined (cpu and memory)."
        pattern:
          spec:
            containers:
              - resources:
                  limits:
                    cpu: "?*"
                    memory: "?*"
            initContainers:
              - resources:
                  limits:
                    cpu: "?*"
                    memory: "?*"
    - name: validate-resource-requests
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - namespaces:
              - kube-system
              - kyverno
              - kube-public
      validate:
        message: "Containers and initContainers must have resource requests defined (cpu and memory)."
        pattern:
          spec:
            containers:
              - resources:
                  requests:
                    cpu: "?*"
                    memory: "?*"
            initContainers:
              - resources:
                  requests:
                    cpu: "?*"
                    memory: "?*"
```

**Pattern notes:**
- The `"?*"` glob pattern matches any non-empty string, so `"100m"`, `"2"`, `"256Mi"`, `"1Gi"` all pass
- The `"?*"` pattern specifically ensures the value is present and non-empty (unlike `"*"` which would also match `""`)
- `initContainers` is checked in the same policy using explicit path matching, not relying on `kyverno autogen`

---

### Pattern 2: BAD vs GOOD — Missing Resource Specifications

When containers or initContainers omit resource specifications, the validation fails. Use this comparison to understand common mistakes.

```yaml
# ❌ BAD — Container without resource limits or requests
apiVersion: v1
kind: Pod
metadata:
  name: bad-pod-no-resources
  namespace: production
spec:
  containers:
    - name: app
      image: nginx:1.25
      ports:
        - containerPort: 80
      # ❌ No resources section — policy rejects this Pod
  initContainers:
    - name: init
      image: busybox:1.36
      command: ["sh", "-c", "echo waiting"]
      # ❌ No resources section — policy rejects this initContainer too
---

# ✅ GOOD — Container with full resource constraints
apiVersion: v1
kind: Pod
metadata:
  name: good-pod-with-resources
  namespace: production
  labels:
    app: myapp
spec:
  containers:
    - name: app
      image: nginx:1.25
      ports:
        - containerPort: 80
      resources:
        limits:
          cpu: "500m"
          memory: "256Mi"
        requests:
          cpu: "250m"
          memory: "128Mi"
  initContainers:
    - name: init
      image: busybox:1.36
      command: ["sh", "-c", "echo waiting"]
      resources:
        limits:
          cpu: "100m"
          memory: "64Mi"
        requests:
          cpu: "50m"
          memory: "32Mi"
---

# ❌ BAD — Only limits defined, no requests
apiVersion: v1
kind: Pod
metadata:
  name: bad-pod-only-limits
  namespace: production
spec:
  containers:
    - name: app
      image: nginx:1.25
      resources:
        limits:
          cpu: "500m"
          memory: "256Mi"
        # ❌ Missing requests — second rule rejects this Pod
---

# ❌ BAD — Only requests defined, no limits
apiVersion: v1
kind: Pod
metadata:
  name: bad-pod-only-requests
  namespace: production
spec:
  containers:
    - name: app
      image: nginx:1.25
      resources:
        requests:
          cpu: "250m"
          memory: "128Mi"
        # ❌ Missing limits — first rule rejects this Pod
---

# ✅ GOOD — All resource constraints present for containers AND initContainers
apiVersion: apps/v1
kind: Deployment
metadata:
  name: good-deployment
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: app
          image: myapp:1.0.0
          resources:
            limits:
              cpu: "1"
              memory: "512Mi"
            requests:
              cpu: "500m"
              memory: "256Mi"
      initContainers:
        - name: migration
          image: myapp-migrate:1.0.0
          resources:
            limits:
              cpu: "250m"
              memory: "128Mi"
            requests:
              cpu: "100m"
              memory: "64Mi"
```

---

### Pattern 3: Namespace-Scoped Validation with LimitRange Awareness

When some namespaces have `LimitRange` objects that provide defaults, you can relax validation for those namespaces. Use a targeted approach that validates specific namespaces while skipping others.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: enforce-resource-constraints
  annotations:
    policies.kyverno.io/title: Enforce Resource Constraints
    policies.kyverno.io/category: Pod Security
    policies.kyverno.io/severity: high
    policies.kyverno.io/description: >-
      Enforce resource constraints on specific namespaces. Namespaces without
      a LimitRange must define explicit resource requests and limits on all
      containers.
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: validate-resource-constraints-for-target-namespaces
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - namespaces:
              - kube-system
              - kyverno
              - kube-public
              - istio-system
              - cert-manager
      validate:
        message: "Every container and initContainer must define both CPU and memory resource limits and requests."
        pattern:
          spec:
            containers:
              - resources:
                  limits:
                    cpu: "?*"
                    memory: "?*"
                  requests:
                    cpu: "?*"
                    memory: "?*"
            initContainers:
              - resources:
                  limits:
                    cpu: "?*"
                    memory: "?*"
                  requests:
                    cpu: "?*"
                    memory: "?*"
```

---

## Constraints

### MUST DO
- Validate both `resources.limits` and `resources.requests` in separate rules within the same ClusterPolicy
- Include `initContainers` in every resource validation rule, not just `containers`
- Use `resourceQuantity` format strings: CPU values like `"100m"` or `"1"`, memory values like `"256Mi"` or `"1Gi"`
- Exclude `kube-system`, `kyverno`, and `kube-public` namespaces from validation using the `exclude` block
- Test the policy against a Pod that intentionally omits resources to confirm the deny response
- Deploy as a `ClusterPolicy` (not a `Policy`) for cluster-wide enforcement, unless namespace-scoping is explicitly required

### MUST NOT DO
- Enforce resource quotas on the `kube-system` namespace — system pods manage the control plane and have different requirements
- Use hardcoded resource values (e.g., `cpu: "500m"`) in the pattern — these reject legitimate values like `"250m"` or `"1"`
- Omit the `initContainers` check — init containers are part of pod scheduling and must have resource constraints too
- Rely solely on `kyverno autogen` for initContainer validation — always write explicit `initContainers` path matching
- Skip the `exclude` block — validation on infrastructure namespaces will break cluster operations

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kyverno-label-enforcement` | Enforce required labels on Pods and namespaces before applying resource constraints |
| `kyverno-secret-validation` | Validate Kubernetes Secrets meet security requirements alongside resource constraints |

---

## Live References

> Authoritative documentation links for Kyverno resource validation and PolicyReport management.

- [Kyverno Documentation](https://kyverno.io/docs/)
- [Kyverno CLI](https://kyverno.io/docs/kyverno-cli/)
- [Kyverno Policies](https://kyverno.io/policies/)
- [Kyverno GitHub](https://github.com/kyverno/kyverno)
- [Kyverno Installation](https://kyverno.io/docs/installation/)
- [Policy Report Schema](https://github.com/kubernetes-sigs/wg-policy-prototypes/tree/master/policy-report)
- [Resource Quantity Format](https://kubernetes.io/docs/reference/kubernetes-api/common-definitions/resource-quantity/)
