---
name: kyverno-label-enforcement
description: Enforces required labels on Pods and Namespaces using Kyverno validate rules with pattern matching and CEL expressions for compliance tracking.
license: MIT
compatibility: opencode
archetypes:
  - enforcement
  - diagnostic
anti_triggers:
  - vague label suggestions
  - brainstorming label strategy
  - generic labeling ideas
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: kyverno label enforcement, required labels, namespace labels, pod labels, label validation, kubecost labels, compliance labels
  role: implementation
  scope: implementation
  output-format: manifests
  related-skills: kyverno-mutate-patterns, kyverno-resource-quota-validation
---

# Kyverno Label Enforcement

Enforces required labels on Pods and Namespaces using Kyverno validate rules with pattern matching and CEL expressions. When loaded, this skill makes the model design validation policies that ensure every workload and namespace carries the labels required for cost tracking, compliance, and operational standards — rejecting resources that lack required label keys or invalid value formats.

## TL;DR Checklist

- [ ] Use `pattern` with `"?*"` for non-empty value validation on label keys
- [ ] Specify explicit label keys (e.g., `app.kubernetes.io/name`, `team`)
- [ ] Validate label values with regex patterns using CEL `matches()` function
- [ ] Exclude system namespaces (`kube-system`, `kyverno`) from enforcement
- [ ] Deploy policy and monitor PolicyReport for `fail` violations
- [ ] Pair with `kyverno-mutate-patterns` to auto-inject missing labels

## When to Use

- Enforcing Kubernetes recommended labels per `app.kubernetes.io` standards
- Implementing cost allocation labels (owner, team, department, environment) for FinOps
- Ensuring compliance labels (PCI-DSS, HIPAA, SOC2) are present on all workloads
- Requiring environment labels (`env: production`, `env: staging`) for governance
- Validating multi-label requirements from cost tracking tools like Kubecost

## When NOT to Use

- Labels that are optional metadata not required for operations or cost tracking
- Resources where label requirements vary per team without a common standard
- One-time audits — use label enforcement for continuous, automated policy checking
- Namespaces or projects where label exemptions are formally granted via PolicyException

---

## Core Workflow

1. **Define the required label set** — Identify the exact label keys and value constraints that must be present on target resources. Determine which label values are valid (using regex patterns) and which are mandatory (non-empty checks). **Checkpoint:** Create a documented list of required labels with their expected key format, value constraints, and validation rules.

2. **Create the validate rule with pattern matching** — Build a `ClusterPolicy` with a `validate` rule using `pattern` matching to require specific label keys with non-empty values. For advanced validation, use CEL expressions with the `matches()` function to enforce value format constraints. **Checkpoint:** Verify the pattern uses `"?*"` for non-empty string validation, CEL `matches()` for regex-based value checks, and that the resource kind selector targets the right workload types.

3. **Deploy and monitor violations** — Apply the policy and verify resources without required labels are rejected. Check `PolicyReport` for `fail` results and track violations over time. Consider pairing with a mutation policy to auto-inject missing labels. **Checkpoint:** Confirm PolicyReport shows `pass` for compliant resources and `fail` with descriptive messages for non-compliant ones.

---

## Implementation Patterns

### Pattern 1: Required Labels with Pattern Matching on Pods

Deploy a `ClusterPolicy` that enforces three required labels on all Pods: `app.kubernetes.io/name`, `app.kubernetes.io/instance`, and `app.kubernetes.io/version`. Uses `pattern` matching with `"?*"` to require non-empty string values.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-app-labels
  annotations:
    policies.kyverno.io/title: Require App Labels on Pods
    policies.kyverno.io/category: Operational Standards
    policies.kyverno.io/description: >-
      Enforces the use of app.kubernetes.io labels on all Pods
      to support service discovery and compliance tracking.
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-app-kubernetes-labels
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
      validate:
        message: "Labels app.kubernetes.io/name, app.kubernetes.io/instance, and app.kubernetes.io/version are required."
        pattern:
          metadata:
            labels:
              app.kubernetes.io/name: "?*"
              app.kubernetes.io/instance: "?*"
              app.kubernetes.io/version: "?*"
```

**PolicyReport Example for Label Validation:**

```yaml
apiVersion: wgpolicyk8s.io/v1alpha2
kind: PolicyReport
metadata:
  name: require-app-labels-report
  namespace: default
results:
  - policy: require-app-labels
    rule: require-app-kubernetes-labels
    result: pass
    severity: medium
    message: "Resource passed policy check"
    scored: true
    source: kyverno
    timestamp:
      seconds: 1733501530
  - policy: require-app-labels
    rule: require-app-kubernetes-labels
    result: fail
    severity: medium
    message: "Labels app.kubernetes.io/name, app.kubernetes.io/instance, and app.kubernetes.io/version are required."
    scored: true
    source: kyverno
    resources:
      - name: my-pod
        kind: Pod
summary:
  error: 0
  fail: 1
  pass: 1
  skip: 0
  warn: 0
```

### Pattern 2: Kubecost Multi-Label Policy with CEL Validation

Implement a comprehensive multi-label policy inspired by Kubecost's cost tracking requirements. This policy enforces five required labels (`owner`, `team`, `department`, `app`, `env`) with CEL-based regex validation on label values to ensure they follow naming conventions.

```yaml
# ❌ BAD — No value format validation; accepts any non-empty value
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: bad-label-enforcement
spec:
  rules:
    - name: require-cost-labels
      validate:
        message: "Required labels missing"
        pattern:
          metadata:
            labels:
              owner: "?*"
              team: "?*"

# ✅ GOOD — Multi-label with CEL regex validation on values
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-cost-allocation-labels
  annotations:
    policies.kyverno.io/title: Require Cost Allocation Labels
    policies.kyverno.io/category: FinOps
    policies.kyverno.io/description: >-
      Enforces Kubecost-compatible cost allocation labels on all Pods
      with regex validation for naming conventions.
spec:
  validationFailureAction: Enforce
  background: false
  rules:
    - name: enforce-cost-labels
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
      validate:
        message: >-
          Required cost allocation labels (owner, team, department, app, env)
          must be present and follow the format: lowercase alphanumeric with hyphens.
        pattern:
          metadata:
            labels:
              owner: "?*"
              team: "?*"
              department: "?*"
              app: "?*"
              env: "?*"
        any:
          - rule: enforce-owner-format
            match:
              any:
                - resources:
                    kinds:
                      - Pod
            validate:
              message: "Label 'owner' must match format: lowercase alphanumeric with hyphens (e.g., 'john-doe', 'team-alpha')."
              deny:
                conditions:
                  any:
                    - key: "{{ request.object.metadata.labels.owner }}"
                      operator: NotMatches
                      value: "[a-z0-9][a-z0-9-]{0,62}"
          - rule: enforce-env-format
            match:
              any:
                - resources:
                    kinds:
                      - Pod
            validate:
              message: "Label 'env' must be one of: production, staging, development, testing."
              deny:
                conditions:
                  any:
                    - key: "{{ request.object.metadata.labels.env }}"
                      operator: NotIn
                      value:
                        - production
                        - staging
                        - development
                        - testing
```

### Pattern 3: Namespace-Level Label Enforcement

Enforce required labels on Namespaces to support resource governance and cost tracking at the namespace level. This pattern uses the `Namespace` kind in the match conditions and validates a separate set of governance labels.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-namespace-labels
  annotations:
    policies.kyverno.io/title: Require Namespace Labels
    policies.kyverno.io/category: Resource Governance
    policies.kyverno.io/description: >-
      Enforces governance labels on all Namespaces including owner, team,
      and compliance tags for resource attribution and audit trails.
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-governance-labels
      match:
        any:
          - resources:
              kinds:
                - Namespace
      preconditions:
        all:
          - key: "{{ request.namespace }}"
            operator: NotIn
            value:
              - kube-system
              - kube-public
              - kube-node-lease
      validate:
        message: "Namespaces require governance labels: owner, team, and compliance-tier."
        pattern:
          metadata:
            labels:
              owner: "?*"
              team: "?*"
              compliance-tier: "?*"
```

---

## Constraints

### MUST DO
- Use `"?*"` pattern value to validate non-empty label values — this rejects empty strings, null, and missing keys
- Specify explicit label keys (e.g., `app.kubernetes.io/name`) rather than generic patterns
- Validate label values with CEL `matches()` regex for format enforcement (e.g., `"[a-z0-9][a-z0-9-]{0,62}"`)
- Exclude system namespaces (`kube-system`, `kube-public`, `kyverno`, `istio-system`) from enforcement to prevent cluster disruption
- Pair with a mutation policy (`kyverno-mutate-patterns`) to auto-inject missing labels on create events
- Use `validationFailureAction: Enforce` for blocking non-compliant resources, `Audit` for reporting-only mode during rollout

### MUST NOT DO
- Require labels on `kube-system` or other core Kubernetes namespaces — this will break cluster operations
- Enforce without specifying resource kinds — always list explicit `resources.kinds` in the match block
- Omit validation for label value format — accepting any non-empty value allows inconsistent labels that break cost tracking
- Use overly broad regex patterns that reject legitimate label values
- Deploy label enforcement in Enforce mode without a mutation policy fallback — this creates a deployment blocker

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kyverno-mutate-patterns` | Auto-inject missing labels to complement enforcement |
| `kyverno-resource-quota-validation` | Validate resource quotas alongside label requirements |

---

## Live References

> Authoritative documentation links for Kyverno label enforcement.

- [Kyverno Validation Rules](https://kyverno.io/docs/writing-policies/validate/)
- [Kyverno CEL Support](https://kyverno.io/policies/kyverno/require-labels/require-labels/)
- [Kyverno CLI](https://kyverno.io/docs/kyverno-cli/)
- [Kyverno Policies](https://kyverno.io/policies/)
- [Kyverno GitHub](https://github.com/kyverno/kyverno)
- [Kyverno Installation](https://kyverno.io/docs/installation/)
- [Policy Report Schema](https://github.com/kubernetes-sigs/wg-policy-prototypes/tree/master/policy-report)
