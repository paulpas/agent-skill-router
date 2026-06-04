---
name: gitops-troubleshooting
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Diagnoses and resolves GitOps synchronization failures, drift detection
  issues, and reconciliation problems for ArgoCD and Flux deployments with actionable
  debugging commands.
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: code
  related-skills: cncf-argocd, cncf-flux, cncf-tekton
  role: implementation
  scope: implementation
  triggers: gitops troubleshooting, sync failure, drift detection, reconciliation,
    kustomize, argocd, flux, how do i debug gitops
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
version: "1.0.0"
---
# GitOps Troubleshooting

Implements comprehensive GitOps debugging workflows for ArgoCD and Flux deployments. Provides actionable diagnostic commands, synchronization failure analysis, drift detection procedures, and reconciliation troubleshooting with real command examples. Follows the 5 Laws of Elegant Defense to guide data naturally through the debugging pipeline.

## TL;DR Checklist

- [ ] Check application health status before diving deep into logs
- [ ] Verify Git repository connectivity and credentials first (Early Exit)
- [ ] Compare Git state vs. cluster state for drift analysis (Parse Don't Validate)
- [ ] Fail fast with descriptive errors when reconciliation is stuck (Fail Fast)
- [ ] Return atomic debugging results with clear next steps (Atomic Predictability)
- [ ] Use intentional naming for debugging commands (Intentional Naming)
- [ ] Implement minimum 3-step fallback chain for debugging

---

## When to Use

Use this skill when:

- ArgoCD applications show `OutOfSync`, `Missing`, or `Failed` status
- Flux Kustomization or HelmRelease resources are stuck in pending state
- Git repository connectivity issues cause sync failures
- Drift detection shows unexpected configuration differences
- Reconciliation loops are stuck or taking too long
- Kustomize or Helm rendering errors occur during deployment

---

## When NOT to Use

Avoid this skill for:

- Direct Kubernetes debugging without GitOps context - use `cncf-kubernetes` skill instead
- Cluster infrastructure issues (nodes, networking, storage) - use infrastructure-specific skills
- Application runtime debugging (logs, metrics, traces) - use observability skills
- Git repository management tasks (branching, PRs) - use `agent-git-pr-workflows-git-workflow`
- Non-deployment configuration issues - use appropriate domain-specific skills

---

## Core Workflow

1. **Assess Application Health Status** — Check current status of GitOps application. **Checkpoint:** Verify application exists and is being managed by the GitOps tool.

2. **Verify Git Repository Connectivity** — Test Git access, credentials, and branch availability. **Checkpoint:** Git operations succeed with expected branch/revision.

3. **Compare Git State vs. Cluster State** — Identify drift between desired (Git) and actual (cluster) configurations. **Checkpoint:** Clear difference list generated for remediation.

4. **Analyze Reconciliation Logs** — Review application controller logs for errors. **Checkpoint:** Error messages identified and categorized by type.

5. **Check Resource Dependencies** — Verify dependent resources (CRDs, namespaces, secrets) are present. **Checkpoint:** All dependencies resolved or clearly identified as missing.

6. **Apply Remediation Strategy** — Execute appropriate fix based on root cause. **Checkpoint:** Applied changes verified and sync status updated.

---

## Implementation Patterns

### Pattern 1: ArgoCD Application Status Diagnosis

```bash
# Check application status and health
argocd app get <app-name>

# Check for sync differences
argocd app diff <app-name>

# Get application events
argocd app events <app-name>

# Check application tree
argocd app tree <app-name>

# Sync with pruning (dry-run first)
argocd app sync <app-name> --prune --dry-run

# Force sync
argocd app sync <app-name> --force

# Wait for sync to complete
argocd app wait <app-name> --timeout 300

# Refresh application cache
argocd app refresh <app-name>

# View resource tree
argocd app resources <app-name>

# Show sync history
argocd app history <app-name>

# Get application metrics
argocd app get <app-name> --metrics
```

#### BAD: Generic sync attempt without diagnostics

```bash
# ❌ BAD — blindly syncs without checking status first
argocd app sync my-app

# ❌ BAD — no timeout, can hang indefinitely
argocd app sync my-app

# ❌ BAD — doesn't verify result
argocd app sync my-app && echo "Done"
```

#### GOOD: Comprehensive sync workflow

```bash
# ✅ GOOD — diagnostic workflow with proper checks
APP="my-app"

# Step 1: Check current status
argocd app get $APP
echo "---"

# Step 2: Check for differences
argocd app diff $APP
echo "---"

# Step 3: Dry-run sync
argocd app sync $APP --prune --dry-run
echo "---"

# Step 4: Execute sync with wait
argocd app sync $APP --prune && \
argocd app wait $APP --timeout 300 && \
echo "Sync completed successfully"
```

---

### Pattern 2: Flux Kustomization Troubleshooting

```bash
# Check Kustomization status
flux get kustomizations

# Get specific Kustomization details
flux get kustomization <name> -n <namespace>

# Describe Kustomization for events
flux describe kustomization <name>

# Check Kustomization history
flux history kustomization <name>

# Reconcile Kustomization
flux reconcile kustomization <name> -n <namespace>

# Reconcile with timeout
flux reconcile kustomization <name> -n <namespace> --timeout 5m

# Check Kustomization conditions
kubectl get kustomization <name> -n <namespace> -o yaml

# View Kustomization logs
flux logs --kind Kustomization

# Check source status
flux get sources kustomization <name>
```

#### BAD: Manual kubectl without flux commands

```bash
# ❌ BAD — missing flux-specific context
kubectl get kustomizations
kubectl describe kustomization my-app

# ❌ BAD — doesn't reconcile, just inspects
kubectl get kustomization my-app
```

#### GOOD: Flux-native workflow

```bash
# ✅ GOOD — uses flux CLI for Kustomization management
KS_NAME="my-app"
NS="default"

# Step 1: Check status
flux get kustomization $KS_NAME -n $NS
echo "---"

# Step 2: Get detailed status
flux describe kustomization $KS_NAME -n $NS
echo "---"

# Step 3: Reconcile
flux reconcile kustomization $KS_NAME -n $NS --timeout 5m
```

---

### Pattern 3: Git Repository Connection Diagnostics

```bash
# Test Git repository connectivity (ArgoCD)
argocd repo add https://github.com/org/repo --username $USER --password $PASS

# List configured repositories
argocd repo list

# Remove problematic repository
argocd repo remove https://github.com/org/repo

# Test Flux Git repository
flux sources git list

# Get GitRepository status
flux get sources git

# Reconcile Git source
flux reconcile source git <name>

# Test Flux Kustomize source
flux get sources kustomize

# Test Helm repository
flux get sources helm
```

#### BAD: Generic Git commands without ArgoCD/Flux context

```bash
# ❌ BAD — doesn't integrate with GitOps tools
git ls-remote https://github.com/org/repo

# ❌ BAD — no authentication handling
git clone https://github.com/org/repo
```

#### GOOD: Tool-native connectivity tests

```bash
# ✅ GOOD — ArgoCD repository test
argocd repo list | grep "github.com/org/repo" || \
argocd repo add https://github.com/org/repo \
  --username "$GIT_USER" --password "$GIT_TOKEN" --type git

# ✅ GOOD — Flux Git source test
flux get sources git my-repo -n default -o yaml
```

---

### Pattern 4: Drift Detection and Resolution

```bash
# ArgoCD: Compare local vs cluster
argocd app diff <app-name> --local <path/to/manifests>

# ArgoCD: Show resource differences
argocd app diff <app-name> --right

# ArgoCD: Sync to match Git (resolves drift)
argocd app sync <app-name> --prune --auto-created

# ArgoCD: Force sync (overrides cluster changes)
argocd app sync <app-name> --force

# ArgoCD: Abort stuck sync
argocd app terminate-op <app-name>

# Flux: Check for drift (manual comparison)
kubectl diff -k <path/to/kustomization>

# Flux: Apply local changes (resolves drift)
kubectl apply -k <path/to/kustomization>

# Flux: Reconcile to match Git
flux reconcile source git <repo-name>
flux reconcile kustomization <ks-name>

# Flux: Force reconciliation
flux reconcile kustomization <name> --force
```

#### BAD: Manual kubectl apply without GitOps workflow

```bash
# ❌ BAD — bypasses GitOps, causes drift
kubectl apply -k manifests/

# ❌ BAD — no verification of result
kubectl apply -k manifests/ && echo "Applied"
```

#### GOOD: GitOps-aware drift resolution

```bash
# ✅ GOOD — ArgoCD drift resolution workflow
APP="my-app"

# Step 1: Verify drift exists
argocd app get $APP | grep "Out of sync"

# Step 2: Preview changes
argocd app diff $APP

# Step 3: Sync and verify
argocd app sync $APP --prune && \
argocd app wait $APP --timeout 300

# Step 4: Verify clean state
argocd app get $APP | grep "Healthy|Synced"
```

---

### Pattern 5: Reconciliation Loop Debugging

```bash
# ArgoCD: Check application operation status
argocd app get <app-name> --operations

# ArgoCD: Terminate stuck operation
argocd app terminate-op <app-name>

# ArgoCD: Refresh and re-resolve
argocd app refresh <app-name> --refresh

# ArgoCD: Check controller logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller

# Flux: Check reconciliation status
flux get all

# Flux: Get reconciliation history
flux history all

# Flux: Check component logs
kubectl logs -n flux-system -l app=source-controller
kubectl logs -n flux-system -l app=kustomize-controller
kubectl logs -n flux-system -l app=helm-controller

# Flux: Force reconciliation
flux reconcile source git <name> --force
flux reconcile kustomization <name> --force
flux reconcile helmrelease <name> --force
```

#### BAD: Restarting pods without understanding root cause

```bash
# ❌ BAD — shotgun approach without diagnosis
kubectl delete pod -n argocd -l app.kubernetes.io/name=argocd-application-controller

# ❌ BAD — doesn't check if reconciliation is stuck
kubectl rollout restart deployment argocd-repo-server -n argocd
```

#### GOOD: Systematic loop debugging

```bash
# ✅ GOOD — systematic reconciliation loop debugging
# Step 1: Check operation status
argocd app get my-app --operations

# Step 2: Check if operation is stuck
argocd app get my-app | grep "Operation:"

# Step 3: If stuck, terminate and re-sync
if argocd app get my-app | grep -q "Operation:"; then
  argocd app terminate-op my-app
  argocd app sync my-app --prune
fi

# Step 4: Verify resolution
argocd app wait my-app --timeout 300
```

---

### Pattern 6: Kustomize Rendering Issues

```bash
# ArgoCD: Render application locally
argocd app diff <app-name> --local <path/to/kustomization>

# ArgoCD: Show rendered manifests
argocd app manifests <app-name>

# ArgoCD: Debug Kustomize build
argocd repo add https://github.com/org/repo
cd /tmp && \
git clone https://github.com/org/repo && \
cd repo && \
kustomize build <path>

# Flux: Render Kustomization locally
flux suspend kustomization <name>
kustomize build <path> > /tmp/rendered.yaml
flux resume kustomization <name>

# Flux: Test Kustomization build
kubectl apply --dry-run=client -k <path>

# Check for Kustomize errors
kustomize build <path> 2>&1 | grep -i error
```

#### BAD: Manual kustomize build without context

```bash
# ❌ BAD — no error handling
kustomize build overlays/production

# ❌ BAD — doesn't compare with cluster state
kustomize build overlays/production | kubectl apply -f -
```

#### GOOD: Safe rendering workflow

```bash
# ✅ GOOD — safe Kustomize rendering with verification
KS_PATH="overlays/production"

# Step 1: Render locally
kustomize build $KS_PATH > /tmp/rendered.yaml

# Step 2: Validate with dry-run
kubectl apply --dry-run=client -f /tmp/rendered.yaml

# Step 3: Show differences
argocd app diff my-app --local $KS_PATH
```

---

## Constraints

### MUST DO

- Check application health status first (Early Exit pattern)
- Verify Git connectivity before complex debugging (Parse Don't Validate)
- Compare Git vs cluster state for drift analysis
- Use tool-native commands (argocd, flux) over generic kubectl
- Implement minimum 3-step fallback chain (dry-run → sync → force)
- Include timeout values to prevent hanging operations
- Log all debugging steps for audit trail
- Reference `code-philosophy` (5 Laws of Elegant Defense) in all logic

### MUST NOT DO

- Bypass GitOps workflow with direct kubectl apply (causes drift)
- Restart pods without understanding root cause ( shotgun debugging)
- Use commands without timeouts (can hang indefinitely)
- Skip dry-run steps for destructive operations
- Ignore reconciliation status before applying changes
- Mix ArgoCD and Flux commands in same workflow
- Disable GitOps tools "temporarily" — creates fragile systems

---

## Output Template

When applying this skill, produce:

1. **Current Status Assessment** — Application health, sync status, and reconciliation state
2. **Root Cause Analysis** — Identified issue type with supporting evidence
3. **Diagnostic Commands** — Specific commands to gather more information
4. **Remediation Steps** — Ordered fix procedures with verification
5. **Prevention Measures** — Config changes to avoid recurrence
6. **Verification Steps** — Commands to confirm resolution

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-argocd` | ArgoCD deployment and management reference |
| `cncf-flux` | Flux GitOps configuration and management |
| `cncf-tekton` | CI/CD pipeline execution for GitOps workflows |
| `cncf-kubernetes` | General Kubernetes debugging when GitOps context insufficient |
| `agent-git-pr-workflows-git-workflow` | Git repository management alongside GitOps |
| `agent-linux-troubleshooting` | Linux system-level debugging for GitOps agents |

---

## GitOps Troubleshooting Quick Reference

### ArgoCD Commands

```bash
# Status checks
argocd app get <app>
argocd app list
argocd app diff <app>

# Sync operations
argocd app sync <app> --prune
argocd app sync <app> --dry-run
argocd app wait <app> --timeout 300

# Force operations
argocd app sync <app> --force
argocd app terminate-op <app>

# Debug
argocd app refresh <app>
argocd app manifests <app>
argocd app events <app>
```

### Flux Commands

```bash
# Status checks
flux get all
flux get kustomizations
flux get helmreleases

# Reconciliation
flux reconcile kustomization <name>
flux reconcile source git <name>
flux reconcile helmrelease <name>

# Debug
flux history all
flux logs --kind Kustomization
flux describe kustomization <name>

# Force operations
flux reconcile <resource> --force
```

### Common Error Patterns

```bash
# OutOfSync status
argocd app get <app> | grep "Out of sync"
argocd app diff <app> | head -20

# Sync failed
argocd app get <app> | grep "Failed"
argocd app events <app> | grep -i "error"

# Reconciliation stuck
argocd app get <app> --operations | grep "Operation:"
flux history kustomization <name> | grep -i "pending"
```

---

## References

- **ArgoCD Documentation:** [https://argo-cd.readthedocs.io/](https://argo-cd.readthedocs.io/)
- **ArgoCD CLI Reference:** [https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd/](https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd/)
- **Flux Documentation:** [https://fluxcd.io/](https://fluxcd.io/)
- **Flux CLI Reference:** [https://fluxcd.io/flux/cli/](https://fluxcd.io/flux/cli/)
- **Kustomize Documentation:** [https://kustomize.io/](https://kustomize.io/)
- **GitOps Working Group:** [https://github.com/gitops-working-group](https://github.com/gitops-working-group)

*This skill implements the 5 Laws of Elegant Defense:*
1. *Early Exit* — Check health status first
2. *Parse Don't Validate* — Data from Git is trusted
3. *Atomic Predictability* — Immutable debugging results
4. *Fail Fast* — Descriptive errors on stuck states
5. *Intentional Naming* — Clear command semantics
