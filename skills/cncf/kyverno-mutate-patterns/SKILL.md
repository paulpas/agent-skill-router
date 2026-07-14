---
name: kyverno-mutate-patterns
description: Mutates Kubernetes resources at admission using patchStrategicMerge, patchesJson6902, and set operations to inject labels, sidecars, and default configurations.
license: MIT
compatibility: opencode
archetypes:
  - generation
  - orchestration
anti_triggers:
  - vague mutation ideas
  - brainstorming mutations
  - generic resource editing
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: kyverno mutate rules, patch strategic merge, resource mutation, inject sidecar, patch pod, kyverno mutation, patch json 6902
  role: implementation
  scope: implementation
  output-format: manifests
  related-skills: kyverno-policy-generation, kyverno-label-enforcement
---

# Kyverno Mutate Patterns

Mutates Kubernetes resources at admission time using Kyverno `patchStrategicMerge`, `patchesJson6902`, and `set` operations. When loaded, this skill makes the model design mutation rules that automatically inject labels, sidecar containers, default node affinity, and resource configurations into workloads without requiring changes to application manifests.

## TL;DR Checklist

- [ ] Use `patchStrategicMerge` for label and annotation injection
- [ ] Set `preconditions` to scope mutations to matching namespaces or labels
- [ ] Use `targets` for `mutate-existing` policies on already-deployed resources
- [ ] Validate mutation output with dry-run before applying in production
- [ ] Prefer `set` operations over JSON patches when only adding simple fields
- [ ] Verify mutations appear in PolicyReport as `pass`

---

## When to Use

- Automatically injecting sidecar containers (service mesh proxies, log agents) into workloads
- Adding required labels or annotations to resources created by external tools or users
- Setting default node affinity, resource requests, or tolerations on workloads
- Enforcing consistent metadata (namespaces, image registries, security contexts)
- Mutating existing resources that were deployed before a policy was introduced

## When NOT to Use

- Resources that require application-level configuration changes beyond metadata
- High-stakes mutations in production without extensive staging validation
- Situations where mutation would conflict with Helm templating or Kustomize overlays
- When the same result can be achieved with a simpler admission webhook

---

## Core Workflow

1. **Select the mutation mechanism** — Choose between `patchStrategicMerge` for structural modifications (labels, annotations, container specs), `patchesJson6902` for precise path-based patches, or `set` for simple field assignments. **Checkpoint:** Confirm the chosen mechanism matches the mutation complexity — use `set` for simple field additions, `patchStrategicMerge` for multi-field updates, and `patchesJson6902` only when exact path targeting is required.

2. **Create the mutate rule with match conditions and preconditions** — Define a `ClusterPolicy` with a `mutate` rule under `spec.rules`. Set `match` to target specific resource kinds and labels. Add `preconditions` to restrict mutations by namespace, annotations, or metadata criteria. **Checkpoint:** Verify match conditions are specific enough to avoid unintended mutations, and preconditions provide an additional safety layer for scoped application.

3. **Deploy and verify mutations** — Apply the policy and test with a sample workload. Use `kyverno apply` locally to verify the mutation output before deploying cluster-wide. Check PolicyReport for `pass` results on the mutated resources. **Checkpoint:** Inspect a deployed workload to confirm the mutation was applied correctly and that no unexpected fields were modified.

---

## Implementation Patterns

### Pattern 1: Mutate Rule with patchStrategicMerge for Label Injection

Deploy a `ClusterPolicy` that automatically adds operational labels to all Pods in matching namespaces. This uses `patchStrategicMerge` to add a `security/level` label and an `app-team` annotation to every Pod resource.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: inject-default-labels
  annotations:
    policies.kyverno.io/title: Inject Default Labels
    policies.kyverno.io/category: Operational Standards
    policies.kyverno.io/description: >-
      Automatically injects security and team labels onto all Pods
      in non-system namespaces for cost tracking and compliance.
spec:
  rules:
    - name: add-labels-to-pods
      match:
        any:
          - resources:
              kinds:
                - Pod
      preconditions:
        all:
          - key: "{{ request.namespace }}"
            operator: NotIn
            value:
              - kube-system
              - kyverno
              - istio-system
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              security/level: "standard"
              app-team: "platform"
            annotations:
              kyverno.io/mutated: "true"
              kyverno.io/mutated-by: inject-default-labels
```

**PolicyReport Example for Mutation:**

```yaml
apiVersion: wgpolicyk8s.io/v1alpha2
kind: PolicyReport
metadata:
  name: inject-default-labels-report
  namespace: default
results:
  - policy: inject-default-labels
    rule: add-labels-to-pods
    result: pass
    severity: low
    message: "Labels injected successfully"
    scored: true
    source: kyverno
    timestamp:
      seconds: 1733501530
summary:
  error: 0
  fail: 0
  pass: 1
  skip: 0
  warn: 0
```

### Pattern 2: Mutate-Existing with targets for Deployment Pods

Use `mutateExisting` with `targets` to mutate Pods that already exist in the cluster and match specific criteria. This is critical for applying mutations to resources deployed before the policy was created.

```yaml
# ❌ BAD — No preconditions; mutates ALL Pods cluster-wide including system
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: bad-mutate-all-pods
spec:
  rules:
    - name: mutate-all
      match:
        any:
          - resources:
              kinds:
                - Pod
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              injected: "true"

# ✅ GOOD — Scoped mutation with preconditions and targets for mutateExisting
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: mutate-staging-pods
  annotations:
    policies.kyverno.io/title: Mutate Staging Pods
    policies.kyverno.io/category: Environment Standards
    policies.kyverno.io/description: >-
      Adds monitoring annotations to Pods in staging namespaces
      that were deployed before the monitoring policy existed.
spec:
  rules:
    - name: annotate-staging-pods
      match:
        any:
          - resources:
              kinds:
                - Pod
      preconditions:
        all:
          - key: "{{ request.namespace }}"
            operator: Like
            value: "staging-*"
      mutateExisting:
        onExisting:
          - targets:
              - apiVersion: v1
                kind: Pod
              patchStrategicMerge:
                metadata:
                  annotations:
                    prometheus.io/scrape: "true"
                    prometheus.io/port: "9090"
      mutate:
        patchStrategicMerge:
          metadata:
            annotations:
              prometheus.io/scrape: "true"
              prometheus.io/port: "9090"
```

### Pattern 3: Inject Sidecar with patchesJson6902

Inject a logging sidecar container into all webworkload Pods using `patchesJson6902` for precise JSON path targeting. This pattern is useful when the mutation modifies deeply nested structures that strategic merge cannot handle cleanly.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: inject-logging-sidecar
  annotations:
    policies.kyverno.io/title: Inject Logging Sidecar
    policies.kyverno.io/category: Observability
    policies.kyverno.io/description: >-
      Adds a Fluent Bit logging sidecar container to all Pods
      in webworkload namespaces for centralized log collection.
spec:
  rules:
    - name: add-fluentbit-sidecar
      match:
        any:
          - resources:
              kinds:
                - Pod
      preconditions:
        all:
          - key: "{{ request.namespace }}"
            operator: In
            value:
              - webworkload
              - webworkload-staging
      mutate:
        patchesJson6902: |
          - op: add
            path: /spec/containers/-
            value:
              name: fluentbit
              image: fluent/fluent-bit:2.2
              resources:
                requests:
                  cpu: 50m
                  memory: 64Mi
                limits:
                  cpu: 100m
                  memory: 128Mi
              env:
                - name: FLB_PORT
                  value: "24224"
                - name: FLB_LOG_LEVEL
                  value: info
              volumeMounts:
                - name: varlog
                  mountPath: /var/log
                - name: varlibdockercontainers
                  mountPath: /var/lib/docker/containers
                  readOnly: true
      volumeTemplates:
        - name: varlog
          hostPath:
            path: /var/log
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
```

---

## Constraints

### MUST DO
- Use `patchStrategicMerge` for label, annotation, and top-level field injection — it handles merges intelligently
- Always set `preconditions` to scope mutations to specific namespaces, labels, or annotations to prevent unintended mutations
- Use `targets` within `mutateExisting` to mutate resources already deployed before the policy was created
- Prefer `set` operations for simple field additions — reserve `patchesJson6902` for complex nested modifications
- Add `kyverno.io/mutated` annotations to mutated resources for traceability and debugging
- Validate mutations with `kyverno apply <policy.yaml> <workload.yaml>` before cluster deployment

### MUST NOT DO
- Mutate without preconditions — wildcard mutations affect all matching resources cluster-wide and can break system workloads
- Use mutate rules for non-essential changes in Enforce mode — mutations in Enforce mode can cause unexpected behavior on rejected resources
- Use complex `patchesJson6902` when a simple `set` or `patchStrategicMerge` would suffice — keep mutations as simple as possible
- Mutate security-sensitive fields like `securityContext.privileged` or `securityContext.runAsUser` without explicit security review
- Deploy mutation policies in production without staging validation and PolicyReport monitoring

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kyverno-policy-generation` | Generate resources in addition to mutating existing ones |
| `kyverno-label-enforcement` | Validate required labels after mutation to ensure compliance |

---

## Live References

> Authoritative documentation links for Kyverno mutation patterns.

- [Kyverno Mutation](https://kyverno.io/docs/writing-policies/mutate/)
- [Kyverno CLI](https://kyverno.io/docs/kyverno-cli/)
- [Kyverno Policies](https://kyverno.io/policies/)
- [Kyverno GitHub](https://github.com/kyverno/kyverno)
- [Kyverno Installation](https://kyverno.io/docs/installation/)
- [Policy Report Schema](https://github.com/kubernetes-sigs/wg-policy-prototypes/tree/master/policy-report)
