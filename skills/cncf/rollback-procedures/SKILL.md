---




name: rollback-procedures
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Implements comprehensive rollback procedures including deployment rollback,
  version rollback, database rollback, and rollback testing for Kubernetes and cloud-native
  applications
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: cncf-argocd, cncf-deployment-patterns, cncf-kubernetes-debugging
  role: implementation
  scope: implementation
  triggers: rollback strategies, deployment rollback, version rollback, rollback procedures,
    rollback testing, rollback automation, rollback validation, rollback procedures
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
version: "1.0.0"




---




# Rollback Procedures

Implements comprehensive rollback procedures for Kubernetes deployments, Helm releases, ArgoCD applications, database migrations, and application versions. Provides step-by-step workflows, validated commands, and automation patterns to restore services to known good states.

## TL;DR Checklist

- [ ] **Identify the failure** — Determine root cause and affected component (deployment, Helm release, database, config)
- [ ] **Verify rollback readiness** — Check if rollback is possible and safe to execute
- [ ] **Capture current state** — Save deployment manifests, configmaps, and current versions for audit
- [ ] **Execute rollback** — Run appropriate rollback command for the component type
- [ ] **Validate rollback success** — Verify service health, logs, and metrics post-rollback
- [ ] **Update monitoring** — Add alerts for the failure pattern to prevent recurrence
- [ ] **Document incident** — Record rollback actions, timestamps, and outcomes
- [ ] **Test rollback automation** — Verify rollback script works in staging before production use

---

## When to Use

Use this skill when:

- A deployment has failed and you need to restore the previous working version
- A new application version introduces critical bugs or performance degradation
- Database migrations cause data corruption or application errors
- Configuration changes break application functionality
- CI/CD pipeline deploys a broken build that requires immediate rollback
- Rollback testing is needed to verify rollback procedures work correctly

---

## When NOT to Use

Avoid this skill for:

- **Data recovery scenarios** — Use database backup/restore tools instead (Rollback restores versions, not deleted data)
- **Service mesh misconfigurations** — Use service mesh debugging skills first
- **Network policy issues** — Use network troubleshooting before rollback
- **Hardware failures** — Infrastructure issues require different recovery approaches
- **Application code debugging** — Code issues should be fixed in new versions, not rolled back indefinitely

---

## Core Workflow

1. **Identify Failure** — Determine what component failed and the exact failure symptoms. **Checkpoint:** You can describe the failure in one sentence with error messages or symptoms.

2. **Assess Rollback Feasibility** — Check if the previous version is still available and if rollback is the best recovery option. **Checkpoint:** You have verified that the previous deployment version exists in the registry or repository.

3. **Capture Current State** — Save current deployment manifests, configmaps, and application state before making changes. **Checkpoint:** All manifests are backed up to a safe location with timestamps.

4. **Execute Rollback** — Run the appropriate rollback command based on the deployment method (kubectl, Helm, ArgoCD). **Checkpoint:** Rollback command completes without errors and shows success status.

5. **Validate Rollback** — Verify the service is healthy, logs are clean, and metrics are normal. **Checkpoint:** All health checks pass and service is receiving traffic normally.

6. **Update Documentation** — Document the incident, rollback actions, and any changes to prevent future occurrences. **Checkpoint:** Incident report is saved in the runbook repository with timestamps and lessons learned.

---

## Implementation Patterns

### Pattern 1: Kubernetes Deployment Rollback (kubectl)

Rolling back a Kubernetes deployment to a previous revision.

```bash
# Check deployment history
kubectl rollout history deployment/my-app

# Rollback to previous revision
kubectl rollout undo deployment/my-app

# Rollback to specific revision
kubectl rollout undo deployment/my-app --to-revision=3

# Verify rollback
kubectl rollout status deployment/my-app

# Get deployment details after rollback
kubectl get deployment my-app -o yaml
```

```yaml
# ❌ BAD — Missing verification and history check
kubectl rollout undo deployment/my-app

# ✅ GOOD — Complete rollback with verification
kubectl rollout history deployment/my-app
kubectl rollout undo deployment/my-app
kubectl rollout status deployment/my-app
kubectl get pods -l app=my-app -w
```

### Pattern 2: Helm Release Rollback

Rolling back a Helm release to a previous revision.

```bash
# List all releases
helm list --all-namespaces

# Check release history
helm history my-app -n production

# Rollback to previous revision
helm rollback my-app -n production

# Rollback to specific revision
helm rollback my-app 3 -n production

# Verify rollback
helm status my-app -n production
```

```bash
# ❌ BAD — Rolling back without checking history
helm rollback my-app -n production

# ✅ GOOD — Complete Helm rollback workflow
helm history my-app -n production
helm rollback my-app 3 -n production
helm status my-app -n production
kubectl rollout status deployment/my-app -n production
```

### Pattern 3: ArgoCD Application Rollback

Rolling back an ArgoCD application to a previous revision.

```bash
# List applications
argocd app list

# Check application history
argocd app history my-app

# Sync to last known good revision
argocd app rollback my-app

# Sync to specific revision
argocd app sync my-app --revision=abc123

# Verify rollback
argocd app wait my-app --health
```

```yaml
# ❌ BAD — Manual sync without rollback
argocd app sync my-app

# ✅ GOOD — ArgoCD rollback with health check
argocd app history my-app
argocd app rollback my-app
argocd app wait my-app --health
argocd app get my-app
```

### Pattern 4: Database Schema Rollback

Rolling back database schema changes using migration tools.

```bash
# Flyway rollback
flyway rollback -url=jdbc:postgresql://db:5432/myapp -user=postgres -password=secret

# Flyway rollback to specific version
flyway rollback -url=jdbc:postgresql://db:5432/myapp -user=postgres -password=secret -target=20240101.120000

# Liquibase rollback
liquibase rollback --url=jdbc:postgresql://db:5432/myapp --username=postgres --password=secret

# Liquibase rollback to tag
liquibase rollback --url=jdbc:postgresql://db:5432/myapp --username=postgres --password=secret --rollbackTag=v2024.01.01
```

```bash
# ❌ BAD — Dropping and recreating database
psql -h db -U postgres -c "DROP DATABASE myapp; CREATE DATABASE myapp;"

# ✅ GOOD — Proper Flyway rollback with verification
flyway info -url=jdbc:postgresql://db:5432/myapp -user=postgres -password=secret
flyway rollback -url=jdbc:postgresql://db:5432/myapp -user=postgres -password=secret
flyway info -url=jdbc:postgresql://db:5432/myapp -user=postgres -password=secret
```

### Pattern 5: Application Version Rollback

Rolling back an application to a specific container image version.

```bash
# View current deployment image
kubectl get deployment my-app -o jsonpath='{.spec.template.spec.containers[0].image}'

# Rollback to specific image version
kubectl set image deployment/my-app my-app=myapp:v2.1.0

# Verify image update
kubectl describe deployment my-app | grep -A5 "Image:"

# Rollback to previous (auto-version detection)
kubectl set image deployment/my-app my-app=myapp:v2.1.0
```

```yaml
# ❌ BAD — Hardcoding without verification
kubectl set image deployment/my-app my-app=myapp:v2.0.0

# ✅ GOOD — Image rollback with verification
kubectl get deployment my-app -o jsonpath='{.spec.template.spec.containers[0].image}'
kubectl set image deployment/my-app my-app=myapp:v2.0.0
kubectl rollout status deployment/my-app
kubectl describe deployment my-app | grep -A2 "Image:"
```

### Pattern 6: Configuration Rollback

Rolling back configuration changes using ConfigMaps and Secrets.

```bash
# View current ConfigMap
kubectl get configmap my-app-config -o yaml

# Create backup of current config
kubectl get configmap my-app-config -o yaml > configmap-backup-$(date +%Y%m%d-%H%M%S).yaml

# Edit and apply previous version
kubectl apply -f configmap-backup-20240101-120000.yaml

# Delete configmap to trigger rollback (if using git-sync)
kubectl delete configmap my-app-config

# Or apply specific version from git
kubectl apply -f https://raw.githubusercontent.com/org/repo/v2.0.0/config/my-app-config.yaml
```

```yaml
# ❌ BAD — Direct manipulation without backup
kubectl delete configmap my-app-config
kubectl apply -f config.yaml

# ✅ GOOD — Config rollback with backup and verification
kubectl get configmap my-app-config -o yaml > configmap-backup-$(date +%Y%m%d-%H%M%S).yaml
kubectl apply -f configmap-backup-20240101-120000.yaml
kubectl rollout restart deployment/my-app
kubectl rollout status deployment/my-app
```

### Pattern 7: Rollback Testing Procedures

Testing rollback procedures in a staging environment.

```bash
# Create test deployment
kubectl create deployment test-app --image=myapp:v2.2.0

# Simulate failure (apply broken config)
kubectl set env deployment/test-app BROKEN_CONFIG=true

# Verify failure
kubectl logs -l app=test-app --tail=50
kubectl get events --field-selector type=Warning

# Execute rollback test
kubectl rollout undo deployment/test-app

# Verify successful rollback
kubectl rollout status deployment/test-app
kubectl logs -l app=test-app --tail=10
```

```bash
# ❌ BAD — Testing rollback only in production
# (Never do this!)

# ✅ GOOD — Complete rollback testing workflow
kubectl create namespace rollback-test
kubectl create deployment test-app --image=myapp:v2.2.0 -n rollback-test
kubectl set env deployment/test-app BROKEN_CONFIG=true -n rollback-test
sleep 30
kubectl get events -n rollback-test --field-selector type=Warning
kubectl rollout undo deployment/test-app -n rollback-test
kubectl rollout status deployment/test-app -n rollback-test
kubectl delete namespace rollback-test
```

### Pattern 8: Rollback Automation

Automating rollback procedures using scripts.

```bash
#!/bin/bash
# rollback.sh - Automated rollback script

set -e

DEPLOYMENT=$1
NAMESPACE=${2:-default}

if [ -z "$DEPLOYMENT" ]; then
    echo "Usage: $0 <deployment-name> [namespace]"
    exit 1
fi

echo "=== Starting rollback for $DEPLOYMENT in $NAMESPACE ==="

# Check deployment history
echo "Checking deployment history..."
kubectl rollout history deployment/$DEPLOYMENT -n $NAMESPACE

# Get current revision
CURRENT_REVISION=$(kubectl rollout history deployment/$DEPLOYMENT -n $NAMESPACE | grep -v REVISION | tail -1 | cut -d' ' -f1)
PREVIOUS_REVISION=$((CURRENT_REVISION - 1))

if [ $PREVIOUS_REVISION -lt 1 ]; then
    echo "No previous revision available"
    exit 1
fi

echo "Rolling back to revision $PREVIOUS_REVISION..."

# Execute rollback
kubectl rollout undo deployment/$DEPLOYMENT --to-revision=$PREVIOUS_REVISION -n $NAMESPACE

# Wait for completion
echo "Waiting for rollback to complete..."
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE --timeout=300s

# Verify
echo "Verification:"
kubectl get pods -l app=$DEPLOYMENT -n $NAMESPACE
kubectl describe deployment/$DEPLOYMENT -n $NAMESPACE | head -20

echo "=== Rollback completed ==="
```

```yaml
# ❌ BAD — No error handling or verification
#!/bin/bash
kubectl rollout undo deployment/my-app

# ✅ GOOD — Complete automated rollback with error handling
#!/bin/bash
set -euo pipefail
# ... (see full script above)
```

### Pattern 9: Multi-Step Application Rollback

Rolling back complex applications with multiple deployments and services.

```bash
# Create rollback plan for multi-component application
cat > rollback-plan.sh << 'EOF'
#!/bin/bash
set -euo pipefail

echo "=== Multi-Component Application Rollback ==="
echo "Timestamp: $(date -Iseconds)"

# Define components
COMPONENTS=("api-gateway" "auth-service" "user-service" "payment-service")

# Backup current state
echo "Backing up current state..."
for component in "${COMPONENTS[@]}"; do
    kubectl get deployment "$component" -o yaml > backup/"${component}-$(date +%Y%m%d-%H%M%S).yaml"
    kubectl get configmap "${component}-config" -o yaml > backup/"${component}-config-$(date +%Y%m%d-%H%M%S).yaml"
done

# Rollback each component
echo "Rolling back components..."
for component in "${COMPONENTS[@]}"; do
    echo "Rolling back $component..."
    kubectl rollout undo deployment/"$component"
    kubectl rollout status deployment/"$component" --timeout=120s
done

# Verify all components
echo "Verifying rollback..."
kubectl get pods -l app.kubernetes.io/name=multi-app
kubectl get services -l app.kubernetes.io/name=multi-app

echo "=== Multi-component rollback completed ==="
EOF

# Execute rollback plan
chmod +x rollback-plan.sh
./rollback-plan.sh
```

```bash
# ❌ BAD — Rolling back components sequentially without backup
for component in api-gateway auth-service user-service; do
    kubectl rollout undo deployment/$component
done

# ✅ GOOD — Complete multi-component rollback with backup
for component in api-gateway auth-service user-service payment-service; do
    kubectl get deployment "$component" -o yaml > backup/"${component}-$(date +%Y%m%d-%H%M%S).yaml"
done
./rollback-plan.sh
```

### Pattern 10: Canary Rollback

Rolling back a canary deployment that has issues.

```bash
# Monitor canary deployment
kubectl rollout status deployment/my-app-canary --timeout=120s

# If canary fails, rollback to stable
kubectl rollout undo deployment/my-app-canary

# Scale down canary
kubectl scale deployment/my-app-canary --replicas=0

# Verify stable deployment
kubectl rollout status deployment/my-app
kubectl get pods -l app=my-app -l version=stable

# Cleanup canary resources
kubectl delete deployment/my-app-canary
kubectl delete service/my-app-canary
```

```bash
# ❌ BAD — Deleting canary without proper rollback
kubectl delete deployment/my-app-canary
kubectl rollout undo deployment/my-app

# ✅ GOOD — Proper canary rollback workflow
kubectl rollout status deployment/my-app-canary --timeout=60s || true
kubectl rollout undo deployment/my-app-canary
kubectl rollout status deployment/my-app-canary
kubectl scale deployment/my-app-canary --replicas=0
kubectl delete deployment/my-app-canary
```

### Pattern 11: Database Data Rollback

Rolling back database data changes using point-in-time recovery.

```bash
# PostgreSQL point-in-time recovery
# Step 1: Stop application connections
kubectl scale deployment/my-app --replicas=0

# Step 2: Identify recovery point
kubectl exec -it postgres-0 -- psql -U postgres -c "SELECT * FROM pg_stat_replication;"

# Step 3: Create recovery configuration
cat > /var/lib/postgresql/recovery.conf << EOF
restore_command = 'cp /path/to/archive/%f %p'
recovery_target_time = '2024-01-15 10:30:00'
recovery_target_action = 'pause'
EOF

# Step 4: Trigger recovery
kubectl exec -it postgres-0 -- touch /var/lib/postgresql/recovery.signal

# Step 5: Verify recovery
kubectl exec -it postgres-0 -- psql -U postgres -c "SELECT now();"
```

```sql
-- ❌ BAD — Direct data deletion without proper rollback
DELETE FROM users WHERE created_at > '2024-01-01';

-- ✅ GOOD — Transaction-based rollback with savepoint
BEGIN;
SAVEPOINT before_update;
UPDATE users SET status = 'active' WHERE id = 123;
-- If this fails...
ROLLBACK TO SAVEPOINT before_update;
COMMIT;
```

### Pattern 12: ConfigMap and Secret Version Rollback

Rolling back ConfigMaps and Secrets using versioned resources.

```bash
# Create versioned ConfigMap
kubectl get configmap my-config -o yaml > configmaps/my-config-v2.1.0.yaml

# Apply previous version
kubectl apply -f configmaps/my-config-v2.0.0.yaml

# Force pod restart to pick up new config
kubectl rollout restart deployment/my-app

# Verify config was updated
kubectl exec -it deploy/my-app -- cat /etc/config/my-config.yaml

# Secret rollback (encrypted)
kubectl get secret my-secret -o yaml > secrets/my-secret-v2.1.0.yaml
kubectl apply -f secrets/my-secret-v2.0.0.yaml
```

```bash
# ❌ BAD — Not forcing pod restart after config update
kubectl apply -f my-config.yaml

# ✅ GOOD — Complete ConfigMap rollback with restart
kubectl apply -f my-config-v2.0.0.yaml
kubectl rollout restart deployment/my-app
kubectl rollout status deployment/my-app
kubectl exec -it deploy/my-app -- cat /etc/config/my-config.yaml
```

### Pattern 13: StatefulSet Rollback

Rolling back StatefulSet deployments with persistent volumes.

```bash
# Check StatefulSet status
kubectl get statefulset my-stateful-app

# View current revision
kubectl rollout history statefulset/my-stateful-app

# Rollback StatefulSet
kubectl rollout undo statefulset/my-stateful-app --to-revision=2

# Verify rollback
kubectl rollout status statefulset/my-stateful-app

# Check pods
kubectl get pods -l app=my-stateful-app -w

# Verify persistent volumes are intact
kubectl get pvc -l app=my-stateful-app
```

```yaml
# ❌ BAD — Updating StatefulSet without proper rollout
kubectl set image statefulset/my-app my-app=myapp:v2.0.0

# ✅ GOOD — Complete StatefulSet rollback
kubectl rollout history statefulset/my-stateful-app
kubectl rollout undo statefulset/my-stateful-app --to-revision=2
kubectl rollout status statefulset/my-stateful-app
kubectl get pods -l app=my-stateful-app
kubectl get pvc -l app=my-stateful-app
```

### Pattern 14: Job and CronJob Rollback

Rolling back failed Jobs and preventing CronJob execution.

```bash
# View Job history
kubectl get jobs -l app=my-batch-job

# Delete failed Job
kubectl delete job/my-batch-job-failed

# Apply previous Job version
kubectl apply -f jobs/my-batch-job-v2.0.0.yaml

# Suspend CronJob if needed
kubectl patch cronjob/my-cronjob -p '{"spec":{"suspend":true}}'

# Delete failed CronJob run
kubectl delete job/my-cronjob-1234567890

# Resume CronJob after fix
kubectl patch cronjob/my-cronjob -p '{"spec":{"suspend":false}}'
```

```bash
# ❌ BAD — Not cleaning up failed Job runs
kubectl create -f job.yaml
# Job fails, but old runs remain

# ✅ GOOD — Complete Job rollback workflow
kubectl delete job/my-batch-job-failed
kubectl apply -f jobs/my-batch-job-v2.0.0.yaml
kubectl rollout status job/my-batch-job
```

### Pattern 15: Ingress Rollback

Rolling back Ingress configuration changes.

```bash
# View Ingress history
kubectl get ingress my-ingress -o yaml

# Backup current configuration
kubectl get ingress my-ingress -o yaml > ingress-backup.yaml

# Rollback to previous version from git
kubectl apply -f https://raw.githubusercontent.com/org/repo/v2.0.0/ingress.yaml

# Verify Ingress controller
kubectl describe ingress my-ingress

# Test endpoints
kubectl run test-curl --image=curlimages/curl --restart=Never -- sleep 300
kubectl exec -it test-curl -- curl -s http://my-service/my-endpoint
```

```bash
# ❌ BAD — Direct Ingress edit without backup
kubectl patch ingress my-ingress -p '{"spec":{"rules":[{"host":"new-host.com"}]}}'

# ✅ GOOD — Complete Ingress rollback
kubectl get ingress my-ingress -o yaml > ingress-backup.yaml
kubectl apply -f ingress-backup.yaml
kubectl describe ingress my-ingress
```

### Pattern 16: Service Mesh Rollback

Rolling back Istio/Linkerd service mesh configurations.

```bash
# Istio Rollback
# Check virtual service
istioctl proxy-status

# Rollback Istio configuration
istioctl rollback --revision v1-16

# Delete problematic virtual service
istioctl delete virtual-service my-app-vs

# Apply previous version
istioctl apply -f virtual-services/my-app-v2.0.0.yaml

# Verify proxy status
istioctl proxy-status
```

```yaml
# ❌ BAD — Removing service mesh without rollback plan
istioctl delete virtual-service my-app-vs

# ✅ GOOD — Complete service mesh rollback
istioctl proxy-status
istioctl rollback --revision v1-16
istioctl apply -f virtual-services/my-app-v2.0.0.yaml
istioctl proxy-status
```

### Pattern 17: Helm Chart Rollback

Rolling back to a specific Helm chart version.

```bash
# List Helm repositories
helm repo list

# Update chart repository
helm repo update

# Check available chart versions
helm search repo myapp --versions

# Rollback to specific chart version
helm upgrade my-app oci://registry.example.com/myapp --version 2.0.0 --namespace production

# Verify upgrade
helm status my-app -n production

# Rollback to previous release
helm rollback my-app 3 -n production
```

```bash
# ❌ BAD — Upgrading without checking chart versions
helm upgrade my-app ./myapp-chart

# ✅ GOOD — Complete Helm chart rollback
helm repo update
helm search repo myapp --versions
helm rollback my-app 3 -n production
helm status my-app -n production
```

### Pattern 18: GitOps Rollback

Rolling back GitOps deployments using ArgoCD or Flux.

```bash
# ArgoCD GitOps rollback
# Revert to specific commit
argocd app rollback my-app 5

# Sync to specific revision
argocd app sync my-app --revision abc123def456

# Force comparison with Git
argocd app compare my-app --refresh

# Verify sync status
argocd app wait my-app --sync
argocd app get my-app

# Flux GitOps rollback
flux rollback my-app --from-commit=abc123 --to-commit=def456
flux get sources git --all-namespaces
flux get kustomizations --all-namespaces
```

```yaml
# ❌ BAD — Manual Git revert without Flux/ArgoCD sync
git revert HEAD
git push origin main

# ✅ GOOD — Complete GitOps rollback
argocd app history my-app
argocd app rollback my-app 5
argocd app wait my-app --sync
argocd app get my-app
 ```
 
---
 
 ## Constraints
 
 ### MUST DO

- Always check deployment history before executing rollback
- Capture current state (manifests, images, versions) before rollback
- Verify rollback success with health checks, logs, and metrics
- Use version control for rollback manifests and configurations
- Document all rollback actions with timestamps and outcomes
- Test rollback procedures in staging before production use
- Implement automated rollback triggers for critical failures
- Keep minimum 3-5 previous versions available for rollback

### MUST NOT DO

- Execute rollback without understanding the root cause
- Rollback in production without testing in staging first
- Delete deployments to force rollback (use proper rollback commands)
- Rollback if the previous version is compromised or outdated
- Skip verification steps even if rollback appears successful
- Rely on local file copies instead of version-controlled manifests
- Rollback without checking dependent services and databases
- Execute rollback during peak traffic without proper cooldown

---

## Output Template

When performing a rollback, document the following information:

1. **Rollback Summary**
   - Timestamp of failure detection
   - Timestamp of rollback initiation
   - Timestamp of rollback completion
   - Estimated downtime duration
   - Root cause (if identified)

2. **Rollback Details**
   - Component type (deployment, Helm release, database, config)
   - Previous version/revision number
   - Rollback method used (kubectl, Helm, ArgoCD, etc.)
   - Rollback command or script executed

3. **Verification Results**
   - Health check status
   - Log analysis summary
   - Metrics comparison (pre-rollback vs post-rollback)
   - Service availability status

4. **Next Steps**
   - Investigation tasks assigned
   - Monitoring adjustments made
   - Documentation updates required
   - Communication to stakeholders

5. **Files Attached**
   - Rollback execution logs
   - Pre-rollback manifests (if backed up)
   - Post-rollback verification screenshots
   - Incident report (if applicable)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-kubernetes-debugging` | Detailed debugging procedures for Kubernetes issues that may require rollback |
| `cncf-deployment-patterns` | Deployment strategies that influence rollback approach and complexity |
| `cncf-argocd` | ArgoCD-specific rollback workflows and integration patterns |

---

## References

### Kubernetes Documentation

- [Rolling Back a Deployment](https://kubernetes.io/docs/tasks/run-application/rollback-deployment/)
- [kubectl rollout](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#rollout)
- [DeploymentSpec](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#deployment-v1-apps)

### Helm Documentation

- [Helm Rollback](https://helm.sh/docs/helm/helm_rollback/)
- [Helm History](https://helm.sh/docs/helm/helm_history/)
- [Helm Release Notes](https://helm.sh/docs/topics/versions/)

### ArgoCD Documentation

- [ArgoCD Rollback](https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/)
- [ArgoCD Sync](https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/)
- [ArgoCD Health](https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/)

### Database Migration Tools

- [Flyway Documentation](https://flywaydb.org/documentation/)
- [Liquibase Documentation](https://www.liquibase.org/documentation/)
- [Sequelize Migrations](https://sequelize.org/master/manual/migrations.html)

### Monitoring and Verification

- [kubectl get events](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#get)
- [kubectl rollout status](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#rollout)
- [kubectl describe](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#describe)

---

*This skill provides comprehensive rollback procedures for cloud-native applications. Always verify rollback success and update documentation after each rollback event.*

---

## Constraints

### MUST DO
- Include at least one complete working YAML manifest example
- Note when content is auto-generated vs. manually verified
- Reference relevant CNCF project documentation

### MUST NOT DO
- Deploy manifests without testing in a staging environment first
- Use deprecated API versions (e.g., apps/v1beta1)
- Omit resource limits and requests in Kubernetes manifests
