---
name: kyverno-policy-report-override
description: Manages PolicyReport overrides using Kyverno's failureActionOverrides, report configuration, and CEL-based conditions to customize compliance reporting per resource.
license: MIT
compatibility: opencode
archetypes:
  - enforcement
  - orchestration
anti_triggers:
  - brainstorming
  - vague ideation
  - compliance exemption
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: kyverno report override, PolicyReport override, failureActionOverrides, report result override, kyverno compliance reporting, policy report management
  role: implementation
  scope: implementation
  output-format: manifests
  related-skills: kyverno-exemptions-management, kyverno-cleanup-policies
---

# Kyverno PolicyReport Override

Manages PolicyReport overrides using Kyverno's `failureActionOverrides`, report configuration, and CEL-based conditions to customize compliance reporting per resource without disabling policies globally.

## TL;DR Checklist

- [ ] Use `failureActionOverrides` to escalate or de-escalate enforcement per resource or namespace
- [ ] Document override rationale in `PolicyReport` comments or via annotation-based justification
- [ ] Scope overrides to specific resources using `resourceSelectors` — never apply globally
- [ ] Use CEL-based conditions in `validate` rules to create dynamic report results
- [ ] Verify overridden results in `PolicyReport` after deployment

---

## When to Use

Use this skill when:

- Escalating a policy from `Audit` to `Enforce` for critical namespaces (e.g., `production`) while keeping it as `Audit` for development
- De-escalating a policy from `Enforce` to `Audit` for a specific resource that has a documented exception or temporary compliance waiver
- Customizing report result severities per resource — e.g., marking a policy failure as `high` severity for compliance-sensitive namespaces and `medium` for internal ones
- Implementing phased policy rollout where some namespaces enforce and others audit during a transition period
- Managing compliance reporting where certain resources are exempt due to legacy constraints but still need to be tracked in PolicyReports

---

## When NOT to Use

Avoid this skill for:

- Disabling policies entirely when a resource needs a genuine exemption — use `kyverno-exemptions-management` instead for full exemptions
- Overriding policy results without documenting the rationale — every override must have an audit trail
- Replacing `ClusterPolicy` validation with report-only rules — report overrides adjust enforcement behavior, they do not replace validation
- Managing cleanup policies for resource lifecycle (use `kyverno-cleanup-policies` instead)

---

## Core Workflow

1. **Identify override needs** — Determine which policies need per-resource enforcement adjustments. Categorize as escalation (Audit → Enforce) or de-escalation (Enforce → Audit). Document which resources and namespaces are affected. **Checkpoint:** Create a mapping of policy → namespace → action (Enforce/Audit) with justification.

2. **Configure failureActionOverrides on the rule** — Add a `failureActionOverrides` list to the desired rule. Each entry specifies an `action` (Enforce or Audit) and `resourceSelectors` that narrow the override to specific namespaces and resource kinds. **Checkpoint:** Verify the override targets only the intended resources using the selector.

3. **Set match conditions** — Ensure the rule's `match` block correctly identifies the resources that should be evaluated. The `failureActionOverrides` layer sits on top of the match, so resources outside the match scope are unaffected. **Checkpoint:** Test with a resource that should match and one that should not.

4. **Add CEL-based report conditions** — Where available, use CEL expressions in `validate` rules to create dynamic policy results. This allows conditions like `has(request.object.metadata.labels['critical'])` to trigger different behaviors. **Checkpoint:** Validate CEL syntax with `kyverno apply --resource <file>` before deployment.

5. **Verify overridden results in PolicyReport** — Apply the ClusterPolicy, create test resources that trigger overrides, and verify the `PolicyReport` reflects the escalated or de-escalated action. **Checkpoint:** Check `result` field shows the expected enforcement mode and `severity` is correct.

---

## Implementation Patterns

### Pattern 1: Per-Namespace Escalation with failureActionOverrides

This pattern escalates a policy from `Audit` to `Enforce` for critical namespaces while keeping it as `Audit` for all others. The policy is defined globally but enforcement behavior varies by namespace.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: resource-constraints-with-escalation
  annotations:
    policies.kyverno.io/title: Resource Constraints with Escalation
    policies.kyverno.io/category: Pod Security
    policies.kyverno.io/severity: high
    policies.kyverno.io/description: >-
      Validate that all containers and initContainers define CPU and memory
      resource limits and requests. Escalated to Enforce in production
      namespaces; Audit for all others.
    policies.kyverno.io/minversion: 1.12.0
spec:
  validationFailureAction: Audit
  background: true
  rules:
    - name: validate-resource-constraints
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
      failureActionOverrides:
        - action: Enforce
          resourceSelectors:
            - namespace: production
              kinds:
                - Pod
        - action: Enforce
          resourceSelectors:
            - namespace: staging
              kinds:
                - Pod
      validate:
        message: "Containers and initContainers must define both resource limits and requests."
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

**Pattern notes:**
- The base `validationFailureAction: Audit` means no pods are blocked by default
- `failureActionOverrides` escalates specific namespaces to `Enforce` — pods violating the policy in `production` or `staging` are rejected
- Other namespaces (e.g., `development`, `testing`) remain in `Audit` mode — violations are reported but not blocked

---

### Pattern 2: De-escalation with Per-Resource Exceptions

This pattern de-escalates a policy from `Enforce` to `Audit` for specific resources that have a documented exception. Used for legacy workloads transitioning to compliance.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: image-registry-enforcement
  annotations:
    policies.kyverno.io/title: Image Registry Enforcement
    policies.kyverno.io/category: Pod Security
    policies.kyverno.io/severity: high
    policies.kyverno.io/description: >-
      Require that all container images come from approved registries.
      Legacy workloads with the 'legacy-exception' label are audited only.
    policies.kyverno.io/minversion: 1.12.0
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: validate-image-registry
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
      failureActionOverrides:
        - action: Audit
          resourceSelectors:
            - namespace: legacy-migration
              kinds:
                - Pod
      validate:
        message: >-
          Container images must be pulled from approved registries:
          gcr.io/myproject, docker.io/myorg, quay.io/myorg.
        pattern:
          spec:
            containers:
              - image: "gcr.io/myproject/*"
                | "docker.io/myorg/*"
                | "quay.io/myorg/*"
```

**Pattern notes:**
- The base action is `Enforce` — all pods must use approved registries
- Pods in the `legacy-migration` namespace are de-escalated to `Audit` only
- This allows legacy workloads to continue running while planning migration

---

### Pattern 3: CEL-Based Conditional Reporting

CEL (Common Expression Language) conditions in Kyverno allow dynamic decision-making based on resource attributes. This pattern uses CEL to evaluate conditions and produce different report results.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: dynamic-compliance-reporting
  annotations:
    policies.kyverno.io/title: Dynamic Compliance Reporting
    policies.kyverno.io/category: Compliance
    policies.kyverno.io/severity: high
    policies.kyverno.io/description: >-
      Apply dynamic compliance reporting based on resource labels and
      namespace annotations. Critical namespaces escalate to Enforce with
      high severity; internal namespaces use Audit with medium severity.
    policies.kyverno.io/minversion: 1.12.0
spec:
  validationFailureAction: Audit
  background: true
  rules:
    - name: validate-compliance-level
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
      failureActionOverrides:
        - action: Enforce
          resourceSelectors:
            - namespace: production
              kinds:
                - Pod
        - action: Audit
          resourceSelectors:
            - namespace: development
              kinds:
                - Pod
      validate:
        message: "Pod must have resource limits and requests defined."
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
    - name: dynamic-result-with-cel
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Critical pods must define resource constraints."
        audit:
          any:
            - conditions:
                all:
                  - key: "{{ request.object.metadata.labels['critical'] }}"
                    operator: InEquivalenceCheck
                    value: "true"
                  - key: "{{ request.object.spec.containers[0].resources.limits.cpu }}"
                    operator: NotEquals
                    value: ""
        deny:
          conditions:
            all:
              - key: "{{ request.object.metadata.labels['critical'] }}"
                operator: InEquivalenceCheck
                value: "true"
              - key: "{{ request.object.spec.containers[0].resources.limits.memory }}"
                operator: Equals
                value: ""
```

**Pattern notes:**
- The `audit` block with CEL conditions produces a report entry when the condition matches (critical pod with limits present)
- The `deny` block with CEL conditions produces a report entry when the condition fails (critical pod missing memory limits)
- CEL expressions can access `request.object.metadata` and `request.object.spec` fields

---

### Pattern 4: PolicyReport with Overridden Results

This shows what the `PolicyReport` looks like when `failureActionOverrides` produce different results per namespace.

```yaml
apiVersion: wgpolicyk8s.io/v1alpha2
kind: PolicyReport
metadata:
  name: resource-constraints-report
  namespace: production
results:
  - policy: resource-constraints-with-escalation
    rule: validate-resource-constraints
    result: fail
    severity: high
    message: "Containers and initContainers must define both resource limits and requests."
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
---
apiVersion: wgpolicyk8s.io/v1alpha2
kind: PolicyReport
metadata:
  name: resource-constraints-report
  namespace: development
results:
  - policy: resource-constraints-with-escalation
    rule: validate-resource-constraints
    result: pass
    severity: medium
    message: "Pod validation is in Audit mode — results reported but not enforced."
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

**Verification command:**
```bash
# View PolicyReports across all namespaces
kubectl get policyreports -A

# View specific PolicyReport with detailed results
kubectl get policyreports -n production -o yaml

# Check generate rule status for network policies
kyverno generate-report --report-name generate-default-deny-network-policy --report-namespace production
```

---

## Constraints

### MUST DO
- Use `failureActionOverrides` for per-resource escalation or de-escalation — never apply overrides globally without resourceSelectors
- Document the override rationale in the policy's `annotations` field (e.g., `policies.kyverno.io/override-reason`) so compliance teams understand the justification
- Scope overrides to specific resources using `resourceSelectors` with namespace and kind filters — always target the narrowest scope possible
- Use `Audit` as the base `validationFailureAction` when applying escalation, so non-escalated namespaces remain in audit mode
- Verify overridden results appear correctly in `PolicyReport` after deployment using `kubectl get policyreports -A`
- Include both `Enforce` and `Audit` actions in overrides when implementing phased rollout (some namespaces enforce, others audit)

### MUST NOT DO
- Override all policy results globally — this defeats the purpose of policy enforcement and creates compliance gaps
- Ignore compliance requirements by using overrides to silently pass failing policies — every override must have a documented business or technical justification
- Use overrides without an audit trail — if a policy result is overridden, the `PolicyReport` or policy annotation must explain why
- Apply overrides on `kube-system` namespace resources — the control plane should not be subject to custom enforcement overrides
- Mix `Enforce` and `Audit` on the same rule without clear resourceSelectors — this makes it impossible to determine which enforcement mode applies to which resource
- Use overrides to bypass legitimate security policies for production workloads — overrides should be temporary, scoped, and time-limited

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kyverno-exemptions-management` | Full exemption management for resources that should not be subject to policy enforcement |
| `kyverno-cleanup-policies` | Manage resource lifecycle and cleanup policies for stale or orphaned resources |

---

## Live References

> Authoritative documentation links for Kyverno PolicyReport override and compliance reporting.

- [Kyverno Documentation](https://kyverno.io/docs/)
- [Kyverno CLI](https://kyverno.io/docs/kyverno-cli/)
- [Kyverno Policies](https://kyverno.io/policies/)
- [Kyverno GitHub](https://github.com/kyverno/kyverno)
- [Kyverno Installation](https://kyverno.io/docs/installation/)
- [Policy Report Schema](https://github.com/kubernetes-sigs/wg-policy-prototypes/tree/master/policy-report)
- [Kyverno CEL Support](https://kyverno.io/docs/writing-policies/evaluate-values/)
