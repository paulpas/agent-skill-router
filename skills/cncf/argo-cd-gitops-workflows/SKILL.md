---
name: argo-cd-gitops-workflows
description: Implements GitOps deployment workflows using Argo CD — sync policies, ApplicationSets, app-of-apps bootstrapping, and resource pruning for automated Kubernetes deployment pipelines.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: argo cd, gitops workflows, argo sync policies, app of apps, kubernetes deployment automation, argo pruning
  role: implementation
  scope: implementation
  output-format: manifests
  content-types: [code, config, examples, do-dont]
  related-skills: cncf-helm-chart-development, cncf-kyverno, cncf-gitlab-ci-cd-pipelines, cncf-kubernetes-deployments-management
  archetypes:
    - tactical
    - orchestration
  anti_triggers:
    - argo workflows engine
    - argo rollouts progressive delivery
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Argo CD GitOps Workflows

Implements GitOps deployment workflows using Argo CD for automated Kubernetes application delivery. Configures sync policies, ApplicationSets, app-of-apps bootstrapping, and resource pruning to maintain cluster state in lockstep with Git repositories.

## TL;DR Checklist

- [ ] Define Application CRD with explicit syncPolicy (automated: prune + selfHeal)
- [ ] Create ApplicationSet for fleet-wide deployments across environments
- [ ] Set up app-of-apps bootstrapping with namespace-scoped parent Application
- [ ] Configure pruning so Argo CD removes resources deleted from Git
- [ ] Define sync windows to control deployment timeframes per environment
- [ ] Implement custom health checks for application-specific readiness

---

## When to Use

Use this skill when:

- Setting up automated GitOps deployment pipelines with Argo CD
- Configuring sync policies (automated sync, pruning, self-healing) for Kubernetes applications
- Building fleet-wide deployments with ApplicationSets across multiple environments
- Implementing app-of-apps patterns to bootstrap clusters with a single Application manifest
- Managing resource pruning and garbage collection when manifests are removed from Git
- Defining sync windows to restrict deployment windows for compliance or cost control
- Writing custom health assessment scripts for application-specific readiness checks

---

## When NOT to Use

- For progressive/canary deployments — use `cncf-argo-rollouts` or `cncf-canary-deployment` instead
- For batch workflow orchestration (DAG pipelines, ML workflows) — use `cncf-argo` (Argo Workflows engine) instead
- For one-off deployments or manual rollbacks outside GitOps — Argo CD is designed for continuous reconciliation
- When GitOps is overkill for simple `kubectl apply` use cases with minimal team coordination

---

## Core Workflow

1. **Define the Application CRD** — Create an `Application` resource pointing to a Git repository, branch, and directory path. Set `syncPolicy.automated` with `prune: true` and `selfHeal: true` for full GitOps behavior. **Checkpoint:** Verify the repo URL, target revision, and path are correct before applying.

2. **Configure Sync Options** — Add `syncOptions` such as `CreateNamespace=true`, `PrunePropagationPolicy=foreground`, `PruneLast=true`, and `ApplyOutOfSyncOnly=true`. These control how Argo CD handles namespace creation, deletion ordering, and diff-based reconciliation. **Checkpoint:** Test sync options with `argocd app diff <app-name>` before enabling automated sync.

3. **Set Up Sync Windows** — Define `syncPolicy.syncWindows` to restrict when deployments can occur per environment (e.g., no deployments during business hours in production). Use `kinds: [ReplicaSet, Pod, *]` to scope the window. **Checkpoint:** Confirm window schedules align with change advisory board (CAB) policies.

4. **Create ApplicationSet for Fleet Deployments** — Use generators (Cluster, Git, List) to provision Application resources across environments. Example: a single `ApplicationSet` generates dev/staging/prod `Application` resources from a shared manifest directory. **Checkpoint:** Verify each generated Application resolves to the correct destination namespace and cluster.

5. **Implement App-of-Apps Bootstrap** — Create a root Application that references a directory containing child Application manifests. This enables bootstrapping an entire application topology from one file. **Checkpoint:** Confirm the parent Application syncs all children before deploying workloads.

6. **Write Custom Health Checks** — Define `healthChecks` for application resources that Argo CD cannot assess natively. Use Go-based scripts or CLI commands to verify application readiness beyond standard Kubernetes resource states. **Checkpoint:** Test health check logic against known healthy and unhealthy states.

7. **Monitor and Audit** — Use `argocd app history <name>` to review sync events, `argocd app logs <name>` for sync operation details, and enable audit logging for compliance tracking. **Checkpoint:** Ensure sync history is retained for the required period and accessible to operators.

---

## Implementation Patterns

### Pattern 1: Application with Automated Sync and Pruning

This is the foundational Argo CD Application CRD. It points to a Git repository and configures automated sync with pruning so the cluster state always matches Git.

```yaml
# Application with full GitOps automation
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-production
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: production
  source:
    repoURL: https://github.com/org/infrastructure.git
    targetRevision: main
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - PruneLast=true
      - ApplyOutOfSyncOnly=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  revisionHistoryLimit: 10
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
```

### Pattern 2: ApplicationSet with Cluster Generator for Fleet Deployments

Provisions the same application across dev, staging, and production clusters using a single ApplicationSet manifest with the Cluster generator.

```yaml
# ApplicationSet generating per-cluster Applications
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-fleet
  namespace: argocd
spec:
  generators:
    - cluster:
        selector:
          matchLabels:
            environment: production
  template:
    metadata:
      name: '{{name}}-myapp'
      namespace: argocd
    spec:
      project: production
      source:
        repoURL: https://github.com/org/infrastructure.git
        targetRevision: main
        path: k8s/overlays/production
      destination:
        server: '{{server}}'
        namespace: myapp-prod
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
          - PrunePropagationPolicy=foreground
```

### Pattern 3: App-of-Apps Bootstrap Pattern

A parent Application that references a directory of child Application manifests to bootstrap an entire application topology from a single file.

```yaml
# Root Application for app-of-apps bootstrap
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: bootstrap-root
  namespace: argocd
spec:
  project: platform
  source:
    repoURL: https://github.com/org/platform-config.git
    targetRevision: main
    path: applications/production
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
  ignoreDifferences:
    - group: argoproj.io
      kind: Application
      jsonPointers:
        - /status
```

Child Applications live in `applications/production/` directory:

```yaml
# applications/production/redis.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: redis-cache
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/org/infrastructure.git
    targetRevision: main
    path: k8s/redis
  destination:
    server: https://kubernetes.default.svc
    namespace: redis
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### Pattern 4: Sync Windows for Deployment Timeboxes

Restricts when Argo CD can automatically sync applications, useful for compliance with change windows or cost controls.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-production
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/org/infrastructure.git
    targetRevision: main
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
    syncWindows:
      - kind: allow
        schedule: '0 9 * * 1-5'
        duration: 8h
        applications:
          - myapp-production
        manualSync: true
      - kind: deny
        schedule: '0 0 * * 0'
        duration: 24h
        matchExpressions:
          - key: environment
            operator: In
            values:
              - production
```

### Pattern 5: Custom Health Check for Application-Specific Readiness

Define a custom health assessment script for resources that Argo CD cannot assess with its default checks (e.g., StatefulSet with partitioned rollouts, or a custom CRD).

```bash
#!/usr/bin/env bash
# Custom health check for a StatefulSet with partitioned rollouts
# Usage: argocd-health-check.sh <resource-type> <namespace> <name>

set -euo pipefail

RESOURCE_TYPE="${1:-StatefulSet}"
NAMESPACE="${2:-}"
NAME="${3:-}"

if [[ -z "$NAMESPACE" || -z "$NAME" ]]; then
  echo '{"status":"unknown","message":"Usage: argocd-health-check.sh <type> <namespace> <name>"}'
  exit 0
fi

case "$RESOURCE_TYPE" in
  StatefulSet)
    CURRENT=$(kubectl get statefulset "$NAME" -n "$NAMESPACE" -o jsonpath='{.status.currentReplicas}' 2>/dev/null || echo "")
    DESIRED=$(kubectl get statefulset "$NAME" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "")
    UPDATED=$(kubectl get statefulset "$NAME" -n "$NAMESPACE" -o jsonpath='{.status.updatedReplicas}' 2>/dev/null || echo "")

    if [[ "$CURRENT" == "$DESIRED" && "$UPDATED" == "$DESIRED" && "$CURRENT" != "" ]]; then
      echo '{"status":"Healthy","message":"StatefulSet fully rolled out: '"$CURRENT"' replicas ready"}'
    else
      echo '{"status":"Progressing","message":"StatefulSet rolling: current='"$CURRENT"' desired='"$DESIRED"' updated='"$UPDATED"'"}'
    fi
    ;;
  *)
    echo '{"status":"Unknown","message":"No custom health check defined for '"$RESOURCE_TYPE"'"}'
    ;;
esac
```

### Pattern 6: Application with Argo Rollouts Integration

Shows how Argo CD Application works alongside Argo Rollout for progressive delivery — Argo CD syncs the Rollout manifest, and the Rollout controller handles canary steps.

```yaml
# Argo CD Application managing an Argo Rollout
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-canary
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/org/infrastructure.git
    targetRevision: main
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
  ignoreDifferences:
    - group: argoproj.io
      kind: Rollout
      jsonPointers:
        - /status
```

---

## Constraints

### MUST DO

- Always enable `prune: true` in syncPolicy.automated to prevent configuration drift from orphaned resources
- Use `selfHeal: true` to let Argo CD automatically correct manual changes outside Git
- Set `targetRevision` to a specific branch or tag — never use HEAD for production Applications
- Define `syncWindows` for production clusters to enforce deployment timeboxes and CAB policies
- Use `finalizers: resources-finalizer.argocd.argoproj.io` to ensure cleanup on Application deletion
- Pin `targetRevision` for production deployments and use tags or SHAs, not mutable branch references
- Configure `retry.limit` and `retry.backoff` to handle transient Git or API server failures
- Use ApplicationSets for any multi-environment deployment to avoid manifest duplication
- Set `ignoreDifferences` only for controlled drift (like replicas managed by HPA), never for configuration-critical fields
- Enable audit logging via `argocd-rbac-cfg` ConfigMap for compliance tracking

### MUST NOT DO

- Disable `prune: true` on production Applications — orphaned resources accumulate and cause drift
- Set `automated.sync` without `prune` and `selfHeal` — this breaks the GitOps feedback loop
- Use `syncOptions: [PruneLast=false]` — it creates transient resource deletion that breaks traffic flow
- Manually edit resources managed by Argo CD outside of Git — it triggers sync conflicts
- Reference multiple `targetRevision` branches for the same Application — Argo CD cannot reconcile divergent states
- Skip `CreateNamespace=true` in syncOptions for new namespaces — the Application will fail with a NotFound error
- Use `syncPolicy.manual` with `automated: true` — these are mutually exclusive and cause reconciliation confusion
- Omit `ignoreDifferences` for HPA-managed replicas — the constant replica count drift causes continuous sync cycles

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-helm-chart-development` | Helm chart creation for application manifests consumed by Argo CD Application sources |
| `cncf-kyverno` | Policy enforcement on resources before and after Argo CD sync operations |
| `cncf-gitlab-ci-cd-pipelines` | CI pipeline that builds artifacts and pushes manifest changes to Git for Argo CD to pick up |
| `cncf-kubernetes-deployments-management` | Kubernetes Deployment management concepts that Argo CD operates on |
| `cncf-argo` | Broader Argo ecosystem (Workflows, Events, Rollouts) when beyond pure GitOps |

---

## Live References

> Authoritative documentation links for Argo CD GitOps workflows.

- [Argo CD Documentation](https://argo-cd.readthedocs.io/en/stable/)
- [Argo CD Application CRD Reference](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/)
- [Argo CD ApplicationSet Generators](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/)
- [Argo CD Sync Policy Documentation](https://argo-cd.readthedocs.io/en/stable/operator-manual/sync-waves/)
- [Argo CD Custom Health Checks](https://argo-cd.readthedocs.io/en/stable/operator-manual/health/)
- [Argo CD Sync Windows](https://argo-cd.readthedocs.io/en/stable/operator-manual/sync-windows/)
- [Argo CD App-of-Apps Pattern](https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/)
