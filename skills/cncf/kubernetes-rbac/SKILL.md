---
name: kubernetes-rbac
description: Implements rbac.authorization.k8s.io/v1 Role, ClusterRole, RoleBinding, and ClusterRoleBinding manifests with least privilege access control for Kubernetes resources.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: least privilege, role binding, clusterrole, service account, rbac.authorization.k8s.io, namespace permissions, access control
  archetypes:
    - tactical
    - enforcement
  anti_triggers:
    - http routing
    - tls termination
    - persistent volume
    - pod isolation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: cncf/kubernetes-deployment, cncf/kyverno-pod-security-baseline, cncf/open-policy-agent-opa
---

# Kubernetes RBAC Manager

Implements rbac.authorization.k8s.io/v1 Role, ClusterRole, RoleBinding, and ClusterRoleBinding manifests to enforce least-privilege access control for Kubernetes API resources. When loaded, the model generates production-grade RBAC policies with scoped permissions, service account binding, and audit-ready role definitions.

## TL;DR Checklist

- [ ] Use `rbac.authorization.k8s.io/v1` API version — never `rbac.authorization.k8s.io/v1beta1`
- [ ] Follow the principle of least privilege — grant only the permissions each service account actually needs
- [ ] Prefer namespace-scoped Role + RoleBinding over cluster-wide ClusterRole + ClusterRoleBinding
- [ ] Always bind roles to specific service accounts — never bind to `system:anonymous` or wildcard users
- [ ] Avoid `verbs: ["*"]` and `resources: ["*"]` — specify exact verbs and resources required
- [ ] Document the justification for each resource/verb pair in the role comments

---

## When to Use

Use this skill when:

- Setting up RBAC policies for CI/CD pipeline service accounts (e.g., Argo CD, Tekton)
- Configuring read-only access for monitoring tools (Prometheus, Grafana)
- Implementing namespace isolation so teams can only manage their own namespaces
- Restricting access to sensitive resources (Secrets, ConfigMaps, Nodes, RBAC resources)
- Creating custom roles for specific application workloads with minimal permissions

---

## When NOT to Use

Avoid this skill for:

- User authentication — that is handled by OIDC, SAML, or LDAP identity providers, not RBAC roles
- Kubernetes API audit logging — that is configured via the apiserver audit policy, not RBAC
- Admission-time policy enforcement — use `cncf/kyverno-pod-security-baseline` or `cncf/open-policy-agent-opa` instead
- Pod security enforcement — use `cncf/kyverno-pod-security-baseline` to restrict pod capabilities

---

## Core Workflow

1. **Identify the Service Account** — Determine which service account needs access and what resources it must interact with. **Checkpoint:** Each workload should have its own dedicated service account — never use the `default` service account.

2. **Define Namespace-Scoped Role** — Create a `Role` with specific resources, verbs, and subresources. **Checkpoint:** List every resource and verb explicitly — never use wildcards (`*`).

3. **Create RoleBinding** — Bind the Role to the service account within the namespace. **Checkpoint:** Ensure the `roleRef.apiGroup` is `rbac.authorization.k8s.io`, `roleRef.kind` matches the Role kind, and `roleRef.name` matches the Role name.

4. **Escalate to ClusterRole if Needed** — For resources that exist cluster-wide (Nodes, PersistentVolumes, StorageClasses), create a `ClusterRole` and `ClusterRoleBinding`. **Checkpoint:** ClusterRoles should be used sparingly and only when cross-namespace access is genuinely required.

5. **Apply and Verify** — Apply the RBAC manifests and verify access using `kubectl auth can-i`. **Checkpoint:** Test both allowed and denied operations to confirm the policy is precise.

6. **Audit Access Periodically** — Review RBAC policies quarterly and remove unused permissions. **Checkpoint:** Run `kubectl auth can-i --list --as=system:serviceaccount:<ns>:<sa>` to audit existing permissions.

---

## Implementation Patterns

### Pattern 1: Namespace-Scoped Role and Binding for an Application

A production-grade RBAC setup for a deployment automation service account.

```yaml
# Role: Deployment automation can manage Deployments, Services, ConfigMaps, and Secrets
# within the production namespace only.
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-manager
  namespace: production
rules:
  # Manage deployments and their associated pods
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Manage pods (read-only — deployments manage pod creation)
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
  # Manage services for load balancing
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Read configuration
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch"]
  # Manage application secrets (create/update only — never list/delete)
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "create", "update", "patch"]
---
# Bind the Role to the deployment-manager service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deployment-manager-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: deployment-manager
    namespace: production
roleRef:
  kind: Role
  name: deployment-manager
  apiGroup: rbac.authorization.k8s.io
---
# The service account that the deployment manager uses
apiVersion: v1
kind: ServiceAccount
metadata:
  name: deployment-manager
  namespace: production
```

### Pattern 2: ClusterRole and Least Privilege (BAD vs GOOD)

Overly permissive RBAC is the most common security misconfiguration in Kubernetes clusters.

```yaml
# ❌ BAD: Wildcard permissions — this grants full cluster-admin equivalent access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: overprivileged-role
rules:
  - apiGroups: ["*"]       # ← All API groups
    resources: ["*"]       # ← All resources
    verbs: ["*"]           # ← All verbs (including delete, impersonate, escalate)

# ❌ BAD: Binding to the default service account — every pod in the namespace
# inherits these permissions, massively expanding the attack surface
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: default-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: default          # ← Wildcard: grants to ALL pods
    namespace: production
roleRef:
  kind: Role
  name: deployment-manager
  apiGroup: rbac.authorization.k8s.io

# ❌ BAD: Granting access to sensitive resources without justification
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: dangerous-role
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]  # ← Full CRUD on all secrets cluster-wide
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["roles", "rolebindings"]
    verbs: ["*"]  # ← Can modify RBAC itself — privilege escalation risk

# ✅ GOOD: Least privilege — deployment manager gets exactly what it needs
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ci-pipeline-runner
rules:
  # Read-only access to all namespaces for discovery
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch"]
  # Create/patch pods in any namespace (for job runner pods)
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch", "create", "delete"]
  # Read service accounts to generate token references
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["get", "list"]

# ✅ GOOD: Bind to a specific service account, not the default
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ci-pipeline-runner-binding
subjects:
  - kind: ServiceAccount
    name: ci-pipeline
    namespace: ci-tools
roleRef:
  kind: ClusterRole
  name: ci-pipeline-runner
  apiGroup: rbac.authorization.k8s.io
```

### Pattern 3: RBAC Access Verification and Audit

```python
def generate_rbac_commands(role_name: str, namespace: str, sa_name: str = "") -> list[str]:
    """Generate kubectl commands to verify and audit an RBAC policy.

    Useful for confirming that a RoleBinding grants the expected permissions
    and for auditing existing access.

    Args:
        role_name: The Role or ClusterRole name to audit.
        namespace: The namespace context.
        sa_name: Optional service account name to check specifically.

    Returns:
        List of kubectl commands for verification and audit.
    """
    commands = [
        f"kubectl describe role {role_name} -n {namespace}",
        f"kubectl describe rolebinding {role_name}-binding -n {namespace}",
        f"kubectl auth can-i create deployments --as=system:serviceaccount:{namespace}:{sa_name or 'default'} -n {namespace}",
        f"kubectl auth can-i delete deployments --as=system:serviceaccount:{namespace}:{sa_name or 'default'} -n {namespace}",
    ]
    return commands


def verify_role_binding(binding: dict) -> list[str]:
    """Verify a RoleBinding or ClusterRoleBinding has correct structure.

    Checks that roleRef fields are consistent and subjects are properly defined.

    Args:
        binding: A parsed RoleBinding or ClusterRoleBinding manifest dict.

    Returns:
        List of validation error messages. Empty means binding is valid.
    """
    errors: list[str] = []
    metadata = binding.get("metadata", {})
    spec = binding.get("spec", {})

    api_group = spec.get("roleRef", {}).get("apiGroup", "")
    role_kind = spec.get("roleRef", {}).get("kind", "")
    role_name = spec.get("roleRef", {}).get("name", "")

    if api_group != "rbac.authorization.k8s.io":
        errors.append(f"roleRef.apiGroup must be 'rbac.authorization.k8s.io', got '{api_group}'")
    if not role_kind:
        errors.append("roleRef.kind is required (Role or ClusterRole)")
    if not role_name:
        errors.append("roleRef.name is required")

    subjects = spec.get("subjects", [])
    if not subjects:
        errors.append("subjects list is empty — no one is granted this role")

    for subject in subjects:
        if subject.get("kind") not in ("User", "Group", "ServiceAccount"):
            errors.append(f"Invalid subject kind: '{subject.get('kind')}' — must be User, Group, or ServiceAccount")
        if not subject.get("name"):
            errors.append(f"Subject is missing 'name' field")

    return errors
```

---

## Constraints

### MUST DO
- Always use `rbac.authorization.k8s.io/v1` API version — never `rbac.authorization.k8s.io/v1beta1` (removed in Kubernetes 1.22+)
- Follow the principle of least privilege — list only the specific resources and verbs each service account needs
- Use namespace-scoped `Role` + `RoleBinding` whenever possible — prefer scoping over cluster-wide `ClusterRole` + `ClusterRoleBinding`
- Always bind roles to a dedicated `ServiceAccount` — never bind to the `default` service account or to `system:anonymous`
- Specify exact `apiGroups`, `resources`, and `verbs` — never use wildcards (`*`)
- Always include `roleRef.apiGroup: rbac.authorization.k8s.io` in every binding — omitting it causes binding failure
- Use `kubectl auth can-i` to verify RBAC policies grant the intended permissions after deployment
- Document the justification for each resource/verb pair in the role's metadata annotations

### MUST NOT DO
- Never grant `verbs: ["*"]` or `resources: ["*"]` — this is equivalent to cluster-admin and violates least privilege
- Never grant access to `secrets` with `list` and `delete` verbs — any pod with this can read all secrets in the namespace
- Never bind a ClusterRole to a ServiceAccount without specifying the correct namespace in the binding's subjects
- Never grant access to `rbac.authorization.k8s.io` resources (roles, rolebindings, clusterroles) — this enables privilege escalation
- Never use `escalate` or `bind` verbs in any role — these allow modifying RBAC policies
- Never create a RoleBinding without a matching Role — the binding is silently ignored

---

## Output Template

When implementing Kubernetes RBAC policies, produce the following:

1. **Role or ClusterRole YAML** — Complete role definition with specific resources, verbs, and apiGroups.
2. **RoleBinding or ClusterRoleBinding YAML** — Binding that connects the role to the target service account or user.
3. **ServiceAccount YAML** (if needed) — The dedicated service account that receives the role binding.
4. **Access Verification Commands** — `kubectl auth can-i` commands to verify the policy grants the expected permissions.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kubernetes-deployment` | Reference the RBAC service account in Deployment pod specs via `serviceAccountName` |
| `cncf/kyverno-pod-security-baseline` | Enforce pod security standards alongside RBAC for defense-in-depth |
| `cncf/open-policy-agent-opa` | Apply admission-time policy enforcement for RBAC compliance validation |
| `cncf/keycloak` | Integrate Kubernetes with external identity providers for user authentication |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Kubernetes RBAC Documentation](https://kubernetes.io/docs/reference/access-authn-authz/rbac/) — Official guide to RBAC concepts, roles, and bindings
- [Role-Based Access Control (RBAC) API Reference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.32/#role-v1-rbac-authorization-k8s-io) — Complete API schema for Role, ClusterRole, RoleBinding, and ClusterRoleBinding
- [Constructing a Role](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#user-facing-roles) — Guidelines for creating least-privilege roles
- [Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#determining-the-request) — How the RBAC authorizer evaluates API requests
- [Service Accounts](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/) — Service account management and token configuration
- [Auth Can-I Tool](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#command-line-utilities) — Using `kubectl auth can-i` for RBAC verification
- [RBAC Best Practices](https://kubernetes.io/docs/tasks/access-application-cluster/role-based-access-control/) — Operational guidance for RBAC deployment
