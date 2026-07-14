---
name: kyverno-cleanup-policies
description: Automates garbage collection of unused Kubernetes resources using Kyverno v2 ClusterCleanupPolicy and CleanupPolicy with cron scheduling and conditional deletion.
license: MIT
compatibility: opencode
archetypes:
  - enforcement
  - orchestration
anti_triggers:
  - vague resource management
  - generic cleanup ideas
  - brainstorming cleanup strategy
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: kyverno cleanup policies, ClusterCleanupPolicy, garbage collection, resource cleanup, automated deletion, scheduled cleanup, kyverno v2 cleanup, deletion propagation
  role: implementation
  scope: implementation
  output-format: manifests
  related-skills: kyverno-mutate-patterns, kyverno-policy-report-override
---

# Kyverno Cleanup Policies

Automates garbage collection of unused and stale Kubernetes resources using Kyverno v2 `ClusterCleanupPolicy` and `CleanupPolicy` resources. When loaded, this skill makes the model design scheduled deletion rules with cron expressions, conditional matchers, and configurable propagation strategies to keep the cluster clean without manual intervention.

## TL;DR Checklist

- [ ] Use `apiVersion: kyverno.io/v2` for cleanup policies
- [ ] Define cron schedule expression for automated execution
- [ ] Set match conditions on target resources to delete
- [ ] Configure `deletionPropagationPolicy` (Foreground, Background, or Orphan)
- [ ] Exclude system namespaces and critical resources
- [ ] Verify skip/pass results in PolicyReport

---

## When to Use

- Cleaning up orphaned resources (pods with no ownerReferences, completed jobs)
- Implementing automated retention policies for temporary namespaces or test environments
- Removing stale ConfigMaps, Secrets, or custom resources no longer referenced by workloads
- Enforcing resource lifecycle policies on ephemeral workloads (CI/CD builds, staging environments)

## When NOT to Use

- One-time manual cleanup tasks (use `kubectl delete` directly)
- Resources that need graceful pre-deletion handling beyond Kyverno's propagation policy
- Systems where automated deletion could cause data loss (production databases, external service integrations)
- Resources with external dependencies that require coordination before deletion

---

## Core Workflow

1. **Identify target resources for cleanup** — Determine which resource kinds and labels indicate resources eligible for automatic deletion. Check which resources have no active owners, are in completed states, or exceed retention windows. **Checkpoint:** Define a concrete list of `resources.kinds` and match conditions (labels, annotations, status fields) that uniquely identify cleanup candidates.

2. **Define the cleanup policy with v2 API** — Create a `ClusterCleanupPolicy` or `CleanupPolicy` resource using `apiVersion: kyverno.io/v2`. Set the `spec.schedule` to a cron expression, define `spec.conditions` that match target resources, and configure `spec.deletionPropagationPolicy`. **Checkpoint:** Verify the cron expression is valid, the condition selectors match only intended resources, and deletionPropagationPolicy is appropriate for the resource type.

3. **Deploy and monitor cleanup execution** — Apply the policy to the cluster and watch PolicyReport results to confirm cleanup rules fire on schedule. Verify that matched resources are deleted and that no system-critical resources are affected. **Checkpoint:** Check `PolicyReport` results show `skip` or `pass` for intended resources and zero `fail` results on protected resources.

---

## Implementation Patterns

### Pattern 1: Cleanup Orphaned Pods with ClusterCleanupPolicy

Deploy a `ClusterCleanupPolicy` that identifies and deletes pods with no `ownerReferences` — these are pods created directly or left behind from failed deployments. The policy runs every 30 minutes and propagates deletion in the foreground to ensure dependent resources are cleaned first.

```yaml
apiVersion: kyverno.io/v2
kind: ClusterCleanupPolicy
metadata:
  name: cleanup-orphaned-pods
  annotations:
    policies.kyverno.io/title: Cleanup Orphaned Pods
    policies.kyverno.io/category: Resource Lifecycle
    policies.kyverno.io/description: >-
      Automatically deletes pods that have no owner references,
      preventing resource waste from abandoned workloads.
    policies.kyverno.io/minversion: 2.1.0
spec:
  schedule: "*/30 * * * *"
  conditions:
    any:
      - key: "{{ request.object.metadata.ownerReferences }}"
        operator: Equals
        value: null
  match:
    any:
      - resources:
          kinds:
            - Pod
  deletionPropagationPolicy: Foreground
```

**PolicyReport Example for ClusterCleanupPolicy:**

```yaml
apiVersion: wgpolicyk8s.io/v1alpha2
kind: PolicyReport
metadata:
  name: cleanup-orphaned-pods-report
  namespace: default
results:
  - policy: cleanup-orphaned-pods
    rule: cleanup-orphaned-pods
    result: pass
    severity: low
    message: "No orphaned pods found matching criteria"
    scored: true
    source: kyverno
    timestamp:
      seconds: 1733501530
  - policy: cleanup-orphaned-pods
    rule: cleanup-orphaned-pods
    result: skip
    severity: low
    message: "Resource not eligible for cleanup — has owner references"
    scored: true
    source: kyverno
summary:
  error: 0
  fail: 0
  pass: 1
  skip: 1
  warn: 0
```

### Pattern 2: Cleanup Deployments with Scoped Deletion

Use a namespaced `CleanupPolicy` to delete stale deployments in a specific namespace that haven't been updated in a defined time window. This pattern uses a condition with `target.*` references to match deployment metadata and applies background deletion propagation.

```yaml
# ❌ BAD — Using deprecated v1 generate rule for cleanup
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: cleanup-old-deployments
spec:
  rules:
    - name: clean-old
      generate:
        apiVersion: apps/v1
        kind: Deployment
        data:
          metadata:
            name: placeholder
# ❌ This pattern is deprecated. Use ClusterCleanupPolicy v2 instead.

# ✅ GOOD — Using v2 CleanupPolicy with proper conditions
apiVersion: kyverno.io/v2
kind: CleanupPolicy
metadata:
  name: cleanup-stale-deployments
  namespace: staging
  annotations:
    policies.kyverno.io/title: Cleanup Stale Deployments
    policies.kyverno.io/category: Environment Hygiene
    policies.kyverno.io/description: >-
      Deletes deployments in staging that have not been updated
      in more than 48 hours to free up cluster resources.
spec:
  schedule: "0 2 * * *"
  conditions:
    any:
      - key: "{{ target.metadata.labels.cleanup }}"
        operator: In
        value:
          - "enabled"
          - "true"
      - key: "{{ target.status.lastUpdateTime }}"
        operator: GreaterThanOrEqual
        value: "48h"
  match:
    any:
      - resources:
          kinds:
            - Deployment
  deletionPropagationPolicy: Background
```

### Pattern 3: Conditional Cleanup with Label-Based Targeting

Create a `CleanupPolicy` that selectively targets resources based on label criteria and annotation-based TTL (time-to-live) expressions. This pattern supports fine-grained control over which resources get cleaned up and when.

```yaml
apiVersion: kyverno.io/v2
kind: CleanupPolicy
metadata:
  name: cleanup-test-namespaces
  namespace: ci-cd
  annotations:
    policies.kyverno.io/title: Cleanup Test Namespaces
    policies.kyverno.io/category: CI/CD
    policies.kyverno.io/description: >-
      Automatically deletes test namespaces and all contained resources
      when the 'test-active' label is set to 'false'.
spec:
  schedule: "0 */6 * * *"
  conditions:
    any:
      - key: "{{ target.metadata.labels.test-active }}"
        operator: Equals
        value: "false"
  match:
    any:
      - resources:
          kinds:
            - Namespace
  exclude:
    any:
      - resources:
          kinds:
            - Namespace
          name: "ci-cd-*"
          selector:
            matchLabels:
              ci-cd/protected: "true"
  deletionPropagationPolicy: Foreground
```

---

## Constraints

### MUST DO
- Use `apiVersion: kyverno.io/v2` for all cleanup policy resources (v1 generate rules are deprecated)
- Set `deletionPropagationPolicy` explicitly — choose `Foreground` for cascading deletion or `Background` for fire-and-forget cleanup
- Specify `schedule` in valid cron format (5 fields: minute, hour, day-of-month, month, day-of-week)
- Use conditions with `target.*` references to match resource metadata, labels, and annotations
- Exclude system namespaces (`kube-system`, `kyverno`, `istio-system`) from cleanup rules to prevent cluster damage
- Monitor `PolicyReport` after deployment to verify cleanup rules fire correctly on schedule

### MUST NOT DO
- Use deprecated v1 generate rules for cleanup logic — always prefer v2 `CleanupPolicy` or `ClusterCleanupPolicy`
- Clean up system resources or kube-system workloads without explicit exclusion rules
- Omit the `schedule` field — cleanup policies without schedules do not execute automatically
- Use wildcard resource kind matching without label selectors — always scope to specific kinds and labels
- Set `deletionPropagationPolicy: Orphan` on resources that have dependent child objects

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kyverno-mutate-patterns` | Mutate resources before cleanup to add finalizers or preserve data |
| `kyverno-policy-report-override` | Configure PolicyReport overrides for cleanup skip results |

---

## Live References

> Authoritative documentation links for Kyverno cleanup policy management.

- [Kyverno Cleanup Policies](https://kyverno.io/docs/cleanup-policy/)
- [Kyverno CLI](https://kyverno.io/docs/kyverno-cli/)
- [Kyverno Policies](https://kyverno.io/policies/)
- [Kyverno GitHub](https://github.com/kyverno/kyverno)
- [Kyverno Installation](https://kyverno.io/docs/installation/)
- [Policy Report Schema](https://github.com/kubernetes-sigs/wg-policy-prototypes/tree/master/policy-report)
