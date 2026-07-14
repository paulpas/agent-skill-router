---
name: kyverno-exemptions-management
description: Manages Kyverno policy exemptions using PolicyException v2, rule-level exclude settings, and serviceAccount exemptions for controlled policy bypass.
license: MIT
compatibility: opencode
archetypes:
  - orchestration
  - tactical
anti_triggers:
  - vague bypass strategy
  - brainstorming exemptions
  - generic policy exceptions
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: kyverno exemptions, PolicyException, policy exemption, serviceAccount exemption, role exemption, PSS exception, kyverno policy bypass
  role: implementation
  scope: implementation
  output-format: manifests
  related-skills: kyverno-pod-security-baseline, kyverno-pod-security-restricted, kyverno-policy-report-override
---

# Kyverno Exemptions Management

Manages exemptions from Kyverno policies using `PolicyException` (v2) and rule-level `exclude` settings. When loaded, this skill makes the model configure controlled policy bypasses for service accounts, cluster roles, specific namespaces, and pod security standards exemptions — ensuring exemptions are auditable, scoped, and documented in the PolicyReport.

## TL;DR Checklist

- [ ] Use `PolicyException` v2 (`kyverno.io/v2`) for PSS and advanced exemptions
- [ ] Specify `controlName` for pod security standards exemptions to narrow scope
- [ ] Use namespace selectors for broad exemptions across multiple resources
- [ ] Configure rule-level `exclude` for service account and cluster role bypasses
- [ ] Document exemptions with annotations for auditability
- [ ] Verify exemptions appear as `skip` results in PolicyReport

## When to Use

- Temporarily exempting a service account or deployment from a policy during migration
- Allowing specific namespaces (e.g., legacy namespaces, third-party integrations) to bypass a policy
- Exempting pod security standards for specific workloads that require privileged containers
- Bypassing a policy rule for specific users or cluster roles without disabling the entire policy
- Testing new policies in audit mode before enforcing broadly

## When NOT to Use

- Bypassing security policies for convenience — exemptions should be rare and documented
- Using wildcard exemptions in production that could expose the cluster to policy violations
- Exempting system-level policies that are critical to cluster security
- Creating exemptions that undermine the purpose of the policy they bypass

---

## Core Workflow

1. **Identify the exemption need and scope** — Determine which policy, rule, or group of resources needs exemption. Classify the exemption type: namespace-level, service account-level, user-level, or pod security standard control-level. **Checkpoint:** Document the reason for the exemption, the expected duration, and the specific policy/rule to bypass.

2. **Configure PolicyException v2 or rule-level exclude** — Create a `PolicyException` resource using `apiVersion: kyverno.io/v2` with the target policy name, rule names, and match conditions. For rule-level exemptions, use `exclude` settings within the policy rule to target specific service accounts, cluster roles, or users. **Checkpoint:** Verify the exemption match conditions are narrow enough to cover only the intended resources and that `controlName` is specified for PSS exemptions.

3. **Deploy and verify skip results** — Apply the exemption and verify that the exempted resources show `skip` results in the PolicyReport. Confirm that non-exempted resources are still evaluated and enforced by the policy. **Checkpoint:** Check PolicyReport shows `skip` for exempted resources and `pass`/`fail` for non-exempted resources.

---

## Implementation Patterns

### Pattern 1: PolicyException v2 for Pod Security Standards

Use `PolicyException` v2 (`kyverno.io/v2`) to exempt specific service accounts and images from pod security standards (PSS) enforcement. This pattern specifies `controlName` to narrow the exemption to only the privileged container control rather than all PSS checks.

```yaml
apiVersion: kyverno.io/v2
kind: PolicyException
metadata:
  name: monitoring-stack-ps-exception
  namespace: monitoring
  annotations:
    policies.kyverno.io/title: Monitoring Stack PSS Exception
    policies.kyverno.io/category: Pod Security Standards
    policies.kyverno.io/description: >-
      Exempts the monitoring-stack service account and specific container
      images from restricted PSS enforcement to allow host network access.
spec:
  exceptions:
    - policyName: restricted
      ruleNames:
        - drop capabilities
        - forbidden sysctls
        - host network
        - host PID
        - host IPC
        - allow privilege escalation
        - run as non-root
        - required labels
    - controlName: restricted
      images:
        - "docker.io/prometheus/node-exporter:*"
        - "docker.io/nginx/nginx:*"
      restrictedField: securityContext
      values:
        hostNetwork: true
        hostPID: true
  match:
    any:
      - resources:
          kinds:
            - Pod
          namespaces:
            - monitoring
          selectors:
            - type: ServiceAccount
              name: monitoring-stack
```

### Pattern 2: Rule-Level Exclude for Service Account Exemption

Configure `exclude` settings within a policy rule to exempt specific service accounts from policy enforcement. This approach is suitable for exemptions that apply to a single rule rather than an entire policy.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-requests
  annotations:
    policies.kyverno.io/title: Require Resource Requests
    policies.kyverno.io/category: Resource Management
    policies.kyverno.io/description: >-
      Enforces resource requests on all Pods except those running
      as the batch-processor service account.
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-resource-requests
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              kinds:
                - Pod
              serviceAccounts:
                - name: batch-processor
                  namespaces:
                    - batch-jobs
                    - cron-jobs
      validate:
        message: "All Pods must specify resource requests for cpu and memory."
        pattern:
          spec:
            containers:
              - resources:
                  requests:
                    cpu: "?*"
                    memory: "?*"
```

**PolicyReport Example with Skip Results:**

```yaml
apiVersion: wgpolicyk8s.io/v1alpha2
kind: PolicyReport
metadata:
  name: require-resource-requests-report
  namespace: batch-jobs
results:
  - policy: require-resource-requests
    rule: require-resource-requests
    result: skip
    severity: medium
    message: "Resource exempted by PolicyException"
    scored: true
    source: kyverno
    timestamp:
      seconds: 1733501530
    resources:
      - name: batch-pod-12345
        kind: Pod
        namespace: batch-jobs
  - policy: require-resource-requests
    rule: require-resource-requests
    result: pass
    severity: medium
    message: "Resource passed policy check"
    scored: true
    source: kyverno
    timestamp:
      seconds: 1733501530
    resources:
      - name: app-pod-67890
        kind: Pod
        namespace: batch-jobs
summary:
  error: 0
  fail: 0
  pass: 1
  skip: 1
  warn: 0
```

### Pattern 3: User and ClusterRole-Level Exclusions

Exempt specific users or cluster roles from policy enforcement using rule-level `exclude` settings. This is useful for exempting administrators, automation tools, or specific service accounts from compliance checks during development or maintenance windows.

```yaml
# ❌ BAD — Overly broad exclude: exempts all users without justification
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: bad-broad-exemption
spec:
  rules:
    - name: require-labels
      exclude:
        any:
          - subjects:
              - kind: User
                name: "*"
# ❌ Wildcard user exclude is dangerous in production

# ✅ GOOD — Specific user and cluster role exclusions with documentation
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-cost-labels
  annotations:
    policies.kyverno.io/title: Require Cost Allocation Labels
    policies.kyverno.io/category: FinOps
spec:
  validationFailureAction: Enforce
  rules:
    - name: enforce-cost-labels
      match:
        any:
          - resources:
              kinds:
                - Pod
                - Namespace
      exclude:
        any:
          - resources:
              kinds:
                - Pod
              serviceAccounts:
                - name: kyverno-admission-controller
                  namespaces:
                    - kyverno
          - subjects:
              - kind: ServiceAccount
                name: ci-bot
                namespaces:
                  - ci-cd
              - kind: ClusterRole
                name: kyverno-policy-controller
      validate:
        message: "Cost allocation labels (owner, team, department) are required."
        pattern:
          metadata:
            labels:
              owner: "?*"
              team: "?*"
              department: "?*"
```

### Pattern 4: Pod Security Specific Exemptions Within Rule

Configure exemptions within the `podSecurity` rule of a PSS policy to exempt specific resources from individual PSS controls (like `runAsNonRoot` or `privileged containers`) rather than bypassing the entire policy.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: pod-security-standards
  annotations:
    policies.kyverno.io/title: Pod Security Standards
    policies.kyverno.io/category: Pod Security
spec:
  validationFailureAction: Enforce
  rules:
    - name: baseline
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - kube-system
              selectors:
                - type: ServiceAccount
                  name: kube-system:*
      validate:
        podSecurity:
          level: baseline
          version: v1.30
    - name: restricted
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - kube-system
              selectors:
                - type: ServiceAccount
                  name: kube-system:*
      validate:
        podSecurity:
          level: restricted
          version: v1.30
```

---

## Constraints

### MUST DO
- Use `PolicyException` v2 (`apiVersion: kyverno.io/v2`) for pod security standards exemptions — v1 PolicyException lacks `controlName` support
- Always specify `controlName` when exempting PSS policies to narrow the scope to specific controls (e.g., `restricted`, `baseline`, or `privileged`) rather than bypassing the entire policy
- Use namespace selectors in `PolicyException` match conditions for broad exemptions across multiple resources within a namespace
- Configure rule-level `exclude` with specific `serviceAccounts`, `subjects`, or `clusterRoles` — never use wildcard (`"*"`) exemptions in production
- Document all exemptions with descriptive annotations including the reason, approver, and expected expiration date
- Verify exemptions produce `skip` results in PolicyReport to confirm they are active and scoped correctly

### MUST NOT DO
- Exclude all users without justification — wildcard subject exemptions undermine policy enforcement entirely
- Use wildcard exclude in production environments — always scope exemptions to specific service accounts, namespaces, or resources
- Omit `controlName` in PSS exemptions — this bypasses all pod security checks instead of the intended specific control
- Create exemptions that permanently bypass critical security policies — exemptions should be temporary and documented
- Apply exemptions to system namespaces (`kube-system`, `kube-public`) — these are already excluded by Kyverno by default

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kyverno-pod-security-baseline` | Understand baseline PSS requirements before creating exemptions |
| `kyverno-pod-security-restricted` | Understand restricted PSS requirements to scope exemptions precisely |
| `kyverno-policy-report-override` | Configure PolicyReport overrides to manage exempt resource reporting |

---

## Live References

> Authoritative documentation links for Kyverno exemption management.

- [Kyverno PolicyException](https://kyverno.io/docs/policyexception/)
- [Kyverno Policy Exceptions v2](https://kyverno.io/docs/policyexception/v2/)
- [Kyverno CLI](https://kyverno.io/docs/kyverno-cli/)
- [Kyverno Policies](https://kyverno.io/policies/)
- [Kyverno GitHub](https://github.com/kyverno/kyverno)
- [Kyverno Installation](https://kyverno.io/docs/installation/)
- [Policy Report Schema](https://github.com/kubernetes-sigs/wg-policy-prototypes/tree/master/policy-report)
